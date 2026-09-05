// ENEMY ART — which pictures of each creature exist.
//
// This is the file a new creature is added to, and it is meant to stay
// boring: an id, a name, and however many of the ten states have
// actually been drawn. Nothing here decides when a picture is shown;
// the resolver in core/art does the falling back and the battle decides
// the state. Gald and everything after him join by adding one entry.
//
// The files themselves are used exactly as delivered — no recolouring,
// no trimming, no re-export. Where a drawing sits inside a lot of
// transparent margin, the box says where it is.

import mossRabbitArt from '../../assets/enemies/moss-rabbit.png';
import mossRabbitDownArt from '../../assets/enemies/moss-rabbit-down.png';
import type { EnemyArtRegistry, EnemyArtSet } from '../../core/art/artRegistry';
import type { EnemyArtState } from '../../core/art/artStates';

/** The ten, in the order a report should list them. */
export const ENEMY_ART_STATES: readonly EnemyArtState[] = [
  'front',
  'side',
  'back',
  'idle',
  'attack',
  'run',
  'damage',
  'down',
  'portrait',
  'sheet',
];

/**
 * MOSS RABBIT — the first creature through the new door.
 *
 * Two states drawn so far. Everything else falls back to `front`, which
 * is why the battlefield looks exactly as it did before this existed:
 * the wiring is new, the pictures are not. When an attack pose arrives
 * it is one line here and nothing anywhere else.
 */
export const MOSS_RABBIT_ART: EnemyArtSet = {
  id: 'moss_rabbit',
  label: 'モスラビット',
  states: {
    // Standing, three-quarters on, looking towards the party.
    front: {
      src: mossRabbitArt,
      box: { fileW: 1024, fileH: 1536, x: 129, y: 387, width: 703, height: 850 },
      facing: 'right',
    },
    // Lying in the grass with its ears spread: far wider than it is
    // tall, which is why its size on screen is worked out from its own
    // box rather than from the standing one's.
    down: {
      src: mossRabbitDownArt,
      box: { fileW: 1536, fileH: 1024, x: 6, y: 218, width: 1523, height: 659 },
      facing: 'right',
    },
  },
};

export const ENEMY_ART: EnemyArtRegistry = {
  [MOSS_RABBIT_ART.id]: MOSS_RABBIT_ART,
};
