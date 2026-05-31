import { captureText, deleteMemoryItem, listMemoryItems, readMemoryItem, updateMemoryItem } from "@/client/memory/repository";
import type { MemoryToolArgs, ToolContext, ToolResult } from "./types";

export async function runMemoryTool(args: MemoryToolArgs, _context: ToolContext): Promise<ToolResult> {
  try {
    if (args.action === "create") {
      const text = args.text?.trim() || args.query?.trim();
      if (!text) throw new Error("Provide text for create");
      const captured = await captureText({
        text,
        sourceLabel: args.sourceLabel ?? "chat",
        shouldSummarize: true,
        clientNow: _context.clientNow,
        timezone: _context.timezone,
      });
      return { toolId: "memory", ok: true, summary: `Saved memory: ${captured.artifact.title}.`, data: { captured } };
    }

    if (args.action === "list") {
      const items = await listMemoryItems({
        query: args.query,
        limit: args.limit,
        includeArchived: args.includeArchived,
      });
      return { toolId: "memory", ok: true, summary: `Found ${items.length} saved memor${items.length === 1 ? "y" : "ies"}.`, data: { items } };
    }

    if (args.action === "read") {
      const item = await readMemoryItem({ artifactId: args.artifactId, query: args.query });
      return { toolId: "memory", ok: true, summary: `Read memory: ${item.artifact.title}.`, data: { item } };
    }

    if (args.action === "update") {
      const item = await updateMemoryItem({
        artifactId: args.artifactId,
        query: args.query,
        title: args.title,
        summary: args.summary,
        text: args.text,
        sourceLabel: args.sourceLabel,
        tags: args.tags,
        pinned: args.pinned,
        archived: args.archived,
      });
      return { toolId: "memory", ok: true, summary: `Updated memory: ${item.artifact.title}.`, data: { item } };
    }

    if (args.action === "delete") {
      const deleted = await deleteMemoryItem({ artifactId: args.artifactId, query: args.query });
      return { toolId: "memory", ok: true, summary: `Deleted memory: ${deleted.title}.`, data: { deleted } };
    }

    return { toolId: "memory", ok: false, summary: `Unsupported memory action: ${args.action}.`, data: { args } };
  } catch (error) {
    return {
      toolId: "memory",
      ok: false,
      summary: "Memory tool failed.",
      data: { args },
      error: error instanceof Error ? error.message : "Unknown memory tool error",
    };
  }
}
