# BGM

**画面との対応表の正本は `docs/BGM_MAP.md`。** 用語（TITLE_SCREEN / OPENING /
ALDEN_HOME / ALDEN_VILLAGE）もそちらで固定しています。

The delivered music, byte for byte as it was handed over. Nothing in
this folder is ever rewritten, resampled or overwritten by any build.

| file | delivered title | id | where it is heard |
|---|---|---|---|
| `title-main.mp3` | MUGEN ZERO タイトル画面 | `TITLE_MAIN` | TITLE_SCREEN only (logo + 「はじめる」) |
| `opening.mp3` | また、ここで。 (Remastered) | `OPENING` | the monologue after the title (and the one-off theme song) |
| `alden-home.mp3` | MUGEN ZERO タイトル画面 | — (not referenced) | same recording as `title-main.mp3`; kept, not deleted |
| `kaos-event.mp3` | ケイオスちゃんのテーマ会話シーン | `KAOS_EVENT` | her introduction; the four answers about a life |
| `alden-village.mp3` | アルデン村のテーマ | `ALDEN_VILLAGE` | all of Alden — the house, its pages (status, bag…), the map, the shop |
| `tavern.mp3` | 酒場のテーマ | `TAVERN` | 月光亭 |
| `greenwood-forest.mp3` | 森林探索のテーマ | `GREENWOOD_FOREST` | the greenwood, walked, and the man standing in the road |
| `normal-battle.mp3` | 通常戦闘① | `NORMAL_BATTLE` | an ordinary fight: the forest's, and any other nobody wrote |
| `boss-battle.mp3` | 勇敢 | `BOSS_BATTLE` | the fights that are about something — Gald's, today |

Every one of them carries `yc04140809` as its artist tag: this is the
author's own music, written for this game. There is no third-party
licence to honour and no credit owed to anybody else — which is worth
writing down, because the question will be asked again the next time a
file arrives.

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

## The artifact's music is not this music

`npm run build` — the ordinary build — emits these files as they are.
That is no longer a claim: `scripts/check-build-audio.mjs` runs at the
end of that build, hashes every audio file it emitted and compares it
against this folder. A file that is not byte-identical to one of these
six fails the build, and a file that is byte-identical to one of the
artifact's preview loops fails it by name. So a low-bitrate cut cannot
reach a player even if somebody copies the wrong line between configs.

`npm run build:singlefile` — the artifact reviewed on a phone — inlines
every asset into one HTML file which may not exceed 16 MiB, base64
included. Sixteen minutes of music does not fit in that at any bitrate,
and the artwork is not being made worse to find room. So
`scripts/review-encode-assets.mjs` writes SEPARATE copies into
`.review-assets/` and only that build is aliased to them.

A preview copy is a **loop**, not a slice:

- **45 to 75 seconds**, and the exact length is CHOSEN per piece. The
  encoder looks for the point where the music most nearly repeats —
  comparing the spectrum two seconds either side of every candidate
  seam — and takes the best fit, refusing seams that land in a quiet
  patch or that change loudness across the join. On a piece with a
  regular structure that lands on a phrase or bar boundary.
- **the start is chosen the same way**, rather than fixed.
- **the seam is crossfaded into the file.** The three quarters of a
  second that follow the loop point are faded down over the three
  quarters of a second at the loop's start, so the wrap is a
  continuation of the phrase rather than a cut to a different one.
  Nothing at runtime knows: the file simply loops cleanly.
- **48 kbps, stereo, 32 kHz.** Stereo deliberately, with the bitrate
  taking the cut instead: what these are being checked for is whether
  they belong in their scene, and half the width of a mix is half the
  evidence.
- **no cover art** (`-vn`). Every file carries a 360x640 JPEG, and
  without that flag ffmpeg copies it into the preview — where it cost
  more than the audio did.
- all six together are held under a **total seconds budget**, which is
  the one number the artifact's size actually turns on. The encoder
  finds the longest shared length cap that fits it, so a piece with a
  good long loop gets one when its neighbours are short.

They are review copies and they are not the music: a preview loop's
seam is not the delivered music's, there is no seam in the delivered
music at all, and the bitrate is a quarter of what the game ships.

**The game's own looping is unchanged and always has been.** The audio
manager sets `loop` on the element and the project sets no loop point
anywhere, so every piece plays to the end of its own file and starts
again — 3:14 of forest, 2:30 of battle. The preview loop exists inside
the artifact and nowhere else.

The loop points are cached in `.review-assets/loop-points.json`, keyed
by the size and modification time of the six sources, so the search
only runs when the music changes.

Building the artifact needs `ffmpeg` and `python3` with `numpy` on
PATH. Without them the build stops and says so rather than quietly
shipping something wrong; the ordinary build needs neither.

Room for the previews was found by adding the last two heavy PNGs
nobody had listed — `bakery-owner-fullbody` and `lina-fullbody`, 2.0 MB
between them — to the image list at the SAME quality as everything
else. Nothing already in that list got worse to make space for a song,
and nothing has since.
