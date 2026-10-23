import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ambientLinesFor,
  figuresFor,
  markerAt,
  pointLine,
  pointsFor,
  rollPickup,
  type PaintingPoint,
  type PickupRoll,
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
import { groundOf } from './walkArea';
import { Ambience, Moment, pickAmbience, pickMoment, type MomentKind } from './Ambience';
import { PointMarker } from './PointMarker';
import { DiscoveryMarker } from './DiscoveryMarker';
import { Gusts } from './Gusts';
import { buzz } from '../../platform/haptics';
import { screenShake } from '../fx/screenShake';
import { explorePref, setExplorePref } from '../../platform/explorePrefs';
import type { SfxId } from '@mugen/content/audio/sfx';
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
  findJolt,
  joltDue,
  type FindGrade,
  depthScale,
  dist,
  pickFind,
  onFloor,
  pickSpot,
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
/** Kaos is drawn a little smaller than him. */
const KAOS_HEIGHT = 0.376;
/** No walker stands lower on the screen than this share of its height: the controls are below. */
const LOWEST_FEET = 0.9;
/** The ring at a walker's feet: this share of their drawn height across (探索用キャラ表示ルール) … */
const FOOT_RING_K = 0.55;
/** … and never narrower than this, however far back they stand (作者 2026-10-18: 足元リングの最低サイズ). */
const FOOT_RING_MIN_PX = 34;
/** How much stronger the aura grows as a walker is drawn smaller (作者: 輪郭発光は相対的に少し強く). */
const AURA_FAR_BOOST = 1.6;
/** Where on the screen the party is kept, top to bottom, when the camera follows them up and down. */
const FOLLOW_AT = 0.62;
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

/**
 * WHAT KIND OF THING IT IS, to be told apart by shape, movement and sound as well as colour
 * (作者 2026-10-18 探索ポイント発見演出): LOOK 調べ · GATHER 採取 · FIND a small find · RARE a golden
 * find · RAINBOW the once-in-a-world one · EVENT イベント · MEMORY WORLD MEMORY.
 */
export type Cue = 'LOOK' | 'GATHER' | 'FIND' | 'RARE' | 'RAINBOW' | 'EVENT' | 'MEMORY';

/** The sound of a thing first noticed, by its kind. */
const NOTICE_SFX: Record<Cue, SfxId> = {
  LOOK: 'explore_notice_look',
  FIND: 'explore_notice_look',
  GATHER: 'explore_notice_gather',
  RARE: 'explore_notice_rare',
  RAINBOW: 'explore_notice_rare',
  EVENT: 'explore_notice_event',
  MEMORY: 'explore_notice_memory',
};
/** Which first-noticed thing is heard when several are noticed at once: the most notable. */
const CUE_WEIGHT: Record<Cue, number> = { RAINBOW: 6, MEMORY: 5, RARE: 4, EVENT: 3, GATHER: 2, LOOK: 1, FIND: 0 };
/** How long a thing just noticed swells and sparkles before it settles (作者: 過剰なアニメーションを続けない). */
const FRESH_MS = 2600;
/** A faint mark's strength far off and close by, and how far (in painting widths) it starts to come up. */
const HINT_FAR = 0.14;
const HINT_NEAR = 0.6;
const HINT_REACH = 0.55;

/** The kinds that buzz a little firmer when first noticed (作者 2026-10-18: レア発見は少しだけ強く). */
const FIRM_BUZZ: ReadonlySet<Cue> = new Set<Cue>(['RARE', 'RAINBOW', 'MEMORY']);

/** Something that can be looked at right now: one of the place's own, a small find, or a pickup. */
interface Thing {
  id: string;
  kind: 'point' | 'find' | 'pickup';
  cue: Cue;
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
  /**
   * A golden find's thing, into the bag (2026-10-11): as often as one is
   * found — nothing is marked taken. Resolves with how many went in.
   */
  give?(itemId: string, quantity: number): Promise<number>;
  /**
   * What a pickup that has grown back holds (2026-10-11), or null: as the
   * first time.
   */
  regrownItems?(pickupId: string): readonly PickupRoll[] | null;
  /** A golden find looked at (2026-10-11): the keeper decides if it is a first. */
  found?(findId: string, label: string): void;
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
  /** What has been first noticed this visit (a place that shows its discoveries). */
  discovered?: string[];
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
  showAreas = false,
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
  /** DEBUG: draw the place's ground by kind (緑 MAIN, 黄 SIDE) over the painting, to check it against its grid image. */
  showAreas?: boolean;
}) {
  // A walk picked up where it was left: no walking in, everything as it stood.
  const was = resume ? (memory?.current ?? null) : null;
  const host = useRef<HTMLDivElement>(null);
  /** When the last find's jolt was (findJolt): never two close together. */
  const lastJolt = useRef<number | null>(null);
  const joltFor = (grade: FindGrade) => {
    const level = findJolt(grade);
    const now = performance.now();
    if (!level || !host.current || !joltDue(now, lastJolt.current)) return;
    lastJolt.current = now;
    void screenShake(level, host.current);
  };
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
  // A painting of its own shape (the grassland's is nearly 4:3); the usual one is 1672 × 941.
  const paintH = paintW / (scene.paintingAspect ?? 1672 / 941);

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
  /** Facing into the picture (back), out of it (front), or across (side — then `facing` says which way). */
  const [lean, setLean] = useState<'side' | 'back' | 'front'>('side');
  const [kaosLean, setKaosLean] = useState<'side' | 'back' | 'front'>('side');
  const walking = target !== null;
  /**
   * Which part of the painting the screen shows, top to bottom: fixed by the place's framing — or,
   * for a painting much taller than the screen walked far back into (`followY`, the grassland),
   * following the party up and down, the party a little below the middle.
   */
  const paintTop = scene.followY
    ? Math.min(0, Math.max(h - paintH, h * FOLLOW_AT - hero.y * paintH))
    : (h - paintH) * Math.min(1, Math.max(0, scene.framing ?? 1));
  /**
   * The lowest painting height a walker may stand at on this screen —
   * higher still where the place has its own doors along the bottom
   * (the forest's), so nobody ever walks behind them.
   */
  const lowest = ((events ? Math.min(LOWEST_FEET * h, h - DOORS_BAND) : LOWEST_FEET * h) - paintTop) / paintH;
  // How far walked since a find last turned up or was read, and since the last line.
  const walkedForFind = useRef(0);
  const walkedForWords = useRef(Infinity);
  const findAt = useRef(0);
  // Bumped on every arrival, so what happens on arriving runs once each time.
  const [arrivals, setArrivals] = useState(0);

  // ---- what is there ----
  /** Whether this place shows its discoveries (faint from afar, swelling near, a flash and a sound when first noticed). */
  const fxOn = !!scene.discoveryFx;
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
  /**
   * THE GROUND (walkArea.ts): a place with areas (作者 2026-10-17) is walked on them and around what
   * is in the way; one without is walked on its one floor in a straight line, exactly as before.
   */
  const ground = useMemo(() => groundOf(roam), [roam]);
  /** Where to stand to look at something on the ground: a little to its right. */
  const beside = (p: PaintingPoint) => ground.to({ x: p.x + 0.05, y: p.y });
  /** The turning points still to walk to, the last being where the walk ends. */
  const route = useRef<PaintingPoint[]>([]);
  /** The 寄り道 stepped into this visit (their noticed line said once). */
  const sidesSeen = useRef<Set<number>>(new Set());

  const things: Thing[] = useMemo(
    () => [
      ...points
        .filter((p) => !read.has(p.id))
        .map((p) => ({
          id: p.id,
          kind: 'point' as const,
          cue: (p.kind ?? 'LOOK') as Cue,
          grade: 'NORMAL' as const,
          label: p.label,
          stand: ground.to(p.stand ?? p.at),
          mark: markerAt(p),
          text: pointLine(p, view) ?? '',
        })),
      ...finds.map(({ find, spot, grade }) => ({
        id: find.id,
        kind: 'find' as const,
        cue: (grade === 'RAINBOW' ? 'RAINBOW' : grade === 'RARE' ? 'RARE' : 'FIND') as Cue,
        grade,
        label: find.label,
        stand: beside(roam.spots[spot]),
        mark: roam.spots[spot],
        text: find.text,
      })),
      ...pickups
        .filter((p) => !taken.has(p.id))
        .map((p) => ({
          id: p.id,
          kind: 'pickup' as const,
          cue: 'GATHER' as Cue,
          grade: 'NORMAL' as const,
          label: p.label,
          stand: beside(p.at),
          mark: p.at,
          text: p.line,
        })),
    ],
    [points, read, finds, roam, taken],
  );
  // In notice: what is near, and never more than the nearest two at once.
  // A pickup is noticed by its own faint glint, and shows its 「！」 only
  // once the party stands at it — so it never crowds the place's own things.
  const noticed = fxOn
    ? // A place that shows its discoveries (作者 2026-10-18): a thing to gather is noticed as the others are.
      things
        .filter((t) => dist(hero, t.stand) < NOTICE)
        .sort((a, b) => dist(hero, a.stand) - dist(hero, b.stand))
        .slice(0, MAX_NOTICED + 1)
    : [
    ...things
      .filter((t) => t.kind !== 'pickup' && dist(hero, t.stand) < NOTICE)
      .sort((a, b) => dist(hero, a.stand) - dist(hero, b.stand))
      .slice(0, MAX_NOTICED),
    ...things
      .filter((t) => t.kind === 'pickup' && dist(hero, t.stand) < REACH)
      .sort((a, b) => dist(hero, a.stand) - dist(hero, b.stand))
      .slice(0, 1),
  ];
  // ---- discovering (作者 2026-10-18 探索ポイント発見演出) ----
  // The moment a thing is first noticed this visit: it flashes and sparkles and swells a while, its
  // kind's sound is heard (the most notable, when several at once) and the phone buzzes lightly;
  // then it settles to a quiet float. Only on a place that shows its discoveries.
  const discoveredNow = useRef<Set<string>>(new Set(was?.discovered ?? []));
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const noticedKey = noticed.map((t) => t.id).join(' ');
  useEffect(() => {
    if (!fxOn) return;
    const first = noticed.filter((t) => !discoveredNow.current.has(t.id));
    if (first.length === 0) return;
    for (const t of first) discoveredNow.current.add(t.id);
    const loudest = [...first].sort((a, b) => CUE_WEIGHT[b.cue] - CUE_WEIGHT[a.cue])[0];
    playSfx(NOTICE_SFX[loudest.cue]);
    // The player's switch (探索の設定), read as it happens; off is silent in the hand too.
    const strength = explorePref('vibration') ? (FIRM_BUZZ.has(loudest.cue) ? 'rare' : 'light') : null;
    if (strength) buzz(strength);
    if (import.meta.env.DEV) {
      // For the tests: every thing first noticed, the sound it was heard with, and the buzz.
      const w = window as unknown as { __mugenNoticed?: { id: string; cue: Cue; sfx: string; buzz: string }[] };
      for (const t of first)
        (w.__mugenNoticed ??= []).push({
          id: t.id,
          cue: t.cue,
          sfx: t === loudest ? NOTICE_SFX[t.cue] : '',
          buzz: t === loudest ? (strength ?? 'off') : '',
        });
    }
    setFresh((f) => new Set([...f, ...first.map((t) => t.id)]));
    const ids = first.map((t) => t.id);
    const timer = window.setTimeout(() => setFresh((f) => new Set([...f].filter((id) => !ids.includes(id)))), FRESH_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noticedKey]);

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
  // 探索の設定 (作者 2026-10-18): the place's small moves can be switched off; so can the buzz.
  const [ambienceOn, setAmbienceOn] = useState(() => explorePref('ambience'));
  const [vibrationOn, setVibrationOn] = useState(() => explorePref('vibration'));
  const [prefsOpen, setPrefsOpen] = useState(false);
  const still = calm || !ambienceOn;
  const picked = useMemo(() => (still ? [] : pickAmbience(scene.ambience)), [scene, still]);
  const [moment, setMoment] = useState<{ kind: MomentKind; n: number } | null>(null);
  const restingAtThing = useRef(false);
  restingAtThing.current = !!atThing;
  const [ring, setRing] = useState<{ x: number; y: number; n: number; blocked?: boolean } | null>(null);
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
      discovered: [...discoveredNow.current],
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
    void walkPainting(place, scene.painting).then((src) => !gone && setPainting(src));
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
    // A test may make finds golden in the real game (DEV only), as it fixes the encounter roll.
    const devGrade = import.meta.env.DEV ? (window as unknown as { __mugenFindGrade?: string }).__mugenFindGrade : undefined;
    const force = forceGrade ?? (devGrade === 'RARE' ? 'RARE' : undefined);
    if (force === 'RAINBOW' && rainbowOpen) grade = 'RAINBOW';
    else if (force === 'RARE' && grade !== 'RAINBOW') grade = 'RARE';
    const waiting = current.map((f) => f.find.id);
    const find: WalkDiscovery | null =
      grade === 'RAINBOW' && roam.rainbow
        ? { id: roam.rainbow.id, label: roam.rainbow.label, text: '' }
        : pickFind(grade === 'RARE' && roam.rareDiscoveries?.length ? roam.rareDiscoveries : roam.discoveries, recentFinds.current, waiting);
    if (!find) return;
    if (grade === 'RARE' && !roam.rareDiscoveries?.length) grade = 'NORMAL';
    const avoid = [
      ...points.filter((p) => !read.has(p.id)).map((p) => ground.to(p.stand ?? p.at)),
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
      trail.current = [ground.to(behind), target];
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
      const scale = depthScale(from.y, roam.far, roam.near, roam.farScale);
      // Toward the next turning point of the way (around what is in the way), the last being the target.
      const goal = route.current.length > 1 ? route.current[0] : target;
      // In screen pixels, so a step back into the picture is the same pace as one across.
      const dx = (goal.x - from.x) * paintW;
      const dy = (goal.y - from.y) * paintH;
      const left = Math.hypot(dx, dy);
      const stride = WALK_SPEED * w * scale * dt;
      const reached = left <= stride || left < 0.5;
      if (reached && goal !== target) route.current.shift();
      const done = reached && goal === target;
      const next = reached ? goal : { x: from.x + (dx / left) * (stride / paintW), y: from.y + (dy / left) * (stride / paintH) };
      // Which way he faces: across (left / right), or into the picture (back) or out of it (front)
      // when the way runs mostly up or down the screen (探索用キャラ表示ルール: 4方向).
      if (!reached) {
        if (Math.abs(dx) > 0.5) setFacing(dx < 0 ? 'left' : 'right');
        setLean(Math.abs(dy) > Math.abs(dx) * 1.2 ? (dy < 0 ? 'back' : 'front') : 'side');
      }
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
      {
        const kdx = (k.x - kaosNow.current.x) * paintW;
        const kdy = (k.y - kaosNow.current.y) * paintH;
        if (Math.hypot(kdx, kdy) > 0.05) setKaosLean(Math.abs(kdy) > Math.abs(kdx) * 1.2 ? (kdy < 0 ? 'back' : 'front') : 'side');
      }
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
    // Stepped off the way into a 寄り道 for the first time this visit: what is noticed there.
    const sides = roam.areas?.side ?? [];
    const sideAt = sides.findIndex((sd) => onFloor(heroNow.current, sd.outline));
    const enters = sideAt >= 0 && !sidesSeen.current.has(sideAt) ? sides[sideAt].enter : undefined;
    if (sideAt >= 0) sidesSeen.current.add(sideAt);
    if (atThing) playSfx('explore_marker');
    if (enters) {
      setCaptionGrade('NORMAL');
      setCaption(enters);
    } else if (atThing) {
      // Beside something: its 「！」 says enough.
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
    if (still) return;
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
      setMoment(null);
    };
  }, [still]);

  // The camera keeps him near the middle, within the painting.
  const heroPx = hero.x * paintW;
  const camX = Math.min(0, Math.max(w - paintW, w / 2 - heroPx));
  const toScreen = (p: PaintingPoint) => ({ x: p.x * paintW + camX, y: paintTop + p.y * paintH });
  /** How plainly a faint mark shows (作者 2026-10-18: 未発見は薄く、近づくほど見える): from barely there to plain. */
  const nearness = (p: PaintingPoint) =>
    ({ ['--o' as string]: (HINT_FAR + (HINT_NEAR - HINT_FAR) * Math.max(0, 1 - dist(hero, p) / HINT_REACH)).toFixed(2) }) as React.CSSProperties;

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
    // Not ground (赤: a wall, a cliff, the distance): walked to the nearest ground, and the touch says so.
    const offGround = !ground.on(touched);
    let to = ground.to({ x: touched.x, y: Math.min(touched.y, lowest) });
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
    setRing((r) => ({ x: sx, y: sy, n: (r?.n ?? 0) + 1, blocked: offGround }));
    if (dist(to, heroNow.current) < 1e-4) return;
    route.current = ground.path(heroNow.current, to);
    setTarget(to);
  };

  const look = () => {
    if (!atThing) return;
    const thing = atThing;
    if (thing.kind === 'pickup') {
      const pickup = pickups.find((p) => p.id === thing.id);
      if (!pickup || takingPickup.current) return;
      takingPickup.current = true;
      // Grown back (2026-10-11): what it holds now, which may differ from the first time.
      const regrown = pickupKeeper?.regrownItems?.(pickup.id);
      const roll = rollPickup(regrown && regrown.length > 0 ? { ...pickup, items: regrown } : pickup);
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
        // A rare thing or a key one picked up: the golden find's small jolt.
        if (special) joltFor('RARE');
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
    const found = findsNow.current.find((x) => x.find.id === thing.id)?.find;
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
      joltFor('RAINBOW');
      void keeper.takeRainbow();
      return;
    }
    recentFinds.current = [...recentFinds.current.filter((id) => id !== thing.id), thing.id].slice(-FIND_MEMORY);
    playSfx(thing.grade === 'RARE' ? 'explore_rare_found' : 'explore_found');
    joltFor(thing.grade);
    setCaptionGrade(thing.grade);
    setCaption(thing.text);
    // A golden find that holds something (2026-10-11): into the bag, and the
    // short notice of what was got — as a pickup's is. A full bag keeps the
    // line and says so.
    const reward = thing.grade === 'RARE' ? found?.reward : undefined;
    // A golden find seen for the first time is a moment (ハイタッチ, 2026-10-11).
    if (thing.grade === 'RARE') pickupKeeper?.found?.(thing.id, thing.label);
    if (reward && pickupKeeper?.give) {
      const def = itemDef(reward.itemId);
      const name = def?.name ?? reward.itemId;
      const quantity = reward.quantity ?? 1;
      void pickupKeeper
        .give(reward.itemId, quantity)
        .catch(() => 0)
        .then((moved) => {
          if (moved <= 0) {
            setCaption(`${thing.text}\n${name}を見つけたが、これ以上は持てない。`);
            return;
          }
          notices.push({
            type: 'pickup',
            message: `${name} ×${moved} を手に入れた`,
            priority: 'LOW',
            duration: GOT_MS,
            look: 'bottom',
            testId: 'walk-got',
            merge: { key: `got:${reward.itemId}`, count: moved, format: (n) => `${name} ×${n} を手に入れた` },
          });
        });
    }
  };

  // ---- the party, drawn ----
  // How near each stands (1 at the front, `farScale` far back): their size follows it smoothly.
  const heroDepth = depthScale(hero.y, roam.far, roam.near, roam.farScale);
  const kaosDepth = depthScale(kaos.y, roam.far, roam.near, roam.farScale);
  // His height in his own frames' pixels is the art's (the mini statues: 340, crown to sole).
  const heroScale = walkers
    ? ((HERO_HEIGHT * h) / walkers.hero.referencePixels) * depthScale(hero.y, roam.far, roam.near, roam.farScale)
    : 1;
  const kaosScale = walkers
    ? ((KAOS_HEIGHT * h) / walkers.kaos.referencePixels) * depthScale(kaos.y, roam.far, roam.near, roam.farScale)
    : 1;
  const pick = (frames: { idle: SpriteFrame; walk: readonly SpriteFrame[] }, offset: number) =>
    walking && frames.walk.length > 0
      ? frames.walk[(((frame + offset) % frames.walk.length) + frames.walk.length) % frames.walk.length]
      : frames.idle;
  // The step. A direction with no walking cycle drawn yet (Kaos; the hero facing right) steps a little
  // higher, so they are seen to walk rather than slide.
  const bob = (offset: number, frames?: { walk: readonly SpriteFrame[] }) =>
    walking && !calm
      ? Math.abs(Math.sin(((frame + offset) * Math.PI) / 2)) * h * 0.008 * (frames && frames.walk.length < 2 ? 1.8 : 1)
      : 0;
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
      data-scale={depthScale(hero.y, roam.far, roam.near, roam.farScale).toFixed(3)}
      data-kaos={fmt(kaos)}
      data-kaos-scale={depthScale(kaos.y, roam.far, roam.near, roam.farScale).toFixed(3)}
      data-view={`${camX.toFixed(2)},${paintW.toFixed(2)},${paintTop.toFixed(2)},${paintH.toFixed(2)}`}
      data-things={things.map((t) => `${t.kind}:${t.id}:${fmt(t.stand)}:${fmt(t.mark)}:${t.grade}`).join(' ')}
      data-rainbow={rainbowTaken ? 'taken' : 'open'}
      data-pickups-taken={[...taken].join(' ')}
      data-noticed={noticed.map((t) => t.id).join(' ')}
      data-read={[...read].join(' ')}
      data-ambient={picked.join(',')}
      data-moment={moment?.kind ?? ''}
      data-zone={ground.kind(hero) ?? 'NONE'}
      data-areas={roam.areas ? 'yes' : 'no'}
      onPointerDown={onGround}
    >
      {/* THE PAINTING, with a faint glint wherever a small find is waiting. */}
      <div className="walk-layer walk-painting" data-shake-layer="field" style={{ width: paintW, transform: `translateX(${camX}px)` }}>
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
        {/* The place moving on its own now and then (環境アニメーション) — behind everyone, never a thing. */}
        {!still && scene.gusts && (
          <Gusts gusts={scene.gusts} camX={camX} w={w} h={h} paintW={paintW} paintH={paintH} paintTop={paintTop} />
        )}
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
        {/* DEBUG: the ground by kind, to set against the place's grid image. */}
        {showAreas && roam.areas && (
          <svg className="roam-areas" data-testid="walk-areas" width={paintW} height={paintH} style={{ position: 'absolute', left: 0, top: paintTop, pointerEvents: 'none' }} viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
            {roam.areas.main.map((o, i) => (
              <polygon key={`m${i}`} points={o.map((q) => `${q.x},${q.y}`).join(' ')} fill="rgba(60,220,90,.28)" stroke="#3cdc5a" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            ))}
            {(roam.areas.side ?? []).map((sd, i) => (
              <polygon key={`s${i}`} points={sd.outline.map((q) => `${q.x},${q.y}`).join(' ')} fill="rgba(255,220,60,.3)" stroke="#ffdc3c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            ))}
            {(roam.areas.blocked ?? []).map((o, i) => (
              <polygon key={`b${i}`} points={o.map((q) => `${q.x},${q.y}`).join(' ')} fill="rgba(255,60,60,.35)" stroke="#ff3c3c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        )}
        {/* A pickup: a fainter glint, slower — noticed, not announced. */}
        {pickups
          .filter((p) => !taken.has(p.id))
          .map((p) => (
            <span
              key={`pickup-${p.id}`}
              className={`roam-sign g-pickup${fxOn ? ' g-gather' : ''}`}
              data-testid={`walk-pickup-${p.id}`}
              style={{ left: p.at.x * paintW, top: paintTop + p.at.y * paintH, ...(fxOn ? nearness(p.at) : {}) }}
              aria-hidden="true"
            />
          ))}
        {/* 未発見・遠距離 (作者 2026-10-18): the place's own things are faintly there from afar — never
            loud, never the answer — and a little plainer once noticed. */}
        {fxOn &&
          things
            .filter((t) => t.kind === 'point' && !noticed.some((n) => n.id === t.id))
            .map((t) => (
              <span
                key={`hint-${t.id}`}
                className={`roam-sign g-cue g-${t.cue.toLowerCase()}${discoveredNow.current.has(t.id) ? ' seen' : ''}`}
                data-testid={`walk-hint-${t.id}`}
                style={{ left: t.mark.x * paintW, top: paintTop + t.mark.y * paintH, ...nearness(t.stand) }}
                aria-hidden="true"
              />
            ))}
      </div>

      <div className="walk-layer walk-light" style={{ transform: `translateX(${camX * DEPTH.light}px)` }} aria-hidden="true" />
      <div className="walk-layer walk-mist" style={{ transform: `translateX(${camX * DEPTH.mist}px)` }} aria-hidden="true" />

      {/* THE PARTY: whoever stands nearer is drawn over the other. Each with a soft aura and a faint
          ring at the feet (作者「探索用キャラクター表示ルール」: 見失わないための補助 — not an effect):
          the one played a little stronger, the ring brighter beside something to look at, and both
          quieter while a line is read or something is being got. */}
      {walkers && (
        <div className={`walk-party${caption || prize ? ' quiet' : ''}`} data-testid="walk-party">
          <div style={{ position: 'absolute', inset: 0, zIndex: Math.round(kaosAt.y) }}>
            <span
              className="walk-foot-ring aura-kaos"
              data-testid="walk-ring-kaos"
              style={{ left: kaosAt.x, top: kaosAt.y, width: Math.max(FOOT_RING_MIN_PX, FOOT_RING_K * KAOS_HEIGHT * h * kaosDepth) }}
              aria-hidden="true"
            />
            <WalkSprite
              frame={pick(walkers.kaos.frames[kaosLean === 'side' ? kaosFacing : kaosLean], 2)}
              scale={kaosScale}
              feetX={kaosAt.x}
              feetY={kaosAt.y}
              bob={bob(2, walkers.kaos.frames[kaosLean === 'side' ? kaosFacing : kaosLean])}
              testId="walk-kaos"
              alt="ケイオス"
              className="walk-aura aura-kaos"
              auraBoost={1 + (1 - kaosDepth) * AURA_FAR_BOOST}
            />
          </div>
          <div style={{ position: 'absolute', inset: 0, zIndex: Math.round(heroAt.y) + 1 }}>
            <span
              className={`walk-foot-ring aura-hero lead${atThing ? ' at-thing' : ''}`}
              data-testid="walk-ring-hero"
              data-state={atThing ? 'at-thing' : 'walk'}
              style={{ left: heroAt.x, top: heroAt.y, width: Math.max(FOOT_RING_MIN_PX, FOOT_RING_K * HERO_HEIGHT * h * heroDepth) }}
              aria-hidden="true"
            />
            <WalkSprite
              frame={pick(walkers.hero.frames[lean === 'side' ? facing : lean], 0)}
              scale={heroScale}
              feetX={heroAt.x}
              feetY={heroAt.y}
              bob={bob(0, walkers.hero.frames[lean === 'side' ? facing : lean])}
              testId="walk-hero"
              alt="主人公"
              className={`walk-aura aura-hero lead${atThing ? ' at-thing' : ''}`}
              auraBoost={1 + (1 - heroDepth) * AURA_FAR_BOOST}
            />
          </div>
        </div>
      )}

      {/* 「！」 — only on what is near, over the party so nobody stands in front of it. */}
      <div className="walk-layer roam-marks" style={{ width: paintW, transform: `translateX(${camX}px)` }}>
        {noticed.map((t) =>
          fxOn ? (
            <DiscoveryMarker
              key={`marker-${t.id}`}
              left={t.mark.x * paintW}
              top={markTipY(paintTop + t.mark.y * paintH, h, wordsEnd)}
              state={atThing?.id === t.id ? 'here' : 'near'}
              cue={t.cue}
              fresh={fresh.has(t.id)}
              testId={`walk-marker-${t.id}`}
            />
          ) : (
          <PointMarker
            key={`marker-${t.id}`}
            left={t.mark.x * paintW}
            top={markTipY(paintTop + t.mark.y * paintH, h, wordsEnd)}
            state={atThing?.id === t.id ? 'here' : 'near'}
            variant={t.grade === 'RAINBOW' ? 'rainbow' : t.grade === 'RARE' ? 'rare' : 'normal'}
            testId={`walk-marker-${t.id}`}
          />
          ),
        )}
      </div>

      <Ambience picked={picked} />
      {moment && <Moment key={`moment-${moment.n}`} kind={moment.kind} />}

      <div className="walk-top">
        <h1 className="place walk-title">{scene.title}</h1>
        <button className="walk-leave" data-testid={leaveTestId} onClick={onLeave}>
          {leaveLabel}
        </button>
        {/* 探索の設定 — on the places trying the new feel (PoC), for now. */}
        {fxOn && (
          <button className="walk-prefs-open" data-testid="walk-prefs-open" aria-expanded={prefsOpen} onClick={() => setPrefsOpen((o) => !o)}>
            設定
          </button>
        )}
      </div>
      {fxOn && prefsOpen && (
        <div className="walk-prefs" data-testid="walk-prefs" data-no-walk>
          <button
            data-testid="walk-pref-vibration"
            aria-pressed={vibrationOn}
            onClick={() => {
              setExplorePref('vibration', !vibrationOn);
              setVibrationOn(!vibrationOn);
              if (!vibrationOn) buzz('light');
            }}
          >
            振動 {vibrationOn ? 'ON' : 'OFF'}
          </button>
          <button
            data-testid="walk-pref-ambience"
            aria-pressed={ambienceOn}
            onClick={() => {
              setExplorePref('ambience', !ambienceOn);
              setAmbienceOn(!ambienceOn);
            }}
          >
            環境演出 {ambienceOn ? 'ON' : 'OFF'}
          </button>
        </div>
      )}
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
          className={`walk-tap-ring${ring.blocked ? ' blocked' : ''}`}
          data-testid="walk-tap-ring"
          data-blocked={ring.blocked ? 'yes' : 'no'}
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
