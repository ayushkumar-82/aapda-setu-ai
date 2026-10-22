import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { SEED_CONTACTS } from "@/lib/demoData";
import { Phone, Package, ShieldCheck } from "lucide-react";

const KIT_ITEMS = ["Water (3L per person/day)", "Non-perishable food (3 days)", "First-aid kit", "Flashlight + batteries", "Power bank / charger", "Important documents (waterproof)", "Cash (small notes)", "Whistle", "Blanket", "Medications (7 days)"];

const TIPS = {
  flood: "Move to higher ground. Avoid floodwater. Do not walk or drive through flowing water.",
  cyclone: "Stay indoors, away from windows. Secure loose items. Charge devices before landfall.",
  earthquake: "Drop, Cover, Hold On. After shaking, move to open ground. Avoid damaged buildings.",
  fire: "Stay low under smoke. Get out fast. Call 101. Never re-enter a burning building.",
  heatwave: "Stay hydrated. Avoid 11am–4pm sun. Keep vulnerable people cool. Watch for heatstroke.",
};

export default function EmergencyInfo() {
  const { lang, online } = useApp();
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    (async () => {
      let list = await base44.entities.EmergencyContact.list().catch(() => []);
      if (!list.length) list = await base44.entities.EmergencyContact.bulkCreate(SEED_CONTACTS).catch(() => []);
      setContacts(list || []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900">{t(lang, "emergencyInfo")}</h1>

      {!online && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
          You are offline. The information below is cached and available without internet.
        </div>
      )}

      {/* Emergency contacts */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase mb-3">{t(lang, "emergencyContacts")}</div>
        <div className="space-y-2">
          {contacts.map((c) => (
            <a key={c.id} href={`tel:${c.number}`} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition">
              <div>
                <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                <div className="text-[11px] text-slate-500">{c.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-600">{c.number}</span>
                <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center"><Phone className="w-4 h-4 text-white" /></div>
              </div>
            </a>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">tel: links open your device dialer. Calling requires cellular/network support.</p>
      </div>

      {/* Emergency kit */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Emergency Kit Checklist</div>
        <div className="grid grid-cols-1 gap-1.5">
          {KIT_ITEMS.map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="rounded accent-emerald-600" /> {item}
            </label>
          ))}
        </div>
      </div>

      {/* Safety tips */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Safety Tips</div>
        <div className="space-y-2">
          {Object.entries(TIPS).map(([k, v]) => (
            <div key={k} className="p-3 rounded-xl bg-slate-50">
              <div className="text-sm font-semibold text-slate-800 capitalize">{k}</div>
              <div className="text-xs text-slate-600 mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}