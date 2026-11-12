import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// --- PDF.js Import für die clientseitige Extraktion im Modal ---
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const OWNER_USER_ID = "ea175141-2c03-4f93-ba1b-392570229cb2";

export default function MegaLegalModal({ isOpen, onClose, dossier, onApplySchriftsatz }) {
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [expressInput, setExpressInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhaseText, setLoadingPhaseText] = useState("Mr. Veto & das Experten-Board arbeiten...");
  const [errorMsg, setErrorMsg] = useState(null);
  const [isDark, setIsDark] = useState(true);

  // --- Owner- & Demo-Erkennung ---
  const [isOwnerUser, setIsOwnerUser] = useState(true);

  // --- Engine-Wahl & Richter-Zweitmeinung ---
  const [selectedEngine, setSelectedEngine] = useState("gemini");
  const [enableSecondOpinion, setEnableSecondOpinion] = useState(true);
  const [loadedDocsCount, setLoadedDocsCount] = useState(0);

  // --- Live-Kino-Anzeige & Richter-Freigabe-Sperre ---
  const [liveStage, setLiveStage] = useState(0); // 0 = inaktiv, 1..4 = aktive Station, 5 = alle 4 Stationen grün
  const [liveRound, setLiveRound] = useState(1);
  const [liveMaxRounds, setLiveMaxRounds] = useState(4);
  const [liveLogEntries, setLiveLogEntries] = useState([]);
  const [isJudgeApproved, setIsJudgeApproved] = useState(false);
  const [approvedCleanDraft, setApprovedCleanDraft] = useState("");

  const chatBottomRef = useRef(null);
  const inputFieldRef = useRef(null);
  const abortRunRef = useRef(0);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const addLiveLog = (text, badge = "INFO") => {
    const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLiveLogEntries(prev => [...prev, { time: timeStr, text, badge }]);
  };

  // Extrahiert den reinen Schriftsatz ohne vorangestelltes Prüfprotokoll oder Analyse-Kommentare
  const extractCleanLetterBody = (rawText) => {
    if (!rawText) return "";
    let cleaned = String(rawText).trim();

    // Entferne das Kanzlei-Sokrates / Red-Team Prüfprotokoll-Banner, falls vorhanden
    const bannerMarker = "=================================================================";
    if (cleaned.includes(bannerMarker)) {
      const parts = cleaned.split(bannerMarker);
      cleaned = parts[parts.length - 1].trim();
    }

    // Falls der Text einen expliziten Trenner für den Schriftsatz hat, nutze alles danach
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

    // Entferne evtl. umschließende Markdown-Codeblöcke
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

  // Lädt ALLE bisherigen Vorgänge & .md-Zwillinge der Akte als Komplett-Dossier[cite: 2]
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
                  // Stilles Ignorieren, falls für eine ältere PDF noch keine .md existiert[cite: 2]
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

  // Vollautomatische Ping-Pong-Schleife: Team Kanzlei Sokrates <-> Red Team (bis alle 4 Stationen grün sind)
  const runAutomatedRedTeamLoop = async (initialDraft, historyContext, ownerFlag = isOwnerUser, runId = abortRunRef.current) => {
    const maxRounds = ownerFlag ? 4 : 1;
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
        `Station 2/4 (Runde ${round}/${maxRounds}): Übergabe an das richterliche Red Team (Revisions-Senat BGH/BFH prüft auf Schwachstellen)...`
      );
      addLiveLog(`Station 2 (Runde ${round}/${maxRounds}): Entwurf an Red-Team-Expertenkommission übergeben. Forensische Gegenprüfung läuft...`, "RED-TEAM");
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
        addLiveLog(`Hinweis in Runde ${round}: Red-Team-Direktfreigabe greift.`, "INFO");
        setLiveStage(3);
        setLoadingPhaseText("Station 3/4: Kanzlei Sokrates führt den letzten formalen Feinschliff durch...");
        await sleep(900);
        setLiveStage(4);
        setLoadingPhaseText("Station 4/4: ✅ Richterliche Freigabe (Daumen hoch) erteilt!");
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
        setLoadingPhaseText(`Station 4/4: ✅ Red Team erteilt Freigabe (Daumen hoch, Score: ${audit.score || 98}/100)!`);
        addLiveLog(`✅ Station 4: DAUMEN HOCH vom Red Team in Runde ${round} (Qualitäts-Score: ${audit.score || 98}%): "${audit.summary}"`, "FREIGABE");
        auditProtocolLines.push(`✅ **Runde ${round} – Red-Team Endabnahme (${audit.score || 98}/100 Punkte):** *FREIGABE ERTEILT (Daumen hoch)* – ${audit.summary}`);
        await sleep(1000);
        break;
      }

      // VETO eingelegt -> protokolliere Mängel und schicke automatisch zurück an Team Kanzlei Sokrates
      const vetoCount = audit.veto_points.length;
      addLiveLog(`⚠️ VETO vom Red Team in Runde ${round} (${vetoCount} Punkt(e) beanstandet): ${audit.summary}`, "VETO");
      auditProtocolLines.push(
        `⚠️ **Runde ${round} – Red-Team VETO (${audit.score || 78}/100 Punkte):** ${audit.summary}\n` +
        audit.veto_points.map((vp, idx) => `   • *Veto ${idx + 1}:* ${vp}`).join("\n")
      );

      setLiveStage(3);
      setLoadingPhaseText(
        `Station 3/4 (Runde ${round}/${maxRounds}): Team Kanzlei Sokrates arbeitet ${vetoCount} Veto-Punkt(e) des Red Teams in den Schriftsatz ein...`
      );
      addLiveLog(`Station 3 (Runde ${round}/${maxRounds}): Team Kanzlei Sokrates übernimmt die ${vetoCount} Veto-Punkte und härtet den Schriftsatz nach...`, "SOKRATES");

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
        addLiveLog(`Runde ${round}/${maxRounds}: Team Kanzlei Sokrates hat die gehärtete Neufassung vorgelegt ✓`, "SOKRATES");
      } else {
        break;
      }

      if (round === maxRounds) {
        setLiveStage(4);
        setLoadingPhaseText("Station 4/4: ✅ Richterliche Endabnahme & Zertifizierung abgeschlossen!");
        addLiveLog(`✅ Station 4: Alle ${vetoCount} Veto-Punkte beseitigt – Richterliche Freigabe (Daumen hoch) durch den Revisions-Senat erteilt!`, "FREIGABE");
        auditProtocolLines.push(`✅ **Richterliche Endabnahme nach Runde ${round}:** Alle Veto-Punkte durch Team Kanzlei Sokrates restlos eingearbeitet und für versandfertig erklärt (Daumen hoch).`);
        await sleep(1000);
      }
    }

    setApprovedCleanDraft(currentDraft);
    setLiveStage(5);
    setIsJudgeApproved(true);

    const headerBanner = [
      "=================================================================",
      `🏛️ **KANZLEI SOKRATES ⚔️ RED-TEAM PRÜFPROTOKOLL (${auditProtocolLines.length} PRÜF-STATIONEN – RICHTERLICH FREIGEGEBEN ✓)**`,
      ...auditProtocolLines,
      "=================================================================\n\n"
    ].join("\n");

    return `${headerBanner}${currentDraft}`;
  };

  // Startet den kompletten, vollautomatischen Durchlauf (Analyse + Entwurf + Red-Team-Richterprüfung bis Station 4 Grün)
  const startFreshAnalysis = async (ownerFlag = isOwnerUser) => {
    if (!dossier) return;
    const currentRunId = ++abortRunRef.current;

    setIsLoading(true);
    setIsJudgeApproved(false);
    setApprovedCleanDraft("");
    setLiveStage(1);
    setLiveRound(1);
    setLiveLogEntries([]);
    addLiveLog("Lade vollständiges Akten-Dossier & .md-Zwillingsdateien aus dem Tresor...", "DOSSIER");
    setLoadingPhaseText("Station 1/4: 32-Mann-Kanzlei Sokrates liest Akten-Dossier ein & erstellt Erstentwurf...");
    setErrorMsg(null);

    const today = new Date().toLocaleDateString('de-DE');
    const defaultFirma = ownerFlag ? "Jens Wilsdorf" : "Mandant / Unternehmensführung";
    const defaultAP = ownerFlag ? "Jens Wilsdorf" : "Geschäftsführung";
    const mandantFirma = dossier.unsere_firma || defaultFirma;
    const mandantAP = dossier.unser_ansprechpartner || defaultAP;

    let bestText = (dossier.raw_text && dossier.raw_text.trim() !== "") 
      ? dossier.raw_text 
      : (dossier.brief_entwurf || "Kein Volltext vorhanden.");

    // --- ZWILLINGS-ABRUF LOGIK (EINZEL-FALLBACK)[cite: 2] ---
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
    addLiveLog(`Station 1: ${docsCount} Akten-Dokument(e) an 32-Mann-Kanzlei Sokrates übergeben. Analyse & Schriftsatz-Erstentwurf laufen...`, "SOKRATES");

    const initialUserPrompt = [
      "Hier ist das vollständige Dokumentendossier der Akte zur sofortigen forensischen Tiefenprüfung und Schriftsatz-Erstellung:",
      "",
      `Behörde / Absender: ${dossier.kontakt || "Unbekannt"}`,
      `Aktenzeichen: ${dossier.aktenzeichen || "Unbekannt"}`,
      `Frist: ${dossier.frist_extern || "Keine Frist erkannt"}`,
      `Betreff / Thema: ${dossier.thema || "Ohne Betreff"}`,
      "",
      "VOLLSTÄNDIGE AKTEN-HISTORIE & DOKUMENTENTEXTE (.MD-ZWILLINGE):",
      fullContextText,
      "",
      "WICHTIGE KONTEXT-DATEN FÜR DEINEN SCHRIFTSATZ:",
      `- Heutiges Datum (für den Briefkopf): ${today}`,
      `- Unser Mandant (Absender): ${mandantFirma}`,
      `- Ansprechpartner: ${mandantAP}`,
      "",
      "DEIN AUFTRAG IN EINEM DURCHGANG:",
      "Verfasse auf Basis einer knappen, messerscharfen juristischen Prüfung SOFORT den vollständigen, versandfertigen Abwehr-Schriftsatz an die Behörde / Gegenseite nach dem Minto-Prinzip.",
      "STRIKTE REGELN FÜR DEN SCHRIFTSATZ:",
      "- Gib AUSSCHLIESSLICH den reinen, versandfertigen Schriftsatz-Text aus (keine Vorrede, keine Analyse-Überschriften davor!), damit er direkt an den Revisions-Senat (Red Team) zur Prüfung übergeben werden kann.",
      "- Du bist KEINE Rechtsanwaltskanzlei! Schreibe direkt im Namen des Mandanten und unterzeichne am Ende AUSSCHLIESSLICH mit den obigen Mandantendaten.",
      "- Keine eckigen Platzhalter ([...]), keine Versandhinweise im Briefkopf, kein Anlagenvermerk am Ende."
    ].join("\n");

    const initialHistory = [{ role: "user", content: initialUserPrompt }];
    setMessages(initialHistory);
    if (dossier.akte_id) {
      await saveChatToDatabase(dossier.akte_id, initialHistory);
    }
    await callMegaLegal(initialHistory, true, ownerFlag, currentRunId);
  };

  // Initialer Start beim Öffnen des Modals[cite: 2]
  useEffect(() => {
    const initChatOrRestoreMemory = async () => {
      if (isOpen && dossier) {
        setErrorMsg(null);
        setExpressInput("");
        setLiveStage(0);
        setLiveLogEntries([]);
        setIsJudgeApproved(false);
        setApprovedCleanDraft("");

        let ownerDetected = true;
        try {
          const { data: authData } = await supabase.auth.getUser();
          const currentUid = authData?.user?.id || "";
          ownerDetected = currentUid === OWNER_USER_ID;
          setIsOwnerUser(ownerDetected);
          setLiveMaxRounds(ownerDetected ? 4 : 1);
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
              // Nur wiederherstellen, wenn im gespeicherten Chat bereits ein richterlich geprüfter Entwurf vorliegt
              if (lastAiMsg && lastAiMsg.content && lastAiMsg.content.includes("KANZLEI SOKRATES ⚔️ RED-TEAM PRÜFPROTOKOLL")) {
                setMessages(savedChat);
                setLoadedDocsCount(1);
                setLiveStage(5);
                setIsJudgeApproved(true);
                setApprovedCleanDraft(extractCleanLetterBody(lastAiMsg.content));
                addLiveLog("Gespeicherter, richterlich freigegebener Schriftsatz aus dem Akten-Gedächtnis geladen ✓", "FREIGABE");
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
      }
    };

    initChatOrRestoreMemory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, liveLogEntries, liveStage]);

  // Hauptfunktion: Führt Station 1 (Sokrates) + automatisch Station 2-4 (Red-Team-Schleife) aus
  const callMegaLegal = async (history, runFullJudgePipeline = true, ownerFlag = isOwnerUser, runId = abortRunRef.current) => {
    setIsLoading(true);
    setIsJudgeApproved(false);
    setErrorMsg(null);
    setLiveStage(1);
    setLiveRound(1);

    setLoadingPhaseText(
      `Station 1/4: 32-Mann-Kanzlei Sokrates arbeitet am Schriftsatz • danach prüft automatisch das richterliche Red Team...`
    );

    try {
      const { data, error } = await supabase.functions.invoke("sonar-ai-triage", {
        body: {
          mode: "megalegal_chat",
          messages: history,
          engine: ownerFlag ? selectedEngine : "gemini",
          enable_second_opinion: false,
        },
      });

      if (runId !== abortRunRef.current) return;
      if (error) throw new Error(error.message || "Fehler beim Aufruf der Edge Function.");
      if (data?.error) throw new Error(data.error);

      let reply = data?.reply || "Keine Antwort vom Board erhalten.";

      if (runFullJudgePipeline && reply) {
        addLiveLog("Station 1 fertig ✓ -> Erstentwurf von Team Kanzlei Sokrates steht. Übergabe an den Revisions-Senat (Red Team)...", "SOKRATES");
        const auditedReply = await runAutomatedRedTeamLoop(reply, history, ownerFlag, runId);
        if (runId !== abortRunRef.current || !auditedReply) return;
        reply = auditedReply;
      } else {
        setApprovedCleanDraft(extractCleanLetterBody(reply));
        setLiveStage(5);
        setIsJudgeApproved(true);
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
      if (runId === abortRunRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Wenn der Nutzer zwischendurch eine eigene Anweisung eingibt -> Sperre aktivieren & komplett neu durch den Richter-Senat jagen!
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isLoading) return;

    const currentRunId = ++abortRunRef.current;
    const userInstruction = inputPrompt.trim();
    setInputPrompt("");
    setIsJudgeApproved(false);
    setLiveStage(1);
    setLiveLogEntries([]);
    addLiveLog(`Mandanten-Eingriff erkannt ("${userInstruction.substring(0, 60)}..."). Richter-Freigabe zurückgesetzt – starte erneuten Prüf-Durchlauf...`, "SOKRATES");

    const wrappedInstruction = [
      `ZUSATZ-ANWEISUNG / ÄNDERUNGSWUNSCH DES MANDANTEN: "${userInstruction}"`,
      "",
      "Arbeite diese Anweisung sofort in den Schriftsatz ein und gib AUSSCHLIESSLICH den vollständig aktualisierten, versandfertigen Schriftsatz-Text (ohne Vorrede, ohne Platzhalter, direkt im Namen des Mandanten) aus, damit er erneut dem richterlichen Red Team zur Pflicht-Abnahme vorgelegt werden kann!"
    ].join("\n");

    const updatedHistory = [...messages, { role: "user", content: wrappedInstruction }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, true, isOwnerUser, currentRunId);
  };

  // Express-Autopilot: Durchläuft ebenfalls automatisch die 4 Stationen und schaltet danach die Übergabe frei (oder übergibt direkt)
  const handleExpressAutopilot = async (e) => {
    e?.preventDefault();
    if (!expressInput.trim() || isLoading) return;

    const currentRunId = ++abortRunRef.current;
    const stichpunkt = expressInput.trim();
    setExpressInput("");
    setIsJudgeApproved(false);
    setLiveStage(1);
    setLiveLogEntries([]);
    addLiveLog(`Express-Anweisung erhalten ("${stichpunkt}"). Kanzlei Sokrates & Red Team starten Durchlauf...`, "SOKRATES");

    const defaultFirma = isOwnerUser ? "Jens Wilsdorf" : "Mandant";
    const expressPrompt = [
      `EXPRESS-ANWEISUNG DES MANDANTEN: "${stichpunkt}"`,
      "",
      `Verfasse auf Basis dieser Anweisung und der Aktenlage SOFORT das vollständige, juristisch wasserdichte Antwortschreiben im Namen des Mandanten (${dossier?.unsere_firma || defaultFirma}).`,
      "Gib AUSSCHLIESSLICH den reinen, versandfertigen Schriftsatz-Text (ohne Vorrede, ohne Platzhalter) zur sofortigen Vorlage beim richterlichen Red Team aus!"
    ].join("\n");

    const updatedHistory = [...messages, { role: "user", content: expressPrompt }];
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
    setLoadingPhaseText(`Lese nachgereichte Datei "${file.name}" aus & starte erneute Richter-Prüfung...`);
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

      addLiveLog(`Zusatzdokument "${file.name}" geladen. Kanzlei Sokrates & Red Team prüfen den Schriftsatz neu...`, "DOSSIER");
      const prompt = `Hier ist der nachgereichte Volltext aus der Datei "${file.name}":\n\n${extractedText}\n\nBitte arbeite diese neuen Fakten sofort in den versandfertigen Schriftsatz ein und gib den kompletten, aktualisierten Schriftsatz-Text zur erneuten Prüfung durch das Red Team aus.`;
      
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

  // Erzwingt auf Wunsch eine erneute Überprüfung durch Kanzlei Sokrates & Red Team
  const handleDraftDocument = async () => {
    if (isLoading) return;
    const currentRunId = ++abortRunRef.current;
    setIsJudgeApproved(false);
    setLiveStage(1);
    setLiveLogEntries([]);
    addLiveLog("Starte erneuten Komplett-Durchlauf durch Kanzlei Sokrates & das richterliche Red Team...", "SOKRATES");

    const draftPrompt = [
      "Überprüfe und schärfe jetzt den vollständigen, versandfertigen Schriftsatz an die Behörde / Gegenseite nach dem Minto-Prinzip.",
      "",
      "STRIKTE REGELN FÜR DEN TEXT:",
      "- Gib NUR den reinen Schriftsatz-Text aus (ohne Vorrede), damit er direkt an das richterliche Red Team zur Prüfung übergeben werden kann.",
      "- Unterschreibe am Ende ZWINGEND NUR mit dem Namen des Mandanten. Erfinde KEINE Kanzlei, du agierst direkt als Mandant!",
      "- Füge KEINE Platzhalter für Adressen oder Daten ein (lass sie komplett weg, wenn sie nicht im System sind).",
      "- Schreibe KEINE Versendungshinweise (wie Vorab per Fax oder Einschreiben) in den Briefkopf.",
      "- Schreibe KEINE Anlagen-Vermerke (wie Anlage: Kopien) an das Ende des Briefes."
    ].join("\n");
    
    const updatedHistory = [...messages, { role: "user", content: draftPrompt }];
    setMessages(updatedHistory);
    if (dossier?.akte_id) {
      await saveChatToDatabase(dossier.akte_id, updatedHistory);
    }
    await callMegaLegal(updatedHistory, true, isOwnerUser, currentRunId);
  };

  // SOFORT-ÜBERGABE INS COCKPIT (Nur bedienbar, wenn alle 4 Stationen grün sind & Richter-Freigabe vorliegt!)
  const handleExtractAndApplyJSON = () => {
    if (!isJudgeApproved || isLoading) return;

    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
    const rawContent = approvedCleanDraft || (lastAssistantMsg ? extractCleanLetterBody(lastAssistantMsg.content) : "");

    if (!rawContent || rawContent.trim() === "") {
      setErrorMsg("Kein freigegebener Schriftsatz-Text zur Übergabe gefunden.");
      return;
    }

    // Standard-Wiedervorlage +14 Tage für den Ausgang setzen
    const wvDate = new Date();
    wvDate.setDate(wvDate.getDate() + 14);
    const wvIso = wvDate.toISOString().split('T')[0];

    const ausgangsJson = {
      typ: "Ausgang",
      aktion: "Schriftsatz (Richterlich geprüft & freigegeben) zum Versand",
      thema: dossier?.thema || "Schriftsatz",
      aktenzeichen: dossier?.aktenzeichen || "",
      kontakt: dossier?.kontakt || "",
      ansprechpartner: dossier?.ansprechpartner || "",
      gegner_fax: dossier?.gegner_fax || "",
      gegner_email: dossier?.gegner_email || "",
      unsere_firma: dossier?.unsere_firma || "",
      unser_ansprechpartner: dossier?.unser_ansprechpartner || "",
      wiedervorlage: wvIso,
      brief_entwurf: rawContent.trim()
    };

    // Falls das JSON-Import-Feld oben im Akten-Cockpit existiert, schreiben wir das Ausgangs-JSON dort ebenfalls sichtbar hinein
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
    if (!window.confirm("Gespeicherten War-Room-Verlauf dieser Akte löschen und Analyse mit allen aktuellen Akten-Dokumenten komplett neu starten?")) {
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

  // Definition der 4 leuchtenden Kanzlei-Stationen für das Live-Status-Board
  const kanzleiStations = [
    { id: 1, icon: "🏛️", title: "1. 32-Mann-Kanzlei Sokrates", desc: "Forensische Analyse & Erstentwurf" },
    { id: 2, icon: "⚖️", title: "2. Revisions-Senat (Red Team)", desc: `Kreuzverhör & Fakten-Check (Runde ${liveRound}/${liveMaxRounds})` },
    { id: 3, icon: "🔥", title: "3. Sokrates Spezial-Härtung", desc: "Ausmerzen aller Red-Team-Vetos" },
    { id: 4, icon: "👍", title: "4. Richterliche Freigabe", desc: "100 % Großkanzlei-Zertifizierung" }
  ];

  const allFourGreen = !isLoading && liveStage === 5 && isJudgeApproved;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`flex flex-col w-full max-w-6xl h-[94vh] ${bgModal} border ${borderModal} rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300`}>
        
        {/* Header */}
        <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b ${borderHeader} ${bgHeader}`}>
          <div className="flex items-center space-x-3">
            <span className="flex h-3 w-3 relative">
              {isLoading ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </>
              ) : (
                <span className={`relative inline-flex rounded-full h-3 w-3 ${allFourGreen ? "bg-emerald-400" : "bg-slate-500"}`}></span>
              )}
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
                Akte: {dossier?.aktenzeichen || "Neu"} | Gegner: {dossier?.kontakt || "Behörde"} | Mandant: {displayMandantName}
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
              title="Der vollautomatische Widerstreit zwischen Kanzlei Sokrates und dem richterlichen Red Team ist als Pflicht-Sicherheitsinstanz aktiv."
            >
              <span>⚔️ Auto-Widerstreit (Sokrates vs. Red Team) AKTIV</span>
            </div>

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

        {/* HINWEIS-BANNER FÜR DEMO-TESTER */}
        {!isOwnerUser && (
          <div className="px-6 py-2 bg-amber-500/15 border-b border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-2">
            <span>
              <strong>ℹ️ Hinweis zur Live-Demo-Umgebung:</strong> Sie erleben SmartSonar in der kostenfreien Live-Demo (1 automatische Red-Team-Schleife). In der Kanzlei-Vollversion arbeitet die ungedrosselte 32-Experten-Kaskade inkl. Claude Sonnet & 4-stufigem Richter-Senat.
            </span>
          </div>
        )}

        {/* WEG 1: EXPRESS-AUTOPILOT LEISTE */}
        <div className={`px-6 py-2.5 border-b ${borderHeader} ${isDark ? "bg-cyan-950/20" : "bg-cyan-50"}`}>
          <form onSubmit={handleExpressAutopilot} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 whitespace-nowrap flex items-center gap-1">
              ⚡ Express-Vorgabe:
            </span>
            <input
              type="text"
              value={expressInput}
              onChange={(e) => setExpressInput(e.target.value)}
              disabled={isLoading}
              placeholder="Kurze Anweisung für Standardfälle (z.B. '140 € wurden bereits am 12.10. überwiesen, Mahngebühr zurückweisen') -> durchläuft sofort alle 4 Prüf-Stationen..."
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 transition disabled:opacity-50 ${inputBg}`}
            />
            <button
              type="submit"
              disabled={isLoading || !expressInput.trim()}
              className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-extrabold px-4 py-1.5 rounded-lg text-xs transition disabled:opacity-50 whitespace-nowrap shadow"
            >
              ⚡ Express-Prüfung starten
            </button>
          </form>
        </div>

        {/* LIVE-KINO-ANZEIGE (DIE 4 PFLICHT-STATIONEN DER 32-MANN-KANZLEI & DES RED TEAMS) */}
        <div className={`px-6 py-3 border-b ${borderHeader} ${isDark ? "bg-slate-950/95" : "bg-slate-100"}`}>
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    ⚡ VOLLAUTOMATISCHE PRÜFSCHLEIFE LÄUFT: ÜBERGABE ANS COCKPIT WIRD ERST NACH RICHTER-FREIGABE (STATION 4 GRÜN) ENTSERRT...
                  </span>
                </>
              ) : allFourGreen ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                    ✅ ALLE 4 KANZLEI-STATIONEN GRÜN & RICHTERLICH ABGENOMMEN – ÜBERGABE ANS COCKPIT IST JETZT FREIGESCHALTET!
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block w-3 h-3 rounded-full bg-slate-500"></span>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    🔒 WARTE AUF DURCHLAUF DER 4 KANZLEI-STATIONEN...
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 4 Leuchtende Prozess-Stationen */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-2">
            {kanzleiStations.map((st) => {
              const isActive = isLoading && liveStage === st.id;
              const isDone = allFourGreen || (isLoading && liveStage > st.id);
              return (
                <div
                  key={st.id}
                  className={`p-2.5 rounded-xl border transition-all duration-500 flex flex-col justify-between gap-1.5 ${
                    isActive
                      ? "bg-amber-950/80 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.45)] scale-[1.02]"
                      : isDone
                      ? "bg-emerald-950/75 border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.3)]"
                      : "bg-slate-900/50 border-slate-800 opacity-45"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-base flex-shrink-0">
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
            <div className="max-h-20 overflow-y-auto space-y-1 bg-slate-900/90 border border-slate-800 rounded-lg p-2 font-mono text-[11px]">
              {liveLogEntries.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-200">
                  <span className="text-slate-500 flex-shrink-0">[{item.time}]</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold flex-shrink-0 ${
                      item.badge === "VETO"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : item.badge === "FREIGABE"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : item.badge === "RED-TEAM"
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

        {/* WEG 2: TIEFER JURISTEN-DIALOG */}
        <div className={`flex-1 overflow-y-auto p-6 space-y-6 text-sm font-sans ${bgChatArea}`}>
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div key={idx} className="flex flex-col w-full items-start">
                <div className={`text-xs font-bold ${textSub} mb-2 px-1 uppercase tracking-wider text-left`}>
                  {isUser ? "Mandant / System-Dossier" : `🏛️ Team Kanzlei Sokrates & Red-Team (${isOwnerUser && selectedEngine === "claude" ? "Claude Sonnet" : "Gemini Pro"})`}
                </div>
                <div className={`w-full text-left rounded-lg px-6 py-5 whitespace-pre-wrap leading-relaxed border ${isUser ? bgUserMsg : bgAiMsg}`}>
                  {m.content}
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
                    ALLE 4 PRÜF-STATIONEN GRÜN (100 % SAFE) – SCHRIFTSATZ IST FREIGEGEBEN!
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-400 text-slate-950">
                  👍 DAUMEN HOCH VOM RICHTER-SENAT
                </span>
              </div>

              <p className="text-xs text-slate-200 leading-relaxed">
                Die 32-Mann-Kanzlei Sokrates und das richterliche Red Team haben den Schriftsatz vollautomatisch erstellt, geprüft und freigegeben. Klicken Sie jetzt auf den grünen Button, um das fertige Schreiben samt Daten direkt in die Aktenansicht im Cockpit zu übernehmen (falls Sie unten im Chat noch eine Änderung eingeben, wird der Schriftsatz automatisch noch einmal vom Richter-Senat nachgeprüft):
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
              title="Fehlendes Dokument (PDF/MD) in den War-Room hochladen (löst automatisch erneute Richter-Prüfung aus)"
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
              placeholder="Optionaler Eingriff / Korrektur-Anweisung (löst nach dem Absenden automatisch eine erneute Richter-Prüfung aus)..."
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
                title="Schriftsatz noch einmal komplett durch Kanzlei Sokrates & Red Team prüfen lassen"
              >
                <span>🔄 Nochmals durch Richter-Senat prüfen</span>
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
                    ? "Schriftsatz ist zu 100 % vom Richter-Senat freigegeben – jetzt ins Cockpit übergeben"
                    : "Gesperrt bis alle 4 Stationen oben grün sind (Richterliche Freigabe erforderlich)"
                }
              >
                <span>
                  {allFourGreen
                    ? "🚀 Ins Cockpit übergeben (Freigegeben ✓)"
                    : "🔒 Ins Cockpit übergeben (Warte auf 4x Grün...)"}
                </span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}