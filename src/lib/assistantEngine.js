// Contextual assistant for AapdaSetu AI — uses REAL database records (Alert + Shelter),
// live weather, and authoritative public-safety guidance. No hardcoded "call 112"
// fallback for unrelated questions. Genuine emergencies are detected contextually.
import { base44 } from "@/api/base44Client";
import { matchAlertsToLocation, matchSheltersToLocation } from "@/lib/locationMatch";
import { fetchWeather, weatherCodeText } from "@/lib/liveData";

const DISASTER_WORDS = {
  flood: ["flood", "flooding", "inundation", "waterlog"],
  cyclone: ["cyclone", "hurricane", "typhoon", "storm surge"],
  earthquake: ["earthquake", "tremor", "seismic", "quake"],
  landslide: ["landslide", "landslip", "mudslide", "rockslide"],
  tsunami: ["tsunami", "tidal wave"],
  heatwave: ["heatwave", "heat wave", "extreme heat", "heatstroke"],
  storm: ["storm", "thunderstorm", "lightning", "gale", "squall"],
  drought: ["drought", "water shortage", "dry spell"],
  fire: ["fire", "wildfire", "blaze", "forest fire"],
};

const GUIDANCE = {
  flood: {
    during: "Move to higher ground immediately. Do not walk, swim or drive through floodwater — even 15 cm can sweep you off your feet. Avoid bridges over fast-moving water. Switch off electricity at the mains if safe.",
    after: "Wait for official 'all clear' before returning. Avoid floodwater (contaminated / electrified). Boil drinking water. Check for structural damage and snakes before entering buildings. Document damage for relief claims.",
  },
  cyclone: {
    during: "Stay indoors in a sturdy, windowless room on the ground floor. Keep doors and windows shut. Charge devices and keep torch + batteries ready. Listen to radio/official updates. If ordered, evacuate to a cyclone shelter early.",
    after: "Stay indoors until authorities confirm it is safe. Avoid fallen power lines, broken glass and flooded roads. Check on neighbours, especially the elderly. Do not drink tap water until declared safe.",
  },
  earthquake: {
    during: "Drop, Cover and Hold On — get under a sturdy table, cover your head, hold until shaking stops. Stay away from windows, mirrors and heavy furniture. If outside, move to open ground away from buildings and power lines.",
    after: "Expect aftershocks — be ready to drop/cover again. Check yourself and others for injury. Inspect for cracks/gas leaks; switch off gas if you smell it. Use stairs, not lifts. Avoid damaged buildings.",
  },
  landslide: {
    during: "If you notice cracks, tilting trees or rumbling on a slope, evacuate uphill immediately. Do not cross or stay below a landslide path. Listen for unusual sounds (boulders, trees cracking).",
    after: "Stay away from the slide area — more may follow. Report to authorities. Check for injured persons and damaged utilities. Do not return until officials declare it safe.",
  },
  tsunami: {
    during: "If you feel strong shaking near the coast, or the sea recedes, move to high ground or inland immediately — do not wait for an official warning. Follow evacuation routes on foot if roads are jammed. Stay away until authorities confirm safe.",
    after: "Avoid coastal areas until cleared. Watch for strong currents and damaged infrastructure. Boil drinking water. Help authorities account for missing persons.",
  },
  heatwave: {
    during: "Stay indoors, ideally in a cool/AC room. Drink water frequently even if not thirsty. Avoid going out between 11 AM and 4 PM. Wear light, loose cotton and cover your head outside. Watch for heatstroke: high body temp, no sweating, confusion.",
    after: "Keep vulnerable people (elderly, children) cool and hydrated. Check on neighbours. Continue hydration as the body recovers.",
  },
  storm: {
    during: "Stay indoors away from windows. Unplug non-essential electronics. Avoid open areas, tall trees and metal objects during lightning. Do not take shelter under isolated trees.",
    after: "Report fallen trees and power lines to authorities. Avoid downed wires (assume live). Check roofs and drains for damage.",
  },
  drought: {
    during: "Conserve water strictly — fix leaks, reuse greywater, prioritise drinking and cooking. Store drinking water safely. Use micro-irrigation if farming.",
    after: "Continue conservation until supply normalises. Support community water points and report shortages to local authorities.",
  },
  fire: {
    during: "Raise the alarm and call 112 / fire brigade (101). Get out fast, stay low (smoke rises), feel doors before opening. Use stairs, never lifts. If trapped, seal door gaps with cloth and signal from a window.",
    after: "Do not re-enter until the fire service declares it safe. Inform utilities if gas/electricity may be affected. Document losses for insurance/relief.",
  },
};

const EMERGENCY_KIT = [
  "Drinking water (3 litres/person/day for 3 days)",
  "Non-perishable food (biscuits, ready-to-eat meals) for 3 days",
  "First-aid kit (bandages, antiseptic, prescription medicines)",
  "Torch with extra batteries / hand-crank light",
  "Power bank + phone charger",
  "Copies of ID (Aadhaar), insurance and important documents in a waterproof bag",
  "Cash (small notes)",
  "Whistle to signal for help",
  "Basic tools, rope, and a multipurpose knife",
  "Sanitation items (soap, sanitary supplies, tissues)",
  "Warm clothing / raincoat and sturdy shoes",
  "Emergency contact list (family, doctor, local authority)",
];

function has(q, words) { return words.some((w) => q.includes(w)); }
function detectDisaster(q) {
  for (const [type, words] of Object.entries(DISASTER_WORDS)) if (has(q, words)) return type;
  return null;
}

const EMERGENCY_WORDS = ["trapped", "bleeding", "dying", "unconscious", "not breathing", "save me", "help me i'm", "help me i am", "heart attack", "stroke", "drowning", "house is on fire", "im trapped", "i'm trapped"];
const ALERT_WORDS = ["alert", "alerts", "any alert", "safe", "my area", "my location", "near me", "my risk", "risk near", "warning"];
const SHELTER_WORDS = ["shelter", "safe place", "evacuat", "where can i go", "refuge"];
const KIT_WORDS = ["emergency kit", "what to keep", "what should i keep", "go bag", "essentials", "supplies", "prepare a kit"];
const WEATHER_WORDS = ["weather", "rain", "temperature", "forecast", "how hot", "will it rain"];
const RISKSCORE_WORDS = ["risk score", "what does my risk", "why is my risk", "risk mean", "my risk level"];

async function loadAlerts() {
  try { return await base44.entities.Alert.filter({ status: "active" }, "-updated_date", 50); }
  catch { return []; }
}
async function loadShelters() {
  try { return await base44.entities.Shelter.list("-updated_date", 100); }
  catch { return []; }
}

function formatAlertLine(m) {
  const a = m.alert;
  return `• ${a.type.replace(/_/g, " ")} alert (${a.severity}, ${a.level}) — ${a.affected_area || "region"}.\n  ${a.message}${a.recommended_action ? "\n  Action: " + a.recommended_action : ""}`;
}

export async function answerQuestion(question, ctx = {}) {
  const q = (question || "").toLowerCase().trim();
  const { location, placeName } = ctx;
  const locStr = placeName || (location ? `${location.latitude?.toFixed(2)}, ${location.longitude?.toFixed(2)}` : "your area");

  // 1) Genuine personal emergency → contextual helpline.
  if (has(q, EMERGENCY_WORDS)) {
    return `This sounds like a real emergency. Call 112 immediately (or 101 for fire, 108 for ambulance in states where available). If it is safe, move away from the immediate danger and try to stay visible to responders. Tell them your exact location and the number of people with you.`;
  }

  // 2) Risk score explanation / alerts near me → real Alert DB.
  if (has(q, ALERT_WORDS) || has(q, RISKSCORE_WORDS)) {
    const alerts = await loadAlerts();
    const matches = matchAlertsToLocation(alerts, { latitude: location?.latitude, longitude: location?.longitude, placeName });
    if (!matches.length) {
      return `No active verified disaster alert found for ${locStr}. The Alert Database currently has no matching record for your area. You can still review general preparedness — just ask "what should I keep in an emergency kit?" or "what to do during a flood?".`;
    }
    const top = matches[0];
    const lines = matches.slice(0, 3).map(formatAlertLine).join("\n");
    return `For ${locStr}, ${matches.length} active alert(s) match from the Alert Database (matched by ${top.reason}):\n${lines}\n\nYour risk level reflects this alert: ${top.alert.level.toUpperCase()} / severity ${top.alert.severity}. Follow the recommended action above; for anything life-threatening call 112.`;
  }

  // 3) Nearby shelters → real Shelter DB.
  if (has(q, SHELTER_WORDS)) {
    const shelters = await loadShelters();
    const matched = matchSheltersToLocation(shelters, { latitude: location?.latitude, longitude: location?.longitude });
    if (!matched.length) {
      return `There are no verified shelter records available in the Shelter Database right now. Once shelters are added for your region, I can list the nearest ones with directions.`;
    }
    const top = matched.slice(0, 3).map((m) => {
      const s = m.shelter;
      return `• ${s.name}${m.dist != null ? ` — ${m.dist.toFixed(1)} km away` : ""}\n  ${s.address || ""}${s.contact ? `\n  Contact: ${s.contact}` : ""}${s.status ? `\n  Status: ${s.status}` : ""}`;
    }).join("\n");
    return `Nearest verified shelters from the Shelter Database for ${locStr}:\n${top}\n\nOpen the Shelters page for live directions to any of these.`;
  }

  // 4) Disaster-specific safety guidance → curated authoritative tips.
  const disaster = detectDisaster(q);
  if (disaster && (has(q, ["do", "during", "after", "prepare", "should", "precaut", "safety", "how", "what"]) || q.includes(disaster))) {
    const g = GUIDANCE[disaster];
    if (g) return `${disaster.toUpperCase()} safety guidance:\n\nDuring: ${g.during}\n\nAfter: ${g.after}`;
  }

  // 5) Emergency kit.
  if (has(q, KIT_WORDS)) {
    return `Keep a basic emergency kit ready:\n${EMERGENCY_KIT.map((i) => "• " + i).join("\n")}\n\nStore it in an easy-to-grab waterproof bag and check it every 6 months.`;
  }

  // 6) Weather → live Open-Meteo.
  if (has(q, WEATHER_WORDS) && location) {
    try {
      const w = await fetchWeather(location.latitude, location.longitude);
      const c = w.data.current;
      return `Live weather for ${locStr} (Open-Meteo): ${weatherCodeText(c.weather_code)}, ${Math.round(c.temperature_2m)}°C, humidity ${c.relative_humidity_2m}%, wind ${Math.round(c.wind_speed_10m)} km/h, rain ${(c.precipitation || 0).toFixed(1)} mm in the last hour. Conditions are observed, not a forecast of disaster risk.`;
    } catch { /* fall through */ }
  }

  // 7) Fallback — genuinely helpful, not "call 112".
  return `I can help with disaster safety guidance, your active alerts and risk level, nearby verified shelters, live weather, and emergency-kit checklists. Try asking:\n• "What should I do during a flood?"\n• "Are there any alerts near me?"\n• "Where is the nearest shelter?"\n• "What to keep in an emergency kit?"\n• "What's the weather here?"`;
}