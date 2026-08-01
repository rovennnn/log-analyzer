"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { useFiles } from "@/lib/FileContext";
import { getLogs, PaginatedLogEvents, ApiError } from "@/lib/api";
import { FilterBar, Filters } from "@/components/FilterBar";
import { StatusBadge, LevelBadge } from "@/components/Badges";
import { formatDuration, formatTimestamp } from "@/lib/format";

type SortBy = "timestamp" | "status" | "duration_ms" | "level" | "path" | "method";

const COLUMNS: { key: SortBy | null; label: string; align?: "right" }[] = [
  { key: "timestamp", label: "timestamp" },
  { key: "level", label: "level" },
  { key: "method", label: "method" },
  { key: "path", label: "path" },
  { key: "status", label: "status" },
  { key: "duration_ms", label: "duration", align: "right" },
  { key: null, label: "message" },
];

const PAGE_SIZE = 50;

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="font-mono text-sm text-text-dim">loading…</div>}>
      <LogsPageInner />
    </Suspense>
  );
}

function LogsPageInner() {
  const { selectedFile, selectedFileId, loading: filesLoading } = useFiles();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() => ({
    start: searchParams.get("start") || undefined,
    end: searchParams.get("end") || undefined,
    level: searchParams.get("level") || "all",
    status_class: searchParams.get("status_class") || "all",
  }));
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedLogEvents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filters, search, selectedFileId]);

  useEffect(() => {
    if (!selectedFileId) return;
    setLoading(true);
    setError(null);
    getLogs(selectedFileId, {
      ...filters,
      search: search || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      page_size: PAGE_SIZE,
    })
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load logs."))
      .finally(() => setLoading(false));
  }, [selectedFileId, filters, search, sortBy, sortDir, page]);

  function toggleSort(key: SortBy) {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

  const totalPages = useMemo(() => (data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1), [data]);

  if (filesLoading) {
    return <div className="font-mono text-sm text-text-dim">loading…</div>;
  }

  if (!selectedFile) {
    return <div className="font-mono text-sm text-text-secondary">no dataset loaded — upload one first.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          datasetStart={selectedFile.start_time}
          datasetEnd={selectedFile.end_time}
          isCustomRange={Boolean(filters.start)}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search message or path…"
          className="w-64 rounded-sm border border-base-border bg-base-surface px-2 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-dim focus-visible:outline-accent"
        />
      </div>

      {error && (
        <div className="rounded-sm border border-accent/40 bg-accent-dim px-3 py-2 font-mono text-xs text-accent">
          {error}
        </div>
      )}

      <div className="rounded-sm border border-base-border bg-base-surface">
        <div className="flex items-center justify-between border-b border-base-border px-3 py-2 font-mono text-xs text-text-secondary">
          <span>
            {data ? `${data.total.toLocaleString()} matching events` : "—"}
            {loading && <span className="ml-2 text-text-dim">refreshing…</span>}
          </span>
          <span className="text-text-dim">
            page {page} / {totalPages}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-base-border text-text-dim">
                {COLUMNS.map((col) => (
                  <th
                    key={col.label}
                    className={clsx("whitespace-nowrap px-3 py-1.5 font-normal", col.align === "right" ? "text-right" : "text-left")}
                  >
                    {col.key ? (
                      <button onClick={() => toggleSort(col.key as SortBy)} className="hover:text-text-primary">
                        {col.label}
                        {sortBy === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.items.map((row) => (
                <tr key={row.id} className="border-b border-base-border/60 last:border-0 hover:bg-base-surfaceHover">
                  <td className="whitespace-nowrap px-3 py-1.5 text-text-dim">{formatTimestamp(row.timestamp)}</td>
                  <td className="px-3 py-1.5">
                    <LevelBadge level={row.level} />
                  </td>
                  <td className="px-3 py-1.5 text-text-secondary">{row.method ?? "—"}</td>
                  <td className="px-3 py-1.5 text-text-primary">{row.path ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right tabular text-text-secondary">
                    {formatDuration(row.duration_ms)}
                  </td>
                  <td className="max-w-[420px] truncate px-3 py-1.5 text-text-secondary" title={row.message ?? ""}>
                    {row.message ?? "—"}
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-text-dim">
                    no events match these filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-base-border px-3 py-2 font-mono text-xs">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-text-secondary hover:text-text-primary disabled:opacity-30"
          >
            ← prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-text-secondary hover:text-text-primary disabled:opacity-30"
          >
            next →
          </button>
        </div>
      </div>
    </div>
  );
}
