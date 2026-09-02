// Playable locations of the ALDEN REGION (the only region in v0.1).

export interface LocationDef {
  id: string;
  name: string;
  description: string;
  /** Whether the location can be entered. */
  enterable: boolean;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: 'ALDEN_VILLAGE',
    name: 'アルデン村',
    description: '石畳の道と、井戸と、坂の上の教会。',
    enterable: true,
  },
  {
    id: 'MOONLIGHT_TAVERN',
    name: '月灯りの酒場',
    description: '旅人と噂の集まる酒場。',
    enterable: true,
  },
  {
    id: 'GREENWOOD_FOREST',
    name: 'グリーンウッドの森',
    description: '村はずれの深い森。最近、物騒な噂がある。',
    enterable: true,
  },
];
