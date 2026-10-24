// WHERE AN ADOPTED CHARACTER STANDS — FOUR SEPARATE THINGS.
//
// Decided 2026-09-28 (docs/FORGE_IMPORT.md §0): a character's data being
// registered, its taking part in the WORLD LIFE ENGINE, its pictures being
// registered and its relationships being made are separate states, and
// one missing never invalidates another. RIZEL is registered and a life
// actor while her picture is not registered and her relationship waits.
//
// Read-only: worked out from the content every time, nothing stored,
// nothing generated. In particular a relationship is NEVER created here:
// one that FORGE names stays pending until the other character is adopted
// too and the author has confirmed it.
//
// Deliberately imports no content index, so the dev import screen can use
// it without reloading whenever it writes a file.

import type { ForgeContent, ForgeRosterEntry } from '../../core/forge/types';

export interface ForgePendingRelationship {
  relationshipId: string;
  /** From FORGE's own history of the relationship, if it records one. */
  counterpartCharacterId: string | null;
  relationType: string | null;
  canonStatus: string | null;
  counterpartAdopted: boolean;
  /** Always PENDING: the game makes no relationship from an import. */
  state: 'PENDING';
  reason: string;
}

export interface ForgeRegistrationState {
  characterId: string;
  npcId: string;
  /** The character's data is in the build. */
  character: 'REGISTERED';
  lifeEngine: 'ACTOR' | 'NOT_ACTOR';
  /** Picture FILES held by the game. Metadata alone is not a registered picture. */
  image: 'REGISTERED' | 'NOT_REGISTERED';
  assetMetadataCount: number;
  /** The asset FORGE marks primary, if any. */
  primaryAssetId: string | null;
  relationships: ForgePendingRelationship[];
}

export function forgeRegistrationState(
  entry: ForgeRosterEntry,
  content: ForgeContent,
  knownAssetIds: ReadonlySet<string> = new Set(),
): ForgeRegistrationState {
  const definition = content.baselines[entry.characterId];
  const assets = Array.isArray(definition?.assets) ? definition.assets.filter((a) => a && typeof a === 'object') : [];
  const adopted = new Set(content.roster.characters.map((e) => e.characterId));
  const history = Array.isArray(definition?.characterHistory) ? definition.characterHistory.filter((h) => h && typeof h === 'object') : [];
  const refs = Array.isArray(definition?.relationshipRefs) ? definition.relationshipRefs.filter((r): r is string => typeof r === 'string') : [];
  const relationships = refs.map((relationshipId): ForgePendingRelationship => {
    const created = history.find((h) => h.details?.relationshipId === relationshipId);
    const text = (v: unknown) => (typeof v === 'string' && v ? v : null);
    const counterpart = text(created?.details?.counterpartCharacterId);
    const counterpartAdopted = counterpart !== null && adopted.has(counterpart);
    return {
      relationshipId,
      counterpartCharacterId: counterpart,
      relationType: text(created?.details?.relationType),
      canonStatus: text(created?.details?.canonStatus),
      counterpartAdopted,
      state: 'PENDING',
      reason: counterpartAdopted
        ? '相手も採用済み。作者が関係内容を確認するまで作成しない'
        : `相手${counterpart ? `（${counterpart}）` : ''}が未採用のため保留`,
    };
  });
  return {
    characterId: entry.characterId,
    npcId: entry.npcId,
    character: 'REGISTERED',
    lifeEngine: entry.lifeActor ? 'ACTOR' : 'NOT_ACTOR',
    image: assets.some((a) => knownAssetIds.has(a.assetId)) ? 'REGISTERED' : 'NOT_REGISTERED',
    assetMetadataCount: assets.length,
    primaryAssetId: assets.find((a) => a.primary === true)?.assetId ?? null,
    relationships,
  };
}

export function forgeRegistrationStates(content: ForgeContent, knownAssetIds?: ReadonlySet<string>): ForgeRegistrationState[] {
  return content.roster.characters.map((entry) => forgeRegistrationState(entry, content, knownAssetIds));
}
