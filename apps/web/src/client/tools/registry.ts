import {
  browserArgsSchema,
  calendarArgsSchema,
  clockArgsSchema,
  ffmpegArgsSchema,
  memoryToolArgsSchema,
  taskToolArgsSchema,
  toolkitToolArgsSchema,
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
    summary: "Create reminders and list upcoming reminders or timeline events saved in memory.",
    whenToUse: "When the user asks to set a reminder, or asks about schedule, deadlines, what is due, or what is on the calendar.",
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
  {
    id: "memory",
    name: "Memory items",
    summary: "Create, list, read, update, archive, pin, or delete saved memories.",
    whenToUse: "When the user asks to remember, save, capture, show, read, edit, rename, update, archive, pin, delete, forget, or remove saved notes, links, files, or memories.",
  },
  {
    id: "tasks",
    name: "Tasks",
    summary: "Create, list, update, and delete local tasks.",
    whenToUse: "When the user asks to make, show, edit, complete, cancel, delete, or remove todos, tasks, checklists, or lists.",
  },
  {
    id: "toolkit",
    name: "Agent toolkit",
    summary: "Create, list, enable/disable, and run safe custom prompt-tools owned by the agent.",
    whenToUse: "When the user asks to give the agent a new reusable tool/workflow, inspect its tools, or use a previously saved custom tool.",
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
    description: "Creates reminders, or returns reminders and timeline events from the user's saved memory within a date window.",
    whenToUse: TOOL_MANIFEST.find((entry) => entry.id === "calendar")!.whenToUse,
    argsSchema: calendarArgsSchema,
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "create_reminder"], default: "list" },
        timezone: { type: "string", description: "IANA timezone for interpreting dates." },
        daysAhead: { type: "integer", minimum: 0, maximum: 30, default: 7 },
        daysBehind: { type: "integer", minimum: 0, maximum: 7, default: 1 },
        title: { type: "string", description: "Reminder title when action is create_reminder." },
        dueAt: { type: "string", format: "date-time", description: "Reminder due time as an ISO datetime. Convert relative times from clientNow and timezone." },
        sourceText: { type: "string", description: "Original user wording for a reminder." },
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
  memory: {
    id: "memory",
    name: "Memory items",
    description: "Manages saved memory artifacts in Quipu's browser database. Use update/delete only when one target is clear.",
    whenToUse: TOOL_MANIFEST.find((entry) => entry.id === "memory")!.whenToUse,
    argsSchema: memoryToolArgsSchema,
    parameters: {
      type: "object",
      required: ["action"],
      properties: {
        action: { type: "string", enum: ["create", "list", "read", "update", "delete"] },
        artifactId: { type: "string", description: "Exact saved memory artifact id when known." },
        query: { type: "string", description: "Search phrase to find the memory when artifactId is unknown." },
        limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
        includeArchived: { type: "boolean", default: false },
        title: { type: "string", description: "New title for update." },
        summary: { type: "string", description: "New short summary for update." },
        text: { type: "string", description: "Memory text for create, or replacement searchable memory text for update." },
        sourceLabel: { type: "string", description: "New source label for update." },
        tags: { type: "array", items: { type: "string" }, maxItems: 12 },
        pinned: { type: "boolean" },
        archived: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  tasks: {
    id: "tasks",
    name: "Tasks",
    description: "Manages local tasks in Quipu's browser database. Treat todos, lists, checklists, and tasks as one task surface.",
    whenToUse: TOOL_MANIFEST.find((entry) => entry.id === "tasks")!.whenToUse,
    argsSchema: taskToolArgsSchema,
    parameters: {
      type: "object",
      required: ["action"],
      properties: {
        action: { type: "string", enum: ["list", "create", "update", "delete"] },
        listId: { type: "string", description: "Optional existing group id when known." },
        listTitle: { type: "string", description: "Optional group/project name. Do not create a separate list object for the user." },
        itemId: { type: "string", description: "Existing task id for update/delete when known." },
        query: { type: "string", description: "Search phrase to identify task(s) when itemId is unknown." },
        title: { type: "string", description: "Task title for create/update." },
        notes: { type: "string", description: "Optional notes or list description." },
        status: { type: "string", enum: ["open", "done", "cancelled", "all"] },
        priority: { type: "string", enum: ["low", "normal", "high"], default: "normal" },
        dueAt: { type: "string", format: "date-time", description: "Optional ISO datetime deadline." },
        tags: { type: "array", items: { type: "string" }, maxItems: 8 },
        items: {
          type: "array",
          maxItems: 20,
          description: "Multiple tasks for one create call.",
          items: {
            type: "object",
            required: ["title"],
            properties: {
              title: { type: "string" },
              notes: { type: "string" },
              priority: { type: "string", enum: ["low", "normal", "high"], default: "normal" },
              dueAt: { type: "string", format: "date-time" },
              tags: { type: "array", items: { type: "string" }, maxItems: 8 },
            },
            additionalProperties: false,
          },
        },
        includeArchivedLists: { type: "boolean", default: false },
        maxCount: { type: "integer", minimum: 1, maximum: 20, description: "Exact number of matched tasks the user asked to delete." },
      },
      additionalProperties: false,
    },
  },
  toolkit: {
    id: "toolkit",
    name: "Agent toolkit",
    description:
      "Stores custom agent tools as safe prompt-level tool definitions. It does not execute arbitrary code; run_tool returns saved instructions and the invocation input for final-answer synthesis.",
    whenToUse: TOOL_MANIFEST.find((entry) => entry.id === "toolkit")!.whenToUse,
    argsSchema: toolkitToolArgsSchema,
    parameters: {
      type: "object",
      required: ["action"],
      properties: {
        action: { type: "string", enum: ["list_tools", "create_tool", "update_tool", "disable_tool", "enable_tool", "run_tool"] },
        toolId: { type: "string", description: "Existing agent tool id." },
        slug: { type: "string", description: "Existing agent tool slug." },
        name: { type: "string", description: "Short human name for create_tool/update_tool." },
        summary: { type: "string", description: "One sentence capability summary." },
        whenToUse: { type: "string", description: "Concrete trigger guidance for the agent." },
        instructions: { type: "string", description: "Reusable prompt/tool procedure to follow when run." },
        inputSchema: { type: "object", description: "JSON-schema-like input contract for the custom prompt-tool." },
        input: { type: "object", description: "Invocation payload for run_tool." },
      },
      additionalProperties: false,
    },
  },
};

export function formatToolManifestForPrompt(customTools: Array<{ slug: string; name: string; summary: string; whenToUse: string }> = []) {
  const builtIns = TOOL_MANIFEST.map((entry) => `- ${entry.id}: ${entry.summary} Use when: ${entry.whenToUse}`);
  const custom = customTools.map((tool) => `- custom:${tool.slug} (${tool.name}): ${tool.summary} Use via toolkit.run_tool when: ${tool.whenToUse}`);
  return [...builtIns, ...custom].join("\n");
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
