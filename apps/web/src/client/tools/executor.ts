import { runBrowserTool } from "./browser";
import { runCalendarTool } from "./calendar";
import { runClockTool } from "./clock";
import { runFfmpegTool } from "./ffmpeg";
import {
  browserArgsSchema,
  calendarArgsSchema,
  clockArgsSchema,
  ffmpegArgsSchema,
  type ToolContext,
  type ToolId,
  type ToolResult,
} from "./types";

export async function executeTool(id: ToolId, rawArgs: unknown, context: ToolContext): Promise<ToolResult> {
  switch (id) {
    case "clock": {
      const parsed = clockArgsSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        return invalidArgs(id, rawArgs, parsed.error.issues.map((issue) => issue.message).join("; "));
      }
      return runClockTool(parsed.data, context);
    }
    case "calendar": {
      const parsed = calendarArgsSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        return invalidArgs(id, rawArgs, parsed.error.issues.map((issue) => issue.message).join("; "));
      }
      return runCalendarTool(parsed.data, context);
    }
    case "browser": {
      const parsed = browserArgsSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        return invalidArgs(id, rawArgs, parsed.error.issues.map((issue) => issue.message).join("; "));
      }
      return runBrowserTool(parsed.data);
    }
    case "ffmpeg": {
      const parsed = ffmpegArgsSchema.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        return invalidArgs(id, rawArgs, parsed.error.issues.map((issue) => issue.message).join("; "));
      }
      return runFfmpegTool(parsed.data);
    }
    default:
      return {
        toolId: id,
        ok: false,
        summary: `Unknown tool ${id}.`,
        data: {},
        error: "Tool not registered",
      };
  }
}

function invalidArgs(id: ToolId, rawArgs: unknown, error: string): ToolResult {
  return {
    toolId: id,
    ok: false,
    summary: `Invalid arguments for ${id}.`,
    data: { rawArgs },
    error,
  };
}
