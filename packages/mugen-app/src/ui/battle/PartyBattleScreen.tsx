import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ENEMY_ID,
  castable,
  createPartyBattle,
  currentActor,
  enemyAct,
  memberById,
  partyAct,
  partyAutoAction,
  partySkillReady,
  upcomingTurns,
  type PartyAction,
  type PartyBattleState,
  type PartyMember,
  type PartyMemberSpec,
} from '@mugen/game/battle/partyBattle';
import type { EnemySpec } from '@mugen/game/battle/battleLogic';
import type { MagicDef } from '@mugen/core/magic/magic';
import type { BattleBackgroundKey } from '@mugen/assets/keys';
import type { ArtBox } from '@mugen/core/art/artStates';
import { battleEnemyArt, battlePartyArt, type BattlePartyId } from './battleArt';
import { battleBackgroundArt } from '../../assets/battleBackground';
import { playSfx } from '../../platform/audio';
import './partyBattle.css';

/**
 * THE PARTY FIGHT'S SCREEN (戦闘方式 B, 2026-10-12): everyone their own
 * health and their own turn (game/battle/partyBattle.ts).
 *
 * Built for a phone held sideways down to 640×300, and for being read at a
 * glance rather than scrolled:
 *
 *   top      the TURN ORDER (faces, the one acting first, marked) · the
 *            creature's name and HP
 *   middle   the creature on the left, the party on the right (each
 *            figure dimmed when down; the one acting forward)
 *   bottom   left: the last line said, and the acting member's commands
 *            (or the spells, or 「誰に？」 for a heal);
 *            right: every member's HP, always — Kaos's MP under hers,
 *            always (a thin bar and the number, never a toggle that
 *            changes while it is being read); the one acting marked.
 *
 * AUTO and ×2 sit with the commands. Nothing here is saved: whoever starts
 * the fight decides what its end means (`onEnd`).
 */

export interface PartyBattleProps {
  members: readonly PartyMemberSpec[];
  enemy: EnemySpec & { speed?: number };
  /** The creature's drawing (battleArt's enemy id). */
  enemyArtId: string;
  background?: BattleBackgroundKey | null;
  autoAvailable?: boolean;
  /** The fight is over and its result read: who won, and how they stand. */
  onEnd: (result: { outcome: 'VICTORY' | 'DEFEAT'; members: readonly PartyMember[] }) => void;
  /** The dice, for a test. */
  rng?: () => number;
}

const ENEMY_TURN_MS = 700;
const AUTO_TURN_MS = 450;

/** A head cut from a drawing by its face box, in a round frame. */
function Face({ src, box, testId, actor, acting }: { src: string | null; box?: ArtBox; testId: string; actor: string; acting: boolean }) {
  const style = box
    ? {
        width: `${(box.fileW / box.width) * 100}%`,
        height: `${(box.fileH / box.height) * 100}%`,
        left: `${(-box.x / box.width) * 100}%`,
        top: `${(-box.y / box.height) * 100}%`,
      }
    : undefined;
  return (
    <div className={`pb-face${acting ? ' acting' : ''}${actor === ENEMY_ID ? ' foe' : ''}`} data-testid={testId} data-actor={actor}>
      {src && <img src={src} alt="" aria-hidden="true" style={style} />}
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

export function PartyBattleScreen({ members, enemy, enemyArtId, background = null, autoAvailable = true, onEnd, rng }: PartyBattleProps) {
  const dice = rng ?? Math.random;
  const [state, setState] = useState<PartyBattleState>(() => createPartyBattle(members, enemy));
  const [auto, setAuto] = useState(false);
  const [fast, setFast] = useState(false);
  const [menu, setMenu] = useState<'COMMANDS' | 'MAGIC' | 'TARGET'>('COMMANDS');
  const [aiming, setAiming] = useState<MagicDef | null>(null);
  const [bg, setBg] = useState<string | null>(null);
  const ended = useRef(false);
  const actor = currentActor(state);
  const acting = actor && actor !== ENEMY_ID ? memberById(state, actor) : undefined;

  useEffect(() => {
    if (!background) return;
    let gone = false;
    void battleBackgroundArt(background).then((src) => !gone && setBg(src));
    return () => {
      gone = true;
    };
  }, [background]);

  const art = useMemo(() => {
    const party: Record<string, { src: string | null; face?: ArtBox }> = {};
    for (const m of members) {
      const a = battlePartyArt(m.id as BattlePartyId, 'battle_idle').asset;
      party[m.id] = { src: a?.src ?? null, face: a?.face };
    }
    const foe = battleEnemyArt(enemyArtId, 'front').asset;
    return { party, enemy: { src: foe?.src ?? null, face: foe?.face } };
  }, [members, enemyArtId]);

  const act = (action: PartyAction) => {
    const next = partyAct(state, action, dice);
    if (next === state) return;
    const beat = next.last;
    if (beat?.kind === 'MEND') playSfx('battle_heal');
    else if (beat?.kind === 'MAGIC') playSfx('magic_cast');
    else if (beat?.kind === 'DEFEND') playSfx('battle_guard');
    else playSfx('battle_attack_slash');
    setMenu('COMMANDS');
    setAiming(null);
    setState(next);
  };

  // The creature's turn, and AUTO's: played after a breath (halved at ×2).
  useEffect(() => {
    if (state.outcome !== 'ONGOING' || !actor) return;
    const ms = (actor === ENEMY_ID ? ENEMY_TURN_MS : AUTO_TURN_MS) / (fast ? 2 : 1);
    if (actor === ENEMY_ID) {
      const t = window.setTimeout(() => {
        setState((s) => {
          const next = enemyAct(s, dice);
          if (next !== s) playSfx('battle_damage');
          return next;
        });
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

  const order = upcomingTurns(state, 6);
  const faceOf = (id: string) => (id === ENEMY_ID ? art.enemy : (art.party[id] ?? { src: null }));
  const last = state.last;
  const lastKey = state.log.length;
  const spells = acting ? (acting.magic ?? []).filter((m) => m.effect === 'DAMAGE' || m.effect === 'MEND') : [];
  const canCast = acting ? castable(acting) : [];
  const pickSpell = (spell: MagicDef) => {
    if (spell.effect === 'MEND') {
      setAiming(spell);
      setMenu('TARGET');
      return;
    }
    act({ kind: 'MAGIC', magicId: spell.id });
  };
  const playerInput = !!acting && !auto && state.outcome === 'ONGOING';

  return (
    <div
      className="screen pb-screen"
      data-testid="pb-screen"
      data-actor={actor ?? ''}
      data-outcome={state.outcome}
      data-round={state.round}
    >
      {bg && <img className="pb-bg" src={bg} alt="" aria-hidden="true" />}

      {/* TOP — the order of turns, and the creature. */}
      <div className="pb-top">
        <div className="pb-order" data-testid="pb-turn-order" aria-label="TURN ORDER">
          <span className="pb-order-label">TURN</span>
          {order.map((id, i) => (
            <Face key={`${state.round}-${state.at}-${i}`} src={faceOf(id).src} box={faceOf(id).face} testId={`pb-turn-slot-${i}`} actor={id} acting={i === 0} />
          ))}
        </div>
        <div className="pb-enemy-plate" data-testid="pb-enemy-plate">
          <span className="pb-enemy-name">{state.enemy.name}</span>
          <Bar value={state.enemy.hp} max={state.enemy.maxHp} kind="hp" />
          <span className="pb-num" data-testid="pb-enemy-hp" data-hp={state.enemy.hp}>
            {state.enemy.hp}/{state.enemy.maxHp}
          </span>
        </div>
      </div>

      {/* MIDDLE — the creature left, the party right. */}
      <div className="pb-field">
        <div className={`pb-foe${actor === ENEMY_ID ? ' acting' : ''}`}>
          {art.enemy.src && <img src={art.enemy.src} alt={state.enemy.name} data-testid="pb-enemy-art" />}
          {last && last.target === ENEMY_ID && last.amount > 0 && (
            <span key={lastKey} className="pb-float">
              {last.amount}
            </span>
          )}
        </div>
        <div className="pb-party">
          {state.members.map((m, i) => (
            <div
              key={m.id}
              className={`pb-figure pb-figure-${i}${m.down ? ' down' : ''}${actor === m.id ? ' acting' : ''}`}
              data-testid={`pb-figure-${m.id}`}
            >
              {art.party[m.id]?.src && <img src={art.party[m.id].src!} alt={m.name} />}
              {last && last.target === m.id && last.amount > 0 && (
                <span key={lastKey} className={`pb-float${last.kind === 'MEND' ? ' heal' : ''}`}>
                  {last.kind === 'MEND' ? `+${last.amount}` : last.amount}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM — what was said and what to do; everyone's health. */}
      <div className="pb-bottom">
        <div className="pb-act">
          <p className="pb-log" data-testid="pb-log" role="status">
            {state.log[state.log.length - 1]}
          </p>
          {state.outcome !== 'ONGOING' ? (
            <div className="pb-result" data-testid="pb-result" data-outcome={state.outcome}>
              <b>{state.outcome === 'VICTORY' ? '勝利！' : '敗北……'}</b>
              <button
                className="pb-cmd primary"
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
              {acting && <span className="pb-who" data-testid="pb-acting">{acting.name}</span>}
              {playerInput && menu === 'COMMANDS' && (
                <>
                  <button className="pb-cmd primary" data-testid="pb-cmd-attack" onClick={() => act({ kind: 'ATTACK' })}>
                    こうげき
                  </button>
                  {(acting!.skills ?? []).map((s) => (
                    <button
                      key={s.id}
                      className="pb-cmd"
                      data-testid={`pb-cmd-skill-${s.id}`}
                      disabled={!partySkillReady(acting!, s)}
                      onClick={() => act({ kind: 'SKILL', skillId: s.id })}
                    >
                      {s.name}
                    </button>
                  ))}
                  {spells.length > 0 && (
                    <button className="pb-cmd" data-testid="pb-cmd-magic" onClick={() => setMenu('MAGIC')}>
                      まほう
                    </button>
                  )}
                  <button className="pb-cmd" data-testid="pb-cmd-defend" onClick={() => act({ kind: 'DEFEND' })}>
                    ぼうぎょ
                  </button>
                </>
              )}
              {playerInput && menu === 'MAGIC' && (
                <>
                  {spells.map((s) => (
                    <button
                      key={s.id}
                      className="pb-cmd"
                      data-testid={`pb-magic-${s.id}`}
                      disabled={!canCast.includes(s)}
                      onClick={() => pickSpell(s)}
                    >
                      {s.name}
                      <small>{s.mpCost}</small>
                    </button>
                  ))}
                  <button className="pb-cmd back" data-testid="pb-cmd-back" onClick={() => setMenu('COMMANDS')}>
                    もどる
                  </button>
                </>
              )}
              {playerInput && menu === 'TARGET' && aiming && (
                <>
                  <span className="pb-ask">誰に？</span>
                  {state.members
                    .filter((m) => !m.down)
                    .map((m) => (
                      <button
                        key={m.id}
                        className="pb-cmd"
                        data-testid={`pb-target-${m.id}`}
                        onClick={() => act({ kind: 'MAGIC', magicId: aiming.id, target: m.id })}
                      >
                        {m.name}
                      </button>
                    ))}
                  <button className="pb-cmd back" data-testid="pb-cmd-back" onClick={() => setMenu('MAGIC')}>
                    もどる
                  </button>
                </>
              )}
              <span className="pb-chips">
                {autoAvailable && (
                  <button className={`pb-chip${auto ? ' on' : ''}`} data-testid="pb-auto" aria-pressed={auto} onClick={() => setAuto((a) => !a)}>
                    AUTO
                  </button>
                )}
                <button className={`pb-chip${fast ? ' on' : ''}`} data-testid="pb-speed" aria-pressed={fast} onClick={() => setFast((f) => !f)}>
                  ×2
                </button>
              </span>
            </div>
          )}
        </div>

        <div className="pb-members" data-testid="pb-members">
          {state.members.map((m) => (
            <div
              key={m.id}
              className={`pb-member${actor === m.id ? ' acting' : ''}${m.down ? ' down' : ''}${menu === 'TARGET' && !m.down ? ' aimable' : ''}`}
              data-testid={`pb-member-${m.id}`}
              data-hp={m.hp}
              data-max={m.maxHp}
              data-down={m.down ? 'yes' : 'no'}
              data-acting={actor === m.id ? 'yes' : 'no'}
            >
              <span className="pb-member-name">
                {actor === m.id && <i aria-hidden="true">▶</i>}
                {m.name}
              </span>
              <span className="pb-member-bars">
                <Bar value={m.hp} max={m.maxHp} kind="hp" />
                {m.maxMp > 0 && <Bar value={m.mp} max={m.maxMp} kind="mp" />}
              </span>
              <span className="pb-member-nums">
                {m.down ? (
                  <span className="pb-down" data-testid={`pb-member-${m.id}-down`}>
                    戦闘不能
                  </span>
                ) : (
                  <span className="pb-num">
                    {m.hp}/{m.maxHp}
                  </span>
                )}
                {m.maxMp > 0 && (
                  <span className="pb-num mp" data-testid={`pb-member-${m.id}-mp`} data-mp={m.mp}>
                    MP {m.mp}/{m.maxMp}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
