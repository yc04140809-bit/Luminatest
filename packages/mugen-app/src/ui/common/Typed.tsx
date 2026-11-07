import { useEffect, useState, useSyncExternalStore } from 'react';
import { displaySettings, watchDisplaySettings, type TextSpeed } from '../../platform/settings';

/**
 * A LINE OF WORDS, AS THE PLAYER LIKES THEM TO COME (設定 テキスト表示速度, 作者 2026-11-02).
 *
 * 一括 (the default — as the game has always shown them): the whole line at once, nothing else. 遅い／普通／速い:
 * one letter at a time; the rest is laid out already but unseen, so the box never grows under a finger. A tap
 * anywhere while a line is still coming shows it whole — and that tap does nothing else (it is taken before
 * the button under it hears it), so 「つぎへ」 is never pressed past words not yet read.
 */
export const LETTER_MS: Readonly<Record<Exclude<TextSpeed, 'INSTANT'>, number>> = { SLOW: 70, NORMAL: 40, FAST: 18 };

const coming = new Set<() => void>();
let listening = false;

function takeTap(e: Event): void {
  if (coming.size === 0) return;
  e.stopPropagation();
  e.preventDefault();
  [...coming].forEach((whole) => whole());
}

function listen(): void {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('click', takeTap, true);
}

export function useTextSpeed(): TextSpeed {
  return useSyncExternalStore(watchDisplaySettings, () => displaySettings().textSpeed);
}

export function Typed({ text, testId, holdsTaps = true }: { text: string; testId?: string; /** False: a sample — a tap is not taken from the buttons around it. */ holdsTaps?: boolean }) {
  const speed = useTextSpeed();
  const [shown, setShown] = useState(speed === 'INSTANT' ? text.length : 0);
  useEffect(() => {
    if (speed === 'INSTANT') {
      setShown(text.length);
      return;
    }
    setShown(0);
    let n = 0;
    const whole = () => {
      n = text.length;
      setShown(n);
      stop();
    };
    const timer = window.setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= text.length) stop();
    }, LETTER_MS[speed]);
    function stop() {
      window.clearInterval(timer);
      coming.delete(whole);
    }
    if (holdsTaps) {
      coming.add(whole);
      listen();
    }
    return stop;
  }, [text, speed]);
  if (speed === 'INSTANT' || shown >= text.length) return <>{text}</>;
  return (
    <span className="typed" data-typing="yes" data-testid={testId}>
      {text.slice(0, shown)}
      <span className="typed-rest" aria-hidden="true">
        {text.slice(shown)}
      </span>
    </span>
  );
}
