#!/usr/bin/env python3
"""Prepare private iPhone Sudoku photos for local annotation and training.

The source HEIC images remain the canonical inputs in training-data/raw.  This
script produces browser-friendly JPEGs and an ignored index that joins the
prepared derivative back to the source filename and hashes.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "training-data" / "raw"
PREPARED_DIR = ROOT / "training-data" / "prepared"
INDEX_PATH = PREPARED_DIR / "index.json"
SUPPORTED_SUFFIXES = {".heic", ".heif", ".jpg", ".jpeg", ".png"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_dimensions(path: Path) -> tuple[int, int]:
    result = subprocess.run(
        ["sips", "--getProperty", "pixelWidth", "--getProperty", "pixelHeight", str(path)],
        check=True,
        text=True,
        capture_output=True,
    )
    values = [line.rsplit(":", 1)[-1].strip() for line in result.stdout.splitlines() if ":" in line]
    return int(values[-2]), int(values[-1])


def convert(source: Path, destination: Path) -> None:
    if source.suffix.lower() in {".heic", ".heif"} and shutil.which("heif-convert"):
        # libheif consistently decodes these iPhone HEIC files and applies the
        # orientation to pixels; some sips versions emit an empty JPEG instead.
        command = ["heif-convert", str(source), str(destination)]
    else:
        command = ["sips", "-s", "format", "jpeg", "-s", "formatOptions", "90", str(source), "--out", str(destination)]
    subprocess.run(command, check=True, text=True, capture_output=True)


def main() -> None:
    if shutil.which("sips") is None:
        raise SystemExit("This preparation command requires macOS sips.")
    if not RAW_DIR.exists():
        raise SystemExit(f"Missing private raw-photo directory: {RAW_DIR}")

    PREPARED_DIR.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []
    sources = sorted(path for path in RAW_DIR.iterdir() if path.suffix.lower() in SUPPORTED_SUFFIXES)
    if not sources:
        raise SystemExit(f"No supported images found in {RAW_DIR}")

    for source in sources:
        destination = PREPARED_DIR / f"{source.stem}.jpg"
        convert(source, destination)
        width, height = read_dimensions(destination)
        entries.append(
            {
                "sourceFile": source.name,
                "sourceSha256": sha256(source),
                "preparedFile": destination.name,
                "preparedSha256": sha256(destination),
                "width": width,
                "height": height,
            }
        )
        print(f"Prepared {source.name} -> {destination.name}")

    INDEX_PATH.write_text(json.dumps({"schemaVersion": 1, "images": entries}, indent=2) + "\n")
    print(f"Wrote {INDEX_PATH}")


if __name__ == "__main__":
    main()
