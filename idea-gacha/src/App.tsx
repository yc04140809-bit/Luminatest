import { useState } from 'react'
import { ConceptReveal } from './components/ConceptReveal'
import { ErrorBanner } from './components/ErrorBanner'
import { GachaButton } from './components/GachaButton'
import { ModeSelector } from './components/ModeSelector'
import { MutationDirectionSheet } from './components/MutationDirectionSheet'
import { ResultCard } from './components/ResultCard'
import { SavedList } from './components/SavedList'
import { drawConcepts, drawMutationCatalysts } from './utils/combine'
import { computeTotalScore } from './utils/scoring'
import { generateIdea, generateMutation, isDemoMode } from './services/ideaGenerator'
import { useSavedIdeas } from './hooks/useSavedIdeas'
import { useEvolutionHistory } from './hooks/useEvolutionHistory'
import type { Concept, GachaMode, Idea, MutationDirectionId, SavedIdea } from './types'

type Phase = 'idle' | 'spinning' | 'mutating' | 'result' | 'error'
type View = 'gacha' | 'saved'

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function App() {
  const [view, setView] = useState<View>('gacha')
  const [mode, setMode] = useState<GachaMode>('STANDARD')
  const [phase, setPhase] = useState<Phase>('idle')
  const [concepts, setConcepts] = useState<Concept[] | null>(null)
  const [idea, setIdea] = useState<Idea | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [savedCurrent, setSavedCurrent] = useState(false)
  const [prototypedCurrent, setPrototypedCurrent] = useState(false)
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null)
  const [showDirectionSheet, setShowDirectionSheet] = useState(false)
  const [retryAction, setRetryAction] = useState<() => void>(() => () => {})

  const { savedIdeas, addIdea, removeIdea } = useSavedIdeas()
  const { history, startLineage, pushRecord } = useEvolutionHistory()

  const isBusy = phase === 'spinning' || phase === 'mutating'

  async function handleGacha() {
    if (isBusy) return
    setPhase('spinning')
    setErrorMessage(undefined)
    setSavedCurrent(false)
    setPrototypedCurrent(false)
    setRetryAction(() => handleGacha)

    const drawn = drawConcepts()
    setConcepts(drawn)

    try {
      const result = await generateIdea(drawn, mode)
      setConcepts(result.concepts)
      setIdea(result.idea)
      startLineage({
        generation: result.idea.generation ?? 1,
        name: result.idea.name,
        oneLiner: result.idea.oneLiner,
      })
      setPhase('result')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : undefined)
      setPhase('error')
    }
  }

  async function handleMutate(direction: MutationDirectionId) {
    if (isBusy || !idea) return
    setShowDirectionSheet(false)
    setPhase('mutating')
    setErrorMessage(undefined)
    setSavedCurrent(false)
    setPrototypedCurrent(false)
    setRetryAction(() => () => handleMutate(direction))

    const catalysts = drawMutationCatalysts(2)
    setConcepts(catalysts)

    try {
      const result = await generateMutation(idea, catalysts, direction, mode)
      setConcepts(result.concepts)
      setIdea(result.idea)
      pushRecord({
        generation: result.idea.generation ?? (idea.generation ?? 1) + 1,
        name: result.idea.name,
        oneLiner: result.idea.oneLiner,
      })
      setPhase('result')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : undefined)
      setPhase('error')
    }
  }

  function persistCurrent(status: SavedIdea['status']) {
    if (!idea || !concepts) return
    const entry: SavedIdea = {
      id: newId(),
      idea,
      mode,
      concepts,
      totalScore: computeTotalScore(idea.scores, mode),
      status,
      createdAt: new Date().toISOString(),
    }
    addIdea(entry)
    if (status === 'saved') setSavedCurrent(true)
    if (status === 'prototype') setPrototypedCurrent(true)
  }

  const selectedSaved = savedIdeas.find((s) => s.id === selectedSavedId) ?? null

  return (
    <div className="min-h-screen w-full max-w-md mx-auto px-4 pb-10 pt-6 flex flex-col gap-6">
      <header className="text-center space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-white neon-text">
          🧪 IDEA GACHA
        </h1>
        <p className="text-sm text-slate-300">「まだ誰も作ってないもの、回してみる？」</p>
        <p className="text-xs text-slate-500">
          異分野のアイデアを衝突させ、AIが“突然変異”を発明します。
        </p>
        {isDemoMode && (
          <span className="inline-block mt-1 rounded-full bg-neon-amber/15 border border-neon-amber/40 text-neon-amber text-[11px] font-bold px-3 py-1">
            🧪 DEMO MODE（APIキー未設定）
          </span>
        )}
      </header>

      <nav className="flex gap-2 justify-center">
        <button
          type="button"
          onClick={() => setView('gacha')}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            view === 'gacha' ? 'bg-white/10 text-white' : 'text-slate-400'
          }`}
        >
          🎰 ガチャ
        </button>
        <button
          type="button"
          onClick={() => {
            setView('saved')
            setSelectedSavedId(null)
          }}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
            view === 'saved' ? 'bg-white/10 text-white' : 'text-slate-400'
          }`}
        >
          🗂 保存一覧（{savedIdeas.length}）
        </button>
      </nav>

      {view === 'gacha' ? (
        <main className="flex flex-col gap-6">
          <ModeSelector value={mode} onChange={setMode} disabled={isBusy} />

          {phase === 'idle' && (
            <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-6">
              <ConceptReveal spinning={false} concepts={null} />
              <GachaButton onPress={handleGacha} disabled={isBusy} spinning={false} />
            </div>
          )}

          {phase === 'spinning' && (
            <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-6">
              <ConceptReveal spinning concepts={concepts} />
              <GachaButton onPress={handleGacha} disabled={isBusy} spinning />
              <p className="text-xs text-slate-400 animate-pulse">
                概念を衝突させています…
              </p>
            </div>
          )}

          {phase === 'mutating' && (
            <div className="glass-card rounded-2xl p-6 flex flex-col items-center gap-4">
              <ConceptReveal spinning concepts={concepts} />
              <p className="text-sm font-bold text-neon-violet animate-pulse">🧬 変異中…</p>
            </div>
          )}

          {phase === 'error' && <ErrorBanner message={errorMessage} onRetry={retryAction} />}

          {phase === 'result' && idea && concepts && (
            <ResultCard
              idea={idea}
              concepts={concepts}
              mode={mode}
              saved={savedCurrent}
              prototyped={prototypedCurrent}
              onSave={() => persistCurrent('saved')}
              onPrototype={() => persistCurrent('prototype')}
              onReroll={handleGacha}
              onMutate={() => setShowDirectionSheet(true)}
              evolutionHistory={history}
            />
          )}
        </main>
      ) : (
        <main>
          {selectedSaved ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setSelectedSavedId(null)}
                className="text-sm text-slate-400"
              >
                ← 一覧に戻る
              </button>
              <ResultCard
                idea={selectedSaved.idea}
                concepts={selectedSaved.concepts}
                mode={selectedSaved.mode}
                readOnly
              />
            </div>
          ) : (
            <SavedList
              ideas={savedIdeas}
              onSelect={setSelectedSavedId}
              onDelete={removeIdea}
            />
          )}
        </main>
      )}

      <MutationDirectionSheet
        open={showDirectionSheet}
        onSelect={handleMutate}
        onClose={() => setShowDirectionSheet(false)}
      />
    </div>
  )
}

export default App
