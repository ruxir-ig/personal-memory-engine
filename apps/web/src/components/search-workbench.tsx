"use client";

import Link from "next/link";
import { ArrowUpRight, Loader2, Search } from "lucide-react";
import { useState } from "react";
import type { ArtifactType } from "@pme/shared";
import { trpc } from "@/trpc/client";
import { EmptyState } from "./empty-state";

const artifactTypes: ArtifactType[] = ["note", "text", "markdown", "image", "pdf", "document", "audio", "video", "chat", "link"];

export function SearchWorkbench() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ArtifactType[]>([]);
  const search = trpc.search.query.useQuery({ query, artifactTypes: selected, limit: 20 });

  function toggleType(type: ArtifactType) {
    setSelected((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));
  }

  return (
    <section className="surface section-pad">
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <div style={{ position: "relative", flex: "1 1 320px" }}>
          <Search size={16} style={{ left: 12, position: "absolute", top: 13, color: "var(--muted)" }} />
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by keyword, topic, source, project, or cited phrase"
          />
        </div>
      </div>
      <div className="pill-row" style={{ marginBottom: 18 }}>
        {artifactTypes.map((type) => (
          <button
            className={selected.includes(type) ? "pill accent" : "pill"}
            key={type}
            type="button"
            onClick={() => toggleType(type)}
          >
            {type}
          </button>
        ))}
      </div>
      {search.isLoading ? (
        <span className="pill">
          <Loader2 size={13} /> Searching
        </span>
      ) : search.data?.length ? (
        <div className="card-list">
          {search.data.map((result) => (
            <article className="memory-card" key={result.chunk.id}>
              <div className="card-title-row">
                <div>
                  <h2 className="card-title">{result.artifact.title}</h2>
                  <p className="card-copy">{result.chunk.text}</p>
                </div>
                <Link className="icon-button secondary" href={`/artifact/${result.artifact.id}`} title="Open source">
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="pill-row">
                <span className="pill accent">score {result.score.toFixed(2)}</span>
                <span className="pill">keyword {result.scoreBreakdown.keyword.toFixed(2)}</span>
                <span className="pill">semantic {result.scoreBreakdown.semantic.toFixed(2)}</span>
                <span className="pill">graph {result.scoreBreakdown.graph.toFixed(2)}</span>
                {result.matchedTerms.map((term) => (
                  <span className="pill" key={term}>
                    {term}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState>No matching chunks yet. Empty search shows recent memory; specific searches require a term match.</EmptyState>
      )}
    </section>
  );
}
