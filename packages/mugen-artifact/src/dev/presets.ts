// DEV ADMIN scenario presets.
// Every preset rebuilds its state through the OFFICIAL game flow
// (resetWorld -> recordGaldLifeChoice -> advanceDays -> timeShift), so the
// resulting WORLD MEMORY is genuine canon — never hand-written fields.

import type { World } from '@mugen/core/world/world';

export type PresetId =
  | 'INITIAL'
  | 'SPARE'
  | 'SPARE_2D'
  | 'SPARE_3D'
  | 'ARRIVED'
  | 'PRE_BAKER'
  | 'SPARE_3Y'
  | 'REUNITED'
  | 'KILL'
  | 'KILL_3Y'
  | 'HELP'
  | 'HELP_3Y'
  | 'CAPTURE'
  | 'CAPTURE_3Y';

export interface ScenarioPreset {
  id: PresetId;
  label: string;
  run: (world: World, options?: PresetOptions) => Promise<void>;
}

export interface PresetOptions {
  /**
   * Keep LUMI, the bag and the levels while winding the story back.
   *
   * A preset is a reset, which is the right thing for a player wanting
   * a new world and the wrong thing for the job a developer actually
   * does twenty times an hour: put the story at a known point and go
   * and look at something. Doing that through a full reset took the
   * economy with it, so every test of the economy began by rebuilding
   * the economy.
   *
   * Off by default, so a preset means exactly what it has always
   * meant unless somebody asks for otherwise.
   */
  keepBelongings?: boolean;
}

/**
 * How a preset starts: a new world, or the same one wound back.
 *
 * One function so that adding a preset cannot accidentally be the one
 * that ignores the switch.
 */
async function wipe(world: World, options?: PresetOptions): Promise<void> {
  if (options?.keepBelongings) await world.devResetScenario();
  else await world.resetWorld();
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'INITIAL',
    label: 'INITIAL（新規世界）',
    run: async (world, options) => {
      await wipe(world, options);
    },
  },
  {
    id: 'SPARE',
    label: 'SPARE直後',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('SPARE');
    },
  },
  {
    id: 'SPARE_2D',
    label: 'SPARE + 2 DAYS',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('SPARE');
      await world.advanceDays(2);
    },
  },
  {
    id: 'SPARE_3D',
    label: 'SPARE + 3 DAYS',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('SPARE');
      await world.advanceDays(3);
    },
  },
  {
    id: 'ARRIVED',
    label: 'アルデン到着後',
    run: async (world, options) => {
      // spare day1 -> leaves day4 -> arrives day34.
      await wipe(world, options);
      await world.recordGaldLifeChoice('SPARE');
      await world.advanceDays(33);
    },
  },
  {
    id: 'PRE_BAKER',
    label: 'パン屋化直前',
    run: async (world, options) => {
      // Baker becomes due on day 94; stop on day 93.
      await wipe(world, options);
      await world.recordGaldLifeChoice('SPARE');
      await world.advanceDays(92);
    },
  },
  {
    id: 'SPARE_3Y',
    label: 'SPARE+3年（パン屋/未再会）',
    run: async (world, options) => {
      // Canonical causal chain: spare -> 3 days -> leaves bandits ->
      // time shift (catch-up fires arrives + baker) -> age update.
      await wipe(world, options);
      await world.recordGaldLifeChoice('SPARE');
      await world.advanceDays(3);
      await world.timeShift(3);
    },
  },
  {
    id: 'REUNITED',
    label: '再会後',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('SPARE');
      await world.advanceDays(3);
      await world.timeShift(3);
      await world.recordGaldReunion();
    },
  },
  {
    id: 'KILL',
    label: 'KILL直後',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('KILL');
    },
  },
  {
    id: 'KILL_3Y',
    label: 'KILL+3年（墓/未発見）',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('KILL');
      await world.timeShift(3);
    },
  },
  {
    id: 'HELP',
    label: 'HELP直後',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('HELP');
    },
  },
  {
    id: 'HELP_3Y',
    label: 'HELP+3年（救護人/未再会）',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('HELP');
      await world.timeShift(3);
    },
  },
  {
    id: 'CAPTURE',
    label: 'CAPTURE直後',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('CAPTURE');
    },
  },
  {
    id: 'CAPTURE_3Y',
    label: 'CAPTURE+3年（村の作業/未再会）',
    run: async (world, options) => {
      await wipe(world, options);
      await world.recordGaldLifeChoice('CAPTURE');
      await world.timeShift(3);
    },
  },
];
