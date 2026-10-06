import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ambientLinesFor,
  markerAt,
  pointLine,
  pointsFor,
  type PaintingPoint,
  type WalkDiscovery,
  type WalkRoam,
  type WalkSceneDef,
  type WalkWorldView,
} from '@mugen/content/exploration/walkScene';
import type { SpriteFrame } from '@mugen/content/characters/explorationSprites';
import { walkerSprites, walkPainting, type WalkPlaceId, type Walkers } from '../../assets/walk';
import { playSfx } from '../../platform/audio';
import { WalkSprite } from './WalkSprite';
import { Ambience, Moment, pickAmbience, pickMoment, type MomentKind } from './Ambience';
import { PointMarker } from './PointMarker';
import { DEPTH, PAN, markTipY } from './walkPath';
import {
  FIND_MEMORY,
  FIND_WAIT_MS,
  FIND_WALK,
  KAOS_GAP,
  MAX_FINDS,
  MAX_NOTICED,
  NOTICE,
  REACH,
  SNAP,
  SPOT_MEMORY,
  alongTrail,
  depthScale,
  dist,
  pickFind,
  pickSpot,
  standBeside,
  toFloor,
} from './roam';

/**
 * A PLACE, WALKED ABOUT IN — the walk in two dimensions.
 *
 * The same screen as the walk along (`WalkScene`): the painting, light
 * and mist, the party on their own frames, the quiet moments, the words
 * at the top and 調べる at the bottom right. What differs is the ground:
 * a touch anywhere on the floor walks the party there — across, and back
 * into the picture or forward out of it, drawn smaller the farther back
 * they stand. Walls, pillars, the drop and the sky are not floor; a touch
 * there walks to the nearest floor.
 *
 * WHAT IS FOUND. The place's own things (the arch, the banner, the steps)
 * and SMALL FINDS that turn up on the floor while walking about. Nothing
 * shows its 「！」 until the party is near it; read, the 「！」 is gone for
 * good. A find read is not put back where it was: after some walking, a
 * new one turns up somewhere else, never more than two waiting — so the
 * place does not run out after its three things. Nothing found gives or
 * records anything: the world is read, never written, from this screen.
 */

/** Walking speed at the nearest floor, in screen widths a second; slower farther back. */
const WALK_SPEED = 0.3;
/** How long one walking frame is held. */
const FRAME_MS = 140;
/** The hero's height at the nearest floor, as a share of the screen's height. */
const HERO_HEIGHT = 0.4;
/** The hero's head-to-sole in his own frame's pixels (sole at 177, crown near 8). */
const HERO_SOURCE_HEIGHT = 169;
/** Kaos is drawn a little smaller than him. */
const KAOS_HEIGHT = 0.376;
/** No walker stands lower on the screen than this share of its height: the controls are below. */
const LOWEST_FEET = 0.9;
/** Walking this far again since the last line brings the next one. */
const SAY_WALK = 0.2;
const MOMENT_FIRST_MS: [number, number] = [5000, 9000];
const MOMENT_GAP_MS: [number, number] = [9000, 16000];

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

/** Something that can be looked at right now: one of the place's own, or a small find. */
interface Thing {
  id: string;
  kind: 'point' | 'find';
  label: string;
  /** Where it is looked at from. */
  stand: PaintingPoint;
  /** Where its 「！」 stands. */
  mark: PaintingPoint;
  text: string;
}

interface Find {
  find: WalkDiscovery;
  spot: number;
}

const fmt = (p: PaintingPoint) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;

export function RoamScene({
  scene,
  roam,
  place,
  view,
  events,
  onLeave,
  leaveLabel,
  leaveTestId,
}: {
  scene: WalkSceneDef;
  roam: WalkRoam;
  place: WalkPlaceId;
  view: WalkWorldView;
  events?: ReactNode;
  onLeave: () => void;
  leaveLabel: string;
  leaveTestId: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [painting, setPainting] = useState<string | null>(null);
  const [walkers, setWalkers] = useState<Walkers | null>(null);
  const calm = useMemo(prefersLessMotion, []);
  const { w, h } = size;

  // ---- where everything is drawn ----
  const paintW = w * (1 + PAN);
  const paintH = paintW / (1672 / 941);
  const paintTop = (h - paintH) * Math.min(1, Math.max(0, scene.framing ?? 1));
  /** The lowest painting height a walker may stand at on this screen. */
  const lowest = (LOWEST_FEET * h - paintTop) / paintH;

  // ---- the walk ----
  // In from the right edge, at the height of where they stop.
  const entry = { x: 1.04, y: roam.start.y };
  const [hero, setHero] = useState<PaintingPoint>(calm ? roam.start : entry);
  const heroNow = useRef<PaintingPoint>(calm ? roam.start : entry);
  const trail = useRef<PaintingPoint[]>([{ x: (calm ? roam.start.x : entry.x) + KAOS_GAP, y: roam.start.y }, heroNow.current]);
  const [kaos, setKaos] = useState<PaintingPoint>(trail.current[0]);
  const kaosNow = useRef<PaintingPoint>(trail.current[0]);
  const [target, setTarget] = useState<PaintingPoint | null>(calm ? null : roam.start);
  const [arrived, setArrived] = useState(calm);
  const [frame, setFrame] = useState(0);
  const [facing, setFacing] = useState<'left' | 'right'>('left');
  const [kaosFacing, setKaosFacing] = useState<'left' | 'right'>('left');
  const walking = target !== null;
  // How far walked since a find last turned up or was read, and since the last line.
  const walkedForFind = useRef(0);
  const walkedForWords = useRef(Infinity);
  const findAt = useRef(0);
  // Bumped on every arrival, so what happens on arriving runs once each time.
  const [arrivals, setArrivals] = useState(0);

  // ---- what is there ----
  const points = useMemo(() => pointsFor(scene, view), [scene]);
  const [read, setRead] = useState<ReadonlySet<string>>(new Set());
  const [finds, setFinds] = useState<readonly Find[]>([]);
  const recentFinds = useRef<string[]>([]);
  const recentSpots = useRef<number[]>([]);

  const things: Thing[] = useMemo(
    () => [
      ...points
        .filter((p) => !read.has(p.id))
        .map((p) => ({
          id: p.id,
          kind: 'point' as const,
          label: p.label,
          stand: toFloor(p.stand ?? p.at, roam.floor),
          mark: markerAt(p),
          text: pointLine(p, view) ?? '',
        })),
      ...finds.map(({ find, spot }) => ({
        id: find.id,
        kind: 'find' as const,
        label: find.label,
        stand: standBeside(roam.spots[spot], roam.floor),
        mark: roam.spots[spot],
        text: find.text,
      })),
    ],
    [points, read, finds, roam],
  );
  // In notice: what is near, and never more than the nearest two at once.
  const noticed = things
    .filter((t) => dist(hero, t.stand) < NOTICE)
    .sort((a, b) => dist(hero, a.stand) - dist(hero, b.stand))
    .slice(0, MAX_NOTICED);
  const atThing: Thing | null = !walking && arrived
    ? (noticed.filter((t) => dist(hero, t.stand) < REACH).sort((a, b) => dist(hero, a.stand) - dist(hero, b.stand))[0] ?? null)
    : null;

  // ---- what is noticed ----
  const ambient = useMemo(() => shuffle(ambientLinesFor(scene, view)), [scene]);
  const said = useRef(0);
  const [caption, setCaption] = useState<string | null>(null);
  const captionEl = useRef<HTMLParagraphElement>(null);
  const [wordsEnd, setWordsEnd] = useState(0);
  useLayoutEffect(() => {
    const el = captionEl.current;
    const at = host.current?.getBoundingClientRect().top ?? 0;
    setWordsEnd(el ? Math.ceil(el.getBoundingClientRect().bottom - at) + 4 : 0);
  }, [caption, size]);
  const picked = useMemo(() => (calm ? [] : pickAmbience(scene.ambience)), [scene, calm]);
  const [moment, setMoment] = useState<{ kind: MomentKind; n: number } | null>(null);
  const restingAtThing = useRef(false);
  restingAtThing.current = !!atThing;
  const [ring, setRing] = useState<{ x: number; y: number; n: number } | null>(null);
  const [tapped, setTapped] = useState(false);

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
    void walkerSprites().then((x) => !gone && setWalkers(x));
    return () => {
      gone = true;
    };
  }, [place]);

  /** Put a new small find somewhere else on the floor, if there is room for one. */
  const turnUp = (current: readonly Find[]): readonly Find[] => {
    if (current.length >= MAX_FINDS) return current;
    const find = pickFind(roam.discoveries, recentFinds.current, current.map((f) => f.find.id));
    if (!find) return current;
    const avoid = [
      ...points.filter((p) => !read.has(p.id)).map((p) => toFloor(p.stand ?? p.at, roam.floor)),
      ...current.map((f) => roam.spots[f.spot]),
    ];
    const spot = pickSpot(roam.spots, heroNow.current, avoid, [...recentSpots.current, ...current.map((f) => f.spot)]);
    if (spot === null) return current;
    recentSpots.current = [...recentSpots.current, spot].slice(-SPOT_MEMORY);
    walkedForFind.current = 0;
    findAt.current = performance.now();
    return [...current, { find, spot }];
  };

  // The walk itself: straight toward where was touched, a little slower farther back.
  useEffect(() => {
    if (!target) return;
    if (!walkers && !calm) return;
    if (calm) {
      const from = heroNow.current;
      heroNow.current = target;
      const behind = { x: target.x + (target.x < from.x ? KAOS_GAP : -KAOS_GAP), y: target.y };
      trail.current = [toFloor(behind, roam.floor), target];
      walkedForFind.current += dist(from, target);
      walkedForWords.current += dist(from, target);
      if (Math.abs(target.x - from.x) > 1e-4) setFacing(target.x < from.x ? 'left' : 'right');
      setKaosFacing(target.x < from.x ? 'left' : 'right');
      setHero(target);
      kaosNow.current = trail.current[0];
      setKaos(trail.current[0]);
      setTarget(null);
      setArrived(true);
      setArrivals((n) => n + 1);
      return;
    }
    if (Math.abs(target.x - heroNow.current.x) > 1e-4) setFacing(target.x < heroNow.current.x ? 'left' : 'right');
    let last = -1;
    let held = 0;
    let raf = 0;
    const step = (now: number) => {
      if (last < 0) last = now;
      const dt = Math.min(0.1, Math.max(0, now - last) / 1000);
      last = now;
      held += dt * 1000;
      if (held >= FRAME_MS) {
        held = 0;
        setFrame((f) => f + 1);
      }
      const from = heroNow.current;
      const scale = depthScale(from.y, roam.far, roam.near);
      // In screen pixels, so a step back into the picture is the same pace as one across.
      const dx = (target.x - from.x) * paintW;
      const dy = (target.y - from.y) * paintH;
      const left = Math.hypot(dx, dy);
      const stride = WALK_SPEED * w * scale * dt;
      const done = left <= stride || left < 0.5;
      const next = done ? target : { x: from.x + (dx / left) * (stride / paintW), y: from.y + (dy / left) * (stride / paintH) };
      const moved = dist(from, next);
      heroNow.current = next;
      walkedForFind.current += moved;
      walkedForWords.current += moved;
      const tr = trail.current;
      if (dist(tr[tr.length - 1], next) > 0.003) {
        tr.push(next);
        if (tr.length > 400) tr.splice(0, tr.length - 400);
      } else tr[tr.length - 1] = next;
      const k = alongTrail(tr, KAOS_GAP);
      if (Math.abs(k.x - kaosNow.current.x) > 1e-4) setKaosFacing(k.x < kaosNow.current.x ? 'left' : 'right');
      kaosNow.current = k;
      setKaos(k);
      setHero(next);
      if (done) {
        setTarget(null);
        setArrived(true);
        setArrivals((n) => n + 1);
      } else raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, !!walkers, calm, paintW, paintH]);

  // Arriving: something in reach, or a line noticed; and maybe a new find somewhere else.
  useEffect(() => {
    if (!arrived) return;
    if (arrivals <= 1 && finds.length === 0) setFinds((f) => turnUp(f));
    if (atThing) {
      playSfx('explore_marker');
    } else if (walkedForWords.current >= SAY_WALK && ambient.length > 0) {
      walkedForWords.current = 0;
      setCaption(ambient[said.current % ambient.length]);
      said.current += 1;
    }
    // Standing still, Kaos turns to face him.
    if (Math.abs(heroNow.current.x - kaosNow.current.x) > 0.01)
      setKaosFacing(heroNow.current.x < kaosNow.current.x ? 'left' : 'right');
    if (arrivals <= 1 || finds.length >= MAX_FINDS || walkedForFind.current < FIND_WALK) return;
    const wait = FIND_WAIT_MS - (performance.now() - findAt.current);
    if (wait <= 0) {
      setFinds((f) => turnUp(f));
      return;
    }
    const timer = window.setTimeout(() => setFinds((f) => turnUp(f)), wait);
    return () => window.clearTimeout(timer);
  }, [arrivals]);

  useEffect(() => {
    if (calm) return;
    let timer = 0;
    let clear = 0;
    const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);
    const schedule = (wait: number) => {
      timer = window.setTimeout(() => {
        if (!restingAtThing.current) {
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

  // The camera keeps him near the middle, within the painting.
  const heroPx = hero.x * paintW;
  const camX = Math.min(0, Math.max(w - paintW, w / 2 - heroPx));
  const toScreen = (p: PaintingPoint) => ({ x: p.x * paintW + camX, y: paintTop + p.y * paintH });

  /**
   * A TOUCH ON THE PLACE: walk there. Controls are their own. A touch on
   * the floor walks to that spot; one on a wall, a pillar or the sky
   * walks to the floor nearest it; one near a thing (or on it) walks to
   * where it is looked at from.
   */
  const onGround = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrived) return;
    if ((e.target as Element).closest('button, a, [role="button"]')) return;
    const box = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - box.left;
    const sy = e.clientY - box.top;
    const touched = { x: (sx - camX) / paintW, y: (sy - paintTop) / paintH };
    let to = toFloor({ x: touched.x, y: Math.min(touched.y, lowest) }, roam.floor);
    const meant = things
      .map((t) => ({ t, d: Math.min(dist(to, t.stand), dist(touched, t.mark)) }))
      .filter((c) => c.d < SNAP)
      .sort((a, b) => a.d - b.d)[0];
    if (meant) to = meant.t.stand;
    setTapped(true);
    setRing((r) => ({ x: sx, y: sy, n: (r?.n ?? 0) + 1 }));
    if (dist(to, heroNow.current) < 1e-4) return;
    setTarget(to);
  };

  const look = () => {
    if (!atThing) return;
    playSfx('explore_found');
    setCaption(atThing.text);
    if (atThing.kind === 'point') {
      setRead((r) => new Set(r).add(atThing.id));
    } else {
      recentFinds.current = [...recentFinds.current.filter((id) => id !== atThing.id), atThing.id].slice(-FIND_MEMORY);
      walkedForFind.current = 0;
      findAt.current = performance.now();
      setFinds((f) => f.filter((x) => x.find.id !== atThing.id));
    }
  };

  // ---- the party, drawn ----
  const heroScale = ((HERO_HEIGHT * h) / HERO_SOURCE_HEIGHT) * depthScale(hero.y, roam.far, roam.near);
  const kaosScale = walkers
    ? ((KAOS_HEIGHT * h) / walkers.kaos.referencePixels) * depthScale(kaos.y, roam.far, roam.near)
    : 1;
  const pick = (frames: { idle: SpriteFrame; walk: readonly SpriteFrame[] }, offset: number) =>
    walking && frames.walk.length > 0
      ? frames.walk[(((frame + offset) % frames.walk.length) + frames.walk.length) % frames.walk.length]
      : frames.idle;
  const bob = (offset: number) => (walking && !calm ? Math.abs(Math.sin(((frame + offset) * Math.PI) / 2)) * h * 0.008 : 0);
  const heroAt = toScreen(hero);
  const kaosAt = toScreen(kaos);

  return (
    <div
      ref={host}
      className={`screen walk roam ${calm ? 'walk-calm' : ''}`}
      data-testid="walk-scene"
      data-place={place}
      data-mode="roam"
      data-walking={walking ? 'yes' : 'no'}
      data-hero={fmt(hero)}
      data-scale={depthScale(hero.y, roam.far, roam.near).toFixed(3)}
      data-kaos={fmt(kaos)}
      data-kaos-scale={depthScale(kaos.y, roam.far, roam.near).toFixed(3)}
      data-view={`${camX.toFixed(2)},${paintW.toFixed(2)},${paintTop.toFixed(2)},${paintH.toFixed(2)}`}
      data-things={things.map((t) => `${t.kind}:${t.id}:${fmt(t.stand)}:${fmt(t.mark)}`).join(' ')}
      data-noticed={noticed.map((t) => t.id).join(' ')}
      data-read={[...read].join(' ')}
      data-ambient={picked.join(',')}
      data-moment={moment?.kind ?? ''}
      onPointerDown={onGround}
    >
      {/* THE PAINTING, with a faint glint wherever a small find is waiting. */}
      <div className="walk-layer walk-painting" style={{ width: paintW, transform: `translateX(${camX}px)` }}>
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
        {finds.map(({ find, spot }) => (
          <span
            key={`sign-${find.id}`}
            className="roam-sign"
            data-testid={`walk-sign-${find.id}`}
            style={{ left: roam.spots[spot].x * paintW, top: paintTop + roam.spots[spot].y * paintH }}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="walk-layer walk-light" style={{ transform: `translateX(${camX * DEPTH.light}px)` }} aria-hidden="true" />
      <div className="walk-layer walk-mist" style={{ transform: `translateX(${camX * DEPTH.mist}px)` }} aria-hidden="true" />

      {/* THE PARTY: whoever stands nearer is drawn over the other. */}
      {walkers && (
        <div className="walk-party" data-testid="walk-party">
          <div style={{ position: 'absolute', inset: 0, zIndex: Math.round(kaosAt.y) }}>
            <WalkSprite
              frame={pick(walkers.kaos.frames[kaosFacing], 2)}
              scale={kaosScale}
              feetX={kaosAt.x}
              feetY={kaosAt.y}
              bob={bob(2)}
              testId="walk-kaos"
              alt="ケイオス"
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, zIndex: Math.round(heroAt.y) + 1 }}>
            <WalkSprite
              frame={pick(walkers.hero.frames[facing], 0)}
              scale={heroScale}
              feetX={heroAt.x}
              feetY={heroAt.y}
              bob={bob(0)}
              testId="walk-hero"
              alt="主人公"
            />
          </div>
        </div>
      )}

      {/* 「！」 — only on what is near, over the party so nobody stands in front of it. */}
      <div className="walk-layer roam-marks" style={{ width: paintW, transform: `translateX(${camX}px)` }}>
        {noticed.map((t) => (
          <PointMarker
            key={`marker-${t.id}`}
            left={t.mark.x * paintW}
            top={markTipY(paintTop + t.mark.y * paintH, h, wordsEnd)}
            state={atThing?.id === t.id ? 'here' : 'near'}
            testId={`walk-marker-${t.id}`}
          />
        ))}
      </div>

      <Ambience picked={picked} />
      {moment && <Moment key={`moment-${moment.n}`} kind={moment.kind} />}

      <div className="walk-top">
        <h1 className="place walk-title">{scene.title}</h1>
        <button className="walk-leave" data-testid={leaveTestId} onClick={onLeave}>
          {leaveLabel}
        </button>
      </div>
      {caption && (
        <p ref={captionEl} className="walk-caption" data-testid="walk-caption" aria-live="polite">
          {caption}
        </p>
      )}
      <div className="walk-events" data-testid="walk-events">
        {events}
      </div>
      {ring && (
        <span
          key={`ring-${ring.n}`}
          className="walk-tap-ring"
          data-testid="walk-tap-ring"
          style={{ left: ring.x, top: ring.y }}
          aria-hidden="true"
        />
      )}
      {!tapped && arrived && (
        <p className="walk-hint" data-testid="walk-hint">
          地面をタップして歩く
        </p>
      )}
      <div className="walk-controls">
        {atThing && (
          <button
            className="btn primary walk-look"
            data-testid="walk-look"
            data-point={atThing.id}
            data-kind={atThing.kind}
            aria-label={`調べる：${atThing.label}`}
            onClick={look}
          >
            調べる
          </button>
        )}
      </div>
    </div>
  );
}
