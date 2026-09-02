import { useState } from 'react';
import { DialogueSequence } from '../common/DialogueSequence';
import type { TalkEventDef } from '../../content/experience/aldenExperience';
import { NOTHING_NEW_LINES } from '../../content/experience/aldenExperience';
import { kaosPortrait } from '../../assets/manifest';

interface Props {
  /** The place being visited (also its backdrop and testid suffix). */
  spotId: string;
  /** Display name of the place. */
  spotName: string;
  /** What the EXPERIENCE ENGINE picked here, or null when nothing is new. */
  event: TalkEventDef | null;
  /** Records that the player met this event. Resolves after the commit. */
  onSeen: (eventId: string) => Promise<void>;
  onLeave: () => void;
}

/**
 * A place in Alden you can walk into: the village lanes, the tavern.
 *
 * Whatever happens here comes from the EXPERIENCE ENGINE — this screen
 * only plays it. A place with nothing new says so quietly rather than
 * refusing to open, so the player is never punished for looking.
 */
export function TalkSpotScreen({ spotId, spotName, event, onSeen, onLeave }: Props) {
  // Lock at mount: recording the event re-renders the parent, and the
  // scene must not swap out from under the player mid-line.
  const [scene] = useState(event);
  const [phase, setPhase] = useState<'SCENE' | 'AFTER'>(scene ? 'SCENE' : 'AFTER');

  const finish = async () => {
    if (scene) {
      try {
        await onSeen(scene.eventId);
      } catch (e) {
        // Losing the "seen" flag only means it may come round again.
        console.error('Failed to record the encounter', e);
      }
    }
    setPhase('AFTER');
  };

  if (scene && phase === 'SCENE') {
    return (
      <DialogueSequence
        lines={scene.content.lines}
        onComplete={finish}
        testId={`talk-${spotId}`}
        backdropLocationId={spotId === 'ALDEN_VILLAGE' ? 'ALDEN_VILLAGE' : undefined}
      />
    );
  }

  const kaosLine = scene?.content.kaosLine;
  return (
    <div className="screen life-choice-screen" data-testid={`talk-${spotId}-done`}>
      {kaosLine ? (
        <div style={{ textAlign: 'center' }}>
          {kaosPortrait('smile') && (
            <div className="dialogue-portrait" style={{ marginBottom: 12 }}>
              <img src={kaosPortrait('smile')!} alt="" aria-hidden="true" />
            </div>
          )}
          <p style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 10 }}>ケイオス</p>
          <p className="life-choice-prompt" style={{ fontSize: 16 }}>
            {kaosLine}
          </p>
        </div>
      ) : (
        <p className="life-choice-prompt" style={{ fontSize: 15, color: 'var(--text-dim)' }}>
          {scene ? spotName : (NOTHING_NEW_LINES[spotId] ?? '今日は、何もなさそうだ。')}
        </p>
      )}
      <button className="btn primary" data-testid={`talk-${spotId}-leave`} onClick={onLeave}>
        もどる
      </button>
    </div>
  );
}
