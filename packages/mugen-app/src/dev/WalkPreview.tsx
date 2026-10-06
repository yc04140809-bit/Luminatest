import { useMemo } from 'react';
import { RUINS_WALK } from '@mugen/content/exploration/ruinsWalk';
import type { WalkSceneDef } from '@mugen/content/exploration/walkScene';
import type { WalkPlaceId } from '@mugen/content/exploration/walkPlaces';
import { WalkScene } from '../ui/explore/WalkScene';
import { RoamScene } from '../ui/explore/RoamScene';

/**
 * A PLACE WALKED ON ITS OWN, for looking at — DEBUG BUILDS ONLY.
 *
 * `?preview=walk&place=ANCIENT_RUINS`. The App's own walk screen,
 * unchanged, across a place no door in the game leads to yet, so how it
 * walks, glints and breathes can be checked on a phone. It opens no
 * world: nothing is read from a save and nothing is written to one, and
 * the conditions a place may carry are asked of an empty world.
 */
const PREVIEWABLE: Partial<Record<WalkPlaceId, WalkSceneDef>> = {
  ANCIENT_RUINS: RUINS_WALK,
};

export function WalkPreview({ params }: { params: URLSearchParams }) {
  const id = (params.get('place') ?? 'ANCIENT_RUINS') as WalkPlaceId;
  const scene = PREVIEWABLE[id] ?? RUINS_WALK;
  const view = useMemo(() => ({ known: new Set<string>(), day: 1 }), []);
  // A place walked about in (the ruins) has its own screen; others walk along.
  if (scene.roam)
    return (
      <RoamScene
        scene={scene}
        roam={scene.roam}
        place={scene.id as WalkPlaceId}
        view={view}
        onLeave={() => window.location.assign(window.location.pathname)}
        leaveLabel="タイトルへもどる"
        leaveTestId="walk-preview-leave"
      />
    );
  return (
    <WalkScene
      scene={scene}
      place={scene.id as WalkPlaceId}
      view={view}
      onLeave={() => window.location.assign(window.location.pathname)}
      leaveLabel="タイトルへもどる"
      leaveTestId="walk-preview-leave"
    />
  );
}
