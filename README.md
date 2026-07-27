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
`public/models/sudoku-digits/`. It is loaded from the installed app cache, never from
an OCR API. Validate any model against the scanner fixture set before publishing it.

## Privacy

The captured photo only lives in memory while the user reviews the scan. Confirming a
puzzle persists the grid and puzzle progress to IndexedDB, but discards the photo.
