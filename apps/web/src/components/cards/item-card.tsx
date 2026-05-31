import Link from "next/link";
import { Play } from "lucide-react";
import type { CSSProperties } from "react";
import type { Artifact, MemoryKind, SummaryRecord } from "@pme/shared";
import { kindAccentColor, kindMeta } from "@/lib/registry";
import { hueFromString, relativeTime } from "@/lib/utils";
import { SecretCard } from "./secret-card";

const MEDIA = new Set<MemoryKind>(["reel", "video"]);

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function ItemCard({ item, summary }: { item: Artifact; summary?: SummaryRecord }) {
  const s = item.structured ?? {};

  if (item.kind === "credential") {
    return (
      <SecretCard
        label={str(s.secretLabel) ?? item.title}
        masked={str(s.secretMasked) ?? "\u2022\u2022\u2022\u2022\u2022\u2022"}
        secretVaultId={str(s.secretVaultId)}
        service={str(s.service)}
      />
    );
  }

  const url = str(s.url);
  const host = str(s.host) ?? str(s.platform);
  const ext = Boolean(url);
  const href = url ?? `/item/${item.id}`;
  const meta = kindMeta[item.kind] ?? kindMeta.note;
  const Icon = meta.icon;

  if (MEDIA.has(item.kind)) {
    const hue = hueFromString(url ?? item.title);
    const gradient: CSSProperties = {
      background: `linear-gradient(150deg, hsl(${hue} 52% 44%), hsl(${(hue + 48) % 360} 58% 26%))`,
    };
    const title = str(s.mediaTitle) ?? item.title;
    return (
      <div className="item-card">
        {ext ? (
          <a className="cover" style={gradient} href={url} target="_blank" rel="noreferrer">
            {str(s.platform) ? <span className="plat">{str(s.platform)}</span> : null}
            <span className="play">
              <Play size={18} fill="currentColor" />
            </span>
          </a>
        ) : (
          <Link className="cover" style={gradient} href={href}>
            <span className="play">
              <Play size={18} fill="currentColor" />
            </span>
          </Link>
        )}
        <div className="item-card-body">
          {ext ? (
            <a className="item-title clamp-2" href={url} target="_blank" rel="noreferrer">
              {title}
            </a>
          ) : (
            <Link className="item-title clamp-2" href={href}>
              {title}
            </Link>
          )}
          <div className="item-meta">
            <span className="truncate">{host ?? "link"}</span>
            <span>·</span>
            <span>{relativeTime(item.capturedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  const accent = kindAccentColor(item.kind);
  return (
    <div className="item-card">
      <div className="item-card-body" style={{ gap: 9, padding: "14px 15px" }}>
        <div className="row top" style={{ gap: 11 }}>
          <span
            aria-hidden="true"
            style={{
              display: "grid",
              placeItems: "center",
              width: 32,
              height: 32,
              borderRadius: 9,
              flex: "none",
              background: `color-mix(in oklab, ${accent} 16%, transparent)`,
              color: accent,
            }}
          >
            <Icon size={16} />
          </span>
          <div className="grow">
            {ext ? (
              <a className="item-title clamp-2" href={url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            ) : (
              <Link className="item-title clamp-2" href={href}>
                {item.title}
              </Link>
            )}
            {summary?.summary ? (
              <p className="dim clamp-2" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.45 }}>
                {summary.summary}
              </p>
            ) : null}
          </div>
        </div>
        <div className="item-meta">
          <span className="chip kind" style={{ ["--k" as string]: accent }}>
            {meta.label}
          </span>
          {host ? <span className="truncate">{host}</span> : null}
          <span style={{ marginLeft: "auto" }}>{relativeTime(item.capturedAt)}</span>
        </div>
      </div>
    </div>
  );
}
