// Frontend-local copy of disaster action/severity mapping logic.
// (base44/shared/disasterActions.js holds the canonical copy used by backend functions.)

export const DISASTER_TYPES = [
  "cyclone", "flood", "earthquake", "landslide", "tsunami",
  "extreme_rainfall", "heatwave", "drought", "storm", "other",
];

export const RECOMMENDED_ACTIONS = {
  cyclone: {
    low: "Stay informed and secure loose outdoor items.",
    moderate: "Stock emergency supplies and charge devices. Monitor official alerts.",
    severe: "Move to a sturdy shelter, away from windows. Prepare for possible evacuation.",
    critical: "Evacuate immediately to the nearest cyclone shelter. Avoid coastal areas.",
  },
  flood: {
    low: "Stay alert to rising water levels and avoid low-lying areas.",
    moderate: "Prepare to move valuables to higher ground. Avoid walking through floodwater.",
    severe: "Move to higher ground and proceed to the nearest safe shelter.",
    critical: "Evacuate immediately to higher ground. Do not walk or drive through floodwater.",
  },
  earthquake: {
    low: "Review safety procedures and secure heavy furniture.",
    moderate: "Drop, Cover, and Hold On during shaking. Check for structural damage after.",
    severe: "Drop, Cover, and Hold On. After shaking stops, move to open ground away from buildings.",
    critical: "Evacuate the building immediately if safe. Avoid damaged structures and aftershocks.",
  },
  landslide: {
    low: "Watch for cracks in the ground and tilted trees on slopes.",
    moderate: "Avoid steep slopes and stay alert to ground movement.",
    severe: "Prepare to evacuate. Move away from the base of slopes.",
    critical: "Evacuate immediately uphill and away from the slope. Do not return until cleared.",
  },
  tsunami: {
    low: "Be aware of coastal warning systems.",
    moderate: "Move away from the shoreline and stay alert for official warnings.",
    severe: "Move to high ground or inland immediately.",
    critical: "Evacuate to high ground immediately. Do not wait for visible waves.",
  },
  extreme_rainfall: {
    low: "Stay updated on weather forecasts.",
    moderate: "Avoid waterlogged roads and carry essentials.",
    severe: "Stay indoors. Avoid travel through flooded or low-lying routes.",
    critical: "Move to higher ground. Avoid all travel until conditions improve.",
  },
  heatwave: {
    low: "Stay hydrated and avoid prolonged sun exposure.",
    moderate: "Stay indoors during peak heat. Drink water frequently.",
    severe: "Avoid going outside between 11am and 4pm. Keep vulnerable people cool.",
    critical: "Move to a cool shelter immediately. Watch for heatstroke symptoms.",
  },
  drought: {
    low: "Use water sparingly and report shortages.",
    moderate: "Conserve water strictly and store drinking water.",
    severe: "Prioritize drinking water. Support community water sources.",
    critical: "Seek emergency water relief points. Conserve all water use.",
  },
  storm: {
    low: "Stay informed about weather changes.",
    moderate: "Secure outdoor items and stay indoors during the storm.",
    severe: "Stay indoors away from windows. Avoid travel.",
    critical: "Shelter in a sturdy building. Avoid trees and electrical lines.",
  },
  other: {
    low: "Stay informed and follow official guidance.",
    moderate: "Prepare emergency supplies and monitor updates.",
    severe: "Follow official instructions and prepare to act.",
    critical: "Follow emergency instructions immediately.",
  },
};

export function getRecommendedAction(type, severity) {
  const t = RECOMMENDED_ACTIONS[type] || RECOMMENDED_ACTIONS.other;
  return t[severity] || t.moderate;
}

export const SEVERITY_TO_LEVEL = {
  low: "monitor", moderate: "warn", severe: "escalate", critical: "critical",
};

export const LEVEL_META = {
  monitor: { label: "MONITOR", color: "emerald", message: "Monitoring environmental conditions.", priority: 1 },
  warn: { label: "WARN", color: "amber", message: "Warning: Increased disaster risk detected.", priority: 2 },
  escalate: { label: "ESCALATE", color: "orange", message: "High Risk: Prepare for evacuation.", priority: 3 },
  critical: { label: "CRITICAL", color: "red", message: "Emergency: Evacuate immediately.", priority: 4 },
};

export const SOS_PRIORITY = { critical: 4, high: 3, medium: 2, low: 1 };

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}