"use client";

import Link from "next/link";
import { ArrowUpRight, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/trpc/client";

export function ChatPanel() {
  const [question, setQuestion] = useState("");
  const ask = trpc.chat.ask.useMutation();

  async function submitQuestion() {
    if (!question.trim()) return;
    await ask.mutateAsync({ question });
  }

  return (
    <div className="grid-dashboard">
      <section className="surface section-pad">
        <div className="page-kicker" style={{ marginBottom: 12 }}>
          Grounded chat
        </div>
        <div className="card-list">
          <textarea
            className="textarea"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask from your captured memory, for example: what is the V0 architecture?"
          />
          <div className="toolbar">
            <button className="button" type="button" onClick={submitQuestion} disabled={!question.trim() || ask.isPending}>
              {ask.isPending ? <Loader2 size={16} /> : <Send size={16} />}
              Ask
            </button>
          </div>
        </div>
      </section>
      <section className="surface section-pad">
        <div className="page-kicker" style={{ marginBottom: 12 }}>
          Answer
        </div>
        {ask.data ? (
          <div className="card-list">
            <article className="memory-card">
              <p className="card-copy" style={{ color: "var(--foreground)" }}>
                {ask.data.answer}
              </p>
              <span className="pill amber">{ask.data.uncertainty}</span>
            </article>
            {ask.data.citations.map((citation) => (
              <article className="memory-card" key={citation.chunkId}>
                <div className="card-title-row">
                  <div>
                    <h2 className="card-title">{citation.title}</h2>
                    <p className="card-copy">{citation.quote}</p>
                  </div>
                  <Link className="icon-button secondary" href={`/artifact/${citation.artifactId}`} title="Open citation">
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">Answers appear here with exact source chunks as citations.</div>
        )}
      </section>
    </div>
  );
}
