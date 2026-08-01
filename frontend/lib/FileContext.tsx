"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LogFileSummary, listFiles } from "./api";

interface FileContextValue {
  files: LogFileSummary[];
  selectedFileId: number | null;
  selectedFile: LogFileSummary | null;
  setSelectedFileId: (id: number) => void;
  refreshFiles: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const FileContext = createContext<FileContextValue | null>(null);

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<LogFileSummary[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshFiles = useCallback(async () => {
    try {
      setError(null);
      const result = await listFiles();
      setFiles(result);
      setSelectedFileId((prev) => {
        if (prev && result.some((f) => f.id === prev)) return prev;
        return result.length > 0 ? result[0].id : null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load datasets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  const selectedFile = files.find((f) => f.id === selectedFileId) || null;

  return (
    <FileContext.Provider
      value={{ files, selectedFileId, selectedFile, setSelectedFileId, refreshFiles, loading, error }}
    >
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  const ctx = useContext(FileContext);
  if (!ctx) throw new Error("useFiles must be used within FileProvider");
  return ctx;
}
