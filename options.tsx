import { useEffect, useState } from "react"

import { type FormatSettings } from "~lib/format"
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  type LlmProvider,
  type QuickAction,
  type Settings
} from "~lib/settings"

import "./tabs/style.css"

const ACTION_OPTIONS: { value: QuickAction; label: string }[] = [
  { value: "download", label: "Download .MD" },
  { value: "copy", label: "Copy Markdown" },
  { value: "copyPrompt", label: "Copy as Prompt" }
]

const FORMAT_OPTIONS: { key: keyof FormatSettings; label: string }[] = [
  { key: "includeImages", label: "Include Images" },
  { key: "includeLinks", label: "Include Links" },
  { key: "includePageInfo", label: "Include Page Info" },
  { key: "includeMap", label: "Include Map" },
  { key: "includeSourceUrl", label: "Include Source" }
]

const PROVIDER_OPTIONS: { value: LlmProvider; label: string }[] = [
  { value: "mistral", label: "Mistral" },
  { value: "openai", label: "OpenAI" }
]

export default function OptionsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState("")

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s)
      setLoaded(true)
    })
  }, [])

  const handleSave = () => {
    saveSettings(settings).then(() => {
      setStatus("Saved!")
      setTimeout(() => setStatus(""), 1500)
    })
  }

  const toggleFormat = (key: keyof FormatSettings) => {
    setSettings((prev) => ({
      ...prev,
      format: { ...prev.format, [key]: !prev.format[key] }
    }))
  }

  if (!loaded) return null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans px-6 py-10">
      <div className="max-w-lg mx-auto space-y-8">
        <h1 className="text-xl font-semibold">Pirate Markdown — Options</h1>

        <section className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="accent-cyan-500"
              checked={settings.oneClickEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  oneClickEnabled: e.target.checked
                }))
              }
            />
            Enable One-Click Action Button
          </label>
          <p className="text-xs text-zinc-500 pl-6">
            When enabled, left-clicking the toolbar icon immediately runs the
            action below instead of opening the preview tab.
          </p>

          <div className="pl-6 space-y-2">
            {ACTION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-2 text-sm ${
                  settings.oneClickEnabled ? "" : "opacity-40"
                }`}>
                <input
                  type="radio"
                  className="accent-cyan-500"
                  name="oneClickAction"
                  value={opt.value}
                  disabled={!settings.oneClickEnabled}
                  checked={settings.oneClickAction === opt.value}
                  onChange={() =>
                    setSettings((prev) => ({
                      ...prev,
                      oneClickAction: opt.value
                    }))
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2 border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-medium text-zinc-300">
            Content included in quick actions
          </h2>
          <p className="text-xs text-zinc-500">
            Applies to the toolbar one-click action and the right-click quick
            actions (Copy Markdown, Copy as Prompt, Download .MD).
          </p>
          <div className="space-y-2 pt-2">
            {FORMAT_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-cyan-500"
                  checked={settings.format[opt.key]}
                  onChange={() => toggleFormat(opt.key)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3 border-t border-zinc-800 pt-6">
          <h2 className="text-sm font-medium text-zinc-300">AI Connection</h2>
          <p className="text-xs text-zinc-500">
            Powers the “Send to AI” button in the preview tab. The key is stored
            locally in the browser and sent directly to the selected provider.
          </p>

          <label className="block text-sm">
            <span className="text-zinc-400">Provider</span>
            <select
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-cyan-600"
              value={settings.llm.provider}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  llm: { ...prev.llm, provider: e.target.value as LlmProvider }
                }))
              }>
              {PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-zinc-400">API Key</span>
            <input
              type="password"
              autoComplete="off"
              placeholder="sk-… / mr-…"
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-600"
              value={settings.llm.apiKey}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  llm: { ...prev.llm, apiKey: e.target.value }
                }))
              }
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-400">Model</span>
            <input
              type="text"
              placeholder="mistral-large-latest / gpt-4o"
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm font-mono outline-none focus:border-cyan-600"
              value={settings.llm.model}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  llm: { ...prev.llm, model: e.target.value }
                }))
              }
            />
          </label>

          <label className="block text-sm">
            <span className="text-zinc-400">System Prompt (default task)</span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-cyan-600 resize-y"
              value={settings.llm.systemPrompt}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  llm: { ...prev.llm, systemPrompt: e.target.value }
                }))
              }
            />
          </label>
        </section>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors">
            Save
          </button>
          {status && <span className="text-cyan-400 text-sm">{status}</span>}
        </div>
      </div>
    </div>
  )
}
