import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import SeverityBadge from "@/components/SeverityBadge";
import { Image as ImageIcon, Upload, Loader2, CheckCircle2 } from "lucide-react";

const TYPES = [
  { value: "flooding", label: "Flooding" },
  { value: "building_damage", label: "Building Damage" },
  { value: "road_blockage", label: "Road Blockage" },
  { value: "landslide", label: "Landslide" },
  { value: "fire", label: "Fire" },
  { value: "infrastructure_damage", label: "Infrastructure Damage" },
  { value: "fallen_tree", label: "Fallen Tree" },
  { value: "other", label: "Other" },
];
const SEVERITIES = ["low", "moderate", "high", "critical"];

const verifyColor = {
  unverified: "bg-slate-100 text-slate-600",
  ai_flagged: "bg-violet-100 text-violet-700",
  human_verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  resolved: "bg-blue-100 text-blue-700",
};

export default function Reports() {
  const { location, lang } = useApp();
  const [type, setType] = useState("flooding");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("moderate");
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    base44.entities.Report.list("-created_date", 20).then(setReports).catch(() => {});
  }, []);

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch (err) {
      setImageUrl("");
    }
  }

  async function submit() {
    if (!location) return;
    setSubmitting(true);
    let aiAnalysis = null;
    try {
      if (imageUrl) {
        const res = await base44.functions.invoke("analyzeReport", { imageUrl, description, type });
        aiAnalysis = res.data.analysis;
      }
    } catch (e) { aiAnalysis = null; }

    try {
      await base44.entities.Report.create({
        latitude: location.latitude, longitude: location.longitude,
        address: location.label || "", type, description, image_url: imageUrl,
        severity, verification_status: aiAnalysis?.suggested_status || "unverified",
        ai_category: aiAnalysis?.ai_category || "", ai_severity: aiAnalysis?.ai_severity || "",
        ai_confidence: aiAnalysis?.ai_confidence || 0, reporter_name: "",
      });
      setDone(true);
      setDescription(""); setImage(null); setImageUrl("");
      base44.entities.Report.list("-created_date", 20).then(setReports);
    } catch (e) { /* keep */ }
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900">{t(lang, "reportHazard")}</h1>

      {done ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <div className="mt-2 font-semibold text-slate-900">{t(lang, "reportSubmitted")}</div>
          <button onClick={() => setDone(false)} className="mt-3 text-sm text-slate-600 underline">Report another</button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">{t(lang, "reportType")}</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm">
              {TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase">{t(lang, "severity2")}</label>
            <div className="mt-1 flex gap-2">
              {SEVERITIES.map((s) => (
                <button key={s} onClick={() => setSeverity(s)} className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize border transition ${severity === s ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600"}`}>{s}</button>
              ))}
            </div>
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t(lang, "description")} rows={3} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase">{t(lang, "uploadImage")}</span>
            <div className="mt-1 flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                <Upload className="w-4 h-4" /> Choose
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              {image && <span className="text-xs text-slate-500 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> {image.name}</span>}
            </div>
            {imageUrl && <img src={imageUrl} alt="preview" className="mt-2 rounded-xl max-h-40 object-cover" />}
          </label>
          <button onClick={submit} disabled={submitting || !location} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-violet-600 text-white font-semibold text-sm disabled:opacity-60">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {t(lang, "submitReport")}
          </button>
          <p className="text-[10px] text-slate-400">AI will analyze your image (if attached) to suggest a damage category. Final verification is done by authorities.</p>
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-500 uppercase">Recent Reports</div>
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl bg-white border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-800 capitalize">{r.type.replace("_", " ")}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${verifyColor[r.verification_status] || verifyColor.unverified}`}>{r.verification_status.replace("_", " ")}</span>
            </div>
            {r.description && <p className="text-xs text-slate-500 mt-1">{r.description}</p>}
            {r.ai_category && <p className="text-[11px] text-violet-600 mt-1">AI: {r.ai_category} · {r.ai_confidence}% confidence</p>}
          </div>
        ))}
      </div>
    </div>
  );
}