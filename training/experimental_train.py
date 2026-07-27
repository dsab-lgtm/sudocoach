#!/usr/bin/env python3
"""Select a review-first, source-photo-disjoint Sudoku digit model.

This trainer intentionally optimises for useful suggestions rather than
unattended OCR: every exported prediction remains mandatory-review in the UI.
"""

from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import tensorflow as tf

from train import DATA, LABELS, PREPROCESSING_VERSION, blank_metrics, cell_from_board, cells_for_photo, load_manifest, rectify_board, synthetic_digit


ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "training" / "assets" / "fonts"
CONFIGURATIONS = {
    "compact": {"filters": (20, 40), "dense": 64, "dropout": 0.20, "synthetic": 220, "augmentations": 30, "epochs": 8},
    "baseline": {"filters": (32, 64), "dense": 96, "dropout": 0.30, "synthetic": 300, "augmentations": 40, "epochs": 10},
    "augmentation-heavy": {"filters": (40, 80), "dense": 128, "dropout": 0.35, "synthetic": 380, "augmentations": 50, "epochs": 12},
}


def stack(samples: list[np.ndarray]) -> np.ndarray:
    return np.asarray(samples, dtype=np.float32)[..., np.newaxis]


def augment_real(sample: np.ndarray, rng: random.Random) -> np.ndarray:
    image = np.clip((1 - sample) * 255, 0, 255).astype(np.uint8)
    matrix = cv2.getRotationMatrix2D((14, 14), rng.uniform(-10, 10), rng.uniform(0.86, 1.14))
    matrix[:, 2] += [rng.uniform(-3, 3), rng.uniform(-3, 3)]
    image = cv2.warpAffine(image, matrix, (28, 28), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=255)
    if rng.random() < 0.7:
        image = cv2.GaussianBlur(image, (3, 3), rng.uniform(0, 1.2))
    if rng.random() < 0.3:
        image = cv2.erode(image, np.ones((2, 2), np.uint8), iterations=1)
    if rng.random() < 0.3:
        image = cv2.dilate(image, np.ones((2, 2), np.uint8), iterations=1)
    illumination = np.linspace(rng.uniform(-42, 0), rng.uniform(0, 42), 28, dtype=np.float32)
    image = np.clip(image.astype(np.float32) + illumination[None, :] + rng.normalvariate(0, 6), 0, 255).astype(np.uint8)
    return 1 - image.astype(np.float32) / 255


def model(configuration: dict[str, object]) -> tf.keras.Model:
    first, second = configuration["filters"]  # type: ignore[misc]
    return tf.keras.Sequential([
        tf.keras.layers.Input((28, 28, 1)),
        tf.keras.layers.Conv2D(first, 3, padding="same", activation="relu"),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Conv2D(second, 3, padding="same", activation="relu"),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Dropout(float(configuration["dropout"])),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(int(configuration["dense"]), activation="relu"),
        tf.keras.layers.Dropout(float(configuration["dropout"])),
        tf.keras.layers.Dense(9, activation="softmax"),
    ])


def recall_calibration(probabilities: np.ndarray) -> dict[str, float | bool]:
    """Keep at least 85% of known clues; the review UI handles imperfect guesses."""
    confidence = probabilities.max(axis=1)
    candidates = [round(float(value), 2) for value in np.arange(0.35, 0.951, 0.01)]
    eligible = [threshold for threshold in candidates if float((confidence >= threshold).mean()) >= 0.85]
    reject = max(eligible) if eligible else 0.35
    return {"reject": reject, "review": min(0.95, round(reject + 0.10, 2)), "knownClueCoverage": float((confidence >= reject).mean()), "fallbackUsed": not bool(eligible)}


def metrics(probabilities: np.ndarray, labels: np.ndarray, calibration: dict[str, float | bool]) -> dict[str, object]:
    prediction = probabilities.argmax(axis=1)
    confidence = probabilities.max(axis=1)
    threshold = float(calibration["reject"])
    accepted = confidence >= threshold
    recalls = {str(digit + 1): (float((prediction[labels == digit] == digit).mean()) if (labels == digit).any() else None) for digit in range(9)}
    present = [value for value in recalls.values() if value is not None]
    correct_suggestions = int(((prediction == labels) & accepted).sum())
    return {
        "accuracy": float((prediction == labels).mean()),
        "acceptedAccuracy": float((prediction[accepted] == labels[accepted]).mean()) if accepted.any() else 0.0,
        "correctSuggestions": correct_suggestions,
        "knownClueCoverage": float(accepted.mean()),
        "perClassRecall": recalls,
        "minimumClassRecall": float(min(present)) if present else 0.0,
        "confusionMatrix": [[int(((labels == actual) & (prediction == predicted)).sum()) for predicted in range(9)] for actual in range(9)],
        "confidenceCoverage": {str(threshold): float((confidence >= threshold).mean()) for threshold in (0.35, 0.5, 0.7, 0.9)},
    }


def dataset(real: dict[str, tuple[list[np.ndarray], list[int]]], names: list[str], fonts: list[Path], rng: random.Random, configuration: dict[str, object]) -> tuple[list[np.ndarray], list[int]]:
    samples: list[np.ndarray] = []
    labels: list[int] = []
    for digit in LABELS:
        for _ in range(int(configuration["synthetic"])):
            samples.append(synthetic_digit(fonts, digit, rng)); labels.append(digit - 1)
    for name in names:
        crops, crop_labels = real[name]
        for crop, label in zip(crops, crop_labels):
            for _ in range(int(configuration["augmentations"])):
                samples.append(augment_real(crop, rng)); labels.append(label)
    return samples, labels


def quality_control(entries: list[dict[str, object]]) -> None:
    """Exercise full-photo rectification before any candidate can be selected."""
    for entry in entries:
        image = cv2.imread(str(DATA / "prepared" / str(entry["preparedFile"])))
        if image is None:
            raise SystemExit(f"Cannot open {entry['preparedFile']}")
        board = rectify_board(image)
        if board.shape != (900, 900):
            raise SystemExit(f"Board rectification failed for {entry['preparedFile']}")
        for index, clue in enumerate(str(entry["clues"])):
            if clue in "123456789":
                row, col = divmod(index, 9)
                if cell_from_board(board, row, col).size == 0:
                    raise SystemExit(f"Empty cell crop at {index} in {entry['preparedFile']}")


def fit(train_x: list[np.ndarray], train_y: list[int], validation_x: list[np.ndarray], validation_y: list[int], configuration: dict[str, object]) -> tf.keras.Model:
    classifier = model(configuration)
    classifier.compile(optimizer=tf.keras.optimizers.legacy.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    classifier.fit(stack(train_x), np.asarray(train_y), validation_data=(stack(validation_x), np.asarray(validation_y)), batch_size=96, epochs=int(configuration["epochs"]), verbose=0, callbacks=[tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=5, restore_best_weights=True)])
    return classifier


def evaluate_configuration(name: str, configuration: dict[str, object], real: dict[str, tuple[list[np.ndarray], list[int]]], names: list[str], fonts: list[Path], seed: int) -> tuple[dict[str, object], tf.keras.Model]:
    folds: list[dict[str, object]] = []
    oof_probabilities: list[np.ndarray] = []
    oof_labels: list[np.ndarray] = []
    for fold in range(4):
        ordered = names[fold:] + names[:fold]
        train_names, validation_name, test_name = ordered[:2], ordered[2], ordered[3]
        train_x, train_y = dataset(real, train_names, fonts, random.Random(seed + fold), configuration)
        classifier = fit(train_x, train_y, real[validation_name][0], real[validation_name][1], configuration)
        probabilities = classifier.predict(stack(real[test_name][0]), verbose=0)
        oof_probabilities.append(probabilities); oof_labels.append(np.asarray(real[test_name][1]))
        folds.append({"fold": fold, "training": train_names, "validation": validation_name, "test": test_name, "probabilities": probabilities, "labels": np.asarray(real[test_name][1])})
    combined_probabilities = np.concatenate(oof_probabilities); combined_labels = np.concatenate(oof_labels)
    calibration = recall_calibration(combined_probabilities)
    for fold in folds:
        fold["metrics"] = metrics(fold.pop("probabilities"), fold.pop("labels"), calibration)
    aggregate = metrics(combined_probabilities, combined_labels, calibration)
    final_x, final_y = dataset(real, names, fonts, random.Random(seed + 100), configuration)
    final_model = fit(final_x, final_y, real[names[0]][0], real[names[0]][1], configuration)
    return {"name": name, "configuration": configuration, "calibration": calibration, "metrics": aggregate, "folds": folds}, final_model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=20260727)
    parser.add_argument("--only", choices=list(CONFIGURATIONS), help="Train one configuration for faster local iteration")
    arguments = parser.parse_args()
    fonts = sorted(FONT_DIR.glob("*.ttf"))
    if len(fonts) != 4:
        raise SystemExit("Expected the four versioned OFL training fonts.")
    random.seed(arguments.seed); np.random.seed(arguments.seed); tf.keras.utils.set_random_seed(arguments.seed)
    entries = load_manifest(); quality_control(entries)
    names = [str(entry["preparedFile"]) for entry in entries]
    real = {name: cells_for_photo(DATA / "prepared" / name, str(next(entry for entry in entries if entry["preparedFile"] == name)["clues"])) for name in names}
    candidates: list[tuple[dict[str, object], tf.keras.Model]] = []
    for index, (name, configuration) in enumerate(CONFIGURATIONS.items()):
        if arguments.only and name != arguments.only:
            continue
        candidates.append(evaluate_configuration(name, configuration, real, names, fonts, arguments.seed + index * 1000))
    if not candidates:
        raise SystemExit("No candidate configurations selected.")
    # More correct reviewed suggestions wins; coverage and accepted accuracy
    # break ties deterministically.
    selected, final_model = max(candidates, key=lambda candidate: (int(candidate[0]["metrics"]["correctSuggestions"]), float(candidate[0]["metrics"]["knownClueCoverage"]), float(candidate[0]["metrics"]["acceptedAccuracy"])))  # type: ignore[index]
    run_id = datetime.now(timezone.utc).strftime("experimental-%Y%m%dT%H%M%SZ")
    run_dir = DATA / "runs" / run_id; run_dir.mkdir(parents=True)
    final_model.save(run_dir / "model.keras")
    aggregate = selected["metrics"]  # type: ignore[index]
    metadata = {
        "schemaVersion": 1, "modelStatus": "experimental", "inputShape": [28, 28, 1], "labels": LABELS,
        "preprocessingVersion": PREPROCESSING_VERSION, "confidenceThresholds": {"reject": selected["calibration"]["reject"], "review": selected["calibration"]["review"]},  # type: ignore[index]
        "metrics": {"realPhotoAccuracy": aggregate["accuracy"], "minimumClassRecall": aggregate["minimumClassRecall"], "aggregate": {"meanAccuracy": aggregate["accuracy"], "worstAccuracy": min(float(fold["metrics"]["accuracy"]) for fold in selected["folds"]), "meanMinimumClassRecall": float(np.mean([fold["metrics"]["minimumClassRecall"] for fold in selected["folds"]]))}, "reviewFirst": aggregate, "blankGate": blank_metrics(entries)},  # type: ignore[index]
        "source": {"trainingRun": run_id, "sha256": "set-by-exporter"},
        "crossValidation": {"folds": selected["folds"], "calibration": selected["calibration"]},  # type: ignore[index]
        "selectedConfiguration": selected["configuration"], "candidateSelection": {"winner": selected["name"], "candidates": [candidate[0] for candidate in candidates]},  # type: ignore[index]
    }
    (run_dir / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({"run": str(run_dir), "winner": selected["name"], "metrics": metadata["metrics"], "calibration": selected["calibration"]}, indent=2))  # type: ignore[index]


if __name__ == "__main__":
    main()
