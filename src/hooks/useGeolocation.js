import { useState, useEffect, useCallback } from "react";

// No default/fake location — if GPS is denied or unavailable, location stays
// null and the UI prompts manual search. Maps fall back to a center internally.
export const DEFAULT_MAP_CENTER = [19.076, 72.8777];

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | requesting | granted | denied | unavailable
  const [error, setError] = useState(null);

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setStatus("granted");
      },
      (err) => {
        setError(err.message);
        setStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  const setManual = useCallback((lat, lng, label) => {
    setLocation({ latitude: lat, longitude: lng, label });
    setStatus("manual");
  }, []);

  return { location, status, error, request, setManual };
}