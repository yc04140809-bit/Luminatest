import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { GameFlow } from '@mugen/core/flow/gameFlow';
import type { World } from '@mugen/core/world/world';
import { resumeAreaOf } from '@mugen/core/world/world';
import { NOTHING_APPLIED, NO_REWARD, type AppliedReward } from '@mugen/core/progression/battleReward';
import { rewardForSpecies } from '@mugen/content/progression/enemyRewards';
import { openAppWorld } from './platform/save';
import {
  AldenScreen,
  GreenwoodScreen,
  MapScreen,
  TitleScreen,
} from './ui/screens';
import { BagScreen } from './ui/bag';
import {
  ChoiceResultScreen,
  GaldEncounterScreen,
  LifeChoiceScreen,
} from './ui/gald';
import { GALD_BATTLE } from '@mugen/content/enemies/galdBattle';
import { GALD_DEFEATED_LINES } from '@mugen/content/dialogue/galdEncounter';
import { specOf } from '@mugen/game/battle/enemySpec';
import { ItemShopScreen } from './ui/shop';
import { ArchiveScreen, WorldMemoryScreen } from './ui/memory';
import { FutureSiteScreen } from './ui/futureSite';
import { TavernScreen } from './ui/tavern';
import { tonightsGuestTalk } from '@mugen/content/talk/tavernGuests';
import { toAbsoluteDay } from '@mugen/core/time/calendar';
import type { BgmId } from '@mugen/assets';
import { BakeryScreen } from './ui/bakery';
import { FutureVisionScreen } from './ui/futureVision';
import { StatusScreen } from './ui/status';
import { NamingScreen } from './ui/naming';
import { IntroScreen } from './ui/intro';
import { OPENING_INTRO_MARK } from '@mugen/content/story/openingIntro';
import { EquipmentScreen } from './ui/equipment';
import { useSceneBgm } from './ui/audio/useSceneBgm';
import { audioManager } from './platform/audio';
import {
  FORCED_BATTLE_BGM,
  battleBgmFor,
  battleBgmLabel,
  canChooseBattleBgm,
  nextBattleBgm,
} from '@mugen/content/audio/battleBgm';
import { battleBgmChoice, setBattleBgmChoice } from './platform/battleBgmChoice';
import { DebugEntry } from './dev/DebugEntry';
import { backTargetFor, exitNativeApp, useAndroidBackButton } from './platform/androidBack';
import {
  GALD_FUTURE_VISION_ID,
  GALD_FUTURE_VISION_YEARS,
} from '@mugen/content/events/galdLifeChoice';
import { BattleScreen, ResultScreen } from './ui/battle';
import type { RoamMemory } from './ui/explore/RoamScene';
import { PrologueScreen } from './ui/prologue';
import { battleBackgroundFor } from '@mugen/content/locations/battleBackgrounds';
import { SEKIRYUGA_BATTLE } from '@mugen/content/enemies/sekiryugaBattle';
import { RUINS_CRY_MARK, SEKIRYUGA_REVISIT_MARK, SEKIRYUGA_RUMORS } from '@mugen/content/story/sekiryugaArc';
import { GRAVE_MEETING_MARK, hasMetGrave } from '@mugen/content/talk/graveTalks';
import { pickupKeeper } from './ui/explore/pickupKeeper';
import { stageReached } from '@mugen/core/world/storyArc';

/** The one-time notice that AUTO is open (core/world/readMarks.ts `note:`). */
const AUTO_NOTICE = 'note:auto_battle';

/** 古代遺跡 on the map, as a destination (core/world/readMarks.ts `dest:`). */
const RUINS_DESTINATION = 'dest:ANCIENT_RUINS';
import { RumorScreen, rumorsOf } from './ui/rumors';
import { KaosAside } from './ui/incident';
import { DailyAside } from './ui/daily';
import { CreatureEncounterScreen, CreatureLifeChoiceScreen } from './ui/creatureChoice';
import { FIRST_SIGHT, firstSightMark, wildSpeciesFor } from '@mugen/content/enemies/encounters';
import { ENEMY_SPECIES, type SpeciesId } from '@mugen/content/enemies/species';
import {
  FUUMIMI,
  FUUMIMI_ENCOUNTER_LINES,
  FUUMIMI_INDIVIDUAL_DEFEATED,
  FUUMIMI_INDIVIDUAL_ID,
  answerFuumimi,
  fuumimiWaiting,
} from '@mugen/content/enemies/fuumimi';
import { INCIDENT_GRAVE_FROM, INCIDENT_GRAVE_MARK, INCIDENT_GRAVE_TALK } from '@mugen/content/story/aldenIncident';
import { OnceNotice } from './ui/common/OnceNotice';
import { NoticeHost } from './ui/common/NoticeHost';
import { notices } from './ui/common/noticeQueue';
import { newEquipmentIds } from './ui/equipment';
import { memoryMark } from './ui/memory';
import {
  RuinsWalkScreen,
  SealApproachScreen,
  SekiryugaAftermathScreen,
  SekiryugaRevisitScreen,
  SekiryugaStillScreen,
  type RuinsPhase,
} from './ui/ruins';

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

/**
 * WHICH OF THE APP'S FIGHTS IS ON — one value, set at the door walked
 * through. It decides who stands there and how the screen is set; it
 * decides nothing about the world.
 *
 *   WILD        the forest's ordinary fight (モスラビット)
 *   GALD        the story's fight, from the road to the four answers
 *   SEKIRYUGA   the first boss route's fight, in the ruins
 *   FUUMIMI     フウミミ at the forest's edge — met once, as somebody (FORGE
 *               MON-000002 / IND-43452DFD); the four answers after it
 *
 * A fight added later (the raid, a new creature) is a new value here.
 * Pinned in e2e/battleKinds.spec.ts.
 */
type BattleKind = 'WILD' | 'GALD' | 'SEKIRYUGA' | 'FUUMIMI';

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
  /**
   * WHETHER SHE HAS ARRIVED IN THE PROLOGUE — the one fact the music
   * needs that the flow does not hold. The prologue is two scenes on
   * one screen, the world and then her, and they are scored
   * differently. Held through naming, which follows her directly, so
   * the music does not step back to the opening between her last line
   * and the village.
   */
  const [kaosArrived, setKaosArrived] = useState(false);
  const [namingBusy, setNamingBusy] = useState(false);
  /**
   * 第0話 — the way into Alden, between the name and the village (ui/intro).
   * Held here for the same reason naming is: not a `Screen` of the shared
   * union, and never reached by 「つづきから」.
   */
  const [intro, setIntro] = useState(false);
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
  /**
   * 月灯りの酒場 IS A DOOR OFF THE VILLAGE, held here for the same
   * reason equipment is: `Screen` is shared with the Artifact and may
   * not grow. While it is open the flow is still on HOME, and もどる
   * (or Android's back) closes it to exactly where the player was.
   *
   * WHETHER HE HAS BEEN MET IS THE SAVE'S (2026-10-07): his first meeting
   * is marked in readMarks (`talk:GRAVE_MEETING`) when it is read to its
   * end, so it plays once in a save — never again on walking back in or
   * after a restart. `tavernMet` only covers the moment between the end of
   * the meeting and that mark being written.
   */
  const [tavern, setTavern] = useState(false);
  /** The bard's pick, playing in the tavern until the player walks out (酒場ハブ化). */
  const [bardPiece, setBardPiece] = useState<BgmId | null>(null);
  useEffect(() => {
    if (!tavern) setBardPiece(null);
  }, [tavern]);
  const [tavernMet, setTavernMet] = useState(false);
  /**
   * BACK INTO THE VILLAGE FROM OUTSIDE (the region map's 「村へもどる」) —
   * where one of the village's small things may be happening (襲撃前の日常,
   * content/story/dailyScenes.ts). Cleared on setting out again.
   */
  const [homecoming, setHomecoming] = useState(false);
  /**
   * WHO CAME OUT OF THE UNDERGROWTH — the forest's ordinary fight's creature,
   * rolled as the player steps toward it (content/enemies/encounters.ts).
   */
  const wildSpecies = useRef<SpeciesId>('moss_rabbit');
  /** フウミミ beaten: the four answers are on screen (over the BATTLE screen) until they are given. */
  const [creatureMet, setCreatureMet] = useState(false);
  /**
   * パン屋 — the same kind of door off the village as the tavern, held
   * here for the same reason, and recording nothing in the world.
   */
  const [bakery, setBakery] = useState(false);
  /**
   * アルデン道具屋 — a door off the village like the tavern and the bakery
   * (2026-10-10): the same shop screen, reached from the square rather than
   * from the region map. Nothing about the shop itself changed.
   */
  const [shop, setShop] = useState(false);
  /**
   * 古代遺跡 — A DOOR OFF THE MAP, held here for the reason the tavern is:
   * `Screen` is shared with the Artifact and may not grow. While it is
   * open the flow is on EXPLORE (the boss's fight goes through BATTLE and
   * comes back to it). Which part is showing: the walk, the way in to
   * what is sealed there, or what comes after the fight.
   */
  const [ruins, setRuins] = useState<RuinsPhase | null>(null);
  /** 噂話 — a door off the village like the tavern, held here for the same reason. */
  const [rumors, setRumors] = useState(false);
  /** The music let down, on the way in — from her 「……止まって。」 to the fight. */
  const [hushed, setHushed] = useState(false);
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
    // And the shared notice queue, so a test can say several things at once.
    (window as unknown as { __mugenNotices?: typeof notices }).__mugenNotices = notices;
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
  // The tavern is a leaf of HOME in the same way.
  useEffect(() => {
    if (state.screen !== 'HOME' && tavern) setTavern(false);
  }, [state.screen, tavern]);
  useEffect(() => {
    if (state.screen !== 'HOME' && bakery) setBakery(false);
  }, [state.screen, bakery]);
  useEffect(() => {
    if (state.screen !== 'HOME' && rumors) setRumors(false);
  }, [state.screen, rumors]);
  useEffect(() => {
    if (state.screen !== 'HOME' && shop) setShop(false);
  }, [state.screen, shop]);
  // The ruins are a leaf of the map — kept through the boss's fight, closed anywhere else.
  useEffect(() => {
    if (ruins && state.screen !== 'EXPLORE' && state.screen !== 'BATTLE') setRuins(null);
  }, [state.screen, ruins]);
  // The music comes back the moment the way in is over, whichever way it ended.
  useEffect(() => {
    if (ruins !== 'approach' && hushed) setHushed(false);
  }, [ruins, hushed]);

  useAndroidBackButton(() => {
    // Nor walking out of the way in: SKIP is how it is left early.
    if (naming || intro) return;
    // Back out of equipment to status first, not out to the village.
    if (state.screen === 'STATUS' && equipment) {
      setEquipment(false);
      return;
    }
    // Out of the tavern to the village, not out of the village.
    if (state.screen === 'HOME' && tavern) {
      setTavern(false);
      return;
    }
    // And out of the bakery the same way.
    if (state.screen === 'HOME' && bakery) {
      setBakery(false);
      return;
    }
    // And out of the shop.
    if (state.screen === 'HOME' && shop) {
      setShop(false);
      return;
    }
    // And out of 噂話.
    if (state.screen === 'HOME' && rumors) {
      setRumors(false);
      return;
    }
    // Out of the ruins' walk to the map; the way in and what follows the
    // fight are read to their end, not backed out of.
    if (state.screen === 'EXPLORE' && ruins) {
      if (ruins === 'walk') setRuins(null);
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
   * One value, set at each door (see `BattleKind`).
   */
  const battleKind = useRef<BattleKind>('WILD');
  // THE RUINS' WALK, kept the same way across the way in and the fight.
  const ruinsWalk = useRef<RoamMemory | null>(null);
  const resumeRuins = useRef(false);
  // THE FOREST WALK, KEPT ACROSS A FIGHT: where it had got to, and whether
  // the next showing of the forest picks it up (a fight fled from) or
  // walks in afresh (any other way in).
  const forestWalk = useRef<RoamMemory | null>(null);
  const resumeForest = useRef(false);

  const [chosenBgm, setChosenBgm] = useState(battleBgmChoice);
  const unlockedBgm = world.getUnlockedBattleBgm();
  // Its own piece only for the story's fights; フウミミ's is fought to what was chosen, like the forest's.
  const fightKey = battleKind.current === 'GALD' || battleKind.current === 'SEKIRYUGA' ? battleKind.current : null;
  const battleBgmId = battleBgmFor(fightKey, chosenBgm, unlockedBgm);
  /**
   * THE ♪ CONTROL, only where there is something to choose: not in a
   * fight that brought its own music, and not while this save has won
   * only the one piece. Hidden rather than refusing.
   */
  const music = canChooseBattleBgm(fightKey, unlockedBgm)
    ? {
        label: battleBgmLabel(battleBgmId, unlockedBgm),
        onCycle: () => {
          const next = nextBattleBgm(battleBgmId, unlockedBgm);
          setBattleBgmChoice(next);
          setChosenBgm(next);
        },
      }
    : undefined;

  /**
   * THE MUSIC. One call, before any screen is chosen.
   *
   * Every piece is decided by `bgmForScene` in core — the same map the
   * Artifact plays by — so the App and the Artifact cannot disagree
   * about what a place sounds like.
   *
   * THE FIGHT THAT MATTERS BRINGS ITS OWN MUSIC. `battleKind` GALD marks
   * the Gald sequence from the road to the four answers, and `battleBgmFor`
   * turns that into BOSS_BATTLE whatever anybody chose — which is why
   * the result screen after his fight keeps the boss piece rather than
   * dropping back to the ordinary one mid-scene.
   *
   * EVERY OTHER FIGHT PLAYS WHAT WAS CHOSEN, IF THIS SAVE HAS WON IT.
   * Two facts meet here and nowhere else: `chosenBgm` is the player's
   * preference (localStorage, per device), `unlockedBgm` is what this
   * world has won (the save). `battleBgmFor` honours the first only
   * inside the second, so a preference left by another save cannot
   * play a piece this one has not earned.
   *
   * `locationId` is null because the App's screens carry no place: the
   * talk spots that need it are not in the App, and the future site is
   * the bakery in Alden, which null already answers correctly.
   */
  const playingBgm = useSceneBgm({
    // THE APP HAS NO THEME-CHOICE SCREEN. The flow starts on
    // THEME_CHOICE and the App draws the title for it, so to the player
    // it IS the title — and the map says THEME_CHOICE is silent, which
    // left the one screen everybody sees first with nothing playing.
    // The Artifact fixed exactly this complaint from a phone; the App
    // must not reintroduce it by inheriting a screen it does not show.
    screen:
      state.screen === 'THEME_CHOICE'
        ? 'TITLE'
        : tavern || bakery
          ? 'TALK_SPOT'
          : // THE RUINS HAVE NO PIECE OF THEIR OWN YET: walked, they play the
            // forest's field piece rather than the village's map music.
            state.screen === 'EXPLORE' && ruins
            ? 'GREENWOOD'
            : state.screen,
    // THE TAVERN IS A TALK SPOT IN 月灯りの酒場 to the shared map, which
    // already answers that with the tavern's own piece. Everywhere else
    // the App's screens carry no place (see above).
    // The bakery is a talk spot in Alden, which the map answers with the
    // village's own piece — so walking in carries the music on unbroken.
    locationId: tavern ? 'MOONLIGHT_TAVERN' : bakery ? 'ALDEN_BAKERY' : null,
    kaosSpeaking: state.screen === 'PROLOGUE' && kaosArrived,
    battleBgmId,
    // The piece the bard's archive set for the village (Alden's ordinary places only).
    villageBgmId: world.getVillageBgm(),
  },
  // Let down on the way in to セキリュウガ, and held off after its fight: what is
  // seen then is seen in quiet.
  state.screen === 'EXPLORE' && ((ruins === 'approach' && hushed) || ruins === 'aftermath'),
  // A piece picked from the bard's archive, while still in the tavern.
  tavern ? bardPiece : null);
  // THE MUSIC ARCHIVE keeps what the game has played (once each).
  useEffect(() => {
    if (playingBgm) void world.markMusicHeard(playingBgm).catch(() => {});
  }, [playingBgm, world]);

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
   * THE FIRST BOSS ROUTE'S RUMOURS (bakery, shop): said once the route has
   * begun — after Gald, whichever answer — until セキリュウガ has been
   * faced. Hearing one is the route's first step; the tavern does the rest.
   */
  /**
   * AUTO IS OPEN ONCE GALD'S FIGHT IS WON AND HIS ANSWER GIVEN — whichever
   * answer, and whatever the look ahead has or has not shown: the fight
   * against him is where fighting by hand alone ends. From then on, every
   * ordinary fight and every boss fight (never his own).
   */
  const autoOpen = world.getGaldLifeChoice() !== null;

  /** The village's small thing happening now, if any (after セキリュウガ, one a day). */
  const villageScene = world.getDailyScene('VILLAGE');

  const rumorSaid = () =>
    world.isSekiryugaArcOpen() && !stageReached(world.getSekiryugaStage(), 'BEATEN');
  const heardRumor = () => {
    void world.advanceSekiryugaArc('RUMOR').catch(() => {});
  };

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
   *
   * WHAT IT DOES GIVE IS HIS MUSIC. The piece his fight forced on the
   * player becomes theirs to choose — on winning, never on hearing, so
   * a fight lost or left leaves it locked. It is written to this save
   * and nowhere else.
   */
  const wonTheStory = useCallback(
    (final: { hp: number; mp: number }) => {
      void world
        .setBattleCondition(final)
        .catch((e) => console.error('Failed to carry the wounds out', e))
        .then(() => world.unlockBattleBgm(FORCED_BATTLE_BGM.GALD))
        .catch((e) => console.error('Failed to keep his music', e))
        .finally(() => flow.goTo('LIFE_CHOICE'));
    },
    [flow, world],
  );

  /**
   * セキリュウガ IS BROUGHT TO A STOP — not killed, and not a reward: no
   * experience, nothing dropped, as with Gald. The wounds carry out; the
   * route moves on; and the ruins show what is seen after it stops.
   */
  const stoppedTheBoss = useCallback(
    (final: { hp: number; mp: number }) => {
      void world
        .setBattleCondition(final)
        .catch((e) => console.error('Failed to carry the wounds out', e))
        .then(() => world.advanceSekiryugaArc('BEATEN'))
        .then(() => world.addIncident('WIN'))
        .catch((e) => console.error('Failed to record the boss stopped', e))
        .finally(() => {
          // BATTLE cannot reach the map directly; through the forest's
          // screen in one handler, so it is never drawn.
          flow.goTo('GREENWOOD');
          flow.goTo('EXPLORE');
          setRuins('aftermath');
        });
    },
    [flow, world],
  );

  const won = useCallback(
    (final: { hp: number; mp: number }) => {
      void world
        .setBattleCondition(final)
        .then(() =>
          world.applyBattleReward(fight.current, rewardForSpecies(wildSpecies.current) ?? NO_REWARD),
        )
        .then((paid) => setWinnings(paid))
        // ALDEN INCIDENT: a fight won is a step (once a day).
        .then(() => world.addIncident('WIN'))
        .catch((e) => console.error('Failed to record the victory', e))
        .finally(() => flow.goTo('BATTLE_RESULT'));
    },
    [flow, world],
  );

  // THE SHARED NOTICES (common/noticeQueue): drawn once, over whatever is on
  // screen, and dropped when the screen (or a door off it) changes — as each
  // screen's own notices always were.
  const noticeScope = [
    state.screen,
    naming ? 'naming' : '',
    intro ? 'intro' : '',
    equipment ? 'equipment' : '',
    tavern ? 'tavern' : '',
    bakery ? 'bakery' : '',
    shop ? 'shop' : '',
    rumors ? 'rumors' : '',
    ruins ?? '',
  ].join(':');
  return (
    <>
      {screenFor()}
      <NoticeHost key={noticeScope} />
    </>
  );

  function screenFor(): ReactNode {
  switch (state.screen) {
    case 'THEME_CHOICE':
    case 'TITLE':
      return (
        <>
          {/* Debug builds only — compile time, see src/dev/DebugEntry. */}
          {(import.meta.env.DEV || import.meta.env.VITE_MUGEN_DEBUG_TOOLS === '1') && <DebugEntry />}
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
        </>
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
                  setIntro(true);
                });
            }}
          />
        );
      }
      if (intro) {
        return (
          <IntroScreen
            heroName={world.getHeroName()}
            // SEEN OR SKIPPED, ONE WAY OUT: the same mark and the same
            // village, so skipping can never leave the world different.
            onDone={() => {
              void world
                .markRead([OPENING_INTRO_MARK])
                .catch((e) => console.error('Failed to keep the way in', e))
                .finally(() => {
                  setIntro(false);
                  flow.goTo('HOME');
                });
            }}
          />
        );
      }
      return (
        <PrologueScreen onKaosArrives={() => setKaosArrived(true)} onDone={() => setNaming(true)} />
      );
    case 'HOME':
      if (tavern) {
        return (
          <TavernScreen
            metBefore={tavernMet || hasMetGrave((id) => world.isRead(id), world.getSekiryugaStage())}
            onMet={() => {
              setTavernMet(true);
              void world.markRead([GRAVE_MEETING_MARK]).catch(() => {});
            }}
            onLeave={() => setTavern(false)}
            heroName={world.getHeroName()}
            guest={tonightsGuestTalk(toAbsoluteDay(world.getClock()))}
            incidentTalk={
              world.getIncidentPhase() >= INCIDENT_GRAVE_FROM && !world.isRead(INCIDENT_GRAVE_MARK)
                ? { lines: INCIDENT_GRAVE_TALK, onHeard: () => void world.markRead([INCIDENT_GRAVE_MARK]).catch(() => {}) }
                : null
            }
            dailyTalk={(() => {
              const scene = world.getDailyScene('TAVERN');
              return scene ? { lines: scene.lines, onHeard: () => void world.finishDailyScene(scene.id).catch(() => {}) } : null;
            })()}
            hub={{
              held: (id) => world.getItemCount(id),
              traded: (id) => world.getTradesDone(toAbsoluteDay(world.getClock())).includes(id),
              trade: (t) => world.tradeItems(t, toAbsoluteDay(world.getClock())),
              heard: world.getHeardMusic(),
              playing: bardPiece,
              play: setBardPiece,
              villageBgm: world.getVillageBgm(),
              setVillageBgm: (id) => world.setVillageBgm(id),
            }}
            arc={{
              open: world.isSekiryugaArcOpen(),
              stage: world.getSekiryugaStage(),
              heard: (id) => world.isRead(`talk:${id}`),
              onRumor: () => void world.advanceSekiryugaArc('RUMOR').catch(() => {}),
              onTold: () => void world.advanceSekiryugaArc('TOLD').catch(() => {}),
              onHeard: (id) => void world.markRead([`talk:${id}`]).catch(() => {}),
            }}
          />
        );
      }
      if (rumors) return <RumorScreen world={world} onLeave={() => setRumors(false)} />;
      if (shop) {
        return (
          <ItemShopScreen
            world={world}
            onLeave={() => setShop(false)}
            rumor={rumorSaid() ? SEKIRYUGA_RUMORS.SHOP : null}
            onRumor={heardRumor}
          />
        );
      }
      if (bakery) {
        return (
          <BakeryScreen
            world={world}
            onLeave={() => setBakery(false)}
            rumor={rumorSaid() ? SEKIRYUGA_RUMORS.BAKERY : null}
            onRumor={heardRumor}
          />
        );
      }
      return (
        <AldenScreen
          world={world}
          onExplore={() => {
            setHomecoming(false);
            flow.goTo('EXPLORE');
          }}
          onBag={() => flow.goTo('BAG')}
          onMemory={() => flow.goTo('WORLD_MEMORY')}
          onArchive={() => flow.goTo('ARCHIVE')}
          onStatus={() => flow.goTo('STATUS')}
          onTavern={() => setTavern(true)}
          onBakery={() => setBakery(true)}
          onShop={() => setShop(true)}
          onRumors={() => setRumors(true)}
          news={{
            explore: stageReached(world.getSekiryugaStage(), 'TOLD') && !world.isRead(RUINS_DESTINATION),
            rumors: rumorsOf(world).unread > 0,
            memory: world.getKnownEvents().some((e) => !world.isRead(memoryMark(e.id))),
            status: newEquipmentIds(world).length > 0,
          }}
          notice={
            <>
              {/* Said at the end of Gald's part of the story (CHOICE_RESULT);
                  here only for a world that got past it before it was said
                  (a save from an earlier build). Never tied to TIME SHIFT. */}
              <OnceNotice
                world={world}
                mark={AUTO_NOTICE}
                text="AUTO戦闘が使用可能になりました。"
                show={autoOpen}
                testId="auto-notice"
                type="unlock"
              />
              {/* 襲撃前の日常: something small, as they come back in (one a day, after セキリュウガ). */}
              {homecoming && villageScene && <DailyAside key={villageScene.id} world={world} scene={villageScene} />}
            </>
          }
          resting={resting}
          onRest={() => {
            if (resting) return;
            setResting(true);
            void world
              .advanceDay()
              .then(() => world.restoreParty())
              // A night's rest ages every loaf by one and ends a loaf's lift (パン屋 MVP).
              .then(() => world.restBread())
              // ALDEN INCIDENT: a night's rest after a day out is a step.
              .then(() => world.addIncident('REST'))
              // A night in the village after the first time back at the
              // ruins: the next morning, the cry from the ruins is talked
              // about (噂話). Once; nothing else about the night changes.
              .then(() =>
                world.isRead(SEKIRYUGA_REVISIT_MARK) && !world.isRead(RUINS_CRY_MARK)
                  ? world.markRead([RUINS_CRY_MARK])
                  : undefined,
              )
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
    case 'EXPLORE': {
      const stage = world.getSekiryugaStage();
      if (ruins === 'approach') {
        return (
          <SealApproachScreen
            heroName={world.getHeroName()}
            onHush={setHushed}
            onFight={() => {
              battleKind.current = 'SEKIRYUGA';
              fight.current = `fight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              // The map cannot reach a fight directly; through the
              // forest's screen in one handler, so it is never drawn.
              flow.goTo('GREENWOOD');
              flow.goTo('BATTLE');
            }}
            onBack={() => {
              resumeRuins.current = true;
              setRuins('walk');
            }}
          />
        );
      }
      if (ruins === 'aftermath') {
        return (
          <SekiryugaAftermathScreen
            heroName={world.getHeroName()}
            onDone={() => {
              void world
                .advanceSekiryugaArc('SETTLED')
                .catch((e) => console.error('Failed to record what was seen', e))
                .finally(() => {
                  resumeRuins.current = true;
                  setRuins('walk');
                });
            }}
          />
        );
      }
      if (ruins === 'revisit') {
        return (
          <SekiryugaRevisitScreen
            heroName={world.getHeroName()}
            onDone={() => {
              void world
                .markRead([SEKIRYUGA_REVISIT_MARK])
                .catch((e) => console.error('Failed to keep what was seen', e))
                .finally(() => {
                  resumeRuins.current = false;
                  setRuins('walk');
                });
            }}
          />
        );
      }
      if (ruins === 'still') {
        return (
          <SekiryugaStillScreen
            heroName={world.getHeroName()}
            onLeave={() => {
              resumeRuins.current = true;
              setRuins('walk');
            }}
          />
        );
      }
      if (ruins === 'walk') {
        // After it was brought to a stop and that was seen: where it stays,
        // once the first time back has been seen. Never a fight again.
        const still = stage === 'SETTLED' && world.isRead(SEKIRYUGA_REVISIT_MARK);
        return (
          <RuinsWalkScreen
            world={world}
            deep={stage === 'TOLD' ? 'APPROACH' : stage === 'BEATEN' ? 'AFTERMATH' : still ? 'STILL' : null}
            onDeep={() => setRuins(stage === 'BEATEN' ? 'aftermath' : still ? 'still' : 'approach')}
            onLeave={() => {
              resumeRuins.current = false;
              setRuins(null);
              // A walk out finished (once a day).
              void world.addIncident('EXPLORE').catch(() => {});
            }}
            memory={ruinsWalk}
            resume={resumeRuins.current}
          />
        );
      }
      return (
        <MapScreen
          // Opened by what the player decided, not by this screen.
          places={world.getOpenFutureSites().length}
          onForest={() => {
            // The forest walked for the first time is a step (once ever).
            void world.addIncident('PLACE', 'GREENWOOD_FOREST').catch(() => {});
            flow.goTo('GREENWOOD');
          }}
          // Kaos senses something, once per phase, as they set out.
          aside={<KaosAside world={world} />}
          onPlaces={() => flow.goTo('FUTURE_SITE')}
          onHome={() => {
            // Back into the village from outside: where a small thing may happen.
            setHomecoming(true);
            flow.goTo('HOME');
          }}
          // Opened by the tavern's master telling what was sealed there.
          ruins={stageReached(stage, 'TOLD')}
          ruinsNew={stageReached(stage, 'TOLD') && !world.isRead(RUINS_DESTINATION)}
          notice={
            <OnceNotice
              world={world}
              mark={`note:${RUINS_DESTINATION}`}
              text="新しい目的地が追加されました"
              show={stageReached(stage, 'TOLD') && !world.isRead(RUINS_DESTINATION)}
              testId="destination-notice"
              type="destination"
              priority="HIGH"
            />
          }
          onRuins={() => {
            void world.markRead([RUINS_DESTINATION]).catch(() => {});
            void world.addIncident('PLACE', 'ANCIENT_RUINS').catch(() => {});
            resumeRuins.current = false;
            // The first time back after セキリュウガ was brought to a stop
            // and that was seen: it is still there (once in a world).
            setRuins(stage === 'SETTLED' && !world.isRead(SEKIRYUGA_REVISIT_MARK) ? 'revisit' : 'walk');
          }}
        />
      );
    }
    case 'ITEM_SHOP':
      return (
        <ItemShopScreen
          world={world}
          onLeave={() => flow.goTo('EXPLORE')}
          rumor={rumorSaid() ? SEKIRYUGA_RUMORS.SHOP : null}
          onRumor={heardRumor}
        />
      );
    case 'FUTURE_SITE':
      return <FutureSiteScreen world={world} onLeave={() => flow.goTo('EXPLORE')} />;
    case 'GREENWOOD':
      return (
        <GreenwoodScreen
          // THE WORLD DECIDES WHETHER HE IS THERE, not a flag here.
          // Once one of the four answers is on disk this is false for
          // good, which is what makes the encounter unrepeatable.
          galdWaiting={world.getGaldLifeChoice() === null}
          // フウミミ, once — after セキリュウガ's part, from the signs' first phase, until answered.
          fuumimiWaiting={fuumimiWaiting({
            stage: world.getSekiryugaStage(),
            phase: world.getIncidentPhase(),
            answered: world.getFuumimiAnswer() !== null,
          })}
          onFuumimi={() => {
            resumeForest.current = false;
            battleKind.current = 'FUUMIMI';
            flow.goTo('ENCOUNTER');
          }}
          // Read, never written: what the forest notices depends on it.
          known={world.getKnownEvents().map((e) => e.type)}
          day={world.getClock().worldDay}
          memory={forestWalk}
          resume={resumeForest.current}
          // Read as the walk opens; taking one writes it (ui/explore/pickupKeeper).
          pickupKeeper={pickupKeeper(world)}
          onGald={() => {
            resumeForest.current = false;
            battleKind.current = 'GALD';
            flow.goTo('ENCOUNTER');
          }}
          onFight={() => {
            resumeForest.current = false;
            battleKind.current = 'WILD';
            // Which creature: the forest's table, by a roll (a test may fix the roll, DEV only).
            const fixed = import.meta.env.DEV
              ? (window as unknown as { __mugenEncounterRoll?: number }).__mugenEncounterRoll
              : undefined;
            const species = wildSpeciesFor(
              {
                stage: world.getSekiryugaStage(),
                point: world.getIncidentPoint(),
                fuumimiAnswered: world.getFuumimiAnswer() !== null,
              },
              typeof fixed === 'number' ? fixed : Math.random(),
            );
            wildSpecies.current = species;
            fight.current = `fight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            // The first time a new kind is met: a few lines first (once); after that, straight in.
            if (FIRST_SIGHT[species] && !world.isRead(firstSightMark(species))) return flow.goTo('ENCOUNTER');
            flow.goTo('BATTLE');
          }}
          onLeave={() => {
            resumeForest.current = false;
            // A walk out finished (once a day).
            void world.addIncident('EXPLORE').catch(() => {});
            flow.goTo('EXPLORE');
          }}
        />
      );
    case 'ENCOUNTER':
      if (battleKind.current === 'WILD') {
        const species = wildSpecies.current;
        return (
          <CreatureEncounterScreen
            lines={FIRST_SIGHT[species] ?? []}
            heroName={world.getHeroName()}
            onBattle={() => {
              void world.markRead([firstSightMark(species)]).catch(() => {});
              flow.goTo('BATTLE');
            }}
          />
        );
      }
      if (battleKind.current === 'FUUMIMI') {
        return (
          <CreatureEncounterScreen
            lines={FUUMIMI_ENCOUNTER_LINES}
            heroName={world.getHeroName()}
            onBattle={() => {
              fight.current = `fight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              flow.goTo('BATTLE');
            }}
          />
        );
      }
      return <GaldEncounterScreen onBattle={() => flow.goTo('BATTLE')} />;
    case 'BATTLE':
      if (battleKind.current === 'FUUMIMI') {
        // Beaten: why it fought, and the four answers — then back into the forest.
        if (creatureMet) {
          return (
            <CreatureLifeChoiceScreen
              species={FUUMIMI}
              individualId={FUUMIMI_INDIVIDUAL_ID}
              heroName={world.getHeroName()}
              // The small one it shielded — the same drawing, shown small (ui/battle/battleArt.ts).
              sceneArt={{ id: 'fuumimi_young', alt: '小さなフウミミ', small: true }}
              onChoose={(choice) => answerFuumimi(world, choice)}
              onDone={() => {
                setCreatureMet(false);
                battleKind.current = 'WILD';
                flow.goTo('GREENWOOD');
              }}
            />
          );
        }
        return (
          <BattleScreen
            key="fuumimi"
            spec={specOf(FUUMIMI)}
            opponent={{ artId: 'fuumimi', stands: 'FAR', defeated: { text: FUUMIMI_INDIVIDUAL_DEFEATED } }}
            locationId="GREENWOOD_FOREST"
            world={world}
            onWon={(final) => {
              void world
                .setBattleCondition(final)
                .then(() => world.meetFixedIndividual(FUUMIMI_INDIVIDUAL_ID, FUUMIMI.speciesId))
                // ALDEN INCIDENT: a fight won is a step (once a day).
                .then(() => world.addIncident('WIN'))
                .catch((e) => console.error('Failed to record フウミミ met', e))
                .finally(() => setCreatureMet(true));
            }}
            // 逃げる: back into the forest as it was; it is still there next time.
            onEscape={() => {
              resumeForest.current = true;
              battleKind.current = 'WILD';
              flow.goTo('GREENWOOD');
            }}
            music={music}
            autoAvailable={autoOpen}
            background={battleBackgroundFor('GREENWOOD_FOREST')}
            onLost={() => {
              battleKind.current = 'WILD';
              void world.restoreParty().finally(() => flow.goTo('HOME'));
            }}
          />
        );
      }
      if (battleKind.current === 'SEKIRYUGA') {
        return (
          <BattleScreen
            key="sekiryuga"
            spec={SEKIRYUGA_BATTLE}
            // At arm's length, as Gald stands — a boss fills the field; marked BOSS.
            opponent={{
              artId: 'sekiryuga',
              stands: 'NEAR',
              boss: true,
              defeated: { text: `${SEKIRYUGA_BATTLE.name}は膝をつき、動きを止めた。` },
            }}
            locationId="ANCIENT_RUINS"
            world={world}
            onWon={stoppedTheBoss}
            // 「無理なら逃げろ」— and it can be: back to the ruins as they were.
            onEscape={() => {
              resumeRuins.current = true;
              flow.goTo('GREENWOOD');
              flow.goTo('EXPLORE');
              setRuins('walk');
            }}
            music={music}
            autoAvailable={autoOpen}
            background="RUINS"
            onLost={() => {
              void world.restoreParty().finally(() => {
                setRuins(null);
                flow.goTo('HOME');
              });
            }}
          />
        );
      }
      const gald = battleKind.current === 'GALD';
      const creature = ENEMY_SPECIES[wildSpecies.current];
      return (
        <BattleScreen
          // One screen, Gald's fight and the forest's, and the numbers are
          // the only difference between them. Every spec is content.
          key={gald ? 'gald' : creature.speciesId === 'moss_rabbit' ? 'rabbit' : creature.speciesId}
          spec={gald ? GALD_BATTLE : specOf(creature)}
          // How they are drawn, as the Artifact draws the same two: Gald
          // is a person at arm's length who speaks when beaten; the
          // rabbit a creature up the path, with its own line.
          opponent={
            gald
              ? {
                  artId: 'gald',
                  stands: 'NEAR',
                  defeated: { speaker: GALD_BATTLE.name, text: GALD_DEFEATED_LINES[0].text },
                }
              : { artId: creature.speciesId, stands: 'FAR', defeated: { text: creature.defeatedText } }
          }
          locationId="GREENWOOD_FOREST"
          world={world}
          onWon={gald ? wonTheStory : won}
          // 逃げる: back into the forest as it was before the fight. Not
          // from the story's fight — Gald's is faced, not fled.
          onEscape={
            gald
              ? undefined
              : () => {
                  resumeForest.current = true;
                  flow.goTo('GREENWOOD');
                }
          }
          music={music}
          // AUTO, once Gald's fight is behind them — never in his own fight.
          autoAvailable={autoOpen && !gald}
          // Both of the App's fights are in the greenwood; the ground is
          // the place's, as content says.
          background={battleBackgroundFor('GREENWOOD_FOREST')}
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
          // GALD'S FIGHT IS THE END OF FIGHTING BY HAND ALONE: with the last
          // of what his answer left behind, AUTO is said to be open — once,
          // before (and apart from) the look ahead.
          atEnd={
            <OnceNotice
              world={world}
              mark={AUTO_NOTICE}
              text="AUTO戦闘が使用可能になりました。"
              show={autoOpen}
              testId="auto-notice"
              type="unlock"
            />
          }
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
}
