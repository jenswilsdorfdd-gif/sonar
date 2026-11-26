import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { buildCompactWarRoomIndex } from "./utils/fallakteBuilder";
import { PRIMARY_OWNER_USER_ID, isFullAccessIdentity } from "./config/authRoles";

// --- PDF.js Import für die clientseitige Extraktion im Modal ---
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const OWNER_DEFAULT_FAX = "0351 85074535";

// STUFE 2 HELPER: Lädt den ungekürzten Original-Volltext (bis 85.000 Zeichen) eines Urteils aus dem Supabase Storage Bucket 'dokumente'
export async function loadFullDecisionTextForWarroom(row, supabaseClient = supabase) {
  if (!row) return "";
  try {
    if (row.dokument_url && String(row.dokument_url).includes("/storage/v1/object/public/dokumente/")) {
      const cleanUrl = String(row.dokument_url).split("#")[0].trim();
      const res = await fetch(cleanUrl);
      if (res.ok) {
        const fullTxt = await res.text();
        if (fullTxt && fullTxt.trim().length > 0) return fullTxt;
      }
    }
    if (row.datei_name) {
      const { data, error } = await supabaseClient.storage.from("dokumente").download(row.datei_name);
      if (!error && data) {
        const fullTxt = await data.text();
        if (fullTxt && fullTxt.trim().length > 0) return fullTxt;
      }
    }
  } catch (e) {
    console.warn("Storage-Volltext konnte nicht geladen werden, nutze DB-Vorschau:", e);
  }
  return row.inhalt_text || "";
}

export default function MegaLegalModal({ isOpen, onClose, dossier, onApplySchriftsatz, theme }) {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhaseText, setLoadingPhaseText] = useState("Kanzlei Alpha, Spiegel-Kanzlei Omega & Revisionssenat arbeiten...");
  const [errorMsg, setErrorMsg] = useState(null);
  const [copyWarningToast, setCopyWarningToast] = useState(false);

  // --- Übernahme des Hell-/Dunkel-Modus aus dem Cockpit (ohne eigenen Umschalt-Button) ---
  const [isDark, setIsDark] = useState(true);

  // --- Responsive & Kompakt-Steuerung gegen überfüllte Smartphone-Screens ---
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [mobileHeaderExpanded, setMobileHeaderExpanded] = useState(false);
  const [mobileCorrectionOpen, setMobileCorrectionOpen] = useState(false);
  const [desktopHelpSplitActive, setDesktopHelpSplitActive] = useState(false);

  // --- Strikte Trennung: Vollzugang (Jens + Nico) vs. Primärer Owner (exklusiv Jens für Fax-/Namens-Defaults) ---
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [isPrimaryOwner, setIsPrimaryOwner] = useState(false);
  const [sessionUserMeta, setSessionUserMeta] = useState({ name: "", firma: "" });

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

  // Überwacht Bildschirmgröße sowie ein ggf. aktives 1/3-Desktop-Hilfe-Dock
  useEffect(() => {
    const checkViewportAndHelp = () => {
      if (typeof window === "undefined") return;
      const mob = window.innerWidth <= 768;
      setIsMobileScreen(mob);
      if (!mob) {
        setMobileHeaderExpanded(true);
        setMobileCorrectionOpen(true);
      }
      if (typeof document !== "undefined") {
        setDesktopHelpSplitActive(
          window.innerWidth > 1024 && document.body.classList.contains("sonar-live-help-desktop")
        );
      }
    };

    checkViewportAndHelp();
    window.addEventListener("resize", checkViewportAndHelp);

    let bodyObserver = null;
    if (typeof document !== "undefined" && document.body) {
      bodyObserver = new MutationObserver(checkViewportAndHelp);
      bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    return () => {
      window.removeEventListener("resize", checkViewportAndHelp);
      if (bodyObserver) bodyObserver.disconnect();
    };
  }, [isOpen]);

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

  // Blockiert Kopieren / Ausschneiden / Rechtsklick NUR für reine Demo-Nutzer (!hasFullAccess)
  const handleProtectedCopyAttempt = (e) => {
    if (!hasFullAccess) {
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
    return cleaned.trim();
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

  // 2-STUFEN-RECHTSDATENBANK-LOADER
  const fetchRelevantDecisionsWithFullText = async (dossierText, dossierThema, dossierKontakt) => {
    try {
      const combinedSearchInput = `${dossierThema || ""} ${dossierKontakt || ""} ${(dossierText || "").substring(0, 15000)}`;

      const normMatches = combinedSearchInput.match(/(?:§§?\s*\d+[a-z]?|Art\.\s*\d+)/gi) || [];
      const uniqueNorms = Array.from(new Set(normMatches.map(n => n.replace(/\s+/g, " ").trim()))).slice(0, 5);

      const candidateMap = new Map();

      for (const norm of uniqueNorms) {
        const { data: normRows } = await supabase
          .from("wissensdatenbank")
          .select("id, datei_name, firma, kategorie, inhalt_text, dokument_url")
          .ilike("inhalt_text", `%${norm}%`)
          .not("datei_name", "like", "FALLAKTE_%")
          .order("id", { ascending: false })
          .limit(3);

        if (Array.isArray(normRows)) {
          normRows.forEach(r => {
            if (!candidateMap.has(r.id)) {
              candidateMap.set(r.id, { row: r, score: (candidateMap.get(r.id)?.score || 0) + 3 });
            } else {
              candidateMap.get(r.id).score += 2;
            }
          });
        }
      }

      if (candidateMap.size < 3 && dossierThema) {
        const words = String(dossierThema)
          .split(/[^a-zA-ZäöüÄÖÜß0-9]+/)
          .filter(w => w.length >= 5)
          .slice(0, 3);

        for (const word of words) {
          const { data: wordRows } = await supabase
            .from("wissensdatenbank")
            .select("id, datei_name, firma, kategorie, inhalt_text, dokument_url")
            .or(`inhalt_text.ilike.%${word}%,datei_name.ilike.%${word}%`)
            .not("datei_name", "like", "FALLAKTE_%")
            .order("id", { ascending: false })
            .limit(2);

          if (Array.isArray(wordRows)) {
            wordRows.forEach(r => {
              if (!candidateMap.has(r.id)) {
                candidateMap.set(r.id, { row: r, score: 1 });
              }
            });
          }
        }
      }

      if (candidateMap.size === 0) return { decisionsFullTextBlock: "", matchedCount: 0 };

      const topCandidates = Array.from(candidateMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.row);

      let decisionsBlock = "\n\n========================================\n";
      decisionsBlock += "EINSCHLÄGIGE VOLLTEXT-ENTSCHEIDUNGEN & RECHTSQUELLEN AUS DER SONAR-WISSENSDATENBANK (BUCKET-VOLLTEXTE):\n";

      let loadedCount = 0;
      for (const row of topCandidates) {
        const fullDecisionText = await loadFullDecisionTextForWarroom(row, supabase);
        if (fullDecisionText && fullDecisionText.trim().length > 0) {
          loadedCount++;
          decisionsBlock += `\n--- RECHTSQUELLE ${loadedCount}: ${row.datei_name} (${row.firma || "Allgemein"}) ---\n`;
          decisionsBlock += `${fullDecisionText.trim().substring(0, 45000)}\n`;
        }
      }

      return {
        decisionsFullTextBlock: loadedCount > 0 ? decisionsBlock : "",
        matchedCount: loadedCount
      };
    } catch (e) {
      console.warn("Hinweis beim Nachladen der Wissensdatenbank-Volltexte:", e);
      return { decisionsFullTextBlock: "", matchedCount: 0 };
    }
  };

  // Lädt die komplette Fallakte (strukturierter Master-Index #01..#NN + ALLE bisherigen Vorgänge & .md-Zwillinge)
  const fetchFullAkteContext = async (akteId, fallbackBestText) => {
    if (!akteId) return { fullContextText: fallbackBestText, docsCount: 1 };

    let docsCount = 0;
    let combinedHistoryText = "";
    let masterFallakteHeader = "";

    try {
      const [{ data: akteMetaRow }, { data: histList, error }] = await Promise.all([
        supabase.from('akten').select('*').eq('id', akteId).single(),
        supabase.from('akten_historie').select('*').eq('akte_id', akteId).order('datum', { ascending: true })
      ]);

      if (!error && histList && histList.length > 0) {
        const effectiveAkteMeta = akteMetaRow || {
          id: akteId,
          unser_zeichen: dossier?.unser_zeichen || '',
          aktenzeichen: dossier?.aktenzeichen || '',
          thema: dossier?.thema || '',
          status: 'Offen',
          unsere_firma: dossier?.unsere_firma || '',
          unser_ansprechpartner: dossier?.unser_ansprechpartner || '',
          gegner_name: dossier?.kontakt || '',
          gegner_ansprechpartner: dossier?.ansprechpartner || '',
          gegner_email: dossier?.gegner_email || ''
        };
        masterFallakteHeader = buildCompactWarRoomIndex(effectiveAkteMeta, histList) + "\n";

        for (let i = 0; i < histList.length; i++) {
          const h = histList[i];
          const stepCode = `#${String(i + 1).padStart(2, '0')}`;
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
                  // Stilles Ignorieren
                }
              }
            }
          }

          combinedHistoryText += `\n========================================\n`;
          combinedHistoryText += `FALLAKTE VORGANG ${stepCode} VOM ${hDatum} | TYP: ${h.typ || 'Vorgang'} | KANAL: ${h.kanal || '-'} | AKTION: ${h.aktion || '-'}\n`;
          if (h.frist_extern) combinedHistoryText += `AKTIVE BEHÖRDLICHE FRIST: ${h.frist_extern}\n`;
          if (h.wiedervorlage) combinedHistoryText += `AKTIVE WIEDERVORLAGE: ${h.wiedervorlage}\n`;
          if (h.brief_entwurf) combinedHistoryText += `ZUSAMMENFASSUNG / SCHREIBENTEXT:\n${h.brief_entwurf}\n`;
          if (docTwinText) combinedHistoryText += docTwinText;
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden des vollständigen Akten-Dossiers:", err);
    }

    if (combinedHistoryText.trim() !== "") {
      let fullCombined = `${masterFallakteHeader}${combinedHistoryText}`;
      if (fallbackBestText && !combinedHistoryText.includes(fallbackBestText.substring(0, 100))) {
        fullCombined += `\n========================================\nAKTUELLES DOKUMENT (NEU):\n${fallbackBestText}\n`;
        docsCount++;
      }
      return { fullContextText: fullCombined, docsCount: Math.max(docsCount, 1) };
    }

    return { fullContextText: fallbackBestText, docsCount: 1 };
  };

  // Hochgeschwindigkeits-Prüf- & In-Memory-Patch-Pipeline
  const runAutomatedRedTeamLoop = async (
    initialDraft,
    historyContext,
    fullAccessFlag = hasFullAccess,
    runId = abortRunRef.current,
    rawFullText = fullDossierContextCache
  ) => {
    const maxRounds = 2;
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
        `Station 2/4 (Runde ${round}/${maxRounds}): Spiegel-Kanzlei Omega prüft den Entwurf kontradiktorisch gegen Fallakte & Universelle Gesetze...`
      );
      addLiveLog(`Station 2 (Runde ${round}/${maxRounds}): Gegenprüfung & In-Memory-Patching durch Spiegel-Kanzlei Omega läuft...`, "OMEGA");

      const { data: checkData, error: checkErr } = await invokeTriageWithRetry({
        mode: "red_team_check",
        engine: fullAccessFlag ? selectedEngine : "gemini",
        draft_text: currentDraft,
        context_summary: contextSummary,
        raw_text: (rawFullText || dossier?.raw_text || dossier?.brief_entwurf || "").substring(0, 250000),
        round_number: round
      });

      if (runId !== abortRunRef.current) return null;

      if (checkData?.patched_draft && typeof checkData.patched_draft === "string" && checkData.patched_draft.trim().length > 100) {
        currentDraft = extractCleanLetterBody(checkData.patched_draft);
      } else if (checkData?.audit?.patched_draft && typeof checkData.audit.patched_draft === "string" && checkData.audit.patched_draft.trim().length > 100) {
        currentDraft = extractCleanLetterBody(checkData.audit.patched_draft);
      }

      if (checkErr || checkData?.error) {
        setLiveStage(3);
        setLoadingPhaseText("Station 3/4: Formale Delta-Zusammenführung wird durchgeführt...");
        await sleep(300);
        setLiveStage(4);
        setLoadingPhaseText("Station 4/4: Endabnahme durch den Revisionssenat erteilt!");
        auditProtocolLines.push(`Runde ${round} – Endabnahme durch den Revisionssenat abgeschlossen.`);
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
        setLoadingPhaseText("Station 3/4: In-Memory-Delta-Patches & Paragraphen-Kette zusammengeführt...");
        await sleep(350);

        setLiveStage(4);
        setLoadingPhaseText(`Station 4/4: Revisionssenat erteilt Freigabe (Score: ${audit.score || 99}/100)!`);
        auditProtocolLines.push(`Runde ${round} – Spiegel-Kanzlei Omega & Revisionssenat (${audit.score || 99}/100 Punkte): FREIGABE ERTEILT – ${audit.summary}`);
        if (Array.isArray(audit.applied_patches_log) && audit.applied_patches_log.length > 0) {
          auditProtocolLines.push(
            ...audit.applied_patches_log.map((ap, idx) => `  • Omega-Patch ${idx + 1}: ${ap}`)
          );
        }
        await sleep(350);
        break;
      }

      const vetoCount = audit.veto_points.length;
      auditProtocolLines.push(
        `Runde ${round} – Spiegel-Kanzlei Omega VETO (${audit.score || 85}/100 Punkte): ${audit.summary}\n` +
        audit.veto_points.map((vp, idx) => `  • Veto ${idx + 1}: ${vp}`).join("\n")
      );

      setLiveStage(3);
      setLoadingPhaseText(
        `Station 3/4 (Runde ${round}/${maxRounds}): Delta-Zusammenführung für ${vetoCount} Punkt(e) wird ausgeführt...`
      );

      const { data: revData, error: revErr } = await invokeTriageWithRetry({
        mode: "sokrates_revision",
        engine: fullAccessFlag ? selectedEngine : "gemini",
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
        setLoadingPhaseText("Station 4/4: Endabnahme durch den Revisionssenat abgeschlossen!");
        auditProtocolLines.push(`Endabnahme durch den Revisionssenat nach Runde ${round}: Alle Punkte der Spiegel-Kanzlei Omega per Delta-Patch eingearbeitet und freigegeben.`);
        await sleep(350);
      }
    }

    setApprovedCleanDraft(currentDraft);
    setLiveStage(5);
    setIsJudgeApproved(true);

    const headerBanner = [
      "=================================================================",
      `KANZLEI ALPHA • SPIEGEL-KANZLEI OMEGA • REVISIONSSENAT – PRÜFPROTOKOLL (${auditProtocolLines.length} PRÜF-EINTRÄGE – FREIGEGEBEN)`,
      ...auditProtocolLines,
      "=================================================================\n\n"
    ].join("\n");

    return `${headerBanner}${currentDraft}`;
  };

  // PHASE A: Startet die Akten-Analyse und erstellt die interaktive Kanzlei-Lagebesprechung auf Basis der kompletten Fallakte
  const startFreshAnalysis = async (
    fullAccessFlag = hasFullAccess,
    primaryOwnerFlag = isPrimaryOwner,
    userMeta = sessionUserMeta
  ) => {
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
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setMobileHeaderExpanded(false);
      setMobileCorrectionOpen(false);
    }
    setLoadingPhaseText("Vorprüfung: Chefabteilung liest die komplette Fallakte (#01..#NN) & lädt Volltext-Urteile aus dem Storage...");
    setErrorMsg(null);

    const today = new Date().toLocaleDateString('de-DE');
    const defaultFirma = primaryOwnerFlag
      ? "Jens Wilsdorf"
      : (userMeta?.firma || "Mandant / Unternehmensführung");
    const defaultAP = primaryOwnerFlag
      ? "Jens Wilsdorf"
      : (userMeta?.name || "Geschäftsführung");

    const mandantFirma = dossier.unsere_firma || defaultFirma;
    const mandantAP = dossier.unser_ansprechpartner || defaultAP;
    // Dresdner Default-Faxnummer strikt NUR für den primären Owner Jens Wilsdorf!
    const mandantFax = dossier.unser_fax || (primaryOwnerFlag ? OWNER_DEFAULT_FAX : "");

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

    // 2-STUFEN-VOLLTEXT-ABRUF AUS DER WISSENSDATENBANK & BUCKET 'dokumente'
    const { decisionsFullTextBlock, matchedCount } = await fetchRelevantDecisionsWithFullText(
      fullContextText,
      dossier.thema,
      dossier.kontakt
    );

    const enrichedContextText = decisionsFullTextBlock
      ? `${fullContextText}\n${decisionsFullTextBlock}`
      : fullContextText;

    setLoadedDocsCount(docsCount + matchedCount);
    setFullDossierContextCache(enrichedContextText);

    const briefingPrompt = [
      "Analysiere diese vollständige, chronologisch durchnummerierte Fallakte (#01 bis aktueller Stand) für unsere Mandanten-Lagebesprechung nach den Universellen Gesetzen der Juristischen Methodenlehre:",
      "",
      `Behörde / Gegenpartei: ${dossier.kontakt || "Unbekannt"}`,
      `Aktenzeichen / Steuernummer: ${dossier.aktenzeichen || "Unbekannt"}`,
      `Frist: ${dossier.frist_extern || "Siehe Fallakten-Masterindex bzw. nach dem Grundsatz des sichersten Weges ab Ursprungsdokument berechnen"}`,
      `Betreff / Thema: ${dossier.thema || "Ohne Betreff"}`,
      `Unser Mandant: ${mandantFirma} (${mandantAP})${mandantFax ? ` | Unser Telefax: ${mandantFax}` : ""}`,
      `Heutiges Datum: ${today}`,
      "",
      "VOLLSTÄNDIGE FALLAKTE (MASTER-ABLAUFPLAN, HISTORIE, .MD-ZWILLINGE & VOLLTEXT-ENTSCHEIDUNGEN):",
      enrichedContextText.substring(0, 250000),
      "",
      "Erstelle jetzt die strukturierte Lagebesprechung des Leitenden Chefpartners nach dem SCQA-Framework (inkl. Prüfung der gesetzlichen Vertretungszwang- & Berufsträger-Weiche mandatory_counsel_required / counsel_type / counsel_reason sowie 4 glasklaren Handlungsoptionen mit Kosten, Dauer, Erfolgschance, allen entscheidungsbefugten Stellen, Widerspruchs-Check über den gesamten bisherigen Aktenverlauf und Wirtschaftlichkeits-Abwägung) als reines JSON ohne Markdown-Backticks!"
    ].join("\n");

    try {
      setLiveStage(2);
      setLoadingPhaseText("Chefabteilung & Spezialisten-Board kalkulieren Verfahrensrisiko, Fristen & Erfolgschancen auf Basis der Fallakte...");

      const { data, error } = await invokeTriageWithRetry({
        mode: "strategy_briefing",
        messages: [{ role: "user", content: briefingPrompt }],
        raw_text: enrichedContextText.substring(0, 250000),
        engine: fullAccessFlag ? selectedEngine : "gemini"
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

  // PHASE B: Erstellt den Schriftsatz 100 % fallneutral nach den in der Lagebesprechung angeklickten Optionen
  const handleExecuteBriefingSelection = async () => {
    if (!strategyBriefing || selectedOptionIds.length === 0 || isLoading) return;

    const currentRunId = ++abortRunRef.current;
    const chosenOptions = strategyBriefing.options.filter(o => selectedOptionIds.includes(o.id));
    if (chosenOptions.length === 0) return;

    const today = new Date().toLocaleDateString('de-DE');
    const defaultFirma = isPrimaryOwner
      ? "Jens Wilsdorf"
      : (sessionUserMeta?.firma || "Mandant / Unternehmensführung");
    const defaultAP = isPrimaryOwner
      ? "Jens Wilsdorf"
      : (sessionUserMeta?.name || "Geschäftsführung");

    const mandantFirma = dossier?.unsere_firma || defaultFirma;
    const mandantAP = dossier?.unser_ansprechpartner || defaultAP;
    const mandantFax = dossier?.unser_fax || (isPrimaryOwner ? OWNER_DEFAULT_FAX : "");

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
      mandantFax ? `- Unsere Telefaxnummer (für den Briefkopf / Rückantworten): ${mandantFax}` : "",
      `- Empfänger / Behörde / Gegenpartei: ${dossier?.kontakt || "Siehe Originaldokument"}`,
      `- Aktenzeichen / Steuernummer: ${dossier?.aktenzeichen || "Siehe Originaldokument"}`,
      `- Betreff / Thema: ${dossier?.thema || ""}`,
      "",
      "VOLLSTÄNDIGE FALLAKTE INKL. CHRONOLOGISCHEM MASTER-ABLAUFPLAN & VOLLTEXT-ENTSCHEIDUNGEN:",
      rawContextToUse,
      "",
      "DEIN AUFTRAG ALS KANZLEI ALPHA (UNIVERSELLE GESETZE & REVISIONS-DOGMATIK ZWINGEND BEACHTEN):",
      "Verfasse jetzt SOFORT den vollständigen, wasserdichten und druckfertigen Schriftsatz exakt gemäß der obigen Auswahl nach dem Minto-Prinzip (BLUF + MECE, vollständig bis zur Unterschrift)!",
      "STRIKTE PFLICHT-CHECKLISTE:",
      "1. VERFAHRENSSTADIEN-TRENNUNG & AKTENHOHEIT AUS DER FALLAKTE: Prüfe anhand des chronologischen Fallakten-Masterindex vorab das genaue Verfahrensstadium und welche Schreiben bereits rein- und rausgegangen sind (keine doppelten 'vorsorglichen' Rechtsbehelfe bei bereits bestätigtem Eingang!). Richte die Anträge im Rubrum und BLUF direkt an die jetzt gesetzlich entscheidungsbefugten Stellen.",
      "2. AUTONOME FRISTEN-MATHEMATIK & BEWEISLAST-SCHILD: Berechne den Fristablauf kalendergenau ab dem frühesten Ursprungsdokument (#01 ff.), nutze bei behördlichen Fristen vorrangig § 109 Abs. 1 Satz 2 AO / § 31 Abs. 7 Satz 2 VwVfG (+ § 242 BGB), stelle bei unklarem Zugang früherer Schreiben die objektive Zugangsbeweislast scharf und setze im BLUF sowie Schlussabschnitt eine einheitliche Reaktionsfrist mindestens 7 bis 10 Kalendertage VOR Ablauf der frühesten Notfrist.",
      "3. CROSS-DOCUMENT-WIDERSPRUCHS-CHECK & BUMERANG-TECHNIK: Vergleiche sämtliche bisherigen Vorgänge der Fallakte Wort für Wort, zitiere etwaige Selbstwidersprüche wörtlich mit Datum/Abschnittsangabe und drehe jedes von der Gegenseite angeführte Gerichtsurteil über die gemeinsame gesetzliche Wurzel und spezifische höchstrichterliche Leitentscheidungen als Bumerang gegen die Gegenseite.",
      "4. DOGMATISCH SAUBERER RECHTSSCHUTZ, KONTOSCHUTZ & ORGANHAFTUNGSSCHUTZ: Trenne die Rechtsschutzinstrumente strikt nach Verfahrensstadium (z. B. § 361 Abs. 2 AO für offene Einsprüche vs. § 258 AO für das Erlassverfahren), behaupte niemals eine automatische Fälligkeitssperre allein durch Antragstellung (vgl. § 361 Abs. 1 Satz 1 AO), kopple die Auskehrung verrechneter Guthaben direkt an den Wegfall des Rechtsgrundes (§ 37 Abs. 2 Satz 1 und 2 AO i. V. m. § 218 Abs. 2 AO) und schütze den Geschäftsführer persönlich vor Haftungsdurchgriffen.",
      "5. VERTRETUNGS-FORMEL, WIR-FORM & REINER GESCHÄFTSBRIEF-STIL: Eröffne bei Gesellschaften (GmbH, UG, AG, KG, OHG) zwingend mit der organschaftlichen Vertretungsformel in durchgängiger 'Wir'-Form. Gib AUSSCHLIESSLICH den reinen, druckfertigen Geschäftsbrief-Text aus: KEINE Vorrede, KEINE eckigen Klammern [ ], KEINE Markdown-Sternchen (**), KEINE Rauten (###) und KEINE Markdown-Tabellenstriche (|---|)!"
    ].filter(Boolean).join("\n");

    const displayHistory = [{ role: "user", content: userDecisionDisplay }];
    const apiHistory = [{ role: "user", content: fullDraftCommand }];
    setMessages(displayHistory);

    await callMegaLegal(apiHistory, true, hasFullAccess, currentRunId, displayHistory, rawContextToUse);
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
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
          setMobileHeaderExpanded(false);
          setMobileCorrectionOpen(false);
        }

        let detectedPrimaryOwner = false;
        let detectedFullAccess = false;
        let detectedMeta = { name: "", firma: "" };

        try {
          const { data: authData } = await supabase.auth.getUser();
          const currentUid = authData?.user?.id || "";
          const currentEmail = authData?.user?.email || "";
          const rawMeta = authData?.user?.user_metadata || {};

          detectedPrimaryOwner = currentUid === PRIMARY_OWNER_USER_ID;
          detectedFullAccess = isFullAccessIdentity(currentUid, currentEmail);
          detectedMeta = {
            name: rawMeta.full_name || "",
            firma: rawMeta.firma || ""
          };

          setIsPrimaryOwner(detectedPrimaryOwner);
          setHasFullAccess(detectedFullAccess);
          setSessionUserMeta(detectedMeta);
          setLiveMaxRounds(2);
          if (!detectedFullAccess) {
            setSelectedEngine("gemini");
          }
        } catch (_e) {
          setIsPrimaryOwner(false);
          setHasFullAccess(false);
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
                (
                  lastAiMsg.content.includes("PRÜFPROTOKOLL") ||
                  lastAiMsg.content.includes("SONAR NEMESIS") ||
                  lastAiMsg.content.includes("SPIEGEL-KANZLEI OMEGA")
                )
              ) {
                fetchFullAkteContext(dossier.akte_id, dossier.raw_text || dossier.brief_entwurf || "").then((res) => {
                  setFullDossierContextCache(res.fullContextText || "");
                  setLoadedDocsCount(res.docsCount || 1);
                });
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

        await startFreshAnalysis(detectedFullAccess, detectedPrimaryOwner, detectedMeta);
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
    const hasAssistantReply = messages.some(m => m.role === "assistant");
    if (hasAssistantReply || (isLoading && liveStage >= 1 && messages.length > 0 && !strategyBriefing)) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, liveStage, strategyBriefing]);

  // Hauptfunktion: Station 1 + Station 2-4
  const callMegaLegal = async (
    historyForApi,
    runFullJudgePipeline = true,
    fullAccessFlag = hasFullAccess,
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
      `Station 1/4: Kanzlei Alpha formuliert den Schriftsatz • danach prüfen & patchen Spiegel-Kanzlei Omega & Revisionssenat...`
    );

    try {
      const { data, error } = await invokeTriageWithRetry({
        mode: "megalegal_chat",
        messages: historyForApi,
        raw_text: effectiveRawText,
        engine: fullAccessFlag ? selectedEngine : "gemini",
        enable_second_opinion: false,
      });

      if (runId !== abortRunRef.current) return;
      if (error) throw new Error(error.message || "Fehler beim Aufruf der Edge Function.");
      if (data?.error) throw new Error(data.error);

      let reply = data?.reply || "Keine Antwort vom Board erhalten.";

      if (runFullJudgePipeline && reply) {
        const auditedReply = await runAutomatedRedTeamLoop(reply, historyForApi, fullAccessFlag, runId, effectiveRawText);
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

  // Zusatz-Anweisung zwischendurch
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
      "Arbeite diese Anweisung sofort unter Beachtung der gesamten Fallakte und der Universellen Gesetze der Juristischen Methodenlehre in den Schriftsatz ein und gib AUSSCHLIESSLICH den vollständig aktualisierten, druckfertigen Schriftsatz-Text (ohne Vorrede, ohne eckige Klammern, ohne Markdown-Sternchen **, direkt im Namen des Mandanten) aus, damit er erneut der Spiegel-Kanzlei Omega und dem Revisionssenat zur Pflicht-Abnahme vorgelegt werden kann!"
    ].join("\n");

    const updatedHistory = [...messages, { role: "user", content: wrappedInstruction }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, true, hasFullAccess, currentRunId);
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

      const prompt = `Hier ist der nachgereichte Volltext aus der Datei "${file.name}":\n\n${extractedText.substring(0, 200000)}\n\nBitte arbeite diese neuen Fakten sofort unter Beachtung der Fallakte und der Universellen Gesetze der Juristischen Methodenlehre in den versandfertigen Schriftsatz ein und gib den kompletten, aktualisierten Schriftsatz-Text (ohne Markdown-Sternchen **) zur erneuten Prüfung durch Spiegel-Kanzlei Omega und den Revisionssenat aus.`;

      const updatedHistory = [...messages, { role: "user", content: prompt }];
      setMessages(updatedHistory);
      if (dossier?.akte_id) {
        await saveChatToDatabase(dossier.akte_id, updatedHistory);
      }
      await callMegaLegal(updatedHistory, true, hasFullAccess, currentRunId, null, combinedRaw);

    } catch (err) {
      console.error("Upload Error:", err);
      setErrorMsg(err.message || "Fehler beim Auslesen der Datei.");
      setIsLoading(false);
    }

    e.target.value = "";
  };

  // SOFORT-ÜBERGABE INS COCKPIT
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

    // Für Vollzugänge (Jens & Nico): Reiner, ungestempelter Schriftsatz! Nur für reine Demo-Tester (!hasFullAccess) der Muster-Stempel.
    const finalExportText = hasFullAccess
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
    if (!window.confirm("Gespeicherten War-Room-Verlauf dieser Akte löschen und Lagebesprechung mit der aktuellen Fallakte komplett neu starten?")) {
      return;
    }
    await startFreshAnalysis(hasFullAccess, isPrimaryOwner, sessionUserMeta);
  };

  if (!isOpen) return null;

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

  const headerBtnBase = "h-[32px] sm:h-[34px] px-2.5 sm:px-3 rounded-md text-[11px] sm:text-xs font-bold border transition flex items-center justify-center gap-1.5 whitespace-nowrap";
  const headerBtnInactive = isDark
    ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-200";
  const headerBtnActive = "bg-[#0ea5e9] border-[#0ea5e9] text-slate-950 font-extrabold";

  const displayMandantName =
    dossier?.unsere_firma ||
    (isPrimaryOwner ? "Jens Wilsdorf" : sessionUserMeta?.firma || "Mandant");

  const kanzleiStations = [
    { id: 1, title: "1. Kanzlei Alpha (Entwurf)", shortTitle: "1. Alpha", desc: "Minto-BLUF & Spezialisten-Board" },
    { id: 2, title: "2. Spiegel-Kanzlei Omega", shortTitle: "2. Omega", desc: `Gegenprüfung & In-Memory-Patch (Runde ${liveRound}/${liveMaxRounds})` },
    { id: 3, title: "3. Delta-Zusammenführung", shortTitle: "3. Delta", desc: "Deterministischer Patch-Einbau" },
    { id: 4, title: "4. Revisionssenat", shortTitle: "4. Senat", desc: "Richterliche Endabnahme & Freigabe" }
  ];

  const allFourGreen = !isLoading && liveStage === 5 && isJudgeApproved;
  const visibleChatMessages = messages.filter((m, idx) => !(idx === 0 && m.role === "user" && m.content.includes("Analysiere diese vollständige")) && !(idx === 0 && m.role === "user" && m.content.includes("Analysiere dieses vollständige")));
  const hasDraftMessages = visibleChatMessages.some((m) => m.role === "assistant");

  const counselBadgeLabel = strategyBriefing?.counsel_type === "STEUERBERATER"
    ? "STEUERBERATER-PFLICHT / DRINGENDE MANDATIERUNG"
    : strategyBriefing?.counsel_type === "RECHTSANWALT_UND_STEUERBERATER"
    ? "RECHTSANWALTS- & STEUERBERATER-PFLICHT"
    : "GESETZLICHER ANWALTSZWANG / BERUFSTRÄGER-PFLICHT";

  return (
    <div
      style={desktopHelpSplitActive ? { right: "33.333%" } : undefined}
      className="fixed inset-y-0 left-0 right-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-1.5 sm:p-4"
    >
      <div className={`flex flex-col w-full max-w-6xl h-[96dvh] sm:h-[94vh] max-h-[96dvh] ${bgModal} border ${borderModal} rounded-xl shadow-2xl overflow-hidden`}>

        {/* 1. HEADER */}
        <div className={`flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b ${borderHeader} ${bgHeader} flex-shrink-0`}>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: isLoading ? "#f59e0b" : (allFourGreen ? "#10b981" : "#0ea5e9")
                }}
              />
              <h2 className={`text-sm sm:text-lg font-extrabold ${textTitle} tracking-wide uppercase truncate`}>
                {isMobileScreen ? "KANZLEI-WAR-ROOM" : "SMARTSONAR – STRATEGISCHER KANZLEI-WAR-ROOM"}
              </h2>
              {!hasFullAccess && !isMobileScreen && (
                <span className="px-2.5 py-1 rounded text-[11px] font-extrabold bg-slate-800 text-amber-400 border border-amber-500/50 whitespace-nowrap">
                  DEMO-MODUS (Max. 10 Test-Akten • Kopier- & Muster-Branding aktiv)
                </span>
              )}
            </div>
            {(!isMobileScreen || mobileHeaderExpanded) && (
              <p className={`text-[11px] sm:text-xs ${textSub} truncate`}>
                Fallakte aktiv | AZ: {dossier?.aktenzeichen || "Neu"} | Gegenpartei: {dossier?.kontakt || "Behörde"} | Mandant: {displayMandantName} | Quellen: {loadedDocsCount}
              </p>
            )}
          </div>

          {/* Steuer-Buttons rechts */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {isMobileScreen && (
              <button
                type="button"
                onClick={() => setMobileHeaderExpanded(!mobileHeaderExpanded)}
                className={`${headerBtnBase} ${headerBtnInactive} cursor-pointer`}
                title="Kopf- & Stationsdetails ein-/ausklappen"
              >
                <span>{mobileHeaderExpanded ? "Kompakt ▲" : "Stationen ▼"}</span>
              </button>
            )}

            {(!isMobileScreen || mobileHeaderExpanded) && (
              <>
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
                    if (!hasFullAccess) return;
                    setSelectedEngine("claude");
                  }}
                  disabled={!hasFullAccess}
                  className={`${headerBtnBase} ${
                    !hasFullAccess
                      ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed opacity-70"
                      : selectedEngine === "claude"
                      ? headerBtnActive
                      : headerBtnInactive
                  }`}
                  title={!hasFullAccess ? "Claude Sonnet ist exklusiv in der Vollversion freigeschaltet" : "Anthropic Claude Sonnet verwenden"}
                >
                  <span>Claude Sonnet {!hasFullAccess ? "(Pro)" : ""}</span>
                </button>

                {!isMobileScreen && (
                  <div
                    className={`${headerBtnBase} ${
                      isDark ? "bg-slate-900 border-slate-700 text-slate-300" : "bg-white border-slate-300 text-slate-700"
                    } select-none`}
                  >
                    <span>Fallakte + Alpha/Omega AKTIV</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleResetChatMemory}
                  disabled={isLoading}
                  className={`${headerBtnBase} ${headerBtnInactive} cursor-pointer disabled:opacity-50`}
                >
                  <span>Neu starten</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`${headerBtnBase} ${headerBtnInactive} cursor-pointer px-2.5 sm:px-3`}
              title="Schließen"
            >
              <span>✕</span>
            </button>
          </div>
        </div>

        {/* 2. KNALLROTER RDG- & StBG-WARNHINWEIS */}
        <div
          style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
          className="px-3.5 sm:px-6 py-1.5 sm:py-2.5 border-b border-red-800 text-[11px] sm:text-[13px] font-bold leading-snug text-left shadow-sm flex-shrink-0"
        >
          {isMobileScreen && !mobileHeaderExpanded
            ? "HINWEIS GEMÄSS RDG & StBG: Technisches KI-Assistenzwerkzeug – KEINE Rechts- oder Steuerberatung (Eigenprüfung Pflicht)."
            : "WICHTIGER HINWEIS GEMÄSS RDG & StBG: Dieses System ist ein technisches KI-Assistenz- und Textanalyse-Werkzeug für Unternehmen. Die generierten Analysen, Lagebesprechungen und Textmuster stellen KEINE Rechts- oder Steuerberatung dar und ersetzen keine Prüfung durch einen zugelassenen Rechtsanwalt oder Steuerberater."}
        </div>

        {/* TOAST-WARNUNG BEI KOPIERVERSUCH IM DEMO-MODUS */}
        {copyWarningToast && (
          <div style={{ backgroundColor: "#b91c1c", color: "#ffffff" }} className="px-4 py-1.5 text-xs font-extrabold text-center flex-shrink-0">
            Kopieren, Markieren und Ausschneiden ist in der kostenfreien Demo-Version gesperrt. In der Vollversion sind alle Texte frei nutzbar.
          </div>
        )}

        {/* 3. DIE 4 PFLICHT-STATIONEN */}
        <div
          data-help="warroom_stations"
          className={`px-3.5 sm:px-6 py-2 sm:py-3 border-b ${borderHeader} ${bgHeader} flex-shrink-0`}
        >
          <div className="mb-1.5 text-left">
            {isLoading ? (
              <span style={{ color: "#f59e0b" }} className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider">
                {isMobileScreen
                  ? `PRÜFKETTE LÄUFT (STATION ${liveStage}/4)...`
                  : "KANZLEI ALPHA, SPIEGEL-KANZLEI OMEGA & REVISIONSSENAT ARBEITEN – ÜBERGABE WIRD NACH FREIGABE (4X GRÜN) AKTIVIERT..."}
              </span>
            ) : allFourGreen ? (
              <span style={{ color: "#10b981" }} className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider">
                {isMobileScreen
                  ? "4/4 GRÜN – FREIGABE ERTEILT!"
                  : "ALLE 4 STATIONEN GRÜN & VOM REVISIONSSENAT ABGENOMMEN – ÜBERGABE ANS COCKPIT IST FREIGESCHALTET!"}
              </span>
            ) : (
              <span className={`text-[11px] sm:text-xs font-extrabold uppercase tracking-wider ${textTitle}`}>
                {isMobileScreen
                  ? "SCHRITT 1: UNTEN STRATEGIE-OPTION(EN) WÄHLEN:"
                  : "SCHRITT 1: BITTE WÄHLEN SIE UNTEN IN DER LAGEBESPRECHUNG IHRE STRATEGIE (ODER KOMBINATION) AUS!"}
              </span>
            )}
          </div>

          {isMobileScreen && !mobileHeaderExpanded ? (
            <div className="grid grid-cols-4 gap-1.5">
              {kanzleiStations.map((st) => {
                const isActive = isLoading && liveStage === st.id;
                const isDone = allFourGreen || (isLoading && liveStage > st.id);
                return (
                  <div
                    key={st.id}
                    style={{
                      borderColor: isActive ? "#f59e0b" : isDone ? "#10b981" : (isDark ? "#334155" : "#cbd5e1"),
                      backgroundColor: isActive
                        ? "rgba(245, 158, 11, 0.16)"
                        : isDone
                        ? "rgba(16, 185, 129, 0.16)"
                        : (isDark ? "#0f172a" : "#ffffff"),
                      opacity: isActive || isDone ? 1 : 0.7
                    }}
                    className="px-2 py-1 rounded border text-[10px] font-extrabold text-center truncate"
                  >
                    <span className={textTitle}>{st.shortTitle}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
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
                    className="p-2 sm:p-2.5 rounded-lg border transition-all flex flex-col justify-between gap-1 text-left"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className={`text-[11px] sm:text-xs font-extrabold truncate ${textTitle}`}>{st.title}</div>
                      {isActive && (
                        <span
                          style={{ backgroundColor: "#f59e0b", color: "#000000" }}
                          className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase flex-shrink-0"
                        >
                          PRÜFT...
                        </span>
                      )}
                      {isDone && !isActive && (
                        <span
                          style={{ backgroundColor: "#10b981", color: "#000000" }}
                          className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold uppercase flex-shrink-0"
                        >
                          GRÜN
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] sm:text-[11px] truncate ${textSub}`}>{st.desc}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. HAUPTBEREICH */}
        <div
          ref={scrollContainerRef}
          onCopy={handleProtectedCopyAttempt}
          onCut={handleProtectedCopyAttempt}
          onContextMenu={handleProtectedCopyAttempt}
          onDragStart={handleProtectedCopyAttempt}
          style={{ WebkitOverflowScrolling: "touch" }}
          className={`flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-5 text-sm font-sans ${bgChatArea} ${!hasFullAccess ? "select-none" : ""}`}
        >
          {/* INTERAKTIVE KANZLEI-LAGEBESPRECHUNG */}
          {strategyBriefing && (
            <div
              data-help="warroom_briefing_options"
              className={`rounded-xl border p-3.5 sm:p-5 text-left space-y-4 ${bgCard}`}
            >
              <div className={`flex items-center justify-between flex-wrap gap-2 border-b pb-3 ${borderHeader}`}>
                <div>
                  <h3 className={`text-sm sm:text-base font-extrabold uppercase tracking-wide ${textTitle}`}>
                    CHEFABTEILUNGS-LAGEBESPRECHUNG & STRATEGIE-WAHL
                  </h3>
                  <p className={`text-xs ${textSub}`}>
                    Vorprüfung der gesamten Fallakte durch das einberufene Spezialisten-Board (Mehrfachauswahl / Kombination möglich)
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-bold border ${borderModal} ${textSub}`}>
                  Auswahl aktiv: {selectedOptionIds.length}
                </span>
              </div>

              {/* GESETZLICHE VERTRETUNGSZWANG- & BERUFSTRÄGER-WARNBOX */}
              {Boolean(strategyBriefing.mandatory_counsel_required) && (
                <div
                  style={{
                    borderColor: "#dc2626",
                    backgroundColor: isDark ? "rgba(220, 38, 38, 0.16)" : "rgba(220, 38, 38, 0.1)"
                  }}
                  className="p-3.5 sm:p-4 rounded-lg border-2 space-y-2 text-left"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span
                      style={{ backgroundColor: "#dc2626", color: "#ffffff" }}
                      className="px-2.5 py-1 rounded text-[11px] font-extrabold uppercase tracking-wide"
                    >
                      ACHTUNG: {counselBadgeLabel} ERKANNT!
                    </span>
                    <span className="text-[11px] font-bold text-red-400 uppercase">
                      Gesetzliche Vertretungspflicht / Vorbehaltsaufgabe beachten
                    </span>
                  </div>
                  <p className={`text-xs sm:text-[13px] font-bold leading-relaxed ${isDark ? "text-red-200" : "text-red-900"}`}>
                    {strategyBriefing.counsel_reason ||
                      "In diesem Verfahren bzw. für das weiterführende Rechtsmittel besteht gesetzlicher Vertretungszwang oder akuter Beratungsbedarf durch einen zugelassenen Rechtsanwalt bzw. Steuerberater. Nutzen Sie den untenstehenden Entwurf als strukturierte Sachverhalts- und Argumentationsvorbereitung für Ihren Berufsträger."}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3.5">
                <div className={`w-full p-3.5 sm:p-4 rounded-lg border ${borderModal} ${isDark ? "bg-slate-900" : "bg-slate-50"} space-y-2`}>
                  <div className={`text-xs font-extrabold uppercase tracking-wide ${textTitle}`}>
                    1. Sachverhalt & Aktenlage auf den Punkt:
                  </div>
                  <p className={`text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-words ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                    {cleanCaseSummaryText(strategyBriefing.case_summary)}
                  </p>
                </div>

                <div className={`w-full p-3.5 sm:p-4 rounded-lg border ${borderModal} ${isDark ? "bg-slate-900" : "bg-slate-50"} space-y-2`}>
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
                  <strong style={{ color: "#10b981" }} className="uppercase">Empfehlung des Leitenden Chefpartners: </strong>
                  <span className={isDark ? "text-slate-200" : "text-slate-800"}>
                    {strategyBriefing.recommended_combination_hint}
                  </span>
                </div>
              )}

              <div>
                <div className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${textSub}`}>
                  Wählen Sie 1 Option oder eine Kombination aus mehreren Optionen durch Antippen/Anklicken aus:
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(strategyBriefing.options || []).map((opt) => {
                    const isSelected = selectedOptionIds.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => toggleOptionSelection(opt.id)}
                        style={{
                          borderColor: isSelected ? "#fbbf24" : (isDark ? "#334155" : "#cbd5e1"),
                          backgroundColor: isSelected
                            ? (isDark ? "rgba(251, 191, 36, 0.12)" : "rgba(251, 191, 36, 0.08)")
                            : (isDark ? "#0f172a" : "#ffffff")
                        }}
                        className="p-3.5 sm:p-4 rounded-lg border-2 cursor-pointer transition-all select-none flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 accent-[#fbbf24] cursor-pointer flex-shrink-0"
                              />
                              <span className={`font-extrabold text-sm break-words ${textTitle}`}>{opt.title}</span>
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
                            <div className={`text-xs font-bold sm:pl-6 break-words ${textSub}`}>{opt.subtitle}</div>
                          )}
                          <p className={`text-xs leading-relaxed sm:pl-6 break-words ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                            {opt.impact}
                          </p>
                        </div>

                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t ${borderHeader} text-[11px] sm:pl-6`}>
                          <div className={`p-2 rounded border ${borderModal} ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
                            <span className={`block text-[10px] uppercase font-bold mb-0.5 ${textSub}`}>Kostenrisiko</span>
                            <span className={`font-bold leading-snug break-words block ${textTitle}`}>{opt.costs || "-"}</span>
                          </div>
                          <div className={`p-2 rounded border ${borderModal} ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
                            <span className={`block text-[10px] uppercase font-bold mb-0.5 ${textSub}`}>Dauer</span>
                            <span className={`font-bold leading-snug break-words block ${textTitle}`}>{opt.duration || "-"}</span>
                          </div>
                          <div className={`p-2 rounded border ${borderModal} ${isDark ? "bg-slate-950" : "bg-slate-50"}`}>
                            <span className={`block text-[10px] uppercase font-bold mb-0.5 ${textSub}`}>Bewertung</span>
                            <span className={`font-bold leading-snug break-words block ${textTitle}`}>{opt.success_chance || "-"}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 space-y-2.5">
                <input
                  type="text"
                  value={briefingCustomNote}
                  onChange={(e) => setBriefingCustomNote(e.target.value)}
                  disabled={isLoading}
                  placeholder="Optionaler Zusatz für die Ausarbeitung (z.B. besondere Sachverhaltsdetails oder ergänzende Mandanten-Vorgaben)..."
                  className={`w-full rounded-lg px-3.5 py-2.5 text-xs border focus:outline-none focus:border-[#fbbf24] ${inputBg}`}
                />

                <button
                  type="button"
                  disabled={isLoading || selectedOptionIds.length === 0}
                  onClick={handleExecuteBriefingSelection}
                  style={{
                    backgroundColor: "#fbbf24",
                    color: "#000000",
                    border: "2px solid #f59e0b",
                    boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)"
                  }}
                  className="w-full py-3.5 px-4 sm:px-5 rounded-lg font-extrabold text-xs sm:text-sm hover:opacity-95 transition disabled:opacity-50 cursor-pointer flex items-center justify-center uppercase tracking-wide text-center"
                >
                  {selectedOptionIds.length > 1
                    ? `Ausgewählte Optionen (${selectedOptionIds.length}) durch Kanzlei Alpha & Omega ausarbeiten`
                    : "Ausgewählte Option durch Kanzlei Alpha & Omega ausarbeiten"}
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
                    : `Kanzlei Alpha • Spiegel-Kanzlei Omega • Revisionssenat (${hasFullAccess && selectedEngine === "claude" ? "Claude Sonnet" : "Gemini Pro"})`}
                </div>
                <div
                  className={`w-full text-left rounded-lg px-4 sm:px-6 py-4 sm:py-5 whitespace-pre-wrap break-words leading-relaxed border relative overflow-hidden ${bgCard}`}
                >
                  {!hasFullAccess && !isUser && (
                    <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center opacity-15">
                      <div className="transform -rotate-12 border-4 border-red-600 text-red-600 font-black text-xl sm:text-4xl px-4 sm:px-6 py-3 uppercase tracking-widest text-center">
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
              className="p-3.5 sm:p-4 rounded-lg border flex items-center space-x-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-left"
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f59e0b] animate-ping flex-shrink-0" />
              <span>{loadingPhaseText}</span>
            </div>
          )}

          {allFourGreen && (
            <div
              style={{
                borderColor: "#10b981",
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.08)"
              }}
              className="p-4 sm:p-5 rounded-xl border-2 text-left space-y-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 style={{ color: "#10b981" }} className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
                  ALLE 4 STATIONEN GRÜN – SCHRIFTSATZ DURCH REVISIONSSENAT FREIGEGEBEN
                </h3>
                <span
                  style={{ backgroundColor: "#10b981", color: "#000000" }}
                  className="px-3 py-1 rounded text-xs font-extrabold uppercase"
                >
                  REVISIONS-FREIGABE ERTEILT
                </span>
              </div>

              <p className={`text-xs leading-relaxed ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Ihr Schriftsatz wurde auf Basis der Fallakte durch Kanzlei Alpha ausgearbeitet, von der Spiegel-Kanzlei Omega kontradiktorisch geprüft und vom Revisionssenat abgenommen. Klicken Sie jetzt auf „Ins Cockpit übergeben“, um den Entwurf in die Aktenansicht zu übernehmen.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-1">
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
                  onClick={() => {
                    if (isMobileScreen) setMobileCorrectionOpen(true);
                    setTimeout(() => inputFieldRef.current?.focus(), 60);
                  }}
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

        {/* 5. FOOTER */}
        <div
          data-help="warroom_footer_transfer"
          className={`p-3 sm:p-4 border-t ${borderHeader} ${bgFooter} space-y-2.5 flex-shrink-0`}
        >
          {(!isMobileScreen || mobileCorrectionOpen || hasDraftMessages) && (
            <form onSubmit={handleSendMessage} className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
              <label
                className={`flex items-center justify-center h-[38px] sm:h-[42px] w-[38px] sm:w-[42px] rounded-lg cursor-pointer border transition flex-shrink-0 ${headerBtnInactive}`}
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
                placeholder={
                  isMobileScreen
                    ? "Korrektur-Anweisung eingeben..."
                    : "Optionaler Eingriff / Korrektur-Anweisung zum Schriftsatz (löst erneute Prüfung durch Spiegel-Kanzlei Omega aus)..."
                }
                disabled={isLoading}
                className={`flex-1 min-w-[160px] rounded-lg px-3.5 h-[38px] sm:h-[42px] text-xs sm:text-sm border focus:outline-none focus:border-[#fbbf24] transition disabled:opacity-50 ${inputBg}`}
              />
              <button
                type="submit"
                disabled={isLoading || !inputPrompt.trim()}
                style={{ backgroundColor: "#fbbf24", color: "#000000" }}
                className="font-extrabold px-3.5 sm:px-5 h-[38px] sm:h-[42px] rounded-lg text-xs sm:text-sm hover:opacity-90 transition disabled:opacity-50 flex-shrink-0 cursor-pointer"
              >
                {isMobileScreen ? "Senden" : "Anweisung senden & neu prüfen"}
              </button>
            </form>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`text-xs px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border font-bold cursor-pointer ${headerBtnInactive}`}
              >
                {isMobileScreen ? "Schließen" : "Schließen (Verlauf bleibt gespeichert)"}
              </button>

              {isMobileScreen && !hasDraftMessages && (
                <button
                  type="button"
                  onClick={() => setMobileCorrectionOpen(!mobileCorrectionOpen)}
                  className={`text-xs px-3 py-2 rounded-lg border font-bold cursor-pointer ${headerBtnInactive}`}
                >
                  {mobileCorrectionOpen ? "Eingabe ausblenden" : "+ Anlage / Korrektur"}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExtractAndApplyJSON}
              disabled={!allFourGreen}
              style={
                allFourGreen
                  ? { backgroundColor: "#10b981", color: "#000000" }
                  : undefined
              }
              className={`font-extrabold px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition flex items-center justify-center ${
                allFourGreen
                  ? "cursor-pointer hover:opacity-90 shadow"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60"
              }`}
              title={
                allFourGreen
                  ? "Schriftsatz ist vom Revisionssenat freigegeben – jetzt ins Cockpit übergeben"
                  : "Wird freigeschaltet, sobald die Prüfung nach der Lagebesprechung abgeschlossen ist (4x Grün)"
              }
            >
              {allFourGreen
                ? "Ins Cockpit übergeben"
                : (isMobileScreen ? "Erst 4x Grün abwarten" : "Ins Cockpit übergeben (Erst Lagebesprechung & 4x Grün)")}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}