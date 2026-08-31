import { DialogueSequence } from '../common/DialogueSequence';
import { GALD_ENCOUNTER_LINES } from '../../content/dialogue/galdEncounter';
import { galdPortrait } from '../../assets/manifest';
import type { LocationId } from '../../content/locations/locationVisuals';

interface Props {
  /** Where the meeting happens — it supplies the backdrop. */
  locationId: LocationId;
  onBattleStart: () => void;
}

/** First sight of Gald: a man with a face, before he is ever a health bar. */
export function EncounterScreen({ locationId, onBattleStart }: Props) {
  return (
    <DialogueSequence
      lines={GALD_ENCOUNTER_LINES}
      onComplete={onBattleStart}
      testId="gald-encounter"
      portraitSrc={galdPortrait('ready')}
      portraitAlt="森で行く手をふさぐ盗賊"
      backdropLocationId={locationId}
    />
  );
}
