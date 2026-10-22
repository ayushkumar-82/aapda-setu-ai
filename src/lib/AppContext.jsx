import { createContext, useContext, useState, useEffect } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { syncQueue } from "@/lib/offlineQueue";
import { base44 } from "@/api/base44Client";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("aapdasetu_lang") || "en");
  const [demoMode, setDemoMode] = useState(false);
  const [demoScenario, setDemoScenario] = useState(0);
  const [placeName, setPlaceName] = useState("");
  const { location, status, error, request, setManual } = useGeolocation();
  const online = useOnlineStatus();

  useEffect(() => {
    localStorage.setItem("aapdasetu_lang", lang);
  }, [lang]);

  // Synchronize the offline SOS queue as soon as connectivity returns.
  useEffect(() => {
    if (!online) return;
    syncQueue(async (sos) => {
      await base44.entities.SOSRequest.create(sos);
    }).catch(() => {});
  }, [online]);

  return (
    <AppContext.Provider
      value={{
        lang, setLang,
        demoMode, setDemoMode,
        demoScenario, setDemoScenario,
        placeName, setPlaceName,
        location, geoStatus: status, geoError: error,
        requestLocation: request, setManualLocation: setManual,
        online,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}