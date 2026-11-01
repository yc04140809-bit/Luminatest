import { useEffect, useRef } from 'react';
import { sayKaosLine } from '../audio/kaosLineVoice';

/**
 * ケイオス'S WORDS AS SHE STEPS FORWARD, HEARD (ボイスパック12). The scene itself (AwakeningScene) stays the
 * Artifact's, untouched, and keeps its place on the screen: this sits beside it, unseen and taking no room, and
 * listens for the line it shows — tapped on, or moving on by itself while the fight is watched — saying hers as
 * each comes up.
 */
export function AwakeningVoice({ lines }: { lines: readonly { speaker: string | null; text: string }[] }) {
  const mark = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const screen = mark.current?.parentElement;
    if (!screen) return;
    const say = () => {
      const shown = screen.querySelector('[data-testid="magic-awakening"] [data-testid="awakening-line"]')?.textContent ?? '';
      const at = lines.findIndex((l) => l.text === shown);
      if (at >= 0) sayKaosLine(`awakening:${at}`, lines[at]);
    };
    say();
    const watch = new MutationObserver(say);
    watch.observe(screen, { subtree: true, childList: true, characterData: true });
    return () => watch.disconnect();
  }, [lines]);
  return <span ref={mark} hidden aria-hidden="true" />;
}
