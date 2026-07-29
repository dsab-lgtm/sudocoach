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

## Materialised cell dataset

To inspect or use raw cell crops in a new experiment, materialise the annotated
photos locally:

```bash
.venv-converter/bin/python training/materialize_cell_dataset.py
```

This writes `training-data/crops/v1/raw/` and a `cells.json` manifest. It
contains all 81 cells from each photo: `0` labels blank cells and `1`–`9` label
printed clues. The manifest also records four source-photo-disjoint folds
(two training photos, one validation photo, and one test photo). The training
data remains ignored and must not be committed.

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
persistent warning. High-confidence unedited suggestions can be explicitly
accepted in a labelled batch, while lower-confidence, low-ink, edited, and
manually added clues still require individual confirmation. Production export
remains protected by the 97%/95% quality gate.

### Local scan smoke test

`training-data/prepared/IMG_4229.jpg` is the consented local smoke image for
reviewing the scanner and comparison viewer after scanner UI changes. Start the
development app, scan that image, verify that its detected clues appear in the
review queue, and inspect a selected clue in the full-image viewer at 320px and
390px widths. Do not add the image or its derived cells to automated fixtures or
version control.

## Improved experimental candidates

To compare the legacy-style digit classifier, raw-crop augmentation, and a
blank-aware `0`–`9` classifier without adding external data, first materialise
the cell dataset and then run:

```bash
.venv-converter/bin/python training/improved_experimental_train.py
```

The trainer uses whole source photos as folds, calibrates each fold from its
validation photo, and records all candidate metrics locally. It only marks a
run exportable when it beats the bundled model on accepted accuracy, correct
reviewed suggestions, clue coverage, blank false-positive rate, and both
aggregate and worst-fold digit accuracy. Export the selected run only when its
printed `eligible` value is `true`.

## Curated Google Fonts corpus

The expanded printed-digit experiments use 24 font families from the
`google/fonts` repository. They are training-only assets: no font is bundled
into the PWA. The font binaries, their individual OFL/Apache licence files, and
a SHA-256 lock are versioned for reproducible offline training.

Fetch the exact reviewed source once, then use the same command without the
flag to verify it later:

```bash
.venv-converter/bin/python training/fetch_google_fonts.py --write-lock
.venv-converter/bin/python training/fetch_google_fonts.py
```

The improved trainer treats the existing four fonts as an exact compact-model
control. Its two Google Fonts candidates pretrain on the verified 24-family
corpus, then fine-tune only on source-photo-disjoint consented Sudoku crops.
Run the offline font regression checks before training:

```bash
.venv-converter/bin/python -m unittest training/test_google_fonts.py
```
