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
} from '@mugen/content/story/sekiryugaArc';
import { SEKIRYUGA_NAME } from '@mugen/content/enemies/sekiryugaBattle';
import { RoamScene, type RoamKeeper, type RoamMemory } from './explore/RoamScene';
import { walkPainting } from '../assets/walk';
import { battleEnemyArt } from './battle/battleArt';
import { playSfx } from '../platform/audio';

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
 *
 * The fight itself is the ordinary battle screen; this file only leads up
 * to it and away from it.
 */

/** Which part of the ruins is showing. */
export type RuinsPhase = 'walk' | 'approach' | 'aftermath';

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
  deep: 'APPROACH' | 'AFTERMATH' | null;
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
      memory={memory}
      resume={resume}
      events={
        deep && (
          <button className="btn walk-event primary" data-testid="deep-button" onClick={onDeep}>
            遺跡の奥へ進む
          </button>
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
function Figure({ toward, stopped = false }: { toward: boolean; stopped?: boolean }) {
  const art = battleEnemyArt('sekiryuga', 'front');
  if (!art.asset) return null;
  return (
    <img
      className={`seal-figure${toward ? ' toward' : ''}${stopped ? ' stopped' : ''}`}
      src={art.asset.src}
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
