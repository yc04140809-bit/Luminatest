import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
  type PartyCombo,
  NO_COMBO,
  comboMultiplier,
  COMBO_STEP,
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
import { useCutInDirector } from './cutin/CutIn';
import { spellCutIn } from './magic/spellCutIn';
import { skillCutIn } from './cutin/skillCutIn';
import { shatter } from './shatter';
import { SPECIAL_FX_ART } from '../fx/special/specialFxArt';
import { NewBadge } from '../common/NewBadge';
import { splitDamage } from './multiHit';
import { higanbanaBloom, type BloomSpot, type Petal } from './higanbanaBloom';
import './battle.generated.css';
import './battle.layers.css';
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
  /** Skills new to them (NEW on the button until used — 《彼岸花》 learned in this fight); told when one is used. */
  newSkills?: readonly string[];
  onSkillUsed?: (id: string) => void;
  /** Said once as the fight opens (「《彼岸花》 解禁」), the first time it is learned. */
  unlocked?: string;
}

const ENEMY_TURN_MS = 700;
const AUTO_TURN_MS = 450;
/** A breath more after a BREAK, for 「BREAK!!」 to be seen. */
const BREAK_PAUSE_MS = 700;
const SHAKE_MS = 450;
/** COMBO is shown from this many (one blow is not a combo). */
const COMBO_SHOWN_FROM = 2;
/** 「《彼岸花》 解禁」 stays this long as the fight opens. */
const UNLOCKED_MS = 2600;

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

/** A giant's HP, upright (its plate down the left edge): the fill and its red trail rise from the bottom. */
function VBar({ value, max }: { value: number; max: number }) {
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="pb-bar hp upright" aria-hidden="true">
      <div className="pb-bar-trail" style={{ height: `${share * 100}%` }} />
      <div className="pb-bar-fill" style={{ height: `${share * 100}%` }} />
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

/**
 * Where each cut's number of a move of several stands: low left, then right, the last above them — so
 * the three never sit in a row and read as one number (2 5 2 read 「252」).
 */
const CUT_NUDGE: readonly CSSProperties[] = [
  { translate: '-56px 34px' },
  { translate: '44px 4px' },
  { translate: '0 -34px' },
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

/**
 * HE STEPS IN (作者 2026-10-24 §23 — a long sword): his drawing to just short of the one struck — the
 * front of a giant, never into it; beside an ordinary one, not over it — the blow, and home. On
 * `transform` (the field's shake keeps `translate`); held still by a hit-stop like everything drawn.
 * A deep one (《瞬断》, 《彼岸花》) leaves a red trail behind him while he moves.
 */
function lungeOf(root: HTMLElement, target: string, lunge: NonNullable<BeatFx['lunge']>, speed: number, giant: boolean) {
  const fig = root.querySelector<HTMLElement>('[data-testid="pb-figure-hero"]');
  const img = fig?.querySelector<HTMLElement>(':scope > img');
  const foe = root.querySelector<HTMLElement>(`[data-enemy="${target}"]`);
  if (!fig || !img || !foe || typeof img.animate !== 'function' || !shakeAllowed()) return;
  const h = img.getBoundingClientRect();
  const f = (foe.querySelector<HTMLElement>(':scope > img') ?? foe).getBoundingClientRect();
  if (h.width === 0 || f.width === 0) return;
  const stopX = giant ? f.left + f.width * 0.7 : f.right - f.width * 0.15;
  const dx = Math.round(Math.min(0, stopX - h.left));
  const dy = Math.round(Math.max(-h.height * 0.15, Math.min(h.height * 0.15, (f.bottom - h.bottom) * 0.35)));
  const total = lunge.back + lunge.home;
  const there = `translate(${dx}px, ${dy}px)`;
  const at = (ms: number) => Math.max(0, Math.min(1, ms / total));
  // 《彼岸花》: still, then back and fading out, unseen, there; the last blow stepped into — further, but
  // never past the giant's front nor the middle of an ordinary one (never into its drawing).
  const deeper = lunge.stepAt === undefined ? dx : Math.round(Math.min(0, Math.max(dx - h.width * 0.18, (giant ? f.left + f.width * 0.64 : f.left + f.width * 0.5) - h.left)));
  const step = `translate(${deeper}px, ${dy}px)`;
  const keys: Keyframe[] = lunge.vanish
    ? [
        { transform: 'translate(0, 0)', opacity: 1 },
        { transform: 'translate(0, 0)', opacity: 1, offset: at(lunge.vanish.poise), easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
        { transform: `translate(${Math.round(h.width * 0.35)}px, 0)`, opacity: 0, offset: at(lunge.vanish.fade) },
        { transform: there, opacity: 0, offset: at(lunge.out - 50) },
        { transform: there, opacity: 1, offset: at(lunge.out) },
        { transform: there, opacity: 1, offset: at(lunge.stepAt ?? lunge.back), easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' },
        { transform: step, opacity: 1, offset: at((lunge.stepAt ?? lunge.back) + 70) },
        { transform: step, opacity: 1, offset: at(lunge.back), easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
        { transform: 'translate(0, 0)', opacity: 1 },
      ]
    : [
        { transform: 'translate(0, 0)', easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' },
        { transform: there, offset: lunge.out / total },
        { transform: there, offset: lunge.back / total, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
        { transform: 'translate(0, 0)' },
      ];
  const anim = img.animate(keys, { duration: Math.round(total * speed), fill: 'none' });
  // Gone, his shadow goes with him.
  const shadow = fig.querySelector<HTMLElement>(':scope > .pb-shadow');
  if (lunge.vanish && shadow) {
    shadow.animate(
      [{ opacity: 1 }, { opacity: 1, offset: at(lunge.vanish.poise) }, { opacity: 0, offset: at(lunge.vanish.fade) }, { opacity: 0, offset: at(lunge.back) }, { opacity: 1 }],
      { duration: Math.round(total * speed), fill: 'none' },
    );
  }
  if (lunge.vanish) fig.dataset.vanish = 'yes';
  // 《彼岸花》's trace in the hush (仕上げ §2): a thin red line where he ran — from where he stood to the
  // creature's front, at his chest — and his blade's glint there; a flash, then gone (and taken away).
  if (lunge.trace) {
    const box = fig.getBoundingClientRect();
    const chest = h.top + h.height * 0.36 - box.top;
    const from = h.left + h.width * 0.5 - box.left;
    const to = stopX - box.left;
    const timing = { delay: Math.round(lunge.trace.at * speed), duration: Math.round(lunge.trace.ms * speed), fill: 'both' as const };
    const line = document.createElement('i');
    line.className = 'pb-trace';
    line.setAttribute('data-testid', 'pb-trace');
    Object.assign(line.style, { left: `${Math.round(to)}px`, top: `${Math.round(chest)}px`, width: `${Math.max(0, Math.round(from - to))}px` });
    const glint = document.createElement('i');
    glint.className = 'pb-glint';
    glint.setAttribute('data-testid', 'pb-glint');
    Object.assign(glint.style, { left: `${Math.round(to)}px`, top: `${Math.round(chest)}px` });
    fig.append(line, glint);
    const gone = [
      line.animate(
        [
          { transform: 'scaleX(0)', opacity: 0, transformOrigin: '100% 50%' },
          { transform: 'scaleX(1)', opacity: 1, transformOrigin: '100% 50%', offset: 0.35 },
          { transform: 'scaleX(1)', opacity: 0, transformOrigin: '100% 50%' },
        ],
        timing,
      ),
      glint.animate(
        [
          { transform: 'translate(-50%, -50%) rotate(-28deg) scale(0.2, 1)', opacity: 0 },
          { transform: 'translate(-50%, -50%) rotate(-28deg) scale(1.2, 1)', opacity: 1, offset: 0.45 },
          { transform: 'translate(-50%, -50%) rotate(-28deg) scale(1.5, 0.6)', opacity: 0 },
        ],
        timing,
      ),
    ];
    for (const [i, a] of gone.entries()) {
      const el = i === 0 ? line : glint;
      a.finished.then(() => el.remove(), () => el.remove());
    }
  }
  fig.dataset.lunge = lunge.deep ? 'deep' : 'yes';
  const done = () => {
    if (fig.dataset.lunge) delete fig.dataset.lunge;
    if (fig.dataset.vanish) delete fig.dataset.vanish;
  };
  anim.finished.then(done, done);
}

/** A skill's wait, in the list: 「あとNT」 while it cools down; nothing when it is ready. */
function Wait({ left }: { left: number }) {
  return left > 0 ? (
    <small className="wait" data-testid="pb-wait" data-left={left}>
      あと{left}T
    </small>
  ) : null;
}

export function PartyBattleScreen({ members, enemy, enemyArtId, background = null, autoAvailable = true, onEnd, rng, memory, place, formation, newSkills, onSkillUsed, unlocked }: PartyBattleProps) {
  const dice = rng ?? Math.random;
  const [state, setState] = useState<PartyBattleState>(() => createPartyBattle(members, enemy));
  // His finisher's lily, ready before it is wanted (a first decode mid-move is a dropped frame).
  useEffect(() => {
    if (!members.some((m) => m.skills?.some((k) => k.finisher))) return;
    const lily = new Image();
    lily.src = SPECIAL_FX_ART.heroHiganbana;
    lily.decode?.().catch(() => undefined);
  }, [members]);
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
  /** Where the one broken stands across the screen (0–1): the glass breaks from there. */
  const [breakAt, setBreakAt] = useState(0.3);
  /** COMBO as shown (it climbs at each blow as it lands), and as it stands after the last beat. */
  const [combo, setCombo] = useState<PartyCombo>(NO_COMBO);
  const comboNow = useRef<PartyCombo>(NO_COMBO);
  /** 《彼岸花》's lily: the beat, where it opens (% of the screen), from when and for how long (ms, on screen). */
  /** 《彼岸花》: under whom the ground splits (the one aimed at first), when (screen ms), and the dark. */
  const [bloom, setBloom] = useState<{ key: number; spots: BloomSpot[]; crackAt: number; at: number; ms: number } | null>(null);
  /** Skills still NEW (not yet used in this fight). */
  const [fresh, setFresh] = useState<readonly string[]>(newSkills ?? []);
  const [saying, setSaying] = useState(!!unlocked);
  /**
   * The beat whose blow has landed: its number shows from then (作者 実機 2026-10-24: a CSS delay drifted
   * from the blow, and the hold paused it — the number came after 「BREAK!!」, under the glass).
   */
  const [landed, setLanded] = useState(-1);
  /** How many of the beat's blows have landed (a move of several cuts shows a number at each). */
  const [cutsIn, setCutsIn] = useState<{ key: number; n: number }>({ key: -1, n: 0 });
  const [bg, setBg] = useState<string | null>(null);
  const ended = useRef(false);
  /** The screen, so a shake or the camera moves this fight's field and painting (ui/fx) and nothing else. */
  const root = useRef<HTMLDivElement>(null);
  const actor = currentActor(state);
  const acting = actor && !isEnemyId(actor) ? memberById(state, actor) : undefined;

  useEffect(() => {
    if (!saying) return;
    const t = window.setTimeout(() => setSaying(false), UNLOCKED_MS);
    return () => window.clearTimeout(t);
  }, [saying]);

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

  // HER SPELLS' CUT-INS (TIGS 2026-10-23: they played in the ordinary fight and not in this one —
  // the three-person fight never had the cut-in layer). The same table and the same part as the
  // ordinary fight (magic/spellCutIn.ts, cutin/CutIn.tsx): a spell listed there shows it first,
  // then the blow; a spell not listed, an attack go straight on as before. Their skills the same way
  // (cutin/skillCutIn.ts).
  const cutIns = useCutInDirector(fast ? 2 : 1);
  const act = (action: PartyAction) => {
    if (cutIns.playing) return;
    const next = partyAct(state, action, dice);
    if (next === state) return;
    // A skill new to them, used: NEW is gone, and the game is told (it is not new again).
    if (action.kind === 'SKILL' && fresh.includes(action.skillId)) {
      setFresh((f) => f.filter((id) => id !== action.skillId));
      onSkillUsed?.(action.skillId);
    }
    const spell = action.kind === 'MAGIC' ? acting?.magic?.find((m) => m.id === action.magicId) : undefined;
    // Their skills too (作者 実機 2026-10-23): 《瞬断》, 重撃・豪断 — cutin/skillCutIn.ts.
    const skill =
      action.kind === 'SKILL'
        ? acting?.skills?.find((k) => k.id === action.skillId)
        : action.kind === 'TECH'
          ? acting?.techniques?.find((t) => t.id === action.techId)
          : undefined;
    const cut = spell ? spellCutIn(spell) : skillCutIn(skill);
    if (cut) {
      setMenu('COMMANDS');
      setAiming(null);
      setPending(null);
      void cutIns.play(cut).then(() => land(next, action));
      return;
    }
    land(next, action);
  };
  /** The action's result on screen: its sound, its target in focus, and the state moved on. */
  const land = (next: PartyBattleState, action: PartyAction) => {
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
    if (!beat) return;
    // COMBO (the fight's own — partyBattle comboAfter): where it stands after this beat, whatever is drawn.
    const before = comboNow.current;
    const after = state.combo;
    comboNow.current = after;
    const at = root.current;
    if (!at) return;
    const speed = fast ? 0.5 : 1;
    const timers: number[] = [];
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(() => at.isConnected && f(), ms));
    const ctx = beatContext(beat, true);
    /** What the count does as a beat's blows land: one more at each blow before the last; at the last, as it stands. */
    type Count = { stage?: () => void; land: () => void };
    const play = (p: BeatFx, breaks: boolean, count?: Count) => {
      // A TRACK is timed to the blow, which waits only on the speed — never on a character's tempo.
      if (p.camera) void cameraSequence(p.camera, at, { tempo: p.camera[0]?.kind === 'TRACK' ? speed : p.tempo * speed });
      // A hold freezes what is drawn (the effects' CSS, the camera) but not the clock: a moment after
      // one comes that much later on screen, so it is waited for here too.
      const holds = shakeAllowed() ? (p.stages ?? []) : [];
      const when = (t: number) => (t + holds.filter((st) => st.at < t).reduce((n, st) => n + st.hitStop, 0)) * speed;
      // His step in, and home (§23).
      if (p.lunge && beat.actor === 'hero' && isEnemyId(beat.target)) lungeOf(at, beat.target, p.lunge, speed, giant);
      // 《彼岸花》: the ground splits under each one struck as the third cut lands; then the world dark, the
      // lilies opening out of the cracks — after the last cut's hold.
      if (p.bloom && isEnemyId(beat.target)) {
        const box = at.getBoundingClientRect();
        const spots = [beat.target, ...(p.also ?? [])].flatMap((id): BloomSpot[] => {
          const el = at.querySelector<HTMLElement>(`[data-enemy="${id}"] > img`) ?? at.querySelector<HTMLElement>(`[data-enemy="${id}"]`);
          const r = el?.getBoundingClientRect();
          if (!r || !box.width || !box.height) return [];
          // At its feet — a giant's are below the screen: the ground before it, clear of the HUD along the bottom.
          const x = ((r.left + r.width * (giant ? 0.62 : 0.5) - box.left) / box.width) * 100;
          const y = ((r.bottom - r.height * 0.04 - box.top) / box.height) * 100;
          return [
            {
              x: Math.round(giant ? Math.max(30, Math.min(55, x)) : x),
              y: Math.round(giant ? 70 : Math.min(76, y)),
              w: Math.round(Math.min(giant ? 46 : 24, (r.width / box.width) * 100)),
            },
          ];
        });
        // Drawn from the moment he is gone (nothing else moves then): a frame that draws it all is not
        // spent as he begins to move. Its times count from there.
        const from = Math.round(when(p.lunge?.vanish?.fade ?? 0));
        const bloom = {
          key: lastKey,
          spots: spots.length > 0 ? spots : [{ x: 30, y: 70, w: 20 }],
          crackAt: Math.round(when(p.crack?.at ?? p.impact)) - from,
          at: Math.round(when(p.bloom.at) + p.hitStop * speed) - from,
          ms: Math.round(p.bloom.ms * speed),
        };
        later(from, () => setBloom(bloom));
        // Over — the dark gone, the last petal down, SPEED DOWN said: all of it taken away.
        later(from + bloom.at + Math.round(bloom.ms * 0.55) + 1450, () => setBloom((b) => (b?.key === bloom.key ? null : b)));
      }
      // The characters' own effects: each one's sounds at its landing — once for a moment, however many it falls on.
      const heard = new Set<number>();
      for (const sp of p.special ?? []) {
        const spec = SPECIAL_FX[sp.type];
        const t = sp.at + spec.impact;
        if (!spec.sfx || heard.has(t)) continue;
        heard.add(t);
        later(when(t), () => spec.sfx!.forEach((id) => playSfx(id)));
      }
      // The blows before the last (重撃 before 豪断): each its own hold, then its jolt and reeling.
      for (const st of p.stages ?? []) {
        later(when(st.at), () => {
          count?.stage?.();
          void hitStop(st.hitStop * speed, at).then(() => {
            if (!at.isConnected) return;
            if (st.shake) void screenShake(st.shake, at);
            if (st.reel) reelOf(at, st.reel, isEnemyId(st.reel.on) ? -1 : 1, speed);
          });
        });
      }
      later(when(p.impact), () => {
        count?.land();
        for (const id of p.sfx) playSfx(id);
        void hitStop((breaks ? BREAK_HIT_STOP_MS : p.hitStop) * speed, at).then(() => {
          if (!at.isConnected) return;
          if (breaks) {
            playBreakSfx();
            void screenShake('medium', at);
            // Onto the one broken — unless a TRACK is already on it (which this would cut short).
            if (p.camera?.[0]?.kind !== 'TRACK') void cameraSequence(CAMERA_COMBOS.BREAK_FOCUS(ctx.targetAt), at, { tempo: speed });
            setBreakAt(ctx.targetAt);
            setBreakShown(lastKey);
            later(BREAK_REEL_MS * speed, () => setShaking(true));
            later((BREAK_REEL_MS + SHAKE_MS) * speed, () => setShaking(false));
            return;
          }
          if (p.after) void camera(p.after, at, p.tempo * speed);
          if (p.shake) void screenShake(p.shake, at);
          if (p.reel) reelOf(at, p.reel, isEnemyId(p.reel.on) ? -1 : 1, speed);
          // A move at all of them: the others reel too.
          for (const id of p.also ?? []) if (p.reel) reelOf(at, { ...p.reel, on: id }, -1, speed);
        });
      });
    };
    const climbs = after.hits > before.hits && !isEnemyId(beat.actor);
    const counted = beat.counter !== undefined;
    const key = lastKey;
    // How many strikes land at each cut: one, or — a move at all of them — one on each still standing.
    const wave = (i: number) => (beat.spread ? beat.spread.filter((x) => x.hits.length > i).length : 1);
    let waves = 0;
    play(beatFx(beat, ctx), !!beat.broke, {
      stage: () => {
        const n = wave(waves++);
        setCutsIn((c) => ({ key, n: (c.key === key ? c.n : 0) + 1 }));
        if (climbs) setCombo((c) => ({ ...c, hits: c.hits + n }));
      },
      land: () => {
        setLanded(key);
        setCutsIn({ key, n: Number.MAX_SAFE_INTEGER });
        // A step of COMBO's worth reached (10, 20, 30, 40): a small sound with its glow.
        if (climbs && Math.min(4, Math.floor(after.hits / COMBO_STEP)) > Math.min(4, Math.floor(before.hits / COMBO_STEP))) playSfx('battle_buff');
        if (climbs) setCombo(after);
        else if (after !== before) setCombo(counted ? NO_COMBO : after);
      },
    });
    if (counted) play(counterFx(beat, ctx), false, { land: () => setCombo(after) });
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
      // Played a cut-in first (the same tables `act` asks): its camera follows it (partyFx TRACK).
      cutIn: beat.kind === 'MAGIC' ? !!(spell && spellCutIn(spell)) : !!skillCutIn(tech ?? skill),
      speed: fast ? 0.5 : 1,
    };
  }
  // The beat's flashes, numbers and circle, as drawn (where they stand is only for the camera).
  const fx = last ? beatFx(last, beatContext(last, false)) : null;
  const counter = last && last.counter !== undefined ? counterFx(last, { giant }) : null;
  const fxSpeed = fast ? 0.5 : 1;
  /** When something of this beat shows: at its blow (a CSS delay, so nothing waits in JavaScript). */
  const impactStyle = (p: BeatFx | null) => ({ ['--pb-impact' as string]: `${Math.round((p?.impact ?? 0) * fxSpeed)}ms` });
  const flash = (on: string, p: BeatFx | null) =>
    p?.flash && (p.flash.on === on || p.also?.includes(on)) ? (
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
          <SpecialFx key={`sx${lastKey}-${n}-${i}`} type={sp.type} delay={sp.at * fxSpeed} k={fxSpeed} giant={foe && giant} flip={sp.flip} turn={sp.turn} scale={sp.scale} figure={figure} />
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
  /** A move with a cut-in, followed by the camera (partyFx TRACK): its number and its focus lines are the big ones. */
  const followed = fx?.camera?.[0]?.kind === 'TRACK';
  /** A creature broken and not yet down: the party's moment, and COMBO says so. */
  const chain = state.enemies.some((e) => isBroken(e) && !e.down);
  const glass = useMemo(() => shatter(Math.round(breakAt * 1000) / 10, 46), [breakAt]);
  /** COMBO's step of worth: 0 under 10, then 1–4 (10, 20, 30, 40+). */
  const comboTier = Math.min(4, Math.floor(combo.hits / COMBO_STEP));
  /** The beat's amount as its cuts show it: three for 《瞬断》 (multiHit.ts), else the one. */
  const parts = last && fx?.amounts ? [...fx.amounts] : last && fx?.split ? splitDamage(last.amount, fx.split) : [last?.amount ?? 0];
  /** A creature's numbers of this beat: the beat's own on the one aimed at; a move at all of them, each one's. */
  const partsOn = (id: string): number[] | null => {
    if (!last || last.amount <= 0) return null;
    const mine = last.spread?.find((x) => x.target === id);
    if (mine) return mine.hits.length > 0 ? [...mine.hits] : null;
    return last.target === id ? parts : null;
  };
  /** How many cuts the beat has at most (the last of them shows when the blow has landed). */
  const cutCount = last?.spread ? Math.max(1, ...last.spread.map((x) => x.hits.length)) : parts.length;
  const slowedOn = (id: string) => !!last && (last.spread ? !!last.spread.find((x) => x.target === id)?.slowed : !!last.slowed && last.target === id);
  const bloomArt = useMemo(() => (bloom ? higanbanaBloom(bloom.spots) : null), [bloom]);
  /** 《彼岸花》's petals of one layer, each the one picture at its own size, way, turn and time. */
  const petalsOf = (layer: Petal['layer']) =>
    bloomArt?.petals
      .filter((pt) => pt.layer === layer)
      .map((pt, i) => (
        <img
          key={`${layer}${i}`}
          className={`pb-petal ${layer}`}
          data-testid="pb-petal"
          data-layer={layer}
          src={SPECIAL_FX_ART.heroPetal}
          alt=""
          style={{
            left: `${pt.x}%`,
            top: `${pt.y}%`,
            ['--psz' as string]: `${pt.size}px`,
            ['--px' as string]: `${pt.dx}vw`,
            ['--py' as string]: `${pt.dy}vh`,
            ['--pr0' as string]: `${pt.rot0}deg`,
            ['--pr' as string]: `${pt.rot}deg`,
            ['--pa' as string]: pt.alpha,
            ['--pd' as string]: pt.delay,
            ['--pdur' as string]: pt.dur,
          }}
        />
      ));
  // A technique's or skill's name, flashed as it is used.
  const flashName = last && (last.kind === 'TECH' || last.kind === 'SKILL') ? last.name : undefined;
  const playerInput = !!acting && !auto && state.outcome === 'ONGOING' && !cutIns.playing;
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
              {/* A move of several cuts (《瞬断》): a number at each, adding up to the one amount (multiHit.ts);
                  the earlier ones a little aside, the last — the one amount's own testid — the biggest. */}
              {cutsIn.key === lastKey &&
                partsOn(e.id)?.map((amount, i, mine) => {
                  const final = i === mine.length - 1;
                  // The last cut of the move shows as the blow lands; one that fell earlier, at its own cut.
                  if (amount <= 0 || i >= cutsIn.n || (i === cutCount - 1 && landed !== lastKey)) return null;
                  return (
                    <span
                      key={`${lastKey}-${i}`}
                      className={`pb-float${tierOf(fx)}${final && followed ? ' finisher' : ''}${final ? (fx?.amounts ? ' stay' : '') : fx?.amounts ? ' cut flow' : ' cut'}`}
                      data-testid={final ? 'pb-float' : 'pb-float-cut'}
                      data-tier={fx?.number ?? 'plain'}
                      data-cut={mine.length > 1 ? i + 1 : undefined}
                      style={mine.length > 1 ? CUT_NUDGE[i % CUT_NUDGE.length] : undefined}
                    >
                      {amount}
                    </span>
                  );
                })}
              {/* SLOWED (《彼岸花》): said on each as the lilies fade. */}
              {slowedOn(e.id) && bloom?.key === lastKey && (
                <span
                  key={`sl${lastKey}`}
                  className="pb-float slow"
                  data-testid="pb-float-slow"
                  // Several slowed, close together: each a step higher than the one before, never on top of another.
                  style={{ animationDelay: `${Math.round(bloom.at + bloom.ms * 0.55)}ms`, translate: many ? `0 ${-18 * (i % 3)}px` : undefined }}
                >
                  SPEED DOWN
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
              {last && last.target === m.id && last.amount > 0 && landed === lastKey && (
                <span
                  key={lastKey}
                  className={`pb-float${last.kind === 'MEND' ? ' heal' : tierOf(fx)}`}
                  data-testid="pb-float"
                  data-tier={last.kind === 'MEND' ? 'heal' : (fx?.number ?? 'plain')}
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
      </div>

      {/* A MOVE WITH A CUT-IN (作者 実機 2026-10-24: 「カメラワークが‼️って感じではない」): as the camera
          gets there and the blow lands, speed lines rush in on the one struck. */}
      {followed && (
        <span
          key={`fl${lastKey}`}
          className="pb-focus-lines"
          data-testid="pb-focus-lines"
          aria-hidden="true"
          style={{ ['--pb-lines-at' as string]: `${Math.max(0, Math.round(((fx?.impact ?? 0) - 170) * fxSpeed))}ms` }}
        />
      )}

      {/* BREAK — over the whole screen, not moved by the camera (作者 実機 2026-10-24: もっと目立たせて;
          画面全体をガラスを割ったみたいに): a white flash, the glass cracking out from the one broken
          and flying apart (shatter.ts), and 「BREAK!!」 on its crystal plate over it all. */}
      {last?.broke && breakShown === lastKey && (
        <span key={`g${lastKey}`} className="pb-shatter" data-testid="pb-shatter" aria-hidden="true">
          <span className="pb-shatter-flash" />
          <svg className="pb-shatter-cracks" viewBox="0 0 100 100" preserveAspectRatio="none">
            {glass.cracks.map((c, i) => (
              <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {glass.shards.map((k, i) => (
            <i
              key={i}
              className="pb-glass"
              style={{
                left: `${k.box.x}%`,
                top: `${k.box.y}%`,
                width: `${k.box.w}%`,
                height: `${k.box.h}%`,
                clipPath: `polygon(${k.local})`,
                transformOrigin: `${k.ox}% ${k.oy}%`,
                ['--dx' as string]: `${k.tx}%`,
                ['--dy' as string]: `${k.ty}%`,
                ['--rot' as string]: `${k.rot}deg`,
                ['--d' as string]: `${k.delay}ms`,
              }}
            />
          ))}
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

      {/* COMBO (combo.ts — 作者 実機 2026-10-24): the party's blows in a row; through a BREAK it climbs on. */}
      {combo.hits >= COMBO_SHOWN_FROM && (
        <div
          className={`pb-combo${chain ? ' chain' : ''} tier-${comboTier}`}
          data-testid="pb-combo"
          data-hits={combo.hits}
          data-chain={chain ? 'yes' : 'no'}
          data-tier={comboTier}
        >
          <b key={combo.hits} className="pb-combo-n">
            {combo.hits}
          </b>
          <span className="pb-combo-word">COMBO</span>
          <small className="pb-combo-dmg" data-testid="pb-combo-damage">
            {combo.damage.toLocaleString('ja-JP')} DMG
          </small>
          {/* From 10, COMBO is worth more (partyBattle comboMultiplier): what it adds, and a glow at each step. */}
          {comboTier > 0 && (
            <small key={`t${comboTier}`} className="pb-combo-bonus" data-testid="pb-combo-bonus">
              与ダメージ +{Math.round((comboMultiplier(combo.hits) - 1) * 100)}%
            </small>
          )}
        </div>
      )}

      {/* 《彼岸花》 (最終仕様 §7–9): the ground splits under them, red light running in the cracks; the world
          goes still and dark, red spider lilies open out of the cracks, petals over the whole screen
          (higanbanaBloom.ts) — covering it a moment, then thinning at once. */}
      {bloom && bloomArt && bloom.key === lastKey && (
        <span
          key={`hb${lastKey}`}
          className="pb-bloom"
          data-testid="pb-bloom"
          data-spots={bloom.spots.length}
          aria-hidden="true"
          style={{
            ['--crack-at' as string]: `${bloom.crackAt}ms`,
            ['--bloom-at' as string]: `${bloom.at}ms`,
            ['--bloom-ms' as string]: `${bloom.ms}ms`,
            ['--bx' as string]: `${bloom.spots[0].x}%`,
            ['--by' as string]: `${bloom.spots[0].y}%`,
          }}
        >
          <span className="pb-bloom-dark" />
          <svg className="pb-crack" data-testid="pb-crack" viewBox="0 0 100 100" preserveAspectRatio="none">
            {bloomArt.cracks.map((d, i) => (
              <g key={i}>
                <path className="pb-crack-haze" d={d} vectorEffect="non-scaling-stroke" pathLength={100} />
                <path className="pb-crack-cut" d={d} vectorEffect="non-scaling-stroke" pathLength={100} />
                <path className="pb-crack-glow" d={d} vectorEffect="non-scaling-stroke" pathLength={100} />
              </g>
            ))}
          </svg>
          {/* The petals (作者 2026-10-24 仕上げ: one picture, many of it): far behind the lilies, a few rising off
              them, big ones across the front. */}
          {petalsOf('back')}
          {bloomArt.lilies.map((l, i) => (
            <img
              key={i}
              className="pb-bloom-lily"
              data-testid="pb-bloom-lily"
              src={SPECIAL_FX_ART.heroHiganbana}
              alt=""
              style={{ left: `${l.x}%`, top: `${l.y}%`, ['--ls' as string]: l.size, ['--ld' as string]: l.delay, ['--lt' as string]: `${l.turn}deg` }}
            />
          ))}
          <span className="pb-bloom-veil" />
          {petalsOf('rise')}
          {petalsOf('front')}
        </span>
      )}

      {/* Learned in this fight: said once as it opens. */}
      {saying && unlocked && (
        <div className="pb-unlocked" data-testid="pb-unlocked" role="status">
          <small>必殺技 解禁</small>
          <b>《{unlocked}》</b>
        </div>
      )}

      {/* TOP LEFT — the creature: name, HP, BREAK, together. A giant's stands upright down the left edge
          (作者 実機 2026-10-23: 横長の枠は大きさの表現の邪魔で、第2形態の顔にもかかる — 左端に縦で). */}
      {giant ? (
        <div
          className="pb-enemy-plate upright"
          data-testid="pb-enemy-plate"
          data-layout="upright"
          data-focus={focused.id}
          data-boss={focused.boss ? 'yes' : undefined}
        >
          <span className="pb-enemy-name">{focused.name}</span>
          <div className="pb-upright-gauges">
            <VBar value={focused.hp} max={focused.maxHp} />
            <div
              className={`pb-break-gauge upright${broken ? ' broken' : ''}`}
              data-testid="pb-break-gauge"
              data-current={focused.breakCurrent}
              data-max={focused.breakMax}
              aria-label={`BREAK ${focused.breakCurrent}/${focused.breakMax}`}
              style={{ ['--pb-segs' as string]: focused.breakMax }}
            >
              <div className="pb-break-fill" style={{ height: `${broken ? 100 : (focused.breakCurrent / focused.breakMax) * 100}%` }} />
            </div>
          </div>
          <span className="pb-num" data-testid="pb-enemy-hp" data-hp={focused.hp}>
            {focused.hp}
            <small>/{focused.maxHp}</small>
          </span>
          <span className={`pb-break-label${broken ? ' on' : ''}`}>BREAK</span>
          {broken && (
            <span className="pb-break-badge" data-testid="pb-break-badge" data-turns={focused.breakTurns}>
              防御DOWN 残り{focused.breakTurns}T
            </span>
          )}
          {focused.slowTurns > 0 && (
            <span className="pb-slow-badge" data-testid="pb-slow-badge" data-turns={focused.slowTurns}>
              速度DOWN 残り{focused.slowTurns}
            </span>
          )}
        </div>
      ) : (
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
        {focused.slowTurns > 0 && (
          <span className="pb-slow-badge" data-testid="pb-slow-badge" data-turns={focused.slowTurns}>
            速度DOWN 残り{focused.slowTurns}
          </span>
        )}
      </div>
      )}

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
                      {fresh.includes(sk.id) && <NewBadge testId={`pb-skill-new-${sk.id}`} />}
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

      {/* A CUT-IN, over the fight and its HUD; it takes every press while it plays. */}
      {cutIns.element && (
        <div className="bp-cinematic" data-testid="pb-cinematic">
          {cutIns.element}
        </div>
      )}
    </div>
  );
}
