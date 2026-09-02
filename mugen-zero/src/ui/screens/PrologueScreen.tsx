import { useState } from 'react';
import { DialogueSequence } from '../common/DialogueSequence';
import { PROLOGUE_LINES, KAOS_INTRO_LINES } from '../../content/dialogue/prologue';
import { TITLE_KEY_VISUAL } from '../../assets/manifest';

interface Props {
  onComplete: () => void;
}

/** Black-screen monologue, then the Kaos introduction. */
export function PrologueScreen({ onComplete }: Props) {
  const [part, setPart] = useState<'MONOLOGUE' | 'KAOS'>('MONOLOGUE');

  if (part === 'MONOLOGUE') {
    return (
      <DialogueSequence
        lines={PROLOGUE_LINES}
        centered
        onComplete={() => setPart('KAOS')}
        testId="prologue-monologue"
      />
    );
  }
  return (
    <DialogueSequence
      lines={KAOS_INTRO_LINES}
      onComplete={onComplete}
      testId="kaos-intro"
      // The title's key visual, held far back. Meeting her should feel
      // like stepping into the picture the player just looked at.
      backdropImage={TITLE_KEY_VISUAL}
    />
  );
}
