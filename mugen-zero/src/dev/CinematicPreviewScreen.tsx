import { useCallback, useRef, useState } from 'react';
import {
  AccidentCard,
  AccidentStage,
  AccidentTalk,
  ACCIDENT_TIMELINE,
  accidentStageClass,
  useAccidentSequence,
  type AccidentBeat,
} from '../ui/cinematic/accidentCinematic';
import { UNKNOWN_ACCIDENT_001 } from '../content/summon/accidents';
import { unknownArcanaDef } from '../content/arcana/unknownArcana';
import { locationBackground } from '../content/locations/locationVisuals';

/**
 * CINEMATIC PREVIEW — looking at a piece of theatre without playing
 * the game to reach it.
 *
 * Two things make this worth having, and they are the same thing said
 * twice: an accident is rare on purpose (roughly one fight in a
 * hundred, then a month of world time before it may happen again), and
 * checking whether a dragon is the right size on a 360px phone should
 * not cost anybody an afternoon of forcing fights.
 *
 * The rule the whole screen is built around: it changes NOTHING. Not
 * health, not the book, not what has been observed, not a cooldown,
 * not the save. That is not a promise kept by being careful — it is
 * kept by structure. This component is not handed the world. It has no
 * reference to it, no store, no writer, and nothing it could call if
 * it wanted to. The strongest guarantee available is the one where the
 * capability is absent.
 *
 * And it does not own the thing it is showing. Every frame below comes
 * from ui/cinematic/accidentCinematic, which is what the real fight
 * plays. A preview that reimplemented the sequence would drift from
 * the game within a week and start answering the wrong question.
 */

type Mode = 'LIST' | 'ENTRY' | 'PLAY';
/** Which piece is being looked at. */
type Piece = 'DRAGON' | 'BREATH' | 'FULL';

const PIECES: { id: Piece; label: string; stageLabel: string; note: string }[] = [
  { id: 'DRAGON', label: '巨大召喚', stageLabel: '巨大召喚', note: '左向き・敵側・画面の半分以上を占めているか' },
  {
    id: 'BREATH',
    label: 'エンシェントブレス',
    // NOT the ability's name. The artwork has 「エンシェントブレス」
    // drawn into it, and printing it again a centimetre below is the
    // double display the direction rules out — including here, where
    // the whole point is judging whether that lettering reads.
    stageLabel: '必殺技カットイン',
    note: '顔・口元・ブレス・文字が縦画面で読めるか',
  },
  { id: 'FULL', label: 'フルシーケンス', stageLabel: 'フルシーケンス', note: '実戦と同じ順序と「間」で通しで再生' },
];

export function CinematicPreviewScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>('LIST');
  const [piece, setPiece] = useState<Piece>('FULL');
  const [ended, setEnded] = useState(false);
  const running = useRef(false);

  const onBeat = useCallback((beat: AccidentBeat) => {
    if (beat === 'NONE' && running.current) {
      running.current = false;
      setEnded(true);
    }
  }, []);
  const sequence = useAccidentSequence({ onBeat });

  /**
   * A single frame, held still.
   *
   * The full sequence walks itself; one piece of it has to be stopped
   * from walking on, or 巨大召喚 would turn into エンシェントブレス
   * while somebody was still looking at it.
   */
  const [held, setHeld] = useState<AccidentBeat | null>(null);
  const beat = held ?? sequence.beat;

  const play = useCallback(
    (which: Piece) => {
      setPiece(which);
      setMode('PLAY');
      setEnded(false);
      if (which === 'FULL') {
        setHeld(null);
        running.current = true;
        sequence.start();
        return;
      }
      running.current = false;
      sequence.stop();
      setHeld(which === 'DRAGON' ? 'DRAGON' : 'BREATH');
      setEnded(true);
    },
    [sequence],
  );

  const leave = useCallback(() => {
    running.current = false;
    sequence.stop();
    setHeld(null);
    setEnded(false);
    setMode('ENTRY');
  }, [sequence]);

  const unknown = unknownArcanaDef(UNKNOWN_ACCIDENT_001.unknownArcanaId);

  if (mode === 'LIST') {
    return (
      <div className="screen preview-screen" data-testid="cinematic-preview">
        <div className="screen-title">演出プレビュー</div>
        <p className="preview-crumb">ADMIN DEV TOOLS ＞ 演出プレビュー</p>
        <div className="preview-list">
          <p className="preview-group">ARCANA</p>
          <p className="preview-group sub">召喚事故</p>
          <button
            className="preview-item"
            data-testid="preview-UNKNOWN_ANCIENT_DRAGON_001"
            onClick={() => setMode('ENTRY')}
          >
            <span className="preview-item-name">UNKNOWN #001</span>
            <span className="preview-item-id">{UNKNOWN_ACCIDENT_001.id}</span>
          </button>
          <p className="preview-note">
            ここで再生しても、HP・構築度・図鑑・観測状態・クールダウン・セーブは
            一切変わりません。
          </p>
        </div>
        <div className="screen-footer">
          <button className="btn" data-testid="preview-back" onClick={onBack}>
            もどる
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'ENTRY') {
    return (
      <div className="screen preview-screen" data-testid="cinematic-preview">
        <div className="screen-title">UNKNOWN #001</div>
        <p className="preview-crumb">ARCANA ＞ 召喚事故 ＞ UNKNOWN #001</p>
        <div className="preview-list">
          {PIECES.map((p) => (
            <button
              key={p.id}
              className="preview-item"
              data-testid={`preview-play-${p.id}`}
              onClick={() => play(p.id)}
            >
              <span className="preview-item-name">{p.label}</span>
              <span className="preview-item-id">{p.note}</span>
            </button>
          ))}
          <p className="preview-note" data-testid="preview-timeline">
            間：ケイオスの反応 {ACCIDENT_TIMELINE.CROSS}ms ＋ 沈黙{' '}
            {ACCIDENT_TIMELINE.PAUSE}ms ／ UNKNOWN {ACCIDENT_TIMELINE.UNKNOWN}ms ／ 巨体{' '}
            {ACCIDENT_TIMELINE.DRAGON}ms ／ ブレス {ACCIDENT_TIMELINE.BREATH}ms ／ 消失{' '}
            {ACCIDENT_TIMELINE.FADE}ms
          </p>
        </div>
        <div className="screen-footer">
          <button className="btn" data-testid="preview-list-back" onClick={() => setMode('LIST')}>
            もどる
          </button>
        </div>
      </div>
    );
  }

  const backdrop = locationBackground('GREENWOOD_FOREST');
  return (
    <div className="screen bp-screen preview-stage-screen" data-testid="cinematic-preview">
      {/* A battlefield to look at, and nothing behind it. The forest is
          the real picture at its own colour, so sizes read the way they
          will in play; the plates are lettering, not a fight. No enemy
          exists here, nothing has hit points, and nothing is fought. */}
      <div className={`bp-stage${accidentStageClass(beat)}`} data-beat={beat}>
        {backdrop && <img className="bp-bg" src={backdrop} alt="" aria-hidden="true" />}
        <div className="bp-plate bp-plate-enemy" data-testid="preview-dummy">
          <span className="bp-plate-name">DUMMY</span>
          <span className="bp-plate-row">
            <span className="bp-plate-num">— / —</span>
            <span className="bp-track" />
          </span>
        </div>
        <span className="preview-badge" data-testid="preview-badge">
          ADMIN PREVIEW
        </span>
        <AccidentStage beat={beat} unknown={unknown} ability={UNKNOWN_ACCIDENT_001.ability} />
      </div>

      <div className="bp-plate bp-plate-party">
        <span className="bp-plate-name">DUMMY</span>
        <span className="bp-plate-row">
          <span className="bp-plate-num">— / —</span>
          <span className="bp-track" />
        </span>
      </div>

      <div className="bp-message" data-testid="preview-caption">
        <p className="bp-message-text">
          {PIECES.find((p) => p.id === piece)?.stageLabel}
          {beat === 'NONE' ? '：PREVIEW END' : `：${beat}`}
        </p>
      </div>

      {beat === 'CROSS' && <AccidentCard unknown={unknown} accidentId={UNKNOWN_ACCIDENT_001.id} />}
      {beat === 'TALK' && (
        <AccidentTalk
          onSkip={() => {
            running.current = false;
            sequence.stop();
            setEnded(true);
          }}
        />
      )}

      <div className="bp-commands preview-commands">
        {ended && (
          <button className="bp-cmd" data-testid="preview-replay" onClick={() => play(piece)}>
            <span className="bp-cmd-jp">もう一度</span>
            <span className="bp-cmd-en">REPLAY</span>
          </button>
        )}
        <button className="bp-cmd" data-testid="preview-exit" onClick={leave}>
          <span className="bp-cmd-jp">プレビュー一覧へ</span>
          <span className="bp-cmd-en">BACK</span>
        </button>
      </div>
    </div>
  );
}
