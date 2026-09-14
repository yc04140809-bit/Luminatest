// BEFORE THE TITLE: the song, or straight on.
//
// The first screen anybody sees, and the first thing anybody TOUCHES —
// which is the other half of what it is for. A phone makes no sound
// until the player has done something, and every workaround for that
// is worse than simply having the first screen be a thing to do: no
// silent-autoplay trick, no invisible tap-catcher, no music that
// arrives a screen late because the gesture that unlocked it was the
// one that left the title.
//
// Two buttons and nothing else. A choice with a third option is a
// menu, and a menu before the title is a thing to get past.

interface Props {
  /** Play it, and go on when it is over or when they say so. */
  onListen: () => void;
  /** Straight to the title, with no song. */
  onSkip: () => void;
  /**
   * Whether the song is sounding right now.
   *
   * The screen does not start it and cannot stop it — it says what is
   * on offer, and while a song is on offer no longer, it says that
   * instead. The control that ends it early is the game's own SKIP,
   * laid over every screen, so there is one of it rather than two.
   */
  playing?: boolean;
  /**
   * Whether anything would actually come out.
   *
   * The sliders are the player's and this screen does not touch them,
   * so a muted player who taps 「聴く」 gets silence and the title —
   * which is correct, and which looks exactly like a broken button.
   * One line, so the silence is explained rather than mysterious.
   */
  muted?: boolean;
}

export function ThemeChoiceScreen({ onListen, onSkip, playing = false, muted = false }: Props) {
  if (playing) {
    return (
      <div className="screen theme-choice theme-choice-playing" data-testid="theme-choice">
        <div className="theme-choice-mark" aria-hidden="true">
          <span className="theme-choice-rule" />
          <span className="theme-choice-note">♪</span>
          <span className="theme-choice-rule" />
        </div>
        <p className="theme-choice-lead" data-testid="theme-choice-now">
          また、ここで。
        </p>
        {/* No second SKIP. The game's own is already on screen over
            this, and two controls that do the same thing is one of them
            doing nothing. */}
        <p className="theme-choice-note-line">聴き終わると、タイトルへ進みます</p>
      </div>
    );
  }
  return (
    <div className="screen theme-choice" data-testid="theme-choice">
      <div className="theme-choice-mark" aria-hidden="true">
        <span className="theme-choice-rule" />
        <span className="theme-choice-note">♪</span>
        <span className="theme-choice-rule" />
      </div>
      <p className="theme-choice-lead">テーマソングを聴きますか？</p>
      <div className="theme-choice-actions">
        <button
          className="btn primary theme-choice-listen"
          data-testid="theme-choice-listen"
          onClick={onListen}
        >
          <span className="theme-choice-jp">テーマソングを聴く</span>
          <span className="theme-choice-en">LISTEN</span>
        </button>
        <button className="btn theme-choice-skip" data-testid="theme-choice-skip" onClick={onSkip}>
          <span className="theme-choice-jp">スキップ</span>
          <span className="theme-choice-en">SKIP</span>
        </button>
      </div>
      {/* Said plainly, because a player who taps LISTEN on a phone in a
          quiet room should know what is about to happen — and, when the
          music is turned down to nothing, that it will not. Neither
          line asks for anything: no dialog, no dismiss, nothing to
          tap. It is a label that tells the truth about the button
          above it. */}
      {muted ? (
        <p className="theme-choice-note-line" data-testid="theme-choice-muted">
          BGM音量が0になっています
        </p>
      ) : (
        <p className="theme-choice-note-line">音が鳴ります</p>
      )}
    </div>
  );
}
