"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, Loader2, Mic, Paperclip, Send, X } from "lucide-react";
import {
  useAskMutation,
  useCaptureMutation,
  useImportFileMutation,
  useInvalidateMemory,
} from "@/client/hooks";
import { itemHref } from "@/lib/item-route";

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

export function Composer() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const attachmentsRef = useRef<AttachmentDraft[]>([]);
  const invalidateMemory = useInvalidateMemory();
  const capture = useCaptureMutation();
  const ask = useAskMutation();
  const importFile = useImportFileMutation();

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
    await invalidateMemory();
    router.refresh();
  }

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    setAttachments((current) => [...current, ...files.map(createAttachment)]);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((attachment) => attachment.id !== id);
    });
  }

  async function uploadFile(file: File) {
    await importFile.mutateAsync(file);
  }

  async function submitCapture() {
    const prompt = text.trim();
    if (!prompt && attachments.length === 0) return;
    const shouldUseAgent = prompt && attachments.length === 0;

    setIsSubmitting(true);
    try {
      if (shouldUseAgent) {
        capture.reset();
        await ask.mutateAsync({
          question: prompt,
          clientNow: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        setText("");
        await invalidateMemoryViews();
        return;
      }

      ask.reset();
      if (prompt) {
        await capture.mutateAsync({
          text: prompt,
          sourceLabel: "quick capture",
          shouldSummarize: true,
          clientNow: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
      if (attachments.length > 0) {
        await Promise.all(attachments.map((attachment) => uploadFile(attachment.file)));
      }
      for (const attachment of attachments) {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      }
      setText("");
      setAttachments([]);
      await invalidateMemoryViews();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      /* errors surface via capture.error / ask.error */
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

  const isWorking = capture.isPending || ask.isPending || isSubmitting;
  const isAgentMode = Boolean(text.trim()) && attachments.length === 0;
  const canSubmit = Boolean(text.trim() || attachments.length > 0) && !isWorking;
  const showExtras = isWorking || attachments.length > 0 || Boolean(ask.data) || Boolean(capture.data) || Boolean(capture.error) || Boolean(ask.error);
  const aiStatus = capture.data?.artifact.metadata.aiStatus;

  return (
    <div className="composer-wrap">
      <section className="composer" data-dragging={isDragging} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}>
        {showExtras ? (
          <div className="composer-details">
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

            {capture.error ? (
              <p className="composer-error" role="alert">
                {capture.error.message}
              </p>
            ) : null}
            {ask.error ? (
              <p className="composer-error" role="alert">
                {ask.error.message}
              </p>
            ) : null}

            {isWorking ? (
              <div className="composer-status" role="status">
                <Loader2 size={14} className="spin" />
                <span>{ask.isPending ? "Routing with AI..." : attachments.length > 0 ? "Importing..." : "Saving..."}</span>
              </div>
            ) : null}

            {capture.data ? (
              <div className="composer-answer">
                <p>
                  {aiStatus === "processed"
                    ? `Saved with ${String(capture.data.artifact.metadata.provider ?? "your AI provider")}.`
                    : aiStatus === "provider_required"
                      ? "Saved locally. Add an AI provider to route and summarize captures."
                      : aiStatus === "failed"
                        ? "Saved locally, but AI routing failed."
                        : "Saved locally."}
                </p>
                <span>{capture.data.summary.summary}</span>
              </div>
            ) : null}

            {ask.data ? (
              <div className="composer-answer">
                <p>{ask.data.answer}</p>
                {ask.data.uncertainty ? <span>{ask.data.uncertainty}</span> : null}
                {ask.data.toolsUsed && ask.data.toolsUsed.length > 0 ? (
                  <div className="composer-cites">
                    {ask.data.toolsUsed.map((tool) => (
                      <span key={tool.id}>
                        {tool.id}: {tool.summary}
                      </span>
                    ))}
                  </div>
                ) : null}
                {ask.data.citations.length > 0 ? (
                  <div className="composer-cites">
                    {ask.data.citations.slice(0, 3).map((citation) => (
                      <Link key={citation.chunkId} href={itemHref(citation.artifactId)}>
                        {citation.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="composer-row">
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
            onChange={(event) => {
              if (ask.data || ask.error) ask.reset();
              if (capture.data || capture.error) capture.reset();
              setText(event.target.value);
            }}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Ask, save, or drop anything..."
            rows={1}
          />
          <button className="btn" type="button" aria-label={isAgentMode ? "Send to Quipu" : "Save"} onClick={submitCapture} disabled={!canSubmit}>
            {isWorking ? <Loader2 size={17} className="spin" /> : isAgentMode ? <ArrowUpRight size={17} /> : <Send size={17} />}
          </button>
          <span className="composer-voice-soon" tabIndex={0} role="status" aria-label="Voice input — coming soon">
            <span className="icon-btn bare" aria-hidden="true">
              <Mic size={16} />
            </span>
          </span>
        </div>
      </section>
    </div>
  );
}
