import { useEffect, useState, useSyncExternalStore } from 'react';
import { GameFlow } from './core/flow/gameFlow';
import { WorldMemory } from './core/memory/worldMemory';
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

interface CoreBundle {
  flow: GameFlow;
  memory: WorldMemory;
}

function GameRoot({ flow, memory }: CoreBundle) {
  const state = useSyncExternalStore(
    (cb) => flow.subscribe(cb),
    () => flow.getState(),
  );

  // WORLD MEMORY (the DB) is the truth; derive world facts from it.
  const galdChoiceInWorld = memory.getGaldLifeChoice();

  switch (state.screen) {
    case 'TITLE':
      return (
        <TitleScreen
          hasSave={memory.getEvents().length > 0}
          onStart={() => flow.goTo('PROLOGUE')}
          onContinue={() => flow.goTo('HOME')}
          onReset={async () => {
            await memory.resetWorld();
            window.location.reload();
          }}
        />
      );
    case 'PROLOGUE':
      return <PrologueScreen onComplete={() => flow.goTo('HOME')} />;
    case 'HOME':
      return (
        <HomeScreen
          onExplore={() => flow.goTo('EXPLORE')}
          onWorldMemory={() => flow.goTo('WORLD_MEMORY')}
        />
      );
    case 'WORLD_MEMORY':
      return <WorldMemoryScreen events={memory.getEvents()} onBack={() => flow.goTo('HOME')} />;
    case 'EXPLORE':
      return (
        <ExploreScreen
          onEnterGreenwood={() => flow.goTo('GREENWOOD')}
          onBack={() => flow.goTo('HOME')}
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
            await memory.recordGaldLifeChoice(choice);
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
        const memory = await WorldMemory.open(new IdbMemoryStore());
        if (!cancelled) setBundle({ flow: new GameFlow(), memory });
      } catch (e) {
        console.error('Failed to open WORLD MEMORY', e);
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
  return <GameRoot flow={bundle.flow} memory={bundle.memory} />;
}
