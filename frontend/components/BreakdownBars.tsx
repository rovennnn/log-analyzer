import clsx from "clsx";

interface BreakdownItem {
  key: string;
  count: number;
  dotClass: string;
  textClass: string;
}

export function BreakdownBars({ title, items }: { title: string; items: BreakdownItem[] }) {
  const total = items.reduce((sum, i) => sum + i.count, 0) || 1;
  const sorted = [...items].sort((a, b) => b.count - a.count);

  return (
    <div className="rounded-sm border border-base-border bg-base-surface p-3">
      <div className="mb-2 font-sans text-xs font-medium uppercase tracking-wide text-text-secondary">
        {title}
      </div>
      <div className="space-y-1.5">
        {sorted.map((item) => {
          const pct = (item.count / total) * 100;
          return (
            <div key={item.key} className="flex items-center gap-2">
              <span className={clsx("w-10 shrink-0 font-mono text-xs uppercase", item.textClass)}>
                {item.key}
              </span>
              <div className="h-3.5 flex-1 overflow-hidden rounded-sm bg-base-borderStrong/30">
                <div
                  className={clsx("h-full", item.dotClass)}
                  style={{ width: `${Math.max(pct, 1.5)}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-xs tabular text-text-secondary">
                {item.count.toLocaleString()}
              </span>
            </div>
          );
        })}
        {sorted.length === 0 && <div className="font-mono text-xs text-text-dim">no data</div>}
      </div>
    </div>
  );
}
