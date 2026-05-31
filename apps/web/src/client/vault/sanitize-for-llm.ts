import { maskSecret } from "@/client/memory/classify";

const SECRET_LABEL_RE =
  /\b(api[\s_-]?key|secret[\s_-]?key|client[\s_-]?secret|access[\s_-]?token|auth[\s_-]?token|bearer|token|secret|password|passwd|pwd|api[\s_-]?token|key\s*\d*)\b\s*[:=]\s*([^\s]{6,})/gi;

const SECRET_PREFIXES = ["sk-", "sk_", "pk-", "ghp_", "gho_", "github_pat_", "hf_", "AKIA", "AIza", "glpat-", "ya29."];

function looksLikeSecretToken(token: string) {
  const t = token.trim();
  if (t.length < 18 || /\s/.test(t) || /^https?:\/\//i.test(t)) return false;
  const lower = t.toLowerCase();
  if (SECRET_PREFIXES.some((p) => lower.startsWith(p.toLowerCase()))) return true;
  return /^[A-Za-z0-9._\-+/=]{24,}$/.test(t);
}

export type RedactionNote = {
  label: string;
  masked: string;
  length: number;
};

export function redactSecretsForLlm(text: string): { text: string; redactions: RedactionNote[] } {
  const redactions: RedactionNote[] = [];
  let output = text;

  output = output.replace(SECRET_LABEL_RE, (match, label, value) => {
    if (!looksLikeSecretToken(value)) return match;
    const note = {
      label: String(label).trim(),
      masked: maskSecret(value),
      length: value.length,
    };
    redactions.push(note);
    return `${label}: [ENCRYPTED_LOCALLY — ${note.label}, ${note.length} chars, not sent to model]`;
  });

  for (const raw of text.split(/\s+/)) {
    if (!looksLikeSecretToken(raw)) continue;
    if (output.includes(raw)) {
      redactions.push({ label: "token", masked: maskSecret(raw), length: raw.length });
      output = output.split(raw).join("[ENCRYPTED_LOCALLY — secret token, not sent to model]");
    }
  }

  return { text: output, redactions };
}

export function llmContextForRedactions(redactions: RedactionNote[]) {
  if (redactions.length === 0) return undefined;
  return {
    encryptedCredentialsDetected: redactions.map((r) => ({
      label: r.label,
      maskedPreview: r.masked,
      length: r.length,
      stored: "encrypted in browser vault; plaintext never sent to model",
    })),
  } as const;
}

export type LlmRedactionContext = ReturnType<typeof llmContextForRedactions>;
