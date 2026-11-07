import type { CelebrateArt } from '@mugen/content/rewards/celebrate';

/**
 * THE HIGH-FIVE, AS A PICTURE (ハイタッチ, 2026-10-11): the hero and Kaos,
 * chibi, hands met — placed as delivered (mugen-assets/files/characters/duo/
 * duo-hitouch.png, transparent). One today; a face variant, a craft's own,
 * a cooking one… is one more name in content/rewards/celebrate.ts and one
 * line here.
 */
const FILES: Record<CelebrateArt, () => Promise<string>> = {
  HITOUCH: async () => (await import('@mugen/assets/files/characters/duo/duo-hitouch.png')).default,
};

const held = new Map<CelebrateArt, Promise<string | null>>();

/** The picture's URL (loaded once, and decoded ahead so the first one is not late). */
export function celebrateArtSrc(art: CelebrateArt): Promise<string | null> {
  const already = held.get(art);
  if (already) return already;
  const loading = FILES[art]()
    .then(async (src) => {
      try {
        const img = new Image();
        img.src = src;
        await img.decode();
      } catch {
        // Drawn anyway; decoding ahead is only to be prompt.
      }
      return src;
    })
    .catch((e) => {
      console.warn(`Could not load the celebration picture ${art}`, e);
      return null;
    });
  held.set(art, loading);
  return loading;
}
