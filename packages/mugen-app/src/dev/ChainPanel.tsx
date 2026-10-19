import { useEffect, useState } from 'react';
import { World } from '@mugen/core/world/world';
import { IdbMemoryStore } from '@mugen/core/memory/idbStore';
import { bloomCheckAt, readWorldLife, WORLD_LIFE_RULES } from '@mugen/core/life/worldReading';
import { traceNpc } from '@mugen/core/life/engine';
import type { BloomCheck } from '@mugen/core/life/bloom';
import {
  GALD_BAKERY_ROUTE_DEFS,
  causalChainOf,
  type CausalStep,
} from '@mugen/content/events/offScreenLife';
import { GALD_FUTURE_VISION_YEARS } from '@mugen/content/events/galdLifeChoice';
import { APP_DB_NAME } from '../platform/save';
import { playTimes, sinceStart } from '../platform/playClock';

/**
 * THE BAKERY ROUTE'S CAUSAL CHAIN, FOR THE AUTHOR — DEBUG BUILDS ONLY
 * (`?tool=chain`, the title's DEBUG door; TIGS2027 STEP ①).
 *
 * Reads this phone's save and writes nothing: what has happened (WORLD
 * TRUTH, with the day and what it followed from), what the next step is
 * still waiting for (the bloom's reasons), what Kaos would show three years
 * on, what is left in each of the people around him, and how long this play
 * took to reach the look ahead. Every number here is for the author's eyes;
 * nothing of it is ever drawn in play.
 */

const PEOPLE = ['GALD', 'LINA', 'RIZEL', 'ELNA', 'BAKERY_OWNER', 'ALDEN_GUARD', 'ALDEN_VILLAGE'];

interface Reading {
  choice: string | null;
  clock: string;
  truth: CausalStep[];
  next: { type: string; check: BloomCheck | null } | null;
  future: CausalStep[];
  futureGald: string;
  people: string[][];
}

async function readSave(): Promise<Reading | null> {
  const names = (await indexedDB.databases?.())?.map((d) => d.name) ?? [];
  if (!names.includes(APP_DB_NAME)) return null;
  const world = await World.open(new IdbMemoryStore(APP_DB_NAME));
  const events = world.getEvents();
  const clock = world.getClock();
  const happened = new Set(events.map((e) => e.type));
  const nextDef = world.getGaldLifeChoice() === 'HELP' ? GALD_BAKERY_ROUTE_DEFS.find((d) => !happened.has(d.type)) : undefined;
  const future = world.previewLifeEvents(GALD_FUTURE_VISION_YEARS);
  const gald = world.previewCharacterStates(GALD_FUTURE_VISION_YEARS).GALD;
  const life = readWorldLife(events, clock);
  return {
    choice: world.getGaldLifeChoice(),
    clock: `Y${clock.worldYear} D${clock.worldDay}`,
    truth: causalChainOf(events),
    next: nextDef ? { type: nextDef.type, check: nextDef.bloom ? bloomCheckAt(nextDef.bloom, events, clock) : null } : null,
    future: causalChainOf(future),
    futureGald: gald ? `${gald.location} / ${gald.occupation}` : '—',
    people: PEOPLE.map((id) => traceNpc(life, WORLD_LIFE_RULES, id).filter((l) => /^(──|SEED|VINE)/.test(l))),
  };
}

const at = (s: CausalStep) => `Y${s.worldYear}D${s.worldDay}`;

function Chain({ steps, testId }: { steps: CausalStep[]; testId: string }) {
  if (steps.length === 0) return <p style={DIM}>（まだ何も起きていない）</p>;
  return (
    <ol data-testid={testId} style={{ margin: 0, paddingLeft: 20 }}>
      {steps.map((s) => (
        <li key={s.type} data-testid={`${testId}-${s.chainCode}`}>
          <b>{s.chainCode}</b> <span style={DIM}>{at(s)} ← {s.causedBy.join(', ')}</span>
          <div style={DIM}>
            {s.links.map((l) => `${l.from.join('・')} ${l.kind} ${l.to}`).join(' ／ ')}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ChainPanel() {
  const [reading, setReading] = useState<Reading | null | 'loading'>('loading');
  const times = playTimes();
  useEffect(() => {
    readSave()
      .then(setReading)
      .catch((e) => {
        console.warn('The chain panel could not read the save', e);
        setReading(null);
      });
  }, []);

  return (
    <div data-testid="chain-panel" style={PAGE}>
      <h1 style={{ fontSize: 16, margin: '0 0 8px' }}>DEBUG パン屋ルート 因果連鎖</h1>
      <button style={BACK} onClick={() => window.location.assign(window.location.pathname)}>
        タイトルへ
      </button>

      <h2 style={H2}>試遊の経過時間（はじめから）</h2>
      <p data-testid="chain-panel-times">
        四択まで {sinceStart(times, 'CHOICE') ?? '—'} ／ TIME SHIFT まで {sinceStart(times, 'VISION') ?? '—'} ／
        現在へもどる {sinceStart(times, 'BACK') ?? '—'}
      </p>

      {reading === 'loading' && <p>読み込み中…</p>}
      {reading === null && <p>この端末にセーブがありません。</p>}
      {reading && reading !== 'loading' && (
        <>
          <p>
            選択 <b data-testid="chain-panel-choice">{reading.choice ?? '—'}</b> ／ 今 {reading.clock}
          </p>

          <h2 style={H2}>起きたこと（WORLD TRUTH）</h2>
          <Chain steps={reading.truth} testId="chain-truth" />

          <h2 style={H2}>次の一歩が待っているもの</h2>
          {reading.next ? (
            <div data-testid="chain-next">
              <b>{reading.next.type}</b>
              {reading.next.check?.reasons.map((r) => (
                <div key={r.requirement} style={{ color: r.met ? '#9fe0a0' : '#ffb38a' }}>
                  {r.met ? '✓' : '·'} {r.requirement}: {r.detail}
                </div>
              ))}
            </div>
          ) : (
            <p style={DIM}>（パン屋ルートの世界ではないか、もう全部起きた）</p>
          )}

          <h2 style={H2}>3年後の見通し（TIME SHIFT が見せるもの・書き込まない）</h2>
          <Chain steps={reading.future} testId="chain-future" />
          <p>
            3年後のガルド <b data-testid="chain-panel-future-gald">{reading.futureGald}</b>
          </p>

          <h2 style={H2}>人に残っているもの（種・ツル）</h2>
          {reading.people.map((lines) => (
            <pre key={lines[0]} style={PRE}>
              {lines.join('\n')}
            </pre>
          ))}
        </>
      )}
    </div>
  );
}

const PAGE = {
  minHeight: '100vh',
  boxSizing: 'border-box',
  padding: '12px 16px 48px',
  background: '#120d08',
  color: '#f2e6cc',
  font: '12px/1.5 system-ui, sans-serif',
  overflowY: 'auto',
} as const;
const H2 = { fontSize: 13, margin: '14px 0 4px', color: '#ffd76a' } as const;
const DIM = { color: '#b9a98a' } as const;
const PRE = { whiteSpace: 'pre-wrap', margin: '4px 0', font: '11px/1.4 ui-monospace, monospace' } as const;
const BACK = {
  minHeight: 32,
  padding: '4px 12px',
  border: '1px solid #e0b84a',
  borderRadius: 16,
  background: 'rgba(60, 20, 0, 0.85)',
  color: '#ffd76a',
} as const;
