import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ambientLinesFor,
  figuresFor,
  markerAt,
  pointLine,
  pointsFor,
  rollPickup,
  type PaintingPoint,
  type WalkDiscovery,
  type WalkPickup,
  type WalkRoam,
  type WalkSceneDef,
  type WalkWorldView,
} from '@mugen/content/exploration/walkScene';
import type { SpriteFrame } from '@mugen/content/characters/explorationSprites';
import { walkerSprites, walkPainting, type WalkPlaceId, type Walkers } from '../../assets/walk';
import { playSfx } from '../../platform/audio';
import { sceneArt } from '../../assets/sceneArt';
import { WalkSprite } from './WalkSprite';
import { Ambience, Moment, pickAmbience, pickMoment, type MomentKind } from './Ambience';
import { PointMarker } from './PointMarker';
import { DEPTH, PAN, markTipY } from './walkPath';
import { weaponDefOf } from '@mugen/content/equipment/equipment';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { notices } from '../common/noticeQueue';
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
  VISIT_COUNTS_AT,
  alongTrail,
  rollGrade,
  type FindGrade,
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
 * place does not run out after its three things. Small finds give and
 * record nothing.
 *
 * THINGS TO PICK UP (2026-10-07): a few fixed places (`roam.pickups`) with
 * something in them. Taken through `pickupKeeper` — into the bag and
 * marked taken in the save, once in a world — with a short notice of what
 * was got. A pickup shows only a faint glint until the party stands at it
 * (then its 「！」 and 調べる), so it never crowds the place's own things.
 * Taken, it is not drawn again.
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
/** … and never into the strip the place's own doors take along the bottom (in px). */
const DOORS_BAND = 64;
/** Walking this far again since the last line brings the next one. */
const SAY_WALK = 0.2;
/** A distant figure's height, as a share of the screen's height — as on the walk along. */
const FIGURE_HEIGHT = 0.2;
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

/** Something that can be looked at right now: one of the place's own, a small find, or a pickup. */
interface Thing {
  id: string;
  kind: 'point' | 'find' | 'pickup';
  /** How rare a find is; the place's own things are NORMAL. */
  grade: FindGrade;
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
  grade: FindGrade;
}

/**
 * WHAT A WALK KEEPS, handed in by whoever opened the world: how many
 * real visits the place has had before this one, whether its
 * once-in-a-world find is already taken, and the two writes — one more
 * real visit, and taking the find. `keeps` is false when nothing will
 * outlive the session (no save), which the screen says when it matters.
 */
export interface RoamKeeper {
  visitsBefore: number;
  rainbowTaken: boolean;
  keeps: boolean;
  recordVisit(): void;
  takeRainbow(): Promise<boolean>;
}

/**
 * WHAT THE SAVE KEEPS OF A PLACE'S PICKUPS: which are taken, and taking
 * one (the thing into the bag and the mark, in one write). Returns how
 * many went in the bag — nought is a refusal (no room), and the pickup
 * stays. Absent (no save): no pickups are shown at all.
 */
export interface PickupKeeper {
  taken: ReadonlySet<string>;
  take(pickupId: string, itemId: string, quantity: number): Promise<number>;
}

/** How near its glint a touch must be to walk to a pickup. */
const PICKUP_SNAP = 0.045;

/** How long the notice of what was picked up stays: an ordinary find, and a rare one. */
const GOT_MS = 2200;
const GOT_SPECIAL_MS = 2600;

/** Without a save: nothing is kept, and the rainbow may still be seen. */
const SESSION_ONLY: RoamKeeper = {
  visitsBefore: 0,
  rainbowTaken: false,
  keeps: false,
  recordVisit: () => {},
  takeRainbow: async () => true,
};

const fmt = (p: PaintingPoint) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;

/**
 * WHERE A WALK HAD GOT TO — kept by whoever holds the screen, so a walk
 * interrupted (a fight fled from) picks up exactly where it was: the
 * party standing where they stood, what was read still read, the finds
 * still waiting where they lay. The same visit, not a new one.
 */
export interface RoamMemory {
  hero: PaintingPoint;
  kaos: PaintingPoint;
  facing: 'left' | 'right';
  kaosFacing: 'left' | 'right';
  read: string[];
  finds: Find[];
  recentFinds: string[];
  recentSpots: number[];
  findsThisVisit: number;
  visitCounted: boolean;
  rainbowSeen: boolean;
  said: number;
  caption: string | null;
  captionGrade: FindGrade;
  tapped: boolean;
}

export function RoamScene({
  scene,
  roam,
  place,
  view,
  events,
  onLeave,
  leaveLabel,
  leaveTestId,
  keeper = SESSION_ONLY,
  forceGrade,
  memory,
  resume = false,
  pickupKeeper,
}: {
  scene: WalkSceneDef;
  roam: WalkRoam;
  place: WalkPlaceId;
  view: WalkWorldView;
  events?: ReactNode;
  onLeave: () => void;
  leaveLabel: string;
  leaveTestId: string;
  keeper?: RoamKeeper;
  /**
   * DEBUG ONLY: make finds this grade, to check them on a phone without
   * walking for an hour. RAINBOW still turns up only while it has not
   * been taken in this world — the rule being checked is never bent.
   */
  forceGrade?: 'RARE' | 'RAINBOW';
  /** Where this walk has got to, kept up to date here for whoever holds it. */
  memory?: { current: RoamMemory | null };
  /** Pick the walk up from `memory` instead of walking in afresh. */
  resume?: boolean;
  /** The save's side of the place's pickups. Absent (no save): no pickups are shown. */
  pickupKeeper?: PickupKeeper;
}) {
  // A walk picked up where it was left: no walking in, everything as it stood.
  const was = resume ? (memory?.current ?? null) : null;
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [painting, setPainting] = useState<string | null>(null);
  const [walkers, setWalkers] = useState<Walkers | null>(null);
  const [figureArt, setFigureArt] = useState<string | null>(null);
  const calm = useMemo(prefersLessMotion, []);
  // Figures seen far off, while the world says they are there (the man in the road).
  const figures = useMemo(() => figuresFor(scene, view), [scene]);
  const { w, h } = size;

  // ---- where everything is drawn ----
  const paintW = w * (1 + PAN);
  const paintH = paintW / (1672 / 941);
  const paintTop = (h - paintH) * Math.min(1, Math.max(0, scene.framing ?? 1));
  /**
   * The lowest painting height a walker may stand at on this screen —
   * higher still where the place has its own doors along the bottom
   * (the forest's), so nobody ever walks behind them.
   */
  const lowest = ((events ? Math.min(LOWEST_FEET * h, h - DOORS_BAND) : LOWEST_FEET * h) - paintTop) / paintH;

  // ---- the walk ----
  // In from the right edge, at the height of where they stop.
  const entry = { x: 1.04, y: roam.start.y };
  const firstAt = was ? was.hero : calm ? roam.start : entry;
  const [hero, setHero] = useState<PaintingPoint>(firstAt);
  const heroNow = useRef<PaintingPoint>(firstAt);
  const trail = useRef<PaintingPoint[]>(
    was ? [was.kaos, was.hero] : [{ x: (calm ? roam.start.x : entry.x) + KAOS_GAP, y: roam.start.y }, heroNow.current],
  );
  const [kaos, setKaos] = useState<PaintingPoint>(trail.current[0]);
  const kaosNow = useRef<PaintingPoint>(trail.current[0]);
  const [target, setTarget] = useState<PaintingPoint | null>(was || calm ? null : roam.start);
  const [arrived, setArrived] = useState(calm || !!was);
  const [frame, setFrame] = useState(0);
  const [facing, setFacing] = useState<'left' | 'right'>(was?.facing ?? 'left');
  const [kaosFacing, setKaosFacing] = useState<'left' | 'right'>(was?.kaosFacing ?? 'left');
  const walking = target !== null;
  // How far walked since a find last turned up or was read, and since the last line.
  const walkedForFind = useRef(0);
  const walkedForWords = useRef(Infinity);
  const findAt = useRef(0);
  // Bumped on every arrival, so what happens on arriving runs once each time.
  const [arrivals, setArrivals] = useState(0);

  // ---- what is there ----
  const points = useMemo(() => pointsFor(scene, view), [scene]);
  const [read, setRead] = useState<ReadonlySet<string>>(() => new Set(was?.read ?? []));
  const [finds, setFindsState] = useState<readonly Find[]>(was?.finds ?? []);
  // The same list, readable at once: finds are put down from effects and
  // timers, never from inside a state update, so nothing runs twice.
  const findsNow = useRef<readonly Find[]>(was?.finds ?? []);
  const setFinds = (next: readonly Find[]) => {
    findsNow.current = next;
    setFindsState(next);
  };
  const recentFinds = useRef<string[]>(was?.recentFinds ?? []);
  const recentSpots = useRef<number[]>(was?.recentSpots ?? []);
  // This visit: how many finds have turned up, whether it has counted as
  // a real visit yet, and whether the rainbow has turned up in it.
  const findsThisVisit = useRef(was?.findsThisVisit ?? 0);
  const visitCounted = useRef(was?.visitCounted ?? false);
  const rainbowSeen = useRef(was?.rainbowSeen ?? false);
  const [rainbowTaken, setRainbowTaken] = useState(keeper.rainbowTaken);
  const rainbowTakenNow = useRef(keeper.rainbowTaken);
  // The moment it is taken: a flash, then what it is.
  const [prize, setPrize] = useState<{ name: string; description: string; kept: boolean; n: number } | null>(null);
  const [captionGrade, setCaptionGrade] = useState<FindGrade>(was?.captionGrade ?? 'NORMAL');
  // The place's pickups still there: not taken in the save, nor this walk.
  // Only with a save to keep them: without one, nothing picked up could be
  // carried home, so none are shown (the DEBUG walk).
  const pickups: readonly WalkPickup[] = pickupKeeper ? (roam.pickups ?? []) : [];
  const [taken, setTaken] = useState<ReadonlySet<string>>(() => new Set(pickupKeeper?.taken ?? []));
  const takingPickup = useRef(false);

  const things: Thing[] = useMemo(
    () => [
      ...points
        .filter((p) => !read.has(p.id))
        .map((p) => ({
          id: p.id,
          kind: 'point' as const,
          grade: 'NORMAL' as const,
          label: p.label,
          stand: toFloor(p.stand ?? p.at, roam.floor),
          mark: markerAt(p),
          text: pointLine(p, view) ?? '',
        })),
      ...finds.map(({ find, spot, grade }) => ({
        id: find.id,
        kind: 'find' as const,
        grade,
        label: find.label,
        stand: standBeside(roam.spots[spot], roam.floor),
        mark: roam.spots[spot],
        text: find.text,
      })),
      ...pickups
        .filter((p) => !taken.has(p.id))
        .map((p) => ({
          id: p.id,
          kind: 'pickup' as const,
          grade: 'NORMAL' as const,
          label: p.label,
          stand: standBeside(p.at, roam.floor),
          mark: p.at,
          text: p.line,
        })),
    ],
    [points, read, finds, roam, taken],
  );
  // In notice: what is near, and never more than the nearest two at once.
  // A pickup is noticed by its own faint glint, and shows its 「！」 only
  // once the party stands at it — so it never crowds the place's own things.
  const noticed = [
    ...things
      .filter((t) => t.kind !== 'pickup' && dist(hero, t.stand) < NOTICE)
      .sort((a, b) => dist(hero, a.stand) - dist(hero, b.stand))
      .slice(0, MAX_NOTICED),
    ...things
      .filter((t) => t.kind === 'pickup' && dist(hero, t.stand) < REACH)
      .sort((a, b) => dist(hero, a.stand) - dist(hero, b.stand))
      .slice(0, 1),
  ];
  const atThing: Thing | null = !walking && arrived
    ? (noticed.filter((t) => dist(hero, t.stand) < REACH).sort((a, b) => dist(hero, a.stand) - dist(hero, b.stand))[0] ?? null)
    : null;

  // ---- what is noticed ----
  const ambient = useMemo(() => shuffle(ambientLinesFor(scene, view)), [scene]);
  const said = useRef(was?.said ?? 0);
  const [caption, setCaption] = useState<string | null>(was?.caption ?? null);
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
  const [tapped, setTapped] = useState(was?.tapped ?? false);

  // Keep whoever holds the walk up to date with where it has got to —
  // only once standing still, never mid-stride.
  useEffect(() => {
    if (!memory || !arrived || target) return;
    memory.current = {
      hero: heroNow.current,
      kaos: kaosNow.current,
      facing,
      kaosFacing,
      read: [...read],
      finds: [...findsNow.current],
      recentFinds: [...recentFinds.current],
      recentSpots: [...recentSpots.current],
      findsThisVisit: findsThisVisit.current,
      visitCounted: visitCounted.current,
      rainbowSeen: rainbowSeen.current,
      said: said.current,
      caption,
      captionGrade,
      tapped,
    };
  }, [arrived, target, hero, read, finds, caption, facing, kaosFacing, tapped]);

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
    if (figures.some((f) => f.id === 'GALD')) void sceneArt('gald', 'fullbody').then((src) => !gone && setFigureArt(src));
    return () => {
      gone = true;
    };
  }, [place]);

  /**
   * Put a new find somewhere else on the floor, if there is room for one:
   * how rare it is first, then which, then where. The third find of a
   * visit makes it a real visit, counted once.
   */
  const turnUp = () => {
    const current = findsNow.current;
    if (current.length >= MAX_FINDS) return;
    const number = findsThisVisit.current + 1;
    const rainbowOpen = !!roam.rainbow && !rainbowTakenNow.current && !rainbowSeen.current;
    let grade = rollGrade(keeper.visitsBefore, number, rainbowOpen);
    if (forceGrade === 'RAINBOW' && rainbowOpen) grade = 'RAINBOW';
    else if (forceGrade === 'RARE' && grade !== 'RAINBOW') grade = 'RARE';
    const waiting = current.map((f) => f.find.id);
    const find: WalkDiscovery | null =
      grade === 'RAINBOW' && roam.rainbow
        ? { id: roam.rainbow.id, label: roam.rainbow.label, text: '' }
        : pickFind(grade === 'RARE' && roam.rareDiscoveries?.length ? roam.rareDiscoveries : roam.discoveries, recentFinds.current, waiting);
    if (!find) return;
    if (grade === 'RARE' && !roam.rareDiscoveries?.length) grade = 'NORMAL';
    const avoid = [
      ...points.filter((p) => !read.has(p.id)).map((p) => toFloor(p.stand ?? p.at, roam.floor)),
      ...current.map((f) => roam.spots[f.spot]),
    ];
    const spot = pickSpot(roam.spots, heroNow.current, avoid, [...recentSpots.current, ...current.map((f) => f.spot)]);
    if (spot === null) return;
    recentSpots.current = [...recentSpots.current, spot].slice(-SPOT_MEMORY);
    walkedForFind.current = 0;
    findAt.current = performance.now();
    findsThisVisit.current = number;
    if (grade === 'RAINBOW') rainbowSeen.current = true;
    if (number >= VISIT_COUNTS_AT && !visitCounted.current) {
      visitCounted.current = true;
      keeper.recordVisit();
    }
    setFinds([...current, { find, spot, grade }]);
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
    if (arrivals <= 1 && findsNow.current.length === 0) turnUp();
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
    if (arrivals <= 1 || findsNow.current.length >= MAX_FINDS || walkedForFind.current < FIND_WALK) return;
    const wait = FIND_WAIT_MS - (performance.now() - findAt.current);
    if (wait <= 0) {
      turnUp();
      return;
    }
    const timer = window.setTimeout(turnUp, wait);
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
    if ((e.target as Element).closest('button, a, [role="button"], [data-no-walk]')) return;
    if (prize) return;
    const box = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - box.left;
    const sy = e.clientY - box.top;
    const touched = { x: (sx - camX) / paintW, y: (sy - paintTop) / paintH };
    let to = toFloor({ x: touched.x, y: Math.min(touched.y, lowest) }, roam.floor);
    // A pickup is walked to when its own glint is touched, not the ground near it.
    const meant = things
      .map((t) => ({
        t,
        d: t.kind === 'pickup' ? (dist(touched, t.mark) < PICKUP_SNAP ? 0 : Infinity) : Math.min(dist(to, t.stand), dist(touched, t.mark)),
      }))
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
    const thing = atThing;
    if (thing.kind === 'pickup') {
      const pickup = pickups.find((p) => p.id === thing.id);
      if (!pickup || takingPickup.current) return;
      takingPickup.current = true;
      const roll = rollPickup(pickup);
      const def = itemDef(roll.itemId);
      const name = def?.name ?? roll.itemId;
      // Something with a meaning is FOUND, a little apart; the rest is got.
      const special = !!def && (def.rarity === 'RARE' || def.isKeyItem);
      const gotText = special ? `「${name}」を見つけた。` : `${name} ×${roll.quantity} を手に入れた`;
      const done = (moved: number) => {
        takingPickup.current = false;
        if (moved <= 0) {
          setCaptionGrade('NORMAL');
          setCaption(`${name}を見つけたが、これ以上は持てない。`);
          return;
        }
        playSfx(special ? 'explore_rare_found' : 'explore_found');
        setCaptionGrade(special ? 'RARE' : 'NORMAL');
        setCaption(pickup.line);
        setTaken((t) => new Set(t).add(pickup.id));
        // The short notice of what was got — through the shared queue (one at
        // a time; the same thing again before it shows is counted together).
        notices.push({
          type: 'pickup',
          message: gotText,
          priority: special ? 'NORMAL' : 'LOW',
          duration: special ? GOT_SPECIAL_MS : GOT_MS,
          look: 'bottom',
          testId: 'walk-got',
          special,
          merge: special
            ? undefined
            : { key: `got:${roll.itemId}`, count: roll.quantity, format: (n) => `${name} ×${n} を手に入れた` },
        });
      };
      if (!pickupKeeper) return;
      void pickupKeeper
        .take(pickup.id, roll.itemId, roll.quantity)
        .then(done)
        .catch(() => done(0));
      return;
    }
    if (thing.kind === 'point') {
      playSfx('explore_found');
      setCaptionGrade('NORMAL');
      setCaption(thing.text);
      setRead((r) => new Set(r).add(thing.id));
      return;
    }
    walkedForFind.current = 0;
    findAt.current = performance.now();
    setFinds(findsNow.current.filter((x) => x.find.id !== thing.id));
    if (thing.grade === 'RAINBOW') {
      // THE ONCE-IN-A-WORLD FIND: marked taken at once, so nothing can
      // put it down again this visit, then kept in the save.
      const def = roam.rainbow ? weaponDefOf(roam.rainbow.equipmentId) : null;
      rainbowTakenNow.current = true;
      setRainbowTaken(true);
      playSfx('explore_rainbow_found');
      const name = def ? `《${def.name}》` : thing.label;
      setCaptionGrade('RAINBOW');
      setCaption(`${name}を手に入れた。`);
      setPrize((was) => ({ name, description: def?.description ?? '', kept: keeper.keeps, n: (was?.n ?? 0) + 1 }));
      void keeper.takeRainbow();
      return;
    }
    recentFinds.current = [...recentFinds.current.filter((id) => id !== thing.id), thing.id].slice(-FIND_MEMORY);
    playSfx(thing.grade === 'RARE' ? 'explore_rare_found' : 'explore_found');
    setCaptionGrade(thing.grade);
    setCaption(thing.text);
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
      data-things={things.map((t) => `${t.kind}:${t.id}:${fmt(t.stand)}:${fmt(t.mark)}:${t.grade}`).join(' ')}
      data-rainbow={rainbowTaken ? 'taken' : 'open'}
      data-pickups-taken={[...taken].join(' ')}
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
                left: f.at.x * paintW,
                top: paintTop + f.at.y * paintH - FIGURE_HEIGHT * h,
                height: FIGURE_HEIGHT * h,
              }}
            />
          ))}
        {finds.map(({ find, spot, grade }) => (
          <span
            key={`sign-${find.id}`}
            className={`roam-sign g-${grade.toLowerCase()}`}
            data-testid={`walk-sign-${find.id}`}
            data-grade={grade}
            style={{ left: roam.spots[spot].x * paintW, top: paintTop + roam.spots[spot].y * paintH }}
            aria-hidden="true"
          >
            {/* The rainbow's faint motes, rising and gone. */}
            {grade === 'RAINBOW' && [0, 1, 2, 3].map((i) => <i key={i} className={`roam-mote m${i}`} />)}
          </span>
        ))}
        {/* A pickup: a fainter glint, slower — noticed, not announced. */}
        {pickups
          .filter((p) => !taken.has(p.id))
          .map((p) => (
            <span
              key={`pickup-${p.id}`}
              className="roam-sign g-pickup"
              data-testid={`walk-pickup-${p.id}`}
              style={{ left: p.at.x * paintW, top: paintTop + p.at.y * paintH }}
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
            variant={t.grade === 'RAINBOW' ? 'rainbow' : t.grade === 'RARE' ? 'rare' : 'normal'}
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
        <p
          ref={captionEl}
          className={`walk-caption g-${captionGrade.toLowerCase()}`}
          data-testid="walk-caption"
          data-grade={captionGrade}
          aria-live="polite"
        >
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
            data-grade={atThing.grade}
            aria-label={`調べる：${atThing.label}`}
            onClick={look}
          >
            調べる
          </button>
        )}
      </div>

      {/* THE ONCE-IN-A-WORLD FIND: a flash of colour, then what it is. */}
      {prize && (
        <>
          <div key={`flash-${prize.n}`} className="roam-flash" data-testid="walk-prize-flash" aria-hidden="true" />
          <div className="roam-prize" data-testid="walk-prize" data-no-walk role="dialog" aria-label={prize.name}>
            <p className="roam-prize-kind">虹の発見</p>
            <p className="roam-prize-name" data-testid="walk-prize-name">
              {prize.name}
            </p>
            <p className="roam-prize-text" data-testid="walk-prize-text">
              {/* A sentence to a line, so none breaks in the middle of a word. */}
              {prize.description.split(/(?<=。)/).map((line, i) => (
                <span key={i} className="roam-prize-line">
                  {line}
                </span>
              ))}
            </p>
            <p className="roam-prize-got">装備品として手に入れた。</p>
            {!prize.kept && (
              <p className="roam-prize-note" data-testid="walk-prize-unsaved">
                セーブが無いため、この発見は記録されません。
              </p>
            )}
            <button className="btn primary roam-prize-close" data-testid="walk-prize-close" onClick={() => setPrize(null)}>
              とじる
            </button>
          </div>
        </>
      )}
    </div>
  );
}
