# AapdaSetu AI

**AI-powered disaster prediction, early-warning, and emergency-response platform**
Built for Smart India Hackathon 2026 — Problem Statement **SIH26206 (Disaster Management)**.

> **Predict → Alert → Respond → Recover**
> AapdaSetu AI converts disaster prediction into immediate action.

---

## Overview

AapdaSetu AI connects **citizens, authorities, emergency responders, rescue teams, and shelters** into one unified ecosystem. It continuously transforms disaster risk into an actionable response:

**Monitor → Warn → Escalate → Risk → Recommended Action**

### Core capabilities
- 🌍 **No-login citizen access** — geolocation-based risk on first open
- 🤖 **AI disaster prediction** — risk probability, severity, confidence, affected region, recommended action
- 🗺️ **Interactive risk map** — Leaflet + OpenStreetMap, risk zones, shelters, resources, SOS, reports
- 🆘 **Smart SOS** — one-tap, offline-queued, severity-prioritized emergency requests
- 📊 **Progressive alerts** — Monitor / Warn / Escalate / Critical
- 🏠 **Shelter system** — capacity, occupancy, live status
- 📦 **Resource allocation** — rescue teams, ambulances, boats, supplies
- 🤝 **Citizen reporting + AI verification** — image analysis for damage assessment
- 💬 **AapdaSetu AI Assistant** — multilingual disaster chatbot with voice
- 📡 **Real-time authority dashboard** — live SOS, incidents, resources, reports
- 📴 **Offline-first** — SOS queue (IndexedDB), cached emergency info, online/offline indicator
- 🌐 **Multilingual** — English + Hindi (extensible)
- 🎬 **Demo/Simulation mode** — progressive scenario player for SIH judges

---

## Tech Stack

| Layer | Technology |
|------|-----------|
| Frontend | React.js + Vite + Tailwind CSS |
| Maps | Leaflet.js + OpenStreetMap |
| Backend | Base44 serverless functions (Node runtime) |
| Database | Base44 entities (MongoDB-backed) |
| Real-time | Base44 entity subscriptions (Socket.IO-equivalent) |
| AI / Prediction | InvokeLLM (Gemini 3 Flash) — replaces Python/Scikit-learn service |
| Weather | Open-Meteo (free, **no API key required**) |
| Offline | IndexedDB + Service Worker (PWA-ready) |

> The original brief specified Node/Express + Socket.IO + MongoDB Atlas + Python/Scikit-learn. On the Base44 platform these map to serverless functions, entity subscriptions, MongoDB-backed entities, and the built-in InvokeLLM integration respectively — same capabilities, zero infrastructure to manage.

---

## Installation

```bash
# install dependencies
npm install

# start the dev server
npm run dev
```

The app runs on Vite's default port (usually 5173).

---

## Environment Variables

AapdaSetu AI is designed to **work with zero configuration**. The core stack uses keyless services:

| Variable | Required? | Purpose | Without it |
|----------|----------|---------|-----------|
| `WEATHER_API_KEY` | ❌ Optional | Alternate weather provider | Falls back to Open-Meteo (free, keyless) |
| `AI_API_KEY` | ❌ Optional | Alternate AI provider | Uses built-in InvokeLLM (no key needed) |
| `SMS_API_KEY` | ❌ Optional | SMS alerts to citizens | SMS alerts disabled; in-app + browser notifications still work |
| `SMS_PROVIDER` | ❌ Optional | SMS gateway name | — |
| `MAP_SERVICE_KEY` | ❌ Optional | Alternate map tiles | Uses free OpenStreetMap tiles |
| `PUSH_NOTIFICATION_KEY` | ❌ Optional | Web push | Browser notifications only |

See `.env.example`. **No API key is required to run the prototype.**

### What happens when a key is missing
Every external dependency has a graceful fallback:
- Weather API unavailable → cached/last-known data, then "Live weather unavailable" — emergency features keep working.
- AI model unavailable → heuristic risk estimate with low confidence flag.
- Internet lost → offline emergency mode with cached info + queued SOS.
- Geolocation denied → manual location selection (defaults to Mumbai).
- Voice API unsupported → text interaction.

---

## AI Model Setup

The prediction service lives in `base44/functions/predictDisaster/entry.ts`. It:
1. Fetches live weather from Open-Meteo for the user's coordinates.
2. Sends the environmental context to InvokeLLM (Gemini 3 Flash) with a strict JSON schema.
3. Returns: `disaster_type, risk_probability, severity, confidence, affected_area_km, expected_time_window, recommended_action, alert_level, reasoning`.
4. Persists significant incidents (risk ≥ 40%) to the authority feed.

A heuristic fallback (`fallbackPrediction`) runs if the LLM is unavailable, so prediction never hard-fails.

> To add a custom Scikit-learn model: deploy it as an HTTP endpoint and call it from `predictDisaster` instead of InvokeLLM. The function signature stays the same.

---

## Database Setup

Entities are defined in `base44/entities/`:
- **SOSRequest** — emergency requests with severity-based priority
- **Shelter** — capacity, occupancy, status
- **Incident** — active disaster predictions
- **Report** — citizen hazard reports + AI verification
- **Resource** — rescue teams, supplies, vehicles
- **Alert** — progressive alert records
- **EmergencyContact** — helpline numbers

No manual MongoDB setup — Base44 provisions the database automatically. Seed data (shelters, resources, contacts) is auto-loaded on first visit of the relevant page.

---

## Running the Services

Everything runs from one Vite dev server:

```bash
npm install
npm run dev
```

Backend functions, the database, and AI integrations are all hosted on Base44 — no separate process to start.

---

## PWA / Offline Functionality

- **IndexedDB SOS queue** (`src/lib/offlineQueue.js`) — SOS requests captured offline sync automatically when connectivity returns.
- **Online/offline indicator** — always visible in the header.
- **Cached emergency info** — contacts, safety tips, and kit checklist available offline.
- **Offline banner** — clearly marks "OFFLINE — Emergency Mode".

> A browser web app cannot independently send SMS or place cellular calls without device/network support. AapdaSetu AI uses `tel:` links and device dialers honestly, with clear fallback instructions.

---

## Demo Mode

Toggle **Demo Mode** in the header. A scenario player lets judges simulate:
1. Normal conditions → 2. Increasing risk → 3. Warning → 4. Critical emergency → 5. Multiple SOS → 6. Recovery

All demo data is clearly labeled "Demo Mode ON — simulated data" and is never presented as live prediction.

---

## Authority Access

Citizens need **no login**. The protected authority dashboard at `/authority` requires authentication (login/register routes are wired). Authority users can:
- View live SOS (auto-sorted by severity)
- Advance SOS status (acknowledge → assign → rescue → resolve)
- Manage resources
- Verify/reject citizen reports with AI assistance
- Monitor active incidents in real time

---

## Limitations & Future Improvements

- Predictions are probabilistic, not certain — the UI never claims guaranteed accuracy.
- SMS alerts require a configured provider; the prototype uses in-app + browser notifications.
- Safe routing uses straight-line distance to nearest shelter; full turn-by-turn routing can be added.
- Voice support depends on browser Speech APIs; falls back to text.
- Additional Indian languages can be added by extending `src/lib/i18n.js`.

---

## Project Structure

```
src/
  components/    Layout, MapView, badges, SOS button, indicators
  hooks/         useGeolocation, useOnlineStatus
  lib/           AppContext, i18n, offlineQueue, demoData
  pages/         Home, RiskMap, Alerts, SOS, Shelters, Reports,
                 AIAssistant, EmergencyInfo, AuthorityDashboard
base44/
  entities/      SOSRequest, Shelter, Incident, Report, Resource, Alert, EmergencyContact
  functions/     predictDisaster, chatbotAssistant, analyzeReport, getWeather
  shared/        disasterActions.js (shared risk/action logic)
```

---

## License

Prototype for Smart India Hackathon 2026. Educational/demonstration use.