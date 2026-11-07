import { useState } from 'react';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { partyArtFor } from '@mugen/content/art';
import { kaosPortraitState, kaosTalkMode } from '@mugen/content/characters/kaosPortraits';
import { CharacterArt } from '../art/CharacterArt';
import { ScreenBackdrop } from './ScreenBackdrop';
import {
  locationBackground,
  locationBackgroundFit,
  locationBackgroundFocus,
  type LocationId,
} from '@mugen/content/locations/locationVisuals';

interface Props {
  lines: DialogueLine[];
  onComplete: () => void;
  /** Center the text on a black stage (used by the prologue monologue). */
  centered?: boolean;
  testId?: string;
  /**
   * THE WHOLE SCENE IS TENSE — 臨戦.
   *
   * A scene-wide default for the per-line `tense` flag, for a
   * conversation that is strained from its first word: a confrontation,
   * an argument, the moment before a fight. A line may still be marked
   * individually, and a marked line wins.
   */
  tense?: boolean;
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
   * A backdrop that is not a place — the key visual behind Kaos, say.
   * Ignored when backdropLocationId is given.
   */
  backdropImage?: string | null;
  /**
   * Where the scene takes place. Given one, that location's backdrop is
   * drawn behind the dialogue, so meeting someone happens in the place
   * the player just walked through instead of cutting to black.
   */
  backdropLocationId?: LocationId;
  /**
   * Play over whatever is already on screen instead of replacing it.
   *
   * Used by the forest: a few lines about a mossy stone should happen
   * where the stone is, with the two of them still standing in the
   * picture, rather than cutting away to a copy of the same forest.
   * No backdrop is drawn in this mode — the world behind is the
   * backdrop.
   */
  overlay?: boolean;
}

const KAOS_SPEAKER = 'ケイオス';

/** Tap-to-advance dialogue. Calls onComplete after the last line. */
export function DialogueSequence({
  lines,
  onComplete,
  centered = false,
  tense = false,
  testId,
  portraitSrc,
  portraitAlt = '',
  portraitFit = 'figure',
  portraitFromLine = 0,
  backdropLocationId,
  backdropImage = null,
  overlay = false,
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
  /**
   * WHICH KAOS IS SPEAKING.
   *
   * Her ordinary talking picture, or her 臨戦 one when the air is
   * tight. The scene says how it feels and content/characters/
   * kaosPortraits says which drawing that is — this never names one.
   *
   * The opening is not marked tense anywhere, so it comes out as
   * TALK_DEFAULT by the ordinary rule rather than by a special case.
   */
  const kaosArt = isKaos
    ? partyArtFor('kaos', kaosPortraitState(kaosTalkMode(line.tense ?? tense)))
    : null;
  const sceneSrc =
    isKaos || artFailed || index < portraitFromLine ? null : (portraitSrc ?? null);

  const backdrop = backdropLocationId ? locationBackground(backdropLocationId) : backdropImage;

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
        overlay ? 'dialogue-overlay dialogue-screen' : 'screen dialogue-screen',
        isKaos ? 'dialogue-kaos' : '',
        // A whole illustration is laid out differently from a cut-out
        // standing in a place: the picture takes one side of the stage
        // and the words take the other. Said on the screen rather than
        // on the image, because it is the screen that has to move.
        portraitFit === 'scene' && sceneSrc ? 'dialogue-event-cg' : '',
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
      {!overlay && (
        <ScreenBackdrop
          src={backdrop}
          variant="encounter"
          focus={backdropLocationId ? locationBackgroundFocus(backdropLocationId) : undefined}
          fit={backdropLocationId ? locationBackgroundFit(backdropLocationId) : undefined}
          testId="dialogue-backdrop"
        />
      )}
      <div className="dialogue-stage">
        {centered && (
          <p key={index} className="dialogue-centered">
            {line.text}
          </p>
        )}
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
          {kaosArt && (
            <div className="dialogue-portrait" data-testid="dialogue-portrait">
              {/* HER FACE, OUT OF A WHOLE DRAWING. The round frame is
                  unchanged — this is the same plate in the same place —
                  and what fills it is now a crop of the standing art the
                  scene asked for, so 臨戦 is a different face rather
                  than a different file name nobody can see. */}
              <CharacterArt
                art={kaosArt}
                height={148}
                className="dialogue-portrait-art"
                label="ケイオス"
                bust
                testId="dialogue-kaos-art"
              />
            </div>
          )}
          <div className={isKaos ? 'dialogue-box kaos' : 'dialogue-box'}>
            {/* Keyed on the line: each one fades in on its own rather
                than the text swapping under the reader's eye. */}
            <div key={index} className="dialogue-line">
              {line.speaker && <div className="dialogue-speaker">{line.speaker}</div>}
              <div className="dialogue-text">{line.text}</div>
            </div>
            <div className="dialogue-next">▼ タップ</div>
          </div>
        </>
      )}
      {centered && <div className="dialogue-next" style={{ padding: '0 16px 20px' }}>▼ タップ</div>}
    </div>
  );
}
