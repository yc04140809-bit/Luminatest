import { useMemo, useSyncExternalStore } from 'react';
import { GameFlow } from './core/flow/gameFlow';
import { TitleScreen } from './ui/screens/TitleScreen';
import { PrologueScreen } from './ui/screens/PrologueScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { ExploreScreen } from './ui/screens/ExploreScreen';
import { GreenwoodScreen } from './ui/screens/GreenwoodScreen';
import { EncounterScreen } from './ui/screens/EncounterScreen';
import { BattleScreen } from './ui/screens/BattleScreen';
import { LifeChoiceScreen } from './ui/screens/LifeChoiceScreen';
import { ChoiceResultScreen } from './ui/screens/ChoiceResultScreen';

export default function App() {
  const flow = useMemo(() => new GameFlow(), []);
  const state = useSyncExternalStore(
    (cb) => flow.subscribe(cb),
    () => flow.getState(),
  );

  switch (state.screen) {
    case 'TITLE':
      return <TitleScreen onStart={() => flow.goTo('PROLOGUE')} />;
    case 'PROLOGUE':
      return <PrologueScreen onComplete={() => flow.goTo('HOME')} />;
    case 'HOME':
      return <HomeScreen onExplore={() => flow.goTo('EXPLORE')} />;
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
      return <LifeChoiceScreen onChoose={(c) => flow.chooseGaldLife(c)} />;
    case 'CHOICE_RESULT':
      return (
        <ChoiceResultScreen
          choice={state.galdLifeChoice ?? 'SPARE'}
          onReturnHome={() => flow.goTo('HOME')}
        />
      );
  }
}
