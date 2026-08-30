import { useState } from 'react';
import type { World } from '../../core/world/world';
import type { PlaytestFeedbackService, SurveyAnswers } from '../../core/playtest/playtestService';
import { availableMemorableMoments } from '../../core/playtest/playtestService';
import type { MemorableMoment, Rating, ReunionRecognition } from '../../core/playtest/types';
import { FREE_COMMENT_MAX_LENGTH } from '../../core/playtest/types';
import {
  SURVEY_INTRO_LINES,
  RATING_LABELS,
  REUNION_QUESTION,
  REUNION_OPTIONS,
  MOMENT_QUESTION,
  MOMENT_LABELS,
  FREE_COMMENT_QUESTION,
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

type Step = 'INTRO' | 'PAGE_1' | 'PAGE_2' | 'PAGE_3' | 'DONE';

type Draft = Partial<SurveyAnswers> & { freeComment: string };

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
  const [draft, setDraft] = useState<Draft>({ freeComment: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const submit = async () => {
    if (saving || !page1Ready || !page2Ready) return;
    setSaving(true);
    setError(null);
    try {
      await service.submit(
        {
          continueInterest: draft.continueInterest!,
          galdFutureInterest: draft.galdFutureInterest!,
          reunionRecognition: draft.reunionRecognition!,
          worldImpactFeeling: draft.worldImpactFeeling!,
          archiveInterest: draft.archiveInterest!,
          memorableMoment: draft.memorableMoment!,
          freeComment: draft.freeComment,
        },
        world,
      );
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
        <div className="life-choice-options">
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

  const pageIndex = step === 'PAGE_1' ? 1 : step === 'PAGE_2' ? 2 : 3;

  return (
    <div className="screen" data-testid="survey-screen">
      <div className="screen-title">PLAYTEST — {pageIndex} / 3</div>
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
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }} data-testid="q7">
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
              data-testid="q7-input"
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
            {error && (
              <p
                style={{ color: 'var(--danger)', fontSize: 'var(--font-size-sm)' }}
                data-testid="survey-error"
              >
                {error}
              </p>
            )}
          </fieldset>
        )}
      </div>
      <div className="screen-footer" style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn"
          data-testid="survey-back"
          disabled={saving}
          onClick={() => setStep(step === 'PAGE_3' ? 'PAGE_2' : step === 'PAGE_2' ? 'PAGE_1' : 'INTRO')}
        >
          もどる
        </button>
        {step !== 'PAGE_3' ? (
          <button
            className="btn primary"
            data-testid="survey-next"
            disabled={step === 'PAGE_1' ? !page1Ready : !page2Ready}
            onClick={() => setStep(step === 'PAGE_1' ? 'PAGE_2' : 'PAGE_3')}
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
