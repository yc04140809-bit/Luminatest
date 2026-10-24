// THE LAYER A CHOICE IS MADE ON — the App's own, not the Artifact's.
//
// The Artifact opens its trays inside the command dock, which sits
// UNDER the people on the field: at phone size the hero's blade and
// Kaos's wings are drawn across the spell names, their MP and the way
// back out. So every panel the fight opens to ask something — a spell,
// a skill, an item, and whatever target or sub-menu comes later — is
// drawn here instead, on top of everything the battle screen has:
//
//   background → the people on the field → the HUD and the commands
//   → THIS (a veil over all of it, and the panel on the veil).
//
// The veil darkens the fight without hiding it, so it still reads as a
// fight with a menu open. It also takes every press that is not on the
// panel — the commands, the speed chip, the BGM chip underneath cannot
// be hit by accident — and a press on it is "back": the panel closes and
// nothing else happens.

import type { ReactNode } from 'react';

export interface BattlePickerProps {
  /** Closes the panel. The veil calls it; the panel's own 戻る/やめる too. */
  onClose: () => void;
  /** What is being chosen, for screen readers. */
  label: string;
  children: ReactNode;
}

export function BattlePicker({ onClose, label, children }: BattlePickerProps) {
  return (
    <div className="bp-picker" data-testid="bp-picker">
      <div className="bp-picker-veil" data-testid="bp-picker-veil" aria-hidden="true" onClick={onClose} />
      <div className="bp-picker-panel" role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </div>
    </div>
  );
}
