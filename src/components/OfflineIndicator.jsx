import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { Wifi, WifiOff } from "lucide-react";

export default function OfflineIndicator() {
  const { online, lang } = useApp();
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
        online ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      }`}
    >
      {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {online ? t(lang, "online") : t(lang, "offline")}
    </span>
  );
}