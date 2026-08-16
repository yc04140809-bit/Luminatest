import React from 'react';
import type { Severity } from '../../types/domain';

type BadgeColor = 'teal' | 'rose' | 'amber' | 'sky' | 'slate' | 'violet' | 'emerald';

const colorClasses: Record<BadgeColor, string> = {
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

export function Badge({
  children,
  color = 'slate',
  className = '',
}: {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${colorClasses[color]} ${className}`}
    >
      {children}
    </span>
  );
}

const severityColor: Record<Severity, BadgeColor> = {
  error: 'rose',
  warning: 'amber',
  suggestion: 'sky',
};
const severityIcon: Record<Severity, string> = {
  error: '🔴',
  warning: '🟡',
  suggestion: '🔵',
};
const severityLabel: Record<Severity, string> = {
  error: 'エラー',
  warning: '警告',
  suggestion: '提案',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge color={severityColor[severity]}>
      <span>{severityIcon[severity]}</span>
      {severityLabel[severity]}
    </Badge>
  );
}
