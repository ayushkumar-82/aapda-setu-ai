const colorMap = {
  low: "bg-emerald-100 text-emerald-700",
  moderate: "bg-amber-100 text-amber-700",
  severe: "bg-orange-100 text-orange-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function SeverityBadge({ severity, size = "md" }) {
  const sizes = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span className={`inline-flex items-center rounded-full font-semibold capitalize ${colorMap[severity] || colorMap.moderate} ${sizes}`}>
      {severity}
    </span>
  );
}