import { useEffect, useRef, useState } from 'react';
import { openAppWorld, APP_DB_NAME, type OpenedWorld } from '../platform/save';
import type { ForgePlan } from '@mugen/core/forge/plan';
import type { ForgeDecision, ForgeImportResult, ForgeIssue, ForgeKind } from '@mugen/core/forge/types';
import { FORGE_KIND_LABEL, forgeDisplayName, forgeHumanCurrentFacts, forgeKindOf } from '@mugen/core/forge/record';
import { resultOfPlan } from '@mugen/core/forge/commit';
import './forgeImport.css';

/**
 * CHARACTER FORGE → MUGEN ZERO: キャラクター取込（デバッグビルド限定）.
 *
 * The author's screen for taking one FORGE deploy file into this
 * device's save, in the three steps the bridge contract asks for:
 * データを選ぶ → 内容を確認 → 登録. Nothing is written until the last
 * button; everything before it is `World.planForgeImport`, which only
 * reads. The rules themselves (what is new, what is a conflict, what an
 * update may touch) live in the shared core (core/forge) and are tested
 * there — this file only shows them.
 *
 * Reached from the title's DEBUG button, or `?tool=forge-import`. A
 * release build contains none of it (vite.config.ts, check:release).
 */
export function ForgeImport() {
  const [opened, setOpened] = useState<OpenedWorld | null>(null);
  const [, setVersion] = useState(0);
  const [source, setSource] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const [plan, setPlan] = useState<ForgePlan | null>(null);
  const [done, setDone] = useState<ForgeImportResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    let stop = () => {};
    void openAppWorld().then((o) => {
      if (!alive) return;
      setOpened(o);
      stop = o.world.subscribe(() => setVersion((v) => v + 1));
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const world = opened?.world ?? null;

  const read = (text: string, from: string) => {
    if (!world) return;
    setSource(from);
    setDone(null);
    setFailure(null);
    setPlan(world.planForgeImport(text));
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    read(await file.text(), `ファイル: ${file.name}`);
    if (fileInput.current) fileInput.current.value = '';
  };

  const register = async () => {
    if (!world || !plan) return;
    setBusy(true);
    setFailure(null);
    try {
      setDone(await world.commitForgeImport(plan));
      // What is on screen now is what the save holds now.
      setPlan(world.planForgeImport(plan.payload));
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setPlan(null);
    setSource(null);
    setDone(null);
    setFailure(null);
    setPasted('');
  };

  if (!world) {
    return (
      <div className="fi-root" data-testid="forge-import">
        <p className="fi-note">セーブを開いています…</p>
      </div>
    );
  }

  return (
    <div className="fi-root" data-testid="forge-import">
      <header className="fi-header">
        <h1>キャラクター取込（CHARACTER FORGE → MUGEN ZERO）</h1>
        <button className="fi-link" onClick={() => window.location.assign(window.location.pathname)}>
          タイトルへ戻る
        </button>
      </header>
      <p className="fi-note">
        この端末のセーブ（{APP_DB_NAME}）へ登録します。確認画面までは何も書き込みません。
        {!opened!.saving && <strong className="fi-bad"> この環境では保存できません（閉じると消えます）。</strong>}
      </p>

      {/* ---- STEP 1 ---- */}
      <section className="fi-step" data-testid="forge-step-1">
        <h2>
          <span className="fi-num">1</span>データを選ぶ
        </h2>
        <div className="fi-row">
          <button className="fi-btn" data-testid="forge-file-button" onClick={() => fileInput.current?.click()}>
            JSONファイルを選ぶ
          </button>
          <button className="fi-btn" data-testid="forge-paste-toggle" onClick={() => setPasteOpen((o) => !o)}>
            JSONを貼り付ける
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            data-testid="forge-file-input"
            hidden
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
        {pasteOpen && (
          <div className="fi-paste">
            <textarea
              data-testid="forge-paste-text"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="FORGE の DEPLOY JSON をここに貼り付け"
              rows={6}
            />
            <button className="fi-btn" data-testid="forge-paste-load" onClick={() => read(pasted, '貼り付け')}>
              貼り付けた内容を読む
            </button>
          </div>
        )}
        {plan && <Summary plan={plan} source={source} />}
      </section>

      {/* ---- STEP 2 ---- */}
      {plan && (
        <section className="fi-step" data-testid="forge-step-2">
          <h2>
            <span className="fi-num">2</span>内容を確認
          </h2>
          <Review plan={plan} />
        </section>
      )}

      {/* ---- STEP 3 ---- */}
      {plan && (
        <section className="fi-step" data-testid="forge-step-3">
          <h2>
            <span className="fi-num">3</span>登録
          </h2>
          {done ? (
            <Done result={done} />
          ) : (
            <>
              {!plan.canRegister && (
                <p className="fi-reason" data-testid="forge-blocked-reason">
                  {blockedReason(plan)}
                </p>
              )}
              {!plan.canRegister && <UnregisteredResult plan={plan} />}
              <div className="fi-row">
                {plan.decision === 'UPDATE' ? (
                  <button className="fi-btn fi-primary" data-testid="forge-update" disabled={busy} onClick={() => void register()}>
                    差分を反映
                  </button>
                ) : (
                  <button
                    className="fi-btn fi-primary"
                    data-testid="forge-register"
                    disabled={busy || !plan.canRegister}
                    onClick={() => void register()}
                  >
                    このキャラクターを登録
                  </button>
                )}
                <button className="fi-btn" data-testid="forge-cancel" disabled={busy} onClick={cancel}>
                  取り込まない
                </button>
              </div>
            </>
          )}
          {failure && (
            <p className="fi-bad" data-testid="forge-failure">
              登録できませんでした: {failure}
            </p>
          )}
          {done && (
            <button className="fi-btn" data-testid="forge-next" onClick={cancel}>
              続けて別のファイルを取り込む
            </button>
          )}
        </section>
      )}

      <Registered world={world} />
    </div>
  );
}

// ---- Step 1: what the file is -------------------------------------------

const KIND_TEXT: Record<ForgeKind, string> = {
  HUMAN: '人間（HUMAN）',
  MONSTER: '通常モンスター（MONSTER / NORMAL）',
  BOSS: 'BOSS（MONSTER / encounterRole: BOSS）',
};

function Summary({ plan, source }: { plan: ForgePlan; source: string | null }) {
  const s = plan.summary;
  return (
    <dl className="fi-summary" data-testid="forge-summary">
      <dt>読み込み元</dt>
      <dd>{source}</dd>
      <dt>Character ID</dt>
      <dd data-testid="forge-summary-id">{s?.characterId ?? '（読めません）'}</dd>
      <dt>種類</dt>
      <dd data-testid="forge-kind" data-kind={plan.kind ?? ''}>
        {plan.kind ? KIND_TEXT[plan.kind] : '（読めません）'}
      </dd>
      {plan.kind === 'HUMAN' || !s?.speciesName ? (
        <>
          <dt>名前</dt>
          <dd>{s?.name ?? '（なし）'}</dd>
        </>
      ) : (
        <>
          <dt>種族名</dt>
          <dd>{s.speciesName}</dd>
          <dt>個体名</dt>
          <dd>{s.individualName ?? '（未設定 — 種族名で表示します）'}</dd>
        </>
      )}
      <dt>送出版</dt>
      <dd>{s?.deployedVersion ?? '（なし）'}</dd>
      <dt>送出日時</dt>
      <dd>{s?.deployedAt ? formatTime(s.deployedAt) : '（なし）'}</dd>
    </dl>
  );
}

// ---- Step 2: what registering would do ----------------------------------

const DECISION_TEXT: Record<ForgeDecision, string> = {
  NEW: '新規登録',
  UPDATE: '更新候補',
  UNCHANGED: '変更なし',
  BLOCKED_ID_TYPE_CONFLICT: '競合 — 取込不可',
  BLOCKED_DEPLOYMENT_CONFLICT: '競合 — 取込不可',
  BLOCKED_SAMPLE_DATA: '取込不可（サンプルデータ）',
  BLOCKED_VALIDATION: '取込不可（形式エラー）',
  BLOCKED_RESERVED_ID: '取込不可（予約済みID）',
  BLOCKED_SAVE_DAMAGED: '取込不可（保存データを読めません）',
};

const FIELD_LABEL: Record<string, string> = {
  schemaVersion: '契約版',
  source: '送信元',
  status: '正本状態',
  characterId: 'Character ID',
  characterType: '種類',
  encounterRole: '遭遇の役割',
  identity: '名前・命名',
  profile: '基本設定',
  lifeAxis: '人生軸',
  worldViewAxis: '世界観軸',
  relationshipPotential: '関係の傾向',
  aptitudes: '潜在適性',
  aptitudeSemantics: '適性の意味',
  currentSkills: '現在技能',
  equipment: '装備と根拠',
  lifeStage: '年齢文脈',
  visualDiversity: '見た目の多様性',
  visualDirection: '見た目の方針',
  visualReviewStatus: '見た目レビュー',
  visualReviewChecklist: 'レビュー項目',
  worldAssignment: '希望配置',
  productionChecklist: '制作チェック',
  relationshipRefs: '関係ID',
  characterHistory: 'FORGE内の履歴',
  ecology: '生態',
  combat: '戦闘の傾向',
  bossEncounter: 'BOSS遭遇設計',
  seeds: '種',
  dramaHooks: 'ドラマの種',
  worldMemory: 'FORGE側のWORLD MEMORY',
  worldLifeEngine: 'WORLD LIFE ENGINE',
  assets: '画像メタ情報',
};

function fieldLabel(path: string): string {
  const [head, ...rest] = path.split('.');
  const label = FIELD_LABEL[head];
  if (!label) return path;
  return rest.length ? `${label} › ${rest.join('.')}` : `${label}（${head}）`;
}

function Review({ plan }: { plan: ForgePlan }) {
  const blocked = plan.decision.startsWith('BLOCKED');
  const conflict = plan.decision === 'BLOCKED_ID_TYPE_CONFLICT' || plan.decision === 'BLOCKED_DEPLOYMENT_CONFLICT';
  const tone = blocked ? 'fi-bad' : plan.decision === 'UNCHANGED' ? 'fi-quiet' : 'fi-good';
  const changed = plan.diff?.entries.filter((e) => e.change === 'CHANGED' || e.change === 'REMOVED') ?? [];
  return (
    <>
      <div className="fi-decision-row">
        <span className={`fi-decision ${tone}`} data-testid="forge-decision" data-decision={plan.decision}>
          {DECISION_TEXT[plan.decision]}
        </span>
        {plan.kind && (
          <span className="fi-kind" data-testid="forge-review-kind">
            {FORGE_KIND_LABEL[plan.kind]}
          </span>
        )}
        {conflict && <span className="fi-bad">競合</span>}
      </div>

      <h3>検証結果</h3>
      {plan.errors.length === 0 ? (
        <p className="fi-good" data-testid="forge-valid">形式・内容の検証に通りました。</p>
      ) : (
        <IssueList issues={plan.errors} testId="forge-errors" tone="fi-bad" />
      )}

      {plan.payload && <Particulars plan={plan} />}

      {plan.diff && plan.decision === 'NEW' && (
        <>
          <h3>追加される項目（FORGE基礎設定）</h3>
          <ul className="fi-list fi-compact" data-testid="forge-diff-added">
            {plan.diff.added.map((path) => (
              <li key={path}>
                {fieldLabel(path)}
                {(plan.payload as Record<string, unknown> | null)?.[path] === null && <span className="fi-quiet"> — なし（null のまま保持）</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {plan.diff && plan.decision !== 'NEW' && (
        <>
          <h3>変更される項目</h3>
          {changed.length === 0 && plan.diff.added.length === 0 ? (
            <p className="fi-quiet" data-testid="forge-diff-changed">変更される項目はありません。</p>
          ) : (
            <ul className="fi-list" data-testid="forge-diff-changed">
              {plan.diff.added.map((path) => (
                <li key={path}>
                  <b>追加</b> {fieldLabel(path)}
                </li>
              ))}
              {changed.map((entry) => (
                <li key={entry.path}>
                  <b>{entry.change === 'REMOVED' ? '削除' : '変更'}</b> {fieldLabel(entry.path)}
                  <div className="fi-change">
                    <span className="fi-before">{short(entry.before)}</span> → <span className="fi-after">{short(entry.after)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <details className="fi-details" data-testid="forge-diff-preserved">
            <summary>維持される項目（{plan.diff.preserved.length}件）</summary>
            <ul className="fi-list fi-compact">
              {plan.diff.preserved.map((path) => (
                <li key={path}>{fieldLabel(path)}</li>
              ))}
            </ul>
          </details>
        </>
      )}

      <h3>警告</h3>
      {plan.warnings.length === 0 ? (
        <p className="fi-quiet" data-testid="forge-warnings">警告はありません。</p>
      ) : (
        <IssueList issues={plan.warnings} testId="forge-warnings" tone="fi-warn" />
      )}

      <h3>変更対象外（登録しても触れないもの）</h3>
      <ul className="fi-list fi-compact" data-testid="forge-game-owned">
        {plan.gameOwned.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </>
  );
}

const SKILL_TEXT: Record<string, string> = {
  UNLEARNED: '未習得',
  EXPOSURE: '触れた程度',
  BASIC: '基礎',
  PRACTICAL: '実用',
  SKILLED: '熟練',
  MASTER: '達人',
};
const SKILL_NAME: Record<string, string> = { magic: '魔法', sword: '剣', healing: '治癒', commerce: '商い', social: '社交' };

/** The few things per kind the author will want to see before saying yes. */
function Particulars({ plan }: { plan: ForgePlan }) {
  const p = plan.payload!;
  if (p.characterType === 'human') {
    const facts = forgeHumanCurrentFacts(p)!;
    return (
      <div data-testid="forge-particulars" data-kind="HUMAN">
        <h3>人間 — 現在の事実として登録されるもの</h3>
        <p className="fi-note">潜在適性（aptitudes）は技能・職業・装備に変換しません。現在技能は currentSkills だけです。</p>
        <table className="fi-table" data-testid="forge-skills">
          <tbody>
            {Object.entries(facts.skills).map(([key, level]) => (
              <tr key={key}>
                <th>{SKILL_NAME[key] ?? key}</th>
                <td>{SKILL_TEXT[level] ?? level}</td>
                <td className="fi-quiet">潜在 {typeof p.aptitudes[key] === 'number' ? p.aptitudes[key].toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p data-testid="forge-occupation">
          現在の職業: {facts.occupation ?? '（なし）'}
          {facts.aspiration && <span className="fi-warn">　将来の希望: {facts.aspiration}（現職にはしません）</span>}
        </p>
      </div>
    );
  }
  const boss = p.bossEncounter as Record<string, unknown> | null;
  return (
    <div data-testid="forge-particulars" data-kind={forgeKindOf(p)}>
      <h3>{p.encounterRole === 'BOSS' ? 'BOSS' : '通常モンスター'} — 登録される名前</h3>
      <p>
        種族名: {p.identity.speciesName}　個体名: {p.identity.individualName ?? '（未設定のまま保持）'}　表示名: {forgeDisplayName(p)}
      </p>
      {boss ? (
        <p data-testid="forge-boss">
          BOSS遭遇設計を保持します（{Object.keys(boss).length}項目）: {String(boss.rank)} ／ {String(boss.coreMechanic)}
          <br />
          <span className="fi-note">遭遇設計は戦闘の数値には変換しません。身体構造も補完しません。</span>
        </p>
      ) : (
        <p className="fi-quiet" data-testid="forge-boss">BOSS遭遇設計: なし（通常モンスター）</p>
      )}
    </div>
  );
}

function IssueList({ issues, testId, tone }: { issues: ForgeIssue[]; testId: string; tone: string }) {
  return (
    <ul className={`fi-list ${tone}`} data-testid={testId}>
      {issues.map((item, i) => (
        <li key={i} data-code={item.code}>
          {item.message}
        </li>
      ))}
    </ul>
  );
}

function blockedReason(plan: ForgePlan): string {
  if (plan.decision === 'UNCHANGED') return '同じ送出データはすでに登録済みです。二重登録はしません。';
  const first = plan.errors[0]?.message;
  return first ? `登録できません: ${first}` : '登録できません。';
}

// ---- Step 3: what happened ----------------------------------------------

function Done({ result }: { result: ForgeImportResult }) {
  return (
    <div data-testid="forge-done" data-result={result.result}>
      <p className="fi-done">MUGEN ZEROへ受け入れました。</p>
      <dl className="fi-summary">
        <dt>結果</dt>
        <dd>{result.result === 'NEW' ? '新規登録' : '更新'}</dd>
        <dt>取込ID</dt>
        <dd>{result.importId}</dd>
        <dt>ロールバック</dt>
        <dd>{result.rollback.available ? `可能（${result.rollback.snapshotRef}）` : '新規のため戻す前の状態はありません'}</dd>
      </dl>
      <details className="fi-details">
        <summary>取込結果（import result 1.0）</summary>
        <pre className="fi-pre">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  );
}

/** Every file gets a result (import result 1.0), even one that registers nothing. Not saved. */
function UnregisteredResult({ plan }: { plan: ForgePlan }) {
  const result = resultOfPlan(plan, new Date().toISOString());
  if (!result) return null;
  return (
    <details className="fi-details" data-testid="forge-unregistered-result">
      <summary>取込結果（import result 1.0・保存しません）</summary>
      <pre className="fi-pre">{JSON.stringify(result, null, 2)}</pre>
    </details>
  );
}

// ---- Who has been taken in ------------------------------------------------

function Registered({ world }: { world: OpenedWorld['world'] }) {
  const records = world.getForgeCharacters();
  const damaged = world.getDamagedForgeIds();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const rollback = async (id: string) => {
    try {
      await world.rollbackForgeImport(id);
      setMessage(`${id} を直前の状態に戻しました。本編での状態と WORLD MEMORY はそのままです。`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setConfirming(null);
    }
  };

  return (
    <section className="fi-step" data-testid="forge-records">
      <h2>登録済みのキャラクター（{records.length}）</h2>
      {message && <p className="fi-note" data-testid="forge-records-message">{message}</p>}
      {damaged.length > 0 && <p className="fi-bad">読めない保存データ: {damaged.join('、')}（書き換えずに残しています）</p>}
      {records.length === 0 && <p className="fi-quiet">まだありません。</p>}
      {records.map((record) => {
        const history = world.getForgeImportHistory(record.characterId);
        const kind = forgeKindOf(record);
        return (
          <div className="fi-record" key={record.characterId} data-testid={`forge-record-${record.characterId}`} data-kind={kind}>
            <div className="fi-record-head">
              <b>{record.characterId}</b>
              <span className="fi-kind">{FORGE_KIND_LABEL[kind]}</span>
              <span>{forgeDisplayName(record.forgeBaseline)}</span>
              <span className="fi-quiet">
                送出版 {record.importMetadata.deployedVersion}・{formatTime(record.importMetadata.lastImportedAt)} 取込
              </span>
            </div>
            <ol className="fi-history">
              {history.map((entry) => (
                <li key={entry.importId}>
                  {HISTORY_TEXT[entry.result]}　{entry.deployedVersion}　{formatTime(entry.importedAt)}
                  {entry.warnings.length > 0 && <span className="fi-warn">　警告 {entry.warnings.length}</span>}
                </li>
              ))}
            </ol>
            {world.canRollBackForge(record.characterId) &&
              (confirming === record.characterId ? (
                <div className="fi-row">
                  <span>直前の送出に戻しますか？（FORGE基礎設定だけが戻ります）</span>
                  <button className="fi-btn fi-primary" data-testid="forge-rollback-confirm" onClick={() => void rollback(record.characterId)}>
                    戻す
                  </button>
                  <button className="fi-btn" onClick={() => setConfirming(null)}>
                    やめる
                  </button>
                </div>
              ) : (
                <button className="fi-btn" data-testid={`forge-rollback-${record.characterId}`} onClick={() => setConfirming(record.characterId)}>
                  直前の状態に戻す
                </button>
              ))}
          </div>
        );
      })}
    </section>
  );
}

const HISTORY_TEXT = { NEW: '新規登録', UPDATED: '更新', ROLLED_BACK: '直前へ戻した' } as const;

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function short(value: unknown): string {
  const text = value === undefined ? '（なし）' : typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}
