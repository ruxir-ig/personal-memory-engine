import { randomUUID } from "node:crypto";
import type { ModelProviderRecord, ProviderInput } from "@pme/shared";
import { getEnvProvider, type OpenAICompatibleProvider } from "@/server/ai/provider";
import { type MemoryData, type StoredProvider, now, providerForClient, readData, writeData } from "./store";

export function getDefaultAiProvider(data: MemoryData): OpenAICompatibleProvider | null {
  const stored =
    data.providers.find((provider) => provider.isDefault && provider.capabilities.includes("chat")) ??
    data.providers.find((provider) => provider.capabilities.includes("chat"));
  if (stored) {
    return {
      label: stored.label,
      kind: stored.kind,
      baseUrl: stored.baseUrl,
      apiKey: stored.apiKey,
      chatModel: stored.chatModel,
      capabilities: stored.capabilities,
    };
  }
  return getEnvProvider();
}

export async function listProviders(): Promise<ModelProviderRecord[]> {
  const data = await readData();
  return data.providers.map(providerForClient);
}

export async function upsertProvider(input: ProviderInput): Promise<ModelProviderRecord> {
  const data = await readData();
  const existing = input.id ? data.providers.find((provider) => provider.id === input.id) : undefined;
  if (input.isDefault) {
    data.providers.forEach((provider) => {
      provider.isDefault = false;
    });
  }
  const apiKeyPreview = input.apiKey.length > 8 ? `${input.apiKey.slice(0, 4)}...${input.apiKey.slice(-4)}` : "stored";
  if (existing) {
    Object.assign(existing, {
      label: input.label,
      kind: input.kind,
      baseUrl: input.baseUrl || undefined,
      apiKey: input.apiKey,
      apiKeyPreview,
      apiKeyStored: true,
      chatModel: input.chatModel,
      embeddingModel: input.embeddingModel,
      capabilities: input.capabilities,
      isDefault: input.isDefault,
      updatedAt: now(),
    });
    await writeData(data);
    return providerForClient(existing);
  }
  const provider: StoredProvider = {
    id: randomUUID(),
    label: input.label,
    kind: input.kind,
    baseUrl: input.baseUrl || undefined,
    apiKey: input.apiKey,
    apiKeyPreview,
    apiKeyStored: true,
    chatModel: input.chatModel,
    embeddingModel: input.embeddingModel,
    capabilities: input.capabilities,
    isDefault: input.isDefault || data.providers.length === 0,
    createdAt: now(),
    updatedAt: now(),
  };
  data.providers.push(provider);
  await writeData(data);
  return providerForClient(provider);
}

export async function deleteProvider(providerId: string): Promise<{ id: string }> {
  const data = await readData();
  const removedProvider = data.providers.find((provider) => provider.id === providerId);
  data.providers = data.providers.filter((provider) => provider.id !== providerId);
  if (removedProvider?.isDefault && data.providers.length > 0 && !data.providers.some((provider) => provider.isDefault)) {
    data.providers[0]!.isDefault = true;
    data.providers[0]!.updatedAt = now();
  }
  await writeData(data);
  return { id: providerId };
}
