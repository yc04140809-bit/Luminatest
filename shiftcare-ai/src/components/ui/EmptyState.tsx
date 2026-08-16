import React from 'react';

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center mx-auto mb-4">{icon}</div>
      <div className="font-bold text-slate-700">{title}</div>
      {description && <p className="text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-1.5 bg-teal-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-teal-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
