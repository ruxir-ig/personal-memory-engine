"use client";

import Link from "next/link";
import { ArrowUpRight, Loader2, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAskMutation } from "@/client/hooks";
import { EmptyState } from "./empty-state";

export function ChatPanel({ suggestions }: { suggestions: string[] }) {
  const [question, setQuestion] = useState("");
  const ask = useAskMutation();

  function run(value: string) {
    const q = value.trim();
    if (!q) return;
    setQuestion(q);
    ask.mutate({
      question: q,
      clientNow: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="ask">
        <form
          className="ask-input-row"
          onSubmit={(event) => {
            event.preventDefault();
            run(question);
          }}
        >
          <div className="input-search grow">
            <Search size={16} />
            <input className="input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask anything from your memory..." aria-label="Ask your memory" />
          </div>
          <button className="btn" type="submit" disabled={!question.trim() || ask.isPending}>
            {ask.isPending ? <Loader2 size={16} className="spin" /> : <ArrowUpRight size={16} />}
            Ask
          </button>
        </form>

        {!ask.data && suggestions.length > 0 ? (
          <div className="ask-suggest">
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => run(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {ask.data ? (
          <div className="answer">
            <div className="row" style={{ gap: 9, alignItems: "flex-start" }}>
              <span className="block-title">
                <span className="ic">
                  <Sparkles size={15} />
                </span>
              </span>
              <p className="body grow">{ask.data.answer}</p>
            </div>
            {ask.data.uncertainty ? (
              <p className="faint" style={{ fontSize: 12 }}>
                {ask.data.uncertainty}
              </p>
            ) : null}
            {ask.data.toolsUsed && ask.data.toolsUsed.length > 0 ? (
              <p className="faint" style={{ fontSize: 12 }}>
                Tools: {ask.data.toolsUsed.map((tool) => `${tool.id} (${tool.summary})`).join(" · ")}
              </p>
            ) : null}
            {ask.data.citations.map((citation) => (
              <Link className="cite" key={citation.chunkId} href={`/item/${citation.artifactId}`}>
                <div className="grow">
                  <strong style={{ fontSize: 12.5 }}>{citation.title}</strong>
                  <blockquote>{citation.quote}</blockquote>
                </div>
                <ArrowUpRight size={14} className="faint" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {!ask.data ? (
        <EmptyState title="Grounded answers only" icon={<Sparkles size={20} />}>
          Quipu answers from what you have actually saved and links every claim back to the source.
        </EmptyState>
      ) : null}
    </div>
  );
}
