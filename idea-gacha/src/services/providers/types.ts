// Common interface every AI provider (Claude, OpenAI, Gemini, ...) implements,
// so ideaGenerator.ts never needs to know which provider is behind it.
export interface AIProvider {
  name: string
  isConfigured: boolean
  generate(systemPrompt: string, userPrompt: string, signal: AbortSignal): Promise<string>
}
