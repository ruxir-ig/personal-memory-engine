"use client";

import { KeyRound, Loader2, Save, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PreferenceRecord, ProviderCapability, ProviderKind } from "@pme/shared";
import {
  useDeleteProviderMutation,
  useInvalidateMemory,
  usePreferences,
  useProviders,
  useUpdatePreferenceMutation,
  useUpsertProviderMutation,
} from "@/client/hooks";
import { DemoResetButton } from "./demo-reset-button";
import { EmptyState } from "./empty-state";
import { VaultPanel } from "./vault-panel";

const providerKinds: ProviderKind[] = ["openai", "openrouter", "groq", "cerebras", "custom_openai_compatible"];
const capabilities: ProviderCapability[] = ["chat", "embedding", "vision", "transcription", "rerank"];

const providerDefaults: Record<ProviderKind, { label: string; baseUrl: string; chatModel: string }> = {
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", chatModel: "gpt-4o-mini" },
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", chatModel: "openai/gpt-4o-mini" },
  groq: { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", chatModel: "llama-3.1-8b-instant" },
  cerebras: { label: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", chatModel: "llama3.1-8b" },
  custom_openai_compatible: { label: "Custom provider", baseUrl: "", chatModel: "" },
  google: { label: "Google", baseUrl: "", chatModel: "" },
  anthropic: { label: "Anthropic", baseUrl: "", chatModel: "" },
};

function preferenceValue(preferences: PreferenceRecord[] | undefined, category: PreferenceRecord["category"], key: string) {
  return preferences?.find((preference) => preference.category === category && preference.key === key)?.value;
}

function valueAsString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function SettingsPanel() {
  const invalidate = useInvalidateMemory();
  const providers = useProviders();
  const preferences = usePreferences();
  const upsert = useUpsertProviderMutation();
  const deleteProvider = useDeleteProviderMutation();
  const updatePreference = useUpdatePreferenceMutation();

  const storedProfile = useMemo(
    () => ({
      displayName: valueAsString(preferenceValue(preferences.data, "ui", "displayName"), "Ruxir"),
      timezone: valueAsString(preferenceValue(preferences.data, "notifications", "timezone"), Intl.DateTimeFormat().resolvedOptions().timeZone),
      defaultSource: valueAsString(preferenceValue(preferences.data, "capture", "defaultSourceLabel"), "Quick capture"),
      density: valueAsString(preferenceValue(preferences.data, "ui", "density"), "compact"),
    }),
    [preferences.data],
  );

  const [displayName, setDisplayName] = useState(storedProfile.displayName);
  const [timezone, setTimezone] = useState(storedProfile.timezone);
  const [defaultSource, setDefaultSource] = useState(storedProfile.defaultSource);
  const [density, setDensity] = useState(storedProfile.density);
  const [kind, setKind] = useState<ProviderKind>("openrouter");
  const [label, setLabel] = useState(providerDefaults.openrouter.label);
  const [baseUrl, setBaseUrl] = useState(providerDefaults.openrouter.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [chatModel, setChatModel] = useState(providerDefaults.openrouter.chatModel);
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<ProviderCapability[]>(["chat"]);

  useEffect(() => {
    setDisplayName(storedProfile.displayName);
    setTimezone(storedProfile.timezone);
    setDefaultSource(storedProfile.defaultSource);
    setDensity(storedProfile.density);
  }, [storedProfile]);

  function selectKind(nextKind: ProviderKind) {
    const defaults = providerDefaults[nextKind];
    setKind(nextKind);
    setLabel(defaults.label);
    setBaseUrl(defaults.baseUrl);
    setChatModel(defaults.chatModel);
  }

  function toggleCapability(capability: ProviderCapability) {
    setSelectedCapabilities((current) => (current.includes(capability) ? current.filter((item) => item !== capability) : [...current, capability]));
  }

  async function saveProfile() {
    await Promise.all([
      updatePreference.mutateAsync({ category: "ui", key: "displayName", value: displayName.trim(), requiresConfirmation: false }),
      updatePreference.mutateAsync({ category: "notifications", key: "timezone", value: timezone.trim(), requiresConfirmation: false }),
      updatePreference.mutateAsync({ category: "capture", key: "defaultSourceLabel", value: defaultSource.trim(), requiresConfirmation: false }),
      updatePreference.mutateAsync({ category: "ui", key: "density", value: density, requiresConfirmation: false }),
    ]);
  }

  async function saveProvider() {
    if (!label.trim() || !apiKey.trim() || selectedCapabilities.length === 0) return;
    await upsert.mutateAsync({ label, kind, baseUrl, apiKey, chatModel, embeddingModel, capabilities: selectedCapabilities, isDefault: providers.data?.length === 0 });
    setApiKey("");
    await invalidate();
  }

  async function removeProvider(providerId: string, providerLabel: string) {
    if (!window.confirm(`Remove ${providerLabel} and delete its stored API key?`)) return;
    await deleteProvider.mutateAsync(providerId);
  }

  return (
    <div className="settings-grid">
      <VaultPanel />
      <section className="card pad-lg">
        <div className="section-head">
          <div className="block-title">
            <span className="ic">
              <UserRound size={16} />
            </span>
            Profile
          </div>
        </div>
        <div className="row" style={{ marginBottom: 16 }}>
          <span className="avatar" style={{ width: 52, height: 52, borderRadius: 14, fontSize: 22, display: "grid", placeItems: "center", background: "var(--surface-3)", fontWeight: 650 }}>
            {displayName.trim().slice(0, 1).toUpperCase() || "Q"}
          </span>
          <div>
            <strong style={{ fontSize: 15 }}>{displayName || "Your name"}</strong>
            <p className="faint" style={{ fontSize: 12 }}>
              Local profile
            </p>
          </div>
        </div>
        <div className="stack">
          <label className="field">
            <span>Display name</span>
            <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label className="field">
            <span>Timezone</span>
            <input className="input" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          </label>
          <label className="field">
            <span>Default source label</span>
            <input className="input" value={defaultSource} onChange={(event) => setDefaultSource(event.target.value)} />
          </label>
          <label className="field">
            <span>Canvas density</span>
            <select className="select" value={density} onChange={(event) => setDensity(event.target.value)}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="timeline-first">Timeline first</option>
            </select>
          </label>
          <button className="btn" type="button" onClick={saveProfile} disabled={updatePreference.isPending}>
            {updatePreference.isPending ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
            Save profile
          </button>
        </div>
        <div className="row between" style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border-faint)" }}>
          <span className="faint" style={{ fontSize: 12 }}>
            Local data
          </span>
          <DemoResetButton />
        </div>
      </section>

      <div className="stack">
        <section className="card pad-lg">
          <div className="section-head">
            <div className="block-title">
              <span className="ic">
                <KeyRound size={16} />
              </span>
              Model provider
            </div>
            <span className="chip">Stored on device</span>
          </div>

          <div className="seg" style={{ marginBottom: 16 }} aria-label="Provider kind">
            {providerKinds.map((providerKind) => (
              <button className="seg-btn" data-active={kind === providerKind} key={providerKind} type="button" onClick={() => selectKind(providerKind)}>
                {providerKind.replaceAll("_", " ")}
              </button>
            ))}
          </div>

          <div className="stack">
            <div className="grid-2">
              <label className="field">
                <span>Provider label</span>
                <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
              </label>
              <label className="field">
                <span>Base URL</span>
                <input className="input" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>API key</span>
              <input className="input" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste API key" />
            </label>
            <div className="grid-2">
              <label className="field">
                <span>Chat model</span>
                <input className="input" value={chatModel} onChange={(event) => setChatModel(event.target.value)} />
              </label>
              <label className="field">
                <span>Embedding model</span>
                <input className="input" value={embeddingModel} onChange={(event) => setEmbeddingModel(event.target.value)} />
              </label>
            </div>
            <div className="chip-row">
              {capabilities.map((capability) => (
                <button className={selectedCapabilities.includes(capability) ? "chip accent" : "chip"} key={capability} type="button" onClick={() => toggleCapability(capability)}>
                  {capability}
                </button>
              ))}
            </div>
            <button className="btn" type="button" onClick={saveProvider} disabled={!label.trim() || !apiKey.trim() || selectedCapabilities.length === 0 || upsert.isPending}>
              {upsert.isPending ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              Save API key
            </button>
          </div>
        </section>

        <section className="card pad-lg">
          <div className="kicker" style={{ marginBottom: 14 }}>
            Connected providers
          </div>
          {providers.isLoading ? (
            <span className="chip">
              <Loader2 size={13} className="spin" /> Loading
            </span>
          ) : providers.data?.length ? (
            <div className="stack">
              {providers.data.map((provider) => (
                <article className="provider-card" key={provider.id}>
                  <div className="row between">
                    <div className="grow">
                      <strong style={{ fontSize: 14 }}>{provider.label}</strong>
                      <p className="faint" style={{ fontSize: 12, marginTop: 2 }}>
                        {provider.kind.replaceAll("_", " ")} · {provider.apiKeyPreview}
                      </p>
                    </div>
                    <button
                      className="icon-btn sm danger"
                      type="button"
                      title={`Remove ${provider.label}`}
                      aria-label={`Remove ${provider.label}`}
                      onClick={() => removeProvider(provider.id, provider.label)}
                      disabled={deleteProvider.isPending}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="chip-row">
                    {provider.isDefault ? <span className="chip accent">default</span> : null}
                    {provider.capabilities.map((capability) => (
                      <span className="chip" key={capability}>
                        {capability}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No provider yet" icon={<KeyRound size={20} />}>
              Add an API key to unlock AI summaries, smart organization, and the adaptive canvas. Without one, Quipo still works using built-in rules.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
