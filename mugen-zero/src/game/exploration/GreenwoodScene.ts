import Phaser from 'phaser';

export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 520;

// Deterministic layout so the e2e test can click the encounter marker.
const PLAYER_START = { x: 180, y: 440 };
const ENCOUNTER_POINT = { x: 180, y: 120 };
const ENCOUNTER_RADIUS = 28;
const PLAYER_SPEED = 160; // px/sec

export interface GreenwoodCallbacks {
  onEncounter: () => void;
}

export interface GreenwoodOptions {
  /**
   * False once Gald's life choice is already recorded in WORLD MEMORY:
   * the same first encounter must not happen twice in one world.
   */
  encounterEnabled: boolean;
}

/**
 * Minimal Greenwood Forest exploration scene.
 * Tap anywhere to walk; reaching the "!" marker triggers the Gald encounter.
 * Placeholder shapes only — real art arrives in PHASE G (polish).
 */
export class GreenwoodScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private target: Phaser.Math.Vector2 | null = null;
  private encounterFired = false;
  private callbacks: GreenwoodCallbacks;
  private options: GreenwoodOptions;

  constructor(callbacks: GreenwoodCallbacks, options: GreenwoodOptions) {
    super('greenwood');
    this.callbacks = callbacks;
    this.options = options;
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#12241a');

    // Sparse placeholder trees.
    const treeSpots = [
      [60, 90], [300, 70], [80, 230], [290, 250], [50, 380], [310, 400], [200, 300],
    ];
    for (const [x, y] of treeSpots) {
      this.add.circle(x, y, 18, 0x1e3a28);
      this.add.rectangle(x, y + 20, 6, 14, 0x2c2418);
    }

    if (this.options.encounterEnabled) {
      // Encounter marker.
      this.add.circle(ENCOUNTER_POINT.x, ENCOUNTER_POINT.y, ENCOUNTER_RADIUS, 0x2a2233, 0.9);
      const mark = this.add
        .text(ENCOUNTER_POINT.x, ENCOUNTER_POINT.y, '!', {
          fontSize: '28px',
          color: '#e8c15a',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.tweens.add({ targets: mark, y: ENCOUNTER_POINT.y - 6, duration: 600, yoyo: true, repeat: -1 });
    } else {
      this.add
        .text(GAME_WIDTH / 2, 120, '森は、静かだ。', { fontSize: '14px', color: '#9fb3a8' })
        .setOrigin(0.5);
    }

    this.player = this.add.circle(PLAYER_START.x, PLAYER_START.y, 10, 0xd8e6f0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 18, 'タップした場所へ移動', {
        fontSize: '12px',
        color: '#9fb3a8',
      })
      .setOrigin(0.5);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
    });
  }

  update(_time: number, delta: number): void {
    if (this.encounterFired) return;

    const encounterActive = this.options.encounterEnabled;

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
      }
    }

    if (!encounterActive) return;

    const dEnc = Phaser.Math.Distance.Between(
      this.player.x, this.player.y, ENCOUNTER_POINT.x, ENCOUNTER_POINT.y,
    );
    if (dEnc <= ENCOUNTER_RADIUS + 10) {
      this.encounterFired = true;
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.callbacks.onEncounter();
      });
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
