"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ServiceHistoryChart({ data }: { data: Array<{ time: string; latencyMs: number; errors: number }> }) {
  return (
    <div role="img" aria-label="Service latency and error count over time" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 12, left: -16, bottom: 0 }} accessibilityLayer>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis yAxisId="latency" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} unit="ms" />
          <YAxis yAxisId="errors" orientation="right" stroke="#f87171" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f8fafc" }} />
          <Line yAxisId="latency" type="monotone" dataKey="latencyMs" name="Latency (ms)" stroke="#60a5fa" strokeWidth={2} dot={false} />
          <Line yAxisId="errors" type="monotone" dataKey="errors" name="Errors" stroke="#f87171" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
