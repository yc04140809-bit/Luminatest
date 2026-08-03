import { useCallback, useEffect, useState } from 'react'
import type { EvolutionRecord } from '../types'

const STORAGE_KEY = 'idea-gacha:current-lineage'

function readStorage(): EvolutionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(history: EvolutionRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // localStorage unavailable — the in-memory history still works for this session.
  }
}

// Tracks the current gacha→mutation lineage (親→子→孫…). A fresh gacha
// pull starts a new lineage; "さらに変異" appends to it. Persisted so a
// page reload doesn't lose an in-progress evolution chain.
export function useEvolutionHistory() {
  const [history, setHistory] = useState<EvolutionRecord[]>(() => readStorage())

  useEffect(() => {
    writeStorage(history)
  }, [history])

  const startLineage = useCallback((record: EvolutionRecord) => {
    setHistory([record])
  }, [])

  const pushRecord = useCallback((record: EvolutionRecord) => {
    setHistory((prev) => [...prev, record])
  }, [])

  return { history, startLineage, pushRecord }
}
