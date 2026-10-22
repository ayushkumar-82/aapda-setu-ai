// Real-time, keyless public data sources for AapdaSetu AI.
// No demo data — every function here hits a live public API or returns null/[] on failure.

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function timeAgo(date) {
  if (!date) return "—";
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 0) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(date).toLocaleDateString("en-IN");
}

export function formatIST(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) + " IST";
  } catch {
    return new Date(date).toLocaleTimeString();
  }
}

export const WMO_CODES = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  56: "Freezing drizzle", 57: "Dense freezing drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  66: "Freezing rain", 67: "Heavy freezing rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm, slight hail", 99: "Thunderstorm, heavy hail",
};

const SEVERE_CODES = new Set([65, 82, 95, 96, 99, 67, 75, 86]);
export function weatherCodeText(code) { return WMO_CODES[code] || "—"; }
export function isSevereWeather(code) { return SEVERE_CODES.has(code); }

// Live weather + short forecast from Open-Meteo (keyless).
export async function fetchWeather(lat, lng) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,weather_code` +
    `&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max` +
    `&timezone=auto&forecast_days=3`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather unavailable");
  const data = await res.json();
  return { data, source: "Open-Meteo", fetchedAt: new Date().toISOString() };
}

// Place search via Open-Meteo geocoding (keyless, CORS-friendly).
export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((r) => ({
    latitude: r.latitude,
    longitude: r.longitude,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
  }));
}

export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    return [a.city || a.town || a.village || a.county, a.state, a.country].filter(Boolean).join(", ") || data.display_name || null;
  } catch {
    return null;
  }
}

// Authoritative seismic events near a point (USGS, real, global).
export async function fetchEarthquakes(lat, lng, radiusKm = 200) {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lng}&maxradiuskm=${radiusKm}&minmagnitude=2.5&orderby=time&limit=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("seismic data unavailable");
  const data = await res.json();
  return (data.features || [])
    .map((f) => {
      const [lon, lat2, depth] = f.geometry.coordinates;
      return {
        id: f.id,
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: f.properties.time,
        url: f.properties.url,
        tsunami: f.properties.tsunami === 1,
        depth,
        latitude: lat2,
        longitude: lon,
        dist: haversineKm(lat, lng, lat2, lon),
      };
    })
    .filter((e) => e.magnitude != null);
}

const FACILITY_LABELS = {
  hospital: "Hospital",
  clinic: "Clinic",
  police: "Police station",
  fire_station: "Fire station",
  shelter: "Shelter",
  community_centre: "Community centre",
  social_facility: "Social facility",
  assembly_point: "Emergency assembly point",
};
export function facilityTypeLabel(cat) { return FACILITY_LABELS[cat] || "Facility"; }

// Real emergency facilities from OpenStreetMap (Overpass). Clearly sourced — NOT claimed
// to be officially designated unless an authority verifies them.
export async function fetchNearbyFacilities(lat, lng, radiusKm = 15) {
  const r = radiusKm * 1000;
  const query =
    `[out:json][timeout:25];(` +
    `node["emergency"="assembly_point"](around:${r},${lat},${lng});` +
    `node["amenity"~"^(shelter|hospital|clinic|police|fire_station|community_centre|social_facility)$"](around:${r},${lat},${lng});` +
    `way["amenity"~"^(shelter|hospital|clinic|police|fire_station|community_centre|social_facility)$"](around:${r},${lat},${lng});` +
    `);out center 40;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error("shelter data unavailable");
  const data = await res.json();
  const out = [];
  for (const el of data.elements || []) {
    const tags = el.tags || {};
    const lon = el.lon ?? el.center?.lon;
    const lat2 = el.lat ?? el.center?.lat;
    if (lat2 == null || lon == null) continue;
    const cat = tags.amenity || tags.emergency || "facility";
    const addr = [tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"], tags["addr:city"]].filter(Boolean).join(" ").trim();
    out.push({
      id: `${el.type}/${el.id}`,
      name: tags.name || facilityTypeLabel(cat),
      category: cat,
      latitude: lat2,
      longitude: lon,
      dist: haversineKm(lat, lng, lat2, lon),
      phone: tags.phone || tags["contact:phone"] || "",
      address: addr || tags["addr:full"] || "",
      operator: tags.operator || "",
      source: "OpenStreetMap",
    });
  }
  return out.sort((a, b) => a.dist - b.dist).slice(0, 25);
}

// Real driving route from OSRM (open routing). Returns [lat,lng] polyline for Leaflet.
export async function fetchRoute(fromLat, fromLng, toLat, toLng) {
  const url = `https://router.project-osm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("routing unavailable");
  const data = await res.json();
  const route = data.routes && data.routes[0];
  if (!route) return null;
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    source: "OSRM · OpenStreetMap",
  };
}