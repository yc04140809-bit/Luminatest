import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { KIT_PARTS, KIT_PARTS_LIST, kitFileKey, kitImagesFrom, kitRootVars, kitStyle } from './skin';

/** UI 素材の受け皿 (2026-10-16): a picture put in the folder by name is used, as the sound folder does. */
describe('the receiving end for delivered UI pictures', () => {
  it('a file is read by its name — part and state — and anything else is ignored', () => {
    expect(kitFileKey('menuButton.hover.png')).toEqual(['menuButton', 'hover']);
    expect(kitFileKey('placeLabel.selected.webp')).toEqual(['placeLabel', 'selected']);
    expect(kitFileKey('README.md')).toBeNull();
    expect(kitFileKey('menuButton.pressed.png')).toBeNull();
    expect(kitFileKey('crystalThing.normal.png')).toBeNull();
    const images = kitImagesFrom({ '/x/menuButton.normal.png': 'u1', '/x/menuButton.disabled.png': 'u2', '/x/.DS_Store': 'no' });
    expect(images).toEqual({ menuButton: { normal: 'u1', disabled: 'u2' } });
  });

  it('every delivered file in the folder is a real part and state', () => {
    const folder = new URL('../../../../mugen-assets/files/ui/skin/', import.meta.url);
    const files = readdirSync(folder).filter((f) => /\.(png|webp)$/.test(f));
    for (const f of files) expect(kitFileKey(f), f).not.toBeNull();
  });

  it('with a picture: drawn 9-sliced, each state its own picture or the usual one; without: the stand-in, same room', () => {
    const none = kitStyle('menuButton', {});
    expect(none.skinned).toBe(false);
    expect(none.vars['--kit-img-normal']).toBeUndefined();
    expect(none.vars['--kit-min-h']).toBe(`${KIT_PARTS.menuButton.minHeight}px`);
    const some = kitStyle('menuButton', { menuButton: { normal: 'n.png', active: 'a.png' } });
    expect(some.skinned).toBe(true);
    expect(some.vars['--kit-img-normal']).toBe('url("n.png")');
    expect(some.vars['--kit-img-active']).toBe('url("a.png")');
    expect(some.vars['--kit-img-hover']).toBe('url("n.png")');
    expect(some.vars['--kit-disabled-opacity']).toBe('0.5');
    expect(some.vars['--kit-slice']).toMatch(/^\d+ \d+ \d+ \d+$/);
  });

  it('every part has room for its words and a least height — never a fixed one', () => {
    for (const part of KIT_PARTS_LIST) {
      const spec = KIT_PARTS[part];
      expect(spec.minHeight, part).toBeGreaterThan(0);
      expect(spec.padX, part).toBeGreaterThanOrEqual(0);
      expect(Object.keys(spec)).not.toContain('height');
    }
  });

  it('for stylesheets not built from the parts (the battle HUD): every delivered picture as a root variable', () => {
    const vars = kitRootVars({ panel: { normal: 'p.png' }, frameRound: { normal: 'r.png', active: 'ra.png' } });
    expect(vars['--sk-panel-normal']).toBe('url("p.png")');
    expect(vars['--sk-panel-hover']).toBe('url("p.png")');
    expect(vars['--sk-frameRound-active']).toBe('url("ra.png")');
    expect(vars['--sk-panel-slice']).toMatch(/^\d+ \d+ \d+ \d+$/);
    expect(vars['--sk-menuButton-normal']).toBeUndefined();
  });
});
