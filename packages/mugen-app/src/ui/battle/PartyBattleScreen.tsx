import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ENEMY_ID,
  castable,
  cooldownLeft,
  createPartyBattle,
  currentActor,
  enemyAct,
  enemyById,
  enemyTarget,
  isEnemyId,
  memberById,
  standingEnemies,
  partyAct,
  partyAutoAction,
  partySkillReady,
  regenTargetable,
  tauntOf,
  isBroken,
  techUsable,
  upcomingTurns,
  type PartyAction,
  type PartyBattleState,
  type PartyBeat,
  type PartyEnemy,
  type PartyEnemyInput,
  type PartyMember,
  type PartyMemberSpec,
  type PartyTechnique,
} from '@mugen/game/battle/partyBattle';
import type { MagicDef } from '@mugen/core/magic/magic';
import type { SfxId } from '@mugen/content/audio/sfx';
import type { BattleBackgroundKey } from '@mugen/assets/keys';
import type { ArtBox } from '@mugen/core/art/artStates';
import { battleEnemyArt, battlePartyArt, type BattlePartyId } from './battleArt';
import { battleBackgroundArt } from '../../assets/battleBackground';
import { playSfx } from '../../platform/audio';
import { hitStop, screenShake, shakeAllowed } from '../fx/screenShake';
import { CAMERA_COMBOS, camera, cameraSequence } from '../fx/camera';
import { beatFx, counterFx, type BeatContext, type BeatFx } from './partyFx';
import { SpecialFx } from '../fx/special/SpecialFx';
import { SPECIAL_FX } from '../fx/special/specialFx';
import { CageIcon, SparkIcon, SwordIcon } from './BattleIcons';
import { BATTLE_UI_FRAMES } from './battleArt';
import { WorldMemoryPanel } from './BattleHud';
import { memoryRows } from './battleHud';
import './battle.generated.css';
import { CROSS_SLOTS, FIGURE_SCALE, FOOT_AT, enemyPlaces, footStyle, partyPlaces, stageFor, type CrossSlot } from './partyStage';
import './partyBattle.css';

/**
 * THE PARTY FIGHT'S SCREEN (戦闘方式 B, 2026-10-12): everyone their own
 * health and their own turn (game/battle/partyBattle.ts).
 *
 * THE SAME PICTURE AS EVERY FIGHT IN THE GAME (作者指示 2026-10-12, 固定方針):
 * the field is the whole screen; the creature on the LEFT, the party on the
 * RIGHT standing in a CROSS of four fixed places laid along the ground
 * (partyStage.ts — front, mid-upper, mid-lower, back; every one on the
 * ground, with a shadow; an empty place shows as a mark on the ground). The
 * reading and the controls are in the same places in every fight of this
 * kind, a giant's included:
 *
 *   top left      the creature's name, HP, BREAK gauge and state (防御DOWN)
 *   top centre    the TURN ORDER, the place, the last line said
 *   top right     the party, one card each, down the edge: face, HP and its
 *                 bar — MP too for one who has magic — and what is on them
 *                 (「月影 2T」「星癒 3T」). Room for four.
 *   bottom left   WORLD MEMORY (as in every fight), then AUTO, ×2 and ESCAPE
 *                 (「逃走不可」 against a boss — ヴァルシール, セキリュウガ)
 *   bottom right  the COMMAND CROSS — 攻撃 up, スキル left, 魔法 right, 防御
 *                 down, the face of whoever is acting in the middle; only
 *                 what is in it changes from one member to the next. A list
 *                 (スキル, 魔法, 「誰に？」) opens beside it.
 *
 * A GIANT (`battleScale: 'GIANT'` on the creature — ヴァルシール) is drawn
 * bigger than the screen and the party a little smaller in the same cross;
 * nothing of the reading or the controls moves.
 *
 * TWO OR THREE CREATURES (2026-10-12, 複数敵): they stand on the left in a
 * diagonal into the ground (partyStage's enemy places), each with a small
 * HP bar and its footing under its feet; the top-left plate shows the one in
 * FOCUS (tap a creature to look at it; the one last aimed at stays in
 * focus), marked ▼ on the field. 攻撃, a skill, a damage spell and 重撃・豪断
 * then ask 「どれを？」 — a creature from the list, or tapped on the field.
 * Each creature has its own face in the TURN ORDER. With one creature,
 * nothing is asked and the screen is as it was.
 *
 * THEIR TECHNIQUES AND BREAK (通常スキル3種): every technique is in the
 * スキル list (星癒の羽 then asks 「誰に？」). MISS, the counter and the heal
 * over time float where they happen; a technique's name flashes as it is
 * used; broken, 「BREAK!!」 fills the middle of the screen, the screen
 * shakes, and 「BREAK中」 stays at the creature's feet and 防御DOWN on its
 * plate for as long as it lasts.
 *
 * SKILLS AND MAGIC (2026-10-12, 戦闘ルール整理): the スキル list is the
 * member's own skills — no MP, each waiting a number of their turns after use;
 * one waiting stays in the list, greyed, with 「あとNT」. The 魔法 list is the
 * spells, paid in MP. 星癒の羽 cannot be laid on one who has it (「星癒中」).
 *
 * Nothing here is saved: whoever starts the fight decides what its end
 * means (`onEnd`) — won, lost, or fled (ESCAPE).
 */

/**
 * BREAK's sound — the one place to change it when its own SE comes
 * (an existing one stands in until then).
 */
export const BREAK_SFX: SfxId = 'battle_critical';
export function playBreakSfx() {
  playSfx(BREAK_SFX);
}

export interface PartyBattleProps {
  members: readonly PartyMemberSpec[];
  /** The creature, or two or three (each may carry its own `artId`). */
  enemy: PartyEnemyInput | readonly PartyEnemyInput[];
  /** The creature's drawing (battleArt's enemy id) — for any that carries none. */
  enemyArtId: string;
  background?: BattleBackgroundKey | null;
  autoAvailable?: boolean;
  /** The fight is over and its result read: who won, and how they stand. */
  onEnd: (result: { outcome: 'VICTORY' | 'DEFEAT' | 'ESCAPE'; members: readonly PartyMember[] }) => void;
  /** The dice, for a test. */
  rng?: () => number;
  /** WORLD MEMORY, bottom left: what the world remembers, and how deep (absent: nothing yet). */
  memory?: { lines: readonly string[]; depth: number };
  /** Where the fight is, under the TURN ORDER (as every fight shows it). */
  place?: { mark: string; name: string };
  /** Who stands in which place of the cross (absent: partyStage's DEFAULT_FORMATION — グレイヴ front, 主人公 mid-lower, ケイオス back). */
  formation?: Readonly<Partial<Record<CrossSlot, string>>>;
}

const ENEMY_TURN_MS = 700;
const AUTO_TURN_MS = 450;
/** A breath more after a BREAK, for 「BREAK!!」 to be seen. */
const BREAK_PAUSE_MS = 700;
const SHAKE_MS = 450;
/** BREAK's hit-stop: the field holds this long at the blow before it jolts (作者: 重攻撃 80〜120ms). */
const BREAK_HIT_STOP_MS = 90;
/** After 「BREAK!!」, a moment before the creature reels (作者: …→ BREAK!! → 敵リアクション). */
const BREAK_REEL_MS = 90;

/** What is on a member, short, for under their name. */
function statusChips(m: PartyMember): { key: string; label: string; title: string }[] {
  const out: { key: string; label: string; title: string }[] = [];
  // 月影の構え: its guard, and the blows drawn to him (注目) — one chip; a separate 「注目」 chip can be added here when a taunt stands on its own.
  if (m.guardTurns > 0) out.push({ key: 'guard', label: `月影 ${m.guardTurns}T`, title: `月影の構え 残り${m.guardTurns}T（注目：敵の単体攻撃を引きつける）` });
  if (m.regenTurns > 0) out.push({ key: 'regen', label: `星癒 ${m.regenTurns}T`, title: `星癒の羽 残り${m.regenTurns}T` });
  return out;
}

/** The sound of what a member just did. */
function sfxOf(beat: PartyBeat | null, tech?: PartyTechnique): SfxId {
  if (!beat) return 'battle_attack_slash';
  if (beat.kind === 'MEND') return 'battle_heal';
  if (beat.kind === 'MAGIC') return 'magic_cast';
  if (beat.kind === 'DEFEND') return 'battle_guard';
  if (beat.kind === 'TECH') {
    if (tech?.kind === 'MOON_GUARD') return 'battle_buff';
    if (tech?.kind === 'REGEN') return 'battle_heal';
    return 'battle_attack_heavy_weapon';
  }
  if (beat.kind === 'SKILL') return 'battle_skill_slash';
  return 'battle_attack_slash';
}

/** A head cut from a drawing by its face box, in a round frame. */
function Face({ src, box, testId, actor, acting, tag }: { src: string | null; box?: ArtBox; testId: string; actor: string; acting: boolean; tag?: string }) {
  const style = box
    ? {
        width: `${(box.fileW / box.width) * 100}%`,
        height: `${(box.fileH / box.height) * 100}%`,
        left: `${(-box.x / box.width) * 100}%`,
        top: `${(-box.y / box.height) * 100}%`,
      }
    : undefined;
  return (
    <div className={`pb-face${acting ? ' acting' : ''}${isEnemyId(actor) ? ' foe' : ''}`} data-testid={testId} data-actor={actor}>
      {src && <img src={src} alt="" aria-hidden="true" style={style} />}
      {tag && <b className="pb-face-tag">{tag}</b>}
    </div>
  );
}

function Bar({ value, max, kind }: { value: number; max: number; kind: 'hp' | 'mp' }) {
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className={`pb-bar ${kind}`} aria-hidden="true">
      {/* HP's red trail (作者 2026-10-16): stays a moment where it was, then follows the fill down. */}
      {kind === 'hp' && <div className="pb-bar-trail" style={{ width: `${share * 100}%` }} />}
      <div className="pb-bar-fill" style={{ width: `${share * 100}%` }} />
    </div>
  );
}

/**
 * BREAK's breaking crystal (作者 2026-10-16): where each piece of the sheet's crystal flies as the
 * plate behind 「BREAK!!」 splits — direction (px), turn (deg), which piece. Fixed, so it is the same
 * every time.
 */
const BREAK_SHARDS: readonly { dx: number; dy: number; rot: number; spark?: boolean }[] = [
  { dx: -150, dy: -60, rot: -140 },
  { dx: -110, dy: 55, rot: 120, spark: true },
  { dx: -60, dy: -85, rot: -60, spark: true },
  { dx: 70, dy: -80, rot: 90 },
  { dx: 140, dy: -35, rot: 160, spark: true },
  { dx: 120, dy: 65, rot: -110 },
  { dx: 20, dy: 90, rot: 45, spark: true },
];

/** Which beat is the last one: the log's length (each beat says at least one line). */
const lastKeyOf = (state: PartyBattleState) => state.log.length;

/**
 * The one struck reels (作者: 敵の被弾リアクション): its drawing pushed away from the blow and back —
 * `away` -1 to the left (a creature, struck from the party's side), 1 to the right — and sunk
 * `down` px under a heavy one. On `transform`, so the field's shake (`translate`) is not touched.
 */
function reelOf(root: HTMLElement, reel: { on: string; px: number; down: number }, away: -1 | 1, speed: number) {
  const img = root.querySelector<HTMLElement>(isEnemyId(reel.on) ? `[data-enemy="${reel.on}"] > img` : `[data-testid="pb-figure-${reel.on}"] > img`);
  if (!img || typeof img.animate !== 'function' || !shakeAllowed()) return;
  img.animate(
    [
      { transform: 'translate(0, 0)', easing: 'cubic-bezier(0.15, 0.85, 0.3, 1)' },
      { transform: `translate(${away * reel.px}px, ${reel.down}px)`, offset: 0.3, easing: 'ease-in-out' },
      { transform: 'translate(0, 0)' },
    ],
    { duration: Math.round((reel.down > 0 ? 320 : 200) * speed), fill: 'none' },
  );
}

/** A skill's wait, in the list: 「あとNT」 while it cools down; nothing when it is ready. */
function Wait({ left }: { left: number }) {
  return left > 0 ? (
    <small className="wait" data-testid="pb-wait" data-left={left}>
      あと{left}T
    </small>
  ) : null;
}

export function PartyBattleScreen({ members, enemy, enemyArtId, background = null, autoAvailable = true, onEnd, rng, memory, place, formation }: PartyBattleProps) {
  const dice = rng ?? Math.random;
  const [state, setState] = useState<PartyBattleState>(() => createPartyBattle(members, enemy));
  const [auto, setAuto] = useState(false);
  const [fast, setFast] = useState(false);
  const [menu, setMenu] = useState<'COMMANDS' | 'SKILL' | 'MAGIC' | 'TARGET' | 'ENEMY'>('COMMANDS');
  /** 「どれを？」: what will be done to the creature chosen, and the menu it came from. */
  const [pending, setPending] = useState<{ make: (target: string) => PartyAction; from: 'COMMANDS' | 'SKILL' | 'MAGIC' } | null>(null);
  /** The creature the plate shows (and ▼ marks): the one tapped or last aimed at. */
  const [focus, setFocus] = useState<string>(ENEMY_ID);
  const [aiming, setAiming] = useState<{ spell: MagicDef } | { tech: PartyTechnique } | null>(null);
  const [shaking, setShaking] = useState(false);
  /** The beat whose 「BREAK!!」 is up — shown once its blow has held (hit → stop → SE → shake → BREAK!!). */
  const [breakShown, setBreakShown] = useState(-1);
  const [bg, setBg] = useState<string | null>(null);
  const ended = useRef(false);
  /** The screen, so a shake or the camera moves this fight's field and painting (ui/fx) and nothing else. */
  const root = useRef<HTMLDivElement>(null);
  const actor = currentActor(state);
  const acting = actor && !isEnemyId(actor) ? memberById(state, actor) : undefined;

  useEffect(() => {
    if (!background) return;
    let gone = false;
    void battleBackgroundArt(background).then((src) => !gone && setBg(src));
    return () => {
      gone = true;
    };
  }, [background]);

  const inputs: readonly PartyEnemyInput[] = Array.isArray(enemy) ? enemy : [enemy as PartyEnemyInput];
  const many = inputs.length > 1;
  // One giant alone takes the GIANT staging; a fight of several is drawn as an ordinary one.
  const scale = !many ? inputs[0].battleScale : undefined;
  const stage = stageFor(scale);
  const giant = (scale ?? 'NORMAL') === 'GIANT';
  const places = useMemo(() => partyPlaces(members.map((m) => m.id), stage, formation), [members, stage, formation]);
  const artIds = useMemo(() => inputs.map((e) => e.artId ?? enemyArtId), [inputs, enemyArtId]);
  const foeSpots = enemyPlaces(stage, scale, artIds);
  const art = useMemo(() => {
    const party: Record<string, { src: string | null; face?: ArtBox }> = {};
    for (const m of members) {
      const a = battlePartyArt(m.id as BattlePartyId, 'battle_idle').asset;
      party[m.id] = { src: a?.src ?? null, face: a?.face };
    }
    const foes: Record<string, { src: string | null; face?: ArtBox }> = {};
    state.enemies.forEach((e, i) => {
      const a = battleEnemyArt(artIds[i], 'front').asset;
      foes[e.id] = { src: a?.src ?? null, face: a?.face };
    });
    return { party, foes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, artIds]);

  const act = (action: PartyAction) => {
    const next = partyAct(state, action, dice);
    if (next === state) return;
    const tech = action.kind === 'TECH' ? acting?.techniques?.find((t) => t.id === action.techId) : undefined;
    playSfx(sfxOf(next.last, tech));
    if (next.last?.regen) playSfx('battle_heal');
    if (next.last && isEnemyId(next.last.target)) setFocus(next.last.target);
    setMenu('COMMANDS');
    setAiming(null);
    setPending(null);
    setState(next);
  };

  // EACH BLOW, PLAYED (partyFx): the camera first, then at the blow its flash and layered sound, the
  // hold (hit-stop), and after it the shake, the camera's answer, the one struck reeling. A BREAK:
  // the hold, then its sound, the shake, the camera onto it, 「BREAK!!」, and the creature reels.
  // Nothing here holds up the fight; a beat that follows cuts the rest short.
  useEffect(() => {
    const beat = state.last;
    const at = root.current;
    if (!beat || !at) return;
    const speed = fast ? 0.5 : 1;
    const timers: number[] = [];
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(() => at.isConnected && f(), ms));
    const ctx = beatContext(beat, true);
    const play = (p: BeatFx, breaks: boolean) => {
      if (p.camera) void cameraSequence(p.camera, at, { tempo: p.tempo * speed });
      // A hold freezes what is drawn (the effects' CSS, the camera) but not the clock: a moment after
      // one comes that much later on screen, so it is waited for here too.
      const holds = shakeAllowed() ? (p.stages ?? []) : [];
      const when = (t: number) => (t + holds.filter((st) => st.at < t).reduce((n, st) => n + st.hitStop, 0)) * speed;
      // The characters' own effects: each one's sounds at its landing.
      for (const sp of p.special ?? []) {
        const spec = SPECIAL_FX[sp.type];
        if (spec.sfx) later(when(sp.at + spec.impact), () => spec.sfx!.forEach((id) => playSfx(id)));
      }
      // The blows before the last (重撃 before 豪断): each its own hold, then its jolt and reeling.
      for (const st of p.stages ?? []) {
        later(when(st.at), () => {
          void hitStop(st.hitStop * speed, at).then(() => {
            if (!at.isConnected) return;
            if (st.shake) void screenShake(st.shake, at);
            if (st.reel) reelOf(at, st.reel, isEnemyId(st.reel.on) ? -1 : 1, speed);
          });
        });
      }
      later(when(p.impact), () => {
        for (const id of p.sfx) playSfx(id);
        void hitStop((breaks ? BREAK_HIT_STOP_MS : p.hitStop) * speed, at).then(() => {
          if (!at.isConnected) return;
          if (breaks) {
            playBreakSfx();
            void screenShake('medium', at);
            void cameraSequence(CAMERA_COMBOS.BREAK_FOCUS(ctx.targetAt), at, { tempo: speed });
            setBreakShown(lastKey);
            later(BREAK_REEL_MS * speed, () => setShaking(true));
            later((BREAK_REEL_MS + SHAKE_MS) * speed, () => setShaking(false));
            return;
          }
          if (p.after) void camera(p.after, at, p.tempo * speed);
          if (p.shake) void screenShake(p.shake, at);
          if (p.reel) reelOf(at, p.reel, isEnemyId(p.reel.on) ? -1 : 1, speed);
        });
      });
    };
    play(beatFx(beat, ctx), !!beat.broke);
    if (beat.counter !== undefined) play(counterFx(beat, ctx), false);
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKeyOf(state)]);

  // The creature's turn, and AUTO's: played after a breath (halved at ×2).
  useEffect(() => {
    if (state.outcome !== 'ONGOING' || !actor) return;
    // A long effect of the characters' own (グレイヴ's 重撃・豪断) asks for a little longer, to be seen whole.
    const ms = ((isEnemyId(actor) ? ENEMY_TURN_MS : AUTO_TURN_MS) + (fx?.hold ?? 0)) / (fast ? 2 : 1) + (state.last?.broke ? BREAK_PAUSE_MS : 0);
    if (isEnemyId(actor)) {
      const t = window.setTimeout(() => {
        const next = enemyAct(state, dice);
        if (next === state) return;
        const beat = next.last;
        if (beat?.missed) playSfx('battle_evade');
        else if (beat?.kind === 'ENEMY_ATTACK') playSfx('battle_damage');
        // Its big blows (a named move) shake and move the camera — partyFx, played above.
        if (beat?.counter) playSfx('battle_attack_slash');
        setState(next);
      }, ms);
      return () => window.clearTimeout(t);
    }
    if (auto) {
      const t = window.setTimeout(() => {
        const a = partyAutoAction(state);
        if (a) act(a);
      }, ms);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, auto, fast]);

  useEffect(() => {
    if (state.outcome === 'VICTORY') playSfx('battle_win');
  }, [state.outcome]);

  const order = upcomingTurns(state, 5);
  const faceOf = (id: string) => (isEnemyId(id) ? (art.foes[id] ?? { src: null }) : (art.party[id] ?? { src: null }));
  /** A creature's letter (A, B, C) when two of one name are in the fight. */
  const tagOf = (id: string) => {
    const e = isEnemyId(id) ? enemyById(state, id) : undefined;
    const m = e && /[A-Z]$/.exec(e.name);
    return m ? m[0] : undefined;
  };
  // The plate's creature: the one in focus if it is standing, else the first standing.
  const focused: PartyEnemy = enemyTarget(state, focus) ?? standingEnemies(state)[0] ?? state.enemy;
  /** Aimed at a creature: asked 「どれを？」 when more than one stands; else straight to it. */
  const aimEnemy = (make: (target: string) => PartyAction, from: 'COMMANDS' | 'SKILL' | 'MAGIC') => {
    const standing = standingEnemies(state);
    if (standing.length <= 1) {
      act(make(standing[0]?.id ?? ENEMY_ID));
      return;
    }
    setPending({ make, from });
    setMenu('ENEMY');
  };
  const chooseEnemy = (id: string) => {
    if (!pending || !enemyTarget(state, id)) return;
    act(pending.make(id));
  };
  const last = state.last;
  const lastKey = lastKeyOf(state);
  /** What the beat needs to be played: what was used, how big the one struck is, where they stand. */
  function beatContext(beat: PartyBeat, measure: boolean): BeatContext {
    const doer = isEnemyId(beat.actor) ? undefined : memberById(state, beat.actor);
    const foe = isEnemyId(beat.actor) ? enemyById(state, beat.actor) : undefined;
    const struck = isEnemyId(beat.target) ? enemyById(state, beat.target) : memberById(state, beat.target);
    const where = (id: string) => {
      const el = measure ? root.current?.querySelector(isEnemyId(id) ? `[data-enemy="${id}"]` : `[data-testid="pb-figure-${id}"]`) : null;
      const box = root.current?.getBoundingClientRect();
      if (!el || !box || box.width === 0) return isEnemyId(id) ? 0.25 : 0.7;
      const r = el.getBoundingClientRect();
      return (r.left + r.width / 2 - box.left) / box.width;
    };
    const tech = beat.kind === 'TECH' ? doer?.techniques?.find((t) => t.name === beat.name) : undefined;
    const spell = beat.kind === 'MAGIC' || beat.kind === 'MEND' ? doer?.magic?.find((m) => m.name === beat.name) : undefined;
    const skill = beat.kind === 'SKILL' ? doer?.skills?.find((k) => k.name === beat.name) : undefined;
    return {
      skillId: tech?.id ?? spell?.id ?? skill?.id,
      tech,
      spell,
      giant,
      targetMaxHp: struck?.maxHp ?? 0,
      moves: foe ? { heavy: foe.moves.heavy?.name, sweep: foe.moves.sweep?.name } : undefined,
      targetAt: where(beat.target),
      actorAt: where(beat.actor),
      actorArt: foe ? artIds[state.enemies.findIndex((e) => e.id === foe.id)] : undefined,
    };
  }
  // The beat's flashes, numbers and circle, as drawn (where they stand is only for the camera).
  const fx = last ? beatFx(last, beatContext(last, false)) : null;
  const counter = last && last.counter !== undefined ? counterFx(last, { giant }) : null;
  const fxSpeed = fast ? 0.5 : 1;
  /** When something of this beat shows: at its blow (a CSS delay, so nothing waits in JavaScript). */
  const impactStyle = (p: BeatFx | null) => ({ ['--pb-impact' as string]: `${Math.round((p?.impact ?? 0) * fxSpeed)}ms` });
  const flash = (on: string, p: BeatFx | null) =>
    p?.flash && p.flash.on === on ? (
      <span
        key={`fx${lastKey}${p === counter ? 'c' : ''}`}
        className={`pb-hit ${p.flash.kind}${p.flash.colour ? ` ${p.flash.colour}` : ''}`}
        data-testid="pb-hit"
        data-kind={p.flash.kind}
        aria-hidden="true"
        style={impactStyle(p)}
      />
    ) : null;
  const tierOf = (p: BeatFx | null) => (p?.number ? ` ${p.number}` : '');
  /** The characters' own effects of this beat that stand on `on` (ui/fx/special). */
  const specials = (on: string, foe: boolean, figure?: string | null) =>
    [fx, counter].flatMap((p, n) =>
      (p?.special ?? [])
        .filter((sp) => sp.on === on)
        .map((sp, i) => (
          <SpecialFx key={`sx${lastKey}-${n}-${i}`} type={sp.type} delay={sp.at * fxSpeed} k={fxSpeed} giant={foe && giant} figure={figure} />
        )),
    );
  const spells = acting ? (acting.magic ?? []).filter((m) => m.effect === 'DAMAGE' || m.effect === 'MEND') : [];
  const canCast = acting ? castable(acting) : [];
  const skills = acting?.skills ?? [];
  const techs = acting?.techniques ?? [];
  const pickSpell = (spell: MagicDef) => {
    if (spell.effect === 'MEND') {
      setAiming({ spell });
      setMenu('TARGET');
      return;
    }
    aimEnemy((target) => ({ kind: 'MAGIC', magicId: spell.id, target }), 'MAGIC');
  };
  const pickTech = (tech: PartyTechnique) => {
    if (tech.target === 'ALLY') {
      setAiming({ tech });
      setMenu('TARGET');
      return;
    }
    if (tech.target === 'ENEMY') {
      aimEnemy((target) => ({ kind: 'TECH', techId: tech.id, target }), 'SKILL');
      return;
    }
    act({ kind: 'TECH', techId: tech.id });
  };
  const aimAt = (id: string) => {
    if (!aiming) return;
    act('spell' in aiming ? { kind: 'MAGIC', magicId: aiming.spell.id, target: id } : { kind: 'TECH', techId: aiming.tech.id, target: id });
  };
  const broken = isBroken(focused);
  // A technique's or skill's name, flashed as it is used.
  const flashName = last && (last.kind === 'TECH' || last.kind === 'SKILL') ? last.name : undefined;
  const playerInput = !!acting && !auto && state.outcome === 'ONGOING';
  const bossFight = state.enemies.some((e) => e.boss);
  const toggle = (m: 'SKILL' | 'MAGIC') => setMenu((was) => (was === m ? 'COMMANDS' : m));
  const actingFace = acting ? faceOf(acting.id) : null;

  return (
    <div
      ref={root}
      className={`screen pb-screen${shaking ? ' shake' : ''}${giant ? ' giant' : ''}`}
      data-testid="pb-screen"
      data-actor={actor ?? ''}
      data-outcome={state.outcome}
      data-round={state.round}
      data-broken={broken ? 'yes' : 'no'}
      data-scale={giant ? 'GIANT' : 'NORMAL'}
      style={{
        ['--pb-diamond' as string]: `url(${BATTLE_UI_FRAMES.commandDiamond})`,
        ['--ui-memory' as string]: `url(${BATTLE_UI_FRAMES.memoryPanel})`,
        ['--ui-memory-star' as string]: `url(${BATTLE_UI_FRAMES.memoryStar})`,
      }}
    >
      {bg && <img className="pb-bg" src={bg} alt="" aria-hidden="true" data-shake-layer="backdrop" />}

      {/* THE FIELD — the creature left, the party right (a triangle). */}
      <div className="pb-field" data-shake-layer="field">
        {state.enemies.map((e, i) => {
          const spot = foeSpots[i];
          const eBroken = isBroken(e);
          const struck = !!last?.broke && last.target === e.id;
          const isFocus = many && e.id === focused.id && !e.down;
          return (
            <div
              key={e.id}
              className={`pb-foe${actor === e.id ? ' acting' : ''}${eBroken ? ' broken' : ''}${struck && shaking ? ' shake' : ''}${e.down ? ' down' : ''}${isFocus ? ' focus' : ''}${menu === 'ENEMY' && !e.down ? ' aimable' : ''}`}
              data-testid={many ? `pb-foe-${e.id}` : 'pb-foe'}
              data-enemy={e.id}
              data-hp={e.hp}
              data-down={e.down ? 'yes' : 'no'}
              data-broken={eBroken ? 'yes' : 'no'}
              data-focus={isFocus ? 'yes' : 'no'}
              style={spot.style}
              onClick={() => {
                if (e.down) return;
                setFocus(e.id);
                if (menu === 'ENEMY') chooseEnemy(e.id);
              }}
            >
              {art.foes[e.id]?.src && <img src={art.foes[e.id].src!} alt={e.name} data-testid="pb-enemy-art" />}
              {flash(e.id, fx)}
              {flash(e.id, counter)}
              {specials(e.id, true)}
              {isFocus && (
                <span className="pb-foe-mark" aria-hidden="true">
                  ▼
                </span>
              )}
              {many && !e.down && (
                <span className="pb-foe-mini" data-testid="pb-foe-mini">
                  <i>{e.name}</i>
                  <Bar value={e.hp} max={e.maxHp} kind="hp" />
                  <span className={`pb-foe-mini-break${eBroken ? ' broken' : ''}`} style={{ width: `${eBroken ? 100 : (e.breakCurrent / e.breakMax) * 100}%` }} />
                </span>
              )}
              {eBroken && !e.down && (
                <span className="pb-foe-broken" data-testid="pb-enemy-broken">
                  BREAK中
                </span>
              )}
              {last && last.target === e.id && last.amount > 0 && (
                <span key={lastKey} className={`pb-float${tierOf(fx)}`} data-testid="pb-float" data-tier={fx?.number ?? 'plain'} style={impactStyle(fx)}>
                  {last.amount}
                </span>
              )}
              {last?.counter !== undefined && last.actor === e.id && (
                <span key={`c${lastKey}`} className="pb-float counter" data-testid="pb-float-counter" style={impactStyle(counter)}>
                  <small>反撃</small>
                  {last.counter}
                </span>
              )}
            </div>
          );
        })}
        {state.members.map((m) => {
          const spot = places[m.id];
          if (!spot) return null;
          return (
            <div
              key={m.id}
              className={`pb-figure${m.down ? ' down' : ''}${actor === m.id ? ' acting' : ''}${m.guardTurns > 0 ? ' guard' : ''}${m.regenTurns > 0 ? ' regen' : ''}`}
              data-testid={`pb-figure-${m.id}`}
              data-slot={spot.slot}
              style={footStyle(spot, FOOT_AT[m.id] ?? 0.5, FIGURE_SCALE[m.id] ?? 1)}
            >
              <span className="pb-shadow" aria-hidden="true" />
              {art.party[m.id]?.src && <img src={art.party[m.id].src!} alt={m.name} />}
              {/* 月影の構え held: a faint red-black arc at his feet, barely breathing (specialFx.css). */}
              {m.guardTurns > 0 && !m.down && <i className="sx-stance" data-testid={`pb-stance-${m.id}`} aria-hidden="true" />}
              {specials(m.id, false, art.party[m.id]?.src)}
              {/* A spell's circle at the caster's feet. */}
              {fx?.cast?.on === m.id && <span key={`s${lastKey}`} className={`pb-cast ${fx.cast.colour}`} data-testid="pb-cast" aria-hidden="true" />}
              {flash(m.id, fx)}
              {last && last.target === m.id && last.amount > 0 && (
                <span
                  key={lastKey}
                  className={`pb-float${last.kind === 'MEND' ? ' heal' : tierOf(fx)}`}
                  data-testid="pb-float"
                  data-tier={last.kind === 'MEND' ? 'heal' : (fx?.number ?? 'plain')}
                  style={impactStyle(fx)}
                >
                  {last.kind === 'MEND' ? `+${last.amount}` : last.amount}
                </span>
              )}
              {last?.missed && last.target === m.id && (
                <span key={`m${lastKey}`} className="pb-float miss" data-testid="pb-float-miss">
                  MISS
                </span>
              )}
              {last?.counter !== undefined && last.target === m.id && (
                <span key={`k${lastKey}`} className="pb-float tag">
                  COUNTER
                </span>
              )}
              {last?.regen && last.regen.target === m.id && last.regen.amount > 0 && (
                <span key={`r${lastKey}`} className="pb-float heal low" data-testid={`pb-float-regen-${m.id}`}>
                  +{last.regen.amount} HP
                </span>
              )}
            </div>
          );
        })}
        {/* An empty place in the cross: a mark on the ground, where the next one will stand. */}
        {CROSS_SLOTS.filter((slot) => !Object.values(places).some((p) => p.slot === slot)).map((slot) => (
          <span
            key={slot}
            className="pb-slot-mark"
            data-testid={`pb-slot-empty-${slot}`}
            aria-hidden="true"
            style={{ left: `${stage.cross[slot].x * 100}%`, bottom: `${stage.cross[slot].bottom * 100}%`, ['--pb-h' as string]: String(stage.cross[slot].height) }}
          />
        ))}
        {flashName && (
          <span key={`n${lastKey}`} className="pb-tech-name" data-testid="pb-tech-name">
            {flashName}
          </span>
        )}
        {last?.broke && breakShown === lastKey && (
          <span key={`b${lastKey}`} className="pb-break-flash" data-testid="pb-break-flash" aria-hidden="true">
            {/* The crystal plate behind the word cracks in two, its pieces flying (the sheet's own crystal). */}
            <span className="pb-break-plate half-a" />
            <span className="pb-break-plate half-b" />
            {BREAK_SHARDS.map((k, i) => (
              <i
                key={i}
                className={`pb-shard${k.spark ? ' spark' : ''}`}
                style={{ ['--dx' as string]: `${k.dx}px`, ['--dy' as string]: `${k.dy}px`, ['--rot' as string]: `${k.rot}deg` }}
              />
            ))}
            <b className="pb-break-word">BREAK!!</b>
          </span>
        )}
      </div>

      {/* TOP LEFT — the creature: name, HP, BREAK, together. */}
      <div className="pb-enemy-plate" data-testid="pb-enemy-plate" data-focus={focused.id} data-boss={focused.boss ? 'yes' : undefined}>
        <span className="pb-enemy-name">{focused.name}</span>
        <span className="pb-num" data-testid="pb-enemy-hp" data-hp={focused.hp}>
          {focused.hp}/{focused.maxHp}
        </span>
        <Bar value={focused.hp} max={focused.maxHp} kind="hp" />
        <span className={`pb-break-label${broken ? ' on' : ''}`}>BREAK</span>
        <div
          className={`pb-break-gauge${broken ? ' broken' : ''}`}
          data-testid="pb-break-gauge"
          data-current={focused.breakCurrent}
          data-max={focused.breakMax}
          aria-label={`BREAK ${focused.breakCurrent}/${focused.breakMax}`}
          style={{ ['--pb-segs' as string]: focused.breakMax }}
        >
          <div className="pb-break-fill" style={{ width: `${broken ? 100 : (focused.breakCurrent / focused.breakMax) * 100}%` }} />
        </div>
        {broken && (
          <span className="pb-break-badge" data-testid="pb-break-badge" data-turns={focused.breakTurns}>
            防御DOWN 残り{focused.breakTurns}T
          </span>
        )}
      </div>

      {/* TOP CENTRE — the order of turns, and the last line said under it. */}
      <div className="pb-top">
        <div className="pb-order" data-testid="pb-turn-order" aria-label="TURN ORDER">
          <span className="pb-order-label">TURN</span>
          {order.map((id, i) => (
            <Face key={`${state.round}-${state.at}-${i}`} src={faceOf(id).src} box={faceOf(id).face} testId={`pb-turn-slot-${i}`} actor={id} acting={i === 0} tag={tagOf(id)} />
          ))}
        </div>
        {place && (
          <div className="pb-place" data-testid="pb-place">
            <b>{place.mark}</b>
            <i>{place.name}</i>
          </div>
        )}
        <p className="pb-log" data-testid="pb-log" role="status">
          {state.log[state.log.length - 1]}
        </p>
      </div>

      {/* BOTTOM RIGHT — the command cross; a list opens beside it. */}
      {state.outcome !== 'ONGOING' ? (
        <div className="pb-result" data-testid="pb-result" data-outcome={state.outcome}>
          <b>{state.outcome === 'VICTORY' ? '勝利！' : '敗北……'}</b>
          <button
            className="pb-list-btn primary"
            data-testid="pb-result-next"
            onClick={() => {
              if (ended.current) return;
              ended.current = true;
              onEnd({ outcome: state.outcome as 'VICTORY' | 'DEFEAT', members: state.members });
            }}
          >
            つぎへ
          </button>
        </div>
      ) : (
        <div className="pb-commands" data-testid="pb-commands" data-locked={playerInput ? 'no' : 'yes'}>
          <div className="pb-cross">
            <span className="pb-cross-hub" data-testid="pb-acting-hub">
              {actingFace && <Face src={actingFace.src} box={actingFace.face} testId="pb-acting-face" actor={acting!.id} acting />}
            </span>
            {acting && (
              <b className="pb-who" data-testid="pb-acting">
                {acting.name}
              </b>
            )}
            <button className="pb-dia left" data-testid="pb-cmd-skills" disabled={!playerInput || skills.length + techs.length === 0} onClick={() => toggle('SKILL')} aria-pressed={menu === 'SKILL'}>
              <span className="pb-dia-plate" aria-hidden="true" />
              <SparkIcon size={13} className="pb-dia-mark" />
              <span className="pb-dia-jp">スキル</span>
            </button>
            <button className="pb-dia up" data-testid="pb-cmd-attack" disabled={!playerInput} onClick={() => aimEnemy((target) => ({ kind: 'ATTACK', target }), 'COMMANDS')}>
              <span className="pb-dia-plate" aria-hidden="true" />
              <SwordIcon size={13} className="pb-dia-mark" />
              <span className="pb-dia-jp">攻撃</span>
            </button>
            <button className="pb-dia right" data-testid="pb-cmd-magic" disabled={!playerInput || spells.length === 0} onClick={() => toggle('MAGIC')} aria-pressed={menu === 'MAGIC'}>
              <span className="pb-dia-plate" aria-hidden="true" />
              <SparkIcon size={13} className="pb-dia-mark" />
              <span className="pb-dia-jp">魔法</span>
            </button>
            <button className="pb-dia down" data-testid="pb-cmd-defend" disabled={!playerInput} onClick={() => act({ kind: 'DEFEND' })}>
              <span className="pb-dia-plate" aria-hidden="true" />
              <CageIcon size={13} className="pb-dia-mark" />
              <span className="pb-dia-jp">防御</span>
            </button>
          </div>
          {playerInput && menu !== 'COMMANDS' && (
            <div className="pb-list" data-testid="pb-list">
              {menu === 'SKILL' && (
                <>
                  {skills.map((sk) => (
                    <button key={sk.id} className="pb-list-btn" data-testid={`pb-cmd-skill-${sk.id}`} disabled={!partySkillReady(acting!, sk)} onClick={() => aimEnemy((target) => ({ kind: 'SKILL', skillId: sk.id, target }), 'SKILL')}>
                      {sk.name}
                      <Wait left={cooldownLeft(acting!, sk.id, sk.cooldown)} />
                    </button>
                  ))}
                  {techs.map((t) => (
                    <button key={t.id} className="pb-list-btn tech" data-testid={`pb-cmd-tech-${t.id}`} disabled={!techUsable(acting!, t)} onClick={() => pickTech(t)}>
                      {t.name}
                      {t.mpCost > 0 && <small>MP{t.mpCost}</small>}
                      <Wait left={cooldownLeft(acting!, t.id, t.cooldown ?? 0)} />
                    </button>
                  ))}
                </>
              )}
              {menu === 'MAGIC' &&
                spells.map((sp) => (
                  <button key={sp.id} className="pb-list-btn" data-testid={`pb-magic-${sp.id}`} disabled={!canCast.includes(sp)} onClick={() => pickSpell(sp)}>
                    {sp.name}
                    <small>MP{sp.mpCost}</small>
                  </button>
                ))}
              {menu === 'TARGET' && aiming && (
                <>
                  <span className="pb-ask">誰に？</span>
                  {state.members
                    .filter((m) => !m.down)
                    .map((m) => {
                      // 星癒の羽 is not laid on one who has it.
                      const laid = 'tech' in aiming && aiming.tech.kind === 'REGEN' && !regenTargetable(m);
                      return (
                        <button key={m.id} className="pb-list-btn" data-testid={`pb-target-${m.id}`} disabled={laid} onClick={() => aimAt(m.id)}>
                          {m.name}
                          {laid && <small className="wait">星癒中</small>}
                        </button>
                      );
                    })}
                </>
              )}
              {menu === 'ENEMY' && pending && (
                <>
                  <span className="pb-ask">どれを？</span>
                  {standingEnemies(state).map((e) => (
                    <button
                      key={e.id}
                      className={`pb-list-btn${e.id === focused.id ? ' focus' : ''}`}
                      data-testid={`pb-target-enemy-${e.id}`}
                      onClick={() => chooseEnemy(e.id)}
                      onPointerEnter={() => setFocus(e.id)}
                    >
                      {e.name}
                      <small className="hp">
                        {e.hp}/{e.maxHp}
                      </small>
                    </button>
                  ))}
                </>
              )}
              <button
                className="pb-list-btn back"
                data-testid="pb-cmd-back"
                onClick={() => {
                  if (menu === 'ENEMY') {
                    setMenu(pending?.from ?? 'COMMANDS');
                    setPending(null);
                    return;
                  }
                  setMenu(menu === 'TARGET' ? (aiming && 'spell' in aiming ? 'MAGIC' : 'SKILL') : 'COMMANDS');
                }}
              >
                もどる
              </button>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM LEFT — WORLD MEMORY, the same panel as every fight's. */}
      <div className="pb-memory bp-hud">
        <WorldMemoryPanel rows={memoryRows(memory?.lines ?? [])} depth={memory?.depth ?? 0} compact />
      </div>

      {/* BOTTOM LEFT, beside it — AUTO and ×2. */}
      {state.outcome === 'ONGOING' && (
        <div className="pb-chips">
          {autoAvailable && (
            <button className={`pb-chip${auto ? ' on' : ''}`} data-testid="pb-auto" aria-pressed={auto} onClick={() => setAuto((a) => !a)}>
              AUTO
            </button>
          )}
          <button className={`pb-chip${fast ? ' on' : ''}`} data-testid="pb-speed" aria-pressed={fast} onClick={() => setFast((f) => !f)}>
            ×2
          </button>
          {/* ESCAPE from an ordinary fight; a boss's is not fled. */}
          {bossFight ? (
            <button className="pb-chip no" data-testid="pb-escape" data-escape="no" disabled>
              逃走不可
            </button>
          ) : (
            <button
              className="pb-chip"
              data-testid="pb-escape"
              data-escape="yes"
              disabled={!playerInput}
              onClick={() => {
                if (ended.current) return;
                ended.current = true;
                playSfx('battle_escape');
                onEnd({ outcome: 'ESCAPE', members: state.members });
              }}
            >
              ESCAPE
            </button>
          )}
        </div>
      )}

      {/* TOP RIGHT — the party, one card each, down the edge. */}
      <div className="pb-members" data-testid="pb-members" data-size={state.members.length}>
        {state.members.map((m) => {
          const face = faceOf(m.id);
          const chips = statusChips(m);
          return (
            <div
              key={m.id}
              className={`pb-member${actor === m.id ? ' acting' : ''}${m.down ? ' down' : ''}${menu === 'TARGET' && !m.down ? ' aimable' : ''}`}
              data-testid={`pb-member-${m.id}`}
              data-actor={m.id}
              data-hp={m.hp}
              data-max={m.maxHp}
              data-down={m.down ? 'yes' : 'no'}
              data-acting={actor === m.id ? 'yes' : 'no'}
              data-taunt={tauntOf(m) > 0 ? 'yes' : 'no'}
            >
              <Face src={face.src} box={face.face} testId={`pb-member-${m.id}-face`} actor={m.id} acting={false} />
              <span className="pb-member-body">
                <span className="pb-member-name">{m.name}</span>
                {m.down ? (
                  <span className="pb-down" data-testid={`pb-member-${m.id}-down`}>
                    戦闘不能
                  </span>
                ) : (
                  <span className="pb-num">
                    <small>HP</small> {m.hp}/{m.maxHp}
                  </span>
                )}
                <Bar value={m.hp} max={m.maxHp} kind="hp" />
                {m.maxMp > 0 && (
                  <>
                    <span className="pb-num mp" data-testid={`pb-member-${m.id}-mp`} data-mp={m.mp}>
                      MP {m.mp}/{m.maxMp}
                    </span>
                    <Bar value={m.mp} max={m.maxMp} kind="mp" />
                  </>
                )}
                {chips.length > 0 && (
                  <span className="pb-status" data-testid={`pb-status-${m.id}`}>
                    {chips.map((c) => (
                      <span key={c.key} className={`pb-status-chip ${c.key}`} data-testid={`pb-status-${m.id}-${c.key}`} title={c.title}>
                        {c.label}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
