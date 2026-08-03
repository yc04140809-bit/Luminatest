import { Accordion } from './Accordion'
import { ConceptReveal } from './ConceptReveal'
import { EvolutionHistory } from './EvolutionHistory'
import { MaterialsFlow } from './MaterialsFlow'
import { MutationScorePanel } from './MutationScorePanel'
import { ScorePanel } from './ScorePanel'
import { VerdictBadge } from './VerdictBadge'
import type { Concept, EvolutionRecord, GachaMode, Idea } from '../types'

interface Props {
  idea: Idea
  concepts: Concept[]
  mode: GachaMode
  onPrototype?: () => void
  onSave?: () => void
  onReroll?: () => void
  onMutate?: () => void
  evolutionHistory?: EvolutionRecord[]
  saved?: boolean
  prototyped?: boolean
  readOnly?: boolean
}

export function ResultCard({
  idea,
  concepts,
  mode,
  onPrototype,
  onSave,
  onReroll,
  onMutate,
  evolutionHistory,
  saved,
  prototyped,
  readOnly,
}: Props) {
  const hasMaterialsFlow = Boolean(idea.invention && idea.product)
  const hasMutationScores =
    idea.mutationScore !== undefined && idea.businessScore !== undefined && idea.chaosScore !== undefined

  return (
    <div className="animate-card-flip-in glass-card rounded-3xl p-5 space-y-5">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <p className="text-xs uppercase tracking-widest text-neon-cyan neon-text font-semibold">
            🧬 今回の突然変異
          </p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
            GEN {idea.generation ?? 1}
          </span>
        </div>
        <div className="mt-3">
          <ConceptReveal spinning={false} concepts={concepts} />
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-white">{idea.name}</h2>
        <div className="mt-2 inline-block rounded-xl bg-white/5 px-4 py-2">
          <p className="text-xs text-slate-400 mb-0.5">一言でいうと</p>
          <p className="text-base font-semibold text-neon-cyan">{idea.oneLiner}</p>
        </div>
      </div>

      <div className="flex justify-center">
        <VerdictBadge verdict={idea.verdict} />
      </div>

      {hasMaterialsFlow && (
        <MaterialsFlow
          materials={concepts}
          usedConcepts={idea.usedConcepts ?? idea.concepts}
          discardedConcepts={idea.discardedConcepts ?? []}
          invention={idea.invention as string}
          product={idea.product as string}
        />
      )}

      <ScorePanel scores={idea.scores} mode={mode} />

      {hasMutationScores && (
        <MutationScorePanel
          mutationScore={idea.mutationScore as number}
          businessScore={idea.businessScore as number}
          chaosScore={idea.chaosScore as number}
        />
      )}

      <div className="space-y-2">
        <Accordion title="これは何？" emoji="🔍" defaultOpen>
          {idea.whatIsIt}
        </Accordion>
        <Accordion title="なぜ面白い？" emoji="💡">
          {idea.whyInteresting}
        </Accordion>
        <Accordion title="誰向け？" emoji="🎯">
          {idea.target}
        </Accordion>
        <Accordion title="解決する問題" emoji="🧩">
          {idea.problem}
        </Accordion>
        <Accordion title="収益化" emoji="💰">
          {idea.monetization}
        </Accordion>
        <Accordion title="MVP" emoji="🛠">
          {idea.mvp}
        </Accordion>
        <Accordion title="既存との差" emoji="🥊">
          {idea.difference}
        </Accordion>
      </div>

      {!readOnly && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onPrototype}
            className={`rounded-xl py-3 text-xs font-bold transition-colors
              ${prototyped ? 'bg-rose-500 text-white' : 'bg-rose-500/15 text-rose-300 border border-rose-400/40'}`}
          >
            🔥 試作候補にする
          </button>
          <button
            type="button"
            onClick={onSave}
            className={`rounded-xl py-3 text-xs font-bold transition-colors
              ${saved ? 'bg-amber-400 text-black' : 'bg-amber-400/15 text-amber-300 border border-amber-300/40'}`}
          >
            ⭐ 保存
          </button>
          <button
            type="button"
            onClick={onReroll}
            className="rounded-xl py-3 text-xs font-bold bg-white/5 text-slate-200 border border-lab-border"
          >
            🔄 もう一回
          </button>
          <button
            type="button"
            onClick={onMutate}
            className="rounded-xl py-3 text-xs font-bold bg-neon-violet/15 text-neon-violet border border-neon-violet/40"
          >
            🧬 さらに変異
          </button>
        </div>
      )}

      {evolutionHistory && <EvolutionHistory history={evolutionHistory} />}
    </div>
  )
}
