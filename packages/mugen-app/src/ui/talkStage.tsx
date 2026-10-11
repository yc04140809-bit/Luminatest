import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { KaosFace } from '@mugen/content/characters/kaosFaces';
import { KAOS_FACE_BOX, kaosFaceSrc } from '../assets/kaosFaces';

/**
 * THE TWO OF THEM, SIDE BY SIDE, WHILE THEY TALK (作者 2026-10-11: 「会話時
 * 左右に分けて2人並ぶと会話っぽくていい。テイルズシリーズみたいに」).
 *
 * While a short exchange of theirs is told in the small box at the top of the
 * page, they stand over the place's painting: the hero on the left, facing
 * right; Kaos on the right, beside the page, with the face her line names.
 * Whoever is speaking is in full light and a little forward; the other
 * dimmed. Pictures only — it decides nothing and stops nothing (no touch).
 *
 * The hero has no picture for talking yet: until one is delivered, his
 * battle drawing stands in (its upper body, turned to face her).
 */

const HERO_BUST = {
  load: async () => (await import('@mugen/assets/files/characters/hero/hero-battle-idle.png')).default,
  box: { fileW: 1024, fileH: 1536, x: 60, y: 120, width: 900, height: 720 },
  mirror: true,
};

type Box = { fileW: number; fileH: number; x: number; y: number; width: number; height: number };

/** A picture shown only inside its box (the file untouched), scaled to the frame's height. */
function Bust({ src, box, mirror = false, testId, face }: { src: string; box: Box; mirror?: boolean; testId: string; face?: string }) {
  // The frame keeps the box's shape; the picture inside is sized and moved so only the box shows.
  const w = (box.fileW / box.width) * 100;
  const h = (box.fileH / box.height) * 100;
  return (
    <div className="talk-bust-frame" style={{ aspectRatio: `${box.width} / ${box.height}` }} data-testid={testId} data-face={face}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={{
          width: `${w}%`,
          height: `${h}%`,
          left: `${(-box.x / box.width) * 100}%`,
          top: `${(-box.y / box.height) * 100}%`,
          transform: mirror ? 'scaleX(-1)' : undefined,
        }}
      />
    </div>
  );
}

function useSrc(load: () => Promise<string | null>, key: string): string | null {
  const [src, setSrc] = useState<{ key: string; src: string | null } | null>(null);
  useEffect(() => {
    let gone = false;
    void load().then((s) => !gone && setSrc({ key, src: s }));
    return () => {
      gone = true;
    };
    // `key` names what is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return src && src.key === key ? src.src : null;
}

/**
 * Rendered by the box that tells the exchange; draws the two of them over
 * the painting of the page it is on (`.place-panel`).
 */
export function TalkStage({ speaking, kaosFace }: { speaking: 'HERO' | 'KAOS' | null; kaosFace: KaosFace }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost((anchor.current?.closest('.place-panel') as HTMLElement | null) ?? null);
  }, []);
  // Her face changes line by line; the last one stays while the next loads.
  const kaosSrc = useSrc(() => kaosFaceSrc(kaosFace), kaosFace);
  const [lastKaos, setLastKaos] = useState<string | null>(null);
  useEffect(() => {
    if (kaosSrc) setLastKaos(kaosSrc);
  }, [kaosSrc]);
  const heroSrc = useSrc(HERO_BUST.load, 'hero');
  const shownKaos = kaosSrc ?? lastKaos;
  return (
    <>
      <span ref={anchor} hidden />
      {host &&
        createPortal(
          <div className="talk-stage" data-testid="talk-stage" data-speaking={speaking ?? 'NONE'}>
            {heroSrc && (
              <div className={`talk-bust talk-bust-hero${speaking === 'HERO' ? ' on' : ''}`}>
                <Bust src={heroSrc} box={HERO_BUST.box} mirror={HERO_BUST.mirror} testId="talk-bust-hero" />
              </div>
            )}
            {shownKaos && (
              <div className={`talk-bust talk-bust-kaos${speaking === 'KAOS' ? ' on' : ''}`}>
                <Bust src={shownKaos} box={KAOS_FACE_BOX} testId="talk-bust-kaos" face={kaosFace} />
              </div>
            )}
          </div>,
          host,
        )}
    </>
  );
}
