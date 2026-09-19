// MUGEN CORE — screen flow state machine.
// No React / Phaser dependencies.

import type { FlowState, LifeChoiceId, Screen } from './types';

/** Allowed transitions for the Phase A vertical slice. */
const TRANSITIONS: Record<Screen, Screen[]> = {
  // Both answers go to the same place. What differs is whether a song
  // is playing when they get there, which is not this table's business.
  THEME_CHOICE: ['TITLE'],
  TITLE: ['PROLOGUE', 'HOME'], // TITLE -> HOME = continue with an existing world
  PROLOGUE: ['HOME'],
  // DEV_ADMIN is reachable from HOME only because the lock may already
  // have been opened during this run of the app; the entry itself still
  // sends anybody who has not opened it to DEV_LOCK.
  HOME: [
    'EXPLORE',
    'WORLD_MEMORY',
    'WORLD_NEWS',
    'TIME_SHIFT',
    'ARCHIVE',
    'ARCANA',
    'BAG',
    'SETTINGS',
    'DEV_LOCK',
    'DEV_ADMIN',
  ],
  ARCHIVE: ['HOME', 'ENDING', 'PLAYTEST_SURVEY'],
  // The book is read and closed; it changes nothing about the world.
  ARCANA: ['HOME'],
  // And so is the bag: it is for looking at, and the one place a
  // consumable is worth spending is a fight.
  BAG: ['HOME'],
  ENDING: ['HOME', 'ARCHIVE', 'PLAYTEST_SURVEY'],
  PLAYTEST_SURVEY: ['HOME', 'ARCHIVE'],
  SETTINGS: ['HOME'],
  EXPLORE: ['GREENWOOD', 'FUTURE_SITE', 'TALK_SPOT', 'ITEM_SHOP', 'HOME'],
  // A door off the village square. Walked into and walked back out of,
  // like the tavern: it changes what the player is carrying and nothing
  // about where they are.
  ITEM_SHOP: ['EXPLORE'],
  // One screen for all four routes' future sites: bakery, waystation,
  // workyard, grave. Which one it shows is a location, not a screen.
  FUTURE_SITE: ['EXPLORE', 'ENDING'],
  // A place you walk into and meet someone. Always steps back outside.
  TALK_SPOT: ['EXPLORE'],
  // The forest can hand over to the scripted meeting, to a fight with
  // something living in it, or to the way out.
  GREENWOOD: ['ENCOUNTER', 'BATTLE', 'EXPLORE'],
  ENCOUNTER: ['BATTLE'],
  // Beating Gald asks the life question. Beating something that lives in
  // the forest usually just puts the player back where they were
  // standing — unless that one turned out to have a life too.
  BATTLE: ['BATTLE_RESULT', 'LIFE_CHOICE', 'CREATURE_LIFE_CHOICE', 'GREENWOOD', 'HOME'],
  // WHAT IT WAS WORTH, AND THEN BACK TO THE PATH. One way out, so the
  // forest cannot be reached around it: while this screen is up the
  // fight is finished and the walk has not started, which is what makes
  // the winnings safe to hand over exactly once.
  //
  // HOME is here for the developer's door into the prototype, which has
  // no forest to go back to.
  BATTLE_RESULT: ['GREENWOOD', 'HOME'],
  CREATURE_LIFE_CHOICE: ['GREENWOOD'],
  LIFE_CHOICE: ['CHOICE_RESULT'],
  CHOICE_RESULT: ['HOME'],
  WORLD_MEMORY: ['HOME'],
  WORLD_NEWS: ['HOME'],
  /**
   * ONE SCREEN ID, TWO VERY DIFFERENT THINGS BEHIND IT — and they
   * belong to different front ends, so they never meet.
   *
   * In the Artifact this is the old TIME SHIFT, now developer-only:
   * DEV_ADMIN is the only way in and the way back. In the App it is
   * the story's one FUTURE VISION, which Kaos gives immediately after
   * the four answers and which moves no time whatsoever; it is reached
   * from HOME because the scene routes through it, and leaves to HOME
   * or the map.
   *
   * HOME is therefore still listed, and not as a door for the
   * Artifact: nothing there navigates here any more, and the screen
   * itself refuses to render outside a dev build.
   */
  TIME_SHIFT: ['HOME', 'EXPLORE', 'DEV_ADMIN'],
  DEV_LOCK: ['DEV_ADMIN', 'HOME'],
  // TIME_SHIFT is here because it is a DEVELOPER'S tool now. The free
  // one that used to sit on the village screen is gone: skipping years
  // at will is not something MUGEN ZERO offers a player, and the only
  // look ahead the story has is the one Kaos gives once, which does not
  // move the clock at all. What remains is the old machinery, kept for
  // testing and reachable only from behind the dev gate.
  DEV_ADMIN: ['HOME', 'BATTLE_UI_PROTOTYPE', 'CINEMATIC_PREVIEW', 'TIME_SHIFT'],
  // Looking at a piece of theatre. It leads back to DEV ADMIN and
  // nowhere else — a preview is not a way into the game.
  CINEMATIC_PREVIEW: ['DEV_ADMIN'],
  // A look at the battle UI prototype and straight back. Nothing about
  // the world is touched by going there.
  BATTLE_UI_PROTOTYPE: ['DEV_ADMIN'],
};

type Listener = () => void;

export class GameFlow {
  private state: FlowState = { screen: 'THEME_CHOICE', galdLifeChoice: null };
  private listeners = new Set<Listener>();

  getState(): FlowState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Whether the game may go there from where it is.
   *
   * STAYING PUT IS ALWAYS ALLOWED, and it is not in the table: the
   * table says which screens are REACHABLE from each screen, and a
   * screen does not reach itself. Asking to go where you already are
   * is a question about a move that does not happen.
   */
  canGoTo(next: Screen): boolean {
    if (next === this.state.screen) return true;
    return TRANSITIONS[this.state.screen].includes(next);
  }

  /**
   * Go there. Asking for the screen already showing does nothing.
   *
   * THIS USED TO THROW, and the throw took the whole app down with it.
   * The cause is never a bug in the flow: it is a second thumb on a
   * button, a React StrictMode effect running twice, a timer firing
   * after the screen it belonged to has already moved on. Every one of
   * those is the app being asked to do what it has already done, and
   * the honest answer to that is "yes, it is done" — not a crash on the
   * player's phone while they are standing in a forest.
   *
   * THE TABLE IS NOT RELAXED BY THIS. A move to a DIFFERENT screen that
   * the table does not allow still throws, exactly as before: that one
   * is a real mistake in the code and must be loud. What changed is the
   * one case that was never a mistake at all.
   */
  goTo(next: Screen): void {
    if (next === this.state.screen) return;
    if (!this.canGoTo(next)) {
      throw new Error(`Invalid transition: ${this.state.screen} -> ${next}`);
    }
    this.state = { ...this.state, screen: next };
    this.emit();
  }

  /** Records the Gald life choice and moves to the result screen. */
  chooseGaldLife(choice: LifeChoiceId): void {
    if (this.state.screen !== 'LIFE_CHOICE') {
      throw new Error(`Life choice is only allowed on LIFE_CHOICE (was ${this.state.screen})`);
    }
    this.state = { ...this.state, galdLifeChoice: choice, screen: 'CHOICE_RESULT' };
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}
