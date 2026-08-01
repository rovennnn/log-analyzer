"use client";

import { useMemo, useState } from "react";
import { SlowEndpoint } from "@/lib/api";
import { formatDuration } from "@/lib/format";

type SortKey = "count" | "avg_duration_ms" | "p95_duration_ms" | "max_duration_ms";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "count", label: "count" },
  { key: "avg_duration_ms", label: "avg" },
  { key: "p95_duration_ms", label: "p95" },
  { key: "max_duration_ms", label: "max" },
];

export function SlowEndpointsTable({ data }: { data: SlowEndpoint[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("avg_duration_ms");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...data];
    copy.sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? diff : -diff;
    });
    return copy;
  }, [data, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="rounded-sm border border-base-border bg-base-surface">
      <div className="border-b border-base-border px-3 py-2 font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">
        slowest endpoints
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-base-border text-text-dim">
              <th className="px-3 py-1.5 text-left font-normal">method</th>
              <th className="px-3 py-1.5 text-left font-normal">path</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-3 py-1.5 text-right font-normal">
                  <button
                    onClick={() => toggleSort(col.key)}
                    className="hover:text-text-primary"
                  >
                    {col.label}
                    {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-b border-base-border/60 last:border-0 hover:bg-base-surfaceHover">
                <td className="px-3 py-1.5 text-text-secondary">{row.method ?? "—"}</td>
                <td className="px-3 py-1.5 text-text-primary">{row.path ?? "—"}</td>
                <td className="px-3 py-1.5 text-right tabular text-text-secondary">{row.count}</td>
                <td className="px-3 py-1.5 text-right tabular text-text-primary">
                  {formatDuration(row.avg_duration_ms)}
                </td>
                <td className="px-3 py-1.5 text-right tabular text-warn">{formatDuration(row.p95_duration_ms)}</td>
                <td className="px-3 py-1.5 text-right tabular text-accent">{formatDuration(row.max_duration_ms)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-text-dim">
                  no data in this range
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
