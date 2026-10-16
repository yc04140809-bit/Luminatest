import type { CSSProperties, ReactNode } from 'react';
import { UI_SKIN } from '../../assets/uiSkin';
import { kitStyle, type KitImages, type KitPart } from './skin';
import './kit.css';

/**
 * THE SHARED PARTS (UI 素材の受け皿, 2026-10-16): the look comes from the
 * delivered pictures (ui/kit/skin.ts); these only say what each part holds.
 *
 *   KitButton  a press: 下部5ボタン (menuButton), 施設ラベル (placeLabel),
 *              一覧行 (listRow), 戻る (backButton), 決定 (confirmButton)
 *   KitPanel   a frame: 左会話パネル (talkPanel), 次の目的 (objective),
 *              汎用パネル (panel)
 *
 * THE WORDS ARE NEVER CUT: no fixed height, no single line forced, no
 * overflow hidden on them — a long label grows to two lines and its part
 * with it. `minHeight` and the padding come from the part's spec.
 *
 * States: selected (`aria-pressed`/`data-selected`), disabled, and the
 * pointer's hover/active — each its own picture when delivered.
 */

function partProps(part: KitPart, images: KitImages, style?: CSSProperties) {
  const { skinned, vars } = kitStyle(part, images);
  return {
    'data-kit': part,
    'data-skinned': skinned ? 'yes' : undefined,
    style: { ...(vars as CSSProperties), ...style },
  };
}

export function KitButton({
  part,
  label,
  sub,
  icon,
  badge,
  selected,
  disabled,
  dim,
  onClick,
  testId,
  className = '',
  style,
  images = UI_SKIN,
  ariaLabel,
  data,
}: {
  part: 'menuButton' | 'placeLabel' | 'listRow' | 'backButton' | 'confirmButton';
  label: ReactNode;
  /** A smaller second line (e.g. STATUS under ステータス). */
  sub?: ReactNode;
  icon?: ReactNode;
  /** NEW, a count, a mark — drawn over the corner, never in the words' way. */
  badge?: ReactNode;
  selected?: boolean;
  /** Not pressable. */
  disabled?: boolean;
  /** Pressable, but shown as not yet open (e.g. a road not opened). */
  dim?: boolean;
  onClick?: () => void;
  testId?: string;
  className?: string;
  style?: CSSProperties;
  images?: KitImages;
  ariaLabel?: string;
  /** Extra data-* attributes (the screen's own, e.g. data-spot). */
  data?: Record<string, string | undefined>;
}) {
  const dataAttrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  return (
    <button
      type="button"
      className={`kit kit-button ${className}`.trim()}
      {...partProps(part, images, style)}
      data-selected={selected ? 'yes' : undefined}
      data-dim={dim ? 'yes' : undefined}
      aria-pressed={selected === undefined ? undefined : selected}
      aria-label={ariaLabel}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
      {...dataAttrs}
    >
      {icon && (
        <span className="kit-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="kit-words">
        <span className="kit-text" data-kit-text="">
          {label}
        </span>
        {sub && (
          <small className="kit-sub" data-kit-text="">
            {sub}
          </small>
        )}
      </span>
      {badge && <span className="kit-badge">{badge}</span>}
    </button>
  );
}

export function KitPanel({
  part,
  heading,
  children,
  testId,
  className = '',
  style,
  images = UI_SKIN,
  as: Tag = 'section',
  data,
  ariaLabel,
  band,
  portrait,
}: {
  part: 'talkPanelHead' | 'talkPanel' | 'objective' | 'panel';
  heading?: ReactNode;
  /** What goes in the picture's band (talkPanelHead: the name). In flow when there is no picture. */
  band?: ReactNode;
  /** A person, filling the frame's inside above the band (talkPanelHead). */
  portrait?: ReactNode;
  children?: ReactNode;
  testId?: string;
  className?: string;
  style?: CSSProperties;
  images?: KitImages;
  as?: 'section' | 'div' | 'aside';
  data?: Record<string, string | undefined>;
  ariaLabel?: string;
}) {
  const dataAttrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  return (
    <Tag className={`kit kit-panel ${className}`.trim()} {...partProps(part, images, style)} data-testid={testId} aria-label={ariaLabel} {...dataAttrs}>
      {portrait && <div className="kit-portrait">{portrait}</div>}
      {band && (
        <div className="kit-band" data-kit-text="">
          {band}
        </div>
      )}
      {heading && (
        <div className="kit-heading" data-kit-text="">
          {heading}
        </div>
      )}
      {children}
    </Tag>
  );
}
