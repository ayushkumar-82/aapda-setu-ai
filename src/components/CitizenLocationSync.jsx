import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/lib/AppContext";

// Silently keeps the logged-in user's last-known location in the CitizenLocation
// registry so authority broadcasts can target them by radius. No-op for no-login
// visitors (who receive broadcasts via the in-app realtime banner instead).
export default function CitizenLocationSync() {
  const { location } = useApp();
  const lastRef = useRef("");

  useEffect(() => {
    if (!location) return;
    const key = `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
    if (key === lastRef.current) return;
    lastRef.current = key;
    let cancelled = false;
    (async () => {
      try {
        const authed = await base44.auth.isAuthenticated();
        if (!authed || cancelled) return;
        const mine = await base44.entities.CitizenLocation.filter({}, "-updated_date", 1).catch(() => []);
        const payload = { latitude: location.latitude, longitude: location.longitude, label: location.label || "" };
        if (mine && mine[0]) await base44.entities.CitizenLocation.update(mine[0].id, payload);
        else await base44.entities.CitizenLocation.create(payload);
      } catch {
        /* ignore — in-app banner still works */
      }
    })();
    return () => { cancelled = true; };
  }, [location?.latitude, location?.longitude]);

  return null;
}