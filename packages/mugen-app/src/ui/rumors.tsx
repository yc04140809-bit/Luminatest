import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import {
  RUMOR_CATEGORY_LABEL,
  rumorMark,
  rumorsFor,
  type RumorCategory,
  type VillageRumor,
} from '@mugen/content/story/villageRumors';
import { RUINS_CRY_MARK } from '@mugen/content/story/sekiryugaArc';
import { NewBadge } from './common/NewBadge';

/**
 * 噂話 — WHAT ALDEN IS TALKING ABOUT (content/story/villageRumors).
 *
 * A door off the village, like the tavern: held by the App while the flow
 * stays on HOME. Each rumour is a closed row — its category and a title —
 * and opening it is reading it: only then is its NEW cleared (opening this
 * screen clears nothing). Mostly village life; a few, once reached, are the
 * first boss route's own.
 */

const ORDER: readonly RumorCategory[] = ['PERSON', 'PLACE', 'MONSTER', 'ITEM', 'EVENT', 'TRIVIA'];

/** The rumours this world has, and how many are not yet read. */
export function rumorsOf(world: World): { rumors: VillageRumor[]; unread: number } {
  const rumors = rumorsFor({
    arcOpen: world.isSekiryugaArcOpen(),
    stage: world.getSekiryugaStage(),
    ruinsCry: world.isRead(RUINS_CRY_MARK),
  });
  return { rumors, unread: rumors.filter((r) => !world.isRead(rumorMark(r.id))).length };
}

export function RumorScreen({ world, onLeave }: { world: World; onLeave: () => void }) {
  const { rumors } = rumorsOf(world);
  const [open, setOpen] = useState<string | null>(null);

  const read = (rumor: VillageRumor) => {
    setOpen((now) => (now === rumor.id ? null : rumor.id));
    void world.markRead([rumorMark(rumor.id)]).catch(() => {});
  };

  return (
    <div className="screen rumors paper" data-testid="rumor-screen">
      <h1 className="place">噂話</h1>
      <div className="rumor-list" data-testid="rumor-list">
        {ORDER.map((category) => {
          const here = rumors.filter((r) => r.category === category);
          if (here.length === 0) return null;
          return (
            <section key={category} className="rumor-group" data-testid={`rumor-group-${category}`}>
              <h2 className="rumor-category">{RUMOR_CATEGORY_LABEL[category]}</h2>
              {here.map((rumor) => {
                const isNew = !world.isRead(rumorMark(rumor.id));
                const shown = open === rumor.id;
                return (
                  <button
                    key={rumor.id}
                    className={`rumor-row${shown ? ' open' : ''}`}
                    data-testid={`rumor-${rumor.id}`}
                    data-new={isNew ? 'yes' : 'no'}
                    aria-expanded={shown}
                    onClick={() => read(rumor)}
                  >
                    <span className="rumor-title">
                      {rumor.title}
                      <NewBadge show={isNew} testId={`rumor-${rumor.id}-new`} />
                    </span>
                    {shown && (
                      <span className="rumor-text" data-testid={`rumor-${rumor.id}-text`}>
                        {rumor.from && <small className="rumor-from">{rumor.from}</small>}「{rumor.text}」
                      </span>
                    )}
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
      <button className="btn primary" data-testid="rumor-leave" onClick={onLeave}>
        もどる
      </button>
    </div>
  );
}
