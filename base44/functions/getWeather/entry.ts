import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    // Runtime context (no user-scoped data used; Open-Meteo is keyless & public).
    createClientFromRequest(req);

    let lat, lng;
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      lat = Number(body.latitude);
      lng = Number(body.longitude);
    } else {
      const url = new URL(req.url);
      lat = Number(url.searchParams.get('latitude'));
      lng = Number(url.searchParams.get('longitude'));
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json({ error: 'latitude and longitude are required' }, { status: 400 });
    }

    try {
      const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,pressure_msl,weather_code&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=auto&forecast_days=3`;
      const wRes = await fetch(apiUrl);
      if (!wRes.ok) throw new Error('weather service error');
      const weather = await wRes.json();
      return Response.json({ weather, source: 'live' });
    } catch (e) {
      return Response.json({ weather: null, source: 'unavailable', error: 'Live weather unavailable. Using cached guidance.' });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}