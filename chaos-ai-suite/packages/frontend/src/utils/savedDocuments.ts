/** 代表が「保管する」を選んだタスク成果物。書類保管庫にはこの端末のlocalStorageで保持する。 */
export interface SavedDocument {
  id: string;
  title: string;
  agentName?: string;
  content: string;
  savedAt: string;
}

const STORAGE_KEY = "chaos-ai-suite:saved-documents";

export function listSavedDocuments(): SavedDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedDocument[];
  } catch {
    return [];
  }
}

export function saveDocument(doc: { title: string; agentName?: string; content: string }): SavedDocument {
  const saved: SavedDocument = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    ...doc,
  };
  const next = [saved, ...listSavedDocuments()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return saved;
}

export function removeSavedDocument(id: string): void {
  const next = listSavedDocuments().filter((doc) => doc.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
