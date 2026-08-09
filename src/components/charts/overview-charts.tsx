"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const tooltipStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#f8fafc",
  fontSize: "12px"
};

export function BuildDurationChart({ data }: { data: Array<{ build: string; durationMinutes: number; status: string }> }) {
  return (
    <div role="img" aria-label="Build duration in minutes for the latest builds" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }} accessibilityLayer>
          <defs>
            <linearGradient id="buildDuration" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="build" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} unit="m" />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#475569" }} formatter={(value) => [`${value} min`, "Duration"]} />
          <Area type="monotone" dataKey="durationMinutes" stroke="#4ade80" strokeWidth={2} fill="url(#buildDuration)" dot={false} activeDot={{ r: 4, fill: "#4ade80", stroke: "#020617", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TestComparisonChart({ data }: { data: Array<{ name: string; currentMinutes: number; medianMinutes: number; anomaly: string }> }) {
  return (
    <div role="img" aria-label="Current test duration compared with historical median in minutes" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }} accessibilityLayer>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
          <YAxis stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} unit="m" />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#1e293b", opacity: 0.45 }} formatter={(value) => [`${value} min`]} />
          <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
          <Bar dataKey="medianMinutes" name="Historical median" fill="#475569" radius={[3, 3, 0, 0]} />
          <Bar dataKey="currentMinutes" name="Current" fill="#60a5fa" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const colors: Record<string, string> = { HEALTHY: "#4ade80", DEGRADED: "#fbbf24", UNHEALTHY: "#f87171", UNKNOWN: "#64748b" };

export function ServiceDistributionChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div>
      <div role="img" aria-label={`${total} services grouped by health status`} className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={78} paddingAngle={3} stroke="none">
              {data.map((entry) => <Cell key={entry.name} fill={colors[entry.name] ?? colors.UNKNOWN} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-2 gap-2 text-xs text-slate-400" aria-label="Service health legend">
        {data.map((item) => <li key={item.name} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: colors[item.name] }} />{item.name}</span><span className="font-mono text-slate-200">{item.value}</span></li>)}
      </ul>
    </div>
  );
}
