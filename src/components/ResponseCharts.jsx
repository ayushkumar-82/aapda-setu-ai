import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell,
} from "recharts";
import { Clock, Gauge, Inbox } from "lucide-react";

const SEVERITY_COLORS = { critical: "#dc2626", high: "#f97316", medium: "#f59e0b", low: "#10b981" };
const SEV_ORDER = ["critical", "high", "medium", "low"];

function minDiff(a, b) {
  const ms = new Date(b) - new Date(a);
  return Number.isFinite(ms) && ms > 0 ? ms / 60000 : null;
}
function avg(arr) { return arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null; }
function dayKey(d) { return new Date(d).toISOString().slice(0, 10); }
function dayLabel(k) { return new Date(k + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" }); }

export default function ResponseCharts({ sos }) {
  const { lineData, sevData, total, resolvedCount } = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const recent = (sos || []).filter((s) => new Date(s.created_date) >= since);

    const byDay = {};
    recent.forEach((s) => {
      const k = dayKey(s.created_date);
      if (!byDay[k]) byDay[k] = { ack: [], resolve: [] };
      const ack = minDiff(s.created_date, s.acknowledged_at);
      if (ack != null) byDay[k].ack.push(ack);
      const res = minDiff(s.created_date, s.resolved_at);
      if (res != null) byDay[k].resolve.push(res);
    });

    const lineData = Object.keys(byDay)
      .sort()
      .map((k) => ({
        day: dayLabel(k),
        ack: avg(byDay[k].ack) != null ? Math.round(avg(byDay[k].ack)) : null,
        resolve: avg(byDay[k].resolve) != null ? Math.round(avg(byDay[k].resolve)) : null,
      }));

    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    recent.forEach((s) => { if (counts[s.severity] != null) counts[s.severity]++; });
    const sevData = SEV_ORDER.map((sev) => ({ severity: sev, count: counts[sev] }));

    const resolvedCount = recent.filter((s) => s.status === "resolved").length;
    return { lineData, sevData, total: recent.length, resolvedCount };
  }, [sos]);

  if (!total) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
        <Inbox className="w-6 h-6 text-slate-300" />
        No SOS activity in the last 30 days to chart yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white border border-slate-200 p-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">SOS (30 days)</div>
          <div className="text-xl font-bold text-slate-800">{total}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Resolved</div>
          <div className="text-xl font-bold text-slate-800">{resolvedCount}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3">
          <Clock className="w-4 h-4 text-slate-400" /> Avg. response time (minutes / day)
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ack" name="Acknowledge" stroke="#2563eb" connectNulls dot={{ r: 2 }} />
              <Line type="monotone" dataKey="resolve" name="Resolve" stroke="#16a34a" connectNulls dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Based on acknowledged_at / resolved_at timestamps captured as SOS requests advance through the dashboard.</p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3">
          <Gauge className="w-4 h-4 text-slate-400" /> Severity distribution (last 30 days)
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sevData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="severity" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {sevData.map((entry) => (
                  <Cell key={entry.severity} fill={SEVERITY_COLORS[entry.severity]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}