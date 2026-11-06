// THE WHOLE E2E SUITE, IN TWO PARTS (作者採用 2026-11-06, C6): the specs that do not measure time two at once, then
// the ones that do (playwright.config TIMED_SPECS) on their own, one at a time. Both parts always run; the exit
// code is a failure if either failed. Extra arguments (e.g. --reporter=line) go to both.
import { spawnSync } from 'node:child_process';

const extra = process.argv.slice(2);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const part = (project, workers) => {
  console.log(`\n=== e2e: ${project} (${workers} at once) ===`);
  return spawnSync(npx, ['playwright', 'test', `--project=${project}`, `--workers=${workers}`, ...extra], { stdio: 'inherit' }).status ?? 1;
};
const calm = part('calm', 2);
const timed = part('timed', 1);
console.log(`\n=== e2e: calm ${calm === 0 ? 'passed' : 'FAILED'}, timed ${timed === 0 ? 'passed' : 'FAILED'} ===`);
process.exit(calm === 0 && timed === 0 ? 0 : 1);
