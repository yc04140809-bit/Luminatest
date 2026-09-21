import { describe, expect, it } from 'vitest';
import {
  CHARACTER_APPEARANCES,
  SKIN_DEFINITIONS,
  appearanceOf,
  skinOf,
  statusArtOf,
  statusPortraitKeyOf,
  statusVisualKeyOf,
  type SkinDefinition,
} from './characterAppearance';
import { BATTLE_PROFILES } from './battleProfiles';

describe('how somebody looks, kept apart from what they are', () => {
  it('answers with the default skin while nobody has chosen', () => {
    expect(appearanceOf('hero')?.selectedSkinId).toBeNull();
    expect(skinOf('hero')?.skinId).toBe('hero/default');
    expect(statusPortraitKeyOf('kaos')).toBe('kaos');
  });

  it('says nothing about somebody it has never heard of', () => {
    expect(appearanceOf('levi')).toBeNull();
    expect(statusPortraitKeyOf('levi')).toBeNull();
  });

  /**
   * A build that dropped an outfit must not cost somebody the screen.
   * The choice stays in place, so the skin coming back brings it back.
   */
  it('falls back to the default when the chosen skin is gone', () => {
    const missing = { ...CHARACTER_APPEARANCES.hero, selectedSkinId: 'hero/nonexistent' };
    const chosen = missing.selectedSkinId ? SKIN_DEFINITIONS[missing.selectedSkinId] : undefined;
    expect(chosen).toBeUndefined();
    expect(SKIN_DEFINITIONS[missing.defaultSkinId].assetRefs.statusPortrait).toBe('hero');
  });

  /**
   * THE ONE RULE A SKIN MUST NEVER BREAK. The moment an outfit can
   * carry a number, changing clothes becomes a way to get stronger.
   */
  it('lets a skin carry no number that could decide a fight', () => {
    const banned = ['maxHp', 'maxMp', 'attack', 'attackMin', 'attackMax', 'defence',
      'weaponType', 'battleStyle', 'level', 'stats', 'bonus'];
    for (const skin of Object.values(SKIN_DEFINITIONS)) {
      for (const key of Object.keys(skin as unknown as Record<string, unknown>)) {
        expect(banned, `${skin.skinId} must not carry ${key}`).not.toContain(key);
      }
      for (const key of Object.keys(skin.assetRefs)) {
        expect(banned, `${skin.skinId}.assetRefs must not carry ${key}`).not.toContain(key);
      }
    }
  });

  it('gives every skin an owner who exists, and every drawable person a skin', () => {
    for (const skin of Object.values(SKIN_DEFINITIONS)) {
      expect(CHARACTER_APPEARANCES[skin.characterId]).toBeDefined();
    }
    for (const id of Object.keys(BATTLE_PROFILES)) {
      expect(statusPortraitKeyOf(id), `${id} has a picture`).toBeTruthy();
    }
  });

  /**
   * The Artifact reads `portraitKey` and is not being touched this
   * round, so the old field has to keep saying what the new registry
   * says — one source of truth, two names for it.
   */
  it('keeps the compatibility fields in step with the registry', () => {
    for (const [id, profile] of Object.entries(BATTLE_PROFILES)) {
      expect(profile.portraitKey).toBe(statusPortraitKeyOf(id));
      expect(profile.skinId).toBe(CHARACTER_APPEARANCES[id].defaultSkinId);
    }
  });

  /**
   * TWO KINDS OF PICTURE, and the screen must be told which it has.
   * A finished rectangle carries its own painted background and is
   * framed as a picture; a cut-out master is stood on a floor. Answer
   * with the wrong kind and the art is either letterboxed or floating.
   */
  it('prefers the finished rectangle, and says that is what it gave', () => {
    expect(statusVisualKeyOf('kaos')).toBe('kaos');
    expect(statusArtOf('kaos')).toEqual({ key: 'kaos', kind: 'VISUAL' });
  });

  it('falls back to the cut-out master where no rectangle exists', () => {
    expect(statusVisualKeyOf('hero')).toBeNull();
    expect(statusArtOf('hero')).toEqual({ key: 'hero', kind: 'PORTRAIT' });
  });

  it('has nothing to draw for somebody with neither', () => {
    expect(statusArtOf('gald')).toBeNull();
  });

  /**
   * Neither kind waits on the other: the rich screen can arrive before
   * the reusable master does, and a master arriving must not replace a
   * finished picture. So every drawable person keeps a master, and a
   * visual is only ever an addition to one.
   */
  it('keeps a reusable master for everybody, visual or not', () => {
    for (const skin of Object.values(SKIN_DEFINITIONS)) {
      expect(skin.assetRefs.statusPortrait, `${skin.skinId} has a master`).toBeTruthy();
    }
  });

  it('versions the art so replacing a file need not rename its id', () => {
    for (const skin of Object.values(SKIN_DEFINITIONS satisfies Record<string, SkinDefinition>)) {
      expect(skin.version).toBeGreaterThanOrEqual(1);
    }
  });
});
