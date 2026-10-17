import { useEffect, useMemo, useState } from 'react';
import { RUINS_WALK } from '@mugen/content/exploration/ruinsWalk';
import type { WalkSceneDef } from '@mugen/content/exploration/walkScene';
import type { WalkPlaceId } from '@mugen/content/exploration/walkPlaces';
import { World } from '@mugen/core/world/world';
import { IdbMemoryStore } from '@mugen/core/memory/idbStore';
import { WalkScene } from '../ui/explore/WalkScene';
import { RoamScene, type RoamKeeper } from '../ui/explore/RoamScene';
import { APP_DB_NAME } from '../platform/save';

/**
 * A PLACE WALKED ON ITS OWN, for looking at — DEBUG BUILDS ONLY.
 *
 * `?preview=walk&place=ANCIENT_RUINS`. The App's own walk screen across a
 * place no door in the game leads to yet, so how it walks, glints and
 * breathes can be checked on a phone. The conditions a place may carry
 * are asked of an empty world.
 *
 * THE SAVE, AND ONLY WHAT EXPLORING KEEPS. A place with a once-in-a-world
 * find (the ruins) opens this phone's save — when there is one — so that
 * taking the find can be checked across a restart. Only three things are
 * ever written from here: the place's real-visit count, the mark that its
 * find is taken, and the find itself into the owned equipment. With no
 * save on the phone nothing is created: the walk runs on as before and
 * says, when it matters, that nothing is being kept.
 *
 * `&find=RAINBOW` / `&find=RARE` (the title's DEBUG doors): finds of that
 * grade, to check them without walking for an hour. The rainbow still
 * only turns up while it has not been taken — the rule being checked is
 * never bent.
 */
const PREVIEWABLE: Partial<Record<WalkPlaceId, WalkSceneDef>> = {
  ANCIENT_RUINS: RUINS_WALK,
};

/**
 * This phone's save, if it has one with anything in it — opened without
 * ever creating a database that was not already there.
 */
async function existingSave(): Promise<World | null> {
  try {
    const names = (await indexedDB.databases?.())?.map((d) => d.name) ?? [];
    if (!names.includes(APP_DB_NAME)) return null;
    const world = await World.open(new IdbMemoryStore(APP_DB_NAME));
    return world.hasProgress() ? world : null;
  } catch (e) {
    console.warn('The walk preview could not open the save — keeping nothing', e);
    return null;
  }
}

function keeperFor(world: World | null, place: string): RoamKeeper {
  if (!world) {
    return { visitsBefore: 0, rainbowTaken: false, keeps: false, recordVisit: () => {}, takeRainbow: async () => true };
  }
  const equipmentId = RUINS_WALK.roam?.rainbow?.equipmentId ?? '';
  return {
    visitsBefore: world.getExplorationVisits(place),
    rainbowTaken: world.hasRareFind(place),
    keeps: true,
    recordVisit: () => void world.recordExplorationVisit(place),
    takeRainbow: () => world.claimRareFind(place, equipmentId),
  };
}

export function WalkPreview({ params }: { params: URLSearchParams }) {
  const id = (params.get('place') ?? 'ANCIENT_RUINS') as WalkPlaceId;
  const scene = PREVIEWABLE[id] ?? RUINS_WALK;
  const view = useMemo(() => ({ known: new Set<string>(), day: 1 }), []);
  const find = params.get('find');
  const forceGrade = find === 'RAINBOW' || find === 'RARE' ? find : undefined;
  const [keeper, setKeeper] = useState<RoamKeeper | null>(scene.roam?.rainbow ? null : keeperFor(null, scene.id));

  useEffect(() => {
    if (keeper) return;
    let gone = false;
    void existingSave().then((world) => !gone && setKeeper(keeperFor(world, scene.id)));
    return () => {
      gone = true;
    };
  }, []);

  // A place walked about in (the ruins) has its own screen; others walk along.
  if (scene.roam) {
    if (!keeper) return <div className="screen walk" data-testid="walk-preview-opening" />;
    return (
      <RoamScene
        scene={scene}
        roam={scene.roam}
        place={scene.id as WalkPlaceId}
        view={view}
        onLeave={() => window.location.assign(window.location.pathname)}
        leaveLabel="タイトルへもどる"
        leaveTestId="walk-preview-leave"
        keeper={keeper}
        forceGrade={forceGrade}
      />
    );
  }
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
