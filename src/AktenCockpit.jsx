import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub, extractFilename, normalizeName, cleanVal } from './utils';
import MegaLegalModal from './MegaLegalModal';
import AktenAlarme from './AktenAlarme';
import AktenListe from './AktenListe';
import AktenFormular from './AktenFormular';

// --- PDF.js Import für die clientseitige Extraktion ---
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function AktenCockpit({ session, theme, akten, mandanten, gegnerListe, ladeDaten, showToast, suchbegriff, globalUrlText, setGlobalUrlText }) {
  const SIGNATUR_URL = "https://loyzfkxkuyypgteskxkm.supabase.co/storage/v1/object/public/dokumente/jw-signum-lang-blau.png";

  const [laedt, setLaedt] = useState(false);
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

  const autoGenRef = useRef('');

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const h4StyleAkten = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word', boxSizing: 'border-box' };
  const quickBtnStyle = { background: theme.border, color: theme.textMain, border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };
  const inlineInputStyle = { background: 'transparent', border: '1px dashed transparent', color: theme.textMain, width: '100%', fontSize: '13px', padding: '4px', outline: 'none', cursor: 'text', borderBottom: `1px dashed ${theme.border}`, boxSizing: 'border-box' };

  const isDarkMode = theme.bg === '#020617';
  const btnTextColor = isDarkMode ? '#000' : '#ffffff';
  const formatDatum = (datum) => datum ? new Date(datum).toLocaleDateString('de-DE') : '-';

  const formatRufnummer = (nummer) => {
    if (!nummer) return '';
    let clean = String(nummer).replace(/[\s\-\/\(\)]/g, ''); 
    if (clean.startsWith('0049')) {
      clean = '+49' + clean.substring(4);
    } else if (clean.startsWith('0')) {
      clean = '+49' + clean.substring(1);
    }
    return clean;
  };

  const cleanOrgName = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[\.,\-\/\(\)]/g, ' ')
      .replace(/\b(die|der|das|und|fuer|für|gmbh|ug|ag|haftungsbeschraenkt|haftungsbeschränkt|gesundheitskasse|sachsen|thueringen|thüringen)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const fuzzyMatch = (str1, str2) => {
    if (!str1 || !str2) return false;
    const n1 = cleanOrgName(str1);
    const n2 = cleanOrgName(str2);
    if (!n1 || !n2) return false;
    if (n1.length < 4 || n2.length < 4) return n1 === n2;
    return n1.includes(n2) || n2.includes(n1);
  };

  // --- ADMIN AUTH CHECK MIT TRIM FIX ---
  const checkAdminAuth = () => {
    const pw = window.prompt("Admin-Sicherheit: Bitte Passwort eingeben, um die Sperre aufzuheben.");
    if (pw === null) return false; // Abgebrochen
    if (pw.trim() === import.meta.env.VITE_ADMIN_PASSWORD) {
      return true;
    } else {
      showToast("Passwort inkorrekt! Aktion blockiert.", "error");
      return false;
    }
  };

  useEffect(() => {
    if (globalUrlText) {
      setBriefEntwurf(globalUrlText);
      setGlobalUrlText(null); 
    }
  }, [globalUrlText, setGlobalUrlText]);

  const generatePrefix = (name) => {
    if (!name) return '';
    const n = name.toLowerCase();
    if (n.includes('jens wilsdorf')) return 'jw';
    if (n.includes('smartbizz') || n.includes('sbs')) return 'sbs';
    if (n.includes('brand & market') || n.includes('bam')) return 'bam';
    if (n.includes('wilsdorf & sommer') || n.includes('wus')) return 'wus';
    if (n.includes('wir')) return 'wir';
    return name.split(/[\s-]+/).filter(w => w.length > 0).slice(0, 3).map(w => w[0]).join('').toLowerCase();
  };

  useEffect(() => {
    if (modus === 'neu' && unsereFirma && gegnerName) {
      const mPrefix = generatePrefix(unsereFirma).toUpperCase();
      let gPrefix = gegnerName.trim().split(' ')[0].replace(/[^a-zA-ZäöüÄÖÜß0-9]/g, '');
      if (!gPrefix) gPrefix = 'Gegner';

      let maxGlobalNum = 0;
      akten.forEach(a => {
        if (a.unser_zeichen) {
          const matchNew = a.unser_zeichen.match(/^(\d+)-/);
          if (matchNew) {
            const num = parseInt(matchNew[1], 10);
            if (!isNaN(num) && num > maxGlobalNum) {
              maxGlobalNum = num;
            }
          } else {
            const matchOld = a.unser_zeichen.match(/-(\d+)$/);
            if (matchOld) {
              const num = parseInt(matchOld[1], 10);
              if (!isNaN(num) && num > maxGlobalNum) {
                maxGlobalNum = num;
              }
            }
          }
        }
      });

      const nextNum = String(maxGlobalNum + 1).padStart(4, '0');
      const newZeichen = `${nextNum}-${mPrefix}-${gPrefix}`;
      
      setUnserZeichen(prev => {
        if (!prev || prev === autoGenRef.current) {
          autoGenRef.current = newZeichen;
          return newZeichen;
        }
        return prev;
      });
    }
  }, [unsereFirma, gegnerName, modus, akten]);

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

  const handleFristChange = (val) => {
    setFristExtern(val);
    if (val) setWiedervorlage('');
  };

  const handleWVChange = (val) => {
    setWiedervorlage(val);
    if (val) setFristExtern('');
  };

  const setzeWV = (tage, monate = 0) => {
    const d = new Date(); d.setDate(d.getDate() + tage); if (monate > 0) d.setMonth(d.getMonth() + monate); 
    handleWVChange(d.toISOString().split('T')[0]);
  };

  const handleAkteAuswahl = (e) => {
    const val = e.target.value;
    setSelectedAkteId(val);
    setBezugId(''); 
    if (val) {
       const a = akten.find(x => x.id === val);
       if (a) {
          setUnserZeichen(a.unser_zeichen || '');
          setGegnerName(a.gegner_name || '');
          setGegnerAnsprechpartner(a.gegner_ansprechpartner || '');
          setFaxZhd(a.gegner_ansprechpartner || '');
          setGegnerTelefon(formatRufnummer(a.gegner_telefon || ''));
          setGegnerEmail(a.gegner_email || '');
          setUnsereFirma(a.unsere_firma || '');
          setUnserAnsprechpartner(a.unser_ansprechpartner || '');
          setThema(a.thema || '');
          setAktenzeichen(a.aktenzeichen || '');
          
          if (a.gegner_name) {
             const crmGegner = gegnerListe.find(g => fuzzyMatch(g.name, a.gegner_name));
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

    const zielAkte = akten.find(a => a.id === akteId);
    if (zielAkte && zielAkte.status === 'Erledigt' && !zeigeErledigte) {
      setZeigeErledigte(true);
    }

    if (!aufgeklappteAkten.includes(akteId)) {
      setAufgeklappteAkten(prev => [...prev, akteId]);
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
    setUnserAnsprechpartner(akte.unser_ansprechpartner || '');
    setThema(akte.thema || '');
    setAktenzeichen(akte.aktenzeichen || '');

    if (akte.gegner_name) {
      const crmGegner = gegnerListe.find(g => fuzzyMatch(g.name, akte.gegner_name));
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
    const akte = akten.find(a => a.id === akteId);
    if (!akte) return;

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
    setUnserAnsprechpartner(akte.unser_ansprechpartner || '');
    setThema(akte.thema || '');
    setAktenzeichen(akte.aktenzeichen || '');
    setTyp('Ausgang');

    if (akte.gegner_name) {
      const crmGegner = gegnerListe.find(g => fuzzyMatch(g.name, akte.gegner_name));
      if (crmGegner) {
        setGegnerFax(formatRufnummer(crmGegner.fax || ''));
        if (!akte.gegner_email) setGegnerEmail(crmGegner.email || crmGegner.email_zentrale || '');
      } else {
        setGegnerFax('');
      }
    }

    const template = `Sehr geehrte Damen und Herren,\n\nbezugnehmend auf unsere bisherige Korrespondenz in der obigen Angelegenheit bitten wir höflich um einen kurzen Sachstandsbericht, da wir bislang noch keine Rückmeldung erhalten haben.\n\nSollten Ihnen noch Unterlagen zur Bearbeitung fehlen, lassen Sie es uns bitte wissen.\n\nMit freundlichen Grüßen\n\n${akte.unser_ansprechpartner || 'Jens Wilsdorf'}`;
    setBriefEntwurf(template);

    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast("Akte geladen & Follow-Up Vorlage eingefügt!", "success");
  };

  const checkGegnerDiff = (neuName, neuFax, neuEmail, neuAnsprechpartner, neuTelefon) => {
    if (!neuName) return false;
    
    let target = gegnerListe.find(g => normalizeName(g.name) === normalizeName(neuName));
    if (!target) {
      target = gegnerListe.find(g => fuzzyMatch(g.name, neuName));
    }
    
    if (target) {
      let contacts = [];
      try {
        contacts = typeof target.notizen === 'string' ? JSON.parse(target.notizen) : (target.notizen || []);
      } catch (e) {
        contacts = [];
      }
      if (!Array.isArray(contacts)) contacts = [];

      const cleanNeuAP = (neuAnsprechpartner || '').trim().toLowerCase();

      let matchedContact = null;
      if (cleanNeuAP) {
        if ((target.ansprechpartner || '').trim().toLowerCase().includes(cleanNeuAP) || cleanNeuAP.includes((target.ansprechpartner || '').trim().toLowerCase())) {
          matchedContact = { name: target.ansprechpartner, telefon: target.telefon, email: target.email };
        } else {
          matchedContact = contacts.find(c => {
            const cName = (c.name || '').trim().toLowerCase();
            return cName && (cName.includes(cleanNeuAP) || cleanNeuAP.includes(cName));
          });
        }
      }

      if (matchedContact) {
        if (!neuTelefon && matchedContact.telefon) setGegnerTelefon(formatRufnummer(matchedContact.telefon));
        if (!neuEmail && matchedContact.email) setGegnerEmail(matchedContact.email);
        if (!neuFax && target.fax) setGegnerFax(formatRufnummer(target.fax));
        return false; 
      }

      if (!cleanNeuAP || cleanNeuAP === 'zentrale' || cleanNeuAP === 'poststelle') {
        if (!neuTelefon && target.telefon) setGegnerTelefon(formatRufnummer(target.telefon));
        if (!neuEmail && (target.email || target.email_zentrale)) setGegnerEmail(target.email || target.email_zentrale);
        if (!neuFax && target.fax) setGegnerFax(formatRufnummer(target.fax));
        return false; 
      }

      setGegnerPrompt({
        typ: 'neuer_ap',
        targetId: target.id,
        targetName: target.name,
        obj: { name: target.name, ansprechpartner: neuAnsprechpartner, telefon: formatRufnummer(neuTelefon), fax: formatRufnummer(neuFax || target.fax), email: neuEmail }
      });
      return true;
    } else {
      setGegnerPrompt({
        typ: 'neu',
        obj: { name: neuName, ansprechpartner: neuAnsprechpartner, telefon: formatRufnummer(neuTelefon), fax: formatRufnummer(neuFax), email: neuEmail }
      });
      return true;
    }
  };

  const findSmartBezug = (targetAkte, incomingObj) => {
    if (!targetAkte || !targetAkte.akten_historie || targetAkte.akten_historie.length === 0) return '';

    const newAP = (incomingObj.ansprechpartner || (incomingObj.empfaenger ? incomingObj.empfaenger.abteilung : '') || '').toLowerCase().trim();
    const newContext = `${incomingObj.thema || ''} ${incomingObj.betreff || ''} ${incomingObj.aktion || ''} ${incomingObj.brief_entwurf || ''}`.toLowerCase();

    const keywords = ['vollstreckung', 'erhebung', 'mahnung', 'bescheid', 'haftung', 'umsatzsteuer', 'ust', 'gewerbesteuer', 'gewst', 'gst', 'körperschaftsteuer', 'kst', 'lohnsteuer', 'stundung', 'aussetzung', 'insolvenz'];

    let bestId = '';
    let highestScore = -1;

    targetAkte.akten_historie.forEach(h => {
      let score = 0;
      const hText = `${h.aktion || ''} ${h.brief_entwurf || ''} ${h.typ || ''}`.toLowerCase();

      if (newAP && newAP.length > 2 && hText.includes(newAP)) {
        score += 40;
      }

      keywords.forEach(kw => {
        if (newContext.includes(kw) && hText.includes(kw)) {
          score += 15;
        }
      });

      if (h.frist_extern || h.wiedervorlage) {
        score += 25;
      }

      if (h.datum) {
        const diffDays = (new Date() - new Date(h.datum)) / (1000 * 60 * 60 * 24);
        if (diffDays >= 0 && diffDays < 30) score += 10;
        else if (diffDays >= 0 && diffDays < 90) score += 5;
      }

      if (score > highestScore && score >= 25) {
        highestScore = score;
        bestId = h.id;
      }
    });

    return bestId;
  };

  const handleJsonImport = async (e) => {
    const val = e.target.value.trim();
    setJsonImport(val);

    try {
      const obj = JSON.parse(val);

      if (obj.typ === 'Bulk-Gegner' && Array.isArray(obj.daten)) {
        setLaedt(true);
        let addedCount = 0; let updatedCount = 0;
        for (const item of obj.daten) {
           if (!item.gegner_name) continue;
           const existingGegner = gegnerListe.find(g => fuzzyMatch(g.name, item.gegner_name));
           if (!existingGegner) {
              await supabase.from('gegner').insert([{ user_id: session.user.id, name: item.gegner_name, fax: formatRufnummer(item.fax), email: item.email || null, notizen: JSON.stringify([{ abteilung: item.abteilung || '', name: item.ansprechpartner || '', telefon: formatRufnummer(item.telefon), email: item.email || '' }]) }]);
              addedCount++;
           } else {
              let updates = {}; let needsUpdate = false;
              if (!existingGegner.fax && item.fax) { updates.fax = formatRufnummer(item.fax); needsUpdate = true; }
              if (!existingGegner.email && item.email) { updates.email = item.email; needsUpdate = true; }
              let currentContacts = [];
              try { currentContacts = typeof existingGegner.notizen === 'string' ? JSON.parse(existingGegner.notizen) : (existingGegner.notizen || []); if (!Array.isArray(currentContacts)) currentContacts = []; } catch(err) { currentContacts = []; }
              if (item.ansprechpartner || item.abteilung) {
                 const contactExists = currentContacts.some(c => (c.name || '').toLowerCase() === (item.ansprechpartner || '').toLowerCase() && (c.abteilung || '').toLowerCase() === (item.abteilung || '').toLowerCase());
                 if (!contactExists) { currentContacts.push({ abteilung: item.abteilung || '', name: item.ansprechpartner || '', telefon: formatRufnummer(item.telefon), email: item.email || '' }); updates.notizen = JSON.stringify(currentContacts); needsUpdate = true; }
              }
              if (needsUpdate) { await supabase.from('gegner').update(updates).eq('id', existingGegner.id); updatedCount++; }
           }
        }
        await ladeDaten(); setJsonImport(''); setLaedt(false);
        showToast(`KI-Gegner-Scan abgeschlossen!\n\n${addedCount} neue Behörden/Gegner angelegt.\n${updatedCount} bestehende aktualisiert.`, 'success');
        return; 
      }

      const fallbackUnserZeichen = obj.unser_zeichen || '';
      const fallbackAktenzeichen = obj.aktenzeichen || '';
      const fallbackThema = obj.thema || obj.betreff || obj.gegenstand || '';
      const fallbackGegnerName = obj.kontakt || (obj.empfaenger ? obj.empfaenger.name : '') || '';
      const fallbackGegnerAnsprechpartner = obj.ansprechpartner || (obj.empfaenger ? obj.empfaenger.abteilung : '') || '';
      const fallbackGegnerTelefon = obj.gegner_telefon || '';
      const fallbackGegnerFax = obj.gegner_fax || obj.versand_faxnummer_gegner || (obj.empfaenger ? obj.empfaenger.fax : '') || '';
      const fallbackGegnerEmail = obj.gegner_email || obj.versand_e_mail_gegner || (obj.empfaenger ? obj.empfaenger.email : '') || '';
      const fallbackFristExtern = obj.frist_extern || '';
      const fallbackBriefEntwurf = obj.brief_entwurf || obj.textentwurf || obj.nachricht || '';
      const fallbackRawText = obj.raw_text || ''; 
      const fallbackAktion = obj.aktion || obj.status || '';
      const fallbackKanal = obj.kanal || obj.versandweg || 'Post / Fax / E-Mail';
      const fallbackTyp = obj.typ || obj.dokumententyp || 'Eingang';
      const fallbackUnsereFirma = obj.unsere_firma || (obj.absender ? obj.absender.name : '') || '';
      
      if (fallbackUnserZeichen) setUnserZeichen(fallbackUnserZeichen);
      setAktenzeichen(fallbackAktenzeichen); setThema(fallbackThema); 
      setGegnerName(fallbackGegnerName); setGegnerAnsprechpartner(fallbackGegnerAnsprechpartner); 
      setGegnerTelefon(formatRufnummer(fallbackGegnerTelefon)); setGegnerFax(formatRufnummer(fallbackGegnerFax)); setGegnerEmail(fallbackGegnerEmail); 
      handleFristChange(fallbackFristExtern); setBriefEntwurf(fallbackBriefEntwurf); setRawText(fallbackRawText); setAktion(fallbackAktion); 
      setKanal(fallbackKanal); setTyp(fallbackTyp);
      setDatum(new Date().toISOString().split('T')[0]);
      setFaxZhd(fallbackGegnerAnsprechpartner);

      if (obj.pdf_url) {
        setVersandPdfUrl(obj.pdf_url);
      }

      const promptNeeded = checkGegnerDiff(fallbackGegnerName, fallbackGegnerFax, fallbackGegnerEmail, fallbackGegnerAnsprechpartner, fallbackGegnerTelefon);
      if (!promptNeeded) {
        setGegnerPrompt(null);
      }

      let matchedAkte = null;
      if (fallbackUnserZeichen) {
        matchedAkte = akten.find(a => a.unser_zeichen === fallbackUnserZeichen);
      } else if (fallbackAktenzeichen) {
        matchedAkte = akten.find(a => a.aktenzeichen === fallbackAktenzeichen);
      }

      if (matchedAkte) {
        setModus('bestehend');
        setSelectedAkteId(matchedAkte.id);

        const autoBezugId = findSmartBezug(matchedAkte, obj);
        if (autoBezugId) {
          setBezugId(autoBezugId);
          showToast("Vorläufer-Vorgang intelligent erkannt und automatisch verknüpft!", "success");
        } else {
          setBezugId('');
        }
      } else {
        setModus('neu');
        setBezugId('');
      }

      if (fallbackUnsereFirma) {
        const existingMandant = mandanten.find(m => cleanOrgName(m.firmenname) === cleanOrgName(fallbackUnsereFirma));
        const parsedAnsprechpartner = cleanVal(obj.unser_ansprechpartner) || cleanVal(obj.ansprechpartner) || (obj.absender ? obj.absender.name : '') || '';
        const parsedTelefon = formatRufnummer(cleanVal(obj.unser_telefon) || cleanVal(obj.telefon) || '');
        const parsedEmail = cleanVal(obj.unser_email) || cleanVal(obj.email) || '';
        const parsedAdresse = cleanVal(obj.unsere_adresse) || cleanVal(obj.adresse) || (obj.absender ? `${obj.absender.strasse || ''}, ${obj.absender.plz_ort || ''}` : '') || '';

        if (!existingMandant) {
          setUnsereFirma(fallbackUnsereFirma); setUnserAnsprechpartner(parsedAnsprechpartner); setUnserTelefon(parsedTelefon); setUnserEmail(parsedEmail);
          setTresorPrompt({ 
            typ: 'neu', 
            obj: { ...obj, unsere_firma: fallbackUnsereFirma, unser_ansprechpartner: parsedAnsprechpartner, unser_telefon: parsedTelefon, unser_email: parsedEmail, unsere_adresse: parsedAdresse } 
          });
        } else {
           setUnsereFirma(existingMandant.firmenname); 
           setUnserAnsprechpartner(parsedAnsprechpartner || cleanVal(existingMandant.ansprechpartner) || '');
           setUnserTelefon(parsedTelefon || cleanVal(existingMandant.telefon) || ''); 
           setUnserEmail(parsedEmail || cleanVal(existingMandant.email) || '');
           setTresorPrompt(null);
        }
      }
    } catch(err) { console.error("JSON Error:", err); }
  };

  const handleTresorPromptAccept = async () => {
    if (!tresorPrompt) return;
    if (tresorPrompt.typ === 'neu') {
      const { data, error } = await supabase.from('mandanten').insert([{
        user_id: session.user.id, firmenname: tresorPrompt.obj.unsere_firma, ansprechpartner: cleanVal(tresorPrompt.obj.unser_ansprechpartner) || '',
        telefon: formatRufnummer(cleanVal(tresorPrompt.obj.unser_telefon) || ''), email: cleanVal(tresorPrompt.obj.unser_email) || '', adresse: cleanVal(tresorPrompt.obj.unsere_adresse) || '',
        steuernummer: cleanVal(tresorPrompt.obj.unsere_steuernummer) || '', ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || '', betriebsnummer: cleanVal(tresorPrompt.obj.unsere_betriebsnummer) || '',
        vbg_nummer: cleanVal(tresorPrompt.obj.unsere_vbg_nummer) || '', handelsregister: cleanVal(tresorPrompt.obj.unsere_handelsregister) || '', iban: cleanVal(tresorPrompt.obj.unsere_iban) || ''
      }]).select();
      if (!error && data) { showToast(`Mandant "${tresorPrompt.obj.unsere_firma}" im Tresor angelegt!`, 'success'); ladeDaten(); }
    }
    setTresorPrompt(null);
  };

  const handleGegnerPromptAccept = async (actionType = 'erweitern') => {
    if (!gegnerPrompt) return;
    
    if (gegnerPrompt.typ === 'neu') {
      await supabase.from('gegner').insert([{
        user_id: session.user.id,
        name: gegnerPrompt.obj.name,
        fax: formatRufnummer(gegnerPrompt.obj.fax),
        email: gegnerPrompt.obj.email || null,
        notizen: JSON.stringify([{
            abteilung: '',
            name: gegnerPrompt.obj.ansprechpartner || '',
            telefon: formatRufnummer(gegnerPrompt.obj.telefon),
            email: gegnerPrompt.obj.email || ''
        }])
      }]);
      showToast(`Behörde/Gegner "${gegnerPrompt.obj.name}" ins CRM aufgenommen!`, 'success');
      
    } else if (gegnerPrompt.typ === 'neuer_ap') {
      const existing = gegnerListe.find(g => g.id === gegnerPrompt.targetId);
      if (existing) {
        let gUpdates = {};
        
        if (actionType === 'hauptkontakt') {
          gUpdates.ansprechpartner = gegnerPrompt.obj.ansprechpartner;
          if (gegnerPrompt.obj.telefon) gUpdates.telefon = gegnerPrompt.obj.telefon;
          if (gegnerPrompt.obj.email) gUpdates.email = gegnerPrompt.obj.email;
        } else {
          let currentContacts = [];
          try { currentContacts = typeof existing.notizen === 'string' ? JSON.parse(existing.notizen) : (existing.notizen || []); } catch(e) {}
          if (!Array.isArray(currentContacts)) currentContacts = [];

          currentContacts.push({
            abteilung: '',
            name: gegnerPrompt.obj.ansprechpartner,
            telefon: formatRufnummer(gegnerPrompt.obj.telefon) || '',
            email: gegnerPrompt.obj.email || ''
          });
          gUpdates.notizen = JSON.stringify(currentContacts);
        }
        
        await supabase.from('gegner').update(gUpdates).eq('id', existing.id);
        showToast(`Ansprechpartner "${gegnerPrompt.obj.ansprechpartner}" im CRM gesichert!`, 'success');
      }
    }
    
    ladeDaten();
    setGegnerPrompt(null);
  };

  // --- HIER BEREINIGT: MANUELLES SCHLIESSEN/ÖFFNEN WIEDER OHNE PASSWORT ---
  const handleInlineEdit = async (histId, feld, wert) => {
    const dbWert = (typeof wert === 'boolean') ? wert : (wert !== '' ? wert : null);
    let updates = { [feld]: dbWert };
    
    if (feld === 'frist_extern' && wert) updates.wiedervorlage = null;
    if (feld === 'wiedervorlage' && wert) updates.frist_extern = null;

    const { error } = await supabase.from('akten_historie').update(updates).eq('id', histId);
    if (!error) { 
      ladeDaten(); 
    } else { 
      showToast("Fehler beim Speichern: " + error.message, 'error'); 
    }
  };

  const handleTerminVerschieben = async (item, tagePlus) => {
    const basisDatumStr = item.aktivesDatum || item.wiedervorlage || item.frist_extern;
    const basis = basisDatumStr ? new Date(basisDatumStr) : new Date();
    const neuDate = new Date(basis);
    neuDate.setDate(neuDate.getDate() + tagePlus);
    const neuIso = neuDate.toISOString().split('T')[0];

    if (!item.isWiedervorlage && (item.frist_extern || !item.wiedervorlage)) {
      const fristDatum = item.frist_extern ? new Date(item.frist_extern).toLocaleDateString('de-DE') : formatDatum(item.aktivesDatum);
      const text = `⚠️ ACHTUNG: Es handelt sich um eine behördliche Frist (Fälligkeit: ${fristDatum})!\n\n` +
        `Lass diese Frist keinesfalls kommentarlos verstreichen. Nutze die Möglichkeit in SONAR MEGA-LEGAL, ` +
        `die Behörde fristwahrend um eine Fristverlängerung zu bitten oder die Aussetzung der Vollziehung zu beantragen.\n\n` +
        `Möchtest du die Frist dennoch eigenverantwortlich um +${tagePlus} Tage (auf den ${formatDatum(neuIso)}) verschieben?`;
      
      if (!window.confirm(text)) {
        return;
      }
      await handleInlineEdit(item.id, 'frist_extern', neuIso);
      showToast(`Behördliche Frist um +${tagePlus} Tage verschoben (${formatDatum(neuIso)})! Bitte rechtzeitig Schreiben senden.`, 'warning');
    } else {
      const wvDatum = item.wiedervorlage ? new Date(item.wiedervorlage).toLocaleDateString('de-DE') : formatDatum(item.aktivesDatum);
      const text = `Interne Wiedervorlage (Fällig: ${wvDatum}) um +${tagePlus} Tage auf den ${formatDatum(neuIso)} verschieben?`;
      if (!window.confirm(text)) {
        return;
      }
      await handleInlineEdit(item.id, 'wiedervorlage', neuIso);
      showToast(`Wiedervorlage um +${tagePlus} Tage verschoben (${formatDatum(neuIso)}).`, 'success');
    }

    setOpenMenuId(null);
  };

  // --- HIER BEREINIGT: MANUELLES SCHLIESSEN/ÖFFNEN WIEDER OHNE PASSWORT ---
  const handleAkteStammdatenEdit = async (akteId, feld, wert) => {
    const dbWert = (typeof wert === 'boolean') ? wert : (wert !== '' ? wert : null);
    const { error } = await supabase.from('akten').update({ [feld]: dbWert }).eq('id', akteId);
    if (!error) {
      ladeDaten();
    } else {
      showToast("Fehler beim Speichern: " + error.message, 'error');
    }
  };

  const loescheHistorieEintrag = async (histId) => {
    if(!window.confirm("Diesen gesamten Eintrag inkl. aller darin verknüpften Dateien aus der Akte löschen?")) return;
    await supabase.from('akten_historie').delete().eq('id', histId); ladeDaten(); showToast('Eintrag komplett gelöscht!', 'success');
  };

  const loescheDateiAusHistorie = async (histId, aktuelleUrls, urlZumLoeschen) => {
    if (!window.confirm("Diese Datei wirklich aus dem Akten-Eintrag entfernen?")) return;
    const urlArray = aktuelleUrls.split(',');
    const neueUrls = urlArray.filter(url => url !== urlZumLoeschen);
    const neuerUrlString = neueUrls.length > 0 ? neueUrls.join(',') : null;
    
    const { error: dbError } = await supabase.from('akten_historie').update({ dokument_url: neuerUrlString }).eq('id', histId);
    if (!dbError) {
       try { const parts = decodeURIComponent(urlZumLoeschen).split('/'); const fileName = parts[parts.length - 1]; await supabase.storage.from('dokumente').remove([fileName]); } catch (e) { }
       ladeDaten(); showToast('Datei erfolgreich entfernt!', 'success');
    } else { showToast("Fehler beim Entfernen der Datei: " + dbError.message, 'error'); }
  };

  // --- HIER BLEIBT DER PASSWORTSCHUTZ FÜR DEN "ERLEDIGT"-STATUS EXAKT ERHALTEN ---
  const toggleAkteStatus = async (akteId, currentStatus) => {
    const neuerStatus = currentStatus === 'Erledigt' ? 'Offen' : 'Erledigt';
    
    if (neuerStatus === 'Offen') {
      // Entsperren & Wiedereröffnen
      if (!checkAdminAuth()) return;
      
      const { error } = await supabase.from('akten').update({ status: neuerStatus, is_locked: false }).eq('id', akteId);
      if (!error) {
        await supabase.from('akten_historie').update({ is_locked: false }).eq('akte_id', akteId);

        await supabase.from('akten_historie').insert([{ akte_id: akteId, user_id: session.user.id, typ: 'Intern', datum: new Date().toISOString().split('T')[0], aktion: 'Akte durch Admin wiedereröffnet & entsperrt.' }]);
        ladeDaten(); showToast(`Akte wurde wieder geöffnet und alle Vorgänge entsperrt.`, 'success');
      } else { showToast("Fehler beim Ändern des Akten-Status: " + error.message, 'error'); }
      
    } else {
      // Erledigt & Auto-Lock (Akte + Vorgänge) + Warnhinweis
      const bestaetigung = window.confirm("Akte auf 'Erledigt' setzen? Die Akte und alle Vorgänge werden dadurch versiegelt. Einsicht und Downloads bleiben weiterhin möglich, aber eine Wiedereröffnung zur Bearbeitung erfordert zwingend Administrator-Rechte. Fortfahren?");
      if (!bestaetigung) return;

      const { error } = await supabase.from('akten').update({ status: neuerStatus, is_locked: true }).eq('id', akteId);
      if (!error) {
        // Alle Vorgänge zwingend versiegeln
        await supabase.from('akten_historie').update({ is_locked: true }).eq('akte_id', akteId);

        const d = new Date(); d.setFullYear(d.getFullYear() + 10); const wvDatum = d.toISOString().split('T')[0];
        await supabase.from('akten_historie').insert([{ 
          akte_id: akteId, 
          user_id: session.user.id, 
          typ: 'Intern', 
          datum: new Date().toISOString().split('T')[0], 
          aktion: 'Akte geschlossen. Automatische Wiedervorlage zur Löschung (Ablauf Aufbewahrungsfrist).', 
          wiedervorlage: wvDatum,
          is_locked: true
        }]);
        ladeDaten(); showToast(`Akte und alle Vorgänge versiegelt und geschlossen.`, 'success');
      } else { showToast("Fehler beim Ändern des Akten-Status: " + error.message, 'error'); }
    }
  };

  const handleNachtragUploadAkte = async (histId, currentUrls, akteFirma, akteGegner, e) => {
    const file = e.target.files[0]; if (!file) return; setUploadingHistId(histId);
    const isMd = file.name.toLowerCase().endsWith('.md');
    if (isMd) {
      const mdInhalt = await file.text(); const baseInfo = `Nachträglich an Akte angehängt. Gegner: ${akteGegner || 'Unbekannt'}`;
      await supabase.from('wissensdatenbank').insert([{ datei_name: file.name, firma: akteFirma || 'Allgemein', inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`, dokument_url: null }]);
      await syncToGithub(file.name, mdInhalt, null, null, showToast); ladeDaten(); showToast('Dokument erfolgreich angehängt!', 'success');
    } else {
      const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); const dateiName = `h_${Date.now()}_${sichererDateiname}`;
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file);
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName); const newUrl = linkData.publicUrl; const updatedUrls = currentUrls ? `${currentUrls},${newUrl}` : newUrl;
        await supabase.from('akten_historie').update({ dokument_url: updatedUrls }).eq('id', histId); ladeDaten(); showToast('Dokument erfolgreich angehängt!', 'success');
      } else { showToast("Fehler beim Upload: " + uploadError.message, 'error'); }
    }
    setUploadingHistId(null); e.target.value = '';
  };

  const druckeAkte = (akte) => {
    const printWindow = window.open('', '_blank');
    const historieRows = akte.akten_historie ? akte.akten_historie.map(h => `<tr><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${h.typ}</td><td style="padding: 8px; border: 1px solid #ccc;">${h.datum ? new Date(h.datum).toLocaleDateString('de-DE') : '-'}</td><td style="padding: 8px; border: 1px solid #ccc;">${h.aktion || '-'}</td><td style="padding: 8px; border: 1px solid #ccc; color: #d97706;">${h.wiedervorlage ? 'WV: ' + new Date(h.wiedervorlage).toLocaleDateString('de-DE') : (h.frist_extern ? 'Frist: ' + new Date(h.frist_extern).toLocaleDateString('de-DE') : '-')}</td></tr>`).join('') : '';
    printWindow.document.write(`<html><head><title>Aktenauszug - ${akte.unser_zeichen || 'Akte'}</title><style>body { font-family: Arial, sans-serif; padding: 20px; color: #111; line-height: 1.5; } h1 { font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px; } .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 13px; background: #f4f4f4; padding: 15px; border-radius: 6px; } table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; } th { background: #eee; padding: 8px; border: 1px solid #ccc; text-align: left; }</style></head><body><h1>SONAR AKTEN-AUSZUG | UNSER ZEICHEN: ${akte.unser_zeichen || '-'}</h1><div class="grid"><div><strong>GEGENPARTEI / BEHÖRDE:</strong><br/>${akte.gegner_name}<br/>Ansprechpartner: ${akte.gegner_ansprechpartner || '-'}<br/>E-Mail: ${akte.gegner_email || '-'}</div><div><strong>MANDANT / FIRMA:</strong><br/>${akte.unsere_firma}<br/>Ansprechpartner: ${akte.unser_ansprechpartner || '-'}<br/>Gegenstand: ${akte.thema}</div></div><h3>DOKUMENTEN- & VERLAUFSHISTORIE</h3><table><thead><tr><th>Typ</th><th>Datum</th><th>Aktion / Vorgang</th><th>WV / Frist</th></tr></thead><tbody>${historieRows}</tbody></table><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`);
    printWindow.document.close();
  };

  const druckeSendebericht = (eintrag) => {
    const printWindow = window.open('', '_blank');
    const anhaengeText = eintrag.dokument_url ? eintrag.dokument_url.split(',').map(url => extractFilename(url)).join(', ') : 'Keine Anhänge';
    printWindow.document.write(`<html><head><title>Sendebericht - ${eintrag.unser_zeichen || 'Ausgang'}</title><style>body { font-family: Arial, sans-serif; padding: 30px; color: #111; line-height: 1.6; } .box { border: 2px solid #000; padding: 20px; border-radius: 6px; margin-bottom: 20px; } h1 { font-size: 22px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-beacht: 20px; text-transform: uppercase; } .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px; margin-bottom: 20px; } .meta-item { border-bottom: 1px solid #ddd; padding-bottom: 5px; } .badge { display: inline-block; background: #10b981; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; } pre { white-space: pre-wrap; font-family: Courier, monospace; background: #f8f9fa; padding: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; }</style></head><body><h1>SONAR SENDEBERICHT / AUSGANGSNACHWEIS</h1><div class="box"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;"><div><span class="badge">STATUS: ERFOLGREICH VERSENDET</span></div><div><strong>Sendedatum:</strong> ${formatDatum(eintrag.datum)}</div></div><div class="meta-grid"><div class="meta-item"><strong>Absender / Mandant:</strong><br/>${eintrag.unsere_firma || '-'}</div><div class="meta-item"><strong>Empfänger / Behörde:</strong><br/>${eintrag.gegner_name || '-'}</div><div class="meta-item"><strong>Unser Zeichen:</strong><br/>${eintrag.unser_zeichen || '-'}</div><div class="meta-item"><strong>Aktenzeichen (Gegner):</strong><br/>${eintrag.aktenzeichen || '-'}</div><div class="meta-item"><strong>Versandart / Kanal:</strong><br/>${eintrag.kanal || 'E-Mail / Fax'}</div><div class="meta-item"><strong>Vorgang / Zieladresse:</strong><br/>${eintrag.aktion || '-'}</div><div class="meta-item" style="grid-column: 1 / -1;"><strong>Gegenstand (Thema):</strong><br/>${eintrag.thema || '-'}</div><div class="meta-item" style="grid-column: 1 / -1;"><strong>Übermittelte Dateianhänge:</strong><br/>${anhaengeText}</div></div></div><h3>DOKUMENTIERTES SCHREIBEN (TEXTINHALT):</h3><pre>${eintrag.brief_entwurf || '(Kein Textkörper hinterlegt)'}</pre><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`);
    printWindow.document.close();
  };

  const handleResendVersand = async (versandArt) => {
    if (!briefEntwurf || briefEntwurf.trim() === '') { showToast("Bitte gib zuerst einen Text im Schreibfenster ein!", 'warning'); return; }
    if (!gegnerEmail && versandArt === 'email') { showToast("Bitte trage zuerst eine E-Mail-Adresse der Gegenseite / Behörde ein!", 'warning'); return; }
    if (!gegnerFax && versandArt === 'fax') { showToast("Bitte trage zuerst eine Faxnummer der Gegenseite ein!", 'warning'); return; }

    setLaedt(true);
    try {
      const formattedFax = formatRufnummer(gegnerFax);
      const rawFax = formattedFax ? formattedFax.replace(/[^0-9+]/g, '') : '';
      const targetAddress = versandArt === 'email' ? gegnerEmail : `${rawFax}@simple-fax.de`; 
      const betreff = `Unser Zeichen: ${unserZeichen || 'Neu'} / AZ: ${aktenzeichen || 'Neu'} — ${thema || 'Schreiben'}`;
      const mandantProfil = mandanten.find(m => fuzzyMatch(m.firmenname, unsereFirma)) || null;

      const alleAnhangDateien = [...dateien, ...emailAnhaenge];

      let extraAttachments = [];
      if (alleAnhangDateien.length > 0) {
        showToast(versandArt === 'email' ? "Verarbeite Dateien für E-Mail-Anhang..." : "Verarbeite Dateien für Fax-Anhang...", "success");
        for (const f of alleAnhangDateien) {
          try {
            const b64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(f); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = e => reject(e); });
            extraAttachments.push({ filename: f.name, content: b64 });
          } catch (err) { console.error("Fehler beim Konvertieren der Datei", f.name, err); }
        }
      }

      const response = await fetch("https://loyzfkxkuyypgteskxkm.supabase.co/functions/v1/sonar-send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabase.supabaseKey}` },
        body: JSON.stringify({
          to: targetAddress,
          subject: betreff,
          text: briefEntwurf,
          signatureUrl: SIGNATUR_URL,
          unsereFirma: unsereFirma || 'Jens Wilsdorf',
          mandantProfil: mandantProfil,
          gegnerName: gegnerName,
          gegnerAnsprechpartner: faxZhd || gegnerAnsprechpartner,
          gegnerFax: rawFax,
          extraAttachments: extraAttachments.length > 0 ? extraAttachments : undefined
        })
      });

      const resData = await response.json();
      if (!response.ok) { throw new Error(resData.error || resData.message || JSON.stringify(resData)); }
      if (resData.pdfUrl) { setVersandPdfUrl(resData.pdfUrl); }
      
      const successAktion = `${versandArt === 'email' ? 'E-Mail' : 'E-Fax (Simple-Fax)'} versendet an ${targetAddress}`;
      const successKanal = versandArt === 'email' ? 'E-Mail (Resend)' : 'E-Fax (Simple-Fax via Resend)';
      
      setAktion(successAktion); setKanal(successKanal); setTyp('Ausgang');
      showToast(`${versandArt === 'email' ? 'E-Mail' : 'E-Fax'} erfolgreich versendet! Auto-Save wird ausgeführt...`, 'success');

      await speichereEintragLogik({ overridePdfUrl: resData.pdfUrl || null, overrideAktion: successAktion, overrideKanal: successKanal, overrideTyp: 'Ausgang' });
    } catch (e) { console.error("Versandfehler:", e); showToast("Rückmeldung von Resend: " + e.message, 'error'); setLaedt(false); }
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

    let alleUrls = [];
    const zuSpeicherndeDateien = [...dateien, ...emailAnhaenge];

    if (zuSpeicherndeDateien && zuSpeicherndeDateien.length > 0) {
      for (const f of zuSpeicherndeDateien) {
        const isMd = f.name.toLowerCase().endsWith('.md');
        const isPdf = f.name.toLowerCase().endsWith('.pdf');
        const zugewieseneFirma = unsereFirma || (tresorPrompt && tresorPrompt.typ === 'neu' ? tresorPrompt.obj.unsere_firma : 'Allgemein');

        if (isMd) {
           const fileInhalt = await f.text(); const baseInfo = `Upload via Akten-Cockpit. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}`; const finalDbText = `${baseInfo}\n\n${fileInhalt.substring(0, 3000)}...`;
           await supabase.from('wissensdatenbank').insert([{ datei_name: f.name, firma: zugewieseneFirma, inhalt_text: finalDbText, dokument_url: null }]);
           await syncToGithub(f.name, fileInhalt, null, null, showToast);
        } else {
           const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_'); const dateiName = `${Date.now()}_${sichererDateiname}`;
           const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f);
           if (!uploadError) {
             const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName); alleUrls.push(linkData.publicUrl);
             const hatMdGegenstueck = zuSpeicherndeDateien.some(d => d.name.toLowerCase() === f.name.toLowerCase().replace('.pdf', '.md'));
             if (isPdf && !hatMdGegenstueck) {
                showToast(`Lese digitalen Text aus PDF (${f.name}) aus...`, 'success');
                try {
                   const extrahierterText = await extractTextFromPDF(f);
                   if (extrahierterText.trim().length > 50) {
                      const baseInfo = `Auto-Extraktion (PDF). Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}`; const finalDbText = `${baseInfo}\n\n${extrahierterText.substring(0, 3000)}...`; const mdFileName = f.name.replace(/\.[^/.]+$/, "") + ".md";
                      await supabase.from('wissensdatenbank').insert([{ datei_name: mdFileName, firma: zugewieseneFirma, inhalt_text: finalDbText, dokument_url: linkData.publicUrl }]);
                      await syncToGithub(mdFileName, `${baseInfo}\n\nOriginal-PDF: ${linkData.publicUrl}\n\n${extrahierterText}`, linkData.publicUrl, null, showToast);
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
      await supabase.from('wissensdatenbank').insert([{ datei_name: `Ausgang_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.pdf`, firma: unsereFirma || 'Allgemein', inhalt_text: `Automatisch versendetes Dokument. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}\n\n\n${briefEntwurf}`, dokument_url: activeVersandPdfUrl }]);
      const ausgangName = `Ausgang_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;
      await syncToGithub(ausgangName, `Versendetes Dokument\nGegenstand: ${thema || 'Ohne Gegenstand'}\nGegner: ${gegnerName || 'Unbekannt'}\nLink: ${activeVersandPdfUrl}\n\nDokumententext:\n${briefEntwurf}`, activeVersandPdfUrl, null, showToast);
    } else if (briefEntwurf && briefEntwurf.trim() !== '') {
      const prefix = typ === 'Eingang' ? 'Eingang' : (typ === 'Ausgang' ? 'Ausgang' : 'Entwurf');
      const fileName = `${prefix}_${Date.now()}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;
      
      let fileContent = `${prefix}-Dokument\nGegenstand: ${thema || 'Ohne Gegenstand'}\nGegner: ${gegnerName || 'Unbekannt'}\n\nZusammenfassung / Text:\n${briefEntwurf}`;
      
      if (rawText) {
         fileContent += `\n\n--- ORIGINAL VOLLTEXT (OCR) ---\n${rawText}`;
      }
      
      await syncToGithub(fileName, fileContent, null, null, showToast);
    }

    const dokumentUrl = alleUrls.length > 0 ? alleUrls.join(',') : null;
    let aktuelleAkteId = selectedAkteId;

    if (modus === 'neu') {
      const { data: neueAkte, error: aktenError } = await supabase.from('akten').insert([{ user_id: session.user.id, unser_zeichen: unserZeichen || null, aktenzeichen: aktenzeichen || null, gegner_name: gegnerName || null, gegner_ansprechpartner: gegnerAnsprechpartner || null, gegner_telefon: gegnerTelefon || null, gegner_email: gegnerEmail || null, unsere_firma: unsereFirma || null, unser_ansprechpartner: unserAnsprechpartner || null, unser_telefon: unserTelefon || null, unser_email: unserEmail || null, thema: thema || null, status: 'Offen' }]).select();
      if (aktenError) { showToast("Fehler Akte: " + aktenError.message, 'error'); setLaedt(false); return; }
      aktuelleAkteId = neueAkte[0].id;
    } else {
      if (clearOldFristen && aktuelleAkteId) {
         await supabase.from('akten_historie').update({ frist_extern: null, wiedervorlage: null }).eq('akte_id', aktuelleAkteId);
      }
    }

    const activeAktion = autoSaveOverrides && autoSaveOverrides.overrideAktion !== undefined ? autoSaveOverrides.overrideAktion : aktion;
    const activeKanal = autoSaveOverrides && autoSaveOverrides.overrideKanal !== undefined ? autoSaveOverrides.overrideKanal : kanal;
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
      setAktion(''); setKanal(''); setFristExtern(''); setWiedervorlage(''); setDateien([]); setEmailAnhaenge([]); 
      setBriefEntwurf(''); setJsonImport(''); setRawText(''); setTresorPrompt(null); setGegnerPrompt(null); setFaxZhd(''); 
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
    if (aufgeklappteAkten.includes(id)) setAufgeklappteAkten(aufgeklappteAkten.filter(aId => aId !== id));
    else setAufgeklappteAkten([...aufgeklappteAkten, id]);
  };

  const loescheAkte = async (id) => {
    if(!window.confirm("Ganze Akte löschen?")) return; await supabase.from('akten').delete().eq('id', id); ladeDaten(); showToast('Akte komplett gelöscht.', 'success');
  };

  const mergeAkte = async (sourceId) => {
    if (!mergeTargetId) { showToast("Bitte wähle zuerst eine Ziel-Akte aus!", 'warning'); return; }
    if (sourceId === mergeTargetId) { showToast("Quell- und Ziel-Akte dürfen nicht identisch sein!", 'warning'); return; }
    
    if (!window.confirm("Möchtest du alle Inhalte (Historie & Dokumente) aus dieser Akte in die gewählte Ziel-Akte verschieben? Diese Akte bleibt danach als leere Hülle bestehen.")) return;
    
    const { error: moveErr } = await supabase.from('akten_historie').update({ akte_id: mergeTargetId }).eq('akte_id', sourceId);
    if (moveErr) { showToast("Fehler beim Verschieben der Inhalte: " + moveErr.message, 'error'); return; }

    const sourceAkte = akten.find(a => a.id === sourceId);
    await supabase.from('akten_historie').insert([{ akte_id: mergeTargetId, user_id: session.user.id, typ: 'Intern', datum: new Date().toISOString().split('T')[0], aktion: `Akte zusammengeführt: Inhalte aus "${sourceAkte.thema || 'Unbekannt'}" (${sourceAkte.unser_zeichen || 'Kein Zeichen'}) wurden integriert.` }]);
    
    setMergeSourceId(null); setMergeTargetId(''); ladeDaten(); 
    showToast("Akteninhalte erfolgreich übertragen!", 'success');
  };

  const handleTresorAuswahl = (e) => {
    const mId = e.target.value; if(!mId) return; const m = mandanten.find(x => x.id === mId);
    if(m) { setUnsereFirma(m.firmenname || ''); setUnserAnsprechpartner(m.ansprechpartner || ''); setUnserTelefon(formatRufnummer(m.telefon || '')); setUnserEmail(m.email || ''); }
  };

  const handleGegnerAuswahl = (e) => {
    const val = e.target.value; if(!val) return; const [gId, ansIdx] = val.split('|'); const g = gegnerListe.find(x => x.id === gId);
    if(g) {
      setGegnerName(g.name || ''); setGegnerFax(formatRufnummer(g.fax || ''));
      let ansprechpartnerObj = null;
      let ansList = [];
      try { const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen; if (Array.isArray(parsed)) ansList = parsed; } catch(e){}
      if (ansList.length > 0 && ansList[ansIdx]) ansprechpartnerObj = ansList[ansIdx];

      if (ansprechpartnerObj) { setGegnerAnsprechpartner(ansprechpartnerObj.name || g.ansprechpartner || ''); setFaxZhd(ansprechpartnerObj.name || g.ansprechpartner || ''); setGegnerTelefon(formatRufnummer(ansprechpartnerObj.telefon || g.telefon || '')); setGegnerEmail(ansprechpartnerObj.email || g.email || g.email_zentrale || ''); } else { setGegnerAnsprechpartner(g.ansprechpartner || ''); setFaxZhd(g.ansprechpartner || ''); setGegnerTelefon(formatRufnummer(g.telefon || '')); setGegnerEmail(g.email || g.email_zentrale || ''); }
    }
  };

  const handleAlarmKlick = (akteId) => {
    setFokussierteAkteId(akteId); if (!aufgeklappteAkten.includes(akteId)) { setAufgeklappteAkten(prev => [...prev, akteId]); }
    setTimeout(() => { const el = document.getElementById(`akte-karte-${akteId}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 150);
  };

  const parseAktenNummer = (zeichen) => {
    if (!zeichen) return null;
    const strZ = String(zeichen);
    const matchNew = strZ.match(/^(\d+)-/);
    if (matchNew) return parseInt(matchNew[1], 10);
    const matchOld = strZ.match(/-(\d+)$/);
    if (matchOld) return parseInt(matchOld[1], 10);
    return null;
  };

  const gefilterteAkten = akten.filter((akte) => {
    if (!zeigeErledigte && akte.status === 'Erledigt') return false; 
    if (!suchbegriff.trim()) return true;
    const s = suchbegriff.toLowerCase(); 
    const uZ = (akte.unser_zeichen || '').toLowerCase();
    const gName = (akte.gegner_name || '').toLowerCase(); 
    const gAns = (akte.gegner_ansprechpartner || '').toLowerCase(); 
    const az = (akte.aktenzeichen || '').toLowerCase(); 
    const uFirma = (akte.unsere_firma || '').toLowerCase(); 
    const th = (akte.thema || '').toLowerCase();
    const histMatch = akte.akten_historie?.some(h => (h.aktion || '').toLowerCase().includes(s) || (h.brief_entwurf || '').toLowerCase().includes(s));
    return uZ.includes(s) || gName.includes(s) || gAns.includes(s) || az.includes(s) || uFirma.includes(s) || th.includes(s) || histMatch;
  }).sort((a, b) => {
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
    const thema = akte.thema || 'Ohne Gegenstand';
    return `${uZ} ${gegner} | ${thema}`;
  };

  const alleAusgaenge = [];
  akten.forEach(a => {
    if (a.akten_historie && a.akten_historie.length > 0) {
      a.akten_historie.filter(h => h.typ === 'Ausgang').forEach(h => {
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

  const anzeigeAusgaenge = (modus === 'bestehend' && selectedAkteId) 
    ? alleAusgaenge.filter(a => a.akte_id === selectedAkteId) 
    : alleAusgaenge;

  const activeAkteObj = modus === 'bestehend' && selectedAkteId ? akten.find(a => a.id === selectedAkteId) : null;

  const handleJsonImportRef = useRef(handleJsonImport);
  useEffect(() => {
    handleJsonImportRef.current = handleJsonImport;
  }, [handleJsonImport]);

  // --- PHASE 1: WEB-SOCKET & LIFECYCLE RECONNECT ---
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
            showToast("🚀 Verpassten Auto-Import nachgeladen!", "success");
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
    document.addEventListener("visibilitychange", handleVisibilityChange);

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
            
            showToast("🚀 Auto-Import empfangen und eingefügt!", "success");
            await supabase.from('import_queue').delete().eq('id', newRecord.id);
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(queueSubscription);
    };
  }, [session?.user?.id]); 

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <style>{`
        /* HELPER KLASSEN FÜR STRIKTE TRENNUNG */
        .desktop-only {
          display: initial;
        }
        .mobile-only {
          display: none !important;
        }

        /* HISTORIEN TYP DROPDOWN */
        .hist-typ-select {
          background: transparent;
          color: ${theme.accent};
          border: 1px dashed transparent;
          border-bottom: 1px dashed ${theme.border};
          width: 100%;
          font-size: 13px;
          padding: 4px;
          font-weight: bold;
          outline: none;
          cursor: pointer;
          box-sizing: border-box;
          transition: all 0.2s ease;
          border-radius: 4px;
        }
        .hist-typ-select:hover, .hist-typ-select:focus {
          background: ${theme.accent} !important;
          color: ${btnTextColor} !important;
          border: 1px solid ${theme.accent} !important;
        }
        .hist-typ-select option {
          background: ${theme.cardBg};
          color: ${theme.textMain};
        }

        /* VERSANDHISTORIE DESKTOP */
        .vh-desktop-header {
          display: grid;
          grid-template-columns: 80px 2.5fr 2.5fr 190px 190px 30px;
          gap: 15px;
          padding: 15px 20px;
          font-weight: bold;
          font-size: 11px;
          text-transform: uppercase;
          align-items: center;
        }
        .vh-row-grid {
          display: grid;
          grid-template-columns: 80px 2.5fr 2.5fr 190px 190px 30px;
          gap: 15px;
          padding: 15px 20px;
          align-items: start;
          cursor: pointer;
        }
        .vh-expanded-grid {
          display: grid;
          grid-template-columns: 80px 2.5fr 2.5fr 190px 190px 30px;
          gap: 15px;
          align-items: center;
        }

        /* AKTEN-ÜBERSICHT DESKTOP */
        .akten-desktop-header {
          display: flex;
          align-items: center;
          padding: 15px 20px;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
        }
        .akten-desktop-grid {
          display: grid;
          grid-template-columns: 1.2fr 2fr 2fr 1.5fr 1.5fr;
          gap: 15px;
          align-items: center;
        }
        .akten-row-wrapper {
          display: flex;
          align-items: center;
          padding: 15px 20px;
          cursor: pointer;
          flex-wrap: nowrap;
          gap: 10px;
        }
        .akten-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 18px;
          border-radius: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }

        /* HISTORIEN-TABELLE DESKTOP */
        .hist-desktop-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
          font-size: 13px;
        }
        .hist-desktop-table thead {
          display: table-header-group;
        }
        .hist-desktop-table tbody tr {
          display: table-row;
        }
        .hist-desktop-table tbody td {
          display: table-cell;
        }

        /* MOBILER CARD-MODUS */
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: flex !important;
          }

          .vh-desktop-header {
            display: none !important;
          }
          .vh-row-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            padding: 15px !important;
          }
          .vh-col-full {
            width: 100% !important;
          }
          .vh-expanded-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          .vh-expanded-grid > div {
            width: 100% !important;
          }

          .akten-desktop-header {
            display: none !important;
          }
          .akten-row-wrapper {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 15px !important;
            gap: 10px !important;
          }
          .akten-mobile-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
          .akten-desktop-grid {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .akten-field-box {
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
            width: 100% !important;
          }
          .akten-actions-bar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .akten-actions-bar button {
            width: 100% !important;
            justify-content: center !important;
            min-height: 40px !important;
          }

          .hist-desktop-table {
            min-width: 100% !important;
            display: block !important;
          }
          .hist-desktop-table thead {
            display: none !important;
          }
          .hist-desktop-table tbody {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
            width: 100% !important;
          }
          .hist-desktop-table tbody tr {
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            padding: 14px !important;
            border: 1px solid ${theme.border} !important;
            border-radius: 8px !important;
            background: ${theme.cardBg} !important;
            box-sizing: border-box !important;
            width: 100% !important;
          }
          .hist-desktop-table tbody td {
            display: block !important;
            padding: 0 !important;
            width: 100% !important;
          }
          .hist-desktop-table tbody td.desktop-only {
            display: none !important;
          }
          .akten-field-box.desktop-only {
            display: none !important;
          }
          .hist-mobile-header-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 10px !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* --- TRIAGE MODAL WEICHE --- */}
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

      {showVersandHistorie && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', maxWidth: '1200px', width: '100%', maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: `1px solid ${theme.border}`, background: theme.inputBg }}>
              <h3 style={{ margin: 0, color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px' }}>
                <Icon name="send" size={18} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {modus === 'bestehend' && selectedAkteId ? `Versandhistorie [${activeAkteObj?.unser_zeichen || 'Unbekannt'}]` : 'Globale Versandhistorie'} ({anzeigeAusgaenge.length})
                </span>
              </h3>
              <button onClick={() => setShowVersandHistorie(false)} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', padding: '4px 8px' }}>✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', padding: '15px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', width: '100%' }}>
                
                {/* DESKTOP HEADER */}
                <div className="vh-desktop-header" style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '8px', color: theme.textMuted }}>
                  <div>Datum</div>
                  <div>Vorgang & Akte</div>
                  <div>Gegner & Kontakt</div>
                  <div style={{textAlign: 'center'}}>Versandart</div>
                  <div>Anhänge</div>
                  <div></div>
                </div>

                {anzeigeAusgaenge.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted, background: theme.inputBg, borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                    Bislang wurden noch keine Schreiben für diese Auswahl versendet.
                  </div>
                ) : (
                  anzeigeAusgaenge.map((ausgang) => {
                    const isExpanded = expandedVersandId === ausgang.id;
                    const rawAction = ausgang.aktion || '';
                    const zielKontakt = rawAction.includes('versendet an ') ? rawAction.split('versendet an ')[1] : '';

                    return (
                      <div key={ausgang.id} style={{ border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden', background: isExpanded ? (isDarkMode ? 'rgba(0, 229, 255, 0.05)' : '#f0f9ff') : theme.inputBg }}>
                        <div 
                          className="vh-row-grid"
                          onClick={() => setExpandedVersandId(isExpanded ? null : ausgang.id)}
                        >
                          {/* MOBILER KOPF (DATUM, ZEICHEN & PFEIL) */}
                          <div className="mobile-only" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain }}>
                              {formatDatum(ausgang.datum)}
                            </span>
                            <strong 
                              onClick={(e) => { e.stopPropagation(); springeZuAkteAusgang(ausgang.akte_id, ausgang.id); }} 
                              style={{ color: theme.accent, fontSize: '13px', cursor: 'pointer' }}
                              title="Klicken, um diesen Vorgang direkt in der Akte anzuzeigen"
                            >
                              [{ausgang.unser_zeichen || '---'}]
                            </strong>
                            <span style={{ color: theme.textMuted }}>
                              <Icon name={isExpanded ? 'down' : 'right'} size={18} />
                            </span>
                          </div>

                          {/* SPALTE 1 DESKTOP: REINES DATUM */}
                          <div className="desktop-only" style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain, paddingTop: '6px' }}>
                            {formatDatum(ausgang.datum)}
                          </div>

                          {/* SPALTE 2: VORGANG & AKTE (DESKTOP) / VORGANG DETAILS (MOBIL) */}
                          <div className="vh-col-full" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <strong 
                              className="desktop-only"
                              onClick={(e) => { e.stopPropagation(); springeZuAkteAusgang(ausgang.akte_id, ausgang.id); }} 
                              style={{ color: theme.accent, fontSize: '13px', cursor: 'pointer', width: 'fit-content' }}
                              title="Klicken, um diesen Vorgang direkt in der Akte anzuzeigen"
                            >
                              [{ausgang.unser_zeichen || '---'}]
                            </strong>
                            {ausgang.aktenzeichen && (
                              <span style={{ fontSize: '12px', color: theme.textMain, fontWeight: 'bold' }}>
                                {ausgang.aktenzeichen}
                              </span>
                            )}
                            <span style={{ fontSize: '13px', color: theme.textMain }}>
                              {ausgang.thema || '-'}
                            </span>
                          </div>

                          {/* SPALTE 3: GEGNER & KONTAKT */}
                          <div className="vh-col-full" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <strong style={{ color: theme.textMain, fontSize: '13px' }}>{ausgang.gegner_name || '-'}</strong>
                            <span style={{ fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon name="user" size={10} /> {ausgang.gegner_ansprechpartner || 'Zentrale / Allgemein'}
                            </span>
                            {zielKontakt && (
                              <span style={{ fontSize: '11px', color: theme.accent, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Icon name={zielKontakt.includes('@') ? 'mail' : 'phone'} size={10} /> {zielKontakt}
                              </span>
                            )}
                          </div>

                          {/* SPALTE 4: VERSANDART */}
                          <div className="vh-col-full">
                            <div style={{ background: 'transparent', border: `1px solid ${theme.accent}`, color: theme.accent, padding: '6px 8px', minHeight: '34px', boxSizing: 'border-box', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', width: '100%', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ausgang.kanal || 'Ausgang'}>
                              <Icon name={ausgang.kanal?.toLowerCase().includes('mail') ? 'mail' : 'phone'} size={12} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ausgang.kanal || 'Ausgang'}</span>
                            </div>
                          </div>

                          {/* SPALTE 5: ANHÄNGE */}
                          <div className="vh-col-full" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {ausgang.dokument_url ? ausgang.dokument_url.split(',').map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', minHeight: '34px', boxSizing: 'border-box', fontSize: '11px', color: theme.accent, background: 'transparent', border: `1px solid ${theme.accent}`, borderRadius: '4px', textDecoration: 'none', width: '100%', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={extractFilename(url)} onClick={(e) => e.stopPropagation()}>
                                <Icon name="file" size={12} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{extractFilename(url)}</span>
                              </a>
                            )) : <span style={{ fontSize: '12px', color: theme.textMuted }}>Keine Anhänge</span>}
                          </div>

                          {/* SPALTE 6: DESKTOP CHEVRON */}
                          <div className="desktop-only" style={{ color: theme.textMuted, textAlign: 'right', paddingTop: '6px' }}>
                            <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                          </div>
                        </div>

                        {/* EXPANDED CONTENT */}
                        {isExpanded && (
                          <div style={{ padding: '0 20px 15px 20px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                            <div className="vh-expanded-grid" style={{ borderTop: `1px dashed ${theme.border}`, paddingTop: '12px' }}>
                              <div style={{ gridColumn: '1 / 4', fontSize: '12px', color: theme.textMuted }}>
                                Klicke auf Sendebericht, um einen Druckbeleg zu erzeugen, oder springe direkt zum Vorgang in der Akte.
                              </div>
                              <div>
                                <button onClick={() => druckeSendebericht(ausgang)} style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '8px 10px', minHeight: '38px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxSizing: 'border-box' }}>
                                  <Icon name="print" size={13} /> Sendebericht drucken
                                </button>
                              </div>
                              <div>
                                <button onClick={() => springeZuAkteAusgang(ausgang.akte_id, ausgang.id)} style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '8px 10px', minHeight: '38px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxSizing: 'border-box' }}>
                                  <Icon name="folder" size={13} /> Vorgang in Akte öffnen
                                </button>
                              </div>
                              <div className="desktop-only"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${theme.border}`, background: theme.inputBg, textAlign: 'right' }}>
              <button onClick={() => setShowVersandHistorie(false)} style={{ padding: '8px 16px', background: theme.border, color: theme.textMain, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', width: '100%' }}>
        <div style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px dashed ${theme.accent}`, transition: 'border-color 0.3s ease' }}>
          <label style={{...labelStyle, color: theme.accent, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.3s ease'}}><Icon name="folder" size={18} /> MAGIC IMPORT (JSON AUS SONAR MEGA-LEGAL)</label>
          <textarea id="magic-import" value={jsonImport} onChange={handleJsonImport} placeholder='{"typ": "Eingang", "unser_zeichen": "0001-SBS-Finanzamt", "thema": "..."}' style={{ ...inputStyle, background: 'rgba(0,0,0,0.1)', border: `1px solid ${theme.accent}`, color: theme.textMain, height: '100px', fontFamily: 'monospace', fontSize: '14px', marginTop: '5px', transition: 'border-color 0.3s ease' }} />
        </div>

        <div style={{ ...panelStyle, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${theme.border}` }}>
          <label style={{...labelStyle, color: theme.accent, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', transition: 'color 0.3s ease'}}><Icon name="file" size={16} /> MANUELLER UPLOAD (PDF/MD)</label>
          <input id="datei-upload-manuell" type="file" multiple onChange={(e) => { setDateien(Array.from(e.target.files)); }} style={{...inputStyle, border: `1px dashed ${theme.accent}`, cursor: 'pointer', padding: '10px', fontSize: '13px', transition: 'border-color 0.3s ease'}} />
          {dateien.length > 0 && <span style={{fontSize: '13px', color: theme.accent, marginTop: '8px', fontWeight: 'bold'}}><Icon name="folder" size={12} /> {dateien.length} Datei(en) gewählt</span>}
        </div>
      </div>

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
      />

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
        handleFristChange={handleFristChange}
        wiedervorlage={wiedervorlage}
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
        // --- HIER WURDEN DIE FEHLENDEN PROPS EINGEFÜGT ---
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
        // --------------------------------------------------
      />

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

      <MegaLegalModal
        isOpen={isWarRoomOpen}
        onClose={() => setIsWarRoomOpen(false)}
        dossier={activeWarRoomDossier}
        onApplySchriftsatz={(ausgangsJson) => {
          
          if (activeWarRoomDossier && activeWarRoomDossier.akte_id) {
             setModus('bestehend');
             setSelectedAkteId(activeWarRoomDossier.akte_id);
          }

          if (ausgangsJson.brief_entwurf) setBriefEntwurf(ausgangsJson.brief_entwurf);
          
          const isInvalid = (val) => !val || val.toLowerCase().includes('erforderlich') || val.toLowerCase().includes('bescheid') || val.toLowerCase().includes('unbekannt');
          
          if (ausgangsJson.thema && !isInvalid(ausgangsJson.thema) && !thema) setThema(ausgangsJson.thema);
          if (ausgangsJson.aktenzeichen && !isInvalid(ausgangsJson.aktenzeichen) && !aktenzeichen) setAktenzeichen(ausgangsJson.aktenzeichen);
          
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
          
          setTyp('Ausgang');
          
          if (ausgangsJson.aktion) setAktion(ausgangsJson.aktion);
          if (ausgangsJson.frist_extern) handleFristChange(ausgangsJson.frist_extern);
          
          showToast("Schriftsatz übernommen! Akten-Kontext geschützt.", "success");
        }}
      />

    </div>
  );
}