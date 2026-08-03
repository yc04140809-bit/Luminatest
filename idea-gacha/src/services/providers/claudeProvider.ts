import type { AIProvider } from './types'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
const MODEL = (import.meta.env.VITE_ANTHROPIC_MODEL as string | undefined) || 'claude-sonnet-4-5'
const API_URL = 'https://api.anthropic.com/v1/messages'

// NOTE: calling the Anthropic API directly from the browser is an MVP
// simplification (no backend). For production, proxy this through a
// server so the API key never ships to the client.
export const claudeProvider: AIProvider = {
  name: 'claude',
  isConfigured: Boolean(API_KEY),

  async generate(systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string> {
    if (!API_KEY) {
      throw new Error('VITE_ANTHROPIC_API_KEY is not set')
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal,
    })

    if (!res.ok) {
      throw new Error(`Claude API error: ${res.status}`)
    }

    const data = await res.json()
    const text = data?.content?.[0]?.text
    if (typeof text !== 'string') {
      throw new Error('Unexpected Claude API response shape')
    }
    return text
  },
}
