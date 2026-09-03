import { useMemo, useState } from 'react';
import type { World } from '../core/world/world';
import { ALDEN_EXPERIENCE_EVENTS } from '../content/experience/aldenExperience';
import { direct } from '../core/experience/director';
import { buildQaReport, renderQaReportMarkdown } from '../core/qa/qaReport';
import type { QaStatus } from '../core/qa/types';
import { collectQaInput } from './qaSnapshot';

interface Props {
  world: World;
  onBack: () => void;
}

/**
 * DEV REVIEW HUB — the whole state of the build on one screen.
 *
 * This exists to buy back a human's afternoon. Before it, reviewing a
 * change meant walking the game, photographing ten screens and sending
 * them somewhere; the logic was being checked by looking at pictures of
 * it. Now the logic is checked by the checks, and a picture is only
 * needed for the things pictures are actually good at.
 *
 * DEV ONLY, and strictly read-only: nothing on this screen writes to
 * WORLD MEMORY. It observes the same code the game runs — it never has
 * its own opinion about what the game would do.
 */
export function DevReviewHub({ world, onBack }: Props) {
  // Rebuilt on demand rather than every render: it walks every event and
  // directs every location, and the hub should not cost more than the
  // game does.
  const [reportedAt, setReportedAt] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<string>('');
  const [observation, setObservation] = useState<Observation>(loadObservation);
  const [observationCopyState, setObservationCopyState] = useState<string>('');

  const input = useMemo(() => collectQaInput(world), [world]);
  const report = useMemo(() => buildQaReport(input), [input]);
  const markdown = useMemo(() => renderQaReportMarkdown(report), [report]);

  const decisions = useMemo(
    () =>
      input.registry.locations.map((location) => ({
        location,
        decision: direct(ALDEN_EXPERIENCE_EVENTS, input.experienceView, { location }),
      })),
    [input],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState('コピーしました。そのまま貼り付けてレビュー依頼できます。');
    } catch {
      // http, an old webview, a browser that refuses without a gesture it
      // recognises — the text is on screen either way, so say so instead
      // of pretending it worked.
      setCopyState('コピーできませんでした。下のテキストを長押しして選択してください。');
    }
  };

  const setObserved = (key: keyof Observation, value: string) => {
    const next = { ...observation, [key]: value };
    setObservation(next);
    saveObservation(next);
  };

  const observationNote = useMemo(
    () => renderObservationNote(observation, input.build.commit, decisions),
    [observation, input.build.commit, decisions],
  );

  const copyObservation = async () => {
    try {
      await navigator.clipboard.writeText(observationNote);
      setObservationCopyState('コピーしました。');
    } catch {
      setObservationCopyState('コピーできませんでした。下のテキストを長押しで選択してください。');
    }
  };

  const failed = report.checks.filter((c) => c.status === 'FAIL');
  const seeds = input.registry.seeds;
  const rumours = ALDEN_EXPERIENCE_EVENTS.filter((d) =>
    (d.requirements ?? []).some(
      (r) => r.kind === 'MEMORY_PRESENT' || r.kind === 'ANY_MEMORY_PRESENT',
    ),
  );

  return (
    <div className="screen" data-testid="dev-review-hub">
      <div className="screen-title">DEV REVIEW HUB</div>
      <div className="location-list" style={{ gap: 6 }}>
        {/* ---- REVIEW SNAPSHOT ---- */}
        <Section title="REVIEW SNAPSHOT" id="snapshot" open>
          <Row label="build" value={`${input.build.commit} / ${input.build.environment}`} />
          <Row
            label="world"
            value={`${input.world.worldYear}年目 ${input.world.worldDay}日目 / route ${input.world.route}`}
          />
          <Row
            label="content"
            value={`${ALDEN_EXPERIENCE_EVENTS.length} events / ${seeds.length} seeds / ${rumours.length} rumours`}
          />
          <Row
            label="checks"
            value={`${report.counts.PASS} pass, ${report.counts.FAIL} fail, ${report.counts.WARN} warn, ${report.counts.NOT_TESTED} not tested`}
          />
          <div
            className="location-desc"
            data-testid="hub-verdict"
            style={{ color: report.ok ? 'var(--accent)' : 'var(--mugen-danger)', fontWeight: 700 }}
          >
            {report.ok ? 'NO FAILED CHECKS' : `${failed.length} FAILED CHECK(S)`}
          </div>
          {failed.map((c) => (
            <div key={c.id} className="location-desc" data-testid={`hub-fail-${c.id}`}>
              {c.id} — {c.detail}
            </div>
          ))}
        </Section>

        {/* ---- QA REPORT ---- */}
        <Section title="QA REPORT" id="qa" open>
          <div className="location-desc" style={{ marginBottom: 8 }}>
            レビュー依頼はスクリーンショットではなく、このレポート1つで足ります。
            画面の写真が必要なものは、レポート末尾の VISUAL REVIEW REQUIRED
            に書かれています。
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              className="btn"
              style={btn}
              data-testid="qa-generate"
              onClick={() => {
                setReportedAt(new Date().toISOString());
                setCopyState('');
              }}
            >
              GENERATE QA REPORT
            </button>
            <button className="btn" style={btn} data-testid="qa-copy" onClick={copy}>
              COPY QA REPORT
            </button>
          </div>
          {copyState && (
            <div className="location-desc" data-testid="qa-copy-status">
              {copyState}
            </div>
          )}
          {reportedAt && (
            <>
              <div className="location-desc">generated: {reportedAt}</div>
              <textarea
                data-testid="qa-report-text"
                readOnly
                value={markdown}
                onFocus={(e) => e.currentTarget.select()}
                style={reportBox}
              />
            </>
          )}
        </Section>

        {/* ---- A. BUILD STATUS ---- */}
        <Section title="A. BUILD STATUS" id="build">
          <Row label="app" value={input.build.appVersion} />
          <Row label="commit" value={input.build.commit} />
          <Row label="built" value={input.build.builtAt} />
          <Row label="environment" value={input.build.environment} />
          <Row
            label="viewport"
            value={
              input.viewport
                ? `${input.viewport.width}x${input.viewport.height} (page ${input.viewport.documentScrollWidth}px)`
                : 'not measurable'
            }
          />
        </Section>

        {/* ---- B. WORLD MEMORY ---- */}
        <Section title="B. WORLD MEMORY" id="world">
          <Row label="route" value={input.world.route} />
          <Row
            label="clock"
            value={`${input.world.worldYear}年目 ${input.world.worldDay}日目 (day ${input.world.absoluteDay})`}
          />
          <Row label="TIME SHIFTs" value={String(input.world.timeShifts)} />
          <Row label="facts" value={String(input.world.events.length)} />
          <Row
            label="LIFE ARCHIVE"
            value={`${input.world.knownChapters} known / ${input.world.canonChapters} canon`}
          />
          {input.world.futureSites.map((site) => (
            <Row
              key={site.id}
              label={site.id}
              value={site.discovered ? 'FOUND' : site.onMap ? 'ON MAP (？？？)' : 'not yet'}
            />
          ))}
          <div className="location-desc" style={{ opacity: 0.7 }}>
            READ ONLY — 変更は DEV ADMIN のプリセット / RESET から。
          </div>
        </Section>

        {/* ---- C. EVENT ENGINE ---- */}
        <Section title="C. EVENT ENGINE" id="events">
          {(['NOW', 'NEXT', 'LIFE'] as const).map((layer) => {
            const defs = ALDEN_EXPERIENCE_EVENTS.filter((d) => d.layer === layer);
            return (
              <div key={layer} style={{ marginBottom: 8 }}>
                <div className="location-desc" style={{ color: 'var(--accent)' }}>
                  {layer} ({defs.length})
                </div>
                {defs.map((d) => (
                  <div key={d.eventId} className="location-desc" data-testid={`hub-event-${d.eventId}`}>
                    {world.hasSeenExperience(d.eventId) ? '✓' : '·'} {d.eventId}
                    <br />
                    {d.location} / p{d.priority} / {d.rarity ?? 'COMMON'} /{' '}
                    {d.once ? 'once' : `repeat ${d.cooldownDays ?? '-'}d`}
                    {d.core ? ' / CORE' : ''}
                    <br />
                    {d.dna?.emotionTarget ?? 'no dna'} / {d.dna?.visualTier ?? 'NORMAL'}
                    {d.dna?.characters?.length ? ` / ${d.dna.characters.join(', ')}` : ''}
                    {d.dna?.seed ? ` / seed ${d.dna.seed.role} ${d.dna.seed.id}` : ''}
                  </div>
                ))}
              </div>
            );
          })}
        </Section>

        {/* ---- D. NARRATIVE SEEDS ---- */}
        <Section title="D. NARRATIVE SEEDS" id="seeds">
          {seeds.map((seed) => (
            <div key={seed.def.seedId} className="location-desc" data-testid={`hub-seed-${seed.def.seedId}`}>
              [{seed.state}] {seed.def.seedId} — {seed.def.title}
              <br />
              playerKnown: {String(seed.playerKnown)} / source: {seed.def.sourceEventId}
              <br />
              where: {seed.def.relatedLocations.join(', ') || '—'} / who:{' '}
              {seed.def.relatedCharacters.join(', ') || '—'}
              <br />
              resolvedBy: {seed.def.resolvedByEventId ?? '(unanswered in this build)'}
            </div>
          ))}
        </Section>

        {/* ---- E. WORLD RUMORS ---- */}
        <Section title="E. WORLD RUMORS" id="rumors">
          {rumours.map((d) => {
            const memories = (d.requirements ?? []).flatMap((r) =>
              r.kind === 'MEMORY_PRESENT' ? [r.type] : r.kind === 'ANY_MEMORY_PRESENT' ? r.types : [],
            );
            return (
              <div key={d.eventId} className="location-desc" data-testid={`hub-rumor-${d.eventId}`}>
                {world.hasSeenExperience(d.eventId) ? 'heard' : 'unheard'} — {d.eventId}
                <br />
                at {d.location} / needs {memories.join(' | ')}
              </div>
            );
          })}
        </Section>

        {/* ---- F. EXPERIENCE SUMMARY ---- */}
        <Section title="F. EXPERIENCE SUMMARY" id="experience">
          <Row label="events met" value={String(input.experience.seenEventIds.length)} />
          <Row
            label="rumours heard"
            value={String(
              rumours.filter((d) => input.experience.seenEventIds.includes(d.eventId)).length,
            )}
          />
          <Row
            label="Grave met"
            value={String(
              ALDEN_EXPERIENCE_EVENTS.filter(
                (d) =>
                  d.dna?.characters?.includes('GRAVE') &&
                  input.experience.seenEventIds.includes(d.eventId),
              ).length,
            )}
          />
          <Row
            label="seeds discovered"
            value={`${seeds.filter((s) => s.playerKnown).length} / ${seeds.length}`}
          />
          <Row label="TIME SHIFTs" value={String(input.world.timeShifts)} />
          <Row label="recent (newest first)" value={input.experience.recentEventIds.slice(0, 6).join(' → ') || '—'} />
        </Section>

        {/* ---- EXPERIENCE DIRECTOR ---- */}
        <Section title="EXPERIENCE DIRECTOR" id="director" open>
          <div className="location-desc" style={{ opacity: 0.75, marginBottom: 6 }}>
            なぜこのイベントが出るのか。ルールと数値のみ。DEV ONLY。
          </div>
          {decisions.map(({ location, decision }) => (
            <div key={location} style={{ marginBottom: 10 }} data-testid={`hub-director-${location}`}>
              <div className="location-desc" style={{ color: 'var(--accent)' }}>
                {location} → {decision.selected?.eventId ?? 'QUIET (nothing eligible)'}
              </div>
              <div className="location-desc">
                layers: {decision.state.recentLayers.join(', ') || '—'} / emotions:{' '}
                {decision.state.recentEmotions.join(', ') || '—'}
                <br />
                faces: {decision.state.recentCharacters.join(', ') || '—'} / unresolved seeds:{' '}
                {decision.state.unresolvedSeeds}
                <br />
                since last discovery: {decision.state.eventsSinceLastSurprise} / LIFE available:{' '}
                {String(decision.state.lifeEventAvailable)}
              </div>
              {decision.scores.slice(0, 4).map((score) => (
                <div key={score.def.eventId} className="location-desc" style={{ paddingLeft: 8 }}>
                  {score.def.eventId}: {score.base} → {score.final}
                  {score.hits.length > 0 && (
                    <>
                      <br />
                      {score.hits
                        .map((h) => `${h.rule} ${h.delta >= 0 ? '+' : ''}${h.delta} (${h.reason})`)
                        .join('; ')}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </Section>

        {/* ---- PLAYTEST OBSERVATION ---- */}
        {/* The two questions a tester cannot answer, because answering
            them means watching the log above while they play. Notes are
            an observer's opinion: they are never world canon, never
            analytics, and nothing in the game ever reads them. */}
        <Section title="PLAYTEST OBSERVATION" id="observation">
          <div className="location-desc" style={{ opacity: 0.75, marginBottom: 8 }}>
            第三者プレイ中に気づいたことを、観察者が書き留めるための欄。
            プレイヤー本人の回答は、ゲーム内の PLAYTEST アンケートで集めます。
            ここに書いた内容は世界の記憶にもアナリティクスにも入りません。
          </div>
          <ObservationField
            label="テスター / セッション"
            testId="obs-session"
            rows={1}
            value={observation.session}
            onChange={(v) => setObserved('session', v)}
          />
          <ObservationField
            label="6. CHARACTER_REPEAT が邪魔したと感じた箇所"
            hint="本来先に出るべき人物の話が後回しになった、と見えた場面。"
            testId="obs-character-repeat"
            value={observation.characterRepeat}
            onChange={(v) => setObserved('characterRepeat', v)}
          />
          <ObservationField
            label="7. Director の選択が不自然だった箇所"
            hint="上の DECISION LOG と突き合わせて、選ばれた理由が納得できなかった場面。"
            testId="obs-director"
            value={observation.director}
            onChange={(v) => setObserved('director', v)}
          />
          <ObservationField
            label="その他の観察"
            testId="obs-other"
            value={observation.other}
            onChange={(v) => setObserved('other', v)}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <button className="btn" style={btn} data-testid="obs-copy" onClick={copyObservation}>
              COPY OBSERVATION NOTE
            </button>
            <button
              className="btn"
              style={btn}
              data-testid="obs-clear"
              onClick={() => {
                setObservation(EMPTY_OBSERVATION);
                saveObservation(EMPTY_OBSERVATION);
                setObservationCopyState('');
              }}
            >
              CLEAR
            </button>
          </div>
          {observationCopyState && (
            <div className="location-desc" data-testid="obs-copy-status">
              {observationCopyState}
            </div>
          )}
          <textarea
            data-testid="obs-note-text"
            readOnly
            value={observationNote}
            onFocus={(e) => e.currentTarget.select()}
            style={{ ...reportBox, minHeight: 160 }}
          />
        </Section>

        {/* ---- ALL CHECKS ---- */}
        <Section title="AUTOMATED CHECKS" id="checks">
          {report.checks.map((c) => (
            <div key={c.id} className="location-desc" data-testid={`hub-check-${c.id}`}>
              <span style={{ color: STATUS_COLOR[c.status] }}>[{c.status}]</span> {c.id}
              <br />
              {c.detail}
              <br />
              <span style={{ opacity: 0.7 }}>how: {c.how}</span>
            </div>
          ))}
        </Section>
      </div>
      <div className="screen-footer">
        <button className="btn" data-testid="hub-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = { fontSize: 13, padding: '12px 12px', flex: '1 1 40%' };

/** Long text on a phone: wraps, never pushes the page sideways. */
const reportBox: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 260,
  marginTop: 8,
  padding: 10,
  borderRadius: 8,
  border: '1px solid var(--mugen-border)',
  background: 'var(--mugen-surface-alt)',
  color: 'inherit',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

interface Observation {
  session: string;
  characterRepeat: string;
  director: string;
  other: string;
}

const EMPTY_OBSERVATION: Observation = {
  session: '',
  characterRepeat: '',
  director: '',
  other: '',
};

/**
 * The observer's draft, kept in localStorage.
 *
 * Deliberately NOT in IndexedDB: this is scratch paper for whoever is
 * watching a playtest, not feedback and certainly not world canon, and
 * it must not need a schema, a migration or a place in any export. It
 * survives a reload so a session's notes are not lost by a stray tap,
 * and that is all it is for.
 */
const OBSERVATION_KEY = 'mugen-playtest-observation';

function loadObservation(): Observation {
  try {
    const raw = localStorage.getItem(OBSERVATION_KEY);
    if (!raw) return EMPTY_OBSERVATION;
    return { ...EMPTY_OBSERVATION, ...(JSON.parse(raw) as Partial<Observation>) };
  } catch {
    return EMPTY_OBSERVATION;
  }
}

function saveObservation(observation: Observation): void {
  try {
    localStorage.setItem(OBSERVATION_KEY, JSON.stringify(observation));
  } catch {
    // Private mode, storage full, storage disabled: the notes still work
    // for this visit, and losing scratch paper is not worth an error.
  }
}

/** The note as text, with the evidence the observer was looking at. */
function renderObservationNote(
  observation: Observation,
  commit: string,
  decisions: { location: string; decision: { selected: { eventId: string } | null } }[],
): string {
  const lines = [
    '# MUGEN PLAYTEST OBSERVATION NOTE',
    '',
    `- Build: ${commit}`,
    `- Written: ${new Date().toISOString()}`,
    `- Session: ${observation.session || '(未記入)'}`,
    '',
    '## 6. CHARACTER_REPEAT が邪魔したと感じた箇所',
    observation.characterRepeat || '(なし / 未記入)',
    '',
    '## 7. Director の選択が不自然だった箇所',
    observation.director || '(なし / 未記入)',
    '',
    '## その他の観察',
    observation.other || '(なし / 未記入)',
    '',
    '## この時点で Director が選んでいたもの',
  ];
  for (const { location, decision } of decisions) {
    lines.push(`- ${location}: ${decision.selected?.eventId ?? 'QUIET'}`);
  }
  lines.push('');
  return lines.join('\n');
}

function ObservationField({
  label,
  hint,
  value,
  onChange,
  testId,
  rows = 3,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  testId: string;
  rows?: number;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="location-desc" style={{ marginBottom: 4 }}>
        {label}
      </div>
      {hint && (
        <div className="location-desc" style={{ opacity: 0.65, marginBottom: 4 }}>
          {hint}
        </div>
      )}
      <textarea
        data-testid={testId}
        aria-label={label}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: 8,
          borderRadius: 8,
          border: '1px solid var(--mugen-border)',
          background: 'var(--mugen-surface-alt)',
          color: 'inherit',
          fontSize: 13,
          lineHeight: 1.5,
          fontFamily: 'inherit',
          resize: 'vertical',
        }}
      />
    </div>
  );
}

const STATUS_COLOR: Record<QaStatus, string> = {
  PASS: 'var(--accent)',
  FAIL: 'var(--mugen-danger)',
  WARN: '#8a6a1f',
  NOT_TESTED: 'inherit',
  MANUAL: 'var(--mugen-memory)',
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="location-desc" data-testid={`hub-row-${label}`}>
      {label}: {value}
    </div>
  );
}

/**
 * Collapsible, because this screen is read on a phone. Everything is one
 * tap away and nothing needs a sideways scroll to reach.
 */
function Section({
  title,
  id,
  open,
  children,
}: {
  title: string;
  id: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={open} data-testid={`hub-section-${id}`} style={{ marginBottom: 4 }}>
      <summary
        style={{
          cursor: 'pointer',
          padding: '10px 2px',
          fontSize: 12,
          letterSpacing: '0.15em',
          color: 'var(--accent)',
        }}
      >
        {title}
      </summary>
      <div className="location-card" style={{ overflowWrap: 'anywhere' }}>
        {children}
      </div>
    </details>
  );
}
