import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub } from './utils';

// --- PDF.js Import für die clientseitige Extraktion ---
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function Wissensspeicher({ theme, wissenEintraege, mandanten, gegnerListe, ladeDaten, showToast, suchbegriff }) {
  const [laedt, setLaedt] = useState(false);
  const [bulkDateien, setBulkDateien] = useState([]);
  const [bulkFirma, setBulkFirma] = useState('');
  const [bulkStatus, setBulkStatus] = useState(null);
  const [wissenFirmaFilter, setWissenFirmaFilter] = useState('');
  const [wissenGegnerFilter, setWissenGegnerFilter] = useState('');
  const [wissenAnzeigeModus, setWissenAnzeigeModus] = useState('md');
  const [githubFiles, setGithubFiles] = useState([]);
  const [loadingGithub, setLoadingGithub] = useState(false);

  // --- RESPONSIVE STATE FÜR MOBILE CARD-ANSICHT ---
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Initialer Check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word' };

  const fetchGithubFiles = async () => {
    setLoadingGithub(true);
    try {
      const { data, error } = await supabase.functions.invoke('github-sync', {
        body: { action: 'list' },
        headers: { 'Content-Type': 'application/json' }
      });
      if (error) throw error;
      if (data && data.success) {
        const mdFiles = data.files.filter(f => f.name.toLowerCase().endsWith('.md'));
        setGithubFiles(mdFiles);
      }
    } catch (err) {
      console.error("Fehler beim Laden der GitHub-Dateien:", err);
      showToast("❌ Fehler beim Laden der MD-Dateien aus GitHub.", 'error');
    }
    setLoadingGithub(false);
  };

  useEffect(() => {
    if (wissenAnzeigeModus === 'md') {
      fetchGithubFiles();
    }
  }, [wissenAnzeigeModus]);

  // --- HILFSFUNKTIONEN FÜR KI UND EXTRAKTION ---
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

  const holeKiDateiname = async (text, originalName) => {
    // HIER IST DER CACHE-BUSTER FÜR STACKBLITZ:
    const apiKey = import.meta.env.VITE_GEMINI_KEY_LIVE;
    if (!apiKey) throw new Error("VITE_GEMINI_KEY_LIVE fehlt in der .env Datei");

    const systemPrompt = `Du bist ein hochpräziser Assistent zur Dateibenennung.
Analysiere den folgenden OCR-Text eines eingescannten Dokuments und extrahiere die benötigten Werte, um EXAKT folgendes Dateinamen-Format zu generieren:
"YYYYMMDD-absender-empfaenger-betreff"

Befolge diese STRIKTEN REGELN:
1. Datum: Finde das Datum des Schreibens und formatiere es als YYYYMMDD (z.B. 20260806). KEINE Bindestriche im Datum. Findest du keins, nimm 00000000.
2. Absender (Verfasser): Wer hat das Dokument verfasst/gesendet?
3. Empfänger: An wen ist das Dokument gerichtet?
4. Betreff: Finde den exakten Betreff (Achte auf "Betrifft:", "Betreff:" oder "Unser Zeichen"). Fasse ihn in wenigen Worten zusammen.

5. ZWINGENDE ABKÜRZUNGEN (Ersetze diese Namen IMMER durch die folgenden Kürzel):
   - "Wilsdorf & Sommer GmbH" WIRD ZU "wus"
   - "SmartBizz Services UG (haftungsbeschränkt)" WIRD ZU "sbs"
   - "Jens Wilsdorf" WIRD ZU "jw"
   - "Alexander und Jens Wilsdorf" WIRD ZU "wir"

6. FORMATIERUNG DES DATEINAMENS:
   - Zwingende Reihenfolge: Datum-Absender-Empfänger-Betreff
   - Trenne die Blöcke und Worte NUR mit Bindestrichen (-).
   - Ersetze ALLE Leerzeichen durch Bindestriche.
   - Wandle den GESAMTEN Dateinamen in Kleinbuchstaben um (z.B. "deutschepost", "wus").
   - Entferne ALLE Sonderzeichen und Anführungszeichen. Nutze KEINE doppelten oder einfachen Anführungszeichen im Dateinamen.
   - Hänge KEINE Dateiendung (.pdf/.md) an.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt in exakt diesem Format: {"newName": "dein_generierter_dateiname"}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nOriginaler Dateiname: ${originalName}\n\nOCR-Text:\n${text}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      })
    });

    if (!response.ok) throw new Error(`Gemini API Fehler: ${response.statusText}`);
    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    const match = resultText.match(/"newName"\s*:\s*"([^"]+)"/);
    if (!match || !match[1]) throw new Error("Regex-Extraktion fehlgeschlagen.");
    return match[1];
  };

  // --- HAUPT-IMPORT FUNKTION MIT KI ---
  const StarteBulkImport = async (e) => {
    e.preventDefault();
    if (!bulkDateien || bulkDateien.length === 0) {
      showToast("Bitte wähle zuerst mindestens eine Datei aus!", 'warning');
      return;
    }

    setLaedt(true);
    const gesamt = bulkDateien.length;
    let currentStep = 0;
    
    // Mapping-Objekt, um Paare (PDF & MD) wiederzufinden
    const nameMapping = {}; 

    // Sortiere Dateien in MD und den Rest (PDFs / Bilder)
    const mdFiles = bulkDateien.filter(f => f.name.toLowerCase().endsWith('.md'));
    const nonMdFiles = bulkDateien.filter(f => !f.name.toLowerCase().endsWith('.md'));

    // 1. DURCHLAUF: Zuerst alle MD-Dateien analysieren und KI-Namen generieren
    for (const file of mdFiles) {
      currentStep++;
      setBulkStatus({ fortschritt: currentStep, gesamt: gesamt, text: `KI-Analyse (MD): ${file.name}...` });
      
      try {
        const originalBaseName = file.name.substring(0, file.name.lastIndexOf('.'));
        const mdInhalt = await file.text();
        const finalDbText = mdInhalt.substring(0, 3000);

        let kiName = originalBaseName.replace(/[^a-zA-Z0-9.-]/g, '_'); // Fallback Name
        
        try {
          const fetchedKiName = await holeKiDateiname(finalDbText, file.name);
          kiName = fetchedKiName.replace(/[^a-zA-Z0-9.-]/g, '-');
          nameMapping[originalBaseName] = kiName; // Merken für evtl. passendes PDF
        } catch (kiErr) {
          console.error(`KI Fehler bei ${file.name}:`, kiErr);
          showToast(`⚠️ KI-Generierung für ${file.name} fehlgeschlagen. Nutze Originalname.`, 'warning');
        }

        const newFileName = `${kiName}.md`;

        await supabase.from('wissensdatenbank').insert([{
          datei_name: newFileName,
          firma: bulkFirma || 'Allgemein',
          inhalt_text: finalDbText,
          dokument_url: null
        }]);

        await syncToGithub(newFileName, mdInhalt, null, null, showToast);
      } catch (err) {
        console.error("Import-Fehler bei MD File:", file.name, err);
      }
    }

    // 2. DURCHLAUF: Alle PDFs / Sonstige hochladen
    for (const file of nonMdFiles) {
      currentStep++;
      setBulkStatus({ fortschritt: currentStep, gesamt: gesamt, text: `Verarbeite (PDF/Sonstiges): ${file.name}...` });

      try {
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const originalBaseName = file.name.substring(0, file.name.lastIndexOf('.'));
        let finalBaseName = nameMapping[originalBaseName]; // Prüfen, ob wir in Lauf 1 schon einen Namen haben
        
        let extrahierterText = '';
        let hasGeneratedMd = false;

        // Wenn es eine nackte PDF ohne MD-Gegenstück ist
        if (!finalBaseName && isPdf) {
           setBulkStatus({ fortschritt: currentStep, gesamt: gesamt, text: `Lese nacktes PDF aus: ${file.name}...` });
           try {
               extrahierterText = await extractTextFromPDF(file);
               if (extrahierterText.trim().length > 50) {
                  const fetchedKiName = await holeKiDateiname(extrahierterText.substring(0, 3000), file.name);
                  finalBaseName = fetchedKiName.replace(/[^a-zA-Z0-9.-]/g, '-');
                  hasGeneratedMd = true; // Wir müssen danach das MD nachbauen
               } else {
                  finalBaseName = originalBaseName.replace(/[^a-zA-Z0-9.-]/g, '_');
               }
           } catch (pdfErr) {
               console.error("Fehler bei PDF Extraktion:", pdfErr);
               finalBaseName = originalBaseName.replace(/[^a-zA-Z0-9.-]/g, '_');
           }
        } else if (!finalBaseName) {
           // Weder MD noch PDF (z.B. Bilder)
           finalBaseName = originalBaseName.replace(/[^a-zA-Z0-9.-]/g, '_');
        }

        const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
        const newFileName = `${finalBaseName}${fileExtension}`;
        const storagePath = `wissen_${Date.now()}_${newFileName}`;
        
        const { error: uploadError } = await supabase.storage.from('dokumente').upload(storagePath, file);

        if (!uploadError) {
          const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(storagePath);
          const pubUrl = linkData.publicUrl;

          await supabase.from('wissensdatenbank').insert([{
            datei_name: newFileName,
            firma: bulkFirma || 'Allgemein',
            inhalt_text: hasGeneratedMd ? extrahierterText.substring(0, 3000) : `Dokument: ${newFileName}\n(PDF/Bilddatei - Kein separates MD vorhanden)`,
            dokument_url: pubUrl
          }]);

          // Fehlendes MD-Gegenstück generieren und ins GitHub schieben
          if (hasGeneratedMd) {
             const mdFileName = `${finalBaseName}.md`;
             const mdContent = `Upload via Wissensspeicher.\nOriginal-PDF: ${pubUrl}\n\n${extrahierterText}`;
             
             await supabase.from('wissensdatenbank').insert([{
                datei_name: mdFileName,
                firma: bulkFirma || 'Allgemein',
                inhalt_text: extrahierterText.substring(0, 3000),
                dokument_url: pubUrl
             }]);
             await syncToGithub(mdFileName, mdContent, pubUrl, null, showToast);
          }
        }
      } catch (err) {
        console.error("Import-Fehler bei File:", file.name, err);
      }
    }

    setBulkStatus(null);
    setBulkDateien([]);
    setLaedt(false);
    setTimeout(() => { ladeDaten(); if(wissenAnzeigeModus === 'md') fetchGithubFiles(); }, 300);
    if (document.getElementById('bulk-file-input')) document.getElementById('bulk-file-input').value = '';
    showToast(`✅ KI-Upload abgeschlossen! Dateien wurden analysiert und umbenannt.`, 'success');
  };

  const loescheWissenEintrag = async (id) => {
    if (!window.confirm("Diesen PDF-Eintrag aus dem Speicher entfernen?")) return;
    await supabase.from('wissensdatenbank').delete().eq('id', id);
    showToast(`✅ PDF-Eintrag gelöscht!`, 'success');
    ladeDaten();
  };

  const gefilterteWissenEintraege = wissenEintraege.filter(w => {
    const matchSuche = !suchbegriff.trim() ||
      (w.datei_name || '').toLowerCase().includes(suchbegriff.toLowerCase()) ||
      (w.firma || '').toLowerCase().includes(suchbegriff.toLowerCase()) ||
      (w.inhalt_text || '').toLowerCase().includes(suchbegriff.toLowerCase());
    const matchFirma = !wissenFirmaFilter || w.firma === wissenFirmaFilter;
    const matchGegner = !wissenGegnerFilter || (w.inhalt_text || '').toLowerCase().includes(wissenGegnerFilter.toLowerCase());
    const isMd = w.datei_name && w.datei_name.toLowerCase().endsWith('.md');
    return matchSuche && matchFirma && matchGegner && !isMd;
  });

  const gefilterteGithubFiles = githubFiles.filter(f =>
    !suchbegriff.trim() || f.name.toLowerCase().includes(suchbegriff.toLowerCase())
  );

  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
        <Icon name="brain" size={24} style={{ color: theme.wissenAccent }} /> Alt-Dokumente & Wissensbasis importieren
      </h2>

      <form onSubmit={StarteBulkImport} style={{ ...panelStyle, marginBottom: '30px', border: `1px solid ${theme.wissenAccent}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '20px', textAlign: 'left' }}>
          <div>
            <label style={labelStyle}>Firma / Zuordnung (Optional)</label>
            <select value={bulkFirma} onChange={(e) => setBulkFirma(e.target.value)} style={inputStyle}>
              <option value="">-- Allgemein / Firmenübergreifend --</option>
              {mandanten.map(m => <option key={m.id} value={m.firmenname}>{m.firmenname}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Dokumente wählen (.md und .pdf Dateien gleichzeitig markieren)*</label>
            <input
              id="bulk-file-input"
              type="file"
              multiple
              onChange={(e) => setBulkDateien(Array.from(e.target.files))}
              style={{ ...inputStyle, border: `2px dashed ${theme.wissenAccent}`, padding: '15px', cursor: 'pointer' }}
            />
            {bulkDateien.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: theme.wissenAccent, fontWeight: 'bold' }}>
                📂 {bulkDateien.length} Datei(en) ausgewählt und bereit zum Import!
              </div>
            )}
          </div>
        </div>

        {bulkStatus && (
          <div style={{ marginTop: '20px', padding: '12px', background: theme.wissenBg, border: `1px solid ${theme.wissenAccent}`, borderRadius: '6px', color: theme.textMain, fontSize: '13px', textAlign: 'left' }}>
            <strong>⏳ Import läuft:</strong> {bulkStatus.text} ({bulkStatus.fortschritt} von {bulkStatus.gesamt})
          </div>
        )}

        <button
          disabled={laedt}
          type="submit"
          style={{ padding: '14px', background: theme.wissenAccent, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', width: '100%', marginTop: '20px' }}>
          {laedt ? 'Importiere...' : `+ ${bulkDateien.length > 0 ? bulkDateien.length : ''} Datei(en) in den KI-Speicher laden`}
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: '0', color: theme.textMain, textAlign: 'left' }}>
          📚 Indizierte Dokumente ({wissenAnzeigeModus === 'md' ? githubFiles.length : gefilterteWissenEintraege.length})
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={(e) => { e.preventDefault(); setWissenAnzeigeModus('md'); }}
            style={{
              background: wissenAnzeigeModus === 'md' ? theme.wissenAccent : 'transparent',
              color: wissenAnzeigeModus === 'md' ? '#fff' : theme.textMain,
              border: `1px solid ${theme.wissenAccent}`,
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px'
            }}>
            MD Datenbank
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setWissenAnzeigeModus('pdf'); }}
            style={{
              background: wissenAnzeigeModus === 'pdf' ? theme.wissenAccent : 'transparent',
              color: wissenAnzeigeModus === 'pdf' ? '#fff' : theme.textMain,
              border: `1px solid ${theme.wissenAccent}`,
              padding: '6px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px'
            }}>
            PDF Datenbank
          </button>
        </div>
      </div>
      
      {wissenAnzeigeModus === 'pdf' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 min(100%, 150px)' }}>
            <select
              value={wissenFirmaFilter}
              onChange={(e) => setWissenFirmaFilter(e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '13px' }}
            >
              <option value="">Alle Mandanten</option>
              <option value="Allgemein">Allgemein (Ohne Mandant)</option>
              {mandanten.map(m => <option key={m.id} value={m.firmenname}>{m.firmenname}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 min(100%, 150px)' }}>
            <select
              value={wissenGegnerFilter}
              onChange={(e) => setWissenGegnerFilter(e.target.value)}
              style={{ ...inputStyle, padding: '10px', fontSize: '13px' }}
            >
              <option value="">Alle Gegner / Behörden</option>
              {gegnerListe.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* --- DESKTOP ODER MOBILE LAYOUT LOGIK --- */}
      <div style={{ borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.cardBg, overflow: 'hidden' }}>
        
        {!isMobile ? (
          /* --- DESKTOP TABELLE (Unverändert) --- */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: theme.border, color: theme.textMain }}>
                  <th style={{ padding: '12px 15px' }}>Dokument / Datei</th>
                  <th style={{ padding: '12px 15px' }}>{wissenAnzeigeModus === 'pdf' ? 'Zugeordnete Firma' : 'Status / Herkunft'}</th>
                  <th style={{ padding: '12px 15px', textAlign: 'center', width: '80px' }}>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {wissenAnzeigeModus === 'md' ? (
                  loadingGithub ? (
                    <tr>
                      <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>
                        Lade Live-Daten aus GitHub... ⏳
                      </td>
                    </tr>
                  ) : gefilterteGithubFiles.length > 0 ? (
                    gefilterteGithubFiles.map(file => (
                      <tr key={file.sha} style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }}>
                        <td style={{ padding: '12px 15px' }}>
                          <a href={file.html_url || file.download_url} target="_blank" rel="noreferrer" style={{ color: theme.wissenAccent, textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon name="file" size={14} /> {file.name}
                          </a>
                        </td>
                        <td style={{ padding: '12px 15px', color: theme.textMuted }}>Live aus GitHub Repo geladen</td>
                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                          <button onClick={async () => {
                            if(!window.confirm("MD-Datei dauerhaft aus GitHub löschen?")) return;
                            await syncToGithub(file.name, null, null, 'delete', showToast);
                            fetchGithubFiles();
                          }} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '4px' }} title="Eintrag löschen">
                            <Icon name="trash" size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>
                        Keine MD-Dateien gefunden.
                      </td>
                    </tr>
                  )
                ) : (
                  gefilterteWissenEintraege.slice(0, 20).length > 0 ? (
                    gefilterteWissenEintraege.slice(0, 20).map(w => (
                      <tr key={w.id} style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }}>
                        <td style={{ padding: '12px 15px' }}>
                          {w.dokument_url ? (
                            <a href={w.dokument_url} target="_blank" rel="noreferrer" style={{ color: theme.wissenAccent, textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon name="file" size={14} /> {w.datei_name}
                            </a>
                          ) : (
                            <span style={{ fontWeight: 'bold', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon name="file" size={14} /> {w.datei_name}
                            </span>
                          )}
                          {w.inhalt_text && (
                            <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}>
                              {w.inhalt_text.length > 80 ? w.inhalt_text.substring(0, 80) + '...' : w.inhalt_text}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 15px', color: theme.textMain }}>{w.firma || 'Allgemein'}</td>
                        <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                          <button onClick={() => loescheWissenEintrag(w.id)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '4px' }} title="Eintrag löschen">
                            <Icon name="trash" size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>
                        Keine PDF-Dokumente für diese Filterung gefunden.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* --- MOBILE KACHEL-ANSICHT (Responsive Card Layout) --- */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {wissenAnzeigeModus === 'md' ? (
              loadingGithub ? (
                <div style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>Lade Live-Daten aus GitHub... ⏳</div>
              ) : gefilterteGithubFiles.length > 0 ? (
                gefilterteGithubFiles.map(file => (
                  <div key={file.sha} style={{ padding: '15px', borderBottom: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {/* Dateiname mit CSS Trimming */}
                    <a href={file.html_url || file.download_url} target="_blank" rel="noreferrer" title={file.name} style={{ color: theme.wissenAccent, textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
                      <div style={{ flexShrink: 0, display: 'flex' }}><Icon name="file" size={14} /></div>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
                        {file.name}
                      </span>
                    </a>
                    
                    {/* Untere Zeile: Info und Löschen */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: theme.textMuted }}>Live aus GitHub</span>
                      <button onClick={async () => {
                        if(!window.confirm("MD-Datei dauerhaft aus GitHub löschen?")) return;
                        await syncToGithub(file.name, null, null, 'delete', showToast);
                        fetchGithubFiles();
                      }} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '4px' }} title="Eintrag löschen">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>Keine MD-Dateien gefunden.</div>
              )
            ) : (
              gefilterteWissenEintraege.slice(0, 20).length > 0 ? (
                gefilterteWissenEintraege.slice(0, 20).map(w => (
                  <div key={w.id} style={{ padding: '15px', borderBottom: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {/* Dateiname mit CSS Trimming */}
                    {w.dokument_url ? (
                      <a href={w.dokument_url} target="_blank" rel="noreferrer" title={w.datei_name} style={{ color: theme.wissenAccent, textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
                        <div style={{ flexShrink: 0, display: 'flex' }}><Icon name="file" size={14} /></div>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
                          {w.datei_name}
                        </span>
                      </a>
                    ) : (
                      <span title={w.datei_name} style={{ fontWeight: 'bold', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
                        <div style={{ flexShrink: 0, display: 'flex' }}><Icon name="file" size={14} /></div>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
                          {w.datei_name}
                        </span>
                      </span>
                    )}

                    {w.inhalt_text && (
                      <div style={{ fontSize: '11px', color: theme.textMuted, lineHeight: '1.4' }}>
                        {w.inhalt_text.length > 80 ? w.inhalt_text.substring(0, 80) + '...' : w.inhalt_text}
                      </div>
                    )}
                    
                    {/* Untere Zeile: Firma und Löschen */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: theme.textMain, fontWeight: '500' }}>{w.firma || 'Allgemein'}</span>
                      <button onClick={() => loescheWissenEintrag(w.id)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '4px' }} title="Eintrag löschen">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>Keine PDF-Dokumente für diese Filterung gefunden.</div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}