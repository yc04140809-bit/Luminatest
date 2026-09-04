import { useState } from 'react';
import type { World } from '../core/world/world';
import { toAbsoluteDay } from '../core/time/calendar';
import { memoryEventLabel } from '../content/events/creatureLifeChoice';
import { SCENARIO_PRESETS } from './presets';
import { buildGaldLifeArchive } from '../core/archive/lifeArchive';
import type { PlaytestFeedbackService } from '../core/playtest/playtestService';
import { DevPlaytestPanel } from './DevPlaytestPanel';
import { DevReviewHub } from './DevReviewHub';
import {
  debugChaosIntervention,
  debugEncounterType,
  debugEnemyAction,
  debugStoryTrigger,
  setDebugChaosIntervention,
  setDebugEncounterType,
  setDebugEnemyAction,
  setDebugStoryTrigger,
} from './debugEncounter';
import type { ChaosInterventionId } from '../core/chaos/chaosIntervention';
import { CHAOS_INTERVENTIONS } from '../content/chaos/chaosInterventions';
import type { DiscoveryCategory } from '../game/exploration/discovery';
import type { EnemyAction } from '../game/battle/battleLogic';
import { MOSS_RABBIT } from '../content/enemies/species';
import {
  battleUi,
  setBattleUi,
  setStartFinishable,
  startFinishable,
  type BattleUiChoice,
} from './battleUiFlag';
import { storyTriggerChance } from '../core/enemies/enemyEncounters';

interface Props {
  /** Opens the battle UI prototype on its own, for a look. */
  onOpenBattlePrototype: () => void;
  world: World;
  /** Feedback layer — read here for analysis only, never fed into the world. */
  playtest: PlaytestFeedbackService;
  onBack: () => void;
}

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.2em',
  color: 'var(--accent)',
  margin: '18px 0 8px',
};

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 };

const smallBtn: React.CSSProperties = { fontSize: 13, padding: '10px 12px', flex: '1 1 40%' };

/**
 * DEV ADMIN — observes and drives the EXISTING game systems only.
 * Every button goes through official World APIs (resetWorld,
 * recordGaldLifeChoice, advanceDays, timeShift, devResetGaldScenario);
 * there is no second game logic here.
 */
export function DevAdminScreen({ world, playtest, onBack, onOpenBattlePrototype }: Props) {
  const [busy, setBusy] = useState(false);
  // What the next arrival in the forest will turn out to be. Reading it
  // here is what makes each of the three routes testable rather than
  // waited for; the player never sees this, in any build they can reach.
  const [forced, setForced] = useState<DiscoveryCategory | null>(() => debugEncounterType());
  const [enemyAction, setEnemyAction] = useState<EnemyAction | null>(() => debugEnemyAction());
  const [storyTrigger, setStoryTrigger] = useState<boolean | null>(() => debugStoryTrigger());
  const [chaos, setChaos] = useState<ChaosInterventionId | null>(() => debugChaosIntervention());
  const rabbit = world.getEnemyProgress(MOSS_RABBIT.speciesId);
  // Which battle screen the forest fight uses. Nothing is adopted: this
  // is a switch, and OLD is what a player without it always gets.
  const [ui, setUi] = useState<BattleUiChoice>(() => battleUi());
  const [finishable, setFinishable] = useState(() => startFinishable());
  const [status, setStatus] = useState<string>('');
  const [confirming, setConfirming] = useState<'SCENARIO' | 'WORLD' | null>(null);
  // The hub is a mode of the admin screen, not a new route: it is read
  // only, it is reached from here, and 「もどる」 comes straight back.
  const [showHub, setShowHub] = useState(false);

  const run = async (label: string, op: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await op();
      setStatus(`完了: ${label}`);
    } catch (e) {
      console.error(`DEV ADMIN op failed: ${label}`, e);
      setStatus(`失敗: ${label} — ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  if (showHub) return <DevReviewHub world={world} onBack={() => setShowHub(false)} />;

  const clock = world.getClock();
  const gald = world.getCharacter('GALD');
  const choice = world.getGaldLifeChoice() ?? 'NONE';
  const events = world.getEvents();

  return (
    <div className="screen" data-testid="dev-admin-screen">
      <div className="screen-title">DEV ADMIN — TEST CONTROL PANEL</div>
      <div className="location-list" style={{ gap: 6 }}>
        {/* ---- REVIEW HUB ---- */}
        <button
          className="btn"
          data-testid="dev-review-hub-entry"
          style={{ marginBottom: 4 }}
          onClick={() => setShowHub(true)}
        >
          DEV REVIEW HUB / QA REPORT
        </button>

        {/* ---- DASHBOARD ---- */}
        <div style={sectionTitle}>DASHBOARD</div>
        <div className="location-card" data-testid="dev-clock">
          <div className="location-desc">
            WORLD CLOCK: {clock.worldYear}年目 {clock.worldDay}日目（通算 {toAbsoluteDay(clock)}
            日目）
          </div>
        </div>
        <div className="location-card" data-testid="dev-gald">
          <div className="location-desc">
            GALD — age: {gald?.age} / alive: {String(gald?.alive)} / occupation:{' '}
            {gald?.occupation} / location: {gald?.location}
          </div>
        </div>
        <div className="location-card" data-testid="dev-choice">
          <div className="location-desc">PLAYER CHOICE: {choice}</div>
        </div>

        {/* ---- TIME CONTROL ---- */}
        <div style={sectionTitle}>TIME CONTROL</div>
        <div style={row}>
          <button className="btn" style={smallBtn} data-testid="time-plus-1d" disabled={busy}
            onClick={() => run('+1 DAY', () => world.advanceDays(1))}>
            +1 DAY
          </button>
          <button className="btn" style={smallBtn} data-testid="time-plus-3d" disabled={busy}
            onClick={() => run('+3 DAYS', () => world.advanceDays(3))}>
            +3 DAYS
          </button>
          <button className="btn" style={smallBtn} data-testid="time-plus-1y" disabled={busy}
            onClick={() => run('+1 YEAR', () => world.timeShift(1))}>
            +1 YEAR
          </button>
          <button className="btn" style={smallBtn} data-testid="time-plus-3y" disabled={busy}
            onClick={() => run('+3 YEARS', () => world.timeShift(3))}>
            +3 YEARS
          </button>
        </div>

        {/* ---- SCENARIO PRESET ---- */}
        <div style={sectionTitle}>SCENARIO PRESET</div>
        <div style={row}>
          {SCENARIO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className="btn"
              style={smallBtn}
              data-testid={`preset-${preset.id}`}
              disabled={busy}
              onClick={() => run(preset.label, () => preset.run(world))}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* ---- RESET ---- */}
        <div style={sectionTitle}>RESET</div>
        {confirming === null && (
          <div style={row}>
            <button className="btn" style={smallBtn} data-testid="reset-scenario-button"
              disabled={busy} onClick={() => setConfirming('SCENARIO')}>
              RESET SCENARIO
            </button>
            <button className="btn" style={smallBtn} data-testid="reset-world-button"
              disabled={busy} onClick={() => setConfirming('WORLD')}>
              RESET WORLD
            </button>
          </div>
        )}
        {confirming === 'SCENARIO' && (
          <div className="location-card">
            <div className="location-desc" style={{ marginBottom: 10 }}>
              ガルド関連の選択・イベント・状態を初期化し、シナリオを再テスト可能にします。
              （時計とその他の正史は保持されます）
            </div>
            <div style={row}>
              <button className="btn" style={smallBtn} data-testid="confirm-reset-scenario"
                disabled={busy}
                onClick={() => run('RESET SCENARIO', () => world.devResetGaldScenario())}>
                RESET
              </button>
              <button className="btn" style={smallBtn} data-testid="cancel-reset"
                disabled={busy} onClick={() => setConfirming(null)}>
                キャンセル
              </button>
            </div>
          </div>
        )}
        {confirming === 'WORLD' && (
          <div className="location-card">
            <div className="location-desc" style={{ marginBottom: 10 }}>
              世界の記憶をすべて初期化します。
              <br />
              この操作は元に戻せません。
            </div>
            <div style={row}>
              <button className="btn" style={smallBtn} data-testid="confirm-reset-world"
                disabled={busy} onClick={() => run('RESET WORLD', () => world.resetWorld())}>
                RESET
              </button>
              <button className="btn" style={smallBtn} data-testid="cancel-reset"
                disabled={busy} onClick={() => setConfirming(null)}>
                キャンセル
              </button>
            </div>
          </div>
        )}

        {status && (
          <div className="location-desc" data-testid="dev-status" style={{ padding: '4px 2px' }}>
            {status}
          </div>
        )}

        {/* ---- LIFE ARCHIVE DEBUG ---- */}
        <div style={sectionTitle}>LIFE ARCHIVE DEBUG — GALD</div>
        {(() => {
          // Same pure projection: full truth in, canon chapters out; the
          // player projection tells us which of them are actually known.
          const truth = buildGaldLifeArchive(events);
          const known = world.getLifeArchive().find((e) => e.characterId === 'GALD');
          const knownIds = new Set(known?.chapters.map((c) => c.id) ?? []);
          if (!truth) {
            return <div className="location-desc">まだガルドの章はありません。</div>;
          }
          return (
            <>
              {truth.chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="location-card"
                  data-testid={`dev-archive-${chapter.id}`}
                >
                  <div className="location-desc">
                    [{knownIds.has(chapter.id) ? 'KNOWN' : 'UNKNOWN'}] {chapter.id}
                    <br />
                    title: {chapter.title} / {chapter.worldYear}年目 {chapter.worldDay}日目
                    <br />
                    source: {chapter.sourceEventTypes.join(', ')} ({chapter.sourceEventIds.join(', ')})
                  </div>
                </div>
              ))}
              <div className="location-desc" data-testid="dev-archive-unknown-state">
                player view: {known ? known.chapters.length : 0} known chapter(s) / unknown
                continuation card: {String(known?.hasUnknownContinuation ?? false)}
              </div>
            </>
          );
        })()}

        {/* ---- NARRATIVE SEEDS ---- */}
        {/* Loose threads, and whether the player is carrying them yet.
            Derived, never stored — and never world canon. */}
        <div style={sectionTitle}>NARRATIVE SEEDS</div>
        {world.getNarrativeSeeds().map((seed) => (
          <div
            key={seed.def.seedId}
            className="location-card"
            data-testid={`dev-seed-${seed.def.seedId}`}
          >
            <div className="location-desc">
              [{seed.state}] {seed.def.seedId}
              <br />
              title: {seed.def.title} / playerKnown: {String(seed.playerKnown)}
              <br />
              source: {seed.def.sourceEventId}
              {seed.def.relatedCharacters.length > 0 && ` / ${seed.def.relatedCharacters.join(', ')}`}
            </div>
          </div>
        ))}

        {/* ---- PLAYTEST FEEDBACK ---- */}
        <div style={sectionTitle}>PLAYTEST FEEDBACK</div>
        <DevPlaytestPanel service={playtest} />

        {/* ---- DEBUG EVENT VIEWER ---- */}
        <div style={sectionTitle}>EVENT TIMELINE</div>
        {events.length === 0 ? (
          <div className="location-desc">イベントはまだありません。</div>
        ) : (
          events.map((event, i) => (
            <div key={event.id}>
              {i > 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>↓</div>
              )}
              <div className="location-card" data-testid={`dev-event-${event.type}`}>
                <div className="location-name" style={{ fontSize: 14 }}>
                  {event.type}
                </div>
                <div className="location-desc">
                  {memoryEventLabel(event)}
                  <br />
                  {event.worldYear}年目 {event.worldDay}日目 / actors: {event.actors.join('、')} /{' '}
                  {event.importance}
                  {event.causedBy && event.causedBy.length > 0 && (
                    <>
                      <br />
                      causedBy: {event.causedBy.join(', ')}
                    </>
                  )}
                  <br />
                  createdAt: {event.createdAt}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div style={sectionTitle}>EXPLORATION — 次の発見を固定</div>
      <div style={row}>
        {(['EVENT', 'ITEM', 'BATTLE'] as DiscoveryCategory[]).map((category) => (
          <button
            key={category}
            className={forced === category ? 'btn primary' : 'btn'}
            style={smallBtn}
            data-testid={`force-encounter-${category}`}
            onClick={() => {
              setDebugEncounterType(category);
              setForced(category);
            }}
          >
            {category}
          </button>
        ))}
        <button
          className={forced === null ? 'btn primary' : 'btn'}
          style={smallBtn}
          data-testid="force-encounter-none"
          onClick={() => {
            setDebugEncounterType(null);
            setForced(null);
          }}
        >
          ランダム（既定）
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
        森の金色リングに到着したとき、何が出るかを固定します。設定は森に入り直すと反映されます。
      </div>

      <div style={sectionTitle}>BATTLE UI — 試作の切り替え（採用前）</div>
      <div style={row}>
        {(['OLD', 'PROTOTYPE'] as BattleUiChoice[]).map((choice) => (
          <button
            key={choice}
            className={ui === choice ? 'btn primary' : 'btn'}
            style={smallBtn}
            data-testid={`battle-ui-${choice}`}
            onClick={() => {
              setBattleUi(choice);
              setUi(choice);
            }}
          >
            {choice === 'OLD' ? '現行の戦闘画面' : '新戦闘画面（試作）'}
          </button>
        ))}
        <button
          className={finishable ? 'btn primary' : 'btn'}
          style={smallBtn}
          data-testid="battle-start-finishable"
          onClick={() => {
            setStartFinishable(!finishable);
            setFinishable(!finishable);
          }}
        >
          決着可能から開始 {finishable ? 'ON' : 'OFF'}
        </button>
      </div>
      <div style={row}>
        <button
          className="btn"
          style={{ ...smallBtn, flex: '1 1 100%' }}
          data-testid="open-battle-prototype"
          onClick={onOpenBattlePrototype}
        >
          試作をこの場で見る（世界を変えません）
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
        上のボタンなら森を歩かずに試作だけ見られます。世界には何も書き込みません。
        森の実戦で見る場合は「新戦闘画面（試作）」＋「次の発見を BATTLE に固定」。
        ガルド戦は常に現行画面のままです。MUGEN CHOICE は「特殊個体：必ず発生」で。
      </div>

      <div style={sectionTitle}>MOSS RABBIT — 敵の行動を固定</div>
      <div style={row}>
        {(['ATTACK', 'SKILL'] as EnemyAction[]).map((action) => (
          <button
            key={action}
            className={enemyAction === action ? 'btn primary' : 'btn'}
            style={smallBtn}
            data-testid={`force-enemy-${action}`}
            onClick={() => {
              setDebugEnemyAction(action);
              setEnemyAction(action);
            }}
          >
            {action === 'ATTACK' ? 'リーフタックル' : '苔かくれ'}
          </button>
        ))}
        <button
          className={enemyAction === null ? 'btn primary' : 'btn'}
          style={smallBtn}
          data-testid="force-enemy-none"
          onClick={() => {
            setDebugEnemyAction(null);
            setEnemyAction(null);
          }}
        >
          AIにまかせる
        </button>
      </div>

      <div style={sectionTitle}>CHAOS — 戦闘開始時の介入を固定</div>
      <div style={row}>
        {CHAOS_INTERVENTIONS.map((def) => (
          <button
            key={def.id}
            className={chaos === def.id ? 'btn primary' : 'btn'}
            style={smallBtn}
            data-testid={`force-chaos-${def.id}`}
            onClick={() => {
              setDebugChaosIntervention(def.id);
              setChaos(def.id);
            }}
          >
            {def.name}
          </button>
        ))}
        <button
          className={chaos === 'NONE' ? 'btn primary' : 'btn'}
          style={smallBtn}
          data-testid="force-chaos-NONE"
          onClick={() => {
            setDebugChaosIntervention('NONE');
            setChaos('NONE');
          }}
        >
          何もしない
        </button>
        <button
          className={chaos === null ? 'btn primary' : 'btn'}
          style={smallBtn}
          data-testid="force-chaos-random"
          onClick={() => {
            setDebugChaosIntervention(null);
            setChaos(null);
          }}
        >
          確率どおり
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
        新戦闘画面の戦闘開始時のみ。既定は約35%で4種のいずれか、残りは何も起きません。
      </div>

      <div style={sectionTitle}>MOSS RABBIT — 特殊個体の抽選</div>
      <div style={row}>
        <button
          className={storyTrigger === true ? 'btn primary' : 'btn'}
          style={smallBtn}
          data-testid="force-story-on"
          onClick={() => {
            setDebugStoryTrigger(true);
            setStoryTrigger(true);
          }}
        >
          必ず発生
        </button>
        <button
          className={storyTrigger === false ? 'btn primary' : 'btn'}
          style={smallBtn}
          data-testid="force-story-off"
          onClick={() => {
            setDebugStoryTrigger(false);
            setStoryTrigger(false);
          }}
        >
          発生させない
        </button>
        <button
          className={storyTrigger === null ? 'btn primary' : 'btn'}
          style={smallBtn}
          data-testid="force-story-none"
          onClick={() => {
            setDebugStoryTrigger(null);
            setStoryTrigger(null);
          }}
        >
          確率どおり
        </button>
      </div>
      <div
        style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}
        data-testid="moss-rabbit-progress"
      >
        撃破 {rabbit.defeated} 体 ／ 特殊個体なしの連続 {rabbit.sinceStory} 体 ／ 命名済み{' '}
        {rabbit.named} 体。次の勝利で特殊個体になる確率{' '}
        {Math.round(storyTriggerChance(rabbit.sinceStory + 1) * 100)}%。
      </div>

      <div className="screen-footer">
        <button className="btn" data-testid="dev-admin-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
