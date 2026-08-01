"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFiles } from "@/lib/FileContext";
import { getAnalysis, AnalysisResponse, ApiError } from "@/lib/api";
import { FilterBar, Filters } from "@/components/FilterBar";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { BreakdownBars } from "@/components/BreakdownBars";
import { SlowEndpointsTable } from "@/components/SlowEndpointsTable";
import { TopErrorsTable } from "@/components/TopErrorsTable";
import { STATUS_COLORS, LEVEL_COLORS } from "@/lib/format";

const DEFAULT_FILTERS: Filters = { level: "all", status_class: "all" };

export default function DashboardPage() {
  const { selectedFile, selectedFileId, loading: filesLoading } = useFiles();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
  }, [selectedFileId]);

  useEffect(() => {
    if (!selectedFileId) return;
    setLoading(true);
    setError(null);
    getAnalysis(selectedFileId, filters)
      .then(setAnalysis)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load analysis."))
      .finally(() => setLoading(false));
  }, [selectedFileId, filters]);

  if (filesLoading) {
    return <div className="font-mono text-sm text-text-dim">loading…</div>;
  }

  if (!selectedFile) {
    return <EmptyState />;
  }

  const logsHref = buildLogsHref(selectedFileId!, filters);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          datasetStart={selectedFile.start_time}
          datasetEnd={selectedFile.end_time}
          isCustomRange={Boolean(filters.start)}
        />
        <Link
          href={logsHref}
          className="font-mono text-xs text-text-secondary underline decoration-base-border underline-offset-4 hover:text-accent"
        >
          view matching raw logs →
        </Link>
      </div>

      {error && (
        <div className="rounded-sm border border-accent/40 bg-accent-dim px-3 py-2 font-mono text-xs text-accent">
          {error}
        </div>
      )}

      {analysis && (
        <>
          <SummaryLine analysis={analysis} loading={loading} />
          <TimeSeriesChart
            data={analysis.time_series}
            bucketSeconds={analysis.bucket_seconds}
            onRangeSelect={(start, end) => setFilters((f) => ({ ...f, start, end }))}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <BreakdownBars
              title="status codes"
              items={analysis.status_breakdown.map((s) => ({
                key: s.status_class,
                count: s.count,
                dotClass: STATUS_COLORS[s.status_class]?.dot ?? "bg-text-dim",
                textClass: STATUS_COLORS[s.status_class]?.text ?? "text-text-secondary",
              }))}
            />
            <BreakdownBars
              title="log levels"
              items={analysis.level_breakdown.map((l) => ({
                key: l.level,
                count: l.count,
                dotClass: LEVEL_COLORS[l.level]?.dot ?? "bg-text-secondary",
                textClass: LEVEL_COLORS[l.level]?.text ?? "text-text-secondary",
              }))}
            />
          </div>

          <SlowEndpointsTable data={analysis.slowest_endpoints} />
          <TopErrorsTable data={analysis.top_errors} />
        </>
      )}
    </div>
  );
}

function SummaryLine({ analysis, loading }: { analysis: AnalysisResponse; loading: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-base-border pb-3 font-mono text-sm">
      <span className="text-text-primary">
        {analysis.total_requests.toLocaleString()} <span className="text-text-secondary">requests</span>
      </span>
      <span className={analysis.error_rate > 2 ? "text-accent" : "text-text-primary"}>
        {analysis.error_rate}% <span className="text-text-secondary">error rate</span>
      </span>
      {analysis.range_start && analysis.range_end && (
        <span className="text-text-dim">
          {new Date(analysis.range_start).toISOString().slice(0, 16).replace("T", " ")} →{" "}
          {new Date(analysis.range_end).toISOString().slice(0, 16).replace("T", " ")}
        </span>
      )}
      {loading && <span className="text-text-dim">refreshing…</span>}
    </div>
  );
}

function buildLogsHref(fileId: number, filters: Filters): string {
  const params = new URLSearchParams({ file_id: String(fileId) });
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.level !== "all") params.set("level", filters.level);
  if (filters.status_class !== "all") params.set("status_class", filters.status_class);
  return `/logs?${params.toString()}`;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-base-border py-16 text-center">
      <p className="font-mono text-sm text-text-secondary">no dataset loaded yet</p>
      <Link
        href="/upload"
        className="rounded-sm border border-base-border bg-base-surface px-3 py-1.5 font-mono text-sm text-text-primary hover:border-accent hover:text-accent"
      >
        upload a log file →
      </Link>
    </div>
  );
}
