import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { GameFlow } from '@mugen/core/flow/gameFlow';
import type { World } from '@mugen/core/world/world';
import { resumeAreaOf } from '@mugen/core/world/world';
import { NOTHING_APPLIED, NO_REWARD, type AppliedReward } from '@mugen/core/progression/battleReward';
import { rewardForSpecies } from '@mugen/content/progression/enemyRewards';
import { MOSS_RABBIT } from '@mugen/content/enemies/species';
import { openAppWorld } from './platform/save';
import {
  AldenScreen,
  GreenwoodScreen,
  MapScreen,
  OpeningScreen,
  TitleScreen,
} from './ui/screens';
import { BagScreen } from './ui/bag';
import {
  ChoiceResultScreen,
  GaldEncounterScreen,
  LifeChoiceScreen,
} from './ui/gald';
import { GALD_BATTLE } from '@mugen/content/enemies/galdBattle';
import { specOf } from '@mugen/game/battle/enemySpec';
import { ItemShopScreen } from './ui/shop';
import { ArchiveScreen, WorldMemoryScreen } from './ui/memory';
import { FutureSiteScreen } from './ui/futureSite';
import { FutureVisionScreen } from './ui/futureVision';
import { StatusScreen } from './ui/status';
import { NamingScreen } from './ui/naming';
import { EquipmentScreen } from './ui/equipment';
import { useSceneBgm } from './ui/audio/useSceneBgm';
import { audioManager } from './platform/audio';
import { battleBgmFor } from '@mugen/content/audio/battleBgm';
import { backTargetFor, exitNativeApp, useAndroidBackButton } from './platform/androidBack';
import {
  GALD_FUTURE_VISION_ID,
  GALD_FUTURE_VISION_YEARS,
} from '@mugen/content/events/galdLifeChoice';
import { BattleScreen, ResultScreen } from './ui/battle';

/**
 * MUGEN ZERO — APP ALPHA.
 *
 * One loop, end to end, on the shared core:
 *
 *   TITLE → OPENING → ALDEN → GREENWOOD → BATTLE → RESULT → 探索復帰
 *   → SAVE → 終了 → 再起動 → CONTINUE
 *
 * Everything that decides anything — the flow's own transition table,
 * the fight, the winnings, the levels, the party's condition, the save
 * and its migrations — is imported from `@mugen/core` and
 * `@mugen/game`. Nothing in this package computes a game rule. That is
 * the whole claim Phase 1 is making, and it is checkable by reading
 * the imports at the top of every file here.
 */
export default function App() {
  const [ready, setReady] = useState<{ flow: GameFlow; world: World; saving: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let gone = false;
    void openAppWorld()
      .then(({ world, saving }) => {
        if (!gone) setReady({ flow: new GameFlow(), world, saving });
      })
      .catch((e) => {
        console.error('Could not open a world at all', e);
        if (!gone) setError('ゲームを開始できませんでした。');
      });
    return () => {
      gone = true;
    };
  }, []);

  if (error) return <div className="screen">{error}</div>;
  if (!ready) return <div className="screen">読み込み中……</div>;
  return <Game {...ready} />;
}

function Game({ flow, world, saving }: { flow: GameFlow; world: World; saving: boolean }) {
  // Asked once, on the way out of the opening. See `case 'PROLOGUE'`.
  const [naming, setNaming] = useState(false);
  const [namingBusy, setNamingBusy] = useState(false);
  /**
   * EQUIPMENT IS A LEAF OF STATUS, not a screen of its own.
   *
   * `Screen` is shared with the Artifact, whose `backTarget.ts` is a
   * total `Record<Screen, …>` and which may not be touched — the same
   * reason naming stayed out of the union. Holding it here also makes
   * the relationship true: 装備 belongs under ステータス, and もどる
   * from it goes back there rather than to the village.
   */
  const [equipment, setEquipment] = useState(false);
  const state = useSyncExternalStore(
    (cb) => flow.subscribe(cb),
    () => flow.getState(),
  );

  /**
   * A HANDLE ON THE WORLD, IN DEVELOPMENT BUILDS ONLY.
   *
   * The e2e has to put a second sword in somebody's hands to test
   * changing weapons, and the alternative was adding it to the real
   * starting kit — which the brief forbids, and rightly: a test must
   * not change the game to suit itself.
   *
   * `import.meta.env.DEV` is compile-time, so this is not in the
   * shipped bundle at all rather than merely unreachable in it.
   */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __mugenWorld?: World }).__mugenWorld = world;
    // And the player, so a test can ask what is SOUNDING rather than
    // what was asked for — the two differ exactly when something is
    // wrong, which is when it matters.
    (window as unknown as { __mugenAudio?: typeof audioManager }).__mugenAudio = audioManager;
    return () => {
      delete (window as unknown as { __mugenWorld?: World }).__mugenWorld;
      delete (window as unknown as { __mugenAudio?: typeof audioManager }).__mugenAudio;
    };
  }, [world]);
  // Redrawn when world truth changes, the same way the Artifact does it.
  useSyncExternalStore(
    (cb) => world.subscribe(cb),
    () => world.getVersion(),
  );

  /**
   * ANDROID'S BACK BUTTON. Native only — the web build keeps the
   * browser's own. Asks the CURRENT screen where to go, and swallows
   * the press wherever leaving would undo something: see
   * `androidBack.ts` for which screens those are and why.
   *
   * The naming question swallows it too, and not by being in that
   * table: there is no answer yet to go back to, and walking out
   * would leave a player nameless in their own village.
   */
  // Leaving STATUS closes the equipment leaf: coming back to the
  // status screen and landing on equipment would be a surprise.
  useEffect(() => {
    if (state.screen !== 'STATUS' && equipment) setEquipment(false);
  }, [state.screen, equipment]);

  useAndroidBackButton(() => {
    if (naming) return;
    // Back out of equipment to status first, not out to the village.
    if (state.screen === 'STATUS' && equipment) {
      setEquipment(false);
      return;
    }
    const target = backTargetFor(state.screen);
    if (target === null) return;
    if (target === 'EXIT') {
      exitNativeApp();
      return;
    }
    flow.goTo(target);
  });


  const [winnings, setWinnings] = useState<AppliedReward | null>(null);
  /**
   * THE ID OF THE FIGHT BEING PAID FOR, minted when it starts.
   *
   * The same guard the Artifact uses, for the same reason: the world
   * refuses to pay the same id twice, so every route out of a battle
   * can hand it over without anybody counting presses.
   */
  const fight = useRef('');

  /**
   * WHERE THE PLAYER IS, WRITTEN DOWN AS SOON AS IT CHANGES.
   *
   * An AREA, not a screen. A screen is a moment — a fight mid-turn, a
   * line half read — and restoring a moment means saving everything
   * that moment stood on. A place is a fact, and it is the only part
   * of "where was I" a player actually misses.
   *
   * Written immediately, and that is deliberate. The obvious worry is
   * write traffic: walking into the forest, a fight, the result screen
   * and back out is five screen changes in a few seconds. But
   * `RESUME_AREA` already collapses every one of those to 'EXPLORE',
   * and `setResumeArea` returns without touching the store when the
   * area has not changed — so the whole walk is ONE commit no matter
   * how it is timed. Delaying the write would not save a commit; it
   * would only open a window in which the save says the player is
   * somewhere they have already left, and closing the game inside that
   * window resumes into the wrong place.
   */
  useEffect(() => {
    // Null is the title and the prologue: ways into a world rather
    // than places in one.
    const area = resumeAreaOf(state.screen);
    if (!area) return;
    void world.setResumeArea(area).catch(() => {
      /* a forgotten doorway is not worth interrupting anybody over */
    });
  }, [state.screen, world]);

  /**
   * THE PAGE GOING AWAY IS THE LAST CHANCE TO WRITE ANYTHING.
   *
   * On a phone the game is not closed, it is BACKGROUNDED — a call
   * arrives, the browser is swapped away from — and the tab may never
   * be given another frame. `visibilitychange` to hidden is the last
   * event that reliably arrives; `pagehide` covers the actual close.
   *
   * The doorway above is already on disk by now, so what is owed here
   * is the backup: a fresh last-known-good copy, so that a save
   * corrupted later is rolled back to minutes ago rather than to the
   * start of the session.
   */
  useEffect(() => {
    const flush = () => {
      void world.snapshotBackup().catch(() => {});
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, [world]);

  /**
   * WHICH FIGHT IS ON, kept beside the flow rather than inside it.
   *
   * The shared flow table has one BATTLE screen and is right to: what
   * differs is who is standing there. This is the App's note of which
   * door was walked through, and it decides nothing about the world.
   */
  const story = useRef(false);

  /**
   * THE MUSIC. One call, before any screen is chosen.
   *
   * Every piece is decided by `bgmForScene` in core — the same map the
   * Artifact plays by — so the App and the Artifact cannot disagree
   * about what a place sounds like.
   *
   * THE FIGHT THAT MATTERS BRINGS ITS OWN MUSIC. `story` marks the Gald
   * sequence from the road to the four answers, and `battleBgmFor`
   * turns that into BOSS_BATTLE whatever anybody chose — which is why
   * the result screen after his fight keeps the boss piece rather than
   * dropping back to the ordinary one mid-scene. Choosing and unlocking
   * pieces is the NEXT step; for now every other fight is the ordinary
   * piece, which is exactly what an un-taught caller of `battleBgmFor`
   * gets.
   *
   * `locationId` is null because the App's screens carry no place: the
   * talk spots that need it are not in the App, and the future site is
   * the bakery in Alden, which null already answers correctly.
   */
  useSceneBgm({
    // THE APP HAS NO THEME-CHOICE SCREEN. The flow starts on
    // THEME_CHOICE and the App draws the title for it, so to the player
    // it IS the title — and the map says THEME_CHOICE is silent, which
    // left the one screen everybody sees first with nothing playing.
    // The Artifact fixed exactly this complaint from a phone; the App
    // must not reintroduce it by inheriting a screen it does not show.
    screen: state.screen === 'THEME_CHOICE' ? 'TITLE' : state.screen,
    locationId: null,
    kaosSpeaking: false,
    battleBgmId: battleBgmFor(story.current ? 'GALD' : null, null),
  });

  /**
   * IS THE ONE LOOK AHEAD STILL OWED?
   *
   * Three states, and all three are read from the world rather than
   * remembered here, so a restart answers the same question:
   *
   *   A  the four answers are not decided  → nothing owed
   *   B  decided, vision not finished      → owed
   *   C  vision finished                   → never again
   *
   * C is NOT `WORLD_TIME_SHIFTED`: that would mean three years really
   * passed, and in this design they do not. It is the existing
   * "experiences the player has met" set — already saved, already a
   * plain list of ids, and empty on a save written before this, which
   * is the right default.
   */
  const visionOwed = () =>
    world.getGaldLifeChoice() !== null &&
    !world.hasSeenExperience(GALD_FUTURE_VISION_ID) &&
    // A SAVE FROM THE OLD BUILD, where the shift really did spend
    // three years. Such a world is at year four with his whole life
    // already behind it, and offering to SHOW it three years ahead
    // would be both empty and a lie about what happened. It is left
    // exactly as it is — not rewound, not rewritten, not migrated —
    // and simply not offered the look. This reads
    // `WORLD_TIME_SHIFTED` to recognise an old save, which is not the
    // same as using it as the new completion marker.
    !world.hasEventOfType('WORLD_TIME_SHIFTED');

  /**
   * ONE NIGHT AT A TIME.
   *
   * `advanceDay` is not re-entrant: it reads the clock, works out
   * tomorrow and commits, so two calls in flight together both start
   * from today and one night is quietly lost. `timeShift` guards
   * itself against exactly this; `advanceDay` does not. Resting used
   * to be a thing a player did once, and is now something they may do
   * many times in a row to let a life play out, so the door has to be
   * shut while one is in progress. The guard is here rather than in
   * the world because it is this screen that can fire twice.
   */
  const [resting, setResting] = useState(false);

  /**
   * HE IS BEATEN, AND THAT IS NOT A REWARD.
   *
   * The story's fight pays no experience and drops nothing: what is on
   * the other side of it is the question. The wounds still carry out,
   * because they are the party's and not the fight's.
   */
  const wonTheStory = useCallback(
    (final: { hp: number; mp: number }) => {
      void world
        .setBattleCondition(final)
        .catch((e) => console.error('Failed to carry the wounds out', e))
        .finally(() => flow.goTo('LIFE_CHOICE'));
    },
    [flow, world],
  );

  const won = useCallback(
    (final: { hp: number; mp: number }) => {
      void world
        .setBattleCondition(final)
        .then(() =>
          world.applyBattleReward(fight.current, rewardForSpecies(MOSS_RABBIT.speciesId) ?? NO_REWARD),
        )
        .then((paid) => setWinnings(paid))
        .catch((e) => console.error('Failed to record the victory', e))
        .finally(() => flow.goTo('BATTLE_RESULT'));
    },
    [flow, world],
  );

  switch (state.screen) {
    case 'THEME_CHOICE':
    case 'TITLE':
      return (
        <TitleScreen
          hasSave={world.hasProgress()}
          saving={saving}
          onStart={() => {
            if (state.screen === 'THEME_CHOICE') flow.goTo('TITLE');
            flow.goTo('PROLOGUE');
          }}
          onContinue={() => {
            if (state.screen === 'THEME_CHOICE') flow.goTo('TITLE');
            flow.goTo('HOME');
            // AN UNFINISHED LOOK AHEAD IS RESUMED, and it comes first:
            // the four answers are already saved, so the player is
            // never asked to decide again — only to finish seeing.
            if (visionOwed()) {
              flow.goTo('TIME_SHIFT');
              return;
            }
            // Otherwise, back where they were: the one thing
            // 「つづきから」 owes beyond the world itself.
            if (world.getResumeArea() === 'EXPLORE') flow.goTo('EXPLORE');
          }}
        />
      );
    case 'PROLOGUE':
      // NAMING SITS BETWEEN THE OPENING AND THE VILLAGE, and stays out
      // of the `Screen` union: that union is shared with the Artifact,
      // whose `backTarget.ts` is a total `Record<Screen, …>`, and the
      // Artifact may not be touched this round. Keeping it here also
      // means 「つづきから」 — which goes straight to HOME — cannot
      // reach it, so a returning player is never asked twice without
      // any flag being consulted to arrange that.
      if (naming) {
        return (
          <NamingScreen
            busy={namingBusy}
            onConfirm={(name) => {
              if (namingBusy) return;
              setNamingBusy(true);
              // SAVED BEFORE THE VILLAGE IS SHOWN. A name confirmed and
              // then lost to a crash on the way in would be asked for
              // again, and the second asking is the bug.
              void world
                .setHeroName(name)
                .finally(() => {
                  setNaming(false);
                  setNamingBusy(false);
                  flow.goTo('HOME');
                });
            }}
          />
        );
      }
      return <OpeningScreen onDone={() => setNaming(true)} />;
    case 'HOME':
      return (
        <AldenScreen
          world={world}
          onExplore={() => flow.goTo('EXPLORE')}
          onBag={() => flow.goTo('BAG')}
          onMemory={() => flow.goTo('WORLD_MEMORY')}
          onArchive={() => flow.goTo('ARCHIVE')}
          onStatus={() => flow.goTo('STATUS')}
          resting={resting}
          onRest={() => {
            if (resting) return;
            setResting(true);
            void world
              .advanceDay()
              .then(() => world.restoreParty())
              .catch((e) => console.error('The night did not pass', e))
              .finally(() => setResting(false));
          }}
        />
      );
    case 'BAG':
      return <BagScreen world={world} onBack={() => flow.goTo('HOME')} />;
    case 'WORLD_MEMORY':
      return <WorldMemoryScreen world={world} onBack={() => flow.goTo('HOME')} />;
    case 'ARCHIVE':
      return <ArchiveScreen world={world} onBack={() => flow.goTo('HOME')} />;
    case 'STATUS':
      if (equipment) {
        return (
          <EquipmentScreen
            world={world}
            onBack={() => flow.goTo('HOME')}
            onStatus={() => setEquipment(false)}
          />
        );
      }
      return (
        <StatusScreen
          world={world}
          onBack={() => flow.goTo('HOME')}
          onEquipment={() => setEquipment(true)}
        />
      );
    case 'EXPLORE':
      return (
        <MapScreen
          // Opened by what the player decided, not by this screen.
          places={world.getOpenFutureSites().length}
          onShop={() => flow.goTo('ITEM_SHOP')}
          onForest={() => flow.goTo('GREENWOOD')}
          onPlaces={() => flow.goTo('FUTURE_SITE')}
          onHome={() => flow.goTo('HOME')}
        />
      );
    case 'ITEM_SHOP':
      return <ItemShopScreen world={world} onLeave={() => flow.goTo('EXPLORE')} />;
    case 'FUTURE_SITE':
      return <FutureSiteScreen world={world} onLeave={() => flow.goTo('EXPLORE')} />;
    case 'GREENWOOD':
      return (
        <GreenwoodScreen
          // THE WORLD DECIDES WHETHER HE IS THERE, not a flag here.
          // Once one of the four answers is on disk this is false for
          // good, which is what makes the encounter unrepeatable.
          galdWaiting={world.getGaldLifeChoice() === null}
          onGald={() => {
            story.current = true;
            flow.goTo('ENCOUNTER');
          }}
          onFight={() => {
            story.current = false;
            fight.current = `fight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            flow.goTo('BATTLE');
          }}
          onLeave={() => flow.goTo('EXPLORE')}
        />
      );
    case 'ENCOUNTER':
      return <GaldEncounterScreen onBattle={() => flow.goTo('BATTLE')} />;
    case 'BATTLE':
      return (
        <BattleScreen
          // One screen, two fights, and the numbers are the only
          // difference between them. Both specs are content.
          key={story.current ? 'gald' : 'rabbit'}
          spec={story.current ? GALD_BATTLE : specOf(MOSS_RABBIT)}
          world={world}
          onWon={story.current ? wonTheStory : won}
          onLost={() => {
            // Carried home and put back on their feet, exactly as in
            // the Artifact: losing once must not make losing again
            // unavoidable.
            void world.restoreParty().finally(() => flow.goTo('HOME'));
          }}
        />
      );
    case 'LIFE_CHOICE':
      return (
        <LifeChoiceScreen
          onChoose={async (choice) => {
            // WORLD MEMORY FIRST. The screen advances only once the
            // database has confirmed the write, so a choice the player
            // made can never be a choice the world does not hold.
            await world.recordGaldLifeChoice(choice);
            flow.chooseGaldLife(choice);
          }}
        />
      );
    case 'CHOICE_RESULT':
      return (
        <ChoiceResultScreen
          choice={state.galdLifeChoice ?? 'SPARE'}
          onHome={() => {
            /**
             * THE LOOK AHEAD IS THE TAIL OF THIS SCENE.
             *
             * One story sequence: the fight, the four answers, the
             * write to WORLD MEMORY, and then — with no village and no
             * free action in between — Kaos showing them where it
             * ends. CHOICE_RESULT cannot reach that screen directly,
             * so the shared table routes it through HOME; both moves
             * happen in one handler, so HOME is never drawn.
             */
            flow.goTo('HOME');
            if (visionOwed()) flow.goTo('TIME_SHIFT');
          }}
        />
      );
    case 'TIME_SHIFT':
      return (
        <FutureVisionScreen
          // PURE. Reads the chain forward from a date this world has
          // not reached and commits nothing.
          future={world.previewLifeEvents(GALD_FUTURE_VISION_YEARS)}
          onDone={() => {
            // Marked seen only now, and the screen waits for the write
            // before leaving: closing the app mid-vision leaves it owed.
            void world
              .markExperienceSeen(GALD_FUTURE_VISION_ID)
              .catch((e) => console.error('Could not remember the vision', e))
              .finally(() => flow.goTo('HOME'));
          }}
        />
      );
    case 'BATTLE_RESULT':
      return (
        <ResultScreen
          reward={winnings ?? NOTHING_APPLIED}
          onDone={() => {
            if (flow.getState().screen !== 'BATTLE_RESULT') return;
            setWinnings(null);
            flow.goTo('GREENWOOD');
          }}
        />
      );
    default:
      return <div className="screen">（この画面はApp Alphaにはまだありません）</div>;
  }
}
