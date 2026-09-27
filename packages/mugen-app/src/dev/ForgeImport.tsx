import { useCallback, useEffect, useRef, useState } from 'react';
import type { ForgePlan } from '@mugen/core/forge/plan';
import type { ForgeContent, ForgeDecision, ForgeImportResult, ForgeIssue, ForgeKind } from '@mugen/core/forge/types';
import { FORGE_KIND_LABEL, forgeDisplayName, forgeHumanCurrentFacts, forgeKindOf } from '@mugen/core/forge/record';
import {
  isForgeExport,
  planForgeAdoption,
  readForgeExport,
  resultOfPlan,
  type ForgeAdoptionPlan,
  type ForgeExport,
} from '@mugen/core/forge/content';
import { FORGE_PLACEABLE_REGIONS, forgeAdoptionView } from '@mugen/content/forge/adoptionView';
import { sourceOnlyFields, zeroCharacterDefinition } from '@mugen/content/forge/forgeVocabularyAdapter';
import './forgeImport.css';

/**
 * CHARACTER FORGE → MUGEN ZERO: キャラクター採用（デバッグビルド限定）.
 *
 * FORGE is the author's tool for making characters and adopting them as
 * official NPCs. An adopted character is CONTENT — files under
 * packages/mugen-core/content/forge/ that ship in the build, the same for
 * every player — never something kept in one device's save. So:
 *
 *   on the dev server (a PC with the repository), 登録 writes those files
 *   through the dev server (vite.config.ts `forgeAuthoring`), and they go
 *   through git like any other content;
 *
 *   in a debug APK there is no repository to write into: the screen
 *   checks a file against what is built in and shows the adopted roster,
 *   and writes nothing.
 *
 * The three steps are the bridge contract's: データを選ぶ → 内容を確認 →
 * 登録. The rules (new / update / unchanged / conflict, which NPC_ID) live
 * in the shared core (core/forge) and are tested there.
 *
 * Reached from the title's DEBUG button, or `?tool=forge-import`. A
 * release build contains none of it (vite.config.ts, check:release).
 */

/** Where the content comes from, and whether this screen may write it. */
type Source =
  | { mode: 'AUTHORING'; content: ForgeContent; problems: string[]; dir: string; sandbox: string | null }
  | { mode: 'READ_ONLY'; content: ForgeContent; problems: string[] };

const SANDBOX = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('sandbox') : null;
const withSandbox = (path: string) => (SANDBOX ? `${path}?sandbox=${encodeURIComponent(SANDBOX)}` : path);

async function loadSource(): Promise<Source> {
  if (import.meta.env.DEV) {
    const response = await fetch(withSandbox('/__mugen/forge/content'));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? '読み込めませんでした');
    return { mode: 'AUTHORING', content: data.content, problems: data.problems, dir: data.dir, sandbox: data.sandbox ? SANDBOX : null };
  }
  // A build: what is built in. Imported only here, so the dev screen never
  // reloads when a file it wrote changes the build's index.
  const built = await import('@mugen/content/forge/forgeContent');
  return { mode: 'READ_ONLY', content: built.FORGE_CONTENT, problems: [...built.FORGE_CONTENT_PROBLEMS] };
}

async function post(path: string, value: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`/__mugen/forge/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...value, sandbox: SANDBOX ?? undefined }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? '書き込めませんでした');
  return data;
}

export function ForgeImport() {
  const [source, setSource] = useState<Source | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState('');
  const [npcId, setNpcId] = useState('');
  const [region, setRegion] = useState('');
  const [lifeActor, setLifeActor] = useState<boolean | null>(null);
  /** A FORGE export file (several characters and voidIds), when that is what was read. */
  const [exported, setExported] = useState<{ file: ForgeExport; text: string; name: string } | null>(null);
  const [done, setDone] = useState<ForgeImportResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setSource(await loadSource());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);

  const exportVoidIds = exported?.file.voidIds ?? [];
  const plan: ForgeAdoptionPlan | null =
    source && text !== null
      ? planForgeAdoption(text, forgeAdoptionView(source.content, exportVoidIds), { npcId, region: region || null, lifeActor })
      : null;

  /** One character's file to check: from a file, a paste, or picked out of an export. */
  const check = (value: string, label: string) => {
    setFrom(label);
    setText(value);
    setDone(null);
    setFailure(null);
    setNpcId('');
    setRegion('');
    setLifeActor(null);
  };

  const read = (value: string, label: string) => {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(value);
    } catch {
      // Not JSON: the planner says so, in Japanese.
    }
    if (isForgeExport(parsed)) {
      setExported({ file: readForgeExport(parsed), text: value, name: label });
      setText(null);
      setFrom(label);
      setDone(null);
      setFailure(null);
      return;
    }
    setExported(null);
    check(value, label);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    read(await file.text(), `ファイル: ${file.name}`);
    if (fileInput.current) fileInput.current.value = '';
  };

  const register = async () => {
    if (!plan || text === null || source?.mode !== 'AUTHORING') return;
    setBusy(true);
    setFailure(null);
    try {
      const data = await post('adopt', {
        text,
        npcId: plan.npcId,
        region: plan.region,
        lifeActor: plan.lifeActor,
        voidIds: exportVoidIds,
        decision: plan.decision,
        payloadHash: plan.payloadHash,
      });
      setDone(data.result as ForgeImportResult);
      await reload();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setText(null);
    setFrom(null);
    setDone(null);
    setFailure(null);
    setPasted('');
    setNpcId('');
    setRegion('');
    setLifeActor(null);
    setExported(null);
  };

  if (!source) {
    return (
      <div className="fi-root" data-testid="forge-import">
        <p className="fi-note">{loadError ? `読み込めませんでした: ${loadError}` : '登録済みのキャラクターを読み込んでいます…'}</p>
      </div>
    );
  }
  const authoring = source.mode === 'AUTHORING';

  return (
    <div className="fi-root" data-testid="forge-import" data-mode={source.mode}>
      <header className="fi-header">
        <h1>キャラクター採用（CHARACTER FORGE → MUGEN ZERO）</h1>
        <button className="fi-link" onClick={() => window.location.assign(window.location.pathname)}>
          タイトルへ戻る
        </button>
      </header>
      {authoring ? (
        <p className="fi-note" data-testid="forge-target">
          登録先: {source.sandbox ? <strong className="fi-warn">サンドボックス（{source.sandbox}・一時フォルダ）</strong> : 'リポジトリの content/forge'}
          — 採用したキャラクターは全プレイヤー共通の正式NPC（ゲームのコンテンツ）になります。端末のSAVEには入りません。
          登録後は git に入れてビルドしてください。
        </p>
      ) : (
        <p className="fi-note fi-warn" data-testid="forge-target">
          この端末では確認だけできます（書き込みません）。採用の登録は、PCの開発サーバー（npm run dev:app）か、コマンド
          （npm run forge:import -w @mugen/core）で行い、git に入れてビルドします。
        </p>
      )}
      {source.problems.length > 0 && (
        <ul className="fi-list fi-bad" data-testid="forge-content-problems">
          {source.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

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
        {exported && (
          <ExportFile
            exported={exported}
            content={source.content}
            authoring={authoring}
            onPick={(character, id) => check(JSON.stringify(character), `${exported.name} › ${id}`)}
            onChanged={reload}
          />
        )}
        {plan && <Summary plan={plan} source={from} />}
      </section>

      {/* ---- STEP 2 ---- */}
      {plan && (
        <section className="fi-step" data-testid="forge-step-2">
          <h2>
            <span className="fi-num">2</span>内容を確認
          </h2>
          <Review plan={plan} />
          <Adoption
            plan={plan}
            npcId={npcId}
            setNpcId={setNpcId}
            region={region}
            setRegion={setRegion}
            lifeActor={lifeActor}
            setLifeActor={setLifeActor}
          />
          <Normalized plan={plan} />
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
              {(!plan.ready || !authoring) && (
                <p className="fi-reason" data-testid="forge-blocked-reason">
                  {blockedReason(plan, authoring)}
                </p>
              )}
              {!plan.canRegister && <UnregisteredResult plan={plan} />}
              <div className="fi-row">
                {plan.decision === 'UPDATE' ? (
                  <button
                    className="fi-btn fi-primary"
                    data-testid="forge-update"
                    disabled={busy || !plan.ready || !authoring}
                    onClick={() => void register()}
                  >
                    差分を反映
                  </button>
                ) : (
                  <button
                    className="fi-btn fi-primary"
                    data-testid="forge-register"
                    disabled={busy || !plan.ready || !authoring}
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

      <Registered source={source} onChanged={reload} />
    </div>
  );
}

/** Which NPC_ID the character becomes — asked for a new one, fixed for one already adopted. */
function Adoption({
  plan,
  npcId,
  setNpcId,
  region,
  setRegion,
  lifeActor,
  setLifeActor,
}: {
  plan: ForgeAdoptionPlan;
  npcId: string;
  setNpcId: (v: string) => void;
  region: string;
  setRegion: (v: string) => void;
  lifeActor: boolean | null;
  setLifeActor: (v: boolean | null) => void;
}) {
  if (!plan.payload) return null;
  const fixed = !!plan.existing;
  return (
    <div data-testid="forge-adoption">
      <h3>MUGEN ZERO 側の NPC_ID</h3>
      {fixed ? (
        <p data-testid="forge-npc-fixed">
          <b>{plan.npcId}</b>（採用済み・変更できません）　地域: {plan.region ?? '未配置'}　WORLD LIFE ENGINE:{' '}
          {plan.lifeActor ? '対象' : '対象外'}
        </p>
      ) : (
        <>
          <p className="fi-note">
            大文字・数字・_ の正式ID（例: SERA）。既存の人物（例: LINA）を指定すると、その人の正式定義として対応づけます（既存のIDと名前は変えません）。
          </p>
          <div className="fi-row">
            <input
              className="fi-input"
              data-testid="forge-npc-id"
              value={npcId}
              onChange={(e) => setNpcId(e.target.value)}
              placeholder="NPC_ID"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <select className="fi-input" data-testid="forge-region" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">地域: 未配置</option>
              {FORGE_PLACEABLE_REGIONS.map((r) => (
                <option key={r} value={r}>
                  地域: {r}
                </option>
              ))}
            </select>
          </div>
          <label className="fi-row fi-check">
            <input
              type="checkbox"
              data-testid="forge-life-actor"
              checked={lifeActor ?? plan.lifeActor ?? false}
              onChange={(e) => setLifeActor(e.target.checked)}
            />
            <span>
              WORLD LIFE ENGINE の対象にする（個体として人生・状態・因果を追う）
              <span className="fi-quiet">
                {' '}— 既定は{plan.payload.characterType === 'human' ? '人間なので「対象」' : 'モンスターなので「対象外」'}。
                採用（正式コンテンツ）と、人生を持つかどうかは別の判断です。
              </span>
            </span>
          </label>
        </>
      )}
      {plan.npcErrors.length > 0 && <IssueList issues={plan.npcErrors} testId="forge-npc-errors" tone="fi-bad" />}
      {plan.npcNotes.length > 0 && <IssueList issues={plan.npcNotes} testId="forge-npc-notes" tone="fi-warn" />}
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

function blockedReason(plan: ForgeAdoptionPlan, authoring: boolean): string {
  if (plan.decision === 'UNCHANGED') return '同じ送出データはすでに採用済みです。二重登録はしません。';
  const first = plan.errors[0]?.message ?? plan.npcErrors[0]?.message;
  if (first) return `登録できません: ${first}`;
  if (!authoring) return 'この端末では登録できません（確認のみ）。登録はPCの開発サーバーかコマンドで行います。';
  return '登録できません。';
}

// ---- Step 3: what happened ----------------------------------------------

function Done({ result }: { result: ForgeImportResult }) {
  return (
    <div data-testid="forge-done" data-result={result.result}>
      <p className="fi-done">MUGEN ZEROへ受け入れました。</p>
      <dl className="fi-summary">
        <dt>結果</dt>
        <dd>{result.result === 'NEW' ? '新規採用' : '更新'}</dd>
        <dt>NPC_ID</dt>
        <dd data-testid="forge-done-npc">{result.npcId}</dd>
        <dt>取込ID</dt>
        <dd>{result.importId}</dd>
        <dt>ロールバック</dt>
        <dd>{result.rollback.available ? `可能（${result.rollback.snapshotRef}）` : '新規のため戻す前の状態はありません'}</dd>
        <dt>次にすること</dt>
        <dd>content/forge の変更を git に入れてビルドすると、全プレイヤーのゲームに入ります。</dd>
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

/** What the vocabulary adapter makes of the file: the game's own definition, and what it could not map. */
function Normalized({ plan }: { plan: ForgeAdoptionPlan }) {
  if (!plan.payload) return null;
  const def = zeroCharacterDefinition(plan.payload, {
    characterId: plan.payload.characterId,
    npcId: plan.npcId ?? '（未定）',
    region: plan.region,
    lifeActor: plan.lifeActor ?? false,
    encounterRole: plan.payload.encounterRole,
  });
  const words = (list: string[]) => (list.length ? list.join('・') : '（なし）');
  return (
    <div data-testid="forge-normalized">
      <h3>MUGEN ZERO 正式定義（語彙アダプターの変換結果）</h3>
      <dl className="fi-summary">
        <dt>entityType</dt>
        <dd data-testid="forge-entity-type">{def.entityType}</dd>
        <dt>standing</dt>
        <dd>{def.standing ?? 'UNMAPPED'}</dd>
        {def.species && (
          <>
            <dt>species</dt>
            <dd>
              {def.species.name}
              {def.species.speciesId ? `（既存: ${def.species.speciesId}）` : '（本編に既存の種族なし）'}
            </dd>
          </>
        )}
        <dt>habitat</dt>
        <dd>{def.habitat ?? '—'}</dd>
        <dt>Life Engine</dt>
        <dd data-testid="forge-life-engine">
          {def.lifeActor
            ? `対象 — traits ${words(def.life.traits)} ／ values ${words(def.life.values)} ／ desires ${words(def.life.desires)} ／ aptitudes ${
                Object.entries(def.life.aptitudes)
                  .map(([k, v]) => `${k} ${v}`)
                  .join('・') || '（なし）'
              }`
            : '対象外（正式コンテンツとして採用はされます）'}
        </dd>
      </dl>
      {plan.unmapped.length > 0 ? (
        <IssueList issues={plan.unmapped} testId="forge-unmapped" tone="fi-warn" />
      ) : (
        <p className="fi-quiet" data-testid="forge-unmapped">UNMAPPED の値はありません。</p>
      )}
      <details className="fi-details" data-testid="forge-source-only">
        <summary>SOURCE DATA PRESERVED / GAME MAPPING = UNUSED（元の値のまま保存し、ゲームでは使わない項目）</summary>
        <ul className="fi-list fi-compact">
          {sourceOnlyFields(plan.payload).map((f) => (
            <li key={f.field}>{f.field}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

/** A FORGE export: its voidIds, and the characters in it to check one at a time. */
function ExportFile({
  exported,
  content,
  authoring,
  onPick,
  onChanged,
}: {
  exported: { file: ForgeExport; text: string; name: string };
  content: ForgeContent;
  authoring: boolean;
  onPick: (character: unknown, id: string) => void;
  onChanged: () => Promise<void>;
}) {
  const { file } = exported;
  const fresh = file.voidIds.filter((id) => !content.voidIds.includes(id));
  const [message, setMessage] = useState<string | null>(null);
  const takeVoids = async () => {
    try {
      const data = await post('void', { text: exported.text, fileName: exported.name });
      setMessage(`VOID 台帳へ追加しました: ${(data.added as string[]).join('、') || 'なし'}`);
      await onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="fi-export" data-testid="forge-export" data-format={file.format}>
      <h3>
        FORGE 書き出しファイル（{file.format === 'OFFICIAL' ? `正式形式 schemaVersion ${file.schemaVersion}` : '旧形式'}）
        {file.exportedAt && <span className="fi-quiet">　{formatTime(file.exportedAt)}</span>}
      </h3>
      <p data-testid="forge-export-voids">
        voidIds: {file.voidIds.length ? file.voidIds.map((id) => `${id}${content.voidIds.includes(id) ? '（台帳にあり）' : '（新規）'}`).join('、') : 'なし'}
      </p>
      {file.issues.length > 0 && <IssueList issues={file.issues} testId="forge-export-issues" tone="fi-warn" />}
      {authoring ? (
        <button className="fi-btn" data-testid="forge-void-import" disabled={fresh.length === 0} onClick={() => void takeVoids()}>
          VOID ID を台帳へ取り込む（{fresh.length}件）
        </button>
      ) : (
        fresh.length > 0 && <p className="fi-note">VOID 台帳への取り込みは PC の開発サーバーかコマンドで行います。</p>
      )}
      {message && (
        <p className="fi-note" data-testid="forge-void-message">
          {message}
        </p>
      )}
      <ul className="fi-list">
        {file.characters.map((c, i) => {
          const character = c as Record<string, unknown>;
          const id = typeof character?.characterId === 'string' ? character.characterId : `#${i + 1}`;
          const name = (character?.identity as Record<string, unknown> | undefined)?.name;
          return (
            <li key={`${id}-${i}`}>
              {id}　{String(character?.characterType ?? '')}　{typeof name === 'string' ? name : ''}{' '}
              <button className="fi-btn" data-testid={`forge-export-pick-${id}`} onClick={() => onPick(c, id)}>
                この人を確認する
              </button>
            </li>
          );
        })}
        {file.characters.length === 0 && <li className="fi-quiet">characters は空です。</li>}
      </ul>
    </div>
  );
}

// ---- Who has been adopted -------------------------------------------------

function Registered({ source, onChanged }: { source: Source; onChanged: () => Promise<void> }) {
  const roster = source.content.roster.characters;
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const toggleLife = async (id: string, next: boolean) => {
    try {
      await post('life-actor', { characterId: id, lifeActor: next });
      setMessage(`${id} を WORLD LIFE ENGINE の${next ? '対象' : '対象外'}にしました。`);
      await onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const rollback = async (id: string) => {
    try {
      await post('rollback', { characterId: id });
      setMessage(`${id} を直前の送出へ戻しました。NPC_ID と採用はそのままです。`);
      await onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setConfirming(null);
    }
  };

  return (
    <section className="fi-step" data-testid="forge-records">
      <h2>採用済みのキャラクター（{roster.length}）</h2>
      {message && (
        <p className="fi-note" data-testid="forge-records-message">
          {message}
        </p>
      )}
      {roster.length === 0 && <p className="fi-quiet">まだありません。</p>}
      {roster.map((entry) => {
        const kind = forgeKindOf(entry);
        const definition = source.content.baselines[entry.characterId];
        return (
          <div className="fi-record" key={entry.characterId} data-testid={`forge-record-${entry.characterId}`} data-kind={kind}>
            <div className="fi-record-head">
              <b>{entry.characterId}</b>
              <span>→ {entry.npcId}</span>
              <span className="fi-kind">{FORGE_KIND_LABEL[kind]}</span>
              <span>{definition ? forgeDisplayName(definition) : '（読めません）'}</span>
              <span className="fi-quiet">
                送出版 {entry.deployedVersion}・地域 {entry.region ?? '未配置'}・{formatTime(entry.lastImportedAt)}
              </span>
              <span className={entry.lifeActor ? 'fi-good' : 'fi-quiet'} data-testid={`forge-life-${entry.characterId}`}>
                Life Engine {entry.lifeActor ? '対象' : '対象外'}
              </span>
              {source.mode === 'AUTHORING' && (
                <button
                  className="fi-btn"
                  data-testid={`forge-life-toggle-${entry.characterId}`}
                  onClick={() => void toggleLife(entry.characterId, !entry.lifeActor)}
                >
                  {entry.lifeActor ? '対象外にする' : '対象にする'}
                </button>
              )}
            </div>
            <ol className="fi-history">
              {entry.history.map((h) => (
                <li key={h.importId}>
                  {HISTORY_TEXT[h.result]}　{h.deployedVersion}　{formatTime(h.importedAt)}
                  {h.warnings.length > 0 && <span className="fi-warn">　警告 {h.warnings.length}</span>}
                </li>
              ))}
            </ol>
            {source.mode === 'AUTHORING' &&
              entry.previous &&
              (confirming === entry.characterId ? (
                <div className="fi-row">
                  <span>直前の送出（{entry.previous.deployedVersion}）に戻しますか？</span>
                  <button className="fi-btn fi-primary" data-testid="forge-rollback-confirm" onClick={() => void rollback(entry.characterId)}>
                    戻す
                  </button>
                  <button className="fi-btn" onClick={() => setConfirming(null)}>
                    やめる
                  </button>
                </div>
              ) : (
                <button className="fi-btn" data-testid={`forge-rollback-${entry.characterId}`} onClick={() => setConfirming(entry.characterId)}>
                  直前の状態に戻す
                </button>
              ))}
          </div>
        );
      })}
    </section>
  );
}

const HISTORY_TEXT = { NEW: '新規登録', UPDATED: '更新', ROLLED_BACK: '直前へ戻した', LIFE_ACTOR_CHANGED: 'Life Engine 対象を変更' } as const;

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
