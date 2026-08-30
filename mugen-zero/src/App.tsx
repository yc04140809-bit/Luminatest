import { useEffect, useState, useSyncExternalStore } from 'react';
import { GameFlow } from './core/flow/gameFlow';
import { World } from './core/world/world';
import { IdbMemoryStore } from './core/memory/idbStore';
import { GALD_LIFE_CHOICE_EVENT_TYPE } from './content/events/galdLifeChoice';
import { TitleScreen } from './ui/screens/TitleScreen';
import { PrologueScreen } from './ui/screens/PrologueScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { ExploreScreen } from './ui/screens/ExploreScreen';
import { GreenwoodScreen } from './ui/screens/GreenwoodScreen';
import { EncounterScreen } from './ui/screens/EncounterScreen';
import { BattleScreen } from './ui/screens/BattleScreen';
import { LifeChoiceScreen } from './ui/screens/LifeChoiceScreen';
import { ChoiceResultScreen } from './ui/screens/ChoiceResultScreen';
import { WorldMemoryScreen } from './ui/screens/WorldMemoryScreen';
import { TimeShiftScreen } from './ui/screens/TimeShiftScreen';
import { BakeryScreen } from './ui/screens/BakeryScreen';
import { ArchiveScreen } from './ui/screens/ArchiveScreen';
import { DEV_ADMIN_ENABLED } from './dev/devMode';
import { DevLockScreen } from './dev/DevLockScreen';
import { DevAdminScreen } from './dev/DevAdminScreen';

interface CoreBundle {
  flow: GameFlow;
  world: World;
}

function GameRoot({ flow, world }: CoreBundle) {
  const state = useSyncExternalStore(
    (cb) => flow.subscribe(cb),
    () => flow.getState(),
  );
  // Re-render when world truth changes (clock, events, character states).
  useSyncExternalStore(
    (cb) => world.subscribe(cb),
    () => world.getVersion(),
  );

  // WORLD MEMORY (the DB) is the truth; derive world facts from it.
  const galdChoiceInWorld = world.getGaldLifeChoice();

  switch (state.screen) {
    case 'TITLE':
      return (
        <TitleScreen
          hasSave={world.getEvents().length > 0}
          onStart={() => flow.goTo('PROLOGUE')}
          onContinue={() => flow.goTo('HOME')}
          onReset={async () => {
            await world.resetWorld();
            window.location.reload();
          }}
        />
      );
    case 'PROLOGUE':
      return <PrologueScreen onComplete={() => flow.goTo('HOME')} />;
    case 'HOME':
      return (
        <HomeScreen
          clock={world.getClock()}
          onExplore={() => flow.goTo('EXPLORE')}
          onWorldMemory={() => flow.goTo('WORLD_MEMORY')}
          onTimeShift={() => flow.goTo('TIME_SHIFT')}
          onRest={async () => {
            // Event resolution is silent world truth — the player is not
            // notified automatically (knowledge stays separate from truth).
            await world.advanceDay();
          }}
          onArchive={() => flow.goTo('ARCHIVE')}
          onDevAdmin={() => flow.goTo('DEV_LOCK')}
        />
      );
    case 'ARCHIVE':
      // LIFE ARCHIVE is a projection of player knowledge — never raw truth.
      return <ArchiveScreen entries={world.getLifeArchive()} onBack={() => flow.goTo('HOME')} />;
    case 'DEV_LOCK':
      // Unreachable in production builds (the HOME entry is hidden), but
      // never render dev screens when the gate is off.
      if (!DEV_ADMIN_ENABLED) return <div className="screen" />;
      return (
        <DevLockScreen onUnlock={() => flow.goTo('DEV_ADMIN')} onBack={() => flow.goTo('HOME')} />
      );
    case 'DEV_ADMIN':
      if (!DEV_ADMIN_ENABLED) return <div className="screen" />;
      return <DevAdminScreen world={world} onBack={() => flow.goTo('HOME')} />;
    case 'TIME_SHIFT':
      return (
        <TimeShiftScreen
          years={3}
          onConfirm={async () => {
            await world.timeShift(3);
          }}
          onStay={() => flow.goTo('HOME')}
          onDone={() => flow.goTo('HOME')}
        />
      );
    case 'WORLD_MEMORY':
      // Player-facing view: known events only, never the full truth.
      return (
        <WorldMemoryScreen events={world.getKnownEvents()} onBack={() => flow.goTo('HOME')} />
      );
    case 'EXPLORE':
      return (
        <ExploreScreen
          onEnterGreenwood={() => flow.goTo('GREENWOOD')}
          onBack={() => flow.goTo('HOME')}
          bakeryOpen={world.isBakeryOpen()}
          bakeryDiscovered={world.hasReunitedWithGald()}
          onEnterBakery={() => flow.goTo('BAKERY')}
        />
      );
    case 'BAKERY':
      return (
        <BakeryScreen
          firstVisit={!world.hasReunitedWithGald()}
          onReunion={async () => {
            await world.recordGaldReunion();
          }}
          onLeave={() => flow.goTo('EXPLORE')}
        />
      );
    case 'GREENWOOD':
      return (
        <GreenwoodScreen
          encounterEnabled={galdChoiceInWorld === null}
          onEncounter={() => flow.goTo('ENCOUNTER')}
          onBack={() => flow.goTo('EXPLORE')}
        />
      );
    case 'ENCOUNTER':
      return <EncounterScreen onBattleStart={() => flow.goTo('BATTLE')} />;
    case 'BATTLE':
      return (
        <BattleScreen
          onVictory={() => flow.goTo('LIFE_CHOICE')}
          onDefeat={() => flow.goTo('HOME')}
        />
      );
    case 'LIFE_CHOICE':
      return (
        <LifeChoiceScreen
          onChoose={async (choice) => {
            // Persist to WORLD MEMORY first; only advance once the DB
            // confirms the write.
            await world.recordGaldLifeChoice(choice);
            flow.chooseGaldLife(choice);
          }}
        />
      );
    case 'CHOICE_RESULT': {
      const choice = state.galdLifeChoice ?? 'SPARE';
      return (
        <ChoiceResultScreen
          choice={choice}
          recordedEventType={GALD_LIFE_CHOICE_EVENT_TYPE[choice]}
          onReturnHome={() => flow.goTo('HOME')}
        />
      );
    }
  }
}

export default function App() {
  const [bundle, setBundle] = useState<CoreBundle | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const world = await World.open(new IdbMemoryStore());
        if (!cancelled) setBundle({ flow: new GameFlow(), world });
      } catch (e) {
        console.error('Failed to open the saved world', e);
        if (!cancelled) setInitError('セーブデータの読み込みに失敗しました。');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (initError) {
    return (
      <div className="screen title-screen">
        <p style={{ color: 'var(--danger)' }}>{initError}</p>
      </div>
    );
  }
  if (!bundle) {
    return <div className="screen title-screen" data-testid="loading-screen" />;
  }
  return <GameRoot flow={bundle.flow} world={bundle.world} />;
}
