# SOURCE VERIFIED TEST FIXTURES — bridge package v1.1 samples

These three files are the example deploy packages from the bridge package
`mugen-character-forge-to-zero-bridge-v1.1` (examples/), byte for byte.
The bridge says they were produced by running FORGE's current generator
and `buildDeployPackage()` (FORGE commit 36b7091, internal schema 13,
DEPLOY package schema 1.0), with only names set for the explanation.

- They follow the contract the importer checks (author decision 2026-10-05):
  `occupationMode: CURRENT_OR_AGE_APPROPRIATE`, `visualDirection.intensity`
  `SUBTLE` / `STANDARD` / `STRONG`, the full seven-field `lifeStage`.
- They are marked `sampleOnly: true` and use reserved sample ids
  (HUM-900001, MON-900001, MON-900002); the importer refuses to register
  them. Tests use `asReal()` (in `../load.ts`) for in-memory copies.
- The old v1.0 samples stay in `../legacy-bridge-v1.0/` as LEGACY TEST
  FIXTURES only. They no longer meet the contract (CURRENT_FACT, NORMAL,
  an incomplete lifeStage) and the importer refuses them.
