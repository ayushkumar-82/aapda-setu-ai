import { LifeBuoy, Loader2 } from "lucide-react";

export default function SOSButton({ onClick, loading, label = "Send SOS" }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-600 text-white text-lg font-bold shadow-lg shadow-red-600/30 hover:bg-red-700 active:scale-[0.99] transition disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LifeBuoy className="w-6 h-6" />}
      {loading ? "Sending..." : label}
    </button>
  );
}