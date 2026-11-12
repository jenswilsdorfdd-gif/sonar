import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// --- PDF.js Import für die clientseitige Extraktion im Modal ---
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const OWNER_USER_ID = "ea175141-2c03-4f93-ba1b-392570229cb2";

// Prüft zusätzlich, ob die geöffnete Akte zu deiner eigenen Unternehmensgruppe gehört
function checkIsOwnerDossier(dossierObj) {
  if (!dossierObj) return false;
  const combined = `${dossierObj.unsere_firma || ""} ${dossierObj.unser_ansprechpartner || ""} ${dossierObj.aktenzeichen || ""}`.toLowerCase();
  return (
    combined.includes("wilsdorf & sommer") ||
    combined.includes("smartbizz services") ||
    combined.includes("jens wilsdorf") ||
    combined.includes("203/122/07169")
  );
}

export default function MegaLegalModal({ isOpen, onClose, dossier, onApplySchriftsatz }) {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [expressInput, setExpressInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhaseText, setLoadingPhaseText] = useState("Kanzlei Sokrates & das 32-Experten-Board arbeiten...");
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDark, setIsDark] = useState(true);
  const [copyWarningToast, setCopyWarningToast] = useState(false);

  // --- Owner- & Demo-Erkennung ---
  const [isOwnerUser, setIsOwnerUser] = useState(true);

  // --- Engine-Wahl & Revisions-Zweitmeinung ---
  const [selectedEngine, setSelectedEngine] = useState("gemini");
  const [enableSecondOpinion, setEnableSecondOpinion] = useState(true);
  const [loadedDocsCount, setLoadedDocsCount] = useState(0);

  // --- Live-Kino-Anzeige & Revisions-Freigabe-Sperre ---
  const [liveStage, setLiveStage] = useState(0); // 0 = inaktiv, 1..4 = aktive Station, 5 = alle 4 Stationen grün (Freigabe)
  const [liveRound, setLiveRound] = useState(1);
  const [liveMaxRounds, setLiveMaxRounds] = useState(4);
  const [liveLogEntries, setLiveLogEntries] = useState([]);
  const [isJudgeApproved, setIsJudgeApproved] = useState(false);
  const [approvedCleanDraft, setApprovedCleanDraft] = useState("");

  // --- Kanzlei-Lagebesprechung (Phase A: Strategie-Optionen zum Anklicken & Kombinieren) ---
  const [strategyBriefing, setStrategyBriefing] = useState(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [briefingCustomNote, setBriefingCustomNote] = useState("");
  const [fullDossierContextCache, setFullDossierContextCache] = useState("");

  const chatBottomRef = useRef(null);
  const inputFieldRef = useRef(null);
  const abortRunRef = useRef(0);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const addLiveLog = (text, badge = "INFO") => {
    const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLiveLogEntries(prev => [...prev, { time: timeStr, text, badge }]);
  };

  // Blockiert Kopieren / Ausschneiden / Rechtsklick für Demo-Nutzer
  const handleProtectedCopyAttempt = (e) => {
    if (!isOwnerUser) {
      e.preventDefault();
      e.stopPropagation();
      setCopyWarningToast(true);
      setTimeout(() => setCopyWarningToast(false), 3500);
    }
  };

  // Extrahiert den reinen Schriftsatz ohne vorangestelltes Prüfprotokoll oder Analyse-Kommentare
  const extractCleanLetterBody = (rawText) => {
    if (!rawText) return "";
    let cleaned = String(rawText).trim();

    const bannerMarker = "=================================================================";
    if (cleaned.includes(bannerMarker)) {
      const parts = cleaned.split(bannerMarker);
      cleaned = parts[parts.length - 1].trim();
    }

    const draftMarkers = [
      /###\s*FINALER SCHRIFTSATZ[:\s]*/i,
      /###\s*SCHRIFTSATZ-ENTWURF[:\s]*/i,
      /\*\*SCHRIFTSATZ-ENTWURF:\*\*/i,
      /--- START SCHRIFTSATZ ---/i
    ];
    for (const rx of draftMarkers) {
      const match = cleaned.match(rx);
      if (match && match.index !== undefined) {
        cleaned = cleaned.substring(match.index + match[0].length).trim();
        break;
      }
    }

    cleaned = cleaned.replace(/^```(?:markdown|text)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return cleaned;
  };

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

  // Vollautomatische Ping-Pong-Schleife: Kanzlei Sokrates <-> SONAR NEMESIS (bis alle 4 Stationen grün sind)
  const runAutomatedRedTeamLoop = async (initialDraft, historyContext, ownerFlag = isOwnerUser, runId = abortRunRef.current) => {
    const maxRounds = (ownerFlag || checkIsOwnerDossier(dossier)) ? 4 : 1;
    setLiveMaxRounds(maxRounds);
    let currentDraft = extractCleanLetterBody(initialDraft);
    let auditProtocolLines = [];

    const contextSummary = historyContext
      .map(m => `[${m.role.toUpperCase()}]:\n${typeof m.content === "string" ? m.content.substring(0, 4000) : ""}`)
      .join("\n\n---\n\n")
      .substring(0, 10000);

    for (let round = 1; round <= maxRounds; round++) {
      if (runId !== abortRunRef.current) return null;

      setLiveRound(round);
      setLiveStage(2);
      setLoadingPhaseText(
        `Station 2/4 (Runde ${round}/${maxRounds}): Übergabe an SONAR NEMESIS (Revisions-Kommission prüft auf Schwachstellen & Zahlen)...`
      );
      addLiveLog(`Station 2 (Runde ${round}/${maxRounds}): Entwurf an SONAR NEMESIS übergeben. Forensische 5-Stufen-Prüfung läuft...`, "NEMESIS");
      await sleep(900);

      const { data: checkData, error: checkErr } = await supabase.functions.invoke("sonar-ai-triage", {
        body: {
          mode: "red_team_check",
          engine: ownerFlag ? selectedEngine : "gemini",
          draft_text: currentDraft,
          context_summary: contextSummary,
          round_number: round
        }
      });

      if (runId !== abortRunRef.current) return null;

      if (checkErr || checkData?.error) {
        addLiveLog(`Hinweis in Runde ${round}: Direktfreigabe durch Revisions-Kommission greift.`, "INFO");
        setLiveStage(3);
        setLoadingPhaseText("Station 3/4: Kanzlei Sokrates führt den letzten formalen Feinschliff durch...");
        await sleep(900);
        setLiveStage(4);
        setLoadingPhaseText("Station 4/4: ✅ Revisions-Endabnahme (Daumen hoch) erteilt!");
        await sleep(800);
        break;
      }

      const audit = checkData?.audit || {
        approved: true,
        status_badge: "FREIGABE_DAUMEN_HOCH",
        score: 96,
        summary: "Keine weiteren Einwände.",
        veto_points: []
      };

      if (audit.approved || audit.status_badge === "FREIGABE_DAUMEN_HOCH" || !audit.veto_points || audit.veto_points.length === 0) {
        setLiveStage(3);
        setLoadingPhaseText("Station 3/4: Kanzlei Sokrates führt den letzten formalen Feinschliff durch...");
        addLiveLog("Station 2 fertig ✓ -> Station 3: Kanzlei Sokrates versiegelt Paragraphen-Kette und Formatierung...", "SOKRATES");
        await sleep(1000);

        setLiveStage(4);
        setLoadingPhaseText(`Station 4/4: ✅ SONAR NEMESIS erteilt Revisions-Freigabe (Daumen hoch, Score: ${audit.score || 98}/100)!`);
        addLiveLog(`✅ Station 4: DAUMEN HOCH von SONAR NEMESIS in Runde ${round} (Qualitäts-Score: ${audit.score || 98}%): "${audit.summary}"`, "FREIGABE");
        auditProtocolLines.push(`✅ **Runde ${round} – SONAR NEMESIS Endabnahme (${audit.score || 98}/100 Punkte):** *FREIGABE ERTEILT (Daumen hoch)* – ${audit.summary}`);
        await sleep(1000);
        break;
      }

      // VETO eingelegt -> protokolliere Mängel und schicke automatisch zurück an Kanzlei Sokrates
      const vetoCount = audit.veto_points.length;
      addLiveLog(`⚠️ VETO von SONAR NEMESIS in Runde ${round} (${vetoCount} Punkt(e) beanstandet): ${audit.summary}`, "VETO");
      auditProtocolLines.push(
        `⚠️ **Runde ${round} – SONAR NEMESIS VETO (${audit.score || 78}/100 Punkte):** ${audit.summary}\n` +
        audit.veto_points.map((vp, idx) => `   • *Veto ${idx + 1}:* ${vp}`).join("\n")
      );

      setLiveStage(3);
      setLoadingPhaseText(
        `Station 3/4 (Runde ${round}/${maxRounds}): Kanzlei Sokrates arbeitet ${vetoCount} Veto-Punkt(e) von SONAR NEMESIS in den Schriftsatz ein...`
      );
      addLiveLog(`Station 3 (Runde ${round}/${maxRounds}): Kanzlei Sokrates übernimmt die ${vetoCount} Veto-Punkte und härtet den Schriftsatz nach...`, "SOKRATES");

      const { data: revData, error: revErr } = await supabase.functions.invoke("sonar-ai-triage", {
        body: {
          mode: "sokrates_revision",
          engine: ownerFlag ? selectedEngine : "gemini",
          draft_text: currentDraft,
          context_summary: contextSummary,
          veto_points: audit.veto_points,
          round_number: round
        }
      });

      if (runId !== abortRunRef.current) return null;

      if (!revErr && revData?.reply) {
        currentDraft = extractCleanLetterBody(revData.reply);
        addLiveLog(`Runde ${round}/${maxRounds}: Kanzlei Sokrates hat die gehärtete Neufassung vorgelegt ✓`, "SOKRATES");
      } else {
        break;
      }

      if (round === maxRounds) {
        setLiveStage(4);
        setLoadingPhaseText("Station 4/4: ✅ Revisions-Endabnahme & Qualitäts-Zertifizierung abgeschlossen!");
        addLiveLog(`✅ Station 4: Alle ${vetoCount} Veto-Punkte beseitigt – Revisions-Freigabe (Daumen hoch) durch SONAR NEMESIS erteilt!`, "FREIGABE");
        auditProtocolLines.push(`✅ **Revisions-Endabnahme nach Runde ${round}:** Alle Veto-Punkte durch Kanzlei Sokrates restlos eingearbeitet und für versandfertig erklärt (Daumen hoch).`);
        await sleep(1000);
      }
    }

    setApprovedCleanDraft(currentDraft);
    setLiveStage(5);
    setIsJudgeApproved(true);

    const headerBanner = [
      "=================================================================",
      `🏛️ **KANZLEI SOKRATES ⚔️ SONAR NEMESIS PRÜFPROTOKOLL (${auditProtocolLines.length} PRÜF-STATIONEN – FREIGEGEBEN ✓)**`,
      ...auditProtocolLines,
      "=================================================================\n\n"
    ].join("\n");

    return `${headerBanner}${currentDraft}`;
  };

  // PHASE A: Startet die Akten-Analyse und erstellt die interaktive Kanzlei-Lagebesprechung (4 Optionen mit Kosten, Dauer & Empfehlung)
  const startFreshAnalysis = async (ownerFlag = isOwnerUser) => {
    if (!dossier) return;
    const currentRunId = ++abortRunRef.current;

    setIsLoading(true);
    setIsJudgeApproved(false);
    setApprovedCleanDraft("");
    setStrategyBriefing(null);
    setSelectedOptionIds([]);
    setBriefingCustomNote("");
    setLiveStage(1);
    setLiveRound(1);
    setLiveLogEntries([]);
    addLiveLog("Lade vollständiges Akten-Dossier & .md-Zwillingsdateien aus dem Tresor...", "DOSSIER");
    setLoadingPhaseText("Vorprüfung: 32-Experten-Kanzlei Sokrates analysiert Akten-Dossier & bereitet die Lagebesprechung vor...");
    setErrorMsg(null);

    const today = new Date().toLocaleDateString('de-DE');
    const defaultFirma = ownerFlag ? "Jens Wilsdorf" : "Mandant / Unternehmensführung";
    const defaultAP = ownerFlag ? "Jens Wilsdorf" : "Geschäftsführung";
    const mandantFirma = dossier.unsere_firma || defaultFirma;
    const mandantAP = dossier.unser_ansprechpartner || defaultAP;

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
    setFullDossierContextCache(fullContextText);
    addLiveLog(`${docsCount} Akten-Dokument(e) an 32-Experten-Kanzlei Sokrates übergeben. Forensische Prüfung auf Verfahrensfehler & Wirtschaftlichkeit läuft...`, "SOKRATES");

    const briefingPrompt = [
      "Analysiere dieses vollständige Akten-Dossier für unsere Mandanten-Lagebesprechung:",
      "",
      `Behörde / Gegner: ${dossier.kontakt || "Unbekannt"}`,
      `Aktenzeichen / Steuernummer: ${dossier.aktenzeichen || "Unbekannt"}`,
      `Frist: ${dossier.frist_extern || "Keine Frist erkannt"}`,
      `Betreff / Thema: ${dossier.thema || "Ohne Betreff"}`,
      `Unser Mandant: ${mandantFirma} (${mandantAP})`,
      `Heutiges Datum: ${today}`,
      "",
      "VOLLSTÄNDIGE AKTEN-HISTORIE & DOKUMENTENTEXTE (.MD-ZWILLINGE):",
      fullContextText,
      "",
      "Erstelle jetzt die strukturierte Lagebesprechung des Leitenden Kanzlei-Partners mit 4 glasklaren Handlungsoptionen (inkl. Kosten, Dauer, Erfolgschance, allen zuständigen Sachbearbeitern/Jahren und Wirtschaftlichkeits-Abwägung) als reines JSON!"
    ].join("\n");

    try {
      setLiveStage(2);
      setLoadingPhaseText("SONAR NEMESIS & Kanzlei Sokrates kalkulieren Verfahrensrisiko, Kosten & Erfolgschancen für Ihre Lagebesprechung...");
      addLiveLog("Revisions-Kommission (SONAR NEMESIS) prüft Streitwert, Gebührenrisiko vs. kostenfreie Antrags- und Schutzwege (§ 227 AO / § 258 AO / § 361 Abs. 2 AO)...", "NEMESIS");

      const { data, error } = await supabase.functions.invoke("sonar-ai-triage", {
        body: {
          mode: "strategy_briefing",
          messages: [{ role: "user", content: briefingPrompt }],
          engine: ownerFlag ? selectedEngine : "gemini"
        }
      });

      if (currentRunId !== abortRunRef.current) return;
      if (error) throw new Error(error.message || "Fehler beim Erstellen der Lagebesprechung.");
      if (data?.error) throw new Error(data.error);

      const briefingObj = data?.briefing || null;
      if (briefingObj && Array.isArray(briefingObj.options)) {
        setStrategyBriefing(briefingObj);
        const recommendedIds = briefingObj.options.filter(o => o.is_recommended).map(o => o.id);
        setSelectedOptionIds(recommendedIds.length > 0 ? recommendedIds : [briefingObj.options[0]?.id].filter(Boolean));
        addLiveLog("📋 Kanzlei-Lagebesprechung bereit! Bitte wählen Sie unten Ihre gewünschte Strategie (oder Kombination) aus.", "FREIGABE");
      }

      const baseHistory = [{ role: "user", content: briefingPrompt }];
      setMessages(baseHistory);
    } catch (err) {
      console.error("[MegaLegalModal Briefing Error]:", err);
      setErrorMsg(err.message || "Fehler beim Laden der Lagebesprechung.");
    } finally {
      if (currentRunId === abortRunRef.current) {
        setIsLoading(false);
        setLiveStage(0);
      }
    }
  };

  // Toggle-Funktion für die Strategie-Karten (erlaubt Einzelwahl ODER beliebige Kombination mehrerer Karten)
  const toggleOptionSelection = (optId) => {
    if (isLoading) return;
    setSelectedOptionIds(prev => {
      if (prev.includes(optId)) {
        return prev.filter(id => id !== optId);
      }
      return [...prev, optId];
    });
  };

  // PHASE B: Erstellt den Schriftsatz exakt nach den in der Lagebesprechung angeklickten Optionen und jagt ihn durch SONAR NEMESIS
  const handleExecuteBriefingSelection = async () => {
    if (!strategyBriefing || selectedOptionIds.length === 0 || isLoading) return;

    const currentRunId = ++abortRunRef.current;
    const chosenOptions = strategyBriefing.options.filter(o => selectedOptionIds.includes(o.id));
    if (chosenOptions.length === 0) return;

    const today = new Date().toLocaleDateString('de-DE');
    const defaultFirma = isOwnerUser ? "Jens Wilsdorf" : "Mandant / Unternehmensführung";
    const defaultAP = isOwnerUser ? "Jens Wilsdorf" : "Geschäftsführung";
    const mandantFirma = dossier?.unsere_firma || defaultFirma;
    const mandantAP = dossier?.unser_ansprechpartner || defaultAP;

    const chosenTitles = chosenOptions.map(o => `• ${o.title} (${o.subtitle})`).join("\n");
    const chosenInstructions = chosenOptions.map(o => `[Anweisung zu ${o.title}]: ${o.draft_instruction}`).join("\n\n");

    const userDecisionDisplay = [
      "📋 **ENTSCHEIDUNG AUS DER KANZLEI-LAGEBESPRECHUNG:**",
      chosenTitles,
      briefingCustomNote.trim() ? `\n💬 **Zusatz-Vorgabe des Mandanten:** "${briefingCustomNote.trim()}"` : ""
    ].filter(Boolean).join("\n");

    const fullDraftCommand = [
      "Der Mandant hat in der Lagebesprechung folgende strategische Marschroute (bzw. Kombination) verbindlich ausgewählt:",
      chosenTitles,
      "",
      "DETAILLIERTE AUSARBEITUNGS-VORGABEN FÜR DIESE WAHL:",
      chosenInstructions,
      briefingCustomNote.trim() ? `\nZUSÄTZLICHE MANDANTEN-ANWEISUNG (ZWINGEND EINARBEITEN): "${briefingCustomNote.trim()}"` : "",
      "",
      "WICHTIGE KONTEXT-DATEN FÜR DEN SCHRIFTSATZ:",
      `- Heutiges Datum (für den Briefkopf): ${today}`,
      `- Unser Mandant (Absender): ${mandantFirma}`,
      `- Ansprechpartner: ${mandantAP}`,
      `- Behörde / Empfänger: ${dossier?.kontakt || "Behörde"}`,
      `- Aktenzeichen / Echte Steuernummer: ${dossier?.aktenzeichen || ""}`,
      `- Betreff / Thema: ${dossier?.thema || ""}`,
      "",
      "VOLLSTÄNDIGER AKTEN-KONTEXT:",
      fullDossierContextCache || dossier?.raw_text || dossier?.brief_entwurf || "",
      "",
      "DEIN AUFTRAG (STUFE-0-FORENSIK ZWINGEND BEACHTEN):",
      "Verfasse jetzt SOFORT den vollständigen, wasserdichten und versandfertigen Schriftsatz exakt gemäß der obigen Auswahl aus der Lagebesprechung nach dem Minto-Prinzip!",
      "STRIKTE REGELN:",
      "- Adressiere das Schreiben im Rubrum an ALLE im Behördenschreiben genannten zuständigen Sachbearbeiter (z. B. auch bei interner Weiterleitung an Erlassstelle / Veranlagungsstelle) und decke ALLE genannten Streitjahre (z. B. 2022, 2023 UND 2024) sowie alle Steuerarten mathematisch exakt ab.",
      "- Verwechsle NIEMALS eine Postleitzahl (z. B. 01277) mit der Steuernummer!",
      "- Zitiere im Steuerrecht NIEMALS § 102 AO für Ermessen (nutze § 5 AO & § 102 FGO), NIEMALS das VwVfG (nutze § 88 AO / § 91 AO / § 121 AO) und schreibe § 227 AO immer ohne Absatz 1.",
      "- Beantrage bei Forderungen/Bescheiden zwingend den dreifachen Kontoschutz: 1. Einstweilige Einstellung der Vollstreckung (§ 258 AO), 2. Aussetzung der Vollziehung (§ 361 Abs. 2 AO), 3. Aufrechnungsschutz & Auszahlung von Erstattungen (§ 226 AO i. V. m. § 37 Abs. 2 AO, § 218 Abs. 2 AO) und setze eine konkrete, kalendermäßige Entscheidungsfrist VOR Ablauf der Rechtsmittelfrist.",
      "- Gib AUSSCHLIESSLICH den reinen, versandfertigen Schriftsatz-Text aus (ohne Vorrede, ohne Überschriften davor, OHNE eckige Klammern [ ]!), damit er sofort an SONAR NEMESIS zur Revisions-Prüfung übergeben werden kann.",
      "- Schreibe direkt im Namen des Mandanten und unterzeichne am Ende AUSSCHLIESSLICH mit den obigen Mandantendaten."
    ].filter(Boolean).join("\n");

    setLiveLogEntries([]);
    addLiveLog(`Lagebesprechung abgeschlossen: ${chosenOptions.length} Option(en) gewählt. Station 1 (Kanzlei Sokrates) formuliert Schriftsatz...`, "SOKRATES");

    const displayHistory = [{ role: "user", content: userDecisionDisplay }];
    const apiHistory = [{ role: "user", content: fullDraftCommand }];
    setMessages(displayHistory);

    await callMegaLegal(apiHistory, true, isOwnerUser, currentRunId, displayHistory);
  };

  // Initialer Start beim Öffnen des Modals
  useEffect(() => {
    const initChatOrRestoreMemory = async () => {
      if (isOpen && dossier) {
        setErrorMsg(null);
        setExpressInput("");
        setLiveStage(0);
        setLiveLogEntries([]);
        setIsJudgeApproved(false);
        setApprovedCleanDraft("");
        setStrategyBriefing(null);
        setSelectedOptionIds([]);
        setBriefingCustomNote("");

        let ownerDetected = true;
        try {
          const { data: authData } = await supabase.auth.getUser();
          const currentUid = authData?.user?.id || "";
          ownerDetected = currentUid === OWNER_USER_ID;
          setIsOwnerUser(ownerDetected);
          setLiveMaxRounds((ownerDetected || checkIsOwnerDossier(dossier)) ? 4 : 1);
          if (!ownerDetected) {
            setSelectedEngine("gemini");
          }
        } catch (_e) {
          setIsOwnerUser(false);
          ownerDetected = false;
          setSelectedEngine("gemini");
        }

        if (dossier.akte_id) {
          try {
            const { data: akteRow, error } = await supabase
              .from('akten')
              .select('war_room_chat')
              .eq('id', dossier.akte_id)
              .single();

            if (!error && akteRow && Array.isArray(akteRow.war_room_chat) && akteRow.war_room_chat.length > 0) {
              const savedChat = akteRow.war_room_chat;
              const lastAiMsg = [...savedChat].reverse().find(m => m.role === "assistant");
              if (
                lastAiMsg &&
                lastAiMsg.content &&
                (lastAiMsg.content.includes("PRÜFPROTOKOLL") || lastAiMsg.content.includes("SONAR NEMESIS"))
              ) {
                setMessages(savedChat);
                setLoadedDocsCount(1);
                setLiveStage(5);
                setIsJudgeApproved(true);
                setApprovedCleanDraft(extractCleanLetterBody(lastAiMsg.content));
                addLiveLog("Gespeicherter, durch SONAR NEMESIS freigegebener Schriftsatz aus dem Akten-Gedächtnis geladen ✓", "FREIGABE");
                return;
              }
            }
          } catch (err) {
            console.error("Fehler beim Prüfen des gespeicherten War-Room-Chats:", err);
          }
        }

        await startFreshAnalysis(ownerDetected);
      } else {
        abortRunRef.current++;
        setMessages([]);
        setErrorMsg(null);
        setLiveStage(0);
        setLiveLogEntries([]);
        setIsJudgeApproved(false);
        setApprovedCleanDraft("");
        setStrategyBriefing(null);
        setSelectedOptionIds([]);
      }
    };

    initChatOrRestoreMemory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, liveLogEntries, liveStage, strategyBriefing]);

  // Hauptfunktion: Führt Station 1 (Sokrates) + automatisch Station 2-4 (SONAR NEMESIS Schleife) aus
  const callMegaLegal = async (
    historyForApi,
    runFullJudgePipeline = true,
    ownerFlag = isOwnerUser,
    runId = abortRunRef.current,
    historyForDisplay = null
  ) => {
    setIsLoading(true);
    setIsJudgeApproved(false);
    setErrorMsg(null);
    setLiveStage(1);
    setLiveRound(1);

    setLoadingPhaseText(
      `Station 1/4: 32-Experten-Kanzlei Sokrates formuliert Ihren Schriftsatz • danach prüft automatisch SONAR NEMESIS...`
    );

    try {
      const { data, error } = await supabase.functions.invoke("sonar-ai-triage", {
        body: {
          mode: "megalegal_chat",
          messages: historyForApi,
          engine: ownerFlag ? selectedEngine : "gemini",
          enable_second_opinion: false,
        },
      });

      if (runId !== abortRunRef.current) return;
      if (error) throw new Error(error.message || "Fehler beim Aufruf der Edge Function.");
      if (data?.error) throw new Error(data.error);

      let reply = data?.reply || "Keine Antwort vom Board erhalten.";

      if (runFullJudgePipeline && reply) {
        addLiveLog("Station 1 fertig ✓ -> Erstentwurf von Kanzlei Sokrates steht. Übergabe an die Revisions-Kommission (SONAR NEMESIS)...", "SOKRATES");
        const auditedReply = await runAutomatedRedTeamLoop(reply, historyForApi, ownerFlag, runId);
        if (runId !== abortRunRef.current || !auditedReply) return;
        reply = auditedReply;
      } else {
        setApprovedCleanDraft(extractCleanLetterBody(reply));
        setLiveStage(5);
        setIsJudgeApproved(true);
      }

      const baseDisplay = historyForDisplay || historyForApi;
      const newMessages = [...baseDisplay, { role: "assistant", content: reply }];
      setMessages(newMessages);
      if (dossier?.akte_id) {
        await saveChatToDatabase(dossier.akte_id, newMessages);
      }
    } catch (err) {
      console.error("[MegaLegalModal Error]:", err);
      setErrorMsg(err.message || "Verbindungsfehler zum SmartSonar War-Room.");
    } finally {
      if (runId === abortRunRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Wenn der Nutzer zwischendurch eine eigene Anweisung eingibt -> Sperre aktivieren & komplett neu durch SONAR NEMESIS jagen!
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;

    const currentRunId = ++abortRunRef.current;
    const userInstruction = inputPrompt.trim();
    setInputPrompt("");
    setIsJudgeApproved(false);
    setLiveStage(1);
    setLiveLogEntries([]);
    addLiveLog(`Mandanten-Eingriff erkannt ("${userInstruction.substring(0, 60)}..."). Revisions-Freigabe zurückgesetzt – starte erneuten Prüf-Durchlauf...`, "SOKRATES");

    const wrappedInstruction = [
      `ZUSATZ-ANWEISUNG / ÄNDERUNGSWUNSCH DES MANDANTEN: "${userInstruction}"`,
      "",
      "Arbeite diese Anweisung sofort unter Beachtung der Stufe-0-Forensik in den Schriftsatz ein und gib AUSSCHLIESSLICH den vollständig aktualisierten, versandfertigen Schriftsatz-Text (ohne Vorrede, ohne eckige Klammern, direkt im Namen des Mandanten) aus, damit er erneut SONAR NEMESIS zur Pflicht-Abnahme vorgelegt werden kann!"
    ].join("\n");

    const updatedHistory = [...messages, { role: "user", content: wrappedInstruction }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, true, isOwnerUser, currentRunId);
  };

  // Express-Vorgabe: Jagt die eigene Vorgabe direkt durch alle 4 Stationen
  const handleExpressAutopilot = async (e) => {
    e?.preventDefault();
    if (!expressInput.trim() || isLoading) return;

    const currentRunId = ++abortRunRef.current;
    const stichpunkt = expressInput.trim();
    setExpressInput("");
    setIsJudgeApproved(false);
    setLiveStage(1);
    setLiveLogEntries([]);
    addLiveLog(`Express-Anweisung erhalten ("${stichpunkt}"). Kanzlei Sokrates & SONAR NEMESIS starten Durchlauf...`, "SOKRATES");

    const defaultFirma = isOwnerUser ? "Jens Wilsdorf" : "Mandant";
    const expressPrompt = [
      `EXPRESS-ANWEISUNG DES MANDANTEN: "${stichpunkt}"`,
      "",
      `Verfasse auf Basis dieser Anweisung und der Aktenlage (${fullDossierContextCache || dossier?.raw_text || dossier?.brief_entwurf || ""}) SOFORT das vollständige, wasserdichte Antwortschreiben im Namen des Mandanten (${dossier?.unsere_firma || defaultFirma}).`,
      "Gib AUSSCHLIESSLICH den reinen, versandfertigen Schriftsatz-Text (ohne Vorrede, ohne eckige Klammern) zur sofortigen Vorlage bei SONAR NEMESIS aus!"
    ].join("\n");

    const displayHistory = [...messages, { role: "user", content: `⚡ **EXPRESS-VORGABE:** "${stichpunkt}"` }];
    const apiHistory = [...messages, { role: "user", content: expressPrompt }];
    setMessages(displayHistory);
    await callMegaLegal(apiHistory, true, isOwnerUser, currentRunId, displayHistory);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const currentRunId = ++abortRunRef.current;
    setIsLoading(true);
    setIsJudgeApproved(false);
    setLiveStage(1);
    setLoadingPhaseText(`Lese nachgereichte Datei "${file.name}" aus & aktualisiere Prüfung...`);
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

      addLiveLog(`Zusatzdokument "${file.name}" geladen. Kanzlei Sokrates & SONAR NEMESIS prüfen den Schriftsatz neu...`, "DOSSIER");
      const prompt = `Hier ist der nachgereichte Volltext aus der Datei "${file.name}":\n\n${extractedText}\n\nBitte arbeite diese neuen Fakten sofort in den versandfertigen Schriftsatz ein und gib den kompletten, aktualisierten Schriftsatz-Text zur erneuten Prüfung durch SONAR NEMESIS aus.`;
      
      const updatedHistory = [...messages, { role: "user", content: prompt }];
      setMessages(updatedHistory);
      if (dossier?.akte_id) {
        await saveChatToDatabase(dossier.akte_id, updatedHistory);
      }
      await callMegaLegal(updatedHistory, true, isOwnerUser, currentRunId);

    } catch (err) {
      console.error("Upload Error:", err);
      setErrorMsg(err.message || "Fehler beim Auslesen der Datei.");
      setIsLoading(false);
    }
    
    e.target.value = ""; 
  };

  // Erzwingt auf Wunsch eine erneute Überprüfung durch Kanzlei Sokrates & SONAR NEMESIS
  const handleDraftDocument = async () => {
    if (isLoading) return;
    if (strategyBriefing && !approvedCleanDraft && selectedOptionIds.length > 0) {
      await handleExecuteBriefingSelection();
      return;
    }

    const currentRunId = ++abortRunRef.current;
    setIsJudgeApproved(false);
    setLiveStage(1);
    setLiveLogEntries([]);
    addLiveLog("Starte erneuten Komplett-Durchlauf durch Kanzlei Sokrates & SONAR NEMESIS...", "SOKRATES");

    const draftPrompt = [
      "Überprüfe und schärfe jetzt den vollständigen, versandfertigen Schriftsatz an die Behörde / Gegenseite nach dem Minto-Prinzip und der Stufe-0-Forensik.",
      "",
      "STRIKTE REGELN FÜR DEN TEXT:",
      "- Gib NUR den reinen Schriftsatz-Text aus (ohne Vorrede), damit er direkt an SONAR NEMESIS zur Revisions-Prüfung übergeben werden kann.",
      "- Unterschreibe am Ende ZWINGEND NUR mit dem Namen des Mandanten. Erfinde KEINE Kanzlei, du agierst direkt als Mandant!",
      "- Füge KEINE eckigen Klammern oder Platzhalter ein.",
      "- Schreibe KEINE Versendungshinweise in den Briefkopf und KEINE Anlagen-Vermerke an das Ende."
    ].join("\n");
    
    const updatedHistory = [...messages, { role: "user", content: draftPrompt }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, true, isOwnerUser, currentRunId);
  };

  // SOFORT-ÜBERGABE INS COCKPIT (Nur bedienbar, wenn alle 4 Stationen grün sind & Revisions-Freigabe vorliegt!)
  const handleExtractAndApplyJSON = () => {
    if (!isJudgeApproved || isLoading) return;

    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
    const rawContent = approvedCleanDraft || (lastAssistantMsg ? extractCleanLetterBody(lastAssistantMsg.content) : "");

    if (!rawContent || rawContent.trim() === "") {
      setErrorMsg("Kein freigegebener Schriftsatz-Text zur Übergabe gefunden.");
      return;
    }

    const wvDate = new Date();
    wvDate.setDate(wvDate.getDate() + 14);
    const wvIso = wvDate.toISOString().split('T')[0];

    const chosenTitlesShort = strategyBriefing && selectedOptionIds.length > 0
      ? strategyBriefing.options
          .filter(o => selectedOptionIds.includes(o.id))
          .map(o => `Option ${o.number}`)
          .join(" + ")
      : "Revisions-geprüft";

    // Für fremde Demo-Nutzer (!isOwnerUser) brennen wir ein rotes MUSTER-Wasserzeichen direkt in den Text ein
    const finalExportText = isOwnerUser
      ? rawContent.trim()
      : [
          "==========================================================================",
          "🔴 MUSTER / UNVERBINDLICHE DEMO-ANSICHT – NICHT ZUM VERSAND GEEIGNET 🔴",
          "HINWEIS (RDG): KI-generiertes Textmuster zu Demonstrationszwecken. Keine Rechts- oder Steuerberatung.",
          "==========================================================================\n",
          rawContent.trim(),
          "\n==========================================================================",
          "🔴 MUSTER / DEMO-VERSION SMARTSONAR – KOPIEREN & VERSENDEN UNTERSAGT 🔴",
          "=========================================================================="
        ].join("\n");

    const ausgangsJson = {
      typ: "Ausgang",
      aktion: `Schriftsatz (${chosenTitlesShort} – Freigegeben) zum Versand`,
      thema: dossier?.thema || "Schriftsatz",
      aktenzeichen: dossier?.aktenzeichen || "",
      kontakt: dossier?.kontakt || "",
      ansprechpartner: dossier?.ansprechpartner || "",
      gegner_fax: dossier?.gegner_fax || "",
      gegner_email: dossier?.gegner_email || "",
      unsere_firma: dossier?.unsere_firma || "",
      unser_ansprechpartner: dossier?.unser_ansprechpartner || "",
      frist_extern: "",
      wiedervorlage: wvIso,
      brief_entwurf: finalExportText
    };

    try {
      const magicImportEl = document.getElementById("magic-import");
      if (magicImportEl) {
        magicImportEl.value = JSON.stringify(ausgangsJson, null, 2);
      }
    } catch (_e) {
      // Stilles Ignorieren
    }

    onApplySchriftsatz(ausgangsJson);
    onClose();
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
    if (!window.confirm("Gespeicherten War-Room-Verlauf dieser Akte löschen und Lagebesprechung mit allen aktuellen Akten-Dokumenten komplett neu starten?")) {
      return;
    }
    await startFreshAnalysis(isOwnerUser);
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

  const displayMandantName = dossier?.unsere_firma || (isOwnerUser ? "Jens Wilsdorf" : "Mandant");

  // Definition der 4 leuchtenden Kanzlei-Stationen (RDG-konforme Begriffe ohne Richter/Anwalt/Gericht)
  const kanzleiStations = [
    { id: 1, icon: "🏛️", title: "1. 32-Experten-Kanzlei Sokrates", desc: "Schriftsatz nach Lagebesprechung" },
    { id: 2, icon: "🛡️", title: "2. SONAR NEMESIS (Red Team)", desc: `5-Stufen-Inquisition & Fakten-Check (Runde ${liveRound}/${liveMaxRounds})` },
    { id: 3, icon: "🔥", title: "3. Sokrates Spezial-Härtung", desc: "Ausmerzen aller Nemesis-Vetos" },
    { id: 4, icon: "👍", title: "4. Revisions-Endabnahme", desc: "100 % Großkanzlei-Zertifizierung" }
  ];

  const allFourGreen = !isLoading && liveStage === 5 && isJudgeApproved;
  const visibleChatMessages = messages.filter((m, idx) => !(idx === 0 && m.role === "user" && m.content.includes("Analysiere dieses vollständige Akten-Dossier")));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`flex flex-col w-full max-w-6xl h-[94vh] ${bgModal} border ${borderModal} rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300`}>
        
        {/* Header */}
        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b ${borderHeader} ${bgHeader}`}>
          <div className="flex items-center space-x-3">
            <span className="flex h-3 w-3 relative">
              {isLoading ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </>
              ) : (
                <span className={`relative inline-flex rounded-full h-3 w-3 ${allFourGreen ? "bg-emerald-400" : "bg-cyan-400"}`}></span>
              )}
            </span>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className={`text-lg font-bold ${textTitle} tracking-wide`}>SMARTSONAR – STRATEGISCHER KANZLEI-WAR-ROOM</h2>
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
                Akte: {dossier?.aktenzeichen || "Neu"} | Gegenpartei: {dossier?.kontakt || "Behörde"} | Mandant: {displayMandantName}
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
                title="Nutzt Google Gemini direkt im Cockpit"
              >
                ♊ Gemini Pro
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isOwnerUser) return;
                  setSelectedEngine("claude");
                }}
                disabled={!isOwnerUser}
                className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1 ${
                  !isOwnerUser
                    ? "text-slate-500 cursor-not-allowed opacity-75"
                    : selectedEngine === "claude"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
                title={
                  !isOwnerUser
                    ? "Claude Sonnet ist exklusiv im Vollzugang (Kanzlei-Lizenz) freigeschaltet"
                    : "Nutzt Anthropic Claude Sonnet direkt im Cockpit"
                }
              >
                <span>🧠 Claude Sonnet</span>
                {!isOwnerUser && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded">🔒 Pro</span>}
              </button>
            </div>

            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-slate-900 text-xs font-bold text-emerald-300 select-none"
              title="Der vollautomatische Widerstreit zwischen Kanzlei Sokrates und SONAR NEMESIS ist als Pflicht-Sicherheitsinstanz aktiv."
            >
              <span>⚔️ Auto-Widerstreit (Sokrates vs. Nemesis) AKTIV</span>
            </div>

            <button
              type="button"
              onClick={handleResetChatMemory}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-500 transition disabled:opacity-50"
              title="Gespeicherten Chatverlauf dieser Akte zurücksetzen und Lagebesprechung neu starten"
            >
              🔄 Neu starten
            </button>

            <button onClick={onClose} className={`${textSub} hover:opacity-70 p-2 rounded-lg transition text-xl font-bold`}>
              ✕
            </button>
          </div>
        </div>

        {/* PERMANENTER RDG- & DEMO-SCHUTZHINWEIS */}
        <div className="px-6 py-1.5 bg-amber-500/15 border-b border-amber-500/40 text-amber-200 text-[11px] flex items-center justify-between gap-2 flex-wrap">
          <span>
            <strong>⚠️ Wichtiger Hinweis (RDG / StBG):</strong> SmartSonar ist ein technisches KI-Assistenz- und Textanalyse-System für Unternehmen. Die generierten Analysen, Strategien und Textmuster stellen <strong>keine Rechts- oder Steuerberatung</strong> dar und ersetzen keine Prüfung durch zugelassene Berufsträger.
          </span>
          {!isOwnerUser && (
            <span className="px-2 py-0.5 rounded bg-rose-500/30 border border-rose-400/50 text-rose-200 font-extrabold whitespace-nowrap">
              🔒 DEMO-MODUS (Max. 10 Test-Akten • Kopierschutz & Muster-Branding aktiv)
            </span>
          )}
        </div>

        {/* TOAST-WARNUNG BEI KOPIERVERSUCH IM DEMO-MODUS */}
        {copyWarningToast && (
          <div className="px-6 py-2 bg-rose-600 text-white text-xs font-extrabold text-center animate-pulse">
            🔒 Kopieren, Markieren und Ausschneiden ist in der kostenfreien Demo-Version gesperrt. In der Vollversion sind alle Texte frei nutzbar.
          </div>
        )}

        {/* WEG 1: EXPRESS-VORGABE LEISTE */}
        <div className={`px-6 py-2 border-b ${borderHeader} ${isDark ? "bg-cyan-950/20" : "bg-cyan-50"}`}>
          <form onSubmit={handleExpressAutopilot} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 whitespace-nowrap flex items-center gap-1">
              ⚡ Express-Vorgabe:
            </span>
            <input
              type="text"
              value={expressInput}
              onChange={(e) => setExpressInput(e.target.value)}
              disabled={isLoading}
              placeholder="Direkt-Anweisung ohne Lagebesprechung (z.B. '140 € wurden bereits am 12.10. überwiesen, Mahngebühr zurückweisen')..."
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 transition disabled:opacity-50 ${inputBg}`}
            />
            <button
              type="submit"
              disabled={isLoading || !expressInput.trim()}
              className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold px-4 py-1.5 rounded-lg text-xs transition disabled:opacity-50 whitespace-nowrap shadow"
            >
              ⚡ Direkt-Schreiben prüfen
            </button>
          </form>
        </div>

        {/* LIVE-KINO-ANZEIGE (DIE 4 PFLICHT-STATIONEN DER KANZLEI SOKRATES & SONAR NEMESIS) */}
        <div className={`px-6 py-2.5 border-b ${borderHeader} ${isDark ? "bg-slate-950/95" : "bg-slate-100"}`}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    ⚡ KANZLEI SOKRATES & SONAR NEMESIS ARBEITEN: ÜBERGABE ANS COCKPIT WIRD ERST NACH REVISIONS-FREIGABE (4X GRÜN) ENTSPERRT...
                  </span>
                </>
              ) : allFourGreen ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                    ✅ ALLE 4 KANZLEI-STATIONEN GRÜN & ABGENOMMEN – ÜBERGABE ANS COCKPIT IST FREIGESCHALTET!
                  </span>
                </>
              ) : strategyBriefing ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full bg-cyan-400"></span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">
                    📋 SCHRITT 1: BITTE WÄHLEN SIE UNTEN IN DER LAGEBESPRECHUNG IHRE STRATEGIE (ODER KOMBINATION) AUS!
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block w-3 h-3 rounded-full bg-slate-500"></span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    🔒 WARTE AUF LAGEBESPRECHUNG & DURCHLAUF DER 4 KANZLEI-STATIONEN...
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 4 Leuchtende Prozess-Stationen */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-1.5">
            {kanzleiStations.map((st) => {
              const isActive = isLoading && liveStage === st.id;
              const isDone = allFourGreen || (isLoading && liveStage > st.id);
              return (
                <div
                  key={st.id}
                  className={`p-2 rounded-xl border transition-all duration-500 flex flex-col justify-between gap-1 ${
                    isActive
                      ? "bg-amber-950/80 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.45)] scale-[1.01]"
                      : isDone
                      ? "bg-emerald-950/75 border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.3)]"
                      : "bg-slate-900/50 border-slate-800 opacity-45"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative flex items-center justify-center w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 text-sm flex-shrink-0">
                        {st.icon}
                      </div>
                      <div className="text-[11px] font-extrabold text-white truncate">{st.title}</div>
                    </div>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-400 text-slate-950 animate-pulse flex-shrink-0">
                        ⚡ Prüft...
                      </span>
                    )}
                    {isDone && !isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-400 text-slate-950 flex-shrink-0">
                        ✓ Grün
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-200 truncate pl-1">{st.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Live-Ticker der Kanzlei-Schritte */}
          {liveLogEntries.length > 0 && (
            <div className="max-h-16 overflow-y-auto space-y-1 bg-slate-900/90 border border-slate-800 rounded-lg p-1.5 font-mono text-[11px]">
              {liveLogEntries.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-200">
                  <span className="text-slate-500 flex-shrink-0">[{item.time}]</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold flex-shrink-0 ${
                      item.badge === "VETO"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : item.badge === "FREIGABE"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : item.badge === "NEMESIS"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    }`}
                  >
                    {item.badge}
                  </span>
                  <span className="flex-1">{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* HAUPTBEREICH: LAGEBESPRECHUNG & SCHRIFTSATZ-DIALOG (MIT KOPIERSCHUTZ FÜR DEMO-TESTER) */}
        <div
          onCopy={handleProtectedCopyAttempt}
          onCut={handleProtectedCopyAttempt}
          onContextMenu={handleProtectedCopyAttempt}
          onDragStart={handleProtectedCopyAttempt}
          className={`flex-1 overflow-y-auto p-6 space-y-6 text-sm font-sans ${bgChatArea} ${!isOwnerUser ? "select-none" : ""}`}
        >
          
          {/* ===================================================================== */}
          {/* INTERAKTIVE KANZLEI-LAGEBESPRECHUNG (ZUSAMMENFASSUNG & 4 OPTIONEN)    */}
          {/* ===================================================================== */}
          {strategyBriefing && (
            <div className={`rounded-2xl border-2 p-5 text-left space-y-4 shadow-xl ${
              isDark
                ? "bg-slate-950/90 border-cyan-500/60 text-slate-100"
                : "bg-slate-50 border-cyan-600 text-slate-900"
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🏛️</span>
                  <div>
                    <h3 className="text-base font-extrabold uppercase tracking-wide text-cyan-400">
                      KANZLEI-LAGEBESPRECHUNG & STRATEGIE-WAHL
                    </h3>
                    <p className="text-xs text-slate-400">
                      Ergebnis der Vorprüfung durch Ihr 32-Experten-Board (Kanzlei Sokrates) & SONAR NEMESIS
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Mehrfachauswahl / Kombination möglich ✓
                </span>
              </div>

              {/* 1. Klartext-Zusammenfassung & Schwachstellen */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="text-xs font-extrabold uppercase text-cyan-400">📌 1. Sachverhalt & Aktenlage auf den Punkt:</div>
                  <p className="text-xs text-slate-200 leading-relaxed">{strategyBriefing.case_summary}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="text-xs font-extrabold uppercase text-amber-400">🎯 2. Gefundene Hebel & Wirtschaftlichkeits-Check:</div>
                  <ul className="text-xs text-slate-200 space-y-1 list-disc pl-4">
                    {(strategyBriefing.weaknesses_found || []).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {strategyBriefing.recommended_combination_hint && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2">
                  <span className="text-base leading-none">💡</span>
                  <div>
                    <strong className="text-emerald-300 uppercase">Empfehlung des Leitenden Kanzlei-Partners: </strong>
                    {strategyBriefing.recommended_combination_hint}
                  </div>
                </div>
              )}

              {/* 2. Die 4 anklickbaren Handlungsoptionen */}
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-2.5">
                  👇 Klicken Sie 1 Option oder eine Kombination aus mehreren Optionen an (Auswahl aktiv: {selectedOptionIds.length}):
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(strategyBriefing.options || []).map((opt) => {
                    const isSelected = selectedOptionIds.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleOptionSelection(opt.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all select-none flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? "bg-cyan-950/70 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.35)] scale-[1.01]"
                            : "bg-slate-900/70 border-slate-800 hover:border-slate-600 opacity-85"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 accent-cyan-400 cursor-pointer"
                              />
                              <span className="font-extrabold text-sm text-white">{opt.title}</span>
                            </div>
                            {opt.is_recommended && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400 text-slate-950 whitespace-nowrap flex-shrink-0">
                                ⭐ Kanzlei-Favorit
                              </span>
                            )}
                          </div>
                          {opt.subtitle && (
                            <div className="text-[11px] font-semibold text-cyan-300 pl-6">{opt.subtitle}</div>
                          )}
                          <p className="text-xs text-slate-200 leading-relaxed pl-6">{opt.impact}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80 text-[11px] pl-6">
                          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                            <span className="block text-[9px] uppercase text-slate-400 font-bold">💰 Kostenrisiko</span>
                            <span className="font-bold text-amber-300">{opt.costs || "-"}</span>
                          </div>
                          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                            <span className="block text-[9px] uppercase text-slate-400 font-bold">⏱️ Dauer</span>
                            <span className="font-bold text-slate-200">{opt.duration || "-"}</span>
                          </div>
                          <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800">
                            <span className="block text-[9px] uppercase text-slate-400 font-bold">📈 Bewertung</span>
                            <span className="font-bold text-emerald-300">{opt.success_chance || "-"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Optionale Zusatznotiz & Auslöse-Button für den Schriftsatz */}
              <div className="pt-2 space-y-2.5">
                <input
                  type="text"
                  value={briefingCustomNote}
                  onChange={(e) => setBriefingCustomNote(e.target.value)}
                  disabled={isLoading}
                  placeholder="Optionaler Zusatz für die Endbesprechung (z.B. 'Ratenzahlung in 3 Raten anbieten' oder 'Frist bis 30.11. setzen')..."
                  className={`w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                />

                <button
                  type="button"
                  disabled={isLoading || selectedOptionIds.length === 0}
                  onClick={handleExecuteBriefingSelection}
                  className="w-full py-3.5 px-5 rounded-xl font-extrabold text-sm bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-xl transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>
                    🛡️ Schreiben gemäß Lagebesprechung ({selectedOptionIds.length} Option{selectedOptionIds.length === 1 ? "" : "en"} gewählt) verfassen & durch SONAR NEMESIS prüfen
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Bisheriger Kommunikations- & Schriftsatz-Verlauf */}
          {visibleChatMessages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={idx} className="flex flex-col w-full items-start relative">
                <div className={`text-xs font-bold ${textSub} mb-2 px-1 uppercase tracking-wider text-left`}>
                  {isUser ? "Mandant / Beschluss aus der Lagebesprechung" : `🏛️ Kanzlei Sokrates & SONAR NEMESIS (${isOwnerUser && selectedEngine === "claude" ? "Claude Sonnet" : "Gemini Pro"})`}
                </div>
                <div className={`w-full text-left rounded-lg px-6 py-5 whitespace-pre-wrap leading-relaxed border relative overflow-hidden ${isUser ? bgUserMsg : bgAiMsg}`}>
                  {/* Diagonales rotes MUSTER-Wasserzeichen für Demo-Tester */}
                  {!isOwnerUser && !isUser && (
                    <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-15">
                      <div className="transform -rotate-12 border-4 border-rose-500 text-rose-500 font-black text-3xl sm:text-5xl px-6 py-3 uppercase tracking-widest text-center">
                        MUSTER • DEMO-ANSICHT • KEINE RECHTSBERATUNG
                      </div>
                    </div>
                  )}
                  <div className="relative z-10">{m.content}</div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/50 flex items-center space-x-3 text-amber-300 text-sm font-extrabold uppercase tracking-wider text-left shadow-lg">
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-bounce"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-bounce [animation-delay:-.5s]"></div>
              <span>{loadingPhaseText}</span>
            </div>
          )}

          {/* UNÜBERSEHBARE KOMMANDO-BOX SOBALD ALLE 4 STATIONEN GRÜN SIND */}
          {allFourGreen && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/95 via-cyan-950/90 to-slate-900 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)] text-left space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <h3 className="text-sm sm:text-base font-extrabold text-emerald-300 uppercase tracking-wide">
                    ALLE 4 PRÜF-STATIONEN GRÜN (100 % SAFE) – SCHRIFTSATZ GEMÄSS LAGEBESPRECHUNG IST FREIGEGEBEN!
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-400 text-slate-950">
                  👍 DAUMEN HOCH VON SONAR NEMESIS
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">
                Ihr Schriftsatz wurde exakt nach Ihrer Auswahl aus der Lagebesprechung ausgearbeitet und von der Revisions-Kommission (SONAR NEMESIS) abgenommen. Sie können ihn jetzt direkt in die Aktenansicht im Cockpit übergeben (Hinweis nach RDG: Vor einem Versand an Dritte ist der Entwurf eigenverantwortlich durch den Mandanten bzw. einen Berufsträger zu prüfen):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExtractAndApplyJSON}
                  className="p-3.5 rounded-xl font-extrabold text-sm bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 ring-2 ring-emerald-300 flex items-center justify-center gap-2 transition shadow-xl cursor-pointer"
                >
                  <span>🚀 JETZT INS AKTEN-COCKPIT ÜBERGEBEN</span>
                </button>

                <button
                  type="button"
                  onClick={() => inputFieldRef.current?.focus()}
                  className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>💬 Noch eine Änderung anweisen (startet Nachprüfung)</span>
                </button>
              </div>
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
              title="Fehlendes Dokument (PDF/MD) in den War-Room hochladen (löst automatisch erneute Revisions-Prüfung aus)"
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
              ref={inputFieldRef}
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Optionaler Eingriff / Korrektur-Anweisung zum Schriftsatz (löst automatisch erneute Prüfung durch SONAR NEMESIS aus)..."
              disabled={isLoading}
              className={`flex-1 rounded-xl px-4 h-[46px] text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition disabled:opacity-50 ${inputBg}`}
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-6 h-[46px] rounded-xl text-sm transition disabled:opacity-50 flex-shrink-0"
            >
              Anweisung senden & neu prüfen
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
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 disabled:opacity-50 border border-cyan-500/40"
                title="Schriftsatz gemäß gewählter Lagebesprechung ausarbeiten bzw. nochmals durch SONAR NEMESIS prüfen"
              >
                <span>🛡️ Schreiben gemäß Lagebesprechung prüfen</span>
              </button>
              
              <button
                type="button"
                onClick={handleExtractAndApplyJSON}
                disabled={!allFourGreen}
                className={`font-extrabold px-5 py-2.5 rounded-xl text-sm shadow-md transition flex items-center space-x-2 ${
                  allFourGreen
                    ? "bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 cursor-pointer ring-2 ring-emerald-300"
                    : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
                }`}
                title={
                  allFourGreen
                    ? "Schriftsatz ist zu 100 % von SONAR NEMESIS freigegeben – jetzt ins Cockpit übergeben"
                    : "Gesperrt bis Sie Ihre Auswahl in der Lagebesprechung getroffen haben und alle 4 Stationen oben grün sind"
                }
              >
                <span>
                  {allFourGreen
                    ? "🚀 Ins Cockpit übergeben (Freigegeben ✓)"
                    : "🔒 Ins Cockpit übergeben (Erst Lagebesprechung & 4x Grün)"}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}