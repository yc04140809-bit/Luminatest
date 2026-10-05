import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ambientLinesFor,
  figuresFor,
  pointLine,
  pointsFor,
  type WalkPoint,
  type WalkSceneDef,
  type WalkWorldView,
} from '@mugen/content/exploration/walkScene';
import type { SpriteFrame } from '@mugen/content/characters/explorationSprites';
import { walkerSprites, walkPainting, type WalkPlaceId, type Walkers } from '../../assets/walk';
import { sceneArt } from '../../assets/sceneArt';
import { playSfx } from '../../platform/audio';
import { WalkSprite } from './WalkSprite';
import { Ambience, Moment, NearFoliage, pickAmbience, pickMoment, type MomentKind } from './Ambience';
import { DEPTH, PAN, glintStrength, heroX, layerShift, nextStop, stopFor, stopsFor } from './walkPath';

/**
 * A PLACE, WALKED — the App's exploration template.
 *
 * One screen, walked right to left, stop to stop. Layers, back to front:
 *
 *   the painting      the place itself, wider than the screen, sliding
 *                     behind the party as the camera follows them
 *   light and mist    sliding slower than the painting — farther off
 *   points, figures   on the painting, so they stay on what they name
 *   the party         the hero and Kaos, walking their own frames
 *   ambience          birds, leaves, motes — some, picked per visit
 *   near foliage      out of focus, sliding faster — nearest of all
 *   the controls      the place's name, what is noticed, 調べる when
 *                     something is in reach, and the place's own events
 *
 * WHAT THE PLACE SAYS COMES FROM ITS DEFINITION (`walkScene.ts`), asked
 * against what the player knows. Walking, stopping and looking record
 * nothing anywhere: the world is read, never written, from this screen.
 * The place's events — a fight, a story — are handed in by the caller
 * and leave by the caller's own doors, exactly as before.
 */

/** Width of the walk, in t, crossed per second. */
const WALK_SPEED = 0.34;
/** How long the party takes to walk in from the right edge. */
const ENTER_MS = 900;
/** How long one walking frame is held. */
const FRAME_MS = 140;
/** The ground the party walks on, as a share of the screen's height from the top. */
const FEET_Y = 0.8;
/** The hero's height, head to sole, as a share of the screen's height. */
const HERO_HEIGHT = 0.4;
/** The hero's head-to-sole in his own frame's pixels (sole at 177, crown near 8). */
const HERO_SOURCE_HEIGHT = 169;
/** Kaos is drawn a little smaller than him, as she is in the Artifact's forest. */
const KAOS_HEIGHT = 0.376;
/** How far behind him (to his right) she walks, as a share of the screen's height. */
const KAOS_BEHIND = 0.18;
/** The first quiet moment comes after this long, then one every so often. */
const MOMENT_FIRST_MS: [number, number] = [5000, 9000];
const MOMENT_GAP_MS: [number, number] = [9000, 16000];
/** A distant figure's height, as a share of the screen's height. */
const FIGURE_HEIGHT = 0.2;

function prefersLessMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function shuffle<T>(xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function WalkScene({
  scene,
  place,
  view,
  events,
  onLeave,
  leaveLabel,
  leaveTestId = 'leave-forest',
}: {
  scene: WalkSceneDef;
  place: WalkPlaceId;
  /** What the player knows, and the day — asked by every condition. */
  view: WalkWorldView;
  /** The place's own doors (a fight, a story), drawn as quiet choices. */
  events?: ReactNode;
  onLeave: () => void;
  leaveLabel: string;
  /** The way out's test id — the forest's, unless the place has its own. */
  leaveTestId?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [painting, setPainting] = useState<string | null>(null);
  const [walkers, setWalkers] = useState<Walkers | null>(null);
  const [figureArt, setFigureArt] = useState<string | null>(null);
  const calm = useMemo(prefersLessMotion, []);

  // ---- the walk itself ----
  // Only the things that are there in this world (a trace can be gone).
  const points = useMemo(() => pointsFor(scene, view), [scene]);
  const stops = useMemo(() => stopsFor(points.map((p) => p.at.x)), [points]);
  const [t, setT] = useState(0);
  const tNow = useRef(0);
  const [target, setTarget] = useState(0);
  const [entering, setEntering] = useState(calm ? 0 : 1);
  const [frame, setFrame] = useState(0);
  const walking = Math.abs(target - t) > 1e-4;

  // ---- what is noticed ----
  const ambient = useMemo(() => shuffle(ambientLinesFor(scene, view)), [scene]);
  const [said, setSaid] = useState(0);
  const [caption, setCaption] = useState<string | null>(null);
  const [looked, setLooked] = useState<string | null>(null);
  const picked = useMemo(() => (calm ? [] : pickAmbience(scene.ambience)), [scene, calm]);
  const figures = useMemo(() => figuresFor(scene, view), [scene]);
  // A QUIET MOMENT now and then — a leaf passing, the light shifting, a
  // bird's shadow far off. One at a time, never constant, decoration only.
  const [moment, setMoment] = useState<{ kind: MomentKind; n: number } | null>(null);
  const restingAtPoint = useRef(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth || window.innerWidth, h: el.clientHeight || window.innerHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let gone = false;
    void walkPainting(place).then((src) => !gone && setPainting(src));
    void walkerSprites().then((w) => !gone && setWalkers(w));
    if (figures.some((f) => f.id === 'GALD')) void sceneArt('gald', 'fullbody').then((src) => !gone && setFigureArt(src));
    return () => {
      gone = true;
    };
  }, [place]);

  // Walking in from the right edge — once there is somebody to see doing
  // it — then the first thing noticed.
  useEffect(() => {
    if (!walkers && entering > 0) return;
    if (entering <= 0) {
      if (caption === null) {
        setCaption(ambient[0] ?? null);
        setSaid(1);
      }
      return;
    }
    // Timed from the first frame's own clock: a frame's timestamp can be
    // a little EARLIER than performance.now() read before it was asked for.
    let start = -1;
    let raf = 0;
    const step = (now: number) => {
      if (start < 0) start = now;
      const k = Math.min(1, Math.max(0, now - start) / ENTER_MS);
      setEntering(1 - k);
      setFrame(Math.floor(Math.max(0, now - start) / FRAME_MS));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [entering <= 0, !!walkers]);

  // Walking stop to stop.
  useEffect(() => {
    if (!walking) return;
    if (calm) {
      tNow.current = target;
      setT(target);
      return;
    }
    let last = -1;
    let held = 0;
    let raf = 0;
    const dir = Math.sign(target - tNow.current);
    const step = (now: number) => {
      if (last < 0) last = now;
      const dt = Math.min(0.1, Math.max(0, now - last) / 1000);
      last = now;
      held += dt * 1000;
      if (held >= FRAME_MS) {
        held = 0;
        setFrame((f) => f + 1);
      }
      const next = tNow.current + dir * WALK_SPEED * dt;
      const done = (dir > 0 && next >= target) || (dir < 0 && next <= target) || dir === 0;
      tNow.current = done ? target : next;
      setT(tNow.current);
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, walking, calm]);

  // Arriving somewhere: something in reach, or something noticed.
  const atPoint: WalkPoint | null = !walking && entering <= 0
    ? (points.find((p) => Math.abs(stopFor(p.at.x) - t) < 0.02) ?? null)
    : null;
  useEffect(() => {
    if (walking || entering > 0) return;
    if (atPoint) {
      playSfx('explore_marker');
      return;
    }
    if (t > 0 && ambient.length > 0) {
      setCaption(ambient[said % ambient.length]);
      setSaid((n) => n + 1);
    }
  }, [walking, atPoint?.id]);

  // The nearest thing ahead or behind, and how strongly it glints from here.
  const near = useMemo(() => {
    let best: { point: WalkPoint; strength: number } | null = null;
    for (const p of points) {
      const strength = glintStrength(t - stopFor(p.at.x));
      if (strength > 0 && (!best || strength > best.strength)) best = { point: p, strength };
    }
    return best;
  }, [points, t]);
  restingAtPoint.current = !!atPoint;

  useEffect(() => {
    if (calm) return;
    let timer = 0;
    let clear = 0;
    const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);
    const schedule = (wait: number) => {
      timer = window.setTimeout(() => {
        // Never over a thing being looked at: let that moment be its own.
        if (!restingAtPoint.current) {
          const kind = pickMoment();
          setMoment((m) => ({ kind, n: (m?.n ?? 0) + 1 }));
          clear = window.setTimeout(() => setMoment(null), 4200);
        }
        schedule(between(MOMENT_GAP_MS));
      }, wait);
    };
    schedule(between(MOMENT_FIRST_MS));
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clear);
    };
  }, [calm]);

  const go = (way: 'left' | 'right') => {
    if (walking || entering > 0) return;
    const to = nextStop(stops, t, way);
    if (to === null) return;
    setLooked(null);
    setTarget(to);
  };
  const look = () => {
    if (!atPoint) return;
    playSfx('explore_found');
    setLooked(atPoint.id);
    setCaption(pointLine(atPoint, view));
  };

  // ---- where everything is drawn, in pixels ----
  const { w, h } = size;
  const paintW = w * (1 + PAN);
  const paintH = paintW / (1672 / 941);
  // Cropped from the top and bottom in the proportion the place asks for.
  const paintTop = (h - paintH) * Math.min(1, Math.max(0, scene.framing ?? 1));
  const shift = (depth: number) => layerShift(t, depth) * w;
  const atPaint = (x: number, y: number) => ({ left: x * paintW, top: paintTop + y * paintH });

  const heroFeetX = (heroX(t) + entering * 0.3) * w;
  const feetY = FEET_Y * h;
  const heroScale = (HERO_HEIGHT * h) / HERO_SOURCE_HEIGHT;
  const kaosScale = walkers ? (KAOS_HEIGHT * h) / walkers.kaos.referencePixels : 1;
  const moving = walking || entering > 0;
  const pick = (frames: { idle: SpriteFrame; walk: readonly SpriteFrame[] }, offset: number) =>
    moving && frames.walk.length > 0
      ? frames.walk[(((frame + offset) % frames.walk.length) + frames.walk.length) % frames.walk.length]
      : frames.idle;
  const bob = (offset: number) => (moving && !calm ? Math.abs(Math.sin(((frame + offset) * Math.PI) / 2)) * h * 0.008 : 0);
  // Facing the way they walk: left, unless walking back to the right.
  const facing = target < t - 1e-4 ? 'right' : 'left';

  return (
    <div
      ref={host}
      className={`screen walk ${calm ? 'walk-calm' : ''}`}
      data-testid="walk-scene"
      data-place={scene.id}
      data-t={t.toFixed(3)}
      data-walking={moving ? 'yes' : 'no'}
      data-ambient={picked.join(',')}
      data-moment={moment?.kind ?? ''}
    >
      {/* THE PAINTING, and what stands on it. */}
      <div className="walk-layer walk-painting" style={{ width: paintW, transform: `translateX(${shift(DEPTH.painting)}px)` }}>
        {painting && (
          <img
            className="walk-painting-img"
            src={painting}
            alt=""
            aria-hidden="true"
            data-testid="walk-painting"
            style={{ width: paintW, height: paintH, top: paintTop }}
          />
        )}
        {figureArt &&
          figures.map((f) => (
            <img
              key={f.id}
              className="walk-figure"
              src={figureArt}
              alt=""
              aria-hidden="true"
              data-testid={`walk-figure-${f.id}`}
              style={{
                left: atPaint(f.at.x, f.at.y).left,
                top: atPaint(f.at.x, f.at.y).top - FIGURE_HEIGHT * h,
                height: FIGURE_HEIGHT * h,
              }}
            />
          ))}
        {near && (
          <span
            className={`walk-point ${looked === near.point.id ? 'is-looked' : ''} ${near.strength >= 0.999 ? 'is-here' : ''}`}
            data-testid={`walk-point-${near.point.id}`}
            data-strength={near.strength.toFixed(2)}
            style={{ ...atPaint(near.point.at.x, near.point.at.y), opacity: looked === near.point.id ? 0.35 : near.strength }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* LIGHT AND MIST, farther off than the painting's ground. */}
      <div className="walk-layer walk-light" style={{ transform: `translateX(${shift(DEPTH.light)}px)` }} aria-hidden="true" />
      <div className="walk-layer walk-mist" style={{ transform: `translateX(${shift(DEPTH.mist)}px)` }} aria-hidden="true" />

      {/* THE PARTY: Kaos a step behind him, both walking their own frames. */}
      {walkers && (
        <div className="walk-party" data-testid="walk-party">
          <WalkSprite
            frame={pick(walkers.kaos.frames[facing], 2)}
            scale={kaosScale}
            feetX={heroFeetX + (facing === 'left' ? 1 : -1) * KAOS_BEHIND * h}
            feetY={feetY}
            bob={bob(2)}
            testId="walk-kaos"
            alt="ケイオス"
          />
          <WalkSprite
            frame={pick(walkers.hero.frames[facing], 0)}
            scale={heroScale}
            feetX={heroFeetX}
            feetY={feetY}
            bob={bob(0)}
            testId="walk-hero"
            alt="主人公"
          />
        </div>
      )}

      <Ambience picked={picked} />
      {moment && <Moment key={moment.n} kind={moment.kind} />}

      {/* THE NEAREST LEAVES, sliding fastest. */}
      <div
        className="walk-layer walk-near"
        style={{ width: w * (1 + PAN * DEPTH.near), transform: `translateX(${shift(DEPTH.near)}px)` }}
        aria-hidden="true"
      >
        <NearFoliage />
      </div>

      {/* THE CONTROLS — as few as the moment needs. */}
      <div className="walk-top">
        <h1 className="place walk-title">{scene.title}</h1>
        <button className="walk-leave" data-testid={leaveTestId} onClick={onLeave}>
          {leaveLabel}
        </button>
      </div>
      {caption && (
        <p className="walk-caption" data-testid="walk-caption" aria-live="polite">
          {caption}
        </p>
      )}
      <div className="walk-events" data-testid="walk-events">
        {events}
      </div>
      <div className="walk-controls">
        {atPoint && (
          <button
            className="btn primary walk-look"
            data-testid="walk-look"
            data-point={atPoint.id}
            aria-label={`調べる：${atPoint.label}`}
            onClick={look}
          >
            調べる
          </button>
        )}
        <button
          className="walk-step"
          data-testid="walk-forward"
          aria-label="先へ進む"
          disabled={moving || nextStop(stops, t, 'left') === null}
          onClick={() => go('left')}
        >
          ◀
        </button>
        <button
          className="walk-step"
          data-testid="walk-back"
          aria-label="来た道を戻る"
          disabled={moving || nextStop(stops, t, 'right') === null}
          onClick={() => go('right')}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
