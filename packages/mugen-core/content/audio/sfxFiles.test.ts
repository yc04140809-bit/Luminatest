import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SFX_IDS } from './sfx';

/**
 * A MISNAMED SOUND IS A SILENT SOUND, and this is what says so.
 *
 * The sound folder wires itself: a file called `battle_hit.mp3` IS the
 * sound `battle_hit`, with no line of code anywhere. That is the whole
 * point — a delivered file just plays — and it has exactly one hazard,
 * which is that `battle_hitt.mp3` also needs no line of code and makes
 * no noise ever.
 *
 * So the folder is read here, against the vocabulary, and a name that
 * is not a real sound fails the build rather than disappearing. The
 * check is deliberately NOT in the loader: a build that refused to run
 * over a stray `.DS_Store` would be worse than the problem it solves.
 */
const SE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../mugen-assets/files/audio/se',
);

describe('the sound files that have been delivered', () => {
  const delivered = readdirSync(SE_DIR)
    .filter((name) => name.endsWith('.mp3'))
    .map((name) => name.replace(/\.mp3$/, ''));

  it('is every one of them named after a moment the game asks about', () => {
    for (const name of delivered) {
      expect(
        SFX_IDS,
        `${name}.mp3 is not a sound the game asks for — check it against SFX_IDS`,
      ).toContain(name);
    }
  });

  /**
   * Not a failure. Silence is the correct shipping state; this is a
   * line in the log for whoever is wondering whether the fight is
   * quiet because of a bug or because nobody has recorded a sword yet.
   */
  it('says how many are in, and how many are still owed', () => {
    console.info(
      `[sfx] ${delivered.length} of ${SFX_IDS.length} delivered` +
        (delivered.length
          ? `: ${delivered.join(', ')}`
          : ' — the game is silent, which is expected'),
    );
    expect(delivered.length).toBeLessThanOrEqual(SFX_IDS.length);
  });
});
