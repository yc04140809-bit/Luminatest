import type { ReactNode } from 'react';
import './navyPlate.css';

/**
 * 無地の紺の枠 — the result's panel (作者 2026-11-05), and the parts the chapter's summary and its share image are
 * to be made of: a navy plate with a light rule, a serif heading, and a pill button in the same rule.
 */
export function NavyPlate({
  title,
  className = '',
  testId,
  children,
  attrs,
}: {
  title?: ReactNode;
  className?: string;
  testId?: string;
  children: ReactNode;
  attrs?: Record<string, string>;
}) {
  return (
    <div className={`navy-plate ${className}`.trim()} data-testid={testId} {...attrs}>
      {title !== undefined && <h1 className="navy-plate-title">{title}</h1>}
      {children}
    </div>
  );
}

export function NavyButton({
  label,
  onClick,
  testId,
  disabled,
}: {
  label: ReactNode;
  onClick: () => void;
  testId?: string;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="navy-btn" data-testid={testId} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}
