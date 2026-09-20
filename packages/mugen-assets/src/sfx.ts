// THE SOUND EFFECTS THAT HAVE BEEN DELIVERED, whichever those are.
//
// EVERY OTHER ASSET IN THIS PACKAGE IS NAMED IN A MAP BY HAND, and for
// every other asset that is right: a background belongs to a place, a
// portrait to a character, and which one goes where is a decision
// somebody makes once and writes down.
//
// A sound effect is not like that. Its id IS its filename, the mapping
// is the identity function, and a hand-written map would be twenty-four
// lines that say `battle_hit: battleHit` and one more chance to mistype
// one. So this reads the folder instead, and the promise the brief
// asked for — "a file we put there just plays" — is literally true:
// there is no line to add.
//
// A FILE WHOSE NAME IS NOT AN SfxId IS IGNORED, silently and on
// purpose, because the alternative is a build that fails over a
// `.DS_Store`. `sfxFiles.test.ts` is what catches the typo instead: it
// reads the same folder and fails if anything in it is not a real id.
//
// NOT IN THE ARTIFACT. The single-file build aliases this module to
// `sfxNone.ts`, so the sixteen-megabyte page carries no sound effects
// at all and the phone build carries them whole. That is the whole of
// the arrangement, and it is one line in vite.config.singlefile.ts.

const delivered = import.meta.glob('../files/audio/se/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/**
 * Sound id → the URL of the file for it. Absent means no such sound
 * has been delivered, which the player experiences as silence.
 */
export const SFX_FILES: Record<string, string> = Object.fromEntries(
  Object.entries(delivered).map(([path, url]) => [
    path.split('/').pop()!.replace(/\.mp3$/, ''),
    url,
  ]),
);
