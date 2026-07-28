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
    parser.add_argument("--force-experimental", action="store_true", help="Require an explicit human override when an experimental candidate misses a safety gate")
    parser.add_argument("--override-reason", help="Recorded reason for a forced experimental export")
    arguments = parser.parse_args()
    if arguments.force_experimental and not arguments.experimental:
        raise SystemExit("--force-experimental requires --experimental.")
    if arguments.force_experimental and not arguments.override_reason:
        raise SystemExit("--force-experimental requires --override-reason so the deployment remains traceable.")
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
        aggregate = metrics.get("aggregate", {})
        blank_gate = metrics.get("blankGate", {})
        gates_pass = metadata.get("exportEligible") and metadata.get("preprocessingVersion") == "v2" and review_first.get("acceptedAccuracy", 0) >= .90 and review_first.get("correctSuggestions", 0) > 102 and review_first.get("knownClueCoverage", 0) >= .70 and blank_gate.get("blankFalsePositiveRate", 1) <= .10 and aggregate.get("meanAccuracy", 0) >= .7851851851851852 and aggregate.get("worstAccuracy", 0) >= .50
        if not gates_pass and not arguments.force_experimental:
            raise SystemExit("Refusing experimental export: candidate must beat the bundled model's accepted accuracy, correct suggestions, blank false-positive rate, and source-photo fold gates.")
        if not gates_pass:
            metadata["manualOverride"] = {
                "safetyGatesPassed": False,
                "reason": arguments.override_reason,
            }
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
