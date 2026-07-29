# Training-font provenance

The following font binaries are used only to generate synthetic private training
examples. They are distributed under the SIL Open Font License 1.1, included as
[`OFL-1.1.txt`](OFL-1.1.txt).

| File | Upstream source |
| --- | --- |
| `Roboto-Regular.ttf` | Google Fonts, `ofl/roboto` |
| `OpenSans-Regular.ttf` | Google Fonts, `ofl/opensans` |
| `NotoSans-Regular.ttf` | Google Fonts, `ofl/notosans` |
| `IBMPlexSans-Regular.ttf` | Google Fonts, `ofl/ibmplexsans` |

Downloaded from the [google/fonts](https://github.com/google/fonts) repository at
training-tool implementation time. No font file is shipped by the PWA.

## Curated reproducible subset

The versioned 24-family printed-font subset is in [`google/`](google/). Its
[`GOOGLE_FONTS.json`](google/GOOGLE_FONTS.json) lock file records the immutable
`google/fonts` commit, upstream paths, licence type, and SHA-256 for every font
and its accompanying licence. Use `training/fetch_google_fonts.py` to download
and verify precisely those pinned files; it rejects licences other than SIL OFL
or Apache-2.0. The generated digit corpus and all training results remain in
ignored `training-data/`.
