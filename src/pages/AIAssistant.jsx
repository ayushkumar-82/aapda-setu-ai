import { useState, useEffect, useRef } from "react";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { answerQuestion } from "@/lib/assistantEngine";
import { Send, MessageSquare, Loader2, Mic, Volume2 } from "lucide-react";

const SUGGESTIONS = [
  "Are there any alerts near me?",
  "What should I do during a flood?",
  "Where is the nearest shelter?",
  "How to prepare for a cyclone?",
  "What to keep in an emergency kit?",
  "What does my risk score mean?",
];

export default function AIAssistant() {
  const { lang, location, placeName } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content }]);
    setLoading(true);
    try {
      const reply = await answerQuestion(content, { location, placeName });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn't process that just now. Please try rephrasing your question." }]);
    } finally {
      setLoading(false);
    }
  }

  function speak(text) {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === "hi" ? "hi-IN" : "en-IN";
      speechSynthesis.speak(u);
    }
  }

  function voiceInput() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported on this browser."); return; }
    const rec = new SR();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.onresult = (e) => setInput(e.results[0][0].transcript);
    rec.start();
  }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-9rem)]">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{t(lang, "aiAssistant")}</h1>
        <p className="text-xs text-slate-500">{t(lang, "askAssistant")}</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 rounded-2xl bg-white border border-slate-200 p-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-400 mt-2">Ask about alerts, shelters, safety steps, weather or your risk — answers use the live Alert & Shelter databases.</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-[11px] px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}>
              {m.content}
              {m.role === "assistant" && (
                <button onClick={() => speak(m.content)} className="ml-2 align-middle"><Volume2 className="w-3.5 h-3.5 inline text-slate-500" /></button>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-4 h-4 animate-spin" /> AapdaSetu AI is checking live data…</div>}
        <div ref={scrollRef} />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={voiceInput} className="p-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><Mic className="w-5 h-5" /></button>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t(lang, "typeMessage")} className="flex-1 rounded-xl border border-slate-200 p-3 text-sm" />
        <button onClick={() => send()} disabled={loading} className="p-3 rounded-xl bg-blue-600 text-white disabled:opacity-60"><Send className="w-5 h-5" /></button>
      </div>
    </div>
  );
}