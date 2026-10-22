import { ShieldAlert, ExternalLink } from "lucide-react";

const SOURCES = [
  { name: "India Meteorological Department (IMD)", url: "https://mausam.imd.gov.in" },
  { name: "NDMA — National Disaster Management Authority", url: "https://ndma.gov.in" },
  { name: "Sachet — NDMA emergency alerts", url: "https://sachet.ndma.gov.in" },
  { name: "INCOIS — Tsunami & ocean services", url: "https://www.incois.gov.in" },
];

export default function OfficialAlerts() {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5 mb-2">
        <ShieldAlert className="w-4 h-4" /> Official Authority Alerts
      </div>
      <p className="text-sm text-slate-600">
        No official government alert feed is directly connected for this region. For authoritative, officially issued warnings please check the sources below directly:
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SOURCES.map((s) => (
          <a key={s.url} href={s.url} target="_blank" rel="noreferrer"
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700">
            {s.name} <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-slate-400">
        AI assessments shown in this app are clearly labeled and are <span className="font-semibold">not</span> government alerts. Always rely on official channels for confirmed warnings.
      </p>
    </div>
  );
}