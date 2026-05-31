import type { ClockArgs, ToolContext, ToolResult } from "./types";

function formatLocalTime(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
  return formatter.format(date);
}

export async function runClockTool(args: ClockArgs, context: ToolContext): Promise<ToolResult> {
  const timezone = args.timezone || context.timezone || "UTC";
  const now = context.clientNow ? new Date(context.clientNow) : new Date();
  const iso = now.toISOString();
  const local = formatLocalTime(now, timezone);

  return {
    toolId: "clock",
    ok: true,
    summary: `Local time in ${timezone}: ${local}`,
    data: {
      timezone,
      iso,
      local,
      dayOfWeek: new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(now),
      date: new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now),
    },
  };
}
