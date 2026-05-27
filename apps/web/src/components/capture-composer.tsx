"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Send, Sparkles } from "lucide-react";
import { trpc } from "@/trpc/client";

export function CaptureComposer() {
  const [text, setText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const utils = trpc.useUtils();
  const capture = trpc.memory.capture.useMutation({
    onSuccess: async () => {
      setText("");
      await Promise.all([
        utils.dashboard.snapshot.invalidate(),
        utils.inbox.list.invalidate(),
        utils.search.query.invalidate(),
      ]);
    },
  });

  async function submitCapture() {
    if (!text.trim()) return;
    await capture.mutateAsync({
      text,
      sourceLabel: sourceLabel || undefined,
      shouldSummarize: true,
    });
  }

  async function uploadFile() {
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    if (!file) return;
    setUploadMessage("Importing file...");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/uploads", {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      setUploadMessage("Upload failed. Check the server log.");
      return;
    }
    setUploadMessage(`${file.name} imported into the capture inbox.`);
    input.value = "";
    await Promise.all([
      utils.dashboard.snapshot.invalidate(),
      utils.inbox.list.invalidate(),
      utils.search.query.invalidate(),
    ]);
  }

  return (
    <section className="surface section-pad">
      <div className="card-title-row" style={{ marginBottom: 14 }}>
        <div>
          <div className="page-kicker">Universal capture</div>
          <h2 className="card-title" style={{ fontSize: 20 }}>
            Drop natural information here
          </h2>
        </div>
        <span className="pill accent">
          <Sparkles size={13} /> Intent router
        </span>
      </div>
      <div className="card-list">
        <input
          className="input"
          value={sourceLabel}
          onChange={(event) => setSourceLabel(event.target.value)}
          placeholder="Optional source label, project, chat, or file note"
        />
        <textarea
          className="textarea"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Paste notes, chat snippets, decisions, deadlines, links, or preferences..."
        />
        <div className="toolbar">
          <button className="button" type="button" onClick={submitCapture} disabled={!text.trim() || capture.isPending}>
            {capture.isPending ? <Loader2 size={16} /> : <Send size={16} />}
            Capture
          </button>
          {capture.data ? (
            <span className="pill accent">
              {capture.data.intents.length} intents, {capture.data.chunks.length} chunks
            </span>
          ) : null}
          {capture.error ? <span className="pill amber">{capture.error.message}</span> : null}
        </div>
      </div>

      <div className="file-drop" style={{ marginTop: 16 }}>
        <div className="card-list" style={{ width: "100%" }}>
          <strong>Manual file import</strong>
          <p className="card-copy">
            Text and Markdown are chunked now. Images, PDFs, documents, audio, and video are stored in the local vault and
            sent to review until a capable provider is configured.
          </p>
          <div className="toolbar">
            <input ref={fileInputRef} type="file" className="input" style={{ maxWidth: 420 }} />
            <button className="button secondary" type="button" onClick={uploadFile}>
              <FileUp size={16} />
              Import
            </button>
          </div>
          {uploadMessage ? <span className="pill">{uploadMessage}</span> : null}
        </div>
      </div>
    </section>
  );
}
