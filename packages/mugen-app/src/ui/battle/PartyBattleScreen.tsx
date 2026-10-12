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

/** What is on a member, short, for under their name. */
function statusChips(m: PartyMember): { key: string; label: string; title: string }[] {
  const out: { key: string; label: string; title: string }[] = [];
  if (m.guardTurns > 0) out.push({ key: 'guard', label: `月影 ${m.guardTurns}T`, title: `月影の構え 残り${m.guardTurns}T` });
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
      <div className="pb-bar-fill" style={{ width: `${share * 100}%` }} />
    </div>
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
  const [bg, setBg] = useState<string | null>(null);
  const ended = useRef(false);
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

  // BREAK: its sound, and the screen shakes a moment.
  useEffect(() => {
    if (!state.last?.broke) return;
    playBreakSfx();
    setShaking(true);
    const t = window.setTimeout(() => setShaking(false), SHAKE_MS);
    return () => window.clearTimeout(t);
  }, [state.log.length, state.last?.broke]);

  // The creature's turn, and AUTO's: played after a breath (halved at ×2).
  useEffect(() => {
    if (state.outcome !== 'ONGOING' || !actor) return;
    const ms = (isEnemyId(actor) ? ENEMY_TURN_MS : AUTO_TURN_MS) / (fast ? 2 : 1) + (state.last?.broke ? BREAK_PAUSE_MS : 0);
    if (isEnemyId(actor)) {
      const t = window.setTimeout(() => {
        const next = enemyAct(state, dice);
        if (next === state) return;
        const beat = next.last;
        if (beat?.missed) playSfx('battle_evade');
        else if (beat?.kind === 'ENEMY_ATTACK') playSfx('battle_damage');
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
  const lastKey = state.log.length;
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
  const giant = (scale ?? 'NORMAL') === 'GIANT';
  const bossFight = state.enemies.some((e) => e.boss);
  const toggle = (m: 'SKILL' | 'MAGIC') => setMenu((was) => (was === m ? 'COMMANDS' : m));
  const actingFace = acting ? faceOf(acting.id) : null;

  return (
    <div
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
      {bg && <img className="pb-bg" src={bg} alt="" aria-hidden="true" />}

      {/* THE FIELD — the creature left, the party right (a triangle). */}
      <div className="pb-field">
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
                <span key={lastKey} className="pb-float">
                  {last.amount}
                </span>
              )}
              {last?.counter !== undefined && last.actor === e.id && (
                <span key={`c${lastKey}`} className="pb-float counter" data-testid="pb-float-counter">
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
              {last && last.target === m.id && last.amount > 0 && (
                <span key={lastKey} className={`pb-float${last.kind === 'MEND' ? ' heal' : ''}`}>
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
        {last?.broke && (
          <span key={`b${lastKey}`} className="pb-break-flash" data-testid="pb-break-flash" aria-hidden="true">
            BREAK!!
          </span>
        )}
      </div>

      {/* TOP LEFT — the creature: name, HP, BREAK, together. */}
      <div className="pb-enemy-plate" data-testid="pb-enemy-plate" data-focus={focused.id}>
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
              data-hp={m.hp}
              data-max={m.maxHp}
              data-down={m.down ? 'yes' : 'no'}
              data-acting={actor === m.id ? 'yes' : 'no'}
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
