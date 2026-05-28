"use client";

import { KeyRound, Loader2, Save, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PreferenceRecord, ProviderCapability, ProviderKind } from "@pme/shared";
import { trpc } from "@/trpc/client";
import { EmptyState } from "./empty-state";

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
  const utils = trpc.useUtils();
  const providers = trpc.provider.list.useQuery();
  const preferences = trpc.preference.list.useQuery();
  const upsert = trpc.provider.upsert.useMutation({
    onSuccess: async () => {
      setApiKey("");
      await Promise.all([utils.provider.list.invalidate(), utils.dashboard.snapshot.invalidate()]);
    },
  });
  const deleteProvider = trpc.provider.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.provider.list.invalidate(), utils.dashboard.snapshot.invalidate()]);
    },
  });
  const updatePreference = trpc.preference.update.useMutation({
    onSuccess: () => utils.preference.list.invalidate(),
  });

  const storedProfile = useMemo(
    () => ({
      displayName: valueAsString(preferenceValue(preferences.data, "ui", "displayName"), "Ruxir"),
      timezone: valueAsString(
        preferenceValue(preferences.data, "notifications", "timezone"),
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ),
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
    setSelectedCapabilities((current) =>
      current.includes(capability) ? current.filter((item) => item !== capability) : [...current, capability],
    );
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
    await upsert.mutateAsync({
      label,
      kind,
      baseUrl,
      apiKey,
      chatModel,
      embeddingModel,
      capabilities: selectedCapabilities,
      isDefault: providers.data?.length === 0,
    });
  }

  async function removeProvider(providerId: string, providerLabel: string) {
    if (!window.confirm(`Remove ${providerLabel} and delete its stored API key?`)) return;
    await deleteProvider.mutateAsync({ id: providerId });
  }

  return (
    <div className="settings-layout">
      <section className="surface section-pad profile-panel">
        <div className="settings-section-head">
          <div>
            <div className="page-kicker">User profile</div>
            <h2>Local identity</h2>
          </div>
          <span className="settings-icon">
            <UserRound size={20} />
          </span>
        </div>

        <div className="profile-avatar" aria-hidden="true">
          {displayName.trim().slice(0, 1).toUpperCase() || "Q"}
        </div>

        <div className="settings-form">
          <label>
            <span>Display name</span>
            <input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>
            <span>Timezone</span>
            <input className="input" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          </label>
          <label>
            <span>Default source label</span>
            <input className="input" value={defaultSource} onChange={(event) => setDefaultSource(event.target.value)} />
          </label>
          <label>
            <span>Canvas density</span>
            <select className="select" value={density} onChange={(event) => setDensity(event.target.value)}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="timeline-first">Timeline first</option>
            </select>
          </label>
        </div>

        <button className="button" type="button" onClick={saveProfile} disabled={updatePreference.isPending}>
          {updatePreference.isPending ? <Loader2 size={16} /> : <Save size={16} />}
          Save profile
        </button>
      </section>

      <section className="surface section-pad provider-panel">
        <div className="settings-section-head">
          <div>
            <div className="page-kicker">API keys</div>
            <h2>Model provider</h2>
          </div>
          <span className="settings-icon">
            <KeyRound size={20} />
          </span>
        </div>

        <div className="provider-tabs" aria-label="Provider kind">
          {providerKinds.map((providerKind) => (
            <button
              className={kind === providerKind ? "provider-tab active" : "provider-tab"}
              key={providerKind}
              type="button"
              onClick={() => selectKind(providerKind)}
            >
              {providerKind.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        <div className="settings-form">
          <div className="grid-two">
            <label>
              <span>Provider label</span>
              <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>
            <label>
              <span>Base URL</span>
              <input className="input" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
            </label>
          </div>
          <label>
            <span>API key</span>
            <input
              className="input"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Paste API key"
            />
          </label>
          <div className="grid-two">
            <label>
              <span>Chat model</span>
              <input className="input" value={chatModel} onChange={(event) => setChatModel(event.target.value)} />
            </label>
            <label>
              <span>Embedding model</span>
              <input className="input" value={embeddingModel} onChange={(event) => setEmbeddingModel(event.target.value)} />
            </label>
          </div>
          <div className="pill-row">
            {capabilities.map((capability) => (
              <button
                className={selectedCapabilities.includes(capability) ? "pill accent" : "pill"}
                key={capability}
                type="button"
                onClick={() => toggleCapability(capability)}
              >
                {capability}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar">
          <button
            className="button"
            type="button"
            onClick={saveProvider}
            disabled={!label.trim() || !apiKey.trim() || selectedCapabilities.length === 0 || upsert.isPending}
          >
            {upsert.isPending ? <Loader2 size={16} /> : <Save size={16} />}
            Save API key
          </button>
          <span className="pill amber">Stored locally in v0</span>
        </div>
      </section>

      <section className="surface section-pad configured-panel">
        <div className="settings-section-head">
          <div>
            <div className="page-kicker">Connected providers</div>
            <h2>Current keys</h2>
          </div>
        </div>
        {providers.isLoading ? (
          <span className="pill">
            <Loader2 size={13} /> Loading providers
          </span>
        ) : providers.data?.length ? (
          <div className="provider-list">
            {providers.data.map((provider) => (
              <article className="provider-card" key={provider.id}>
                <div className="provider-card-head">
                  <div>
                    <h3>{provider.label}</h3>
                    <p>{provider.kind.replaceAll("_", " ")} · {provider.apiKeyPreview}</p>
                  </div>
                  <button
                    className="icon-button danger"
                    type="button"
                    title={`Remove ${provider.label}`}
                    aria-label={`Remove ${provider.label} API key`}
                    onClick={() => removeProvider(provider.id, provider.label)}
                    disabled={deleteProvider.isPending}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {provider.isDefault ? <span className="pill accent">default</span> : null}
                <div className="pill-row">
                  {provider.capabilities.map((capability) => (
                    <span className="pill" key={capability}>
                      {capability}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>No API provider configured yet.</EmptyState>
        )}
      </section>
    </div>
  );
}
