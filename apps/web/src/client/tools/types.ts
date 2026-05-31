import { z } from "zod";

export const toolIdSchema = z.enum(["clock", "calendar", "browser", "ffmpeg"]);
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

export type ClockArgs = z.infer<typeof clockArgsSchema>;
export type CalendarArgs = z.infer<typeof calendarArgsSchema>;
export type BrowserArgs = z.infer<typeof browserArgsSchema>;
export type FfmpegArgs = z.infer<typeof ffmpegArgsSchema>;
export type FfmpegOperation = z.infer<typeof ffmpegOperationSchema>;

export type ToolDefinition = {
  id: ToolId;
  name: string;
  description: string;
  whenToUse: string;
  parameters: Record<string, unknown>;
  argsSchema: z.ZodTypeAny;
};
