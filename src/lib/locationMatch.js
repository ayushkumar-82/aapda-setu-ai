// Location matching between user location (coords + place name) and database records.
import { haversineKm } from "@/lib/liveData";

export function normalizePlace(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const STOP = new Set(["the", "and", "of", "for", "in", "at", "near", "area", "region"]);
function meaningfulTokens(s) {
  return normalizePlace(s).split(" ").filter((t) => t.length > 2 && !STOP.has(t));
}

// True when two place strings refer to the same area (handles "New Delhi" vs "Delhi",
// "Visakhapatnam" vs "Coastal Andhra Pradesh (Visakhapatnam, Kakinada)", etc.).
export function placeMatches(a, b) {
  if (!a || !b) return false;
  if (normalizePlace(a) === normalizePlace(b)) return true;
  const ta = new Set(meaningfulTokens(a));
  const tb = new Set(meaningfulTokens(b));
  for (const t of ta) if (tb.has(t)) return true;
  return false;
}

const ALERT_RADIUS_KM = 200;

// Match active alerts to a location by coordinate distance and/or place-name overlap.
export function matchAlertsToLocation(alerts, { latitude, longitude, placeName } = {}) {
  const out = [];
  for (const a of alerts || []) {
    let dist = null;
    if (latitude != null && longitude != null && a.latitude && a.longitude) {
      dist = haversineKm(latitude, longitude, a.latitude, a.longitude);
    }
    const distMatch = dist != null && dist <= ALERT_RADIUS_KM;
    const textMatch = placeName ? placeMatches(placeName, a.affected_area || "") : false;
    if (distMatch || textMatch) {
      out.push({ alert: a, dist, reason: distMatch ? "within " + ALERT_RADIUS_KM + " km" : "region name match" });
    }
  }
  out.sort((x, y) => (x.dist ?? 1e9) - (y.dist ?? 1e9));
  return out;
}

// Sort all shelters by distance from a location (no cutoff — returns nearest first).
export function matchSheltersToLocation(shelters, { latitude, longitude } = {}) {
  const out = [];
  for (const s of shelters || []) {
    if (s.latitude == null || s.longitude == null) continue;
    const dist = latitude != null && longitude != null
      ? haversineKm(latitude, longitude, s.latitude, s.longitude)
      : null;
    out.push({ shelter: s, dist });
  }
  out.sort((x, y) => (x.dist ?? 1e9) - (y.dist ?? 1e9));
  return out;
}