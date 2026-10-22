import { weatherCodeText, isSevereWeather, timeAgo } from "@/lib/liveData";
import { Thermometer, Droplets, CloudRain, Wind, Gauge, Navigation, CloudSun, AlertTriangle, CalendarDays } from "lucide-react";

export default function ObservedWeather({ weather }) {
  if (!weather) return null;
  const c = weather.data.current;
  const d = weather.data.daily;
  const severe = isSevereWeather(c.weather_code);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-slate-500 uppercase">Observed Conditions</div>
        <span className="text-[10px] text-slate-400">Source: {weather.source} · {timeAgo(weather.fetchedAt)}</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <CloudSun className="w-6 h-6 text-slate-600" />
        <span className="text-base font-semibold text-slate-800">{weatherCodeText(c.weather_code)}</span>
        {severe && (
          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Severe
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat icon={Thermometer} value={`${Math.round(c.temperature_2m)}°C`} label="Temp" sub={`feels ${Math.round(c.apparent_temperature)}°`} />
        <Stat icon={Droplets} value={`${c.relative_humidity_2m}%`} label="Humidity" />
        <Stat icon={CloudRain} value={`${c.precipitation}mm`} label="Rain" />
        <Stat icon={Wind} value={`${Math.round(c.wind_speed_10m)}`} label="Wind km/h" />
        <Stat icon={Navigation} value={`${Math.round(c.wind_direction_10m)}°`} label="Dir" />
        <Stat icon={Gauge} value={`${Math.round(c.pressure_msl)}`} label="hPa" />
      </div>

      {d && d.time && d.time.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> Today’s forecast
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>🌡️ High {Math.round(d.temperature_2m_max[0])}° / Low {Math.round(d.temperature_2m_min[0])}°</div>
            <div>🌧️ {d.precipitation_sum[0]}mm ({d.precipitation_probability_max[0]}% chance)</div>
            <div>💨 Wind up to {Math.round(d.wind_speed_10m_max[0])} km/h</div>
            <div>💨 Gusts up to {Math.round(d.wind_gusts_10m_max[0])} km/h</div>
          </div>
        </div>
      )}

      <p className="mt-3 text-[10px] text-slate-400">
        Observed model data from Open-Meteo. This is not an official government weather warning.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, value, label, sub }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon className="w-4 h-4 text-slate-400" />
      <div className="text-sm font-semibold text-slate-800">{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
      {sub && <div className="text-[9px] text-slate-400">{sub}</div>}
    </div>
  );
}