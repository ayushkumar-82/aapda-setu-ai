import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { queueSOS, getQueuedSOS } from "@/lib/offlineQueue";
import SOSButton from "@/components/SOSButton";
import SeverityBadge from "@/components/SeverityBadge";
import { MapPin, CheckCircle2, Clock, Phone, AlertTriangle } from "lucide-react";

const CATEGORIES = [
  { value: "medical", label: "Medical Emergency" },
  { value: "flood", label: "Flood / Trapped by Water" },
  { value: "fire", label: "Fire" },
  { value: "trapped", label: "Trapped / Collapsed" },
  { value: "injury", label: "Serious Injury" },
  { value: "other", label: "Other" },
];
const SEVERITIES = ["critical", "high", "medium", "low"];

function genSosId() {
  return "SOS-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function SOS() {
  const { location, online, lang } = useApp();
  const [category, setCategory] = useState("medical");
  const [severity, setSeverity] = useState("high");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [queued, setQueued] = useState([]);

  useEffect(() => { getQueuedSOS().then(setQueued).catch(() => {}); }, [online]);

  async function submit() {
    if (!location) return;
    setLoading(true);
    const sosId = genSosId();
    const payload = {
      sos_id: sosId,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.label || "",
      category, severity, message, reporter_name: name, reporter_phone: phone,
      status: "pending",
    };
    try {
      if (online) {
        await base44.entities.SOSRequest.create(payload);
        setResult({ sosId, queued: false });
      } else {
        await queueSOS(payload);
        setResult({ sosId, queued: true });
      }
      getQueuedSOS().then(setQueued);
    } catch (e) {
      await queueSOS(payload);
      setResult({ sosId, queued: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
        <h1 className="text-lg font-bold text-red-700">{t(lang, "sosEmergency")}</h1>
        <p className="text-xs text-red-600 mt-0.5">Press to alert emergency responders with your location.</p>
      </div>

      {result ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center space-y-3">
          {result.queued ? (
            <>
              <Clock className="w-12 h-12 text-amber-500 mx-auto" />
              <div className="text-base font-bold text-slate-900">{t(lang, "sosQueued")}</div>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <div className="text-base font-bold text-slate-900">{t(lang, "sosSent")}</div>
            </>
          )}
          <div className="text-2xl font-mono font-bold text-slate-700">{result.sosId}</div>
          <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" /> {location?.latitude.toFixed(3)}, {location?.longitude.toFixed(3)}
          </div>
          <button onClick={() => setResult(null)} className="mt-2 text-sm font-medium text-slate-600 underline">
            Send another
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
          {!online && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <AlertTriangle className="w-4 h-4" /> You are offline. SOS will be queued and sent automatically when online.
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">Severity</label>
            <div className="mt-1 flex gap-2">
              {SEVERITIES.map((s) => (
                <button key={s} onClick={() => setSeverity(s)} className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize border transition ${severity === s ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your emergency (optional)" rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <SOSButton onClick={submit} loading={loading} label={t(lang, "sendSos")} />
        </div>
      )}

      {/* Queued SOS */}
      {queued.length > 0 && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Queued SOS ({queued.length})</div>
          {queued.map((q) => (
            <div key={q.localId} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="font-mono text-xs text-slate-700">{q.sos_id}</span>
              <SeverityBadge severity={q.severity} size="sm" />
            </div>
          ))}
        </div>
      )}

      {/* Quick call */}
      <a href="tel:112" className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-900 text-white font-semibold text-sm">
        <Phone className="w-4 h-4" /> Call 112 Emergency
      </a>
    </div>
  );
}