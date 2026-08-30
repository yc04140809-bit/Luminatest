// Anonymous play-session id.
//
// Identifies WHICH playthrough a feedback answer belongs to — nothing
// more. No account, no name, no contact details, no device id.
// Stored in localStorage so RESET WORLD (IndexedDB) never erases the
// record of which sessions have already answered.

const STORAGE_KEY = 'mugen-zero-play-session';

function randomId(): string {
  const globalCrypto = typeof crypto !== 'undefined' ? crypto : undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  if (globalCrypto?.getRandomValues) {
    const bytes = globalCrypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** The current playthrough's id, created on first use. */
export function getPlaySessionId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = randomId();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // Blocked storage: a per-tab id still lets one answer be recorded.
    return randomId();
  }
}

/** Starting a brand-new world means a new playthrough to ask about. */
export function startNewPlaySession(): string {
  const created = randomId();
  try {
    localStorage.setItem(STORAGE_KEY, created);
  } catch {
    /* ignore */
  }
  return created;
}
