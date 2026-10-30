import { useEffect, useState } from 'react';
import { kaosFacePicture, type FaceBox } from '../../assets/kaosFaces';
import { resultFaceFile, type resultFaceFor } from './resultFace';
import './resultFace.css';

type Face = NonNullable<ReturnType<typeof resultFaceFor>>;

/**
 * Her face on a won fight's result (resultFace.ts): the delivered picture, whole, where there is one; until
 * then her own face standing in, its bust cut as her face beside a line is (ui/daily.tsx). Beside the
 * numbers, never over them. `size` 'small' on the three's 「勝利！」.
 */
export function ResultFace({ face, size = 'large' }: { face: Face; size?: 'large' | 'small' }) {
  const file = resultFaceFile(face.file);
  const [stand, setStand] = useState<{ src: string; box: FaceBox } | null>(null);
  useEffect(() => {
    if (file) return;
    let gone = false;
    void kaosFacePicture(face.stand).then((p) => !gone && setStand(p));
    return () => {
      gone = true;
    };
  }, [file, face.stand]);
  return (
    <div
      className={`result-face ${size}`}
      data-testid="result-face"
      data-party={face.party}
      data-how={face.how}
      data-file={face.file}
      data-drawn={file ? 'delivered' : stand ? `stand-${face.stand}` : 'none'}
      aria-hidden="true"
    >
      {file ? (
        <img className="whole" src={file} alt="" />
      ) : (
        stand && (
          <img
            src={stand.src}
            alt=""
            style={{
              width: `${(stand.box.fileW / stand.box.width) * 100}%`,
              height: `${(stand.box.fileH / stand.box.height) * 100}%`,
              left: `${(-stand.box.x / stand.box.width) * 100}%`,
              top: `${(-stand.box.y / stand.box.height) * 100}%`,
            }}
          />
        )
      )}
    </div>
  );
}
