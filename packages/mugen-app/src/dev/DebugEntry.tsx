/**
 * THE WAY INTO THE DEBUG TOOLS ON A PHONE, which has no address bar to
 * type `?preview=battle` into.
 *
 * Drawn only where `DEBUG_TOOLS` is true (see below) — the dev server
 * and the debug APK. A release build never draws it, and the check is
 * compile time, so it is not in a release bundle at all.
 *
 * Among the doors: the battle preview, which reads and writes nothing of the
 * world; the bakery route's causal chain (`?tool=chain`), which only reads
 * the save; throwing the save away (`?tool=reset`, on a second press); and
 * the CHARACTER FORGE import (`?tool=forge-import`), which
 * registers characters into this device's save — only after the author
 * has checked each one and pressed 登録.
 */
export function DebugEntry() {
  return (
    <div
      style={{
        position: 'fixed',
        left: 'calc(8px + env(safe-area-inset-left))',
        bottom: 'calc(8px + env(safe-area-inset-bottom))',
        right: 'calc(8px + env(safe-area-inset-right))',
        zIndex: 1000,
        display: 'flex',
        gap: 8,
        // More doors than a phone is wide: the row slides sideways.
        overflowX: 'auto',
      }}
    >
      {/* TIGS2027 STEP ①: the bakery route's chain and the play's time to the look ahead (src/dev/ChainPanel.tsx). */}
      <button
        data-testid="debug-chain"
        onClick={() => window.location.assign(`${window.location.pathname}?tool=chain`)}
        style={DOOR}
      >
        パン屋ルート因果連鎖・経過時間
      </button>
      {/* With a save the title offers only つづきから: this is how a phone plays from the start again. */}
      <button
        data-testid="debug-reset-save"
        onClick={() => window.location.assign(`${window.location.pathname}?tool=reset`)}
        style={DOOR}
      >
        DEBUG セーブを消す（最初から）
      </button>
      {/* The PoCs waiting on the author's eye (docs/EXPLORATION_DISCOVERY.md, EXPLORATION_AREAS.md, CHARACTER_FX.md). */}
      <button
        data-testid="debug-walk-grassland"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=walk&place=GRASSLAND`)}
        style={DOOR}
      >
        探索PoC（草原・遠近と発見演出）
      </button>
      <button
        data-testid="debug-walk-ruins-areas"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=walk&place=ANCIENT_RUINS&areas=1`)}
        style={DOOR}
      >
        探索PoC（遺跡・歩行範囲）
      </button>
      <button
        data-testid="debug-walk-forest"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=walk&place=GREENWOOD_FOREST`)}
        style={DOOR}
      >
        探索（森・環境演出）
      </button>
      <button
        data-testid="debug-fx-preview"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=fx`)}
        style={DOOR}
      >
        キャラ演出見本
      </button>
      <button
        data-testid="debug-party-preview"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=party&enemy=select`)}
        style={DOOR}
      >
        3人戦闘
      </button>
      {/* ケイオスの《双極臨界》 with a stand-in shout (src/dev/voiceDummy.ts), to hear the voice on a phone. */}
      <button
        data-testid="debug-voice-dummy"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=party&collapse=1&voice=dummy`)}
        style={DOOR}
      >
        ボイス確認（ダミー）
      </button>
      <button
        data-testid="debug-battle-preview"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=battle`)}
        style={DOOR}
      >
        DEBUG 戦闘演出プレビュー
      </button>
      <button
        data-testid="debug-walk-ruins"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=walk&place=ANCIENT_RUINS`)}
        style={DOOR}
      >
        DEBUG 探索（古代遺跡）
      </button>
      {/* The same walk with finds of one grade, to check them on a phone. */}
      <button
        data-testid="debug-walk-ruins-rare"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=walk&place=ANCIENT_RUINS&find=RARE`)}
        style={DOOR}
      >
        DEBUG 探索（古代遺跡・金色を出す）
      </button>
      <button
        data-testid="debug-walk-ruins-rainbow"
        onClick={() => window.location.assign(`${window.location.pathname}?preview=walk&place=ANCIENT_RUINS&find=RAINBOW`)}
        style={DOOR}
      >
        DEBUG 探索（古代遺跡・虹を出す）
      </button>
      <button
        data-testid="debug-forge-import"
        onClick={() => window.location.assign(`${window.location.pathname}?tool=forge-import`)}
        style={DOOR}
      >
        DEBUG キャラクター取込
      </button>
    </div>
  );
}

const DOOR = {
  flex: 'none',
  whiteSpace: 'nowrap',
  minHeight: 36,
  padding: '4px 12px',
  border: '1px solid #e0b84a',
  borderRadius: 18,
  background: 'rgba(60, 20, 0, 0.85)',
  color: '#ffd76a',
  font: '12px system-ui, sans-serif',
  letterSpacing: '0.06em',
} as const;
