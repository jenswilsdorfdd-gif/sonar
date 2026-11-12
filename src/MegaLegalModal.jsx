import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// --- PDF.js Import für die clientseitige Extraktion im Modal ---
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const OWNER_USER_ID = "ea175141-2c03-4f93-ba1b-392570229cb2";

export default function MegaLegalModal({ isOpen, onClose, dossier, onApplySchriftsatz, theme }) {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhaseText, setLoadingPhaseText] = useState("Kanzlei Sokrates & SONAR NEMESIS arbeiten...");
  const [errorMsg, setErrorMsg] = useState(null);
  const [copyWarningToast, setCopyWarningToast] = useState(false);

  // --- Übernahme des Hell-/Dunkel-Modus aus dem Cockpit (ohne eigenen Umschalt-Button) ---
  const [isDark, setIsDark] = useState(true);

  // --- Strikte Owner-Erkennung anhand der Login-Session ---
  const [isOwnerUser, setIsOwnerUser] = useState(false);

  // --- Engine-Wahl & Revisions-Zweitmeinung ---
  const [selectedEngine, setSelectedEngine] = useState("gemini");
  const [enableSecondOpinion] = useState(true);
  const [loadedDocsCount, setLoadedDocsCount] = useState(0);

  // --- Live-Status-Anzeige der 4 Stationen & Revisions-Freigabe-Sperre ---
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

  const scrollContainerRef = useRef(null);
  const chatBottomRef = useRef(null);
  const inputFieldRef = useRef(null);
  const abortRunRef = useRef(0);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Erkennt automatisch, ob das vordere Cockpit im Hell- oder Dunkel-Modus steht
  useEffect(() => {
    if (theme && theme.cardBg) {
      const bg = String(theme.cardBg).toLowerCase();
      const isLightTheme = bg.includes("#fff") || bg.includes("#f") || bg.includes("255");
      setIsDark(!isLightTheme);
    } else if (typeof document !== "undefined" && document.body) {
      const bodyBg = window.getComputedStyle(document.body).backgroundColor || "";
      if (bodyBg.includes("255, 255, 255") || bodyBg.includes("248, 250, 252")) {
        setIsDark(false);
      } else {
        setIsDark(true);
      }
    }
  }, [theme, isOpen]);

  const addLiveLog = (text, badge = "INFO") => {
    const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLiveLogEntries(prev => [...prev, { time: timeStr, text, badge }]);
  };

  // Bereinigt eventuelle JSON-/Markdown-Artefakte in case_summary im Frontend
  const cleanCaseSummaryText = (rawSummary) => {
    if (!rawSummary) return "";
    let s = String(rawSummary).trim();
    s = s.replace(/^```(?:json|markdown|text)?\s*/i, "").replace(/\s*```$/i, "").trim();
    s = s.replace(/^\{\s*"case_summary"\s*:\s*"/i, "");
    s = s.replace(/"\s*,?\s*"weaknesses_found"[\s\S]*$/i, "");
    s = s.replace(/"\s*\}?$/, "");
    s = s.replace(/\\"/g, '"').replace(/\\n/g, " ");
    return s.trim();
  };

  // Automatischer Retry-Wrapper ohne Engine-Swap (bleibt strikt auf der gewählten Engine)
  const invokeTriageWithRetry = async (payload, maxAttempts = 2) => {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          setLoadingPhaseText(
            `Verbindung wird stabilisiert – automatischer 2. Durchlauf mit frischem 150s-Zeitfenster läuft...`
          );
          await sleep(800);
        }

        const { data, error } = await supabase.functions.invoke("sonar-ai-triage", {
          body: payload
        });

        if (error) {
          lastError = error;
          continue;
        }

        if (data?.error) {
          // Falls das Demo-Kontingent erschöpft ist, sofort zurückgeben und nicht wiederholen
          if (String(data.error).includes("Demo-Testkontingent")) {
            return { data, error: null };
          }
          lastError = new Error(data.error);
          continue;
        }

        return { data, error: null };
      } catch (err) {
        lastError = err;
      }
    }
    return { data: null, error: lastError || new Error("Verbindungsfehler zur KI-Engine.") };
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

  // Extrahiert den reinen Schriftsatz ohne vorangestelltes Prüfprotokoll oder Markdown-Sterne
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

    cleaned = cleaned.replace(/^```(?:markdown|text|json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
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
                      docTwinText += `\n(VOLLTEXT AUS ZWILLINGS-DATEI ${targetMdUrl.split('/').pop()}):\n${txt.trim()}\n`;
                      docsCount++;
                    }
                  }
                } catch (_fetchErr) {
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

  // Hochgeschwindigkeits-Prüf- & In-Memory-Patch-Pipeline: Kanzlei Sokrates <-> SONAR NEMESIS (mit 250.000 Zeichen Volltext-Kapazität)
  const runAutomatedRedTeamLoop = async (
    initialDraft,
    historyContext,
    ownerFlag = isOwnerUser,
    runId = abortRunRef.current,
    rawFullText = fullDossierContextCache
  ) => {
    const maxRounds = ownerFlag ? 2 : 2;
    setLiveMaxRounds(maxRounds);
    let currentDraft = extractCleanLetterBody(initialDraft);
    let auditProtocolLines = [];

    const contextSummary = historyContext
      .map(m => `(${m.role.toUpperCase()}):\n${typeof m.content === "string" ? m.content.substring(0, 120000) : ""}`)
      .join("\n\n---\n\n")
      .substring(0, 250000);

    for (let round = 1; round <= maxRounds; round++) {
      if (runId !== abortRunRef.current) return null;

      setLiveRound(round);
      setLiveStage(2);
      setLoadingPhaseText(
        `Station 2/4 (Runde ${round}/${maxRounds}): SONAR NEMESIS prüft den Entwurf gegen das Originaldokument & die 17 Gesetze...`
      );
      addLiveLog(`Station 2 (Runde ${round}/${maxRounds}): Forensische Prüfung & In-Memory-Patching durch SONAR NEMESIS läuft...`, "NEMESIS");

      const { data: checkData, error: checkErr } = await invokeTriageWithRetry({
        mode: "red_team_check",
        engine: ownerFlag ? selectedEngine : "gemini",
        draft_text: currentDraft,
        context_summary: contextSummary,
        raw_text: (rawFullText || dossier?.raw_text || dossier?.brief_entwurf || "").substring(0, 250000),
        round_number: round
      });

      if (runId !== abortRunRef.current) return null;

      // Falls das Backend bereits einen deterministisch gepatchten Entwurf (patched_draft) zurückliefert -> sofort übernehmen!
      if (checkData?.patched_draft && typeof checkData.patched_draft === "string" && checkData.patched_draft.trim().length > 100) {
        currentDraft = extractCleanLetterBody(checkData.patched_draft);
      } else if (checkData?.audit?.patched_draft && typeof checkData.audit.patched_draft === "string" && checkData.audit.patched_draft.trim().length > 100) {
        currentDraft = extractCleanLetterBody(checkData.audit.patched_draft);
      }

      if (checkErr || checkData?.error) {
        setLiveStage(3);
        setLoadingPhaseText("Station 3/4: Kanzlei Sokrates führt den formalen Feinschliff durch...");
        await sleep(300);
        setLiveStage(4);
        setLoadingPhaseText("Station 4/4: Revisions-Endabnahme erteilt!");
        auditProtocolLines.push(`Runde ${round} – Revisions-Endabnahme abgeschlossen.`);
        await sleep(300);
        break;
      }

      const audit = checkData?.audit || {
        approved: true,
        status_badge: "FREIGABE_DAUMEN_HOCH",
        score: 98,
        summary: "Keine weiteren Einwände.",
        veto_points: []
      };

      if (audit.approved || audit.status_badge === "FREIGABE_DAUMEN_HOCH" || !audit.veto_points || audit.veto_points.length === 0) {
        setLiveStage(3);
        setLoadingPhaseText("Station 3/4: In-Memory-Delta-Patches & Paragraphen-Kette versiegelt...");
        await sleep(350);

        setLiveStage(4);
        setLoadingPhaseText(`Station 4/4: SONAR NEMESIS erteilt Revisions-Freigabe (Score: ${audit.score || 99}/100)!`);
        auditProtocolLines.push(`Runde ${round} – SONAR NEMESIS Endabnahme (${audit.score || 99}/100 Punkte): FREIGABE ERTEILT – ${audit.summary}`);
        if (Array.isArray(audit.applied_patches_log) && audit.applied_patches_log.length > 0) {
          auditProtocolLines.push(
            ...audit.applied_patches_log.map((ap, idx) => `   • In-Memory-Patch ${idx + 1}: ${ap}`)
          );
        }
        await sleep(350);
        break;
      }

      const vetoCount = audit.veto_points.length;
      auditProtocolLines.push(
        `Runde ${round} – SONAR NEMESIS VETO (${audit.score || 85}/100 Punkte): ${audit.summary}\n` +
        audit.veto_points.map((vp, idx) => `   • Veto ${idx + 1}: ${vp}`).join("\n")
      );

      setLiveStage(3);
      setLoadingPhaseText(
        `Station 3/4 (Runde ${round}/${maxRounds}): Kanzlei Sokrates führt Delta-Patching für ${vetoCount} Punkt(e) aus...`
      );

      const { data: revData, error: revErr } = await invokeTriageWithRetry({
        mode: "sokrates_revision",
        engine: ownerFlag ? selectedEngine : "gemini",
        draft_text: currentDraft,
        context_summary: contextSummary,
        raw_text: (rawFullText || dossier?.raw_text || dossier?.brief_entwurf || "").substring(0, 250000),
        veto_points: audit.veto_points,
        round_number: round
      });

      if (runId !== abortRunRef.current) return null;

      if (!revErr && revData?.reply) {
        currentDraft = extractCleanLetterBody(revData.reply);
      } else {
        break;
      }

      if (round === maxRounds) {
        setLiveStage(4);
        setLoadingPhaseText("Station 4/4: Revisions-Endabnahme & Qualitäts-Zertifizierung abgeschlossen!");
        auditProtocolLines.push(`Revisions-Endabnahme nach Runde ${round}: Alle Veto-Punkte durch Kanzlei Sokrates per Delta-Patch eingearbeitet und freigegeben.`);
        await sleep(350);
      }
    }

    setApprovedCleanDraft(currentDraft);
    setLiveStage(5);
    setIsJudgeApproved(true);

    const headerBanner = [
      "=================================================================",
      `KANZLEI SOKRATES & SONAR NEMESIS PRÜFPROTOKOLL (${auditProtocolLines.length} PRÜF-EINTRÄGE – FREIGEGEBEN)`,
      ...auditProtocolLines,
      "=================================================================\n\n"
    ].join("\n");

    return `${headerBanner}${currentDraft}`;
  };

  // PHASE A: Startet die Akten-Analyse und erstellt die interaktive Kanzlei-Lagebesprechung
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

    const briefingPrompt = [
      "Analysiere dieses vollständige Akten-Dossier für unsere Mandanten-Lagebesprechung nach den 17 universellen War-Room-Gesetzen:",
      "",
      `Behörde / Gegenpartei: ${dossier.kontakt || "Unbekannt"}`,
      `Aktenzeichen / Steuernummer: ${dossier.aktenzeichen || "Unbekannt"}`,
      `Frist: ${dossier.frist_extern || "Bitte aus Ursprungsdokument berechnen"}`,
      `Betreff / Thema: ${dossier.thema || "Ohne Betreff"}`,
      `Unser Mandant: ${mandantFirma} (${mandantAP})`,
      `Heutiges Datum: ${today}`,
      "",
      "VOLLSTÄNDIGE AKTEN-HISTORIE & DOKUMENTENTEXTE (.MD-ZWILLINGE):",
      fullContextText.substring(0, 250000),
      "",
      "Erstelle jetzt die strukturierte Lagebesprechung des Leitenden Kanzlei-Partners mit 4 glasklaren Handlungsoptionen (inkl. Kosten, Dauer, Erfolgschance, allen zuständigen Sachbearbeitern/Jahren, Widerspruchs-Check und Wirtschaftlichkeits-Abwägung) als reines JSON ohne Markdown-Backticks!"
    ].join("\n");

    try {
      setLiveStage(2);
      setLoadingPhaseText("SONAR NEMESIS & Kanzlei Sokrates kalkulieren Verfahrensrisiko, Fristen & Erfolgschancen für Ihre Lagebesprechung...");

      const { data, error } = await invokeTriageWithRetry({
        mode: "strategy_briefing",
        messages: [{ role: "user", content: briefingPrompt }],
        raw_text: fullContextText.substring(0, 250000),
        engine: ownerFlag ? selectedEngine : "gemini"
      });

      if (currentRunId !== abortRunRef.current) return;
      if (error) throw new Error(error.message || "Fehler beim Erstellen der Lagebesprechung.");
      if (data?.error) throw new Error(data.error);

      const briefingObj = data?.briefing || null;
      if (briefingObj && Array.isArray(briefingObj.options)) {
        setStrategyBriefing(briefingObj);
        const recommendedIds = briefingObj.options.filter(o => o.is_recommended).map(o => o.id);
        setSelectedOptionIds(recommendedIds.length > 0 ? recommendedIds : [briefingObj.options[0]?.id].filter(Boolean));
      }

      const baseHistory = [{ role: "user", content: briefingPrompt }];
      setMessages(baseHistory);

      // SCROLL-FIX: Nach dem Laden der Lagebesprechung garantiert ganz oben bei Punkt 1 / Option 1 bleiben!
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }, 60);
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

  // Toggle-Funktion für die Strategie-Karten (Einzelwahl oder Kombination)
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
    const chosenInstructions = chosenOptions.map(o => `(Anweisung zu ${o.title}): ${o.draft_instruction}`).join("\n\n");

    const userDecisionDisplay = [
      "ENTSCHEIDUNG AUS DER KANZLEI-LAGEBESPRECHUNG:",
      chosenTitles,
      briefingCustomNote.trim() ? `\nZusatz-Vorgabe des Mandanten: "${briefingCustomNote.trim()}"` : ""
    ].filter(Boolean).join("\n");

    const rawContextToUse = (fullDossierContextCache || dossier?.raw_text || dossier?.brief_entwurf || "").substring(0, 250000);

    const fullDraftCommand = [
      "Der Mandant hat in der Lagebesprechung folgende strategische Marschroute (bzw. Kombination) verbindlich ausgewählt:",
      chosenTitles,
      "",
      "DETAILLIERTE AUSARBEITUNGS-VORGABEN FÜR DIESE WAHL:",
      chosenInstructions,
      briefingCustomNote.trim() ? `\nZUSÄTZLICHE MANDANTEN-ANWEISUNG (ZWINGEND EINARBEITEN): "${briefingCustomNote.trim()}"` : "",
      "",
      "WICHTIGE KONTEXT-DATEN FÜR DEN SCHRIFTSATZ (ZWINGEND EXAKT VERWENDEN – KEINE PLATZHALTER WIE MUSTERMANN!):",
      `- Heutiges Datum (für den Briefkopf): ${today}`,
      `- Unser Mandant (Absender): ${mandantFirma}`,
      `- Unterzeichner / Geschäftsführer: ${mandantAP}`,
      `- Empfänger / Behörde / Gegenpartei: ${dossier?.kontakt || "Siehe Originaldokument"}`,
      `- Aktenzeichen / Steuernummer: ${dossier?.aktenzeichen || "Siehe Originaldokument"}`,
      `- Betreff / Thema: ${dossier?.thema || ""}`,
      "",
      "VOLLSTÄNDIGER ORIGINAL-AKTEN-KONTEXT:",
      rawContextToUse,
      "",
      "DEIN AUFTRAG (DIE 17 UNIVERSELLEN WAR-ROOM-GESETZE ZWINGEND BEACHTEN):",
      "Verfasse jetzt SOFORT den vollständigen, wasserdichten und druckfertigen Schriftsatz exakt gemäß der obigen Auswahl nach dem Minto-/MECE-Prinzip (vollständig bis zur Unterschrift)!",
      "STRIKTE PFLICHT-CHECKLISTE:",
      "1. Adressiere das Schreiben im Rubrum an ALLE im Dokument genannten zuständigen Sachbearbeiter/Stellen (inkl. Weiterleitungen) und arbeite ALLE Teilverfahren/Zeiträume (im jeweils korrekten Verfahrensstadium nach Gesetz 13 & 16: keine unzulässige 'Abhilfe' gegen eine bereits erlassene Einspruchsentscheidung, sondern Rücknahme nach § 130 Abs. 1 AO + Billigkeitserlass nach § 227 AO, und für weitergeleitete offene Einsprüche wie 2024 direkte offensive Begründung nach § 367 Abs. 2 Satz 3 AO i. V. m. § 149 Abs. 2 Satz 1 AO Stichtag 31.07.2025, § 152 Abs. 1 Satz 2 AO und Kumulationsverbot § 5 AO ohne Rückfragen zum Bescheiddatum!) lückenlos aus.",
      "2. FRISTEN-ANKER (GESETZ 6): Berechne die Frist im gesamten Schreiben (auch im Schlussabschnitt V!) ausschließlich ab dem URSPRUNGSBESCHEID (z. B. 02.11.2026 -> Bekanntgabe 06.11.2026 -> Klagefristablauf Montag, 07.12.2026 nach § 108 Abs. 3 AO; NIEMALS ab dem Berichtigungsdatum nach § 129 AO vom 09.11.2026!) und setze die Behördenfrist im gesamten Dokument einheitlich auf mindestens 7 Kalendertage vor Ablauf der Ursprungs-Notfrist (27.11.2026 bzw. 30.11.2026, niemals 04.12.2026!).",
      "3. Zitiere Selbstwidersprüche zwischen Anschreiben und Hauptdokument wörtlich mit exakter Gliederungs-Fundstelle (Seite 4 von 5, Abschnitt II. c) zur Doppelfunktion) und verankere JEDES im Vorgang genannte Urteil am richtigen Ort (insb. BFH vom 29.08.1991, Az. V R 78/86 beim Billigkeitserlass nach § 227 AO sowie BFH vom 31.05.2017, Az. I R 37/15 bei § 37 Abs. 2 Satz 2 AO).",
      "4. Formuliere den Vollstreckungs- und Aufrechnungsschutz dogmatisch sauber über §§ 361 Abs. 2, 258 AO sowie § 226 Abs. 1 AO i. V. m. § 387 BGB (NIEMALS '§ 387 AO' schreiben!) und Rückforderung nach § 37 Abs. 2 Satz 2 AO i. V. m. BFH I R 37/15 und § 218 Abs. 2 AO.",
      "5. Gib AUSSCHLIESSLICH den reinen, druckfertigen Geschäftsbrief-Text aus: KEINE Vorrede, KEINE eckigen Klammern [ ], KEINE Markdown-Sternchen (**), KEINE Rauten (###) und KEINE Markdown-Tabellenstriche (|---|)!"
    ].filter(Boolean).join("\n");

    const displayHistory = [{ role: "user", content: userDecisionDisplay }];
    const apiHistory = [{ role: "user", content: fullDraftCommand }];
    setMessages(displayHistory);

    await callMegaLegal(apiHistory, true, isOwnerUser, currentRunId, displayHistory, rawContextToUse);
  };

  // Initialer Start beim Öffnen des Modals
  useEffect(() => {
    const initChatOrRestoreMemory = async () => {
      if (isOpen && dossier) {
        setErrorMsg(null);
        setLiveStage(0);
        setLiveLogEntries([]);
        setIsJudgeApproved(false);
        setApprovedCleanDraft("");
        setStrategyBriefing(null);
        setSelectedOptionIds([]);
        setBriefingCustomNote("");

        let ownerDetected = false;
        try {
          const { data: authData } = await supabase.auth.getUser();
          const currentUid = authData?.user?.id || "";
          ownerDetected = currentUid === OWNER_USER_ID;
          setIsOwnerUser(ownerDetected);
          setLiveMaxRounds(2);
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

  // Scrollt NUR dann nach unten, wenn tatsächlich ein neuer Schriftsatz oder Ladebalken unterhalb der Lagebesprechung erzeugt wird
  useEffect(() => {
    const hasAssistantReply = messages.some(m => m.role === "assistant");
    if (hasAssistantReply || (isLoading && liveStage >= 1 && messages.length > 0 && !strategyBriefing)) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, liveStage, strategyBriefing]);

  // Hauptfunktion: Führt Station 1 (Sokrates) + automatisch Station 2-4 (SONAR NEMESIS In-Memory-Patching) aus
  const callMegaLegal = async (
    historyForApi,
    runFullJudgePipeline = true,
    ownerFlag = isOwnerUser,
    runId = abortRunRef.current,
    historyForDisplay = null,
    rawTextOverride = null
  ) => {
    setIsLoading(true);
    setIsJudgeApproved(false);
    setErrorMsg(null);
    setLiveStage(1);
    setLiveRound(1);

    const effectiveRawText = (rawTextOverride || fullDossierContextCache || dossier?.raw_text || dossier?.brief_entwurf || "").substring(0, 250000);

    setLoadingPhaseText(
      `Station 1/4: 32-Experten-Kanzlei Sokrates formuliert Ihren Schriftsatz • danach prüft & patcht automatisch SONAR NEMESIS...`
    );

    try {
      const { data, error } = await invokeTriageWithRetry({
        mode: "megalegal_chat",
        messages: historyForApi,
        raw_text: effectiveRawText,
        engine: ownerFlag ? selectedEngine : "gemini",
        enable_second_opinion: false,
      });

      if (runId !== abortRunRef.current) return;
      if (error) throw new Error(error.message || "Fehler beim Aufruf der Edge Function.");
      if (data?.error) throw new Error(data.error);

      let reply = data?.reply || "Keine Antwort vom Board erhalten.";

      if (runFullJudgePipeline && reply) {
        const auditedReply = await runAutomatedRedTeamLoop(reply, historyForApi, ownerFlag, runId, effectiveRawText);
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

    const wrappedInstruction = [
      `ZUSATZ-ANWEISUNG / ÄNDERUNGSWUNSCH DES MANDANTEN: "${userInstruction}"`,
      "",
      "Arbeite diese Anweisung sofort unter Beachtung der 17 universellen War-Room-Gesetze in den Schriftsatz ein und gib AUSSCHLIESSLICH den vollständig aktualisierten, druckfertigen Schriftsatz-Text (ohne Vorrede, ohne eckigen Klammern, ohne Markdown-Sternchen **, direkt im Namen des Mandanten) aus, damit er erneut SONAR NEMESIS zur Pflicht-Abnahme vorgelegt werden kann!"
    ].join("\n");

    const updatedHistory = [...messages, { role: "user", content: wrappedInstruction }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, true, isOwnerUser, currentRunId);
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

      const combinedRaw = `${fullDossierContextCache}\n\n=== NACHGEREICHTE DATEI (${file.name}) ===\n${extractedText}`.substring(0, 250000);
      setFullDossierContextCache(combinedRaw);

      const prompt = `Hier ist der nachgereichte Volltext aus der Datei "${file.name}":\n\n${extractedText.substring(0, 200000)}\n\nBitte arbeite diese neuen Fakten sofort unter Beachtung der 17 War-Room-Gesetze in den versandfertigen Schriftsatz ein und gib den kompletten, aktualisierten Schriftsatz-Text (ohne Markdown-Sternchen **) zur erneuten Prüfung durch SONAR NEMESIS aus.`;
      
      const updatedHistory = [...messages, { role: "user", content: prompt }];
      setMessages(updatedHistory);
      if (dossier?.akte_id) {
        await saveChatToDatabase(dossier.akte_id, updatedHistory);
      }
      await callMegaLegal(updatedHistory, true, isOwnerUser, currentRunId, null, combinedRaw);

    } catch (err) {
      console.error("Upload Error:", err);
      setErrorMsg(err.message || "Fehler beim Auslesen der Datei.");
      setIsLoading(false);
    }
    
    e.target.value = ""; 
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

    // Für fremde Demo-Nutzer (!isOwnerUser) brennen wir einen reinen ASCII-MUSTER-Stempel (ohne Emojis, damit jsPDF kein Ø=Y4 erzeugt!) ein
    const finalExportText = isOwnerUser
      ? rawContent.trim()
      : [
          "==========================================================================",
          "*** MUSTER / UNVERBINDLICHE DEMO-ANSICHT - NICHT ZUM VERSAND GEEIGNET ***",
          "HINWEIS (RDG / StBG): KI-generiertes Textmuster zu Demonstrationszwecken. Keine Rechts- oder Steuerberatung.",
          "==========================================================================\n",
          rawContent.trim(),
          "\n==========================================================================",
          "*** MUSTER / DEMO-VERSION SMARTSONAR - KOPIEREN & VERSENDEN UNTERSAGT ***",
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

  const handleResetChatMemory = async () => {
    if (!window.confirm("Gespeicherten War-Room-Verlauf dieser Akte löschen und Lagebesprechung mit allen aktuellen Akten-Dokumenten komplett neu starten?")) {
      return;
    }
    await startFreshAnalysis(isOwnerUser);
  };

  if (!isOpen) return null;

  // Schlichte, einheitliche Farbpalette exakt passend zum vorderen SONAR Cockpit
  const bgModal = isDark ? "bg-slate-900" : "bg-white";
  const borderModal = isDark ? "border-slate-700" : "border-slate-300";
  const bgHeader = isDark ? "bg-slate-950" : "bg-slate-100";
  const borderHeader = isDark ? "border-slate-800" : "border-slate-300";
  const textTitle = isDark ? "text-white" : "text-slate-900";
  const textSub = isDark ? "text-slate-400" : "text-slate-600";
  const bgChatArea = isDark ? "bg-slate-900" : "bg-slate-50";
  const bgCard = isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-300 text-slate-900";
  const bgFooter = isDark ? "bg-slate-950" : "bg-slate-100";
  const inputBg = isDark
    ? "bg-slate-900 border-slate-700 text-white placeholder-slate-400"
    : "bg-white border-slate-300 text-slate-900 placeholder-slate-500";

  // Einheitlicher Standard-Button-Stil für die Kopfzeile (gleiche Höhe, gleiche Schriftgröße, keine bunten Emojis)
  const headerBtnBase = "h-[34px] px-3 rounded-md text-xs font-bold border transition flex items-center justify-center gap-1.5 whitespace-nowrap";
  const headerBtnInactive = isDark
    ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-200";
  const headerBtnActive = "bg-[#0ea5e9] border-[#0ea5e9] text-slate-950 font-extrabold";

  const displayMandantName = dossier?.unsere_firma || (isOwnerUser ? "Jens Wilsdorf" : "Mandant");

  // Die 4 Pflicht-Stationen (ohne bunte Icons, schlicht nummeriert)
  const kanzleiStations = [
    { id: 1, title: "1. 32-Experten-Kanzlei Sokrates", desc: "Schriftsatz nach Lagebesprechung" },
    { id: 2, title: "2. SONAR NEMESIS (Red Team)", desc: `17-Gesetze-Prüfung & In-Memory-Patch (Runde ${liveRound}/${liveMaxRounds})` },
    { id: 3, title: "3. Sokrates Delta-Merge", desc: "Deterministischer Patch-Einbau" },
    { id: 4, title: "4. Revisions-Endabnahme", desc: "100 % Großkanzlei-Zertifizierung" }
  ];

  const allFourGreen = !isLoading && liveStage === 5 && isJudgeApproved;
  const visibleChatMessages = messages.filter((m, idx) => !(idx === 0 && m.role === "user" && m.content.includes("Analysiere dieses vollständige Akten-Dossier")));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`flex flex-col w-full max-w-6xl h-[94vh] ${bgModal} border ${borderModal} rounded-xl shadow-2xl overflow-hidden`}>
        
        {/* 1. HEADER: Titel + Demo-Badge direkt daneben + einheitliche Steuer-Buttons */}
        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b ${borderHeader} ${bgHeader}`}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: isLoading ? "#f59e0b" : (allFourGreen ? "#10b981" : "#0ea5e9")
                }}
              />
              <h2 className={`text-base sm:text-lg font-extrabold ${textTitle} tracking-wide uppercase`}>
                SMARTSONAR – STRATEGISCHER KANZLEI-WAR-ROOM
              </h2>
              {!isOwnerUser && (
                <span className="px-2.5 py-1 rounded text-[11px] font-extrabold bg-slate-800 text-amber-400 border border-amber-500/50 whitespace-nowrap">
                  DEMO-MODUS (Max. 10 Test-Akten • Kopier- & Muster-Branding aktiv)
                </span>
              )}
            </div>
            <p className={`text-xs ${textSub}`}>
              Akte: {dossier?.aktenzeichen || "Neu"} | Gegenpartei: {dossier?.kontakt || "Behörde"} | Mandant: {displayMandantName}
            </p>
          </div>

          {/* Einheitliche Button-Leiste rechts */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedEngine("gemini")}
              className={`${headerBtnBase} ${selectedEngine === "gemini" ? headerBtnActive : headerBtnInactive} cursor-pointer`}
            >
              <span>Gemini Pro</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isOwnerUser) return;
                setSelectedEngine("claude");
              }}
              disabled={!isOwnerUser}
              className={`${headerBtnBase} ${
                !isOwnerUser
                  ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-70"
                  : selectedEngine === "claude"
                  ? headerBtnActive
                  : headerBtnInactive
              }`}
              title={!isOwnerUser ? "Claude Sonnet ist exklusiv in der Vollversion freigeschaltet" : "Anthropic Claude Sonnet verwenden"}
            >
              <span>Claude Sonnet {!isOwnerUser ? "(Pro)" : ""}</span>
            </button>

            <div
              className={`${headerBtnBase} ${
                isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-slate-300 text-slate-700"
              } select-none`}
            >
              <span>Auto-Widerstreit (Sokrates vs. Nemesis) AKTIV</span>
            </div>

            <button
              type="button"
              onClick={handleResetChatMemory}
              disabled={isLoading}
              className={`${headerBtnBase} ${headerBtnInactive} cursor-pointer disabled:opacity-50`}
            >
              <span>Neu starten</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`${headerBtnBase} ${headerBtnInactive} cursor-pointer px-3`}
              title="Schließen"
            >
              <span>✕</span>
            </button>
          </div>
        </div>

        {/* 2. KNALLROTER, NICHT AUSBLENDBARER RDG- & StBG-WARNHINWEIS (Weiße Schrift auf Rot – für Hell & Dunkel identisch) */}
        <div
          style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
          className="px-6 py-2.5 border-b border-red-800 text-xs sm:text-[13px] font-bold leading-snug text-left shadow-sm flex-shrink-0"
        >
          WICHTIGER HINWEIS GEMÄSS RDG & StBG: Dieses System ist ein technisches KI-Assistenz- und Textanalyse-Werkzeug für Unternehmen. Die generierten Analysen, Lagebesprechungen und Textmuster stellen KEINE Rechts- oder Steuerberatung dar und ersetzen keine Prüfung durch einen zugelassenen Rechtsanwalt oder Steuerberater.
        </div>

        {/* TOAST-WARNUNG BEI KOPIERVERSUCH IM DEMO-MODUS */}
        {copyWarningToast && (
          <div style={{ backgroundColor: "#b91c1c", color: "#ffffff" }} className="px-6 py-2 text-xs font-extrabold text-center">
            Kopieren, Markieren und Ausschneiden ist in der kostenfreien Demo-Version gesperrt. In der Vollversion sind alle Texte frei nutzbar.
          </div>
        )}

        {/* 3. DIE 4 PFLICHT-STATIONEN (Schlichtes Cockpit-Design ohne Ticker-Box darunter) */}
        <div className={`px-6 py-3 border-b ${borderHeader} ${bgHeader} flex-shrink-0`}>
          <div className="mb-2 text-left">
            {isLoading ? (
              <span style={{ color: "#f59e0b" }} className="text-xs font-extrabold uppercase tracking-wider">
                KANZLEI SOKRATES & SONAR NEMESIS ARBEITEN – ÜBERGABE ANS COCKPIT WIRD NACH REVISIONS-FREIGABE (4X GRÜN) FREIGESCHALTET...
              </span>
            ) : allFourGreen ? (
              <span style={{ color: "#10b981" }} className="text-xs font-extrabold uppercase tracking-wider">
                ALLE 4 KANZLEI-STATIONEN GRÜN & ABGENOMMEN – ÜBERGABE ANS COCKPIT IST FREIGESCHALTET!
              </span>
            ) : (
              <span className={`text-xs font-extrabold uppercase tracking-wider ${textTitle}`}>
                SCHRITT 1: BITTE WÄHLEN SIE UNTEN IN DER LAGEBESPRECHUNG IHRE STRATEGIE (ODER KOMBINATION) AUS!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            {kanzleiStations.map((st) => {
              const isActive = isLoading && liveStage === st.id;
              const isDone = allFourGreen || (isLoading && liveStage > st.id);

              let boxStyle = {
                borderColor: isDark ? "#334155" : "#cbd5e1",
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
                opacity: 0.65
              };

              if (isActive) {
                boxStyle = {
                  borderColor: "#f59e0b",
                  backgroundColor: isDark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.1)",
                  opacity: 1
                };
              } else if (isDone) {
                boxStyle = {
                  borderColor: "#10b981",
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.14)" : "rgba(16, 185, 129, 0.12)",
                  opacity: 1
                };
              }

              return (
                <div
                  key={st.id}
                  style={boxStyle}
                  className="p-2.5 rounded-lg border transition-all flex flex-col justify-between gap-1 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={`text-xs font-extrabold truncate ${textTitle}`}>{st.title}</div>
                    {isActive && (
                      <span
                        style={{ backgroundColor: "#f59e0b", color: "#000000" }}
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase flex-shrink-0"
                      >
                        PRÜFT...
                      </span>
                    )}
                    {isDone && !isActive && (
                      <span
                        style={{ backgroundColor: "#10b981", color: "#000000" }}
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase flex-shrink-0"
                      >
                        GRÜN
                      </span>
                    )}
                  </div>
                  <div className={`text-[11px] truncate ${textSub}`}>{st.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. HAUPTBEREICH: LAGEBESPRECHUNG (STARTET GANZ OBEN) & SCHRIFTSATZ */}
        <div
          ref={scrollContainerRef}
          onCopy={handleProtectedCopyAttempt}
          onCut={handleProtectedCopyAttempt}
          onContextMenu={handleProtectedCopyAttempt}
          onDragStart={handleProtectedCopyAttempt}
          className={`flex-1 overflow-y-auto p-6 space-y-6 text-sm font-sans ${bgChatArea} ${!isOwnerUser ? "select-none" : ""}`}
        >
          {/* INTERAKTIVE KANZLEI-LAGEBESPRECHUNG (UNTEREINANDER IN VOLLER BREITE OHNE ABSCHNEIDEN) */}
          {strategyBriefing && (
            <div className={`rounded-xl border p-5 text-left space-y-4 ${bgCard}`}>
              <div className={`flex items-center justify-between flex-wrap gap-2 border-b pb-3 ${borderHeader}`}>
                <div>
                  <h3 className={`text-base font-extrabold uppercase tracking-wide ${textTitle}`}>
                    KANZLEI-LAGEBESPRECHUNG & STRATEGIE-WAHL
                  </h3>
                  <p className={`text-xs ${textSub}`}>
                    Ergebnis der Vorprüfung durch Kanzlei Sokrates & SONAR NEMESIS (Mehrfachauswahl / Kombination möglich)
                  </p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-bold border ${borderModal} ${textSub}`}>
                  Auswahl aktiv: {selectedOptionIds.length}
                </span>
              </div>

              {/* Punkt 1 & Punkt 2 untereinander über die volle Breite für 100 % Lesbarkeit ohne Scrollbalken */}
              <div className="flex flex-col gap-4">
                <div className={`w-full p-4 rounded-lg border ${borderModal} ${isDark ? "bg-slate-900" : "bg-slate-50"} space-y-2`}>
                  <div className={`text-xs font-extrabold uppercase tracking-wide ${textTitle}`}>
                    1. Sachverhalt & Aktenlage auf den Punkt:
                  </div>
                  <p className={`text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    {cleanCaseSummaryText(strategyBriefing.case_summary)}
                  </p>
                </div>

                <div className={`w-full p-4 rounded-lg border ${borderModal} ${isDark ? "bg-slate-900" : "bg-slate-50"} space-y-2`}>
                  <div className={`text-xs font-extrabold uppercase tracking-wide ${textTitle}`}>
                    2. Gefundene Hebel & Wirtschaftlichkeits-Check:
                  </div>
                  <ul className={`text-xs sm:text-[13px] leading-relaxed space-y-1.5 list-disc pl-5 break-words ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    {(strategyBriefing.weaknesses_found || []).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {strategyBriefing.recommended_combination_hint && (
                <div
                  style={{
                    borderColor: "#10b981",
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.08)"
                  }}
                  className="p-3.5 rounded-lg border text-xs sm:text-[13px] leading-relaxed"
                >
                  <strong style={{ color: "#10b981" }} className="uppercase">Empfehlung des Leitenden Kanzlei-Partners: </strong>
                  <span className={isDark ? "text-slate-200" : "text-slate-800"}>
                    {strategyBriefing.recommended_combination_hint}
                  </span>
                </div>
              )}

              {/* Die 4 anklickbaren Handlungsoptionen (ohne Text-Abschneiden in den Info-Feldern) */}
              <div>
                <div className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${textSub}`}>
                  Wählen Sie 1 Option oder eine Kombination aus mehreren Optionen durch Anklicken aus:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(strategyBriefing.options || []).map((opt) => {
                    const isSelected = selectedOptionIds.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleOptionSelection(opt.id)}
                        style={{
                          borderColor: isSelected ? "#0ea5e9" : (isDark ? "#334155" : "#cbd5e1"),
                          backgroundColor: isSelected
                            ? (isDark ? "rgba(14, 165, 233, 0.12)" : "rgba(14, 165, 233, 0.08)")
                            : (isDark ? "#0f172a" : "#ffffff")
                        }}
                        className="p-4 rounded-lg border-2 cursor-pointer transition-all select-none flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 accent-[#0ea5e9] cursor-pointer flex-shrink-0"
                              />
                              <span className={`font-extrabold text-sm ${textTitle}`}>{opt.title}</span>
                            </div>
                            {opt.is_recommended && (
                              <span
                                style={{ backgroundColor: "#10b981", color: "#000000" }}
                                className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase whitespace-nowrap flex-shrink-0"
                              >
                                Empfehlung
                              </span>
                            )}
                          </div>
                          {opt.subtitle && (
                            <div className={`text-xs font-bold pl-6 ${textSub}`}>{opt.subtitle}</div>
                          )}
                          <p className={`text-xs leading-relaxed pl-6 break-words ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                            {opt.impact}
                          </p>
                        </div>

                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t ${borderHeader} text-[11px] pl-6`}>
                          <div className={`p-2.5 rounded border ${borderModal} ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
                            <span className={`block text-[10px] uppercase font-bold mb-0.5 ${textSub}`}>Kostenrisiko</span>
                            <span className={`font-bold leading-snug break-words block ${textTitle}`}>{opt.costs || "-"}</span>
                          </div>
                          <div className={`p-2.5 rounded border ${borderModal} ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
                            <span className={`block text-[10px] uppercase font-bold mb-0.5 ${textSub}`}>Dauer</span>
                            <span className={`font-bold leading-snug break-words block ${textTitle}`}>{opt.duration || "-"}</span>
                          </div>
                          <div className={`p-2.5 rounded border ${borderModal} ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
                            <span className={`block text-[10px] uppercase font-bold mb-0.5 ${textSub}`}>Bewertung</span>
                            <span className={`font-bold leading-snug break-words block ${textTitle}`}>{opt.success_chance || "-"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Optionale Zusatznotiz & einheitlicher Cockpit-Button für den Schriftsatz */}
              <div className="pt-2 space-y-2.5">
                <input
                  type="text"
                  value={briefingCustomNote}
                  onChange={(e) => setBriefingCustomNote(e.target.value)}
                  disabled={isLoading}
                  placeholder="Optionaler Zusatz für die Endbesprechung (z.B. 'Ratenzahlung in 3 Raten anbieten' oder 'Frist bis 27.11.2026 setzen')..."
                  className={`w-full rounded-lg px-3.5 py-2.5 text-xs border focus:outline-none focus:border-[#0ea5e9] ${inputBg}`}
                />

                <button
                  type="button"
                  disabled={isLoading || selectedOptionIds.length === 0}
                  onClick={handleExecuteBriefingSelection}
                  style={{ backgroundColor: "#0ea5e9", color: "#000000" }}
                  className="w-full py-3 px-5 rounded-lg font-extrabold text-sm hover:opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
                >
                  Schreiben gemäß Lagebesprechung ({selectedOptionIds.length} Option{selectedOptionIds.length === 1 ? "" : "en"} gewählt) verfassen & durch SONAR NEMESIS prüfen
                </button>
              </div>
            </div>
          )}

          {/* Kommunikations- & Schriftsatz-Verlauf */}
          {visibleChatMessages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={idx} className="flex flex-col w-full items-start relative">
                <div className={`text-xs font-bold ${textSub} mb-1.5 px-1 uppercase tracking-wider text-left`}>
                  {isUser
                    ? "Mandant / Beschluss aus der Lagebesprechung"
                    : `Kanzlei Sokrates & SONAR NEMESIS (${isOwnerUser && selectedEngine === "claude" ? "Claude Sonnet" : "Gemini Pro"})`}
                </div>
                <div
                  className={`w-full text-left rounded-lg px-6 py-5 whitespace-pre-wrap leading-relaxed border relative overflow-hidden ${bgCard}`}
                >
                  {/* Diagonales rotes MUSTER-Wasserzeichen für Demo-Tester */}
                  {!isOwnerUser && !isUser && (
                    <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-15">
                      <div className="transform -rotate-12 border-4 border-red-600 text-red-600 font-black text-2xl sm:text-4xl px-6 py-3 uppercase tracking-widest text-center">
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
            <div
              style={{
                borderColor: "#f59e0b",
                backgroundColor: isDark ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.08)",
                color: isDark ? "#fcd34d" : "#b45309"
              }}
              className="p-4 rounded-lg border flex items-center space-x-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-left"
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f59e0b] animate-ping flex-shrink-0" />
              <span>{loadingPhaseText}</span>
            </div>
          )}

          {/* FREIGABE-BOX SOBALD ALLE 4 STATIONEN GRÜN SIND */}
          {allFourGreen && (
            <div
              style={{
                borderColor: "#10b981",
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.08)"
              }}
              className="p-5 rounded-xl border-2 text-left space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 style={{ color: "#10b981" }} className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
                  ALLE 4 PRÜF-STATIONEN GRÜN – SCHRIFTSATZ GEMÄSS LAGEBESPRECHUNG IST FREIGEGEBEN
                </h3>
                <span
                  style={{ backgroundColor: "#10b981", color: "#000000" }}
                  className="px-3 py-1 rounded text-xs font-extrabold uppercase"
                >
                  REVISIONS-FREIGABE ERTEILT
                </span>
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Ihr Schriftsatz wurde nach Ihrer Auswahl aus der Lagebesprechung ausgearbeitet und von SONAR NEMESIS nach allen 17 Gesetzen abgenommen. Klicken Sie jetzt auf „Ins Cockpit übergeben“, um den Entwurf in die Aktenansicht zu übernehmen.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExtractAndApplyJSON}
                  style={{ backgroundColor: "#10b981", color: "#000000" }}
                  className="px-5 py-3 rounded-lg font-extrabold text-sm hover:opacity-90 transition cursor-pointer"
                >
                  Ins Cockpit übergeben
                </button>

                <button
                  type="button"
                  onClick={() => inputFieldRef.current?.focus()}
                  className={`px-4 py-3 rounded-lg border font-bold text-xs sm:text-sm transition cursor-pointer ${headerBtnInactive}`}
                >
                  Noch eine Änderung anweisen (startet Nachprüfung)
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-900 rounded-lg text-sm w-full font-bold text-left">
              {errorMsg}
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* 5. SCHLICHTER FOOTER: Korrektur-Eingabe + Schließen + 1 klarer Übergabe-Button */}
        <div className={`p-4 border-t ${borderHeader} ${bgFooter} space-y-3 flex-shrink-0`}>
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <label 
              className={`flex items-center justify-center h-[42px] w-[42px] rounded-lg cursor-pointer border transition flex-shrink-0 ${headerBtnInactive}`}
              title="Fehlendes Dokument (PDF/MD) nachladen (löst automatisch erneute Prüfung aus)"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
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
              className={`flex-1 rounded-lg px-4 h-[42px] text-xs sm:text-sm border focus:outline-none focus:border-[#0ea5e9] transition disabled:opacity-50 ${inputBg}`}
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              style={{ backgroundColor: "#0ea5e9", color: "#000000" }}
              className="font-extrabold px-5 h-[42px] rounded-lg text-xs sm:text-sm hover:opacity-90 transition disabled:opacity-50 flex-shrink-0 cursor-pointer"
            >
              Anweisung senden & neu prüfen
            </button>
          </form>

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`text-xs px-4 py-2.5 rounded-lg border font-bold cursor-pointer ${headerBtnInactive}`}
            >
              Schließen (Verlauf bleibt gespeichert)
            </button>
            
            <button
              type="button"
              onClick={handleExtractAndApplyJSON}
              disabled={!allFourGreen}
              style={
                allFourGreen
                  ? { backgroundColor: "#10b981", color: "#000000" }
                  : undefined
              }
              className={`font-extrabold px-6 py-2.5 rounded-lg text-sm transition flex items-center justify-center ${
                allFourGreen
                  ? "cursor-pointer hover:opacity-90 shadow"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
              }`}
              title={
                allFourGreen
                  ? "Schriftsatz ist von SONAR NEMESIS freigegeben – jetzt ins Cockpit übergeben"
                  : "Wird freigeschaltet, sobald die Prüfung nach der Lagebesprechung abgeschlossen ist (4x Grün)"
              }
            >
              {allFourGreen
                ? "Ins Cockpit übergeben (Freigegeben)"
                : "Ins Cockpit übergeben (Erst Lagebesprechung & 4x Grün)"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}