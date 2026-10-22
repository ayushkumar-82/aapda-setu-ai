import { Outlet, NavLink, Link } from "react-router-dom";
import {
  Home, Map as MapIcon, Bell, LifeBuoy, Building2, FileText,
  MessageSquare, Info, ShieldAlert,
} from "lucide-react";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import OfflineIndicator from "@/components/OfflineIndicator";
import LanguageToggle from "@/components/LanguageToggle";
import BroadcastBanner from "@/components/BroadcastBanner";
import CitizenLocationSync from "@/components/CitizenLocationSync";

export default function Layout() {
  const { lang } = useApp();

  const navItems = [
    { to: "/", icon: Home, label: t(lang, "home"), end: true },
    { to: "/map", icon: MapIcon, label: t(lang, "riskMap") },
    { to: "/alerts", icon: Bell, label: t(lang, "alerts") },
    { to: "/shelters", icon: Building2, label: t(lang, "shelters") },
    { to: "/reports", icon: FileText, label: t(lang, "reports") },
    { to: "/assistant", icon: MessageSquare, label: t(lang, "aiAssistant") },
    { to: "/emergency", icon: Info, label: t(lang, "emergencyInfo") },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-slate-900 text-sm">{t(lang, "appName")}</div>
              <div className="text-[10px] text-slate-500 -mt-0.5 hidden sm:block">{t(lang, "tagline")}</div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <LanguageToggle />
            <OfflineIndicator />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 pb-28 pt-4 space-y-4">
        <BroadcastBanner />
        <Outlet />
      </main>

      <CitizenLocationSync />

      {/* Persistent SOS button */}
      <Link
        to="/sos"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-5 py-3.5 rounded-full bg-red-600 text-white font-bold shadow-lg shadow-red-600/30 hover:bg-red-700 active:scale-95 transition"
      >
        <LifeBuoy className="w-5 h-5" />
        SOS
      </Link>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-2 flex items-center gap-1 overflow-x-auto no-scrollbar h-16">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl shrink-0 text-[10px] font-medium transition ${
                  isActive ? "text-red-600 bg-red-50" : "text-slate-500 hover:text-slate-800"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/authority"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl shrink-0 text-[10px] font-medium transition ${
                isActive ? "text-slate-900 bg-slate-100" : "text-slate-400 hover:text-slate-700"
              }`
            }
          >
            <ShieldAlert className="w-5 h-5" />
            {t(lang, "authority")}
          </NavLink>
        </div>
      </nav>
    </div>
  );
}