const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface LogFileSummary {
  id: number;
  filename: string;
  uploaded_at: string;
  event_count: number;
  skipped_lines: number;
  start_time: string | null;
  end_time: string | null;
}

export interface UploadResponse {
  file: LogFileSummary;
  message: string;
}

export interface TimeSeriesPoint {
  bucket_start: string;
  total: number;
  error_count: number;
  avg_duration_ms: number | null;
}

export interface StatusBreakdownItem {
  status_class: string;
  count: number;
}

export interface LevelBreakdownItem {
  level: string;
  count: number;
}

export interface SlowEndpoint {
  method: string | null;
  path: string | null;
  count: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  max_duration_ms: number;
}

export interface TopError {
  message: string;
  count: number;
  status: number | null;
  example_path: string | null;
  last_seen: string;
}

export interface AnalysisResponse {
  file_id: number;
  range_start: string | null;
  range_end: string | null;
  bucket_seconds: number;
  total_requests: number;
  error_rate: number;
  time_series: TimeSeriesPoint[];
  status_breakdown: StatusBreakdownItem[];
  level_breakdown: LevelBreakdownItem[];
  slowest_endpoints: SlowEndpoint[];
  top_errors: TopError[];
}

export interface LogEventOut {
  id: number;
  timestamp: string;
  level: string;
  service: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  duration_ms: number | null;
  message: string | null;
  request_id: string | null;
  ip: string | null;
}

export interface PaginatedLogEvents {
  items: LogEventOut[];
  total: number;
  page: number;
  page_size: number;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(0, `Can't reach the API at ${API_BASE}. Is the backend running?`);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export function listFiles(): Promise<LogFileSummary[]> {
  return request("/api/files");
}

export function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/upload", { method: "POST", body: formData });
}

export function deleteFile(fileId: number): Promise<{ deleted: number }> {
  return request(`/api/files/${fileId}`, { method: "DELETE" });
}

export interface AnalysisFilters {
  start?: string;
  end?: string;
  level?: string;
  status_class?: string;
}

export function getAnalysis(fileId: number, filters: AnalysisFilters = {}): Promise<AnalysisResponse> {
  const params = new URLSearchParams({ file_id: String(fileId) });
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return request(`/api/analysis?${params.toString()}`);
}

export interface LogFilters extends AnalysisFilters {
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  page?: number;
  page_size?: number;
}

export function getLogs(fileId: number, filters: LogFilters = {}): Promise<PaginatedLogEvents> {
  const params = new URLSearchParams({ file_id: String(fileId) });
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });
  return request(`/api/logs?${params.toString()}`);
}
