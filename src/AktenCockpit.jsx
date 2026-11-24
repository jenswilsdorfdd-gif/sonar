import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub, normalizeName, cleanVal } from './utils';
import {
  formatDatum,
  sanitizeOwnContactName,
  cleanSlugForFilename,
  normalizeDateForInput,
  formatRufnummer,
  cleanOrgName,
  fuzzyMatch,
  cleanZeichenString,
  parseAktenNummer,
  generateMandantPrefix,
  findBestMatchingAkteInList,
  findSmartBezugInAkte,
  extractTextFromPDF,
  fileToBase64,
  druckeAkte
} from './utils/aktenHelpers';
import MegaLegalModal from './MegaLegalModal';
import AktenAlarme from './AktenAlarme';
import AktenListe from './AktenListe';
import AktenFormular from './AktenFormular';
import AktenModals from './AktenModals';

export default function AktenCockpit({
  session,
  theme,
  akten,
  mandanten,
  gegnerListe,
  ladeDaten,
  showToast,
  suchbegriff,
  globalUrlText,
  setGlobalUrlText
}) {
  const OWNER_USER_ID = 'ea175141-2c03-4f93-ba1b-392570229cb2';
  const isOwnerAccount = session?.user?.id === OWNER_USER_ID;
  const SIGNATUR_URL = isOwnerAccount
    ? 'https://loyzfkxkuyypgteskxkm.supabase.co/storage/v1/object/public/dokumente/jw-signum-lang-blau.png'
    : null;

  const [laedt, setLaedt] = useState(false);
  const [webScanLaedt, setWebScanLaedt] = useState(false);
  const [webScanStatus, setWebScanStatus] = useState('');
  const [selectedAkteId, setSelectedAkteId] = useState(null);

  const [modus, setModus] = useState('neu');
  const [jsonImport, setJsonImport] = useState('');

  const [unserZeichen, setUnserZeichen] = useState('');
  const [gegnerName, setGegnerName] = useState('');
  const [gegnerAnsprechpartner, setGegnerAnsprechpartner] = useState('');
  const [gegnerTelefon, setGegnerTelefon] = useState('');
  const [gegnerFax, setGegnerFax] = useState('');
  const [gegnerEmail, setGegnerEmail] = useState('');
  const [aktenzeichen, setAktenzeichen] = useState('');

  const [unsereFirma, setUnsereFirma] = useState('');
  const [unserAnsprechpartner, setUnserAnsprechpartner] = useState('');
  const [unserTelefon, setUnserTelefon] = useState('');
  const [unserEmail, setUnserEmail] = useState('');
  const [thema, setThema] = useState('');

  const [typ, setTyp] = useState('Eingang');
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
  const [fristExtern, setFristExtern] = useState('');
  const [wiedervorlage, setWiedervorlage] = useState('');
  const [aktion, setAktion] = useState('');
  const [kanal, setKanal] = useState('');
  const [bezugId, setBezugId] = useState('');

  const [clearOldFristen, setClearOldFristen] = useState(true);

  const [dateien, setDateien] = useState([]);
  const [briefEntwurf, setBriefEntwurf] = useState('');
  const [rawText, setRawText] = useState('');
  const [emailAnhaenge, setEmailAnhaenge] = useState([]);
  const [versandPdfUrl, setVersandPdfUrl] = useState('');
  const [tresorPrompt, setTresorPrompt] = useState(null);

  const [gegnerPrompt, setGegnerPrompt] = useState(null);
  const [faxZhd, setFaxZhd] = useState('');

  const [showUploadReminder, setShowUploadReminder] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [triageWvDate, setTriageWvDate] = useState('');

  const [showVersandHistorie, setShowVersandHistorie] = useState(false);
  const [expandedVersandId, setExpandedVersandId] = useState(null);
  const [zeigeErledigte, setZeigeErledigte] = useState(false);

  const [aufgeklappteAkten, setAufgeklappteAkten] = useState([]);
  const [mergeSourceId, setMergeSourceId] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [uploadingHistId, setUploadingHistId] = useState(null);
  const [fokussierteAkteId, setFokussierteAkteId] = useState(null);
  const [fokussierterHistId, setFokussierterHistId] = useState(null);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [isAlarmsOpen, setIsAlarmsOpen] = useState(true);

  const [isWarRoomOpen, setIsWarRoomOpen] = useState(false);
  const [activeWarRoomDossier, setActiveWarRoomDossier] = useState(null);
  const [duplikatNummerFilter, setDuplikatNummerFilter] = useState(null);

  const autoGenRef = useRef('');

  const inputStyle = {
    width: '100%',
    padding: '12px',
    boxSizing: 'border-box',
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: theme.inputBg,
    color: theme.textMain,
    outline: 'none'
  };
  const labelStyle = {
    display: 'block',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 'bold',
    color: theme.textMuted,
    marginBottom: '6px',
    textTransform: 'uppercase'
  };
  const h4StyleAkten = {
    margin: '0',
    color: theme.textMain,
    borderBottom: `1px solid ${theme.border}`,
    paddingBottom: '8px',
    fontSize: '16px',
    fontWeight: '600'
  };
  const panelStyle = {
    background: theme.cardBg,
    borderRadius: '12px',
    border: `1px solid ${theme.border}`,
    padding: '20px',
    width: '100%',
    wordBreak: 'break-word',
    boxSizing: 'border-box'
  };
  const quickBtnStyle = {
    background: theme.border,
    color: theme.textMain,
    border: 'none',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 'bold'
  };
  const inlineInputStyle = {
    background: 'transparent',
    border: '1px dashed transparent',
    color: theme.textMain,
    width: '100%',
    fontSize: '13px',
    padding: '4px',
    outline: 'none',
    cursor: 'text',
    borderBottom: `1px dashed ${theme.border}`,
    boxSizing: 'border-box'
  };

  const isDarkMode = theme.bg === '#020617';
  const btnTextColor = isDarkMode ? '#000' : '#ffffff';

  // Echte Admin-Passwortprüfung über die aktive Supabase-Session (kein festes Frontend-Secret)
  const checkAdminAuth = async (
    promptText = 'Admin-Sicherheit: Bitte Passwort eingeben, um die Sperre aufzuheben.'
  ) => {
    const userEmail = String(session?.user?.email || '').trim();
    if (!isOwnerAccount || !userEmail) {
      showToast('Nur der Administrator kann versiegelte Akten oder Sperren öffnen.', 'error');
      return false;
    }

    const pw = window.prompt(promptText);
    if (pw === null) return false;
    if (!pw.trim()) {
      showToast('Bitte ein Passwort eingeben.', 'error');
      return false;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: pw.trim()
    });

    if (error || !data?.user || data.user.id !== OWNER_USER_ID) {
      showToast('Passwort inkorrekt! Aktion blockiert.', 'error');
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (globalUrlText) {
      setBriefEntwurf(globalUrlText);
      setGlobalUrlText(null);
    }
  }, [globalUrlText, setGlobalUrlText]);

  useEffect(() => {
    if (modus === 'neu' && unsereFirma && gegnerName) {
      const mPrefix = generateMandantPrefix(unsereFirma, isOwnerAccount).toUpperCase();
      let gPrefix = gegnerName.trim().split(' ')[0].replace(/[^a-zA-ZäöüÄÖÜß0-9]/g, '');
      if (!gPrefix) gPrefix = 'Gegner';

      let maxGlobalNum = 0;
      akten.forEach((a) => {
        if (a.is_demo_showcase) return;
        const num = parseAktenNummer(a.unser_zeichen);
        if (num !== null && num > maxGlobalNum) {
          maxGlobalNum = num;
        }
      });

      const nextNum = String(maxGlobalNum + 1).padStart(4, '0');
      const newZeichen = `${nextNum}-${mPrefix}-${gPrefix}`;

      setUnserZeichen((prev) => {
        if (!prev || prev === autoGenRef.current) {
          autoGenRef.current = newZeichen;
          return newZeichen;
        }
        return prev;
      });
    }
  }, [unsereFirma, gegnerName, modus, akten, isOwnerAccount]);

  // --- BROWSER-BASIERTE WEB-INGEST-PIPELINE (SCANNER-ERSATZ IM WEB-COCKPIT) ---
  const handleWebScannerIngest = async (selectedFiles = null) => {
    const targetList = selectedFiles || dateien;
    if (!targetList || targetList.length === 0) {
      showToast('Bitte wähle zuerst eine PDF- oder MD-Datei aus!', 'warning');
      return;
    }

    const primaryFile = targetList.find((f) => f.name.toLowerCase().endsWith('.pdf')) || targetList[0];
    const isPdf = primaryFile.name.toLowerCase().endsWith('.pdf');
    const isMdOrTxt =
      primaryFile.name.toLowerCase().endsWith('.md') || primaryFile.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isMdOrTxt) {
      showToast('Für den KI-Web-Scan bitte eine PDF- oder MD-Datei wählen.', 'warning');
      return;
    }

    setWebScanLaedt(true);
    setWebScanStatus(`1/3 Lese Dokument "${primaryFile.name}" aus...`);

    try {
      let extractedText = '';
      let pdfBase64 = null;

      if (isPdf) {
        try {
          extractedText = await extractTextFromPDF(primaryFile);
        } catch (pdfErr) {
          console.warn('PDF.js Extraktions-Warnung (nutze OCR-Fallback):', pdfErr);
        }

        if (!extractedText || extractedText.replace(/--- Seite \d+ ---/g, '').trim().length < 50) {
          setWebScanStatus(`1/3 Bild-Scan erkannt – aktiviere KI-Vision-OCR für "${primaryFile.name}"...`);
          extractedText = '';
          pdfBase64 = await fileToBase64(primaryFile);
        }
      } else {
        extractedText = await primaryFile.text();
      }

      setWebScanStatus('2/3 Sende Dokument zur forensischen KI-Triage...');

      const { data: triageRes, error: triageErr } = await supabase.functions.invoke('sonar-ai-triage', {
        body: {
          mode: 'ingestion',
          text: extractedText ? extractedText.substring(0, 12000) : '',
          pdf_base64: pdfBase64 || undefined
        }
      });

      if (triageErr) {
        throw new Error(triageErr.message || 'Fehler beim Aufruf von sonar-ai-triage');
      }

      const rawReply = triageRes?.reply || triageRes;
      let parsedData = null;

      if (typeof rawReply === 'object' && rawReply !== null) {
        parsedData = rawReply;
      } else {
        const strReply = String(rawReply || '').trim();
        const jsonMatch = strReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      }

      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('KI-Triage hat kein gültiges JSON zurückgegeben.');
      }

      const ocrFallback = parsedData.extracted_ocr_text || parsedData.raw_text || '';
      delete parsedData.extracted_ocr_text;
      const finalFullText = extractedText && extractedText.trim().length >= 50 ? extractedText : ocrFallback;
      parsedData.raw_text = finalFullText;

      const rawBase = parsedData.clean_filename_base || parsedData.filename || parsedData.dateiname || '';
      delete parsedData.clean_filename_base;
      delete parsedData.filename;
      delete parsedData.dateiname;

      const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const cleanedSlug = cleanSlugForFilename(rawBase);
      const baseName = cleanedSlug || `${todayCompact}-dokument-${Date.now().toString().slice(-4)}`;

      const finalPdfName = `${baseName}.pdf`;
      const finalMdName = `${baseName}.md`;

      setWebScanStatus(`3/3 Speichere Twin-Storage (${finalPdfName} & .md) in Supabase...`);

      let uploadedPublicPdfUrl = null;

      if (isPdf) {
        const { error: pdfUpErr } = await supabase.storage
          .from('dokumente')
          .upload(finalPdfName, primaryFile, { contentType: 'application/pdf', upsert: true });

        if (pdfUpErr) {
          throw new Error('Storage-Upload (PDF) fehlgeschlagen: ' + pdfUpErr.message);
        }

        const { data: pubData } = supabase.storage.from('dokumente').getPublicUrl(finalPdfName);
        uploadedPublicPdfUrl = pubData?.publicUrl || null;
      }

      const mdContentToStore = finalFullText || parsedData.brief_entwurf || 'Kein Textinhalt erkannt.';
      const mdBlob = new Blob([mdContentToStore], { type: 'text/markdown;charset=utf-8' });
      await supabase.storage
        .from('dokumente')
        .upload(finalMdName, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });

      await syncToGithub(finalMdName, mdContentToStore, uploadedPublicPdfUrl, 'web_scan', showToast);

      if (uploadedPublicPdfUrl) {
        parsedData.pdf_url = uploadedPublicPdfUrl;
      }

      const finalJsonString = JSON.stringify(parsedData);
      if (handleJsonImportRef.current) {
        handleJsonImportRef.current({ target: { value: finalJsonString } });
      } else {
        handleJsonImport({ target: { value: finalJsonString } });
      }

      const remainingFiles = targetList.filter((f) => f !== primaryFile);
      setDateien(remainingFiles);
      if (remainingFiles.length === 0 && document.getElementById('datei-upload-manuell')) {
        document.getElementById('datei-upload-manuell').value = '';
      }

      showToast(
        `Web-Scan abgeschlossen!\nTwin-Storage angelegt: ${finalPdfName}\nAlle Felder wurden automatisch befüllt.`,
        'success'
      );
    } catch (err) {
      console.error('Web-Scanner Fehler:', err);
      showToast('Fehler beim KI-Web-Scan: ' + (err.message || err), 'error');
    } finally {
      setWebScanLaedt(false);
      setWebScanStatus('');
    }
  };

  const handleFristChange = (val) => {
    setFristExtern(val);
    if (val) setWiedervorlage('');
  };

  const handleWVChange = (val) => {
    setWiedervorlage(val);
    if (val) setFristExtern('');
  };

  const setzeWV = (tage, monate = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + tage);
    if (monate > 0) d.setMonth(d.getMonth() + monate);
    handleWVChange(d.toISOString().split('T')[0]);
  };

  const handleAkteAuswahl = (e) => {
    const val = e.target.value;
    setSelectedAkteId(val);
    setBezugId('');
    if (val) {
      const a = akten.find((x) => x.id === val);
      if (a) {
        setUnserZeichen(a.unser_zeichen || '');
        setGegnerName(a.gegner_name || '');
        setGegnerAnsprechpartner(a.gegner_ansprechpartner || '');
        setFaxZhd(a.gegner_ansprechpartner || '');
        setGegnerTelefon(formatRufnummer(a.gegner_telefon || ''));
        setGegnerEmail(a.gegner_email || '');
        setUnsereFirma(a.unsere_firma || '');
        setUnserAnsprechpartner(
          sanitizeOwnContactName(a.unser_ansprechpartner, a.gegner_ansprechpartner, a.gegner_name)
        );
        setUnserTelefon(formatRufnummer(a.unser_telefon || ''));
        setUnserEmail(a.unser_email || '');
        setThema(a.thema || '');
        setAktenzeichen(a.aktenzeichen || '');

        if (a.gegner_name) {
          const crmGegner = gegnerListe.find((g) => fuzzyMatch(g.name, a.gegner_name));
          if (crmGegner) {
            setGegnerFax(formatRufnummer(crmGegner.fax || ''));
            if (!a.gegner_email) setGegnerEmail(crmGegner.email || crmGegner.email_zentrale || '');
          } else {
            setGegnerFax('');
          }
        }
      }
    }
  };

  const springeZuAkteAusgang = (akteId, histId) => {
    setShowVersandHistorie(false);

    const zielAkte = akten.find((a) => a.id === akteId);
    if (zielAkte && zielAkte.status === 'Erledigt' && !zeigeErledigte) {
      setZeigeErledigte(true);
    }

    if (!aufgeklappteAkten.includes(akteId)) {
      setAufgeklappteAkten((prev) => [...prev, akteId]);
    }

    setFokussierteAkteId(akteId);
    setFokussierterHistId(histId);

    setTimeout(() => {
      const histElement = document.getElementById(`hist-zeile-${histId}`);
      if (histElement) {
        histElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const aktenElement = document.getElementById(`akte-karte-${akteId}`);
        if (aktenElement) {
          aktenElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 250);

    setTimeout(() => {
      setFokussierterHistId(null);
    }, 3500);
  };

  const ladeVorgangInMaske = (akte, hist) => {
    setSelectedAkteId(akte.id);
    setModus('bestehend');
    setBezugId(hist.id);

    setUnserZeichen(akte.unser_zeichen || '');
    setGegnerName(akte.gegner_name || '');
    setGegnerAnsprechpartner(akte.gegner_ansprechpartner || '');
    setFaxZhd(akte.gegner_ansprechpartner || '');
    setGegnerTelefon(formatRufnummer(akte.gegner_telefon || ''));
    setGegnerEmail(akte.gegner_email || '');
    setUnsereFirma(akte.unsere_firma || '');
    setUnserAnsprechpartner(
      sanitizeOwnContactName(akte.unser_ansprechpartner, akte.gegner_ansprechpartner, akte.gegner_name)
    );
    setUnserTelefon(formatRufnummer(akte.unser_telefon || ''));
    setUnserEmail(akte.unser_email || '');
    setThema(akte.thema || '');
    setAktenzeichen(akte.aktenzeichen || '');

    if (akte.gegner_name) {
      const crmGegner = gegnerListe.find((g) => fuzzyMatch(g.name, akte.gegner_name));
      if (crmGegner) {
        setGegnerFax(formatRufnummer(crmGegner.fax || ''));
        if (!akte.gegner_email) setGegnerEmail(crmGegner.email || crmGegner.email_zentrale || '');
      } else {
        setGegnerFax('');
      }
    }

    setTyp(hist.typ || 'Intern');
    setDatum(hist.datum ? new Date(hist.datum).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setAktion(hist.aktion || '');
    setKanal(hist.kanal || '');
    setFristExtern(hist.frist_extern || '');
    setWiedervorlage(hist.wiedervorlage || '');
    setBriefEntwurf(hist.brief_entwurf || '');
    setDateien([]);
    setEmailAnhaenge([]);

    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Vorgang "${hist.aktion || hist.typ}" in Maske geladen! Bezug gesetzt.`, 'success');
  };

  const handleNachhaken = (akteId) => {
    const akte = akten.find((a) => a.id === akteId);
    if (!akte) return;

    const safeOwnAp = sanitizeOwnContactName(akte.unser_ansprechpartner, akte.gegner_ansprechpartner, akte.gegner_name);

    setSelectedAkteId(akteId);
    setModus('bestehend');
    setBezugId('');
    setUnserZeichen(akte.unser_zeichen || '');
    setGegnerName(akte.gegner_name || '');
    setGegnerAnsprechpartner(akte.gegner_ansprechpartner || '');
    setFaxZhd(akte.gegner_ansprechpartner || '');
    setGegnerTelefon(formatRufnummer(akte.gegner_telefon || ''));
    setGegnerEmail(akte.gegner_email || '');
    setUnsereFirma(akte.unsere_firma || '');
    setUnserAnsprechpartner(safeOwnAp);
    setUnserTelefon(formatRufnummer(akte.unser_telefon || ''));
    setUnserEmail(akte.unser_email || '');
    setThema(akte.thema || '');
    setAktenzeichen(akte.aktenzeichen || '');
    setTyp('Ausgang');

    if (akte.gegner_name) {
      const crmGegner = gegnerListe.find((g) => fuzzyMatch(g.name, akte.gegner_name));
      if (crmGegner) {
        setGegnerFax(formatRufnummer(crmGegner.fax || ''));
        if (!akte.gegner_email) setGegnerEmail(crmGegner.email || crmGegner.email_zentrale || '');
      } else {
        setGegnerFax('');
      }
    }

    const defaultSenderName = isOwnerAccount ? 'Jens Wilsdorf' : akte.unsere_firma || 'Geschäftsführung';
    const template = `Sehr geehrte Damen und Herren,\n\nbezugnehmend auf unsere bisherige Korrespondenz in der obigen Angelegenheit bitten wir höflich um einen kurzen Sachstandsbericht, da wir bislang noch keine Rückmeldung erhalten haben.\n\nSollten Ihnen noch Unterlagen zur Bearbeitung fehlen, lassen Sie es uns bitte wissen.\n\nMit freundlichen Grüßen\n\n${safeOwnAp || defaultSenderName}`;
    setBriefEntwurf(template);

    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Akte geladen & Follow-Up Vorlage eingefügt!', 'success');
  };

  // --- INTELLIGENTE GEGNER-PRÜFUNG MIT MEHREREN VORSCHLÄGEN & ANSPRECHPARTNER-TIEFE ---
  const checkGegnerDiff = (neuName, neuFax, neuEmail, neuAnsprechpartner, neuTelefon) => {
    if (!neuName) return false;

    const cleanNeuAP = (neuAnsprechpartner || '').trim().toLowerCase();
    const isZentrale = !cleanNeuAP || cleanNeuAP === 'zentrale' || cleanNeuAP === 'poststelle';

    const exactTarget = gegnerListe.find((g) => normalizeName(g.name) === normalizeName(neuName));
    const fuzzyTargets = gegnerListe.filter((g) => fuzzyMatch(g.name, neuName));

    let vorschlaege = [];
    if (exactTarget) {
      const restFuzzy = fuzzyTargets.filter((f) => f.id !== exactTarget.id);
      vorschlaege = [exactTarget, ...restFuzzy];
    } else if (fuzzyTargets.length > 0) {
      vorschlaege = fuzzyTargets;
    }

    if (vorschlaege.length === 1 && exactTarget) {
      const target = vorschlaege[0];
      let contacts = [];
      try {
        contacts = typeof target.notizen === 'string' ? JSON.parse(target.notizen) : target.notizen || [];
        if (!Array.isArray(contacts)) contacts = [];
      } catch (_e) {
        contacts = [];
      }

      if (isZentrale && contacts.length === 0) {
        setGegnerName(target.name);
        if (!neuTelefon && target.telefon) setGegnerTelefon(formatRufnummer(target.telefon));
        if (!neuEmail && (target.email || target.email_zentrale)) setGegnerEmail(target.email || target.email_zentrale);
        if (!neuFax && target.fax) setGegnerFax(formatRufnummer(target.fax));
        return false;
      }

      if (!isZentrale) {
        const matchedContact = contacts.find((c) => {
          const cName = (c.name || '').trim().toLowerCase();
          const cAbt = (c.abteilung || '').trim().toLowerCase();
          return (
            (cName && (cName.includes(cleanNeuAP) || cleanNeuAP.includes(cName))) ||
            (cAbt && (cAbt.includes(cleanNeuAP) || cleanNeuAP.includes(cAbt)))
          );
        });

        if (matchedContact) {
          setGegnerName(target.name);
          const displayAP = matchedContact.name || matchedContact.abteilung || neuAnsprechpartner;
          setGegnerAnsprechpartner(displayAP);
          setFaxZhd(displayAP);
          if (!neuTelefon && matchedContact.telefon) setGegnerTelefon(formatRufnummer(matchedContact.telefon));
          if (!neuEmail && (matchedContact.email || target.email || target.email_zentrale)) {
            setGegnerEmail(matchedContact.email || target.email || target.email_zentrale);
          }
          if (!neuFax && target.fax) setGegnerFax(formatRufnummer(target.fax));
          return false;
        }
      }
    }

    setGegnerPrompt({
      typ: 'auswahl',
      obj: {
        name: neuName,
        ansprechpartner: neuAnsprechpartner,
        telefon: formatRufnummer(neuTelefon),
        fax: formatRufnummer(neuFax),
        email: neuEmail
      },
      vorschlaege: vorschlaege
    });
    return true;
  };

  const handleJsonImport = async (e) => {
    const val = e.target.value.trim();
    setJsonImport(val);

    try {
      const obj = JSON.parse(val);

      if (obj.typ === 'Bulk-Gegner' && Array.isArray(obj.daten)) {
        setLaedt(true);
        let addedCount = 0;
        let updatedCount = 0;
        for (const item of obj.daten) {
          if (!item.gegner_name) continue;
          const existingGegner = gegnerListe.find((g) => fuzzyMatch(g.name, item.gegner_name));
          if (!existingGegner) {
            await supabase.from('gegner').insert([
              {
                user_id: session.user.id,
                name: item.gegner_name,
                fax: formatRufnummer(item.fax),
                email: item.email || null,
                notizen: JSON.stringify([
                  {
                    abteilung: item.abteilung || '',
                    name: item.ansprechpartner || '',
                    telefon: formatRufnummer(item.telefon),
                    email: item.email || ''
                  }
                ])
              }
            ]);
            addedCount++;
          } else {
            const updates = {};
            let needsUpdate = false;
            if (!existingGegner.fax && item.fax) {
              updates.fax = formatRufnummer(item.fax);
              needsUpdate = true;
            }
            if (!existingGegner.email && item.email) {
              updates.email = item.email;
              needsUpdate = true;
            }
            let currentContacts = [];
            try {
              currentContacts =
                typeof existingGegner.notizen === 'string'
                  ? JSON.parse(existingGegner.notizen)
                  : existingGegner.notizen || [];
              if (!Array.isArray(currentContacts)) currentContacts = [];
            } catch (_err) {
              currentContacts = [];
            }
            if (item.ansprechpartner || item.abteilung) {
              const contactExists = currentContacts.some(
                (c) =>
                  (c.name || '').toLowerCase() === (item.ansprechpartner || '').toLowerCase() &&
                  (c.abteilung || '').toLowerCase() === (item.abteilung || '').toLowerCase()
              );
              if (!contactExists) {
                currentContacts.push({
                  abteilung: item.abteilung || '',
                  name: item.ansprechpartner || '',
                  telefon: formatRufnummer(item.telefon),
                  email: item.email || ''
                });
                updates.notizen = JSON.stringify(currentContacts);
                needsUpdate = true;
              }
            }
            if (needsUpdate) {
              await supabase.from('gegner').update(updates).eq('id', existingGegner.id);
              updatedCount++;
            }
          }
        }
        await ladeDaten();
        setJsonImport('');
        setLaedt(false);
        showToast(
          `KI-Gegner-Scan abgeschlossen!\n\n${addedCount} neue Behörden/Gegner angelegt.\n${updatedCount} bestehende aktualisiert.`,
          'success'
        );
        return;
      }

      const fallbackUnserZeichen = obj.unser_zeichen || '';
      const fallbackAktenzeichen = obj.aktenzeichen || '';
      const fallbackThema = obj.thema || obj.betreff || obj.gegenstand || '';
      const fallbackGegnerName = obj.kontakt || (obj.empfaenger ? obj.empfaenger.name : '') || '';
      const fallbackGegnerAnsprechpartner =
        obj.ansprechpartner || (obj.empfaenger ? obj.empfaenger.abteilung : '') || '';
      const fallbackGegnerTelefon = obj.gegner_telefon || '';
      const fallbackGegnerFax =
        obj.gegner_fax || obj.versand_faxnummer_gegner || (obj.empfaenger ? obj.empfaenger.fax : '') || '';
      const fallbackGegnerEmail =
        obj.gegner_email || obj.versand_e_mail_gegner || (obj.empfaenger ? obj.empfaenger.email : '') || '';

      const rawFristExtern = normalizeDateForInput(obj.frist_extern || obj.frist || '');
      const rawWiedervorlage = normalizeDateForInput(obj.wiedervorlage || obj.wv_intern || obj.wv || '');
      const parsedDocDatum = normalizeDateForInput(obj.datum || '') || new Date().toISOString().split('T')[0];

      const fallbackBriefEntwurf = obj.brief_entwurf || obj.textentwurf || obj.nachricht || '';
      const fallbackRawText = obj.raw_text || '';
      const fallbackAktion = obj.aktion || obj.status || '';
      const fallbackKanal = obj.kanal || obj.versandweg || 'Post / Fax / E-Mail';
      const fallbackTyp = obj.typ || obj.dokumententyp || 'Eingang';
      const fallbackUnsereFirma = obj.unsere_firma || (obj.absender ? obj.absender.name : '') || '';

      if (fallbackUnserZeichen) setUnserZeichen(fallbackUnserZeichen);
      setAktenzeichen(fallbackAktenzeichen);
      setThema(fallbackThema);
      setGegnerName(fallbackGegnerName);
      setGegnerAnsprechpartner(fallbackGegnerAnsprechpartner);
      setGegnerTelefon(formatRufnummer(fallbackGegnerTelefon));
      setGegnerFax(formatRufnummer(fallbackGegnerFax));
      setGegnerEmail(fallbackGegnerEmail);

      const aktionLower = fallbackAktion.toLowerCase();
      const rawLower = fallbackRawText.toLowerCase();
      const hasExplicitAuthorityDeadlineInText =
        rawLower.includes('frist') ||
        rawLower.includes('innerhalb von') ||
        rawLower.includes('bis spätestens') ||
        rawLower.includes('bis zum') ||
        rawLower.includes('rechtsbehelf');
      const looksLikeInternalWv =
        fallbackTyp !== 'Eingang' ||
        aktionLower.includes('wiedervorlage') ||
        aktionLower.includes('abwarten') ||
        aktionLower.includes('interne prüfung') ||
        (aktionLower.includes('überweisung') && !hasExplicitAuthorityDeadlineInText);

      if (rawWiedervorlage) {
        handleWVChange(rawWiedervorlage);
      } else if (rawFristExtern) {
        if (looksLikeInternalWv) {
          handleWVChange(rawFristExtern);
        } else {
          handleFristChange(rawFristExtern);
        }
      } else {
        setFristExtern('');
        setWiedervorlage('');
      }

      setBriefEntwurf(fallbackBriefEntwurf);
      setRawText(fallbackRawText);
      setAktion(fallbackAktion);
      setKanal(fallbackKanal);
      setTyp(fallbackTyp);
      setDatum(parsedDocDatum);
      setFaxZhd(fallbackGegnerAnsprechpartner);

      if (obj.pdf_url) {
        setVersandPdfUrl(obj.pdf_url);
      }

      const promptNeeded = checkGegnerDiff(
        fallbackGegnerName,
        fallbackGegnerFax,
        fallbackGegnerEmail,
        fallbackGegnerAnsprechpartner,
        fallbackGegnerTelefon
      );
      if (!promptNeeded) {
        setGegnerPrompt(null);
      }

      // --- MEHRSTUFIGE BESTANDSAKTEN-ERKENNUNG ---
      const matchResult = findBestMatchingAkteInList(
        akten,
        fallbackUnserZeichen,
        fallbackAktenzeichen,
        fallbackGegnerName,
        fallbackUnsereFirma,
        fallbackThema,
        fallbackBriefEntwurf
      );

      if (matchResult && matchResult.akte) {
        const matchedAkte = matchResult.akte;
        setModus('bestehend');
        setSelectedAkteId(matchedAkte.id);

        if (!fallbackUnserZeichen && matchedAkte.unser_zeichen) setUnserZeichen(matchedAkte.unser_zeichen);
        if (!fallbackAktenzeichen && matchedAkte.aktenzeichen) setAktenzeichen(matchedAkte.aktenzeichen);
        if (!fallbackUnsereFirma && matchedAkte.unsere_firma) setUnsereFirma(matchedAkte.unsere_firma);
        if (!fallbackGegnerEmail && matchedAkte.gegner_email) setGegnerEmail(matchedAkte.gegner_email);
        if (!fallbackGegnerTelefon && matchedAkte.gegner_telefon) {
          setGegnerTelefon(formatRufnummer(matchedAkte.gegner_telefon));
        }

        if (!fallbackGegnerFax && matchedAkte.gegner_name) {
          const crmGegner = gegnerListe.find((g) => fuzzyMatch(g.name, matchedAkte.gegner_name));
          if (crmGegner && crmGegner.fax) setGegnerFax(formatRufnummer(crmGegner.fax));
        }

        const autoBezugId = findSmartBezugInAkte(matchedAkte, obj);
        if (autoBezugId) {
          setBezugId(autoBezugId);
          showToast(
            `Bestandsakte [${matchedAkte.unser_zeichen || '---'}] (${matchResult.reason}) & Vorläufer-Vorgang automatisch verknüpft!`,
            'success'
          );
        } else if (fallbackTyp !== 'Eingang' && matchedAkte.akten_historie && matchedAkte.akten_historie.length > 0) {
          const sortedHist = [...matchedAkte.akten_historie].sort(
            (a, b) => new Date(b.datum || 0) - new Date(a.datum || 0)
          );
          const latestEingang = sortedHist.find((h) => h.typ === 'Eingang') || sortedHist[0];
          if (latestEingang) {
            setBezugId(latestEingang.id);
            showToast(
              `Bestandsakte [${matchedAkte.unser_zeichen || '---'}] erkannt & auf letzten Vorgang bezogen!`,
              'success'
            );
          } else {
            setBezugId('');
          }
        } else {
          setBezugId('');
          showToast(
            `Bestandsakte [${matchedAkte.unser_zeichen || '---'}] (${matchResult.reason}) automatisch ausgewählt!`,
            'success'
          );
        }
      } else {
        setModus('neu');
        setSelectedAkteId(null);
        setBezugId('');
      }

      // --- INTELLIGENTE TRESOR-PRÜFUNG ---
      if (fallbackUnsereFirma) {
        const rawOwnAp =
          cleanVal(obj.unser_ansprechpartner) ||
          (obj.absender ? cleanVal(obj.absender.ansprechpartner || obj.absender.name) : '') ||
          '';
        const parsedAnsprechpartner = sanitizeOwnContactName(
          rawOwnAp,
          fallbackGegnerAnsprechpartner,
          fallbackGegnerName
        );
        const parsedTelefon = formatRufnummer(cleanVal(obj.unser_telefon) || '');
        const parsedEmail = cleanVal(obj.unser_email) || '';
        const parsedAdresse =
          cleanVal(obj.unsere_adresse) ||
          (obj.absender ? `${obj.absender.strasse || ''}, ${obj.absender.plz_ort || ''}` : '') ||
          '';

        const fuzzyMandanten = mandanten.filter((m) => fuzzyMatch(m.firmenname, fallbackUnsereFirma));

        setUnsereFirma(fallbackUnsereFirma);
        setUnserAnsprechpartner(parsedAnsprechpartner);
        setUnserTelefon(parsedTelefon);
        setUnserEmail(parsedEmail);

        if (fuzzyMandanten.length === 1 && cleanOrgName(fuzzyMandanten[0].firmenname) === cleanOrgName(fallbackUnsereFirma)) {
          setUnsereFirma(fuzzyMandanten[0].firmenname);
          setUnserAnsprechpartner(
            parsedAnsprechpartner ||
              sanitizeOwnContactName(
                fuzzyMandanten[0].ansprechpartner,
                fallbackGegnerAnsprechpartner,
                fallbackGegnerName
              )
          );
          setUnserTelefon(parsedTelefon || cleanVal(fuzzyMandanten[0].telefon) || '');
          setUnserEmail(parsedEmail || cleanVal(fuzzyMandanten[0].email) || '');
          setTresorPrompt(null);
        } else {
          setTresorPrompt({
            typ: 'auswahl',
            obj: {
              ...obj,
              unsere_firma: fallbackUnsereFirma,
              unser_ansprechpartner: parsedAnsprechpartner,
              unser_telefon: parsedTelefon,
              unser_email: parsedEmail,
              unsere_adresse: parsedAdresse
            },
            vorschlaege: fuzzyMandanten
          });
        }
      }
    } catch (err) {
      console.error('JSON Error:', err);
    }
  };

  // --- INTELLIGENTER TRESOR ACCEPT-HANDLER ---
  const handleTresorPromptAccept = async (actionType = 'neu', targetId = null) => {
    if (!tresorPrompt) return;

    if (actionType === 'neu') {
      const { data, error } = await supabase
        .from('mandanten')
        .insert([
          {
            user_id: session.user.id,
            firmenname: tresorPrompt.obj.unsere_firma,
            ansprechpartner: sanitizeOwnContactName(
              tresorPrompt.obj.unser_ansprechpartner,
              gegnerAnsprechpartner,
              gegnerName
            ),
            telefon: formatRufnummer(cleanVal(tresorPrompt.obj.unser_telefon) || ''),
            email: cleanVal(tresorPrompt.obj.unser_email) || '',
            adresse: cleanVal(tresorPrompt.obj.unsere_adresse) || '',
            steuernummer: cleanVal(tresorPrompt.obj.unsere_steuernummer) || '',
            ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || '',
            betriebsnummer: cleanVal(tresorPrompt.obj.unsere_betriebsnummer) || '',
            vbg_nummer: cleanVal(tresorPrompt.obj.unsere_vbg_nummer) || '',
            handelsregister: cleanVal(tresorPrompt.obj.unsere_handelsregister) || '',
            iban: cleanVal(tresorPrompt.obj.unsere_iban) || ''
          }
        ])
        .select();
      if (!error && data) {
        showToast(`Mandant "${tresorPrompt.obj.unsere_firma}" im Tresor angelegt!`, 'success');
        ladeDaten();
      }
    } else if (actionType === 'zuweisen' && targetId) {
      const existing = mandanten.find((m) => m.id === targetId);
      if (existing) {
        setUnsereFirma(existing.firmenname);
        setUnserAnsprechpartner(
          sanitizeOwnContactName(existing.ansprechpartner, gegnerAnsprechpartner, gegnerName) ||
            sanitizeOwnContactName(tresorPrompt.obj.unser_ansprechpartner, gegnerAnsprechpartner, gegnerName)
        );
        if (existing.telefon && !unserTelefon) setUnserTelefon(formatRufnummer(existing.telefon));
        if (existing.email && !unserEmail) setUnserEmail(existing.email);
        showToast(`Zuweisung zu Mandant "${existing.firmenname}" erfolgreich!`, 'success');
      }
    }
    setTresorPrompt(null);
  };

  // --- INTELLIGENTER GEGNER ACCEPT-HANDLER ---
  const handleGegnerPromptAccept = async (actionType = 'neu', targetId = null, contactOption = null) => {
    if (!gegnerPrompt) return;

    if (actionType === 'neu') {
      const apAbt = contactOption?.abteilung || '';
      const apName = contactOption?.name !== undefined ? contactOption.name : gegnerPrompt.obj.ansprechpartner || '';
      const apTel = formatRufnummer(
        contactOption?.telefon !== undefined ? contactOption.telefon : gegnerPrompt.obj.telefon || ''
      );
      const apMail = contactOption?.email !== undefined ? contactOption.email : gegnerPrompt.obj.email || '';

      await supabase.from('gegner').insert([
        {
          user_id: session.user.id,
          name: gegnerPrompt.obj.name,
          fax: formatRufnummer(gegnerPrompt.obj.fax),
          email: apMail || gegnerPrompt.obj.email || null,
          notizen: JSON.stringify([
            {
              abteilung: apAbt,
              name: apName,
              telefon: apTel,
              email: apMail
            }
          ])
        }
      ]);

      const displayAP = apName || apAbt || '';
      setGegnerName(gegnerPrompt.obj.name);
      setGegnerAnsprechpartner(displayAP);
      setFaxZhd(displayAP);
      if (apTel) setGegnerTelefon(apTel);
      if (apMail) setGegnerEmail(apMail);

      showToast(`Behörde/Gegner "${gegnerPrompt.obj.name}" ins CRM aufgenommen!`, 'success');
    } else if (actionType === 'zuweisen' && targetId) {
      const existing = gegnerListe.find((g) => String(g.id) === String(targetId));
      if (existing) {
        setGegnerName(existing.name);
        if (existing.fax && !gegnerFax) setGegnerFax(formatRufnummer(existing.fax));

        const gUpdates = {};
        let currentContacts = [];
        try {
          currentContacts =
            typeof existing.notizen === 'string' ? JSON.parse(existing.notizen) : existing.notizen || [];
        } catch (_e) {}
        if (!Array.isArray(currentContacts)) currentContacts = [];

        if (contactOption && contactOption.mode === 'existing') {
          if (contactOption.index === 'zentrale') {
            setGegnerAnsprechpartner('Zentrale');
            setFaxZhd('Zentrale');
            if (existing.telefon) setGegnerTelefon(formatRufnummer(existing.telefon));
            if (existing.email || existing.email_zentrale) setGegnerEmail(existing.email || existing.email_zentrale);
          } else {
            const chosen = currentContacts[Number(contactOption.index)];
            if (chosen) {
              const displayAP = chosen.name || chosen.abteilung || '';
              setGegnerAnsprechpartner(displayAP);
              setFaxZhd(displayAP);
              if (chosen.telefon) setGegnerTelefon(formatRufnummer(chosen.telefon));
              if (chosen.email || existing.email || existing.email_zentrale) {
                setGegnerEmail(chosen.email || existing.email || existing.email_zentrale);
              }
            }
          }
          showToast(`Gegner "${existing.name}" und Ansprechpartner übernommen!`, 'success');
        } else {
          const newAbt = (contactOption?.abteilung || '').trim();
          const newName = (
            contactOption?.name !== undefined ? contactOption.name : gegnerPrompt.obj.ansprechpartner || ''
          ).trim();
          const newTel = formatRufnummer(
            contactOption?.telefon !== undefined ? contactOption.telefon : gegnerPrompt.obj.telefon || ''
          );
          const newMail = (
            contactOption?.email !== undefined ? contactOption.email : gegnerPrompt.obj.email || ''
          ).trim();

          if (newName || newAbt) {
            const existingIdx = currentContacts.findIndex(
              (c) =>
                (c.name || '').trim().toLowerCase() === newName.toLowerCase() &&
                (c.abteilung || '').trim().toLowerCase() === newAbt.toLowerCase()
            );

            if (existingIdx === -1) {
              currentContacts.push({
                abteilung: newAbt,
                name: newName,
                telefon: newTel,
                email: newMail
              });
              gUpdates.notizen = JSON.stringify(currentContacts);
            } else {
              if (newTel && !currentContacts[existingIdx].telefon) currentContacts[existingIdx].telefon = newTel;
              if (newMail && !currentContacts[existingIdx].email) currentContacts[existingIdx].email = newMail;
              gUpdates.notizen = JSON.stringify(currentContacts);
            }

            const displayAP = newName || newAbt;
            setGegnerAnsprechpartner(displayAP);
            setFaxZhd(displayAP);
          }

          if (newTel) setGegnerTelefon(newTel);
          if (newMail) setGegnerEmail(newMail);
          else if (existing.email || existing.email_zentrale) setGegnerEmail(existing.email || existing.email_zentrale);

          if (!existing.fax && gegnerPrompt.obj.fax) gUpdates.fax = formatRufnummer(gegnerPrompt.obj.fax);
          if (!existing.email && newMail) gUpdates.email = newMail;

          if (Object.keys(gUpdates).length > 0) {
            await supabase.from('gegner').update(gUpdates).eq('id', existing.id);
            showToast(`Neuer Kontakt bei "${existing.name}" im CRM gespeichert & zugewiesen!`, 'success');
          } else {
            showToast(`Gegner "${existing.name}" zugewiesen.`, 'success');
          }
        }
      }
    }

    ladeDaten();
    setGegnerPrompt(null);
  };

  const handleInlineEdit = async (histId, feld, wert) => {
    if (feld === 'is_locked' && wert === false) {
      const ok = await checkAdminAuth('Admin-Sicherheit: Vorgang entsperren? Bitte Admin-Passwort eingeben.');
      if (!ok) return;
    }

    const dbWert = typeof wert === 'boolean' ? wert : wert !== '' ? wert : null;
    const updates = { [feld]: dbWert };

    if (feld === 'frist_extern' && wert) updates.wiedervorlage = null;
    if (feld === 'wiedervorlage' && wert) updates.frist_extern = null;

    const { error } = await supabase.from('akten_historie').update(updates).eq('id', histId);
    if (!error) {
      ladeDaten();
    } else {
      showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
  };

  const handleTerminVerschieben = async (item, tagePlus) => {
    const basisDatumStr = item.aktivesDatum || item.wiedervorlage || item.frist_extern;
    const basis = basisDatumStr ? new Date(basisDatumStr) : new Date();
    const neuDate = new Date(basis);
    neuDate.setDate(neuDate.getDate() + tagePlus);
    const neuIso = neuDate.toISOString().split('T')[0];

    if (!item.isWiedervorlage && (item.frist_extern || !item.wiedervorlage)) {
      const fristDatum = item.frist_extern
        ? new Date(item.frist_extern).toLocaleDateString('de-DE')
        : formatDatum(item.aktivesDatum);
      const text =
        `ACHTUNG: Es handelt sich um eine behördliche Frist (Fälligkeit: ${fristDatum})!\n\n` +
        `Lass diese Frist keinesfalls kommentarlos verstreichen. Nutze die Möglichkeit im War-Room, ` +
        `die Behörde fristwahrend um eine Fristverlängerung zu bitten oder die Aussetzung der Vollziehung zu beantragen.\n\n` +
        `Möchtest du die Frist dennoch eigenverantwortlich um +${tagePlus} Tage (auf den ${formatDatum(neuIso)}) verschieben?`;

      if (!window.confirm(text)) {
        return;
      }
      await handleInlineEdit(item.id, 'frist_extern', neuIso);
      showToast(
        `Behördliche Frist um +${tagePlus} Tage verschoben (${formatDatum(neuIso)})! Bitte rechtzeitig Schreiben senden.`,
        'warning'
      );
    } else {
      const wvDatum = item.wiedervorlage
        ? new Date(item.wiedervorlage).toLocaleDateString('de-DE')
        : formatDatum(item.aktivesDatum);
      const text = `Interne Wiedervorlage (Fällig: ${wvDatum}) um +${tagePlus} Tage auf den ${formatDatum(neuIso)} verschieben?`;
      if (!window.confirm(text)) {
        return;
      }
      await handleInlineEdit(item.id, 'wiedervorlage', neuIso);
      showToast(`Wiedervorlage um +${tagePlus} Tage verschoben (${formatDatum(neuIso)}).`, 'success');
    }

    setOpenMenuId(null);
  };

  // Gemeinsame Wiedereröffnung für Status-Wechsel auf 'Offen' und Klick aufs Schloss bei erledigten Akten
  const reopenErledigteAkte = async (akteId) => {
    const bestaetigung = window.confirm(
      "Diese Akte ist als 'Erledigt' archiviert & versiegelt. Wollen Sie die Akte wirklich wieder öffnen und alle Vorgänge entsperren?"
    );
    if (!bestaetigung) return;

    const ok = await checkAdminAuth('Admin-Sicherheit: Bitte Passwort eingeben, um die Akte wieder zu öffnen.');
    if (!ok) return;

    const { error } = await supabase.from('akten').update({ status: 'Offen', is_locked: false }).eq('id', akteId);
    if (!error) {
      await supabase.from('akten_historie').update({ is_locked: false }).eq('akte_id', akteId);
      await supabase.from('akten_historie').insert([
        {
          akte_id: akteId,
          user_id: session.user.id,
          typ: 'Intern',
          datum: new Date().toISOString().split('T')[0],
          aktion: 'Akte durch Admin wiedereröffnet & entsperrt.'
        }
      ]);
      ladeDaten();
      showToast('Akte wurde wieder geöffnet und alle Vorgänge entsperrt.', 'success');
    } else {
      showToast('Fehler beim Wiederöffnen der Akte: ' + error.message, 'error');
    }
  };

  const handleAkteStammdatenEdit = async (akteId, feld, wert) => {
    const aktuelleAkte = akten.find((a) => a.id === akteId);

    if (feld === 'is_locked') {
      if (wert === false) {
        if (aktuelleAkte?.status === 'Erledigt') {
          await reopenErledigteAkte(akteId);
          return;
        }
        const ok = await checkAdminAuth(
          'Admin-Sicherheit: Wollen Sie die Sperre dieser Akte öffnen? Bitte Passwort eingeben.'
        );
        if (!ok) return;
      } else if (wert === true && aktuelleAkte?.status !== 'Erledigt') {
        const alsErledigtSchliessen = window.confirm(
          "Akte versiegeln und direkt auf 'Erledigt' setzen? (OK = Auf 'Erledigt' setzen & versiegeln, Abbrechen = Vorgang abbrechen)"
        );
        if (!alsErledigtSchliessen) return;
        await toggleAkteStatus(akteId, aktuelleAkte?.status || 'Offen');
        return;
      }
    }

    // Zukunftsschutz gegen doppelte Aktennummern beim händischen Ändern in der Liste
    if (feld === 'unser_zeichen' && wert && String(wert).trim() !== '') {
      const trimmedZeichen = String(wert).trim();
      const candidateNum = parseAktenNummer(trimmedZeichen);
      const konfligierendeAkte = akten.find((a) => {
        if (a.id === akteId || a.is_demo_showcase) return false;
        if (cleanZeichenString(a.unser_zeichen) === cleanZeichenString(trimmedZeichen)) return true;
        if (candidateNum !== null && parseAktenNummer(a.unser_zeichen) === candidateNum) return true;
        return false;
      });

      if (konfligierendeAkte) {
        showToast(
          `Speichern blockiert: Die Aktennummer / das Zeichen kollidiert mit der bestehenden Akte [${konfligierendeAkte.unser_zeichen}] (${konfligierendeAkte.gegner_name || 'Unbekannt'}).`,
          'error'
        );
        ladeDaten();
        return;
      }
    }

    const dbWert = typeof wert === 'boolean' ? wert : wert !== '' ? wert : null;
    const { error } = await supabase.from('akten').update({ [feld]: dbWert }).eq('id', akteId);
    if (!error) {
      ladeDaten();
    } else {
      showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
  };

  const loescheHistorieEintrag = async (histId) => {
    if (!window.confirm('Diesen gesamten Eintrag inkl. aller darin verknüpften Dateien aus der Akte löschen?')) return;
    await supabase.from('akten_historie').delete().eq('id', histId);
    ladeDaten();
    showToast('Eintrag komplett gelöscht!', 'success');
  };

  const loescheDateiAusHistorie = async (histId, aktuelleUrls, urlZumLoeschen) => {
    if (!window.confirm('Diese Datei wirklich aus dem Akten-Eintrag entfernen?')) return;
    const urlArray = aktuelleUrls.split(',');
    const neueUrls = urlArray.filter((url) => url !== urlZumLoeschen);
    const neuerUrlString = neueUrls.length > 0 ? neueUrls.join(',') : null;

    const { error: dbError } = await supabase
      .from('akten_historie')
      .update({ dokument_url: neuerUrlString })
      .eq('id', histId);
    if (!dbError) {
      try {
        const parts = decodeURIComponent(urlZumLoeschen).split('/');
        const fileName = parts[parts.length - 1];
        await supabase.storage.from('dokumente').remove([fileName]);
      } catch (_e) {}
      ladeDaten();
      showToast('Datei erfolgreich entfernt!', 'success');
    } else {
      showToast('Fehler beim Entfernen der Datei: ' + dbError.message, 'error');
    }
  };

  const toggleAkteStatus = async (akteId, currentStatus) => {
    const neuerStatus = currentStatus === 'Erledigt' ? 'Offen' : 'Erledigt';

    if (neuerStatus === 'Offen') {
      await reopenErledigteAkte(akteId);
    } else {
      const bestaetigung = window.confirm(
        "Akte auf 'Erledigt' setzen? Die Akte und alle Vorgänge werden dadurch versiegelt. Einsicht und Downloads bleiben weiterhin möglich, aber eine Wiedereröffnung zur Bearbeitung erfordert zwingend Administrator-Rechte. Fortfahren?"
      );
      if (!bestaetigung) return;

      const { error } = await supabase
        .from('akten')
        .update({ status: neuerStatus, is_locked: true })
        .eq('id', akteId);
      if (!error) {
        await supabase.from('akten_historie').update({ is_locked: true }).eq('akte_id', akteId);

        const d = new Date();
        d.setFullYear(d.getFullYear() + 10);
        const wvDatum = d.toISOString().split('T')[0];
        await supabase.from('akten_historie').insert([
          {
            akte_id: akteId,
            user_id: session.user.id,
            typ: 'Intern',
            datum: new Date().toISOString().split('T')[0],
            aktion: 'Akte geschlossen. Automatische Wiedervorlage zur Löschung (Ablauf Aufbewahrungsfrist).',
            wiedervorlage: wvDatum,
            is_locked: true
          }
        ]);
        ladeDaten();
        showToast('Akte und alle Vorgänge versiegelt und geschlossen.', 'success');
      } else {
        showToast('Fehler beim Ändern des Akten-Status: ' + error.message, 'error');
      }
    }
  };

  const handleNachtragUploadAkte = async (histId, currentUrls, akteFirma, akteGegner, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingHistId(histId);
    const isMd = file.name.toLowerCase().endsWith('.md');
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const dateiName = `h_${Date.now()}_${sichererDateiname}`;

    if (isMd) {
      const mdInhalt = await file.text();
      const baseInfo = `Nachträglich an Akte angehängt. Gegner: ${akteGegner || 'Unbekannt'}`;
      const mdBlob = new Blob([mdInhalt], { type: 'text/markdown;charset=utf-8' });
      const { error: upErr } = await supabase.storage
        .from('dokumente')
        .upload(dateiName, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });
      let mdPubUrl = null;
      if (!upErr) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        mdPubUrl = linkData?.publicUrl || null;
      }
      await supabase.from('wissensdatenbank').insert([
        {
          datei_name: file.name,
          firma: akteFirma || 'Allgemein',
          inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`,
          dokument_url: mdPubUrl
        }
      ]);
      await syncToGithub(file.name, mdInhalt, null, null, showToast);
      ladeDaten();
      showToast('MD-Dokument im Wissensspeicher hinterlegt!', 'success');
    } else {
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file, { upsert: true });
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        const newUrl = linkData.publicUrl;
        const updatedUrls = currentUrls ? `${currentUrls},${newUrl}` : newUrl;
        await supabase.from('akten_historie').update({ dokument_url: updatedUrls }).eq('id', histId);

        let extrahierterText = '';
        if (isPdf) {
          try {
            extrahierterText = await extractTextFromPDF(file);
          } catch (_err) {}
        }
        const infoTxt =
          extrahierterText && extrahierterText.trim().length > 50
            ? `Nachträglich an Akte angehängt. Gegner: ${akteGegner || 'Unbekannt'}\n\n${extrahierterText.substring(0, 3000)}`
            : `Nachträglich an Akte angehängt. Gegner: ${akteGegner || 'Unbekannt'}`;

        await supabase.from('wissensdatenbank').insert([
          {
            datei_name: file.name,
            firma: akteFirma || 'Allgemein',
            inhalt_text: infoTxt,
            dokument_url: newUrl
          }
        ]);

        if (isPdf && extrahierterText && extrahierterText.trim().length > 50) {
          const twinName = dateiName.replace(/\.[^/.]+$/, '') + '.md';
          const mdDisplayName = file.name.replace(/\.[^/.]+$/, '') + '.md';
          const twinBlob = new Blob([extrahierterText], { type: 'text/markdown;charset=utf-8' });
          const { error: twinErr } = await supabase.storage
            .from('dokumente')
            .upload(twinName, twinBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });
          let twinPubUrl = newUrl;
          if (!twinErr) {
            const { data: twinLink } = supabase.storage.from('dokumente').getPublicUrl(twinName);
            if (twinLink?.publicUrl) twinPubUrl = twinLink.publicUrl;
          }
          await supabase.from('wissensdatenbank').insert([
            {
              datei_name: mdDisplayName,
              firma: akteFirma || 'Allgemein',
              inhalt_text: infoTxt,
              dokument_url: twinPubUrl
            }
          ]);
          await syncToGithub(mdDisplayName, extrahierterText, newUrl, 'nachtrag_upload', showToast);
        } else {
          await syncToGithub(file.name.replace(/\.[^/.]+$/, '') + '.md', infoTxt, newUrl, 'nachtrag_upload', showToast);
        }

        ladeDaten();
        showToast('Dokument erfolgreich angehängt!', 'success');
      } else {
        showToast('Fehler beim Upload: ' + uploadError.message, 'error');
      }
    }
    setUploadingHistId(null);
    e.target.value = '';
  };

  const handleResendVersand = async (versandArt) => {
    if (!briefEntwurf || briefEntwurf.trim() === '') {
      showToast('Bitte gib zuerst einen Text im Schreibfenster ein!', 'warning');
      return;
    }
    if (!gegnerEmail && versandArt === 'email') {
      showToast('Bitte trage zuerst eine E-Mail-Adresse der Gegenseite / Behörde ein!', 'warning');
      return;
    }
    if (!gegnerFax && versandArt === 'fax') {
      showToast('Bitte trage zuerst eine Faxnummer der Gegenseite ein!', 'warning');
      return;
    }

    setLaedt(true);
    try {
      const formattedFax = formatRufnummer(gegnerFax);
      const rawFax = formattedFax ? formattedFax.replace(/[^0-9+]/g, '') : '';
      const targetAddress = versandArt === 'email' ? gegnerEmail : `${rawFax}@simple-fax.de`;
      const betreff = `Unser Zeichen: ${unserZeichen || 'Neu'} / AZ: ${aktenzeichen || 'Neu'} — ${thema || 'Schreiben'}`;

      const safeUnserAnsprechpartner = sanitizeOwnContactName(
        unserAnsprechpartner,
        faxZhd || gegnerAnsprechpartner,
        gegnerName
      );

      const firmaSearch = (unsereFirma || '').toLowerCase().trim();
      const matchedMandant =
        mandanten.find((m) => {
          if (fuzzyMatch(m.firmenname, unsereFirma)) return true;
          if (isOwnerAccount && m.firmenname) {
            const mLow = m.firmenname.toLowerCase();
            if (
              (firmaSearch === 'wus' || firmaSearch === 'w&s' || firmaSearch === 'wosfi') &&
              mLow.includes('wilsdorf') &&
              mLow.includes('sommer')
            ) {
              return true;
            }
            if (firmaSearch === 'sbs' && mLow.includes('smartbizz')) return true;
            if (firmaSearch === 'bam' && mLow.includes('brand')) return true;
            if (firmaSearch === 'jw' && mLow.includes('jens wilsdorf')) return true;
          }
          return false;
        }) || null;

      const mandantProfil = matchedMandant
        ? {
            ...matchedMandant,
            email: matchedMandant.email || unserEmail || null,
            ansprechpartner:
              sanitizeOwnContactName(matchedMandant.ansprechpartner, faxZhd || gegnerAnsprechpartner, gegnerName) ||
              safeUnserAnsprechpartner ||
              null
          }
        : unserEmail || safeUnserAnsprechpartner
          ? {
              firmenname: unsereFirma || null,
              email: unserEmail || null,
              ansprechpartner: safeUnserAnsprechpartner || null
            }
          : null;

      const alleAnhangDateien = [...emailAnhaenge, ...dateien].filter(
        (f) => f && f.name && !f.name.toLowerCase().endsWith('.md')
      );

      const extraAttachments = [];
      if (alleAnhangDateien.length > 0) {
        showToast(
          versandArt === 'email' ? 'Verarbeite Dateien für E-Mail-Anhang...' : 'Verarbeite Dateien für Fax-Anhang...',
          'success'
        );
        for (const f of alleAnhangDateien) {
          try {
            const b64 = await fileToBase64(f);
            extraAttachments.push({ filename: f.name, content: b64 });
          } catch (err) {
            console.error('Fehler beim Konvertieren der Datei', f.name, err);
          }
        }
      }

      const cleanTextForPdf = String(briefEntwurf || '')
        .replace(/🔴/g, '***')
        .replace(/\*\*(.*?)\*\*/g, '$1');

      const defaultFirmaName = isOwnerAccount ? 'Jens Wilsdorf' : safeUnserAnsprechpartner || 'Mandant';
      const userLoginEmail = session?.user?.email ? String(session.user.email).trim() : '';

      const response = await fetch('https://loyzfkxkuyypgteskxkm.supabase.co/functions/v1/sonar-send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          to: targetAddress,
          subject: betreff,
          text: cleanTextForPdf,
          isOwnerAccount: isOwnerAccount,
          userLoginEmail: userLoginEmail,
          signatureUrl: SIGNATUR_URL,
          unsereFirma: unsereFirma || matchedMandant?.firmenname || defaultFirmaName,
          mandantProfil: mandantProfil,
          gegnerName: gegnerName,
          gegnerAnsprechpartner: faxZhd || gegnerAnsprechpartner,
          gegnerFax: rawFax,
          extraAttachments: extraAttachments.length > 0 ? extraAttachments : undefined
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || resData.message || JSON.stringify(resData));
      }
      if (resData.pdfUrl) {
        setVersandPdfUrl(resData.pdfUrl);
      }

      const successAktion = `${versandArt === 'email' ? 'E-Mail' : 'E-Fax (Simple-Fax)'} versendet an ${targetAddress}`;
      const successKanal = versandArt === 'email' ? 'E-Mail (Resend)' : 'E-Fax (Simple-Fax via Resend)';

      setAktion(successAktion);
      setKanal(successKanal);
      setTyp('Ausgang');
      showToast(
        `${versandArt === 'email' ? 'E-Mail' : 'E-Fax'} erfolgreich versendet! Auto-Save wird ausgeführt...`,
        'success'
      );

      await speichereEintragLogik({
        overridePdfUrl: resData.pdfUrl || null,
        overrideAktion: successAktion,
        overrideKanal: successKanal,
        overrideTyp: 'Ausgang'
      });
    } catch (e) {
      console.error('Versandfehler:', e);
      showToast('Rückmeldung von Resend: ' + e.message, 'error');
      setLaedt(false);
    }
  };

  const proceedToSaveOrTriage = () => {
    setShowUploadReminder(false);
    if (typ === 'Eingang') {
      setShowTriageModal(true);
    } else {
      speichereEintragLogik();
    }
  };

  const handleSpeichernCheck = (e) => {
    e.preventDefault();
    if (dateien.length === 0 && emailAnhaenge.length === 0 && !versandPdfUrl) {
      setShowUploadReminder(true);
    } else {
      proceedToSaveOrTriage();
    }
  };

  const speichereEintragLogik = async (autoSaveOverrides = null) => {
    setShowUploadReminder(false);
    setLaedt(true);

    const alleUrls = [];
    const zuSpeicherndeDateien = [...dateien, ...emailAnhaenge];
    const zugewieseneFirma =
      unsereFirma || (tresorPrompt && tresorPrompt.typ === 'neu' ? tresorPrompt.obj.unsere_firma : 'Allgemein');

    if (zuSpeicherndeDateien && zuSpeicherndeDateien.length > 0) {
      for (const f of zuSpeicherndeDateien) {
        const isMd = f.name.toLowerCase().endsWith('.md');
        const isPdf = f.name.toLowerCase().endsWith('.pdf');

        if (isMd) {
          const fileInhalt = await f.text();
          const baseInfo = `Upload via Akten-Cockpit. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}`;
          const finalDbText = `${baseInfo}\n\n${fileInhalt.substring(0, 3000)}...`;
          const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const dateiName = `${Date.now()}_${sichererDateiname}`;
          const mdBlob = new Blob([fileInhalt], { type: 'text/markdown;charset=utf-8' });
          const { error: upErr } = await supabase.storage
            .from('dokumente')
            .upload(dateiName, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });

          let mdPubUrl = null;
          if (!upErr) {
            const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
            mdPubUrl = linkData?.publicUrl || null;
          }

          await supabase.from('wissensdatenbank').insert([
            {
              datei_name: f.name,
              firma: zugewieseneFirma,
              inhalt_text: finalDbText,
              dokument_url: mdPubUrl
            }
          ]);
          await syncToGithub(f.name, fileInhalt, null, null, showToast);
        } else {
          const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const dateiName = `${Date.now()}_${sichererDateiname}`;
          const { error: uploadError } = await supabase.storage
            .from('dokumente')
            .upload(dateiName, f, { upsert: true });
          if (!uploadError) {
            const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
            const pdfPubUrl = linkData.publicUrl;
            alleUrls.push(pdfPubUrl);
            const hatMdGegenstueck = zuSpeicherndeDateien.some(
              (d) => d.name.toLowerCase() === f.name.toLowerCase().replace('.pdf', '.md')
            );
            let extrahierterText = '';
            let finalDbText = `Upload via Akten-Cockpit. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}`;

            if (isPdf && !hatMdGegenstueck) {
              showToast(`Lese digitalen Text aus PDF (${f.name}) aus...`, 'success');
              try {
                extrahierterText = await extractTextFromPDF(f);
              } catch (err) {
                console.error('Fehler bei PDF-Extraktion:', err);
              }
            }

            const textFuerWissen =
              extrahierterText && extrahierterText.trim().length > 50 ? extrahierterText : rawText || briefEntwurf || '';

            if (textFuerWissen) {
              finalDbText = `Auto-Extraktion (PDF). Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}\n\n${textFuerWissen.substring(0, 3000)}...`;
            }

            await supabase.from('wissensdatenbank').insert([
              {
                datei_name: f.name,
                firma: zugewieseneFirma,
                inhalt_text: finalDbText,
                dokument_url: pdfPubUrl
              }
            ]);

            if (isPdf && !hatMdGegenstueck && textFuerWissen.trim().length > 0) {
              const storageMdName = dateiName.replace(/\.[^/.]+$/, '') + '.md';
              const mdFileName = f.name.replace(/\.[^/.]+$/, '') + '.md';
              const mdInhalt = `${finalDbText}\n\nOriginal-PDF: ${pdfPubUrl}\n\n${textFuerWissen}`;
              const mdBlob = new Blob([mdInhalt], { type: 'text/markdown;charset=utf-8' });
              const { error: twinUpErr } = await supabase.storage
                .from('dokumente')
                .upload(storageMdName, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });

              let mdPubUrl = pdfPubUrl;
              if (!twinUpErr) {
                const { data: twinLinkData } = supabase.storage.from('dokumente').getPublicUrl(storageMdName);
                if (twinLinkData?.publicUrl) mdPubUrl = twinLinkData.publicUrl;
              }

              await supabase.from('wissensdatenbank').insert([
                {
                  datei_name: mdFileName,
                  firma: zugewieseneFirma,
                  inhalt_text: finalDbText,
                  dokument_url: mdPubUrl
                }
              ]);
              await syncToGithub(mdFileName, mdInhalt, pdfPubUrl, null, showToast);
            }
          }
        }
      }
    }

    const activeVersandPdfUrl =
      autoSaveOverrides && autoSaveOverrides.overridePdfUrl !== undefined
        ? autoSaveOverrides.overridePdfUrl
        : versandPdfUrl;
    const activeTyp =
      autoSaveOverrides && autoSaveOverrides.overrideTyp !== undefined ? autoSaveOverrides.overrideTyp : typ;

    if (activeVersandPdfUrl) {
      alleUrls.push(activeVersandPdfUrl);
      const urlParts = decodeURIComponent(activeVersandPdfUrl).split('/');
      const rawStoragePdfName = urlParts[urlParts.length - 1].split('?')[0];
      const fallbackPrefix = activeTyp === 'Ausgang' ? 'Ausgang' : activeTyp === 'Eingang' ? 'Eingang' : 'Dokument';
      const fallbackBase = `${fallbackPrefix}_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30)}`;

      const finalPdfDbName =
        rawStoragePdfName && rawStoragePdfName.toLowerCase().endsWith('.pdf')
          ? rawStoragePdfName
          : `${fallbackBase}.pdf`;
      const finalMdDbName = finalPdfDbName.replace(/\.[^/.]+$/, '') + '.md';

      const volltextQuelle = rawText && rawText.trim().length > 0 ? rawText : briefEntwurf || '';
      const briefTxt = `${activeTyp}-Dokument. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}\n\n${volltextQuelle}`.substring(
        0,
        3000
      );

      await supabase.from('wissensdatenbank').insert([
        {
          datei_name: finalPdfDbName,
          firma: zugewieseneFirma,
          inhalt_text: briefTxt,
          dokument_url: activeVersandPdfUrl
        }
      ]);

      const mdInhalt = `${activeTyp}-Dokument\nGegenstand: ${thema || 'Ohne Gegenstand'}\nGegner: ${gegnerName || 'Unbekannt'}\nLink: ${activeVersandPdfUrl}\n\nDokumententext:\n${volltextQuelle}`;
      await syncToGithub(finalMdDbName, mdInhalt, activeVersandPdfUrl, null, showToast);

      let twinMdPublicUrl = activeVersandPdfUrl.replace(/\.pdf(\?.*)?$/i, '.md');
      try {
        if (rawStoragePdfName) {
          const twinFileName = rawStoragePdfName.replace(/\.[^/.]+$/, '') + '.md';
          const twinBlob = new Blob([mdInhalt], { type: 'text/markdown;charset=utf-8' });
          const { error: twinErr } = await supabase.storage
            .from('dokumente')
            .upload(twinFileName, twinBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });
          if (!twinErr) {
            const { data: mdLinkData } = supabase.storage.from('dokumente').getPublicUrl(twinFileName);
            if (mdLinkData?.publicUrl) twinMdPublicUrl = mdLinkData.publicUrl;
          }
        }
      } catch (e) {
        console.error('Twin Upload für PDF fehlgeschlagen', e);
      }

      await supabase.from('wissensdatenbank').insert([
        {
          datei_name: finalMdDbName,
          firma: zugewieseneFirma,
          inhalt_text: briefTxt,
          dokument_url: twinMdPublicUrl
        }
      ]);
    } else if (briefEntwurf && briefEntwurf.trim() !== '') {
      const prefix = activeTyp === 'Eingang' ? 'Eingang' : activeTyp === 'Ausgang' ? 'Ausgang' : 'Entwurf';
      const fileName = `${prefix}_${Date.now()}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;

      let fileContent = `${prefix}-Dokument\nGegenstand: ${thema || 'Ohne Gegenstand'}\nGegner: ${gegnerName || 'Unbekannt'}\n\nZusammenfassung / Text:\n${briefEntwurf}`;
      if (rawText) {
        fileContent += `\n\n--- ORIGINAL VOLLTEXT (OCR) ---\n${rawText}`;
      }

      await syncToGithub(fileName, fileContent, null, null, showToast);

      const entBlob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
      const { error: entError } = await supabase.storage
        .from('dokumente')
        .upload(fileName, entBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });
      let entPubUrl = null;
      if (!entError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(fileName);
        entPubUrl = linkData?.publicUrl || null;
      }

      if (zuSpeicherndeDateien.length === 0) {
        await supabase.from('wissensdatenbank').insert([
          {
            datei_name: fileName,
            firma: zugewieseneFirma,
            inhalt_text: fileContent.substring(0, 3000),
            dokument_url: entPubUrl
          }
        ]);
      }
    }

    const dokumentUrl = alleUrls.length > 0 ? alleUrls.join(',') : null;
    let aktuelleAkteId = selectedAkteId;
    const cleanedOwnApForDb = sanitizeOwnContactName(unserAnsprechpartner, gegnerAnsprechpartner, gegnerName) || null;

    if (modus === 'neu') {
      let finalesUnserZeichen = unserZeichen ? String(unserZeichen).trim() : '';
      if (finalesUnserZeichen) {
        const gepruefteNummer = parseAktenNummer(finalesUnserZeichen);
        const duplikatAkte = akten.find((a) => {
          if (a.is_demo_showcase) return false;
          if (cleanZeichenString(a.unser_zeichen) === cleanZeichenString(finalesUnserZeichen)) return true;
          if (gepruefteNummer !== null && parseAktenNummer(a.unser_zeichen) === gepruefteNummer) return true;
          return false;
        });

        if (duplikatAkte) {
          let maxFreieNum = 0;
          akten.forEach((a) => {
            if (a.is_demo_showcase) return;
            const n = parseAktenNummer(a.unser_zeichen);
            if (n !== null && n > maxFreieNum) maxFreieNum = n;
          });
          const naechsteFreieStr = String(maxFreieNum + 1).padStart(4, '0');
          const vorgeschlagenesZeichen = finalesUnserZeichen.match(/^\d+-/)
            ? finalesUnserZeichen.replace(/^\d+-/, `${naechsteFreieStr}-`)
            : `${naechsteFreieStr}-${finalesUnserZeichen}`;

          const autoKorrekturOk = window.confirm(
            `ACHTUNG – Doppelte Aktennummer verhindert!\n\n` +
              `Die Nummer aus "${finalesUnserZeichen}" ist bereits bei der Akte [${duplikatAkte.unser_zeichen}] (${duplikatAkte.gegner_name || 'Unbekannt'}) vergeben.\n\n` +
              `Soll diese neue Akte stattdessen automatisch mit der nächsten freien Nummer "${vorgeschlagenesZeichen}" angelegt werden?`
          );

          if (!autoKorrekturOk) {
            setLaedt(false);
            showToast('Speichern abgebrochen – bitte ein freies Aktenzeichen wählen.', 'warning');
            return;
          }
          finalesUnserZeichen = vorgeschlagenesZeichen;
          setUnserZeichen(vorgeschlagenesZeichen);
        }
      }

      const { data: neueAkte, error: aktenError } = await supabase
        .from('akten')
        .insert([
          {
            user_id: session.user.id,
            unser_zeichen: finalesUnserZeichen || null,
            aktenzeichen: aktenzeichen || null,
            gegner_name: gegnerName || null,
            gegner_ansprechpartner: gegnerAnsprechpartner || null,
            gegner_telefon: gegnerTelefon || null,
            gegner_email: gegnerEmail || null,
            unsere_firma: unsereFirma || null,
            unser_ansprechpartner: cleanedOwnApForDb,
            unser_telefon: unserTelefon || null,
            unser_email: unserEmail || null,
            thema: thema || null,
            status: 'Offen'
          }
        ])
        .select();
      if (aktenError) {
        showToast('Fehler Akte: ' + aktenError.message, 'error');
        setLaedt(false);
        return;
      }
      aktuelleAkteId = neueAkte[0].id;
    } else if (clearOldFristen && aktuelleAkteId) {
      await supabase
        .from('akten_historie')
        .update({ frist_extern: null, wiedervorlage: null })
        .eq('akte_id', aktuelleAkteId);
    }

    const activeAktion =
      autoSaveOverrides && autoSaveOverrides.overrideAktion !== undefined ? autoSaveOverrides.overrideAktion : aktion;
    const activeKanal =
      autoSaveOverrides && autoSaveOverrides.overrideKanal !== undefined ? autoSaveOverrides.overrideKanal : kanal;
    const activeWv =
      autoSaveOverrides && autoSaveOverrides.overrideWv !== undefined ? autoSaveOverrides.overrideWv : wiedervorlage;

    const { error: histError } = await supabase.from('akten_historie').insert([
      {
        akte_id: aktuelleAkteId,
        user_id: session.user.id,
        typ: activeTyp,
        datum: datum || null,
        aktion: activeAktion || null,
        kanal: activeKanal || null,
        frist_extern: fristExtern || null,
        wiedervorlage: activeWv || null,
        dokument_url: dokumentUrl,
        brief_entwurf: briefEntwurf || null,
        bezug_id: bezugId || null
      }
    ]);

    if (!histError) {
      if (bezugId) {
        await supabase.from('akten_historie').update({ frist_extern: null, wiedervorlage: null }).eq('id', bezugId);
      }

      const preventWarRoom = autoSaveOverrides && autoSaveOverrides.preventWarRoom;

      if (activeTyp === 'Eingang' && !preventWarRoom) {
        setActiveWarRoomDossier({
          akte_id: aktuelleAkteId,
          unsere_firma: unsereFirma || (tresorPrompt && tresorPrompt.typ === 'neu' ? tresorPrompt.obj.unsere_firma : ''),
          unser_ansprechpartner: cleanedOwnApForDb || '',
          aktenzeichen: aktenzeichen,
          kontakt: gegnerName,
          thema: thema,
          frist_extern: fristExtern,
          brief_entwurf: briefEntwurf,
          raw_text: rawText || briefEntwurf
        });
        setIsWarRoomOpen(true);
      }

      setUnserZeichen('');
      setAktenzeichen('');
      setGegnerName('');
      setGegnerAnsprechpartner('');
      setGegnerTelefon('');
      setGegnerFax('');
      setGegnerEmail('');
      setUnsereFirma('');
      setUnserAnsprechpartner('');
      setUnserTelefon('');
      setUnserEmail('');
      setThema('');
      setAktion('');
      setKanal('');
      setFristExtern('');
      setWiedervorlage('');
      setDateien([]);
      setEmailAnhaenge([]);
      setBriefEntwurf('');
      setJsonImport('');
      setRawText('');
      setTresorPrompt(null);
      setGegnerPrompt(null);
      setFaxZhd('');
      setBezugId('');
      setClearOldFristen(true);
      setVersandPdfUrl(null);
      autoGenRef.current = '';
      if (document.getElementById('datei-upload-manuell')) document.getElementById('datei-upload-manuell').value = '';
      if (document.getElementById('email-anhaenge-upload')) document.getElementById('email-anhaenge-upload').value = '';
      ladeDaten();
      showToast('Akteneintrag erfolgreich gespeichert!', 'success');
    } else {
      showToast('Fehler beim Speichern der Historie: ' + histError.message, 'error');
    }
    setLaedt(false);
  };

  const toggleAkte = (id) => {
    if (aufgeklappteAkten.includes(id)) setAufgeklappteAkten(aufgeklappteAkten.filter((aId) => aId !== id));
    else setAufgeklappteAkten([...aufgeklappteAkten, id]);
  };

  const loescheAkte = async (id) => {
    if (!window.confirm('Ganze Akte löschen?')) return;
    await supabase.from('akten').delete().eq('id', id);
    ladeDaten();
    showToast('Akte komplett gelöscht.', 'success');
  };

  const mergeAkte = async (sourceId) => {
    if (!mergeTargetId) {
      showToast('Bitte wähle zuerst eine Ziel-Akte aus!', 'warning');
      return;
    }
    if (sourceId === mergeTargetId) {
      showToast('Quell- und Ziel-Akte dürfen nicht identisch sein!', 'warning');
      return;
    }

    if (
      !window.confirm(
        'Möchtest du alle Inhalte (Historie & Dokumente) aus dieser Akte in die gewählte Ziel-Akte verschieben? Diese Akte bleibt danach als leere Hülle bestehen.'
      )
    ) {
      return;
    }

    const { error: moveErr } = await supabase
      .from('akten_historie')
      .update({ akte_id: mergeTargetId })
      .eq('akte_id', sourceId);
    if (moveErr) {
      showToast('Fehler beim Verschieben der Inhalte: ' + moveErr.message, 'error');
      return;
    }

    const sourceAkte = akten.find((a) => a.id === sourceId);
    await supabase.from('akten_historie').insert([
      {
        akte_id: mergeTargetId,
        user_id: session.user.id,
        typ: 'Intern',
        datum: new Date().toISOString().split('T')[0],
        aktion: `Akte zusammengeführt: Inhalte aus "${sourceAkte?.thema || 'Unbekannt'}" (${sourceAkte?.unser_zeichen || 'Kein Zeichen'}) wurden integriert.`
      }
    ]);

    setMergeSourceId(null);
    setMergeTargetId('');
    ladeDaten();
    showToast('Akteninhalte erfolgreich übertragen!', 'success');
  };

  const handleTresorAuswahl = (e) => {
    const mId = e.target.value;
    if (!mId) return;
    const m = mandanten.find((x) => x.id === mId);
    if (m) {
      setUnsereFirma(m.firmenname || '');
      setUnserAnsprechpartner(m.ansprechpartner || '');
      setUnserTelefon(formatRufnummer(m.telefon || ''));
      setUnserEmail(m.email || '');
    }
  };

  const handleGegnerAuswahl = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [gId, ansIdx] = val.split('|');
    const g = gegnerListe.find((x) => x.id === gId);
    if (g) {
      setGegnerName(g.name || '');
      setGegnerFax(formatRufnummer(g.fax || ''));
      let ansprechpartnerObj = null;
      let ansList = [];
      try {
        const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen;
        if (Array.isArray(parsed)) ansList = parsed;
      } catch (_e) {}
      if (ansList.length > 0 && ansList[ansIdx]) ansprechpartnerObj = ansList[ansIdx];

      if (ansprechpartnerObj) {
        setGegnerAnsprechpartner(ansprechpartnerObj.name || g.ansprechpartner || '');
        setFaxZhd(ansprechpartnerObj.name || g.ansprechpartner || '');
        setGegnerTelefon(formatRufnummer(ansprechpartnerObj.telefon || g.telefon || ''));
        setGegnerEmail(ansprechpartnerObj.email || g.email || g.email_zentrale || '');
      } else {
        setGegnerAnsprechpartner(g.ansprechpartner || '');
        setFaxZhd(g.ansprechpartner || '');
        setGegnerTelefon(formatRufnummer(g.telefon || ''));
        setGegnerEmail(g.email || g.email_zentrale || '');
      }
    }
  };

  const handleAlarmKlick = (akteId) => {
    setFokussierteAkteId(akteId);
    if (!aufgeklappteAkten.includes(akteId)) {
      setAufgeklappteAkten((prev) => [...prev, akteId]);
    }
    setTimeout(() => {
      const el = document.getElementById(`akte-karte-${akteId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Ermittelt alle Alt-Aktennummern, die im Bestand mehrfach vorkommen (z. B. 0028) – ohne Umhängen!
  const aktenNummernGruppen = {};
  akten.forEach((a) => {
    if (a.is_demo_showcase) return;
    const num = parseAktenNummer(a.unser_zeichen);
    if (num !== null) {
      const paddedKey = String(num).padStart(4, '0');
      if (!aktenNummernGruppen[paddedKey]) aktenNummernGruppen[paddedKey] = [];
      aktenNummernGruppen[paddedKey].push(a);
    }
  });
  const doppelteNummernListe = Object.entries(aktenNummernGruppen)
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  const gefilterteAkten = akten
    .filter((akte) => {
      if (duplikatNummerFilter) {
        if (akte.is_demo_showcase) return false;
        const num = parseAktenNummer(akte.unser_zeichen);
        return num !== null && String(num).padStart(4, '0') === duplikatNummerFilter;
      }
      if (!zeigeErledigte && akte.status === 'Erledigt') return false;
      if (!suchbegriff.trim()) return true;
      const s = suchbegriff.toLowerCase();
      const uZ = (akte.unser_zeichen || '').toLowerCase();
      const gName = (akte.gegner_name || '').toLowerCase();
      const gAns = (akte.gegner_ansprechpartner || '').toLowerCase();
      const az = (akte.aktenzeichen || '').toLowerCase();
      const uFirma = (akte.unsere_firma || '').toLowerCase();
      const th = (akte.thema || '').toLowerCase();
      const histMatch = akte.akten_historie?.some(
        (h) => (h.aktion || '').toLowerCase().includes(s) || (h.brief_entwurf || '').toLowerCase().includes(s)
      );
      return (
        uZ.includes(s) ||
        gName.includes(s) ||
        gAns.includes(s) ||
        az.includes(s) ||
        uFirma.includes(s) ||
        th.includes(s) ||
        histMatch
      );
    })
    .sort((a, b) => {
      const numA = parseAktenNummer(a.unser_zeichen);
      const numB = parseAktenNummer(b.unser_zeichen);

      if (numA !== null && numB !== null) {
        if (numA !== numB) return numB - numA;
        return (a.unser_zeichen || '').localeCompare(b.unser_zeichen || '', 'de', { numeric: true, sensitivity: 'base' });
      }
      if (numA !== null && numB === null) return -1;
      if (numA === null && numB !== null) return 1;

      return (a.unser_zeichen || '').localeCompare(b.unser_zeichen || '', 'de', { numeric: true, sensitivity: 'base' });
    });

  const sortedAktenForDropdown = [...akten].sort((a, b) => {
    const numA = parseAktenNummer(a.unser_zeichen);
    const numB = parseAktenNummer(b.unser_zeichen);

    if (numA !== null && numB !== null) {
      if (numA !== numB) return numB - numA;
      return (a.unser_zeichen || '').localeCompare(b.unser_zeichen || '', 'de', { numeric: true, sensitivity: 'base' });
    }
    if (numA !== null && numB === null) return -1;
    if (numA === null && numB !== null) return 1;

    return (a.unser_zeichen || '').localeCompare(b.unser_zeichen || '', 'de', { numeric: true, sensitivity: 'base' });
  });

  const getAkteDropdownText = (akte) => {
    const uZ = akte.unser_zeichen ? `[${akte.unser_zeichen}]` : '[---]';
    const gegner = akte.gegner_name || 'Unbekannter Gegner';
    const themaTxt = akte.thema || 'Ohne Gegenstand';
    return `${uZ} ${gegner} | ${themaTxt}`;
  };

  const alleAusgaenge = [];
  akten.forEach((a) => {
    if (a.akten_historie && a.akten_historie.length > 0) {
      a.akten_historie
        .filter((h) => h.typ === 'Ausgang')
        .forEach((h) => {
          alleAusgaenge.push({
            ...h,
            akte_id: a.id,
            unser_zeichen: a.unser_zeichen,
            aktenzeichen: a.aktenzeichen,
            gegner_name: a.gegner_name,
            gegner_ansprechpartner: a.gegner_ansprechpartner,
            unsere_firma: a.unsere_firma,
            thema: a.thema
          });
        });
    }
  });
  alleAusgaenge.sort((a, b) => new Date(b.datum || b.created_at || 0) - new Date(a.datum || a.created_at || 0));

  const anzeigeAusgaenge =
    modus === 'bestehend' && selectedAkteId
      ? alleAusgaenge.filter((a) => a.akte_id === selectedAkteId)
      : alleAusgaenge;

  const activeAkteObj = modus === 'bestehend' && selectedAkteId ? akten.find((a) => a.id === selectedAkteId) : null;

  const handleJsonImportRef = useRef(handleJsonImport);
  useEffect(() => {
    handleJsonImportRef.current = handleJsonImport;
  }, [handleJsonImport]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchMissedImports = async () => {
      const { data, error } = await supabase
        .from('import_queue')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        for (const record of data) {
          if (record.payload) {
            const jsonString = JSON.stringify(record.payload);
            if (handleJsonImportRef.current) {
              handleJsonImportRef.current({ target: { value: jsonString } });
            }
            showToast('Verpassten Auto-Import nachgeladen!', 'success');
            await supabase.from('import_queue').delete().eq('id', record.id);
          }
        }
      }
    };

    fetchMissedImports();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMissedImports();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const channelName = `import_queue_${session.user.id}`;
    const queueSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'import_queue',
          filter: `user_id=eq.${session.user.id}`
        },
        async (payload) => {
          const newRecord = payload.new;
          if (newRecord && newRecord.payload) {
            const jsonString = JSON.stringify(newRecord.payload);
            if (handleJsonImportRef.current) {
              handleJsonImportRef.current({ target: { value: jsonString } });
            }
            showToast('Auto-Import empfangen und eingefügt!', 'success');
            await supabase.from('import_queue').delete().eq('id', newRecord.id);
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(queueSubscription);
    };
  }, [session?.user?.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
      {/* --- AUSGELAGERTE OVERLAY-MODALS & RESPONSIVE STYLES --- */}
      <AktenModals
        theme={theme}
        isDarkMode={isDarkMode}
        btnTextColor={btnTextColor}
        inputStyle={inputStyle}
        quickBtnStyle={quickBtnStyle}
        showTriageModal={showTriageModal}
        setShowTriageModal={setShowTriageModal}
        triageWvDate={triageWvDate}
        setTriageWvDate={setTriageWvDate}
        aktion={aktion}
        speichereEintragLogik={speichereEintragLogik}
        showUploadReminder={showUploadReminder}
        setShowUploadReminder={setShowUploadReminder}
        proceedToSaveOrTriage={proceedToSaveOrTriage}
        showVersandHistorie={showVersandHistorie}
        setShowVersandHistorie={setShowVersandHistorie}
        modus={modus}
        selectedAkteId={selectedAkteId}
        activeAkteObj={activeAkteObj}
        anzeigeAusgaenge={anzeigeAusgaenge}
        expandedVersandId={expandedVersandId}
        setExpandedVersandId={setExpandedVersandId}
        springeZuAkteAusgang={springeZuAkteAusgang}
      />

      {/* --- MAGIC IMPORT & KI-WEB-SCANNER --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', width: '100%' }}>
        <div
          data-help="akten_magic_import"
          style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px dashed ${theme.accent}`, transition: 'border-color 0.3s ease' }}
        >
          <label style={{ ...labelStyle, color: theme.accent, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.3s ease' }}>
            <Icon name="folder" size={18} /> MAGIC IMPORT (JSON AUS SONAR WAR-ROOM)
          </label>
          <textarea
            id="magic-import"
            value={jsonImport}
            onChange={handleJsonImport}
            placeholder={
              isOwnerAccount
                ? '{"typ": "Eingang", "unser_zeichen": "0001-SBS-Finanzamt", "thema": "..."}'
                : '{"typ": "Eingang", "unser_zeichen": "0001-MANDANT-Finanzamt", "thema": "..."}'
            }
            style={{
              ...inputStyle,
              background: 'rgba(0,0,0,0.1)',
              border: `1px solid ${theme.accent}`,
              color: theme.textMain,
              height: '100px',
              fontFamily: 'monospace',
              fontSize: '14px',
              marginTop: '5px',
              transition: 'border-color 0.3s ease'
            }}
          />
        </div>

        <div
          data-help="akten_web_scanner"
          style={{ ...panelStyle, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${theme.border}` }}
        >
          <label style={{ ...labelStyle, color: theme.accent, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', transition: 'color 0.3s ease' }}>
            <Icon name="file" size={16} /> WEB-SCANNER &amp; MANUELLER UPLOAD (PDF/MD)
          </label>
          <input
            id="datei-upload-manuell"
            type="file"
            multiple
            disabled={webScanLaedt}
            onChange={(e) => {
              const chosen = Array.from(e.target.files || []);
              setDateien(chosen);
            }}
            style={{ ...inputStyle, border: `1px dashed ${theme.accent}`, cursor: 'pointer', padding: '10px', fontSize: '13px', transition: 'border-color 0.3s ease' }}
          />
          {dateien.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <span style={{ fontSize: '13px', color: theme.accent, fontWeight: 'bold' }}>
                <Icon name="folder" size={12} /> {dateien.length} Datei(en) gewählt ({dateien.map((d) => d.name).join(', ')})
              </span>
              <button
                type="button"
                disabled={webScanLaedt}
                onClick={() => handleWebScannerIngest(dateien)}
                style={{
                  background: theme.accent,
                  color: btnTextColor,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: webScanLaedt ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Icon name="brain" size={16} />
                <span>{webScanLaedt ? webScanStatus : 'PDF per KI-Web-Scanner auslesen & Akte vorbefüllen'}</span>
              </button>
            </div>
          )}
          {webScanLaedt && dateien.length === 0 && (
            <span style={{ fontSize: '12px', color: theme.accent, marginTop: '8px', fontWeight: 'bold' }}>
              {webScanStatus}
            </span>
          )}
        </div>
      </div>

      {/* --- FRISTEN-, WIEDERVORLAGE- & UST-RADAR --- */}
      <div data-help="akten_alarme_panel" style={{ width: '100%' }}>
        <AktenAlarme
          theme={theme}
          isDarkMode={isDarkMode}
          btnTextColor={btnTextColor}
          akten={akten}
          mandanten={mandanten}
          isAlarmsOpen={isAlarmsOpen}
          setIsAlarmsOpen={setIsAlarmsOpen}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          handleAlarmKlick={handleAlarmKlick}
          ladeVorgangInMaske={ladeVorgangInMaske}
          handleInlineEdit={handleInlineEdit}
          handleTerminVerschieben={handleTerminVerschieben}
          handleNachhaken={handleNachhaken}
          formatDatum={formatDatum}
          ladeDaten={ladeDaten}
          showToast={showToast}
        />
      </div>

      {/* --- AKTEN-ERFASSUNGS- & VERSANDFORMULAR --- */}
      <AktenFormular
        theme={theme}
        btnTextColor={btnTextColor}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        h4StyleAkten={h4StyleAkten}
        quickBtnStyle={quickBtnStyle}
        modus={modus}
        setModus={setModus}
        selectedAkteId={selectedAkteId}
        handleAkteAuswahl={handleAkteAuswahl}
        sortedAktenForDropdown={sortedAktenForDropdown}
        getAkteDropdownText={getAkteDropdownText}
        unserZeichen={unserZeichen}
        setUnserZeichen={setUnserZeichen}
        thema={thema}
        setThema={setThema}
        aktenzeichen={aktenzeichen}
        setAktenzeichen={setAktenzeichen}
        gegnerListe={gegnerListe}
        handleGegnerAuswahl={handleGegnerAuswahl}
        gegnerName={gegnerName}
        setGegnerName={setGegnerName}
        gegnerAnsprechpartner={gegnerAnsprechpartner}
        setGegnerAnsprechpartner={setGegnerAnsprechpartner}
        gegnerTelefon={gegnerTelefon}
        setGegnerTelefon={setGegnerTelefon}
        gegnerFax={gegnerFax}
        setGegnerFax={setGegnerFax}
        gegnerEmail={gegnerEmail}
        setGegnerEmail={setGegnerEmail}
        mandanten={mandanten}
        handleTresorAuswahl={handleTresorAuswahl}
        unsereFirma={unsereFirma}
        setUnsereFirma={setUnsereFirma}
        unserAnsprechpartner={unserAnsprechpartner}
        setUnserAnsprechpartner={setUnserAnsprechpartner}
        unserEmail={unserEmail}
        setUnserEmail={setUnserEmail}
        unserTelefon={unserTelefon}
        setUnserTelefon={setUnserTelefon}
        typ={typ}
        setTyp={setTyp}
        datum={datum}
        setDatum={setDatum}
        aktion={aktion}
        setAktion={setAktion}
        activeAkteObj={activeAkteObj}
        bezugId={bezugId}
        setBezugId={setBezugId}
        formatDatum={formatDatum}
        fristExtern={fristExtern}
        setFristExtern={setFristExtern}
        handleFristChange={handleFristChange}
        wiedervorlage={wiedervorlage}
        setWiedervorlage={setWiedervorlage}
        handleWVChange={handleWVChange}
        setzeWV={setzeWV}
        clearOldFristen={clearOldFristen}
        setClearOldFristen={setClearOldFristen}
        faxZhd={faxZhd}
        setFaxZhd={setFaxZhd}
        setShowVersandHistorie={setShowVersandHistorie}
        handleResendVersand={handleResendVersand}
        setActiveWarRoomDossier={setActiveWarRoomDossier}
        setIsWarRoomOpen={setIsWarRoomOpen}
        emailAnhaenge={emailAnhaenge}
        setEmailAnhaenge={setEmailAnhaenge}
        briefEntwurf={briefEntwurf}
        setBriefEntwurf={setBriefEntwurf}
        versandPdfUrl={versandPdfUrl}
        laedt={laedt}
        handleSpeichernCheck={handleSpeichernCheck}
        gegnerPrompt={gegnerPrompt}
        handleGegnerPromptAccept={handleGegnerPromptAccept}
        setGegnerPrompt={setGegnerPrompt}
        tresorPrompt={tresorPrompt}
        handleTresorPromptAccept={handleTresorPromptAccept}
        setTresorPrompt={setTresorPrompt}
        formatRufnummer={formatRufnummer}
        rawText={rawText}
        dateien={dateien}
        setDateien={setDateien}
        showUploadReminder={showUploadReminder}
        setShowUploadReminder={setShowUploadReminder}
        showTriageModal={showTriageModal}
        setShowTriageModal={setShowTriageModal}
        triageWvDate={triageWvDate}
        setTriageWvDate={setTriageWvDate}
        session={session}
        ladeDaten={ladeDaten}
        showToast={showToast}
      />

      {/* --- AKTEN-ÜBERSICHT & SHOWCASE-MUSTERAKTEN --- */}
      <div data-help="akten_liste_overview" style={{ width: '100%' }}>
        {doppelteNummernListe.length > 0 && (
          <div
            style={{
              marginTop: '24px',
              marginBottom: '-20px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: theme.hintBg,
              border: `1px solid ${theme.hintBorder}`,
              color: theme.textMain,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              textAlign: 'left',
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Icon name="alert" size={16} style={{ color: theme.hintBorder, flexShrink: 0 }} />
              <span>
                <strong>Bestands-Hinweis (Alte Nummern-Zwillinge):</strong> Folgende Führungsnummern existieren mehrfach – bitte beim Prüfen auf Firmenkürzel &amp; Gegner achten (Klick filtert die Paare):
              </span>
              {doppelteNummernListe.map(([numStr, gruppe]) => {
                const isSelected = duplikatNummerFilter === numStr;
                return (
                  <button
                    key={numStr}
                    type="button"
                    onClick={() => setDuplikatNummerFilter(isSelected ? null : numStr)}
                    title={gruppe.map((g) => `${g.unser_zeichen} (${g.gegner_name || '-'})`).join(' | ')}
                    style={{
                      background: isSelected ? theme.hintBorder : 'transparent',
                      color: isSelected ? '#020617' : theme.textMain,
                      border: `1px solid ${theme.hintBorder}`,
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    #{numStr} ({gruppe.length}x)
                  </button>
                );
              })}
            </div>

            {duplikatNummerFilter && (
              <button
                type="button"
                onClick={() => setDuplikatNummerFilter(null)}
                style={{
                  background: 'transparent',
                  color: theme.textMain,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✕ Filter #{duplikatNummerFilter} aufheben
              </button>
            )}
          </div>
        )}

        <AktenListe
          theme={theme}
          isDarkMode={isDarkMode}
          btnTextColor={btnTextColor}
          inputStyle={inputStyle}
          inlineInputStyle={inlineInputStyle}
          zeigeErledigte={zeigeErledigte}
          setZeigeErledigte={setZeigeErledigte}
          gefilterteAkten={gefilterteAkten}
          aufgeklappteAkten={aufgeklappteAkten}
          toggleAkte={toggleAkte}
          fokussierteAkteId={fokussierteAkteId}
          fokussierterHistId={fokussierterHistId}
          toggleAkteStatus={toggleAkteStatus}
          handleAkteStammdatenEdit={handleAkteStammdatenEdit}
          loescheAkte={loescheAkte}
          druckeAkte={druckeAkte}
          mergeSourceId={mergeSourceId}
          setMergeSourceId={setMergeSourceId}
          mergeTargetId={mergeTargetId}
          setMergeTargetId={setMergeTargetId}
          mergeAkte={mergeAkte}
          sortedAktenForDropdown={sortedAktenForDropdown}
          getAkteDropdownText={getAkteDropdownText}
          handleInlineEdit={handleInlineEdit}
          ladeVorgangInMaske={ladeVorgangInMaske}
          loescheHistorieEintrag={loescheHistorieEintrag}
          loescheDateiAusHistorie={loescheDateiAusHistorie}
          handleNachtragUploadAkte={handleNachtragUploadAkte}
          uploadingHistId={uploadingHistId}
          formatDatum={formatDatum}
        />
      </div>

      <MegaLegalModal
        isOpen={isWarRoomOpen}
        onClose={() => setIsWarRoomOpen(false)}
        dossier={activeWarRoomDossier}
        theme={theme}
        onApplySchriftsatz={(ausgangsJson) => {
          if (activeWarRoomDossier && activeWarRoomDossier.akte_id) {
            setModus('bestehend');
            setSelectedAkteId(activeWarRoomDossier.akte_id);
          }

          if (ausgangsJson.brief_entwurf) setBriefEntwurf(ausgangsJson.brief_entwurf);

          const isInvalid = (val) =>
            !val ||
            val.toLowerCase().includes('erforderlich') ||
            val.toLowerCase().includes('bescheid') ||
            val.toLowerCase().includes('unbekannt');

          if (ausgangsJson.thema && !isInvalid(ausgangsJson.thema) && !thema) setThema(ausgangsJson.thema);
          if (ausgangsJson.aktenzeichen && !isInvalid(ausgangsJson.aktenzeichen) && !aktenzeichen) {
            setAktenzeichen(ausgangsJson.aktenzeichen);
          }

          if (ausgangsJson.ansprechpartner && !isInvalid(ausgangsJson.ansprechpartner)) {
            setGegnerAnsprechpartner(ausgangsJson.ansprechpartner);
            setFaxZhd(ausgangsJson.ansprechpartner);
          }
          if (ausgangsJson.gegner_fax && !isInvalid(ausgangsJson.gegner_fax)) {
            setGegnerFax(formatRufnummer(ausgangsJson.gegner_fax));
          }
          if (ausgangsJson.gegner_email && !isInvalid(ausgangsJson.gegner_email)) {
            setGegnerEmail(ausgangsJson.gegner_email);
          }

          setTyp(ausgangsJson.typ || 'Ausgang');

          if (ausgangsJson.aktion) setAktion(ausgangsJson.aktion);

          const parsedWv = normalizeDateForInput(
            ausgangsJson.wiedervorlage || ausgangsJson.wv_intern || ausgangsJson.frist_extern || ''
          );
          if (parsedWv) {
            handleWVChange(parsedWv);
          }

          showToast('Schriftsatz übernommen! Akten-Kontext geschützt.', 'success');
        }}
      />
    </div>
  );
}