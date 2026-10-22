import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { LEVEL_META } from "@/lib/disasterActionsBridge";
import RiskBadge from "@/components/RiskBadge";
import SeverityBadge from "@/components/SeverityBadge";
import { timeAgo } from "@/lib/liveData";
import { MapPin, Loader2, BadgeCheck, RefreshCw } from "lucide-react";

export default function Alerts() {
  const { lang } = useApp();
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  function load() {
    setAlerts(null);
    base44.entities.Alert.filter({ status: "active" }, "-updated_date", 30)
      .then((list) => { setAlerts(list); setError(false); setUpdatedAt(new Date()); })
      .catch(() => { setAlerts([]); setError(true); setUpdatedAt(new Date()); });
  }

  useEffect(() => {
    load();
    const unsub = base44.entities.Alert.subscribe(load);
    return unsub;
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{t(lang, "alerts")}</h1>
        <button onClick={load} className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">
          <RefreshCw className={`w-3 h-3 ${alerts === null ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" /> Alert Levels</div>
        <div className="space-y-2">
          {Object.entries(LEVEL_META).map(([key, m]) => (
            <div key={key} className="flex items-center gap-2">
              <RiskBadge level={key} size="sm" />
              <span className="text-xs text-slate-600">{m.message}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {alerts === null ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading verified alerts…</div>
        ) : error ? (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center text-sm text-amber-700">Live data is temporarily unavailable.</div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400">No active verified alerts right now. Conditions are being monitored.</div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800 capitalize">{a.type.replace(/_/g, " ")} Alert</span>
                <RiskBadge level={a.level} size="sm" />
              </div>
              {a.affected_area && (
                <p className="mt-1.5 text-xs text-slate-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> <span className="font-medium">Location:</span> {a.affected_area}</p>
              )}
              <p className="mt-1.5 text-sm text-slate-600">{a.message}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                <SeverityBadge severity={a.severity} size="sm" />
                <span className="capitalize">Status: {a.status}</span>
                {a.risk != null && <span>· Risk: {a.risk}%</span>}
              </div>
              {a.recommended_action && <p className="mt-1 text-xs text-slate-500"><span className="font-semibold">Action:</span> {a.recommended_action}</p>}
              <p className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                <BadgeCheck className="w-3 h-3" /> Source: Alert Database (verified) · Updated {timeAgo(a.updated_date)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}