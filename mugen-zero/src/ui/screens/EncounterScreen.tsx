import { DialogueSequence } from '../common/DialogueSequence';
import { GALD_ENCOUNTER_LINES } from '../../content/dialogue/galdEncounter';

interface Props {
  onBattleStart: () => void;
}

export function EncounterScreen({ onBattleStart }: Props) {
  return (
    <DialogueSequence
      lines={GALD_ENCOUNTER_LINES}
      onComplete={onBattleStart}
      testId="gald-encounter"
    />
  );
}
