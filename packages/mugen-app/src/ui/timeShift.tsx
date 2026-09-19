import { useState } from 'react';
import type { LifeChoiceId } from '@mugen/core/flow/types';
import { Place } from './screens';

/**
 * THE ONE TIME SHIFT — offered by the story, decided by the player.
 *
 * Not a system the player can reach for. It is offered once, at the
 * end of the scene in which they decide what becomes of Gald, and its
 * whole purpose is to say the thing the game is about: the people you
 * meet go on living while you are not looking, and the choice you just
 * made has a life on the other side of it.
 *
 * EVERY WORD HERE IS EXISTING CANON, lifted from the Artifact's
 * TimeShiftScreen rather than written for the App. Nothing new was
 * invented for this beat — including the three years, which content
 * already fixes: all four of Gald's reunion chapters open with
 * 「三年後。」.
 *
 * AND THE CHOICE STAYS. 「旅立つ／まだ残る」 is not decoration: the
 * world is never moved against the player's wishes, so declining
 * costs them nothing and passes no time at all.
 */

/** What the player is told once the years have gone by. */
export function TimeShiftScreen({
  choice,
  onConfirm,
  onStay,
  onExplore,
  onHome,
}: {
  /**
   * WHICH LIFE THEY CHOSE — read only to decide whether one line may
   * be said. See the KILL note below.
   */
  choice: LifeChoiceId | null;
  /** Runs the shift. Must resolve only once the save is committed. */
  onConfirm: () => Promise<void>;
  /** 「まだ残る」: leaves the world completely untouched. */
  onStay: () => void;
  onExplore: () => void;
  onHome: () => void;
}) {
  const [phase, setPhase] = useState<'CONFIRM' | 'SHIFTING' | 'DONE'>('CONFIRM');
  const [error, setError] = useState<string | null>(null);

  const go = () => {
    if (phase !== 'CONFIRM') return; // a double tap cannot shift twice
    setPhase('SHIFTING');
    setError(null);
    void onConfirm()
      .then(() => setPhase('DONE'))
      .catch((e) => {
        console.error('TIME SHIFT failed', e);
        // THE WORLD DID NOT MOVE, so neither does the screen. Failing
        // back to the offer is what keeps "the view is in the future
        // but the world is not" from ever being a state.
        setError('時を進められませんでした。もう一度お試しください。');
        setPhase('CONFIRM');
      });
  };

  if (phase === 'DONE') {
    return (
      <Place area="ALDEN" title="">
        <div data-testid="time-shift-done">
          <p className="seasons">春 — 夏 — 秋 — 冬</p>
          <p className="line" data-testid="time-shift-years">
            ――3年後。
          </p>
          <p className="line">
            あなたの知らないところでも、
            <br />
            人々は生きていた。
          </p>
          {/*
            THE ONE LINE THAT CANNOT BE SAID ON EVERY ROUTE.
            「あの日出会った人の“続き”も、どこかで動いてるみたい。」
            reads as "he is out there somewhere", which is true of the
            three routes where he lives and a lie on the one where the
            player killed him. His story does continue — somebody
            leaves flowers on the stones — but that is not him moving,
            and the line is withheld rather than reworded, because
            rewriting it would be inventing dialogue for a scene that
            already has some.
          */}
          {choice !== 'KILL' && (
            <div data-testid="time-shift-guidance">
              <p className="speaker">ケイオス</p>
              <p className="line">
                「あの日出会った人の“続き”も、
                <br />
                どこかで動いてるみたい。」
              </p>
            </div>
          )}
          <p className="line">「少し、歩いてみる？」</p>
          <div className="actions">
            <button className="btn primary" data-testid="time-shift-explore" onClick={onExplore}>
              変化した場所を探す
            </button>
            <button className="btn" data-testid="time-shift-return" onClick={onHome}>
              アルデン村へ戻る
            </button>
          </div>
        </div>
      </Place>
    );
  }

  return (
    <Place area="ALDEN" title="">
      <div data-testid="time-shift-confirm">
        <p className="speaker">ケイオス</p>
        <p className="line">
          「次にここへ帰ってきた時、
          <br />
          同じ景色だとは限らないよ。」
        </p>
        <p className="line" data-testid="time-shift-offer">
          【3年の時を進めます】
        </p>
        <p className="line dim">世界の人々も、それぞれの人生を歩みます。</p>
        <div className="actions">
          <button
            className="btn primary"
            data-testid="time-shift-go"
            disabled={phase === 'SHIFTING'}
            onClick={go}
          >
            {phase === 'SHIFTING' ? '時が流れている……' : '旅立つ'}
          </button>
          <button
            className="btn"
            data-testid="time-shift-stay"
            disabled={phase === 'SHIFTING'}
            onClick={onStay}
          >
            まだ残る
          </button>
        </div>
        {error && (
          <p className="warn" data-testid="time-shift-error">
            {error}
          </p>
        )}
      </div>
    </Place>
  );
}
