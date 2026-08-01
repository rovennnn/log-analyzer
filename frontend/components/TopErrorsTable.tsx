import { TopError } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { StatusBadge } from "@/components/Badges";

export function TopErrorsTable({ data }: { data: TopError[] }) {
  return (
    <div className="rounded-sm border border-base-border bg-base-surface">
      <div className="border-b border-base-border px-3 py-2 font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">
        top error messages
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-base-border text-text-dim">
              <th className="px-3 py-1.5 text-left font-normal">message</th>
              <th className="px-3 py-1.5 text-left font-normal">status</th>
              <th className="px-3 py-1.5 text-left font-normal">example path</th>
              <th className="px-3 py-1.5 text-right font-normal">count</th>
              <th className="px-3 py-1.5 text-right font-normal">last seen</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-base-border/60 last:border-0 hover:bg-base-surfaceHover">
                <td className="max-w-[360px] truncate px-3 py-1.5 text-text-primary" title={row.message}>
                  {row.message}
                </td>
                <td className="px-3 py-1.5">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-3 py-1.5 text-text-secondary">{row.example_path ?? "—"}</td>
                <td className="px-3 py-1.5 text-right tabular text-accent">{row.count}</td>
                <td className="px-3 py-1.5 text-right tabular text-text-dim">
                  {formatTimestamp(row.last_seen)}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-text-dim">
                  no errors in this range
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
