import Phaser from 'phaser';
import { locationBackground } from '../../content/locations/locationVisuals';
import { ExplorationCharacter, directionFor, type Direction } from './PlayerSprite';
import { FollowTrail } from './follow';

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
 * when he stops. Everything here is about that and nothing else — the
 * reactions she will one day have (noticing a discovery, being startled,
 * falling behind) belong to the companion's own state, not to the scene.
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

/**
 * What is waiting at a discovery point.
 *
 * Every kind is drawn EXACTLY the same, on purpose. The player should
 * walk over because they wondered, not because an icon told them there
 * was a fight or a box there — finding out what it was is the reward.
 * The kind is carried so that later code can reason about it (what the
 * world remembers, what a place becomes years on); it is not a label to
 * put on the screen.
 */
export type DiscoveryKind = 'event' | 'battle' | 'item' | 'npc' | 'memory' | 'secret';

interface DiscoveryPointDef {
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: DiscoveryKind;
}

/**
 * Greenwood holds one discovery today: the man on the path. It is a list
 * so that a second one costs a line rather than a rewrite — but nothing
 * here generates, randomises or schedules anything.
 */
const DISCOVERY_POINTS: readonly DiscoveryPointDef[] = [
  { id: 'GALD_ENCOUNTER', ...ENCOUNTER_POINT, radius: ENCOUNTER_RADIUS, kind: 'event' },
];

const GOLD = 0xc9a961;

export interface GreenwoodCallbacks {
  onEncounter: () => void;
}

export interface GreenwoodOptions {
  /**
   * False once Gald's life choice is already recorded in WORLD MEMORY:
   * the same first encounter must not happen twice in one world.
   */
  encounterEnabled: boolean;
  /**
   * The player asked for less movement. Everything a cue says with
   * motion it must also say standing still, so this only removes the
   * animation — never the cue.
   */
  reducedMotion?: boolean;
}

/**
 * Greenwood Forest — the exploration prototype.
 *
 * The loop it is built for: LOOK → NOTICE → WONDER → APPROACH →
 * DISCOVER. So the forest is drawn at its own colour and never washed
 * out, the traveller is the game's own drawn protagonist rather than a
 * marker, and the place worth walking to is a disturbance in the world —
 * light on the ground, a ring that will not quite settle — instead of an
 * icon saying "press here".
 *
 * The scene owns coordinates: where he is, where he is going, and what
 * he is near. It owns nothing about how he looks. That belongs to
 * ExplorationCharacter, which is given a character id, so the next
 * person to walk this forest needs no line of this file.
 */
export class GreenwoodScene extends Phaser.Scene {
  /**
   * The traveller — his own sprite frames, cut from the character
   * sheet. The scene owns where he is; the component owns how he looks.
   */
  private player!: ExplorationCharacter;
  private facing: Direction = 'back';
  /** Kaos, walking with him. */
  private companion!: ExplorationCharacter;
  private companionFacing: Direction = 'back';
  /** The ground he has walked, which is the ground she walks. */
  private trail = new FollowTrail();
  private target: Phaser.Math.Vector2 | null = null;
  private encounterFired = false;
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

    // Layer 2: what is worth walking over to.
    if (this.options.encounterEnabled) {
      for (const point of DISCOVERY_POINTS) this.createDiscoveryCue(point);
    }

    // Layer 3: the traveller. PLAYER_START is where his feet are.
    this.player = new ExplorationCharacter(this, {
      characterId: PLAYER_CHARACTER,
      x: PLAYER_START.x,
      y: PLAYER_START.y,
      displaySize: PLAYER_DISPLAY_WIDTH,
      depth: 20,
      reducedMotion: this.options.reducedMotion === true,
    });
    this.trail.reset(PLAYER_START.x, PLAYER_START.y);

    // Layer 3b: Kaos, a step behind him.
    this.companion = new ExplorationCharacter(this, {
      characterId: COMPANION_CHARACTER,
      x: COMPANION_START.x,
      y: COMPANION_START.y,
      displaySize: COMPANION_DISPLAY_HEIGHT,
      depth: 22,
      reducedMotion: this.options.reducedMotion === true,
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
  }

  /**
   * A disturbance in the world, not a button on top of it.
   *
   * Four quiet layers: light caught on the ground, a ring of it that has
   * not finished closing, two motes drifting up, and a slow ripple. The
   * first two are drawn whether or not anything moves, so the place is
   * still noticeable when the player has asked for less motion.
   */
  private createDiscoveryCue(point: DiscoveryPointDef): void {
    const still = this.options.reducedMotion === true;

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

    if (still) return;

    // The ring breathes rather than blinks.
    this.tweens.add({
      targets: [ring, inner],
      scaleX: 1.06,
      scaleY: 1.06,
      alpha: 0.85,
      duration: 1900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // A ripple leaving the point every few seconds — the world still
    // remembering something that happened here.
    const ripple = this.add.ellipse(point.x, point.y + 6, point.radius * 1.8, point.radius * 1.0);
    ripple.setStrokeStyle(1, GOLD, 0.5);
    ripple.setDepth(7);
    this.tweens.add({
      targets: ripple,
      scaleX: 2.1,
      scaleY: 2.1,
      alpha: 0,
      duration: 2600,
      repeat: -1,
      ease: 'Sine.easeOut',
    });

    // Two motes of light, drifting.
    for (let i = 0; i < 2; i++) {
      const mote = this.add.circle(point.x + (i === 0 ? -7 : 8), point.y + 4, 1.6, GOLD, 0.85);
      mote.setDepth(8);
      this.tweens.add({
        targets: mote,
        y: point.y - 22 - i * 6,
        alpha: 0,
        duration: 2200 + i * 700,
        delay: i * 900,
        repeat: -1,
        ease: 'Sine.easeOut',
      });
    }
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

  /**
   * "Found it." One ring leaving the spot, and gone in a quarter of a
   * second — enough to feel, too short to sit through.
   */
  private discoveryPulse(point: DiscoveryPointDef): void {
    if (this.options.reducedMotion === true) return;
    const pulse = this.add.ellipse(point.x, point.y + 6, point.radius * 1.6, point.radius * 0.9);
    pulse.setStrokeStyle(2, GOLD, 0.95);
    pulse.setDepth(30);
    this.tweens.add({
      targets: pulse,
      scaleX: 2.4,
      scaleY: 2.4,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.easeOut',
    });
  }

  update(_time: number, delta: number): void {
    if (this.encounterFired) return;

    const encounterActive = this.options.encounterEnabled;

    this.player.setState(this.target ? 'walk' : 'idle');
    this.player.update(delta);

    if (this.target) {
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

    this.trail.record(this.player.x, this.player.y);
    this.updateCompanion(delta);

    if (!encounterActive) return;

    for (const point of DISCOVERY_POINTS) {
      const reached =
        Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y) <=
        point.radius + 10;
      if (!reached) continue;
      this.encounterFired = true;
      this.discoveryPulse(point);
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.callbacks.onEncounter();
      });
      return;
    }
  }
}

export function createGreenwoodGame(
  parent: HTMLElement,
  callbacks: GreenwoodCallbacks,
  options: GreenwoodOptions,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#12241a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: new GreenwoodScene(callbacks, options),
  });
}
