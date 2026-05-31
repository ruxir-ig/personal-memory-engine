import {
  browserArgsSchema,
  calendarArgsSchema,
  clockArgsSchema,
  ffmpegArgsSchema,
  type ToolDefinition,
  type ToolId,
  type ToolManifestEntry,
} from "./types";

export const TOOL_MANIFEST: ToolManifestEntry[] = [
  {
    id: "clock",
    name: "Clock",
    summary: "Read the user's current local date, time, and timezone.",
    whenToUse: "When the question depends on now, today, tomorrow, relative dates, or timezone-aware timing.",
  },
  {
    id: "calendar",
    name: "Calendar",
    summary: "List upcoming reminders and timeline events saved in memory.",
    whenToUse: "When the question is about schedule, deadlines, what is due, or what is on the calendar.",
  },
  {
    id: "browser",
    name: "Web browser",
    summary: "Open a saved link or URL and read the live page text when memory is not enough.",
    whenToUse: "When the user asks about a saved link/reel/article URL, live web content, or external facts missing from memory.",
  },
  {
    id: "ffmpeg",
    name: "FFmpeg media",
    summary: "Inspect uploaded videos/screen recordings locally: probe metadata, extract frames, or extract audio.",
    whenToUse: "When the user asks about an uploaded video, screen recording, or reel file and you need duration, frames, or audio context.",
  },
];

const TOOL_DEFINITIONS: Record<ToolId, ToolDefinition> = {
  clock: {
    id: "clock",
    name: "Clock",
    description: "Returns the current local date, time, day of week, and timezone for the user.",
    whenToUse: TOOL_MANIFEST.find((entry) => entry.id === "clock")!.whenToUse,
    argsSchema: clockArgsSchema,
    parameters: {
      type: "object",
      properties: {
        timezone: { type: "string", description: "IANA timezone override; defaults to the user's timezone." },
      },
      additionalProperties: false,
    },
  },
  calendar: {
    id: "calendar",
    name: "Calendar",
    description: "Returns reminders and timeline events from the user's saved memory within a date window.",
    whenToUse: TOOL_MANIFEST.find((entry) => entry.id === "calendar")!.whenToUse,
    argsSchema: calendarArgsSchema,
    parameters: {
      type: "object",
      properties: {
        timezone: { type: "string", description: "IANA timezone for interpreting dates." },
        daysAhead: { type: "integer", minimum: 0, maximum: 30, default: 7 },
        daysBehind: { type: "integer", minimum: 0, maximum: 7, default: 1 },
      },
      additionalProperties: false,
    },
  },
  browser: {
    id: "browser",
    name: "Web browser",
    description: "Opens a saved link artifact or absolute URL with a headless browser and returns page title plus extracted text preview.",
    whenToUse: TOOL_MANIFEST.find((entry) => entry.id === "browser")!.whenToUse,
    argsSchema: browserArgsSchema,
    parameters: {
      type: "object",
      properties: {
        artifactId: { type: "string", description: "Saved link/reel/video artifact id whose structured.url should be opened." },
        url: { type: "string", format: "uri", description: "Absolute http(s) URL when no saved artifact exists." },
        maxChars: { type: "integer", minimum: 500, maximum: 12000, default: 4000 },
      },
      additionalProperties: false,
    },
  },
  ffmpeg: {
    id: "ffmpeg",
    name: "FFmpeg media",
    description: "Runs safe local FFmpeg operations on an uploaded vault video: probe metadata, extract JPEG frames, or extract mono WAV audio.",
    whenToUse: TOOL_MANIFEST.find((entry) => entry.id === "ffmpeg")!.whenToUse,
    argsSchema: ffmpegArgsSchema,
    parameters: {
      type: "object",
      required: ["artifactId", "operation"],
      properties: {
        artifactId: { type: "string", description: "Uploaded video/screen-recording artifact id from retrieved memory." },
        operation: { type: "string", enum: ["probe", "extract_frames", "extract_audio"] },
        frameCount: { type: "integer", minimum: 1, maximum: 12, default: 6 },
        timestamps: { type: "array", items: { type: "number", minimum: 0 }, maxItems: 12 },
        atSeconds: { type: "number", minimum: 0, description: "Optional start offset for frame sampling." },
      },
      additionalProperties: false,
    },
  },
};

export function formatToolManifestForPrompt() {
  return TOOL_MANIFEST.map((entry) => `- ${entry.id}: ${entry.summary} Use when: ${entry.whenToUse}`).join("\n");
}

export function getToolDefinition(id: ToolId): ToolDefinition {
  return TOOL_DEFINITIONS[id];
}

export function getToolDefinitions(ids: ToolId[]): ToolDefinition[] {
  return ids.map((id) => getToolDefinition(id));
}

export function formatToolSchemasForPrompt(ids: ToolId[]) {
  return getToolDefinitions(ids).map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    whenToUse: tool.whenToUse,
    parameters: tool.parameters,
  }));
}
