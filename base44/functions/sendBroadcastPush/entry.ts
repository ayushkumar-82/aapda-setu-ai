import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin-only: sends a native push notification to every registered app user whose
// last-known location (CitizenLocation) is within radiusKm of an incident.
// Native push requires a published mobile build with push credentials AND integration
// credits; until then calls fail gracefully and the in-app realtime banner still delivers.
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — authority only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const lat = Number(body.latitude);
    const lon = Number(body.longitude);
    const radiusKm = Math.min(Math.max(Number(body.radius_km) || 25, 1), 500);
    const title = String(body.title || 'Emergency Alert').slice(0, 100);
    const content = String(body.message || '').slice(0, 2000);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Bounding-box pre-filter (cheap DB query), then precise haversine per candidate.
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
    const candidates = await base44.entities.CitizenLocation.filter(
      {
        latitude: { $gte: lat - latDelta, $lte: lat + latDelta },
        longitude: { $gte: lon - lonDelta, $lte: lon + lonDelta },
      },
      '-updated_date',
      1000
    );

    let pushed = 0;
    let skipped = 0;
    let errors = 0;
    for (const cl of candidates) {
      if (cl.latitude == null || cl.longitude == null) { skipped++; continue; }
      if (haversineKm(lat, lon, cl.latitude, cl.longitude) > radiusKm) { skipped++; continue; }
      const userId = cl.created_by_id;
      if (!userId) { skipped++; continue; }
      try {
        await base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: userId,
          title,
          content,
          action_label: 'Open AapdaSetu',
          action_url: '/',
        });
        pushed++;
      } catch {
        errors++;
      }
    }

    return Response.json({ targeted: candidates.length, pushed, skipped, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}