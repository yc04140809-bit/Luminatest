// Playable locations of the ALDEN REGION (the only region in v0.1).

export interface LocationDef {
  id: string;
  name: string;
  description: string;
  /** Whether the location can be entered in Phase A. */
  enterable: boolean;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: 'ALDEN_VILLAGE',
    name: 'アルデン村',
    description: '静かな村。今いる場所。',
    enterable: false,
  },
  {
    id: 'MOONLIGHT_TAVERN',
    name: '月灯りの酒場',
    description: '旅人と噂の集まる酒場。',
    enterable: false,
  },
  {
    id: 'GREENWOOD_FOREST',
    name: 'グリーンウッドの森',
    description: '村はずれの深い森。最近、物騒な噂がある。',
    enterable: true,
  },
];
