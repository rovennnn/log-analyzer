export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "");
}

export function formatShortTime(iso: string, bucketSeconds: number): string {
  const d = new Date(iso);
  if (bucketSeconds < 3600) {
    return d.toISOString().slice(11, 16); // HH:MM
  }
  if (bucketSeconds < 24 * 3600) {
    return d.toISOString().slice(11, 16);
  }
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function statusClassOf(status: number | null): "2xx" | "3xx" | "4xx" | "5xx" | "other" {
  if (status === null) return "other";
  if (status >= 200 && status < 300) return "2xx";
  if (status >= 300 && status < 400) return "3xx";
  if (status >= 400 && status < 500) return "4xx";
  if (status >= 500 && status < 600) return "5xx";
  return "other";
}

// Deliberate, restrained semantic mapping — not default Tailwind colors.
// 2xx/3xx recede (this is "normal"); 4xx is amber; 5xx uses the one reserved accent.
export const STATUS_COLORS: Record<string, { text: string; bg: string; dot: string }> = {
  "2xx": { text: "text-ok", bg: "bg-ok-dim", dot: "bg-ok" },
  "3xx": { text: "text-info", bg: "bg-info-dim", dot: "bg-info" },
  "4xx": { text: "text-warn", bg: "bg-warn-dim", dot: "bg-warn" },
  "5xx": { text: "text-accent", bg: "bg-accent-dim", dot: "bg-accent" },
  other: { text: "text-text-secondary", bg: "bg-base-surfaceHover", dot: "bg-text-dim" },
};

export const LEVEL_COLORS: Record<string, { text: string; dot: string }> = {
  debug: { text: "text-text-dim", dot: "bg-text-dim" },
  info: { text: "text-text-secondary", dot: "bg-text-secondary" },
  warn: { text: "text-warn", dot: "bg-warn" },
  error: { text: "text-accent", dot: "bg-accent" },
  fatal: { text: "text-accent font-semibold", dot: "bg-accent" },
};
