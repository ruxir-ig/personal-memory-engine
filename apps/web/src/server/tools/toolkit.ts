import { getAgentToolForRun, listAgentTools, setAgentToolEnabled, upsertAgentTool } from "@/server/data/agent-workspace";
import type { ToolkitToolArgs, ToolContext, ToolResult } from "./types";

function requireField(value: string | undefined, field: string) {
  if (!value?.trim()) throw new Error(`Provide ${field}`);
  return value.trim();
}

export async function runToolkitTool(args: ToolkitToolArgs, _context: ToolContext): Promise<ToolResult> {
  try {
    if (args.action === "list_tools") {
      const tools = await listAgentTools();
      return { toolId: "toolkit", ok: true, summary: `Found ${tools.length} agent tool${tools.length === 1 ? "" : "s"}.`, data: { tools } };
    }
    if (args.action === "create_tool" || args.action === "update_tool") {
      const tool = await upsertAgentTool({
        toolId: args.toolId,
        name: requireField(args.name, "name"),
        summary: requireField(args.summary, "summary"),
        whenToUse: requireField(args.whenToUse, "whenToUse"),
        instructions: requireField(args.instructions, "instructions"),
        inputSchema: args.inputSchema,
        enabled: true,
      });
      return { toolId: "toolkit", ok: true, summary: `Saved agent tool: ${tool.name}.`, data: { tool } };
    }
    if (args.action === "disable_tool" || args.action === "enable_tool") {
      const tool = await setAgentToolEnabled({ toolId: args.toolId, slug: args.slug, enabled: args.action === "enable_tool" });
      return { toolId: "toolkit", ok: true, summary: `${tool.enabled ? "Enabled" : "Disabled"} agent tool: ${tool.name}.`, data: { tool } };
    }
    if (args.action === "run_tool") {
      const tool = await getAgentToolForRun({ toolId: args.toolId, slug: args.slug, input: args.input });
      return { toolId: "toolkit", ok: true, summary: `Loaded custom tool instructions: ${tool.name}.`, data: { customTool: tool } };
    }
    return { toolId: "toolkit", ok: false, summary: `Unsupported toolkit action: ${args.action}.`, data: { args } };
  } catch (error) {
    return { toolId: "toolkit", ok: false, summary: "Agent toolkit failed.", data: { args }, error: error instanceof Error ? error.message : "Unknown toolkit error" };
  }
}
