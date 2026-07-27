#!/usr/bin/env python3
"""Train the private printed-Sudoku 1–9 digit classifier.

Labels come only from training-data/manifest.json.  Real images are split by
source photo so crops from one camera frame can never leak into evaluation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "training-data"
PREPROCESSING_VERSION = "v2"
LABELS = list(range(1, 10))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def normalize_digit(gray: np.ndarray) -> np.ndarray | None:
    """Match the browser v2 contract: local ink, central component, centred canvas."""
    if gray.ndim != 2:
        raise ValueError("Digit crop must be grayscale")
    height, width = gray.shape
    radius = max(3, min(width, height) // 7)
    local = cv2.boxFilter(gray.astype(np.float32), -1, (radius * 2 + 1, radius * 2 + 1), normalize=True, borderType=cv2.BORDER_REPLICATE)
    threshold = np.clip(local - 18, 70, 205)
    ink = (gray < threshold).astype(np.uint8)
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(ink, connectivity=8)
    minimum_area = max(6, round(width * height * 0.004))
    best: tuple[float, np.ndarray] | None = None
    centre_x, centre_y = (width - 1) / 2, (height - 1) / 2
    for index in range(1, count):
        x, y, component_width, component_height, area = stats[index]
        touches_border = x == 0 or y == 0 or x + component_width == width or y + component_height == height
        if area < minimum_area or (touches_border and (component_width >= width * 0.9 or component_height >= height * 0.9)):
            continue
        component_x, component_y = centroids[index]
        distance = np.hypot((component_x - centre_x) / max(width, 1), (component_y - centre_y) / max(height, 1))
        score = float(area) * (1 - min(0.7, distance))
        if best is None or score > best[0]:
            best = (score, stats[index])
    if best is None:
        return None
    x, y, component_width, component_height, _ = best[1]
    left, right = max(0, int(x) - 1), min(width, int(x + component_width) + 1)
    top, bottom = max(0, int(y) - 1), min(height, int(y + component_height) + 1)
    crop = gray[top:bottom, left:right]
    scale = min(20 / crop.shape[1], 20 / crop.shape[0])
    rendered_width, rendered_height = max(1, round(crop.shape[1] * scale)), max(1, round(crop.shape[0] * scale))
    resized = cv2.resize(crop, (rendered_width, rendered_height), interpolation=cv2.INTER_LINEAR)
    canvas = np.full((28, 28), 255, dtype=np.uint8)
    offset_x, offset_y = (28 - rendered_width) // 2, (28 - rendered_height) // 2
    canvas[offset_y:offset_y + rendered_height, offset_x:offset_x + rendered_width] = resized
    return 1.0 - canvas.astype(np.float32) / 255.0


def order_corners(points: np.ndarray) -> np.ndarray:
    points = points.reshape(4, 2).astype(np.float32)
    ordered = np.zeros((4, 2), dtype=np.float32)
    sums = points.sum(axis=1)
    diffs = np.diff(points, axis=1).reshape(-1)
    ordered[0] = points[np.argmin(sums)]
    ordered[2] = points[np.argmax(sums)]
    ordered[1] = points[np.argmin(diffs)]
    ordered[3] = points[np.argmax(diffs)]
    return ordered


def warp_board(gray: np.ndarray, corners: np.ndarray) -> np.ndarray:
    target = np.array([[0, 0], [899, 0], [899, 899], [0, 899]], dtype=np.float32)
    return cv2.warpPerspective(gray, cv2.getPerspectiveTransform(order_corners(corners), target), (900, 900))


def grid_score(board: np.ndarray) -> float:
    """Prefer warps whose dark-pixel projections contain all ten grid lines."""
    binary = cv2.adaptiveThreshold(cv2.GaussianBlur(board, (5, 5), 0), 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 7)
    expected = np.arange(10) * 100
    vertical = binary.mean(axis=0)
    horizontal = binary.mean(axis=1)
    def peaks(projection: np.ndarray) -> float:
        return float(sum(projection[max(0, point - 14) : min(900, point + 15)].max() for point in expected))
    return peaks(vertical) + peaks(horizontal)


def rectify_board(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    threshold = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 7)
    contours, _ = cv2.findContours(threshold, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    image_area = gray.shape[0] * gray.shape[1]
    candidates: list[np.ndarray] = []
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:30]:
        if cv2.contourArea(contour) < image_area * 0.035:
            continue
        approx = cv2.approxPolyDP(contour, 0.02 * cv2.arcLength(contour, True), True)
        if len(approx) == 4 and cv2.isContourConvex(approx):
            candidates.append(approx)
        candidates.append(cv2.boxPoints(cv2.minAreaRect(contour)))
    edges = cv2.Canny(blurred, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=120, minLineLength=min(gray.shape) * 0.18, maxLineGap=30)
    if lines is not None:
        endpoints = lines.reshape(-1, 2)
        if len(endpoints) >= 4:
            candidates.append(cv2.boxPoints(cv2.minAreaRect(endpoints.astype(np.float32))))
    if not candidates:
        raise ValueError("grid-not-found")
    warped = [warp_board(gray, candidate) for candidate in candidates]
    return max(warped, key=grid_score)


def detected_grid_lines(board: np.ndarray, vertical: bool) -> list[int] | None:
    """Match the browser's projection-based correction for nonuniform book pages."""
    threshold = min(210, float(board.mean()) * 0.86)
    projection = (board < threshold).sum(axis=0 if vertical else 1)
    radius = max(4, round(board.shape[0] / 24))
    lines: list[int] = []
    for index in range(10):
        expected = round(index * (board.shape[0] - 1) / 9)
        low, high = max(0, expected - radius), min(len(projection) - 1, expected + radius)
        lines.append(int(low + projection[low:high + 1].argmax()))
    minimum_gap = board.shape[0] / 18
    return lines if all(index == 0 or lines[index] - lines[index - 1] >= minimum_gap for index in range(10)) else None


def cell_from_board(board: np.ndarray, row: int, column: int) -> np.ndarray:
    vertical = detected_grid_lines(board, True) or [round(index * board.shape[1] / 9) for index in range(10)]
    horizontal = detected_grid_lines(board, False) or [round(index * board.shape[0] / 9) for index in range(10)]
    left, right, top, bottom = vertical[column], vertical[column + 1], horizontal[row], horizontal[row + 1]
    padding = max(2, round(min(right - left, bottom - top) * 0.14))
    return board[top + padding:bottom - padding, left + padding:right - padding]


def cells_for_photo(path: Path, clues: str) -> tuple[list[np.ndarray], list[int]]:
    image = cv2.imread(str(path))
    if image is None:
        raise ValueError(f"Cannot read {path}")
    board = rectify_board(image)
    samples: list[np.ndarray] = []
    labels: list[int] = []
    for index, label in enumerate(clues):
        if label not in "123456789":
            continue
        row, column = divmod(index, 9)
        cell = cell_from_board(board, row, column)
        normalized = normalize_digit(cell)
        if normalized is None:
            # Preserve rare, extremely low-contrast labelled clues for model
            # training. Runtime reports them through blank-gate metrics rather
            # than pretending they are reliable automatic detections.
            normalized = 1.0 - cv2.resize(cell, (28, 28), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255.0
        samples.append(normalized)
        labels.append(int(label) - 1)
    return samples, labels


def blank_metrics(entries: list[dict[str, object]]) -> dict[str, float | int]:
    """Calibrate and report the same local blank gate used by the app."""
    true_blank = false_positive = true_digit = false_negative = 0
    for entry in entries:
        image = cv2.imread(str(DATA / "prepared" / str(entry["preparedFile"])))
        if image is None:
            raise ValueError(f"Cannot read {entry['preparedFile']}")
        board = rectify_board(image)
        for index, clue in enumerate(str(entry["clues"])):
            row, column = divmod(index, 9)
            cell = cell_from_board(board, row, column)
            has_ink = normalize_digit(cell) is not None
            if clue in "123456789":
                true_digit += 1
                false_negative += int(not has_ink)
            else:
                true_blank += 1
                false_positive += int(has_ink)
    return {
        "samples": true_blank + true_digit,
        "blankFalsePositiveRate": false_positive / max(true_blank, 1),
        "digitFalseNegativeRate": false_negative / max(true_digit, 1),
        "blankCells": true_blank,
        "digitCells": true_digit,
    }


def synthetic_digit(font_paths: list[Path], value: int, rng: random.Random) -> np.ndarray:
    canvas = Image.new("L", (64, 64), 255)
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(rng.choice(font_paths)), rng.randint(38, 52))
    bounds = draw.textbbox((0, 0), str(value), font=font)
    width, height = bounds[2] - bounds[0], bounds[3] - bounds[1]
    draw.text(((64 - width) / 2 + rng.randint(-5, 5), (64 - height) / 2 - bounds[1] + rng.randint(-4, 4)), str(value), fill=rng.randint(0, 40), font=font)
    canvas = canvas.rotate(rng.uniform(-9, 9), resample=Image.Resampling.BICUBIC, fillcolor=255)
    canvas = ImageEnhance.Contrast(canvas).enhance(rng.uniform(0.65, 1.4))
    if rng.random() < 0.65:
        canvas = canvas.filter(ImageFilter.GaussianBlur(rng.uniform(0, 1.0)))
    image = np.asarray(canvas, dtype=np.float32)
    image = np.clip(image + rng.normalvariate(0, 5), 0, 255).astype(np.uint8)
    normalized = normalize_digit(image)
    if normalized is None:
        raise RuntimeError("Synthetic digit unexpectedly empty")
    return normalized


def load_manifest() -> list[dict[str, object]]:
    manifest_path = DATA / "manifest.json"
    index_path = DATA / "prepared" / "index.json"
    if not manifest_path.exists():
        raise SystemExit(f"Missing {manifest_path}; annotate all four photos first.")
    if not index_path.exists():
        raise SystemExit(f"Missing {index_path}; run scripts/prepare_training_photos.py first.")
    manifest = json.loads(manifest_path.read_text())
    prepared = {entry["preparedFile"]: entry for entry in json.loads(index_path.read_text())["images"]}
    entries: list[dict[str, object]] = []
    for entry in manifest.get("entries", []):
        filename = entry.get("preparedFile")
        clues = entry.get("clues")
        if not isinstance(filename, str) or filename not in prepared:
            raise SystemExit(f"Manifest prepared file is not present in index: {filename}")
        if not isinstance(clues, str) or len(clues) != 81 or any(char not in "0123456789." for char in clues):
            raise SystemExit(f"Invalid 81-cell clue string for {filename}")
        expected_hash = prepared[filename]["preparedSha256"]
        actual_hash = sha256(DATA / "prepared" / filename)
        if actual_hash != expected_hash:
            raise SystemExit(f"Prepared image hash changed: {filename}; prepare and annotate again.")
        entries.append({**entry, **prepared[filename]})
    if len(entries) < 4:
        raise SystemExit("Four annotated source photos are required before training.")
    return sorted(entries, key=lambda item: str(item["preparedFile"]))


def metrics_for(model: tf.keras.Model, x: np.ndarray, y: np.ndarray) -> dict[str, object]:
    probabilities = model.predict(x, verbose=0)
    prediction = probabilities.argmax(axis=1)
    recalls: dict[str, float | None] = {}
    for digit in range(9):
        matching = y == digit
        recalls[str(digit + 1)] = float((prediction[matching] == digit).mean()) if matching.any() else None
    present = [recall for recall in recalls.values() if recall is not None]
    return {"accuracy": float((prediction == y).mean()), "perClassRecall": recalls, "minimumClassRecall": float(min(present)) if present else 0.0}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--font", required=True, nargs="+", type=Path, help="Licensed .ttf/.otf fonts used only for synthetic training")
    parser.add_argument("--fold", type=int, default=0, help="Rotate the held-out source-photo assignment")
    parser.add_argument("--synthetic-per-digit", type=int, default=1600)
    parser.add_argument("--real-sample-weight", type=int, default=120, help="Balance scarce real training crops against synthetic font samples")
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--seed", type=int, default=20260727)
    arguments = parser.parse_args()
    if any(not font.exists() for font in arguments.font):
        raise SystemExit("Every --font path must exist and be licensed for this use.")

    random.seed(arguments.seed)
    np.random.seed(arguments.seed)
    tf.keras.utils.set_random_seed(arguments.seed)
    entries = load_manifest()
    offset = arguments.fold % len(entries)
    rotated = entries[offset:] + entries[:offset]
    train_entries, validation_entry, test_entry = rotated[:-2], rotated[-2], rotated[-1]

    real: dict[str, tuple[list[np.ndarray], list[int]]] = {}
    for entry in entries:
        real[str(entry["preparedFile"])] = cells_for_photo(DATA / "prepared" / str(entry["preparedFile"]), str(entry["clues"]))

    rng = random.Random(arguments.seed)
    train_x: list[np.ndarray] = []
    train_y: list[int] = []
    for digit in LABELS:
        for _ in range(arguments.synthetic_per_digit):
            train_x.append(synthetic_digit(arguments.font, digit, rng))
            train_y.append(digit - 1)
    for entry in train_entries:
        samples, labels = real[str(entry["preparedFile"])]
        for sample, label in zip(samples, labels):
            # Real examples are scarce but are the closest match for camera
            # geometry and book-print ink. Repeating them balances the corpus
            # without leaking validation/test source photos into training.
            train_x.extend([sample] * arguments.real_sample_weight)
            train_y.extend([label] * arguments.real_sample_weight)
    validation_x, validation_y = real[str(validation_entry["preparedFile"])]
    test_x, test_y = real[str(test_entry["preparedFile"])]
    if not validation_x or not test_x:
        raise SystemExit("Validation and held-out photos must each contain annotated digits.")

    def stack(samples: list[np.ndarray]) -> np.ndarray:
        return np.asarray(samples, dtype=np.float32)[..., np.newaxis]

    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input((28, 28, 1)),
            tf.keras.layers.Conv2D(24, 3, activation="relu"),
            tf.keras.layers.MaxPooling2D(),
            tf.keras.layers.Conv2D(48, 3, activation="relu"),
            tf.keras.layers.MaxPooling2D(),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dropout(0.18),
            tf.keras.layers.Dense(9, activation="softmax"),
        ]
    )
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(
        stack(train_x),
        np.asarray(train_y),
        validation_data=(stack(validation_x), np.asarray(validation_y)),
        epochs=arguments.epochs,
        batch_size=96,
        callbacks=[tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=6, restore_best_weights=True)],
        verbose=2,
    )

    validation_metrics = metrics_for(model, stack(validation_x), np.asarray(validation_y))
    test_metrics = metrics_for(model, stack(test_x), np.asarray(test_y))
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = DATA / "runs" / run_id
    run_dir.mkdir(parents=True)
    model_path = run_dir / "model.keras"
    model.save(model_path)
    metadata = {
        "schemaVersion": 1,
        "inputShape": [28, 28, 1],
        "labels": LABELS,
        "preprocessingVersion": PREPROCESSING_VERSION,
        "confidenceThresholds": {"reject": 0.55, "review": 0.80},
        "metrics": {"realPhotoAccuracy": test_metrics["accuracy"], "minimumClassRecall": test_metrics["minimumClassRecall"], "validation": validation_metrics, "test": test_metrics, "blankGate": blank_metrics(entries)},
        "source": {"trainingRun": run_id, "sha256": "set-by-exporter"},
        "split": {"training": [entry["preparedFile"] for entry in train_entries], "validation": validation_entry["preparedFile"], "test": test_entry["preparedFile"], "fold": arguments.fold},
    }
    (run_dir / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({"run": str(run_dir), "test": test_metrics}, indent=2))


if __name__ == "__main__":
    main()
