import { z } from "zod";
import { canvasLayoutSchema, memoryKindSchema, type CanvasLayout, type ProviderCapability, type ProviderKind } from "@pme/shared";

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
  kind: memoryKindSchema.optional(),
  space: z
    .object({
      title: z.string().min(1).max(48),
      icon: z.string().max(24).optional(),
      description: z.string().max(160).optional(),
    })
    .nullable()
    .default(null),
  structured: z
    .object({
      mediaTitle: z.string().max(180).optional(),
      author: z.string().max(80).optional(),
      language: z.string().max(40).optional(),
    })
    .partial()
    .nullable()
    .default(null),
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
  choices?: Array<{ message?: { content?: string | null } }>;
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
  const envMap: Array<[string, OpenAICompatibleProvider["kind"], string, string]> = [
    ["OPENAI_API_KEY", "openai", "OpenAI", "OPENAI_MODEL"],
    ["OPENROUTER_API_KEY", "openrouter", "OpenRouter", "OPENROUTER_MODEL"],
    ["GROQ_API_KEY", "groq", "Groq", "GROQ_MODEL"],
    ["CEREBRAS_API_KEY", "cerebras", "Cerebras", "CEREBRAS_MODEL"],
  ];
  for (const [keyEnv, kind, label, modelEnv] of envMap) {
    if (process.env[keyEnv]) {
      return {
        label,
        kind,
        apiKey: process.env[keyEnv]!,
        chatModel: process.env[modelEnv] || process.env.PME_LLM_MODEL || providerDefaults[kind]?.model,
        capabilities: ["chat"],
      };
    }
  }
  return null;
}

function getBaseUrl(provider: OpenAICompatibleProvider) {
  return (provider.baseUrl || providerDefaults[provider.kind]?.baseUrl || "").replace(/\/$/, "");
}

function getModel(provider: OpenAICompatibleProvider) {
  return provider.chatModel || providerDefaults[provider.kind]?.model || process.env.PME_LLM_MODEL || "gpt-4o-mini";
}

function parseJsonContent(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  return JSON.parse(fenced ?? trimmed) as unknown;
}

export async function callProviderChatJSON(args: {
  provider: OpenAICompatibleProvider;
  system: string;
  user: unknown;
  temperature?: number;
}): Promise<unknown> {
  const baseUrl = getBaseUrl(args.provider);
  const model = getModel(args.provider);
  if (!baseUrl) throw new Error("AI provider base URL is required");
  if (!model) throw new Error("AI provider chat model is required");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${args.provider.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: args.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: typeof args.user === "string" ? args.user : JSON.stringify(args.user) },
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
  return parseJsonContent(content);
}

export async function processMemoryWithProvider(args: {
  provider: OpenAICompatibleProvider;
  text: string;
  sourceLabel?: string;
  clientNow?: string;
  timezone?: string;
}): Promise<AiMemoryPacket> {
  const parsed = await callProviderChatJSON({
    provider: args.provider,
    temperature: 0.1,
    system:
      "You are Quipo's memory router. Quipo is a personal second brain where the user dumps links, reels, notes, code, and tasks. Return only valid JSON. Classify the input and extract structure grounded only in the input; never invent facts. Pick a short, human topic name for `space` (e.g. 'Watch later', 'Reading list', 'Career', 'Recipes'). Reminders and preferences must require user confirmation.",
    user: {
      task: "Convert this capture into a memory packet.",
      schema: {
        title: "short source-grounded title",
        kind: "one of: note,link,reel,video,article,post,credential,code,task,contact,place,image,file",
        space: { title: "short topic/collection name", icon: "optional lucide-style icon name", description: "optional one line" },
        structured: { mediaTitle: "optional real media/article title", author: "optional", language: "optional code language" },
        memorySummary: "concise factual summary grounded only in input",
        tags: ["short lowercase tags"],
        reminderProposal: { title: "", dueAt: "ISO datetime", timezone: "IANA tz", recurrence: "optional", confidence: 0.0, requiredConfirmation: true },
        eventProposal: { title: "", description: "optional", eventAt: "optional ISO", place: "optional", confidence: 0.0 },
        preferenceProposal: { category: "ui|capture|ranking|notifications|privacy|providers", key: "", value: "JSON value", rationale: "optional", confidence: 0.0 },
      },
      sourceLabel: args.sourceLabel,
      clientNow: args.clientNow,
      timezone: args.timezone,
      input: args.text,
    },
  });
  return aiMemoryPacketSchema.parse(parsed);
}

export type CanvasState = {
  displayName: string;
  localTime: string;
  partOfDay: string;
  counts: { items: number; spaces: number; reminders: number; pendingReview: number };
  spaces: Array<{ id: string; slug: string; title: string; accent: string; count: number }>;
  recentItems: Array<{ id: string; kind: string; title: string; spaceTitle?: string }>;
  preferences: Array<{ category: string; key: string; value: unknown }>;
  reelIds: string[];
  readingIds: string[];
  codeIds: string[];
  vaultCount: number;
  todayCount: number;
};

export async function generateCanvasWithProvider(args: {
  provider: OpenAICompatibleProvider;
  state: CanvasState;
}): Promise<CanvasLayout> {
  const parsed = await callProviderChatJSON({
    provider: args.provider,
    temperature: 0.6,
    system:
      "You design Quipo's home canvas: a calm, personalized 'second brain' dashboard arranged from a fixed catalog of blocks. Decide which blocks to show, their order, span, and a warm personalized title/subtitle for each, based only on what the user has saved, confirmed preferences, and the time of day. Surface what is most relevant right now (reminders due today, things to watch tonight, recent dumps, review queue). Never invent demo/example content. Only reference itemIds and spaceIds that exist in the provided state. Do not return an ask block; asking and saving both happen in the global composer. For a spaces block, include every provided space id unless there are more than 12. Write a short personal greeting. Return ONLY valid JSON matching the schema.",
    user: {
      blockCatalog: {
        spotlight: "a featured item or a short digest message (use note + itemIds[0] optional)",
        spaces: "grid of collections (spaceIds)",
        reel_strip: "horizontal strip of reels/videos to watch (itemIds)",
        vault: "keys & secrets summary (no itemIds needed)",
        today: "reminders and events due today (no itemIds)",
        recent: "latest captures (itemIds)",
        reading: "articles/links reading list (itemIds)",
        code_shelf: "saved code snippets (itemIds)",
        review: "pending items needing confirmation (no itemIds)",
      },
      spanGuidance: "span is one of '2','3','4','6' (6 = full width). Total layout reads top to bottom.",
      schema: {
        greetingTitle: "short greeting, may use the name",
        greetingSubtitle: "one line about what's worth attention now",
        blocks: [{ id: "kebab-id", type: "catalog key", title: "", subtitle: "optional", span: "3", itemIds: [], spaceIds: [], suggestions: [], note: "optional" }],
      },
      state: args.state,
    },
  });
  const withMeta = {
    generatedAt: new Date().toISOString(),
    generatedBy: "ai" as const,
    model: getModel(args.provider),
    ...(parsed as Record<string, unknown>),
  };
  return canvasLayoutSchema.parse(withMeta);
}

const aiAnswerSchema = z.object({
  answer: z.string().min(1).max(1400),
  citations: z.array(z.string().min(1)).max(8).default([]),
  uncertainty: z.string().max(300).optional(),
});

export type AnswerCandidate = {
  chunkId: string;
  artifactId: string;
  title: string;
  source?: string;
  text: string;
  artifactKind?: string;
  artifactType?: string;
};

export type GroundedAnswer = {
  answer: string;
  citedChunkIds: string[];
  uncertainty?: string;
};

export async function answerMemoryWithProvider(args: {
  provider: OpenAICompatibleProvider;
  question: string;
  candidates: AnswerCandidate[];
}): Promise<GroundedAnswer> {
  const parsed = await callProviderChatJSON({
    provider: args.provider,
    temperature: 0.2,
    system:
      "You are Quipo's memory answerer. Answer the user's question using ONLY the candidate memories they previously saved. Never use outside knowledge and never invent facts. If the candidates do not contain the answer, say plainly that it is not in their saved memory. Keep the answer concise (1-4 sentences) and conversational. Cite by returning the `id` of every candidate you actually relied on in `citations`. Return ONLY valid JSON matching the schema.",
    user: {
      question: args.question,
      candidates: args.candidates.map((candidate) => ({
        id: candidate.chunkId,
        title: candidate.title,
        source: candidate.source,
        text: candidate.text.slice(0, 700),
      })),
      schema: {
        answer: "concise answer grounded only in the candidates; if unknown, say it is not in saved memory",
        citations: ["candidate id you actually used"],
        uncertainty: "optional one line on confidence or what is missing",
      },
    },
  });
  const result = aiAnswerSchema.parse(parsed);
  return {
    answer: result.answer.trim(),
    citedChunkIds: result.citations,
    uncertainty: result.uncertainty?.trim() || undefined,
  };
}
