import { useCallback, useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { createGreenwoodGame, type GreenwoodScene } from '@mugen/game/exploration/GreenwoodScene';
import type { DiscoveryCategory } from '@mugen/game/exploration/discovery';
import type { ExplorationSession } from '@mugen/game/exploration/explorationSession';
import { DialogueSequence } from '../common/DialogueSequence';
import { FoundItemCard } from '../common/FoundItemCard';
import { pickForestItem, type FoundItemDef } from '@mugen/content/exploration/forestFinds';
import { recordObtainedItem } from '../../platform/discoveries';
import type { TalkEventDef } from '@mugen/content/experience/aldenExperience';

interface Props {
  /** The scripted first meeting on the path. */
  onEncounter: () => void;
  onBack: () => void;
  /** False when Gald's life choice already exists in WORLD MEMORY. */
  encounterEnabled: boolean;
  /** Holds where they were standing while a fight is on another screen. */
  session: ExplorationSession;
  /** What the forest has to say today, or null when it has nothing new. */
  pickForestEvent: () => TalkEventDef | null;
  /** Records that the player met a forest event. */
  onEventSeen: (eventId: string) => Promise<void>;
  /** A fight in the forest. Leaves this screen for the battle. */
  onForestBattle: () => void;
  /**
   * Puts what was found into the bag.
   *
   * The screen does not own the bag and never has: it says WHAT was
   * picked up and the world decides what that means — whether there is
   * room, and what gets saved. Optional so the forest can still be
   * opened by a preview that has no world behind it.
   */
  onItemTaken?: (itemId: string) => Promise<unknown>;
  /** Development only: force what the next arrival turns out to be. */
  forcedCategory?: DiscoveryCategory | null;
}

/** What is being read on top of the forest, if anything. */
type Overlay =
  | { kind: 'EVENT'; event: TalkEventDef }
  | { kind: 'ITEM'; item: FoundItemDef }
  | null;

/**
 * Greenwood Forest.
 *
 * The world is the subject here, so the UI stands back: the place names
 * itself at the top, one line says how to move, and the way out is a
 * quiet line rather than a slab.
 *
 * What the player finds when they arrive is read HERE, over the forest,
 * rather than on a screen of its own. Two reasons, and they are the same
 * reason: a few lines about a mossy stone should happen where the stone
 * is, and the pair standing in the picture behind the words is what
 * makes the walk feel like it went somewhere. Only a fight is worth
 * leaving the forest for.
 */
export function GreenwoodScreen({
  onEncounter,
  onBack,
  encounterEnabled,
  session,
  pickForestEvent,
  onEventSeen,
  onForestBattle,
  onItemTaken,
  forcedCategory = null,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GreenwoodScene | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  // The scene is built once and lives longer than any render, so it is
  // given refs to call rather than the callbacks of the render that
  // happened to create it.
  const handlers = useRef({ onEncounter, onForestBattle, pickForestEvent, onBack, session });
  handlers.current = { onEncounter, onForestBattle, pickForestEvent, onBack, session };
  // Phaser's timers and camera fades outlive a React unmount by a frame
  // or two. Walking out of the forest mid-arrival must not then ask the
  // flow for a screen this screen is no longer on.
  const alive = useRef(true);

  const handleDiscovery = useCallback((category: DiscoveryCategory) => {
    if (!alive.current) return;
    if (category === 'BATTLE') {
      handlers.current.onForestBattle();
      return;
    }
    if (category === 'EVENT') {
      const event = handlers.current.pickForestEvent();
      if (event) {
        setOverlay({ kind: 'EVENT', event });
        return;
      }
      // The forest has said everything it has to say today. Rather than
      // an empty arrival, there is something on the ground instead.
    }
    setOverlay({ kind: 'ITEM', item: pickForestItem() });
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let game: Phaser.Game | null = null;
    let cancelled = false;

    // Phaser tears its canvas down asynchronously, so a fast
    // mount → unmount → mount (StrictMode, or navigating straight back
    // in) could leave an orphaned canvas behind and run two games at
    // once. Defer creation by a tick, and clear the host on cleanup.
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const created = createGreenwoodGame(
        host,
        {
          onEncounter: () => {
            if (alive.current) handlers.current.onEncounter();
          },
          onDiscovery: handleDiscovery,
          // Walking off the end of the path they came in by is the same
          // thing as pressing 「森を出る」 — one way out, two ways to
          // ask for it, so neither can leave the forest half-left.
          onLeaveField: () => {
            if (!alive.current) return;
            handlers.current.session.clear();
            handlers.current.onBack();
          },
        },
        {
          encounterEnabled,
          reducedMotion: prefersLessMotion(),
          session,
          forcedCategory,
        },
      );
      game = created.game;
      sceneRef.current = created.scene;
    }, 0);

    alive.current = true;
    return () => {
      cancelled = true;
      alive.current = false;
      window.clearTimeout(timer);
      sceneRef.current = null;
      game?.destroy(true);
      game = null;
      host.replaceChildren();
    };
  }, [encounterEnabled, session, forcedCategory, handleDiscovery]);

  /** Done reading. Put a new ring somewhere and let them walk again. */
  const closeOverlay = async () => {
    const current = overlay;
    setOverlay(null);
    if (current?.kind === 'EVENT') {
      try {
        await onEventSeen(current.event.eventId);
      } catch (e) {
        // Losing the "seen" flag only means it may come round again.
        console.error('Failed to record the forest event', e);
      }
    }
    if (current?.kind === 'ITEM') {
      // TWO THINGS, AND THEY ARE NOT THE SAME THING. The discovery log
      // is a record that this was once found — capped, local, and only
      // ever read to decorate the map. The bag is what the player OWNS,
      // survives a reload and can be spent. Before this round only the
      // first existed, which is why a hundred acorns came to nothing.
      recordObtainedItem(current.item.itemId);
      try {
        await onItemTaken?.(current.item.itemId);
      } catch (e) {
        // The card was shown and the find was real; losing the write
        // costs one item, not the walk.
        console.error('Failed to put the find in the bag', e);
      }
    }
    sceneRef.current?.resumeExploration();
  };

  return (
    <div className={overlay ? 'screen field-screen has-overlay' : 'screen field-screen'}>
      <header className="field-intro">
        <p className="field-intro-en">GREENWOOD FOREST</p>
        <h1 className="field-intro-jp">グリーンウッドの森</h1>
        <span className="field-intro-rule" aria-hidden="true" />
      </header>
      <div className="phaser-wrap" ref={hostRef} data-testid="greenwood-canvas" />
      <div className="field-foot">
        <p className="field-hint">歩きたい場所をタップ</p>
        <button
          className="field-exit"
          data-testid="leave-forest"
          onClick={() => {
            // Walking out is leaving, not pausing: coming back through
            // the trees starts at the edge of the forest again.
            session.clear();
            onBack();
          }}
        >
          森を出る
        </button>
      </div>

      {overlay?.kind === 'EVENT' && (
        <div className="field-overlay" data-testid="forest-event">
          <DialogueSequence
            lines={overlay.event.content.lines}
            onComplete={closeOverlay}
            testId={`forest-event-${overlay.event.eventId}`}
            overlay
          />
        </div>
      )}
      {overlay?.kind === 'ITEM' && (
        <div className="field-overlay" data-testid="forest-item">
          <FoundItemCard item={overlay.item} onTake={closeOverlay} />
        </div>
      )}
    </div>
  );
}

/**
 * Whether to hold the cues still. Reads both the player's own setting
 * (the same attribute the stylesheet honours) and the system preference,
 * because Phaser draws outside CSS and would otherwise ignore both.
 */
function prefersLessMotion(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (document.documentElement.getAttribute('data-reduced-motion') === 'on') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
