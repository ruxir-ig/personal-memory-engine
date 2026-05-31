"use client";

import Link from "next/link";
import { ArrowUpRight, Loader2, Search } from "lucide-react";
import { useState } from "react";
import type { ArtifactType } from "@pme/shared";
import { useSearch } from "@/client/hooks";
import { EmptyState } from "./empty-state";

const artifactTypes: ArtifactType[] = ["note", "text", "markdown", "image", "pdf", "document", "audio", "video", "chat", "link"];

export function SearchWorkbench() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ArtifactType[]>([]);
  const search = useSearch({ query, artifactTypes: selected, limit: 20 });

  function toggleType(type: ArtifactType) {
    setSelected((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));
  }

  return (
    <div className="stack">
      <div className="input-search">
        <Search size={17} />
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search everything you have saved..." aria-label="Search memories" />
      </div>

      <div className="seg" role="group" aria-label="Filter by type">
        {artifactTypes.map((type) => (
          <button className="seg-btn" data-active={selected.includes(type)} key={type} type="button" onClick={() => toggleType(type)}>
            {type}
          </button>
        ))}
      </div>

      {search.isLoading ? (
        <span className="chip">
          <Loader2 size={13} className="spin" /> Searching
        </span>
      ) : search.data?.length ? (
        <div className="stack">
          {search.data.map((result) => (
            <article className="card pad hover" key={result.chunk.id}>
              <div className="row top between" style={{ gap: 12 }}>
                <div className="grow">
                  <Link className="item-title clamp-2" href={`/item/${result.artifact.id}`} style={{ fontSize: 15 }}>
                    {result.artifact.title}
                  </Link>
                  <p className="dim clamp-3" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
                    {result.chunk.text}
                  </p>
                </div>
                <Link className="icon-btn" href={`/item/${result.artifact.id}`} title="Open source" aria-label="Open source">
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="row between" style={{ marginTop: 12, gap: 14 }}>
                <div className="score-bar grow">
                  <span>match</span>
                  <span className="track">
                    <span className="fill" style={{ width: `${Math.min(100, Math.round(result.score * 100))}%` }} />
                  </span>
                  <span className="tnum">{result.score.toFixed(2)}</span>
                </div>
                <div className="chip-row">
                  {result.matchedTerms.slice(0, 4).map((term) => (
                    <span className="chip" key={term}>
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title={query ? "No matches" : "Search your memory"}>
          {query ? "Nothing matched that yet. Try fewer or different words." : "Type a keyword, topic, source, or a phrase you remember saving."}
        </EmptyState>
      )}
    </div>
  );
}
