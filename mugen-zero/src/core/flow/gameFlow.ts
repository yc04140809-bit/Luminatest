// MUGEN CORE — screen flow state machine.
// No React / Phaser dependencies.

import type { FlowState, LifeChoiceId, Screen } from './types';

/** Allowed transitions for the Phase A vertical slice. */
const TRANSITIONS: Record<Screen, Screen[]> = {
  TITLE: ['PROLOGUE', 'HOME'], // TITLE -> HOME = continue with an existing world
  PROLOGUE: ['HOME'],
  HOME: ['EXPLORE', 'WORLD_MEMORY', 'TIME_SHIFT', 'ARCHIVE', 'ARCANA', 'SETTINGS', 'DEV_LOCK'],
  ARCHIVE: ['HOME', 'ENDING', 'PLAYTEST_SURVEY'],
  // The book is read and closed; it changes nothing about the world.
  ARCANA: ['HOME'],
  ENDING: ['HOME', 'ARCHIVE', 'PLAYTEST_SURVEY'],
  PLAYTEST_SURVEY: ['HOME', 'ARCHIVE'],
  SETTINGS: ['HOME'],
  EXPLORE: ['GREENWOOD', 'FUTURE_SITE', 'TALK_SPOT', 'HOME'],
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
  BATTLE: ['LIFE_CHOICE', 'CREATURE_LIFE_CHOICE', 'GREENWOOD', 'HOME'],
  CREATURE_LIFE_CHOICE: ['GREENWOOD'],
  LIFE_CHOICE: ['CHOICE_RESULT'],
  CHOICE_RESULT: ['HOME'],
  WORLD_MEMORY: ['HOME'],
  // After the first shift Kaos points at the map, not at an answer.
  TIME_SHIFT: ['HOME', 'EXPLORE'],
  DEV_LOCK: ['DEV_ADMIN', 'HOME'],
  DEV_ADMIN: ['HOME', 'BATTLE_UI_PROTOTYPE'],
  // A look at the battle UI prototype and straight back. Nothing about
  // the world is touched by going there.
  BATTLE_UI_PROTOTYPE: ['DEV_ADMIN'],
};

type Listener = () => void;

export class GameFlow {
  private state: FlowState = { screen: 'TITLE', galdLifeChoice: null };
  private listeners = new Set<Listener>();

  getState(): FlowState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  canGoTo(next: Screen): boolean {
    return TRANSITIONS[this.state.screen].includes(next);
  }

  goTo(next: Screen): void {
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
