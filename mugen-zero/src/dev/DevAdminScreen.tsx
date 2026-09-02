import { useState } from 'react';
import type { World } from '../core/world/world';
import { toAbsoluteDay } from '../core/time/calendar';
import { MEMORY_EVENT_LABEL } from '../content/events/galdLifeChoice';
import { SCENARIO_PRESETS } from './presets';
import { buildGaldLifeArchive } from '../core/archive/lifeArchive';
import type { PlaytestFeedbackService } from '../core/playtest/playtestService';
import { DevPlaytestPanel } from './DevPlaytestPanel';

interface Props {
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
export function DevAdminScreen({ world, playtest, onBack }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [confirming, setConfirming] = useState<'SCENARIO' | 'WORLD' | null>(null);

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

  const clock = world.getClock();
  const gald = world.getCharacter('GALD');
  const choice = world.getGaldLifeChoice() ?? 'NONE';
  const events = world.getEvents();

  return (
    <div className="screen" data-testid="dev-admin-screen">
      <div className="screen-title">DEV ADMIN — TEST CONTROL PANEL</div>
      <div className="location-list" style={{ gap: 6 }}>
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
                  {MEMORY_EVENT_LABEL[event.type]}
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
      <div className="screen-footer">
        <button className="btn" data-testid="dev-admin-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
