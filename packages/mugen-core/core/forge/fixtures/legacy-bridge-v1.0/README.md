# LEGACY TEST FIXTURE — bridge package v1.0 samples

These three files are CHARACTER FORGE's example deploy files from the old
bridge package `mugen-character-forge-to-zero-bridge-v1.0` (examples/),
byte for byte. They are kept **for tests only** (author decision C5,
2026-10-02).

- They are **not** the specification. The specification is FORGE's own
  implementation as recorded in `docs/FORGE_IMPORT.md`
  ("SOURCE VERIFIED 2026-10-02").
- They contain values FORGE itself does not output, for example
  `lifeStage.occupationMode: "CURRENT_FACT"` (FORGE: `CURRENT_OR_AGE_APPROPRIATE`)
  and `visualDirection.intensity: "NORMAL"` (FORGE: `SUBTLE` / `STANDARD` / `STRONG`).
  No rule may be derived from them, and no test may refuse a value the
  SOURCE VERIFIED specification allows because of them.
- They are marked `sampleOnly: true`; the importer refuses to register
  them. Tests use `asReal()` (in `../load.ts`) to make in-memory copies.
- They are replaced by SOURCE VERIFIED fixtures as real FORGE deploy
  packages become available.
