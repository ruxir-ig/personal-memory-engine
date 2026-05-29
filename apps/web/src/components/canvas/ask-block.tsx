"use client";

import Link from "next/link";
import { ArrowUpRight, Loader2, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/trpc/client";

export function AskBlock({ suggestions }: { suggestions: string[] }) {
  const [question, setQuestion] = useState("");
  const ask = trpc.chat.ask.useMutation();

  function run(value: string) {
    const q = value.trim();
    if (!q) return;
    setQuestion(q);
    ask.mutate({ question: q });
  }

  return (
    <div className="ask">
      <div className="block-title" style={{ marginBottom: 4 }}>
        <span className="ic">
          <Sparkles size={15} />
        </span>
        Ask your memory
      </div>
      <p className="faint" style={{ fontSize: 12.5, marginTop: 2 }}>
        Grounded answers from what you have saved.
      </p>
      <form
        className="ask-input-row"
        onSubmit={(event) => {
          event.preventDefault();
          run(question);
        }}
      >
        <div className="input-search grow">
          <Search size={16} />
          <input className="input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask anything you saved..." aria-label="Ask your memory" />
        </div>
        <button className="btn" type="submit" disabled={ask.isPending || !question.trim()} aria-label="Ask">
          {ask.isPending ? <Loader2 size={16} className="spin" /> : <ArrowUpRight size={16} />}
        </button>
      </form>

      {suggestions.length > 0 && !ask.data ? (
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
          <p className="body">{ask.data.answer}</p>
          {ask.data.uncertainty ? (
            <p className="faint" style={{ fontSize: 12 }}>
              {ask.data.uncertainty}
            </p>
          ) : null}
          {ask.data.citations.length > 0 ? (
            <div className="stack sm">
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
      ) : null}
    </div>
  );
}
