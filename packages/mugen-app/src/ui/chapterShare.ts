import type { ChapterSummaryRow } from '@mugen/content/story/chapterSummary';
import { CHAPTER_SUMMARY_KICKER, CHAPTER_SUMMARY_SIGN, CHAPTER_SUMMARY_TITLE } from '@mugen/content/story/chapterSummary';

/**
 * THE PICTURE TO KEEP (C1, 作者 2026-11-03 採用 — E10: 1200×630): 「あなたの第1章」 drawn in the game itself, on a
 * canvas — the picture of his years the answer led to on the left, the navy plate (the summary's own parts, drawn
 * the same way: a deep navy, a light rule and a finer one inside) with the seven rows on the right, his name, and
 * the game's. Nothing leaves the device unless the player shares it.
 */
export const SHARE_SIZE = { width: 1200, height: 630 } as const;

const NAVY = '#0b1331';
const RULE = '#9fb2ef';
const RULE_INNER = 'rgba(159, 178, 239, 0.42)';
const SERIF = '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif';
const SANS = '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif';

export interface ShareCard {
  rows: readonly ChapterSummaryRow[];
  heroName: string;
  /** The route's picture (null: the plate alone, wider). */
  picture: CanvasImageSource | null;
  pictureSize?: { width: number; height: number };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the card onto a 1200×630 context. */
export function drawShareCard(ctx: CanvasRenderingContext2D, card: ShareCard): void {
  const { width: W, height: H } = SHARE_SIZE;
  // The night the pages were shown in (引く演出's sky).
  const sky = ctx.createRadialGradient(W * 0.3, H * 0.3, 40, W * 0.5, H * 0.5, W * 0.75);
  sky.addColorStop(0, '#1b2350');
  sky.addColorStop(0.55, '#0b0f24');
  sky.addColorStop(1, '#05070f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // His picture: cover-fitted into a page, the record's rule round it.
  let plateX = 40;
  if (card.picture && card.pictureSize) {
    const px = 40;
    const py = 40;
    const ph = H - 80;
    const pw = Math.round(ph * (2 / 3));
    const { width: iw, height: ih } = card.pictureSize;
    const scale = Math.max(pw / iw, ph / ih);
    const sw = pw / scale;
    const sh = ph / scale;
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 10);
    ctx.clip();
    ctx.drawImage(card.picture, (iw - sw) / 2, (ih - sh) / 2, sw, sh, px, py, pw, ph);
    ctx.restore();
    roundRect(ctx, px, py, pw, ph, 10);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(200, 214, 255, 0.7)';
    ctx.stroke();
    plateX = px + pw + 36;
  }

  // The navy plate.
  const x = plateX;
  const y = 30;
  const w = W - 40 - x;
  const h = H - 60;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = NAVY;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = RULE;
  ctx.stroke();
  roundRect(ctx, x + 7, y + 7, w - 14, h - 14, 13);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = RULE_INNER;
  ctx.stroke();

  const cx = x + w / 2;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b3bbdc';
  ctx.font = `400 20px ${SANS}`;
  ctx.fillText(CHAPTER_SUMMARY_KICKER, cx, y + 50);
  ctx.fillStyle = '#f4f6ff';
  ctx.font = `400 40px ${SERIF}`;
  ctx.fillText(CHAPTER_SUMMARY_TITLE, cx, y + 100);
  ctx.fillStyle = '#e5cb91';
  ctx.font = `500 22px ${SANS}`;
  ctx.fillText(card.heroName, cx, y + 136, w - 80);

  // The seven rows: the label on the left, what it came to on the right.
  const left = x + 44;
  const right = x + w - 44;
  const top = y + 160;
  const rowH = 46;
  card.rows.forEach((r, i) => {
    const ry = top + i * rowH;
    if (i > 0) {
      ctx.strokeStyle = 'rgba(159, 178, 239, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, ry);
      ctx.lineTo(right, ry);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c8d0ee';
    ctx.font = `400 21px ${SANS}`;
    ctx.fillText(r.label, left, ry + 31);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f4f6ff';
    ctx.font = `500 25px ${SANS}`;
    ctx.fillText(r.value, right, ry + 32);
  });

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(200, 214, 255, 0.75)';
  ctx.font = `400 17px ${SERIF}`;
  ctx.fillText(CHAPTER_SUMMARY_SIGN, right, y + h - 18);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** The card as a PNG (null where the device cannot draw one). */
export async function makeShareImage(card: Omit<ShareCard, 'picture' | 'pictureSize'> & { pictureSrc: string | null }): Promise<Blob | null> {
  try {
    await Promise.all(
      [`400 40px ${SERIF}`, `400 21px ${SANS}`, `500 25px ${SANS}`].map((f) => document.fonts?.load(f).catch(() => null)),
    );
  } catch {
    // Drawn with what there is.
  }
  const img = card.pictureSrc ? await loadImage(card.pictureSrc) : null;
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_SIZE.width;
  canvas.height = SHARE_SIZE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawShareCard(ctx, {
    rows: card.rows,
    heroName: card.heroName,
    picture: img,
    pictureSize: img ? { width: img.naturalWidth, height: img.naturalHeight } : undefined,
  });
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), 'image/png');
    } catch {
      resolve(null);
    }
  });
}

export const SHARE_FILE_NAME = 'mugen-zero-chapter1.png';

/** Whether this device can hand the picture to another app (Web Share with files). */
export function canShareFile(file: File): boolean {
  try {
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}
