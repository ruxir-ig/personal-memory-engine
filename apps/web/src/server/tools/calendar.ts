import { readData } from "@/server/data/store";
import type { CalendarArgs, ToolContext, ToolResult } from "./types";

function windowBounds(args: CalendarArgs, context: ToolContext) {
  const timezone = args.timezone || context.timezone || "UTC";
  const anchor = context.clientNow ? new Date(context.clientNow) : new Date();
  const start = new Date(anchor);
  start.setDate(start.getDate() - args.daysBehind);
  const end = new Date(anchor);
  end.setDate(end.getDate() + args.daysAhead);
  return { timezone, start: start.toISOString(), end: end.toISOString() };
}

function inWindow(iso: string | undefined, start: string, end: string) {
  if (!iso) return false;
  return iso >= start && iso <= end;
}

export async function runCalendarTool(args: CalendarArgs, context: ToolContext): Promise<ToolResult> {
  if (args.action === "create_reminder") {
    try {
      const { createReminder } = await import("@/server/data/repository");
      const timezone = args.timezone || context.timezone || "UTC";
      const dueAt = new Date(args.dueAt!).toISOString();
      const reminder = await createReminder({
        title: args.title!,
        dueAt,
        sourceText: args.sourceText ?? args.title,
        timezone,
      });
      return {
        toolId: "calendar",
        ok: true,
        summary: `Set reminder: ${reminder.title}.`,
        data: { reminder },
      };
    } catch (error) {
      return {
        toolId: "calendar",
        ok: false,
        summary: "Reminder tool failed.",
        data: { args },
        error: error instanceof Error ? error.message : "Unknown reminder error",
      };
    }
  }

  const { timezone, start, end } = windowBounds(args, context);
  const data = await readData();
  const reminders = data.reminders;
  const events = data.events;

  const upcomingReminders = reminders
    .filter((reminder) => reminder.status !== "dismissed" && reminder.status !== "done")
    .filter((reminder) => inWindow(reminder.dueAt, start, end))
    .slice(0, 20)
    .map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      dueAt: reminder.dueAt,
      timezone: reminder.timezone,
      status: reminder.status,
    }));

  const upcomingEvents = events
    .filter((event) => inWindow(event.eventAt ?? event.capturedAt, start, end))
    .slice(0, 20)
    .map((event) => ({
      id: event.id,
      title: event.title,
      eventAt: event.eventAt ?? event.capturedAt,
      place: event.place,
      description: event.description?.slice(0, 240),
    }));

  const summaryParts = [
    `${upcomingReminders.length} reminder${upcomingReminders.length === 1 ? "" : "s"}`,
    `${upcomingEvents.length} event${upcomingEvents.length === 1 ? "" : "s"}`,
  ];

  return {
    toolId: "calendar",
    ok: true,
    summary: `Calendar window ${start.slice(0, 10)} to ${end.slice(0, 10)} (${timezone}): ${summaryParts.join(", ")}.`,
    data: {
      timezone,
      windowStart: start,
      windowEnd: end,
      reminders: upcomingReminders,
      events: upcomingEvents,
    },
  };
}
