import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub, extractFilename, normalizeName, cleanVal } from './utils';

// --- PDF.js Import für die clientseitige Extraktion ---
import * as pdfjsLib from 'pdfjs-dist';
// Verhindert Fehler im Build-Prozess und nutzt den CDN-Worker
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
  const [thema, setThema] = useState(''); // Entspricht in der UI nun dem "Gegenstand"
  
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
  const [emailAnhaenge, setEmailAnhaenge] = useState([]); // Dezidierte E-Mail-Anhänge direkt im Textentwurf
  const [versandPdfUrl, setVersandPdfUrl] = useState('');
  const [tresorPrompt, setTresorPrompt] = useState(null); 
  
  const [gegnerPrompt, setGegnerPrompt] = useState(null);
  const [faxZhd, setFaxZhd] = useState('');

  const [showUploadReminder, setShowUploadReminder] = useState(false);
  const [showVersandHistorie, setShowVersandHistorie] = useState(false); // Modal Versandhistorie
  const [zeigeErledigte, setZeigeErledigte] = useState(false); // Filter für Erledigte Akten
  
  const [aufgeklappteAkten, setAufgeklappteAkten] = useState([]);
  const [transferAkteId, setTransferAkteId] = useState(null);
  const [neuerGegnerName, setNeuerGegnerName] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [uploadingHistId, setUploadingHistId] = useState(null);
  const [fokussierteAkteId, setFokussierteAkteId] = useState(null);
  
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isAlarmsOpen, setIsAlarmsOpen] = useState(true);

  const autoGenRef = useRef(''); // Speichert das zuletzt generierte Unser Zeichen

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const h4StyleAkten = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word' };
  const quickBtnStyle = { background: theme.border, color: theme.textMain, border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };
  const inlineInputStyle = { background: 'transparent', border: '1px dashed transparent', color: theme.textMain, width: '100%', fontSize: '13px', padding: '4px', outline: 'none', cursor: 'text', borderBottom: `1px dashed ${theme.border}` };

  const isDarkMode = theme.bg === '#020617';
  const formatDatum = (datum) => datum ? new Date(datum).toLocaleDateString('de-DE') : '-';

  // --- STRIKTER RUFNUMMERN FORMATTER ---
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

  useEffect(() => {
    if (globalUrlText) {
      setBriefEntwurf(globalUrlText);
      setGlobalUrlText(null); 
    }
  }, [globalUrlText, setGlobalUrlText]);

  // --- AUTOMATIK: UNSER ZEICHEN GENERIEREN ---
  const generatePrefix = (name) => {
    if (!name) return '';
    const n = name.toLowerCase();
    // Rückgabe in strikten Kleinbuchstaben
    if (n.includes('jens wilsdorf')) return 'jw';
    if (n.includes('smartbizz') || n.includes('sbs')) return 'sbs';
    if (n.includes('brand & market') || n.includes('bam')) return 'bam';
    if (n.includes('wilsdorf & sommer') || n.includes('wus')) return 'wus';
    if (n.includes('wir')) return 'wir';
    return name.split(/[\s-]+/).filter(w => w.length > 0).slice(0, 3).map(w => w[0]).join('').toLowerCase();
  };

  useEffect(() => {
    if (modus === 'neu' && unsereFirma && gegnerName) {
      const mPrefix = generatePrefix(unsereFirma);
      // Gegner-Name ebenfalls in strikten Kleinbuchstaben
      const gPrefix = gegnerName.trim().toLowerCase();
      const baseZeichen = `${mPrefix}-${gPrefix}-`;

      let maxNum = 0;
      akten.forEach(a => {
        if (a.unser_zeichen && a.unser_zeichen.toLowerCase().startsWith(baseZeichen)) {
          const parts = a.unser_zeichen.split('-');
          const lastPart = parts[parts.length - 1];
          const num = parseInt(lastPart, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });

      // 4-stellige Nummer (0012, 0013...)
      const nextNum = String(maxNum + 1).padStart(4, '0');
      const newZeichen = `${mPrefix}-${gPrefix}-${nextNum}`;
      
      setUnserZeichen(prev => {
        // Überschreibe nur, wenn das Feld leer ist ODER der User den letzten generierten Wert nicht verändert hat
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
             const crmGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(a.gegner_name));
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
      const crmGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(akte.gegner_name));
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
    showToast("✅ Akte geladen & Follow-Up Vorlage eingefügt!", "success");
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
           const existingGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(item.gegner_name));
           if (!existingGegner) {
              await supabase.from('gegner').insert([{ user_id: session.user.id, name: item.gegner_name, fax: formatRufnummer(item.fax), email: item.email || null, notizen: JSON.stringify([{ abteilung: item.abteilung || '', name: item.ansprechpartner || '', telefon: formatRufnummer(item.telefon), email: item.email || '' }]) }]);
              addedCount++;
           } else {
              let updates = {}; let needsUpdate = false;
              if (!existingGegner.fax && item.fax) { updates.fax = formatRufnummer(item.fax); needsUpdate = true; }
              if (!existingGegner.email && item.email) { updates.email = item.email; needsUpdate = true; }
              let currentContacts = [];
              try { currentContacts = typeof existingGegner.notizen === 'string' ? JSON.parse(existingGegner.notizen) : (existingGegner.notizen || []); if (!Array.isArray(currentContacts)) currentContacts = []; } catch(e) { currentContacts = []; }
              if (item.ansprechpartner || item.abteilung) {
                 const contactExists = currentContacts.some(c => (c.name || '').toLowerCase() === (item.ansprechpartner || '').toLowerCase() && (c.abteilung || '').toLowerCase() === (item.abteilung || '').toLowerCase());
                 if (!contactExists) { currentContacts.push({ abteilung: item.abteilung || '', name: item.ansprechpartner || '', telefon: formatRufnummer(item.telefon), email: item.email || '' }); updates.notizen = JSON.stringify(currentContacts); needsUpdate = true; }
              }
              if (needsUpdate) { await supabase.from('gegner').update(updates).eq('id', existingGegner.id); updatedCount++; }
           }
        }
        await ladeDaten(); setJsonImport(''); setLaedt(false);
        showToast(`✅ KI-Gegner-Scan abgeschlossen!\n\n${addedCount} neue Behörden/Gegner angelegt.\n${updatedCount} bestehende aktualisiert.`, 'success');
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
      const fallbackAktion = obj.aktion || obj.status || '';
      const fallbackKanal = obj.kanal || obj.versandweg || 'Post / Fax / E-Mail';
      const fallbackTyp = obj.typ || obj.dokumententyp || 'Eingang';
      const fallbackUnsereFirma = obj.unsere_firma || (obj.absender ? obj.absender.name : '') || '';
      
      // Auto-Gen übernimmt die Generierung, falls unser_zeichen nicht per JSON forciert wurde
      if (fallbackUnserZeichen) {
          setUnserZeichen(fallbackUnserZeichen);
      }
      setAktenzeichen(fallbackAktenzeichen); setThema(fallbackThema); 
      setGegnerName(fallbackGegnerName); setGegnerAnsprechpartner(fallbackGegnerAnsprechpartner); 
      setGegnerTelefon(formatRufnummer(fallbackGegnerTelefon)); setGegnerFax(formatRufnummer(fallbackGegnerFax)); setGegnerEmail(fallbackGegnerEmail); 
      handleFristChange(fallbackFristExtern); setBriefEntwurf(fallbackBriefEntwurf); setAktion(fallbackAktion); 
      setKanal(fallbackKanal); setTyp(fallbackTyp);
      setDatum(new Date().toISOString().split('T')[0]);
      
      setFaxZhd(fallbackGegnerAnsprechpartner);

      if (fallbackGegnerName) {
        const existingGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(fallbackGegnerName));
        if (!existingGegner) {
           setGegnerPrompt({
             typ: 'neu',
             obj: { name: fallbackGegnerName, ansprechpartner: fallbackGegnerAnsprechpartner, telefon: formatRufnummer(fallbackGegnerTelefon), fax: formatRufnummer(fallbackGegnerFax), email: fallbackGegnerEmail }
           });
        } else {
           let gUpdates = {};
           let needsUpdate = false;

           if (!existingGegner.fax && fallbackGegnerFax) { gUpdates.fax = formatRufnummer(fallbackGegnerFax); needsUpdate = true; }
           if (!existingGegner.email && fallbackGegnerEmail) { gUpdates.email = fallbackGegnerEmail; needsUpdate = true; }

           let currentContacts = [];
           try { currentContacts = typeof existingGegner.notizen === 'string' ? JSON.parse(existingGegner.notizen) : (existingGegner.notizen || []); } catch(e) { currentContacts = []; }
           if (!Array.isArray(currentContacts)) currentContacts = [];

           if (fallbackGegnerAnsprechpartner) {
               const contactExists = currentContacts.some(c => (c.name || '').toLowerCase() === fallbackGegnerAnsprechpartner.toLowerCase());
               if (!contactExists) {
                   currentContacts.push({
                       abteilung: '',
                       name: fallbackGegnerAnsprechpartner,
                       telefon: formatRufnummer(fallbackGegnerTelefon) || existingGegner.telefon || '',
                       email: fallbackGegnerEmail || existingGegner.email || existingGegner.email_zentrale || ''
                   });
                   gUpdates.notizen = JSON.stringify(currentContacts);
                   needsUpdate = true;
               }
           }

           if (needsUpdate) {
               supabase.from('gegner').update(gUpdates).eq('id', existingGegner.id).then(() => ladeDaten());
           }
           setGegnerPrompt(null);
        }
      }

      if (fallbackUnserZeichen) {
        let match = akten.find(a => a.unser_zeichen === fallbackUnserZeichen);
        if (match) {
          setModus('bestehend'); setSelectedAkteId(match.id);
        } else {
          setModus('neu');
        }
      } else if (fallbackAktenzeichen) {
        let match = akten.find(a => a.aktenzeichen === fallbackAktenzeichen);
        if (match) {
          setModus('bestehend'); setSelectedAkteId(match.id);
        } else {
          setModus('neu');
        }
      } else {
        setModus('neu');
      }

      if (fallbackUnsereFirma) {
        const existingMandant = mandanten.find(m => normalizeName(m.firmenname) === normalizeName(fallbackUnsereFirma));
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
           setUnsereFirma(existingMandant.firmenname); setUnserAnsprechpartner(parsedAnsprechpartner || cleanVal(existingMandant.ansprechpartner) || '');
           setUnserTelefon(parsedTelefon || cleanVal(existingMandant.telefon) || ''); setUnserEmail(parsedEmail || cleanVal(existingMandant.email) || '');

           let updates = {}; let needsUpdate = false;
           if (!existingMandant.telefon && parsedTelefon) { updates.telefon = parsedTelefon; needsUpdate = true; }
           if (!existingMandant.email && parsedEmail) { updates.email = parsedEmail; needsUpdate = true; }

           if (needsUpdate) {
              supabase.from('mandanten').update(updates).eq('id', existingMandant.id).then(() => ladeDaten());
           }
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
      if (!error && data) { showToast(`✅ Mandant "${tresorPrompt.obj.unsere_firma}" im Tresor angelegt!`, 'success'); ladeDaten(); }
    }
    setTresorPrompt(null);
  };

  const handleGegnerPromptAccept = async () => {
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
      showToast(`✅ Behörde/Gegner "${gegnerPrompt.obj.name}" ins CRM aufgenommen!`, 'success');
    }
    ladeDaten();
    setGegnerPrompt(null);
  };

  const handleInlineEdit = async (histId, feld, wert) => {
    let updates = { [feld]: wert || null };
    
    if (feld === 'frist_extern' && wert) updates.wiedervorlage = null;
    if (feld === 'wiedervorlage' && wert) updates.frist_extern = null;

    const { error } = await supabase.from('akten_historie').update(updates).eq('id', histId);
    if (!error) { 
      ladeDaten(); 
    } else { 
      showToast("Fehler beim Speichern: " + error.message, 'error'); 
    }
  };

  const handleAkteStammdatenEdit = async (akteId, feld, wert) => {
    const { error } = await supabase.from('akten').update({ [feld]: wert || null }).eq('id', akteId);
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

  const toggleAkteStatus = async (akteId, currentStatus) => {
    const neuerStatus = currentStatus === 'Erledigt' ? 'Offen' : 'Erledigt';
    const { error } = await supabase.from('akten').update({ status: neuerStatus }).eq('id', akteId);
    if (!error) {
      if (neuerStatus === 'Erledigt') {
        const d = new Date(); d.setFullYear(d.getFullYear() + 10); const wvDatum = d.toISOString().split('T')[0];
        await supabase.from('akten_historie').insert([{ akte_id: akteId, user_id: session.user.id, typ: 'Intern', datum: new Date().toISOString().split('T')[0], aktion: 'Akte geschlossen. Automatische Wiedervorlage zur Löschung (Ablauf Aufbewahrungsfrist).', wiedervorlage: wvDatum }]);
      }
      ladeDaten(); showToast(`Akte wurde ${neuerStatus === 'Erledigt' ? 'geschlossen' : 'wieder geöffnet'}.`, 'success');
    } else { showToast("Fehler beim Ändern des Akten-Status: " + error.message, 'error'); }
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

  // --- SENDEBERICHT DRUCKEN (FÜR VERSANDHISTORIE) ---
  const druckeSendebericht = (eintrag) => {
    const printWindow = window.open('', '_blank');
    const anhaengeText = eintrag.dokument_url ? eintrag.dokument_url.split(',').map(url => extractFilename(url)).join(', ') : 'Keine Anhänge';
    printWindow.document.write(`<html><head><title>Sendebericht - ${eintrag.unser_zeichen || 'Ausgang'}</title><style>body { font-family: Arial, sans-serif; padding: 30px; color: #111; line-height: 1.6; } .box { border: 2px solid #000; padding: 20px; border-radius: 6px; margin-bottom: 20px; } h1 { font-size: 22px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px; text-transform: uppercase; } .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px; margin-bottom: 20px; } .meta-item { border-bottom: 1px solid #ddd; padding-bottom: 5px; } .badge { display: inline-block; background: #10b981; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; } pre { white-space: pre-wrap; font-family: Courier, monospace; background: #f8f9fa; padding: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; }</style></head><body><h1>SONAR SENDEBERICHT / AUSGANGSNACHWEIS</h1><div class="box"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;"><div><span class="badge">STATUS: ERFOLGREICH VERSENDET</span></div><div><strong>Sendedatum:</strong> ${formatDatum(eintrag.datum)}</div></div><div class="meta-grid"><div class="meta-item"><strong>Absender / Mandant:</strong><br/>${eintrag.unsere_firma || '-'}</div><div class="meta-item"><strong>Empfänger / Behörde:</strong><br/>${eintrag.gegner_name || '-'}</div><div class="meta-item"><strong>Unser Zeichen:</strong><br/>${eintrag.unser_zeichen || '-'}</div><div class="meta-item"><strong>Aktenzeichen (Gegner):</strong><br/>${eintrag.aktenzeichen || '-'}</div><div class="meta-item"><strong>Versandart / Kanal:</strong><br/>${eintrag.kanal || 'E-Mail / Fax'}</div><div class="meta-item"><strong>Vorgang / Zieladresse:</strong><br/>${eintrag.aktion || '-'}</div><div class="meta-item" style="grid-column: 1 / -1;"><strong>Gegenstand (Thema):</strong><br/>${eintrag.thema || '-'}</div><div class="meta-item" style="grid-column: 1 / -1;"><strong>Übermittelte Dateianhänge:</strong><br/>${anhaengeText}</div></div></div><h3>DOKUMENTIERTES SCHREIBEN (TEXTINHALT):</h3><pre>${eintrag.brief_entwurf || '(Kein Textkörper hinterlegt)'}</pre><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`);
    printWindow.document.close();
  };

  const handleResendVersand = async (versandArt) => {
    if (!briefEntwurf || briefEntwurf.trim() === '') { showToast("⚠️ Bitte gib zuerst einen Text im Schreibfenster ein!", 'warning'); return; }
    if (!gegnerEmail && versandArt === 'email') { showToast("⚠️ Bitte trage zuerst eine E-Mail-Adresse der Gegenseite / Behörde ein!", 'warning'); return; }
    if (!gegnerFax && versandArt === 'fax') { showToast("⚠️ Bitte trage zuerst eine Faxnummer der Gegenseite ein!", 'warning'); return; }

    setLaedt(true);
    try {
      const formattedFax = formatRufnummer(gegnerFax);
      // Entferne alle Zeichen die nicht Zahl ODER '+' sind (um das Länderkennzeichen zu behalten)
      const rawFax = formattedFax ? formattedFax.replace(/[^0-9+]/g, '') : '';
      const targetAddress = versandArt === 'email' ? gegnerEmail : `${rawFax}@simple-fax.de`; 
      const betreff = `Unser Zeichen: ${unserZeichen || 'Neu'} / AZ: ${aktenzeichen || 'Neu'} — ${thema || 'Schreiben'}`;
      const mandantProfil = mandanten.find(m => normalizeName(m.firmenname) === normalizeName(unsereFirma)) || null;

      // Kombiniere bestehende Akten-Dateien mit dezidierten E-Mail-Anhängen aus dem Schreibfenster
      const alleAnhangDateien = [...dateien, ...emailAnhaenge];

      let extraAttachments = [];
      if (versandArt === 'email' && alleAnhangDateien.length > 0) {
        showToast("⏳ Verarbeite Dateien für E-Mail-Anhang...", "success");
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
      showToast(`✅ ${versandArt === 'email' ? 'E-Mail' : 'E-Fax'} erfolgreich versendet! Auto-Save wird ausgeführt...`, 'success');

      await speichereEintragLogik({ overridePdfUrl: resData.pdfUrl || null, overrideAktion: successAktion, overrideKanal: successKanal, overrideTyp: 'Ausgang' });
    } catch (e) { console.error("Versandfehler:", e); showToast("❌ Rückmeldung von Resend: " + e.message, 'error'); setLaedt(false); }
  };

  const handleSpeichernCheck = (e) => {
    e.preventDefault();
    if (dateien.length === 0 && emailAnhaenge.length === 0) { setShowUploadReminder(true); } else { speichereEintragLogik(); }
  };

  const speichereEintragLogik = async (autoSaveOverrides = null) => {
    setShowUploadReminder(false);
    setLaedt(true);

    if (tresorPrompt && tresorPrompt.typ === 'neu') {
      const { data: mData } = await supabase.from('mandanten').insert([{
        user_id: session.user.id, firmenname: tresorPrompt.obj.unsere_firma, ansprechpartner: cleanVal(tresorPrompt.obj.unser_ansprechpartner) || '',
        telefon: formatRufnummer(cleanVal(tresorPrompt.obj.unser_telefon) || ''), email: cleanVal(tresorPrompt.obj.unser_email) || '', adresse: cleanVal(tresorPrompt.obj.unsere_adresse) || '',
        steuernummer: cleanVal(tresorPrompt.obj.unsere_steuernummer) || '', ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || '', betriebsnummer: cleanVal(tresorPrompt.obj.unsere_betriebsnummer) || '',
        vbg_nummer: cleanVal(tresorPrompt.obj.unsere_vbg_nummer) || '', handelsregister: cleanVal(tresorPrompt.obj.unsere_handelsregister) || '', iban: cleanVal(tresorPrompt.obj.unsere_iban) || ''
      }]).select();
      if (mData) ladeDaten();
    }
    
    if (gegnerPrompt && gegnerPrompt.typ === 'neu') {
      await supabase.from('gegner').insert([{
        user_id: session.user.id, name: gegnerPrompt.obj.name, fax: formatRufnummer(gegnerPrompt.obj.fax) || null, email: gegnerPrompt.obj.email || null,
        notizen: JSON.stringify([{ abteilung: '', name: gegnerPrompt.obj.ansprechpartner || '', telefon: formatRufnummer(gegnerPrompt.obj.telefon) || '', email: gegnerPrompt.obj.email || '' }])
      }]);
    }

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
                showToast(`⚙️ Lese digitalen Text aus PDF (${f.name}) aus...`, 'success');
                try {
                   const extrahierterText = await extractTextFromPDF(f);
                   if (extrahierterText.trim().length > 50) {
                      const baseInfo = `Auto-Extraktion (PDF). Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}`; const finalDbText = `${baseInfo}\n\n${extrahierterText.substring(0, 3000)}...`; const mdFileName = f.name.replace(/\.[^/.]+$/, "") + ".md";
                      await supabase.from('wissensdatenbank').insert([{ datei_name: mdFileName, firma: zugewieseneFirma, inhalt_text: finalDbText, dokument_url: linkData.publicUrl }]);
                      await syncToGithub(mdFileName, `${baseInfo}\n\nOriginal-PDF: ${linkData.publicUrl}\n\n${extrahierterText}`, linkData.publicUrl, null, showToast);
                      showToast(`✅ Text aus PDF extrahiert und archiviert!`, 'success');
                   } else { showToast(`⚠️ PDF "${f.name}" enthält keinen lesbaren Text (vermutlich ein Bild-Scan). Nur als PDF abgelegt.`, 'warning'); }
                } catch (err) { console.error("Fehler bei PDF-Extraktion:", err); showToast(`❌ Fehler beim Auslesen der PDF: ${err.message}`, 'error'); }
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
      const entwurfName = `Entwurf_${Date.now()}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;
      await syncToGithub(entwurfName, `Text-Entwurf\nGegenstand: ${thema || 'Ohne Gegenstand'}\nGegner: ${gegnerName || 'Unbekannt'}\n\nDokumententext:\n${briefEntwurf}`, null, null, showToast);
    }

    const dokumentUrl = alleUrls.length > 0 ? alleUrls.join(',') : null;
    let aktuelleAkteId = selectedAkteId

    if (modus === 'neu') {
      const { data: neueAkte, error: aktenError } = await supabase.from('akten').insert([{ user_id: session.user.id, unser_zeichen: unserZeichen || null, aktenzeichen: aktenzeichen || null, gegner_name: gegnerName || null, gegner_ansprechpartner: gegnerAnsprechpartner || null, gegner_telefon: gegnerTelefon || null, gegner_email: gegnerEmail || null, unsere_firma: unsereFirma || null, unser_ansprechpartner: unserAnsprechpartner || null, unser_telefon: unserTelefon || null, unser_email: unserEmail || null, thema: thema || null, status: 'Offen' }]).select()
      if (aktenError) { showToast("Fehler Akte: " + aktenError.message, 'error'); setLaedt(false); return; }
      aktuelleAkteId = neueAkte[0].id
    } else {
      if (clearOldFristen && aktuelleAkteId) {
         await supabase.from('akten_historie').update({ frist_extern: null, wiedervorlage: null }).eq('akte_id', aktuelleAkteId);
      }
    }

    const activeAktion = autoSaveOverrides && autoSaveOverrides.overrideAktion !== undefined ? autoSaveOverrides.overrideAktion : aktion;
    const activeKanal = autoSaveOverrides && autoSaveOverrides.overrideKanal !== undefined ? autoSaveOverrides.overrideKanal : kanal;
    const activeTyp = autoSaveOverrides && autoSaveOverrides.overrideTyp !== undefined ? autoSaveOverrides.overrideTyp : typ;

    const { error: histError } = await supabase.from('akten_historie').insert([{ 
      akte_id: aktuelleAkteId, 
      user_id: session.user.id, 
      typ: activeTyp, 
      datum: datum || null, 
      aktion: activeAktion || null, 
      kanal: activeKanal || null, 
      frist_extern: fristExtern || null, 
      wiedervorlage: wiedervorlage || null, 
      dokument_url: dokumentUrl, 
      brief_entwurf: briefEntwurf || null,
      bezug_id: bezugId || null 
    }])

    if (!histError) {
      if (bezugId) {
         await supabase.from('akten_historie').update({ frist_extern: null, wiedervorlage: null }).eq('id', bezugId);
      }

      setUnserZeichen(''); setAktenzeichen(''); setGegnerName(''); setGegnerAnsprechpartner(''); setGegnerTelefon(''); setGegnerFax(''); setGegnerEmail(''); 
      setUnsereFirma(''); setUnserAnsprechpartner(''); setUnserTelefon(''); setUnserEmail(''); setThema(''); 
      setAktion(''); setKanal(''); setFristExtern(''); setWiedervorlage(''); setDateien([]); setEmailAnhaenge([]); 
      setBriefEntwurf(''); setJsonImport(''); setTresorPrompt(null); setGegnerPrompt(null); setFaxZhd(''); 
      setBezugId(''); 
      setClearOldFristen(true);
      setVersandPdfUrl(null); 
      autoGenRef.current = '';
      if (document.getElementById('datei-upload-manuell')) document.getElementById('datei-upload-manuell').value = '';
      if (document.getElementById('email-anhaenge-upload')) document.getElementById('email-anhaenge-upload').value = '';
      ladeDaten();
      showToast('✅ Akteneintrag erfolgreich gespeichert!', 'success');
    } else {
      showToast('❌ Fehler beim Speichern der Historie: ' + histError.message, 'error');
    }
    setLaedt(false)
  }

  const naechsterGegnerUebergeben = async (akteId) => {
    if (!neuerGegnerName) { showToast("Bitte gib den Namen der neuen Behörde / des neuen Gegners ein!", 'warning'); return; }
    const akte = akten.find(a => a.id === akteId); if (!akte) return;
    const alterGegner = akte.gegner_name;
    const { error } = await supabase.from('akten').update({ vorgaenger_gegner: alterGegner, gegner_name: neuerGegnerName, uebergeben_am: new Date().toISOString() }).eq('id', akteId);
    if (!error) { await supabase.from('akten_historie').insert([{ akte_id: akteId, user_id: session.user.id, typ: 'Intern', datum: new Date().toISOString().split('T')[0], aktion: `Zuständigkeit übergeben von [${alterGegner}] an [${neuerGegnerName}]`, kanal: 'Behördenwechsel' }]); setTransferAkteId(null); setNeuerGegnerName(''); ladeDaten(); showToast(`✅ Akte an "${neuerGegnerName}" übergeben!`, 'success'); } else { showToast("Fehler bei der Übergabe: " + error.message, 'error'); }
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
    showToast("✅ Akteninhalte erfolgreich übertragen! Die leere Quell-Akte kann nun manuell gelöscht werden.", 'success');
  };

  const toggleAkte = (id) => {
    if (aufgeklappteAkten.includes(id)) setAufgeklappteAkten(aufgeklappteAkten.filter(aId => aId !== id))
    else setAufgeklappteAkten([...aufgeklappteAkten, id])
  }

  const loescheAkte = async (id) => {
    if(!window.confirm("Ganze Akte löschen?")) return; await supabase.from('akten').delete().eq('id', id); ladeDaten(); showToast('Akte komplett gelöscht.', 'success');
  }

  const handleTresorAuswahl = (e) => {
    const mId = e.target.value; if(!mId) return; const m = mandanten.find(x => x.id === mId);
    if(m) { setUnsereFirma(m.firmenname || ''); setUnserAnsprechpartner(m.ansprechpartner || ''); setUnserTelefon(formatRufnummer(m.telefon || '')); setUnserEmail(m.email || ''); }
  }

  const handleGegnerAuswahl = (e) => {
    const val = e.target.value; if(!val) return; const [gId, ansIdx] = val.split('|'); const g = gegnerListe.find(x => x.id === gId);
    if(g) {
      setGegnerName(g.name || ''); setGegnerFax(formatRufnummer(g.fax || ''));
      let ansprechpartnerObj = null;
      try { const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen; if (Array.isArray(parsed) && parsed[ansIdx]) { ansprechpartnerObj = parsed[ansIdx]; } } catch(e){}
      if (ansprechpartnerObj) { setGegnerAnsprechpartner(ansprechpartnerObj.name || g.ansprechpartner || ''); setFaxZhd(ansprechpartnerObj.name || g.ansprechpartner || ''); setGegnerTelefon(formatRufnummer(ansprechpartnerObj.telefon || g.telefon || '')); setGegnerEmail(ansprechpartnerObj.email || g.email || g.email_zentrale || ''); } else { setGegnerAnsprechpartner(g.ansprechpartner || ''); setFaxZhd(g.ansprechpartner || ''); setGegnerTelefon(formatRufnummer(g.telefon || '')); setGegnerEmail(g.email || g.email_zentrale || ''); }
    }
  }

  const berechneTageBis = (datumStr) => {
    if (!datumStr) return null; let rawDate = String(datumStr).trim(); if (rawDate.length === 8 && rawDate.endsWith('206')) { rawDate = rawDate.replace('206', '2026'); }
    const heute = new Date(); heute.setHours(0, 0, 0, 0); const frist = new Date(rawDate); if (frist.getFullYear() < 2000) { frist.setFullYear(2026); } frist.setHours(0, 0, 0, 0); return Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
  };

  const handleAlarmKlick = (akteId) => {
    setFokussierteAkteId(akteId); if (!aufgeklappteAkten.includes(akteId)) { setAufgeklappteAkten(prev => [...prev, akteId]); }
    setTimeout(() => { const el = document.getElementById(`akte-karte-${akteId}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 150);
  };

  const fristenWarnungen = [];
  akten.filter(a => a.status !== 'Erledigt').forEach(akte => {
    if (akte.akten_historie && akte.akten_historie.length > 0) {
      const relevanteEintraege = akte.akten_historie.filter(h => h.wiedervorlage || h.frist_extern);
      
      relevanteEintraege.forEach(dokument => {
        let zielDatum = null; let isWV = false; let sollAlarmMachen = false;
        
        if (dokument.wiedervorlage) { 
          const wvTage = berechneTageBis(dokument.wiedervorlage); 
          if (wvTage !== null && wvTage <= 0) { zielDatum = dokument.wiedervorlage; isWV = true; sollAlarmMachen = true; } 
        } 
        
        if (!sollAlarmMachen && dokument.frist_extern) { 
          const fristTage = berechneTageBis(dokument.frist_extern); 
          if (fristTage !== null && fristTage <= 7) { zielDatum = dokument.frist_extern; isWV = false; sollAlarmMachen = true; } 
        }
        
        if (sollAlarmMachen && zielDatum) { 
          const tage = berechneTageBis(zielDatum); 
          let alarmStufe = '1. ERINNERUNG'; 
          if (tage <= 4 && tage > 2) alarmStufe = '2. ERINNERUNG'; 
          if (tage <= 2) alarmStufe = 'ALARM'; 
          
          fristenWarnungen.push({ 
            ...dokument, 
            akte_id: akte.id, 
            akte_thema: akte.thema, 
            akte_gegner: akte.gegner_name, 
            tageUebrig: tage, 
            alarmStufe, 
            isWiedervorlage: isWV, 
            aktivesDatum: zielDatum, 
            unser_zeichen: akte.unser_zeichen 
          }); 
        }
      });
    }
  });
  fristenWarnungen.sort((a, b) => a.tageUebrig - b.tageUebrig);

  const ustRadar = [];
  const heuteDate = new Date(); const actYear = heuteDate.getFullYear(); const actMonth = heuteDate.getMonth(); 
  mandanten.forEach(m => {
    if (m.ust_intervall === 'Jährlich' || !m.ust_intervall) return;
    let nextFristDate = null; let bezeichnung = "";
    if (m.ust_intervall === 'Monatlich') {
      const shift = m.dauerfrist ? 2 : 1; let targetMonth = actMonth + shift; let targetYear = actYear;
      if (targetMonth > 11) { targetMonth -= 12; targetYear++; } nextFristDate = new Date(targetYear, targetMonth, 10); bezeichnung = `USt (Monat ${targetMonth === 0 ? 12 : targetMonth})`;
      if (heuteDate.getDate() <= 10) { let currentShift = m.dauerfrist ? 1 : 0; let checkM = actMonth + currentShift; let checkY = actYear; if (checkM > 11) { checkM -= 12; checkY++; } nextFristDate = new Date(checkY, checkM, 10); bezeichnung = `USt-Voranmeldung`; }
    } else if (m.ust_intervall === 'Vierteljährlich') {
      const fälligkeitsMonate = m.dauerfrist ? [4, 7, 10, 1] : [3, 6, 9, 0]; let foundFrist = null;
      for (let i = 0; i < 4; i++) { let testMonth = fälligkeitsMonate[i]; let testYear = actYear; if (m.dauerfrist && testMonth === 1) testYear++; if (!m.dauerfrist && testMonth === 0) testYear++; let testDate = new Date(testYear, testMonth, 10); if (testDate >= heuteDate || (testDate.getMonth() === actMonth && heuteDate.getDate() <= 10)) { foundFrist = testDate; bezeichnung = `USt-Voranmeldung (Quartal ${i+1})`; break; } }
      nextFristDate = foundFrist;
    }
    if (nextFristDate) { const tage = berechneTageBis(nextFristDate.toISOString().split('T')[0]); if (tage !== null && tage <= 7) { ustRadar.push({ firma: m.firmenname, bezeichnung: bezeichnung, datum: nextFristDate.toISOString().split('T')[0], tageUebrig: tage }); } }
  });
  ustRadar.sort((a,b) => a.tageUebrig - b.tageUebrig);

  const gefilterteAkten = akten.filter((akte) => {
    if (!zeigeErledigte && akte.status === 'Erledigt') return false; // Filter für Erledigte Akten
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
  });

  const sortedAktenForDropdown = [...akten].sort((a, b) => {
    const getLatestTime = (akte) => {
      if (!akte.akten_historie || akte.akten_historie.length === 0) return new Date(akte.created_at || 0).getTime();
      return new Date(akte.akten_historie[0].datum || akte.akten_historie[0].created_at || 0).getTime();
    };
    return getLatestTime(b) - getLatestTime(a);
  });

  const getAkteDropdownText = (akte) => {
    const uZ = akte.unser_zeichen ? `[${akte.unser_zeichen}]` : '[---]';
    const gegner = akte.gegner_name || 'Unbekannter Gegner';
    const thema = akte.thema || 'Ohne Gegenstand';
    return `${uZ} ${gegner} | ${thema}`;
  };

  // Aggregation aller Ausgangssendungen über alle Akten hinweg für die globale Versandhistorie
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
          unsere_firma: a.unsere_firma,
          thema: a.thema
        });
      });
    }
  });
  alleAusgaenge.sort((a, b) => new Date(b.datum || b.created_at || 0) - new Date(a.datum || a.created_at || 0));

  const activeAkteObj = modus === 'bestehend' && selectedAkteId ? akten.find(a => a.id === selectedAkteId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
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
              <button onClick={() => setShowUploadReminder(false)} style={{ padding: '12px 18px', background: theme.accent, color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}>Abbrechen & Dateien auswählen</button>
              <button onClick={speichereEintragLogik} style={{ padding: '12px 18px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}>Trotzdem ohne Dateien speichern</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VERSANDHISTORIE & SENDEBERICHTE */}
      {showVersandHistorie && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', maxWidth: '1100px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: `1px solid ${theme.border}`, background: theme.inputBg }}>
              <h3 style={{ margin: 0, color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                <Icon name="send" size={20} /> Globale Versandhistorie & Sendeberichte ({alleAusgaenge.length} Einträge)
              </h3>
              <button onClick={() => setShowVersandHistorie(false)} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>✕</button>
            </div>

            <div style={{ overflowY: 'auto', padding: '20px' }}>
              {alleAusgaenge.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>Bislang wurden noch keine Schreiben per E-Mail oder Fax versendet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: theme.border, color: theme.textMain }}>
                      <th style={{ padding: '10px' }}>Datum</th>
                      <th style={{ padding: '10px' }}>Unser Zeichen / Akte</th>
                      <th style={{ padding: '10px' }}>Gegner / Empfänger</th>
                      <th style={{ padding: '10px' }}>Kanal & Vorgang</th>
                      <th style={{ padding: '10px' }}>Anhänge</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alleAusgaenge.map((ausgang) => (
                      <tr key={ausgang.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>{formatDatum(ausgang.datum)}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ color: theme.accent, fontWeight: 'bold' }}>[{ausgang.unser_zeichen || '---'}]</span><br/>
                          <small style={{ color: theme.textMuted }}>{ausgang.thema || '-'}</small>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <strong>{ausgang.gegner_name || '-'}</strong><br/>
                          <small style={{ color: theme.textMuted }}>Mandant: {ausgang.unsere_firma || '-'}</small>
                        </td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ display: 'inline-block', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                            {ausgang.kanal || 'Ausgang'}
                          </span><br/>
                          <span>{ausgang.aktion || '-'}</span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {ausgang.dokument_url ? ausgang.dokument_url.split(',').map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', color: theme.accent, textDecoration: 'none', marginRight: '6px', fontSize: '12px' }} title={extractFilename(url)}>
                              <Icon name="file" size={12} /> {extractFilename(url).substring(0, 12)}...
                            </a>
                          )) : <span style={{ color: theme.textMuted }}>-</span>}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button onClick={() => druckeSendebericht(ausgang)} style={{ background: theme.accent, color: '#000', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Icon name="print" size={14} /> Sendebericht
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '15px 20px', borderTop: `1px solid ${theme.border}`, background: theme.inputBg, textAlign: 'right' }}>
              <button onClick={() => setShowVersandHistorie(false)} style={{ padding: '8px 16px', background: theme.border, color: theme.textMain, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', width: '100%' }}>
        <div style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px dashed ${theme.accent}`, transition: 'border-color 0.3s ease' }}>
          <label style={{...labelStyle, color: theme.accent, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.3s ease'}}><Icon name="wand" size={18} /> MAGIC IMPORT (JSON AUS SONAR MEGA-LEGAL)</label>
          <textarea id="magic-import" value={jsonImport} onChange={handleJsonImport} placeholder='{"typ": "Eingang", "unser_zeichen": "sbs-fiamt-0001", "thema": "..."}' style={{ ...inputStyle, background: 'rgba(0,0,0,0.1)', border: `1px solid ${theme.accent}`, color: theme.textMain, height: '100px', fontFamily: 'monospace', fontSize: '14px', marginTop: '5px', transition: 'border-color 0.3s ease' }} />
        </div>

        <div style={{ ...panelStyle, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${theme.border}` }}>
          <label style={{...labelStyle, color: theme.accent, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', transition: 'color 0.3s ease'}}><Icon name="paperclip" size={16} /> MANUELLER UPLOAD (PDF/MD)</label>
          <input id="datei-upload-manuell" type="file" multiple onChange={(e) => { setDateien(Array.from(e.target.files)); }} style={{...inputStyle, border: `1px dashed ${theme.accent}`, cursor: 'pointer', padding: '10px', fontSize: '13px', transition: 'border-color 0.3s ease'}} />
          {dateien.length > 0 && <span style={{fontSize: '13px', color: theme.accent, marginTop: '8px', fontWeight: 'bold'}}><Icon name="folder" size={12} /> {dateien.length} Datei(en) gewählt</span>}
        </div>
      </div>

      {(fristenWarnungen.length > 0 || ustRadar.length > 0) && (
        <div style={{ ...panelStyle, background: theme.warningBg, border: `1px solid ${theme.warningBorder}` }}>
          <h4 onClick={() => setIsAlarmsOpen(!isAlarmsOpen)} style={{ color: theme.warningText, margin: isAlarmsOpen ? '0 0 15px 0' : '0', textAlign: 'left', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Icon name="alert" size={20} /> Dringende Alarme & Fällige Wiedervorlagen ({fristenWarnungen.length + ustRadar.length})</div>
            <div style={{ color: theme.warningBorder }}><Icon name={isAlarmsOpen ? 'down' : 'right'} size={20} /></div>
          </h4>
          {isAlarmsOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              {fristenWarnungen.map(w => {
                const zielDatum = new Date(w.aktivesDatum); const plusDreiDate = new Date(zielDatum); plusDreiDate.setDate(plusDreiDate.getDate() + 3);
                let shiftDisabled = false; if (w.frist_extern) { const originalFristDate = new Date(w.frist_extern); if (plusDreiDate > originalFristDate) { shiftDisabled = true; } }
                const plusDreiIso = plusDreiDate.toISOString().split('T')[0];
                const isOverdue = w.tageUebrig < 0; const isDueToday = w.tageUebrig === 0; const actionBg = isOverdue ? theme.warningBorder : theme.accent; const actionColor = isOverdue ? '#ffffff' : '#000000';
                return (
                  <div key={`warn-${w.id}`} onClick={() => handleAlarmKlick(w.akte_id)} style={{ background: theme.cardItemBg, padding: '14px 18px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: `5px solid ${theme.warningBorder}`, boxShadow: isDarkMode ? 'none' : '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '8px' }} title="Klicken, um diese Akte unten zu fokussieren!">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '15px' }}>
                      <strong style={{ color: theme.warningBorder, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏢 [{w.unser_zeichen || '---'}] {w.akte_gegner}</strong>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setOpenMenuId(openMenuId === w.id ? null : w.id)} style={{ background: actionBg, color: actionColor, border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s ease' }}><Icon name="settings" size={12} /> Aktionen {openMenuId === w.id ? '▲' : '▼'}</button>
                        {openMenuId === w.id && (
                          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '5px', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 50, minWidth: '160px', boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)' }}>
                            <button onClick={() => { if (w.isWiedervorlage) handleInlineEdit(w.id, 'wiedervorlage', null); else handleInlineEdit(w.id, 'frist_extern', null); setOpenMenuId(null); }} style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textAlign: 'left', width: '100%' }}>✓ Erledigt</button>
                            <button disabled={shiftDisabled} onClick={() => { if (w.isWiedervorlage) handleInlineEdit(w.id, 'wiedervorlage', plusDreiIso); else handleInlineEdit(w.id, 'frist_extern', plusDreiIso); setOpenMenuId(null); }} style={{ background: shiftDisabled ? (isDarkMode ? '#334155' : '#e2e8f0') : theme.border, color: shiftDisabled ? theme.textMuted : theme.textMain, border: 'none', padding: '8px', borderRadius: '4px', cursor: shiftDisabled ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold', opacity: shiftDisabled ? 0.6 : 1, textAlign: 'left', width: '100%' }} title={shiftDisabled ? "Sperre: Verschiebung um 3 Tage würde hinter der harten Originalfrist liegen!" : "Um 3 Tage verschieben"}>+3 Tage {shiftDisabled ? '🔒' : ''}</button>
                            <button onClick={() => handleNachhaken(w.akte_id)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textAlign: 'left', width: '100%' }}><Icon name="send" size={12} /> Nachhaken</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: theme.textMuted, flexWrap: 'wrap', gap: '10px' }}>
                      
                      <span style={{ color: theme.textMain, fontWeight: '500' }}><Icon name="file" size={12} /> {w.akte_thema} <span style={{opacity: 0.7}}>➔ {w.aktion || 'Vorgang ohne Titel'}</span></span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span>{w.isWiedervorlage ? 'Wiedervorlage' : 'Frist'}: <strong style={{color: theme.textMain}}>{formatDatum(w.aktivesDatum)}</strong></span>
                        {w.frist_extern && w.isWiedervorlage && <span style={{fontSize: '11px', opacity: 0.8}}>(Frist: {formatDatum(w.frist_extern)})</span>}
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: isOverdue || isDueToday ? theme.warningBorder : theme.textMain }}>{isOverdue ? `(Überfällig: ${Math.abs(w.tageUebrig)} Tage)` : isDueToday ? '(HEUTE FÄLLIG!)' : `(Noch ${w.tageUebrig} Tage)`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {ustRadar.map((r, i) => (
                <div key={`ust-${i}`} style={{ background: theme.cardItemBg, padding: '12px 18px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: `5px solid ${theme.tresorAccent}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div><strong style={{ color: theme.tresorAccent }}>🏛️ {r.firma}</strong> — <span style={{ color: theme.textMain }}>{r.bezeichnung}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}><span style={{ fontSize: '13px', color: theme.textMuted }}>Fällig am {formatDatum(r.datum)}</span><span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>(Noch {r.tageUebrig} Tage)</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSpeichernCheck} style={panelStyle}>
        
        {gegnerPrompt && (
          <div style={{ background: theme.gegnerAccent || '#f43f5e', color: '#fff', padding: '18px 20px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <strong style={{ fontSize: '15px' }}>
                <Icon name="alert" size={14} /> Unbekannte Behörde: "{gegnerPrompt.obj.name}" neu ins Gegner-CRM aufnehmen?
              </strong>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={handleGegnerPromptAccept} style={{ background: '#fff', color: theme.gegnerAccent || '#f43f5e', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Ja, anlegen
                </button>
                <button type="button" onClick={() => setGegnerPrompt(null)} style={{ background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Nein, nur für diese Akte
                </button>
              </div>
            </div>
          </div>
        )}

        {tresorPrompt && (
          <div style={{ background: theme.accent, color: '#000', padding: '18px 20px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <strong style={{ fontSize: '15px' }}><Icon name="alert" size={14} /> Unbekannter Mandant: "{tresorPrompt.obj.unsere_firma}" neu in den Tresor aufnehmen?</strong>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={handleTresorPromptAccept} style={{ background: '#000', color: theme.accent, border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ja, anlegen</button>
                <button type="button" onClick={() => setTresorPrompt(null)} style={{ background: 'transparent', border: '1px solid #000', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Nein</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px', textAlign: 'left', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'neu' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><input type="radio" checked={modus === 'neu'} onChange={() => setModus('neu')} /><Icon name="folder" size={16} /> Neue Akte / Hülle anlegen</label>
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'bestehend' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><input type="radio" checked={modus === 'bestehend'} onChange={() => setModus('bestehend')} /><Icon name="link" size={16} /> Zu bestehender Akte hinzufügen</label>
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
              <div><label style={labelStyle}>Unser Zeichen</label><input type="text" value={unserZeichen} onChange={(e) => setUnserZeichen(e.target.value)} placeholder="z.B. jw-fiamt-0012" style={inputStyle} /></div>
              <div><label style={labelStyle}>Gegenstand (Thema)*</label><input type="text" value={thema} onChange={(e) => setThema(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Aktenzeichen (Behörde)</label><input type="text" value={aktenzeichen} onChange={(e) => setAktenzeichen(e.target.value)} style={inputStyle} /></div>

              {/* GEFIXTER DROPDOWN CONTAINER BEHÖRDE */}
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
              
              {/* GEFIXTER DROPDOWN CONTAINER MANDANT */}
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

          <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}><h4 style={h4StyleAkten}>Dokument-Eintrag</h4></div>
          <div><label style={labelStyle}>Typ*</label><select value={typ} onChange={(e) => setTyp(e.target.value)} style={inputStyle}><option value="Eingang">Eingang</option><option value="Ausgang">Ausgang</option><option value="Intern">Intern</option></select></div>
          <div><label style={labelStyle}>Datum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={inputStyle} /></div>
          
          {activeAkteObj && activeAkteObj.akten_historie && activeAkteObj.akten_historie.length > 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '10px', background: 'rgba(14, 165, 233, 0.1)', border: '1px dashed #0ea5e9', borderRadius: '6px' }}>
              <label style={{...labelStyle, color: theme.textMain}}>Ist eine Antwort auf (Bezug & Auto-Kill Frist):</label>
              <select value={bezugId} onChange={(e) => setBezugId(e.target.value)} style={{...inputStyle, borderColor: '#0ea5e9'}}>
                <option value="">-- Kein direkter Bezug --</option>
                {activeAkteObj.akten_historie.map(h => {
                  const briefSnippet = h.brief_entwurf ? ` | 📝 "${h.brief_entwurf.substring(0, 40).replace(/\n/g, ' ')}..."` : '';
                  const aktionSnippet = h.aktion ? ` | ⚙️ ${h.aktion}` : '';
                  return (
                    <option key={h.id} value={h.id}>
                      {formatDatum(h.datum)} | {h.typ}{briefSnippet}{aktionSnippet}
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
            <label style={{...labelStyle, color: theme.accent, margin: 0}}><Icon name="file" size={16} /> Textentwurf / Schreiben verfassen</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setShowVersandHistorie(true)} style={{ background: theme.accent, color: '#000', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }} title="Sendeliste und Nachweise einsehen"><Icon name="cabinet" size={14} /> Versandhistorie</button>
              <button type="button" onClick={() => handleResendVersand('email')} style={{ background: theme.accent, color: '#000', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="send" size={14} /> E-Mail senden (Resend)</button>
              <button type="button" onClick={() => handleResendVersand('fax')} style={{ background: theme.accent, color: '#000', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="phone" size={14} /> E-Fax senden (Simple-Fax)</button>
            </div>
          </div>

          {/* DATEIANHÄNGE DIREKT IM SCHREIBFENSTER */}
          <div style={{ marginBottom: '15px', padding: '12px', background: theme.cardBg, border: `1px dashed ${theme.border}`, borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <label style={{ ...labelStyle, margin: 0, color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="paperclip" size={14} /> Versand-Dateianhänge (E-Mail / Fax) ({emailAnhaenge.length})
              </label>
              <label style={{ background: theme.accent, color: '#000', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
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
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <textarea value={briefEntwurf} onChange={(e) => setBriefEntwurf(e.target.value)} placeholder="Trage hier deinen Brief- oder E-Mail-Text ein..." style={{ ...inputStyle, minHeight: '180px', fontFamily: 'monospace', background: 'transparent' }} />
          {versandPdfUrl && (<div style={{ marginTop: '15px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', color: '#10b981', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon name="check" size={16} /> Versand-PDF generiert & verschickt! Vergiss nicht, unten auf "+ In Akte abheften" zu klicken.</div>)}
        </div>

        <button disabled={laedt} type="submit" style={{ padding: '15px', background: theme.accent, color: isDarkMode ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '25px' }}>
          {laedt ? 'Speichere...' : '+ In Akte abheften'}
        </button>
      </form>

      {/* AKTEN UBERSICHT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '40px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: '0', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
          <Icon name="cabinet" size={24} /> Akten-Übersicht
        </h2>
        <button 
          onClick={() => setZeigeErledigte(!zeigeErledigte)}
          style={{ background: theme.accent, color: '#000', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Icon name="folder" size={14} /> {zeigeErledigte ? 'Erledigte ausblenden' : 'Erledigte einblenden'}
        </button>
      </div>

      <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', textAlign: 'left', background: theme.cardBg }}>
        
        {/* TABELLENKOPF DER MATRIX */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', background: theme.inputBg, borderBottom: `1px solid ${theme.border}`, fontWeight: 'bold', color: theme.textMuted, fontSize: '12px', textTransform: 'uppercase' }}>
          <div style={{ width: '30px' }}></div>
          <div style={{ flex: '1 1 100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 2fr 1.5fr 1.5fr', gap: '15px', alignItems: 'center' }}>
              <div>Unser Zeichen</div>
              <div>Gegner</div>
              <div>Gegenstand</div>
              <div>Ansprechpartner</div>
              <div>Aktenzeichen</div>
            </div>
          </div>
          <div style={{ width: '80px', textAlign: 'right' }}>Status</div>
        </div>

        {gefilterteAkten.map((akte) => {
          const isExpanded = aufgeklappteAkten.includes(akte.id);
          const istFokussiert = (fokussierteAkteId === akte.id);

          return (
            <div id={`akte-karte-${akte.id}`} key={akte.id} style={{ borderBottom: `1px solid ${theme.border}`, background: istFokussiert ? (isDarkMode ? 'rgba(0, 229, 255, 0.12)' : '#e0f2fe') : 'transparent', borderLeft: istFokussiert ? `6px solid ${theme.accent}` : '6px solid transparent', transition: 'all 0.3s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', cursor: 'pointer', flexWrap: 'nowrap', gap: '10px' }} onClick={() => toggleAkte(akte.id)}>
                <div style={{ width: '30px', color: istFokussiert ? theme.accent : theme.textMuted }}><Icon name={isExpanded ? 'down' : 'right'} size={20} /></div>
                
                {/* INHALT DER MATRIX */}
                <div style={{ flex: '1 1 100%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 2fr 1.5fr 1.5fr', gap: '15px', alignItems: 'center' }}>
                    <div>
                      <input 
                        type="text" 
                        defaultValue={akte.unser_zeichen || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.unser_zeichen || '')) handleAkteStammdatenEdit(akte.id, 'unser_zeichen', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Unser Zeichen" 
                        style={{ background: 'transparent', border: '1px dashed transparent', borderBottom: `1px dashed ${theme.border}`, color: theme.accent, width: '100%', fontSize: '14px', fontWeight: 'bold', padding: '2px', outline: 'none', cursor: 'text' }} 
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        defaultValue={akte.gegner_name || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.gegner_name || '')) handleAkteStammdatenEdit(akte.id, 'gegner_name', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Gegner" 
                        style={{ background: 'transparent', border: '1px dashed transparent', borderBottom: `1px dashed ${theme.border}`, color: theme.textMain, width: '100%', fontSize: '15px', fontWeight: 'bold', padding: '2px', outline: 'none', cursor: 'text' }} 
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        defaultValue={akte.thema || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.thema || '')) handleAkteStammdatenEdit(akte.id, 'thema', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Gegenstand" 
                        style={{ background: 'transparent', border: '1px dashed transparent', borderBottom: `1px dashed ${theme.border}`, color: theme.textMain, width: '100%', fontSize: '14px', padding: '2px', outline: 'none', cursor: 'text' }} 
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        defaultValue={akte.gegner_ansprechpartner || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.gegner_ansprechpartner || '')) handleAkteStammdatenEdit(akte.id, 'gegner_ansprechpartner', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Ansprechpartner" 
                        style={{ background: 'transparent', border: '1px dashed transparent', borderBottom: `1px dashed ${theme.border}`, color: theme.textMuted, width: '100%', fontSize: '13px', padding: '2px', outline: 'none', cursor: 'text' }} 
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        defaultValue={akte.aktenzeichen || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.aktenzeichen || '')) handleAkteStammdatenEdit(akte.id, 'aktenzeichen', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Aktenzeichen" 
                        style={{ background: 'transparent', border: '1px dashed transparent', borderBottom: `1px dashed ${theme.border}`, color: theme.textMuted, width: '100%', fontSize: '13px', padding: '2px', outline: 'none', cursor: 'text' }} 
                      />
                    </div>
                  </div>
                </div>

                <div style={{ width: '80px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  <select 
                    value={akte.status || 'Offen'} 
                    onChange={(e) => { if(e.target.value !== akte.status) toggleAkteStatus(akte.id, akte.status); }} 
                    style={{ background: akte.status === 'Erledigt' ? theme.border : theme.accent, color: akte.status === 'Erledigt' ? theme.textMain : '#000', border: 'none', padding: '4px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', outline: 'none', width: '100%', textAlign: 'center' }}
                  >
                    <option value="Offen">Offen</option>
                    <option value="Erledigt">Erledigt</option>
                  </select>
                </div>
              </div>

              {isExpanded && (
                <div style={{ background: theme.inputBg, padding: '20px', borderTop: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.cardBg, padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${theme.border}`, flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '13px', color: theme.textMain }}><strong>Aktions-Menü (Zusammenführen & Löschen)</strong></div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => loescheAkte(akte.id)} style={{ background: 'transparent', color: theme.warningBorder, border: `1px solid ${theme.warningBorder}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="trash" size={14} /> Akte löschen</button>
                      <button onClick={() => druckeAkte(akte)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="print" size={14} /> Akte exportieren / drucken</button>
                      
                      {mergeSourceId === akte.id ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)} style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', minWidth: '220px', maxWidth: '450px' }}>
                            <option value="">-- Ziel-Akte wählen --</option>
                            {sortedAktenForDropdown.filter(a => a.id !== akte.id).map(a => (<option key={a.id} value={a.id}>{getAkteDropdownText(a)}</option>))}
                          </select>
                          <button onClick={() => mergeAkte(akte.id)} style={{ background: theme.accent, color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Merge in Ziel-Akte bestätigen</button>
                          <button onClick={() => { setMergeSourceId(null); setMergeTargetId(''); }} style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Abbrechen</button>
                        </div>
                      ) : (
                        <button onClick={() => setMergeSourceId(akte.id)} style={{ background: 'transparent', color: theme.accent, border: `1px dashed ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="link" size={14} /> Akte in Sammelakte verschieben (Merge)</button>
                      )}
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', width: '100%', borderRadius: '8px' }}>
                    <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', fontSize: '13px', background: theme.cardBg, overflow: 'hidden' }}>
                      <thead>
                        <tr style={{ background: theme.border, color: theme.textMain }}>
                          <th style={{ padding: '10px', textAlign: 'left', width: '120px' }}>Typ</th>
                          <th style={{ padding: '10px', textAlign: 'left', width: '140px' }}>Datum</th>
                          <th style={{ padding: '10px', textAlign: 'left', width: '250px' }}>Aktion</th>
                          <th style={{ padding: '10px', textAlign: 'left', width: '160px' }}>Frist / WV</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Dokumente</th>
                          <th style={{ padding: '10px', textAlign: 'center', width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {akte.akten_historie.map((hist) => (
                          <tr key={hist.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '10px' }}>
                               <select 
                                 defaultValue={hist.typ || ''} 
                                 onChange={(e) => { if (e.target.value !== (hist.typ || '')) handleInlineEdit(hist.id, 'typ', e.target.value); }} 
                                 style={{...inlineInputStyle, fontWeight: 'bold'}}
                               >
                                  <option value="Eingang">Eingang</option>
                                  <option value="Ausgang">Ausgang</option>
                                  <option value="Intern">Intern</option>
                               </select>
                            </td>
                            <td style={{ padding: '10px' }}>
                               <input 
                                 type="date" 
                                 defaultValue={hist.datum || ''} 
                                 onBlur={(e) => { if (e.target.value !== (hist.datum || '')) handleInlineEdit(hist.id, 'datum', e.target.value); }} 
                                 style={inlineInputStyle} 
                               />
                            </td>
                            <td style={{ padding: '10px' }}>
                               <input 
                                 type="text" 
                                 defaultValue={hist.aktion || ''} 
                                 onBlur={(e) => { if (e.target.value !== (hist.aktion || '')) handleInlineEdit(hist.id, 'aktion', e.target.value); }} 
                                 style={inlineInputStyle} 
                                 placeholder="Ohne Aktion" 
                               />
                            </td>
                            <td style={{ padding: '10px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '11px', color: theme.textMuted, width: '30px' }}>Frist:</span>
                                  <input 
                                    type="date" 
                                    key={`frist-${hist.frist_extern}`}
                                    defaultValue={hist.frist_extern || ''} 
                                    onBlur={(e) => { if (e.target.value !== (hist.frist_extern || '')) handleInlineEdit(hist.id, 'frist_extern', e.target.value); }} 
                                    style={{...inlineInputStyle, padding: '2px', borderBottom: 'none'}} 
                                    title="Frist setzen (löscht automatisch WV)" 
                                  />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '11px', color: theme.warningBorder, fontWeight: 'bold', width: '30px' }}>WV:</span>
                                  <input 
                                    type="date" 
                                    key={`wv-${hist.wiedervorlage}`}
                                    defaultValue={hist.wiedervorlage || ''} 
                                    onBlur={(e) => { if (e.target.value !== (hist.wiedervorlage || '')) handleInlineEdit(hist.id, 'wiedervorlage', e.target.value); }} 
                                    style={{...inlineInputStyle, padding: '2px', borderBottom: 'none'}} 
                                    title="WV setzen (löscht automatisch Frist)" 
                                  />
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              {hist.dokument_url && hist.dokument_url.split(',').map((url, idx) => {
                                const fileName = extractFilename(url);
                                return (
                                  <div key={idx} onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'stretch', background: theme.border, borderRadius: '6px', marginRight: '6px', marginBottom: '6px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', color: theme.textMain, background: 'rgba(0,0,0,0.1)' }} title={fileName}><Icon name="file" size={12} /> {fileName.length > 18 ? fileName.substring(0, 15) + '...' : fileName}</a>
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); loescheDateiAusHistorie(hist.id, hist.dokument_url, url); }} style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 6px', cursor: 'pointer', color: theme.textMuted }} title="Datei löschen"><Icon name="x" size={12} /></button>
                                  </div>
                                )
                              })}
                              {uploadingHistId === hist.id ? (<span style={{ fontSize: '11px', color: theme.accent }}>⏳ Upload...</span>) : (<label style={{ cursor: 'pointer', fontSize: '11px', background: 'transparent', padding: '2px 6px', borderRadius: '4px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', color: theme.textMuted, marginLeft: '4px' }} title="Datei nachträglich an diesen Vorgang anhängen">+ Datei<input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUploadAkte(hist.id, hist.dokument_url, akte.unsere_firma, akte.gegner_name, e)} /></label>)}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}><button onClick={() => loescheHistorieEintrag(hist.id)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer' }}><Icon name="trash" size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
} 