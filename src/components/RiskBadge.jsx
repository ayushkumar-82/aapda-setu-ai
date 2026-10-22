import { LEVEL_META } from "@/lib/disasterActionsBridge";

const colorMap = {
  monitor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warn: "bg-amber-100 text-amber-700 border-amber-200",
  escalate: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

export default function RiskBadge({ level, size = "md" }) {
  const meta = LEVEL_META[level] || LEVEL_META.monitor;
  const sizes = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${colorMap[level] || colorMap.monitor} ${sizes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}