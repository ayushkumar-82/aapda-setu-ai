import { useApp } from "@/lib/AppContext";
import { LANGUAGES } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useApp();
  return (
    <div className="flex items-center rounded-full border border-slate-200 overflow-hidden">
      {Object.entries(LANGUAGES).map(([code, { label }]) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`text-[11px] font-semibold px-2 py-1 transition ${
            lang === code ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          {code === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}