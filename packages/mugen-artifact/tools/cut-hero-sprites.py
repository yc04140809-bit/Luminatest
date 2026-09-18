#!/usr/bin/env python3
"""Cut the hero's exploration frames out of the official sprite sheet.

The sheet (art-source/hero-exploration-sheet.png) is a presentation
sheet, not a game asset: the figures stand on a dark painted gradient
with labels and a spec panel around them. This script takes the frames
the exploration screen needs, removes that background, and writes one
transparent PNG per frame into src/assets/characters/hero/.

Run it again only if the sheet changes:

    pip install pillow numpy scipy
    python3 tools/cut-hero-sprites.py

How the background comes off, since neither half works alone:

1. A flood fill from the edges of the sheet that may only travel through
   pixels where the image is locally flat. The painted gradient is
   smooth, so the fill crosses it; the outline around the figure is not,
   so the fill stops there.
2. That fill still leaks into the darkest parts of him (hair, cloak)
   wherever the outline fades. So a second test adds back anything that
   is far from the estimated background colour AND darker than it. The
   sheet lights each figure from behind, and that bloom is brighter than
   the paper, so requiring "darker" keeps the halo out — the game must
   not put a glow around the player.

The frames are then normalised: the IDLE block of the sheet is drawn
about 9% larger than the WALK block, which would make him jump in size
the moment he stopped, so IDLE is scaled down to match. Every frame is
written on one canvas size with his feet on the same line, so the game
can anchor him at the contact point of his boots and swap frames without
him sliding or hopping.
"""

import os
from collections import deque

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEET = os.path.join(ROOT, 'art-source', 'hero-exploration-sheet.png')
OUT_DIR = os.path.join(ROOT, 'src', 'assets', 'characters', 'hero')

# Where each block of the sheet sits, in sheet pixels. Columns are the
# four directions the sheet labels 後ろ / 前 / 左 / 右.
IDLE_X = [(0, 130), (130, 249), (249, 370), (370, 500)]
IDLE_Y = [(72, 260), (260, 437), (437, 614)]
WALK_X = [(505, 640), (640, 762), (762, 885), (885, 1010)]
WALK_Y = [(72, 244), (244, 402), (402, 570)]
DIRS = ['back', 'front', 'left', 'right']

CANVAS_W, CANVAS_H = 120, 180
# Transparent room under his feet, so the ground line is inside the
# canvas rather than on its very edge.
FOOT_PADDING = 3
# The IDLE block is drawn larger than the WALK block; bring them to one
# scale here, in the asset, rather than in the game.
IDLE_SCALE = 0.917

FLAT_ENOUGH = 5.0  # local gradient below which the fill may travel
FAR_FROM_BG = 34.0  # colour distance that counts as "not the paper"
DARKER_THAN_BG = 14.0  # and it must be this much darker, to skip the bloom


def background_mask(rgb: np.ndarray, gray: np.ndarray) -> np.ndarray:
    mag = np.hypot(ndimage.sobel(gray, axis=1) / 4.0, ndimage.sobel(gray, axis=0) / 4.0)
    passable = mag < FLAT_ENOUGH
    h, w = gray.shape
    seen = np.zeros((h, w), bool)
    queue: deque = deque()
    for x in range(w):
        for y in (0, h - 1):
            if passable[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if passable[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and passable[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    return seen


def smooth_background(rgb: np.ndarray, mask: np.ndarray, sigma: float = 48.0) -> np.ndarray:
    m = mask.astype(np.float32)
    den = np.maximum(ndimage.gaussian_filter(m, sigma), 1e-6)
    out = np.empty_like(rgb)
    for c in range(3):
        out[..., c] = ndimage.gaussian_filter(rgb[..., c] * m, sigma) / den
    return out


def foreground(rgb: np.ndarray) -> np.ndarray:
    gray = np.asarray(
        Image.fromarray(rgb.astype(np.uint8)).convert('L').filter(ImageFilter.GaussianBlur(0.8)),
        dtype=np.float32,
    )
    paper = background_mask(rgb, gray)
    fg_flat = ndimage.binary_fill_holes(~paper)

    # The painted gradient, estimated from the paper and refined a few
    # times so the leaked-into parts of him stop dragging it dark.
    reliable = paper.copy()
    for _ in range(4):
        est = smooth_background(rgb, reliable)
        reliable = paper & (np.abs(rgb - est).max(axis=2) < 20)
    est = smooth_background(rgb, reliable)

    weights = np.array([0.299, 0.587, 0.114], np.float32)
    far = np.linalg.norm(rgb - est, axis=2) > FAR_FROM_BG
    darker = (rgb @ weights) < (est @ weights) - DARKER_THAN_BG
    fg = fg_flat | (far & darker)
    fg = ndimage.binary_closing(fg, structure=np.ones((3, 3)))
    return ndimage.binary_fill_holes(fg)


def frame(rgb: np.ndarray, fg: np.ndarray, box, scale: float, path: str) -> None:
    (x0, x1), (y0, y1) = box
    cell = fg[y0:y1, x0:x1]
    labels, count = ndimage.label(cell)
    sizes = ndimage.sum(cell, labels, range(1, count + 1))
    figure = labels == (int(np.argmax(sizes)) + 1)
    ys, xs = np.where(figure)
    top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()
    figure = figure[top:bottom + 1, left:right + 1]
    pixels = rgb[y0 + top:y0 + bottom + 1, x0 + left:x0 + right + 1].astype(np.uint8)

    # Pull the edge in by a pixel and feather it, so none of the sheet's
    # paper rides along his outline into the forest.
    soft = ndimage.binary_erosion(figure, structure=np.ones((3, 3)))
    alpha = ndimage.gaussian_filter(soft.astype(np.float32), 0.7)
    alpha = np.clip((alpha - 0.25) / 0.5, 0, 1)

    # The anchor is where his boots meet the ground: the horizontal
    # centre of the lowest slice of him, not the middle of the picture.
    height = figure.shape[0]
    _, foot_x = np.where(figure[max(0, height - max(3, int(height * 0.08))):, :])
    anchor_x = float(foot_x.mean())

    img = Image.fromarray(np.dstack([pixels, (alpha * 255).astype(np.uint8)]), 'RGBA')
    if scale != 1.0:
        img = img.resize(
            (max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS
        )
        anchor_x *= scale

    canvas = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    canvas.alpha_composite(img, (round(CANVAS_W / 2 - anchor_x), CANVAS_H - FOOT_PADDING - img.height))
    canvas.save(path, optimize=True)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    rgb = np.asarray(Image.open(SHEET).convert('RGB')).astype(np.float32)
    fg = foreground(rgb)
    for i, direction in enumerate(DIRS):
        frame(rgb, fg, (IDLE_X[i], IDLE_Y[0]), IDLE_SCALE,
              os.path.join(OUT_DIR, f'hero-{direction}-idle.png'))
        for row in range(3):
            frame(rgb, fg, (WALK_X[i], WALK_Y[row]), 1.0,
                  os.path.join(OUT_DIR, f'hero-{direction}-walk{row + 1}.png'))
    print(f'wrote 16 frames to {OUT_DIR}')


if __name__ == '__main__':
    main()
