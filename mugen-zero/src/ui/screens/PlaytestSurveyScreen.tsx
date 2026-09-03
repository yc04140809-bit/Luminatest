import { useState } from 'react';
import type { World } from '../../core/world/world';
import type { PlaytestFeedback } from '../../core/playtest/types';
import type { PlaytestFeedbackService, SurveyAnswers } from '../../core/playtest/playtestService';
import { availableMemorableMoments } from '../../core/playtest/playtestService';
import type {
  LostFrequency,
  MemorableMoment,
  Rating,
  ReunionRecognition,
} from '../../core/playtest/types';
import { FREE_COMMENT_MAX_LENGTH, SHORT_ANSWER_MAX_LENGTH } from '../../core/playtest/types';
import {
  SURVEY_INTRO_LINES,
  RATING_LABELS,
  REUNION_QUESTION,
  REUNION_OPTIONS,
  MOMENT_QUESTION,
  MOMENT_LABELS,
  LOST_QUESTION,
  LOST_OPTIONS,
  FREE_COMMENT_QUESTION,
  WISH_COMMENT_QUESTION,
  MOMENT_QUESTIONS,
  MOMENT_PAGE_NOTE,
  KAOS_THANKS_LINE,
} from '../../content/playtest/survey';
import { DialogueSequence } from '../common/DialogueSequence';
import { kaosPortrait } from '../../assets/manifest';

interface Props {
  world: World;
  service: PlaytestFeedbackService;
  onFinish: () => void;
  onOpenArchive: () => void;
}

type Step = 'INTRO' | 'PAGE_1' | 'PAGE_2' | 'PAGE_3' | 'PAGE_4' | 'PAGE_5' | 'PAGE_6' | 'DONE';

/**
 * The pages, in order. Round 3 added two more, and a ladder of nested
 * ternaries does not survive that — this is the same navigation, written
 * once.
 */
const PAGES: Step[] = ['PAGE_1', 'PAGE_2', 'PAGE_3', 'PAGE_4', 'PAGE_5', 'PAGE_6'];
const PAGE_COUNT = PAGES.length;

type Draft = Partial<SurveyAnswers> & {
  freeComment: string;
  wishComment: string;
  mugenMoment: string;
  aliveMoment: string;
  unnaturalMoment: string;
  boringMoment: string;
  confusingMoment: string;
};

/** A one-line answer box. Short on purpose: a moment, not an essay. */
function MomentQuestion({
  labels,
  value,
  onChange,
  testId,
}: {
  labels: { question: string; hint: string };
  value: string;
  onChange: (value: string) => void;
  testId: string;
}) {
  return (
    <fieldset
      style={{ border: 'none', margin: 0, padding: '0 0 var(--space-lg)' }}
      data-testid={testId}
    >
      <legend
        style={{
          fontSize: 'var(--font-size-md)',
          lineHeight: 'var(--line-height-body)',
          padding: 0,
          marginBottom: 4,
        }}
      >
        {labels.question}
      </legend>
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-xs)',
          marginBottom: 'var(--space-sm)',
        }}
      >
        {labels.hint}
      </div>
      <textarea
        data-testid={`${testId}-input`}
        aria-label={labels.question}
        value={value}
        maxLength={SHORT_ANSWER_MAX_LENGTH}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          padding: 'var(--space-md)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: 'var(--font-size-md)',
          lineHeight: 'var(--line-height-body)',
          fontFamily: 'inherit',
          resize: 'vertical',
        }}
      />
    </fieldset>
  );
}

function RatingQuestion({
  labels,
  value,
  onChange,
  testId,
}: {
  labels: { question: string; low: string; high: string };
  value: Rating | undefined;
  onChange: (value: Rating) => void;
  testId: string;
}) {
  return (
    <fieldset
      style={{ border: 'none', margin: 0, padding: '0 0 var(--space-lg)' }}
      data-testid={testId}
    >
      <legend
        style={{
          fontSize: 'var(--font-size-md)',
          lineHeight: 'var(--line-height-body)',
          padding: 0,
          marginBottom: 'var(--space-sm)',
        }}
      >
        {labels.question}
      </legend>
      <div style={{ display: 'flex', gap: 6 }}>
        {([1, 2, 3, 4, 5] as Rating[]).map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              className="btn"
              data-testid={`${testId}-${n}`}
              aria-pressed={selected}
              aria-label={`${labels.question} ${n}`}
              onClick={() => onChange(n)}
              style={{
                flex: 1,
                padding: '12px 0',
                // Selection is not colour-only: the ✓ and the border
                // both carry it.
                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                color: selected ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: selected ? 700 : 400,
              }}
            >
              {n}
              {selected ? ' ✓' : ''}
            </button>
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-xs)',
          marginTop: 4,
        }}
      >
        <span>1 = {labels.low}</span>
        <span>5 = {labels.high}</span>
      </div>
    </fieldset>
  );
}

function ChoiceQuestion<T extends string>({
  question,
  options,
  value,
  onChange,
  testId,
}: {
  question: string;
  options: Array<{ id: T; label: string }>;
  value: T | undefined;
  onChange: (value: T) => void;
  testId: string;
}) {
  return (
    <fieldset
      style={{ border: 'none', margin: 0, padding: '0 0 var(--space-lg)' }}
      data-testid={testId}
    >
      <legend
        style={{
          fontSize: 'var(--font-size-md)',
          lineHeight: 'var(--line-height-body)',
          padding: 0,
          marginBottom: 'var(--space-sm)',
        }}
      >
        {question}
      </legend>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className="btn"
              data-testid={`${testId}-${option.id}`}
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              style={{
                textAlign: 'left',
                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                color: selected ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              {selected ? '✓ ' : ''}
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The post-play survey. Reached from the LIFE ARCHIVE once the player has
 * lived through Gald's life choice — never during play, and never as a
 * pop-up. Answers are feedback, not world canon.
 */
export function PlaytestSurveyScreen({ world, service, onFinish, onOpenArchive }: Props) {
  const [step, setStep] = useState<Step>('INTRO');
  const [draft, setDraft] = useState<Draft>({
    freeComment: '',
    wishComment: '',
    mugenMoment: '',
    aliveMoment: '',
    unnaturalMoment: '',
    boringMoment: '',
    confusingMoment: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What was actually saved, so the tester can hand it back to us.
  const [saved, setSaved] = useState<PlaytestFeedback | null>(null);
  const [handoff, setHandoff] = useState<string>('');

  // Only moments this player actually reached (no future spoilers).
  const moments: MemorableMoment[] = availableMemorableMoments(world);
  const momentOptions = moments.map((id) => ({ id, label: MOMENT_LABELS[id] }));

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const page1Ready =
    draft.continueInterest !== undefined &&
    draft.galdFutureInterest !== undefined &&
    draft.reunionRecognition !== undefined;
  const page2Ready =
    draft.worldImpactFeeling !== undefined &&
    draft.archiveInterest !== undefined &&
    draft.memorableMoment !== undefined;
  // Round 2 questions: does this generalise, and did they ever get lost?
  const page3Ready =
    draft.moreLivesInterest !== undefined &&
    draft.nextCuriosity !== undefined &&
    draft.lostFrequency !== undefined;

  // Round 3 asks for one rating; every text answer may be left blank.
  const page5Ready = draft.reunionMeaning !== undefined;

  const submit = async () => {
    if (saving || !page1Ready || !page2Ready || !page3Ready || !page5Ready) return;
    setSaving(true);
    setError(null);
    try {
      const stored = await service.submit(
        {
          continueInterest: draft.continueInterest!,
          galdFutureInterest: draft.galdFutureInterest!,
          reunionRecognition: draft.reunionRecognition!,
          worldImpactFeeling: draft.worldImpactFeeling!,
          archiveInterest: draft.archiveInterest!,
          memorableMoment: draft.memorableMoment!,
          freeComment: draft.freeComment,
          moreLivesInterest: draft.moreLivesInterest!,
          nextCuriosity: draft.nextCuriosity!,
          lostFrequency: draft.lostFrequency!,
          wishComment: draft.wishComment,
          reunionMeaning: draft.reunionMeaning!,
          mugenMoment: draft.mugenMoment,
          aliveMoment: draft.aliveMoment,
          unnaturalMoment: draft.unnaturalMoment,
          boringMoment: draft.boringMoment,
          confusingMoment: draft.confusingMoment,
        },
        world,
      );
      setSaved(stored);
      setStep('DONE'); // only after the write committed
    } catch (e) {
      console.error('Failed to save playtest feedback', e);
      // The answers stay in state; nothing is lost.
      setError('回答を保存できませんでした。もう一度お試しください。');
      setSaving(false);
    }
  };

  if (step === 'INTRO') {
    return (
      <DialogueSequence
        lines={SURVEY_INTRO_LINES}
        onComplete={() => setStep('PAGE_1')}
        testId="survey-intro"
      />
    );
  }

  if (step === 'DONE') {
    const copyAnswers = async () => {
      const text = saved ? feedbackAsText(saved) : '';
      try {
        await navigator.clipboard.writeText(text);
        setHandoff('コピーしました。そのまま送ってもらえると助かります。');
      } catch {
        // Some browsers refuse without a gesture they recognise, and a
        // shared build may not be on https at all. The text goes on
        // screen either way rather than pretending it was copied.
        setHandoff('コピーできませんでした。下の文章を長押しで選んで送ってください。');
      }
    };

    return (
      <div className="screen life-choice-screen" data-testid="survey-done">
        {kaosPortrait('smile') && (
          <div className="dialogue-portrait">
            <img src={kaosPortrait('smile')!} alt="" aria-hidden="true" />
          </div>
        )}
        <p style={{ color: 'var(--accent)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
          ケイオス
        </p>
        <p className="life-choice-prompt" style={{ fontSize: 16 }}>
          {KAOS_THANKS_LINE}
        </p>
        {/* The answers live in this browser and nowhere else — there is
            no server. For a tester on their own phone that means the
            only way back to us is their own hands, so give them the
            words to send. */}
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', margin: 0 }}>
          回答はこの端末の中だけに保存されています。
          開発者に送る場合は、下のボタンでコピーしてください。
        </p>
        <div className="life-choice-options">
          <button className="btn" data-testid="survey-copy-answers" onClick={copyAnswers}>
            回答をコピーする
          </button>
          {handoff && (
            <>
              <p
                style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', margin: 0 }}
                data-testid="survey-copy-status"
              >
                {handoff}
              </p>
              <textarea
                data-testid="survey-answers-text"
                readOnly
                value={saved ? feedbackAsText(saved) : ''}
                onFocus={(e) => e.currentTarget.select()}
                rows={8}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  padding: 'var(--space-md)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-size-sm)',
                  lineHeight: 'var(--line-height-body)',
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              />
            </>
          )}
          <button className="btn primary" data-testid="survey-done-archive" onClick={onOpenArchive}>
            LIFE ARCHIVEを見る
          </button>
          <button className="btn" data-testid="survey-done-home" onClick={onFinish}>
            アルデン村へ戻る
          </button>
        </div>
      </div>
    );
  }

  const pageAt = PAGES.indexOf(step);
  const pageIndex = pageAt + 1;
  const isLastPage = step === PAGES[PAGE_COUNT - 1];

  return (
    <div className="screen" data-testid="survey-screen">
      <div className="screen-title">
        PLAYTEST — {pageIndex} / {PAGE_COUNT}
      </div>
      <div className="location-list">
        {step === 'PAGE_1' && (
          <>
            <RatingQuestion
              labels={RATING_LABELS.continueInterest}
              value={draft.continueInterest}
              onChange={(v) => set('continueInterest', v)}
              testId="q1"
            />
            <RatingQuestion
              labels={RATING_LABELS.galdFutureInterest}
              value={draft.galdFutureInterest}
              onChange={(v) => set('galdFutureInterest', v)}
              testId="q2"
            />
            <ChoiceQuestion<ReunionRecognition>
              question={REUNION_QUESTION}
              options={REUNION_OPTIONS}
              value={draft.reunionRecognition}
              onChange={(v) => set('reunionRecognition', v)}
              testId="q3"
            />
          </>
        )}
        {step === 'PAGE_2' && (
          <>
            <RatingQuestion
              labels={RATING_LABELS.worldImpactFeeling}
              value={draft.worldImpactFeeling}
              onChange={(v) => set('worldImpactFeeling', v)}
              testId="q4"
            />
            <RatingQuestion
              labels={RATING_LABELS.archiveInterest}
              value={draft.archiveInterest}
              onChange={(v) => set('archiveInterest', v)}
              testId="q5"
            />
            <ChoiceQuestion<MemorableMoment>
              question={MOMENT_QUESTION}
              options={momentOptions}
              value={draft.memorableMoment}
              onChange={(v) => set('memorableMoment', v)}
              testId="q6"
            />
          </>
        )}
        {step === 'PAGE_3' && (
          <>
            <RatingQuestion
              labels={RATING_LABELS.moreLivesInterest}
              value={draft.moreLivesInterest}
              onChange={(v) => set('moreLivesInterest', v)}
              testId="q7"
            />
            <RatingQuestion
              labels={RATING_LABELS.nextCuriosity}
              value={draft.nextCuriosity}
              onChange={(v) => set('nextCuriosity', v)}
              testId="q8"
            />
            <ChoiceQuestion<LostFrequency>
              question={LOST_QUESTION}
              options={LOST_OPTIONS}
              value={draft.lostFrequency}
              onChange={(v) => set('lostFrequency', v)}
              testId="q9"
            />
          </>
        )}
        {step === 'PAGE_4' && (
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }} data-testid="q10">
            <legend
              style={{
                fontSize: 'var(--font-size-md)',
                lineHeight: 'var(--line-height-body)',
                padding: 0,
                marginBottom: 'var(--space-sm)',
              }}
            >
              {FREE_COMMENT_QUESTION}
            </legend>
            <textarea
              data-testid="q10-input"
              aria-label={FREE_COMMENT_QUESTION}
              value={draft.freeComment}
              maxLength={FREE_COMMENT_MAX_LENGTH}
              rows={7}
              onChange={(e) => set('freeComment', e.target.value)}
              style={{
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                padding: 'var(--space-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-md)',
                lineHeight: 'var(--line-height-body)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-xs)',
                textAlign: 'right',
                marginTop: 4,
              }}
            >
              {draft.freeComment.length} / {FREE_COMMENT_MAX_LENGTH}（空欄のままでも送れます）
            </div>
            <legend
              style={{
                fontSize: 'var(--font-size-md)',
                lineHeight: 'var(--line-height-body)',
                padding: 0,
                margin: 'var(--space-lg) 0 var(--space-sm)',
              }}
            >
              {WISH_COMMENT_QUESTION}
            </legend>
            <textarea
              data-testid="q11-input"
              aria-label={WISH_COMMENT_QUESTION}
              value={draft.wishComment}
              maxLength={FREE_COMMENT_MAX_LENGTH}
              rows={5}
              onChange={(e) => set('wishComment', e.target.value)}
              style={{
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                padding: 'var(--space-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-md)',
                lineHeight: 'var(--line-height-body)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </fieldset>
        )}
        {step === 'PAGE_5' && (
          <>
            <RatingQuestion
              labels={RATING_LABELS.reunionMeaning}
              value={draft.reunionMeaning}
              onChange={(v) => set('reunionMeaning', v)}
              testId="q12"
            />
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-xs)',
                margin: '0 0 var(--space-md)',
              }}
            >
              {MOMENT_PAGE_NOTE}
            </p>
            <MomentQuestion
              labels={MOMENT_QUESTIONS.mugenMoment}
              value={draft.mugenMoment}
              onChange={(v) => set('mugenMoment', v)}
              testId="q13"
            />
            <MomentQuestion
              labels={MOMENT_QUESTIONS.aliveMoment}
              value={draft.aliveMoment}
              onChange={(v) => set('aliveMoment', v)}
              testId="q14"
            />
          </>
        )}
        {step === 'PAGE_6' && (
          <>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: 'var(--font-size-xs)',
                margin: '0 0 var(--space-md)',
              }}
            >
              {MOMENT_PAGE_NOTE}
            </p>
            <MomentQuestion
              labels={MOMENT_QUESTIONS.unnaturalMoment}
              value={draft.unnaturalMoment}
              onChange={(v) => set('unnaturalMoment', v)}
              testId="q15"
            />
            <MomentQuestion
              labels={MOMENT_QUESTIONS.boringMoment}
              value={draft.boringMoment}
              onChange={(v) => set('boringMoment', v)}
              testId="q16"
            />
            <MomentQuestion
              labels={MOMENT_QUESTIONS.confusingMoment}
              value={draft.confusingMoment}
              onChange={(v) => set('confusingMoment', v)}
              testId="q17"
            />
            {error && (
              <p
                style={{ color: 'var(--danger)', fontSize: 'var(--font-size-sm)' }}
                data-testid="survey-error"
              >
                {error}
              </p>
            )}
          </>
        )}
      </div>
      <div className="screen-footer" style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn"
          data-testid="survey-back"
          disabled={saving}
          onClick={() => setStep(pageAt <= 0 ? 'INTRO' : PAGES[pageAt - 1])}
        >
          もどる
        </button>
        {!isLastPage ? (
          <button
            className="btn primary"
            data-testid="survey-next"
            disabled={
              step === 'PAGE_1'
                ? !page1Ready
                : step === 'PAGE_2'
                  ? !page2Ready
                  : step === 'PAGE_3'
                    ? !page3Ready
                    : step === 'PAGE_5'
                      ? !page5Ready
                      : false
            }
            onClick={() => setStep(PAGES[pageAt + 1])}
          >
            つぎへ
          </button>
        ) : (
          <button
            className="btn primary"
            data-testid="survey-submit"
            disabled={saving}
            onClick={submit}
          >
            {saving ? '送信しています……' : '回答を送る'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * One answer set as plain text, for a tester to paste into a message.
 *
 * There is no server: the survey writes to this browser's IndexedDB and
 * stops there. On a shared build the tester's phone is the only copy, so
 * without this they have no way to hand their answers back at all.
 */
function feedbackAsText(f: PlaytestFeedback): string {
  const lines = [
    'MUGEN ZERO PLAYTEST',
    `route: ${f.route} / ${f.worldYear}年目${f.worldDay}日目 / chapters: ${f.knownChapterCount}`,
    `session: ${f.playSessionId}`,
    `answered: ${f.createdAt}`,
    '',
    `続きを遊びたい: ${f.continueInterest}`,
    `ガルドのその後が気になった: ${f.galdFutureInterest}`,
    `再会に気づいた: ${f.reunionRecognition}`,
    `再会に意味を感じた: ${f.reunionMeaning ?? '-'}`,
    `選択が世界に影響したと感じた: ${f.worldImpactFeeling}`,
    `記録を集めたい: ${f.archiveInterest}`,
    `他の人物も見たい: ${f.moreLivesInterest ?? '-'}`,
    `次が気になった: ${f.nextCuriosity ?? '-'}`,
    `迷った頻度: ${f.lostFrequency ?? '-'}`,
    `一番印象に残った場面: ${f.memorableMoment}`,
    '',
    `世界が続いていると感じた瞬間: ${f.mugenMoment || '(なし)'}`,
    `人物が生きていると感じた瞬間: ${f.aliveMoment || '(なし)'}`,
    `会話が不自然だった場面: ${f.unnaturalMoment || '(なし)'}`,
    `退屈だった瞬間: ${f.boringMoment || '(なし)'}`,
    `意味が分からなかった場面: ${f.confusingMoment || '(なし)'}`,
    '',
    `自由記述: ${f.freeComment || '(なし)'}`,
    `やってみたかったこと: ${f.wishComment || '(なし)'}`,
    '',
  ];
  return lines.join('\n');
}
