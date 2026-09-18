import { useEffect, useState } from 'react';
import type { DamagedSave, World } from '../core/world/world';

interface Props {
  world: World;
}

/**
 * WHAT THE SAVE SAYS ABOUT ITSELF.
 *
 * Recovery keeps the rows it could not read rather than destroying
 * them, on the grounds that they are the only evidence of what went
 * wrong. Evidence nobody can read is the same as no evidence — so this
 * is the reading end, and it exists for one moment: somebody's phone
 * has done something strange, and the question is whether the save was
 * damaged, which rows, and what was in them.
 *
 * Deliberately plain. It is a report, not a screen: every value is
 * shown as it is stored, because the whole point is seeing what is
 * actually there rather than a tidied version of it.
 */
export function DevSaveHealthPanel({ world }: Props) {
  const [damaged, setDamaged] = useState<DamagedSave | null>(null);
  const [looked, setLooked] = useState(false);
  const health = world.getSaveHealth();

  useEffect(() => {
    let cancelled = false;
    world
      .getDamagedRows()
      .then((rows) => {
        if (cancelled) return;
        setDamaged(rows);
        setLooked(true);
      })
      .catch(() => {
        if (!cancelled) setLooked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [world]);

  const verdict =
    health.health === 'ok'
      ? '問題なし'
      : health.health === 'repaired'
        ? '修復して読み込み'
        : '読めない行あり';

  return (
    <div className="dev-save-health" data-testid="dev-save-health">
      <div className="location-desc" data-testid="dev-save-verdict">
        セーブ v{health.version} ／ {verdict}
        {health.fromTheFuture && ' ／ 新しいビルドのセーブ（書き換えなし）'}
        {health.recoveredFromBackup && ' ／ バックアップから復旧'}
      </div>
      {health.repairedKeys.length > 0 && (
        <div className="location-desc" data-testid="dev-save-repaired">
          修復した行: {health.repairedKeys.join(', ')}
        </div>
      )}
      {health.unreadableKeys.length > 0 && (
        <div className="location-desc" data-testid="dev-save-unreadable">
          読めなかった行: {health.unreadableKeys.join(', ')}
        </div>
      )}
      {health.migrationsApplied.length > 0 && (
        <div className="location-desc" data-testid="dev-save-migrations">
          {health.migrationsApplied.join(' / ')}
        </div>
      )}

      {/* The kept evidence. Absent is the normal answer and is said out
          loud, so "nothing here" and "the panel did not load" are not
          the same blank space. */}
      {looked && !damaged && (
        <div className="location-desc" data-testid="dev-damaged-none">
          破損して保管された行: なし
        </div>
      )}
      {damaged && (
        <div className="dev-damaged" data-testid="dev-damaged">
          <div className="location-desc" data-testid="dev-damaged-when">
            破損検出: {damaged.savedAt || '（時刻不明）'} ／ 読めなかった行:{' '}
            {damaged.unreadableKeys.join(', ') || 'なし'}
          </div>
          <ul className="dev-damaged-rows">
            {damaged.rows.map((row) => (
              <li
                key={row.key}
                className={damaged.unreadableKeys.includes(row.key) ? 'bad' : undefined}
                data-testid={`dev-damaged-row-${row.key}`}
              >
                <b>{row.key}</b>
                <code>{safely(row.value)}</code>
              </li>
            ))}
          </ul>
          <button
            className="btn"
            data-testid="dev-damaged-clear"
            onClick={() => {
              void world.clearDamagedRows().then(() => setDamaged(null));
            }}
          >
            破損記録を消す
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A value as text, whatever it turns out to be.
 *
 * `JSON.stringify` is exactly the wrong tool to trust here and exactly
 * the right one to use: this panel exists because a value was not what
 * it should have been, so the one thing it must never do is throw on a
 * circular or exotic one and take the panel down with it.
 */
function safely(value: unknown): string {
  try {
    const text = JSON.stringify(value);
    if (text === undefined) return String(value);
    return text.length > 400 ? `${text.slice(0, 400)}…` : text;
  } catch {
    return `（表示できない値: ${Object.prototype.toString.call(value)}）`;
  }
}
