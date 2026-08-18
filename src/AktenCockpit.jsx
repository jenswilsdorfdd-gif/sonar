import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub, extractFilename, normalizeName, cleanVal } from './utils';

export default function AktenCockpit({ session, theme, akten, mandanten, gegnerListe, ladeDaten, showToast, suchbegriff, globalUrlText, setGlobalUrlText }) {
  const SIGNATUR_URL = "https://loyzfkxkuyypgteskxkm.supabase.co/storage/v1/object/public/dokumente/jw-signum-lang-blau.png";

  const [laedt, setLaedt] = useState(false);
  const [selectedAkteId, setSelectedAkteId] = useState(null);
  
  const [modus, setModus] = useState('neu'); 
  const [jsonImport, setJsonImport] = useState('');
  
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
  
  const [dateien, setDateien] = useState([]);
  const [briefEntwurf, setBriefEntwurf] = useState('');
  const [versandPdfUrl, setVersandPdfUrl] = useState('');
  const [tresorPrompt, setTresorPrompt] = useState(null); 
  const [showUploadReminder, setShowUploadReminder] = useState(false);
  const [aufgeklappteAkten, setAufgeklappteAkten] = useState([]);
  const [transferAkteId, setTransferAkteId] = useState(null);
  const [neuerGegnerName, setNeuerGegnerName] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [uploadingHistId, setUploadingHistId] = useState(null);
  const [fokussierteAkteId, setFokussierteAkteId] = useState(null);

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const h4StyleAkten = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word' };
  const quickBtnStyle = { background: theme.border, color: theme.textMain, border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };

  const isDarkMode = theme.bg === '#020617';
  const formatDatum = (datum) => datum ? new Date(datum).toLocaleDateString('de-DE') : '-';

  // --- NEU: Empfang des geparsten URL-Textes vom Dashboard ---
  useEffect(() => {
    if (globalUrlText) {
      setBriefEntwurf(globalUrlText);
      setGlobalUrlText(null); // Direkt wieder löschen, damit es nicht nochmal triggert
    }
  }, [globalUrlText, setGlobalUrlText]);

  const toggleTresorUpdateKey = (key) => {
    setTresorPrompt(prev => {
      if (!prev) return prev;
      const keys = prev.selectedKeys.includes(key)
        ? prev.selectedKeys.filter(k => k !== key)
        : [...prev.selectedKeys, key];
      return { ...prev, selectedKeys: keys };
    });
  };

  const handleAkteAuswahl = (e) => {
    const val = e.target.value;
    setSelectedAkteId(val);
    if (val) {
       const a = akten.find(x => x.id === val);
       if (a) {
          setGegnerName(a.gegner_name || '');
          setGegnerAnsprechpartner(a.gegner_ansprechpartner || '');
          setGegnerTelefon(a.gegner_telefon || '');
          setGegnerEmail(a.gegner_email || '');
          setUnsereFirma(a.unsere_firma || '');
          setUnserAnsprechpartner(a.unser_ansprechpartner || '');
          setThema(a.thema || '');
          setAktenzeichen(a.aktenzeichen || '');
          
          if (a.gegner_name) {
             const crmGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(a.gegner_name));
             if (crmGegner) {
                setGegnerFax(crmGegner.fax || '');
                if (!a.gegner_email) setGegnerEmail(crmGegner.email || crmGegner.email_zentrale || '');
             } else {
                setGegnerFax('');
             }
          }
       }
    }
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
           const existingGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(item.gegner_name));

           if (!existingGegner) {
              await supabase.from('gegner').insert([{
                user_id: session.user.id,
                name: item.gegner_name,
                fax: item.fax || null,
                email: item.email || null,
                notizen: JSON.stringify([{
                  abteilung: item.abteilung || '',
                  name: item.ansprechpartner || '',
                  telefon: item.telefon || '',
                  email: item.email || ''
                }])
              }]);
              addedCount++;
           } else {
              let updates = {};
              let needsUpdate = false;

              if (!existingGegner.fax && item.fax) { updates.fax = item.fax; needsUpdate = true; }
              if (!existingGegner.email && item.email) { updates.email = item.email; needsUpdate = true; }

              let currentContacts = [];
              try {
                currentContacts = typeof existingGegner.notizen === 'string' ? JSON.parse(existingGegner.notizen) : (existingGegner.notizen || []);
                if (!Array.isArray(currentContacts)) currentContacts = [];
              } catch(e) { currentContacts = []; }

              if (item.ansprechpartner || item.abteilung) {
                 const contactExists = currentContacts.some(c => 
                   (c.name || '').toLowerCase() === (item.ansprechpartner || '').toLowerCase() &&
                   (c.abteilung || '').toLowerCase() === (item.abteilung || '').toLowerCase()
                 );

                 if (!contactExists) {
                    currentContacts.push({
                       abteilung: item.abteilung || '',
                       name: item.ansprechpartner || '',
                       telefon: item.telefon || '',
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
        showToast(`✅ KI-Gegner-Scan abgeschlossen!\n\n${addedCount} neue Behörden/Gegner angelegt.\n${updatedCount} bestehende aktualisiert.`, 'success');
        return; 
      }

      setAktenzeichen(obj.aktenzeichen || '')
      setThema(obj.thema || '')
      setGegnerName(obj.kontakt || '') 
      setGegnerAnsprechpartner(obj.ansprechpartner || '')
      setGegnerTelefon(obj.gegner_telefon || '')
      setGegnerFax(obj.gegner_fax || '')
      setGegnerEmail(obj.gegner_email || '')
      setFristExtern(obj.frist_extern || '')
      setBriefEntwurf(obj.brief_entwurf || '')
      setAktion(obj.aktion || '')
      setKanal(obj.kanal || 'Post / Fax / E-Mail')
      setTyp(obj.typ || 'Eingang')
      setDatum(new Date().toISOString().split('T')[0])

      if (obj.aktenzeichen) {
        let match = akten.find(a => a.aktenzeichen === obj.aktenzeichen);

        if (!match) {
          const { data: dbMatch, error: dbErr } = await supabase
            .from('akten')
            .select('*, akten_historie (*)')
            .eq('aktenzeichen', obj.aktenzeichen)
            .single();

          if (dbMatch && !dbErr) {
             if (dbMatch.akten_historie) {
               dbMatch.akten_historie.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
             }
             match = dbMatch;
          }
        }

        if (match) {
          setModus('bestehend');
          setSelectedAkteId(match.id);
          if (!obj.gegner_fax && match.gegner_name) {
             const crmGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(match.gegner_name));
             if (crmGegner && crmGegner.fax) {
                setGegnerFax(crmGegner.fax);
             }
          }
        } else {
          setModus('neu');
          if (obj.kontakt) {
             const crmGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(obj.kontakt));
             if (crmGegner && crmGegner.fax) {
                setGegnerFax(crmGegner.fax);
             }
          }
        }
      } else {
        setModus('neu');
      }

      if (obj.unsere_firma) {
        const existingMandant = mandanten.find(m => normalizeName(m.firmenname) === normalizeName(obj.unsere_firma));
        const parsedAnsprechpartner = cleanVal(obj.unser_ansprechpartner) || cleanVal(obj.ansprechpartner) || '';
        const parsedTelefon = cleanVal(obj.unser_telefon) || cleanVal(obj.telefon) || '';
        const parsedEmail = cleanVal(obj.unser_email) || cleanVal(obj.email) || '';
        const parsedAdresse = cleanVal(obj.unsere_adresse) || cleanVal(obj.adresse) || '';

        if (!existingMandant) {
          setUnsereFirma(obj.unsere_firma || '');
          setUnserAnsprechpartner(parsedAnsprechpartner);
          setUnserTelefon(parsedTelefon);
          setUnserEmail(parsedEmail);
          setTresorPrompt({ 
            typ: 'neu', 
            obj: { 
              ...obj, 
              unser_ansprechpartner: parsedAnsprechpartner, 
              unser_telefon: parsedTelefon, 
              unser_email: parsedEmail, 
              unsere_adresse: parsedAdresse 
            } 
          });
        } else {
           setUnsereFirma(existingMandant.firmenname); 
           setUnserAnsprechpartner(parsedAnsprechpartner || cleanVal(existingMandant.ansprechpartner) || '');
           setUnserTelefon(parsedTelefon || cleanVal(existingMandant.telefon) || '');
           setUnserEmail(parsedEmail || cleanVal(existingMandant.email) || '');

           let updates = {};
           let oldValues = {};
           const checkUpdate = (oldVal, newVal) => {
             const o = (!oldVal || oldVal === 'null' || oldVal === 'undefined') ? '' : String(oldVal).trim();
             const n = (!newVal || newVal === 'null' || newVal === 'undefined') ? '' : String(newVal).trim();
             return (n !== '' && o !== n) ? { old: o, new: n } : null;
           };
           
           let u1 = checkUpdate(existingMandant.ansprechpartner, parsedAnsprechpartner); if(u1) { updates.ansprechpartner = u1.new; oldValues.ansprechpartner = u1.old; }
           let u2 = checkUpdate(existingMandant.telefon, parsedTelefon); if(u2) { updates.telefon = u2.new; oldValues.telefon = u2.old; }
           let u3 = checkUpdate(existingMandant.email, parsedEmail); if(u3) { updates.email = u3.new; oldValues.email = u3.old; }
           let u4 = checkUpdate(existingMandant.adresse, parsedAdresse); if(u4) { updates.adresse = u4.new; oldValues.adresse = u4.old; }
           let u5 = checkUpdate(existingMandant.steuernummer, obj.unsere_steuernummer); if(u5) { updates.steuernummer = u5.new; oldValues.steuernummer = u5.old; }
           let u6 = checkUpdate(existingMandant.ust_id, obj.unsere_ust_id); if(u6) { updates.ust_id = u6.new; oldValues.ust_id = u6.old; }
           let u7 = checkUpdate(existingMandant.betriebsnummer, obj.unsere_betriebsnummer); if(u7) { updates.betriebsnummer = u7.new; oldValues.betriebsnummer = u7.old; }
           let u8 = checkUpdate(existingMandant.vbg_nummer, obj.unsere_vbg_nummer); if(u8) { updates.vbg_nummer = u8.new; oldValues.vbg_nummer = u8.old; }
           let u9 = checkUpdate(existingMandant.handelsregister, obj.unsere_handelsregister); if(u9) { updates.handelsregister = u9.new; oldValues.handelsregister = u9.old; }
           let u10 = checkUpdate(existingMandant.iban, obj.unsere_iban); if(u10) { updates.iban = u10.new; oldValues.iban = u10.old; }

           if (Object.keys(updates).length > 0) {
              setTresorPrompt({ 
                typ: 'update', existingId: existingMandant.id, updates, oldValues,
                selectedKeys: Object.keys(updates), firma: existingMandant.firmenname 
              });
           } else {
              setTresorPrompt(null);
           }
        }
      }
    } catch(err) { 
      console.error("JSON Error:", err);
    }
  }

  const handleTresorPromptAccept = async () => {
    if (!tresorPrompt) return;
    if (tresorPrompt.typ === 'neu') {
      const { data, error } = await supabase.from('mandanten').insert([{
        user_id: session.user.id,
        firmenname: tresorPrompt.obj.unsere_firma,
        ansprechpartner: cleanVal(tresorPrompt.obj.unser_ansprechpartner) || '',
        telefon: cleanVal(tresorPrompt.obj.unser_telefon) || '',
        email: cleanVal(tresorPrompt.obj.unser_email) || '',
        adresse: cleanVal(tresorPrompt.obj.unsere_adresse) || '',
        steuernummer: cleanVal(tresorPrompt.obj.unsere_steuernummer) || '',
        ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || '',
        betriebsnummer: cleanVal(tresorPrompt.obj.unsere_betriebsnummer) || '',
        vbg_nummer: cleanVal(tresorPrompt.obj.unsere_vbg_nummer) || '',
        handelsregister: cleanVal(tresorPrompt.obj.unsere_handelsregister) || '',
        iban: cleanVal(tresorPrompt.obj.unsere_iban) || ''
      }]).select();
      if (!error && data) {
        showToast(`✅ Mandant "${tresorPrompt.obj.unsere_firma}" im Tresor angelegt!`, 'success');
        ladeDaten();
      }
    } else if (tresorPrompt.typ === 'update') {
      let finalUpdates = {};
      tresorPrompt.selectedKeys.forEach(k => { finalUpdates[k] = tresorPrompt.updates[k]; });
      if (Object.keys(finalUpdates).length > 0) {
        await supabase.from('mandanten').update(finalUpdates).eq('id', tresorPrompt.existingId);
        ladeDaten();
        showToast(`✅ Tresor-Eintrag für "${tresorPrompt.firma}" aktualisiert!`, 'success');
      }
    }
    setTresorPrompt(null);
  };

  const handleInlineEdit = async (histId, feld, wert) => {
    const { error } = await supabase.from('akten_historie').update({ [feld]: wert || null }).eq('id', histId);
    if (!error) {
      ladeDaten(); 
      showToast('Änderung gespeichert!', 'success');
    } else {
      showToast("Fehler beim Speichern: " + error.message, 'error');
    }
  };

  const loescheHistorieEintrag = async (histId) => {
    if(!window.confirm("Diesen gesamten Eintrag inkl. aller darin verknüpften Dateien aus der Akte löschen?")) return;
    await supabase.from('akten_historie').delete().eq('id', histId);
    ladeDaten();
    showToast('Eintrag komplett gelöscht!', 'success');
  };

  const loescheDateiAusHistorie = async (histId, aktuelleUrls, urlZumLoeschen) => {
    if (!window.confirm("Diese Datei wirklich aus dem Akten-Eintrag entfernen?")) return;
    const urlArray = aktuelleUrls.split(',');
    const neueUrls = urlArray.filter(url => url !== urlZumLoeschen);
    const neuerUrlString = neueUrls.length > 0 ? neueUrls.join(',') : null;
    
    const { error: dbError } = await supabase.from('akten_historie').update({ dokument_url: neuerUrlString }).eq('id', histId);
    
    if (!dbError) {
       try {
          const parts = decodeURIComponent(urlZumLoeschen).split('/');
          const fileName = parts[parts.length - 1];
          await supabase.storage.from('dokumente').remove([fileName]);
       } catch (e) { }
       ladeDaten();
       showToast('Datei erfolgreich entfernt!', 'success');
    } else {
       showToast("Fehler beim Entfernen der Datei: " + dbError.message, 'error');
    }
  };

  const toggleAkteStatus = async (akteId, currentStatus) => {
    const neuerStatus = currentStatus === 'Erledigt' ? 'Offen' : 'Erledigt';
    const { error } = await supabase.from('akten').update({ status: neuerStatus }).eq('id', akteId);
    
    if (!error) {
      if (neuerStatus === 'Erledigt') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 10);
        const wvDatum = d.toISOString().split('T')[0];

        await supabase.from('akten_historie').insert([{
          akte_id: akteId,
          user_id: session.user.id,
          typ: 'Intern',
          datum: new Date().toISOString().split('T')[0],
          aktion: 'Akte geschlossen. Automatische Wiedervorlage zur Löschung (Ablauf Aufbewahrungsfrist).',
          wiedervorlage: wvDatum
        }]);
      }
      ladeDaten(); 
      showToast(`Akte wurde ${neuerStatus === 'Erledigt' ? 'geschlossen' : 'wieder geöffnet'}.`, 'success');
    } else {
      showToast("Fehler beim Ändern des Akten-Status: " + error.message, 'error');
    }
  };

  const handleNachtragUploadAkte = async (histId, currentUrls, akteFirma, akteGegner, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingHistId(histId);
    
    const isMd = file.name.toLowerCase().endsWith('.md');

    if (isMd) {
      const mdInhalt = await file.text();
      const baseInfo = `Nachträglich an Akte angehängt. Gegner: ${akteGegner || 'Unbekannt'}`;
      
      await supabase.from('wissensdatenbank').insert([{
        datei_name: file.name,
        firma: akteFirma || 'Allgemein',
        inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`,
        dokument_url: null
      }]);

      await syncToGithub(file.name, mdInhalt, null, null, showToast);
      ladeDaten(); 
      showToast('Dokument erfolgreich angehängt!', 'success');
    } else {
      const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const dateiName = `h_${Date.now()}_${sichererDateiname}`;
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file);
      
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        const newUrl = linkData.publicUrl;
        const updatedUrls = currentUrls ? `${currentUrls},${newUrl}` : newUrl;
        
        await supabase.from('akten_historie').update({ dokument_url: updatedUrls }).eq('id', histId);
        ladeDaten();
        showToast('Dokument erfolgreich angehängt!', 'success');
      } else {
        showToast("Fehler beim Upload: " + uploadError.message, 'error');
      }
    }
    
    setUploadingHistId(null);
    e.target.value = '';
  };

  const setzeWV = (tage, monate = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + tage);
    if (monate > 0) d.setMonth(d.getMonth() + monate);
    setWiedervorlage(d.toISOString().split('T')[0]);
  };

  const druckeAkte = (akte) => {
    const printWindow = window.open('', '_blank');
    const historieRows = akte.akten_historie ? akte.akten_historie.map(h => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${h.typ}</td>
        <td style="padding: 8px; border: 1px solid #ccc;">${h.datum ? new Date(h.datum).toLocaleDateString('de-DE') : '-'}</td>
        <td style="padding: 8px; border: 1px solid #ccc;">${h.aktion || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ccc; color: #d97706;">
          ${h.wiedervorlage ? 'WV: ' + new Date(h.wiedervorlage).toLocaleDateString('de-DE') : (h.frist_extern ? 'Frist: ' + new Date(h.frist_extern).toLocaleDateString('de-DE') : '-')}
        </td>
      </tr>
    `).join('') : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Aktenauszug - ${akte.gegner_name || 'Akte'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; line-height: 1.5; }
            h1 { font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 13px; background: #f4f4f4; padding: 15px; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background: #eee; padding: 8px; border: 1px solid #ccc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>SONAR AKTEN-AUSZUG | AZ: ${akte.aktenzeichen || 'Neu'}</h1>
          <div class="grid">
            <div>
              <strong>GEGENPARTEI / BEHÖRDE:</strong><br/>
              ${akte.gegner_name}<br/>
              Ansprechpartner: ${akte.gegner_ansprechpartner || '-'}<br/>
              E-Mail: ${akte.gegner_email || '-'}
            </div>
            <div>
              <strong>MANDANT / FIRMA:</strong><br/>
              ${akte.unsere_firma}<br/>
              Ansprechpartner: ${akte.unser_ansprechpartner || '-'}<br/>
              Thema: ${akte.thema}
            </div>
          </div>
          <h3>DOKUMENTEN- & VERLAUFSHISTORIE</h3>
          <table>
            <thead>
              <tr>
                <th>Typ</th>
                <th>Datum</th>
                <th>Aktion / Vorgang</th>
                <th>WV / Frist</th>
              </tr>
            </thead>
            <tbody>
              ${historieRows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleResendVersand = async (versandArt) => {
    if (!briefEntwurf || briefEntwurf.trim() === '') {
      showToast("⚠️ Bitte gib zuerst einen Text im Schreibfenster ein!", 'warning');
      return;
    }
    if (!gegnerEmail && versandArt === 'email') {
      showToast("⚠️ Bitte trage zuerst eine E-Mail-Adresse der Gegenseite / Behörde ein!", 'warning');
      return;
    }
    if (!gegnerFax && versandArt === 'fax') {
      showToast("⚠️ Bitte trage zuerst eine Faxnummer der Gegenseite ein!", 'warning');
      return;
    }

    setLaedt(true);
    try {
      const rawFax = gegnerFax ? gegnerFax.replace(/[^0-9]/g, '') : '';
      const targetAddress = versandArt === 'email' 
        ? gegnerEmail 
        : `${rawFax}@simple-fax.de`; 

      const betreff = `Aktenzeichen: ${aktenzeichen || 'Neu'} — ${thema || 'Schreiben'}`;

      const mandantProfil = mandanten.find(m => normalizeName(m.firmenname) === normalizeName(unsereFirma)) || null;

      const response = await fetch("https://loyzfkxkuyypgteskxkm.supabase.co/functions/v1/sonar-send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          to: targetAddress,
          subject: betreff,
          text: briefEntwurf,
          signatureUrl: SIGNATUR_URL,
          unsereFirma: unsereFirma || 'Jens Wilsdorf',
          mandantProfil: mandantProfil,
          gegnerName: gegnerName,
          gegnerAnsprechpartner: gegnerAnsprechpartner,
          gegnerFax: gegnerFax
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || resData.message || JSON.stringify(resData));
      }

      if (resData.pdfUrl) {
         setVersandPdfUrl(resData.pdfUrl);
      }
      
      setAktion(`${versandArt === 'email' ? 'E-Mail' : 'E-Fax (Simple-Fax)'} versendet an ${targetAddress}`);
      setKanal(versandArt === 'email' ? 'E-Mail (Resend)' : 'E-Fax (Simple-Fax via Resend)');
      setTyp('Ausgang');

      showToast(`✅ ${versandArt === 'email' ? 'E-Mail' : 'E-Fax'} erfolgreich versendet!\nDas PDF wurde generiert. Klicke jetzt noch unten auf "+ In Akte abheften", um den Vorgang endgültig in der Akte zu speichern.`, 'success');

    } catch (e) {
      console.error("Versandfehler:", e);
      showToast("❌ Rückmeldung von Resend: " + e.message, 'error');
    }
    setLaedt(false);
  };

  const handleSpeichernCheck = (e) => {
    e.preventDefault();
    if (dateien.length === 0) {
      setShowUploadReminder(true);
    } else {
      speichereEintragLogik();
    }
  };

  const speichereEintragLogik = async () => {
    setShowUploadReminder(false);
    setLaedt(true);

    if (tresorPrompt && tresorPrompt.typ === 'neu') {
      const { data: mData } = await supabase.from('mandanten').insert([{
        user_id: session.user.id,
        firmenname: tresorPrompt.obj.unsere_firma,
        ansprechpartner: cleanVal(tresorPrompt.obj.unser_ansprechpartner) || '',
        telefon: cleanVal(tresorPrompt.obj.unser_telefon) || '',
        email: cleanVal(tresorPrompt.obj.unser_email) || '',
        adresse: cleanVal(tresorPrompt.obj.unsere_adresse) || '',
        steuernummer: cleanVal(tresorPrompt.obj.unsere_steuernummer) || '',
        ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || '',
        betriebsnummer: cleanVal(tresorPrompt.obj.unsere_betriebsnummer) || '',
        vbg_nummer: cleanVal(tresorPrompt.obj.unsere_vbg_nummer) || '',
        handelsregister: cleanVal(tresorPrompt.obj.unsere_handelsregister) || '',
        iban: cleanVal(tresorPrompt.obj.unsere_iban) || ''
      }]).select();
      if (mData) ladeDaten();
    }

    let alleUrls = [];
    
    if (dateien && dateien.length > 0) {
      for (const f of dateien) {
        const isMd = f.name.toLowerCase().endsWith('.md');
        const zugewieseneFirma = unsereFirma || (tresorPrompt && tresorPrompt.typ === 'neu' ? tresorPrompt.obj.unsere_firma : 'Allgemein');

        if (isMd) {
           const fileInhalt = await f.text();
           const baseInfo = `Upload via Akten-Cockpit. Gegner: ${gegnerName || 'Unbekannt'} | Thema: ${thema || 'Ohne Thema'}`;
           const finalDbText = `${baseInfo}\n\n${fileInhalt.substring(0, 3000)}...`;

           await supabase.from('wissensdatenbank').insert([{
             datei_name: f.name,
             firma: zugewieseneFirma,
             inhalt_text: finalDbText,
             dokument_url: null
           }]);

           await syncToGithub(f.name, fileInhalt, null, null, showToast);
        } else {
           const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_')
           const dateiName = `${Date.now()}_${sichererDateiname}` 
           const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f)
           
           if (!uploadError) {
             const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName)
             alleUrls.push(linkData.publicUrl)
           }
        }
      }
    }
    
    if (versandPdfUrl) {
      alleUrls.push(versandPdfUrl);
      
      await supabase.from('wissensdatenbank').insert([{
        datei_name: `Ausgang_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.pdf`,
        firma: unsereFirma || 'Allgemein',
        inhalt_text: `Automatisch versendetes Dokument. Gegner: ${gegnerName || 'Unbekannt'} | Thema: ${thema || 'Ohne Thema'}\n\n\n${briefEntwurf}`,
        dokument_url: versandPdfUrl
      }]);

      const ausgangName = `Ausgang_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;
      await syncToGithub(ausgangName, `Versendetes Dokument\nThema: ${thema || 'Ohne Thema'}\nGegner: ${gegnerName || 'Unbekannt'}\nLink: ${versandPdfUrl}\n\nDokumententext:\n${briefEntwurf}`, versandPdfUrl, null, showToast);
    } else if (briefEntwurf && briefEntwurf.trim() !== '') {
      const entwurfName = `Entwurf_${Date.now()}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;
      await syncToGithub(entwurfName, `Text-Entwurf\nThema: ${thema || 'Ohne Thema'}\nGegner: ${gegnerName || 'Unbekannt'}\n\nDokumententext:\n${briefEntwurf}`, null, null, showToast);
    }

    const dokumentUrl = alleUrls.length > 0 ? alleUrls.join(',') : null;
    let aktuelleAkteId = selectedAkteId

    if (modus === 'neu') {
      const { data: neueAkte, error: aktenError } = await supabase
        .from('akten')
        .insert([{ 
          user_id: session.user.id, aktenzeichen: aktenzeichen || null, gegner_name: gegnerName || null,
          gegner_ansprechpartner: gegnerAnsprechpartner || null, gegner_telefon: gegnerTelefon || null,
          gegner_email: gegnerEmail || null, unsere_firma: unsereFirma || null, unser_ansprechpartner: unserAnsprechpartner || null,
          unser_telefon: unserTelefon || null, unser_email: unserEmail || null, thema: thema || null, status: 'Offen'
        }]).select()
      if (aktenError) { 
        showToast("Fehler Akte: " + aktenError.message, 'error'); 
        setLaedt(false); 
        return; 
      }
      aktuelleAkteId = neueAkte[0].id
    }

    const { error: histError } = await supabase
      .from('akten_historie')
      .insert([{ 
        akte_id: aktuelleAkteId, user_id: session.user.id, typ: typ, datum: datum || null,
        aktion: aktion || null, kanal: kanal || null, frist_extern: fristExtern || null,
        wiedervorlage: wiedervorlage || null, dokument_url: dokumentUrl, brief_entwurf: briefEntwurf || null 
      }])

    if (!histError) {
      if (gegnerName) {
        const existingGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(gegnerName));
        if (!existingGegner) {
          await supabase.from('gegner').insert([{
            user_id: session.user.id,
            name: gegnerName,
            fax: gegnerFax || null,
            email: gegnerEmail || null,
            notizen: JSON.stringify([])
          }]);
        } else {
          let updates = {};
          let needsUpdate = false;

          if (!existingGegner.fax && gegnerFax) {
            updates.fax = gegnerFax;
            needsUpdate = true;
          }
          if (!existingGegner.email && gegnerEmail) {
            updates.email = gegnerEmail;
            needsUpdate = true;
          }

          let currentContacts = [];
          try {
            currentContacts = typeof existingGegner.notizen === 'string' ? JSON.parse(existingGegner.notizen) : (existingGegner.notizen || []);
            if (!Array.isArray(currentContacts)) currentContacts = [];
          } catch(e) {
             currentContacts = [];
          }

          if (gegnerAnsprechpartner) {
             const contactExists = currentContacts.some(c => 
               (c.name || '').toLowerCase() === gegnerAnsprechpartner.toLowerCase()
             );

             if (!contactExists) {
                currentContacts.push({
                   abteilung: '',
                   name: gegnerAnsprechpartner,
                   telefon: gegnerTelefon || '',
                   email: gegnerEmail || ''
                });
                updates.notizen = JSON.stringify(currentContacts);
                needsUpdate = true;
             }
          }

          if (needsUpdate) {
            await supabase.from('gegner').update(updates).eq('id', existingGegner.id);
          }
        }
      }

      setAktenzeichen(''); setGegnerName(''); setGegnerAnsprechpartner(''); setGegnerTelefon(''); setGegnerFax(''); setGegnerEmail(''); 
      setUnsereFirma(''); setUnserAnsprechpartner(''); setUnserTelefon(''); setUnserEmail(''); setThema(''); 
      setAktion(''); setKanal(''); setFristExtern(''); setWiedervorlage(''); setDateien([]); 
      setBriefEntwurf(''); setJsonImport(''); setTresorPrompt(null);
      setVersandPdfUrl(null); 
      if (document.getElementById('datei-upload-manuell')) document.getElementById('datei-upload-manuell').value = '';
      ladeDaten();
      showToast('✅ Akteneintrag erfolgreich gespeichert!', 'success');
    } else {
      showToast('❌ Fehler beim Speichern der Historie: ' + histError.message, 'error');
    }
    setLaedt(false)
  }

  const naechsterGegnerUebergeben = async (akteId) => {
    if (!neuerGegnerName) {
      showToast("Bitte gib den Namen der neuen Behörde / des neuen Gegners ein!", 'warning');
      return;
    }
    const akte = akten.find(a => a.id === akteId);
    if (!akte) return;

    const alterGegner = akte.gegner_name;
    const { error } = await supabase.from('akten').update({
      vorgaenger_gegner: alterGegner,
      gegner_name: neuerGegnerName,
      uebergeben_am: new Date().toISOString()
    }).eq('id', akteId);

    if (!error) {
      await supabase.from('akten_historie').insert([{
        akte_id: akteId,
        user_id: session.user.id,
        typ: 'Intern',
        datum: new Date().toISOString().split('T')[0],
        aktion: `Zuständigkeit übergeben von [${alterGegner}] an [${neuerGegnerName}]`,
        kanal: 'Behördenwechsel'
      }]);
      setTransferAkteId(null);
      setNeuerGegnerName('');
      ladeDaten();
      showToast(`✅ Akte an "${neuerGegnerName}" übergeben!`, 'success');
    } else {
      showToast("Fehler bei der Übergabe: " + error.message, 'error');
    }
  };

  const mergeAkte = async (sourceId) => {
    if (!mergeTargetId) { showToast("Bitte wähle zuerst eine Ziel-Akte aus!", 'warning'); return; }
    if (sourceId === mergeTargetId) { showToast("Quell- und Ziel-Akte dürfen nicht identisch sein!", 'warning'); return; }
    if (!window.confirm("Achtung: Die komplette Historie (inkl. Dokumente) wird in die Ziel-Akte verschoben. Die aktuelle Akte wird anschließend gelöscht. Fortfahren?")) return;

    const sourceAkte = akten.find(a => a.id === sourceId);
    const histToMove = sourceAkte.akten_historie || [];

    for (const h of histToMove) {
      await supabase.from('akten_historie').update({ akte_id: mergeTargetId }).eq('id', h.id);
    }

    await supabase.from('akten_historie').insert([{
      akte_id: mergeTargetId,
      user_id: session.user.id,
      typ: 'Intern',
      datum: new Date().toISOString().split('T')[0],
      aktion: `Akte zusammengeführt: Die Akte "${sourceAkte.thema}" (AZ: ${sourceAkte.aktenzeichen || '-'}) von Gegner "${sourceAkte.gegner_name}" wurde in diese Akte integriert.`
    }]);

    await supabase.from('akten').delete().eq('id', sourceId);

    setMergeSourceId(null);
    setMergeTargetId('');
    ladeDaten();
    showToast("✅ Akten erfolgreich zusammengeführt!", 'success');
  };

  const toggleAkte = (id) => {
    if (aufgeklappteAkten.includes(id)) setAufgeklappteAkten(aufgeklappteAkten.filter(aId => aId !== id))
    else setAufgeklappteAkten([...aufgeklappteAkten, id])
  }

  const loescheAkte = async (id) => {
    if(!window.confirm("Ganze Akte löschen?")) return
    await supabase.from('akten').delete().eq('id', id)
    ladeDaten()
    showToast('Akte komplett gelöscht.', 'success');
  }

  const handleTresorAuswahl = (e) => {
    const mId = e.target.value
    if(!mId) return
    const m = mandanten.find(x => x.id === mId)
    if(m) {
      setUnsereFirma(m.firmenname || ''); setUnserAnsprechpartner(m.ansprechpartner || '');
      setUnserTelefon(m.telefon || ''); setUnserEmail(m.email || '');
    }
  }

  const handleGegnerAuswahl = (e) => {
    const val = e.target.value;
    if(!val) return;
    const [gId, ansIdx] = val.split('|');
    const g = gegnerListe.find(x => x.id === gId);
    if(g) {
      setGegnerName(g.name || ''); 
      setGegnerFax(g.fax || '');
      
      let ansprechpartnerObj = null;
      try {
        const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen;
        if (Array.isArray(parsed) && parsed[ansIdx]) {
          ansprechpartnerObj = parsed[ansIdx];
        }
      } catch(e){}

      if (ansprechpartnerObj) {
        setGegnerAnsprechpartner(ansprechpartnerObj.name || g.ansprechpartner || '');
        setGegnerTelefon(ansprechpartnerObj.telefon || g.telefon || '');
        setGegnerEmail(ansprechpartnerObj.email || g.email || g.email_zentrale || '');
      } else {
        setGegnerAnsprechpartner(g.ansprechpartner || '');
        setGegnerTelefon(g.telefon || '');
        setGegnerEmail(g.email || g.email_zentrale || '');
      }
    }
  }

  const berechneTageBis = (datumStr) => {
    if (!datumStr) return null;
    let rawDate = String(datumStr).trim();
    if (rawDate.length === 8 && rawDate.endsWith('206')) {
      rawDate = rawDate.replace('206', '2026');
    }
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const frist = new Date(rawDate);
    if (frist.getFullYear() < 2000) {
      frist.setFullYear(2026);
    }
    frist.setHours(0, 0, 0, 0);
    return Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
  };

  const handleAlarmKlick = (akteId) => {
    setFokussierteAkteId(akteId);
    if (!aufgeklappteAkten.includes(akteId)) {
      setAufgeklappteAkten(prev => [...prev, akteId]);
    }
    setTimeout(() => {
      const el = document.getElementById(`akte-karte-${akteId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const fristenWarnungen = [];
  akten.filter(a => a.status !== 'Erledigt').forEach(akte => {
    if (akte.akten_historie && akte.akten_historie.length > 0) {
      const relevanteEintraege = akte.akten_historie.filter(h => h.wiedervorlage || h.frist_extern);
      if (relevanteEintraege.length > 0) {
        const neuestesDokument = relevanteEintraege[0];
        let zielDatum = null;
        let isWV = false;
        let sollAlarmMachen = false;

        if (neuestesDokument.wiedervorlage) {
          const wvTage = berechneTageBis(neuestesDokument.wiedervorlage);
          if (wvTage !== null && wvTage <= 0) { 
            zielDatum = neuestesDokument.wiedervorlage;
            isWV = true;
            sollAlarmMachen = true;
          }
        } 
        
        if (!sollAlarmMachen && neuestesDokument.frist_extern) {
          const fristTage = berechneTageBis(neuestesDokument.frist_extern);
          if (fristTage !== null && fristTage <= 7) { 
            zielDatum = neuestesDokument.frist_extern;
            isWV = false;
            sollAlarmMachen = true;
          }
        }

        if (sollAlarmMachen && zielDatum) {
          const tage = berechneTageBis(zielDatum);
          let alarmStufe = '1. ERINNERUNG';
          if (tage <= 4 && tage > 2) alarmStufe = '2. ERINNERUNG';
          if (tage <= 2) alarmStufe = 'ALARM';

          fristenWarnungen.push({
            ...neuestesDokument,
            akte_id: akte.id,
            akte_thema: akte.thema,
            akte_gegner: akte.gegner_name,
            tageUebrig: tage,
            alarmStufe,
            isWiedervorlage: isWV,
            aktivesDatum: zielDatum
          });
        }
      }
    }
  });

  fristenWarnungen.sort((a, b) => a.tageUebrig - b.tageUebrig);

  const ustRadar = [];
  const heuteDate = new Date();
  const actYear = heuteDate.getFullYear();
  const actMonth = heuteDate.getMonth(); 

  mandanten.forEach(m => {
    if (m.ust_intervall === 'Jährlich' || !m.ust_intervall) return;
    let nextFristDate = null; let bezeichnung = "";
    if (m.ust_intervall === 'Monatlich') {
      const shift = m.dauerfrist ? 2 : 1; 
      let targetMonth = actMonth + shift; let targetYear = actYear;
      if (targetMonth > 11) { targetMonth -= 12; targetYear++; }
      nextFristDate = new Date(targetYear, targetMonth, 10);
      bezeichnung = `USt (Monat ${targetMonth === 0 ? 12 : targetMonth})`;
      if (heuteDate.getDate() <= 10) {
         let currentShift = m.dauerfrist ? 1 : 0;
         let checkM = actMonth + currentShift; let checkY = actYear;
         if (checkM > 11) { checkM -= 12; checkY++; }
         nextFristDate = new Date(checkY, checkM, 10);
         bezeichnung = `USt-Voranmeldung`;
      }
    } else if (m.ust_intervall === 'Vierteljährlich') {
      const fälligkeitsMonate = m.dauerfrist ? [4, 7, 10, 1] : [3, 6, 9, 0]; 
      let foundFrist = null;
      for (let i = 0; i < 4; i++) {
        let testMonth = fälligkeitsMonate[i]; let testYear = actYear;
        if (m.dauerfrist && testMonth === 1) testYear++; 
        if (!m.dauerfrist && testMonth === 0) testYear++; 
        let testDate = new Date(testYear, testMonth, 10);
        if (testDate >= heuteDate || (testDate.getMonth() === actMonth && heuteDate.getDate() <= 10)) {
           foundFrist = testDate; bezeichnung = `USt-Voranmeldung (Quartal ${i+1})`; break;
        }
      }
      nextFristDate = foundFrist;
    }
    if (nextFristDate) {
      const tage = berechneTageBis(nextFristDate.toISOString().split('T')[0]);
      if (tage !== null && tage <= 7) { 
         ustRadar.push({ firma: m.firmenname, bezeichnung: bezeichnung, datum: nextFristDate.toISOString().split('T')[0], tageUebrig: tage });
      }
    }
  });
  ustRadar.sort((a,b) => a.tageUebrig - b.tageUebrig);

  // --- NEU: FILTERUNG NUTZT NUN DEN GLOBALEN SUCHBEGRIFF ---
  const gefilterteAkten = akten.filter((akte) => {
    if (!suchbegriff.trim()) return true;

    const s = suchbegriff.toLowerCase();
    const gName = (akte.gegner_name || '').toLowerCase();
    const gAns = (akte.gegner_ansprechpartner || '').toLowerCase();
    const az = (akte.aktenzeichen || '').toLowerCase();
    const uFirma = (akte.unsere_firma || '').toLowerCase();
    const th = (akte.thema || '').toLowerCase();

    const histMatch = akte.akten_historie?.some(h => 
      (h.aktion || '').toLowerCase().includes(s) || (h.brief_entwurf || '').toLowerCase().includes(s)
    );

    return gName.includes(s) || gAns.includes(s) || az.includes(s) || uFirma.includes(s) || th.includes(s) || histMatch;
  });

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
              <button onClick={() => setShowUploadReminder(false)} style={{ padding: '12px 18px', background: theme.accent, color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}>
                Abbrechen & Dateien auswählen
              </button>
              <button onClick={speichereEintragLogik} style={{ padding: '12px 18px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}>
                Trotzdem ohne Dateien speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAGIC IMPORT & MANUELLER UPLOAD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', width: '100%' }}>
        <div style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px dashed ${theme.accent}`, transition: 'border-color 0.3s ease' }}>
          <label style={{...labelStyle, color: theme.accent, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.3s ease'}}>
            <Icon name="wand" size={18} /> MAGIC IMPORT (JSON AUS SONAR MEGA-LEGAL)
          </label>
          <textarea 
            id="magic-import"
            value={jsonImport} onChange={handleJsonImport} 
            placeholder='{"typ": "Eingang", "aktenzeichen": "...", "thema": "..."}'
            style={{ ...inputStyle, background: 'rgba(0,0,0,0.1)', border: `1px solid ${theme.accent}`, color: theme.textMain, height: '100px', fontFamily: 'monospace', fontSize: '14px', marginTop: '5px', transition: 'border-color 0.3s ease' }} 
          />
        </div>

        <div style={{ ...panelStyle, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${theme.border}` }}>
          <label style={{...labelStyle, color: theme.accent, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', transition: 'color 0.3s ease'}}>
             <Icon name="paperclip" size={16} /> MANUELLER UPLOAD (PDF/MD)
          </label>
          <input 
            id="datei-upload-manuell" 
            type="file" multiple 
            onChange={(e) => { setDateien(Array.from(e.target.files)); }} 
            style={{...inputStyle, border: `1px dashed ${theme.accent}`, cursor: 'pointer', padding: '10px', fontSize: '13px', transition: 'border-color 0.3s ease'}} 
          />
          {dateien.length > 0 && <span style={{fontSize: '13px', color: theme.accent, marginTop: '8px', fontWeight: 'bold'}}>📂 {dateien.length} Datei(en) gewählt</span>}
        </div>
      </div>

      {/* ALARME */}
      {(fristenWarnungen.length > 0 || ustRadar.length > 0) && (
        <div style={{ ...panelStyle, background: theme.warningBg, border: `1px solid ${theme.warningBorder}` }}>
          <h4 style={{ color: theme.warningText, margin: '0 0 15px 0', textAlign: 'left', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="alert" size={20} /> Dringende Alarme & Fällige Wiedervorlagen ({fristenWarnungen.length + ustRadar.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            {fristenWarnungen.map(w => {
              const zielDatum = new Date(w.aktivesDatum);
              const plusDreiDate = new Date(zielDatum);
              plusDreiDate.setDate(plusDreiDate.getDate() + 3);

              let shiftDisabled = false;
              if (w.frist_extern) {
                const originalFristDate = new Date(w.frist_extern);
                if (plusDreiDate > originalFristDate) {
                  shiftDisabled = true;
                }
              }

              const plusDreiIso = plusDreiDate.toISOString().split('T')[0];

              return (
                <div 
                  key={`warn-${w.id}`} 
                  onClick={() => handleAlarmKlick(w.akte_id)}
                  style={{ 
                    background: theme.cardItemBg, 
                    padding: '14px 18px', 
                    borderRadius: '8px', 
                    border: `1px solid ${theme.border}`,
                    borderLeft: `5px solid ${theme.warningBorder}`,
                    boxShadow: isDarkMode ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                  title="Klicken, um diese Akte unten zu fokussieren!"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '15px' }}>
                    <strong style={{ color: theme.warningBorder, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      🏢 {w.akte_gegner}
                    </strong>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          if (w.isWiedervorlage) handleInlineEdit(w.id, 'wiedervorlage', null);
                          else handleInlineEdit(w.id, 'frist_extern', null);
                        }} 
                        style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                      >
                        ✓ Erledigt
                      </button>

                      <button 
                        disabled={shiftDisabled}
                        onClick={() => {
                          if (w.isWiedervorlage) handleInlineEdit(w.id, 'wiedervorlage', plusDreiIso);
                          else handleInlineEdit(w.id, 'frist_extern', plusDreiIso);
                        }} 
                        style={{ 
                          background: shiftDisabled ? (isDarkMode ? '#334155' : '#e2e8f0') : theme.border, 
                          color: shiftDisabled ? theme.textMuted : theme.textMain, 
                          border: 'none', padding: '6px 12px', borderRadius: '4px', 
                          cursor: shiftDisabled ? 'not-allowed' : 'pointer', 
                          fontSize: '12px', fontWeight: 'bold',
                          opacity: shiftDisabled ? 0.6 : 1,
                          whiteSpace: 'nowrap'
                        }}
                        title={shiftDisabled ? "Sperre: Verschiebung um 3 Tage würde hinter der harten Originalfrist liegen!" : "Um 3 Tage verschieben"}
                      >
                        +3 Tage {shiftDisabled ? '🔒' : ''}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: theme.textMuted, flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ color: theme.textMain, fontWeight: '500' }}>📋 {w.akte_thema}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                      <span>{w.isWiedervorlage ? 'Wiedervorlage' : 'Frist'}: <strong style={{color: theme.textMain}}>{formatDatum(w.aktivesDatum)}</strong></span>
                      {w.frist_extern && w.isWiedervorlage && <span style={{fontSize: '11px', opacity: 0.8}}>(Frist: {formatDatum(w.frist_extern)})</span>}
                      
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: theme.warningBorder, color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {w.tageUebrig < 0 ? `Überfällig: ${Math.abs(w.tageUebrig)} Tage` : w.tageUebrig === 0 ? 'HEUTE FÄLLIG!' : `Noch ${w.tageUebrig} Tage`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {ustRadar.map((r, i) => (
              <div key={`ust-${i}`} style={{ background: theme.cardItemBg, padding: '12px 18px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: `5px solid ${theme.tresorAccent}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ color: theme.tresorAccent }}>🏛️ {r.firma}</strong> — <span style={{ color: theme.textMain }}>{r.bezeichnung}</span>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: theme.textMuted, marginRight: '10px' }}>Fällig am {formatDatum(r.datum)}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: theme.tresorAccent, color: '#000', fontWeight: 'bold' }}>
                    Noch {r.tageUebrig} Tage
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HAUPT-FORMULAR */}
      <form onSubmit={handleSpeichernCheck} style={panelStyle}>
        
        {tresorPrompt && (
          <div style={{ background: theme.accent, color: '#000', padding: '18px 20px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: tresorPrompt.typ === 'update' ? '12px' : '0' }}>
              <strong style={{ fontSize: '15px' }}>
                🏢 Firmen-Tresor Match: {tresorPrompt.typ === 'neu' ? `Mandant "${tresorPrompt.obj.unsere_firma}" neu anlegen?` : `Folgende Daten für "${tresorPrompt.firma}" im Tresor aktualisieren?`}
              </strong>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={handleTresorPromptAccept} style={{ background: '#000', color: theme.accent, border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Ja, {tresorPrompt.typ === 'neu' ? 'anlegen' : 'übernehmen'}
                </button>
                <button type="button" onClick={() => setTresorPrompt(null)} style={{ background: 'transparent', border: '1px solid #000', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Nein
                </button>
              </div>
            </div>

            {tresorPrompt.typ === 'update' && (
              <div style={{ background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '6px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', opacity: 0.8 }}>Erkannte Feld-Änderungen:</div>
                {Object.keys(tresorPrompt.updates).map(k => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={tresorPrompt.selectedKeys.includes(k)} 
                      onChange={() => toggleTresorUpdateKey(k)} 
                      style={{ accentColor: '#000' }}
                    />
                    <span>
                      <strong>{k}:</strong> <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{tresorPrompt.oldValues[k] || '(leer)'}</span> ➔ <strong>{tresorPrompt.updates[k]}</strong>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px', textAlign: 'left', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'neu' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="radio" checked={modus === 'neu'} onChange={() => setModus('neu')} />
            <Icon name="folder" size={16} /> Neue Akte anlegen
          </label>
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'bestehend' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="radio" checked={modus === 'bestehend'} onChange={() => setModus('bestehend')} />
            <Icon name="link" size={16} /> Zu bestehender Akte
          </label>

          {modus === 'bestehend' && (
            <div style={{ flex: '1 1 min(100%, 200px)', marginLeft: 'auto' }}>
              <select value={selectedAkteId} onChange={handleAkteAuswahl} required style={{...inputStyle, padding: '8px', fontSize: '13px'}}>
                <option value="">-- Ziel-Akte wählen --</option>
                {akten.map(a => <option key={a.id} value={a.id}> {a.gegner_name} | {a.thema}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}>
          {modus === 'neu' && (
            <>
              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                  <h4 style={{margin: 0, color: theme.textMain}}>1. Gegenpartei / Behörde</h4>
                  {gegnerListe.length > 0 && (
                    <select onChange={handleGegnerAuswahl} style={{padding: '4px 8px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '12px', background: theme.inputBg, color: theme.textMain}}>
                      <option value="">+ Aus Gegner-CRM laden...</option>
                      {gegnerListe.map(g => {
                        let ansList = [];
                        try {
                          const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen;
                          if (Array.isArray(parsed)) ansList = parsed;
                        } catch(e){}
                        
                        if (ansList.length > 0) {
                          return ansList.map((ans, idx) => (
                            <option key={`${g.id}-${idx}`} value={`${g.id}|${idx}`}>
                              {g.name} — {ans.abteilung ? `${ans.abteilung}: ` : ''}{ans.name || 'Zentrale'}
                            </option>
                          ));
                        }
                        return <option key={g.id} value={`${g.id}|0`}>{g.name}</option>;
                      })}
                    </select>
                  )}
                </div>
              </div>
              <div><label style={labelStyle}>Behörde / Gegner*</label><input type="text" value={gegnerName} onChange={(e) => setGegnerName(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={gegnerAnsprechpartner} onChange={(e) => setGegnerAnsprechpartner(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Telefon</label><input type="text" value={gegnerTelefon} onChange={(e) => setGegnerTelefon(e.target.value)} style={inputStyle} /></div>
              
              <div><label style={labelStyle}>Faxnummer</label><input type="text" value={gegnerFax} onChange={(e) => setGegnerFax(e.target.value)} style={inputStyle} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>E-Mail</label><input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} style={inputStyle} /></div>
              
              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                  <h4 style={{margin: 0, color: theme.textMain}}>2. Wir (Mandant)</h4>
                  {mandanten.length > 0 && (
                    <select onChange={handleTresorAuswahl} style={{padding: '4px 8px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '12px', background: theme.inputBg, color: theme.textMain}}>
                      <option value="">+ Aus Firmen-Tresor laden...</option>
                      {mandanten.map(m => <option key={m.id} value={m.id}>{m.firmenname}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <div><label style={labelStyle}>Firma / Person*</label><input type="text" value={unsereFirma} onChange={(e) => setUnsereFirma(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={unserAnsprechpartner} onChange={(e) => setUnserAnsprechpartner(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>E-Mail (Mandant)</label><input type="email" value={unserEmail} onChange={(e) => setUnserEmail(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Telefon (Mandant)</label><input type="text" value={unserTelefon} onChange={(e) => setUnserTelefon(e.target.value)} style={inputStyle} /></div>
              
              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}><h4 style={h4StyleAkten}>3. Akten-Stammdaten</h4></div>
              <div><label style={labelStyle}>Thema / Betreff*</label><input type="text" value={thema} onChange={(e) => setThema(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Aktenzeichen</label><input type="text" value={aktenzeichen} onChange={(e) => setAktenzeichen(e.target.value)} style={inputStyle} /></div>
            </>
          )}

          <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}><h4 style={h4StyleAkten}>Dokument-Eintrag</h4></div>
          <div>
            <label style={labelStyle}>Typ*</label>
            <select value={typ} onChange={(e) => setTyp(e.target.value)} style={inputStyle}>
              <option value="Eingang">Eingang</option>
              <option value="Ausgang">Ausgang</option>
              <option value="Intern">Intern</option>
            </select>
          </div>
          <div><label style={labelStyle}>Datum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>Frist (Behörde)</label><input type="date" value={fristExtern} onChange={(e) => setFristExtern(e.target.value)} style={inputStyle} /></div>
          
          <div>
            <label style={labelStyle}>WV (Intern)</label>
            <input type="date" value={wiedervorlage} onChange={(e) => setWiedervorlage(e.target.value)} style={inputStyle} />
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setzeWV(3)} style={quickBtnStyle}>+3T</button>
              <button type="button" onClick={() => setzeWV(7)} style={quickBtnStyle}>+1W</button>
              <button type="button" onClick={() => setzeWV(14)} style={quickBtnStyle}>+2W</button>
              <button type="button" onClick={() => setzeWV(0, 1)} style={quickBtnStyle}>+1M</button>
            </div>
          </div>
        </div>

        <div style={{ background: theme.inputBg, padding: '20px', border: `1px solid ${theme.border}`, borderRadius: '8px', marginTop: '25px', textAlign: 'left' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '15px', marginBottom: '20px', padding: '15px', background: theme.cardBg, borderRadius: '8px', border: `1px dashed ${theme.border}` }}>
            <div>
              <label style={{...labelStyle, color: theme.textMain}}>Versand-E-Mail (Gegner)</label>
              <input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} placeholder="z.B. poststelle@..." style={{...inputStyle, padding: '8px'}} />
            </div>
            <div>
              <label style={{...labelStyle, color: theme.textMain}}>Versand-Faxnummer (Gegner)</label>
              <input type="text" value={gegnerFax} onChange={(e) => setGegnerFax(e.target.value)} placeholder="z.B. 0351 123456" style={{...inputStyle, padding: '8px'}} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{...labelStyle, color: theme.accent, margin: 0}}>
              <Icon name="file" size={16} /> Textentwurf / Schreiben verfassen
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => handleResendVersand('email')} style={{ background: theme.accent, color: isDarkMode ? '#000' : '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="send" size={14} /> E-Mail senden (Resend)
              </button>
              <button type="button" onClick={() => handleResendVersand('fax')} style={{ background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Icon name="phone" size={14} /> E-Fax senden (Simple-Fax)
              </button>
            </div>
          </div>

          <textarea 
            value={briefEntwurf} 
            onChange={(e) => setBriefEntwurf(e.target.value)} 
            placeholder="Trage hier deinen Brief- oder E-Mail-Text ein..."
            style={{ ...inputStyle, minHeight: '180px', fontFamily: 'monospace', background: 'transparent' }} 
          />
          
          {versandPdfUrl && (
            <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', color: '#10b981', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="check" size={16} /> Versand-PDF generiert & verschickt! Vergiss nicht, unten auf "+ In Akte abheften" zu klicken.
            </div>
          )}
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
      </div>

      <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', textAlign: 'left', background: theme.cardBg }}>
        {gefilterteAkten.map((akte) => {
          const isExpanded = aufgeklappteAkten.includes(akte.id);
          const letzteAktion = akte.akten_historie && akte.akten_historie.length > 0 ? akte.akten_historie[0] : null;
          const istFokussiert = (fokussierteAkteId === akte.id);

          return (
            <div 
              id={`akte-karte-${akte.id}`} 
              key={akte.id} 
              style={{ 
                borderBottom: `1px solid ${theme.border}`,
                background: istFokussiert ? (isDarkMode ? 'rgba(0, 229, 255, 0.12)' : '#e0f2fe') : 'transparent',
                borderLeft: istFokussiert ? `6px solid ${theme.accent}` : '6px solid transparent',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', cursor: 'pointer', flexWrap: 'wrap', gap: '10px' }} onClick={() => toggleAkte(akte.id)}>
                <div style={{ width: '30px', color: istFokussiert ? theme.accent : theme.textMuted }}><Icon name={isExpanded ? 'down' : 'right'} size={20} /></div>
                <div style={{ flex: '1 1 min(100%, 200px)' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>
                    {akte.gegner_name}
                    {akte.vorgaenger_gegner && <span style={{fontSize: '11px', color: theme.textMuted, marginLeft: '8px'}}>(vormals: {akte.vorgaenger_gegner})</span>}
                    {istFokussiert && <span style={{marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: theme.accent, color: '#000', fontWeight: 'bold'}}>🎯 AUSGEWÄHLT</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>AZ: {akte.aktenzeichen || '-'}</div>
                </div>
                <div style={{ flex: '1 1 min(100%, 200px)' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>{akte.thema}</div>
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>Letzter Eintrag: {letzteAktion ? `${formatDatum(letzteAktion.datum)} - ${letzteAktion.aktion}` : '-'}</div>
                </div>
                <div style={{ flex: '1 1 100px', textAlign: 'right' }}>
                  {akte.status === 'Erledigt' ? <span style={{ background: theme.border, padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>Erledigt</span> : <span style={{ background: istFokussiert ? theme.accent : theme.border, color: istFokussiert ? '#000' : theme.textMain, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>Offen</span>}
                </div>
              </div>

              {isExpanded && (
                <div style={{ background: theme.inputBg, padding: '20px', borderTop: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.cardBg, padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${theme.border}`, flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '13px' }}>
                      <strong>Aktuelle Behörde / Gegner:</strong> {akte.gegner_name}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => toggleAkteStatus(akte.id, akte.status)} style={{ background: akte.status === 'Erledigt' ? 'transparent' : '#10b981', color: akte.status === 'Erledigt' ? theme.textMain : '#ffffff', border: akte.status === 'Erledigt' ? `1px solid ${theme.border}` : 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name={akte.status === 'Erledigt' ? 'refresh' : 'check'} size={14} /> {akte.status === 'Erledigt' ? 'Akte wieder öffnen' : 'Akte abschließen'}
                      </button>
                      <button onClick={() => loescheAkte(akte.id)} style={{ background: 'transparent', color: theme.warningBorder, border: `1px solid ${theme.warningBorder}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="trash" size={14} /> Akte löschen
                      </button>
                      <button onClick={() => druckeAkte(akte)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="print" size={14} /> Akte exportieren / drucken
                      </button>

                      {mergeSourceId === akte.id ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)} style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', width: '220px' }}>
                            <option value="">-- Ziel-Akte wählen --</option>
                            {akten.filter(a => a.id !== akte.id).map(a => (<option key={a.id} value={a.id}> {a.gegner_name} | {a.thema}</option>))}
                          </select>
                          <button onClick={() => mergeAkte(akte.id)} style={{ background: theme.accent, color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Merge bestätigen</button>
                          <button onClick={() => { setMergeSourceId(null); setMergeTargetId(''); }} style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Abbrechen</button>
                        </div>
                      ) : (
                        <button onClick={() => setMergeSourceId(akte.id)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Icon name="link" size={14} /> Akte zusammenführen (Merge)
                        </button>
                      )}

                      {transferAkteId === akte.id ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <input type="text" placeholder="Neuer Gegner (z.B. Landesdirektion)" value={neuerGegnerName} onChange={(e) => setNeuerGegnerName(e.target.value)} style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', width: '260px' }} />
                          <button onClick={() => naechsterGegnerUebergeben(akte.id)} style={{ background: theme.accent, color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Übergabe bestätigen</button>
                          <button onClick={() => setTransferAkteId(null)} style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Abbrechen</button>
                        </div>
                      ) : (
                        <button onClick={() => setTransferAkteId(akte.id)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Icon name="swap" size={14} /> Zuständigkeit / Gegner übertragen
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', width: '100%', borderRadius: '8px' }}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '13px', background: theme.cardBg, overflow: 'hidden' }}>
                      <thead>
                        <tr style={{ background: theme.border, color: theme.textMain }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Typ</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Datum</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Aktion</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>WV / Frist</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Dokumente</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {akte.akten_historie.map((hist) => (
                          <tr key={hist.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            {/* --- FIX: Harte Zuweisung von theme.textMain für optimale Lesbarkeit im Light Mode --- */}
                            <td style={{ padding: '10px', fontWeight: 'bold', color: theme.textMain }}>{hist.typ}</td>
                            <td style={{ padding: '10px', color: theme.textMain }}>{formatDatum(hist.datum)}</td>
                            <td style={{ padding: '10px', color: theme.textMain }}>{hist.aktion}</td>
                            
                            <td style={{ padding: '10px', color: theme.warningBorder }}>{hist.wiedervorlage ? `WV: ${formatDatum(hist.wiedervorlage)}` : (hist.frist_extern ? `Frist: ${formatDatum(hist.frist_extern)}` : '-')}</td>
                            <td style={{ padding: '10px' }}>
                              {hist.dokument_url && hist.dokument_url.split(',').map((url, idx) => {
                                const fileName = extractFilename(url);
                                return (
                                  <div key={idx} onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'stretch', background: theme.border, borderRadius: '6px', marginRight: '6px', marginBottom: '6px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', color: theme.textMain, background: 'rgba(0,0,0,0.1)' }} title={fileName}>
                                      <Icon name="file" size={12} /> {fileName.length > 18 ? fileName.substring(0, 15) + '...' : fileName}
                                    </a>
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); loescheDateiAusHistorie(hist.id, hist.dokument_url, url); }} style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 6px', cursor: 'pointer', color: theme.textMuted }} title="Datei löschen"><Icon name="x" size={12} /></button>
                                  </div>
                                )
                              })}
                              
                              {uploadingHistId === hist.id ? (
                                <span style={{ fontSize: '11px', color: theme.accent }}>⏳ Upload...</span>
                              ) : (
                                <label style={{ cursor: 'pointer', fontSize: '11px', background: 'transparent', padding: '2px 6px', borderRadius: '4px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', color: theme.textMuted, marginLeft: '4px' }} title="Datei nachträglich an diesen Vorgang anhängen">
                                  + Datei
                                  <input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUploadAkte(hist.id, hist.dokument_url, akte.unsere_firma, akte.gegner_name, e)} />
                                </label>
                              )}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>
                              <button onClick={() => loescheHistorieEintrag(hist.id)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer' }}>
                                <Icon name="trash" size={14} />
                              </button>
                            </td>
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