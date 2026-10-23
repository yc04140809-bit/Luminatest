import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FINALE_FIGHT_BGM,
  FINALE_PLACE_AMBIENCE,
  FINALE_SCENES,
  FINALE_SCENE_BGM,
  finaleBackdrop,
  finaleFrame,
  finaleMusicAt,
  type FinaleAmbience,
  type FinaleBackdrop,
  type FinaleFrame,
  type FinaleSceneId,
} from '@mugen/content/story/chapter1Finale';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { carriedInto } from '@mugen/content/characters/partyMembers';
import { KAOS_MP_REGEN, mpAfterRecovery } from '@mugen/content/characters/kaosMpRegen';
import { finaleBeat, finaleReached, type FinaleFight, type FinaleStage } from '@mugen/core/world/chapterFinale';
import type { PartyEnemyInput, PartyMember, PartyMemberSpec } from '@mugen/game/battle/partyBattle';
import type { BgmId } from '@mugen/assets';
import type { SfxId } from '@mugen/content/audio/sfx';
import { finaleBackdropSrc } from '../assets/finaleArt';
import type { FaceBox } from '../assets/kaosFaces';
import { finaleFaceFor, type FinaleFace } from './finaleFaces';
import { usePicture } from './scene';
import { PartyBattleScreen } from './battle/PartyBattleScreen';
import { hitStop, screenShake } from './fx/screenShake';
import { cameraSequence } from './fx/camera';
import { SpecialFx } from './fx/special/SpecialFx';
import { MOMENT_SPECIAL_FX, SPECIAL_FX, type SpecialEffectType } from './fx/special/specialFx';
import { audioManager, playSfx } from '../platform/audio';
import { playAmbience, stopAmbience } from '../platform/ambience';
import './finale.css';

/**
 * 第1章終盤 — THE FINALE, PLAYED (2026-10-12: 最低限の演出で最初から最後まで通す).
 *
 * The stage the world has reached says what comes next (core/world/
 * chapterFinale `finaleBeat`): its scenes, read one line at a time over
 * their pictures, then its fight. Each beat seen (each fight won) moves the
 * stage on — written before the next beat begins, so closing the game
 * anywhere resumes at the beat it was in, never further back than that.
 *
 *   the first form's HP at nought   the fight stops; the shell breaks (a
 *                  short scene); the second form, the same creature, with
 *                  fresh health — and the party as the first form left them
 *   a fight lost   the party is put back on its feet and the beat is played
 *                  again from its first scene — for the first form, the few
 *                  words on the grassland (never the raid again); for the
 *                  second, the shell breaking
 *   `until`        a stage not written past yet (the village after the stop,
 *                  手順6): 「つづく」, and back to the title
 *
 * World-free: whoever shows it says how a stage is kept (`onReach`), who
 * fights (`party`), and what a lost fight costs (`onLost`); the DEBUG preview
 * shows the same thing with nothing kept.
 */

/** What the finale wants to hear: a piece, nothing at all, or the place's own (null). */
export type FinaleMusic = BgmId | 'HUSH' | null;

export interface FinaleRunProps {
  /** Where the world is now. */
  stage: FinaleStage;
  heroName: string;
  /** The fights that are written, by name. A beat whose fight is missing is not begun. */
  fights: Partial<Record<FinaleFight, { spec: PartyEnemyInput; artId: string }>>;
  /** The party, as they stand now (asked when a fight begins that does not follow straight on from another). */
  party: () => readonly PartyMemberSpec[];
  autoAvailable: boolean;
  /** Played up to here for now: once the stage reaches it, 「つづく」. */
  until?: FinaleStage;
  /** Keep a stage reached; the next beat waits for it. */
  onReach: (stage: FinaleStage) => Promise<unknown>;
  /** A fight won: how the party came out of it (wounds carried). */
  onWon?: (members: readonly PartyMember[]) => Promise<unknown>;
  /** A fight lost: put them back on their feet. */
  onLost: () => Promise<unknown>;
  onMusic: (music: FinaleMusic) => void;
  /** 「つづく」 read: the finale is left for now. */
  onPause: () => void;
}

/** The breath before a fight (作者「無料強化メモ②」: 戦闘前 0.5秒 → ボスBGM → 戦闘): the music held low, then the fight. */
export const FIGHT_BREATH_MS = 500;
/** A line's own effect: the still beat before the camera kicks with the blade (ms), and the hold at the cut (作者: 必殺 100〜150ms). */
export const FX_KICK_AT = 100;
export const FX_HIT_STOP_MS = 100;

/** A line's own effect (FinaleLine `fx`) → the character's effect it plays (ui/fx/special). */
const FINALE_FX: Record<'ZERO_TENSHOU', SpecialEffectType> = { ZERO_TENSHOU: MOMENT_SPECIAL_FX.zeroTenshou[0] };

/** How low the music goes: DROP (and a hushed line) almost to nothing; DIP a little. */
const MUSIC_SHARE = { DROP: 0.12, DIP: 0.5 } as const;

type Phase =
  | { kind: 'SCENES'; scene: number; line: number }
  | { kind: 'FIGHT'; round: number }
  | { kind: 'PAUSE' };

/** What the stage leads to, and whether it can be played yet. */
function playable(stage: FinaleStage, fights: FinaleRunProps['fights'], until: FinaleStage | undefined) {
  if (until && finaleReached(stage, until)) return null;
  const beat = finaleBeat(stage);
  // Not begun: nothing left, a beat the player chooses (旅立つ) or the end screen (手順6), a fight not written yet.
  if (!beat || beat.trigger === 'DEPART' || beat.then === 'END_SCREEN') return null;
  if (beat.then && !fights[beat.then]) return null;
  return beat;
}

export function FinaleRun({ stage: from, heroName, fights, party, autoAvailable, until, onReach, onWon, onLost, onMusic, onPause }: FinaleRunProps) {
  const [stage, setStage] = useState<FinaleStage>(from);
  const beat = useMemo(() => playable(stage, fights, until), [stage, fights, until]);
  const [phase, setPhase] = useState<Phase>(() => (playable(from, fights, until) ? { kind: 'SCENES', scene: 0, line: 0 } : { kind: 'PAUSE' }));
  const [busy, setBusy] = useState(false);
  /** The fight (by its round) whose breath before it is still being held. */
  const [breath, setBreath] = useState<number | null>(null);
  const round = useRef(0);
  /** How the last fight left them, while the next follows straight on (the first form to the second). */
  const carried = useRef<readonly PartyMember[] | null>(null);

  const sceneId: FinaleSceneId | null = phase.kind === 'SCENES' && beat ? beat.scenes[phase.scene] : null;
  const music: FinaleMusic =
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
        setPhase(playable(next, fights, until) ? { kind: 'SCENES', scene: 0, line: 0 } : { kind: 'PAUSE' });
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

  if (phase.kind === 'FIGHT' && breath === phase.round) {
    return <FightBreath onDone={() => setBreath(null)} />;
  }

  if (phase.kind === 'FIGHT') {
    const which = beat.then as FinaleFight;
    const foe = fights[which]!;
    // The second form follows the first straight on: the party as it left them — and, in the breath
    // while the shell breaks, a little of Kaos's magic back (KAOS_MP_REGEN.BETWEEN_FORMS).
    const members =
      which === 'VALSHEEL_FORM2' && carried.current
        ? carriedInto(party(), carried.current).map((m) =>
            m.id === 'kaos' ? { ...m, mp: mpAfterRecovery(m.mp ?? m.maxMp, m.maxMp, KAOS_MP_REGEN.BETWEEN_FORMS) } : m,
          )
        : party();
    return (
      <PartyBattleScreen
        key={`finale-fight-${phase.round}`}
        members={members}
        enemy={foe.spec}
        enemyArtId={foe.artId}
        background="GRASSLAND"
        place={{ mark: 'GRASSLAND', name: '草原' }}
        autoAvailable={autoAvailable}
        onEnd={(r) => {
          if (r.outcome === 'VICTORY') {
            carried.current = which === 'VALSHEEL_FORM1' ? r.members : null;
            void (onWon ? onWon(r.members) : Promise.resolve())
              .catch((e) => console.error('Failed to carry the wounds out', e))
              .finally(() => reach(beat.reaches));
            return;
          }
          // Lost (it cannot be fled): on their feet again, and the beat from its first scene.
          carried.current = null;
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
      setBreath(round.current);
      return setPhase({ kind: 'FIGHT', round: round.current });
    }
    reach(beat.reaches);
  };
  const speaker = line.speaker === HERO_SPEAKER ? heroName : line.speaker;
  return (
    <FinaleScene
      sceneId={scene.id}
      backdrop={finaleBackdrop(scene, phase.line)}
      frame={finaleFrame(scene, phase.line)}
      mood={scene.id === 'EVE' ? 'night' : null}
      face={finaleFaceFor(line)}
      speaker={speaker}
      text={line.text}
      shake={line.shake ?? null}
      hush={line.hush === true}
      music={finaleMusicAt(scene, phase.line)}
      pause={line.pause ?? 0}
      se={line.se ?? null}
      fx={line.fx ? FINALE_FX[line.fx] : null}
      ambience={FINALE_PLACE_AMBIENCE[scene.place]}
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
  frame,
  mood,
  face,
  speaker,
  text,
  shake,
  hush,
  music,
  pause,
  se,
  fx,
  ambience,
  at,
  busy,
  onNext,
}: {
  sceneId: FinaleSceneId;
  backdrop: FinaleBackdrop;
  frame: FinaleFrame | null;
  mood: 'night' | null;
  face: FinaleFace | null;
  speaker: string | null;
  text: string;
  /** The picture's jolt as this line comes up (SCREEN SHAKE), or none. */
  shake: 'small' | 'medium' | 'large' | null;
  /** The music almost gone while this line is up. */
  hush: boolean;
  /** The music from a line before, until the scene ends (DROP / DIP), or as it is (null). */
  music: 'DROP' | 'DIP' | null;
  /** The 間 before the words (ms): the name and face first. */
  pause: number;
  /** A sound as the line comes up. */
  se: SfxId | null;
  /** A character's own effect over the picture (its shake and sound wait for it to land). */
  fx: SpecialEffectType | null;
  /** The place's own air under the words. */
  ambience: FinaleAmbience | null;
  at: number;
  busy: boolean;
  onNext: () => void;
}) {
  const src = usePicture(() => finaleBackdropSrc(backdrop), `finale:${backdrop}`);
  const shown = useFace(face);
  const root = useRef<HTMLDivElement>(null);
  // The line's jolt and sound, once, as it comes up — the picture only; the words hold still. With an
  // effect of its own (零閃・天衝 — 作者 TIGS「CAMERA KICK」: 構え → KICK MEDIUM → 斬撃 → 命中 → HIT STOP
  // → SHAKE): a beat of stillness, the camera kicks as the blade moves, the cut lands with its
  // sounds, the picture holds, and then it jolts.
  useEffect(() => {
    const at0 = root.current ?? undefined;
    const lands = fx ? SPECIAL_FX[fx].impact : 0;
    if (fx) void cameraSequence([{ kind: 'KICK', dir: 'left', strength: 'medium', wait: FX_KICK_AT }], at0);
    const t = window.setTimeout(() => {
      const sounds = new Set<SfxId>([...(fx ? (SPECIAL_FX[fx].sfx ?? []) : []), ...(se ? [se] : [])]);
      sounds.forEach((id) => playSfx(id));
      void hitStop(fx ? FX_HIT_STOP_MS : 0, at0).then(() => {
        if (shake) void screenShake(shake, at0);
      });
    }, lands);
    return () => window.clearTimeout(t);
  }, [sceneId, at]);
  // The music falling away (a hushed line; a DROP or a DIP until the scene ends) — eased, and back after.
  const share = hush ? MUSIC_SHARE.DROP : music ? MUSIC_SHARE[music] : 1;
  useEffect(() => {
    if (share >= 1) return;
    audioManager.duckBgmTo(share, 700);
    return () => audioManager.duckBgmTo(1, 400);
  }, [share]);
  // The place's own air, low, for as long as the scenes go on here; gone with them.
  useEffect(() => {
    playAmbience(ambience);
  }, [ambience]);
  useEffect(() => () => stopAmbience(), []);
  return (
    <div
      ref={root}
      className={`screen finale${mood ? ` finale-${mood}` : ''}`}
      data-testid="finale-scene"
      data-scene={sceneId}
      data-backdrop={backdrop}
      data-frame={frame ?? 'ALL'}
      data-at={at}
      data-ambience={ambience ?? 'NONE'}
      data-music={hush ? 'DROP' : (music ?? 'AS_IS')}
    >
      {/* The picture's own layer — always there, so a jolt has something to move even while a new
          picture is still coming (the words, outside it, never move). */}
      <div className="finale-stage" data-shake-layer="backdrop" aria-hidden="true">
        {src && (
          <img
            className="finale-backdrop"
            src={src}
            alt=""
            aria-hidden="true"
            data-testid="finale-backdrop"
            data-frame={frame ?? 'ALL'}
          />
        )}
        {fx && <SpecialFx key={`${sceneId}:${at}`} type={fx} />}
      </div>
      <div className="finale-box" onClick={onNext}>
        {shown && (
          <div className="finale-face" data-testid="finale-face" data-face={shown.key} aria-hidden="true">
            {/* The face inside the frame's window only (as the kit's CrystalIcon): never under or past its edge. */}
            <div className="finale-face-inside" data-testid="finale-face-inside">
              <img src={shown.src} alt="" style={windowOn(shown.box)} />
            </div>
          </div>
        )}
        {speaker && <p className="finale-speaker">{speaker}</p>}
        {/* The 間: the words come up `pause` after the name and the face (CSS — つぎへ never waits). */}
        <p
          key={`${sceneId}:${at}`}
          className={`finale-line${pause > 0 ? ' paused' : ''}`}
          data-testid="finale-line"
          data-pause={pause}
          style={pause > 0 ? { ['--finale-pause' as string]: `${pause}ms` } : undefined}
        >
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

/** The speaker's face, once fetched — only while it is still the one asked for. */
function useFace(face: FinaleFace | null): { key: string; src: string; box: FaceBox } | null {
  const [got, setGot] = useState<{ key: string; src: string; box: FaceBox } | null>(null);
  const key = face?.key ?? null;
  useEffect(() => {
    if (!face) return;
    let gone = false;
    void face.load().then((p) => {
      if (!gone && p) setGot({ key: face.key, ...p });
    });
    return () => {
      gone = true;
    };
    // `key` says which face; the object itself is new on every line.
  }, [key]);
  return got && got.key === key ? got : null;
}

/** The picture placed so only `box` of it shows in its square frame. */
function windowOn(box: FaceBox): Record<string, string> {
  return {
    width: `${(box.fileW / box.width) * 100}%`,
    height: `${(box.fileH / box.height) * 100}%`,
    left: `${(-box.x / box.width) * 100}%`,
    top: `${(-box.y / box.height) * 100}%`,
  };
}


/** The breath before a fight: the scene gone, the music held low a moment, then the fight. */
function FightBreath({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    audioManager.duckBgm(MUSIC_SHARE.DROP);
    const t = window.setTimeout(onDone, FIGHT_BREATH_MS);
    return () => {
      window.clearTimeout(t);
      audioManager.duckBgmTo(1, 300);
    };
  }, []);
  return <div className="screen finale finale-breath" data-testid="finale-breath" aria-hidden="true" />;
}
