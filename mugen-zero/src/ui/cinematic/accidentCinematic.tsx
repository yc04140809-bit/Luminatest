// The summoning accident, as something that can be played anywhere.
//
// This used to live inside the battle screen. It was lifted out for
// one reason, and the reason is worth stating plainly: a preview that
// is a second copy of the real thing is worse than no preview at all.
// It drifts. Somebody tunes a pause here, forgets the other file, and
// from then on what the admin screen shows is not what the player
// sees — which is exactly the question a preview exists to answer.
//
// So there is one timeline, one set of lines, one dragon and one
// cut-in, and both the battle and the admin preview call them.
//
// What is deliberately NOT in here: hit points, enemies, the world,
// the save. This is presentation. It is handed what to show and it
// shows it; whether anything was damaged, remembered or written down
// is the caller's business, and the preview's answer to all three is
// "nothing".

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SummonAccidentAbility } from '../../core/summon/summonAccident';
import type { UnknownArcanaDef } from '../../content/arcana/unknownArcana';
import ancientDragonArt from '../../assets/arcana/unknown-ancient-dragon.png';
import ancientBreathArt from '../../assets/arcana/ancient-breath.png';

/**
 * An accident, beat by beat, in milliseconds.
 *
 * Every duration the sequence has, in one place, so tuning the feel of
 * it is editing this object rather than hunting timers through a
 * screen. In the language the direction uses:
 *
 *   CROSS   she notices — 「……え？」
 *   PAUSE   the half-second of nothing after it (chaos reaction pause)
 *   UNKNOWN ARCANA #001 モスラビット → ARCANA #??? UNKNOWN
 *   DRAGON  it is simply there; nothing attacks yet (dragon hold)
 *   BREATH  the cut-in
 *   FADE    it comes apart, not explodes (disappear)
 *   TALK    and nobody explains it
 *
 * Nothing in the sequence flashes white, blacks the screen out, or
 * opens a modal. A game that appears to be breaking is a game the
 * player stops trusting; this is a world misremembering itself.
 */
export const ACCIDENT_TIMELINE = {
  CROSS: 900,
  PAUSE: 550,
  UNKNOWN: 1100,
  DRAGON: 900,
  BREATH: 2200,
  FADE: 1000,
  TALK: 5200,
} as const;

export type AccidentBeat = keyof typeof ACCIDENT_TIMELINE | 'NONE';

/** In order, so the next beat is never spelled out twice. */
export const ACCIDENT_ORDER: AccidentBeat[] = [
  'CROSS',
  'PAUSE',
  'UNKNOWN',
  'DRAGON',
  'BREATH',
  'FADE',
  'TALK',
  'NONE',
];

/** What the pair of them say afterwards. Nobody explains anything. */
export const ACCIDENT_TALK: readonly { who: string; line: string }[] = [
  { who: 'あなた', line: '……今の、何だったんだ？' },
  { who: 'ケイオス', line: '…………。' },
  { who: 'あなた', line: 'ケイオス？' },
  { who: 'ケイオス', line: '……知らない。' },
];

/** The thing is on the field for these three beats, and no others. */
export function dragonIsOut(beat: AccidentBeat): boolean {
  return beat === 'DRAGON' || beat === 'BREATH' || beat === 'FADE';
}

/**
 * Walks the beats.
 *
 * One timer at a time, in order. `start` from anywhere; `stop` ends it
 * immediately, which is what a tap on the last card does and what
 * leaving the screen does.
 */
export function useAccidentSequence(options: { onBeat?: (beat: AccidentBeat) => void } = {}) {
  const [beat, setBeat] = useState<AccidentBeat>('NONE');
  const onBeat = options.onBeat;
  const notify = useRef(onBeat);
  notify.current = onBeat;

  useEffect(() => {
    notify.current?.(beat);
    if (beat === 'NONE') return;
    const t = setTimeout(() => {
      setBeat((current) => ACCIDENT_ORDER[ACCIDENT_ORDER.indexOf(current) + 1] ?? 'NONE');
    }, ACCIDENT_TIMELINE[beat]);
    return () => clearTimeout(t);
  }, [beat]);

  const start = useCallback((from: AccidentBeat = 'CROSS') => setBeat(from), []);
  const stop = useCallback(() => setBeat('NONE'), []);
  return { beat, start, stop, setBeat };
}

/** What the battlefield does while something is crossing it. */
export function accidentStageClass(beat: AccidentBeat): string {
  return beat === 'CROSS' ? ' crossed' : '';
}

/**
 * The thing itself, and its one move — both of them inside the stage.
 *
 * The artwork is used as delivered: no recolour, no redraw, no filter.
 * The only decision made about the dragon here is which way it is
 * looking, and that is a mirror in the stylesheet, because the drawing
 * faces right and the creature it has come for is on the left.
 *
 * It is not sized like a summon. A summoned moss rabbit is 15% of the
 * field; this is most of it, on purpose, because the whole message of
 * the moment is that it does not belong in the frame it arrived in.
 */
export function AccidentStage({
  beat,
  unknown,
  ability,
}: {
  beat: AccidentBeat;
  unknown: UnknownArcanaDef | null;
  ability: SummonAccidentAbility | null;
}) {
  return (
    <>
      {dragonIsOut(beat) && (
        <div
          className={`bp-dragon${beat === 'FADE' ? ' unravelling' : ''}`}
          data-testid="bp-dragon"
          data-arcana={unknown?.arcanaId ?? ''}
          data-beat={beat}
          aria-label="？？？？？？？"
        >
          <img className="bp-dragon-art" src={ancientDragonArt} alt="" />
        </div>
      )}

      {/* 《エンシェントブレス》 — the cut-in.
          The picture carries its own title, so nothing here prints the
          name a second time. It is the whole image at the full width
          of the phone rather than a crop: the face, the mouth, the
          beam and the lettering are all required to be legible in
          portrait, and any crop wide enough to enlarge it drops one of
          them off an edge.

          It covers the middle of the battlefield and nothing else —
          the forest is still above and below it, and the plates are
          untouched. Not a modal, not a blackout, not a white frame. */}
      {beat === 'BREATH' && ability && (
        <div className="bp-breath" data-testid="bp-breath" data-ability={ability.id}>
          <img
            className="bp-breath-art"
            src={ancientBreathArt}
            alt={ability.name}
            data-title-in-art={ability.titleInArt ? 'yes' : 'no'}
          />
        </div>
      )}
    </>
  );
}

/**
 * Her card, coming apart.
 *
 * The same card, in the same place, that an ordinary attempt uses —
 * except the page number goes, the name goes, and what is left says
 * only that it is not in the book. No flash, no blackout, no modal,
 * and nothing shaking hard enough to read as a broken game.
 */
export function AccidentCard({
  unknown,
  accidentId,
}: {
  unknown: UnknownArcanaDef | null;
  accidentId: string;
}) {
  return (
    <div
      className="bp-chaos-card bp-accident-card"
      data-testid="bp-accident-card"
      data-accident={accidentId}
      role="status"
      aria-live="polite"
    >
      <span className="bp-chaos-who">ケイオス</span>
      <span className="bp-chaos-line">「……え？」</span>
      <span className="bp-chaos-rule" aria-hidden="true" />
      <span className="bp-summon-id bp-accident-id">
        ARCANA #<b className="bp-accident-hash">???</b>
        <i data-testid="bp-accident-label">{unknown?.label ?? '？？？？？？？'}</i>
      </span>
      <span className="bp-accident-state">UNKNOWN</span>
    </div>
  );
}

/** And then neither of them explains it. One of the four is a silence. */
export function AccidentTalk({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      className="bp-chaos-card bp-accident-talk"
      data-testid="bp-accident-talk"
      onClick={onSkip}
      aria-label="……今のは忘れて。"
    >
      {ACCIDENT_TALK.map((turn) => (
        <span className="bp-accident-turn" key={`${turn.who}-${turn.line}`}>
          <i>{turn.who}</i>
          {`「${turn.line}」`}
        </span>
      ))}
    </button>
  );
}
