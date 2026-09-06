import { DialogueSequence } from '../common/DialogueSequence';
import { GALD_ENCOUNTER_LINES } from '../../content/dialogue/galdEncounter';
import { partyArtFor } from '../../content/art';
import type { LocationId } from '../../content/locations/locationVisuals';

interface Props {
  /** Where the meeting happens — it supplies the backdrop. */
  locationId: LocationId;
  onBattleStart: () => void;
}

/**
 * First sight of Gald: a man with a face, before he is ever a health bar.
 *
 * One Gald, asked for the way this scene needs him. There is no talking
 * picture drawn yet, so the art layer hands back his whole figure and
 * records that it stood in — which is the point of asking for a state
 * rather than naming a file.
 */
export function EncounterScreen({ locationId, onBattleStart }: Props) {
  return (
    <DialogueSequence
      lines={GALD_ENCOUNTER_LINES}
      onComplete={onBattleStart}
      testId="gald-encounter"
      portraitSrc={partyArtFor('gald', 'talk').asset?.src ?? null}
      portraitAlt="森で行く手をふさぐ盗賊"
      backdropLocationId={locationId}
    />
  );
}
