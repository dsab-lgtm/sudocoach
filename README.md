# SudoCoach

An offline-first, camera-first Sudoku solver. It is a static React PWA: puzzle photos
and solving data remain on the device, and a scan is always reviewed before it becomes
an immutable puzzle.

## Run locally

```sh
npm install
npm run dev
```

`npm run build`, `npm test`, and `npm run lint` provide the production verification
baseline. Pushing `main` deploys the built static site to GitHub Pages.

## Recognition model

The scanner includes local grid detection, cell cleanup, confidence display, and an
offline template fallback. To enable the bundled TensorFlow classifier, add a licensed,
quantized TensorFlow.js model and its weight shards under
`public/models/sudoku-digits/`, together with a `metadata.json` declaring the 28×28×1
input, ordered `1`–`9` labels, preprocessing version, confidence thresholds, and
held-out metrics. It is loaded from the installed app cache, never from an OCR API;
invalid or missing model assets deliberately use the local template fallback.
Validate any model against the scanner fixture set before publishing it.

### Converter environment

The Python converter is intentionally isolated from both the app's Node dependencies
and any user-level Python packages. Use Python 3.11 and create `.venv-converter` from
`requirements-converter.txt`; the pinned stack is for Apple Silicon. Run
`.venv-converter/bin/python scripts/verify_converter.py` to verify that it can export
a quantized, 9-class TensorFlow.js Layers model before converting the real classifier.

### Private real-photo training

The four consented iPhone source photos, their JPEG derivatives, annotations, crops,
and training runs are kept under ignored `training-data/`. See
[training/README.md](training/README.md) for the local preparation, annotation,
training, and quality-gated export workflow. A model is never published unless its
held-out real-photo accuracy is at least 97% and every represented digit class reaches
95% recall.

## Privacy

The captured photo only lives in memory while the user reviews the scan. Confirming a
puzzle persists the grid and puzzle progress to IndexedDB, but discards the photo.
