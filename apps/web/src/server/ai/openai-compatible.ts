import { z } from "zod";
import type { ProviderCapability, ProviderKind } from "@pme/shared";

export type OpenAICompatibleProvider = {
  label: string;
  kind: ProviderKind;
  baseUrl?: string;
  apiKey: string;
  chatModel?: string;
  capabilities: ProviderCapability[];
};

export const aiMemoryPacketSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  memorySummary: z.string().min(1).max(900),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  reminderProposal: z
    .object({
      title: z.string().min(1).max(180),
      dueAt: z.string().datetime(),
      timezone: z.string().min(1).max(120).optional(),
      recurrence: z.string().max(120).optional(),
      confidence: z.number().min(0).max(1).default(0.75),
      requiredConfirmation: z.boolean().default(true),
    })
    .nullable()
    .default(null),
  eventProposal: z
    .object({
      title: z.string().min(1).max(180),
      description: z.string().max(700).optional(),
      eventAt: z.string().datetime().optional(),
      place: z.string().max(160).optional(),
      confidence: z.number().min(0).max(1).default(0.7),
    })
    .nullable()
    .default(null),
  preferenceProposal: z
    .object({
      category: z.enum(["ui", "capture", "ranking", "notifications", "privacy", "providers"]),
      key: z.string().min(1).max(80),
      value: z.unknown(),
      rationale: z.string().max(500).optional(),
      confidence: z.number().min(0).max(1).default(0.7),
    })
    .nullable()
    .default(null),
});

export type AiMemoryPacket = z.infer<typeof aiMemoryPacketSchema>;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

const providerDefaults: Partial<Record<ProviderKind, { baseUrl: string; model: string }>> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.1-8b-instant" },
  cerebras: { baseUrl: "https://api.cerebras.ai/v1", model: "llama3.1-8b" },
  custom_openai_compatible: { baseUrl: "", model: "gpt-4o-mini" },
};

export function getEnvProvider(): OpenAICompatibleProvider | null {
  const genericKey = process.env.PME_LLM_API_KEY;
  if (genericKey) {
    return {
      label: process.env.PME_LLM_LABEL || "Environment LLM",
      kind: "custom_openai_compatible",
      baseUrl: process.env.PME_LLM_BASE_URL || "https://api.openai.com/v1",
      apiKey: genericKey,
      chatModel: process.env.PME_LLM_MODEL || "gpt-4o-mini",
      capabilities: ["chat"],
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      label: "OpenAI",
      kind: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      chatModel: process.env.OPENAI_MODEL || process.env.PME_LLM_MODEL || providerDefaults.openai?.model,
      capabilities: ["chat"],
    };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return {
      label: "OpenRouter",
      kind: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      chatModel: process.env.OPENROUTER_MODEL || process.env.PME_LLM_MODEL || providerDefaults.openrouter?.model,
      capabilities: ["chat"],
    };
  }

  if (process.env.GROQ_API_KEY) {
    return {
      label: "Groq",
      kind: "groq",
      apiKey: process.env.GROQ_API_KEY,
      chatModel: process.env.GROQ_MODEL || process.env.PME_LLM_MODEL || providerDefaults.groq?.model,
      capabilities: ["chat"],
    };
  }

  if (process.env.CEREBRAS_API_KEY) {
    return {
      label: "Cerebras",
      kind: "cerebras",
      apiKey: process.env.CEREBRAS_API_KEY,
      chatModel: process.env.CEREBRAS_MODEL || process.env.PME_LLM_MODEL || providerDefaults.cerebras?.model,
      capabilities: ["chat"],
    };
  }

  return null;
}

function getBaseUrl(provider: OpenAICompatibleProvider) {
  return provider.baseUrl || providerDefaults[provider.kind]?.baseUrl || "";
}

function getModel(provider: OpenAICompatibleProvider) {
  return provider.chatModel || providerDefaults[provider.kind]?.model || process.env.PME_LLM_MODEL || "gpt-4o-mini";
}

function parseJsonContent(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  return JSON.parse(fenced ?? trimmed) as unknown;
}

export async function processMemoryWithProvider(args: {
  provider: OpenAICompatibleProvider;
  text: string;
  sourceLabel?: string;
  clientNow?: string;
  timezone?: string;
}): Promise<AiMemoryPacket> {
  const baseUrl = getBaseUrl(args.provider).replace(/\/$/, "");
  const model = getModel(args.provider);
  if (!baseUrl) throw new Error("AI provider base URL is required");
  if (!model) throw new Error("AI provider chat model is required");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Quipu's intent router. Return only valid JSON. Extract memory structure from the user's input without inventing facts. Create reminders, events, and preference proposals only when the input supports them. Reminders and preferences must require user confirmation.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Convert this capture into a memory packet.",
            schema: {
              title: "short source-grounded title",
              memorySummary: "concise factual summary grounded only in input",
              tags: ["short lowercase tags"],
              reminderProposal: {
                title: "reminder title",
                dueAt: "ISO datetime with timezone offset or Z",
                timezone: "IANA timezone if known",
                recurrence: "optional recurrence text",
                confidence: 0.0,
                requiredConfirmation: true,
              },
              eventProposal: {
                title: "event/context title",
                description: "optional details",
                eventAt: "optional ISO datetime",
                place: "optional place",
                confidence: 0.0,
              },
              preferenceProposal: {
                category: "ui | capture | ranking | notifications | privacy | providers",
                key: "stable preference key",
                value: "JSON value",
                rationale: "why this is a preference",
                confidence: 0.0,
              },
            },
            sourceLabel: args.sourceLabel,
            clientNow: args.clientNow,
            timezone: args.timezone,
            input: args.text,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI provider failed (${response.status}): ${body.slice(0, 240)}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned an empty response");
  return aiMemoryPacketSchema.parse(parseJsonContent(content));
}
