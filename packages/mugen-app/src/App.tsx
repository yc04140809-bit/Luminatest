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
  const state = useSyncExternalStore(
    (cb) => flow.subscribe(cb),
    () => flow.getState(),
  );
  // Redrawn when world truth changes, the same way the Artifact does it.
  useSyncExternalStore(
    (cb) => world.subscribe(cb),
    () => world.getVersion(),
  );

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
            // Back where they were: the one thing 「つづきから」 owes
            // beyond the world itself.
            if (world.getResumeArea() === 'EXPLORE') flow.goTo('EXPLORE');
          }}
        />
      );
    case 'PROLOGUE':
      return <OpeningScreen onDone={() => flow.goTo('HOME')} />;
    case 'HOME':
      return (
        <AldenScreen
          world={world}
          onExplore={() => flow.goTo('EXPLORE')}
          onBag={() => flow.goTo('BAG')}
          onRest={() => {
            void world.advanceDay().then(() => world.restoreParty());
          }}
        />
      );
    case 'BAG':
      return <BagScreen world={world} onBack={() => flow.goTo('HOME')} />;
    case 'EXPLORE':
      return (
        <MapScreen
          onShop={() => flow.goTo('ITEM_SHOP')}
          onForest={() => flow.goTo('GREENWOOD')}
          onHome={() => flow.goTo('HOME')}
        />
      );
    case 'ITEM_SHOP':
      return <ItemShopScreen world={world} onLeave={() => flow.goTo('EXPLORE')} />;
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
          onHome={() => flow.goTo('HOME')}
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
