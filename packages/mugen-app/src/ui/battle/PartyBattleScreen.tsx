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
  skillWaitLeft,
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
import { audioManager, playSfx } from '../../platform/audio';
import { hitStop, screenShake, shakeAllowed } from '../fx/screenShake';
import { CAMERA_COMBOS, camera, cameraSequence } from '../fx/camera';
import { COLLAPSE_VIDEO, beatFx, counterFx, type BeatContext, type BeatFx } from './partyFx';
import { SpecialFx } from '../fx/special/SpecialFx';
import { SPECIAL_FX } from '../fx/special/specialFx';
import { CageIcon, SparkIcon, SwordIcon } from './BattleIcons';
import { BATTLE_UI_FRAMES } from './battleArt';
import { WorldMemoryPanel } from './BattleHud';
import { memoryRows } from './battleHud';
import { useCutInDirector } from './cutin/CutIn';
import { spellCutIn } from './magic/spellCutIn';
import { skillCutIn } from './cutin/skillCutIn';
import { resultFaceFor, resultHowOf, resultPartyOf } from './resultFace';
import { ResultOver } from './ResultFace';
import { shatter } from './shatter';
import { SPECIAL_FX_ART } from '../fx/special/specialFxArt';
import { NewBadge } from '../common/NewBadge';
import { splitDamage } from './multiHit';
import { bloomGoneMs, higanbanaBloom, type BloomSpot, type Petal } from './higanbanaBloom';
import { collapseSuction, kaosCollapse, type Collapse } from './kaosCollapse';
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
/**
 * THE END OF A FIGHT, SEEN (作者 2026-10-26 戦闘終了演出: 倒した瞬間に画面が切り替わる → 決まる→倒れる→一呼吸→
 * リザルト). The fight is decided the moment the last blow is dealt, but 「勝利！」 waits: for the move to play
 * out whole (its blows, its BREAK, 《彼岸花》's lilies and petals), for the one beaten to fall, and then a
 * breath — `fall`, from the last blow landing (the fall itself, 700ms, and a breath after it); `bloom`, from
 * 《彼岸花》's petals being down (they were the breath). Never longer than `most` whatever happens.
 */
const RESULT_AFTER_MS = { fall: 1000, bloom: 450, most: 9000 } as const;
/** At ×2 the breath is shorter, never gone: never a cut straight to the result. */
const RESULT_FAST_SHARE = 0.7;
/** 《双極臨界》: how long its blast, cracks and shards outlast the afterglow (collapse.css). */
const COLLAPSE_GONE_MS = 450;
/** 《双極臨界》: how long 「MAGIC DOWN」 is up on each it lowered (as SPEED DOWN after 《彼岸花》). */
const MAGIC_DOWN_SAID_MS = 1300;
/** 《双極臨界》: how far its creatures are drawn toward the point as it pulls (px at most, a share of the way there). */
const COLLAPSE_DRAG = { most: 44, share: 0.35, giant: 8 } as const;
/**
 * 《双極臨界》's circles (v2 §14–15): beside her at her shoulders and wings — white-gold on her right (the screen's left
 * as she is drawn), black-purple on her left — never over anyone else in the party. Tried in turn, the biggest first:
 * how big (a share of the screen's height) and how high (the circles' middle, a share of it).
 */
const COLLAPSE_RING_SHARES = [0.4, 0.36, 0.32, 0.28] as const;
const COLLAPSE_RING_HEIGHTS = [0.34, 0.3, 0.38, 0.26] as const;
/**
 * 《双極臨界》 on the field: her circles over everyone else, the dark and the film over them, she over the dark (lit at
 * her edges — 2026-10-30 F-4), the core, its light and its numbers over all.
 */
const COLLAPSE_Z = { circles: 25, film: 45, caster: 46, core: 50 } as const;
/** How late the drawn seal may be before the film starts without it (and the flash before the film is held anyway). */
const COLLAPSE_CUE_SLACK_MS = 400;
/** 《双極臨界》: the motes running out of each circle into the core. */
const COLLAPSE_MOTES = 8;
/** 《双極臨界》's suction (v2 §9–10): what is drawn into the point — the same every time. */
const SUCTION = collapseSuction();
/** Her eyes on her battle drawing (kaos-battle-v2, shares of it): the right, gold, and the left, blue — as drawn, never swapped. */
const KAOS_EYES = { gold: { x: 45.9, y: 14.6 }, blue: { x: 50.8, y: 14.0 } } as const;
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
  // 《彼岸花》: still, then back and fading out, unseen, there; the last blow stepped into — further (作者
  // 2026-10-26: 踏み込み距離を少し強調), but never past the giant's front nor the middle of an ordinary one
  // (never into its drawing).
  const deeper = lunge.stepAt === undefined ? dx : Math.round(Math.min(0, Math.max(dx - h.width * 0.26, (giant ? f.left + f.width * 0.64 : f.left + f.width * 0.5) - h.left)));
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
    // And his shadow there for a blink (作者 2026-10-25 ブラッシュアップ §1: 一瞬だけ敵前に影): his own drawing
    // as a dark shape edged in red, where he will stand, smeared from where he came — gone as he is seen.
    const ghost = document.createElement('img');
    ghost.className = 'pb-ghost';
    ghost.setAttribute('data-testid', 'pb-ghost');
    ghost.alt = '';
    ghost.src = (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src;
    Object.assign(ghost.style, {
      left: `${Math.round(h.left - box.left + dx)}px`,
      top: `${Math.round(h.top - box.top + dy)}px`,
      width: `${Math.round(h.width)}px`,
      height: `${Math.round(h.height)}px`,
    });
    fig.append(line, glint, ghost);
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
      ghost.animate(
        [
          { transform: 'translateX(14%) scaleX(1.18)', opacity: 0 },
          { transform: 'translateX(3%) scaleX(1.05)', opacity: 0.72, offset: 0.4 },
          { transform: 'translateX(0) scaleX(1)', opacity: 0 },
        ],
        // A little stronger and longer (作者 2026-10-26 §9: 弱すぎる場合のみ少し強めて — before a golden giant it hardly read).
        { delay: Math.round((lunge.trace.at + lunge.trace.ms * 0.3) * speed), duration: Math.round(lunge.trace.ms * 0.9 * speed), fill: 'both' as const },
      ),
    ];
    for (const [i, a] of gone.entries()) {
      const el = [line, glint, ghost][i];
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
  // His finisher's lily and petals, ready before they are wanted (a first decode mid-move is a dropped frame).
  useEffect(() => {
    const finishers = members.flatMap((m) => (m.skills ?? []).filter((k) => k.finisher).map((k) => k.id));
    if (finishers.length === 0) return;
    // …and ケイオス's circles, core and blast (《双極臨界》).
    const pics = [
      ...(finishers.includes('higanbana') ? [SPECIAL_FX_ART.heroHiganbana, SPECIAL_FX_ART.heroPetals] : []),
      ...(finishers.includes('soukyoku_rinkai')
        ? [SPECIAL_FX_ART.kaosGold, SPECIAL_FX_ART.kaosViolet, SPECIAL_FX_ART.kaosSeal, SPECIAL_FX_ART.kaosVoid, SPECIAL_FX_ART.kaosResidue]
        : []),
    ];
    for (const src of pics) {
      const pic = new Image();
      pic.src = src;
      pic.decode?.().catch(() => undefined);
    }
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
  /**
   * ケイオス 《双極臨界 → 界核崩壊》: the beat, where it happens (kaosCollapse), and when each part of it comes
   * (screen ms from the beat — partyFx collapse, the speed and the holds applied).
   */
  const [collapse, setCollapse] = useState<{
    key: number;
    art: Collapse;
    spots: { x: number; y: number }[];
    /** Where (% of the field): her white circle, her black-purple one (the seal and the film are over the creatures: art). */
    white: { x: number; y: number };
    violet: { x: number; y: number };
    /** How big her circles are (a share of the field's height). */
    ring: number;
    /** Over each one struck (% of the field): where its number shows at the release, and how much it took in all. */
    heads: { id: string; x: number; y: number; amount: number }[];
    /** The field's size (px), for the light running from each circle into the seal. */
    w: number;
    h: number;
    /** The suction film shown (not with less motion asked for). */
    film: boolean;
    t: {
      white: number;
      purple: number;
      enter: number;
      both: number;
      core: number;
      drained: number;
      video: number;
      /** The film's speed on screen. */
      rate: number;
      /** The stillness before the release (on screen). */
      still: number;
      /** 界核崩壊 — the release, where everything lands. */
      release: number;
      after: number;
    };
  } | null>(null);
  /** The beat whose 魔防DOWN has been said (as its afterglow faded): on the plate from then. */
  const [loweredSaid, setLoweredSaid] = useState(-1);
  /** Skills still NEW (not yet used in this fight). */
  const [fresh, setFresh] = useState<readonly string[]>(newSkills ?? []);
  const [saying, setSaying] = useState(!!unlocked);
  /**
   * The beat whose blow has landed: its number shows from then (作者 実機 2026-10-24: a CSS delay drifted
   * from the blow, and the hold paused it — the number came after 「BREAK!!」, under the glass).
   */
  const [landed, setLanded] = useState(-1);
  /** The creatures seen to fall: one beaten is drawn down only once the blow that beat it has landed. */
  const [fallen, setFallen] = useState<ReadonlySet<string>>(() => new Set());
  /** 「勝利！」／「敗北……」 shown — a while after the fight was decided (RESULT_AFTER_MS). */
  const [resultShown, setResultShown] = useState(false);
  /** How many of the beat's blows have landed (a move of several cuts shows a number at each). */
  const [cutsIn, setCutsIn] = useState<{ key: number; n: number }>({ key: -1, n: 0 });
  const [bg, setBg] = useState<string | null>(null);
  const ended = useRef(false);
  /** The screen, so a shake or the camera moves this fight's field and painting (ui/fx) and nothing else. */
  const root = useRef<HTMLDivElement>(null);
  /** 《双極臨界》's suction film, played and held from the beat (it is the move's own clock from its start). */
  const collapseFilm = useRef<HTMLVideoElement>(null);
  /** The film started as the seal is seen falling into it, and held as the white flash is seen — the drawn clock,
   *  which starts only once the overlay is on the screen (a slow frame puts it behind the beat's timers). */
  const collapseCue = useRef<{ key: number; play: () => void; hold: () => void; land?: () => void } | null>(null);
  /** 《双極臨界》: its creatures drawn toward the point (let go at the release, or if the beat is cut short). */
  const collapseDrags = useRef<Animation[]>([]);
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
  // The finishers whose cut-in this fight has shown once (作者 2026-10-25 ブラッシュアップ §4): the first is
  // the whole one, every one after it the short one.
  const finishersSeen = useRef(new Set<string>());
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
    const found = spell ? spellCutIn(spell) : skillCutIn(skill);
    if (found) {
      // A finisher's cut-in in this fight (作者 2026-10-26 §1): the first a little shorter than the whole one,
      // every one after it shorter still.
      const again = found.tier === 'FINISHER' && finishersSeen.current.has(found.name);
      if (found.tier === 'FINISHER') finishersSeen.current.add(found.name);
      const cut = found.tier !== 'FINISHER' ? found : { ...found, pace: again ? ('brief' as const) : ('brisk' as const) };
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
    /** This beat over (the next one come, or the screen gone): nothing more of it is set going. */
    let over = false;
    /** The music drawn back for 《双極臨界》's hush — let back at once if this beat is cut short. */
    let hushed = false;
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(() => at.isConnected && f(), ms));
    const ctx = beatContext(beat, true);
    /** What the count does as a beat's blows land: one more at each blow before the last; at the last, as it stands. */
    type Count = { stage?: () => void; land: () => void };
    const play = (p: BeatFx, breaks: boolean, count?: Count) => {
      /**
       * 《双極臨界》's clock is its drawing's (v2 §33: the numbers, the hold and the jolt with the white flash): its
       * overlay is heavy to draw the first time, and its CSS starts when that frame is drawn (~0.2s late here, more on a
       * phone) — so its camera and every moment of it are counted from there (`drawn`: when, on the page's clock).
       */
      let drawn: Promise<number> | null = null;
      const after = (ms: number, f: () => void) =>
        drawn ? void drawn.then((origin) => !over && later(Math.max(0, origin + ms - performance.now()), f)) : later(ms, f);
      // A TRACK is timed to the blow, which waits only on the speed — never on a character's tempo.
      const startCamera = () => {
        if (p.camera) void cameraSequence(p.camera, at, { tempo: p.camera[0]?.kind === 'TRACK' ? speed : p.tempo * speed });
      };
      if (!p.collapse) startCamera();
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
        later(from + bloom.at + bloomGoneMs(bloom.ms, higanbanaBloom(bloom.spots).petals), () => setBloom((b) => (b?.key === bloom.key ? null : b)));
      }
      // 《双極臨界 → 界核崩壊》 (魔法陣ブラッシュアップ, 動画＋PNG統合): her two circles either side of her; their light
      // into the bipolar seal over the creatures; the seal into the suction film — the crush, the stillness — and its
      // release, 界核崩壊; the afterglow.
      if (p.collapse && isEnemyId(beat.target)) {
        const box = at.getBoundingClientRect();
        const pc = (px: number, of: number) => Math.round((px / of) * 1000) / 10;
        const spots = [beat.target, ...(p.also ?? [])].flatMap((id) => {
          const el = at.querySelector<HTMLElement>(`[data-enemy="${id}"] > img`) ?? at.querySelector<HTMLElement>(`[data-enemy="${id}"]`);
          const r = el?.getBoundingClientRect();
          if (!r || !box.width || !box.height) return [];
          // Its middle — a giant's, high on it (before its face).
          const x = ((r.left + r.width * (giant ? 0.55 : 0.5) - box.left) / box.width) * 100;
          const y = ((r.top + r.height * (giant ? 0.35 : 0.5) - box.top) / box.height) * 100;
          return [{ x: Math.round(x), y: Math.round(y) }];
        });
        // Her circles beside her (v2 §14–15: her white wing's side — the screen's left as she is drawn — the white-gold;
        // her dark wing's side the black-purple), at her shoulders and wings, never over anyone else in the party (the
        // biggest that clears them all, the nearest height; failing that, the one that covers them least).
        const me = at.querySelector<HTMLElement>(`[data-testid="pb-figure-${beat.actor}"] > img`)?.getBoundingClientRect();
        const kx = me ? me.left + me.width * 0.48 - box.left : box.width * 0.68;
        const others = [...at.querySelectorAll<HTMLElement>('[data-testid^="pb-figure-"] > img')]
          .filter((el) => el.closest(`[data-testid="pb-figure-${beat.actor}"]`) === null)
          .map((el) => el.getBoundingClientRect())
          // Each figure's body, not its picture's empty edges.
          .map((r) => ({ l: r.left - box.left + r.width * 0.25, r: r.right - box.left - r.width * 0.25, t: r.top - box.top + r.height * 0.1, b: r.bottom - box.top }));
        const covers = (x: number, y: number, rad: number) =>
          others.reduce((n, o) => {
            const nx = Math.max(o.l, Math.min(x, o.r));
            const ny = Math.max(o.t, Math.min(y, o.b));
            return n + Math.max(0, rad - Math.hypot(x - nx, y - ny));
          }, 0);
        const edge = 6;
        let place: { wx: number; vx: number; y: number; share: number; over: number } = { wx: 0, vx: 0, y: 0, share: COLLAPSE_RING_SHARES[0], over: Infinity };
        for (const share of COLLAPSE_RING_SHARES) {
          for (const hy of COLLAPSE_RING_HEIGHTS) {
            const half = box.height * share * 0.5;
            const apart = Math.max(box.width * 0.09, half * 0.85 + (me ? me.width * 0.18 : 0));
            let wx = kx - apart;
            let vx = kx + apart;
            // Both whole on the screen: the pair moved in from an edge together, she still between them.
            const over = vx + half - (box.width - edge);
            if (over > 0) [wx, vx] = [wx - over, vx - over];
            const under = edge - (wx - half);
            if (under > 0) [wx, vx] = [wx + under, vx + under];
            const y = box.height * hy;
            // The drawn ring, not its picture's empty corners.
            const hit = covers(wx, y, half * 0.8) + covers(vx, y, half * 0.8);
            if (hit < place.over) place = { wx, vx, y, share, over: hit };
            if (hit === 0) break;
          }
          if (place.over === 0) break;
        }
        const { wx, vx, y: ky } = place;
        // Over each one's head (a giant's, well down its picture — on the screen), the number it took (2026-10-30 F-5).
        const heads = [beat.target, ...(p.also ?? [])].flatMap((id) => {
          const r = (at.querySelector<HTMLElement>(`[data-enemy="${id}"] > img`) ?? at.querySelector<HTMLElement>(`[data-enemy="${id}"]`))?.getBoundingClientRect();
          const hits = beat.spread ? beat.spread.find((x) => x.target === id)?.hits : id === beat.target ? (beat.hits ?? [beat.amount]) : undefined;
          if (!r || !hits || hits.length === 0) return [];
          const y = r.top + r.height * (giant ? 0.3 : 0.08) - box.top;
          return [{ id, x: pc(r.left + r.width * 0.5 - box.left, box.width), y: Math.max(14, pc(y, box.height)), amount: hits.reduce((a, b) => a + b, 0) }];
        });
        const c = p.collapse;
        const t = (ms: number) => Math.round(when(ms));
        // The film's speed on screen: its own at this fight's speed.
        const filmRate = c.rate;
        const release = t(c.burst);
        const shown = {
          key: lastKey,
          art: kaosCollapse(spots),
          spots,
          white: { x: pc(wx, box.width), y: pc(ky, box.height) },
          violet: { x: pc(vx, box.width), y: pc(ky, box.height) },
          ring: place.share,
          heads,
          w: Math.round(box.width),
          h: Math.round(box.height),
          film: shakeAllowed(),
          t: {
            white: t(c.white),
            purple: t(c.purple),
            enter: Math.round(c.enter * speed),
            both: t(c.both),
            core: t(c.core),
            drained: t(c.drained),
            video: t(c.video),
            rate: filmRate,
            still: Math.round(c.still * speed),
            release,
            after: Math.round(c.after * speed),
          },
        };
        setCollapse(shown);
        drawn = new Promise<number>((done) => {
          let looks = 0;
          const look = () => {
            const started = at.querySelector('.pb-cl-back')?.getAnimations({ subtree: true }).find((a) => typeof a.startTime === 'number');
            if (started) return done(started.startTime as number);
            // Never drawn (a second gone): from now.
            if (++looks > 60) return done(performance.now());
            requestAnimationFrame(look);
          };
          requestAnimationFrame(look);
        });
        void drawn.then(() => !over && startCamera());
        const tt = shown.t;
        const hold = Math.round(p.hitStop * speed);
        // Each circle's sound as it opens; the hush (the music drawn back) while the two are there; the seal forming.
        after(tt.white, () => playSfx('battle_charge_aura'));
        after(tt.purple, () => playSfx('battle_magic_dark'));
        after(tt.both, () => {
          hushed = true;
          audioManager.duckBgmTo(0.35, 120);
        });
        after(tt.core, () => {
          hushed = false;
          audioManager.duckBgmTo(1, 400);
          playSfx('battle_buff');
        });
        // The film: from its first frame, at its speed — to the point, where it is held through the stillness (v2 §21:
        // everything stops); at the release it shows its burst, held with the blow, then runs on.
        let filmStarted = false;
        let filmStill = false;
        let filmHeld = false;
        const playFilm = () => {
          const v = collapseFilm.current;
          if (!v || filmStarted) return;
          filmStarted = true;
          v.playbackRate = filmRate;
          v.currentTime = 0;
          void v.play().catch(() => undefined);
          // Held at the point (the stillness) — by where the film itself is; or wherever it has got to when the
          // stillness comes (a film started late on a busy phone never eats into the stillness).
          const point = COLLAPSE_VIDEO.pull / 1000 - 0.04;
          const watch = () => {
            const f = collapseFilm.current;
            if (!f || filmHeld || filmStill) return;
            if (f.currentTime >= point) return void f.pause();
            requestAnimationFrame(watch);
          };
          requestAnimationFrame(watch);
        };
        // The release: the film on to its burst, held there with the blow (its hit-stop), then on.
        const holdFilm = () => {
          if (filmHeld) return;
          filmHeld = true;
          const v = collapseFilm.current;
          if (!v) return;
          v.pause();
          v.currentTime = COLLAPSE_VIDEO.pull / 1000 + 0.04;
          later(hold, () => void collapseFilm.current?.play().catch(() => undefined));
        };
        collapseCue.current = { key: shown.key, play: playFilm, hold: holdFilm };
        // Only if the seal's fall or the flash is never seen (a very late frame): from the beat's clock.
        after(tt.video + COLLAPSE_CUE_SLACK_MS, playFilm);
        after(tt.video, () => playSfx('battle_charge_aura'));
        // The stillness (2026-10-30 F-2: 画面全体が完全に止まる): the music gone, nothing sounding, the film held — and
        // everything else on the screen held with it (the wings, everyone's breathing, the HUD). Not the collapse's own
        // layers (all of their pull is over by now, their release waits on its own time) nor the camera (it is holding
        // still on them already, and held it would jolt late, after the white flash).
        after(Math.max(tt.video, release - tt.still), () => {
          hushed = true;
          audioManager.duckBgmTo(0, 40);
          filmStill = true;
          collapseFilm.current?.pause();
          if (!shakeAllowed()) return;
          const held = at
            .getAnimations({ subtree: true })
            .filter((a) => {
              const on = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null;
              return a.playState === 'running' && !!on && !on.dataset.shakeLayer && !on.closest('.pb-collapse, .pb-cl-flash, .pb-cl-front, .pb-cl-back');
            });
          for (const a of held) a.pause();
          later(tt.still, () => held.forEach((a) => a.playState === 'paused' && a.play()));
        });
        // Each one struck drawn toward the point as it pulls (2026-10-30 F-3) — a little at first, then harder, shaking
        // with it; let go at the release (it reels from there). On `transform`, as its reel is: the screen's shake owns
        // `translate`, and is the only thing that moves by it.
        const drags = collapseDrags.current;
        after(tt.video, () => {
          if (!shakeAllowed()) return;
          const field = at.getBoundingClientRect();
          const cx = field.left + (shown.art.x / 100) * field.width;
          const cy = field.top + (shown.art.y / 100) * field.height;
          shown.heads.forEach((hd, n) => {
            const img = at.querySelector<HTMLElement>(`[data-enemy="${hd.id}"] > img`);
            if (!img || typeof img.animate !== 'function') return;
            const r = img.getBoundingClientRect();
            const dx = cx - (r.left + r.width / 2);
            const dy = cy - (r.top + r.height / 2);
            const far = Math.hypot(dx, dy) || 1;
            const most = giant ? COLLAPSE_DRAG.giant : Math.min(COLLAPSE_DRAG.most, far * COLLAPSE_DRAG.share);
            const steps = 24;
            const frames = Array.from({ length: steps + 1 }, (_, i) => {
              const k = i / steps;
              const pull = most * k ** 2.2;
              const shake = i === 0 ? 0 : (1 + 4 * k) * Math.sin(i * 2.9 + n * 1.7);
              return { transform: `translate(${((dx / far) * pull + shake).toFixed(1)}px, ${((dy / far) * pull - shake * 0.5).toFixed(1)}px)` };
            });
            drags.push(img.animate(frames, { duration: Math.max(1, release - tt.still - tt.video), fill: 'forwards' }));
          });
        });
        after(release, () => {
          hushed = false;
          audioManager.duckBgmTo(1, 500);
          drags.forEach((a) => a.cancel());
        });
        after(release + COLLAPSE_CUE_SLACK_MS, holdFilm);
        // 魔防DOWN said on each as the afterglow fades (its sound with it), and the line that says so — after the line of
        // the release, never over it (2026-10-30 F-5); all of it taken away once the film has run out and that has been read.
        const faded = release + hold + tt.after;
        const lowered = !!(beat.magicDown || beat.spread?.some((x) => x.magicDown));
        after(faded, () => {
          setLoweredSaid(shown.key);
          if (lowered) playSfx('battle_debuff');
        });
        const filmEnd = release + hold + Math.round(COLLAPSE_VIDEO.release / filmRate);
        after(Math.max(release + hold + tt.after + COLLAPSE_GONE_MS, filmEnd) + (lowered ? MAGIC_DOWN_SAID_MS : 0), () => setCollapse((v) => (v?.key === shown.key ? null : v)));
      }
      // The characters' own effects: each one's sounds at its landing — once for a moment, however many it falls on.
      const heard = new Set<number>();
      for (const sp of p.special ?? []) {
        const spec = SPECIAL_FX[sp.type];
        const t = sp.at + spec.impact;
        if (!spec.sfx || heard.has(t)) continue;
        heard.add(t);
        after(when(t), () => spec.sfx!.forEach((id) => playSfx(id)));
      }
      // The blows before the last (重撃 before 豪断): each its own hold, then its jolt and reeling.
      for (const st of p.stages ?? []) {
        after(when(st.at), () => {
          count?.stage?.();
          void hitStop(st.hitStop * speed, at).then(() => {
            if (!at.isConnected) return;
            if (st.shake) void screenShake(st.shake, at);
            if (st.reel) reelOf(at, st.reel, isEnemyId(st.reel.on) ? -1 : 1, speed);
          });
        });
      }
      // The BREAK: its sound, the shake, the camera onto the one broken, 「BREAK!!」, and the creature reels.
      const playBreak = () => {
        playBreakSfx();
        void screenShake('medium', at);
        // Onto the one broken — unless a TRACK is already on it (which this would cut short).
        if (p.camera?.[0]?.kind !== 'TRACK') void cameraSequence(CAMERA_COMBOS.BREAK_FOCUS(ctx.targetAt), at, { tempo: speed });
        setBreakAt(ctx.targetAt);
        setBreakShown(lastKey);
        later(BREAK_REEL_MS * speed, () => setShaking(true));
        later((BREAK_REEL_MS + SHAKE_MS) * speed, () => setShaking(false));
      };
      // 《彼岸花》's comes after its bloom (partyFx breakAt): the last cut lands as a cut first.
      const breakLater = breaks && p.breakAt !== undefined;
      if (breakLater) after(when(p.breakAt!) + p.hitStop * speed, playBreak);
      // The blow lands — 《双極臨界》's at its white flash, whichever is first: the flash seen, or its moment on the clock
      // (a busy phone runs timers late; the flash is what is seen).
      let landedNow = false;
      const landNow = () => {
        if (landedNow || over) return;
        landedNow = true;
        count?.land();
        for (const id of p.sfx) playSfx(id);
        void hitStop((breaks && !breakLater ? BREAK_HIT_STOP_MS : p.hitStop) * speed, at).then(() => {
          if (!at.isConnected) return;
          if (breaks && !breakLater) {
            playBreak();
            return;
          }
          if (p.after) void camera(p.after, at, p.tempo * speed);
          if (p.shake) void screenShake(p.shake, at);
          if (p.reel) reelOf(at, p.reel, isEnemyId(p.reel.on) ? -1 : 1, speed);
          // A move at all of them: the others reel too.
          for (const id of p.also ?? []) if (p.reel) reelOf(at, { ...p.reel, on: id }, -1, speed);
        });
      };
      if (p.collapse && collapseCue.current) collapseCue.current.land = landNow;
      after(when(p.impact), landNow);
    };
    // Those this beat has beaten (and any before), drawn down as its blow lands.
    const fall = () => setFallen(new Set(state.enemies.filter((e) => e.down).map((e) => e.id)));
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
        fall();
        setCutsIn({ key, n: Number.MAX_SAFE_INTEGER });
        // A step of COMBO's worth reached (10, 20, 30, 40): a small sound with its glow.
        if (climbs && Math.min(4, Math.floor(after.hits / COMBO_STEP)) > Math.min(4, Math.floor(before.hits / COMBO_STEP))) playSfx('battle_buff');
        if (climbs) setCombo(after);
        else if (after !== before) setCombo(counted ? NO_COMBO : after);
      },
    });
    if (counted)
      play(counterFx(beat, ctx), false, {
        land: () => {
          setCombo(after);
          fall();
        },
      });
    return () => {
      over = true;
      for (const a of collapseDrags.current) a.cancel();
      collapseDrags.current = [];
      timers.forEach((t) => window.clearTimeout(t));
      if (hushed) audioManager.duckBgmTo(1, 200);
      collapseCue.current = null;
    };
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
  // Won: her face beside 「勝利！」 (タスクG, resultFace.ts) — only where she fought; a party finisher's last
  // blow (《双極臨界》, 《彼岸花》), else a boss, else an ordinary win.
  const wonFace =
    state.outcome === 'VICTORY'
      ? resultFaceFor(
          resultPartyOf(state.members.map((m) => m.id)),
          resultHowOf({
            byFinisher: !!(last && members.find((m) => m.id === last.actor)?.skills?.find((k) => k.name === last.name)?.finisher),
            boss: state.enemies.some((e) => e.boss),
          }),
        )
      : null;
  // 「勝利！」／「敗北……」 and つぎへ: the panel of the result.
  const resultBox = (
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
  );
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
  /**
   * 《双極臨界》's results land at its release, never before (v2 §4–6): until its blow has landed, each creature's HP
   * as it was before the beat (`before` — kept as each beat comes), and the line under the turn order saying only
   * that she used it; its numbers and COMBO wait on the blow already (`landed`); 魔防DOWN's line in the afterglow.
   */
  const hpNow = Object.fromEntries(state.enemies.map((e) => [e.id, e.hp]));
  const hpSeen = useRef({ key: lastKey, before: hpNow, now: hpNow });
  if (hpSeen.current.key !== lastKey) hpSeen.current = { key: lastKey, before: hpSeen.current.now, now: hpNow };
  else hpSeen.current.now = hpNow;
  const heldResult = !!fx?.collapse && landed !== lastKey;
  const hpShown = (e: PartyEnemy) => (heldResult ? (hpSeen.current.before[e.id] ?? e.hp) : e.hp);
  const logLine = (() => {
    const line = state.log[state.log.length - 1];
    if (!fx?.collapse || !last || loweredSaid === lastKey) return line;
    const said = [...state.log].reverse().find((l) => l.includes(`《${last.name}》`)) ?? line;
    return heldResult ? said.slice(0, said.indexOf('！') + 1) || said : said;
  })();
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
    // 《双極臨界》's are over each one's head, over its light (collapseOnField 'front').
    if (fx?.collapse) return null;
    const mine = last.spread?.find((x) => x.target === id);
    if (mine) return mine.hits.length > 0 ? [...mine.hits] : null;
    return last.target === id ? parts : null;
  };
  /** How many cuts the beat has at most (the last of them shows when the blow has landed). */
  const cutCount = last?.spread ? Math.max(1, ...last.spread.map((x) => x.hits.length)) : parts.length;
  const slowedOn = (id: string) => !!last && (last.spread ? !!last.spread.find((x) => x.target === id)?.slowed : !!last.slowed && last.target === id);
  /** 魔防DOWN on the creature the plate shows — kept back while the move that lays it is still playing. */
  const magicDownShown = focused.magicDownTurns > 0 && !(fx?.collapse && loweredSaid !== lastKey);
  const loweredOn = (id: string) => !!last && (last.spread ? !!last.spread.find((x) => x.target === id)?.magicDown : !!last.magicDown && last.target === id);
  const bloomArt = useMemo(() => (bloom ? higanbanaBloom(bloom.spots) : null), [bloom]);
  /** 《彼岸花》's petals of one layer, each one of the author's sixteen at its own size, way, turn and time. */
  const petalsOf = (layer: Petal['layer']) =>
    bloomArt?.petals
      .filter((pt) => pt.layer === layer)
      .map((pt, i) => (
        // One of the author's sixteen petals (作者 2026-10-25): a cell of the one 4×4 picture.
        <i
          key={`${layer}${i}`}
          className={`pb-petal ${layer}`}
          data-testid="pb-petal"
          data-layer={layer}
          data-variant={pt.variant}
          style={{
            left: `${pt.x}%`,
            top: `${pt.y}%`,
            backgroundPosition: `${(pt.variant % 4) * (100 / 3)}% ${Math.floor(pt.variant / 4) * (100 / 3)}%`,
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
  // 《彼岸花》's BREAK still to come (after its bloom — partyFx breakAt): no command until it is seen, or the
  // next move would cut it off (作者 実機 2026-10-25: BREAKの表示が早すぎて彼岸花のエフェクトが見れない).
  const breakDue = !!last?.broke && fx?.breakAt !== undefined && breakShown !== lastKey;
  const playerInput = !!acting && !auto && state.outcome === 'ONGOING' && !cutIns.playing && !breakDue;
  // The result, once the fight's end has been seen (RESULT_AFTER_MS): no new move is begun meanwhile (the
  // fight is over — AUTO's and the creature's turns wait on ONGOING), and nothing can be pressed.
  useEffect(() => {
    if (state.outcome === 'ONGOING' || resultShown) return;
    const playedOut = landed === lastKeyOf(state) && !bloom && !collapse && !breakDue && !cutIns.playing;
    const breath = (fx?.bloom || fx?.collapse ? RESULT_AFTER_MS.bloom : RESULT_AFTER_MS.fall) * (fast ? RESULT_FAST_SHARE : 1);
    const t = window.setTimeout(() => setResultShown(true), playedOut ? breath : RESULT_AFTER_MS.most);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.outcome, resultShown, landed, lastKeyOf(state), bloom, collapse, breakDue, cutIns.playing, fast]);
  useEffect(() => {
    if (resultShown && state.outcome === 'VICTORY') playSfx('battle_win');
  }, [resultShown, state.outcome]);
  // A move of theirs playing — its cut-in, its blows until the last lands, 《彼岸花》's bloom: the giant's
  // plate steps back so the move is seen (作者 実機 2026-10-25: 演出が見れない).
  const showing = cutIns.playing || !!bloom || !!collapse || (!!last && !isEnemyId(last.actor) && landed !== lastKey);
  /** 《双極臨界》's times and places as custom properties (collapse.css), for each of its layers. */
  const collapseVars = (c: NonNullable<typeof collapse>): CSSProperties => {
    const t = c.t;
    return {
      ['--cx' as string]: `${c.art.x}%`,
      ['--cy' as string]: `${c.art.y}%`,
      ['--white-at' as string]: `${t.white}ms`,
      ['--purple-at' as string]: `${t.purple}ms`,
      ['--enter' as string]: `${t.enter}ms`,
      ['--both-at' as string]: `${t.both}ms`,
      ['--core-at' as string]: `${t.core}ms`,
      ['--drained-at' as string]: `${t.drained}ms`,
      ['--video-at' as string]: `${t.video}ms`,
      // The pull (from the film to the point) and the stillness after it.
      ['--pull' as string]: `${t.release - t.still - t.video}ms`,
      ['--still-at' as string]: `${t.release - t.still}ms`,
      ['--release-at' as string]: `${t.release}ms`,
      ['--after' as string]: `${t.after}ms`,
    };
  };
  /**
   * 《双極臨界》 on the field (it moves with the camera, which stays on her until the film takes over): OVER everyone
   * but her, the field darkened a little and her two circles either side of her — opening, turning their own ways,
   * lit together, then drunk dry; IN FRONT, the light running out of each circle over to the creatures, into the
   * bipolar seal forming there — white half and black-purple half, the two made one — which falls in on itself as
   * the suction film begins (the film is over the screen: the overlay).
   */
  const collapseOnField = (c: NonNullable<typeof collapse>, layer: 'back' | 'over' | 'front') => {
    const vars = collapseVars(c);
    if (layer === 'over')
      // THE FILM and what is drawn into it (グレードアップ v2 — 吸った → 圧縮した → 止まった → 壊れた): the field darkened
      // hard (the creatures, Kaos and the HUD still faintly read) and closing in from its edges (purple-black smoke —
      // kaos-void-frame); the suction film over the creatures (kaos-collapse-video — keyed, no black left); and what is
      // really pulled — motes, thin light and crystal shards from far out round it, spiralling in, quickening, gone
      // into the point; warped space closing on it twice; the core growing, then crushed to a point, held through the
      // stillness. 界核崩壊 — the point turned at once into a blaze: cracks out through the space, a black-purple
      // shockwave and a white ring, shards flung out, gold-white light; the afterglow — purple-black residue.
      return (
        <span key={`clo${c.key}`} className="pb-collapse" data-testid="pb-collapse" aria-hidden="true" style={{ ...vars, zIndex: COLLAPSE_Z.film }}>
          <span className="pb-cl-dark" />
          <span className="pb-cl-close" />
          <img className="pb-cl-void" data-testid="pb-collapse-void" src={SPECIAL_FX_ART.kaosVoid} alt="" />
          {c.film && (
            <video ref={collapseFilm} className="pb-cl-film" data-testid="pb-collapse-film" src={SPECIAL_FX_ART.kaosFilm} muted playsInline preload="auto" disablePictureInPicture />
          )}
          {/* Warped space closing on the point, twice (not turning: closing). */}
          {[0, 1].map((i) => (
            <span key={`w${i}`} className="pb-cl-warp" data-testid="pb-collapse-warp" style={{ ['--warp-i' as string]: i }} />
          ))}
          {SUCTION.crystals.map((k, i) => (
            <i
              key={`k${i}`}
              className={`pb-cl-crystal ${k.tone}`}
              data-testid="pb-collapse-crystal"
              style={{
                ['--a' as string]: `${k.a}deg`,
                ['--turn' as string]: `${k.turn}deg`,
                ['--r' as string]: `${Math.round(k.far * c.w)}px`,
                ['--spin' as string]: `${k.spin}deg`,
                ['--s' as string]: `${k.size}px`,
              }}
            >
              {/* The crystal itself, cut and turning over (2026-10-30 F-7: 厚み・縁の発光・回転 — never paper). */}
              <b style={{ ['--tumble' as string]: `${520 + (i % 4) * 90}ms` }} />
            </i>
          ))}
          {SUCTION.motes.map((m, i) => (
            <i
              key={`m${i}`}
              className={`pb-cl-dust ${m.tone}${m.streak ? ' streak' : ''}`}
              data-testid={m.streak ? 'pb-collapse-streak' : 'pb-collapse-dust'}
              style={{
                ['--a' as string]: `${m.a}deg`,
                ['--turn' as string]: `${m.turn}deg`,
                ['--r' as string]: `${Math.round(m.far * c.w)}px`,
                ['--start' as string]: m.start,
                ['--s' as string]: `${m.size}px`,
              }}
            />
          ))}
          <span className="pb-cl-core" data-testid="pb-collapse-core" />
          <span className="pb-cl-blaze" data-testid="pb-collapse-blaze" />
          <svg className="pb-cl-cracks" data-testid="pb-collapse-cracks" viewBox="0 0 100 100" preserveAspectRatio="none">
            {c.art.cracks.map((d, i) => (
              <path key={i} d={d} pathLength={1} />
            ))}
          </svg>
          <span className="pb-cl-wave dark" />
          <span className="pb-cl-wave burst" data-testid="pb-collapse-wave" />
          {c.art.shards.map((sh, i) => (
            <i
              key={`s${i}`}
              className={`pb-cl-shard ${sh.tone}`}
              style={{ ['--dx' as string]: `${sh.dx}%`, ['--dy' as string]: `${sh.dy}%`, ['--rot' as string]: `${sh.rot}deg`, ['--s' as string]: `${sh.size}px`, ['--lag' as string]: `${sh.delay}ms` }}
            >
              <b style={{ ['--tumble' as string]: `${380 + (i % 5) * 70}ms` }} />
            </i>
          ))}
          <span className="pb-cl-glow" />
          <img className="pb-cl-residue" data-testid="pb-collapse-residue" src={SPECIAL_FX_ART.kaosResidue} alt="" />
        </span>
      );
    if (layer === 'back')
      return (
        <span key={`clb${c.key}`} className="pb-cl-back" data-testid="pb-collapse-field" aria-hidden="true" style={{ ...vars, zIndex: COLLAPSE_Z.circles }}>
          <span className="pb-cl-hush" />
          {(['white', 'violet'] as const).map((k) => {
            // Pulled out of shape toward the seal over the creatures, and into it (v2 §11).
            const dx = ((c.art.x - c[k].x) / 100) * c.w;
            const dy = ((c.art.y - c[k].y) / 100) * c.h;
            return (
              <span
                key={k}
                className={`pb-cl-ring ${k}`}
                data-testid={`pb-collapse-ringbox-${k}`}
                style={{
                  left: `${c[k].x}%`,
                  top: `${c[k].y}%`,
                  height: `${c.ring * 100}%`,
                  ['--to-x' as string]: `${Math.round(dx)}px`,
                  ['--to-y' as string]: `${Math.round(dy)}px`,
                  ['--to-a' as string]: `${Math.round((Math.atan2(dy, dx) * 180) / Math.PI)}deg`,
                }}
              >
                <img data-testid={`pb-collapse-ring-${k}`} src={k === 'white' ? SPECIAL_FX_ART.kaosGold : SPECIAL_FX_ART.kaosViolet} alt="" />
              </span>
            );
          })}
        </span>
      );
    // Each circle's light into the seal: motes off its ring running in (the circles follow them).
    const streams = (['white', 'violet'] as const).map((k) => ({ k, dx: ((c.art.x - c[k].x) / 100) * c.w, dy: ((c.art.y - c[k].y) / 100) * c.h }));
    return (
      <span key={`clf${c.key}`} className="pb-cl-front" aria-hidden="true" style={{ ...vars, zIndex: COLLAPSE_Z.core }}>
        {streams.map((st) => (
          <span key={st.k} style={{ left: `${c[st.k].x}%`, top: `${c[st.k].y}%` }} className="pb-cl-source">
            {Array.from({ length: COLLAPSE_MOTES }, (_, i) => (
              <i
                key={i}
                className={`pb-cl-mote ${st.k}`}
                data-testid="pb-collapse-mote"
                style={{
                  ['--mx' as string]: `${Math.round(st.dx)}px`,
                  ['--my' as string]: `${Math.round(st.dy)}px`,
                  // Off round the circle's ring, each its own moment of the drinking.
                  ['--m0x' as string]: `${Math.round(Math.cos(i * 2.4) * c.h * c.ring * 0.32)}px`,
                  ['--m0y' as string]: `${Math.round(Math.sin(i * 2.4) * c.h * c.ring * 0.32)}px`,
                  ['--md' as string]: i / COLLAPSE_MOTES,
                }}
              />
            ))}
          </span>
        ))}
        {/* 界核崩壊: what each one took, over its head (2026-10-30 F-5 — 敵ごとに個別のダメージ数字), from the release. */}
        {landed === c.key &&
          c.heads.map((hd) => (
            <span
              key={`n${hd.id}`}
              className={`pb-float big stay pb-cl-num${c.heads.length > 1 ? ' many' : ''}`}
              data-testid="pb-collapse-num"
              data-enemy={hd.id}
              // Gone about as 「MAGIC DOWN」 comes (the end of the afterglow).
              style={{ left: `${hd.x}%`, top: `${hd.y}%`, ['--pb-impact' as string]: '0ms', ['--num-ms' as string]: `${Math.round((c.t.after + 150 * (fast ? 0.5 : 1)) * 1.2)}ms` }}
            >
              {hd.amount}
            </span>
          ))}
        <img
          className="pb-cl-seal"
          data-testid="pb-collapse-seal"
          src={SPECIAL_FX_ART.kaosSeal}
          alt=""
          style={{ left: `${c.art.x}%`, top: `${c.art.y}%` }}
          onAnimationStart={(e) => e.animationName === 'pb-cl-seal-fall' && collapseCue.current?.key === c.key && collapseCue.current.play()}
        />
      </span>
    );
  };
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
      data-showing={showing ? 'yes' : 'no'}
      data-ending={state.outcome !== 'ONGOING' && !resultShown ? 'yes' : 'no'}
      style={{
        ['--pb-diamond' as string]: `url(${BATTLE_UI_FRAMES.commandDiamond})`,
        ['--ui-memory' as string]: `url(${BATTLE_UI_FRAMES.memoryPanel})`,
        ['--ui-memory-star' as string]: `url(${BATTLE_UI_FRAMES.memoryStar})`,
      }}
    >
      {bg && <img className="pb-bg" src={bg} alt="" aria-hidden="true" data-shake-layer="backdrop" />}

      {/* THE FIELD — the creature left, the party right (a triangle). */}
      <div className="pb-field" data-shake-layer="field">
        {collapse && collapse.key === lastKey && collapseOnField(collapse, 'back')}
        {state.enemies.map((e, i) => {
          const spot = foeSpots[i];
          const eBroken = isBroken(e);
          const struck = !!last?.broke && last.target === e.id;
          const isFocus = many && e.id === focused.id && !e.down;
          return (
            <div
              key={e.id}
              className={`pb-foe${actor === e.id ? ' acting' : ''}${eBroken ? ' broken' : ''}${struck && shaking ? ' shake' : ''}${e.down && fallen.has(e.id) ? ' down' : ''}${isFocus ? ' focus' : ''}${menu === 'ENEMY' && !e.down ? ' aimable' : ''}`}
              data-testid={many ? `pb-foe-${e.id}` : 'pb-foe'}
              data-enemy={e.id}
              data-hp={hpShown(e)}
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
                  <Bar value={hpShown(e)} max={e.maxHp} kind="hp" />
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
                      // Several struck (作者 2026-10-25 ブラッシュアップ §3: 9個出ると重なって見づらい): the first cuts'
                      // numbers smaller, fainter and quicker still — the last cut's is the one to read.
                      className={`pb-float${tierOf(fx)}${final && followed ? ' finisher' : ''}${final ? (fx?.amounts ? ' stay' : '') : fx?.amounts ? ` cut flow${many ? ' many' : ''}` : ' cut'}`}
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
              {/* 魔防DOWN (《双極臨界》): said on each as the afterglow fades, after the release's own line (2026-10-30 F-5). */}
              {loweredOn(e.id) && collapse?.key === lastKey && (
                <span
                  key={`md${lastKey}`}
                  className="pb-float slow mdown"
                  data-testid="pb-float-mdown"
                  style={{
                    animationDelay: `${collapse.t.release + Math.round((fx?.hitStop ?? 0) * (fast ? 0.5 : 1)) + collapse.t.after}ms`,
                    translate: many ? `0 ${-18 * (i % 3)}px` : undefined,
                  }}
                >
                  MAGIC DOWN
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
              style={{
                ...footStyle(spot, FOOT_AT[m.id] ?? 0.5, FIGURE_SCALE[m.id] ?? 1),
                // 《双極臨界》: she stands before her circles; the rest of the field behind them (the light on her alone).
                ...(collapse && collapse.key === lastKey && last?.actor === m.id ? { ...collapseVars(collapse), zIndex: COLLAPSE_Z.caster } : {}),
              }}
              data-rim={collapse && collapse.key === lastKey && last?.actor === m.id ? 'yes' : undefined}
            >
              <span className="pb-shadow" aria-hidden="true" />
              {art.party[m.id]?.src && <img src={art.party[m.id].src!} alt={m.name} />}
              {/* 《双極臨界》: her eyes lit as her two circles are there together (作者 §8) — right gold, left blue, as drawn. */}
              {m.id === 'kaos' && collapse && collapse.key === lastKey && last?.actor === m.id && (
                <span className="pb-eyes" data-testid="pb-kaos-eyes" aria-hidden="true" style={collapseVars(collapse)}>
                  <i className="pb-eye gold" style={{ left: `${KAOS_EYES.gold.x}%`, top: `${KAOS_EYES.gold.y}%` }} />
                  <i className="pb-eye blue" style={{ left: `${KAOS_EYES.blue.x}%`, top: `${KAOS_EYES.blue.y}%` }} />
                </span>
              )}
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
        {collapse && collapse.key === lastKey && collapseOnField(collapse, 'over')}
        {collapse && collapse.key === lastKey && collapseOnField(collapse, 'front')}
      </div>

      {/* A MOVE WITH A CUT-IN (作者 実機 2026-10-24: 「カメラワークが‼️って感じではない」): as the camera
          gets there and the blow lands, speed lines rush in on the one struck. */}
      {followed && !fx?.collapse && (
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
            ['--petals' as string]: `url(${SPECIAL_FX_ART.heroPetals})`,
          }}
        >
          <span className="pb-bloom-dark" />
          {/* The third cut: a white flash, once and short (作者 2026-10-26 §8: 0.05〜0.1秒・3撃目のみ) — and out
              of it the ground splits. */}
          <span className="pb-bloom-white" data-testid="pb-bloom-white" />
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
          {petalsOf('mid')}
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
          {petalsOf('drift')}
        </span>
      )}

      {/* 《双極臨界》's release — the white flash over everything, the HUD too (作者 §20: once, 0.05〜0.1秒). The rest of it
          is on the field, moving with the camera (collapseOnField). */}
      {collapse && collapse.key === lastKey && (
        <span key={`clw${lastKey}`} className="pb-cl-flash" aria-hidden="true" style={collapseVars(collapse)}>
          {/* The light turned over for a moment (v2 §28: 一瞬の光反転), and the white flash. */}
          <span className="pb-cl-invert" data-testid="pb-collapse-invert" />
          <span
            className="pb-cl-white"
            data-testid="pb-collapse-white"
            onAnimationStart={(e) => {
              if (e.animationName !== 'pb-cl-white' || collapseCue.current?.key !== collapse.key) return;
              collapseCue.current.hold();
              collapseCue.current.land?.();
            }}
          />
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
            <VBar value={hpShown(focused)} max={focused.maxHp} />
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
          <span className="pb-num" data-testid="pb-enemy-hp" data-hp={hpShown(focused)}>
            {hpShown(focused)}
            <small>/{focused.maxHp}</small>
          </span>
          <span className={`pb-break-label${broken ? ' on' : ''}`}>BREAK</span>
          {/* Its 防御DOWN / 速度DOWN beside it, out on the field's side — never inside, where they made the
              narrow plate as wide as their words (作者 実機 2026-10-25: 縦型ステータスバーが大きくて邪魔). */}
          {(broken || focused.slowTurns > 0 || magicDownShown) && (
            <div className="pb-upright-status">
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
              {magicDownShown && (
                <span className="pb-mdown-badge" data-testid="pb-mdown-badge" data-turns={focused.magicDownTurns}>
                  魔防DOWN 残り{focused.magicDownTurns}
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="pb-enemy-plate" data-testid="pb-enemy-plate" data-focus={focused.id} data-boss={focused.boss ? 'yes' : undefined}>
        <span className="pb-enemy-name">{focused.name}</span>
        <span className="pb-num" data-testid="pb-enemy-hp" data-hp={hpShown(focused)}>
          {hpShown(focused)}/{focused.maxHp}
        </span>
        <Bar value={hpShown(focused)} max={focused.maxHp} kind="hp" />
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
        {magicDownShown && (
          <span className="pb-mdown-badge" data-testid="pb-mdown-badge" data-turns={focused.magicDownTurns}>
            魔防DOWN 残り{focused.magicDownTurns}
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
          {logLine}
        </p>
      </div>

      {/* BOTTOM RIGHT — the command cross; a list opens beside it. */}
      {state.outcome !== 'ONGOING' && resultShown ? (
        state.outcome === 'VICTORY' ? (
          // Won: the result over the fight, as a fight of one's is (作者 2026-10-30 v2) — the field blurred
          // behind, her bust on the left where she fought, 「勝利！」 and つぎへ in the small panel.
          <ResultOver face={wonFace} heroName={members.find((m) => m.id === 'hero')?.name ?? ''} testId="pb-result-over">
            {resultBox}
          </ResultOver>
        ) : (
          resultBox
        )
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
            <button
              className="pb-dia left"
              data-testid="pb-cmd-skills"
              // Her finisher (charged by turns) ready: スキル glows (作者 §READY時の発光).
              data-ready={acting && skills.some((k) => k.charge !== undefined && partySkillReady(acting, k)) ? 'yes' : 'no'}
              disabled={!playerInput || skills.length + techs.length === 0}
              onClick={() => toggle('SKILL')}
              aria-pressed={menu === 'SKILL'}
            >
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
                    <button
                      key={sk.id}
                      className={`pb-list-btn${sk.charge !== undefined && partySkillReady(acting!, sk) ? ' ready' : ''}`}
                      data-testid={`pb-cmd-skill-${sk.id}`}
                      disabled={!partySkillReady(acting!, sk)}
                      onClick={() => aimEnemy((target) => ({ kind: 'SKILL', skillId: sk.id, target }), 'SKILL')}
                    >
                      {sk.name}
                      {fresh.includes(sk.id) && <NewBadge testId={`pb-skill-new-${sk.id}`} />}
                      <Wait left={skillWaitLeft(acting!, sk)} />
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
                {/* Her finisher, charged by her turns (作者 2026-10-26): 3 → 2 → 1 → READY, and after it 4 → … → READY. */}
                {!m.down &&
                  (m.skills ?? [])
                    .filter((k) => k.charge !== undefined)
                    .map((k) => {
                      const left = skillWaitLeft(m, k);
                      return (
                        <span key={k.id} className="pb-charge" data-testid={`pb-charge-${m.id}`} data-left={left} data-ready={left === 0 ? 'yes' : 'no'} title={`《${k.name}》`}>
                          {left === 0 ? '必殺 READY' : `必殺 あと${left}`}
                        </span>
                      );
                    })}
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
