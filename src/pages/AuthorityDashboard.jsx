import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { useApp } from "@/lib/AppContext";
import { SOS_PRIORITY } from "@/lib/disasterActionsBridge";
import { SEED_RESOURCES } from "@/lib/demoData";
import SeverityBadge from "@/components/SeverityBadge";
import RiskBadge from "@/components/RiskBadge";
import MapView from "@/components/MapView";
import { Activity, Package, FileText, AlertTriangle, Check, UserCog, BarChart3, Radio } from "lucide-react";
import ResponseCharts from "@/components/ResponseCharts";
import CombinedPerformance from "@/components/CombinedPerformance";
import BroadcastComposer from "@/components/BroadcastComposer";

const SOS_STATUS = ["pending", "acknowledged", "responder_assigned", "rescue_in_progress", "resolved"];

export default function AuthorityDashboard() {
  const { lang } = useApp();
  const [user, setUser] = useState(null);
  const [sos, setSos] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState("sos");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    refresh();

    const u1 = base44.entities.SOSRequest.subscribe((ev) => {
      setSos((s) => ev.type === "create" ? [ev.data, ...s] : ev.type === "delete" ? s.filter((x) => x.id !== ev.data.id) : s.map((x) => x.id === ev.data.id ? ev.data : x));
    });
    const u2 = base44.entities.Incident.subscribe((ev) => {
      setIncidents((s) => ev.type === "create" ? [ev.data, ...s] : s.map((x) => x.id === ev.data.id ? ev.data : x));
    });
    const u3 = base44.entities.Report.subscribe((ev) => {
      setReports((s) => ev.type === "create" ? [ev.data, ...s] : s.map((x) => x.id === ev.data.id ? ev.data : x));
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  async function refresh() {
    const [s, i, r, rep] = await Promise.all([
      base44.entities.SOSRequest.list("-created_date", 50).catch(() => []),
      base44.entities.Incident.filter({ status: "active" }, "-created_date", 30).catch(() => []),
      base44.entities.Resource.list("-created_date", 50).catch(() => []),
      base44.entities.Report.list("-created_date", 30).catch(() => []),
    ]);
    if (r && r.length === 0) { base44.entities.Resource.bulkCreate(SEED_RESOURCES).catch(() => {}); }
    setSos(s || []); setIncidents(i || []); setResources(r || []); setReports(rep || []);
  }

  const sortedSos = [...sos].sort((a, b) => (SOS_PRIORITY[b.severity] || 0) - (SOS_PRIORITY[a.severity] || 0));

  async function advanceSos(item) {
    const idx = SOS_STATUS.indexOf(item.status);
    const next = SOS_STATUS[Math.min(idx + 1, SOS_STATUS.length - 1)];
    const updates = { status: next };
    const now = new Date().toISOString();
    if (next === "acknowledged" && !item.acknowledged_at) updates.acknowledged_at = now;
    if (next === "resolved" && !item.resolved_at) updates.resolved_at = now;
    try { await base44.entities.SOSRequest.update(item.id, updates); } catch (e) {}
  }

  async function verifyReport(item, status) {
    try { await base44.entities.Report.update(item.id, { verification_status: status }); } catch (e) {}
  }

  const mapMarkers = [
    ...sortedSos.map((s) => ({ lat: s.latitude, lng: s.longitude, type: "sos", popup: `SOS ${s.sos_id} · ${s.severity}` })),
    ...incidents.map((i) => ({ lat: i.latitude, lng: i.longitude, type: "incident", popup: `${i.type} ${i.risk_probability}%` })),
    ...resources.map((r) => ({ lat: r.latitude, lng: r.longitude, type: "resource", popup: r.name || r.type })),
  ];

  const tabs = [
    { key: "sos", label: "SOS", icon: Activity, count: sortedSos.length },
    { key: "incidents", label: "Incidents", icon: AlertTriangle, count: incidents.length },
    { key: "resources", label: "Resources", icon: Package, count: resources.length },
    { key: "reports", label: "Reports", icon: FileText, count: reports.length },
    { key: "performance", label: "Performance", icon: BarChart3 },
    { key: "broadcast", label: "Broadcast", icon: Radio },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <UserCog className="w-5 h-5" />
          <div>
            <div className="font-bold text-sm">Authority Dashboard</div>
            <div className="text-[10px] text-slate-400">{user?.email || "Authority user"} · Real-time</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/supplies" className="text-xs px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600">Supplies</Link>
          <Link to="/response-summary" className="text-xs px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600">Summary</Link>
          <button onClick={refresh} className="text-xs px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600">Refresh</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <MapView center={[19.076, 72.8777]} markers={mapMarkers} className="border border-slate-200" />

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 ${tab === key ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
              <Icon className="w-4 h-4" /> {label} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>

        {tab === "sos" && (
          <div className="space-y-2">
            {sortedSos.length === 0 && <Empty label="No SOS requests" />}
            {sortedSos.map((s) => (
              <div key={s.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-700">{s.sos_id}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{s.latitude?.toFixed(3)}, {s.longitude?.toFixed(3)} · {new Date(s.created_date).toLocaleTimeString()}</div>
                    {s.message && <div className="text-sm text-slate-700 mt-1">{s.message}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <SeverityBadge severity={s.severity} size="sm" />
                    <span className="text-[10px] text-slate-500 capitalize">{s.status.replace("_", " ")}</span>
                  </div>
                </div>
                {s.status !== "resolved" && (
                  <button onClick={() => advanceSos(s)} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-900 text-white">
                    Advance → {SOS_STATUS[Math.min(SOS_STATUS.indexOf(s.status) + 1, SOS_STATUS.length - 1)].replace("_", " ")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "incidents" && (
          <div className="space-y-2">
            {incidents.length === 0 && <Empty label="No active incidents" />}
            {incidents.map((i) => (
              <div key={i.id} className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold capitalize text-slate-800">{i.type.replace("_", " ")}</div>
                  <div className="text-[11px] text-slate-500">{i.recommended_action}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{i.risk_probability}%</span>
                  <RiskBadge level={i.alert_level} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "resources" && (
          <div className="space-y-2">
            {resources.length === 0 && <Empty label="No resources" />}
            {resources.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{r.name || r.type.replace("_", " ")}</div>
                  <div className="text-[11px] text-slate-500 capitalize">{r.type.replace("_", " ")} · {r.status}</div>
                </div>
                <div className="text-sm font-bold text-slate-700">{r.availability}/{r.capacity}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "reports" && (
          <div className="space-y-2">
            {reports.length === 0 && <Empty label="No reports" />}
            {reports.map((r) => (
              <div key={r.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold capitalize text-slate-800">{r.type.replace("_", " ")}</span>
                  <span className="text-[10px] text-slate-500">{r.verification_status.replace("_", " ")}</span>
                </div>
                {r.description && <p className="text-xs text-slate-500 mt-1">{r.description}</p>}
                {r.ai_category && <p className="text-[11px] text-violet-600 mt-1">AI: {r.ai_category} · {r.ai_severity} · {r.ai_confidence}%</p>}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => verifyReport(r, "human_verified")} className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-600 text-white inline-flex items-center gap-1"><Check className="w-3 h-3" /> Verify</button>
                  <button onClick={() => verifyReport(r, "rejected")} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-200 text-slate-600">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "performance" && (
          <CombinedPerformance sos={sos} incidents={incidents} />
        )}

        {tab === "broadcast" && (
          <BroadcastComposer user={user} />
        )}
      </div>
    </div>
  );
}

function Empty({ label }) {
  return <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400">{label}</div>;
}