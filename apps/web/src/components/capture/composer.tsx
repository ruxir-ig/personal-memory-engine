"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import { ChevronDown, FileText, Loader2, Paperclip, Send, Sparkles, X } from "lucide-react";
import type { MemoryKind } from "@pme/shared";
import { trpc } from "@/trpc/client";
import { kindMeta } from "@/lib/registry";

type AttachmentDraft = { id: string; file: File; previewUrl?: string };

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unit = units[0]!;
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index]!;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
}

function createAttachment(file: File): AttachmentDraft {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
  };
}

/** Lightweight client-side guess for the live hint chip (server does the real work). */
function guessKind(text: string): MemoryKind | null {
  const t = text.trim();
  if (!t) return null;
  if (/(?:key|token|secret|api[\s_-]?key|password)\s*[:=]/i.test(t) || /\b(sk-|ghp_|hf_|fe_oa_|AKIA|AIza)/.test(t)) return "credential";
  const url = t.match(/https?:\/\/\S+/i)?.[0]?.toLowerCase();
  if (url) {
    if (url.includes("instagram.com/reel") || url.includes("/shorts/") || url.includes("tiktok.com")) return "reel";
    if (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo")) return "video";
    if (url.includes("substack.com") || url.includes("medium.com")) return "article";
    return "link";
  }
  if (/```/.test(t) || /^\s*(const|function|def|class|import|export)\b/m.test(t)) return "code";
  if (/\b(remind|deadline|due|todo|to-do|tomorrow|follow up)\b/i.test(t)) return "task";
  return "note";
}

export function Composer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentsRef = useRef<AttachmentDraft[]>([]);
  const utils = trpc.useUtils();
  const providers = trpc.provider.list.useQuery(undefined, { staleTime: 60_000 });
  const capture = trpc.memory.capture.useMutation();

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      for (const attachment of attachmentsRef.current) {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  async function invalidateMemoryViews() {
    await Promise.all([
      utils.canvas.layout.invalidate(),
      utils.dashboard.snapshot.invalidate(),
      utils.space.list.invalidate(),
      utils.search.query.invalidate(),
      utils.inbox.list.invalidate(),
      utils.reminder.list.invalidate(),
      utils.preference.list.invalidate(),
    ]);
    router.refresh();
  }

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    setAttachments((current) => [...current, ...files.map(createAttachment)]);
    setStatusMessage(`${files.length} file${files.length === 1 ? "" : "s"} attached`);
    setIsExpanded(true);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((attachment) => attachment.id !== id);
    });
  }

  async function uploadFile(file: File) {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    if (!response.ok) throw new Error(`${file.name} failed to import`);
  }

  async function submitCapture() {
    const prompt = text.trim();
    if (!prompt && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      setStatusMessage(prompt ? "Organizing..." : "Importing files...");
      if (prompt) {
        await capture.mutateAsync({
          text: prompt,
          sourceLabel: sourceLabel.trim() || "quick capture",
          shouldSummarize: true,
          clientNow: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
      if (attachments.length > 0) {
        setStatusMessage(`Importing ${attachments.length} file${attachments.length === 1 ? "" : "s"}...`);
        await Promise.all(attachments.map((attachment) => uploadFile(attachment.file)));
      }
      for (const attachment of attachments) {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      }
      setText("");
      setSourceLabel("");
      setAttachments([]);
      setIsExpanded(false);
      setStatusMessage("Filed away");
      await invalidateMemoryViews();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Something went wrong");
      setIsExpanded(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.length > 0) addFiles(files);
  }
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragging(false);
  }
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void submitCapture();
  }

  const isWorking = capture.isPending || isSubmitting;
  const canSubmit = Boolean(text.trim() || attachments.length > 0) && !isWorking;
  const guessed = useMemo(() => guessKind(text), [text]);
  const hasProvider = providers.data?.some((provider) => provider.capabilities.includes("chat"));
  const showDetails = isExpanded || attachments.length > 0 || Boolean(statusMessage) || Boolean(capture.error);

  return (
    <div className="composer-wrap">
      <section className="composer" data-dragging={isDragging} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
        {showDetails ? (
          <div className="composer-details">
            <div className="signal-row">
              {guessed ? (
                <span className="signal" data-active="true">
                  {(() => {
                    const Icon = kindMeta[guessed].icon;
                    return <Icon size={13} />;
                  })()}
                  <strong>{kindMeta[guessed].label}</strong>
                  <span>auto-filed</span>
                </span>
              ) : (
                <span className="signal">
                  <Sparkles size={13} />
                  <strong>Anything</strong>
                  <span>link, note, key, code, file</span>
                </span>
              )}
              <span className="signal" data-active={attachments.length > 0}>
                <Paperclip size={13} />
                <strong>{attachments.length || "0"}</strong>
                <span>files</span>
              </span>
              <span className="signal" data-active={Boolean(hasProvider)}>
                <Sparkles size={13} />
                <strong>{hasProvider ? "AI on" : "AI off"}</strong>
                <span>{hasProvider ? "enriching" : "rules only"}</span>
              </span>
              {statusMessage ? (
                <span className="signal" data-active>
                  <span>{statusMessage}</span>
                </span>
              ) : null}
              {capture.error ? (
                <span className="signal" style={{ color: "var(--danger)" }}>
                  <span>{capture.error.message}</span>
                </span>
              ) : null}
            </div>

            {attachments.length > 0 ? (
              <div className="attach-strip" aria-label="Attached files">
                {attachments.map((attachment) => (
                  <article className="attach" key={attachment.id}>
                    {attachment.previewUrl ? (
                      <img src={attachment.previewUrl} alt="" />
                    ) : (
                      <span className="file-ic">
                        <FileText size={16} />
                      </span>
                    )}
                    <div className="attach-info">
                      <strong>{attachment.file.name}</strong>
                      <span>{formatBytes(attachment.file.size)}</span>
                    </div>
                    <button className="icon-btn sm bare" type="button" aria-label={`Remove ${attachment.file.name}`} onClick={() => removeAttachment(attachment.id)}>
                      <X size={13} />
                    </button>
                  </article>
                ))}
              </div>
            ) : null}

            <div className="composer-meta">
              <input className="input" value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} placeholder="Source label (optional)" aria-label="Source label" />
            </div>
          </div>
        ) : null}

        <div className="composer-row">
          <span className="composer-mark" aria-hidden="true">
            <Sparkles size={17} />
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="visually-hidden"
            onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          />
          <button className="icon-btn bare" type="button" aria-label="Attach files" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={18} />
          </button>
          <textarea
            ref={textRef}
            className="composer-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Drop anything - a link, a key, a reel, a thought..."
            rows={1}
          />
          <button className="icon-btn bare" type="button" aria-label={showDetails ? "Collapse" : "Expand"} onClick={() => setIsExpanded((current) => !current)}>
            <ChevronDown size={18} style={{ transform: showDetails ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          <button className="btn" type="button" aria-label="Save" onClick={submitCapture} disabled={!canSubmit}>
            {isWorking ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
          </button>
        </div>
      </section>
    </div>
  );
}
