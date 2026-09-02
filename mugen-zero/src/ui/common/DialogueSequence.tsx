import { useState } from 'react';
import type { DialogueLine } from '../../content/dialogue/prologue';
import { kaosPortrait } from '../../assets/manifest';
import { ScreenBackdrop } from './ScreenBackdrop';
import {
  locationBackground,
  locationBackgroundFit,
  locationBackgroundFocus,
  type LocationId,
} from '../../content/locations/locationVisuals';

interface Props {
  lines: DialogueLine[];
  onComplete: () => void;
  /** Center the text on a black stage (used by the prologue monologue). */
  centered?: boolean;
  testId?: string;
  /**
   * Standing art for the scene's speaker (Gald in the forest, say).
   * Kaos supplies her own portrait automatically.
   */
  portraitSrc?: string | null;
  portraitAlt?: string;
  /**
   * How scene art is laid out: 'figure' is a cut-out standing above the
   * words, 'scene' a full illustration filling the stage.
   */
  portraitFit?: 'figure' | 'scene';
  /** Show the art only from this line onwards (default: from the first). */
  portraitFromLine?: number;
  /**
   * Where the scene takes place. Given one, that location's backdrop is
   * drawn behind the dialogue, so meeting someone happens in the place
   * the player just walked through instead of cutting to black.
   */
  backdropLocationId?: LocationId;
}

const KAOS_SPEAKER = 'ケイオス';

/** Tap-to-advance dialogue. Calls onComplete after the last line. */
export function DialogueSequence({
  lines,
  onComplete,
  centered = false,
  testId,
  portraitSrc,
  portraitAlt = '',
  portraitFit = 'figure',
  portraitFromLine = 0,
  backdropLocationId,
}: Props) {
  const [index, setIndex] = useState(0);
  // Art is presentation: if it fails to load the scene plays on without
  // it, and the event still commits.
  const [artFailed, setArtFailed] = useState(false);
  const line = lines[index];
  const isKaos = line.speaker === KAOS_SPEAKER;
  // Kaos speaks face to face — a round portrait sitting just above her
  // words, near the middle of the screen. Scene art (Gald) fills the
  // stage behind the box instead.
  const kaosSrc = isKaos ? kaosPortrait('normal') : null;
  const sceneSrc =
    isKaos || artFailed || index < portraitFromLine ? null : (portraitSrc ?? null);

  const backdrop = backdropLocationId ? locationBackground(backdropLocationId) : null;

  const advance = () => {
    if (index + 1 < lines.length) {
      setIndex(index + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div
      className={[
        'screen dialogue-screen',
        isKaos ? 'dialogue-kaos' : '',
        backdrop ? 'has-backdrop' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advance();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="次へ進む"
      data-testid={testId}
    >
      <ScreenBackdrop
        src={backdrop}
        variant="encounter"
        focus={backdropLocationId ? locationBackgroundFocus(backdropLocationId) : undefined}
        fit={backdropLocationId ? locationBackgroundFit(backdropLocationId) : undefined}
        testId="dialogue-backdrop"
      />
      <div className="dialogue-stage">
        {centered && <p className="dialogue-centered">{line.text}</p>}
        {sceneSrc && (
          <img
            className={
              portraitFit === 'scene' ? 'dialogue-scene-art event-cg' : 'dialogue-scene-art'
            }
            data-testid="scene-portrait"
            src={sceneSrc}
            alt={portraitAlt}
            onError={() => setArtFailed(true)}
          />
        )}
      </div>
      {!centered && (
        <>
          {kaosSrc && (
            <div className="dialogue-portrait" data-testid="dialogue-portrait">
              <img src={kaosSrc} alt="" aria-hidden="true" />
            </div>
          )}
          <div className={isKaos ? 'dialogue-box kaos' : 'dialogue-box'}>
            {line.speaker && <div className="dialogue-speaker">{line.speaker}</div>}
            <div className="dialogue-text">{line.text}</div>
            <div className="dialogue-next">▼ タップ</div>
          </div>
        </>
      )}
      {centered && <div className="dialogue-next" style={{ padding: '0 16px 20px' }}>▼ タップ</div>}
    </div>
  );
}
