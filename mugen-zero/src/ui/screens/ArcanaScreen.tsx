import { useState } from 'react';
import {
  fragmentsOf,
  hintsOf,
  isComplete,
  isDiscovered,
  progressOf,
  type ArcanaDef,
  type ArcanaRecord,
} from '../../core/arcana/arcana';
import { ARCANA_DEFS } from '../../content/arcana/arcanaDefs';
import { Ornament } from '../common/Ornament';

/**
 * ARCANA 図鑑 — the book of what the player has come to know.
 *
 * Not an inventory and not a completion tracker. Each page says how
 * much of something is known and, where it is not known, says so in a
 * way that sends the player back into the world rather than down a
 * checklist: the conditions are exact inside and vague on the page, on
 * purpose. A book that tells you "help it for +15%" is a chore list
 * with a serif font.
 *
 * One page today. The list is built from the registry, so the second
 * one costs an entry in content and nothing here.
 */

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

/** The drawing, cut out of its own file by CSS. No pixel is edited. */
function ArcanaArt({ def, height }: { def: ArcanaDef; height: number }) {
  const box = def.visual.box;
  const k = height / box.height;
  return (
    <div
      className="arcana-art"
      role="img"
      aria-label={def.name}
      style={{
        width: box.width * k,
        height,
        backgroundImage: `url(${def.visual.src})`,
        backgroundSize: `${box.fileW * k}px ${box.fileH * k}px`,
        backgroundPosition: `${-box.x * k}px ${-box.y * k}px`,
      }}
    />
  );
}

function ProgressBar({ value, complete }: { value: number; complete: boolean }) {
  return (
    <span className="arcana-bar" aria-hidden="true">
      <span
        className={complete ? 'arcana-bar-fill complete' : 'arcana-bar-fill'}
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

interface Props {
  records: readonly ArcanaRecord[];
  onBack: () => void;
}

export function ArcanaScreen({ records, onBack }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const recordOf = (arcanaId: string): ArcanaRecord =>
    records.find((r) => r.arcanaId === arcanaId) ?? { arcanaId, met: [], completeSeen: false };

  const openDef = openId ? ARCANA_DEFS.find((d) => d.arcanaId === openId) ?? null : null;
  if (openDef) {
    return <ArcanaDetail def={openDef} record={recordOf(openDef.arcanaId)} onBack={() => setOpenId(null)} />;
  }

  const known = ARCANA_DEFS.filter((def) => isDiscovered(recordOf(def.arcanaId))).length;

  return (
    <div className="screen arcana-screen">
      <div className="screen-title">アルカナ</div>
      <p className="arcana-count" data-testid="arcana-count">
        {known} / {ARCANA_DEFS.length}
      </p>
      <div className="arcana-list" data-testid="arcana-list">
        {ARCANA_DEFS.map((def) => {
          const record = recordOf(def.arcanaId);
          const found = isDiscovered(record);
          const progress = progressOf(def, record);
          const complete = isComplete(def, record);
          // A page nobody has opened is still a page: the book shows
          // that there is something there without saying what.
          return (
            <button
              key={def.arcanaId}
              className={found ? 'arcana-card' : 'arcana-card sealed'}
              data-testid={`arcana-card-${def.arcanaId}`}
              data-found={found ? 'yes' : 'no'}
              disabled={!found}
              onClick={() => setOpenId(def.arcanaId)}
            >
              <span className="arcana-no">ARCANA #{found ? pad(def.number) : '???'}</span>
              <span className="arcana-name">{found ? def.name : '？？？？？？？'}</span>
              {found && (
                <>
                  <span className="arcana-meter">
                    <ProgressBar value={progress} complete={complete} />
                    <span className="arcana-pct" data-testid={`arcana-pct-${def.arcanaId}`}>
                      {progress}%
                    </span>
                  </span>
                  <span className="arcana-open">
                    詳細を見る
                    {complete && (
                      <span className="arcana-chip" data-testid={`arcana-complete-chip-${def.arcanaId}`}>
                        COMPLETE
                      </span>
                    )}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="screen-footer">
        <button className="btn" data-testid="arcana-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}

function ArcanaDetail({
  def,
  record,
  onBack,
}: {
  def: ArcanaDef;
  record: ArcanaRecord;
  onBack: () => void;
}) {
  const progress = progressOf(def, record);
  const complete = isComplete(def, record);
  const known = fragmentsOf(def, record);
  const hints = hintsOf(def, record);

  return (
    <div className="screen arcana-screen" data-testid={`arcana-detail-${def.arcanaId}`}>
      <div className="screen-title">アルカナ</div>
      <div className="arcana-detail">
        <p className="arcana-no">ARCANA #{pad(def.number)}</p>
        <h1 className="arcana-title">{def.name}</h1>
        <span className="arcana-rule" aria-hidden="true" />

        <div className={complete ? 'arcana-plate complete' : 'arcana-plate'}>
          <ArcanaArt def={def} height={132} />
        </div>

        <div className="arcana-meter wide">
          <ProgressBar value={progress} complete={complete} />
          <span className="arcana-pct" data-testid="arcana-detail-pct">
            {progress}%
          </span>
        </div>

        {complete ? (
          <p className="arcana-complete-line" data-testid="arcana-complete-line">
            <Ornament kind="ring" size={16} />
            <span>ARCANA COMPLETE</span>
            <em>{def.completeLine}</em>
          </p>
        ) : (
          <p className="arcana-summary">{def.summary}</p>
        )}

        <section className="arcana-section" data-testid="arcana-known">
          <h2 className="arcana-h">わかっていること</h2>
          {known.length === 0 ? (
            <p className="arcana-dim">まだ、ほとんど何も分かっていない。</p>
          ) : (
            <dl className="arcana-facts">
              {known.map((fragment) => (
                <div key={fragment.id} data-testid={`arcana-fragment-${fragment.id}`}>
                  <dt>{fragment.label}</dt>
                  <dd>{fragment.text}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* What is missing, said as a feeling rather than as a task.
            The exact conditions are kept exactly — just not here. */}
        {hints.length > 0 && (
          <section className="arcana-section" data-testid="arcana-hints">
            <h2 className="arcana-h">まだ知らないこと</h2>
            <ul className="arcana-hint-list">
              {hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="screen-footer">
        <button className="btn" data-testid="arcana-detail-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
