import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

export default function MegaLegalModal({ isOpen, onClose, dossier, onApplySchriftsatz }) {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const chatBottomRef = useRef(null);

  // Initialer Start beim Öffnen des Modals
  useEffect(() => {
    if (isOpen && dossier) {
      const initialUserPrompt = `Hier ist das neu eingegangene Dokumentendossier zur sofortigen forensischen Tiefenprüfung:
Behörde / Absender: ${dossier.kontakt || "Unbekannt"}
Aktenzeichen: ${dossier.aktenzeichen || "Unbekannt"}
Frist: ${dossier.frist_extern || "Keine Frist erkannt"}
Betreff / Thema: ${dossier.thema || "Ohne Betreff"}

DOKUMENTENTEXT:
${dossier.brief_entwurf || dossier.raw_text || "Kein Volltext vorhanden."}

Starte Phase 1 (SCQA-Analyse) und die Mr. Veto War-Room Schleife. Was sind die Schwachstellen des Bescheids und wie schlagen wir zurück?`;

      setMessages([{ role: "user", content: initialUserPrompt }]);
      callMegaLegal([{ role: "user", content: initialUserPrompt }]);
    } else {
      setMessages([]);
      setErrorMsg(null);
    }
  }, [isOpen, dossier]);

  // Auto-Scroll zum Ende des Chatverlaufs
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const callMegaLegal = async (history) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("sonar-ai-triage", {
        body: {
          mode: "megalegal_chat",
          messages: history,
        },
      });

      if (error) throw new Error(error.message || "Fehler beim Aufruf der Edge Function.");
      if (data?.error) throw new Error(data.error);

      const reply = data?.reply || "Keine Antwort vom Board erhalten.";

      // --- JSON INTERCEPTOR (ABFANGJÄGER) ---
      // Prüft, ob die Antwort von Claude das finale JSON (anhand des Pflichtfelds 'brief_entwurf') enthält.
      const jsonMatch = reply.match(/\{[\s\S]*?"brief_entwurf"[\s\S]*?\}/);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          onApplySchriftsatz(parsed);
          onClose(); // Modal sofort schließen!
          setIsLoading(false);
          return; // Abbruch hier: Die Nachricht wird NICHT mehr in den Chatverlauf geschrieben.
        } catch (err) {
          console.error("Interceptor Parse Error:", err);
          // Fällt durch und zeigt den fehlerhaften Text im Chat an, falls JSON kaputt ist.
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("[MegaLegalModal Error]:", err);
      setErrorMsg(err.message || "Verbindungsfehler zu Sonar Mega Legal.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;

    const updatedHistory = [...messages, { role: "user", content: inputPrompt }];
    setMessages(updatedHistory);
    setInputPrompt("");
    callMegaLegal(updatedHistory);
  };

  // Extrahiert das Ausgangs-JSON aus dem Antworttext oder fordert es neu an
  const handleExtractAndApplyJSON = () => {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
    
    // 1. Zuerst prüfen wir, ob im Chat schon ein JSON mit "brief_entwurf" herumliegt
    if (lastAssistantMsg) {
      const text = lastAssistantMsg.content;
      const jsonMatch = text.match(/\{[\s\S]*?"brief_entwurf"[\s\S]*?\}/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          onApplySchriftsatz(parsed);
          onClose();
          return; // Fertig, wenn schon da.
        } catch (err) {
          console.error("Parse Error beim manuellen Extrahieren:", err);
        }
      }
    }

    // 2. Fallback: Kein JSON da. Wir feuern den Befehl ab. 
    // Sobald die Antwort reinkommt, wird der Interceptor in callMegaLegal sie greifen und das Modal schließen.
    const triggerPrompt = "Ja, gib mir bitte jetzt das finale Ausgangs-JSON für mein SONAR Cockpit.";
    const updatedHistory = [...messages, { role: "user", content: triggerPrompt }];
    setMessages(updatedHistory);
    callMegaLegal(updatedHistory);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">SONAR MEGA LEGAL – WAR-ROOM</h2>
              <p className="text-xs text-slate-400">
                Akte: {dossier?.aktenzeichen || "Neu"} | Gegner: {dossier?.kontakt || "Behörde"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Chat / Audit Verlauf */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm font-sans">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div className="text-xs text-slate-400 mb-1 px-1">
                  {isUser ? "Mandant (Du)" : "Sonar MegaLegal (30-Experten Board)"}
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 whitespace-pre-wrap leading-relaxed shadow-md ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none font-mono text-xs"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs py-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-.5s]"></div>
              <span>Mr. Veto & das Experten-Board zerlegen den Bescheid...</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg text-xs">
              ⚠️ {errorMsg}
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Footer & Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Instruktion an die Experten (z.B. 'Schärfer rügen', 'Fristverlängerung fordern')..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-50"
            >
              Senden
            </button>
          </form>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-slate-800"
            >
              Schließen (Später bearbeiten)
            </button>
            <button
              type="button"
              onClick={handleExtractAndApplyJSON}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded-xl text-sm shadow-lg shadow-emerald-900/30 transition flex items-center space-x-2"
            >
              <span>🚀 Ausgangs-Schriftsatz ins Cockpit übernehmen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}