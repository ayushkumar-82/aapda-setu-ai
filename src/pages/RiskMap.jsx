import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { haversineKm } from "@/lib/disasterActionsBridge";
import MapView from "@/components/MapView";
import RiskBadge from "@/components/RiskBadge";
import { AlertTriangle, Loader2 } from "lucide-react";

const LAYER_LABELS = {
  user: "Your Location",
  alert: "Risk Zones (Alerts)",
  shelter: "Shelters",
  sos: "SOS Requests",
  report: "Citizen Reports",
};

const LEVEL_COLOR = {
  monitor: "#10b981", warn: "#f59e0b", escalate: "#f97316", critical: "#dc2626",
};

export default function RiskMap() {
  const { location } = useApp();
  const [alerts, setAlerts] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [sos, setSos] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState({ user: true, alert: true, shelter: true, sos: true, report: true });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      base44.entities.Alert.filter({ status: "active" }, "-updated_date", 50),
      base44.entities.Shelter.list("-updated_date", 100),
      base44.entities.SOSRequest.filter({ status: { $ne: "resolved" } }, "-created_date", 50),
      base44.entities.Report.list("-created_date", 50),
    ]).then(([a, s, so, r]) => {
      if (a.status === "fulfilled") setAlerts(a.value);
      if (s.status === "fulfilled") setShelters(s.value);
      if (so.status === "fulfilled") setSos(so.value);
      if (r.status === "fulfilled") setReports(r.value);
      setLoading(false);
    });
  }, []);

  const center = location ? [location.latitude, location.longitude] : [22.97, 78.25];

  const markers = [];
  if (layers.user && location) markers.push({ lat: location.latitude, lng: location.longitude, type: "user", radius: 10, popup: "You are here" });
  if (layers.alert) alerts.forEach((a) => {
    if (a.latitude && a.longitude) markers.push({
      lat: a.latitude, lng: a.longitude, type: "incident",
      color: LEVEL_COLOR[a.level] || "#dc2626",
      radius: 6 + (a.risk || 20) / 10,
      popup: `${a.type.replace(/_/g, " ")} Alert · ${a.level.toUpperCase()} — ${a.message} (${a.affected_area || "region"})`,
      onClick: () => setSelected({ kind: "alert", record: a }),
    });
  });
  if (layers.shelter) shelters.forEach((s) => markers.push({ lat: s.latitude, lng: s.longitude, type: "shelter", radius: 7, popup: `${s.name} · ${s.status}`, onClick: () => setSelected({ kind: "shelter", record: s }) }));
  if (layers.sos) sos.forEach((s) => markers.push({ lat: s.latitude, lng: s.longitude, type: "sos", radius: 8, popup: `SOS ${s.sos_id || ""} · ${s.severity}` }));
  if (layers.report) reports.forEach((r) => markers.push({ lat: r.latitude, lng: r.longitude, type: "report", radius: 6, popup: `${r.type}` }));

  const nearestShelter = location && shelters.length
    ? shelters.map((s) => ({ s, d: haversineKm(location.latitude, location.longitude, s.latitude, s.longitude) })).sort((a, b) => a.d - b.d)[0]
    : null;
  const route = nearestShelter && location ? [[location.latitude, location.longitude], [nearestShelter.s.latitude, nearestShelter.s.longitude]] : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{t("en", "riskMap")}</h1>
        <p className="text-xs text-slate-500">Risk zones are drawn from the verified Alert Database. Shelters from the Shelter Database.</p>
      </div>

      <MapView center={center} zoom={5} markers={markers} route={route} className="border border-slate-200" />

      {loading && <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading database records…</div>}

      {selected && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          {selected.kind === "alert" ? <AlertDetails a={selected.record} /> : <ShelterMini s={selected.record} />}
          <button onClick={() => setSelected(null)} className="mt-2 text-[11px] text-slate-500 hover:text-slate-800">Close</button>
        </div>
      )}

      {nearestShelter && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
          <span className="font-semibold">Nearest shelter:</span> {nearestShelter.s.name} · {nearestShelter.d.toFixed(1)} km away
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {Object.entries(LAYER_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
            className={`text-[11px] px-3 py-1.5 rounded-full border transition ${layers[key] ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-500"}`}>
            {label}
          </button>
        ))}
      </div>

      {alerts.length === 0 && !loading && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-300" /> No verified risk zones in the Alert Database right now.
        </div>
      )}
    </div>
  );
}

function AlertDetails({ a }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800 capitalize">{a.type.replace(/_/g, " ")} Alert</span>
        <RiskBadge level={a.level} size="sm" />
      </div>
      <p className="text-sm text-slate-600">{a.message}</p>
      {a.affected_area && <p className="text-xs text-slate-500">Location: {a.affected_area}</p>}
      {a.recommended_action && <p className="text-xs text-red-700">Action: {a.recommended_action}</p>}
      <p className="text-[10px] text-slate-400">Risk: {a.risk}% · Severity: {a.severity} · Updated {new Date(a.updated_date).toLocaleString()}</p>
    </div>
  );
}

function ShelterMini({ s }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-slate-800">{s.name}</div>
      {s.address && <p className="text-xs text-slate-500">{s.address}</p>}
      <p className="text-[10px] text-slate-400">Status: {s.status} · Capacity: {s.capacity}</p>
    </div>
  );
}