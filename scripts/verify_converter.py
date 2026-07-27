"""Create and convert a minimal model to verify the isolated TFJS toolchain."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import tensorflow as tf


def main() -> None:
    workspace = Path(tempfile.mkdtemp(prefix="sudocoach-converter-"))
    try:
        source = workspace / "smoke-model.h5"
        target = workspace / "tfjs"
        model = tf.keras.Sequential(
            [
                tf.keras.layers.Input(shape=(28, 28, 1)),
                tf.keras.layers.Flatten(),
                tf.keras.layers.Dense(9, activation="softmax"),
            ]
        )
        model.save(source)
        subprocess.run(
            [
                str(Path(sys.executable).with_name("tensorflowjs_converter")),
                "--input_format=keras",
                "--output_format=tfjs_layers_model",
                "--quantization_bytes=1",
                str(source),
                str(target),
            ],
            check=True,
        )
        manifest = json.loads((target / "model.json").read_text())
        assert manifest.get("weightsManifest"), "Converted model has no weight manifest."
        assert list(target.glob("*.bin")), "Converted model has no weight shard."
        print(f"Converter verified: {target / 'model.json'}")
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


if __name__ == "__main__":
    main()
