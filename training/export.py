#!/usr/bin/env python3
"""Gate and export a trained Keras run to the app's bundled TFJS assets."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "public" / "models" / "sudoku-digits"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", required=True, type=Path)
    parser.add_argument("--experimental", action="store_true", help="Export a completed, explicitly experimental four-fold run")
    arguments = parser.parse_args()
    model = arguments.run / "model.keras"
    metadata_path = arguments.run / "metadata.json"
    if not model.exists() or not metadata_path.exists():
        raise SystemExit("Run must contain model.keras and metadata.json")
    metadata = json.loads(metadata_path.read_text())
    metrics = metadata.get("metrics", {})
    if arguments.experimental:
        if metadata.get("modelStatus") != "experimental" or len(metadata.get("crossValidation", {}).get("folds", [])) != 4:
            raise SystemExit("Experimental export requires an experimental run with four source-photo folds.")
        review_first = metrics.get("reviewFirst", {})
        if metadata.get("preprocessingVersion") != "v2" or metrics.get("realPhotoAccuracy", 0) <= 0.22962962962962963 or review_first.get("knownClueCoverage", 0) < 0.70:
            raise SystemExit("Refusing experimental export: v2 must beat the shipped 22.96% model and cover at least 70% of known clues for mandatory review.")
    elif metadata.get("modelStatus") != "production" or metrics.get("realPhotoAccuracy", 0) < 0.97 or metrics.get("minimumClassRecall", 0) < 0.95:
        raise SystemExit("Refusing export: held-out real-photo metrics do not meet 97% accuracy / 95% per-class recall.")

    converter = Path(sys.executable).with_name("tensorflowjs_converter")
    if not converter.exists():
        raise SystemExit("Run this through the project .venv-converter environment.")
    converter_input = model
    if model.suffix == ".keras":
        # tensorflowjs 4.17's Keras converter consumes HDF5 rather than the
        # modern .keras archive. Keep this bridge beside the ignored run.
        import tensorflow as tf
        converter_input = arguments.run / "converter-input.h5"
        tf.keras.models.load_model(model).save(converter_input)
    staging = TARGET.with_name("sudoku-digits.staging")
    shutil.rmtree(staging, ignore_errors=True)
    staging.mkdir(parents=True)
    subprocess.run([str(converter), "--input_format=keras", "--quantization_bytes=1", str(converter_input), str(staging)], check=True)
    model_json = staging / "model.json"
    if not model_json.exists() or not list(staging.glob("*.bin")):
        raise SystemExit("Conversion did not produce model.json and weight shards")
    metadata["source"]["sha256"] = sha256(model_json)
    (staging / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    shutil.rmtree(TARGET, ignore_errors=True)
    staging.rename(TARGET)
    print(f"Exported validated model to {TARGET}")


if __name__ == "__main__":
    main()
