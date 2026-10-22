import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/liveData";
import { timeAgo } from "@/lib/liveData";
import MapView from "@/components/MapView";
import SeverityBadge from "@/components/SeverityBadge";
import { Radio, Loader2, Send, Ban, MapPin, AlertTriangle, ShieldCheck } from "lucide-react";

// Authority-only: compose a geofenced emergency broadcast from a verified Alert.
export default function BroadcastComposer({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [radius, setRadius] = useState(25);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => Promise.all([
      base44.entities.Alert.filter({ status: "active" }, "-updated_date", 50).catch(() => []),
      base44.entities.Broadcast.filter({ status: "active" }, "-created_date", 20).catch(() => []),
    ]).then(([a, b]) => { if (alive) { setAlerts(a || []); setBroadcasts(b || []); } });
    load();
    const u = base44.entities.Broadcast.subscribe(load);
    return () => { alive = false; u(); };
  }, []);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId);

  function pickAlert(id) {
    setSelectedAlertId(id);
    const a = alerts.find((x) => x.id === id);
    if (a) {
      setTitle(`${a.type.replace(/_/g, " ")} Alert — ${a.affected_area || "region"}`);
      setMessage(a.message + (a.recommended_action ? `\n\nAction: ${a.recommended_action}` : ""));
    }
  }

  async function send() {
    if (!selectedAlert || !title.trim() || !message.trim()) return;
    setSending(true); setError(false); setDone(false);
    const a = selectedAlert;
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    try {
      await base44.entities.Broadcast.create({
        title: title.trim(),
        message: message.trim(),
        alert_id: a.id,
        disaster_type: a.type,
        severity: a.severity,
        latitude: a.latitude,
        longitude: a.longitude,
        radius_km: Number(radius) || 25,
        affected_area: a.affected_area || "",
        sent_by: user?.email || "authority",
        status: "active",
        expires_at: expires,
      });
      // Best-effort native push to registered users within the radius.
      // Activates once integration credits + native push build are available.
      try {
        await base44.functions.invoke("sendBroadcastPush", {
          latitude: a.latitude,
          longitude: a.longitude,
          radius_km: Number(radius) || 25,
          title: title.trim(),
          message: message.trim(),
        });
      } catch {
        /* credits/native push not available — in-app banner still delivers */
      }
      setDone(true);
      setSelectedAlertId(""); setTitle(""); setMessage(""); setRadius(25);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }

  async function expire(id) {
    try { await base44.entities.Broadcast.update(id, { status: "expired" }); } catch {}
  }

  const previewMarker = selectedAlert ? [{ lat: selectedAlert.latitude, lng: selectedAlert.longitude, type: "incident", radius: 10, popup: `${selectedAlert.type} · ${selectedAlert.affected_area || ""}` }] : [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="text-sm font-bold text-slate-800 flex items-center gap-2"><Radio className="w-4 h-4 text-red-600" /> Emergency Broadcast</div>
        <p className="text-[11px] text-slate-500 mt-0.5">Send a real-time alert to every citizen currently within the radius of a verified incident. Citizens inside the radius see it instantly; those outside do not.</p>

        <div className="mt-3 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Verified Alert (source)</label>
            <select value={selectedAlertId} onChange={(e) => pickAlert(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm bg-white">
              <option value="">— Select an active Alert —</option>
              {alerts.map((a) => (
                <option key={a.id} value={a.id}>{a.type.replace(/_/g, " ")} · {a.affected_area || "region"} · {a.severity}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" placeholder="Broadcast title" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase">Radius (km)</label>
              <input type="number" min={1} max={500} value={radius} onChange={(e) => setRadius(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm" placeholder="What citizens should know and do…" />
          </div>

          {selectedAlert && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Center: {selectedAlert.latitude?.toFixed(3)}, {selectedAlert.longitude?.toFixed(3)} · Reaches citizens within {radius} km.</div>
          )}

          {error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">Could not send the broadcast. Please retry.</div>}
          {done && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Broadcast sent — delivering to citizens within the radius now.</div>}

          <button onClick={send} disabled={sending || !selectedAlert || !title.trim() || !message.trim()} className="w-full py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Broadcast to citizens in radius
          </button>
        </div>
      </div>

      {selectedAlert && <MapView center={[selectedAlert.latitude, selectedAlert.longitude]} zoom={8} markers={previewMarker} className="border border-slate-200" />}

      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="text-sm font-bold text-slate-800 mb-2">Active Broadcasts</div>
        {broadcasts.length === 0 ? (
          <div className="text-sm text-slate-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-slate-300" /> No active broadcasts.</div>
        ) : (
          <div className="space-y-2">
            {broadcasts.map((b) => (
              <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{b.title}</span>
                  <SeverityBadge severity={b.severity} size="sm" />
                </div>
                <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{b.message}</p>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {b.affected_area || `${b.latitude?.toFixed(3)}, ${b.longitude?.toFixed(3)}`} · Radius {b.radius_km} km · Sent {timeAgo(b.created_date)} by {b.sent_by || "authority"}</div>
                <button onClick={() => expire(b.id)} className="mt-2 text-[11px] px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 inline-flex items-center gap-1"><Ban className="w-3 h-3" /> Expire broadcast</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}