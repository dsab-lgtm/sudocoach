# Sudoku digit model

Production builds must place a licensed, quantized TensorFlow.js 1–9 classifier at
`public/models/sudoku-digits/model.json` (and its weight shards). The scanner keeps
all uncertain classifications editable and never promotes an unverified model output
to an immutable clue. This repository intentionally does not bundle a model with
unknown training-data provenance.
