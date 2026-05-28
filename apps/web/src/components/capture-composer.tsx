"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { FileIcon, Loader2, Plus, Send, X } from "lucide-react";
import { trpc } from "@/trpc/client";

function readClientClock() {
  return {
    clientNow: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

type AttachmentDraft = {
  id: string;
  file: File;
  previewUrl?: string;
};

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

export function CaptureComposer() {
  const [text, setText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentsRef = useRef<AttachmentDraft[]>([]);
  const utils = trpc.useUtils();
  const providers = trpc.provider.list.useQuery();
  const capture = trpc.memory.capture.useMutation({
    onSuccess: async () => invalidateMemoryViews(),
  });

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

  async function invalidateMemoryViews() {
    await Promise.all([
      utils.dashboard.snapshot.invalidate(),
      utils.inbox.list.invalidate(),
      utils.search.query.invalidate(),
    ]);
  }

  function addFiles(files: File[]) {
    if (files.length === 0) return;
    setAttachments((current) => [...current, ...files.map(createAttachment)]);
    setStatusMessage(`${files.length} file${files.length === 1 ? "" : "s"} attached.`);
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
    const response = await fetch("/api/uploads", {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      throw new Error(`${file.name} failed to import`);
    }
  }

  async function submitCapture() {
    const prompt = text.trim();
    if (!prompt && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      setStatusMessage("Saving memory...");
      if (prompt) {
        await capture.mutateAsync({
          text: prompt,
          sourceLabel: sourceLabel.trim() || undefined,
          shouldSummarize: true,
          ...readClientClock(),
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
      setStatusMessage(prompt && attachments.length > 0 ? "Saved · On Canvas" : "Saved · On Canvas");
      await invalidateMemoryViews();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Capture failed.");
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

  const isWorking = capture.isPending || isSubmitting;
  const canSubmit = Boolean(text.trim() || attachments.length > 0) && !isWorking;

  return (
    <section className="chat-capture surface section-pad">
      <div className="card-title-row chat-capture-header">
        <div>
          <div className="page-kicker">Ingest</div>
          <h2 className="card-title" style={{ fontSize: 20 }}>
            Chat with memory
          </h2>
        </div>
      </div>
      <div
        className="chat-box"
        data-dragging={isDragging}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {attachments.length > 0 ? (
          <div className="attachment-strip" aria-label="Attached files">
            {attachments.map((attachment) => (
              <article className="attachment-preview" key={attachment.id}>
                {attachment.previewUrl ? (
                  <img src={attachment.previewUrl} alt="" />
                ) : (
                  <span className="attachment-file-icon">
                    <FileIcon size={20} />
                  </span>
                )}
                <div>
                  <strong>{attachment.file.name}</strong>
                  <span>
                    {attachment.file.type || "unknown type"} · {formatBytes(attachment.file.size)}
                  </span>
                </div>
                <button
                  className="icon-button secondary"
                  type="button"
                  aria-label={`Remove ${attachment.file.name}`}
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <X size={15} />
                </button>
              </article>
            ))}
          </div>
        ) : null}

        <div className="chat-actions">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="visually-hidden"
            onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
          />
          <button className="chat-icon-button" type="button" aria-label="Attach files" onClick={() => fileInputRef.current?.click()}>
            <Plus size={22} />
          </button>
          <input
            className="source-input"
            value={sourceLabel}
            onChange={(event) => setSourceLabel(event.target.value)}
            placeholder="Source label"
            aria-label="Source label"
          />
          <textarea
            className="chat-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onPaste={handlePaste}
            placeholder="Tell me what to remember"
          />
          <button className="chat-send-button" type="button" aria-label="Send memory" onClick={submitCapture} disabled={!canSubmit}>
            {isWorking ? <Loader2 size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>
      <div className="chat-footnote">
        {providers.isLoading ? null : providers.data?.some((provider) => provider.capabilities.includes("chat")) ? (
          <span className="pill accent">AI ready</span>
        ) : (
          <span className="pill amber">AI provider required</span>
        )}
        {capture.data ? (
          <>
            <span className="pill accent">Saved</span>
            <span className="pill accent">On Canvas</span>
            {capture.data.artifact.metadata.aiStatus === "provider_required" ? (
              <span className="pill amber">AI provider required</span>
            ) : null}
            {capture.data.artifact.metadata.ingestStatus === "ready_for_review" ? (
              <span className="pill amber">Review proposed</span>
            ) : null}
            <span className="pill">
              {capture.data.intents.length} intents, {capture.data.chunks.length} chunks
            </span>
          </>
        ) : null}
        {capture.error ? <span className="pill amber">{capture.error.message}</span> : null}
        {statusMessage ? <span className="pill">{statusMessage}</span> : null}
      </div>
    </section>
  );
}
