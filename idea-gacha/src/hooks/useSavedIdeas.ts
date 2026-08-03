import { useCallback, useEffect, useState } from 'react'
import type { SavedIdea } from '../types'

const STORAGE_KEY = 'idea-gacha:saved-ideas'

function readStorage(): SavedIdea[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(ideas: SavedIdea[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas))
  } catch {
    // localStorage unavailable (private mode / quota) — fail silently,
    // the in-memory state still lets the current session work.
  }
}

export function useSavedIdeas() {
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>(() => readStorage())

  useEffect(() => {
    writeStorage(savedIdeas)
  }, [savedIdeas])

  const addIdea = useCallback((entry: SavedIdea) => {
    setSavedIdeas((prev) => [entry, ...prev])
  }, [])

  const removeIdea = useCallback((id: string) => {
    setSavedIdeas((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  return { savedIdeas, addIdea, removeIdea }
}
