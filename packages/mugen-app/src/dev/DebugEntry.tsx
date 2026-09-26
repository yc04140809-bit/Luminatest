/**
 * THE WAY INTO THE DEBUG TOOLS ON A PHONE, which has no address bar to
 * type `?preview=battle` into.
 *
 * Drawn only where `DEBUG_TOOLS` is true (see below) — the dev server
 * and the debug APK. A release build never draws it, and the check is
 * compile time, so it is not in a release bundle at all. It opens the
 * battle preview, which reads and writes nothing of the world.
 */
export function DebugEntry() {
  return (
    <button
      data-testid="debug-battle-preview"
      onClick={() => window.location.assign(`${window.location.pathname}?preview=battle`)}
      style={{
        position: 'fixed',
        left: 'calc(8px + env(safe-area-inset-left))',
        bottom: 'calc(8px + env(safe-area-inset-bottom))',
        zIndex: 1000,
        minHeight: 36,
        padding: '4px 12px',
        border: '1px solid #e0b84a',
        borderRadius: 18,
        background: 'rgba(60, 20, 0, 0.85)',
        color: '#ffd76a',
        font: '12px system-ui, sans-serif',
        letterSpacing: '0.06em',
      }}
    >
      DEBUG 戦闘演出プレビュー
    </button>
  );
}
