import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { kaosFaceOf, type KaosFace } from "@mugen/content/characters/kaosFaces";
import { heroFaceOf } from "@mugen/content/characters/heroFaces";
import type { DialogueLine } from "@mugen/content/dialogue/prologue";
import { kaosFacePicture, type FaceBox } from "../assets/kaosFaces";
import { HERO_FACE_BOX, heroFaceSrc } from "../assets/heroFaces";
import type { HeroFace } from "@mugen/content/characters/heroFaces";

/**
 * THE TWO OF THEM, SIDE BY SIDE, WHILE THEY TALK (作者 2026-10-11: 「会話時
 * 左右に分けて2人並ぶと会話っぽくていい。テイルズシリーズみたいに」).
 *
 * While a short exchange of theirs is told, they stand over the place's
 * painting: the hero on the left, Kaos on the right beside the page, each
 * with the face their line names. Whoever is speaking is in full light and a
 * little forward; the other dimmed. The words themselves sit in a box across
 * the bottom of the two of them (作者 2026-10-11: 「セリフ左下の画像下の方が
 * 読みやすい」), so a face and its line are read together; the page's own
 * doors stay where they are. The pictures take no touch; the box does.
 *
 * The hero with the face his line names (assets/heroFaces.ts, 2026-10-11);
 * when he is not the one speaking, the face he last had.
 */

type Box = FaceBox;

/** A picture shown only inside its box (the file untouched), scaled to the frame's height. */
function Bust({
  src,
  box,
  mirror = false,
  testId,
  face,
}: {
  src: string;
  box: Box;
  mirror?: boolean;
  testId: string;
  face?: string;
}) {
  // The frame keeps the box's shape; the picture inside is sized and moved so only the box shows.
  const w = (box.fileW / box.width) * 100;
  const h = (box.fileH / box.height) * 100;
  return (
    <div
      className="talk-bust-frame"
      style={{ aspectRatio: `${box.width} / ${box.height}` }}
      data-testid={testId}
      data-face={face}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={{
          width: `${w}%`,
          height: `${h}%`,
          left: `${(-box.x / box.width) * 100}%`,
          top: `${(-box.y / box.height) * 100}%`,
          transform: mirror ? "scaleX(-1)" : undefined,
        }}
      />
    </div>
  );
}

function useSrc(
  load: () => Promise<string | null>,
  key: string,
): string | null {
  const [src, setSrc] = useState<{ key: string; src: string | null } | null>(
    null,
  );
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
export function TalkStage({
  speaking,
  kaosFace,
  heroFace = "NORMAL",
  box = null,
}: {
  speaking: "HERO" | "KAOS" | null;
  kaosFace: KaosFace;
  heroFace?: HeroFace;
  /** The line's box, drawn across the bottom of the two of them (on a page without a painting: in place). */
  box?: ReactNode;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    setHost(
      // A place's painting (`.place-panel`), or the village's conversation area (ui/village, 2026-10-16).
      (anchor.current?.closest(".place-panel, .vg-side") as HTMLElement | null) ?? null,
    );
  }, []);
  // Her face changes line by line; the last one stays while the next loads.
  const [kaosPic, setKaosPic] = useState<{
    face: KaosFace;
    src: string;
    box: FaceBox;
  } | null>(null);
  useEffect(() => {
    let gone = false;
    void kaosFacePicture(kaosFace).then(
      (p) => !gone && p && setKaosPic({ face: kaosFace, ...p }),
    );
    return () => {
      gone = true;
    };
  }, [kaosFace]);
  const heroSrc = useSrc(() => heroFaceSrc(heroFace), heroFace);
  const [lastHero, setLastHero] = useState<string | null>(null);
  useEffect(() => {
    if (heroSrc) setLastHero(heroSrc);
  }, [heroSrc]);
  const shownHero = heroSrc ?? lastHero;
  return (
    <>
      <span ref={anchor} hidden />
      {!host && box}
      {host &&
        createPortal(
          <div
            className="talk-stage"
            data-testid="talk-stage"
            data-speaking={speaking ?? "NONE"}
          >
            {shownHero && (
              <div
                className={`talk-bust talk-bust-hero${speaking === "HERO" ? " on" : ""}`}
              >
                <Bust
                  src={shownHero}
                  box={HERO_FACE_BOX}
                  testId="talk-bust-hero"
                  face={heroFace}
                />
              </div>
            )}
            {kaosPic && (
              <div
                className={`talk-bust talk-bust-kaos${speaking === "KAOS" ? " on" : ""}`}
              >
                <Bust
                  src={kaosPic.src}
                  box={kaosPic.box}
                  testId="talk-bust-kaos"
                  face={kaosFace}
                />
              </div>
            )}
            {box && <div className="talk-box">{box}</div>}
          </div>,
          host,
        )}
    </>
  );
}

/**
 * Who is speaking at line `at`, and each one's face: the one speaking with
 * the face the line names, the other with the face they last had (or their
 * first, before they have spoken).
 */
export function stageAt(
  lines: readonly DialogueLine[],
  at: number,
): {
  speaking: "HERO" | "KAOS" | null;
  kaosFace: KaosFace;
  heroFace: HeroFace;
} {
  const line = lines[Math.min(at, lines.length - 1)];
  const last = <F,>(of: (l: DialogueLine) => F | null): F | null => {
    for (let i = Math.min(at, lines.length - 1); i >= 0; i--) {
      const f = of(lines[i]);
      if (f) return f;
    }
    for (const l of lines) {
      const f = of(l);
      if (f) return f;
    }
    return null;
  };
  const kaos = kaosFaceOf(line);
  const hero = heroFaceOf(line);
  return {
    speaking: hero ? "HERO" : kaos ? "KAOS" : null,
    kaosFace: kaos ?? last(kaosFaceOf) ?? "NORMAL",
    heroFace: hero ?? last(heroFaceOf) ?? "NORMAL",
  };
}
