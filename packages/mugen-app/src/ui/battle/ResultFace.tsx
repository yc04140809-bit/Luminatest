import { useEffect, useRef, useState, type ReactNode } from 'react';
import { playVoice } from '../../platform/audio';
import { kaosFacePicture, type FaceBox } from '../../assets/kaosFaces';
import type { resultFaceFor } from './resultFace';
import './resultFace.css';

type Face = NonNullable<ReturnType<typeof resultFaceFor>>;

/**
 * A WON FIGHT'S RESULT, OVER THE FIGHT ITSELF (作者 2026-10-30 v2, result-screen-mock-v2).
 *
 * The scene that was fought stays behind, blurred and dimmed (a veil over it — the fight's own screen, not a
 * picture of it); on the left her bust, large and unframed, turned to the player now that it is over (one of the
 * village talk's faces, resultFace.ts); on the right the result's own small panel (`children`); and under the two
 * of them, in one band, her line and his answer. Where she did not fight: the veil and the panel only.
 */
export function ResultOver({
  face,
  heroName,
  testId,
  say = [],
  children,
}: {
  face: Face | null;
  heroName: string;
  testId: string;
  /** What is said as it is shown (battleVoices winVoices), once. */
  say?: readonly string[];
  children: ReactNode;
}) {
  const said = useRef(false);
  useEffect(() => {
    if (said.current) return;
    said.current = true;
    // After whatever is still being said (a finisher's last line), never over it.
    playVoice(say, { wait: true });
  }, []);
  return (
    <div className={`result-over${face ? ' with-kaos' : ''}`} data-testid={testId}>
      <span className="ro-veil" aria-hidden="true" />
      {face && <ResultBust face={face} />}
      <div className="ro-panel">{children}</div>
      {face && (
        <p className="ro-line" data-testid="result-line">
          <span className="ro-who">ケイオス</span>「{face.line.kaos}」
          <span className="ro-who hero">{heroName}</span>「{face.line.hero}」
        </p>
      )}
    </div>
  );
}

/** Her bust: the face's picture, only the part above its sample box, no frame — fading out at its foot. */
function ResultBust({ face }: { face: Face }) {
  const [shown, setShown] = useState<{ src: string; box: FaceBox } | null>(null);
  useEffect(() => {
    let gone = false;
    void kaosFacePicture(face.face).then((p) => !gone && setShown(p));
    return () => {
      gone = true;
    };
  }, [face.face]);
  const box = shown?.box;
  return (
    <div
      className="ro-bust"
      data-testid="result-face"
      data-party={face.party}
      data-how={face.how}
      data-face={face.face}
      data-drawn={shown ? 'yes' : 'no'}
      style={box ? { aspectRatio: `${box.width} / ${box.height}` } : undefined}
      aria-hidden="true"
    >
      {shown && box && (
        <img
          src={shown.src}
          alt=""
          style={{
            width: `${(box.fileW / box.width) * 100}%`,
            height: `${(box.fileH / box.height) * 100}%`,
            left: `${(-box.x / box.width) * 100}%`,
            top: `${(-box.y / box.height) * 100}%`,
          }}
        />
      )}
    </div>
  );
}
