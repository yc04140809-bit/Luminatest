import type { OpeningImage } from '@mugen/content/story/openingComic';

/**
 * THE OPENING'S PICTURES (2026-10-16) — each file by name, its own chunk, as
 * delivered (mugen-assets/files/opening/). A picture is replaced by
 * replacing its file; a page added is one line here and one in
 * content/story/openingComic.ts.
 */
const LOADERS: Record<OpeningImage, () => Promise<string>> = {
  op_01_intro_comic: async () => (await import('@mugen/assets/files/opening/op_01_intro_comic.png')).default,
  op_02_warning_comic: async () => (await import('@mugen/assets/files/opening/op_02_warning_comic.png')).default,
  op_03_sorejaa: async () => (await import('@mugen/assets/files/opening/op_03_sorejaa.png')).default,
  op_04_noise: async () => (await import('@mugen/assets/files/opening/op_04_noise.png')).default,
  op_05a_hatena: async () => (await import('@mugen/assets/files/opening/op_05a_hatena.png')).default,
  op_05_doushitano: async () => (await import('@mugen/assets/files/opening/op_05_doushitano.png')).default,
  op_06_jitsuwane: async () => (await import('@mugen/assets/files/opening/op_06_jitsuwane.png')).default,
  op_06_noise: async () => (await import('@mugen/assets/files/opening/op_06_noise.png')).default,
  op_flash_01_smile: async () => (await import('@mugen/assets/files/opening/op_flash_01_smile.png')).default,
  op_flash_01b_doushitano: async () => (await import('@mugen/assets/files/opening/op_flash_01b_doushitano.png')).default,
  op_flash_01b_noise: async () => (await import('@mugen/assets/files/opening/op_flash_01b_noise.png')).default,
  op_flash_02_hold_hand: async () => (await import('@mugen/assets/files/opening/op_flash_02_hold_hand.png')).default,
  op_flash_02_noise: async () => (await import('@mugen/assets/files/opening/op_flash_02_noise.png')).default,
  op_flash_03_release_hand: async () => (await import('@mugen/assets/files/opening/op_flash_03_release_hand.png')).default,
  op_flash_03_noise: async () => (await import('@mugen/assets/files/opening/op_flash_03_noise.png')).default,
  op_flash_04_ruins: async () => (await import('@mugen/assets/files/opening/op_flash_04_ruins.png')).default,
  op_flash_04_noise: async () => (await import('@mugen/assets/files/opening/op_flash_04_noise.png')).default,
  op_flash_05_machine_angel: async () => (await import('@mugen/assets/files/opening/op_flash_05_machine_angel.png')).default,
  op_flash_06_stand: async () => (await import('@mugen/assets/files/opening/op_flash_06_stand.png')).default,
  op_flash_06_noise: async () => (await import('@mugen/assets/files/opening/op_flash_06_noise.png')).default,
  op_flash_07_cry: async () => (await import('@mugen/assets/files/opening/op_flash_07_cry.png')).default,
  op_flash_07_cry_closeup: async () => (await import('@mugen/assets/files/opening/op_flash_07_cry_closeup.png')).default,
  op_poweroff_black: async () => (await import('@mugen/assets/files/opening/op_poweroff_black.png')).default,
  op_funny_face: async () => (await import('@mugen/assets/files/opening/op_funny_face.png')).default,
  op_reaction_comic: async () => (await import('@mugen/assets/files/opening/op_reaction_comic.png')).default,
  op_choice_comic: async () => (await import('@mugen/assets/files/opening/op_choice_comic.png')).default,
  op_jaa: async () => (await import('@mugen/assets/files/opening/op_jaa.png')).default,
  op_gardo_preview: async () => (await import('@mugen/assets/files/opening/op_gardo_preview.png')).default,
  op_itterasshai: async () => (await import('@mugen/assets/files/opening/op_itterasshai.png')).default,
  op_mata_kokode: async () => (await import('@mugen/assets/files/opening/op_mata_kokode.png')).default,
};

const held = new Map<OpeningImage, Promise<string | null>>();

export function openingArt(key: OpeningImage): Promise<string | null> {
  const already = held.get(key);
  if (already) return already;
  const loading = LOADERS[key]().catch((e) => {
    console.warn(`Could not load the opening picture ${key}`, e);
    return null;
  });
  held.set(key, loading);
  return loading;
}

/** Fetch these ahead (the next few pages), so a page is drawn the moment it is reached. */
export function preloadOpeningArt(keys: readonly OpeningImage[]): void {
  for (const k of keys)
    void openingArt(k).then((src) => {
      if (src && typeof Image !== 'undefined') {
        const img = new Image();
        img.src = src;
      }
    });
}
