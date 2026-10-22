import { useState, useEffect, useMemo } from "react";
import { useApp } from "@/lib/AppContext";
import { base44 } from "@/api/base44Client";
import { matchAlertsToLocation } from "@/lib/locationMatch";
import { timeAgo, formatIST } from "@/lib/liveData";
import RiskBadge from "@/components/RiskBadge";
import SeverityBadge from "@/components/SeverityBadge";
import { Brain, Loader2, ShieldAlert, AlertTriangle, MapPin, Radio } from "lucide-react";

// Risk assessment sourced EXCLUSIVELY from the verified Alert Database (matched to
// the user's location). No fabricated scores — if no alert matches, we say so.
export default function AIRiskAssessment() {
  const { location, placeName } = useApp();
  const [alerts, setAlerts] = useState(null); // null = loading, [] = loaded
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => base44.entities.Alert.filter({ status: "active" }, "-updated_date", 50)
      .then((list) => { if (alive) { setAlerts(list); setError(false); } })
      .catch(() => { if (alive) { setAlerts([]); setError(true); } });
    load();
    const unsub = base44.entities.Alert.subscribe(() => load());
    return () => { alive = false; unsub(); };
  }, []);

  const matches = useMemo(() => {
    if (!alerts) return null;
    return matchAlertsToLocation(alerts, { latitude: location?.latitude, longitude: location?.longitude, placeName });
  }, [alerts, location, placeName]);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
          <Brain className="w-4 h-4" /> Live Risk Assessment
        </div>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Radio className="w-3 h-3" /> Source: Alert Database
        </span>
      </div>

      {alerts === null ? (
        <div className="py-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking verified alerts for your location…
        </div>
      ) : error ? (
        <div className="py-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Live data is temporarily unavailable. Please retry shortly.
        </div>
      ) : !location && !placeName ? (
        <div className="py-3 text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" /> Set your location above to see verified alerts for your area.
        </div>
      ) : !matches || matches.length === 0 ? (
        <div className="py-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> No active verified disaster alert found for this location.
        </div>
      ) : (
        <RiskAssessmentBody matches={matches} placeName={placeName} />
      )}
    </div>
  );
}

function RiskAssessmentBody({ matches, placeName }) {
  const top = matches[0].alert;
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-3xl font-bold text-slate-900">{Math.round(top.risk || 0)}%</span>
        <RiskBadge level={top.level} />
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm">
        <span className="capitalize text-slate-700 font-medium">{top.type.replace(/_/g, " ")}</span>
        <SeverityBadge severity={top.severity} size="sm" />
        <span className="text-[11px] text-slate-400">· {top.status}</span>
      </div>

      <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-sm">
        <div className="text-[11px] font-semibold text-slate-500 uppercase">Alert details</div>
        <p className="text-slate-700">{top.message}</p>
        {top.affected_area && (
          <p className="text-slate-600 flex items-start gap-1"><MapPin className="w-3.5 h-3.5 mt-0.5 text-slate-400" /> {top.affected_area}</p>
        )}
        {top.recommended_action && (
          <p className="text-red-700"><span className="font-semibold">Action:</span> {top.recommended_action}</p>
        )}
      </div>

      {matches.length > 1 && (
        <div className="mt-2 text-[11px] text-slate-500">
          + {matches.length - 1} more matching alert(s) for this area — see the Alerts page.
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <div>Matched by: {matches[0].reason}</div>
        <div>Updated: {timeAgo(top.updated_date)}</div>
      </div>

      <p className="mt-2 text-[10px] text-slate-400 flex items-start gap-1">
        <Radio className="w-3 h-3 mt-0.5 shrink-0" />
        Risk level is taken directly from the verified Alert Database record — it is not computed or invented. For life-threatening situations call 112.
      </p>
    </div>
  );
}