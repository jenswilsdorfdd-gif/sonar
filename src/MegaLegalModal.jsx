import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// --- PDF.js Import für die clientseitige Extraktion im Modal ---
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function MegaLegalModal({ isOpen, onClose, dossier, onApplySchriftsatz }) {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [expressInput, setExpressInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhaseText, setLoadingPhaseText] = useState("Mr. Veto & das Experten-Board arbeiten...");
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDark, setIsDark] = useState(true);

  // --- 2-Wege-Steuerung (Engine-Wahl & Richter-Zweitmeinung) ---
  const [selectedEngine, setSelectedEngine] = useState("gemini");
  const [enableSecondOpinion, setEnableSecondOpinion] = useState(true);
  const [loadedDocsCount, setLoadedDocsCount] = useState(0);

  const chatBottomRef = useRef(null);

  // Speichert den aktuellen Chatverlauf persistent in der Tabelle 'akten'
  const saveChatToDatabase = async (akteId, updatedMessages) => {
    if (!akteId || !Array.isArray(updatedMessages)) return;
    try {
      await supabase
        .from('akten')
        .update({ war_room_chat: updatedMessages })
        .eq('id', akteId);
    } catch (e) {
      console.error("Fehler beim Speichern des War-Room-Chats:", e);
    }
  };

  // Lädt ALLE bisherigen Vorgänge & .md-Zwillinge der Akte als Komplett-Dossier
  const fetchFullAkteContext = async (akteId, fallbackBestText) => {
    if (!akteId) return { fullContextText: fallbackBestText, docsCount: 1 };

    let docsCount = 0;
    let combinedHistoryText = "";

    try {
      const { data: histList, error } = await supabase
        .from('akten_historie')
        .select('*')
        .eq('akte_id', akteId)
        .order('datum', { ascending: true });

      if (!error && histList && histList.length > 0) {
        for (const h of histList) {
          const hDatum = h.datum ? new Date(h.datum).toLocaleDateString('de-DE') : 'Unbekanntes Datum';
          let docTwinText = "";

          if (h.dokument_url) {
            const urls = h.dokument_url.split(',');
            for (const rawUrl of urls) {
              const cleanUrl = rawUrl.trim();
              if (!cleanUrl) continue;

              let targetMdUrl = null;
              if (cleanUrl.toLowerCase().endsWith('.md')) {
                targetMdUrl = cleanUrl;
              } else if (cleanUrl.toLowerCase().endsWith('.pdf')) {
                targetMdUrl = cleanUrl.replace(/\.[^/.]+$/, "") + ".md";
              }

              if (targetMdUrl) {
                try {
                  const res = await fetch(targetMdUrl);
                  if (res.ok) {
                    const txt = await res.text();
                    if (txt && txt.trim() !== "") {
                      docTwinText += `\n[VOLLTEXT AUS ZWILLINGS-DATEI (${targetMdUrl.split('/').pop()})]:\n${txt.trim()}\n`;
                      docsCount++;
                    }
                  }
                } catch (fetchErr) {
                  // Stilles Ignorieren, falls für eine ältere PDF noch keine .md existiert
                }
              }
            }
          }

          combinedHistoryText += `\n========================================\n`;
          combinedHistoryText += `VORGANG VOM ${hDatum} | TYP: ${h.typ || 'Vorgang'} | AKTION: ${h.aktion || '-'}\n`;
          if (h.frist_extern) combinedHistoryText += `BEHÖRDLICHE FRIST: ${h.frist_extern}\n`;
          if (h.brief_entwurf) combinedHistoryText += `ZUSAMMENFASSUNG / SCHREIBENTEXT:\n${h.brief_entwurf}\n`;
          if (docTwinText) combinedHistoryText += docTwinText;
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden des vollständigen Akten-Dossiers:", err);
    }

    if (combinedHistoryText.trim() !== "") {
      if (fallbackBestText && !combinedHistoryText.includes(fallbackBestText.substring(0, 100))) {
        combinedHistoryText += `\n========================================\nAKTUELLES DOKUMENT (NEU):\n${fallbackBestText}\n`;
        docsCount++;
      }
      return { fullContextText: combinedHistoryText, docsCount: Math.max(docsCount, 1) };
    }

    return { fullContextText: fallbackBestText, docsCount: 1 };
  };

  // Startet eine frische Analyse
  const startFreshAnalysis = async () => {
    if (!dossier) return;
    setIsLoading(true);
    setLoadingPhaseText("Lade komplettes Akten-Dossier & .md-Zwillinge...");
    setErrorMsg(null);

    const today = new Date().toLocaleDateString('de-DE');
    const mandantFirma = dossier.unsere_firma || "Jens Wilsdorf";
    const mandantAP = dossier.unser_ansprechpartner || "Jens Wilsdorf";

    let bestText = (dossier.raw_text && dossier.raw_text.trim() !== "") 
      ? dossier.raw_text 
      : (dossier.brief_entwurf || "Kein Volltext vorhanden.");

    // --- ZWILLINGS-ABRUF LOGIK (EINZEL-FALLBACK) ---
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

    const { fullContextText, docsCount } = await fetchFullAkteContext(dossier.akte_id, bestText);
    setLoadedDocsCount(docsCount);

    const initialUserPrompt = [
      "Hier ist das vollständige Dokumentendossier der Akte zur sofortigen forensischen Tiefenprüfung:",
      "",
      `Behörde / Absender: ${dossier.kontakt || "Unbekannt"}`,
      `Aktenzeichen: ${dossier.aktenzeichen || "Unbekannt"}`,
      `Frist: ${dossier.frist_extern || "Keine Frist erkannt"}`,
      `Betreff / Thema: ${dossier.thema || "Ohne Betreff"}`,
      "",
      "VOLLSTÄNDIGE AKTEN-HISTORIE & DOKUMENTENTEXTE (.MD-ZWILLINGE):",
      fullContextText,
      "",
      "WICHTIGE KONTEXT-DATEN FÜR DEINEN FINALEN SCHRIFTSATZ:",
      `- Heutiges Datum (für den Briefkopf): ${today}`,
      `- Unser Mandant (Absender): ${mandantFirma}`,
      `- Ansprechpartner: ${mandantAP}`,
      "",
      "STRIKTE REGEL: Du bist KEINE Rechtsanwaltskanzlei! Du schreibst den Entwurf exakt im Namen des Mandanten. Unterzeichne später am Ende AUSSCHLIESSLICH mit diesen Mandantendaten. Erfinde keine Kanzlei-Namen!",
      "",
      "Starte Phase 1 (SCQA-Analyse) und die Mr. Veto War-Room Schleife. Was sind die Schwachstellen des Bescheids und wie schlagen wir zurück?"
    ].join("\n");

    const initialHistory = [{ role: "user", content: initialUserPrompt }];
    setMessages(initialHistory);
    if (dossier.akte_id) {
      await saveChatToDatabase(dossier.akte_id, initialHistory);
    }
    await callMegaLegal(initialHistory, false, false);
  };

  // Initialer Start beim Öffnen des Modals
  useEffect(() => {
    const initChatOrRestoreMemory = async () => {
      if (isOpen && dossier) {
        setErrorMsg(null);
        setExpressInput("");

        if (dossier.akte_id) {
          try {
            const { data: akteRow, error } = await supabase
              .from('akten')
              .select('war_room_chat')
              .eq('id', dossier.akte_id)
              .single();

            if (!error && akteRow && Array.isArray(akteRow.war_room_chat) && akteRow.war_room_chat.length > 0) {
              setMessages(akteRow.war_room_chat);
              setLoadedDocsCount(1);
              return;
            }
          } catch (err) {
            console.error("Fehler beim Prüfen des gespeicherten War-Room-Chats:", err);
          }
        }

        await startFreshAnalysis();
      } else {
        setMessages([]);
        setErrorMsg(null);
      }
    };

    initChatOrRestoreMemory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // --- GEHÄRTETER JSON-SANITIZER ---
  const cleanJsonString = (str) => {
    if (!str) return str;
    let result = str.replace(/,\s*([}\]])/g, "$1");
    result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

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

  const callMegaLegal = async (history, isFinalExport = false, useSecondOpinion = false) => {
    setIsLoading(true);
    setErrorMsg(null);

    if (isFinalExport) {
      setLoadingPhaseText("Erzeuge versandfertiges Ausgangs-JSON für das Cockpit...");
    } else if (useSecondOpinion) {
      setLoadingPhaseText(
        `Stufe 1 (${selectedEngine === "gemini" ? "Gemini Pro" : "Claude Sonnet"}) entwirft • Stufe 2 (Richterliches Red-Team) prüft automatisch gegen...`
      );
    } else {
      setLoadingPhaseText(
        `${selectedEngine === "gemini" ? "Gemini Pro" : "Claude Sonnet"} & das 30-Experten-Board arbeiten...`
      );
    }

    try {
      const { data, error } = await supabase.functions.invoke("sonar-ai-triage", {
        body: {
          mode: "megalegal_chat",
          messages: history,
          engine: selectedEngine,
          enable_second_opinion: useSecondOpinion && !isFinalExport,
        },
      });

      if (error) throw new Error(error.message || "Fehler beim Aufruf der Edge Function.");
      if (data?.error) throw new Error(data.error);

      const reply = data?.reply || "Keine Antwort vom Board erhalten.";

      if (isFinalExport) {
        const parsedJson = extractAndParseJSON(reply);
        if (parsedJson) {
          onApplySchriftsatz(parsedJson);
          onClose(); 
          setIsLoading(false);
          return; 
        }
      }

      const newMessages = [...history, { role: "assistant", content: reply }];
      setMessages(newMessages);
      if (dossier?.akte_id) {
        await saveChatToDatabase(dossier.akte_id, newMessages);
      }
    } catch (err) {
      console.error("[MegaLegalModal Error]:", err);
      setErrorMsg(err.message || "Verbindungsfehler zu Sonar Mega Legal.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;
    const updatedHistory = [...messages, { role: "user", content: inputPrompt }];
    setMessages(updatedHistory);
    setInputPrompt("");
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, false, false);
  };

  const handleExpressAutopilot = async (e) => {
    e?.preventDefault();
    if (!expressInput.trim() || isLoading) return;

    const stichpunkt = expressInput.trim();
    setExpressInput("");

    const expressPrompt = [
      `EXPRESS-AUTOPILOT ANWEISUNG DES MANDANTEN: "${stichpunkt}"`,
      "",
      `Führe keinen langen Vorab-Dialog! Verfasse auf Basis dieser Anweisung und der Aktenlage SOFORT das finale, juristisch wasserdichte Antwortschreiben im Namen des Mandanten (${dossier?.unsere_firma || "Jens Wilsdorf"}) und gib es direkt als reines Ausgangs-JSON für das SONAR Cockpit zurück!`,
      "",
      "PFLICHTFELDER IM JSON:",
      '- "typ": "Ausgang"',
      '- "aktion": Kurze Beschreibung (z.B. "Zurückweisung Forderung / Zahlungsnachweis")',
      '- "thema": Gegenstand / Betreff des Schreibens',
      `- "aktenzeichen": "${dossier?.aktenzeichen || ""}"`,
      `- "kontakt": "${dossier?.kontakt || ""}"`,
      '- "ansprechpartner": Zuständige Person/Abteilung der Gegenseite',
      '- "gegner_fax": Faxnummer der Gegenseite (falls bekannt)',
      '- "gegner_email": E-Mail der Gegenseite (falls bekannt)',
      '- "brief_entwurf": Der komplette, versandfertige Schriftsatz-Text (Zeilenumbrüche zwingend als \\n maskiert, keine Platzhalter, unterschrieben nur mit dem Namen des Mandanten).',
      "",
      "Gib AUSSCHLIESSLICH das reine JSON-Objekt beginnend mit { und endend mit } zurück!"
    ].join("\n");

    const updatedHistory = [...messages, { role: "user", content: expressPrompt }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, true, false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingPhaseText(`Lese Datei "${file.name}" aus...`);
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
      if (dossier?.akte_id) {
        await saveChatToDatabase(dossier.akte_id, updatedHistory);
      }
      await callMegaLegal(updatedHistory, false, false);

    } catch (err) {
      console.error("Upload Error:", err);
      setErrorMsg(err.message || "Fehler beim Auslesen der Datei.");
      setIsLoading(false);
    }
    
    e.target.value = ""; 
  };

  const handleDraftDocument = async () => {
    const draftPrompt = [
      "Die forensische Analyse ist abgeschlossen. Verfasse jetzt bitte den finalen, versandfertigen Schriftsatz an die Behörde / Gegenseite. Formuliere ihn juristisch präzise.",
      "",
      "STRIKTE REGELN FÜR DEN TEXT:",
      "- Unterschreibe am Ende ZWINGEND NUR mit dem Namen des Mandanten. Erfinde KEINE Kanzlei, du agierst direkt als Mandant!",
      "- Füge KEINE Platzhalter für Adressen ein (lass sie komplett weg, wenn sie nicht im System sind).",
      "- Schreibe KEINE Versendungshinweise (wie Vorab per Fax oder Einschreiben) in den Briefkopf.",
      "- Schreibe KEINE Anlagen-Vermerke (wie Anlage: Kopien) an das Ende des Briefes."
    ].join("\n");
    
    const updatedHistory = [...messages, { role: "user", content: draftPrompt }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, false, enableSecondOpinion);
  };

  const handleExtractAndApplyJSON = async () => {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistantMsg) {
      const parsedJson = extractAndParseJSON(lastAssistantMsg.content);
      if (parsedJson && parsedJson.brief_entwurf) {
        parsedJson.typ = "Ausgang";
        onApplySchriftsatz(parsedJson);
        onClose();
        return; 
      }
    }
    
    const triggerPrompt = [
      "Erzeuge jetzt AUSSCHLIESSLICH das finale Ausgangs-JSON für das SONAR Cockpit. WICHTIG: Setze das Feld typ ZWINGEND auf Ausgang. Übernimm für brief_entwurf exakt die zuletzt geprüfte, finale Fassung des Schriftsatzes (ohne das vorangestellte Red-Team-Prüfprotokoll!).",
      "",
      "ZUSÄTZLICHE PFLICHTFELDER (Extrahiere diese zwingend aus dem ursprünglichen Volltext der Behörde, erfinde nichts!):",
      '- "ansprechpartner": Name der zuständigen Person (z.B. Frau Müller) oder Abteilung auf Seiten der Behörde. Setze hier NICHT unseren Mandanten ein!',
      '- "thema": Gegenstand / Betreff des Schreibens.',
      '- "aktenzeichen": Das Aktenzeichen der Behörde.',
      '- "gegner_fax": Die Faxnummer der Behörde/Gegenseite (falls im Text gefunden).',
      '- "gegner_email": Die E-Mail-Adresse der Behörde/Gegenseite (falls im Text gefunden).',
      '- "brief_entwurf": Dein generierter Antworttext.',
      "",
      "STRIKTE JSON-FORMATIERUNGSREGELN:",
      '- Alle inneren Anführungszeichen im Textwert MÜSSEN zwingend als \\" maskiert (escaped) werden.',
      "- Alle Zeilenumbrüche im Text MÜSSEN als \\n geschrieben werden. Mache absolut keine echten, physischen Zeilenumbrüche in den JSON-Werten!",
      "- Keine Trailing Commas am Ende von Arrays oder Objekten.",
      "- Liefere absolut keinen anderen Text davor oder danach, nur das reine JSON-Objekt beginnend mit { und endend mit }."
    ].join("\n");

    const updatedHistory = [...messages, { role: "user", content: triggerPrompt }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, true, false);
  };

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

  const handleResetChatMemory = async () => {
    if (!window.confirm("Gespeicherten War-Room-Verlauf dieser Akte löschen und Analyse mit allen aktuellen Akten-Dokumenten komplett neu starten?")) {
      return;
    }
    await startFreshAnalysis();
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
  const bgAiMsg = isDark ? "bg-slate-950/50 border-cyan-900/60 text-slate-200" : "bg-emerald-50/50 border-emerald-300 text-black font-medium";
  
  const bgFooter = isDark ? "bg-slate-950/80" : "bg-slate-100";
  const borderFooter = isDark ? "border-slate-800" : "border-slate-300";
  
  const inputBg = isDark ? "bg-slate-800 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-400 text-black placeholder-slate-600 font-bold";
  const closeBtnStyle = isDark ? "bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700 font-bold" : "text-black font-bold border-slate-400 hover:bg-slate-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`flex flex-col w-full max-w-6xl h-[92vh] ${bgModal} border ${borderModal} rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300`}>
        
        {/* Header */}
        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b ${borderHeader} ${bgHeader}`}>
          <div className="flex items-center space-x-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className={`text-lg font-bold ${textTitle} tracking-wide`}>SMARTSONAR – JURISTISCHER WAR-ROOM</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-700/50">
                  💾 Gedächtnis aktiv ({loadedDocsCount} Dok.)
                </span>
                <button 
                  onClick={() => setIsDark(!isDark)} 
                  className={`p-1.5 rounded-md border ${borderModal} hover:opacity-80 transition flex items-center justify-center bg-transparent`} 
                  title={isDark ? "In den Hell-Modus wechseln" : "In den Dunkel-Modus wechseln"}
                >
                  {isDark ? "☀️" : "🌙"}
                </button>
              </div>
              <p className={`text-xs ${textSub} mt-0.5`}>
                Akte: {dossier?.aktenzeichen || "Neu"} | Gegner: {dossier?.kontakt || "Behörde"} | Mandant: {dossier?.unsere_firma || "Jens Wilsdorf"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-900 p-0.5">
              <button
                type="button"
                onClick={() => setSelectedEngine("gemini")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  selectedEngine === "gemini"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Nutzt Google Gemini Pro direkt im Cockpit (mit Fallback auf Claude Sonnet)"
              >
                ♊ Gemini Pro
              </button>
              <button
                type="button"
                onClick={() => setSelectedEngine("claude")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  selectedEngine === "claude"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Nutzt Anthropic Claude Sonnet direkt im Cockpit"
              >
                🧠 Claude Sonnet
              </button>
            </div>

            <label
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200 cursor-pointer select-none"
              title="Wenn aktiv, prüft beim Entwurf automatisch eine zweite Richter-Instanz (Red-Team) alle Zahlen, Fristen und Paragraphen"
            >
              <input
                type="checkbox"
                checked={enableSecondOpinion}
                onChange={(e) => setEnableSecondOpinion(e.target.checked)}
                className="accent-cyan-400"
              />
              <span>⚖️ Auto-Zweitmeinung</span>
            </label>

            <button
              type="button"
              onClick={handleResetChatMemory}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-500 transition disabled:opacity-50"
              title="Gespeicherten Chatverlauf dieser Akte zurücksetzen und alle Akten-Dokumente neu einlesen"
            >
              🔄 Neu starten
            </button>

            <button onClick={onClose} className={`${textSub} hover:opacity-70 p-2 rounded-lg transition text-xl font-bold`}>
              ✕
            </button>
          </div>
        </div>

        {/* WEG 1: EXPRESS-AUTOPILOT LEISTE */}
        <div className={`px-6 py-2.5 border-b ${borderHeader} ${isDark ? "bg-cyan-950/20" : "bg-cyan-50"}`}>
          <form onSubmit={handleExpressAutopilot} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 whitespace-nowrap flex items-center gap-1">
              ⚡ Express-Erledigung:
            </span>
            <input
              type="text"
              value={expressInput}
              onChange={(e) => setExpressInput(e.target.value)}
              disabled={isLoading}
              placeholder="Kurze Anweisung für Standardfälle (z.B. '140 € wurden bereits am 12.10. überwiesen, Mahngebühr zurückweisen') -> erzeugt sofort das fertige Schreiben..."
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 transition disabled:opacity-50 ${inputBg}`}
            />
            <button
              type="submit"
              disabled={isLoading || !expressInput.trim()}
              className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold px-4 py-1.5 rounded-lg text-xs transition disabled:opacity-50 whitespace-nowrap shadow"
            >
              ⚡ Sofort-Schreiben ins Cockpit
            </button>
          </form>
        </div>

        {/* WEG 2: TIEFER JURISTEN-DIALOG */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-6 text-sm font-sans ${bgChatArea}`}>
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={idx} className="flex flex-col w-full items-start">
                <div className={`text-xs font-bold ${textSub} mb-2 px-1 uppercase tracking-wider text-left`}>
                  {isUser ? "Mandant / Instruktion" : `SmartSonar MegaLegal (${selectedEngine === "gemini" ? "Gemini Pro" : "Claude Sonnet"} & Red-Team)`}
                </div>
                <div className={`w-full text-left rounded-lg px-6 py-5 whitespace-pre-wrap leading-relaxed border ${isUser ? bgUserMsg : bgAiMsg}`}>
                  {m.content}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center space-x-3 text-cyan-400 text-sm py-4 px-2 font-bold uppercase tracking-wider text-left">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:-.5s]"></div>
              <span>{loadingPhaseText}</span>
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
              placeholder="Dialog-Instruktion an die Experten (z.B. 'Schärfer rügen', '§ 21 GmbHG prüfen', 'Fristverlängerung fordern')..."
              disabled={isLoading}
              className={`flex-1 rounded-xl px-4 h-[46px] text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition disabled:opacity-50 ${inputBg}`}
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 h-[46px] rounded-xl text-sm transition disabled:opacity-50 flex-shrink-0"
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
              Schließen (Verlauf bleibt gespeichert)
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
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50 border border-cyan-500/40"
              >
                <span>📝 1. Schriftsatz entwerfen {enableSecondOpinion ? "(+ Richter-Audit)" : ""}</span>
              </button>
              
              <button
                type="button"
                onClick={handleExtractAndApplyJSON}
                disabled={isLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50 border-none"
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