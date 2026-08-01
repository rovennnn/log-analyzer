"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useFiles } from "@/lib/FileContext";
import { uploadFile, deleteFile, ApiError, UploadResponse } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";

const SAMPLES = [
  {
    filename: "ecommerce-api-36h.jsonl",
    label: "ecommerce-api-36h.jsonl",
    blurb: "~9.8k events, 36h, one payment-gateway incident",
  },
  {
    filename: "checkout-service-4h.jsonl",
    label: "checkout-service-4h.jsonl",
    blurb: "~2.4k events, 4h, denser traffic + a shorter incident",
  },
];

const EXAMPLE_LINE = `{"timestamp": "2026-07-14T08:23:11.482Z", "level": "info", "service": "checkout-api", "method": "GET", "path": "/api/cart/1234", "status": 200, "duration_ms": 42, "ip": "10.0.4.22", "request_id": "a1b2c3", "message": "request completed"}`;

export default function UploadPage() {
  const { files, refreshFiles, setSelectedFileId } = useFiles();
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<"idle" | "parsing" | "done" | "error">("idle");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [samplePending, setSamplePending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(
    async (file: File) => {
      setStatus("parsing");
      setErrorMsg(null);
      try {
        const res = await uploadFile(file);
        setResult(res);
        setStatus("done");
        await refreshFiles();
        setSelectedFileId(res.file.id);
      } catch (e) {
        setStatus("error");
        setErrorMsg(e instanceof ApiError ? e.message : "Upload failed.");
      }
    },
    [refreshFiles, setSelectedFileId]
  );

  async function loadSample(filename: string) {
    setSamplePending(filename);
    try {
      const res = await fetch(`/sample-logs/${filename}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "application/x-ndjson" });
      await doUpload(file);
    } finally {
      setSamplePending(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  }

  async function onDelete(id: number) {
    await deleteFile(id);
    await refreshFiles();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-mono text-sm text-text-primary">upload a log file</h1>
        <p className="mt-1 font-mono text-xs text-text-secondary">
          expects JSON-lines — one JSON object per line. example:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-sm border border-base-border bg-base-surface p-3 font-mono text-xs text-text-secondary">
          {EXAMPLE_LINE}
        </pre>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed py-12 text-center transition-none",
          dragOver ? "border-accent bg-accent-dim" : "border-base-border bg-base-surface hover:border-base-borderStrong"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jsonl,.log,.txt,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) doUpload(file);
            e.target.value = "";
          }}
        />
        <p className="font-mono text-sm text-text-primary">drop a .jsonl file here, or click to browse</p>
        <p className="font-mono text-xs text-text-dim">25MB max for this demo</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.filename}
            onClick={() => loadSample(s.filename)}
            disabled={samplePending !== null}
            className="rounded-sm border border-base-border bg-base-surface px-3 py-2 text-left font-mono text-xs text-text-secondary hover:border-accent hover:text-text-primary disabled:opacity-50"
          >
            <div className="text-text-primary">
              {samplePending === s.filename ? "loading…" : `try: ${s.label}`}
            </div>
            <div className="text-text-dim">{s.blurb}</div>
          </button>
        ))}
      </div>

      {status === "parsing" && (
        <div className="rounded-sm border border-base-border bg-base-surface px-3 py-2 font-mono text-xs text-text-secondary">
          parsing…
        </div>
      )}

      {status === "error" && errorMsg && (
        <div className="rounded-sm border border-accent/40 bg-accent-dim px-3 py-2 font-mono text-xs text-accent">
          {errorMsg}
        </div>
      )}

      {status === "done" && result && (
        <div className="rounded-sm border border-base-border bg-base-surface px-3 py-3 font-mono text-xs">
          <div className="mb-1 text-text-primary">{result.message}</div>
          <div className="text-text-secondary">
            {result.file.filename} · {result.file.event_count.toLocaleString()} events
            {result.file.skipped_lines > 0 && (
              <span className="text-warn"> · {result.file.skipped_lines} skipped</span>
            )}
          </div>
          <button
            onClick={() => router.push("/")}
            className="mt-2 rounded-sm border border-base-border px-2 py-1 text-text-primary hover:border-accent hover:text-accent"
          >
            go to dashboard →
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div>
          <div className="mb-2 font-mono text-xs uppercase tracking-wide text-text-secondary">datasets loaded</div>
          <div className="overflow-hidden rounded-sm border border-base-border">
            <table className="w-full font-mono text-xs">
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-b border-base-border last:border-0">
                    <td className="px-3 py-2 text-text-primary">{f.filename}</td>
                    <td className="px-3 py-2 text-text-secondary">{f.event_count.toLocaleString()} events</td>
                    <td className="px-3 py-2 text-text-dim">{formatTimestamp(f.uploaded_at)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => onDelete(f.id)} className="text-text-dim hover:text-accent">
                        delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
