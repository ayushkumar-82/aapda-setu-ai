import { useState, useEffect } from "react";
import { useApp } from "@/lib/AppContext";
import { base44 } from "@/api/base44Client";
import { matchSheltersToLocation } from "@/lib/locationMatch";
import { fetchRoute, timeAgo } from "@/lib/liveData";
import MapView from "@/components/MapView";
import LocationBar from "@/components/LocationBar";
import SeverityBadge from "@/components/SeverityBadge";
import { MapPin, Phone, Navigation, Loader2, ExternalLink, Building2, AlertTriangle, X, Route as RouteIcon, BadgeCheck, Users } from "lucide-react";

const STATUS_COLOR = {
  open: "#16a34a", full: "#f59e0b", closed: "#dc2626", preparing: "#0ea5e9",
};

export default function Shelters() {
  const { location } = useApp();
  const [shelters, setShelters] = useState(null);
  const [error, setError] = useState(false);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState(false);
  const [routingTo, setRoutingTo] = useState(null);
  const [selected, setSelected] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let alive = true;
    base44.entities.Shelter.list("-updated_date", 100)
      .then((list) => { if (alive) setShelters(list); })
      .catch(() => { if (alive) { setShelters([]); setError(true); } })
      .finally(() => { if (alive) setUpdatedAt(new Date()); });
    return () => { alive = false; };
  }, []);

  const matched = shelters ? matchSheltersToLocation(shelters, { latitude: location?.latitude, longitude: location?.longitude }) : [];

  async function getDirections(s) {
    if (!location) return;
    setRoutingTo(s.id);
    setRouteError(false); setRoute(null); setRouteInfo(null); setSelected(s.id);
    try {
      const r = await fetchRoute(location.latitude, location.longitude, s.latitude, s.longitude);
      if (!r) setRouteError(true);
      else { setRoute(r.coords); setRouteInfo({ distanceKm: r.distanceKm, durationMin: r.durationMin, source: r.source, name: s.name }); }
    } catch { setRouteError(true); }
    setRoutingTo(null);
  }

  function clearRoute() { setRoute(null); setRouteInfo(null); setRouteError(false); setSelected(null); }

  const center = location ? [location.latitude, location.longitude] : [22.97, 78.25];
  const markers = [
    ...(location ? [{ lat: location.latitude, lng: location.longitude, type: "user", radius: 10, popup: "You are here" }] : []),
    ...matched.map(({ shelter: s }) => ({ lat: s.latitude, lng: s.longitude, type: "shelter", color: STATUS_COLOR[s.status] || "#16a34a", radius: 8, popup: `${s.name} · ${s.status}`, onClick: () => setSelected(s.id) })),
  ];

  return (
    <div className="space-y-4">
      <LocationBar lastUpdated={updatedAt} loading={false} />

      <div>
        <h1 className="text-lg font-bold text-slate-900">Nearby Shelters</h1>
        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
          <BadgeCheck className="w-3 h-3" /> Verified shelter records from the Shelter Database, sorted by distance.
        </p>
      </div>

      <MapView center={center} zoom={6} markers={markers} route={route} className="border border-slate-200" />

      {routeInfo && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-emerald-700 uppercase flex items-center gap-1"><RouteIcon className="w-4 h-4" /> Route to {routeInfo.name}</div>
              <div className="mt-1 text-sm font-bold text-slate-800">{routeInfo.distanceKm.toFixed(1)} km · ~{Math.max(1, Math.round(routeInfo.durationMin))} min by road</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Routing: {routeInfo.source}</div>
            </div>
            <button onClick={clearRoute} className="p-1.5 rounded-full bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      {routeError && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">Could not calculate a route right now. Try the external directions link below.</div>
      )}

      {shelters === null ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading verified shelters…</div>
      ) : error ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center text-sm text-amber-700">Live data is temporarily unavailable.</div>
      ) : matched.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-500"><AlertTriangle className="w-6 h-6 text-slate-300 mx-auto mb-2" /> No verified shelters are currently available for your location.</div>
      ) : (
        <div className="space-y-3">
          {matched.map(({ shelter: s, dist }) => (
            <div key={s.id} className={`rounded-2xl bg-white border p-4 ${selected === s.id ? "border-emerald-400 ring-1 ring-emerald-100" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] || "#16a34a" }} />
                    {s.name}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {s.address || `${s.latitude?.toFixed(4)}, ${s.longitude?.toFixed(4)}`}
                    {dist != null && <span className="ml-1 font-medium text-slate-700">· {dist.toFixed(1)} km</span>}
                  </div>
                </div>
                <span className="text-[10px] capitalize px-2 py-0.5 rounded-full shrink-0" style={{ background: (STATUS_COLOR[s.status] || "#16a34a") + "22", color: STATUS_COLOR[s.status] || "#16a34a" }}>{s.status}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {s.disaster_type && <span className="text-slate-500">Type: {s.disaster_type}</span>}
                <span className="text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> {s.occupancy || 0}/{s.capacity || 0}</span>
              </div>
              {s.facilities?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.facilities.map((f, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{f}</span>)}
                </div>
              )}
              {s.accessibility && <p className="mt-1 text-[10px] text-slate-400">Access: {s.accessibility}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {s.contact && (
                  <a href={`tel:${s.contact.split(" ")[0]}`} className="text-xs font-medium text-slate-700 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-slate-200"><Phone className="w-3 h-3" /> {s.contact}</a>
                )}
                <button onClick={() => getDirections(s)} disabled={routingTo === s.id || !location} className="text-xs font-semibold text-white inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                  {routingTo === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />} Get Directions
                </button>
                <a href={`https://www.openstreetmap.org/directions?from=${location?.latitude},${location?.longitude}&to=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer" className="ml-auto text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">Open in OSM <ExternalLink className="w-3 h-3" /></a>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">Verified · Last updated {timeAgo(s.updated_date)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}