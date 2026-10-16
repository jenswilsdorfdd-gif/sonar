import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { supabase } from './supabaseClient';
import { syncToGithub } from './utils';

// --- PDF.js Import für die clientseitige Extraktion ---
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word', boxSizing: 'border-box' };

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

  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `--- Seite ${i} ---\n${pageText}\n\n`;
    }
    return fullText;
  };

  const proceedToSaveOrTriage = () => {
    setShowUploadReminder(false);
    if (typ === 'Eingang') {
      setShowTriageModal(true);
    } else {
      speichereEintragLogik();
    }
  };

  const localHandleSpeichernCheck = (e) => {
    e.preventDefault();
    if (dateien.length === 0 && emailAnhaenge.length === 0 && !versandPdfUrl) { 
      setShowUploadReminder(true); 
    } else { 
      proceedToSaveOrTriage(); 
    }
  };

  const speichereEintragLogik = async (autoSaveOverrides = null) => {
    setShowUploadReminder(false);
    
    if (typeof handleSpeichernCheck === 'function' && !laedt) {
      showToast("Speichere Akten-Eintrag...", "success");
    }

    let alleUrls = [];
    const zuSpeicherndeDateien = [...dateien, ...emailAnhaenge];
    const zugewieseneFirma = unsereFirma || (tresorPrompt && tresorPrompt.typ === 'neu' ? tresorPrompt.obj.unsere_firma : 'Allgemein');

    if (zuSpeicherndeDateien && zuSpeicherndeDateien.length > 0) {
      for (const f of zuSpeicherndeDateien) {
        const isMd = f.name.toLowerCase().endsWith('.md');
        const isPdf = f.name.toLowerCase().endsWith('.pdf');

        if (isMd) {
           const fileInhalt = await f.text(); 
           const baseInfo = `Upload via Akten-Cockpit. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}`; 
           const finalDbText = `${baseInfo}\n\n${fileInhalt.substring(0, 3000)}...`;
           
           await supabase.from('wissensdatenbank').insert([{ datei_name: f.name, firma: zugewieseneFirma, inhalt_text: finalDbText, dokument_url: null }]);
           await syncToGithub(f.name, fileInhalt, null, null, showToast);
           
           const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_'); 
           const dateiName = `${Date.now()}_${sichererDateiname}`;
           const mdBlob = new Blob([fileInhalt], { type: 'text/markdown' });
           const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, mdBlob);
           if (!uploadError) {
             const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName); 
             alleUrls.push(linkData.publicUrl);
           }
        } else {
           const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_'); 
           const dateiName = `${Date.now()}_${sichererDateiname}`;
           const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f);
           
           if (!uploadError) {
             const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName); 
             alleUrls.push(linkData.publicUrl);
             
             const hatMdGegenstueck = zuSpeicherndeDateien.some(d => d.name.toLowerCase() === f.name.toLowerCase().replace('.pdf', '.md'));
             
             if (isPdf && !hatMdGegenstueck) {
                showToast(`Erzeuge MD-Zwilling für (${f.name})...`, 'success');
                try {
                   const extrahierterText = await extractTextFromPDF(f);
                   if (extrahierterText.trim().length > 50) {
                      const baseInfo = `Auto-Extraktion (PDF). Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}`; 
                      const finalDbText = `${baseInfo}\n\n${extrahierterText.substring(0, 3000)}...`; 
                      const mdFileName = f.name.replace(/\.[^/.]+$/, "") + ".md";
                      
                      await supabase.from('wissensdatenbank').insert([{ datei_name: mdFileName, firma: zugewieseneFirma, inhalt_text: finalDbText, dokument_url: linkData.publicUrl }]);
                      
                      const mdInhalt = `${baseInfo}\n\nOriginal-PDF: ${linkData.publicUrl}\n\n${extrahierterText}`;
                      await syncToGithub(mdFileName, mdInhalt, linkData.publicUrl, null, showToast);
                      
                      const twinFileName = dateiName.replace(/\.[^/.]+$/, "") + ".md";
                      const twinBlob = new Blob([mdInhalt], { type: 'text/markdown' });
                      await supabase.storage.from('dokumente').upload(twinFileName, twinBlob);
                   }
                } catch (err) { console.error("Fehler bei PDF-Extraktion:", err); }
             }
           }
        }
      }
    }
    
    const activeVersandPdfUrl = autoSaveOverrides && autoSaveOverrides.overridePdfUrl !== undefined ? autoSaveOverrides.overridePdfUrl : versandPdfUrl;

    if (activeVersandPdfUrl) {
      alleUrls.push(activeVersandPdfUrl);
      const briefTxt = `Automatisch versendetes Dokument. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}\n\n\n${briefEntwurf}`;
      await supabase.from('wissensdatenbank').insert([{ datei_name: `Ausgang_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.pdf`, firma: unsereFirma || 'Allgemein', inhalt_text: briefTxt, dokument_url: activeVersandPdfUrl }]);
      
      const ausgangName = `Ausgang_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;
      const mdInhalt = `Versendetes Dokument\nGegenstand: ${thema || 'Ohne Gegenstand'}\nGegner: ${gegnerName || 'Unbekannt'}\nLink: ${activeVersandPdfUrl}\n\nDokumententext:\n${briefEntwurf}`;
      await syncToGithub(ausgangName, mdInhalt, activeVersandPdfUrl, null, showToast);
      
      try {
         const urlParts = activeVersandPdfUrl.split('/');
         const pdfFileName = urlParts[urlParts.length - 1].split('?')[0]; 
         if (pdfFileName) {
           const twinFileName = pdfFileName.replace(/\.[^/.]+$/, "") + ".md";
           const twinBlob = new Blob([mdInhalt], { type: 'text/markdown' });
           await supabase.storage.from('dokumente').upload(twinFileName, twinBlob);
         }
      } catch(e) { console.error("Twin Upload für Ausgang fehlgeschlagen", e); }
      
    } else if (briefEntwurf && briefEntwurf.trim() !== '') {
      const prefix = typ === 'Eingang' ? 'Eingang' : (typ === 'Ausgang' ? 'Ausgang' : 'Entwurf');
      const fileName = `${prefix}_${Date.now()}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;
      
      let fileContent = `${prefix}-Dokument\nGegenstand: ${thema || 'Ohne Gegenstand'}\nGegner: ${gegnerName || 'Unbekannt'}\n\nZusammenfassung / Text:\n${briefEntwurf}`;
      
      if (rawText) {
         fileContent += `\n\n--- ORIGINAL VOLLTEXT (OCR) ---\n${rawText}`;
      }
      
      await syncToGithub(fileName, fileContent, null, null, showToast);
      
      const entBlob = new Blob([fileContent], { type: 'text/markdown' });
      const { error: entError } = await supabase.storage.from('dokumente').upload(fileName, entBlob);
      if (!entError) {
         const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(fileName);
         alleUrls.push(linkData.publicUrl);
      }
    }

    const dokumentUrl = alleUrls.length > 0 ? alleUrls.join(',') : null;
    let aktuelleAkteId = selectedAkteId;

    if (modus === 'neu') {
      const { data: neueAkte, error: aktenError } = await supabase.from('akten').insert([{ user_id: session.user.id, unser_zeichen: unserZeichen || null, aktenzeichen: aktenzeichen || null, gegner_name: gegnerName || null, gegner_ansprechpartner: gegnerAnsprechpartner || null, gegner_telefon: gegnerTelefon || null, gegner_email: gegnerEmail || null, unsere_firma: unsereFirma || null, unser_ansprechpartner: unserAnsprechpartner || null, unser_telefon: unserTelefon || null, unser_email: unserEmail || null, thema: thema || null, status: 'Offen' }]).select();
      if (aktenError) { showToast("Fehler Akte: " + aktenError.message, 'error'); return; }
      aktuelleAkteId = neueAkte[0].id;
    } else {
      if (clearOldFristen && aktuelleAkteId) {
         await supabase.from('akten_historie').update({ frist_extern: null, wiedervorlage: null }).eq('akte_id', aktuelleAkteId);
      }
    }

    const activeAktion = autoSaveOverrides && autoSaveOverrides.overrideAktion !== undefined ? autoSaveOverrides.overrideAktion : aktion;
    const activeKanal = autoSaveOverrides && autoSaveOverrides.overrideKanal !== undefined ? autoSaveOverrides.overrideKanal : null;
    const activeTyp = autoSaveOverrides && autoSaveOverrides.overrideTyp !== undefined ? autoSaveOverrides.overrideTyp : typ;
    const activeWv = autoSaveOverrides && autoSaveOverrides.overrideWv !== undefined ? autoSaveOverrides.overrideWv : wiedervorlage;

    const { error: histError } = await supabase.from('akten_historie').insert([{ 
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
    }]);

    if (!histError) {
      if (bezugId) {
         await supabase.from('akten_historie').update({ frist_extern: null, wiedervorlage: null }).eq('id', bezugId);
      }

      const preventWarRoom = autoSaveOverrides && autoSaveOverrides.preventWarRoom;
      
      if (activeTyp === 'Eingang' && !preventWarRoom) {
        setActiveWarRoomDossier({
          akte_id: aktuelleAkteId,
          unsere_firma: unsereFirma || (tresorPrompt && tresorPrompt.typ === 'neu' ? tresorPrompt.obj.unsere_firma : ''),
          unser_ansprechpartner: unserAnsprechpartner,
          aktenzeichen: aktenzeichen,
          kontakt: gegnerName,
          thema: thema,
          frist_extern: fristExtern,
          brief_entwurf: briefEntwurf,
          raw_text: rawText || briefEntwurf 
        });
        setIsWarRoomOpen(true);
      }

      setUnserZeichen(''); setAktenzeichen(''); setGegnerName(''); setGegnerAnsprechpartner(''); setGegnerTelefon(''); setGegnerFax(''); setGegnerEmail(''); 
      setUnsereFirma(''); setUnserAnsprechpartner(''); setUnserTelefon(''); setUnserEmail(''); setThema(''); 
      setAktion(''); setFristExtern(''); setWiedervorlage(''); setDateien([]); setEmailAnhaenge([]); 
      setBriefEntwurf(''); setBezugId(''); setClearOldFristen(true);
      setShowTaskPanel(false); setTaskBetrag(''); setTaskIban(''); setTaskVwz(''); setTaskNotiz('');
      
      if (document.getElementById('datei-upload-manuell')) document.getElementById('datei-upload-manuell').value = '';
      if (document.getElementById('email-anhaenge-upload')) document.getElementById('email-anhaenge-upload').value = '';
      ladeDaten();
      showToast('Akteneintrag erfolgreich gespeichert!', 'success');
    } else {
      showToast('Fehler beim Speichern der Historie: ' + histError.message, 'error');
    }
  };

  // Aktuell im Gegner-Prompt ausgewählte Behörde + deren gespeicherte Kontakte
  const currentSelectedGegnerObj = gegnerPrompt && promptTargetGegnerId !== '__NEU__'
    ? gegnerListe.find(g => String(g.id) === String(promptTargetGegnerId))
    : null;
  const currentPromptContacts = getContactsForGegner(currentSelectedGegnerObj);

  return (
    <>
      {showTriageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, color: theme.textMain, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon name="folder" size={24} /> Posteingang abheften
            </h3>
            <p style={{ color: theme.textMuted, fontSize: '14px', margin: 0 }}>
              Wie möchtest du mit diesem Eingangsdokument weiter verfahren?
            </p>

            <button onClick={() => { setShowTriageModal(false); speichereEintragLogik(); }} style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>1. Sofort antworten (War-Room)</span> <Icon name="right" size={16} />
            </button>

            <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <strong style={{ color: theme.textMain, fontSize: '14px' }}>2. Später antworten (Wiedervorlage)</strong>
               <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input type="date" value={triageWvDate} onChange={e => setTriageWvDate(e.target.value)} style={{...inputStyle, flex: '1 1 auto', padding: '8px'}} />
                  <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 3); setTriageWvDate(d.toISOString().split('T')[0]); }} style={quickBtnStyle}>+3T</button>
                  <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); setTriageWvDate(d.toISOString().split('T')[0]); }} style={quickBtnStyle}>+1W</button>
               </div>
               <button onClick={() => { setShowTriageModal(false); speichereEintragLogik({ overrideAktion: 'Wiedervorlage zur Beantwortung', overrideWv: triageWvDate, preventWarRoom: true }); }} style={{ background: theme.border, color: theme.textMain, border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                 Speichern & Wiedervorlage setzen
               </button>
            </div>

            <button onClick={() => { setShowTriageModal(false); speichereEintragLogik({ overrideAktion: aktion || 'Kenntnisnahme / Abgelegt', preventWarRoom: true }); }} style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              3. Nur ablegen (Info/Kenntnisnahme)
            </button>

            <button onClick={() => setShowTriageModal(false)} style={{ background: 'transparent', color: theme.textMuted, border: 'none', padding: '10px', cursor: 'pointer', fontSize: '13px', marginTop: '10px' }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {showUploadReminder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.warningBorder}`, borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <Icon name="alert" size={48} style={{ color: theme.warningBorder, marginBottom: '15px' }} />
            <h3 style={{ margin: '0 0 15px 0', color: theme.textMain, fontSize: '20px' }}>Dateien vergessen?</h3>
            <p style={{ color: theme.textMuted, fontSize: '15px', marginBottom: '25px', lineHeight: '1.5' }}>
              Du hast aktuell <strong>keine</strong> Dokumente (PDF/MD) für den Upload in diese Akte ausgewählt.<br/><br/>
              Möchtest du die Akte / den Eintrag wirklich <strong>ohne Dateien</strong> anlegen?
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setShowUploadReminder(false)} style={{ padding: '12px 18px', background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}>Abbrechen & Dateien auswählen</button>
              <button onClick={proceedToSaveOrTriage} style={{ padding: '12px 18px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}>Trotzdem ohne Dateien speichern</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={localHandleSpeichernCheck} style={panelStyle}>
        
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

        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px', textAlign: 'left', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'neu' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><input type="radio" checked={modus === 'neu'} onChange={() => setModus('neu')} /><Icon name="folder" size={16} /> Neue Akte / Hülle anlegen</label>
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'bestehend' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><input type="radio" checked={modus === 'bestehend'} onChange={() => setModus('bestehend')} /><Icon name="folder" size={16} /> Zu bestehender Akte hinzufügen</label>
          {modus === 'bestehend' && (
            <div style={{ flex: '1 1 min(100%, 200px)', marginLeft: 'auto' }}>
              <select value={selectedAkteId} onChange={handleAkteAuswahl} required style={{...inputStyle, padding: '8px', fontSize: '13px'}}>
                <option value="">-- Ziel-Akte wählen --</option>
                {sortedAktenForDropdown.map(a => <option key={a.id} value={a.id}>{getAkteDropdownText(a)}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}>
          {modus === 'neu' && (
            <>
              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                  <h4 style={{margin: 0, color: theme.textMain}}>1. Akten-Stammdaten</h4>
                </div>
              </div>
              <div><label style={labelStyle}>Unser Zeichen</label><input type="text" value={unserZeichen} onChange={(e) => setUnserZeichen(e.target.value)} placeholder="z.B. 0001-JW-Finanzamt" style={inputStyle} /></div>
              <div><label style={labelStyle}>Gegenstand (Thema)*</label><input type="text" value={thema} onChange={(e) => setThema(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Aktenzeichen (Behörde)</label><input type="text" value={aktenzeichen} onChange={(e) => setAktenzeichen(e.target.value)} style={inputStyle} /></div>

              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                  <h4 style={{margin: 0, color: theme.textMain}}>2. Gegenpartei / Behörde</h4>
                  {gegnerListe.length > 0 && (
                    <select onChange={handleGegnerAuswahl} style={{padding: '6px 10px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '13px', background: theme.inputBg, color: theme.textMain, flex: '1 1 250px', maxWidth: '350px'}}>
                      <option value="">+ Aus Gegner-CRM laden...</option>
                      {gegnerListe.map(g => {
                        let ansList = [];
                        try { const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen; if (Array.isArray(parsed)) ansList = parsed; } catch(e){}
                        if (ansList.length > 0) { return ansList.map((ans, idx) => ( <option key={`${g.id}-${idx}`} value={`${g.id}|${idx}`}>{g.name} — {ans.abteilung ? `${ans.abteilung}: ` : ''}{ans.name || 'Zentrale'}</option> )); }
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
              
              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                  <h4 style={{margin: 0, color: theme.textMain}}>3. Wir (Mandant)</h4>
                  {mandanten.length > 0 && (
                    <select onChange={handleTresorAuswahl} style={{padding: '6px 10px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '13px', background: theme.inputBg, color: theme.textMain, flex: '1 1 250px', maxWidth: '350px'}}>
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
            </>
          )}

          <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}><h4 style={h4StyleAkten}>Dokument-Eintrag / Arbeitsanweisung</h4></div>
          <div><label style={labelStyle}>Typ*</label><select value={typ} onChange={(e) => setTyp(e.target.value)} style={inputStyle}><option value="Eingang">Eingang</option><option value="Ausgang">Ausgang</option><option value="Intern">Intern</option></select></div>
          <div><label style={labelStyle}>Datum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={inputStyle} /></div>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Vorgang / Betreff / Aktion</label>
            <input type="text" value={aktion} onChange={(e) => setAktion(e.target.value)} placeholder="z.B. Rechnung Landesjustizkasse / Überweisung fällig" style={inputStyle} />
          </div>

          {activeAkteObj && activeAkteObj.akten_historie && activeAkteObj.akten_historie.length > 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '12px', background: 'rgba(14, 165, 233, 0.1)', border: '1px dashed #0ea5e9', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{...labelStyle, color: theme.textMain, margin: 0}}>Ist eine Antwort auf (Bezug & Auto-Kill Frist):</label>
                {bezugId && (
                  <span style={{ fontSize: '11px', background: '#0ea5e9', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                    ★ Bezug verknüpft
                  </span>
                )}
              </div>
              <select value={bezugId} onChange={(e) => setBezugId(e.target.value)} style={{...inputStyle, borderColor: '#0ea5e9'}}>
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
            <div style={{ gridColumn: '1 / -1', marginTop: '5px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', borderRadius: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: theme.textMain, fontWeight: 'bold' }}>
                <input type="checkbox" checked={clearOldFristen} onChange={(e) => setClearOldFristen(e.target.checked)} style={{ accentColor: '#10b981', width: '16px', height: '16px' }} />
                Alle bisherigen Fristen & Wiedervorlagen dieser Akte als erledigt markieren
              </label>
            </div>
          )}
        </div>

        <div style={{ background: theme.inputBg, padding: '20px', border: `1px solid ${theme.border}`, borderRadius: '8px', marginTop: '25px', textAlign: 'left' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '15px', marginBottom: '20px', padding: '15px', background: theme.cardBg, borderRadius: '8px', border: `1px dashed ${theme.border}` }}>
            <div>
              <label style={{...labelStyle, color: theme.textMain}}>Versand-E-Mail (Gegner)</label>
              <input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} placeholder="z.B. poststelle@..." style={{...inputStyle, padding: '8px'}} />
            </div>
            <div>
              <label style={{...labelStyle, color: theme.textMain}}>Versand-Faxnummer (Gegner)</label>
              <input type="text" value={gegnerFax} onChange={(e) => setGegnerFax(e.target.value)} onBlur={(e) => setGegnerFax(formatRufnummer(e.target.value))} placeholder="z.B. 0351 123456" style={{...inputStyle, padding: '8px'}} />
            </div>
            <div>
              <label style={{...labelStyle, color: theme.textMain}}>z. Hd. (Fax-Deckblatt)</label>
              <input type="text" value={faxZhd} onChange={(e) => setFaxZhd(e.target.value)} placeholder="z.B. Frau Klemmer" style={{...inputStyle, padding: '8px'}} title="Dieser Name wird exklusiv für den Fax-Versand genutzt und überschreibt nicht das CRM." />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{...labelStyle, color: theme.accent, margin: 0, display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="file" size={16} /> Textentwurf / Schreiben verfassen / Arbeitsanweisung & Notizen</label>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', width: '100%' }}>
              <button type="button" onClick={() => setShowVersandHistorie(true)} style={{ background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="Sendeliste und Nachweise einsehen"><Icon name="folder" size={16} /> Versandhistorie</button>
              <button type="button" onClick={() => handleResendVersand('email')} style={{ background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Icon name="send" size={16} /> E-Mail senden (Resend)</button>
              <button type="button" onClick={() => handleResendVersand('fax')} style={{ background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Icon name="phone" size={16} /> E-Fax (Simple-Fax)</button>
              
              {/* NEUER BUTTON: AUFGABEN-, ZAHLUNGS- & TERMIN-MODUL */}
              <button 
                type="button" 
                onClick={() => setShowTaskPanel(!showTaskPanel)} 
                style={{ background: showTaskPanel ? '#10b981' : theme.cardBg, color: showTaskPanel ? '#ffffff' : theme.accent, border: `1px solid ${showTaskPanel ? '#10b981' : theme.accent}`, borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                title="Internen Termin, Zahlungsziel oder Aufgabe inkl. Google Kalender Push anlegen"
              >
                📅 Termin / Zahlung
              </button>

              <button type="button" onClick={() => {
                setActiveWarRoomDossier({
                  akte_id: selectedAkteId,
                  unsere_firma: unsereFirma,
                  unser_ansprechpartner: unserAnsprechpartner,
                  aktenzeichen: aktenzeichen,
                  kontakt: gegnerName,
                  thema: thema,
                  frist_extern: fristExtern,
                  brief_entwurf: briefEntwurf || "Kein Volltext hinterlegt. Bitte auf Basis der Metadaten/Thema analysieren.",
                  raw_text: rawText || briefEntwurf || "Kein Volltext hinterlegt." 
                });
                setIsWarRoomOpen(true);
              }} style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="Diesen Vorgang zur forensischen Analyse in den War-Room schicken">
                <Icon name="alert" size={16} /> In War-Room senden
              </button>
            </div>
          </div>

          {/* --- AUFKLAPPBARES AUFGABEN-, ZAHLUNGS- & TERMIN-MODUL --- */}
          {showTaskPanel && (
            <div style={{ marginBottom: '18px', padding: '16px', background: theme.cardBg, border: '1px solid #10b981', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px dashed ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <strong style={{ color: '#10b981', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📅 Interne Aufgabe / Zahlung / Termin planen (Wiedervorlage & Google Kalender)
                </strong>
                <button type="button" onClick={() => setShowTaskPanel(false)} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>✕ Schließen</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Aufgaben-Typ</label>
                  <select value={taskType} onChange={(e) => setTaskType(e.target.value)} style={{ ...inputStyle, padding: '8px' }}>
                    <option value="Zahlung / Überweisung">💳 Zahlung / Überweisung</option>
                    <option value="Wiedervorlage / Abwarten">⏳ Wiedervorlage / Schreiben abwarten</option>
                    <option value="Telefonat / Rückruf">📞 Telefonat / Rückruf</option>
                    <option value="Interne Prüfung / Aufgabe">📌 Interne Prüfung / Aufgabe</option>
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
                      <label style={labelStyle}>Verwendungszweck / Kassenzeichen</label>
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
                  style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', flex: '1 1 220px' }}
                >
                  ✓ In Maske & Wiedervorlage übernehmen (Typ: Intern)
                </button>
                <button 
                  type="button" 
                  onClick={pushToGoogleCalendar} 
                  style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', flex: '1 1 220px' }}
                >
                  📅 Direkt im Google Kalender öffnen
                </button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '15px', padding: '12px', background: theme.cardBg, border: `1px dashed ${theme.border}`, borderRadius: '6px' }}>
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

          <textarea value={briefEntwurf} onChange={(e) => setBriefEntwurf(e.target.value)} placeholder="Trage hier deinen Brief- oder E-Mail-Text, Arbeitsanweisungen oder Notizen ein..." style={{ ...inputStyle, minHeight: '180px', fontFamily: 'monospace', background: 'transparent' }} />
          {versandPdfUrl && typ === 'Ausgang' && (<div style={{ marginTop: '15px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', color: '#10b981', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon name="check" size={16} /> Versand-PDF generiert & verschickt! Vergiss nicht, unten auf "+ In Akte abheften" zu klicken.</div>)}
          {versandPdfUrl && typ !== 'Ausgang' && (<div style={{ marginTop: '15px', padding: '10px', background: 'rgba(14, 165, 233, 0.1)', border: '1px dashed #0ea5e9', color: '#0ea5e9', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon name="check" size={16} /> Scan-PDF erfolgreich verknüpft! Bereit zum Abheften.</div>)}
        </div>

        <button type="submit" style={{ padding: '15px', background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '25px' }}>
          + In Akte abheften
        </button>
      </form>
    </>
  );
}