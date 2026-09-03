import Phaser from 'phaser';
import { locationBackground } from '../../content/locations/locationVisuals';
import { ExplorationCharacter, directionFor, type Direction } from './PlayerSprite';
import { FollowTrail } from './follow';
import {
  GREENWOOD_DISCOVERY_SPOTS,
  nextDiscoverySpot,
  resolveExplorationEncounter,
  type DiscoveryCategory,
  type DiscoverySpot,
} from './discovery';
import type { ExplorationSession } from './explorationSession';

export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 520;

// Deterministic layout so the e2e test can click the encounter marker.
const PLAYER_START = { x: 180, y: 440 };
const ENCOUNTER_POINT = { x: 180, y: 120 };
const ENCOUNTER_RADIUS = 28;
const PLAYER_SPEED = 160; // px/sec
const BACKGROUND_KEY = 'greenwood-bg';
/** Who the player is walking as. The frames belong to the registry. */
const PLAYER_CHARACTER = 'HERO' as const;
// About a ninth of the screen across the drawn figure — big enough to
// read as a person on a phone, small enough that the forest is still the
// subject and he is not standing in front of it.
const PLAYER_DISPLAY_WIDTH = Math.round(GAME_WIDTH * 0.11);

/**
 * Kaos walks the forest with him.
 *
 * She is not scenery and not a marker: she is the other person in this
 * story, so she keeps to his path, turns where he turned, and stops
 * when he stops.
 */
const COMPANION_CHARACTER = 'KAOS' as const;
/** Her height on screen. A little smaller than him, deliberately. */
const COMPANION_DISPLAY_HEIGHT = 58;
/**
 * How far back along his path she walks. Far enough that the two of
 * them read as two people on a path rather than as one figure with
 * something stuck to it — which, at this size, takes most of a
 * character's height.
 */
const FOLLOW_DISTANCE = 52;
/** She never comes closer than this to him, whatever the path says. */
const COMPANION_MIN_GAP = 34;
/** A little faster than he is, so a gap she has lost can be closed. */
const COMPANION_SPEED = 178;
/** Close enough to her place on the path to stop walking. */
const COMPANION_SETTLE = 1.5;
/** Where she is standing when the forest opens: behind him, off to one side. */
const COMPANION_START = { x: PLAYER_START.x - 28, y: PLAYER_START.y + 36 };

/** How long "you have arrived" takes before the result is handed over. */
const ARRIVAL_MS = 450;
/** She notices a beat after he does, because she was behind him. */
const COMPANION_REACTION_MS = 190;
/** The gold sparkle before an item card. */
const SPARKLE_MS = 380;
/** The moment between "something is coming" and the battle screen. */
const BATTLE_WARNING_MS = 240;

/**
 * What is waiting at a discovery point.
 *
 * Every kind is drawn EXACTLY the same, on purpose. The player should
 * walk over because they wondered, not because an icon told them there
 * was a fight or a box there — finding out what it was is the reward.
 */
export type DiscoveryKind = 'event' | 'battle' | 'item' | 'npc' | 'memory' | 'secret';

interface DiscoveryPointDef {
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: DiscoveryKind;
}

/** The scripted first meeting. Its coordinates are part of the story. */
const GALD_POINT: DiscoveryPointDef = {
  id: 'GALD_ENCOUNTER',
  ...ENCOUNTER_POINT,
  radius: ENCOUNTER_RADIUS,
  kind: 'event',
};

/** The ring standing in the forest right now, and the parts it is made of. */
interface ActiveDiscovery {
  point: DiscoveryPointDef;
  parts: Phaser.GameObjects.Shape[];
  loops: Phaser.Tweens.Tween[];
}

/**
 * Where the walk is in its one loop.
 *
 * 'walking'    he goes where he is tapped; arrivals are watched for
 * 'arriving'   he is there; the ring is closing and input is locked
 * 'handedOver' the result belongs to React now, and still no input
 *
 * Three words rather than a state machine: the forest has one thing to
 * be in the middle of, and giving it a framework would cost more than
 * it explains.
 */
type ExplorationPhase = 'walking' | 'arriving' | 'handedOver';

const GOLD = 0xc9a961;

export interface GreenwoodCallbacks {
  /** The scripted first meeting on the forest path. Unchanged. */
  onEncounter: () => void;
  /**
   * An arrival at a repeatable ring, and what it turned out to be. The
   * scene has decided the category and nothing else: which event, which
   * item and which enemy are the world's business, not the canvas's.
   */
  onDiscovery: (category: DiscoveryCategory) => void;
}

export interface GreenwoodOptions {
  /**
   * False once Gald's life choice is already recorded in WORLD MEMORY:
   * the same first encounter must not happen twice in one world. After
   * that the forest holds repeatable discoveries instead.
   */
  encounterEnabled: boolean;
  /**
   * The player asked for less movement. Everything a cue says with
   * motion it must also say standing still, so this only removes the
   * animation — never the cue.
   */
  reducedMotion?: boolean;
  /**
   * Where they were standing before a fight took them off this screen.
   * Without it, winning would undo the walk.
   */
  session?: ExplorationSession;
  /** Development only: force what the next arrival turns out to be. */
  forcedCategory?: DiscoveryCategory | null;
}

/**
 * Greenwood Forest — the exploration loop.
 *
 * LOOK → NOTICE → WONDER → APPROACH → ARRIVE → FIND OUT → LOOK AGAIN.
 * The forest is drawn at its own colour and never washed out, the two
 * travellers are their own drawn art rather than markers, and the place
 * worth walking to is a disturbance in the world instead of an icon
 * saying "press here".
 *
 * The one rule that shapes the code: nothing happens because a ring was
 * tapped. Things happen because somebody walked there. So the ring is
 * not interactive, the tap only ever means "go", and the result is
 * decided on arrival — which is also why input locks the moment he
 * arrives and does not come back until the result has been seen.
 *
 * The scene owns coordinates and timing. It owns no content: which
 * event, which item, which enemy, and what any of it means to the world
 * are decided outside and never imported here.
 */
export class GreenwoodScene extends Phaser.Scene {
  private player!: ExplorationCharacter;
  private facing: Direction = 'back';
  private companion!: ExplorationCharacter;
  private companionFacing: Direction = 'back';
  /** The ground he has walked, which is the ground she walks. */
  private trail = new FollowTrail();
  private target: Phaser.Math.Vector2 | null = null;
  private phase: ExplorationPhase = 'walking';
  private active: ActiveDiscovery | null = null;
  /** Decided at hand-over, so a trip to the battle screen cannot move it. */
  private nextSpotId: string | null = null;
  private lastCategory: DiscoveryCategory | null = null;
  private callbacks: GreenwoodCallbacks;
  private options: GreenwoodOptions;

  constructor(callbacks: GreenwoodCallbacks, options: GreenwoodOptions) {
    super('greenwood');
    this.callbacks = callbacks;
    this.options = options;
  }

  preload(): void {
    // The same registry the React screens read: the forest walked through
    // and the forest fought in are one location.
    const art = locationBackground('GREENWOOD_FOREST');
    if (art) this.load.image(BACKGROUND_KEY, art);
    // His frames: sixteen transparent PNGs, one per pose and direction.
    ExplorationCharacter.preload(this, PLAYER_CHARACTER);
    // Hers: one transparent PNG holding her four views.
    ExplorationCharacter.preload(this, COMPANION_CHARACTER);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#12241a');

    // Layer 1: the forest itself, at its own colour. SCENE ART IS THE
    // WORLD — nothing lightens it to match the menus.
    if (this.textures.exists(BACKGROUND_KEY)) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, BACKGROUND_KEY);
      const scale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
      bg.setScale(scale).setScrollFactor(0).setDepth(0);
    } else {
      // The art failed to load: fall back to the original shapes rather
      // than a blank screen.
      const treeSpots = [
        [60, 90], [300, 70], [80, 230], [290, 250], [50, 380], [310, 400], [200, 300],
      ];
      for (const [x, y] of treeSpots) {
        this.add.circle(x, y, 18, 0x1e3a28);
        this.add.rectangle(x, y + 20, 6, 14, 0x2c2418);
      }
    }

    // Where they left off, if a fight interrupted the walk.
    const held = this.options.session?.read() ?? null;
    const playerAt = held?.player ?? PLAYER_START;
    const companionAt = held?.companion ?? COMPANION_START;
    this.facing = held?.facing ?? 'back';
    this.companionFacing = held?.companionFacing ?? 'back';
    this.lastCategory = held?.lastCategory ?? null;

    // Layer 2: the traveller. His coordinates are where his feet are.
    this.player = new ExplorationCharacter(this, {
      characterId: PLAYER_CHARACTER,
      x: playerAt.x,
      y: playerAt.y,
      displaySize: PLAYER_DISPLAY_WIDTH,
      depth: 20,
      reducedMotion: this.options.reducedMotion === true,
    });
    this.player.setDirection(this.facing);
    this.trail.reset(playerAt.x, playerAt.y);

    // Layer 2b: Kaos, a step behind him.
    this.companion = new ExplorationCharacter(this, {
      characterId: COMPANION_CHARACTER,
      x: companionAt.x,
      y: companionAt.y,
      displaySize: COMPANION_DISPLAY_HEIGHT,
      depth: 22,
      reducedMotion: this.options.reducedMotion === true,
    });
    this.companion.setDirection(this.companionFacing);

    // Layer 3: what is worth walking over to. One at a time, always.
    this.createDiscovery(this.openingPoint(held?.spotId ?? null, playerAt));

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Arriving and everything after it is not a moment to be
      // interrupted, and a second tap must never start a second result.
      if (this.phase !== 'walking') return;
      this.target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
  }

  /**
   * Back to walking, with a new ring somewhere else.
   *
   * Called by the screen once the player has finished reading whatever
   * they found. The spot was decided when the result was handed over,
   * so it is the same one whether they came back from a card, a scene,
   * or a fight on another screen.
   */
  resumeExploration(): void {
    if (this.phase !== 'handedOver') return;
    this.createDiscovery(this.spotById(this.nextSpotId) ?? this.freshPoint());
    this.phase = 'walking';
  }

  /** Where they are standing, for the session to hold. */
  private saveSession(): void {
    this.options.session?.save({
      player: { x: this.player.x, y: this.player.y },
      companion: { x: this.companion.x, y: this.companion.y },
      facing: this.facing,
      companionFacing: this.companionFacing,
      spotId: this.nextSpotId ?? GREENWOOD_DISCOVERY_SPOTS[0].id,
      lastCategory: this.lastCategory,
    });
  }

  /** The ring to draw when the forest opens. */
  private openingPoint(heldSpotId: string | null, playerAt: { x: number; y: number }): DiscoveryPointDef {
    // The first meeting on the path is a story beat, not a discovery:
    // while it is still ahead of the player it is the only thing in the
    // forest, at the coordinates it has always been at.
    if (this.options.encounterEnabled) return GALD_POINT;
    const spot = this.spotById(heldSpotId);
    return spot ?? this.freshPoint(playerAt);
  }

  private spotById(id: string | null): DiscoveryPointDef | null {
    const spot = GREENWOOD_DISCOVERY_SPOTS.find((s) => s.id === id);
    return spot ? this.pointFor(spot) : null;
  }

  private freshPoint(from?: { x: number; y: number }): DiscoveryPointDef {
    return this.pointFor(
      nextDiscoverySpot({
        previousId: this.active?.point.id ?? null,
        from: from ?? { x: this.player.x, y: this.player.y },
      }),
    );
  }

  private pointFor(spot: DiscoverySpot): DiscoveryPointDef {
    return { id: spot.id, x: spot.x, y: spot.y, radius: ENCOUNTER_RADIUS, kind: 'secret' };
  }

  /**
   * A disturbance in the world, not a button on top of it.
   *
   * Four quiet layers: light caught on the ground, a ring of it that has
   * not finished closing, two motes drifting up, and a slow ripple. The
   * first two are drawn whether or not anything moves, so the place is
   * still noticeable when the player has asked for less motion.
   */
  private createDiscovery(point: DiscoveryPointDef): void {
    const still = this.options.reducedMotion === true;
    const parts: Phaser.GameObjects.Shape[] = [];
    const loops: Phaser.Tweens.Tween[] = [];

    // Light on the ground. Soft, warm, wider than it is tall — the shape
    // sunlight makes when it falls through leaves.
    const glow = this.add.ellipse(point.x, point.y + 6, point.radius * 2.8, point.radius * 1.6, GOLD, 0.22);
    glow.setDepth(6);

    // The ring: the MUGEN mark, laid flat on the forest floor.
    const ring = this.add.ellipse(point.x, point.y + 6, point.radius * 1.8, point.radius * 1.0);
    ring.setStrokeStyle(1.6, GOLD, 0.85);
    ring.setDepth(7);

    // A second, fainter one just inside it, so the cue reads as made
    // rather than as a lens flare.
    const inner = this.add.ellipse(point.x, point.y + 6, point.radius * 1.1, point.radius * 0.62);
    inner.setStrokeStyle(1, GOLD, 0.5);
    inner.setDepth(7);
    parts.push(glow, ring, inner);

    this.active = { point, parts, loops };
    if (still) return;

    // The ring breathes rather than blinks.
    loops.push(
      this.tweens.add({
        targets: [ring, inner],
        scaleX: 1.06,
        scaleY: 1.06,
        alpha: 0.85,
        duration: 1900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
    );

    // A ripple leaving the point every few seconds — the world still
    // remembering something that happened here.
    const ripple = this.add.ellipse(point.x, point.y + 6, point.radius * 1.8, point.radius * 1.0);
    ripple.setStrokeStyle(1, GOLD, 0.5);
    ripple.setDepth(7);
    parts.push(ripple);
    loops.push(
      this.tweens.add({
        targets: ripple,
        scaleX: 2.1,
        scaleY: 2.1,
        alpha: 0,
        duration: 2600,
        repeat: -1,
        ease: 'Sine.easeOut',
      }),
    );

    // Two motes of light, drifting.
    for (let i = 0; i < 2; i++) {
      const mote = this.add.circle(point.x + (i === 0 ? -7 : 8), point.y + 4, 1.6, GOLD, 0.85);
      mote.setDepth(8);
      parts.push(mote);
      loops.push(
        this.tweens.add({
          targets: mote,
          y: point.y - 22 - i * 6,
          alpha: 0,
          duration: 2200 + i * 700,
          delay: i * 900,
          repeat: -1,
          ease: 'Sine.easeOut',
        }),
      );
    }
  }

  /**
   * "Found it." The ring gathers itself, gives out one pulse, and is
   * gone — about four hundred milliseconds in total, because this is a
   * hand on a shoulder and not a prize ceremony.
   */
  private dismissDiscovery(): void {
    const active = this.active;
    if (!active) return;
    this.active = null;
    for (const loop of active.loops) loop.stop();
    const parts = active.parts;

    if (this.options.reducedMotion === true) {
      for (const part of parts) part.destroy();
      return;
    }

    // Gathers itself in…
    this.tweens.add({ targets: parts, scaleX: 0.86, scaleY: 0.86, duration: 130, ease: 'Sine.easeIn' });

    // …lets go of one ring…
    const pulse = this.add.ellipse(
      active.point.x,
      active.point.y + 6,
      active.point.radius * 1.6,
      active.point.radius * 0.9,
    );
    pulse.setStrokeStyle(2, GOLD, 0.9);
    pulse.setDepth(30);
    this.tweens.add({
      targets: pulse,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 330,
      delay: 120,
      ease: 'Cubic.easeOut',
      onComplete: () => pulse.destroy(),
    });

    // …and is not there any more.
    this.tweens.add({
      targets: parts,
      alpha: 0,
      duration: 260,
      delay: 120,
      onComplete: () => {
        for (const part of parts) part.destroy();
      },
    });
  }

  /** Small gold, close to the ground: something was here to pick up. */
  private itemSparkle(point: DiscoveryPointDef): void {
    if (this.options.reducedMotion === true) return;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + 0.3;
      const mote = this.add.circle(point.x + Math.cos(angle) * 4, point.y + 4, 1.5, GOLD, 0.9);
      mote.setDepth(9);
      this.tweens.add({
        targets: mote,
        x: point.x + Math.cos(angle) * 17,
        y: point.y - 8 + Math.sin(angle) * 7,
        alpha: 0,
        duration: SPARKLE_MS,
        delay: i * 26,
        ease: 'Sine.easeOut',
        onComplete: () => mote.destroy(),
      });
    }
  }

  /**
   * Something came. Not a red flash and not a white one: the ground
   * moves under them for a sixth of a second and the light goes.
   * The forest picture itself is never touched.
   */
  private battleWarning(onDone: () => void): void {
    if (this.options.reducedMotion !== true) this.cameras.main.shake(140, 0.005);
    this.cameras.main.fadeOut(BATTLE_WARNING_MS, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, onDone);
  }

  /**
   * He is there.
   *
   * Everything stops: the walk, the input, the ring. He reacts, she
   * reacts a beat later because she was behind him, and only then does
   * the forest say what was here.
   */
  private arriveAt(point: DiscoveryPointDef): void {
    this.phase = 'arriving';
    this.target = null;
    this.player.setState('idle');
    this.dismissDiscovery();
    this.player.hop();
    this.time.delayedCall(COMPANION_REACTION_MS, () => this.companion.hop());
    this.time.delayedCall(ARRIVAL_MS, () => this.handOver(point));
  }

  /** What was here, and who deals with it. Runs exactly once per ring. */
  private handOver(point: DiscoveryPointDef): void {
    if (this.phase !== 'arriving') return;
    this.phase = 'handedOver';

    if (point.id === GALD_POINT.id) {
      // The scripted meeting, exactly as it always was.
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.callbacks.onEncounter();
      });
      return;
    }

    const category = resolveExplorationEncounter({
      previous: this.lastCategory,
      forced: this.options.forcedCategory ?? null,
    });
    this.lastCategory = category;
    // Decide where the next ring goes now, while the forest still knows
    // where everybody is: a fight happens on another screen, and this
    // scene will be rebuilt from the session rather than from here.
    this.nextSpotId = nextDiscoverySpot({
      previousId: point.id,
      from: { x: this.player.x, y: this.player.y },
    }).id;
    this.saveSession();

    if (category === 'ITEM') {
      this.itemSparkle(point);
      this.time.delayedCall(SPARKLE_MS, () => this.callbacks.onDiscovery('ITEM'));
      return;
    }
    if (category === 'BATTLE') {
      this.battleWarning(() => this.callbacks.onDiscovery('BATTLE'));
      return;
    }
    this.callbacks.onDiscovery('EVENT');
  }

  /**
   * Kaos walks his path, a set distance back.
   *
   * Not straight at him: a companion who steers at the person they are
   * following cuts every corner and ends up walking beside them. She
   * aims at the ground he actually covered, so she turns where he
   * turned and arrives where he came from.
   *
   * Two rules keep her a person rather than a shadow. She never closes
   * to within arm's length of him, whatever the path says, so they are
   * always two figures and never one. And whoever is further up the
   * path stands behind the other, so a step apart still reads as a step
   * apart rather than as a sticker.
   */
  private updateCompanion(delta: number): void {
    const place = this.trail.behind(FOLLOW_DISTANCE);
    let walking = false;

    if (place) {
      const gap = Phaser.Math.Distance.Between(
        this.companion.x,
        this.companion.y,
        place.x,
        place.y,
      );
      if (gap > COMPANION_SETTLE) {
        const step = Math.min(gap, (COMPANION_SPEED * delta) / 1000);
        const angle = Phaser.Math.Angle.Between(
          this.companion.x,
          this.companion.y,
          place.x,
          place.y,
        );
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const x = this.companion.x + dx * step;
        const y = this.companion.y + dy * step;
        // Never onto him. If the path would take her inside his
        // shoulder — he doubled back, or she was catching up when he
        // stopped — she waits instead.
        if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) >= COMPANION_MIN_GAP) {
          this.companion.setPosition(x, y);
          this.companionFacing = directionFor(dx, dy, this.companionFacing);
          this.companion.setDirection(this.companionFacing);
          walking = true;
        }
      }
    }

    this.companion.setState(walking ? 'walk' : 'idle');
    this.companion.update(delta);
    this.companion.setDepth(this.companion.y <= this.player.y ? 18 : 22);
  }

  update(_time: number, delta: number): void {
    const walkable = this.phase === 'walking';

    if (walkable && this.target) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y);
      const step = (PLAYER_SPEED * delta) / 1000;
      if (dist <= step) {
        this.player.setPosition(this.target.x, this.target.y);
        this.target = null;
      } else {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.target.x, this.target.y);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        this.player.setPosition(this.player.x + dx * step, this.player.y + dy * step);
        // Turn to the way he is going. The bigger axis decides, so he
        // keeps his back to us unless he is really walking sideways —
        // which is what walking into a forest looks like.
        this.facing = directionFor(dx, dy, this.facing);
        this.player.setDirection(this.facing);
      }
    }

    this.player.setState(walkable && this.target ? 'walk' : 'idle');
    this.player.update(delta);
    // She keeps coming for a moment after he has stopped, which is what
    // having walked behind him looks like.
    this.trail.record(this.player.x, this.player.y);
    this.updateCompanion(delta);

    if (!walkable) return;

    const point = this.active?.point;
    if (!point) return;
    const reached =
      Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y) <=
      point.radius + 10;
    if (reached) this.arriveAt(point);
  }
}

export function createGreenwoodGame(
  parent: HTMLElement,
  callbacks: GreenwoodCallbacks,
  options: GreenwoodOptions,
): { game: Phaser.Game; scene: GreenwoodScene } {
  const scene = new GreenwoodScene(callbacks, options);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#12241a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene,
  });
  return { game, scene };
}
