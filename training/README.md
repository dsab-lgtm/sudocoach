# Private digit-model training

`training-data/` is intentionally ignored. It contains consented source photos,
their prepared JPEG derivatives, the annotation manifest, crops, and run
artifacts. Nothing in that directory is committed.

Prepare the copied iPhone photos on macOS:

```bash
python3 scripts/prepare_training_photos.py
```

Run the development app and open `/#/training/annotate`. Select each JPEG from
`training-data/prepared/`, enter its printed starting clues, and download the
manifest. Save the downloaded file as `training-data/manifest.json`.

Install the local image-training dependencies into the dedicated converter
environment, then train with licensed font files:

```bash
.venv-converter/bin/python -m pip install -r requirements-training.txt
.venv-converter/bin/python training/train.py \
  --font /path/to/licensed-font.ttf /path/to/another-font.ttf
```

The trainer reserves whole source photos for validation and evaluation (never
individual cells), rotates the holdout with `--fold`, and writes its run to the
ignored `training-data/runs/` directory. Export only a run that meets the
real-photo accuracy and per-class-recall gates:

```bash
.venv-converter/bin/python training/export.py --run training-data/runs/<run-id>
```

The exporter writes the checked TensorFlow.js model and metadata to
`public/models/sudoku-digits/`. The browser validates that metadata and model
shape before using it; invalid assets fall back to the template recognizer.

## Experimental model

The reproducible OFL font assets live in `training/assets/fonts/`. After the
four-photo manifest has been validated, run the experimental four-fold pipeline:

```bash
.venv-converter/bin/python training/experimental_train.py
.venv-converter/bin/python training/export.py --experimental --run training-data/runs/<experimental-run-id>
```

This intentionally ships `modelStatus: "experimental"`. The app shows a
persistent warning and requires every model-predicted clue to be reviewed before
confirmation. Production export remains protected by the 97%/95% quality gate.
