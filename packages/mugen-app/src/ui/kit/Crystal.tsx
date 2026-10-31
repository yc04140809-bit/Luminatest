import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { KitBox, KitButton, KitPanel } from './Kit';
import './crystal.css';

/**
 * MUGEN ZERO 共通クリスタルUI (作者 2026-10-16「クリスタルUI素材を共通UIキットとして転用」).
 *
 * The names each screen builds from. Every one is a delivered piece of ui-sheet-v1 (ui/kit/skin.ts),
 * 9-sliced — its corners and edges kept whole, only the flat middle stretched — or, for the small
 * frames, drawn whole at their own shape. No screen draws its own frame, button or row.
 *
 *   CrystalFrame          the tall frame (立ち絵・プロフィール), a border only: a picture shows inside
 *   CrystalPanel          the wide dark panel (large) or the smaller one (medium)
 *   CrystalHeader         a title / name plate (the thin plate with the cut ends)
 *   CrystalButton         a press: confirm (決定・入る・ページ), back (戻る), menu (村の下の5つ)
 *   CrystalListRow        one row of a list (a stat, an item, a skill, a rumour)
 *   CrystalIconFrame      a small square / round / diamond frame round an icon or a face
 *   CrystalLocationLabel  a place's label on a map
 *
 * The words are never cut: no part has a fixed height, and a long label wraps.
 */

export function CrystalFrame({ className = '', style, testId }: { className?: string; style?: CSSProperties; testId?: string }) {
  return <div className={`crystal-frame ${className}`.trim()} style={style} aria-hidden="true" data-testid={testId} />;
}

export function CrystalPanel({
  size = 'large',
  ...rest
}: { size?: 'large' | 'medium' } & Omit<ComponentProps<typeof KitPanel>, 'part'>) {
  return <KitPanel part={size === 'large' ? 'panel' : 'objective'} {...rest} className={`crystal-panel ${rest.className ?? ''}`.trim()} />;
}

export function CrystalHeader({
  children,
  as = 'div',
  className = '',
  testId,
  style,
}: {
  children: ReactNode;
  as?: 'div' | 'p';
  className?: string;
  testId?: string;
  style?: CSSProperties;
}) {
  return (
    <KitBox part="placeLabel" as={as} className={`crystal-header ${className}`.trim()} testId={testId} style={style}>
      {children}
    </KitBox>
  );
}

export function CrystalButton({
  kind = 'confirm',
  ...rest
}: { kind?: 'confirm' | 'back' | 'menu' } & Omit<ComponentProps<typeof KitButton>, 'part'>) {
  const part = kind === 'back' ? 'backButton' : kind === 'menu' ? 'menuButton' : 'confirmButton';
  return <KitButton part={part} {...rest} className={`crystal-button ${rest.className ?? ''}`.trim()} />;
}

/**
 * A press whose markup is the screen's own (a tab, the page now open, a page not yet built):
 * the confirm button's picture, with whatever element and attributes the screen needs.
 */
export function CrystalTab(props: Omit<ComponentProps<typeof KitBox>, 'part' | 'press'>) {
  return <KitBox part="confirmButton" press {...props} className={`crystal-button ${props.className ?? ''}`.trim()} />;
}

export function CrystalListRow({
  press,
  as,
  className = '',
  ...rest
}: Omit<ComponentProps<typeof KitBox>, 'part'>) {
  return <KitBox part="listRow" press={press} as={as ?? (press ? 'button' : 'div')} className={`crystal-row ${className}`.trim()} {...rest} />;
}

export function CrystalIconFrame({
  shape = 'square',
  size = 32,
  children,
  className = '',
}: {
  shape?: 'square' | 'round' | 'diamond';
  /** Its width (CSS px); the height follows the frame's own shape. */
  size?: number;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`crystal-icon ${className}`.trim()} data-shape={shape} style={{ '--ci-w': `${size}px` } as CSSProperties} aria-hidden="true">
      <span className="crystal-icon-inside">{children}</span>
    </span>
  );
}

export function CrystalLocationLabel(props: Omit<ComponentProps<typeof KitButton>, 'part'>) {
  return <KitButton part="placeLabel" {...props} />;
}
