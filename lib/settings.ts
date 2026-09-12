import { DEFAULT_FORMAT_SETTINGS, type FormatSettings } from "~lib/format"

export type QuickAction = "download" | "copy" | "copyPrompt"

export type LlmProvider = "mistral" | "openai"

export interface LlmSettings {
  provider: LlmProvider
  apiKey: string
  model: string
  systemPrompt: string
}

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  provider: "mistral",
  apiKey: "",
  model: "mistral-large-latest",
  systemPrompt:
    "You are a precise analyst. Summarize the following web page content (Markdown) clearly and without filler."
}

export interface Settings {
  oneClickEnabled: boolean
  oneClickAction: QuickAction
  format: FormatSettings
  llm: LlmSettings
}

export const DEFAULT_SETTINGS: Settings = {
  oneClickEnabled: false,
  oneClickAction: "copy",
  format: DEFAULT_FORMAT_SETTINGS,
  llm: DEFAULT_LLM_SETTINGS
}

const STORAGE_KEY = "settings"

export function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      const stored = result[STORAGE_KEY] || {}
      resolve({
        ...DEFAULT_SETTINGS,
        ...stored,
        format: { ...DEFAULT_FORMAT_SETTINGS, ...stored.format },
        llm: { ...DEFAULT_LLM_SETTINGS, ...stored.llm }
      })
    })
  })
}

export function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: settings }, () => resolve())
  })
}
