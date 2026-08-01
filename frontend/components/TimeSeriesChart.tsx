"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
} from "recharts";
import { TimeSeriesPoint } from "@/lib/api";
import { formatShortTime, formatDuration } from "@/lib/format";

interface Props {
  data: TimeSeriesPoint[];
  bucketSeconds: number;
  onRangeSelect: (startIso: string, endIso: string) => void;
}

export function TimeSeriesChart({ data, bucketSeconds, onRangeSelect }: Props) {
  const chartData = useMemo(
    () =>
      data.map((p) => ({
        ...p,
        label: formatShortTime(p.bucket_start, bucketSeconds),
      })),
    [data, bucketSeconds]
  );

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-sm border border-base-border bg-base-surface font-mono text-sm text-text-dim">
        no data in this range
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-base-border bg-base-surface p-3">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#262B2F" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#8A9099", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#262B2F" }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#8A9099", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="total"
            name="requests"
            stroke="#7C93A8"
            fill="#7C93A8"
            fillOpacity={0.12}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="error_count"
            name="errors"
            stroke="#F0483E"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
          <Brush
            dataKey="label"
            height={22}
            stroke="#33393E"
            fill="#14171A"
            travellerWidth={8}
            onChange={(range) => {
              if (
                range &&
                typeof range.startIndex === "number" &&
                typeof range.endIndex === "number" &&
                data[range.startIndex] &&
                data[range.endIndex]
              ) {
                onRangeSelect(data[range.startIndex].bucket_start, data[range.endIndex].bucket_start);
              }
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 font-mono text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-3 bg-info" /> requests
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-3 bg-accent" /> errors
        </span>
        <span className="ml-auto text-text-dim">drag the brush below the chart to zoom into a window</span>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.find((p: any) => p.dataKey === "total")?.value ?? 0;
  const errors = payload.find((p: any) => p.dataKey === "error_count")?.value ?? 0;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-sm border border-base-borderStrong bg-base-surface px-3 py-2 font-mono text-xs shadow-none">
      <div className="mb-1 text-text-secondary">{label}</div>
      <div className="text-text-primary">requests: {total}</div>
      <div className={errors > 0 ? "text-accent" : "text-text-secondary"}>errors: {errors}</div>
      {point?.avg_duration_ms != null && (
        <div className="text-text-secondary">avg: {formatDuration(point.avg_duration_ms)}</div>
      )}
    </div>
  );
}
