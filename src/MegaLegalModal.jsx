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
      // Aktuelles Datum für den KI-Kontext generieren
      const today = new Date().toLocaleDateString('de-DE');
      
      const initialUserPrompt = `Hier ist das neu eingegangene Dokumentendossier zur sofortigen forensischen Tiefenprüfung:

Behörde / Absender: ${dossier.kontakt || "Unbekannt"}
Aktenzeichen: ${dossier.aktenzeichen || "Unbekannt"}
Frist: ${dossier.frist_extern || "Keine Frist erkannt"}
Betreff / Thema: ${dossier.thema || "Ohne Betreff"}

DOKUMENTENTEXT:
${dossier.brief_entwurf || dossier.raw_text || "Kein Volltext vorhanden."}

WICHTIGE KONTEXT-DATEN FÜR DEINEN FINALEN SCHRIFTSATZ:
- Heutiges Datum (für den Briefkopf): ${today}
- Unser Mandant (Absender): ${dossier.unsere_firma || "Jens Wilsdorf / Wilsdorf & Sommer GmbH"}

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

  // --- JSON SANITIZER ---
  const cleanJsonString = (str) => {
    let inString = false;
    let escaped = false;
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '\\' && !escaped) {
            escaped = true;
            result += char;
            continue;
        }
        if (char === '"' && !escaped) {
            inString = !inString;
        }
        if (char === '\n' && inString) {
            result += '\\n';
        } else if (char === '\r' && inString) {
            // ignore \r
        } else {
            result += char;
        }
        escaped = false;
    }
    return result;
  };

  // --- ROBUSTER EXTRACTOR ---
  const extractAndParseJSON = (text) => {
    let extractedJson = null;
    
    // 1. Suche nach Markdown JSON Block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      extractedJson = codeBlockMatch[1];
    } else {
      // 2. Fallback: Suche nach der ersten öffnenden und letzten schließenden Klammer
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        extractedJson = text.substring(firstBrace, lastBrace + 1);
      }
    }

    // Wenn JSON gefunden wurde UND das Wort "brief_entwurf" enthält
    if (extractedJson && extractedJson.includes('"brief_entwurf"')) {
      try {
        return JSON.parse(extractedJson);
      } catch (err) {
        try {
          const fixedJson = cleanJsonString(extractedJson);
          return JSON.parse(fixedJson);
        } catch (err2) {
          console.error("JSON Parse Error (Auch nach Sanitizer fehlgeschlagen):", err2);
          return null;
        }
      }
    }
    return null;
  };

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
      const parsedJson = extractAndParseJSON(reply);
      if (parsedJson) {
        onApplySchriftsatz(parsedJson);
        onClose(); // Modal sofort schließen!
        setIsLoading(false);
        return; 
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

  // Klick auf den Button
  const handleExtractAndApplyJSON = () => {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
    
    if (lastAssistantMsg) {
      const parsedJson = extractAndParseJSON(lastAssistantMsg.content);
      if (parsedJson) {
        onApplySchriftsatz(parsedJson);
        onClose();
        return; 
      }
    }

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

        {/* Chat / Audit Verlauf -> STRIKT LINKSBÜNDIG & VOLLE BREITE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm font-sans bg-slate-900">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={idx} className="flex flex-col w-full items-start">
                <div className="text-xs font-bold text-slate-400 mb-2 px-1 uppercase tracking-wider">
                  {isUser ? "Mandant / Instruktion" : "Sonar MegaLegal (30-Experten Board)"}
                </div>
                <div
                  className={`w-full rounded-lg px-6 py-5 whitespace-pre-wrap leading-relaxed shadow-sm border ${
                    isUser
                      ? "bg-slate-800 border-slate-700 text-slate-200"
                      : "bg-slate-950/50 border-emerald-900/50 text-slate-300 font-mono text-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center space-x-3 text-emerald-500 text-sm py-4 px-2 font-mono">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-.5s]"></div>
              <span>Mr. Veto & das Experten-Board arbeiten...</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg text-sm w-full">
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
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition disabled:opacity-50"
            >
              Senden
            </button>
          </form>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white transition px-4 py-2 rounded-lg hover:bg-slate-800"
            >
              Schließen (Abbrechen)
            </button>
            <button
              type="button"
              onClick={handleExtractAndApplyJSON}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-blue-900/30 transition flex items-center space-x-2"
            >
              <span>🚀 Ausgangs-Schriftsatz ins Cockpit übernehmen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 