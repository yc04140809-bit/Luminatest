import { useEffect, useRef, useState } from 'react';
import {
  OPENING_CHOICE_PANELS,
  OPENING_CHOICES,
  OPENING_STEPS,
  OPENING_STRAIGHT_FACE_MS,
  OPENING_TAP_LOCK_MS,
  type OpeningArea,
  type OpeningMusic,
} from '@mugen/content/story/openingComic';
import { openingArt, preloadOpeningArt } from '../assets/openingArt';
import { playOpeningSound } from './openingSound';
import { audioManager, playVoice } from '../platform/audio';
import { usePicture } from './scene';
import './opening.css';

/**
 * 触る漫画形式のオープニング — THE OPENING, TAPPED THROUGH (作者指示 2026-10-16).
 *
 * The pages are content (content/story/openingComic.ts); this draws one at
 * a time, whole and its own shape, across the landscape screen, and takes
 * one TAP for one page — never two (taps closer than OPENING_TAP_LOCK_MS
 * are not taken, and a page that runs by itself takes none). Noise, the
 * glimpse of the man and the power going off go on by themselves; the
 * last despair waits a moment before a TAP is taken; the choice page takes
 * a TAP only on one of its three drawn answers.
 *
 * The words are in the pictures; nothing is written over them. What the
 * music should do is said to whoever shows this (`onMusic`), which owns the
 * music; a debug build has a SKIP (never a release or tester build).
 */

const DEBUG_TOOLS = import.meta.env.DEV || import.meta.env.VITE_MUGEN_DEBUG_TOOLS === '1';
/** The line across the black, collapsing, before the silence. */
const POWER_OFF_LINE_MS = 420;

type ChoicePhase = 'ASK' | 'STRAIGHT' | 'SMILE';

export function OpeningScreen({ onMusic, onDone }: { onMusic: (music: OpeningMusic) => void; onDone: () => void }) {
  const [at, setAt] = useState(0);
  const [choice, setChoice] = useState<ChoicePhase>('ASK');
  /** The HOLD page whose wait is over (its index), so a page is never taken by a TAP before its wait. */
  const [heldDone, setHeldDone] = useState(-1);
  const lastTap = useRef(0);
  const done = useRef(false);
  const step = OPENING_STEPS[at];
  const auto = step.kind === 'NOISE' || step.kind === 'GLIMPSE' || step.kind === 'POWER_OFF';
  const ready = step.kind !== 'HOLD' || heldDone === at;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  const advance = () => {
    if (at >= OPENING_STEPS.length - 1) return finish();
    setAt((n) => n + 1);
  };

  // Entering a step: its music and sound; the next pictures fetched ahead; its own timing.
  useEffect(() => {
    if (step.music) onMusic(step.music);
    if (step.sound) playOpeningSound(step.sound);
    // Her line on this page, if it has one (platform/voice.ts `op.<scene>`); the last page's stops with the page.
    audioManager.stopVoice();
    playVoice(`op.${step.scene}`);
    preloadOpeningArt(OPENING_STEPS.slice(at + 1, at + 4).map((s) => s.image));
    setChoice('ASK');
    if (auto) {
      const t = window.setTimeout(advance, (step.kind === 'POWER_OFF' ? POWER_OFF_LINE_MS : 0) + (step.ms ?? 0));
      return () => window.clearTimeout(t);
    }
    if (step.kind === 'HOLD') {
      const here = at;
      const t = window.setTimeout(() => setHeldDone(here), step.ms ?? 0);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [at]);

  // The straight face, for a moment, then 「……なんてね♪」.
  // 「……なんてね♪」, said as it is shown (`op.<scene>.SMILE`).
  useEffect(() => {
    if (choice === 'SMILE') playVoice(`op.${step.scene}.SMILE`);
  }, [choice]);
  // Out of the opening, nothing of it is still being said.
  useEffect(() => () => audioManager.stopVoice(), []);

  useEffect(() => {
    if (choice !== 'STRAIGHT') return;
    const t = window.setTimeout(() => setChoice('SMILE'), OPENING_STRAIGHT_FACE_MS);
    return () => window.clearTimeout(t);
  }, [choice]);

  /** One TAP, one step. */
  const taken = () => {
    const now = performance.now();
    if (now - lastTap.current < OPENING_TAP_LOCK_MS) return false;
    lastTap.current = now;
    return true;
  };
  const tap = () => {
    if (auto || !ready) return;
    if (step.kind === 'CHOICE' && choice !== 'SMILE') return;
    if (!taken()) return;
    playOpeningSound('TAP');
    advance();
  };
  const answer = () => {
    if (choice !== 'ASK' || !taken()) return;
    playOpeningSound('TAP');
    setChoice('STRAIGHT');
  };

  const src = usePicture(() => openingArt(step.image), `opening:${step.image}`);
  const waiting = !auto && ready && (step.kind !== 'CHOICE' || choice === 'SMILE');
  return (
    <div
      className={`screen opening-comic opening-k-${step.kind.toLowerCase()}`}
      data-testid="opening-comic"
      data-step={at}
      data-scene={step.scene}
      data-image={step.image}
      data-kind={step.kind}
      data-choice={step.kind === 'CHOICE' ? choice : undefined}
      data-waiting={waiting ? 'yes' : 'no'}
      onClick={tap}
    >
      <div className="opening-page" style={{ aspectRatio: `${step.size.w} / ${step.size.h}`, ['--op-ratio' as string]: String(step.size.w / step.size.h) }}>
        {src && <img className="opening-picture" src={src} alt="" draggable={false} data-testid="opening-picture" />}
        {step.kind === 'POWER_OFF' && <div className="opening-poweroff-line" aria-hidden="true" />}
        {step.kind === 'CHOICE' && (
          <>
            {OPENING_CHOICE_PANELS.map((p, i) => {
              const shown = (i === 0 && choice !== 'ASK') || (i === 1 && choice === 'SMILE');
              return shown ? null : <div key={i} className="opening-panel-veil" style={place(p)} aria-hidden="true" />;
            })}
            {choice === 'ASK' &&
              OPENING_CHOICES.map((c) => (
                <button
                  key={c.id}
                  className="opening-choice"
                  style={place(c.area)}
                  aria-label={c.label}
                  data-testid={`opening-choice-${c.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    answer();
                  }}
                />
              ))}
          </>
        )}
      </div>
      {waiting && step.tapHint && (
        <span className="opening-tap-hint" data-testid="opening-tap-hint" aria-hidden="true">
          TAP
        </span>
      )}
      {DEBUG_TOOLS && (
        <button
          className="opening-debug-skip"
          data-testid="opening-debug-skip"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
        >
          SKIP（DEBUG）
        </button>
      )}
    </div>
  );
}

const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const place = (a: OpeningArea) => ({ left: pct(a.x), top: pct(a.y), width: pct(a.w), height: pct(a.h) });
