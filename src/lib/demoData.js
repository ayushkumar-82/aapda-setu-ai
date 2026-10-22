// Seed data and demo-simulation scenarios for the SIH presentation.
// All demo data is clearly labeled; never presented as real live prediction.

export const SEED_SHELTERS = [
  { name: "Andheri Municipal Shelter", latitude: 19.1197, longitude: 72.8468, address: "Andheri West, Mumbai", capacity: 500, occupancy: 180, facilities: ["Water", "Medical", "Food", "Sanitation"], accessibility: "Wheelchair accessible", contact: "+91-22-2612-0000", status: "open", disaster_type: "flood" },
  { name: "Bandra Relief Center", latitude: 19.0596, longitude: 72.8295, address: "Bandra West, Mumbai", capacity: 300, occupancy: 90, facilities: ["Water", "Food"], accessibility: "Limited", contact: "+91-22-2644-0000", status: "open", disaster_type: "general" },
  { name: "Dadar High Ground Shelter", latitude: 19.0183, longitude: 72.8436, address: "Dadar, Mumbai", capacity: 800, occupancy: 320, facilities: ["Water", "Medical", "Food", "Sanitation", "Power"], accessibility: "Wheelchair accessible", contact: "+91-22-2422-0000", status: "open", disaster_type: "flood" },
  { name: "Worli Cyclone Shelter", latitude: 19.0176, longitude: 72.8179, address: "Worli, Mumbai", capacity: 600, occupancy: 450, facilities: ["Water", "Medical", "Food"], accessibility: "Wheelchair accessible", contact: "+91-22-2493-0000", status: "open", disaster_type: "cyclone" },
];

export const SEED_RESOURCES = [
  { type: "rescue_team", name: "NDRF Team Alpha", latitude: 19.076, longitude: 72.8777, availability: 1, capacity: 1, status: "available", estimated_response_min: 25 },
  { type: "ambulance", name: "Ambulance Unit 12", latitude: 19.0596, longitude: 72.8295, availability: 2, capacity: 3, status: "available", estimated_response_min: 15 },
  { type: "boat", name: "Flood Rescue Boats", latitude: 19.1197, longitude: 72.8468, availability: 4, capacity: 6, status: "available", estimated_response_min: 30 },
  { type: "medical_supplies", name: "Medical Cache Mumbai", latitude: 19.0183, longitude: 72.8436, availability: 50, capacity: 200, status: "available", estimated_response_min: 0 },
  { type: "food", name: "Relief Food Stock", latitude: 19.076, longitude: 72.8777, availability: 1000, capacity: 5000, status: "available", estimated_response_min: 0 },
  { type: "water", name: "Water Tanker Fleet", latitude: 19.0596, longitude: 72.8295, availability: 5, capacity: 10, status: "available", estimated_response_min: 20 },
];

export const SEED_CONTACTS = [
  { name: "National Emergency", number: "112", category: "national_emergency", description: "Police · Fire · Ambulance", is_primary: true },
  { name: "Disaster Helpline (NDMA)", number: "1078", category: "disaster_helpline", description: "National Disaster Management", is_primary: true },
  { name: "Fire Brigade", number: "101", category: "fire", description: "Fire & rescue", is_primary: false },
  { name: "Ambulance", number: "108", category: "ambulance", description: "Emergency medical", is_primary: false },
  { name: "Coast Guard", number: "1554", category: "coast_guard", description: "Maritime emergencies", is_primary: false },
  { name: "Mumbai Disaster Control", number: "1916", category: "local_authority", description: "Mumbai disaster control room", is_primary: false },
];

// Demo simulation scenarios that escalate risk progressively.
export const DEMO_SCENARIOS = [
  { label: "1 · Normal Conditions", risk: 12, severity: "low", level: "monitor", type: "flood", message: "Monitoring environmental conditions." },
  { label: "2 · Increasing Risk", risk: 38, severity: "moderate", level: "warn", type: "flood", message: "Warning: Increased disaster risk detected." },
  { label: "3 · Warning", risk: 62, severity: "severe", level: "escalate", type: "flood", message: "High Risk: Prepare for evacuation." },
  { label: "4 · Critical Emergency", risk: 88, severity: "critical", level: "critical", type: "flood", message: "Emergency: Evacuate immediately." },
  { label: "5 · Multiple SOS", risk: 88, severity: "critical", level: "critical", type: "flood", message: "Multiple SOS requests incoming.", spawnSOS: true },
  { label: "6 · Recovery", risk: 25, severity: "low", level: "monitor", type: "flood", message: "Conditions stabilizing. Recovery underway." },
];