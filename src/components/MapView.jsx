import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

function Recenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom ?? map.getZoom());
  }, [center, zoom]);
  return null;
}

const colorByType = {
  user: "#2563eb",
  shelter: "#16a34a",
  incident: "#dc2626",
  sos: "#ef4444",
  resource: "#f59e0b",
  report: "#a855f7",
  safe: "#22c55e",
};

export default function MapView({ center, zoom = 12, markers = [], route = null, className = "" }) {
  const fallback = [19.076, 72.8777];
  const c = center && Number.isFinite(center[0]) ? center : fallback;

  return (
    <MapContainer center={c} zoom={zoom} className={`w-full rounded-2xl ${className}`} style={{ height: 400 }}>
      <Recenter center={c} zoom={zoom} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {markers.map((m, i) => {
        const color = m.color || colorByType[m.type] || "#64748b";
        return (
          <CircleMarker
            key={i}
            center={[m.lat, m.lng]}
            radius={m.radius || 8}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.6, weight: 2 }}
          >
            {m.popup && <Popup>{m.popup}</Popup>}
          </CircleMarker>
        );
      })}
      {route && route.length >= 2 && (
        <Polyline positions={route} pathOptions={{ color: "#22c55e", weight: 4, dashArray: "8 8" }} />
      )}
    </MapContainer>
  );
}