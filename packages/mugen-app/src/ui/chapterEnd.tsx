import { useEffect, useRef, useState } from 'react';
import { CHAPTER1_END } from '@mugen/content/story/chapter1Finale';
import {
  CHAPTER_SUMMARY_KICKER,
  CHAPTER_SUMMARY_TITLE,
  type ChapterSummaryRow,
} from '@mugen/content/story/chapterSummary';
import type { LifeChoiceId } from '@mugen/core/flow/types';
import type { EventCgKey } from '@mugen/assets/keys';
import { eventCg } from '../assets/eventCg';
import { NavyButton, NavyPlate } from './kit/NavyPlate';
import { canShareFile, makeShareImage, SHARE_FILE_NAME } from './chapterShare';
import { inNativeShell, saveNative, shareNative } from '../platform/keepPicture';
import './chapterEnd.css';

/**
 * THE END OF THE FIRST CHAPTER (段階5, 作者 2026-11-07: 試遊は第1章の終わりまで通す).
 *
 *   END      CHAPTER 1 END, its four lines one after another (the end screen the finale names — `END_SCREEN`)
 *   SUMMARY  「あなたの第1章」: seven rows on the navy plate (E9); 「画像で残す」 (C1) and 「タイトルへ」
 *
 * Continuing a world whose chapter is over comes straight to the summary.
 */

/** The picture of his years each answer led to (as TIME SHIFT showed it). */
export const SHARE_PICTURE: Readonly<Record<LifeChoiceId, EventCgKey>> = {
  SPARE: 'GALD_HEALER',
  HELP: 'GALD_BAKER',
  CAPTURE: 'GALD_WORKER',
  KILL: 'GALD_GRAVE',
};

export function ChapterEnd({
  from,
  rows,
  heroName,
  galdChoice,
  onTitle,
}: {
  from: 'END' | 'SUMMARY';
  rows: readonly ChapterSummaryRow[];
  heroName: string;
  galdChoice: LifeChoiceId | null;
  onTitle: () => void;
}) {
  const [step, setStep] = useState(from);
  if (step === 'END') return <EndCard onDone={() => setStep('SUMMARY')} />;
  return <ChapterSummary rows={rows} heroName={heroName} galdChoice={galdChoice} onTitle={onTitle} />;
}

function EndCard({ onDone }: { onDone: () => void }) {
  return (
    <div className="screen chapter-end" data-testid="chapter-end" onClick={onDone}>
      <p className="chapter-end-title">{CHAPTER1_END.title}</p>
      <div className="chapter-end-lines">
        {CHAPTER1_END.lines.map((l, i) => (
          <p key={l} className="chapter-end-line" style={{ animationDelay: `${0.9 + i * 1.1}s` }} data-testid="chapter-end-line">
            {l}
          </p>
        ))}
      </div>
      <button
        type="button"
        className="btn primary chapter-end-next"
        data-testid="chapter-end-next"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        つづける
      </button>
    </div>
  );
}

type Picture = { url: string; file: File; shareable: boolean; native: boolean };
type Kept = Picture | 'MAKING' | 'FAILED' | null;

function ChapterSummary({
  rows,
  heroName,
  galdChoice,
  onTitle,
}: {
  rows: readonly ChapterSummaryRow[];
  heroName: string;
  galdChoice: LifeChoiceId | null;
  onTitle: () => void;
}) {
  const [kept, setKept] = useState<Kept>(null);
  const url = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );

  const keep = async () => {
    if (kept && kept !== 'FAILED') return;
    setKept('MAKING');
    const pictureSrc = galdChoice ? await eventCg(SHARE_PICTURE[galdChoice]) : null;
    const blob = await makeShareImage({ rows, heroName, pictureSrc });
    if (!blob) return setKept('FAILED');
    const file = new File([blob], SHARE_FILE_NAME, { type: 'image/png' });
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = URL.createObjectURL(blob);
    const native = inNativeShell();
    setKept({ url: url.current, file, shareable: native || canShareFile(file), native });
  };

  return (
    <div className="screen chapter-summary" data-testid="chapter-summary">
      <NavyPlate className="chapter-summary-plate" testId="chapter-summary-plate">
        <p className="chapter-summary-kicker">{CHAPTER_SUMMARY_KICKER}</p>
        <h1 className="navy-plate-title chapter-summary-title">{CHAPTER_SUMMARY_TITLE}</h1>
        <dl className="chapter-summary-rows">
          {rows.map((r) => (
            <div key={r.id} className="chapter-summary-row" data-testid="chapter-summary-row" data-row={r.id}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
        <div className="chapter-summary-actions">
          <NavyButton testId="chapter-summary-keep" label={kept === 'MAKING' ? '描いています…' : '画像で残す'} disabled={kept === 'MAKING'} onClick={() => void keep()} />
          <NavyButton testId="chapter-summary-title" label="タイトルへ" onClick={onTitle} />
        </div>
        {kept === 'FAILED' && <p className="chapter-summary-note">この端末では画像を描けませんでした。</p>}
      </NavyPlate>
      {kept && typeof kept === 'object' && <SharePreview kept={kept} onClose={() => setKept(null)} />}
    </div>
  );
}

function SharePreview({ kept, onClose }: { kept: Picture; onClose: () => void }) {
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // In the APK (作者 2026-11-07: 審査もテスター配布も APK): through Capacitor — the share sheet, and Documents.
  const shareInShell = async () => {
    setBusy(true);
    const r = await shareNative(kept.file, kept.file.name, CHAPTER_SUMMARY_TITLE);
    setBusy(false);
    if (!r.ok && !r.cancelled) setSaid('共有できませんでした。「保存する」を使ってください。');
  };
  const saveInShell = async () => {
    setBusy(true);
    const r = await saveNative(kept.file, kept.file.name);
    setBusy(false);
    setSaid(r.ok ? `端末の「${r.where}」に保存しました。` : '保存できませんでした。「共有する」から保存先を選んでください。');
  };
  const share = async () => {
    if (kept.native) return shareInShell();
    try {
      await navigator.share({ files: [kept.file], title: 'MUGEN ZERO', text: CHAPTER_SUMMARY_TITLE });
    } catch (e) {
      // Put away without sharing: nothing to say.
      if ((e as { name?: string })?.name !== 'AbortError') setSaid('共有できませんでした。「保存する」を使ってください。');
    }
  };
  return (
    <div className="chapter-share-veil" role="dialog" aria-modal="true" aria-label="画像で残す" data-testid="chapter-share">
      <NavyPlate className="chapter-share-card">
        <img className="chapter-share-image" src={kept.url} alt={CHAPTER_SUMMARY_TITLE} data-testid="chapter-share-image" />
        <div className="chapter-summary-actions">
          {kept.shareable && <NavyButton testId="chapter-share-send" label="共有する" disabled={busy} onClick={() => void share()} />}
          {kept.native ? (
            <NavyButton testId="chapter-share-save" label="保存する" disabled={busy} onClick={() => void saveInShell()} />
          ) : (
            <a className="navy-btn chapter-share-save" data-testid="chapter-share-save" href={kept.url} download={SHARE_FILE_NAME}>
              保存する
            </a>
          )}
          <NavyButton testId="chapter-share-close" label="とじる" onClick={onClose} />
        </div>
        {said && (
          <p className="chapter-summary-note" data-testid="chapter-share-said">
            {said}
          </p>
        )}
      </NavyPlate>
    </div>
  );
}
