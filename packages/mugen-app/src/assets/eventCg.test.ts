import { describe, expect, it } from 'vitest';
// The Artifact's resolver, which imports the whole manifest. Fine in a
// test — nothing here is bundled — and it is the thing to agree with.
import { eventCgSrc } from '@mugen/assets';
import { EVENT_CG_KEYS } from '@mugen/assets/keys';
import { eventCg } from './eventCg';

const file = (src: string | null | undefined) =>
  src ? decodeURIComponent(src).split('/').pop()!.replace(/\?.*$/, '') : null;

describe('event CGs', () => {
  for (const key of EVENT_CG_KEYS) {
    it(`${key} is the Artifact's picture`, async () => {
      const mine = await eventCg(key);
      expect(mine).not.toBeNull();
      expect(file(mine)).toBe(file(eventCgSrc(key)));
    });
  }

  it('is nothing at all for no key', async () => {
    expect(await eventCg(null)).toBeNull();
  });
});
