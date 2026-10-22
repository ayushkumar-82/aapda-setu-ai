import { LEVEL_META } from "@/lib/disasterActionsBridge";

const bgMap = {
  monitor: "from-emerald-500 to-emerald-600",
  warn: "from-amber-500 to-amber-600",
  escalate: "from-orange-500 to-orange-600",
  critical: "from-red-600 to-red-700",
};

export default function StatusBanner({ level, message }) {
  const meta = LEVEL_META[level] || LEVEL_META.monitor;
  return (
    <div className={`rounded-2xl bg-gradient-to-r ${bgMap[level] || bgMap.monitor} text-white px-4 py-3 shadow-sm`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold tracking-wider opacity-90">{meta.label}</span>
        <span className="text-sm font-medium">{message || meta.message}</span>
      </div>
    </div>
  );
}