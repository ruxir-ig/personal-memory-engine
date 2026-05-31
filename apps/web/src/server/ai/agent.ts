import { z } from "zod";
import { callProviderChatJSON, type AnswerCandidate, type OpenAICompatibleProvider } from "./provider";
import { executeTool } from "@/server/tools/executor";
import {
  buildFinalAnswerSystemPrompt,
  buildFinalAnswerUserPayload,
  buildPlanningSystemPrompt,
  buildPlanningUserPayload,
  buildToolInvocationSystemPrompt,
  buildToolInvocationUserPayload,
} from "@/server/tools/prompts";
import { toolIdSchema, type ToolContext, type ToolId, type ToolResult } from "@/server/tools/types";

const agentPlanSchema = z.object({
  action: z.enum(["answer_from_memory", "use_tools"]),
  selectedToolIds: z.array(toolIdSchema).max(3).default([]),
  reasoning: z.string().max(500).default(""),
});

const toolInvocationBatchSchema = z.object({
  tools: z
    .array(
      z.object({
        toolId: toolIdSchema,
        arguments: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .max(3)
    .default([]),
});

const agentFinalAnswerSchema = z.object({
  answer: z.string().min(1).max(1800),
  citations: z.array(z.string().min(1)).max(8).default([]),
  uncertainty: z.string().max(400).optional(),
  toolsUsed: z.array(toolIdSchema).max(3).default([]),
});

export type AgentAnswer = {
  answer: string;
  citedChunkIds: string[];
  uncertainty?: string;
  toolsUsed: ToolId[];
  toolResults: ToolResult[];
};

export async function askMemoryWithAgent(args: {
  provider: OpenAICompatibleProvider;
  question: string;
  candidates: AnswerCandidate[];
  timezone?: string;
  clientNow?: string;
}): Promise<AgentAnswer> {
  const timezone = args.timezone || "UTC";
  const context: ToolContext = { timezone, clientNow: args.clientNow };

  const memoryPreview = args.candidates.map((candidate, index) => ({
    id: candidate.chunkId,
    artifactId: candidate.artifactId,
    artifactKind: candidate.artifactKind,
    artifactType: candidate.artifactType,
    title: candidate.title,
    excerpt: candidate.text.slice(0, 220),
    score: index === 0 ? 1 : undefined,
  }));

  const planRaw = await callProviderChatJSON({
    provider: args.provider,
    temperature: 0.1,
    system: buildPlanningSystemPrompt(),
    user: buildPlanningUserPayload({
      question: args.question,
      memoryPreview,
      timezone,
      clientNow: args.clientNow,
    }),
  });
  const plan = agentPlanSchema.parse(planRaw);

  let toolResults: ToolResult[] = [];
  if (plan.action === "use_tools" && plan.selectedToolIds.length > 0) {
    const invocationRaw = await callProviderChatJSON({
      provider: args.provider,
      temperature: 0.1,
      system: buildToolInvocationSystemPrompt(plan.selectedToolIds),
      user: buildToolInvocationUserPayload({
        question: args.question,
        selectedToolIds: plan.selectedToolIds,
        timezone,
        clientNow: args.clientNow,
      }),
    });
    const invocations = toolInvocationBatchSchema.parse(invocationRaw);
    for (const call of invocations.tools) {
      toolResults.push(await executeTool(call.toolId, call.arguments, context));
    }
  }

  const finalRaw = await callProviderChatJSON({
    provider: args.provider,
    temperature: 0.2,
    system: buildFinalAnswerSystemPrompt(),
    user: buildFinalAnswerUserPayload({
      question: args.question,
      candidates: args.candidates.map((candidate) => ({
        id: candidate.chunkId,
        title: candidate.title,
        source: candidate.source,
        text: candidate.text.slice(0, 900),
      })),
      toolResults: toolResults.map((result) => ({
        toolId: result.toolId,
        ok: result.ok,
        summary: result.summary,
        data: result.data,
      })),
    }),
  });
  const finalAnswer = agentFinalAnswerSchema.parse(finalRaw);

  return {
    answer: finalAnswer.answer.trim(),
    citedChunkIds: finalAnswer.citations,
    uncertainty: finalAnswer.uncertainty?.trim() || undefined,
    toolsUsed: finalAnswer.toolsUsed,
    toolResults,
  };
}
