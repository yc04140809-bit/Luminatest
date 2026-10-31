import { KitButton, KitPanel } from '../ui/kit/Kit';
import { KIT_PARTS_LIST } from '../ui/kit/skin';
import { UI_SKIN } from '../assets/uiSkin';

/**
 * `?preview=kit` — EVERY SHARED PART, EVERY STATE, SHORT AND LONG WORDS, NARROW AND WIDE
 * (UI 素材の受け皿, 2026-10-16). For laying the delivered pictures against the base image
 * before any screen uses them, and for the e2e that no word is ever cut. Debug builds only.
 */
const SHORT = '持ち物';
const LONG = '月灯りの酒場でマスターと話そう（とても長い名前の場所へ向かう）';
const WIDTHS = [96, 160, 260] as const;

export function KitPreview() {
  return (
    <div className="kit-preview" data-testid="kit-preview" style={{ padding: 12, background: '#101218', color: '#eee', minHeight: '100vh', overflow: 'auto' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13 }}>
        UI 素材の受け皿 — 届いた素材: {KIT_PARTS_LIST.filter((p) => UI_SKIN[p]?.normal).join(', ') || 'まだなし（仮の見た目）'}
      </p>
      {WIDTHS.map((w) => (
        <section key={w} style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '4px 0', fontSize: 12 }}>幅 {w}px</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
            {(['menuButton', 'placeLabel', 'listRow', 'backButton', 'confirmButton'] as const).map((part) =>
              [SHORT, LONG].map((text, i) => (
                <div key={`${part}-${i}`} style={{ width: w, display: 'grid', gap: 4 }} data-testid={`kit-sample-${part}-${w}-${i}`}>
                  <KitButton part={part} label={text} sub={part === 'menuButton' ? 'ITEM' : undefined} />
                  <KitButton part={part} label={text} selected />
                  <KitButton part={part} label={text} disabled />
                  <KitButton part={part} label={text} dim />
                </div>
              )),
            )}
            {(['talkPanel', 'objective', 'panel'] as const).map((part) =>
              [SHORT, LONG].map((text, i) => (
                <div key={`${part}-${i}`} style={{ width: w }} data-testid={`kit-sample-${part}-${w}-${i}`}>
                  <KitPanel part={part} heading={part === 'objective' ? '次の目的' : text}>
                    <span data-kit-text="">{text}</span>
                  </KitPanel>
                </div>
              )),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
