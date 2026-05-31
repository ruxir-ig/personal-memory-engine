import { formatToolManifestForPrompt, formatToolSchemasForPrompt } from "./registry";
import type { LlmRedactionContext } from "@/client/vault/sanitize-for-llm";
import type { ToolId } from "./types";

export const AGENT_BASE_SYSTEM = `You are Quipu's memory assistant. Quipu is a quiet personal second brain.
Prefer grounded answers from the user's saved memory. Never invent facts.
When memory is insufficient, you may request optional tools by id — tool details are loaded only after you choose them.`;

export function buildPlanningSystemPrompt(customTools: Array<{ slug: string; name: string; summary: string; whenToUse: string }> = []) {
  return `${AGENT_BASE_SYSTEM}

Available tools (catalog only — parameters are not loaded until you select a tool):
${formatToolManifestForPrompt(customTools)}

Rules:
- Request tools only when they materially help answer the question.
- Do not request browser for questions fully answerable from saved memory.
- Request clock only when the user is asking what time/date it is; clientNow and userTimezone are already provided for tool arguments.
- Request calendar when the user asks to create a reminder, or asks about schedule, reminders, deadlines, or what's coming up.
- Request browser for saved links, live web pages, URLs, or external content missing from memory.
- Request ffmpeg when the user asks about an uploaded video/screen recording and you need metadata, frames, or audio.
- Request memory when the user asks to remember, save, capture, list, read, rename, edit, update, archive, pin, delete, forget, or remove saved memories/notes/links/files.
- Request tasks when the user asks to create, list, update, complete, cancel, delete, or remove todos/tasks/checklists/lists. Treat todos and lists as the same task surface.
- Request toolkit when the user asks to create/inspect/disable agent tools or use a custom: tool from the catalog.
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
      selectedToolIds: ["zero or more of: clock, calendar, browser, ffmpeg, memory, tasks, toolkit"],
      reasoning: "one short sentence on why",
    },
  };
}

export function buildToolInvocationSystemPrompt(selectedToolIds: ToolId[], customTools: Array<{ slug: string; name: string; summary: string; whenToUse: string; inputSchema: Record<string, unknown> }> = []) {
  const schemas = formatToolSchemasForPrompt(selectedToolIds);
  return `${AGENT_BASE_SYSTEM}

You selected tools. Provide concrete arguments for each tool using ONLY the schemas below.
For custom:${customTools.map((tool) => tool.slug).join(", ") || "none"}, call toolkit with action "run_tool" and the custom tool slug.
For calendar.create_reminder, convert relative dates using userTimezone and clientNow. Preserve explicit clock times: "before 10:49 PM today" means 22:49 local time converted to ISO. If the user says today, end of day, day ends, or EOD without a clock time, use 23:59 local time, not a morning default.
For memory.create, pass the sanitized user content in text. For memory.update or memory.delete, pass artifactId when known. If not known, pass a specific query; the tool will refuse ambiguous destructive changes.
For tasks.create, put multiple requested tasks in the items array in one call. For tasks.delete, pass itemId when known; otherwise pass query/status/listTitle and maxCount when the user gives an exact count.
Return valid JSON only.

Tool schemas:
${JSON.stringify(schemas, null, 2)}

Custom prompt-tools:
${JSON.stringify(customTools, null, 2)}`;
}

export function buildToolInvocationUserPayload(args: { question: string; selectedToolIds: ToolId[]; timezone: string; clientNow?: string }) {
  return {
    task: "Provide tool call arguments.",
    question: args.question,
    selectedToolIds: args.selectedToolIds,
    userTimezone: args.timezone,
    clientNow: args.clientNow,
    responseSchema: {
      tools: [{ toolId: "clock|calendar|browser|ffmpeg|memory|tasks|toolkit", arguments: {} }],
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
For memory tool updates/deletes, report exactly what changed or why it refused to change.
For toolkit run_tool output, follow the saved customTool.instructions using the provided input; mention that it is a saved local prompt-tool, not executed code.
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
