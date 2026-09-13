# BGM — the six pieces

Empty on purpose. The game is scored for six pieces of music and asks
for every one of them at the right moment already; the slots in
`src/assets/manifest.ts` are `null`, and a null slot is **silence, never
an error**, so the whole game runs correctly and quietly until the audio
is here.

## Dropping the music in

Per track, three lines and nothing else in the project changes — not a
screen, not the player, not a test:

1. Put the file in this folder.
2. `import` it at the top of `src/assets/manifest.ts`.
3. Put it in `BGM_ASSETS` against its id.

```ts
import bgmOpening from './audio/bgm/opening.mp3';
// …
export const BGM_ASSETS: Record<BgmId, string | null> = {
  OPENING: bgmOpening,
  // …
};
```

## The six ids, and where each is heard

| id | scene |
|---|---|
| `OPENING` | title screen, and the monologue that opens the game |
| `KAOS_EVENT` | Kaos's introduction; the four answers about a life |
| `ALDEN_VILLAGE` | Alden — home, the map, and every room read in |
| `TAVERN` | 月光亭 |
| `GREENWOOD_FOREST` | the greenwood, walked, and the man standing in the road |
| `NORMAL_BATTLE` | every fight — the story's and the forest's alike |

Which screen is which piece is decided in
`src/content/audio/sceneBgm.ts`, not here and not in any screen. A
filename is not a scene: renaming a file must never mean touching a
screen.

## What the files should be

- **Format:** `.mp3` for the widest reach (iOS Safari included). `.ogg`
  is smaller but not universal; `.m4a`/AAC is also safe. Vite inlines
  or copies whatever is imported, so any of them works — the choice is
  about which phones can play it.
- **Loop:** every one of these loops, forever, while the scene is up.
  Trim the head and tail so the seam is not audible; `HTMLAudioElement`
  loops sample-exactly at the file's own boundaries and will expose a
  gap or a click if one is baked in.
- **Level:** master them at comparable loudness. The game crossfades
  between them at one volume setting, so a piece mastered louder than
  its neighbours will jump when the player walks into that room.
- **Size:** the review build is a single HTML file with a hard 16 MiB
  ceiling, and it is presently at about 15.5 MiB — so six pieces of
  music do not fit in it as they are. See below.

## The size problem, honestly

`npm run build` (the ordinary build) has no such limit: the music is
served as separate files and nothing needs to shrink.

`npm run build:singlefile` — the artifact used for review on a phone —
inlines every asset into one HTML file, and that file may not exceed
16 MiB. There is roughly half a megabyte of room left. Six looping
pieces at a normal music bitrate are several megabytes.

`scripts/review-encode-assets.mjs` already exists for exactly this
shape of problem: it re-encodes heavy assets for the single-file build
only, leaving the originals untouched and the ordinary build
full-quality. Extending it to the audio — mono, a low bitrate, a
shortened loop — is the way the review build gets music. The
originals in this folder stay as delivered.
