import { z } from "zod";

export const toolIdSchema = z.enum(["clock", "calendar", "browser", "ffmpeg", "tasks", "toolkit"]);
export type ToolId = z.infer<typeof toolIdSchema>;

export type ToolManifestEntry = {
  id: ToolId;
  name: string;
  summary: string;
  whenToUse: string;
};

export type ToolContext = {
  timezone: string;
  clientNow?: string;
};

export type ToolResult = {
  toolId: ToolId;
  ok: boolean;
  summary: string;
  data: Record<string, unknown>;
  error?: string;
};

export const clockArgsSchema = z.object({
  timezone: z.string().min(1).max(120).optional(),
});

export const calendarArgsSchema = z.object({
  timezone: z.string().min(1).max(120).optional(),
  daysAhead: z.number().int().min(0).max(30).default(7),
  daysBehind: z.number().int().min(0).max(7).default(1),
});

export const browserArgsSchema = z
  .object({
    url: z.string().url().max(2048).optional(),
    artifactId: z.string().min(1).max(80).optional(),
    maxChars: z.number().int().min(500).max(12000).default(4000),
  })
  .refine((value) => Boolean(value.url || value.artifactId), { message: "Provide url or artifactId" });

export const ffmpegOperationSchema = z.enum(["probe", "extract_frames", "extract_audio"]);

export const ffmpegArgsSchema = z.object({
  artifactId: z.string().min(1).max(80),
  operation: ffmpegOperationSchema,
  frameCount: z.number().int().min(1).max(12).default(6),
  timestamps: z.array(z.number().min(0)).max(12).optional(),
  atSeconds: z.number().min(0).max(86_400).optional(),
});

export const taskToolActionSchema = z.enum(["list_lists", "create_list", "list_items", "add_item", "update_item"]);
export const taskToolArgsSchema = z.object({
  action: taskToolActionSchema,
  listId: z.string().min(1).max(80).optional(),
  listTitle: z.string().min(1).max(120).optional(),
  itemId: z.string().min(1).max(80).optional(),
  title: z.string().min(1).max(240).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["open", "done", "cancelled", "all"]).optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  dueAt: z.string().datetime().optional(),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  includeArchivedLists: z.boolean().default(false),
});

export const toolkitToolActionSchema = z.enum(["list_tools", "create_tool", "update_tool", "disable_tool", "enable_tool", "run_tool"]);
export const toolkitToolArgsSchema = z.object({
  action: toolkitToolActionSchema,
  toolId: z.string().min(1).max(80).optional(),
  slug: z.string().min(1).max(80).optional(),
  name: z.string().min(1).max(80).optional(),
  summary: z.string().min(1).max(240).optional(),
  whenToUse: z.string().min(1).max(500).optional(),
  instructions: z.string().min(1).max(4000).optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
});

export type ClockArgs = z.infer<typeof clockArgsSchema>;
export type CalendarArgs = z.infer<typeof calendarArgsSchema>;
export type BrowserArgs = z.infer<typeof browserArgsSchema>;
export type FfmpegArgs = z.infer<typeof ffmpegArgsSchema>;
export type FfmpegOperation = z.infer<typeof ffmpegOperationSchema>;
export type TaskToolArgs = z.infer<typeof taskToolArgsSchema>;
export type ToolkitToolArgs = z.infer<typeof toolkitToolArgsSchema>;

export type ToolDefinition = {
  id: ToolId;
  name: string;
  description: string;
  whenToUse: string;
  parameters: Record<string, unknown>;
  argsSchema: z.ZodTypeAny;
};
