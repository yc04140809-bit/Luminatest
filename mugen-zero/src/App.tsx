import { Suspense, lazy, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { GameFlow } from './core/flow/gameFlow';
import { World } from './core/world/world';
import { IdbMemoryStore } from './core/memory/idbStore';
import { GALD_LIFE_CHOICE_EVENT_TYPE } from './content/events/galdLifeChoice';
import { TitleScreen } from './ui/screens/TitleScreen';
import { PrologueScreen } from './ui/screens/PrologueScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { ExploreScreen } from './ui/screens/ExploreScreen';
import { EncounterScreen } from './ui/screens/EncounterScreen';
import { BattleScreen } from './ui/screens/BattleScreen';
import { LifeChoiceScreen } from './ui/screens/LifeChoiceScreen';
import { ChoiceResultScreen } from './ui/screens/ChoiceResultScreen';
import { WorldMemoryScreen } from './ui/screens/WorldMemoryScreen';
import { TimeShiftScreen } from './ui/screens/TimeShiftScreen';
import { BakeryScreen } from './ui/screens/BakeryScreen';
import { ArchiveScreen } from './ui/screens/ArchiveScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { PlaytestSurveyScreen } from './ui/screens/PlaytestSurveyScreen';
import { LoadingScreen } from './ui/common/LoadingScreen';
import { DEV_ADMIN_ENABLED } from './dev/devMode';
import {
  loadSettings,
  saveSettings,
  applyReducedMotion,
  type GameSettings,
} from './platform/settings';
import { audioManager } from './platform/audio';
import { setHapticEnabled } from './platform/haptics';
import { PlaytestFeedbackService, isSurveyAvailable } from './core/playtest/playtestService';
import { IdbFeedbackStore } from './core/playtest/idbFeedbackStore';
import { startNewPlaySession } from './core/playtest/playSession';

// Phaser is the heaviest dependency by far and is only needed once the
// player walks into the forest; the dev admin never ships to a player's
// first load. Both load on demand.
const GreenwoodScreen = lazy(() =>
  import('./ui/screens/GreenwoodScreen').then((m) => ({ default: m.GreenwoodScreen })),
);
const DevLockScreen = lazy(() =>
  import('./dev/DevLockScreen').then((m) => ({ default: m.DevLockScreen })),
);
const DevAdminScreen = lazy(() =>
  import('./dev/DevAdminScreen').then((m) => ({ default: m.DevAdminScreen })),
);

interface CoreBundle {
  flow: GameFlow;
  world: World;
  /** Playtest feedback is a separate layer: never world canon. */
  playtest: PlaytestFeedbackService;
}

interface GameRootProps extends CoreBundle {
  settings: GameSettings;
  onSettingsChange: (next: GameSettings) => void;
}

function GameRoot({ flow, world, playtest, settings, onSettingsChange }: GameRootProps) {
  const [surveyAnswered, setSurveyAnswered] = useState(false);

  // Reflects whether THIS playthrough already sent feedback.
  useEffect(() => {
    let cancelled = false;
    playtest
      .hasAnswered()
      .then((answered) => {
        if (!cancelled) setSurveyAnswered(answered);
      })
      .catch(() => {
        /* the archive simply keeps offering the survey */
      });
    return () => {
      cancelled = true;
    };
  }, [playtest]);
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
          hasSave={world.hasProgress()}
          onStart={() => {
            audioManager.unlock(); // first real gesture: audio may begin
            flow.goTo('PROLOGUE');
          }}
          onContinue={() => {
            audioManager.unlock();
            flow.goTo('HOME');
          }}
          onReset={async () => {
            await world.resetWorld();
            // A fresh world is a fresh playthrough to ask about; past
            // feedback is deliberately kept.
            startNewPlaySession();
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
          onSettings={() => flow.goTo('SETTINGS')}
          onDevAdmin={() => flow.goTo('DEV_LOCK')}
        />
      );
    case 'ARCHIVE':
      // LIFE ARCHIVE is a projection of player knowledge — never raw truth.
      return (
        <ArchiveScreen
          entries={world.getLifeArchive()}
          onBack={() => flow.goTo('HOME')}
          surveyAvailable={isSurveyAvailable(world)}
          surveyAnswered={surveyAnswered}
          onOpenSurvey={() => flow.goTo('PLAYTEST_SURVEY')}
        />
      );
    case 'PLAYTEST_SURVEY':
      return (
        <PlaytestSurveyScreen
          world={world}
          service={playtest}
          onFinish={() => {
            setSurveyAnswered(true);
            flow.goTo('HOME');
          }}
          onOpenArchive={() => {
            setSurveyAnswered(true);
            flow.goTo('ARCHIVE');
          }}
        />
      );
    case 'SETTINGS':
      return (
        <SettingsScreen
          settings={settings}
          onChange={onSettingsChange}
          onBack={() => flow.goTo('HOME')}
        />
      );
    case 'DEV_LOCK':
      // Unreachable in production builds (the HOME entry is hidden), but
      // never render dev screens when the gate is off.
      if (!DEV_ADMIN_ENABLED) return <div className="screen" />;
      return (
        <Suspense fallback={<LoadingScreen />}>
          <DevLockScreen onUnlock={() => flow.goTo('DEV_ADMIN')} onBack={() => flow.goTo('HOME')} />
        </Suspense>
      );
    case 'DEV_ADMIN':
      if (!DEV_ADMIN_ENABLED) return <div className="screen" />;
      return (
        <Suspense fallback={<LoadingScreen />}>
          <DevAdminScreen world={world} playtest={playtest} onBack={() => flow.goTo('HOME')} />
        </Suspense>
      );
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
        <Suspense fallback={<LoadingScreen message="森へ入っています……" />}>
          <GreenwoodScreen
            encounterEnabled={galdChoiceInWorld === null}
            onEncounter={() => flow.goTo('ENCOUNTER')}
            onBack={() => flow.goTo('EXPLORE')}
          />
        </Suspense>
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
  // Preferences live outside the world: localStorage, never IndexedDB.
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());

  useEffect(() => {
    applyReducedMotion(settings.reducedMotion);
    audioManager.setVolumes(settings.bgmVolume, settings.seVolume);
    setHapticEnabled(settings.hapticEnabled);
  }, [settings]);

  const handleSettingsChange = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const world = await World.open(new IdbMemoryStore());
        const playtest = await PlaytestFeedbackService.open(new IdbFeedbackStore());
        if (!cancelled) setBundle({ flow: new GameFlow(), world, playtest });
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
      <div className="screen title-screen" data-testid="init-error">
        <h1 className="title-logo" style={{ fontSize: 24 }}>
          MUGEN ZERO
        </h1>
        <p
          style={{
            color: 'var(--danger)',
            fontSize: 'var(--font-size-sm)',
            lineHeight: 'var(--line-height-body)',
            textAlign: 'center',
            padding: '0 24px',
          }}
        >
          {initError}
          <br />
          ブラウザのプライベートモードでは保存できない場合があります。
        </p>
        <button className="btn primary" onClick={() => window.location.reload()}>
          再読み込み
        </button>
      </div>
    );
  }
  if (!bundle) return <LoadingScreen />;
  return (
    <GameRoot
      flow={bundle.flow}
      world={bundle.world}
      playtest={bundle.playtest}
      settings={settings}
      onSettingsChange={handleSettingsChange}
    />
  );
}
