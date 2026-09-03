import Phaser from 'phaser';
import { locationBackground } from '../../content/locations/locationVisuals';

export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 520;

// Deterministic layout so the e2e test can click the encounter marker.
const PLAYER_START = { x: 180, y: 440 };
const ENCOUNTER_POINT = { x: 180, y: 120 };
const ENCOUNTER_RADIUS = 28;
const PLAYER_SPEED = 160; // px/sec
const BACKGROUND_KEY = 'greenwood-bg';
// Big enough that his hair, cloak, shirt and facing are all legible on a
// phone — small enough that he is still a traveller in the forest rather
// than a figure standing in front of it.
const PLAYER_SCALE = 1.85;

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

/** The palette the traveller is drawn from — his character sheet, in numbers. */
const HIM = {
  hair: 0x2f2620,
  hairLit: 0x4a3a2c,
  cloak: 0x2b2b30,
  cloakLit: 0x3d3d45,
  shirt: 0xe6dfd0,
  trousers: 0x23232a,
  boots: 0x4a3728,
  skin: 0xf0d5b8,
  rim: 0xd8cdb8,
  shadow: 0x1a1a12,
} as const;

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
 * out, the traveller is a person rather than a marker, and the place
 * worth walking to is a disturbance in the world — light on the ground,
 * a ring that will not quite settle — instead of an icon saying "press
 * here".
 */
export class GreenwoodScene extends Phaser.Scene {
  /**
   * The traveller. A container, not a shape: the figure is built from
   * primitives inside it now, and a real sprite sheet can be dropped in
   * later without a line of the movement code changing.
   */
  private player!: Phaser.GameObjects.Container;
  private playerLegs: Phaser.GameObjects.Rectangle[] = [];
  private playerCloak: Phaser.GameObjects.Polygon | null = null;
  private walkPhase = 0;
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

    // Layer 3: the traveller.
    this.player = this.createTraveller(PLAYER_START.x, PLAYER_START.y);

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
   * The traveller, built to his character sheet: dark hair, dark ragged
   * cloak, light shirt under it, small boots, and the compact
   * proportions of the exploration chibi — young, not a child.
   *
   * Everything is a primitive so it needs no asset, and everything sits
   * in one container so a sprite can replace the lot.
   */
  private createTraveller(x: number, y: number): Phaser.GameObjects.Container {
    const parts: Phaser.GameObjects.GameObject[] = [];

    const shadow = this.add.ellipse(0, 3, 18, 6, HIM.shadow, 0.45);
    parts.push(shadow);

    // Boots, then legs above them: the legs are what the walk animates.
    const bootLeft = this.add.rectangle(-3.2, 1, 4, 3, HIM.boots).setOrigin(0.5, 1);
    const bootRight = this.add.rectangle(3.2, 1, 4, 3, HIM.boots).setOrigin(0.5, 1);
    const legLeft = this.add.rectangle(-3, -2, 3.4, 6, HIM.trousers).setOrigin(0.5, 1);
    const legRight = this.add.rectangle(3, -2, 3.4, 6, HIM.trousers).setOrigin(0.5, 1);
    parts.push(bootLeft, bootRight, legLeft, legRight);

    // The light shirt shows at the middle, under the cloak.
    const shirt = this.add.rectangle(0, -8, 9, 8, HIM.shirt).setOrigin(0.5, 0.5);
    parts.push(shirt);

    // The cloak: dark, and torn along the hem the way his is.
    const cloak = this.add.polygon(
      0,
      -8,
      [
        -7, -6, 7, -6, 8, 2, 6, 6, 4.5, 2, 2.5, 7, 0.5, 2, -1.5, 6.5, -3.5, 1.5, -5.5, 6, -7.5, 1,
      ],
      HIM.cloak,
    );
    cloak.setOrigin(0, 0);
    // A pale hairline all round him: the forest floor is as dark as his
    // cloak, and without it he sinks into it.
    cloak.setStrokeStyle(0.8, HIM.rim, 0.85);
    parts.push(cloak);
    this.playerCloak = cloak;

    // A collar catching the light, so the silhouette does not go flat.
    const collar = this.add.rectangle(0, -13.5, 11, 2.4, HIM.cloakLit);
    parts.push(collar);

    // Head, then hair over it: a face is a face at four pixels only if
    // something dark sits on top of it.
    const head = this.add.circle(0, -18.5, 5.2, HIM.skin);
    const hair = this.add.ellipse(0, -20.6, 11.4, 8.2, HIM.hair);
    hair.setStrokeStyle(0.8, HIM.rim, 0.7);
    const fringe = this.add.ellipse(-1.6, -18.4, 8, 4.6, HIM.hair);
    const tuft = this.add.triangle(0, 0, 1, -25.5, 4.5, -28.5, 4.2, -24, HIM.hairLit);
    parts.push(head, hair, fringe, tuft);

    this.playerLegs = [legLeft, legRight];
    return this.add.container(x, y, parts).setScale(PLAYER_SCALE).setDepth(20);
  }

  /** Legs scissor while moving, the cloak sways, and both settle at rest. */
  private animateWalk(moving: boolean, delta: number): void {
    const [left, right] = this.playerLegs;
    if (!left || !right) return;
    if (!moving) {
      this.walkPhase = 0;
      left.setScale(1, 1);
      right.setScale(1, 1);
      this.playerCloak?.setRotation(0);
      return;
    }
    this.walkPhase += delta / 90;
    const swing = Math.sin(this.walkPhase) * 0.35;
    left.setScale(1, 1 + swing);
    right.setScale(1, 1 - swing);
    this.playerCloak?.setRotation(Math.sin(this.walkPhase) * 0.045);
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

    this.animateWalk(this.target !== null, delta);

    if (this.target) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.target.x, this.target.y);
      const step = (PLAYER_SPEED * delta) / 1000;
      if (dist <= step) {
        this.player.setPosition(this.target.x, this.target.y);
        this.target = null;
      } else {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.target.x, this.target.y);
        this.player.x += Math.cos(angle) * step;
        this.player.y += Math.sin(angle) * step;
        // Face the way you are going.
        this.player.setScale(Math.cos(angle) < 0 ? -PLAYER_SCALE : PLAYER_SCALE, PLAYER_SCALE);
      }
    }

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
