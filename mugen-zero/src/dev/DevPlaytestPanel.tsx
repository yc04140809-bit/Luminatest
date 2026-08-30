import { useCallback, useEffect, useState } from 'react';
import type { PlaytestFeedbackService } from '../core/playtest/playtestService';
import type { PlaytestFeedback } from '../core/playtest/types';
import type { PlaytestSummary } from '../core/playtest/summary';
import { MOMENT_LABELS } from '../content/playtest/survey';

interface Props {
  service: PlaytestFeedbackService;
}

const RECOGNITION_LABELS: Record<string, string> = {
  IMMEDIATE: 'Immediate',
  LATER: 'Later',
  NOT_RECOGNIZED: 'Not recognized',
  NOT_APPLICABLE: 'Not applicable',
};

function avg(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} / 5`;
}

/** Development-only view of playtest answers. Never shown to players. */
export function DevPlaytestPanel({ service }: Props) {
  const [feedback, setFeedback] = useState<PlaytestFeedback[]>([]);
  const [summary, setSummary] = useState<PlaytestSummary | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [status, setStatus] = useState('');

  const refresh = useCallback(async () => {
    const [all, computed] = await Promise.all([service.getAll(), service.getSummary()]);
    setFeedback(all);
    setSummary(computed);
  }, [service]);

  useEffect(() => {
    refresh().catch((e) => console.error('Failed to read playtest feedback', e));
  }, [refresh]);

  const exportCsv = async () => {
    try {
      const csv = await service.toCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mugen-zero-playtest-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus('CSVを書き出しました');
    } catch (e) {
      console.error('CSV export failed', e);
      setStatus('CSVの書き出しに失敗しました');
    }
  };

  const deleteAll = async () => {
    try {
      await service.deleteAll();
      await refresh();
      setStatus('回答を削除しました');
    } catch (e) {
      console.error('Failed to delete feedback', e);
      setStatus('削除に失敗しました');
    } finally {
      setConfirmingDelete(false);
    }
  };

  const empty = !summary || summary.responseCount === 0;

  return (
    <>
      <div className="location-card" data-testid="dev-playtest-summary">
        {empty ? (
          <div className="location-desc">まだ回答はありません。</div>
        ) : (
          <div className="location-desc">
            PLAYTEST RESPONSES: {summary!.responseCount}
            <br />
            CONTINUE INTEREST: {avg(summary!.continueInterestAvg)}
            <br />
            GALD FUTURE INTEREST: {avg(summary!.galdFutureInterestAvg)}
            <br />
            WORLD IMPACT: {avg(summary!.worldImpactFeelingAvg)}
            <br />
            ARCHIVE INTEREST: {avg(summary!.archiveInterestAvg)}
            <br />
            <br />
            REUNION RECOGNITION
            <br />
            {Object.entries(summary!.reunionRecognitionCounts).map(([key, count]) => (
              <span key={key}>
                {RECOGNITION_LABELS[key] ?? key} {count}
                <br />
              </span>
            ))}
            <br />
            MEMORABLE MOMENT
            <br />
            {Object.entries(summary!.memorableMomentCounts)
              .filter(([, count]) => count > 0)
              .map(([key, count]) => (
                <span key={key}>
                  {MOMENT_LABELS[key as keyof typeof MOMENT_LABELS] ?? key} {count}
                  <br />
                </span>
              ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          className="btn"
          style={{ fontSize: 13, padding: '10px 12px', flex: '1 1 40%' }}
          data-testid="playtest-export-csv"
          disabled={empty}
          onClick={exportCsv}
        >
          CSV EXPORT
        </button>
        {!confirmingDelete ? (
          <button
            className="btn"
            style={{ fontSize: 13, padding: '10px 12px', flex: '1 1 40%' }}
            data-testid="playtest-delete-button"
            disabled={empty}
            onClick={() => setConfirmingDelete(true)}
          >
            DELETE ALL
          </button>
        ) : (
          <div className="location-card" style={{ flex: '1 1 100%' }}>
            <div className="location-desc" style={{ marginBottom: 10 }}>
              保存されているプレイテスト回答をすべて削除します。元に戻せません。
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn"
                style={{ fontSize: 13, flex: 1 }}
                data-testid="playtest-confirm-delete"
                onClick={deleteAll}
              >
                削除
              </button>
              <button
                className="btn"
                style={{ fontSize: 13, flex: 1 }}
                data-testid="playtest-cancel-delete"
                onClick={() => setConfirmingDelete(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
      {status && (
        <div className="location-desc" data-testid="playtest-status">
          {status}
        </div>
      )}

      {feedback.map((item) => (
        <div className="location-card" key={item.id} data-testid={`playtest-entry-${item.id}`}>
          <div className="location-desc">
            {item.createdAt}
            <br />
            session: {item.playSessionId}
            <br />
            route: {item.route} / {item.worldYear}年目 {item.worldDay}日目 / chapters:{' '}
            {item.knownChapterCount} / core: {String(item.completedCoreExperience)}
            <br />
            Q1 continue: {item.continueInterest} / Q2 gald: {item.galdFutureInterest} / Q3:{' '}
            {item.reunionRecognition}
            <br />
            Q4 impact: {item.worldImpactFeeling} / Q5 archive: {item.archiveInterest} / Q6:{' '}
            {item.memorableMoment}
          </div>
          {item.freeComment && (
            // Plain text, newlines preserved, never HTML — tester input is
            // untrusted content.
            <div
              className="location-desc"
              data-testid="playtest-comment"
              style={{
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                marginTop: 8,
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {item.freeComment}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
