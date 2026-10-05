import { useEffect, useState } from 'react';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { BAKERY_SHOP_DESCRIPTION, BAKERY_SHOP_LINES } from '@mugen/content/dialogue/bakeryShop';
import { bakeryArt, type BakeryArt } from '../assets/bakery';

/**
 * アルデン村のパン屋 — THE APP'S BAKERY, as it is today.
 *
 * The tavern's arrangement (`tavern.tsx`), with two people instead of
 * one: the empty shop, the owner and Lina standing in it, and the words
 * over all three — separate layers, never one picture.
 *
 * WHAT IS SAID IS THE CONTENT'S (`bakeryShop.ts`), a minimal
 * introduction and nothing more. This screen records nothing: a save,
 * WORLD MEMORY and the story are exactly as they were before the door
 * was opened.
 */
export function BakeryScreen({ onLeave }: { onLeave: () => void }) {
  const [art, setArt] = useState<BakeryArt>({ room: null, owner: null, lina: null });
  const [talking, setTalking] = useState<readonly DialogueLine[] | null>(null);
  const [at, setAt] = useState(0);
  // Pictures that fail to load are dropped; the words never wait for art.
  const [failed, setFailed] = useState<{ room?: boolean; owner?: boolean; lina?: boolean }>({});

  useEffect(() => {
    let gone = false;
    void bakeryArt().then((a) => {
      if (!gone) setArt(a);
    });
    return () => {
      gone = true;
    };
  }, []);

  const line = talking?.[at];
  const last = !!talking && at >= talking.length - 1;

  const talk = () => {
    setAt(0);
    setTalking(BAKERY_SHOP_LINES);
  };
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    setTalking(null);
  };

  return (
    <div className="screen bakery" data-testid="bakery-screen">
      {art.room && !failed.room && (
        <img
          className="bakery-room"
          src={art.room}
          alt=""
          aria-hidden="true"
          data-testid="bakery-room"
          onError={() => setFailed((f) => ({ ...f, room: true }))}
        />
      )}
      {art.owner && !failed.owner && (
        <img
          className="bakery-owner"
          src={art.owner}
          alt="パン屋の主人"
          data-testid="bakery-owner"
          onError={() => setFailed((f) => ({ ...f, owner: true }))}
        />
      )}
      {art.lina && !failed.lina && (
        <img
          className="bakery-lina"
          src={art.lina}
          alt="リナ"
          data-testid="bakery-lina"
          onError={() => setFailed((f) => ({ ...f, lina: true }))}
        />
      )}
      <div className="bakery-words" data-testid="bakery-words">
        <h1 className="place">パン屋</h1>
        {line ? (
          <>
            {line.speaker && <p className="speaker">{line.speaker}</p>}
            <p className="line" data-testid="bakery-line">
              {line.speaker ? `「${line.text}」` : line.text}
            </p>
            <button className="btn primary" data-testid="bakery-next" onClick={next}>
              {last ? 'もどる' : 'つぎへ'}
            </button>
          </>
        ) : (
          <>
            <p className="line" data-testid="bakery-description">
              {BAKERY_SHOP_DESCRIPTION}
            </p>
            <div className="actions">
              <button className="btn primary" data-testid="bakery-talk" onClick={talk}>
                話す
              </button>
              <button className="btn" data-testid="bakery-leave" onClick={onLeave}>
                店を出る
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
