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

  // --- NEU: 2-Wege-Steuerung (Engine-Wahl & Richter-Zweitmeinung) ---
  const [selectedEngine, setSelectedEngine] = useState("gemini"); // "gemini" | "claude"
  const [enableSecondOpinion, setEnableSecondOpinion] = useState(true);
  const [loadedDocsCount, setLoadedDocsCount] = useState(0);

  const chatBottomRef = useRef(null);

  // Hilfsfunktion: Speichert den aktuellen Chatverlauf persistent in der Tabelle 'akten'
  const saveChatToDatabase = async (akteId, updatedMessages) => {
    if (!akteId || ! Array.isArray(updatedMessages)) return;
    try {
      await supabase
        .from('akten')
        .update({ war_room_chat: updatedMessages })
        .eq('id', akteId);
    } catch (e) {
      console.error("Fehler beim Speichern des War-Room-Chats:", e);
    }
  };

  // Hilfsfunktion: Lädt ALLE bisherigen Vorgänge & .md-Zwillinge der Akte als Komplett-Dossier
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
      // Falls das ganz aktuelle Dokument im Dossier-Objekt noch brandneu ist, stellen wir sicher, dass sein Text ebenfalls enthalten ist
      if (fallbackBestText && !combinedHistoryText.includes(fallbackBestText.substring(0, 100))) {
        combinedHistoryText += `\n========================================\nAKTUELLES DOKUMENT (NEU):\n${fallbackBestText}\n`;
        docsCount++;
      }
      return { fullContextText: combinedHistoryText, docsCount: Math.max(docsCount, 1) };
    }

    return { fullContextText: fallbackBestText, docsCount: 1 };
  };

  // Startet eine frische Analyse (wird beim Erststart oder bei Klick auf "Neu starten" gerufen)
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

    // --- KOMPLETTES AKTEN-GEDÄCHTNIS (ALLE VORGÄNGE & .MD-DATEIEN DER AKTE) LADEN ---
    const { fullContextText, docsCount } = await fetchFullAkteContext(dossier.akte_id, bestText);
    setLoadedDocsCount(docsCount);

    const initialUserPrompt = `Hier ist das vollständige Dokumentendossier der Akte zur sofortigen forensischen Tiefenprüfung:

Behörde / Absender: ${dossier.kontakt || "Unbekannt"}
Aktenzeichen: ${dossier.aktenzeichen || "Unbekannt"}
Frist: ${dossier.frist_extern || "Keine Frist erkannt"}
Betreff / Thema: ${dossier.thema || "Ohne Betreff"}

VOLLSTÄNDIGE AKTEN-HISTORIE & DOKUMENTENTEXTE (.MD-ZWILLINGE):
${fullContextText}

WICHTIGE KONTEXT-DATEN FÜR DEINEN FINALEN SCHRIFTSATZ:
- Heutiges Datum (für den Briefkopf): ${today}
- Unser Mandant (Absender): ${mandantFirma}
- Ansprechpartner: ${mandantAP}

STRIKTE REGEL: Du bist KEINE Rechtsanwaltskanzlei! Du schreibst den Entwurf exakt im Namen des Mandanten. Unterzeichne später am Ende AUSSCHLIESSLICH mit diesen Mandantendaten. Erfinde keine Kanzlei-Namen!

Starte Phase 1 (SCQA-Analyse) und die Mr. Veto War-Room Schleife. Was sind die Schwachstellen des Bescheids und wie schlagen wir zurück?`;

    const initialHistory = [{ role: "user", content: initialUserPrompt }];
    setMessages(initialHistory);
    if (dossier.akte_id) {
      await saveChatToDatabase(dossier.akte_id, initialHistory);
    }
    await callMegaLegal(initialHistory, false, false);
  };

  // Initialer Start beim Öffnen des Modals: Prüft zuerst, ob ein gespeicherter Chatverlauf in 'akten.war_room_chat' existiert
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

        // Falls noch kein Verlauf an der Akte gespeichert ist -> Frische Analyse starten
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

  // --- ZUSÄTZLICHER isFinalExport & useSecondOpinion PARAMETER ---
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

  // --- NEU: EXPRESS-ANTWORT (AUTO-PILOT FÜR STANDARDFÄLLE WIE IHK-BEITRAG) ---
  const handleExpressAutopilot = async (e) => {
    e?.preventDefault();
    if (!expressInput.trim() || isLoading) return;

    const stichpunkt = expressInput.trim();
    setExpressInput("");

    const expressPrompt = `EXPRESS-AUTOPILOT ANWEISUNG DES MANDANTEN: "${stichpunkt}"

Führe keinen langen Vorab-Dialog! Verfasse auf Basis dieser Anweisung und der Aktenlage SOFORT das finale, juristisch wasserdichte Antwortschreiben im Namen des Mandanten (${dossier?.unsere_firma || "Jens Wilsdorf"}) und gib es direkt als reines Ausgangs-JSON für das SONAR Cockpit zurück!

PFLICHTFELDER IM JSON:
- "typ": "Ausgang"
- "aktion": Kurze Beschreibung (z.B. "Zurückweisung Forderung / Zahlungsnachweis")
- "thema": Gegenstand / Betreff des Schreibens
- "aktenzeichen": "${dossier?.aktenzeichen || ""}"
- "kontakt": "${dossier?.kontakt || ""}"
- "ansprechpartner": Zuständige Person/Abteilung der Gegenseite
- "gegner_fax": Faxnummer der Gegenseite (falls bekannt)
- "gegner_email": E-Mail der Gegenseite (falls bekannt)
- "brief_entwurf": Der komplette, versandfertige Schriftsatz-Text (Zeilenumbrüche zwingend als \\n maskiert, keine Platzhalter, unterschrieben nur mit dem Namen des Mandanten).

Gib AUSSCHLIESSLICH das reine JSON-Objekt beginnend mit { und endend mit } zurück!`;

    const updatedHistory = [...messages, { role: "user", content: expressPrompt }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, true, false);
  };

  // --- Datei-Upload im War-Room ---
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
    
    // Input zurücksetzen, damit gleiche Datei nochmal gewählt werden kann
    e.target.value = ""; 
  };
  // ------------------------------------

  const handleDraftDocument = async () => {
    const draftPrompt = `Die forensische Analyse ist abgeschlossen. Verfasse jetzt bitte den finalen, versandfertigen Schriftsatz an die Behörde / Gegenseite. Formuliere ihn juristisch präzise. 

STRIKTE REGELN FÜR DEN TEXT: 
1. Unterschreibe am Ende ZWINGEND NUR mit dem Namen des Mandanten. Erfinde KEINE Kanzlei, du agierst direkt als Mandant! 
2. Füge KEINE Platzhalter für Adressen ein (lass sie komplett weg, wenn sie nicht im System sind). 
3. Schreibe KEINE Versendungshinweise (wie 'Vorab per Fax' oder 'Einschreiben') in den Briefkopf. 
4. Schreibe KEINE Anlagen-Vermerke (wie 'Anlage: Kopien') an das Ende des Briefes.`;
    
    const updatedHistory = [...messages, { role: "user", content: draftPrompt }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updated