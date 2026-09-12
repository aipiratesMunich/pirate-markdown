import type { LlmSettings } from "~lib/settings"

const ENDPOINTS: Record<LlmSettings["provider"], string> = {
  mistral: "https://api.mistral.ai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions"
}

export interface LlmResult {
  content: string
}

/**
 * Sends markdown to the configured provider. Both Mistral and OpenAI expose an
 * OpenAI-compatible chat-completions endpoint, so one request shape covers both.
 * Runs from the preview tab (an extension page), which holds the host
 * permissions declared in the manifest.
 */
export async function askLlm(
  markdown: string,
  settings: LlmSettings,
  userPrompt?: string
): Promise<LlmResult> {
  if (!settings.apiKey) {
    throw new Error(
      "No API key set. Add one under “AI Connection” in the options."
    )
  }

  const endpoint = ENDPOINTS[settings.provider]
  const instruction = (userPrompt?.trim() || settings.systemPrompt).trim()

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: instruction },
        { role: "user", content: markdown }
      ],
      temperature: 0.3
    })
  })

  if (!res.ok) {
    let detail = ""
    try {
      const err = await res.json()
      detail = err?.error?.message || err?.message || ""
    } catch {
      detail = await res.text().catch(() => "")
    }
    throw new Error(
      `${settings.provider} API ${res.status}: ${detail || res.statusText}`
    )
  }

  const data = await res.json()
  const content: string = data?.choices?.[0]?.message?.content ?? ""
  return { content: content.trim() }
}
