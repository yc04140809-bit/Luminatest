// TEST FIXTURES ONLY — never imported by the game.
//
// LEGACY TEST FIXTURES (author decision C5, 2026-10-02): the three files
// in legacy-bridge-v1.0/ are the old bridge package v1.0's example deploy
// files, byte for byte. They are NOT the specification — that is FORGE's
// own implementation (docs/FORGE_IMPORT.md, "SOURCE VERIFIED 2026-10-02")
// — and carry values FORGE does not output (occupationMode CURRENT_FACT,
// visualDirection.intensity NORMAL). No rule is derived from them; they
// are replaced by SOURCE VERIFIED fixtures as real packages arrive.
//
// They are marked `sampleOnly: true`, and the importer refuses to register
// them; the tests prove that. To test registering, `asReal` makes an
// in-memory copy with the sample mark taken off, which only ever lives in
// a test's throwaway store. No sample is ever registered in a real save.

import { readFileSync } from 'node:fs';
import type { ForgeDeployPackage } from '../types';

export type SampleName = 'human' | 'normal-monster' | 'boss-monster';

/** The sample file's text, exactly as shipped. */
export function sampleText(name: SampleName): string {
  return readFileSync(new URL(`./legacy-bridge-v1.0/${name}-deploy.sample.json`, import.meta.url), 'utf8');
}

/** The sample, parsed. Still `sampleOnly: true`. */
export function sample(name: SampleName): ForgeDeployPackage {
  return JSON.parse(sampleText(name)) as ForgeDeployPackage;
}

/** The hashes FORGE's tools/validate-deploy.mjs printed for the three samples. */
export const TOOL_HASHES: Record<SampleName, string> = {
  human: 'dff0705bbce2e333e4483b7e9aa28531fdc48075b1547c4559e0bd685b9f68e0',
  'normal-monster': '48acfb4736bb0474c66476bf6089622680b2dd72c01dcb07e0261422eb273ff1',
  'boss-monster': '20913d8f77314194fe16fb46db75e5ae5bb4dcdf57640cb5c5885413d82bd69b',
};

/**
 * A test-only copy that is not a sample, with changes applied by a
 * mutator. Deep-copied, so the parsed sample is never touched.
 */
export function asReal(
  name: SampleName,
  change: (p: ForgeDeployPackage) => void = () => {},
): ForgeDeployPackage {
  const copy = JSON.parse(sampleText(name)) as ForgeDeployPackage;
  delete copy.sampleOnly;
  change(copy);
  return copy;
}

/** The same character, sent again later as `0.1-r<n>`. */
export function resent(p: ForgeDeployPackage, n: number, change: (p: ForgeDeployPackage) => void = () => {}): ForgeDeployPackage {
  const copy = JSON.parse(JSON.stringify(p)) as ForgeDeployPackage;
  copy.deployment.deployedVersion = `0.1-r${n}`;
  copy.deployment.deployedAt = new Date(Date.parse(p.deployment.deployedAt) + n * 3_600_000).toISOString();
  change(copy);
  return copy;
}
