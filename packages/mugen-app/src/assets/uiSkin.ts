import { kitImagesFrom, type KitImages } from '../ui/kit/skin';

/**
 * The delivered UI pictures (mugen-assets/files/ui/skin/, ui/kit/skin.ts):
 * read as a folder, so a file put there with the right name is used — no
 * line to add. Anything not named `<part>.<state>.png|webp` is ignored.
 */
const delivered = import.meta.glob('../../../mugen-assets/files/ui/skin/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const UI_SKIN: KitImages = kitImagesFrom(delivered);
