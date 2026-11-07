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

/**
 * The sheet's small ornaments (ui/skin/decor/: a crystal shard, a spark), cut from it as they are:
 * for effects that scatter them (BREAK's breaking crystal). As root variables `--sk-decor-<name>`.
 */
const decor = import.meta.glob('../../../mugen-assets/files/ui/skin/decor/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function decorRootVars(files: Record<string, string> = decor): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(files)) {
    const name = /([A-Za-z0-9]+)\.(png|webp)$/.exec(path)?.[1];
    if (name) out[`--sk-decor-${name}`] = `url("${url}")`;
  }
  return out;
}
