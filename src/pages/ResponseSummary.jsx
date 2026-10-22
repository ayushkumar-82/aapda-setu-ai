import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ClipboardCopy, Download, RefreshCw, Clock, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

function minutesBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Number.isFinite(ms) && ms > 0 ? ms / 60000 : null;
}

function fmtMins(m) {
  if (m == null) return "n/a";
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

function buildSummary(sos, incidents) {
  const now = new Date();
  const ackMins = sos
    .filter((s) => s.acknowledged_at)
    .map((s) => minutesBetween(s.created_date, s.acknowledged_at))
    .filter((v) => v != null);
  const resMins = sos
    .filter((s) => s.resolved_at)
    .map((s) => minutesBetween(s.created_date, s.resolved_at))
    .filter((v) => v != null);
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const resolved = sos.filter((s) => s.status === "resolved");
  const open = sos.filter((s) => s.status !== "resolved");
  const activeIncidents = incidents.filter((i) => i.status === "active");

  const bySeverity = {};
  sos.forEach((s) => { bySeverity[s.severity] = (bySeverity[s.severity] || 0) + 1; });
  const byCategory = {};
  sos.forEach((s) => { byCategory[s.category] = (byCategory[s.category] || 0) + 1; });

  const stats = {
    totalSos: sos.length,
    resolvedCount: resolved.length,
    openCount: open.length,
    criticalOpen: open.filter((s) => s.severity === "critical").length,
    avgAck: avg(ackMins),
    fastestAck: ackMins.length ? Math.min(...ackMins) : null,
    slowestAck: ackMins.length ? Math.max(...ackMins) : null,
    avgResolve: avg(resMins),
    ackCount: ackMins.length,
    resolveCount: resMins.length,
    activeIncidents: activeIncidents.length,
    incidentTypes: [...new Set(activeIncidents.map((i) => i.type))],
    bySeverity,
    byCategory,
    periodStart: sos.length ? new Date(sos[sos.length - 1].created_date) : null,
  };

  const lines = [
    "AapdaSetu AI — Incident Response Summary",
    `Generated: ${now.toLocaleString()}`,
    ...(stats.periodStart ? [`Reporting period: ${stats.periodStart.toLocaleString()} – ${now.toLocaleString()}`] : []),
    "",
    "SOS RESPONSE TIMES",
    `- Total SOS requests: ${stats.totalSos} (resolved ${stats.resolvedCount}, open ${stats.openCount}${stats.criticalOpen ? `, ${stats.criticalOpen} critical open` : ""})`,
    `- Average time to acknowledge: ${fmtMins(stats.avgAck)} — fastest ${fmtMins(stats.fastestAck)}, slowest ${fmtMins(stats.slowestAck)} (${stats.ackCount} acknowledged)`,
    `- Average time to resolve: ${fmtMins(stats.avgResolve)} (${stats.resolveCount} resolved)`,
    "",
    "ACTIONS TAKEN",
    `- SOS acknowledged by authorities: ${stats.ackCount}`,
    `- SOS rescue completed / resolved: ${stats.resolveCount}`,
    `- Active incidents monitored: ${stats.activeIncidents}${stats.incidentTypes.length ? ` (${stats.incidentTypes.join(", ")})` : ""}`,
    "",
    "SOS BY SEVERITY",
    ...(Object.keys(stats.bySeverity).length ? Object.entries(stats.bySeverity).map(([k, v]) => `- ${k}: ${v}`) : ["- none recorded"]),
    "",
    "SOS BY CATEGORY",
    ...(Object.keys(stats.byCategory).length ? Object.entries(stats.byCategory).map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`) : ["- none recorded"]),
  ];
  stats.text = lines.join("\n");
  return stats;
}

export default function ResponseSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    const [sos, incidents] = await Promise.all([
      base44.entities.SOSRequest.list("-created_date", 200).catch(() => []),
      base44.entities.Incident.list("-created_date", 200).catch(() => []),
    ]);
    setSummary(buildSummary(sos || [], incidents || []));
    setLoading(false);
  }

  useEffect(() => { generate(); }, []);

  function copyText() {
    if (!summary) return;
    navigator.clipboard.writeText(summary.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function downloadText() {
    if (!summary) return;
    const blob = new Blob([summary.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aapdasetu-response-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Link to="/authority" className="p-1.5 rounded-full bg-slate-700 hover:bg-slate-600"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <div className="font-bold text-sm">Response Summary</div>
            <div className="text-[10px] text-slate-400">Auto-generated for post-disaster review</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generate} disabled={loading} className="text-xs px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center gap-1 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Regenerate
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {loading || !summary ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400">Generating summary…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <MetricCard icon={<Clock className="w-4 h-4" />} label="Avg. acknowledge" value={fmtMins(summary.avgAck)} />
              <MetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Avg. resolution" value={fmtMins(summary.avgResolve)} />
              <MetricCard icon={<CheckCircle2 className="w-4 h-4" />} label="Resolved / total" value={`${summary.resolvedCount}/${summary.totalSos}`} />
              <MetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Critical open" value={summary.criticalOpen} tone={summary.criticalOpen ? "danger" : ""} />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <FileText className="w-4 h-4 text-slate-400" /> Brief summary
                </div>
                <div className="flex gap-2">
                  <button onClick={copyText} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-900 text-white flex items-center gap-1">
                    <ClipboardCopy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy"}
                  </button>
                  <button onClick={downloadText} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 rounded-xl p-3 border border-slate-100">{summary.text}</pre>
              {summary.ackCount === 0 && (
                <p className="text-[11px] text-slate-400 mt-2">
                  Response times appear once SOS requests are advanced through the authority dashboard (acknowledged / resolved timestamps).
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, tone = "" }) {
  const toneClass = tone === "danger" ? "text-red-600" : "text-slate-800";
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3">
      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">{icon} {label}</div>
      <div className={`text-xl font-bold mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
}