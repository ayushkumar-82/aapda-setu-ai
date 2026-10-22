import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { fetchWeather, fetchEarthquakes } from "@/lib/liveData";
import LocationBar from "@/components/LocationBar";
import ObservedWeather from "@/components/ObservedWeather";
import SeismicActivity from "@/components/SeismicActivity";
import AIRiskAssessment from "@/components/AIRiskAssessment";
import OfficialAlerts from "@/components/OfficialAlerts";
import NearbyShelters from "@/components/NearbyShelters";
import { LifeBuoy, Building2, FileText, MessageSquare, MapPin } from "lucide-react";

export default function Home() {
  const { lang, location } = useApp();
  const [weather, setWeather] = useState(null);
  const [weatherErr, setWeatherErr] = useState(false);
  const [quakes, setQuakes] = useState([]);
  const [quakeErr, setQuakeErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const timerRef = useRef(null);

  async function loadLive() {
    if (!location) return;
    setLoading(true);
    setWeatherErr(false);
    setQuakeErr(false);
    const [w, q] = await Promise.allSettled([
      fetchWeather(location.latitude, location.longitude),
      fetchEarthquakes(location.latitude, location.longitude),
    ]);
    if (w.status === "fulfilled") setWeather(w.value);
    else { setWeather(null); setWeatherErr(true); }
    if (q.status === "fulfilled") setQuakes(q.value);
    else { setQuakes([]); setQuakeErr(true); }
    setUpdatedAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    if (location) loadLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude]);

  useEffect(() => {
    timerRef.current = setInterval(() => { if (location) loadLive(); }, 5 * 60 * 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude]);

  const quickActions = [
    { to: "/sos", icon: LifeBuoy, label: "SOS", color: "bg-red-600 text-white" },
    { to: "/shelters", icon: Building2, label: t(lang, "findShelter"), color: "bg-emerald-600 text-white" },
    { to: "/reports", icon: FileText, label: t(lang, "reportHazard"), color: "bg-violet-600 text-white" },
    { to: "/assistant", icon: MessageSquare, label: t(lang, "aiAssistant"), color: "bg-blue-600 text-white" },
  ];

  return (
    <div className="space-y-4">
      <LocationBar lastUpdated={updatedAt} onRefresh={loadLive} loading={loading} />

      {!location ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-500">
          <MapPin className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          Allow location access or search a place to see live disaster intelligence for your area.
        </div>
      ) : (
        <>
          {weather ? (
            <ObservedWeather weather={weather} />
          ) : weatherErr ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-amber-700 bg-amber-50 border-amber-200">
              Live weather data is currently unavailable. Observed conditions cannot be shown until verified data is available.
            </div>
          ) : loading ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-400">Fetching live conditions…</div>
          ) : null}

          <SeismicActivity quakes={quakes} loading={loading} error={quakeErr} checkedAt={updatedAt} />

          <AIRiskAssessment />

          <OfficialAlerts />

          <NearbyShelters />

          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ to, icon: Icon, label, color }) => (
              <Link key={to} to={to} className={`flex items-center gap-2 p-4 rounded-2xl font-semibold text-sm shadow-sm active:scale-95 transition ${color}`}>
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}