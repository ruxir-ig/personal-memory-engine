import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const relayBodySchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().min(1).max(2000),
  body: z
    .object({
      model: z.string().min(1).max(200),
      messages: z.array(z.unknown()).min(1),
    })
    .passthrough(),
});

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  const isLocalHttp =
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error("Provider base URL must use HTTPS, except localhost proxies.");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export async function POST(request: Request) {
  let payload: z.infer<typeof relayBodySchema>;
  try {
    payload = relayBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid LLM relay request." }, { status: 400 });
  }

  let baseUrl: string;
  try {
    baseUrl = normalizeBaseUrl(payload.baseUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid provider base URL." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload.body),
      cache: "no-store",
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Provider relay failed." },
      { status: 502 },
    );
  }
}
