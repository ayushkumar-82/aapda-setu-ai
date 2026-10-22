import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/lib/AppContext";
import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/liveData";
import { Radio, X, Building2, LifeBuoy } from "lucide-react";

const SEV_RANK = { low: 1, moderate: 2, severe: 3, critical: 4 };
const SEV_STYLE = {
  low: "bg-blue-600", moderate: "bg-amber-600", severe: "bg-orange-600", critical: "bg-red-600",
};
const DISMISS_KEY = "aapdasetu_dismissed_broadcasts";

function dismissedIds() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
}

// Citizen-side: receives authority broadcasts in real time and shows them ONLY if the
// citizen is within the broadcast radius (client-side geofence). No push credentials
// or integration credits required — delivery uses live database subscriptions.
export default function BroadcastBanner() {
  const { location } = useApp();
  const [broadcasts, setBroadcasts] = useState([]);
  const [dismissed, setDismissed] = useState(dismissedIds);

  useEffect(() => {
    let alive = true;
    const load = () => base44.entities.Broadcast.filter({ status: "active" }, "-created_date", 20)
      .then((list) => { if (alive) setBroadcasts(list || []); })
      .catch(() => {});
    load();
    const u = base44.entities.Broadcast.subscribe(load);
    return () => { alive = false; u(); };
  }, []);

  // Expire broadcasts past their expires_at.
  useEffect(() => {
    const now = Date.now();
    broadcasts.forEach((b) => {
      if (b.expires_at && new Date(b.expires_at).getTime() < now) {
        base44.entities.Broadcast.update(b.id, { status: "expired" }).catch(() => {});
      }
    });
  }, [broadcasts]);

  const inRange = broadcasts.filter((b) => {
    if (!location || !b.latitude || !b.longitude) return false;
    if (dismissed.includes(b.id)) return false;
    return haversineKm(location.latitude, location.longitude, b.latitude, b.longitude) <= (b.radius_km || 0);
  });

  if (inRange.length === 0) return null;

  inRange.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
  const top = inRange[0];
  const style = SEV_STYLE[top.severity] || SEV_STYLE.severe;

  function dismiss(id) {
    const next = [...new Set([...dismissed, id])];
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  }

  return (
    <div className={`rounded-2xl ${style} text-white p-4 shadow-lg`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-5 h-5 shrink-0 animate-pulse" />
          <div className="min-w-0">
            <div className="font-bold text-sm">{top.title}</div>
            <p className="text-xs text-white/90 mt-0.5 whitespace-pre-line">{top.message}</p>
            <div className="text-[10px] text-white/70 mt-1">Authority broadcast · within {top.radius_km} km of your location</div>
          </div>
        </div>
        <button onClick={() => dismiss(top.id)} className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 shrink-0"><X className="w-4 h-4" /></button>
      </div>
      <div className="mt-2 flex gap-2">
        <Link to="/shelters" className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> Find shelter</Link>
        <Link to="/sos" className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 inline-flex items-center gap-1"><LifeBuoy className="w-3 h-3" /> SOS</Link>
      </div>
    </div>
  );
}