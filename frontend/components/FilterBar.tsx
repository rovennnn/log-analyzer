"use client";

import clsx from "clsx";

export interface Filters {
  start?: string;
  end?: string;
  level: string;
  status_class: string;
}

const LEVELS = ["all", "debug", "info", "warn", "error", "fatal"];
const STATUS_CLASSES = ["all", "2xx", "3xx", "4xx", "5xx"];

interface PresetRange {
  label: string;
  hours: number;
}

const PRESETS: PresetRange[] = [
  { label: "15m", hours: 0.25 },
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
];

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  datasetEnd: string | null;
  datasetStart: string | null;
  isCustomRange: boolean;
}

export function FilterBar({ filters, onChange, datasetEnd, datasetStart, isCustomRange }: Props) {
  function applyPreset(hours: number) {
    if (!datasetEnd) return;
    const end = new Date(datasetEnd);
    const start = new Date(end.getTime() - hours * 3600 * 1000);
    const clampedStart = datasetStart && start < new Date(datasetStart) ? new Date(datasetStart) : start;
    onChange({ ...filters, start: clampedStart.toISOString(), end: end.toISOString() });
  }

  function resetRange() {
    onChange({ ...filters, start: undefined, end: undefined });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
      <div className="flex items-center gap-1 rounded-sm border border-base-border bg-base-surface p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.hours)}
            className="rounded-sm px-2 py-1 text-text-secondary hover:bg-base-surfaceHover hover:text-text-primary"
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={resetRange}
          className={clsx(
            "rounded-sm px-2 py-1",
            !isCustomRange ? "bg-base-surfaceHover text-text-primary" : "text-text-secondary hover:text-text-primary"
          )}
        >
          all
        </button>
      </div>

      <select
        value={filters.level}
        onChange={(e) => onChange({ ...filters, level: e.target.value })}
        className="rounded-sm border border-base-border bg-base-surface px-2 py-1.5 text-text-primary focus-visible:outline-accent"
        aria-label="Filter by log level"
      >
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            level: {l}
          </option>
        ))}
      </select>

      <select
        value={filters.status_class}
        onChange={(e) => onChange({ ...filters, status_class: e.target.value })}
        className="rounded-sm border border-base-border bg-base-surface px-2 py-1.5 text-text-primary focus-visible:outline-accent"
        aria-label="Filter by status class"
      >
        {STATUS_CLASSES.map((s) => (
          <option key={s} value={s}>
            status: {s}
          </option>
        ))}
      </select>

      {isCustomRange && filters.start && filters.end && (
        <span className="text-text-dim">
          {new Date(filters.start).toISOString().slice(0, 16).replace("T", " ")} →{" "}
          {new Date(filters.end).toISOString().slice(0, 16).replace("T", " ")}
        </span>
      )}
    </div>
  );
}
