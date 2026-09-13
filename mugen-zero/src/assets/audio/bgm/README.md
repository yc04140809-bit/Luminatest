# BGM — the six pieces

The delivered music, byte for byte as it was handed over. Nothing in
this folder is ever rewritten, resampled or overwritten by any build.

| file | delivered title | id | where it is heard |
|---|---|---|---|
| `opening.mp3` | また、ここで。 (Remastered) | `OPENING` | title screen, and the monologue that opens the game |
| `kaos-event.mp3` | ケイオスちゃんのテーマ会話シーン | `KAOS_EVENT` | her introduction; the four answers about a life |
| `alden-village.mp3` | アルデン村のテーマ | `ALDEN_VILLAGE` | Alden — home, the map, and every room read in |
| `tavern.mp3` | 酒場のテーマ | `TAVERN` | 月光亭 |
| `greenwood-forest.mp3` | 森林探索のテーマ | `GREENWOOD_FOREST` | the greenwood, walked, and the man standing in the road |
| `normal-battle.mp3` | 通常戦闘① | `NORMAL_BATTLE` | every fight — the story's and the forest's alike |

They were identified by the TITLE TAG INSIDE EACH FILE, not by its
name: the names they arrived under were mangled in transit and five of
the six were indistinguishable from one another. The tags are recorded
above so that the identification can be checked rather than trusted.

All six: 48 kHz stereo, about 190 kbps VBR, 16 minutes between them,
23 MB. Each also carries a 360x640 cover image, which matters only to
the review encoder (see below).

## Which scene is which piece

Decided in `src/content/audio/sceneBgm.ts`, not here and not in any
screen. A filename is not a scene: renaming a file must never mean
touching a screen.

## Adding another piece

Three lines, and nothing else in the project changes:

1. Put the file in this folder.
2. `import` it at the top of `src/assets/manifest.ts`.
3. Give it an id in `BgmId` and put it in `BGM_ASSETS`.

For another FIGHTING piece there is a fourth: add its id to
`BATTLE_BGM_IDS` in `src/content/audio/battleBgm.ts`. The ♪ control in
the fight, the order the pieces cycle in, the saved choice and the
fallback for a save naming a piece that no longer exists all read that
list and need no other change. Add it to `REVIEW_AUDIO` in
`scripts/review-encode-assets.mjs` as well, or the artifact will have
no copy of it to inline.

## The review artifact, and why its music is not this music

`npm run build` — the ordinary build — emits these files as they are.
Verified by hashing: every MP3 in `dist/assets/` is byte-identical to
its source here.

`npm run build:singlefile` — the artifact reviewed on a phone — inlines
every asset into one HTML file which may not exceed 16 MiB, base64
included. Sixteen minutes of music does not fit in that at any bitrate.
So `scripts/review-encode-assets.mjs` writes SEPARATE copies into
`.review-assets/` and only that build is aliased to them:

- **45 seconds** of each, starting 8 seconds in — past the intro, into
  the piece proper.
- **48 kbps, stereo, 32 kHz.** Stereo deliberately, with the bitrate
  taking the cut instead: what these are being checked for is whether
  they belong in their scene, and half the width of a mix is half the
  evidence.
- **no cover art** (`-vn`). Every file carries a 360x640 JPEG, and
  without that flag ffmpeg copies it into the excerpt — where it cost
  more than the audio did.

About 0.27 MB each, a twelfth of the delivered weight. They are review
copies and they are not the music: the loop seam of a 45-second cut is
not the delivered music's seam, and the bitrate is well below what the
game ships.

Room for them was found by adding the last two heavy PNGs nobody had
listed — `bakery-owner-fullbody` and `lina-fullbody`, 2.0 MB between
them — to the image list at the SAME quality as everything else.
Nothing already in that list got worse to make space for a song.

Building the artifact needs `ffmpeg` on PATH. Without it the build
stops and says so rather than quietly shipping something wrong; the
ordinary build does not need it.
