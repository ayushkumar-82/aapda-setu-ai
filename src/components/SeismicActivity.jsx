import { timeAgo, formatIST } from "@/lib/liveData";
import { Activity, ExternalLink, Waves, Loader2 } from "lucide-react";

export default function SeismicActivity({ quakes, loading, error, checkedAt }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
          <Activity className="w-4 h-4" /> Seismic Activity
        </div>
        <span className="text-[10px] text-slate-400">Source: USGS{checkedAt ? ` · ${timeAgo(checkedAt)}` : ""}</span>
      </div>

      {loading ? (
        <div className="py-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Checking live seismic data…
        </div>
      ) : error ? (
        <div className="py-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3">
          Live seismic data is currently unavailable for your area.
        </div>
      ) : quakes.length === 0 ? (
        <div className="py-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3">
          No significant seismic activity detected within 200 km of your location.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {quakes.slice(0, 6).map((q) => (
            <div key={q.id} className="py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${q.magnitude >= 5 ? "text-red-600" : q.magnitude >= 4 ? "text-amber-600" : "text-slate-700"}`}>
                    M {q.magnitude.toFixed(1)}
                  </span>
                  {q.tsunami && (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Waves className="w-3 h-3" /> Tsunami flag
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 truncate">{q.place || "—"}</div>
                <div className="text-[10px] text-slate-400">{q.dist.toFixed(0)} km away · {formatIST(q.time)} · depth {q.depth?.toFixed(0)} km</div>
              </div>
              <a href={q.url} target="_blank" rel="noreferrer" className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 shrink-0">
                USGS <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-[10px] text-slate-400">
        Authoritative source: U.S. Geological Survey (USGS) earthquake catalog. Not an Indian-government feed.
      </p>
    </div>
  );
}