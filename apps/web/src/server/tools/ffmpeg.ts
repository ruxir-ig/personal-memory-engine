import { execFile } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { derivedDirFor, isVideoLike, resolveVaultFile } from "./media-resolver";
import type { FfmpegArgs, ToolResult } from "./types";

const execFileAsync = promisify(execFile);

type FfprobePayload = {
  format?: { duration?: string; size?: string; bit_rate?: string; format_name?: string };
  streams?: Array<{
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    avg_frame_rate?: string;
    duration?: string;
  }>;
};

function ffmpegBin() {
  return process.env.PME_FFMPEG_PATH || "ffmpeg";
}

function ffprobeBin() {
  return process.env.PME_FFPROBE_PATH || "ffprobe";
}

function parseFrameRate(value?: string) {
  if (!value || value === "0/0") return undefined;
  const [num, den] = value.split("/").map(Number);
  if (!num || !den) return undefined;
  return Math.round((num / den) * 100) / 100;
}

async function runFfprobe(filePath: string) {
  const { stdout } = await execFileAsync(
    ffprobeBin(),
    ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath],
    { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
  );
  return JSON.parse(stdout) as FfprobePayload;
}

function summarizeProbe(payload: FfprobePayload) {
  const video = payload.streams?.find((stream) => stream.codec_type === "video");
  const audio = payload.streams?.find((stream) => stream.codec_type === "audio");
  const durationSec = Number(payload.format?.duration ?? video?.duration ?? 0) || 0;
  return {
    durationSec: Math.round(durationSec * 100) / 100,
    durationLabel: durationSec > 0 ? formatSeconds(durationSec) : "unknown",
    width: video?.width,
    height: video?.height,
    fps: parseFrameRate(video?.avg_frame_rate),
    videoCodec: video?.codec_name,
    audioCodec: audio?.codec_name,
    hasAudio: Boolean(audio),
    format: payload.format?.format_name,
    sizeBytes: payload.format?.size ? Number(payload.format.size) : undefined,
  };
}

function formatSeconds(total: number) {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function pickTimestamps(durationSec: number, args: FfmpegArgs) {
  if (args.timestamps && args.timestamps.length > 0) {
    return args.timestamps.slice(0, 12);
  }
  const count = args.frameCount ?? 6;
  if (durationSec <= 0) return [0];
  if (count === 1) return [Math.min(args.atSeconds ?? 0, Math.max(durationSec - 0.1, 0))];
  const start = args.atSeconds ?? 0;
  const usable = Math.max(durationSec - start, 0.5);
  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0 : index / (count - 1);
    return Math.round((start + usable * ratio) * 100) / 100;
  });
}

async function extractFrames(filePath: string, args: FfmpegArgs, probe: ReturnType<typeof summarizeProbe>) {
  const outDir = path.join(derivedDirFor(filePath), "frames");
  await mkdir(outDir, { recursive: true });
  const timestamps = pickTimestamps(probe.durationSec, args);
  const frames: Array<{ index: number; atSec: number; path: string; sizeBytes: number }> = [];

  for (const [index, atSec] of timestamps.entries()) {
    const output = path.join(outDir, `frame-${String(index + 1).padStart(2, "0")}-${String(Math.round(atSec * 1000)).padStart(8, "0")}ms.jpg`);
    await execFileAsync(
      ffmpegBin(),
      ["-hide_banner", "-loglevel", "error", "-ss", String(atSec), "-i", filePath, "-frames:v", "1", "-q:v", "3", "-y", output],
      { timeout: 45_000 },
    );
    const info = await stat(output);
    frames.push({ index: index + 1, atSec, path: output, sizeBytes: info.size });
  }

  return frames;
}

async function extractAudio(filePath: string) {
  const outDir = path.join(derivedDirFor(filePath), "audio");
  await mkdir(outDir, { recursive: true });
  const output = path.join(outDir, "track.wav");
  await execFileAsync(
    ffmpegBin(),
    ["-hide_banner", "-loglevel", "error", "-i", filePath, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", "-y", output],
    { timeout: 120_000 },
  );
  const info = await stat(output);
  return { path: output, sizeBytes: info.size, sampleRate: 16000, channels: 1 };
}

export async function runFfmpegTool(args: FfmpegArgs): Promise<ToolResult> {
  if (process.env.PME_FFMPEG_ENABLED === "false") {
    return {
      toolId: "ffmpeg",
      ok: false,
      summary: "FFmpeg tool is disabled.",
      data: { artifactId: args.artifactId, operation: args.operation },
      error: "Set PME_FFMPEG_ENABLED=true and install ffmpeg on the device.",
    };
  }

  const media = await resolveVaultFile(args.artifactId);
  if (!media) {
    return {
      toolId: "ffmpeg",
      ok: false,
      summary: "No local vault file for that artifact.",
      data: { artifactId: args.artifactId },
      error: "Upload the video or screen recording first, then pass its artifactId.",
    };
  }

  if (!isVideoLike(media)) {
    return {
      toolId: "ffmpeg",
      ok: false,
      summary: `${media.title} is not a video artifact.`,
      data: { artifactId: args.artifactId, type: media.type, kind: media.kind },
      error: "FFmpeg tool only works on uploaded video/screen-recording files in the vault.",
    };
  }

  try {
    const payload = await runFfprobe(media.path);
    const probe = summarizeProbe(payload);

    if (args.operation === "probe") {
      return {
        toolId: "ffmpeg",
        ok: true,
        summary: `Probed ${media.title}: ${probe.durationLabel}${probe.width ? `, ${probe.width}x${probe.height}` : ""}.`,
        data: {
          artifactId: media.artifactId,
          title: media.title,
          operation: "probe",
          probe,
        },
      };
    }

    if (args.operation === "extract_frames") {
      const frames = await extractFrames(media.path, args, probe);
      return {
        toolId: "ffmpeg",
        ok: true,
        summary: `Extracted ${frames.length} frame${frames.length === 1 ? "" : "s"} from ${media.title}.`,
        data: {
          artifactId: media.artifactId,
          title: media.title,
          operation: "extract_frames",
          probe,
          frames,
          note: "Frames are saved locally under the artifact vault. A vision-capable model can inspect them in a later step.",
        },
      };
    }

    if (args.operation === "extract_audio") {
      if (!probe.hasAudio) {
        return {
          toolId: "ffmpeg",
          ok: false,
          summary: `${media.title} has no audio track.`,
          data: { artifactId: media.artifactId, operation: "extract_audio", probe },
          error: "No audio stream found.",
        };
      }
      const audio = await extractAudio(media.path);
      return {
        toolId: "ffmpeg",
        ok: true,
        summary: `Extracted audio from ${media.title} (${formatSeconds(probe.durationSec)}).`,
        data: {
          artifactId: media.artifactId,
          title: media.title,
          operation: "extract_audio",
          probe,
          audio,
          note: "Audio is saved locally as WAV for transcription or further processing.",
        },
      };
    }

    return {
      toolId: "ffmpeg",
      ok: false,
      summary: `Unsupported FFmpeg operation ${args.operation}.`,
      data: { artifactId: args.artifactId },
      error: "Unknown operation",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "FFmpeg failed";
    const missingBinary = /ENOENT|not found/i.test(message);
    return {
      toolId: "ffmpeg",
      ok: false,
      summary: missingBinary ? "FFmpeg is not installed on this device." : `Could not process ${media.title}.`,
      data: { artifactId: media.artifactId, operation: args.operation },
      error: missingBinary ? "Install ffmpeg/ffprobe and ensure they are on PATH." : message,
    };
  }
}
