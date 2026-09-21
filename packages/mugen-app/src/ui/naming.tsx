import { useState } from 'react';
import {
  DEFAULT_HERO_NAME,
  HERO_NAME_MAX_LENGTH,
  heroNameLength,
  isUsableHeroName,
} from '@mugen/core/world/heroName';

/**
 * WHAT DO THEY CALL YOU — once, on the way out of the opening.
 *
 * NOT A FLOW SCREEN, and that is deliberate. `Screen` is shared with
 * the Artifact, whose `backTarget.ts` is a total `Record<Screen, …>`
 * precisely so that a new screen forces somebody to answer where its
 * back button goes — and the Artifact may not be touched this round.
 * So this lives between the prologue ending and HOME beginning, inside
 * the App, and the shared union is untouched.
 *
 * WHY THAT ALSO SOLVES CONTINUE: 「つづきから」 goes straight to HOME
 * and never passes through the prologue, so a returning player cannot
 * reach this screen. No flag is consulted to make that true; the shape
 * of the flow makes it true.
 *
 * There is no way to back out. A name is the one thing the rest of the
 * game cannot draw without, so the only exits are a name and the
 * default — and the default is a real choice, recorded as one.
 */
interface Props {
  onConfirm: (name: string) => void;
  busy?: boolean;
}

export function NamingScreen({ onConfirm, busy = false }: Props) {
  const [typed, setTyped] = useState('');
  const trimmedLength = heroNameLength(typed.trim());
  const usable = isUsableHeroName(typed);
  // Nothing typed is not an error: it means the default, which is
  // offered as its own button rather than hidden behind a blank field.
  const empty = typed.trim() === '';

  return (
    <div className="screen naming-screen" data-testid="naming-screen">
      <p className="place">なまえ</p>
      <p className="line">あなたの名前を教えてください。</p>

      <input
        className="naming-input"
        data-testid="naming-input"
        value={typed}
        // No `maxLength`: a paste that is too long should SAY so rather
        // than be silently cut, and the count below is how it says it.
        placeholder={DEFAULT_HERO_NAME}
        aria-label="なまえ"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && usable && !busy) onConfirm(typed);
        }}
      />
      <p className="naming-count" data-testid="naming-count">
        {trimmedLength} / {HERO_NAME_MAX_LENGTH}
        {trimmedLength > HERO_NAME_MAX_LENGTH && '（長すぎます）'}
      </p>

      <div className="actions">
        <button
          className="btn primary"
          data-testid="naming-confirm"
          disabled={!usable || busy}
          onClick={() => onConfirm(typed)}
        >
          けってい
        </button>
        {empty && (
          <button
            className="btn"
            data-testid="naming-default"
            disabled={busy}
            onClick={() => onConfirm(DEFAULT_HERO_NAME)}
          >
            「{DEFAULT_HERO_NAME}」のまま
          </button>
        )}
      </div>
    </div>
  );
}
