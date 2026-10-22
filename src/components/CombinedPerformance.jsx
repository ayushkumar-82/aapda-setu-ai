import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell,
} from "recharts";
import { Clock, Gauge, Inbox, Activity, AlertTriangle } from "lucide-react";

const SOS_SEV_COLORS = { critical: "#dc2626", high: "#f97316", medium: "#f59e0b", low: "#10b981" };
const SOS_SEV_ORDER = ["critical", "high", "medium", "low"];
const INC_SEV_COLORS = { critical: "#dc2626", severe: "#ea580c", moderate: "#f59e0b", low: "#10b981" };
const INC_SEV_ORDER = ["critical", "severe", "moderate", "low"];
const ALERT_COLORS = { monitor: "#10b981", warn: "#f59e0b", escalate: "#f97316", critical: "#dc2626" };
const ALERT_ORDER = ["monitor", "warn", "escalate", "critical"];

function minDiff(a, b) {
  const ms = new Date(b) - new Date(a);
  return Number.isFinite(ms) && ms > 0 ? ms / 60000 : null;
}
function avg(arr) { return arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null; }
function dayKey(d) { return new Date(d).toISOString().slice(0, 10); }
function dayLabel(k) { return new Date(k + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" }); }

// Combined 30-day performance view: SOS average acknowledge/resolve times +
// severity distribution, plus Incident severity and alert-level distribution.
export default function CombinedPerformance({ sos, incidents }) {
  const data = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const recentSos = (sos || []).filter((s) => new Date(s.created_date) >= since);
    const recentInc = (incidents || []).filter((i) => new Date(i.created_date) >= since);

    // SOS response times by day
    const byDay = {};
    recentSos.forEach((s) => {
      const k = dayKey(s.created_date);
      if (!byDay[k]) byDay[k] = { ack: [], resolve: [] };
      const ack = minDiff(s.created_date, s.acknowledged_at);
      if (ack != null) byDay[k].ack.push(ack);
      const res = minDiff(s.created_date, s.resolved_at);
      if (res != null) byDay[k].resolve.push(res);
    });
    const lineData = Object.keys(byDay).sort().map((k) => ({
      day: dayLabel(k),
      ack: avg(byDay[k].ack) != null ? Math.round(avg(byDay[k].ack)) : null,
      resolve: avg(byDay[k].resolve) != null ? Math.round(avg(byDay[k].resolve)) : null,
    }));

    // SOS severity
    const sosCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    recentSos.forEach((s) => { if (sosCounts[s.severity] != null) sosCounts[s.severity]++; });
    const sosSevData = SOS_SEV_ORDER.map((sev) => ({ severity: sev, count: sosCounts[sev] }));

    // Incident severity
    const incCounts = { critical: 0, severe: 0, moderate: 0, low: 0 };
    recentInc.forEach((i) => { if (incCounts[i.severity] != null) incCounts[i.severity]++; });
    const incSevData = INC_SEV_ORDER.map((sev) => ({ severity: sev, count: incCounts[sev] }));

    // Incident alert levels
    const alertCounts = { monitor: 0, warn: 0, escalate: 0, critical: 0 };
    recentInc.forEach((i) => { if (alertCounts[i.alert_level] != null) alertCounts[i.alert_level]++; });
    const alertData = ALERT_ORDER.map((lvl) => ({ level: lvl, count: alertCounts[lvl] }));

    return {
      lineData,
      sosSevData,
      incSevData,
      alertData,
      sosTotal: recentSos.length,
      resolvedCount: recentSos.filter((s) => s.status === "resolved").length,
      incTotal: recentInc.length,
      activeInc: recentInc.filter((i) => i.status === "active").length,
    };
  }, [sos, incidents]);

  const { lineData, sosSevData, incSevData, alertData, sosTotal, resolvedCount, incTotal, activeInc } = data;

  if (!sosTotal && !incTotal) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
        <Inbox className="w-6 h-6 text-slate-300" />
        No SOS or incident activity in the last 30 days to chart yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <Stat label="SOS (30d)" value={sosTotal} />
        <Stat label="Resolved" value={resolvedCount} />
        <Stat label="Incidents" value={incTotal} />
        <Stat label="Active" value={activeInc} />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3">
          <Clock className="w-4 h-4 text-slate-400" /> Avg. SOS response time (minutes / day)
        </div>
        {lineData.length === 0 ? (
          <EmptyChart label="No acknowledged or resolved SOS in the last 30 days." />
        ) : (
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
        )}
        <p className="text-[10px] text-slate-400 mt-2">From acknowledged_at / resolved_at timestamps as SOS requests advance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3">
            <Activity className="w-4 h-4 text-slate-400" /> SOS severity
          </div>
          {sosTotal === 0 ? <EmptyChart label="No SOS data." /> : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sosSevData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="severity" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {sosSevData.map((e) => <Cell key={e.severity} fill={SOS_SEV_COLORS[e.severity]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3">
            <AlertTriangle className="w-4 h-4 text-slate-400" /> Incident severity
          </div>
          {incTotal === 0 ? <EmptyChart label="No incident data." /> : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incSevData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="severity" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {incSevData.map((e) => <Cell key={e.severity} fill={INC_SEV_COLORS[e.severity]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-3">
          <Gauge className="w-4 h-4 text-slate-400" /> Incident alert-level distribution
        </div>
        {incTotal === 0 ? <EmptyChart label="No incident data." /> : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {alertData.map((e) => <Cell key={e.level} fill={ALERT_COLORS[e.level]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3">
      <div className="text-[10px] font-semibold text-slate-400 uppercase">{label}</div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
    </div>
  );
}

function EmptyChart({ label }) {
  return <div className="h-[160px] flex items-center justify-center text-xs text-slate-400">{label}</div>;
}