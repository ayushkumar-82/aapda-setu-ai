import { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/AppContext";
import { searchLocations, reverseGeocode, timeAgo } from "@/lib/liveData";
import { MapPin, Search, Crosshair, Loader2, RefreshCw } from "lucide-react";

export default function LocationBar({ lastUpdated, onRefresh, loading }) {
  const { location, geoStatus, requestLocation, setManualLocation, placeName, setPlaceName } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!location) { setPlaceName(""); return; }
    if (location.label) { setPlaceName(location.label); return; }
    setPlaceName("");
    let cancelled = false;
    reverseGeocode(location.latitude, location.longitude).then((n) => {
      if (!cancelled && n) setPlaceName(n);
    });
    return () => { cancelled = true; };
  }, [location]);

  function onSearch(v) {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      const r = await searchLocations(v).catch(() => []);
      setResults(r);
      setSearching(false);
    }, 400);
  }

  function pick(r) {
    setManualLocation(r.latitude, r.longitude, r.label);
    setQ("");
    setResults([]);
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Your location</div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 truncate">
            <MapPin className="w-4 h-4 text-red-600 shrink-0" />
            {placeName || (location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "Not set")}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {lastUpdated && (
            <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live · {timeAgo(lastUpdated)}
            </span>
          )}
          {onRefresh && (
            <button onClick={onRefresh} className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search a city, town or area…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          {searching && <Loader2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />}
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              {results.map((r, i) => (
                <button key={i} onClick={() => pick(r)} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-800">{r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={requestLocation}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
        >
          <Crosshair className="w-4 h-4" /> GPS
        </button>
      </div>

      {geoStatus === "denied" && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          Location permission denied. Use search above or re-enable location to get live data for your area.
        </div>
      )}
      {geoStatus === "unavailable" && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          GPS is unavailable on this device. Search a location above.
        </div>
      )}
    </div>
  );
}