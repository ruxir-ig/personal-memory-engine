import { formatToolManifestForPrompt, formatToolSchemasForPrompt } from "./registry";
import type { LlmRedactionContext } from "@/client/vault/sanitize-for-llm";
import type { ToolId } from "./types";

export const AGENT_BASE_SYSTEM = `You are Quipo's memory assistant. Quipo is a quiet personal second brain.
Prefer grounded answers from the user's saved memory. Never invent facts.
When memory is insufficient, you may request optional tools by id — tool details are loaded only after you choose them.`;

export function buildPlanningSystemPrompt() {
  return `${AGENT_BASE_SYSTEM}

Available tools (catalog only — parameters are not loaded until you select a tool):
${formatToolManifestForPrompt()}

Rules:
- Request tools only when they materially help answer the question.
- Do not request browser for questions fully answerable from saved memory.
- Request clock for relative time questions (today, tomorrow, now, this week).
- Request calendar for schedule, reminders, deadlines, or what's coming up.
- Request browser for saved links, live web pages, URLs, or external content missing from memory.
- Request ffmpeg when the user asks about an uploaded video/screen recording and you need metadata, frames, or audio.
- You may select multiple tools if needed, up to 3.
- If saved memory already contains a strong answer, answer without tools.`;
}

export function buildPlanningUserPayload(args: {
  question: string;
  memoryPreview: Array<{ id: string; artifactId?: string; artifactKind?: string; artifactType?: string; title: string; excerpt: string; score?: number }>;
  timezone: string;
  clientNow?: string;
  encryptedCredentialsDetected?: LlmRedactionContext;
}) {
  return {
    task: "Decide whether to answer from saved memory alone or request tools first.",
    question: args.question,
    userTimezone: args.timezone,
    clientNow: args.clientNow,
    ...args.encryptedCredentialsDetected,
    retrievedMemories: args.memoryPreview,
    responseSchema: {
      action: "answer_from_memory | use_tools",
      selectedToolIds: ["zero or more of: clock, calendar, browser, ffmpeg"],
      reasoning: "one short sentence on why",
    },
  };
}

export function buildToolInvocationSystemPrompt(selectedToolIds: ToolId[]) {
  const schemas = formatToolSchemasForPrompt(selectedToolIds);
  return `${AGENT_BASE_SYSTEM}

You selected tools. Provide concrete arguments for each tool using ONLY the schemas below.
Return valid JSON only.

Tool schemas:
${JSON.stringify(schemas, null, 2)}`;
}

export function buildToolInvocationUserPayload(args: { question: string; selectedToolIds: ToolId[]; timezone: string; clientNow?: string }) {
  return {
    task: "Provide tool call arguments.",
    question: args.question,
    selectedToolIds: args.selectedToolIds,
    userTimezone: args.timezone,
    clientNow: args.clientNow,
    responseSchema: {
      tools: [{ toolId: "clock|calendar|browser|ffmpeg", arguments: {} }],
    },
  };
}

export function buildFinalAnswerSystemPrompt() {
  return `${AGENT_BASE_SYSTEM}

Synthesize a final answer for the user.
Use saved memory as the primary source of truth. Tool output supplements memory when present.
If tool output contradicts memory about the user's own life, prefer memory.
If browser or ffmpeg output provides external or media facts, cite them plainly without pretending they were saved before.
For ffmpeg frame extraction, describe what was extracted and note limits if you cannot literally see the frames yet.
Keep the answer concise (1-5 sentences) and conversational.
Return ONLY valid JSON matching the schema.`;
}

export function buildFinalAnswerUserPayload(args: {
  question: string;
  encryptedCredentialsDetected?: LlmRedactionContext;
  candidates: Array<{ id: string; title: string; source?: string; text: string }>;
  toolResults: Array<{ toolId: string; ok: boolean; summary: string; data: Record<string, unknown> }>;
}) {
  return {
    question: args.question,
    ...args.encryptedCredentialsDetected,
    candidates: args.candidates,
    toolResults: args.toolResults,
    schema: {
      answer: "final user-facing answer",
      citations: ["candidate ids actually used from memory"],
      uncertainty: "optional one line on confidence or gaps",
      toolsUsed: ["tool ids that influenced the answer"],
    },
  };
}
