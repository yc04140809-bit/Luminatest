import type { OpeningSound } from '@mugen/content/story/openingComic';
import { audioManager } from '../platform/audio';

/**
 * THE OPENING'S SOUNDS, PROVISIONAL (2026-10-16): made on the spot with Web
 * Audio until delivered files take their place — a page's soft tick, noise
 * bursts (three of them, taken in turn, so the rush is never one sound
 * repeated: ザッ / ザザッ / a hard one), and プツン (a click, a falling tone).
 * At the effects volume; silent where Web Audio is not there.
 */
let ctx: AudioContext | null = null;
let turn = 0;

function context(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function level(): number {
  try {
    return audioManager.volumes().sfx;
  } catch {
    return 0.6;
  }
}

function burst(c: AudioContext, seconds: number, gain: number, low: number, high: number, gaps: number) {
  const n = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const cut = gaps > 0 && Math.floor((i / n) * gaps * 2) % 2 === 1;
    d[i] = cut ? 0 : (Math.random() * 2 - 1) * (1 - i / n);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = (low + high) / 2;
  band.Q.value = (low + high) / 2 / Math.max(1, high - low);
  const g = c.createGain();
  g.gain.value = gain * level();
  src.connect(band).connect(g).connect(c.destination);
  src.start();
}

export function playOpeningSound(sound: OpeningSound | 'TAP'): void {
  const c = context();
  if (!c || level() <= 0) return;
  if (sound === 'TAP') return burst(c, 0.03, 0.15, 2500, 6000, 0);
  if (sound === 'NOISE') {
    const kinds = [
      () => burst(c, 0.12, 0.5, 800, 5000, 0), // ザッ
      () => burst(c, 0.2, 0.5, 600, 4000, 2), // ザザッ
      () => burst(c, 0.18, 0.8, 200, 7000, 0), // a hard one
    ];
    kinds[turn++ % kinds.length]();
    return;
  }
  // プツン: a click, and a tone falling away.
  burst(c, 0.02, 0.9, 1000, 8000, 0);
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(880, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.25);
    g.gain.setValueAtTime(0.25 * level(), c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.32);
  } catch {
    /* no tone: the click is enough */
  }
}
