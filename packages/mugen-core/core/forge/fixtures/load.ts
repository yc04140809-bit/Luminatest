// TEST FIXTURES ONLY — never imported by the game.
//
// SOURCE VERIFIED FIXTURES (bridge-v1.1/): the bridge package v1.1's
// example deploy packages, byte for byte — produced from FORGE's current
// buildDeployPackage(). They meet the contract the importer checks.
//
// LEGACY TEST FIXTURES (legacy-bridge-v1.0/): the old v1.0 samples, kept
// only to show that the importer refuses what FORGE does not output
// (occupationMode CURRENT_FACT, visualDirection.intensity NORMAL, an
// incomplete lifeStage). No rule is derived from them.
//
// All are marked `sampleOnly: true`, and the importer refuses to register
// them; the tests prove that. To test registering, `asReal` makes an
// in-memory copy with the sample mark taken off, which only ever lives in
// a test's throwaway store. No sample is ever registered in a real save.

import { readFileSync } from 'node:fs';
import type { ForgeDeployPackage } from '../types';

export type SampleName = 'human' | 'normal-monster' | 'boss-monster';

/** The sample file's text, exactly as shipped. */
export function sampleText(name: SampleName): string {
  return readFileSync(new URL(`./bridge-v1.1/${name}-deploy.sample.json`, import.meta.url), 'utf8');
}

/** The sample, parsed. Still `sampleOnly: true`. */
export function sample(name: SampleName): ForgeDeployPackage {
  return JSON.parse(sampleText(name)) as ForgeDeployPackage;
}

/** The hashes the bridge v1.1's tools/validate-deploy.mjs printed for the three samples. */
export const TOOL_HASHES: Record<SampleName, string> = {
  human: '4b5c25962ae3af132715e9c668c76b3cdbf65ddb7cc06f35401087bdf7cb2134',
  'normal-monster': '928c1645498ad24a261332f315e94bbe5cc42ae053c132c377420652dd063b9c',
  'boss-monster': '196734ec3fdd5226033e7ff4c3f4f8b79e1a3ea3072821b2fbc76c43a4c292bf',
};

/** LEGACY: an old v1.0 sample's text, exactly as shipped — for showing it is refused. */
export function legacySampleText(name: SampleName): string {
  return readFileSync(new URL(`./legacy-bridge-v1.0/${name}-deploy.sample.json`, import.meta.url), 'utf8');
}

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
