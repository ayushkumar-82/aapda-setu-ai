// Real-time, deterministic disaster-risk engine for AapdaSetu AI.
// Computes risk from LIVE observed data only (Open-Meteo weather + USGS seismic).
// No demo data, no random scores, no LLM call. Conservative: returns null when no
// threshold is breached.
import { getRecommendedAction, SEVERITY_TO_LEVEL } from "@/lib/disasterActionsBridge";

const SEV_RANK = { low: 1, moderate: 2, severe: 3, critical: 4 };
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function finding(disaster_type, severity, risk_probability, reasoning) {
  return { disaster_type, severity, risk_probability: clamp(risk_probability, 0, 98), reasoning, confidence: 70 };
}

export function assessRisk(weather, quakes) {
  if (!weather || !weather.data || !weather.data.current) return null;
  const c = weather.data.current;
  const d = weather.data.daily || {};
  const findings = [];

  const wind = c.wind_speed_10m || 0;
  const gust = c.wind_gusts_10m || 0;
  const press = c.pressure_msl || 1013;
  const maxWind = (d.wind_speed_10m_max && d.wind_speed_10m_max[0]) || wind;
  const maxGust = (d.wind_gusts_10m_max && d.wind_gusts_10m_max[0]) || gust;
  const code = c.weather_code;

  // --- Cyclone / severe storm (IMD wind bands) ---
  if (wind >= 118 || gust >= 118 || maxWind >= 118 || maxGust >= 118) {
    findings.push(finding("cyclone", "critical", 90 + clamp(Math.round((maxWind - 118) / 5), 0, 8),
      `Extreme winds: ${Math.round(maxWind)} km/h (gusts ${Math.round(maxGust)} km/h), pressure ${Math.round(press)} hPa.`));
  } else if (wind >= 88 || gust >= 88 || maxWind >= 88 || maxGust >= 88 || (code >= 95 && press < 1000)) {
    findings.push(finding("cyclone", "severe", 70 + clamp(Math.round((maxWind - 88) / 5), 0, 15),
      `Cyclonic-storm force winds: ${Math.round(maxWind)} km/h (gusts ${Math.round(maxGust)} km/h), pressure ${Math.round(press)} hPa.`));
  } else if (wind >= 62 || maxWind >= 62 || code >= 95) {
    findings.push(finding("storm", "moderate", 40 + clamp(Math.round((maxWind - 62) / 5), 0, 15),
      `Strong winds: ${Math.round(maxWind)} km/h (gusts ${Math.round(maxGust)} km/h).${code >= 95 ? " Thunderstorm conditions observed." : ""}`));
  }

  // --- Heavy rainfall / flood (IMD 24h rainfall bands) ---
  const rainNow = c.precipitation || 0;
  const rainSum = (d.precipitation_sum && d.precipitation_sum[0]) || 0;
  const rainProb = (d.precipitation_probability_max && d.precipitation_probability_max[0]) || 0;
  if (rainSum >= 204.5 || rainNow >= 40) {
    findings.push(finding("flood", "critical", 90,
      `Extremely heavy rainfall: ${rainSum.toFixed(0)} mm forecast today, ${rainNow.toFixed(1)} mm in the last hour.`));
  } else if (rainSum >= 115.6 || rainNow >= 25) {
    findings.push(finding("flood", "severe", 70 + clamp(Math.round((rainSum - 115.6) / 15), 0, 15),
      `Very heavy rainfall: ${rainSum.toFixed(0)} mm forecast today, ${rainNow.toFixed(1)} mm last hour.`));
  } else if (rainSum >= 64.5 || rainNow >= 10 || (rainProb >= 80 && rainSum >= 20)) {
    findings.push(finding("flood", "moderate", 40 + clamp(Math.round((rainSum - 64.5) / 10), 0, 15),
      `Heavy rainfall: ${rainSum.toFixed(0)} mm forecast today (${rainProb}% probability), ${rainNow.toFixed(1)} mm last hour.`));
  }

  // --- Heatwave (IMD max-temp thresholds) ---
  const temp = c.temperature_2m || 0;
  const feel = c.apparent_temperature || temp;
  const tmax = (d.temperature_2m_max && d.temperature_2m_max[0]) || temp;
  if (tmax >= 47 || feel >= 50) {
    findings.push(finding("heatwave", "critical", 90,
      `Extreme heat: forecast high ${Math.round(tmax)}°C, feels like ${Math.round(feel)}°C.`));
  } else if (tmax >= 45) {
    findings.push(finding("heatwave", "severe", 70 + clamp(Math.round((tmax - 45) / 2), 0, 15),
      `Severe heatwave: forecast high ${Math.round(tmax)}°C, feels like ${Math.round(feel)}°C.`));
  } else if (tmax >= 40) {
    findings.push(finding("heatwave", "moderate", 40 + clamp(Math.round((tmax - 40) / 2), 0, 15),
      `Heatwave conditions: forecast high ${Math.round(tmax)}°C.`));
  }

  // --- Seismic (real USGS events) ---
  for (const q of quakes || []) {
    if (q.tsunami) {
      findings.push(finding("tsunami", "critical", 92,
        `USGS tsunami flag for M${q.magnitude.toFixed(1)} event ${q.dist.toFixed(0)} km away (${q.place}).`));
      break;
    }
    if (q.dist <= 200 && q.magnitude >= 6) {
      findings.push(finding("earthquake", "critical", 88,
        `M${q.magnitude.toFixed(1)} earthquake ${q.dist.toFixed(0)} km away (${q.place}).`));
      break;
    }
    if (q.dist <= 100 && q.magnitude >= 5) {
      findings.push(finding("earthquake", "severe", 68,
        `M${q.magnitude.toFixed(1)} earthquake ${q.dist.toFixed(0)} km away (${q.place}).`));
      break;
    }
    if (q.dist <= 50 && q.magnitude >= 4) {
      findings.push(finding("earthquake", "moderate", 42,
        `M${q.magnitude.toFixed(1)} earthquake ${q.dist.toFixed(0)} km away (${q.place}).`));
      break;
    }
  }

  if (findings.length === 0) return null;

  findings.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || b.risk_probability - a.risk_probability);
  const top = findings[0];
  return {
    ...top,
    alert_level: SEVERITY_TO_LEVEL[top.severity],
    recommended_action: getRecommendedAction(top.disaster_type, top.severity),
    all_findings: findings,
    sources: ["Open-Meteo", "USGS"],
    dataTime: weather.fetchedAt,
    assessedAt: new Date().toISOString(),
  };
}