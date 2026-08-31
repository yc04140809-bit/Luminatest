import { useState } from 'react';
import { DialogueSequence } from '../common/DialogueSequence';
import { KAOS_ENDING_LINES } from '../../content/dialogue/bakery';
import { kaosPortrait } from '../../assets/manifest';

interface Props {
  /** True when this playthrough already sent feedback. */
  alreadyAnswered: boolean;
  onOpenSurvey: () => void;
  onKeepPlaying: () => void;
  onOpenArchive: () => void;
}

/**
 * The end of the playtest, in world terms: Kaos closes the loop, then
 * offers the archive, the survey, or more time in the world. Reached from
 * the core experience on every route — never a pop-up, never a system
 * message telling the player to fill in a form.
 */
export function EndingScreen({
  alreadyAnswered,
  onOpenSurvey,
  onKeepPlaying,
  onOpenArchive,
}: Props) {
  const [spoken, setSpoken] = useState(false);

  if (!spoken) {
    return (
      <DialogueSequence
        lines={KAOS_ENDING_LINES}
        onComplete={() => setSpoken(true)}
        testId="ending-kaos"
      />
    );
  }

  return (
    <div className="screen life-choice-screen" data-testid="ending-screen">
      {kaosPortrait('smile') && (
        <div className="dialogue-portrait">
          <img src={kaosPortrait('smile')!} alt="" aria-hidden="true" />
        </div>
      )}
      <div className="life-choice-options" style={{ display: 'flex', flexDirection: 'column' }}>
        <button
          className="btn primary"
          data-testid="ending-survey-button"
          disabled={alreadyAnswered}
          onClick={onOpenSurvey}
        >
          {alreadyAnswered ? '感想は受け取りました' : '感想を伝える'}
        </button>
        <button className="btn" data-testid="ending-archive-button" onClick={onOpenArchive}>
          人生の記録を見る
        </button>
        <button className="btn" data-testid="ending-keep-playing" onClick={onKeepPlaying}>
          もう少し世界を見る
        </button>
      </div>
    </div>
  );
}
