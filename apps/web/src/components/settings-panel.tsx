"use client";

import { KeyRound, Loader2, Save } from "lucide-react";
import { useState } from "react";
import type { ProviderCapability, ProviderKind } from "@pme/shared";
import { trpc } from "@/trpc/client";
import { EmptyState } from "./empty-state";

const providerKinds: ProviderKind[] = [
  "openai",
  "openrouter",
  "groq",
  "cerebras",
  "google",
  "anthropic",
  "custom_openai_compatible",
];

const capabilities: ProviderCapability[] = ["chat", "embedding", "vision", "transcription", "rerank"];

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
  const updatePreference = trpc.preference.update.useMutation({
    onSuccess: () => utils.preference.list.invalidate(),
  });
  const [label, setLabel] = useState("OpenRouter");
  const [kind, setKind] = useState<ProviderKind>("openrouter");
  const [baseUrl, setBaseUrl] = useState("https://openrouter.ai/api/v1");
  const [apiKey, setApiKey] = useState("");
  const [chatModel, setChatModel] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [selectedCapabilities, setSelectedCapabilities] = useState<ProviderCapability[]>(["chat"]);
  const [density, setDensity] = useState("compact");

  function toggleCapability(capability: ProviderCapability) {
    setSelectedCapabilities((current) =>
      current.includes(capability) ? current.filter((item) => item !== capability) : [...current, capability],
    );
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

  async function saveDensity() {
    await updatePreference.mutateAsync({
      category: "ui",
      key: "density",
      value: density,
      requiresConfirmation: false,
    });
  }

  return (
    <div className="grid-dashboard">
      <section className="surface section-pad">
        <div className="card-title-row" style={{ marginBottom: 14 }}>
          <div>
            <div className="page-kicker">Model providers</div>
            <h2 className="card-title" style={{ fontSize: 20 }}>
              API keys are explicit
            </h2>
          </div>
          <KeyRound size={18} />
        </div>
        <div className="card-list">
          <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Provider label" />
          <select className="select" value={kind} onChange={(event) => setKind(event.target.value as ProviderKind)}>
            {providerKinds.map((providerKind) => (
              <option value={providerKind} key={providerKind}>
                {providerKind.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <input
            className="input"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="Base URL, optional for native providers"
          />
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="API key"
          />
          <div className="grid-two">
            <input
              className="input"
              value={chatModel}
              onChange={(event) => setChatModel(event.target.value)}
              placeholder="Chat model"
            />
            <input
              className="input"
              value={embeddingModel}
              onChange={(event) => setEmbeddingModel(event.target.value)}
              placeholder="Embedding model"
            />
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
          <div className="toolbar">
            <button
              className="button"
              type="button"
              onClick={saveProvider}
              disabled={!label.trim() || !apiKey.trim() || selectedCapabilities.length === 0 || upsert.isPending}
            >
              {upsert.isPending ? <Loader2 size={16} /> : <Save size={16} />}
              Save provider
            </button>
            <span className="pill amber">V0 stores keys unencrypted locally</span>
          </div>
        </div>
      </section>

      <div className="card-list">
        <section className="surface section-pad">
          <div className="page-kicker" style={{ marginBottom: 12 }}>
            Configured providers
          </div>
          {providers.isLoading ? (
            <span className="pill">
              <Loader2 size={13} /> Loading providers
            </span>
          ) : providers.data?.length ? (
            <div className="card-list">
              {providers.data.map((provider) => (
                <article className="memory-card" key={provider.id}>
                  <div className="card-title-row">
                    <div>
                      <h2 className="card-title">{provider.label}</h2>
                      <p className="card-copy">
                        {provider.kind.replaceAll("_", " ")} · {provider.apiKeyPreview}
                      </p>
                    </div>
                    {provider.isDefault ? <span className="pill accent">default</span> : null}
                  </div>
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
            <EmptyState>No model provider configured yet.</EmptyState>
          )}
        </section>

        <section className="surface section-pad">
          <div className="page-kicker" style={{ marginBottom: 12 }}>
            Preferences
          </div>
          <div className="card-list">
            <label className="card-copy" htmlFor="density">
              Dashboard density
            </label>
            <select id="density" className="select" value={density} onChange={(event) => setDensity(event.target.value)}>
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="timeline-first">Timeline first</option>
            </select>
            <button className="button secondary" type="button" onClick={saveDensity} disabled={updatePreference.isPending}>
              <Save size={16} />
              Save preference
            </button>
            <div className="pill-row">
              {(preferences.data ?? []).map((preference) => (
                <span className="pill" key={preference.id}>
                  {preference.category}:{preference.key}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
