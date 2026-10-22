import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/lib/AppContext";
import { base44 } from "@/api/base44Client";
import { matchSheltersToLocation } from "@/lib/locationMatch";
import { timeAgo } from "@/lib/liveData";
import { Building2, Loader2, MapPin, ArrowRight, AlertTriangle, BadgeCheck } from "lucide-react";

// Nearby facilities from the verified Shelter Database, sorted by distance.
export default function NearbyShelters() {
  const { location } = useApp();
  const [shelters, setShelters] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    base44.entities.Shelter.list("-updated_date", 100)
      .then((list) => { if (alive) setShelters(list); })
      .catch(() => { if (alive) { setShelters([]); setError(true); } });
    return () => { alive = false; };
  }, []);

  const matched = shelters ? matchSheltersToLocation(shelters, { latitude: location?.latitude, longitude: location?.longitude }) : [];
  const top = matched.slice(0, 3);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
          <Building2 className="w-4 h-4" /> Nearby Emergency Facilities
        </div>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <BadgeCheck className="w-3 h-3" /> Shelter Database{shelters ? ` · ${timeAgo(shelters[0]?.updated_date)}` : ""}
        </span>
      </div>

      {shelters === null ? (
        <div className="py-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading verified shelters…
        </div>
      ) : error ? (
        <div className="py-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3">Live data is temporarily unavailable.</div>
      ) : top.length === 0 ? (
        <div className="py-3 text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-300" /> No verified shelters are currently available for your location.
        </div>
      ) : (
        <div className="space-y-2">
          {top.map(({ shelter: s, dist }) => (
            <div key={s.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{s.name}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {s.address || `${s.latitude?.toFixed(3)}, ${s.longitude?.toFixed(3)}`}
                  {dist != null && <span className="font-medium text-slate-700">· {dist.toFixed(1)} km</span>}
                </div>
                {s.facilities?.length > 0 && (
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{s.facilities.join(" · ")}</div>
                )}
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${s.status === "open" ? "bg-emerald-100 text-emerald-700" : s.status === "full" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{s.status}</span>
            </div>
          ))}
        </div>
      )}

      <Link to="/shelters" className="mt-3 w-full flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800">
        View all shelters & directions <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}