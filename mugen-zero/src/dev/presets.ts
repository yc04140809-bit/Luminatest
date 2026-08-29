// DEV ADMIN scenario presets.
// Every preset rebuilds its state through the OFFICIAL game flow
// (resetWorld -> recordGaldLifeChoice -> advanceDays -> timeShift), so the
// resulting WORLD MEMORY is genuine canon — never hand-written fields.

import type { World } from '../core/world/world';

export type PresetId =
  | 'INITIAL'
  | 'SPARE'
  | 'SPARE_2D'
  | 'SPARE_3D'
  | 'SPARE_3Y'
  | 'KILL'
  | 'HELP'
  | 'CAPTURE';

export interface ScenarioPreset {
  id: PresetId;
  label: string;
  run: (world: World) => Promise<void>;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'INITIAL',
    label: 'INITIAL（新規世界）',
    run: async (world) => {
      await world.resetWorld();
    },
  },
  {
    id: 'SPARE',
    label: 'SPARE直後',
    run: async (world) => {
      await world.resetWorld();
      await world.recordGaldLifeChoice('SPARE');
    },
  },
  {
    id: 'SPARE_2D',
    label: 'SPARE + 2 DAYS',
    run: async (world) => {
      await world.resetWorld();
      await world.recordGaldLifeChoice('SPARE');
      await world.advanceDays(2);
    },
  },
  {
    id: 'SPARE_3D',
    label: 'SPARE + 3 DAYS',
    run: async (world) => {
      await world.resetWorld();
      await world.recordGaldLifeChoice('SPARE');
      await world.advanceDays(3);
    },
  },
  {
    id: 'SPARE_3Y',
    label: 'SPARE + 3 YEARS',
    run: async (world) => {
      // Canonical causal chain: spare -> 3 days -> leaves bandits ->
      // time shift -> age update.
      await world.resetWorld();
      await world.recordGaldLifeChoice('SPARE');
      await world.advanceDays(3);
      await world.timeShift(3);
    },
  },
  {
    id: 'KILL',
    label: 'KILL直後',
    run: async (world) => {
      await world.resetWorld();
      await world.recordGaldLifeChoice('KILL');
    },
  },
  {
    id: 'HELP',
    label: 'HELP直後',
    run: async (world) => {
      await world.resetWorld();
      await world.recordGaldLifeChoice('HELP');
    },
  },
  {
    id: 'CAPTURE',
    label: 'CAPTURE直後',
    run: async (world) => {
      await world.resetWorld();
      await world.recordGaldLifeChoice('CAPTURE');
    },
  },
];
