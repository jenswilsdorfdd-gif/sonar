import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { supabase } from './supabaseClient';

const OWNER_USER_ID = 'ea175141-2c03-4f93-ba1b-392570229cb2';
const MAX_DEMO_AKTEN_LIMIT = 10;

export default function AktenFormular({
  theme,
  btnTextColor,
  inputStyle,
  labelStyle,
  h4StyleAkten,
  quickBtnStyle,
  modus,
  setModus,
  selectedAkteId,
  handleAkteAuswahl,
  sortedAktenForDropdown,
  getAkteDropdownText,
  unserZeichen,
  setUnserZeichen,
  thema,
  setThema,
  aktenzeichen,
  setAktenzeichen,
  gegnerListe,
  handleGegnerAuswahl,
  gegnerName,
  setGegnerName,
  gegnerAnsprechpartner,
  setGegnerAnsprechpartner,
  gegnerTelefon,
  setGegnerTelefon,
  gegnerFax,
  setGegnerFax,
  gegnerEmail,
  setGegnerEmail,
  mandanten,
  handleTresorAuswahl,
  unsereFirma,
  setUnsereFirma,
  unserAnsprechpartner,
  setUnserAnsprechpartner,
  unserEmail,
  setUnserEmail,
  setUnserTelefon,
  unserTelefon,
  typ,
  setTyp,
  datum,
  setDatum,
  aktion,
  setAktion,
  activeAkteObj,
  bezugId,
  setBezugId,
  formatDatum,
  fristExtern,
  setFristExtern,
  handleFristChange,
  wiedervorlage,
  setWiedervorlage,
  handleWVChange,
  setzeWV,
  clearOldFristen,
  setClearOldFristen,
  faxZhd,
  setFaxZhd,
  setShowVersandHistorie,
  handleResendVersand,
  setActiveWarRoomDossier,
  setIsWarRoomOpen,
  onOpenFallakte,
  emailAnhaenge,
  setEmailAnhaenge,
  briefEntwurf,
  setBriefEntwurf,
  versandPdfUrl,
  laedt,
  handleSpeichernCheck,
  gegnerPrompt,
  handleGegnerPromptAccept,
  setGegnerPrompt,
  tresorPrompt,
  handleTresorPromptAccept,
  setTresorPrompt,
  formatRufnummer,
  rawText,
  dateien,
  setDateien,
  showUploadReminder,
  setShowUploadReminder,
  showTriageModal,
  setShowTriageModal,
  triageWvDate,
  setTriageWvDate,
  session,
  ladeDaten,
  showToast
}) {
  const panelStyle = {
    background: theme.cardBg,
    borderRadius: '12px',
    border: `1px solid ${theme.border}`,
    padding: '20px',
    width: '100%',
    wordBreak: 'break-word',
    boxSizing: 'border-box'
  };

  // --- STRIKTE OWNER-ERKENNUNG AUSSCHLIESSLICH ÜBER LOGIN-USER-ID ---
  const isFullAccessUser = session?.user?.id === OWNER_USER_ID;

  // --- CLICK-WRAP PFLICHT-BESTÄTIGUNG VOR VERSAND (HUMAN-IN-THE-LOOP) ---
  const [isLegalConfirmed, setIsLegalConfirmed] = useState(isFullAccessUser);

  // Setzt die Click-Wrap-Checkbox beim Wechsel einer Akte oder des Modus für Nicht-Owner automatisch auf false zurück
  useEffect(() => {
    setIsLegalConfirmed(isFullAccessUser);
  }, [selectedAkteId, modus, isFullAccessUser]);

  // --- STATES & REFS FÜR DIE ZWEISTUFIGE DEMO-VERSAND-SICHERHEITSSPERRE ---
  const [demoVersandWarningStep, setDemoVersandWarningStep] = useState(0); // 0 = geschlossen, 1 = Stufe 1, 2 = Stufe 2 (Letzte Warnung)
  const [pendingDemoKanal, setPendingDemoKanal] = useState(null); // 'email' | 'fax'
  const versandEmailInputRef = useRef(null);
  const versandFaxInputRef = useRef(null);

  // Blockiert Kopieren / Ausschneiden / Rechtsklick im Entwurfsfeld für Demo-Tester
  const handleDemoCopyBlock = (e) => {
    if (!isFullAccessUser) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof showToast === 'function') {
        showToast('Kopieren, Markieren und Ausschneiden ist in der kostenfreien Demo-Version gesperrt.', 'warning');
      }
    }
  };

  // Verhindert im Demo-Modus das blaue Markieren von Text im Textarea-Feld sofort
  const handleDemoSelectBlock = (e) => {
    if (!isFullAccessUser && e?.target) {
      try {
        if (e.target.selectionStart !== e.target.selectionEnd) {
          e.target.selectionEnd = e.target.selectionStart;
        }
      } catch (_err) {}
    }
  };

  // Blockiert Tastaturkürzel Strg+C, Strg+X und Strg+A im Textarea für Demo-Tester
  const handleDemoKeyDownBlock = (e) => {
    if (!isFullAccessUser && (e.ctrlKey || e.metaKey)) {
      const k = (e.key || '').toLowerCase();
      if (k === 'c' || k === 'x' || k === 'a') {
        e.preventDefault();
        e.stopPropagation();
        if (typeof showToast === 'function') {
          showToast('Tastatur-Kopieren ist in der kostenfreien Demo-Version gesperrt.', 'warning');
        }
      }
    }
  };

  // Führt den eigentlichen Versand aus (inkl. garantierter ASCII-MUSTER-Stempelung für Demo-Accounts)
  const executeActualVersand = (kanalTyp) => {
    if (!isFullAccessUser && briefEntwurf && !briefEntwurf.includes('MUSTER / UNVERBINDLICHE DEMO-ANSICHT')) {
      const stampedText = [
        '==========================================================================',
        '*** MUSTER / UNVERBINDLICHE DEMO-ANSICHT - NICHT ZUM VERSAND GEEIGNET ***',
        'HINWEIS (RDG / StBG): KI-generiertes Textmuster zu Demonstrationszwecken. Keine Rechts- oder Steuerberatung.',
        '==========================================================================\n',
        briefEntwurf.trim(),
        '\n==========================================================================',
        '*** MUSTER / DEMO-VERSION SMARTSONAR - KOPIEREN & VERSENDEN UNTERSAGT ***',
        '=========================================================================='
      ].join('\n');
      setBriefEntwurf(stampedText);
    }
    setDemoVersandWarningStep(0);
    setPendingDemoKanal(null);
    if (!isFullAccessUser) {
      setIsLegalConfirmed(false);
    }
    handleResendVersand(kanalTyp);
  };

  // Fängt für Demo-Tester den Klick auf "E-Mail senden" oder "E-Fax" ab und öffnet das 2-stufige Warn-Pop-up
  const handleProtectedVersand = (kanalTyp) => {
    if (!isLegalConfirmed) {
      if (typeof showToast === 'function') {
        showToast('Bitte bestätigen Sie zuerst die eigenverantwortliche Prüfung des Entwurfs.', 'warning');
      }
      return;
    }

    if (isFullAccessUser) {
      executeActualVersand(kanalTyp);
      return;
    }

    const targetRecipient = kanalTyp === 'email' ? (gegnerEmail || '').trim() : (gegnerFax || '').trim();
    if (!targetRecipient) {
      if (typeof showToast === 'function') {
        showToast(
          kanalTyp === 'email'
            ? 'Bitte trage zuerst eine Test-E-Mail-Adresse in das Feld "Versand-E-Mail (Gegner)" ein!'
            : 'Bitte trage zuerst eine Test-Faxnummer in das Feld "Versand-Faxnummer (Gegner)" ein!',
          'warning'
        );
      }
      if (kanalTyp === 'email' && versandEmailInputRef.current) {
        versandEmailInputRef.current.focus();
      } else if (kanalTyp === 'fax' && versandFaxInputRef.current) {
        versandFaxInputRef.current.focus();
      }
      return;
    }

    setPendingDemoKanal(kanalTyp);
    setDemoVersandWarningStep(1);
  };

  // Bricht den Demo-Versand ab, trägt automatisch die Login-E-Mail des Testers ein und entfernt eine evtl. eingetragene Faxnummer
  const handleAbortDemoVersandAndFocusField = () => {
    const testerLoginEmail = session?.user?.email ? String(session.user.email).trim() : '';

    if (testerLoginEmail) {
      setGegnerEmail(testerLoginEmail);
    }
    if (gegnerFax) {
      setGegnerFax('');
    }

    setDemoVersandWarningStep(0);
    setPendingDemoKanal(null);

    if (typeof showToast === 'function' && testerLoginEmail) {
      showToast(
        `Ihre eigene E-Mail-Adresse (${testerLoginEmail}) wurde automatisch ins Empfängerfeld eingetragen und die Faxnummer entfernt.`,
        'success'
      );
    }

    setTimeout(() => {
      if (versandEmailInputRef.current) {
        versandEmailInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        versandEmailInputRef.current.focus();
      }
    }, 80);
  };

  // Schlichtes Line-Icon für Kalender (exakt passend zur bestehenden Icon-Komponente)
  const renderCalendarIcon = (size = 16) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  // --- STATES FÜR DIE ZWEISTUFIGE GEGNER- & ANSPRECHPARTNER-ZUWEISUNG ---
  const [promptTargetGegnerId, setPromptTargetGegnerId] = useState('__NEU__');
  const [promptSelectedApMode, setPromptSelectedApMode] = useState('new');
  const [promptNewAbteilung, setPromptNewAbteilung] = useState('');
  const [promptNewName, setPromptNewName] = useState('');
  const [promptNewTel, setPromptNewTel] = useState('');
  const [promptNewEmail, setPromptNewEmail] = useState('');

  // --- STATES FÜR DAS AUFGABEN-, ZAHLUNGS- & TERMIN-MODUL ---
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [taskType, setTaskType] = useState('Zahlung / Überweisung');
  const [taskDate, setTaskDate] = useState('');
  const [taskBetrag, setTaskBetrag] = useState('');
  const [taskEmpfaenger, setTaskEmpfaenger] = useState('');
  const [taskIban, setTaskIban] = useState('');
  const [taskVwz, setTaskVwz] = useState('');
  const [taskNotiz, setTaskNotiz] = useState('');

  // Synchronisiere Standardwerte für das Termin-Panel, wenn es geöffnet wird
  useEffect(() => {
    if (showTaskPanel) {
      if (!taskDate) {
        setTaskDate(wiedervorlage || fristExtern || new Date().toISOString().split('T')[0]);
      }
      if (!taskEmpfaenger && gegnerName) {
        setTaskEmpfaenger(gegnerName);
      }
      if (!taskVwz && aktenzeichen) {
        setTaskVwz(aktenzeichen);
      }
    }
  }, [showTaskPanel, wiedervorlage, fristExtern, gegnerName, aktenzeichen]);

  // Hilfsfunktion: Baut den strukturierten Aufgabentext und übernimmt alles in die Akten-Maske
  const applyTaskToForm = () => {
    const zielDatum = taskDate || wiedervorlage || new Date().toISOString().split('T')[0];
    setTyp('Intern');
    handleWVChange(zielDatum);

    const empf = taskEmpfaenger || gegnerName || 'Gegenseite';
    let neuAktion = '';
    let blockLines = [];

    if (taskType === 'Zahlung / Überweisung') {
      neuAktion = `TERMIN ZAHLUNG: ${taskBetrag ? taskBetrag + ' € ' : ''}an ${empf} (Fällig: ${formatDatum(zielDatum)})`;
      blockLines = [
        `=== INTERNE ZAHLUNGSANWEISUNG / TERMIN ===`,
        `Aufgabe: ${taskType}`,
        `Fälligkeitsdatum (WV): ${formatDatum(zielDatum)}`,
        `Empfänger: ${empf}`,
        `Betrag: ${taskBetrag ? taskBetrag + ' €' : 'siehe Dokument'}`,
        `IBAN: ${taskIban || '-'}`,
        `Verwendungszweck / Kassenzeichen: ${taskVwz || aktenzeichen || '-'}`,
        `Mandant / Zahler: ${unsereFirma || '-'}`,
        taskNotiz ? `Hinweis / Bedingung: ${taskNotiz}` : null,
        `==========================================`
      ].filter(Boolean);
    } else {
      neuAktion = `INTERNER TERMIN (${taskType}): ${taskNotiz || thema || empf} (WV: ${formatDatum(zielDatum)})`;
      blockLines = [
        `=== INTERNER TERMIN / AUFGABE ===`,
        `Aufgabe: ${taskType}`,
        `Termin / Wiedervorlage: ${formatDatum(zielDatum)}`,
        `Bezug / Gegner: ${empf}`,
        `Aktenzeichen: ${aktenzeichen || '-'}`,
        taskNotiz ? `Arbeitsanweisung / Details: ${taskNotiz}` : null,
        `=================================`
      ].filter(Boolean);
    }

    setAktion(neuAktion);
    const blockText = blockLines.join('\n');
    setBriefEntwurf(prev => (prev && prev.trim() !== '' ? `${blockText}\n\n${prev}` : blockText));
    showToast('Termin & Anweisung in Maske (Typ: Intern + WV) übernommen!', 'success');
  };

  // Hilfsfunktion: Öffnet Google Kalender mit vorbefülltem Ganztagestermin
  const pushToGoogleCalendar = () => {
    const zielDatum = taskDate || wiedervorlage || fristExtern || new Date().toISOString().split('T')[0];
    const startObj = new Date(zielDatum);
    if (isNaN(startObj.getTime())) {
      showToast('Bitte wähle zuerst ein gültiges Termin-Datum!', 'warning');
      return;
    }
    const endObj = new Date(startObj);
    endObj.setDate(endObj.getDate() + 1);

    const fmtDate = (d) => d.toISOString().split('T')[0].replace(/-/g, '');
    const datesParam = `${fmtDate(startObj)}/${fmtDate(endObj)}`;

    const zeichenPrefix = unserZeichen ? `[${unserZeichen}] ` : '';
    const empf = taskEmpfaenger || gegnerName || 'Akte';
    const titleStr = taskType === 'Zahlung / Überweisung'
      ? `${zeichenPrefix}ZAHLUNG ${taskBetrag ? taskBetrag + ' € ' : ''}— ${empf}`
      : `${zeichenPrefix}${taskType}: ${empf} (${thema || 'Vorgang'})`;

    const detailsLines = [
      `SONAR AKTEN-TERMIN (${taskType})`,
      `Unser Zeichen: ${unserZeichen || '-'}`,
      `Mandant: ${unsereFirma || '-'}`,
      `Gegner / Behörde: ${empf}`,
      `Gegenstand: ${thema || '-'}`,
      `Aktenzeichen: ${aktenzeichen || '-'}`,
      taskType === 'Zahlung / Überweisung' ? `\n--- ZAHLUNGSDATEN ---\nBetrag: ${taskBetrag ? taskBetrag + ' €' : '-'}\nIBAN: ${taskIban || '-'}\nVerwendungszweck: ${taskVwz || aktenzeichen || '-'}` : null,
      taskNotiz ? `\nNotiz / Bedingung:\n${taskNotiz}` : null,
      briefEntwurf ? `\n--- AKTEN-TEXT / ENTWURF ---\n${briefEntwurf}` : null
    ].filter(Boolean).join('\n');

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titleStr)}&dates=${datesParam}&details=${encodeURIComponent(detailsLines)}`;
    window.open(gcalUrl, '_blank', 'noopener,noreferrer');
  };

  // Hilfsfunktion: Kontakte eines Gegners aus dem JSON-Feld "notizen" lesen
  const getContactsForGegner = (gObj) => {
    if (!gObj) return [];
    try {
      const parsed = typeof gObj.notizen === 'string' ? JSON.parse(gObj.notizen) : gObj.notizen;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return [];
  };

  // Initialisierung, sobald ein neuer gegnerPrompt reinkommt
  useEffect(() => {
    if (gegnerPrompt) {
      const firstId = gegnerPrompt.vorschlaege && gegnerPrompt.vorschlaege.length > 0
        ? String(gegnerPrompt.vorschlaege[0].id)
        : '__NEU__';
      setPromptTargetGegnerId(firstId);

      const detectedAP = (gegnerPrompt.obj?.ansprechpartner || '').trim();
      setPromptNewAbteilung('');
      setPromptNewName(detectedAP);
      setPromptNewTel(gegnerPrompt.obj?.telefon || '');
      setPromptNewEmail(gegnerPrompt.obj?.email || '');

      if (firstId !== '__NEU__') {
        const gObj = gegnerListe.find(g => String(g.id) === firstId);
        const contacts = getContactsForGegner(gObj);
        const cleanAP = detectedAP.toLowerCase();

        if (!cleanAP || cleanAP === 'zentrale' || cleanAP === 'poststelle') {
          setPromptSelectedApMode('existing_zentrale');
        } else {
          const foundIdx = contacts.findIndex(c => {
            const cName = (c.name || '').trim().toLowerCase();
            const cAbt = (c.abteilung || '').trim().toLowerCase();
            return (cName && (cName.includes(cleanAP) || cleanAP.includes(cName))) ||
                   (cAbt && (cAbt.includes(cleanAP) || cleanAP.includes(cAbt)));
          });
          if (foundIdx !== -1) {
            setPromptSelectedApMode(`existing_${foundIdx}`);
          } else {
            setPromptSelectedApMode('new');
          }
        }
      } else {
        setPromptSelectedApMode('new');
      }
    }
  }, [gegnerPrompt, gegnerListe]);

  // Wenn der Nutzer im ersten Dropdown die Behörde wechselt, Kontakte neu abgleichen
  const handlePromptGegnerChange = (newId) => {
    setPromptTargetGegnerId(newId);
    if (newId === '__NEU__') {
      setPromptSelectedApMode('new');
      return;
    }
    const gObj = gegnerListe.find(g => String(g.id) === String(newId));
    const contacts = getContactsForGegner(gObj);
    const cleanAP = (gegnerPrompt?.obj?.ansprechpartner || '').trim().toLowerCase();

    if (!cleanAP || cleanAP === 'zentrale' || cleanAP === 'poststelle') {
      setPromptSelectedApMode('existing_zentrale');
    } else {
      const foundIdx = contacts.findIndex(c => {
        const cName = (c.name || '').trim().toLowerCase();
        const cAbt = (c.abteilung || '').trim().toLowerCase();
        return (cName && (cName.includes(cleanAP) || cleanAP.includes(cName))) ||
               (cAbt && (cAbt.includes(cleanAP) || cleanAP.includes(cAbt)));
      });
      if (foundIdx !== -1) {
        setPromptSelectedApMode(`existing_${foundIdx}`);
      } else {
        setPromptSelectedApMode('new');
      }
    }
  };

  const executeGegnerPromptSubmit = () => {
    if (promptTargetGegnerId === '__NEU__') {
      handleGegnerPromptAccept('neu', null, {
        mode: 'new',
        abteilung: promptNewAbteilung,
        name: promptNewName,
        telefon: promptNewTel,
        email: promptNewEmail
      });
    } else {
      if (promptSelectedApMode.startsWith('existing_')) {
        const idxKey = promptSelectedApMode.replace('existing_', '');
        handleGegnerPromptAccept('zuweisen', promptTargetGegnerId, {
          mode: 'existing',
          index: idxKey
        });
      } else {
        handleGegnerPromptAccept('zuweisen', promptTargetGegnerId, {
          mode: 'new',
          abteilung: promptNewAbteilung,
          name: promptNewName,
          telefon: promptNewTel,
          email: promptNewEmail
        });
      }
    }
  };

  // Prüft für Demo-Tester das löschsichere 10-Vorgänge-Kontingent und delegiert danach an die zentrale Speicher- & Fallakten-Engine (useAktenActions)
  const handleProtectedSubmit = async (e) => {
    e.preventDefault();

    if (!isFullAccessUser && modus === 'neu') {
      try {
        const { count: aktenCount } = await supabase
          .from('akten')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id);

        const { count: logCount } = await supabase
          .from('demo_usage_log')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id);

        const usedTotal = Math.max(aktenCount || 0, logCount || 0);
        if (usedTotal >= MAX_DEMO_AKTEN_LIMIT) {
          showToast(
            `Demo-Limit erreicht: In der kostenfreien Testversion können maximal ${MAX_DEMO_AKTEN_LIMIT} Vorgänge angelegt werden (auch das Löschen von Akten setzt den Zähler nicht zurück).`,
            'error'
          );
          return;
        }

        await supabase.from('demo_usage_log').insert([
          { user_id: session.user.id, action_mode: 'akte_create' }
        ]);
      } catch (quotaErr) {
        console.warn('Fehler beim Prüfen des Demo-Aktenlimits:', quotaErr);
      }
    }

    setShowTaskPanel(false);
    setTaskBetrag('');
    setTaskIban('');
    setTaskVwz('');
    setTaskNotiz('');
    if (!isFullAccessUser) {
      setIsLegalConfirmed(false);
    }

    if (typeof handleSpeichernCheck === 'function') {
      handleSpeichernCheck(e);
    }
  };

  // Aktuell im Gegner-Prompt ausgewählte Behörde + deren gespeicherte Kontakte
  const currentSelectedGegnerObj = gegnerPrompt && promptTargetGegnerId !== '__NEU__'
    ? gegnerListe.find(g => String(g.id) === String(promptTargetGegnerId))
    : null;
  const currentPromptContacts = getContactsForGegner(currentSelectedGegnerObj);

  const demoTargetLabel = pendingDemoKanal === 'email'
    ? (gegnerEmail || 'Unbekannte E-Mail')
    : (gegnerFax || 'Unbekannte Faxnummer');
  const demoBehoerdenLabel = gegnerName || 'die eingetragene Behörde / Gegenpartei';
  const demoKanalLabel = pendingDemoKanal === 'email' ? 'E-Mail (Resend)' : 'E-Fax (Simple-Fax)';
  const testerLoginEmailPreview = session?.user?.email ? String(session.user.email).trim() : '';

  const activeVorgaengeCount =
    activeAkteObj && Array.isArray(activeAkteObj.akten_historie)
      ? activeAkteObj.akten_historie.length
      : 0;

  return (
    <>
      {/* --- ZWEISTUFIGES SICHERHEITS-WARN-MODAL FÜR DEMO-TESTER VOR E-MAIL- / FAX-VERSAND --- */}
      {!isFullAccessUser && demoVersandWarningStep > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.88)',
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: theme.cardBg || '#0f172a',
              border: demoVersandWarningStep === 2 ? '3px solid #dc2626' : '2px solid #f59e0b',
              borderRadius: '14px',
              padding: '28px',
              maxWidth: demoVersandWarningStep === 2 ? '500px' : '620px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              textAlign: 'left'
            }}
          >
            {demoVersandWarningStep === 1 ? (
              <>
                <div
                  style={{
                    background: '#f59e0b',
                    color: '#000000',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Icon name="alert" size={20} />
                  ACHTUNG: SIE BEFINDEN SICH IM DEMO- / TESTMODUS!
                </div>

                <div style={{ color: theme.textMain, fontSize: '15px', lineHeight: '1.6' }}>
                  Sie sind im Begriff, dieses Schreiben per <strong>{demoKanalLabel}</strong> abzusenden.
                  <br /><br />
                  Beachten Sie, dass im Empfängerfeld aktuell folgende Adresse hinterlegt ist:
                  <div
                    style={{
                      marginTop: '10px',
                      marginBottom: '10px',
                      padding: '12px 14px',
                      background: 'rgba(220, 38, 38, 0.14)',
                      border: '1px solid #dc2626',
                      borderRadius: '8px',
                      color: theme.textMain,
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    Empfänger / Behörde: <span style={{ color: '#f87171' }}>{demoBehoerdenLabel}</span><br />
                    Ziel-Adresse ({pendingDemoKanal === 'email' ? 'E-Mail' : 'Fax'}): <span style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '15px' }}>{demoTargetLabel}</span>
                  </div>
                  Da Ihr Entwurf im Demo-Modus deutliche <strong>„MUSTER / DEMO-ANSICHT“</strong>-Aufdrucke enthält, sollte dieses Testschreiben <strong>nicht an echte Behörden, Gerichte oder Finanzämter</strong> versendet werden!
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={handleAbortDemoVersandAndFocusField}
                    style={{
                      background: '#10b981',
                      color: '#000000',
                      border: 'none',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 900,
                      fontSize: '15px',
                      textAlign: 'center',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    {testerLoginEmailPreview
                      ? `Abbrechen & meine Login-E-Mail (${testerLoginEmailPreview}) automatisch eintragen`
                      : 'Abbrechen & im Empfängerfeld meine eigene Test-Adresse eintragen (Empfohlen)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDemoVersandWarningStep(2)}
                    style={{
                      background: 'transparent',
                      color: theme.textMuted,
                      border: `1px solid ${theme.border}`,
                      padding: '10px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      textAlign: 'center'
                    }}
                  >
                    Nein, die eingetragene Adresse ({demoTargetLabel}) ist meine Test-Adresse – weiter zum Versand
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontWeight: 900,
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Icon name="alert" size={20} />
                  LETZTE BESTÄTIGUNG VOR DEM VERSAND
                </div>

                <div style={{ color: theme.textMain, fontSize: '15px', lineHeight: '1.5' }}>
                  Sind Sie sich sicher, dass Sie dieses Test-Musterschreiben jetzt wirklich an <strong>{demoTargetLabel}</strong> senden wollen?
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleAbortDemoVersandAndFocusField}
                    style={{
                      background: '#10b981',
                      color: '#000000',
                      border: 'none',
                      padding: '15px 18px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 900,
                      fontSize: '15px',
                      textAlign: 'center',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    Nein, abbrechen & meine Login-E-Mail eintragen
                  </button>

                  <button
                    type="button"
                    onClick={() => executeActualVersand(pendingDemoKanal)}
                    style={{
                      background: 'transparent',
                      color: theme.textMuted,
                      border: `1px solid ${theme.border}`,
                      padding: '9px 14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      textAlign: 'center'
                    }}
                  >
                    Ja, jetzt an {demoTargetLabel} senden
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleProtectedSubmit} style={panelStyle}>

        {/* --- NEUES ZWEISTUFIGES GEGNER- & ANSPRECHPARTNER-ASSIGNMENT UI --- */}
        {gegnerPrompt && (
          <div style={{ background: theme.gegnerAccent || '#f43f5e', color: '#fff', padding: '18px 20px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <strong style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="alert" size={16} />
                Gegner / Kontakt erkannt: "{gegnerPrompt.obj.name}" {gegnerPrompt.obj.ansprechpartner ? `(Sachbearbeiter: ${gegnerPrompt.obj.ansprechpartner})` : ''}
              </strong>

              {/* STUFE 1: BEHÖRDE IM CRM WÄHLEN ODER NEU ANLEGEN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '12px', background: 'rgba(0,0,0,0.18)', padding: '12px', borderRadius: '6px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', color: 'rgba(255,255,255,0.85)' }}>
                    1. Behörde / Gegner im CRM wählen:
                  </label>
                  <select
                    value={promptTargetGegnerId}
                    onChange={(e) => handlePromptGegnerChange(e.target.value)}
                    style={{ width: '100%', padding: '9px', borderRadius: '4px', border: 'none', color: '#000', fontWeight: 'bold', fontSize: '13px' }}
                  >
                    {gegnerPrompt.vorschlaege && gegnerPrompt.vorschlaege.length > 0 && (
                      <optgroup label="Gefundene Vorschläge im CRM">
                        {gegnerPrompt.vorschlaege.map(v => (
                          <option key={v.id} value={String(v.id)}>{v.name} {v.adresse ? `(${v.adresse})` : ''}</option>
                        ))}
                      </optgroup>
                    )}
                    {gegnerListe.length > 0 && (
                      <optgroup label="Alle gespeicherten Behörden im CRM">
                        {gegnerListe
                          .filter(g => !(gegnerPrompt.vorschlaege || []).some(v => String(v.id) === String(g.id)))
                          .map(g => (
                            <option key={g.id} value={String(g.id)}>{g.name}</option>
                          ))}
                      </optgroup>
                    )}
                    <option value="__NEU__">+ Komplett neue Behörde anlegen: "{gegnerPrompt.obj.name}"</option>
                  </select>
                </div>

                {/* STUFE 2: ANSPRECHPARTNER WÄHLEN ODER NEU HINZUFÜGEN */}
                {promptTargetGegnerId !== '__NEU__' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', color: 'rgba(255,255,255,0.85)' }}>
                      2. Hinterlegte Ansprechpartner / Abteilungen:
                    </label>
                    <select
                      value={promptSelectedApMode}
                      onChange={(e) => setPromptSelectedApMode(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '4px', border: 'none', color: '#000', fontWeight: 'bold', fontSize: '13px' }}
                    >
                      <option value="existing_zentrale">🏢 Zentrale / Allgemein ({currentSelectedGegnerObj?.email || currentSelectedGegnerObj?.fax || 'Hauptkontakt'})</option>
                      {currentPromptContacts.map((c, idx) => {
                        const labelAbt = c.abteilung ? `${c.abteilung}: ` : '';
                        const labelName = c.name || 'Ohne Namen';
                        const labelExtra = c.telefon || c.email ? ` (${[c.telefon, c.email].filter(Boolean).join(', ')})` : '';
                        return (
                          <option key={idx} value={`existing_${idx}`}>
                            👤 {labelAbt}{labelName}{labelExtra}
                          </option>
                        );
                      })}
                      <option value="new">
                        ➕ Neuen Ansprechpartner hinzufügen {gegnerPrompt.obj.ansprechpartner ? `("${gegnerPrompt.obj.ansprechpartner}")` : ''}
                      </option>
                    </select>
                  </div>
                )}
              </div>

              {/* EINGABEFELDER FÜR NEUEN ANSPRECHPARTNER (WENN "NEU" GEWÄHLT ODER NEUE BEHÖRDE) */}
              {(promptTargetGegnerId === '__NEU__' || promptSelectedApMode === 'new') && (
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
                    Kontaktdaten des neuen Ansprechpartners (wird dauerhaft bei dieser Behörde im CRM gespeichert):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Abteilung</label>
                      <input
                        type="text"
                        value={promptNewAbteilung}
                        onChange={(e) => setPromptNewAbteilung(e.target.value)}
                        placeholder="z.B. Gewerbesteuer"
                        style={{ width: '100%', padding: '7px', borderRadius: '4px', border: 'none', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Name Sachbearbeiter</label>
                      <input
                        type="text"
                        value={promptNewName}
                        onChange={(e) => setPromptNewName(e.target.value)}
                        placeholder="z.B. Frau Stellmach"
                        style={{ width: '100%', padding: '7px', borderRadius: '4px', border: 'none', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Durchwahl / Telefon</label>
                      <input
                        type="text"
                        value={promptNewTel}
                        onChange={(e) => setPromptNewTel(e.target.value)}
                        placeholder="z.B. 0351 488..."
                        style={{ width: '100%', padding: '7px', borderRadius: '4px', border: 'none', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>E-Mail</label>
                      <input
                        type="email"
                        value={promptNewEmail}
                        onChange={(e) => setPromptNewEmail(e.target.value)}
                        placeholder="z.B. steueramt@..."
                        style={{ width: '100%', padding: '7px', borderRadius: '4px', border: 'none', color: '#000', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* AKTION-BUTTONS */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={executeGegnerPromptSubmit}
                  style={{ background: '#fff', color: theme.gegnerAccent || '#f43f5e', border: 'none', padding: '9px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  {promptTargetGegnerId === '__NEU__'
                    ? '+ Als neue Behörde im CRM anlegen & übernehmen'
                    : (promptSelectedApMode === 'new' ? '✓ Kontakt zu Behörde hinzufügen & übernehmen' : '✓ Ausgewählten Kontakt übernehmen')}
                </button>
                <button
                  type="button"
                  onClick={() => setGegnerPrompt(null)}
                  style={{ background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '9px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  Ignorieren
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- NEUES INTELLIGENTES TRESOR-ASSIGNMENT UI --- */}
        {tresorPrompt && (
          <div style={{ background: theme.accent, color: '#000', padding: '18px 20px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <strong style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="alert" size={16} />
                {tresorPrompt.typ === 'auswahl' ? `Mandant "${tresorPrompt.obj.unsere_firma}" erkannt. Bitte im Tresor zuweisen:` : `Unbekannter Mandant: "${tresorPrompt.obj.unsere_firma}" neu in den Tresor aufnehmen?`}
              </strong>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                {tresorPrompt.typ === 'auswahl' ? (
                  <>
                    <select id="tresor-match-select" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #000', color: '#000', flex: '1 1 200px' }} defaultValue={tresorPrompt.vorschlaege[0]?.id}>
                      {tresorPrompt.vorschlaege.map(v => <option key={v.id} value={v.id}>{v.firmenname}</option>)}
                    </select>
                    <button type="button" onClick={() => handleTresorPromptAccept('zuweisen', document.getElementById('tresor-match-select').value)} style={{ background: '#000', color: theme.accent, border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Zuweisen</button>
                    <button type="button" onClick={() => handleTresorPromptAccept('neu')} style={{ background: 'transparent', color: '#000', border: '1px solid #000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ Neu anlegen</button>
                  </>
                ) : (
                  <button type="button" onClick={() => handleTresorPromptAccept('neu')} style={{ background: '#000', color: theme.accent, border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ja, anlegen</button>
                )}
                <button type="button" onClick={() => setTresorPrompt(null)} style={{ background: 'transparent', border: '1px solid #000', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ignorieren</button>
              </div>
            </div>
          </div>
        )}

        {/* --- MODUS-WAHL: NEUE AKTE VS. ZU BESTEHENDER AKTE HINZUFÜGEN (+ SCHNELLÖFFNER FALLAKTE) --- */}
        <div
          data-help="akten_modus_wahl"
          style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px', textAlign: 'left', flexWrap: 'wrap', alignItems: 'center' }}
        >
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'neu' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="radio" checked={modus === 'neu'} onChange={() => setModus('neu')} />
            <Icon name="folder" size={16} /> Neue Akte / Hülle anlegen
          </label>
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'bestehend' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="radio" checked={modus === 'bestehend'} onChange={() => setModus('bestehend')} />
            <Icon name="folder" size={16} /> Zu bestehender Akte hinzufügen
          </label>
          {modus === 'bestehend' && (
            <div style={{ flex: '1 1 min(100%, 260px)', marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={selectedAkteId || ''} onChange={handleAkteAuswahl} required style={{ ...inputStyle, padding: '8px', fontSize: '13px', flex: '1 1 200px' }}>
                <option value="">-- Ziel-Akte wählen --</option>
                {sortedAktenForDropdown.map(a => <option key={a.id} value={a.id}>{getAkteDropdownText(a)}</option>)}
              </select>
              {selectedAkteId && typeof onOpenFallakte === 'function' && (
                <button
                  type="button"
                  onClick={() => onOpenFallakte(selectedAkteId)}
                  style={{
                    background: theme.accent,
                    color: btnTextColor,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Komplette chronologische Fallakte dieser Akte öffnen"
                >
                  <Icon name="cabinet" size={15} /> Fallakte öffnen ({activeVorgaengeCount})
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {modus === 'neu' && (
            <>
              {/* --- 1. AKTEN-STAMMDATEN --- */}
              <div
                data-help="akten_stammdaten_1"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}
              >
                <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ margin: 0, color: theme.textMain }}>1. Akten-Stammdaten</h4>
                  </div>
                </div>
                <div><label style={labelStyle}>Unser Zeichen</label><input type="text" value={unserZeichen} onChange={(e) => setUnserZeichen(e.target.value)} placeholder="z.B. 0001-JW-Finanzamt" style={inputStyle} /></div>
                <div><label style={labelStyle}>Gegenstand (Thema)*</label><input type="text" value={thema} onChange={(e) => setThema(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Aktenzeichen (Behörde)</label><input type="text" value={aktenzeichen} onChange={(e) => setAktenzeichen(e.target.value)} style={inputStyle} /></div>
              </div>

              {/* --- 2. GEGENPARTEI / BEHÖRDE --- */}
              <div
                data-help="akten_gegner_2"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}
              >
                <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ margin: 0, color: theme.textMain }}>2. Gegenpartei / Behörde</h4>
                    {gegnerListe.length > 0 && (
                      <select onChange={handleGegnerAuswahl} style={{ padding: '6px 10px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '13px', background: theme.inputBg, color: theme.textMain, flex: '1 1 250px', maxWidth: '350px' }}>
                        <option value="">+ Aus Gegner-CRM laden...</option>
                        {gegnerListe.map(g => {
                          let ansList = [];
                          try { const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen; if (Array.isArray(parsed)) ansList = parsed; } catch (e) {}
                          if (ansList.length > 0) { return ansList.map((ans, idx) => (<option key={`${g.id}-${idx}`} value={`${g.id}|${idx}`}>{g.name} — {ans.abteilung ? `${ans.abteilung}: ` : ''}{ans.name || 'Zentrale'}</option>)); }
                          return <option key={g.id} value={`${g.id}|0`}>{g.name}</option>;
                        })}
                      </select>
                    )}
                  </div>
                </div>
                <div><label style={labelStyle}>Behörde / Gegner*</label><input type="text" value={gegnerName} onChange={(e) => setGegnerName(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={gegnerAnsprechpartner} onChange={(e) => setGegnerAnsprechpartner(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Telefon</label><input type="text" value={gegnerTelefon} onChange={(e) => setGegnerTelefon(e.target.value)} onBlur={(e) => setGegnerTelefon(formatRufnummer(e.target.value))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Faxnummer</label><input type="text" value={gegnerFax} onChange={(e) => setGegnerFax(e.target.value)} onBlur={(e) => setGegnerFax(formatRufnummer(e.target.value))} style={inputStyle} /></div>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>E-Mail</label><input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} style={inputStyle} /></div>
              </div>

              {/* --- 3. WIR (MANDANT) --- */}
              <div
                data-help="akten_mandant_3"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}
              >
                <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                    <h4 style={{ margin: 0, color: theme.textMain }}>3. Wir (Mandant)</h4>
                    {mandanten.length > 0 && (
                      <select onChange={handleTresorAuswahl} style={{ padding: '6px 10px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '13px', background: theme.inputBg, color: theme.textMain, flex: '1 1 250px', maxWidth: '350px' }}>
                        <option value="">+ Aus Firmen-Tresor laden...</option>
                        {mandanten.map(m => <option key={m.id} value={m.id}>{m.firmenname}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div><label style={labelStyle}>Firma / Person*</label><input type="text" value={unsereFirma} onChange={(e) => setUnsereFirma(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={unserAnsprechpartner} onChange={(e) => setUnserAnsprechpartner(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>E-Mail (Mandant)</label><input type="email" value={unserEmail} onChange={(e) => setUnserEmail(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Telefon (Mandant)</label><input type="text" value={unserTelefon} onChange={(e) => setUnserTelefon(e.target.value)} onBlur={(e) => setUnserTelefon(formatRufnummer(e.target.value))} style={inputStyle} /></div>
              </div>
            </>
          )}

          {/* --- DOKUMENT-EINTRAG, AKTION & BEZUG --- */}
          <div
            data-help="akten_vorgang_bezug"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}
          >
            <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '6px' }}><h4 style={h4StyleAkten}>Dokument-Eintrag / Arbeitsanweisung</h4></div>
            <div><label style={labelStyle}>Typ*</label><select value={typ} onChange={(e) => setTyp(e.target.value)} style={inputStyle}><option value="Eingang">Eingang</option><option value="Ausgang">Ausgang</option><option value="Intern">Intern</option></select></div>
            <div><label style={labelStyle}>Datum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={inputStyle} /></div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Vorgang / Betreff / Aktion</label>
              <input type="text" value={aktion} onChange={(e) => setAktion(e.target.value)} placeholder="z.B. Rechnung Landesjustizkasse / Überweisung fällig" style={inputStyle} />
            </div>

            {activeAkteObj && activeAkteObj.akten_historie && activeAkteObj.akten_historie.length > 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '12px', background: 'rgba(14, 165, 233, 0.1)', border: '1px dashed #0ea5e9', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ ...labelStyle, color: theme.textMain, margin: 0 }}>Ist eine Antwort auf (Bezug & Auto-Kill Frist):</label>
                  {bezugId && (
                    <span style={{ fontSize: '11px', background: '#0ea5e9', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      ★ Bezug verknüpft
                    </span>
                  )}
                </div>
                <select value={bezugId} onChange={(e) => setBezugId(e.target.value)} style={{ ...inputStyle, borderColor: '#0ea5e9' }}>
                  <option value="">-- Kein direkter Bezug --</option>
                  {activeAkteObj.akten_historie.map(h => {
                    const briefSnippet = h.brief_entwurf ? ` | "${h.brief_entwurf.substring(0, 40).replace(/\n/g, ' ')}..."` : '';
                    const aktionSnippet = h.aktion ? ` | ${h.aktion}` : '';
                    const isSuggested = (h.id === bezugId);
                    return (
                      <option key={h.id} value={h.id}>
                        {isSuggested ? '★ ' : ''}{formatDatum(h.datum)} | {h.typ}{briefSnippet}{aktionSnippet}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* --- FRIST (BEHÖRDE) VS. WIEDERVORLAGE (INTERN) --- */}
          <div
            data-help="akten_fristen_wv"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}
          >
            <div>
              <label style={labelStyle}>Frist (Behörde)</label>
              <input type="date" value={fristExtern} onChange={(e) => handleFristChange(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>WV (Intern)</label>
              <input type="date" value={wiedervorlage} onChange={(e) => handleWVChange(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setzeWV(3)} style={quickBtnStyle}>+3T</button>
                <button type="button" onClick={() => setzeWV(7)} style={quickBtnStyle}>+1W</button>
                <button type="button" onClick={() => setzeWV(14)} style={quickBtnStyle}>+2W</button>
                <button type="button" onClick={() => setzeWV(0, 1)} style={quickBtnStyle}>+1M</button>
              </div>
            </div>

            {modus === 'bestehend' && (
              <div style={{ gridColumn: '1 / -1', marginTop: '2px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', borderRadius: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: theme.textMain, fontWeight: 'bold' }}>
                  <input type="checkbox" checked={clearOldFristen} onChange={(e) => setClearOldFristen(e.target.checked)} style={{ accentColor: '#10b981', width: '16px', height: '16px', flexShrink: 0 }} />
                  <span>Alle bisherigen Fristen & Wiedervorlagen dieser Akte als erledigt markieren</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* --- VERSAND-COCKPIT & SCHREIBFENSTER --- */}
        <div style={{ background: theme.inputBg, padding: '20px', border: `1px solid ${theme.border}`, borderRadius: '8px', marginTop: '25px', textAlign: 'left' }}>

          {/* --- EMPFÄNGER-ROUTING (E-MAIL, FAX & Z. HD.) --- */}
          <div
            data-help="akten_versand_adressen"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '15px', marginBottom: '20px', padding: '15px', background: theme.cardBg, borderRadius: '8px', border: `1px dashed ${theme.border}` }}
          >
            <div>
              <label style={{ ...labelStyle, color: theme.textMain }}>Versand-E-Mail (Gegner)</label>
              <input
                ref={versandEmailInputRef}
                type="email"
                value={gegnerEmail}
                onChange={(e) => setGegnerEmail(e.target.value)}
                placeholder="z.B. poststelle@..."
                style={{ ...inputStyle, padding: '8px' }}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, color: theme.textMain }}>Versand-Faxnummer (Gegner)</label>
              <input
                ref={versandFaxInputRef}
                type="text"
                value={gegnerFax}
                onChange={(e) => setGegnerFax(e.target.value)}
                onBlur={(e) => setGegnerFax(formatRufnummer(e.target.value))}
                placeholder="z.B. 0351 123456"
                style={{ ...inputStyle, padding: '8px' }}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, color: theme.textMain }}>z. Hd. (Fax-Deckblatt)</label>
              <input type="text" value={faxZhd} onChange={(e) => setFaxZhd(e.target.value)} placeholder="z.B. Frau Klemmer" style={{ ...inputStyle, padding: '8px' }} title="Dieser Name wird exklusiv für den Fax-Versand genutzt und überschreibt nicht das CRM." />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ ...labelStyle, color: theme.accent, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="file" size={16} /> Textentwurf / Schreiben verfassen / Arbeitsanweisung & Notizen</label>

            {/* --- VERPFLICHTENDE CLICK-WRAP-CHECKBOX UNMITTELBAR VOR DEN VERSAND-BUTTONS --- */}
            <div
              data-help="akten_clickwrap_confirm"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '8px',
                background: isLegalConfirmed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.12)',
                border: isLegalConfirmed ? '1px solid #10b981' : '1px solid #f59e0b',
                marginBottom: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  lineHeight: '1.5',
                  color: theme.textMain,
                  fontWeight: 'bold'
                }}
              >
                <input
                  type="checkbox"
                  checked={isLegalConfirmed}
                  onChange={(e) => setIsLegalConfirmed(e.target.checked)}
                  style={{
                    marginTop: '3px',
                    width: '18px',
                    height: '18px',
                    accentColor: '#10b981',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                />
                <span>
                  Pflicht-Bestätigung vor Versand (Human-in-the-Loop): Ich bestätige als vertretungsberechtigter Erklärender, dass ich den durch das KI-System unverbindlich vorbereiteten Schriftsatzentwurf, sämtliche darin genannten Fakten, Anträge und Fristen sowie die Empfängeradresse eigenverantwortlich geprüft habe und dieses Schreiben hiermit als meine eigene rechtsverbindliche Erklärung absende (§ 2 Lizenz- & Haftungsbedingungen).
                </span>
              </label>
            </div>

            {/* --- DIE 5 AKTIONS- & VERSAND-BUTTONS (JEDER MIT EIGENEM LIVE-HILFE-ANKER) --- */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px', width: '100%' }}>
              <div data-help="akten_btn_versandhistorie" style={{ width: '100%' }}>
                <button type="button" onClick={() => setShowVersandHistorie(true)} style={{ width: '100%', background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="Sendeliste und Nachweise einsehen"><Icon name="folder" size={16} /> Versandhistorie</button>
              </div>

              <div data-help="akten_btn_email_send" style={{ width: '100%' }}>
                <button
                  type="button"
                  disabled={!isLegalConfirmed}
                  onClick={() => handleProtectedVersand('email')}
                  className={!isLegalConfirmed ? 'opacity-50 cursor-not-allowed' : ''}
                  style={{
                    width: '100%',
                    background: theme.accent,
                    color: btnTextColor,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    minHeight: '44px',
                    fontSize: '13px',
                    cursor: isLegalConfirmed ? 'pointer' : 'not-allowed',
                    opacity: isLegalConfirmed ? 1 : 0.5,
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  title={!isLegalConfirmed ? 'Bitte bestätigen Sie zuerst die eigenverantwortliche Prüfung des Entwurfs.' : 'Schreiben per E-Mail (Resend) versenden'}
                >
                  <Icon name="send" size={16} /> E-Mail senden (Resend)
                </button>
              </div>

              <div data-help="akten_btn_fax_send" style={{ width: '100%' }}>
                <button
                  type="button"
                  disabled={!isLegalConfirmed}
                  onClick={() => handleProtectedVersand('fax')}
                  className={!isLegalConfirmed ? 'opacity-50 cursor-not-allowed' : ''}
                  style={{
                    width: '100%',
                    background: theme.accent,
                    color: btnTextColor,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    minHeight: '44px',
                    fontSize: '13px',
                    cursor: isLegalConfirmed ? 'pointer' : 'not-allowed',
                    opacity: isLegalConfirmed ? 1 : 0.5,
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  title={!isLegalConfirmed ? 'Bitte bestätigen Sie zuerst die eigenverantwortliche Prüfung des Entwurfs.' : 'Schreiben per E-Fax (Simple-Fax) versenden'}
                >
                  <Icon name="phone" size={16} /> E-Fax (Simple-Fax)
                </button>
              </div>

              {/* KONSISTENTER BUTTON: DURCHGEHEND BLAU MIT DUNKLER SCHRIFT & SCHLICHTEM LINE-ICON */}
              <div data-help="akten_btn_termin_zahlung" style={{ width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setShowTaskPanel(!showTaskPanel)}
                  style={{ width: '100%', background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  title="Internen Termin, Zahlungsziel oder Aufgabe inkl. Google Kalender Push anlegen"
                >
                  {renderCalendarIcon(16)} Termin / Zahlung
                </button>
              </div>

              <div data-help="akten_btn_warroom" style={{ width: '100%' }}>
                <button type="button" onClick={() => {
                  setActiveWarRoomDossier({
                    akte_id: selectedAkteId,
                    unser_zeichen: unserZeichen,
                    unsere_firma: unsereFirma,
                    unser_ansprechpartner: unserAnsprechpartner,
                    aktenzeichen: aktenzeichen,
                    kontakt: gegnerName,
                    ansprechpartner: gegnerAnsprechpartner,
                    gegner_fax: gegnerFax,
                    gegner_email: gegnerEmail,
                    thema: thema,
                    frist_extern: fristExtern,
                    brief_entwurf: briefEntwurf || "Kein Volltext hinterlegt. Bitte auf Basis der Fallakte & Metadaten analysieren.",
                    raw_text: rawText || briefEntwurf || "Kein Volltext hinterlegt."
                  });
                  setIsWarRoomOpen(true);
                }} style={{ width: '100%', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="Diesen Vorgang samt Fallakte zur strategischen Analyse in den War-Room schicken">
                  <Icon name="alert" size={16} /> In War-Room senden
                </button>
              </div>
            </div>
          </div>

          {/* --- AUFKLAPPBARES AUFGABEN-, ZAHLUNGS- & TERMIN-MODUL --- */}
          {showTaskPanel && (
            <div
              data-help="akten_btn_termin_zahlung"
              style={{ marginBottom: '18px', padding: '16px', background: theme.cardBg, border: `1px solid ${theme.accent}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px dashed ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <strong style={{ color: theme.accent, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {renderCalendarIcon(16)} Interne Aufgabe / Zahlung / Termin planen (Wiedervorlage & Google Kalender)
                </strong>
                <button type="button" onClick={() => setShowTaskPanel(false)} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>✕ Schließen</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Aufgaben-Typ</label>
                  <select value={taskType} onChange={(e) => setTaskType(e.target.value)} style={{ ...inputStyle, padding: '8px' }}>
                    <option value="Zahlung / Überweisung">Zahlung / Überweisung</option>
                    <option value="Wiedervorlage / Abwarten">Wiedervorlage / Schreiben abwarten</option>
                    <option value="Telefonat / Rückruf">Telefonat / Rückruf</option>
                    <option value="Interne Prüfung / Aufgabe">Interne Prüfung / Aufgabe</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Fälligkeit / Termin (WV)</label>
                  <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} style={{ ...inputStyle, padding: '8px' }} />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 3); setTaskDate(d.toISOString().split('T')[0]); }} style={quickBtnStyle}>+3T</button>
                    <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); setTaskDate(d.toISOString().split('T')[0]); }} style={quickBtnStyle}>+1W</button>
                    <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 14); setTaskDate(d.toISOString().split('T')[0]); }} style={quickBtnStyle}>+2W</button>
                    <button type="button" onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + 1); setTaskDate(d.toISOString().split('T')[0]); }} style={quickBtnStyle}>+1M</button>
                  </div>
                </div>

                {taskType === 'Zahlung / Überweisung' && (
                  <>
                    <div>
                      <label style={labelStyle}>Betrag (in €)</label>
                      <input type="text" value={taskBetrag} onChange={(e) => setTaskBetrag(e.target.value)} placeholder="z.B. 142,50" style={{ ...inputStyle, padding: '8px' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Zahlungsempfänger</label>
                      <input type="text" value={taskEmpfaenger} onChange={(e) => setTaskEmpfaenger(e.target.value)} placeholder="z.B. Landesjustizkasse" style={{ ...inputStyle, padding: '8px' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>IBAN Empfänger</label>
                      <input type="text" value={taskIban} onChange={(e) => setTaskIban(e.target.value)} placeholder="DE..." style={{ ...inputStyle, padding: '8px', fontFamily: 'monospace' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Zeichen Gegner</label>
                      <input type="text" value={taskVwz} onChange={(e) => setTaskVwz(e.target.value)} placeholder="Kassenzeichen / AZ" style={{ ...inputStyle, padding: '8px' }} />
                    </div>
                  </>
                )}

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Hinweis / Bedingung (z.B. "Abwarten ob Bescheid kommt, sonst überweisen")</label>
                  <input type="text" value={taskNotiz} onChange={(e) => setTaskNotiz(e.target.value)} placeholder="Optionale Arbeitsanweisung für diesen Termin..." style={{ ...inputStyle, padding: '8px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={applyTaskToForm}
                  style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', flex: '1 1 220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Icon name="check" size={16} /> In Maske & Wiedervorlage übernehmen (Typ: Intern)
                </button>
                <button
                  type="button"
                  onClick={pushToGoogleCalendar}
                  style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', flex: '1 1 220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {renderCalendarIcon(16)} Direkt im Google Kalender öffnen
                </button>
              </div>
            </div>
          )}

          {/* --- VERSAND-DATEIANHÄNGE --- */}
          <div
            data-help="akten_versand_anhaenge"
            style={{ marginBottom: '15px', padding: '12px', background: theme.cardBg, border: `1px dashed ${theme.border}`, borderRadius: '6px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <label style={{ ...labelStyle, margin: 0, color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="paperclip" size={14} /> Versand-Dateianhänge ({emailAnhaenge.length})
              </label>
              <label style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="paperclip" size={14} /> Datei(en) anhängen
                <input
                  id="email-anhaenge-upload"
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setEmailAnhaenge(prev => [...prev, ...files]);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            {emailAnhaenge.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {emailAnhaenge.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '4px', padding: '4px 8px', fontSize: '12px', color: theme.textMain }}>
                    <span style={{ marginRight: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}><Icon name="paperclip" size={12} /> {f.name}</span>
                    <button
                      type="button"
                      onClick={() => setEmailAnhaenge(prev => prev.filter((_, i) => i !== idx))}
                      style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '0 2px', fontWeight: 'bold' }}
                      title="Anhang entfernen"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KNALLROTER RDG- & StBG-WARNHINWEIS ÜBER DEM TEXTENTWURF-FELD (Weiße Schrift auf Rot – für Hell & Dunkel identisch) */}
          <div style={{ marginBottom: '10px', padding: '10px 14px', borderRadius: '6px', backgroundColor: '#dc2626', border: '1px solid #991b1b', fontSize: '12px', color: '#ffffff', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>
              WICHTIGER HINWEIS (RDG / StBG): KI-generierte Entwürfe sind technische Textmuster zur internen Vorbereitung und stellen KEINE Rechts- oder Steuerberatung dar. Vor Versand eigenverantwortlich prüfen!
            </span>
            {!isFullAccessUser && (
              <span style={{ background: '#0f172a', color: '#fbbf24', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', whiteSpace: 'nowrap' }}>
                DEMO-KOPIERSCHUTZ & MUSTER-BRANDING AKTIV
              </span>
            )}
          </div>

          {/* TEXTAREA MIT DIAGONALEM MUSTER-WASSERZEICHEN & HARTEM KOPIER-/MARKIER-SCHUTZ FÜR DEMO-TESTER */}
          <div
            data-help="akten_textentwurf_box"
            onCopy={handleDemoCopyBlock}
            onCut={handleDemoCopyBlock}
            onContextMenu={handleDemoCopyBlock}
            style={{ position: 'relative', width: '100%', userSelect: isFullAccessUser ? 'text' : 'none', WebkitUserSelect: isFullAccessUser ? 'text' : 'none' }}
          >
            {!isFullAccessUser && (
              <div
                style={{
                  pointerEvents: 'none',
                  userSelect: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  zIndex: 2,
                  opacity: 0.16
                }}
              >
                <div
                  style={{
                    transform: 'rotate(-12deg)',
                    border: '4px solid #dc2626',
                    color: '#dc2626',
                    fontWeight: 900,
                    fontSize: '26px',
                    padding: '10px 24px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    textAlign: 'center'
                  }}
                >
                  MUSTER • DEMO-ANSICHT • KEINE RECHTSBERATUNG
                </div>
              </div>
            )}
            <textarea
              value={briefEntwurf}
              onChange={(e) => setBriefEntwurf(e.target.value)}
              onCopy={handleDemoCopyBlock}
              onCut={handleDemoCopyBlock}
              onContextMenu={handleDemoCopyBlock}
              onDragStart={handleDemoCopyBlock}
              onSelect={handleDemoSelectBlock}
              onKeyDown={handleDemoKeyDownBlock}
              placeholder="Trage hier deinen Brief- oder E-Mail-Text, Arbeitsanweisungen oder Notizen ein..."
              style={{
                ...inputStyle,
                minHeight: '180px',
                fontFamily: 'monospace',
                background: 'transparent',
                position: 'relative',
                zIndex: 1,
                userSelect: isFullAccessUser ? 'text' : 'none',
                WebkitUserSelect: isFullAccessUser ? 'text' : 'none'
              }}
            />
          </div>

          {versandPdfUrl && typ === 'Ausgang' && (<div style={{ marginTop: '15px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', color: '#10b981', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon name="check" size={16} /> Versand-PDF generiert & verschickt! Vergiss nicht, unten auf "+ In Akte abheften" zu klicken.</div>)}
          {versandPdfUrl && typ !== 'Ausgang' && (<div style={{ marginTop: '15px', padding: '10px', background: 'rgba(14, 165, 233, 0.1)', border: '1px dashed #0ea5e9', color: '#0ea5e9', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon name="check" size={16} /> Scan-PDF erfolgreich verknüpft! Bereit zum Abheften.</div>)}
        </div>

        {/* --- ABSCHLUSS-BUTTON: IN AKTE ABHEFTEN --- */}
        <div data-help="akten_manuell_upload_save" style={{ marginTop: '25px', width: '100%' }}>
          <button
            type="submit"
            disabled={laedt}
            style={{
              padding: '15px',
              background: theme.accent,
              color: btnTextColor,
              border: 'none',
              borderRadius: '8px',
              cursor: laedt ? 'wait' : 'pointer',
              fontWeight: 'bold',
              width: '100%',
              fontSize: '16px',
              opacity: laedt ? 0.75 : 1
            }}
          >
            {laedt ? 'Speichere Eintrag & Fallakte...' : '+ In Akte abheften'}
          </button>
        </div>
      </form>
    </>
  );
}