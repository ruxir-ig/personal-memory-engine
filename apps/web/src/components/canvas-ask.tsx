"use client";

import Link from "next/link";
import { ArrowUpRight, Loader2, Search } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/trpc/client";
import { EmptyState } from "./empty-state";

export function CanvasAsk() {
  const [question, setQuestion] = useState("What is Quipu?");
  const ask = trpc.chat.ask.useMutation();

  async function submitQuestion() {
    if (!question.trim()) return;
    await ask.mutateAsync({ question });
  }

  return (
    <section className="surface section-pad canvas-ask">
      <div className="section-title">
        <Search size={17} />
        <h2>Ask</h2>
      </div>
      <div className="ask-row">
        <input
          className="input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask from saved memory"
        />
        <button className="button" type="button" onClick={submitQuestion} disabled={!question.trim() || ask.isPending}>
          {ask.isPending ? <Loader2 size={16} /> : <Search size={16} />}
          Ask
        </button>
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
                  <h3 className="card-title">{citation.title}</h3>
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
        <EmptyState>Ask after adding a memory.</EmptyState>
      )}
    </section>
  );
}
