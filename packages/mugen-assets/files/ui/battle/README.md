# BATTLE UI — where each piece came from

The delivered art for this folder is the **BATTLE UI ASSET PACK v0.1 —
GREENWOOD FOREST** sheets, plus the standalone frames delivered beside
them. The sheets are contact sheets: several pieces on one canvas, most
of them on a transparent ground.

Each file here is **one piece of a delivered sheet**, cut out at the
rectangle below and scaled down. Nothing is redrawn, recoloured,
recomposed or regenerated, and no piece is stretched out of shape where
it is used:

* frames are **nine-sliced** (`border-image`), so the ornamental ends
  keep their own proportions however wide the box is;
* meters are **revealed**, not squashed — the fill is clipped from the
  right, so the delivered gradient and its chevron cap are always drawn
  at their own aspect.

| file | source sheet | rectangle (x, y, w, h) | scaled to |
| --- | --- | --- | --- |
| `chip-auto-on.png` | a1d1da58 | 28, 440, 164, 208 | 150w |
| `chip-auto-off.png` | a1d1da58 | 196, 444, 160, 204 | 150w |
| `chip-x2-on.png` | a1d1da58 | 368, 440, 164, 208 | 150w |
| `chip-x2-off.png` | a1d1da58 | 536, 440, 160, 208 | 150w |
| `chip-escape-on.png` | a1d1da58 | 704, 440, 172, 188 | 150w |
| `chip-escape-off.png` | a1d1da58 | 872, 440, 172, 188 | 150w |
| `command-diamond.png` | ed6a0b56 | 40, 0, 1200, 1230 | 180w |
| `turn-slot.png` | ed3821d4 | 500, 240, 160, 180 | 96w |
| `turn-next.png` | ed3821d4 | 652, 266, 60, 126 | 30w |
| `party-card.png` | b01fac0c | 16, 72, 1914, 688 | 560w |
| `enemy-plate.png` | 97a9a815 | 10, 45, 2152, 655 | 640w |
| `message-window.png` | d62195d9 | 10, 30, 2156, 668 | 720w |
| `memory-panel.png` | 36da41e9 | 55, 630, 465, 270 | 420w |
| `memory-star.png` | 36da41e9 | 85, 690, 130, 130 | 64w |
| `bar-rail.png` | 36da41e9 | 536, 772, 310, 32 | 360w |
| `bar-hp.png` | 36da41e9 | 536, 810, 310, 36 | 360w |
| `bar-mp.png` | 36da41e9 | 536, 848, 310, 34 | 360w |
| `bar-alt.png` | 36da41e9 | 536, 886, 310, 32 | 360w |

## The two pieces whose rails were emptied

`party-card.png` and `enemy-plate.png` were delivered with **specimen
bars drawn into their rails** — a full red one, a full blue one — the
way a UI pack shows what a frame is for. A card showing those would tell
the player a character is at full health whatever the fight thinks, and
would say it even for a rail this fight keeps no number on at all.

So when those two pieces were cut, the pack's **own empty rail**
(`bar-rail.png`, from the same sheet) was pasted into each rail
rectangle:

| file | rail rectangles blanked (in the scaled piece) |
| --- | --- |
| `party-card.png` | 200, 90 → 536, 109 and 200, 123 → 536, 142 |
| `enemy-plate.png` | 112, 100 → 592, 129 |

Nothing was painted, drawn or invented to do it: one piece of the pack
was laid over another piece of the same pack, in the place the pack
itself puts it. The live bar is then the only bar on the frame.

## The one piece that needed more than a crop

`memory-panel.png` is the only piece whose sheet has an opaque ground —
the asset pack's tan gradient. It was lifted off by flooding inward from
the four corners and clearing every pixel the flood reached, stopping at
the first pixel more than a small tolerance away from the ground colour.
The panel is dark navy behind bright gold and the ground is a smooth
light tan, so the flood stops at the frame and never reaches the art.
Only the four rounded corners were cleared — 1,270 pixels of 125,550.

Its baked contents (four `？` rows and `記憶の深さ 0%`) are **not** used:
the panel is nine-sliced as a frame and the interior is drawn live, so
what the player reads is the world's own memory and not a picture of it.

## Sizes

These are scaled well down from the delivered sheets, which run 1.2–3.1
MB each. The whole folder is about 1.2 MB of PNG; the single-file
artifact re-encodes it to WebP (see `scripts/review-encode-assets.mjs`),
because that build inlines every asset as base64 and has a hard 16 MiB
ceiling.
