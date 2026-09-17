import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// --- PDF.js Import für die clientseitige Extraktion im Modal ---
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function MegaLegalModal({ isOpen, onClose, dossier, onApplySchriftsatz }) {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDark, setIsDark] = useState(true);
  const chatBottomRef = useRef(null);

  // Initialer Start beim Öffnen des Modals MIT ZWILLINGS-ABRUF
  useEffect(() => {
    const initChatAndFetchTwin = async () => {
      if (isOpen && dossier) {
        setIsLoading(true);
        const today = new Date().toLocaleDateString('de-DE');
        const mandantFirma = dossier.unsere_firma || "Jens Wilsdorf";
        const mandantAP = dossier.unser_ansprechpartner || "Jens Wilsdorf";

        let bestText = (dossier.raw_text && dossier.raw_text.trim() !== "") 
          ? dossier.raw_text 
          : (dossier.brief_entwurf || "Kein Volltext vorhanden.");

        // --- ZWILLINGS-ABRUF LOGIK ---
        if (bestText.includes("Kein Volltext") || bestText.includes("OCR läuft") || bestText.length < 150) {
          try {
            const { data, error } = await supabase
              .from('akten_historie')
              .select('dokument_url')
              .eq('akte_id', dossier.akte_id)
              .not('dokument_url', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1);

            if (!error && data && data.length > 0 && data[0].dokument_url) {
              const urls = data[0].dokument_url.split(',');
              const pdfUrl = urls.find(u => u.toLowerCase().endsWith('.pdf'));
              const mdUrl = urls.find(u => u.toLowerCase().endsWith('.md'));

              let targetUrl = mdUrl;
              // Wenn kein direkter MD-Link in der DB steht, Zwillings-Trick anwenden
              if (!targetUrl && pdfUrl) {
                targetUrl = pdfUrl.replace(/\.[^/.]+$/, "") + ".md"; 
              }

              if (targetUrl) {
                const res = await fetch(targetUrl);
                if (res.ok) {
                  const fetchedText = await res.text();
                  if (fetchedText && fetchedText.trim() !== "") {
                    bestText = fetchedText; 
                  }
                }
              }
            }
          } catch (e) {
            console.error("Fehler beim Abruf des MD-Zwillings:", e);
          }
        }
        // -----------------------------

        const initialUserPrompt = `Hier ist das neu eingegangene Dokumentendossier zur sofortigen forensischen Tiefenprüfung:

Behörde / Absender: ${dossier.kontakt || "Unbekannt"}
Aktenzeichen: ${dossier.aktenzeichen || "Unbekannt"}
Frist: ${dossier.frist_extern || "Keine Frist erkannt"}
Betreff / Thema: ${dossier.thema || "Ohne Betreff"}

DOKUMENTENTEXT:
${bestText}

WICHTIGE KONTEXT-DATEN FÜR DEINEN FINALEN SCHRIFTSATZ:
- Heutiges Datum (für den Briefkopf): ${today}
- Unser Mandant (Absender): ${mandantFirma}
- Ansprechpartner: ${mandantAP}

STRIKTE REGEL: Du bist KEINE Rechtsanwaltskanzlei! Du schreibst den Entwurf exakt im Namen des Mandanten. Unterzeichne später am Ende AUSSCHLIESSLICH mit diesen Mandantendaten. Erfinde keine Kanzlei-Namen!

Starte Phase 1 (SCQA-Analyse) und die Mr. Veto War-Room Schleife. Was sind die Schwachstellen des Bescheids und wie schlagen wir zurück?`;

        setMessages([{ role: "user", content: initialUserPrompt }]);
        setIsLoading(false);
        callMegaLegal([{ role: "user", content: initialUserPrompt }], false);
      } else {
        setMessages([]);
        setErrorMsg(null);
      }
    };

    initChatAndFetchTwin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --- GEHÄRTETER JSON-SANITIZER ---
  const cleanJsonString = (str) => {
    if (!str) return str;
    
    // 1. Trailing Commas entfernen (häufiger KI-Fehler)
    let result = str.replace(/,\s*([}\]])/g, "$1");
    // 2. Unsichtbare Steuerzeichen (außer Tab, Newline) entfernen
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

    // 3. Zustandsmaschine: Echte Zeilenumbrüche nur INNERHALB von Strings zu \n konvertieren
    let inString = false;
    let escaped = false;
    let finalStr = '';
    for (let i = 0; i < result.length; i++) {
        const char = result[i];
        if (char === '\\' && !escaped) { escaped = true; finalStr += char; continue; }
        if (char === '"' && !escaped) { inString = !inString; }
        if (char === '\n' && inString) { finalStr += '\\n'; } 
        else if (char === '\r' && inString) { /* ignore */ } 
        else { finalStr += char; }
        escaped = false;
    }
    return finalStr;
  };

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
          console.error("JSON Parse Error nach Sanitizing:", err2);
          return null;
        }
      }
    }
    return null;
  };

  // --- ZUSÄTZLICHER isFinalExport PARAMETER ---
  const callMegaLegal = async (history, isFinalExport = false) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke("sonar-ai-triage", {
        body: { mode: "megalegal_chat", messages: history },
      });

      if (error) throw new Error(error.message || "Fehler beim Aufruf der Edge Function.");
      if (data?.error) throw new Error(data.error);

      const reply = data?.reply || "Keine Antwort vom Board erhalten.";

      // --- HARTER RIEGEL: JSON NUR BEI EXPLIZITEM EXPORT PARSEN ---
      if (isFinalExport) {
        const parsedJson = extractAndParseJSON(reply);
        if (parsedJson) {
          onApplySchriftsatz(parsedJson);
          onClose(); 
          setIsLoading(false);
          return; 
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
    callMegaLegal(updatedHistory, false);
  };

  // --- Datei-Upload im War-Room ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    let extractedText = "";

    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          extractedText += textContent.items.map(item => item.str).join(' ') + "\n";
        }
      } else if (file.name.toLowerCase().endsWith('.md') || file.name.toLowerCase().endsWith('.txt')) {
        extractedText = await file.text();
      } else {
        throw new Error("Bitte nur PDF, MD oder TXT Dateien hochladen.");
      }

      if (!extractedText || extractedText.trim() === "") {
        throw new Error("Die Datei scheint leer zu sein oder konnte nicht gelesen werden.");
      }

      const prompt = `Hier ist der nachgereichte Volltext aus der Datei "${file.name}":\n\n${extractedText}\n\nBitte beziehe diese Informationen sofort in deine laufende Analyse ein und passe deine Strategie/Antwort entsprechend an.`;
      
      const updatedHistory = [...messages, { role: "user", content: prompt }];
      setMessages(updatedHistory);
      callMegaLegal(updatedHistory, false);

    } catch (err) {
      console.error("Upload Error:", err);
      setErrorMsg(err.message || "Fehler beim Auslesen der Datei.");
      setIsLoading(false);
    }
    
    // Input zurücksetzen, damit gleiche Datei nochmal gewählt werden kann
    e.target.value = ""; 
  };
  // ------------------------------------

  const handleDraftDocument = () => {
    const draftPrompt = `Die forensische Analyse ist abgeschlossen. Verfasse jetzt bitte den finalen, versandfertigen Schriftsatz an die Behörde. Formuliere ihn juristisch präzise. 

STRIKTE REGELN FÜR DEN TEXT: 
1. Unterschreibe am Ende ZWINGEND NUR mit dem Namen des Mandanten. Erfinde KEINE Kanzlei, du agierst direkt als Mandant! 
2. Füge KEINE Platzhalter für Adressen ein (lass sie komplett weg, wenn sie nicht im System sind). 
3. Schreibe KEINE Versendungshinweise (wie 'Vorab per Fax' oder 'Einschreiben') in den Briefkopf. 
4. Schreibe KEINE Anlagen-Vermerke (wie 'Anlage: Kopien') an das Ende des Briefes.`;
    
    const updatedHistory = [...messages, { role: "user", content: draftPrompt }];
    setMessages(updatedHistory);
    callMegaLegal(updatedHistory, false);
  };

  const handleExtractAndApplyJSON = () => {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistantMsg) {
      const parsedJson = extractAndParseJSON(lastAssistantMsg.content);
      // Failsafe: Nur wenn wir schon ein sauberes JSON haben, direkt übergeben
      if (parsedJson && parsedJson.brief_entwurf) {
        parsedJson.typ = "Ausgang";
        onApplySchriftsatz(parsedJson);
        onClose();
        return; 
      }
    }
    
    // --- GEHÄRTETER TRIGGER-PROMPT FÜR INTELLIGENTE EXTRAKTION ---
    const triggerPrompt = `Erzeuge jetzt AUSSCHLIESSLICH das finale Ausgangs-JSON für das SONAR Cockpit. WICHTIG: Setze das Feld 'typ' ZWINGEND auf 'Ausgang'.

ZUSÄTZLICHE PFLICHTFELDER (Extrahiere diese zwingend aus dem ursprünglichen Volltext der Behörde, erfinde nichts!):
- "ansprechpartner": Name der zuständigen Person (z.B. Frau Müller) oder Abteilung auf Seiten der Behörde. Setze hier NICHT unseren Mandanten ein!
- "thema": Gegenstand / Betreff des Schreibens.
- "aktenzeichen": Das Aktenzeichen der Behörde.
- "gegner_fax": Die Faxnummer der Behörde/Gegenseite (falls im Text gefunden).
- "gegner_email": Die E-Mail-Adresse der Behörde/Gegenseite (falls im Text gefunden).
- "brief_entwurf": Dein generierter Antworttext.

STRIKTE JSON-FORMATIERUNGSREGELN:
1. Alle inneren Anführungszeichen im Textwert MÜSSEN zwingend als \\" maskiert (escaped) werden.
2. Alle Zeilenumbrüche im Text MÜSSEN als \\n geschrieben werden. Mache absolut keine echten, physischen Zeilenumbrüche in den JSON-Werten!
3. Keine Trailing Commas am Ende von Arrays oder Objekten.
4. Liefere absolut keinen anderen Text davor oder danach, nur das reine JSON-Objekt beginnend mit { und endend mit }.`;

    const updatedHistory = [...messages, { role: "user", content: triggerPrompt }];
    setMessages(updatedHistory);
    // HIER WIRD isFinalExport AUF TRUE GESETZT
    callMegaLegal(updatedHistory, true);
  };

  // --- HÄNDISCH ANTWORTEN OHNE KI ---
  const handleManualDraft = () => {
    const manualJson = {
      typ: "Ausgang",
      thema: dossier?.thema || "Ohne Betreff",
      aktenzeichen: dossier?.aktenzeichen || "",
      aktion: "Händische Beantwortung",
      brief_entwurf: "Hier händische Antwort formulieren..."
    };
    onApplySchriftsatz(manualJson);
    onClose();
  };

  if (!isOpen) return null;

  const bgModal = isDark ? "bg-slate-900" : "bg-slate-50";
  const borderModal = isDark ? "border-slate-700" : "border-slate-300";
  const bgHeader = isDark ? "bg-slate-950/60" : "bg-white/80";
  const borderHeader = isDark ? "border-slate-800" : "border-slate-200";
  const textTitle = isDark ? "text-white" : "text-black";
  const textSub = isDark ? "text-slate-400" : "text-black font-semibold";
  
  const bgChatArea = isDark ? "bg-slate-900" : "bg-white";
  const bgUserMsg = isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-100 border-slate-300 text-black shadow-sm font-medium";
  const bgAiMsg = isDark ? "bg-slate-950/50 border-emerald-900/50 text-slate-300" : "bg-emerald-50/50 border-emerald-300 text-black font-medium";
  
  const bgFooter = isDark ? "bg-slate-950/80" : "bg-slate-100";
  const borderFooter = isDark ? "border-slate-800" : "border-slate-300";
  
  const inputBg = isDark ? "bg-slate-700 border-slate-500 text-white placeholder-slate-300" : "bg-white border-slate-400 text-black placeholder-slate-600 font-bold";
  const closeBtnStyle = isDark ? "bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700 font-bold" : "text-black font-bold border-slate-400 hover:bg-slate-200";

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
          <button onClick={onClose} className={`${textSub} hover:opacity-70 p-2 rounded-lg transition text-xl font-bold`}>
            ✕
          </button>
        </div>

        {/* Chat / Audit Verlauf */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-6 text-sm font-sans ${bgChatArea}`}>
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={idx} className="flex flex-col w-full items-start">
                <div className={`text-xs font-bold ${textSub} mb-2 px-1 uppercase tracking-wider text-left`}>
                  {isUser ? "Mandant / Instruktion" : "Sonar MegaLegal (30-Experten Board)"}
                </div>
                <div className={`w-full text-left rounded-lg px-6 py-5 whitespace-pre-wrap leading-relaxed border ${isUser ? bgUserMsg : bgAiMsg}`}>
                  {m.content}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center space-x-3 text-emerald-600 text-sm py-4 px-2 font-bold uppercase tracking-wider text-left">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-.5s]"></div>
              <span>Mr. Veto & das Experten-Board arbeiten...</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-4 bg-rose-100 border border-rose-400 text-rose-900 rounded-lg text-sm w-full font-bold text-left">
              ⚠️ {errorMsg}
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Footer & Actions */}
        <div className={`p-4 border-t ${borderFooter} ${bgFooter} space-y-3`}>
          
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            
            {/* Dateiupload-Button direkt neben dem Input */}
            <label 
              className={`flex items-center justify-center h-[46px] w-[46px] rounded-xl cursor-pointer transition flex-shrink-0 ${isDark ? 'bg-slate-700 hover:bg-slate-600 border border-slate-500' : 'bg-white hover:bg-slate-200 border border-slate-400'}`}
              title="Fehlendes Dokument (PDF/MD) in den War-Room hochladen"
            >
              <span className="text-xl">📎</span>
              <input 
                type="file" 
                accept=".pdf,.md,.txt" 
                className="hidden" 
                onChange={handleFileUpload} 
                disabled={isLoading}
              />
            </label>

            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Instruktion an die Experten (z.B. 'Schärfer rügen', 'Fristverlängerung fordern')..."
              disabled={isLoading}
              className={`flex-1 rounded-xl px-4 h-[46px] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition disabled:opacity-50 ${inputBg}`}
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold px-6 h-[46px] rounded-xl text-sm transition disabled:opacity-50 flex-shrink-0"
            >
              Senden
            </button>
          </form>

          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`text-xs transition px-4 py-2 rounded-lg border ${closeBtnStyle}`}
            >
              Schließen (Abbrechen)
            </button>
            
            <div className="flex gap-3 flex-wrap justify-end">
              <button
                type="button"
                onClick={handleManualDraft}
                disabled={isLoading}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50 border border-slate-600"
                title="KI abbrechen und Vorgang händisch beantworten"
              >
                <span>✍️ Händisch antworten</span>
              </button>
              
              <button
                type="button"
                onClick={handleDraftDocument}
                disabled={isLoading}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50 border-none"
              >
                <span>📝 1. Schriftsatz entwerfen</span>
              </button>
              
              <button
                type="button"
                onClick={handleExtractAndApplyJSON}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50 border-none"
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