import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FINALE_FIGHT_BGM,
  FINALE_SCENES,
  FINALE_SCENE_BGM,
  finaleBackdrop,
  type FinaleSceneId,
} from '@mugen/content/story/chapter1Finale';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { finaleBeat, type FinaleFight, type FinaleStage } from '@mugen/core/world/chapterFinale';
import type { PartyEnemyInput, PartyMember, PartyMemberSpec } from '@mugen/game/battle/partyBattle';
import type { BgmId } from '@mugen/assets';
import { finaleBackdropSrc } from '../assets/finaleArt';
import { usePicture } from './scene';
import { PartyBattleScreen } from './battle/PartyBattleScreen';
import './finale.css';

/**
 * 第1章終盤 — THE FINALE, PLAYED (2026-10-12, 手順3: 最低限の演出で最後まで通す).
 *
 * The stage the world has reached says what comes next (core/world/
 * chapterFinale `finaleBeat`): its scenes, read one line at a time over
 * their pictures, then its fight. Each beat seen (each fight won) moves the
 * stage on — written before the next beat begins, so closing the game
 * anywhere resumes at the beat it was in, never further back than that.
 *
 *   a fight lost   the party is put back on its feet and the beat is played
 *                  again from its first scene (the scene just before the
 *                  fight) — never the whole morning
 *   a fight not written yet (the second form, 手順4・5)
 *                  the beat is not begun: 「つづく」, and back to the title
 *
 * World-free: whoever shows it says how a stage is kept (`onReach`), who
 * fights (`party`), and what a lost fight costs (`onLost`); the DEBUG preview
 * shows the same thing with nothing kept.
 */

export interface FinaleRunProps {
  /** Where the world is now. */
  stage: FinaleStage;
  heroName: string;
  /** The fights that are written, by name. A beat whose fight is missing is not begun. */
  fights: Partial<Record<FinaleFight, { spec: PartyEnemyInput; artId: string }>>;
  /** The party, as they stand now (asked each time a fight begins). */
  party: () => readonly PartyMemberSpec[];
  autoAvailable: boolean;
  /** Keep a stage reached; the next beat waits for it. */
  onReach: (stage: FinaleStage) => Promise<unknown>;
  /** A fight won: how the party came out of it (wounds carried). */
  onWon?: (members: readonly PartyMember[]) => Promise<unknown>;
  /** A fight lost: put them back on their feet. */
  onLost: () => Promise<unknown>;
  /** The music the finale wants now (null: the place's own). */
  onMusic: (bgm: BgmId | null) => void;
  /** 「つづく」 read: the finale is left for now. */
  onPause: () => void;
}

type Phase =
  | { kind: 'SCENES'; scene: number; line: number }
  | { kind: 'FIGHT'; round: number }
  | { kind: 'PAUSE' };

/** What the stage leads to, and whether it can be played yet. */
function playable(stage: FinaleStage, fights: FinaleRunProps['fights']) {
  const beat = finaleBeat(stage);
  // Not begun: nothing left, a beat the player chooses (旅立つ) or the end screen (手順6), a fight not written yet.
  if (!beat || beat.trigger === 'DEPART' || beat.then === 'END_SCREEN') return null;
  if (beat.then && !fights[beat.then]) return null;
  return beat;
}

export function FinaleRun({ stage: from, heroName, fights, party, autoAvailable, onReach, onWon, onLost, onMusic, onPause }: FinaleRunProps) {
  const [stage, setStage] = useState<FinaleStage>(from);
  const beat = useMemo(() => playable(stage, fights), [stage, fights]);
  const [phase, setPhase] = useState<Phase>(() => (playable(from, fights) ? { kind: 'SCENES', scene: 0, line: 0 } : { kind: 'PAUSE' }));
  const [busy, setBusy] = useState(false);
  const round = useRef(0);

  const sceneId: FinaleSceneId | null = phase.kind === 'SCENES' && beat ? beat.scenes[phase.scene] : null;
  const music: BgmId | null =
    phase.kind === 'FIGHT' ? FINALE_FIGHT_BGM : sceneId ? (FINALE_SCENE_BGM[sceneId] ?? null) : null;
  useEffect(() => {
    onMusic(music);
  }, [music]);

  /** The beat is over (its scenes read, its fight won): keep the stage, then the next. */
  const reach = (next: FinaleStage) => {
    setBusy(true);
    void onReach(next)
      .catch((e) => console.error('Failed to keep the finale’s stage', e))
      .finally(() => {
        setBusy(false);
        setStage(next);
        setPhase(playable(next, fights) ? { kind: 'SCENES', scene: 0, line: 0 } : { kind: 'PAUSE' });
      });
  };

  if (phase.kind === 'PAUSE' || !beat) {
    return (
      <div className="screen finale-pause" data-testid="finale-pause" data-stage={stage}>
        <p className="finale-pause-title">つづく</p>
        <p className="finale-pause-note">この先は、次の更新で遊べるようになります。</p>
        <button className="btn primary" data-testid="finale-pause-ok" onClick={onPause}>
          タイトルへ
        </button>
      </div>
    );
  }

  if (phase.kind === 'FIGHT') {
    const foe = fights[beat.then as FinaleFight]!;
    return (
      <PartyBattleScreen
        key={`finale-fight-${phase.round}`}
        members={party()}
        enemy={foe.spec}
        enemyArtId={foe.artId}
        background="GRASSLAND"
        place={{ mark: 'GRASSLAND', name: '草原' }}
        autoAvailable={autoAvailable}
        onEnd={(r) => {
          if (r.outcome === 'VICTORY') {
            void (onWon ? onWon(r.members) : Promise.resolve())
              .catch((e) => console.error('Failed to carry the wounds out', e))
              .finally(() => reach(beat.reaches));
            return;
          }
          // Lost (it cannot be fled): on their feet again, and the beat from its first scene.
          void onLost()
            .catch((e) => console.error('Failed to put them on their feet', e))
            .finally(() => setPhase({ kind: 'SCENES', scene: 0, line: 0 }));
        }}
      />
    );
  }

  const scene = FINALE_SCENES[sceneId!];
  const line = scene.lines[phase.line];
  const lastLine = phase.line >= scene.lines.length - 1;
  const lastScene = phase.scene >= beat.scenes.length - 1;
  const next = () => {
    if (busy) return;
    if (!lastLine) return setPhase({ ...phase, line: phase.line + 1 });
    if (!lastScene) return setPhase({ kind: 'SCENES', scene: phase.scene + 1, line: 0 });
    if (beat.then && beat.then !== 'END_SCREEN') {
      round.current += 1;
      return setPhase({ kind: 'FIGHT', round: round.current });
    }
    reach(beat.reaches);
  };
  const speaker = line.speaker === HERO_SPEAKER ? heroName : line.speaker;
  return (
    <FinaleScene
      sceneId={scene.id}
      backdrop={finaleBackdrop(scene, phase.line)}
      mood={scene.id === 'EVE' ? 'night' : scene.id === 'RAID' || scene.id === 'VILLAGE_MIREI' ? 'raid' : null}
      speaker={speaker}
      text={line.text}
      at={phase.line}
      busy={busy}
      onNext={next}
    />
  );
}

/** One line over its picture: the picture filling the screen, the words in a box along the bottom. */
function FinaleScene({
  sceneId,
  backdrop,
  mood,
  speaker,
  text,
  at,
  busy,
  onNext,
}: {
  sceneId: FinaleSceneId;
  backdrop: Parameters<typeof finaleBackdropSrc>[0];
  mood: 'night' | 'raid' | null;
  speaker: string | null;
  text: string;
  at: number;
  busy: boolean;
  onNext: () => void;
}) {
  const src = usePicture(() => finaleBackdropSrc(backdrop), `finale:${backdrop}`);
  return (
    <div
      className={`screen finale${mood ? ` finale-${mood}` : ''}`}
      data-testid="finale-scene"
      data-scene={sceneId}
      data-backdrop={backdrop}
      data-at={at}
    >
      {src && <img className="finale-backdrop" src={src} alt="" aria-hidden="true" data-testid="finale-backdrop" />}
      <div className="finale-box" onClick={onNext}>
        {speaker && <p className="finale-speaker">{speaker}</p>}
        <p className="finale-line" data-testid="finale-line">
          {speaker ? `「${text}」` : text}
        </p>
        <button
          className="btn primary finale-next"
          data-testid="finale-next"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
        >
          つぎへ
        </button>
      </div>
    </div>
  );
}
