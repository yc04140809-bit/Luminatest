interface Props {
  message?: string
  onRetry: () => void
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="glass-card rounded-2xl p-5 text-center space-y-3 border-rose-500/40">
      <p className="text-2xl">🧪💥</p>
      <p className="text-sm font-semibold text-rose-300">
        突然変異に失敗しました。もう一度回してください。
      </p>
      {message && <p className="text-xs text-slate-500">{message}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-rose-500/20 border border-rose-400/50 text-rose-200 px-5 py-2 text-sm font-bold"
      >
        🔄 もう一度回す
      </button>
    </div>
  )
}
