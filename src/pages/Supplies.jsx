import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Package, Plus, Building2, AlertTriangle, Boxes, Archive } from "lucide-react";

const CATEGORIES = ["medicine", "food", "water", "sanitation", "other"];

const CAT_BADGE = {
  medicine: "bg-violet-50 text-violet-700 border-violet-200",
  food: "bg-amber-50 text-amber-700 border-amber-200",
  water: "bg-sky-50 text-sky-700 border-sky-200",
  sanitation: "bg-emerald-50 text-emerald-700 border-emerald-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

const BAR_BY_STATE = { low: "bg-red-500", warn: "bg-amber-500", ok: "bg-emerald-500" };

function stockState(item) {
  if (item.quantity <= item.min_threshold) return "low";
  if (item.quantity <= item.min_threshold * 2) return "warn";
  return "ok";
}

export default function Supplies() {
  const [shelters, setShelters] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restockInput, setRestockInput] = useState({});
  const [saving, setSaving] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ shelter_id: "", item_name: "", category: "food", quantity: "", unit: "units", min_threshold: "" });

  async function refresh() {
    setLoading(true);
    const [sh, sup] = await Promise.all([
      base44.entities.Shelter.list().catch(() => []),
      base44.entities.ShelterSupply.list("-updated_date", 500).catch(() => []),
    ]);
    setShelters(sh || []);
    setSupplies(sup || []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const u = base44.entities.ShelterSupply.subscribe((ev) => {
      setSupplies((list) =>
        ev.type === "create" ? [ev.data, ...list]
          : ev.type === "delete" ? list.filter((x) => x.id !== ev.data.id)
          : list.map((x) => (x.id === ev.data.id ? ev.data : x))
      );
    });
    return () => u();
  }, []);

  const lowStock = supplies.filter((s) => s.quantity > 0 && s.quantity <= s.min_threshold);
  const outOfStock = supplies.filter((s) => s.quantity <= 0);

  function shelterName(id) {
    const s = shelters.find((x) => x.id === id);
    return s ? s.name : "Unassigned";
  }

  const groups = [
    ...shelters.map((s) => ({ shelter: s, items: supplies.filter((x) => x.shelter_id === s.id) })),
    { shelter: null, items: supplies.filter((x) => !shelters.some((s) => s.id === x.shelter_id)) },
  ].filter((g) => g.shelter || g.items.length > 0);

  async function applyRestock(item) {
    const amt = Number(restockInput[item.id]);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setSaving(item.id);
    try {
      await base44.entities.ShelterSupply.update(item.id, { quantity: item.quantity + amt });
      setRestockInput((r) => ({ ...r, [item.id]: "" }));
    } catch (e) {}
    setSaving(null);
  }

  async function addItem(e) {
    e.preventDefault();
    if (!form.shelter_id || !form.item_name.trim()) {
      setFormError("Select a shelter and name the item.");
      return;
    }
    setSaving("form");
    try {
      await base44.entities.ShelterSupply.create({
        shelter_id: form.shelter_id,
        shelter_name: shelterName(form.shelter_id),
        item_name: form.item_name.trim(),
        category: form.category,
        quantity: Number(form.quantity) || 0,
        unit: form.unit.trim() || "units",
        min_threshold: Number(form.min_threshold) || 0,
      });
      setForm({ shelter_id: "", item_name: "", category: "food", quantity: "", unit: "units", min_threshold: "" });
      setFormError("");
      setShowForm(false);
    } catch (err) {
      setFormError("Could not save. Please try again.");
    }
    setSaving(null);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <Link to="/authority" className="p-1.5 rounded-full bg-slate-700 hover:bg-slate-600"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <div className="font-bold text-sm">Shelter Supplies</div>
            <div className="text-[10px] text-slate-400">Stock levels & low-stock alerts</div>
          </div>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="text-xs px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Add item
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {showForm && (
          <form onSubmit={addItem} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-800">Track a new supply item</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <select value={form.shelter_id} onChange={(e) => setForm((f) => ({ ...f, shelter_id: e.target.value }))} className="col-span-2 md:col-span-1 rounded-xl border border-slate-200 p-2.5 text-sm">
                <option value="">Select shelter…</option>
                {shelters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input value={form.item_name} onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))} placeholder="Item (e.g. ORS kits)" className="rounded-xl border border-slate-200 p-2.5 text-sm" />
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="rounded-xl border border-slate-200 p-2.5 text-sm capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder="Quantity" type="number" min="0" className="rounded-xl border border-slate-200 p-2.5 text-sm" />
              <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="Unit (kits, litres…)" className="rounded-xl border border-slate-200 p-2.5 text-sm" />
              <input value={form.min_threshold} onChange={(e) => setForm((f) => ({ ...f, min_threshold: e.target.value }))} placeholder="Low-stock threshold" type="number" min="0" className="rounded-xl border border-slate-200 p-2.5 text-sm" />
            </div>
            {formError && <div className="text-xs text-red-600">{formError}</div>}
            <button type="submit" disabled={saving === "form"} className="text-xs font-semibold px-4 py-2 rounded-full bg-slate-900 text-white disabled:opacity-50">
              {saving === "form" ? "Saving…" : "Save item"}
            </button>
          </form>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard icon={<Building2 className="w-4 h-4" />} label="Shelters" value={shelters.length} />
          <StatCard icon={<Boxes className="w-4 h-4" />} label="Tracked items" value={supplies.length} />
          <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Low stock" value={lowStock.length} tone={lowStock.length ? "warn" : ""} />
          <StatCard icon={<Archive className="w-4 h-4" />} label="Out of stock" value={outOfStock.length} tone={outOfStock.length ? "danger" : ""} />
        </div>

        {(lowStock.length > 0 || outOfStock.length > 0) && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-red-700">
              <AlertTriangle className="w-4 h-4" /> Replenishment needed ({lowStock.length + outOfStock.length})
            </div>
            <div className="mt-2 space-y-1">
              {[...outOfStock, ...lowStock].map((s) => (
                <div key={s.id} className="text-xs text-red-700 flex justify-between">
                  <span>{s.shelter_name || shelterName(s.shelter_id)} — {s.item_name}</span>
                  <span className="font-semibold">{s.quantity} / min {s.min_threshold} {s.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400">Loading supplies…</div>
        ) : supplies.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-sm text-slate-400">
            No supplies tracked yet — add items with the “Add item” button above.
          </div>
        ) : (
          groups.map(({ shelter, items }) => (
            <div key={shelter ? shelter.id : "unassigned"} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-bold text-slate-800">{shelter ? shelter.name : "Unassigned"}</span>
                  {shelter && <span className={`text-[10px] px-2 py-0.5 rounded-full ${shelter.status === "open" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{shelter.status}</span>}
                </div>
                <span className="text-[11px] text-slate-400">{items.length} items</span>
              </div>
              {items.length === 0 ? (
                <div className="text-xs text-slate-400 py-2">No items tracked for this shelter yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const state = stockState(item);
                    const pct = Math.min(100, (item.quantity / Math.max(item.min_threshold * 3, 1)) * 100);
                    return (
                      <div key={item.id} className="py-2.5 flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{item.item_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border capitalize ${CAT_BADGE[item.category] || CAT_BADGE.other}`}>{item.category}</span>
                            {state === "low" && <span className="text-[10px] font-bold text-red-600 uppercase">Low stock</span>}
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${BAR_BY_STATE[state]}`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">{item.quantity} {item.unit} · min {item.min_threshold}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            value={restockInput[item.id] || ""}
                            onChange={(e) => setRestockInput((r) => ({ ...r, [item.id]: e.target.value }))}
                            placeholder="+ Restock"
                            type="number" min="1"
                            className="w-24 rounded-xl border border-slate-200 p-2 text-xs"
                          />
                          <button
                            onClick={() => applyRestock(item)}
                            disabled={saving === item.id || !Number(restockInput[item.id])}
                            className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-40"
                          >
                            {saving === item.id ? "…" : "Add"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone = "" }) {
  const toneClass = tone === "danger" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-slate-800";
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3">
      <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold uppercase">{icon} {label}</div>
      <div className={`text-xl font-bold mt-1 ${toneClass}`}>{value}</div>
    </div>
  );
}