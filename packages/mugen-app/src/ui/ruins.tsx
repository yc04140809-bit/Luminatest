import { useEffect, useMemo, useRef, useState } from 'react';
import type { World } from '@mugen/core/world/world';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { RUINS_WALK } from '@mugen/content/exploration/ruinsWalk';
import {
  HERO_SPEAKER,
  SEKIRYUGA_AFTERMATH,
  SEKIRYUGA_APPROACH_KAOS,
  SEKIRYUGA_APPROACH_SIGNS,
  SEKIRYUGA_ENTRANCE_LINE,
  SEKIRYUGA_REVISIT,
  SEKIRYUGA_STILL_LINE,
  SEKIRYUGA_STILL_LOOKS,
} from '@mugen/content/story/sekiryugaArc';
import { SEKIRYUGA_NAME } from '@mugen/content/enemies/sekiryugaBattle';
import { RoamScene, type RoamKeeper, type RoamMemory } from './explore/RoamScene';
import { pickupKeeper } from './explore/pickupKeeper';
import { walkPainting } from '../assets/walk';
import { battleEnemyArt } from './battle/battleArt';
import { portraitArt } from '../assets/portraits';
import { playSfx } from '../platform/audio';
import { NewBadge } from './common/NewBadge';
import { OnceNotice } from './common/OnceNotice';

/** The way deeper, as a destination (core/world/readMarks.ts `dest:`). */
export const SEAL_DESTINATION = 'dest:SEKIRYUGA_SEAL';

/**
 * 古代遺跡 — THE RUINS, FROM THE MAP, and the way in to what is sealed there.
 *
 *   walk        the ruins as the DEBUG door has always walked them
 *               (ui/explore/RoamScene: floor taps, depth, Kaos following,
 *               finds, gold and the once-in-a-world rainbow), with the save
 *               keeping visits and the rainbow, and one door at the bottom:
 *               「遺跡の奥へ進む」
 *   approach    the way in: signs a little at a time, Kaos stopping them,
 *               the music let down, a few seconds' quiet and a low
 *               rumble, and then it is there — its name, and it
 *   aftermath   after the fight: it is not dead, and it is not looking at
 *               them (content/story/sekiryugaArc)
 *   revisit     the first time back after that (once in a world): still
 *               there, not coming at them, looking deeper in
 *   still       every time after: only that, and a word if looked at
 *
 * The fight itself is the ordinary battle screen; this file only leads up
 * to it and away from it.
 */

/** Which part of the ruins is showing. */
export type RuinsPhase = 'walk' | 'approach' | 'aftermath' | 'revisit' | 'still';

/** What the save keeps of walking the ruins — visits, and the rainbow find. */
export function ruinsKeeper(world: World): RoamKeeper {
  const place = RUINS_WALK.id;
  return {
    visitsBefore: world.getExplorationVisits(place),
    rainbowTaken: world.hasRareFind(place),
    keeps: true,
    recordVisit: () => void world.recordExplorationVisit(place),
    takeRainbow: () => world.claimRareFind(place, RUINS_WALK.roam?.rainbow?.equipmentId ?? ''),
  };
}

export function RuinsWalkScreen({
  world,
  deep,
  onDeep,
  onLeave,
  memory,
  resume = false,
}: {
  world: World;
  /** Whether the way deeper is open, and what it leads to. Null: no door. */
  deep: 'APPROACH' | 'AFTERMATH' | 'STILL' | null;
  onDeep: () => void;
  onLeave: () => void;
  memory?: { current: RoamMemory | null };
  resume?: boolean;
}) {
  const known = world.getKnownEvents().map((e) => e.type);
  const day = world.getClock().worldDay;
  const view = useMemo(() => ({ known: new Set(known), day }), [known.join(','), day]);
  // Read once for the visit: the walk owns the counts from here on.
  const keeper = useMemo(() => ruinsKeeper(world), []);
  // Its pickups, read as the walk opens (taken ones stay taken).
  const pickups = useMemo(() => pickupKeeper(world), []);
  // Back to where it stays (STILL) is not somewhere new.
  const deepNew = !!deep && deep !== 'STILL' && !world.isRead(SEAL_DESTINATION);
  return (
    <RoamScene
      scene={RUINS_WALK}
      roam={RUINS_WALK.roam!}
      place="ANCIENT_RUINS"
      view={view}
      onLeave={onLeave}
      leaveLabel="地方図へもどる"
      leaveTestId="leave-ruins"
      keeper={keeper}
      pickupKeeper={pickups}
      memory={memory}
      resume={resume}
      events={
        deep && (
          <>
            {/* NEW, and a few slow glows as it first shows, until it is touched. */}
            <button
              className={`btn walk-event primary${deepNew ? ' pulse-new' : ''}`}
              data-testid="deep-button"
              data-new={deepNew ? 'yes' : 'no'}
              onClick={() => {
                void world.markRead([SEAL_DESTINATION]).catch(() => {});
                onDeep();
              }}
            >
              遺跡の奥へ進む
              <NewBadge show={deepNew} testId="deep-new" />
            </button>
            <OnceNotice
              world={world}
              mark={`note:${SEAL_DESTINATION}`}
              text="新しい目的地が追加されました"
              show={deepNew}
              testId="destination-notice"
              type="destination"
              priority="HIGH"
            />
          </>
        )
      }
    />
  );
}

/** A line as shown: the hero speaks under the name the player chose. */
function shown(line: DialogueLine, heroName: string): DialogueLine {
  return line.speaker === HERO_SPEAKER ? { ...line, speaker: heroName } : line;
}

/** The ruins' painting, behind a story told over it — darker the deeper in. */
function useRuinsPainting(): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let gone = false;
    void walkPainting('ANCIENT_RUINS').then((s) => !gone && setSrc(s));
    return () => {
      gone = true;
    };
  }, []);
  return src;
}

/**
 * セキリュウガ, as the fight draws it (battleArt's one reference). Shown
 * whole at its own shape. `toward`: turned to face the party (the drawing
 * faces right; mirrored on screen, never edited). `stopped`: brought to a
 * stop — lowered and dimmed, there being no drawing of it down.
 */
function Figure({ toward, stopped = false, src }: { toward: boolean; stopped?: boolean; src?: string | null }) {
  const art = battleEnemyArt('sekiryuga', 'front');
  const shownSrc = src ?? art.asset?.src;
  if (!shownSrc) return null;
  return (
    <img
      className={`seal-figure${toward ? ' toward' : ''}${stopped ? ' stopped' : ''}`}
      src={shownSrc}
      alt={SEKIRYUGA_NAME}
      data-testid="seal-figure"
      data-facing={toward ? 'party' : 'away'}
    />
  );
}

/** How long the quiet holds before it is there, at the rumble. */
export const SEAL_QUIET_MS = 2600;

type ApproachStep = 'signs' | 'kaos' | 'quiet' | 'there';

/**
 * THE WAY IN. Read a line at a time; the music goes out when she says
 * 「……止まって。」 (`onHush`), and after her last line the screen holds a
 * few seconds of quiet over a low rumble before the name and the shadow.
 */
export function SealApproachScreen({
  heroName,
  onHush,
  onFight,
  onBack,
}: {
  heroName: string;
  /** The music let down (true) — from her first word to the fight. */
  onHush: (hushed: boolean) => void;
  onFight: () => void;
  onBack: () => void;
}) {
  const painting = useRuinsPainting();
  const [step, setStep] = useState<ApproachStep>('signs');
  const [at, setAt] = useState(0);
  const lines = step === 'signs' ? SEKIRYUGA_APPROACH_SIGNS : SEKIRYUGA_APPROACH_KAOS;
  const line = step === 'signs' || step === 'kaos' ? lines[at] : null;
  const quiet = useRef<number | null>(null);

  useEffect(() => () => {
    if (quiet.current !== null) window.clearTimeout(quiet.current);
  }, []);

  const next = () => {
    if (step === 'signs') {
      if (at < SEKIRYUGA_APPROACH_SIGNS.length - 1) return setAt(at + 1);
      // 「……止まって。」 — and the music goes.
      onHush(true);
      setStep('kaos');
      return setAt(0);
    }
    if (step === 'kaos') {
      if (at < SEKIRYUGA_APPROACH_KAOS.length - 1) return setAt(at + 1);
      // A few seconds of nothing but the ground.
      setStep('quiet');
      playSfx('story_rumble');
      quiet.current = window.setTimeout(() => {
        quiet.current = null;
        setStep('there');
        playSfx('battle_boss_emerge');
      }, SEAL_QUIET_MS);
    }
  };

  // The second sign is the ground moving: the screen moves with it.
  const shaking = step === 'signs' && at === 1;
  const said = line ? shown(line, heroName) : null;
  return (
    <div className="screen seal" data-testid="seal-approach" data-step={step} data-shake={shaking ? 'yes' : 'no'}>
      {painting && <img className="seal-painting" src={painting} alt="" aria-hidden="true" />}
      <div className={`seal-dark seal-dark-${step}`} aria-hidden="true" />
      {step === 'there' && (
        <div className="seal-entrance" data-testid="seal-entrance">
          <Figure toward />
          <div className="seal-name" data-testid="seal-boss-name">
            <i>BOSS</i>
            <b>{SEKIRYUGA_NAME}</b>
          </div>
        </div>
      )}
      <div className="seal-words">
        {said ? (
          <>
            {said.speaker && <p className="speaker">{said.speaker}</p>}
            <p className="line" data-testid="seal-line">
              {said.speaker ? `「${said.text}」` : said.text}
            </p>
            <button className="btn primary" data-testid="seal-next" onClick={next}>
              つぎへ
            </button>
          </>
        ) : step === 'quiet' ? (
          <p className="line seal-hold" data-testid="seal-quiet">
            ……
          </p>
        ) : (
          <>
            <p className="line" data-testid="seal-line">
              {SEKIRYUGA_ENTRANCE_LINE}
            </p>
            <div className="actions">
              <button className="btn primary" data-testid="boss-fight" onClick={onFight}>
                戦う
              </button>
              <button className="btn" data-testid="boss-retreat" onClick={onBack}>
                引き返す
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * AFTER THE FIGHT: brought to a stop, not killed — and looking past them,
 * deeper into the ruins. Nothing is explained. It ends on the hero
 * saying nothing; `onDone` is the walk again.
 */
export function SekiryugaAftermathScreen({ heroName, onDone }: { heroName: string; onDone: () => void }) {
  const painting = useRuinsPainting();
  const [at, setAt] = useState(0);
  const line = shown(SEKIRYUGA_AFTERMATH[at], heroName);
  const last = at >= SEKIRYUGA_AFTERMATH.length - 1;
  // It is down for the first two lines; then it rises — and, from 「だが、
  // セキリュウガはこちらを見ていない。」 on, it is turned away, deeper in.
  const stopped = at < 2;
  const away = at >= 4;
  return (
    <div className="screen seal" data-testid="seal-aftermath" data-at={at}>
      {painting && <img className="seal-painting" src={painting} alt="" aria-hidden="true" />}
      <div className="seal-dark seal-dark-there" aria-hidden="true" />
      <div className="seal-entrance after">
        <Figure toward={!away} stopped={stopped} />
      </div>
      <div className="seal-words">
        {line.speaker && <p className="speaker">{line.speaker}</p>}
        <p className="line" data-testid="seal-line">
          {line.speaker ? `「${line.text}」` : line.text}
        </p>
        <button
          className="btn primary"
          data-testid="seal-next"
          onClick={() => (last ? onDone() : setAt(at + 1))}
        >
          {last ? 'もどる' : 'つぎへ'}
        </button>
      </div>
    </div>
  );
}

/**
 * セキリュウガ AS IT STAYS, after the fight — down, resting, watching the
 * depths. No such drawing has been delivered: until one is, the fight's own
 * (null here falls back to battleArt). The day it arrives, naming the file
 * here is the whole change; no screen below moves.
 */
const SEKIRYUGA_AT_REST: string | null = null;

/** How long her silence holds before the way back is offered. */
export const REVISIT_GLANCE_MS = 1400;

/**
 * THE FIRST TIME BACK (content/story/sekiryugaArc SEKIRYUGA_REVISIT). Still
 * there; it does not come at them and offers no fight — it looks at them
 * once and goes back to looking deeper. Light between the two of them, and
 * last, Kaos alone looking back at it, silent, for a moment longer than a
 * line. `onDone` is when it has been seen to its end (the App keeps it).
 */
export function SekiryugaRevisitScreen({ heroName, onDone }: { heroName: string; onDone: () => void }) {
  const painting = useRuinsPainting();
  const [at, setAt] = useState(0);
  const [kaos, setKaos] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    let gone = false;
    // Her own field drawing, turned towards it; a drawing made for this
    // look, when there is one, is a change of this line only.
    void portraitArt('kaos').then((src) => !gone && setKaos(src));
    return () => {
      gone = true;
    };
  }, []);
  const beat = SEKIRYUGA_REVISIT[at];
  const line = shown(beat, heroName);
  const last = at >= SEKIRYUGA_REVISIT.length - 1;
  // Which way it is looking: the last beat that said so.
  const look = SEKIRYUGA_REVISIT.slice(0, at + 1).reduce<'party' | 'deeper'>((now, b) => b.look ?? now, 'deeper');
  const glance = !!beat.glance;
  // Her silence is held: the way on comes only after it.
  useEffect(() => {
    if (!glance) return;
    setHeld(true);
    const t = window.setTimeout(() => setHeld(false), REVISIT_GLANCE_MS);
    return () => window.clearTimeout(t);
  }, [glance]);
  return (
    <div className="screen seal revisit" data-testid="seal-revisit" data-at={at} data-glance={glance ? 'yes' : 'no'}>
      {painting && <img className="seal-painting" src={painting} alt="" aria-hidden="true" />}
      <div className={`seal-dark ${glance ? 'seal-dark-glance' : 'seal-dark-kaos'}`} aria-hidden="true" />
      <div className="seal-entrance after">
        <Figure toward={look === 'party'} src={SEKIRYUGA_AT_REST} />
      </div>
      {glance && kaos && (
        <img className="revisit-kaos" src={kaos} alt="ケイオス" data-testid="revisit-kaos" aria-hidden="true" />
      )}
      <div className="seal-words">
        {line.speaker && <p className="speaker">{line.speaker}</p>}
        <p className="line" data-testid="seal-line">
          {line.speaker ? `「${line.text}」` : line.text}
        </p>
        <button
          className="btn primary"
          data-testid="seal-next"
          disabled={held}
          style={held ? { visibility: 'hidden' } : undefined}
          onClick={() => (last ? onDone() : setAt(at + 1))}
        >
          {last ? 'もどる' : 'つぎへ'}
        </button>
      </div>
    </div>
  );
}

/**
 * EVERY TIME AFTER: it is there, looking deeper in, and that is all. No
 * fight and no command for one; looked at, the hero says a few words.
 */
export function SekiryugaStillScreen({ heroName, onLeave }: { heroName: string; onLeave: () => void }) {
  const painting = useRuinsPainting();
  const [looked, setLooked] = useState(-1);
  const said = looked >= 0 ? shown(SEKIRYUGA_STILL_LOOKS[looked % SEKIRYUGA_STILL_LOOKS.length], heroName) : null;
  return (
    <div className="screen seal" data-testid="seal-still">
      {painting && <img className="seal-painting" src={painting} alt="" aria-hidden="true" />}
      <div className="seal-dark seal-dark-kaos" aria-hidden="true" />
      <div className="seal-entrance after">
        <Figure toward={false} src={SEKIRYUGA_AT_REST} />
      </div>
      <div className="seal-words">
        {said?.speaker && <p className="speaker">{said.speaker}</p>}
        <p className="line" data-testid="seal-line">
          {said ? `「${said.text}」` : SEKIRYUGA_STILL_LINE}
        </p>
        <div className="actions">
          <button className="btn primary" data-testid="still-look" onClick={() => setLooked(looked + 1)}>
            調べる
          </button>
          <button className="btn" data-testid="still-leave" onClick={onLeave}>
            もどる
          </button>
        </div>
      </div>
    </div>
  );
}
