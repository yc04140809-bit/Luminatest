interface Props {
  onPress: () => void
  disabled: boolean
  spinning: boolean
}

export function GachaButton({ onPress, disabled, spinning }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={`relative w-full max-w-xs rounded-full py-5 text-lg font-bold tracking-wide text-white
        bg-gradient-to-br from-neon-violet via-fuchsia-600 to-neon-cyan
        transition-transform active:scale-95
        disabled:opacity-70 disabled:cursor-not-allowed
        ${!disabled ? 'animate-glow-pulse' : ''}`}
    >
      <span className={spinning ? 'inline-block animate-gacha-spin' : 'inline-block'}>
        {spinning ? '🎰 回転中…' : '🎰 ガチャを回す'}
      </span>
    </button>
  )
}
