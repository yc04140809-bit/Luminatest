import { Suspense, lazy, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { GameFlow } from './core/flow/gameFlow';
import { World } from './core/world/world';
import { IdbMemoryStore } from './core/memory/idbStore';
import { GALD_LIFE_CHOICE_EVENT_TYPE } from './content/events/galdLifeChoice';
import { TitleScreen } from './ui/screens/TitleScreen';
import { PrologueScreen } from './ui/screens/PrologueScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { homeMemorySummary } from './ui/home/homeSummary';
import { ExploreScreen } from './ui/screens/ExploreScreen';
import { EncounterScreen } from './ui/screens/EncounterScreen';
import { BattleScreen } from './ui/screens/BattleScreen';
import { LifeChoiceScreen } from './ui/screens/LifeChoiceScreen';
import { ChoiceResultScreen } from './ui/screens/ChoiceResultScreen';
import { WorldMemoryScreen } from './ui/screens/WorldMemoryScreen';
import { TimeShiftScreen } from './ui/screens/TimeShiftScreen';
import { FutureSiteScreen } from './ui/screens/FutureSiteScreen';
import { TalkSpotScreen } from './ui/screens/TalkSpotScreen';
import { ArchiveScreen } from './ui/screens/ArchiveScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { PlaytestSurveyScreen } from './ui/screens/PlaytestSurveyScreen';
import { EndingScreen } from './ui/screens/EndingScreen';
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
import type { LocationId } from './content/locations/locationVisuals';
import { futureSiteDef } from './content/world/futureSites';
import { LOCATIONS } from './content/locations/alden';
import { ALDEN_EXPERIENCE_EVENTS } from './content/experience/aldenExperience';
import { locationsWithSomethingNew } from './core/experience/experienceEngine';
import { pickEvent } from './core/experience/director';
import type { TalkEventDef } from './content/experience/aldenExperience';
import {
  GREENWOOD_EXPERIENCE_EVENTS,
  GREENWOOD_FOREST_SPOT,
} from './content/experience/greenwoodExperience';
import { MOSS_RABBIT, speciesOfIndividual } from './content/enemies/species';
import { rollIndividualStory } from './core/enemies/enemyEncounters';
import { CreatureLifeChoiceScreen } from './ui/screens/CreatureLifeChoiceScreen';
import type { EnemyIndividual } from './core/world/world';
import { ExplorationSession } from './game/exploration/explorationSession';
import { debugEncounterType, debugEnemyAction, debugStoryTrigger } from './dev/debugEncounter';
import { battleUi, startFinishable } from './dev/battleUiFlag';
import { BattleUIPrototype } from './ui/battle/BattleUIPrototype';
import { clearObtainedItems } from './platform/discoveries';

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
  // Where the player currently is. It carries no game rules — no event,
  // no world state and no save depends on it — it only tells the scene
  // screens which place they are showing. The encounter and the battle
  // inherit it, which is what makes the fight happen in the forest the
  // player walked into rather than on a screen of its own.
  const [currentLocationId, setCurrentLocationId] = useState<LocationId>('ALDEN_VILLAGE');
  // Where the two of them were standing when a fight took them off the
  // forest screen. Runtime only: never saved, never world truth, and
  // cleared the moment the player walks out of the forest on purpose.
  const forestSession = useRef(new ExplorationSession());
  // Whether the fight on screen is the one in the forest rather than the
  // one the story is about. It decides who is fought and where victory
  // goes, and nothing else.
  //
  // A ref rather than state, and set BEFORE the transition that shows
  // the battle: the flow store and React state do not necessarily land
  // in the same render, and a battle that mounted for one enemy keeps
  // that enemy's health bar for the rest of the fight.
  const forestBattle = useRef(false);
  // Whether the creature in THIS fight turns out to have a life.
  //
  // Rolled when the fight starts rather than when it ends, because the
  // prototype asks the four answers inside the battle screen and has to
  // know before the last blow lands. It is the same roll at the same
  // rate, and the write below commits exactly this answer — so what the
  // world records is what it would have recorded either way.
  const forestStory = useRef(false);
  // The creature that turned out to have a life, between the fight and
  // the four answers. Runtime only — once answered it is world truth and
  // this goes back to null.
  const [metCreature, setMetCreature] = useState<EnemyIndividual | null>(null);

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

  // Where the map should show 「✦」: somewhere with an experience event
  // the player has not met, or a future site they have not walked into.
  // Both are derived from world truth + player knowledge — there is no
  // separate UI flag that could drift out of step with the world.
  const changedLocations = new Set<string>([
    ...locationsWithSomethingNew(ALDEN_EXPERIENCE_EVENTS, world.getExperienceView()),
    ...world
      .getOpenFutureSites()
      .filter((s) => !s.discovered)
      .map((s) => s.def.id),
  ]);

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
            // Finds live beside the settings rather than in the world,
            // so resetting the world has to clear them by name.
            clearObtainedItems();
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
          locationId="ALDEN_VILLAGE"
          clock={world.getClock()}
          // Display only: a projection of what the player already knows,
          // computed on the way in and never stored.
          memory={homeMemorySummary(world.getKnownEvents(), world.getNarrativeSeeds())}
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
          onOpenSurvey={() => flow.goTo('ENDING')}
        />
      );
    case 'ENDING':
      return (
        <EndingScreen
          alreadyAnswered={surveyAnswered}
          onOpenSurvey={() => flow.goTo('PLAYTEST_SURVEY')}
          onOpenArchive={() => flow.goTo('ARCHIVE')}
          onKeepPlaying={() => flow.goTo('HOME')}
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
          <DevAdminScreen
            world={world}
            playtest={playtest}
            onBack={() => flow.goTo('HOME')}
            onOpenBattlePrototype={() => flow.goTo('BATTLE_UI_PROTOTYPE')}
          />
        </Suspense>
      );
    case 'BATTLE_UI_PROTOTYPE':
      // A look at the prototype on its own, from DEV ADMIN. It writes
      // nothing: no victory is recorded, no creature is named, and every
      // way out of it goes straight back where it came from.
      if (!DEV_ADMIN_ENABLED) return <div className="screen" />;
      return (
        <BattleUIPrototype
          key="battle-prototype-preview"
          species={MOSS_RABBIT}
          battleLocationId="GREENWOOD_FOREST"
          finishesInMugenChoice={debugStoryTrigger() === true}
          startFinishable={startFinishable()}
          forcedEnemyAction={debugEnemyAction()}
          onNormalEnd={() => flow.goTo('DEV_ADMIN')}
          onMugenChoice={() => flow.goTo('DEV_ADMIN')}
          onDefeat={() => flow.goTo('DEV_ADMIN')}
        />
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
          // Guidance is for the first shift only — after that the player
          // knows how time works here.
          firstShift={!world.hasEventOfType('WORLD_TIME_SHIFTED')}
          onExplore={() => flow.goTo('EXPLORE')}
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
          onEnterGreenwood={() => {
            setCurrentLocationId('GREENWOOD_FOREST');
            flow.goTo('GREENWOOD');
          }}
          onBack={() => {
            setCurrentLocationId('ALDEN_VILLAGE');
            flow.goTo('HOME');
          }}
          sites={world.getOpenFutureSites()}
          onEnterSite={(siteId) => {
            setCurrentLocationId(siteId as LocationId);
            flow.goTo('FUTURE_SITE');
          }}
          onEnterSpot={(spotId) => {
            setCurrentLocationId(spotId as LocationId);
            flow.goTo('TALK_SPOT');
          }}
          changedLocations={changedLocations}
        />
      );
    case 'TALK_SPOT': {
      const spot = LOCATIONS.find((l) => l.id === currentLocationId);
      if (!spot) return <div className="screen" />;
      return (
        <TalkSpotScreen
          spotId={spot.id as LocationId}
          spotName={spot.name}
          // The engine decides what happens here; the screen only plays it.
          event={
            pickEvent(ALDEN_EXPERIENCE_EVENTS, world.getExperienceView(), {
              location: spot.id,
            }) as TalkEventDef | null
          }
          onSeen={(eventId) => world.markExperienceSeen(eventId)}
          onLeave={() => flow.goTo('EXPLORE')}
        />
      );
    }
    case 'FUTURE_SITE': {
      const site = futureSiteDef(currentLocationId);
      // Only reachable from a card the world itself put on the map.
      if (!site) return <div className="screen" />;
      return (
        <FutureSiteScreen
          site={site}
          firstVisit={!world.hasDiscoveredSite(site.id)}
          onDiscover={async () => {
            await world.recordFutureSiteDiscovery(site.id);
          }}
          // The first discovery is the end of this playtest's arc, on any
          // of the four routes: close it in world terms rather than
          // leaving the player on the map wondering what to do next.
          // Revisits just step back outside.
          onLeaveAfterDiscovery={() => flow.goTo('ENDING')}
          onLeave={() => flow.goTo('EXPLORE')}
        />
      );
    }
    case 'GREENWOOD':
      return (
        <Suspense fallback={<LoadingScreen message="森へ入っています……" />}>
          <GreenwoodScreen
            encounterEnabled={galdChoiceInWorld === null}
            onEncounter={() => flow.goTo('ENCOUNTER')}
            onBack={() => flow.goTo('EXPLORE')}
            session={forestSession.current}
            // The forest's own small events, chosen by the same DIRECTOR
            // that runs the village — a separate registry only because
            // the village list also decides which places wear a ✦.
            pickForestEvent={() =>
              pickEvent(GREENWOOD_EXPERIENCE_EVENTS, world.getExperienceView(), {
                location: GREENWOOD_FOREST_SPOT,
              }) as TalkEventDef | null
            }
            onEventSeen={(eventId) => world.markExperienceSeen(eventId)}
            onForestBattle={() => {
              forestBattle.current = true;
              forestStory.current = rollIndividualStory({
                victoriesSinceStory:
                  world.getEnemyProgress(MOSS_RABBIT.speciesId).sinceStory + 1,
                forced: debugStoryTrigger(),
              });
              flow.goTo('BATTLE');
            }}
            forcedCategory={debugEncounterType()}
          />
        </Suspense>
      );
    case 'ENCOUNTER':
      return (
        <EncounterScreen locationId={currentLocationId} onBattleStart={() => flow.goTo('BATTLE')} />
      );
    case 'BATTLE':
      // Two fights, one screen. The story's fight asks the life question
      // when it is won; a fight in the forest puts the player back on the
      // path they were walking, where they were standing.
      if (forestBattle.current && battleUi() === 'PROTOTYPE') {
        // THE PROTOTYPE. Reachable only through a DEV ADMIN flag that is
        // off by default, applied only to the forest fight, and never to
        // the story's own. The screen below is untouched and one tap
        // away; nothing here has been adopted.
        return (
          <BattleUIPrototype
            key="battle-prototype"
            species={MOSS_RABBIT}
            battleLocationId={currentLocationId}
            // Decided when the fight began, at the real rate.
            finishesInMugenChoice={forestStory.current}
            startFinishable={startFinishable()}
            forcedEnemyAction={debugEnemyAction()}
            onNormalEnd={() => {
              forestBattle.current = false;
              void world
                .resolveEnemyVictory(MOSS_RABBIT.speciesId, { forced: false })
                .catch((e) => console.error('Failed to record the victory', e))
                .finally(() => flow.goTo('GREENWOOD'));
            }}
            onMugenChoice={(choice) => {
              forestBattle.current = false;
              // The real thing: the creature is named and what the
              // player decided is written into WORLD MEMORY, by exactly
              // the code the old screen's path uses.
              void world
                .resolveEnemyVictory(MOSS_RABBIT.speciesId, { forced: true })
                .then((met) => (met ? world.recordCreatureLifeChoice(met.individualId, choice) : null))
                .catch((e) => console.error('Failed to record the choice', e))
                .finally(() => flow.goTo('GREENWOOD'));
            }}
            onDefeat={() => {
              forestBattle.current = false;
              forestSession.current.clear();
              flow.goTo('HOME');
            }}
          />
        );
      }
      if (forestBattle.current) {
        return (
          <BattleScreen
            // Keyed by who is being fought, so the health bar can never
            // belong to the previous occupant of this screen.
            key={MOSS_RABBIT.speciesId}
            battleLocationId={currentLocationId}
            enemy={MOSS_RABBIT}
            forcedEnemyAction={debugEnemyAction()}
            onVictory={() => {
              forestBattle.current = false;
              // Was that one just an animal, or was it somebody? The
              // world decides and writes the count down; only the rare
              // answer comes back as a creature with a name.
              void world
                .resolveEnemyVictory(MOSS_RABBIT.speciesId, { forced: debugStoryTrigger() })
                .then((met) => {
                  if (met) {
                    setMetCreature(met);
                    flow.goTo('CREATURE_LIFE_CHOICE');
                  } else {
                    flow.goTo('GREENWOOD');
                  }
                })
                .catch((e) => {
                  console.error('Failed to record the victory', e);
                  flow.goTo('GREENWOOD');
                });
            }}
            onDefeat={() => {
              forestBattle.current = false;
              forestSession.current.clear();
              flow.goTo('HOME');
            }}
          />
        );
      }
      return (
        <BattleScreen
          key="GALD"
          battleLocationId={currentLocationId}
          onVictory={() => flow.goTo('LIFE_CHOICE')}
          onDefeat={() => flow.goTo('HOME')}
        />
      );
    case 'CREATURE_LIFE_CHOICE': {
      const species = metCreature ? speciesOfIndividual(metCreature.individualId) : null;
      // Only reachable straight from a fight the world named somebody in.
      if (!metCreature || !species) return <div className="screen" />;
      return (
        <CreatureLifeChoiceScreen
          species={species}
          individualId={metCreature.individualId}
          onChoose={async (choice) => {
            await world.recordCreatureLifeChoice(metCreature.individualId, choice);
          }}
          onDone={() => {
            setMetCreature(null);
            flow.goTo('GREENWOOD');
          }}
        />
      );
    }
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
