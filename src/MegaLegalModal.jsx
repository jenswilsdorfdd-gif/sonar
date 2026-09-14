import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

export default function MegaLegalModal({ isOpen, onClose, dossier, onApplySchriftsatz }) {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDark, setIsDark] = useState(true); // Theme Toggle State
  const chatBottomRef = useRef(null);

  // Initialer Start beim Öffnen des Modals
  useEffect(() => {
    if (isOpen && dossier) {
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
        if (char === '\\' && !escaped) { escaped = true; result += char; continue; }
        if (char === '"' && !escaped) { inString = !inString; }
        if (char === '\n' && inString) { result += '\\n'; } 
        else if (char === '\r' && inString) { /* ignore */ } 
        else { result += char; }
        escaped = false;
    }
    return result;
  };

  // --- ROBUSTER EXTRACTOR ---
  const extractAndParseJSON = (text) => {
    let extractedJson = null;
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      extractedJson = codeBlockMatch[1];
    } else {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        extractedJson = text.substring(firstBrace, lastBrace + 1);
      }
    }

    if (extractedJson && extractedJson.includes('"brief_entwurf"')) {
      try {
        return JSON.parse(extractedJson);
      } catch (err) {
        try {
          const fixedJson = cleanJsonString(extractedJson);
          return JSON.parse(fixedJson);
        } catch (err2) {
          console.error("JSON Parse Error:", err2);
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
        body: { mode: "megalegal_chat", messages: history },
      });

      if (error) throw new Error(error.message || "Fehler beim Aufruf der Edge Function.");
      if (data?.error) throw new Error(data.error);

      const reply = data?.reply || "Keine Antwort vom Board erhalten.";

      // --- JSON INTERCEPTOR (ABFANGJÄGER) ---
      const parsedJson = extractAndParseJSON(reply);
      if (parsedJson) {
        onApplySchriftsatz(parsedJson);
        onClose(); 
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

  // Standard Chat-Nachricht senden
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;
    const updatedHistory = [...messages, { role: "user", content: inputPrompt }];
    setMessages(updatedHistory);
    setInputPrompt("");
    callMegaLegal(updatedHistory);
  };

  // Button 1: Schriftsatz entwerfen lassen
  const handleDraftDocument = () => {
    const draftPrompt = "Die forensische Analyse ist abgeschlossen. Verfasse jetzt bitte den finalen, versandfertigen Schriftsatz (Einspruch/Widerspruch) an die Behörde. Formuliere ihn juristisch präzise, druckreif und verwende KEINE Platzhalter für das heutige Datum oder den Absender.";
    const updatedHistory = [...messages, { role: "user", content: draftPrompt }];
    setMessages(updatedHistory);
    callMegaLegal(updatedHistory);
  };

  // Button 2: JSON erzwingen und ins Cockpit übergeben
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
    
    // Knallharter Befehl an Claude, wirklich NUR das JSON auszuspucken
    const triggerPrompt = "Erzeuge jetzt AUSSCHLIESSLICH das finale Ausgangs-JSON für das SONAR Cockpit. WICHTIG: Das JSON MUSS zwingend das Feld 'brief_entwurf' enthalten. Liefere absolut keinen anderen Text davor oder danach, nur das reine JSON-Objekt, beginnend mit { und endend mit }.";
    const updatedHistory = [...messages, { role: "user", content: triggerPrompt }];
    setMessages(updatedHistory);
    callMegaLegal(updatedHistory);
  };

  if (!isOpen) return null;

  // --- THEME STYLING LOGIK ---
  const bgModal = isDark ? "bg-slate-900" : "bg-slate-50";
  const borderModal = isDark ? "border-slate-700" : "border-slate-300";
  const bgHeader = isDark ? "bg-slate-950/60" : "bg-white/80";
  const borderHeader = isDark ? "border-slate-800" : "border-slate-200";
  const textTitle = isDark ? "text-white" : "text-slate-900";
  const textSub = isDark ? "text-slate-400" : "text-slate-500";
  
  const bgChatArea = isDark ? "bg-slate-900" : "bg-slate-100";
  const bgUserMsg = isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800 shadow-sm";
  const bgAiMsg = isDark ? "bg-slate-950/50 border-emerald-900/50 text-slate-300" : "bg-emerald-50/50 border-emerald-200 text-slate-900";
  
  const bgFooter = isDark ? "bg-slate-950/80" : "bg-white/90";
  const borderFooter = isDark ? "border-slate-800" : "border-slate-200";
  const inputBg = isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`flex flex-col w-full max-w-5xl h-[90vh] ${bgModal} border ${borderModal} rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderHeader} ${bgHeader}`}>
          <div className="flex items-center space-x-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-4">
                <h2 className={`text-lg font-bold ${textTitle} tracking-wide`}>SONAR MEGA LEGAL – WAR-ROOM</h2>
                <button 
                  onClick={() => setIsDark(!isDark)} 
                  className={`p-1.5 rounded-md border ${borderModal} hover:opacity-80 transition flex items-center justify-center bg-transparent`} 
                  title={isDark ? "In den Hell-Modus wechseln" : "In den Dunkel-Modus wechseln"}
                >
                  {isDark ? "☀️" : "🌙"}
                </button>
              </div>
              <p className={`text-xs ${textSub} mt-0.5`}>
                Akte: {dossier?.aktenzeichen || "Neu"} | Gegner: {dossier?.kontakt || "Behörde"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`${textSub} hover:${textTitle} p-2 rounded-lg transition text-xl font-bold`}>
            ✕
          </button>
        </div>

        {/* Chat / Audit Verlauf -> STRIKT LINKSBÜNDIG & DOKUMENTEN-OPTIK */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-6 text-sm font-sans ${bgChatArea}`}>
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={idx} className="flex flex-col w-full items-start">
                <div className={`text-xs font-bold ${textSub} mb-2 px-1 uppercase tracking-wider`}>
                  {isUser ? "Mandant / Instruktion" : "Sonar MegaLegal (30-Experten Board)"}
                </div>
                <div className={`w-full rounded-lg px-6 py-5 whitespace-pre-wrap leading-relaxed border ${isUser ? bgUserMsg : bgAiMsg}`}>
                  {m.content}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center space-x-3 text-emerald-600 text-sm py-4 px-2 font-bold uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-.5s]"></div>
              <span>Mr. Veto & das Experten-Board arbeiten...</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 bg-rose-100 border border-rose-400 text-rose-700 rounded-lg text-sm w-full font-bold">
              ⚠️ {errorMsg}
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Footer & Actions */}
        <div className={`p-4 border-t ${borderFooter} ${bgFooter} space-y-3`}>
          
          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Instruktion an die Experten (z.B. 'Schärfer rügen', 'Fristverlängerung fordern')..."
              disabled={isLoading}
              className={`flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-50 ${inputBg}`}
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition disabled:opacity-50"
            >
              Senden
            </button>
          </form>

          {/* 3-Phasen Buttons */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`text-xs ${textSub} hover:${textTitle} transition px-4 py-2 rounded-lg border ${borderModal} hover:bg-black/5`}
            >
              Schließen (Abbrechen)
            </button>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDraftDocument}
                disabled={isLoading}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50"
              >
                <span>📝 1. Schriftsatz entwerfen</span>
              </button>
              
              <button
                type="button"
                onClick={handleExtractAndApplyJSON}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50"
              >
                <span>🚀 2. Ins Cockpit übergeben</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
} 