"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TestHistoryChart({ data, medianMs }: { data: Array<{ label: string; durationMinutes: number; testCount?: number | null }>; medianMs: number }) {
  return (
    <div role="img" aria-label="Test duration history with the historical median" className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 12, left: -16, bottom: 0 }} accessibilityLayer>
          <defs><linearGradient id="testHistory" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} /><stop offset="95%" stopColor="#60a5fa" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} unit="m" />
          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#f8fafc" }} formatter={(value) => [`${value} min`, "Duration"]} />
          <ReferenceLine y={medianMs / 60_000} stroke="#fbbf24" strokeDasharray="5 5" label={{ value: "median", fill: "#fbbf24", fontSize: 11, position: "insideTopRight" }} />
          <Area type="monotone" dataKey="durationMinutes" stroke="#60a5fa" strokeWidth={2} fill="url(#testHistory)" dot={{ r: 2, fill: "#60a5fa" }} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
