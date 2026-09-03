// What this build changed on screen, declared by whoever changed it.
//
// This is the one part of the QA report a machine cannot work out, and
// it is also the part that decides how much of a human's day the review
// costs. Every screen listed as unchanged is a screenshot nobody has to
// take; every screen listed as changed is one they do.
//
// So it is maintained by hand, per build, and it is honest: if you are
// not sure whether a screen moved, it changed.

import type { VisualChange } from '../../core/qa/types';

export const VISUAL_CHANGES: readonly VisualChange[] = [
  { screen: 'TITLE', changed: false, reason: 'untouched since the key visual' },
  { screen: 'PROLOGUE / KAOS', changed: false, reason: 'untouched' },
  { screen: 'HOME', changed: false, reason: 'untouched' },
  { screen: 'EXPLORE', changed: false, reason: 'untouched' },
  { screen: 'TAVERN / TALK', changed: false, reason: 'untouched — event order changed, layout did not' },
  { screen: 'GREENWOOD / BATTLE', changed: false, reason: 'untouched' },
  { screen: 'LIFE CHOICE / ENDING / SURVEY', changed: false, reason: 'untouched' },
  {
    screen: 'DEV REVIEW HUB',
    changed: true,
    reason: 'new screen — check it is readable on a phone and that COPY works',
  },
];
