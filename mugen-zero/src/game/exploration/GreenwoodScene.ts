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
// Chibi proportions mean the head is nearly half of him, so the figure
// is drawn small and scaled up as one piece. Big enough to be a person
// walking in the forest; small enough that the forest is still the
// subject and he is not standing in front of it.
const PLAYER_SCALE = 1.9;

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

/**
 * The traveller's palette, taken from the exploration sprite sheet.
 *
 * The sheet is the reference, not the asset: nothing pastes it onto the
 * screen and nothing cuts frames out of it. What is copied is the design
 * — the big soft mass of dark brown hair, the heavy dark stole over
 * leather and cloth, small boots, and the round chibi proportions of a
 * young man who is not a hero yet.
 */
const HIM = {
  hair: 0x3b2a1e,
  hairLit: 0x55402d,
  hairEdge: 0x2a1d15,
  cloak: 0x24242b,
  cloakLit: 0x35353f,
  cloakEdge: 0x171720,
  leather: 0x6b543f,
  inner: 0xc9b696,
  trousers: 0x22222a,
  boots: 0x4a3728,
  skin: 0xf2d7ba,
  eye: 0x3a2c22,
  rune: 0xd9c48f,
  shadow: 0x14140e,
} as const;

/** Which way he is facing. Back is the default: exploring is walking away. */
type Facing = 'back' | 'front' | 'side';

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
  /** One sub-container per facing; exactly one of them is ever visible. */
  private facings: Record<Facing, Phaser.GameObjects.Container> | null = null;
  private facing: Facing = 'back';
  private legsFor: Record<Facing, Phaser.GameObjects.Rectangle[]> = {
    back: [],
    front: [],
    side: [],
  };
  private cloakFor: Record<Facing, Phaser.GameObjects.GameObject[]> = {
    back: [],
    front: [],
    side: [],
  };
  private walkPhase = 0;
  private idlePhase = 0;
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
  /**
   * The traveller.
   *
   * Three views of the same small person — back, front and side — built
   * from primitives and held in one container, with only one shown at a
   * time. Back is what the player sees almost always, because walking
   * into a forest means walking away from the camera; the other two exist
   * so that turning to the left or coming back down the path reads as
   * turning rather than sliding.
   *
   * Every part is a shape, so there is no asset to load and no frame to
   * cut out of anything. When a real sprite sheet is exported, this one
   * method is what it replaces — the movement code never learns of it.
   */
  private createTraveller(x: number, y: number): Phaser.GameObjects.Container {
    const facings: Record<Facing, Phaser.GameObjects.Container> = {
      back: this.buildFigure('back'),
      front: this.buildFigure('front'),
      side: this.buildFigure('side'),
    };
    facings.front.setVisible(false);
    facings.side.setVisible(false);
    this.facings = facings;
    this.facing = 'back';

    // The shadow belongs to the ground, not to any one view of him.
    const shadow = this.add.ellipse(0, 3, 17, 5.5, HIM.shadow, 0.42);

    return this.add
      .container(x, y, [shadow, facings.back, facings.front, facings.side])
      .setScale(PLAYER_SCALE)
      .setDepth(20);
  }

  /** One view of him. Same body, three silhouettes. */
  private buildFigure(facing: Facing): Phaser.GameObjects.Container {
    const parts: Phaser.GameObjects.GameObject[] = [];
    const narrow = facing === 'side';

    // ---- boots and legs. Short, because most of him is head and cloak.
    const legSpan = narrow ? 2.2 : 3.1;
    const bootLeft = this.add.rectangle(-legSpan, 1.5, narrow ? 4.4 : 3.8, 2.8, HIM.boots).setOrigin(0.5, 1);
    const bootRight = this.add.rectangle(legSpan, 1.5, narrow ? 4.4 : 3.8, 2.8, HIM.boots).setOrigin(0.5, 1);
    const legLeft = this.add.rectangle(-legSpan, -1.3, 3, 5, HIM.trousers).setOrigin(0.5, 1);
    const legRight = this.add.rectangle(legSpan, -1.3, 3, 5, HIM.trousers).setOrigin(0.5, 1);
    parts.push(bootLeft, bootRight, legLeft, legRight);
    this.legsFor[facing] = [legLeft, legRight];

    // ---- the body under the stole: cloth and leather, never bare.
    const body = this.add.rectangle(0, -6.5, narrow ? 7 : 9.5, 8, HIM.inner).setOrigin(0.5, 0.5);
    const belt = this.add.rectangle(0, -3.6, narrow ? 7.4 : 10, 1.8, HIM.leather).setOrigin(0.5, 0.5);
    parts.push(body, belt);

    // ---- the stole: the biggest thing about him after the hair. Wide
    // at the shoulders, torn along the hem, and darker than the forest
    // floor so his outline survives on the sunlit path.
    const hem = narrow
      ? [-4.5, -7, 4.5, -7, 5, 1.5, 3.6, 5, 2, 1, 0.4, 5.5, -1.4, 1, -3.2, 4.6, -4.8, 0.5]
      : [
          -7, -7.5, 7, -7.5, 7.8, 1.5, 6, 5.5, 4.4, 1.2, 2.4, 6.2, 0.4, 1.4, -1.6, 5.8, -3.6, 1,
          -5.6, 5.2, -7.6, 0.8,
        ];
    const cloak = this.add.polygon(0, -7.5, hem, HIM.cloak);
    cloak.setOrigin(0, 0);
    cloak.setStrokeStyle(0.7, HIM.cloakEdge, 0.9);
    parts.push(cloak);
    this.cloakFor[facing] = [cloak];

    // Seen from behind, the mark on his back is the one bright thing on
    // him — the same small emblem the character sheet gives the cape.
    if (facing === 'back') {
      const rune = this.add.polygon(0, -8, [0, -3, 1.6, 0, 0, 3, -1.6, 0], HIM.rune);
      rune.setOrigin(0, 0);
      rune.setAlpha(0.5);
      const runeLine = this.add.rectangle(0, -8, 0.7, 5.4, HIM.rune, 0.35);
      parts.push(rune, runeLine);
    }

    // A collar of lighter cloth, so the black does not read as a hole.
    const collar = this.add.ellipse(0, -13.4, narrow ? 8 : 11.5, 4, HIM.cloakLit);
    parts.push(collar);

    // ---- head and hair. Chibi: the head is nearly half of him, and the
    // hair is a soft mass rather than a helmet.
    const head = this.add.circle(narrow ? 0.8 : 0, -18.5, 6.4, HIM.skin);
    parts.push(head);

    if (facing === 'front') {
      // Two dark eyes and nothing else: at this size a mouth is a smudge.
      parts.push(
        this.add.ellipse(-2.4, -18.2, 1.5, 2.1, HIM.eye),
        this.add.ellipse(2.4, -18.2, 1.5, 2.1, HIM.eye),
      );
    } else if (narrow) {
      parts.push(this.add.ellipse(3.2, -18.2, 1.4, 2, HIM.eye));
    }

    // The hair: a big rounded mass over the crown, side locks past the
    // ears, and the one strand that never lies down.
    const crown = this.add.ellipse(narrow ? 0.4 : 0, -21.4, narrow ? 12 : 14.2, 10.4, HIM.hair);
    crown.setStrokeStyle(0.6, HIM.hairEdge, 0.9);
    const lockLeft = this.add.ellipse(narrow ? -3.4 : -5.4, -18.2, 4.6, 7.2, HIM.hair);
    const lockRight = this.add.ellipse(narrow ? 4.4 : 5.4, -18.2, 4.6, 7.2, HIM.hair);
    parts.push(crown, lockLeft, lockRight);

    if (facing === 'back') {
      // From behind, the hair is all there is above the collar.
      const nape = this.add.ellipse(0, -16.6, 10.6, 6, HIM.hair);
      parts.push(nape);
    } else {
      // A fringe, sitting over the brow rather than covering the face.
      const fringe = this.add.ellipse(narrow ? 0.6 : 0, -22.6, narrow ? 10.4 : 12.6, 6, HIM.hairLit);
      fringe.setAlpha(0.55);
      parts.push(fringe);
    }

    const ahoge = this.add.triangle(0, 0, narrow ? 1.4 : 0.6, -25.8, narrow ? 5.4 : 4.2, -30.4, narrow ? 4.6 : 3.4, -25.2, HIM.hairLit);
    parts.push(ahoge);

    const figure = this.add.container(0, 0, parts);
    if (narrow) figure.setScale(0.94, 1);
    return figure;
  }

  /** Turn him to face the way he is walking. Back unless told otherwise. */
  private setFacing(next: Facing, flip: boolean): void {
    const facings = this.facings;
    if (!facings) return;
    if (next !== this.facing) {
      facings[this.facing].setVisible(false);
      facings[next].setVisible(true);
      this.facing = next;
    }
    if (next === 'side') {
      const target = flip ? -0.94 : 0.94;
      if (facings.side.scaleX !== target) facings.side.setScale(target, 1);
    }
  }

  /**
   * He walks, and when he stops he keeps breathing.
   *
   * Standing perfectly still is what makes a figure read as a marker, so
   * the idle is never nothing: a slow rise and fall of a pixel or two.
   */
  private animateWalk(moving: boolean, delta: number): void {
    const legs = this.legsFor[this.facing];
    const cloak = this.cloakFor[this.facing][0] as Phaser.GameObjects.Polygon | undefined;
    const body = this.facings?.[this.facing];
    const [left, right] = legs;

    if (!moving) {
      this.walkPhase = 0;
      left?.setScale(1, 1);
      right?.setScale(1, 1);
      cloak?.setRotation(0);
      this.idlePhase += delta / 620;
      body?.setY(Math.sin(this.idlePhase) * 0.55);
      return;
    }

    this.idlePhase = 0;
    body?.setY(0);
    this.walkPhase += delta / 90;
    const swing = Math.sin(this.walkPhase) * 0.38;
    left?.setScale(1, 1 + swing);
    right?.setScale(1, 1 - swing);
    cloak?.setRotation(Math.sin(this.walkPhase) * 0.05);
    // The whole figure lifts a hair on each step.
    body?.setY(Math.abs(Math.sin(this.walkPhase)) * -0.5);
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
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        this.player.x += dx * step;
        this.player.y += dy * step;
        // Turn to the way he is going. Sideways only when he is actually
        // going sideways — otherwise he keeps his back to us, which is
        // what walking into a forest looks like.
        if (Math.abs(dx) > Math.abs(dy)) this.setFacing('side', dx < 0);
        else this.setFacing(dy < 0 ? 'back' : 'front', false);
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
