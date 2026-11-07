import { SFX_FILES } from '@mugen/assets/sfx';
import type { FinaleAmbience } from '@mugen/content/story/chapter1Finale';
import { audioManager } from './audio';

/**
 * A PLACE'S OWN AIR, UNDER THE WORDS (作者「無料強化メモ②」環境SE, 2026-10-17).
 *
 * One at a time, low, looped, and gone the moment the scene ends or a fight
 * begins — never two, never stacked under the music:
 *
 *   WIND   the delivered strong-wind loop, quiet (the grassland, the road)
 *   HUM    a low machine hum, made here (the ruins' depths) — two low tones
 *          a hair apart, so it beats slowly, under a low-pass
 *   FIRE   small fires crackling, made here (the half-ruined village) —
 *          sparse clicks over a breath of noise, looped
 *
 * No file is needed for HUM and FIRE (none has been delivered): they are a
 * few nodes of WebAudio, nothing heavy. Each plays at a small share of the
 * effects volume (AMBIENCE_LEVEL) and fades in and out. Nothing plays while
 * the effects are turned down to nothing, or when switched off
 * (`setAmbience('off')` — a settings screen can drive it later).
 */

export type AmbienceKind = FinaleAmbience;

/** How loud each is, as a share of the effects volume (作者: 小さく). */
export const AMBIENCE_LEVEL: Readonly<Record<AmbienceKind, number>> = { WIND: 0.18, HUM: 0.14, FIRE: 0.12 };
const FADE_IN_MS = 900;
const FADE_OUT_MS = 400;

let setting: 'on' | 'off' = 'on';
let current: { kind: AmbienceKind; stop: () => void } | null = null;
let ctx: AudioContext | null = null;

export function setAmbience(next: 'on' | 'off'): void {
  setting = next;
  if (next === 'off') stopAmbience();
}

/** What is playing now (null: nothing). */
export function currentAmbience(): AmbienceKind | null {
  return current?.kind ?? null;
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // For the tests: what is under the words now.
  (window as unknown as { __mugenAmbience?: () => AmbienceKind | null }).__mugenAmbience = currentAmbience;
}

/** This place's air: the same one goes on undisturbed; another replaces it; null stops it. */
export function playAmbience(kind: AmbienceKind | null): void {
  if (kind === current?.kind) return;
  stopAmbience();
  if (!kind || setting === 'off') return;
  const level = AMBIENCE_LEVEL[kind] * audioManager.volumes().sfx;
  if (level <= 0) return;
  try {
    const stop = kind === 'WIND' ? playWind(level) : playSynth(kind, level);
    if (stop) current = { kind, stop };
  } catch (e) {
    // A device without the means: silence, never a broken scene.
    console.warn('Ambience could not start', e);
  }
}

export function stopAmbience(): void {
  current?.stop();
  current = null;
}

/** The delivered wind, looped on an element of its own. */
function playWind(level: number): (() => void) | null {
  const src = SFX_FILES.explore_ambient_strong_wind;
  if (!src || typeof Audio === 'undefined') return null;
  const el = new Audio(src);
  el.loop = true;
  el.volume = 0;
  void el.play().catch(() => undefined);
  const fade = (to: number, ms: number, then?: () => void) => {
    const from = el.volume;
    const steps = Math.max(1, Math.round(ms / 50));
    let i = 0;
    const t = setInterval(() => {
      i++;
      el.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps)));
      if (i >= steps) {
        clearInterval(t);
        then?.();
      }
    }, 50);
    return t;
  };
  let fading = fade(level, FADE_IN_MS);
  return () => {
    clearInterval(fading);
    fading = fade(0, FADE_OUT_MS, () => {
      el.pause();
      el.removeAttribute('src');
    });
  };
}

function audioContext(): AudioContext | null {
  const Ctor = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

/** The hum and the fire, made of a few nodes; faded in, and out when stopped. */
function playSynth(kind: 'HUM' | 'FIRE', level: number): (() => void) | null {
  const ac = audioContext();
  if (!ac) return null;
  const out = ac.createGain();
  out.gain.setValueAtTime(0, ac.currentTime);
  out.gain.linearRampToValueAtTime(level, ac.currentTime + FADE_IN_MS / 1000);
  out.connect(ac.destination);
  const sources: AudioScheduledSourceNode[] = [];
  if (kind === 'HUM') {
    const low = ac.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 320;
    low.connect(out);
    // Two low tones a hair apart (a slow beat), and a third above them, faint.
    for (const [freq, type, gain] of [
      [49, 'sine', 0.55],
      [49.6, 'sine', 0.4],
      [147, 'triangle', 0.08],
    ] as const) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      const g = ac.createGain();
      g.gain.value = gain;
      o.connect(g).connect(low);
      sources.push(o);
    }
    // A slow swell, as of something breathing in the walls.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.18;
    const depth = ac.createGain();
    depth.gain.value = level * 0.3;
    lfo.connect(depth).connect(out.gain);
    sources.push(lfo);
  } else {
    const src = ac.createBufferSource();
    src.buffer = crackle(ac);
    src.loop = true;
    const band = ac.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800;
    band.Q.value = 0.6;
    src.connect(band).connect(out);
    sources.push(src);
  }
  for (const s of sources) s.start();
  return () => {
    const end = ac.currentTime + FADE_OUT_MS / 1000;
    out.gain.cancelScheduledValues(ac.currentTime);
    out.gain.setValueAtTime(out.gain.value, ac.currentTime);
    out.gain.linearRampToValueAtTime(0, end);
    for (const s of sources) s.stop(end + 0.05);
    setTimeout(() => out.disconnect(), FADE_OUT_MS + 120);
  };
}

/** Four seconds of small fires: a breath of noise, and sparse cracks, each dying fast. */
function crackle(ac: AudioContext): AudioBuffer {
  const seconds = 4;
  const rate = ac.sampleRate;
  const buf = ac.createBuffer(1, seconds * rate, rate);
  const data = buf.getChannelData(0);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < data.length; i++) data[i] = (rand() * 2 - 1) * 0.05;
  const cracks = seconds * 14;
  for (let c = 0; c < cracks; c++) {
    const at = Math.floor(rand() * (data.length - rate * 0.02));
    const len = Math.floor(rate * (0.002 + rand() * 0.008));
    const amp = 0.3 + rand() * 0.7;
    for (let k = 0; k < len; k++) data[at + k] += (rand() * 2 - 1) * amp * Math.exp((-6 * k) / len);
  }
  return buf;
}
