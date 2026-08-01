"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useFiles } from "@/lib/FileContext";

const NAV_ITEMS = [
  { href: "/", label: "dashboard" },
  { href: "/logs", label: "raw logs" },
  { href: "/upload", label: "upload" },
];

export function TopNav() {
  const pathname = usePathname();
  const { files, selectedFileId, setSelectedFileId, loading } = useFiles();

  return (
    <header className="sticky top-0 z-10 border-b border-base-border bg-base/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm text-text-primary shrink-0">
          <span className="text-accent">$</span>
          <span>Logwatch</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "rounded-sm px-2.5 py-1 font-sans text-sm transition-none",
                  active
                    ? "bg-base-surfaceHover text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {loading ? (
            <span className="font-mono text-xs text-text-dim">loading datasets…</span>
          ) : files.length === 0 ? (
            <Link href="/upload" className="font-mono text-xs text-text-secondary hover:text-text-primary">
              no dataset loaded — upload one
            </Link>
          ) : (
            <select
              value={selectedFileId ?? ""}
              onChange={(e) => setSelectedFileId(Number(e.target.value))}
              className="max-w-[280px] truncate rounded-sm border border-base-border bg-base-surface px-2 py-1 font-mono text-xs text-text-primary focus-visible:outline-accent"
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.filename} ({f.event_count.toLocaleString()})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </header>
  );
}
