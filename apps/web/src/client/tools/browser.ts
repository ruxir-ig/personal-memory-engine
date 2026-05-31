import { resolveArtifactUrl } from "./media-resolver-shared";
import type { BrowserArgs, ToolResult } from "./types";

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageText(url: string, maxChars: number) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();
  const title = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
  const text = contentType.includes("html") ? stripHtml(raw) : raw.trim();
  return {
    title: title || url,
    text: text.slice(0, maxChars),
    method: "fetch" as const,
  };
}

async function resolveBrowserUrl(args: BrowserArgs) {
  if (args.url) return { url: args.url, artifactId: args.artifactId, title: undefined };
  if (!args.artifactId) return null;
  const resolved = await resolveArtifactUrl(args.artifactId);
  if (!resolved) return null;
  return { url: resolved.url, artifactId: resolved.artifactId, title: resolved.title };
}

export async function runBrowserTool(args: BrowserArgs): Promise<ToolResult> {
  const enabled = process.env.NEXT_PUBLIC_PME_BROWSER_ENABLED !== "false";
  if (!enabled) {
    return {
      toolId: "browser",
      ok: false,
      summary: "Browser tool is disabled.",
      data: { url: args.url, artifactId: args.artifactId },
      error: "Set NEXT_PUBLIC_PME_BROWSER_ENABLED=true to allow web browsing.",
    };
  }

  const target = await resolveBrowserUrl(args);
  if (!target) {
    return {
      toolId: "browser",
      ok: false,
      summary: "No URL to open.",
      data: { url: args.url, artifactId: args.artifactId },
      error: "Provide a url or a saved link artifactId with structured.url.",
    };
  }

  try {
    const preview = await fetchPageText(target.url, args.maxChars);
    return {
      toolId: "browser",
      ok: true,
      summary: `Fetched ${preview.title} via ${preview.method}.`,
      data: {
        url: target.url,
        artifactId: target.artifactId,
        artifactTitle: target.title,
        title: preview.title,
        textPreview: preview.text,
        method: preview.method,
      },
    };
  } catch (error) {
    return {
      toolId: "browser",
      ok: false,
      summary: `Could not open ${target.url}.`,
      data: { url: target.url, artifactId: target.artifactId },
      error: error instanceof Error ? error.message : "Browser request failed",
    };
  }
}
