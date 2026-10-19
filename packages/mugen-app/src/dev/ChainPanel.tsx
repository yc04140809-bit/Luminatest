import { useEffect, useState } from 'react';
import { World } from '@mugen/core/world/world';
import { IdbMemoryStore } from '@mugen/core/memory/idbStore';
import { bloomCheckAt, readWorldLife, WORLD_LIFE_RULES } from '@mugen/core/life/worldReading';
import { traceNpc } from '@mugen/core/life/engine';
import type { BloomCheck } from '@mugen/core/life/bloom';
import type { MemoryEvent, OffScreenLifeEventType } from '@mugen/core/memory/types';
import {
  GALD_BAKERY_ROUTE_DEFS,
  LIFE_TICK_DEFS,
  OFF_SCREEN_EVENT_INFO,
  type CausalLink,
} from '@mugen/content/events/offScreenLife';
import { GALD_FUTURE_VISION_YEARS } from '@mugen/content/events/galdLifeChoice';
import { APP_DB_NAME } from '../platform/save';
import { playTimes, sinceStart } from '../platform/playClock';

/**
 * GALD'S LIFE CHAIN — THE BAKERY ROUTE'S ABOVE ALL — FOR THE AUTHOR, DEBUG BUILDS ONLY
 * (`?tool=chain`, the title's DEBUG door; TIGS2027 STEP ①).
 *
 * Whichever of the four answers was given, its chain is listed; the bakery
 * route (HELP) also says what its next step waits for.
 *
 * Reads this phone's save and writes nothing: what has happened (WORLD
 * TRUTH, with the day and what it followed from), what the next step is
 * still waiting for (the bloom's reasons), what Kaos would show three years
 * on, what is left in each of the people around him, and how long this play
 * took to reach the look ahead. Every number here is for the author's eyes;
 * nothing of it is ever drawn in play.
 */

const PEOPLE = ['GALD', 'LINA', 'RIZEL', 'ELNA', 'BAKERY_OWNER', 'ALDEN_GUARD', 'ALDEN_VILLAGE'];

/** One life event as this panel lists it: the bakery route's under its DEV name, the rest under their own. */
interface Step {
  type: string;
  code: string;
  worldYear: number;
  worldDay: number;
  causedBy: readonly string[];
  links: readonly CausalLink[];
}

/**
 * Every life event of Gald's answers, whichever was given — the bakery
 * route (HELP) and the other three answers' chains alike — in the order
 * they happened (the day, then the order they are written in).
 */
function lifeSteps(events: readonly MemoryEvent[]): Step[] {
  const order = new Map(LIFE_TICK_DEFS.map((def, i) => [def.type as string, i]));
  return events
    .filter((e) => order.has(e.type))
    .sort((a, b) => a.worldYear - b.worldYear || a.worldDay - b.worldDay || order.get(a.type)! - order.get(b.type)!)
    .map((e) => {
      const info = OFF_SCREEN_EVENT_INFO[e.type as OffScreenLifeEventType] as
        | (typeof OFF_SCREEN_EVENT_INFO)[OffScreenLifeEventType]
        | undefined;
      return {
        type: e.type,
        code: info?.chainCode ?? e.type,
        worldYear: e.worldYear,
        worldDay: e.worldDay,
        causedBy: e.causedBy ?? [],
        links: info?.links ?? [],
      };
    });
}

interface Reading {
  choice: string | null;
  clock: string;
  truth: Step[];
  next: { type: string; check: BloomCheck | null } | 'NOT_THIS_ROUTE' | 'ALL_DONE';
  future: Step[];
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
  const onRoute = world.getGaldLifeChoice() === 'HELP';
  const nextDef = onRoute ? GALD_BAKERY_ROUTE_DEFS.find((d) => !happened.has(d.type)) : undefined;
  const future = world.previewLifeEvents(GALD_FUTURE_VISION_YEARS);
  const gald = world.previewCharacterStates(GALD_FUTURE_VISION_YEARS).GALD;
  const life = readWorldLife(events, clock);
  return {
    choice: world.getGaldLifeChoice(),
    clock: `Y${clock.worldYear} D${clock.worldDay}`,
    truth: lifeSteps(events),
    next: nextDef
      ? { type: nextDef.type, check: nextDef.bloom ? bloomCheckAt(nextDef.bloom, events, clock) : null }
      : onRoute
        ? 'ALL_DONE'
        : 'NOT_THIS_ROUTE',
    future: lifeSteps(future),
    futureGald: gald ? `${gald.location} / ${gald.occupation}` : '—',
    people: PEOPLE.map((id) => traceNpc(life, WORLD_LIFE_RULES, id).filter((l) => /^(──|SEED|VINE)/.test(l))),
  };
}

const at = (s: Step) => `Y${s.worldYear}D${s.worldDay}`;

function Chain({ steps, testId, empty }: { steps: Step[]; testId: string; empty: string }) {
  if (steps.length === 0) return <p style={DIM}>{empty}</p>;
  return (
    <ol data-testid={testId} style={{ margin: 0, paddingLeft: 20 }}>
      {steps.map((s) => (
        <li key={s.type} data-testid={`${testId}-${s.code}`}>
          <b>{s.code}</b> <span style={DIM}>{at(s)} ← {s.causedBy.join(', ')}</span>
          {s.links.length > 0 && (
            <div style={DIM}>{s.links.map((l) => `${l.from.join('・')} ${l.kind} ${l.to}`).join(' ／ ')}</div>
          )}
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
      <h1 style={{ fontSize: 16, margin: '0 0 8px' }}>DEBUG ガルドの人生の連鎖（パン屋ルート＝治療する）</h1>
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
          <Chain steps={reading.truth} testId="chain-truth" empty="（まだ何も起きていない。宿で休んだ夜にだけ進む）" />

          <h2 style={H2}>次の一歩が待っているもの</h2>
          {reading.next === 'NOT_THIS_ROUTE' ? (
            <p style={DIM} data-testid="chain-next-none">（パン屋ルートは「治療する」を選んだ世界だけで進む）</p>
          ) : reading.next === 'ALL_DONE' ? (
            <p style={DIM} data-testid="chain-next-none">（パン屋ルートはもう全部起きた）</p>
          ) : (
            <div data-testid="chain-next">
              <b>{reading.next.type}</b>
              {reading.next.check?.reasons.map((r) => (
                <div key={r.requirement} style={{ color: r.met ? '#9fe0a0' : '#ffb38a' }}>
                  {r.met ? '✓' : '·'} {r.requirement}: {r.detail}
                </div>
              ))}
            </div>
          )}

          <h2 style={H2}>3年後の見通し（TIME SHIFT が見せるもの・書き込まない）</h2>
          <Chain steps={reading.future} testId="chain-future" empty="（今から3年のうちに起きることは、もう無い）" />
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
