import clsx from "clsx";
import { STATUS_COLORS, LEVEL_COLORS, statusClassOf } from "@/lib/format";

export function StatusBadge({ status }: { status: number | null }) {
  const cls = statusClassOf(status);
  const colors = STATUS_COLORS[cls];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-mono text-xs tabular", colors.text)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {status ?? "—"}
    </span>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const colors = LEVEL_COLORS[level] || LEVEL_COLORS.info;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 font-mono text-xs uppercase", colors.text)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {level}
    </span>
  );
}

export function StatusClassSwatch({ statusClass }: { statusClass: string }) {
  const colors = STATUS_COLORS[statusClass] || STATUS_COLORS.other;
  return <span className={clsx("h-2 w-2 rounded-full", colors.dot)} />;
}
