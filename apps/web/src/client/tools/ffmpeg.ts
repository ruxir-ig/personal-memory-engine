import { putDerivedBlob } from "@/client/memory/vault";
import { isVideoLike, resolveVaultFile } from "./media-resolver-shared";
import type { FfmpegArgs, ToolResult } from "./types";

function pickTimestamps(durationSec: number, args: FfmpegArgs) {
  if (args.timestamps && args.timestamps.length > 0) return args.timestamps.slice(0, 12);
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

async function loadFfmpeg() {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ffmpeg;
}

export async function runFfmpegTool(args: FfmpegArgs): Promise<ToolResult> {
  if (process.env.NEXT_PUBLIC_PME_FFMPEG_ENABLED === "false") {
    return {
      toolId: "ffmpeg",
      ok: false,
      summary: "FFmpeg tool is disabled.",
      data: { artifactId: args.artifactId, operation: args.operation },
      error: "Set NEXT_PUBLIC_PME_FFMPEG_ENABLED=true to allow in-browser media tools.",
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
    if (args.operation === "probe") {
      return {
        toolId: "ffmpeg",
        ok: true,
        summary: `Loaded ${media.title} (${Math.round(media.bytes.byteLength / 1024)} KB) in-browser vault.`,
        data: {
          artifactId: media.artifactId,
          title: media.title,
          operation: "probe",
          sizeBytes: media.bytes.byteLength,
          mimeType: media.mimeType,
          note: "Video is available locally. Use extract_frames or extract_audio for deeper context.",
        },
      };
    }

    const ffmpeg = await loadFfmpeg();
    const inputName = "input.bin";
    await ffmpeg.writeFile(inputName, new Uint8Array(media.bytes));

    if (args.operation === "extract_frames") {
      const timestamps = pickTimestamps(60, args);
      const frames: Array<{ index: number; atSec: number; derivedKey: string; sizeBytes: number }> = [];
      for (const [index, atSec] of timestamps.entries()) {
        const outputName = `frame-${index + 1}.jpg`;
        await ffmpeg.exec(["-ss", String(atSec), "-i", inputName, "-frames:v", "1", "-q:v", "3", outputName]);
        const data = await ffmpeg.readFile(outputName);
        const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
        const derivedKey = `${media.vaultKey}:frame:${index + 1}:${Math.round(atSec * 1000)}`;
        await putDerivedBlob({
          key: derivedKey,
          artifactHash: media.vaultKey,
          kind: "frame",
          bytes: bytes.slice().buffer,
          mimeType: "image/jpeg",
          meta: { atSec },
        });
        frames.push({ index: index + 1, atSec, derivedKey, sizeBytes: bytes.byteLength });
      }
      return {
        toolId: "ffmpeg",
        ok: true,
        summary: `Extracted ${frames.length} frame${frames.length === 1 ? "" : "s"} from ${media.title} in-browser.`,
        data: {
          artifactId: media.artifactId,
          title: media.title,
          operation: "extract_frames",
          frames,
          note: "Frames are stored locally in IndexedDB for vision/transcription follow-up.",
        },
      };
    }

    if (args.operation === "extract_audio") {
      const outputName = "audio.wav";
      await ffmpeg.exec(["-i", inputName, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", outputName]);
      const data = await ffmpeg.readFile(outputName);
      const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
      const derivedKey = `${media.vaultKey}:audio`;
      await putDerivedBlob({
        key: derivedKey,
        artifactHash: media.vaultKey,
        kind: "audio",
        bytes: bytes.slice().buffer,
        mimeType: "audio/wav",
      });
      return {
        toolId: "ffmpeg",
        ok: true,
        summary: `Extracted audio from ${media.title} in-browser.`,
        data: {
          artifactId: media.artifactId,
          title: media.title,
          operation: "extract_audio",
          derivedKey,
          sizeBytes: bytes.byteLength,
          note: "Audio is stored locally as WAV for transcription.",
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
    return {
      toolId: "ffmpeg",
      ok: false,
      summary: `Could not process ${media.title} in-browser.`,
      data: { artifactId: media.artifactId, operation: args.operation },
      error: error instanceof Error ? error.message : "ffmpeg.wasm failed",
    };
  }
}
