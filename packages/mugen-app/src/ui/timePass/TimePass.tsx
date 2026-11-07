import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { elapsedDays, type WorldClock } from '@mugen/core/time/calendar';
import { playSfx } from '../../platform/audio';
import { flipDates, ticksAt, timePassFrame, timePassTimes, TIME_PASS_MS } from './timePass';
import './timePass.css';

/**
 * 時が流れる — the clock over the screen while a night passes (timePass.ts has the frames).
 *
 * Over everything, and nothing on it but the clock and the date. A tap anywhere is the end of it at once: the
 * new date, and the screen behind it. The light comes back only once the night has been kept by the world
 * (`ready`); until then the new date is held.
 *
 * Its sounds are the moments' own (`story_time_tick` as the minute hand passes each quarter, `story_time_bell` as the
 * new date is set): silent until their files are put in the folder.
 */
export function TimePass({
  from,
  days,
  ready,
  onDark,
  onDone,
}: {
  from: WorldClock;
  days: number;
  ready: boolean;
  /** The screen is wholly dark (or skipped to the end): the night may be kept now, unseen. */
  onDark?: () => void;
  onDone: () => void;
}) {
  const [t, setT] = useState(0);
  const [outFrom, setOutFrom] = useState<number | null>(null);
  const [skipped, setSkipped] = useState(false);
  const heard = useRef({ ticks: 0, bell: false });
  const done = useRef(false);
  const darkened = useRef(false);
  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = () => {
      setT(performance.now() - start);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const times = timePassTimes(days);
  useEffect(() => {
    if (!darkened.current && (skipped || t >= TIME_PASS_MS.dark)) {
      darkened.current = true;
      onDark?.();
    }
    if (skipped) {
      if (ready) finish();
      return;
    }
    if (outFrom === null && ready && t >= times.outAt) setOutFrom(t);
    if (outFrom !== null && t >= outFrom + TIME_PASS_MS.out) finish();
  }, [t, ready, skipped, outFrom, times.outAt, finish, onDark]);

  const dates = flipDates(from, days);
  const frame = timePassFrame(t, days, outFrom, skipped);

  // The sounds, each once as its moment is passed (never on a skip).
  useEffect(() => {
    if (skipped) return;
    const ticks = ticksAt(frame.minuteDeg);
    if (ticks > heard.current.ticks) {
      heard.current.ticks = ticks;
      playSfx('story_time_tick');
    }
    if (!heard.current.bell && frame.step === dates.length - 1 && frame.stepIn >= 0.5) {
      heard.current.bell = true;
      playSfx('story_time_bell');
    }
  });

  const shown = dates[frame.step];
  const before = dates[Math.max(0, frame.step - 1)];
  return (
    <div
      className="time-pass"
      data-testid="time-pass"
      data-step={frame.step}
      data-days={days}
      role="presentation"
      style={{ opacity: frame.veil }}
      onPointerDown={() => setSkipped(true)}
    >
      <div
        className="tp-sky"
        style={{ opacity: frame.clock, background: `linear-gradient(180deg, ${frame.sky.top} 0%, ${frame.sky.foot} 100%)` }}
      />
      <div className="tp-center" style={{ opacity: frame.clock }}>
        <div className="tp-dial">
          {/* A faint swirl of light behind the clock, turning with the hands. */}
          <div className="tp-swirl" style={{ transform: `rotate(${frame.minuteDeg * 0.35}deg)` }} />
          <ClockFace minuteDeg={frame.minuteDeg} hourDeg={frame.hourDeg} />
        </div>
        <p className="tp-date" data-testid="time-pass-date" data-year={shown.worldYear} data-day={shown.worldDay}>
          <Flip value={shown.worldYear} was={before.worldYear} k={frame.stepIn} />
          <span className="tp-unit">年目</span>
          <Flip value={shown.worldDay} was={before.worldDay} k={frame.stepIn} />
          <span className="tp-unit">日目</span>
        </p>
      </div>
    </div>
  );
}

/** A thin gold ring and its marks, nothing written on it; a gold hour hand, a white minute hand. */
function ClockFace({ minuteDeg, hourDeg }: { minuteDeg: number; hourDeg: number }) {
  return (
    <svg className="tp-clock" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="92" className="tp-ring" />
      <circle cx="100" cy="100" r="86" className="tp-ring-in" />
      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        return (
          <line
            key={i}
            x1="100"
            y1={major ? 15 : 17}
            x2="100"
            y2={major ? 27 : 21}
            className={major ? 'tp-mark tp-mark-major' : 'tp-mark'}
            transform={`rotate(${i * 6} 100 100)`}
          />
        );
      })}
      <line x1="100" y1="112" x2="100" y2="56" className="tp-hand tp-hour" transform={`rotate(${hourDeg} 100 100)`} />
      <line x1="100" y1="116" x2="100" y2="30" className="tp-hand tp-minute" transform={`rotate(${minuteDeg} 100 100)`} />
      <circle cx="100" cy="100" r="4.2" className="tp-pin" />
    </svg>
  );
}

/** A number turning over to the next, as a flap does: the old one away at the top, the new one down into place. */
function Flip({ value, was, k }: { value: number; was: number; k: number }) {
  if (value === was || k >= 1) {
    return (
      <span className="tp-flip">
        <span className="tp-num">{value}</span>
      </span>
    );
  }
  const away = Math.min(1, k * 2);
  const down = Math.max(0, k * 2 - 1);
  return (
    <span className="tp-flip" data-turning="">
      {/* Holds the width of the wider of the two. */}
      <span className="tp-num tp-hold">{String(value).length >= String(was).length ? value : was}</span>
      {away < 1 && (
        <span className="tp-num tp-face" style={{ transform: `rotateX(${away * 90}deg)` }}>
          {was}
        </span>
      )}
      {down > 0 && (
        <span className="tp-num tp-face" style={{ transform: `rotateX(${-90 + down * 90}deg)` }}>
          {value}
        </span>
      )}
    </span>
  );
}

/**
 * Where the night is shown from: `run(from, days, keep)` — the clock before, the days it is to move on, and
 * the world's keeping of it (resolving to the clock after; one that has not moved closes it at once). The
 * keeping is begun once the screen is wholly dark (`onDark`), so the screen behind is never seen moving on
 * before the clock has shown it. `overlay` goes over everything.
 */
export function useTimePass(): { run: (from: WorldClock, days: number, keep: () => Promise<WorldClock | null>) => void; overlay: ReactNode } {
  const [pass, setPass] = useState<{ key: number; from: WorldClock; days: number; ready: boolean } | null>(null);
  const seq = useRef(0);
  const keeping = useRef<(() => void) | null>(null);
  const run = useCallback((from: WorldClock, days: number, keep: () => Promise<WorldClock | null>) => {
    if (days <= 0 || timePassOff()) {
      void keep();
      return;
    }
    const key = ++seq.current;
    const close = () => setPass((p) => (p?.key === key ? null : p));
    keeping.current = () => {
      keeping.current = null;
      void keep().then((to) => {
        const moved = to ? elapsedDays(from, to) : 0;
        if (moved <= 0) return close();
        setPass((p) => (p?.key === key ? { ...p, days: moved, ready: true } : p));
      }, close);
    };
    setPass({ key, from, days, ready: false });
  }, []);
  const overlay = pass && (
    <TimePass
      key={pass.key}
      from={pass.from}
      days={pass.days}
      ready={pass.ready}
      onDark={() => keeping.current?.()}
      onDone={() => setPass((p) => (p?.key === pass.key ? null : p))}
    />
  );
  return { run, overlay };
}

/**
 * The dev server's tests rest many times and go straight on, as they always have: a cookie
 * (`mugen_dev_time_pass=off`, set for the whole suite by playwright.config) leaves the clock out. DEV only —
 * a build never reads it.
 */
export function timePassOff(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return document.cookie.split('; ').includes('mugen_dev_time_pass=off');
  } catch {
    return false;
  }
}
