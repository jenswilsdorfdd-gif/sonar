import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';

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

  // --- HILFSFUNKTIONEN FÜR EXTRAKTION ---
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

  // --- VORSCHAU FÜR TEXT-EINTRÄGE OHNE DIREKTE STORAGE-URL ---
  const oeffneTextVorschau = (eintrag) => {
    const textContent = eintrag.inhalt_text || 'Kein Textinhalt hinterlegt.';
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  };

  // --- HAUPT-IMPORT FUNKTION (100% SUPABASE TWIN-STORAGE & MULTI-TENANT) ---
  const StarteBulkImport = async (e) => {
    e.preventDefault();
    if (!bulkDateien || bulkDateien.length === 0) {
      showToast("Bitte wähle zuerst mindestens eine Datei aus!", 'warning');
      return;
    }

    setLaedt(true);
    const gesamt = bulkDateien.length;
    let currentStep = 0;
    const timestamp = Date.now();
    
    // Sortiere Dateien in MD und den Rest (PDFs / Bilder)
    const mdFiles = bulkDateien.filter(f => f.name.toLowerCase().endsWith('.md'));
    const nonMdFiles = bulkDateien.filter(f => !f.name.toLowerCase().endsWith('.md'));

    // 1. DURCHLAUF: Alle fertigen MD-Dateien direkt in Supabase Storage & wissensdatenbank laden
    for (const file of mdFiles) {
      currentStep++;
      setBulkStatus({ fortschritt: currentStep, gesamt: gesamt, text: `Importiere (MD): ${file.name}...` });
      
      try {
        const originalBaseName = file.name.substring(0, file.name.lastIndexOf('.'));
        const safeName = originalBaseName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const mdInhalt = await file.text();
        const finalDbText = mdInhalt.substring(0, 3000);
        const newFileName = `${safeName}.md`;
        const storagePath = `wissen_${timestamp}_${newFileName}`;

        let mdPublicUrl = null;
        const mdBlob = new Blob([mdInhalt], { type: 'text/markdown;charset=utf-8' });
        const { error: mdUploadError } = await supabase.storage
          .from('dokumente')
          .upload(storagePath, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });

        if (!mdUploadError) {
          const { data: mdLinkData } = supabase.storage.from('dokumente').getPublicUrl(storagePath);
          mdPublicUrl = mdLinkData?.publicUrl || null;
        }

        await supabase.from('wissensdatenbank').insert([{
          datei_name: newFileName,
          firma: bulkFirma || 'Allgemein',
          inhalt_text: finalDbText,
          dokument_url: mdPublicUrl
        }]);
      } catch (err) {
        console.error("Import-Fehler bei MD File:", file.name, err);
      }
    }

    // 2. DURCHLAUF: Alle PDFs / Sonstige in Supabase Storage & wissensdatenbank laden
    for (const file of nonMdFiles) {
      currentStep++;
      setBulkStatus({ fortschritt: currentStep, gesamt: gesamt, text: `Verarbeite (PDF/Sonstiges): ${file.name}...` });

      try {
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const originalBaseName = file.name.substring(0, file.name.lastIndexOf('.'));
        let finalBaseName = originalBaseName.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        let extrahierterText = '';
        let needsMdGeneration = false;

        // Prüfen, ob wir das PDF lokal auslesen müssen (weil keine fertige MD vom Scanner kam)
        if (isPdf) {
           const hasMatchingMd = mdFiles.some(md => md.name.substring(0, md.name.lastIndexOf('.')).replace(/[^a-zA-Z0-9.-]/g, '_') === finalBaseName);
           if (!hasMatchingMd) {
             setBulkStatus({ fortschritt: currentStep, gesamt: gesamt, text: `Lese lokales PDF aus: ${file.name}...` });
             try {
                 extrahierterText = await extractTextFromPDF(file);
                 if (extrahierterText.trim().length > 50) {
                    needsMdGeneration = true;
                 }
             } catch (pdfErr) {
                 console.error("Fehler bei lokaler PDF Extraktion:", pdfErr);
             }
           }
        }

        const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
        const newFileName = `${finalBaseName}${fileExtension}`;
        const storagePath = `wissen_${timestamp}_${newFileName}`;
        
        const { error: uploadError } = await supabase.storage.from('dokumente').upload(storagePath, file, { upsert: true });

        if (!uploadError) {
          const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(storagePath);
          const pubUrl = linkData.publicUrl;

          await supabase.from('wissensdatenbank').insert([{
            datei_name: newFileName,
            firma: bulkFirma || 'Allgemein',
            inhalt_text: needsMdGeneration ? extrahierterText.substring(0, 3000) : `Dokument: ${newFileName}`,
            dokument_url: pubUrl
          }]);

          // Fehlendes MD-Gegenstück als Twin-Storage direkt im Supabase Bucket 'dokumente' erzeugen
          if (needsMdGeneration) {
             const mdFileName = `${finalBaseName}.md`;
             const mdStoragePath = `wissen_${timestamp}_${mdFileName}`;
             const mdContent = `Upload via Wissensspeicher.\nOriginal-PDF: ${pubUrl}\n\n${extrahierterText}`;
             
             let twinMdUrl = pubUrl;
             const mdBlob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
             const { error: mdUpErr } = await supabase.storage
               .from('dokumente')
               .upload(mdStoragePath, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });

             if (!mdUpErr) {
               const { data: mdPubData } = supabase.storage.from('dokumente').getPublicUrl(mdStoragePath);
               if (mdPubData?.publicUrl) twinMdUrl = mdPubData.publicUrl;
             }

             await supabase.from('wissensdatenbank').insert([{
                datei_name: mdFileName,
                firma: bulkFirma || 'Allgemein',
                inhalt_text: extrahierterText.substring(0, 3000),
                dokument_url: twinMdUrl
             }]);
          }
        }
      } catch (err) {
        console.error("Import-Fehler bei File:", file.name, err);
      }
    }

    setBulkStatus(null);
    setBulkDateien([]);
    setLaedt(false);
    setTimeout(() => { ladeDaten(); }, 300);
    if (document.getElementById('bulk-file-input')) document.getElementById('bulk-file-input').value = '';
    showToast(`✅ Upload abgeschlossen! Dateien wurden in den Supabase-Wissensspeicher geladen.`, 'success');
  };

  // --- LÖSCHEN INKL. SUPABASE STORAGE CLEANUP ---
  const loescheWissenEintrag = async (eintrag) => {
    if (!eintrag || !eintrag.id) return;
    const isMd = eintrag.datei_name && eintrag.datei_name.toLowerCase().endsWith('.md');
    if (!window.confirm(`Diesen ${isMd ? 'MD' : 'PDF'}-Eintrag dauerhaft aus dem Wissensspeicher entfernen?`)) return;

    if (eintrag.dokument_url) {
      try {
        const parts = decodeURIComponent(eintrag.dokument_url).split('/');
        const storageFileName = parts[parts.length - 1];
        if (storageFileName) {
          await supabase.storage.from('dokumente').remove([storageFileName]);
        }
      } catch (e) {
        console.warn("Hinweis beim Entfernen der Storage-Datei:", e);
      }
    }

    await supabase.from('wissensdatenbank').delete().eq('id', eintrag.id);
    showToast(`✅ ${isMd ? 'MD' : 'PDF'}-Eintrag gelöscht!`, 'success');
    ladeDaten();
  };

  // --- FILTERUNG FÜR MD UND PDF AUS SUPABASE (MANDANTENISOLIERT) ---
  const basisGefilterteWissenEintraege = wissenEintraege.filter(w => {
    const matchSuche = !suchbegriff.trim() ||
      (w.datei_name || '').toLowerCase().includes(suchbegriff.toLowerCase()) ||
      (w.firma || '').toLowerCase().includes(suchbegriff.toLowerCase()) ||
      (w.inhalt_text || '').toLowerCase().includes(suchbegriff.toLowerCase());
    const matchFirma = !wissenFirmaFilter || w.firma === wissenFirmaFilter;
    const matchGegner = !wissenGegnerFilter || (w.inhalt_text || '').toLowerCase().includes(wissenGegnerFilter.toLowerCase());
    return matchSuche && matchFirma && matchGegner;
  });

  const gefilterteMdEintraege = basisGefilterteWissenEintraege.filter(
    w => w.datei_name && w.datei_name.toLowerCase().endsWith('.md')
  );

  const gefiltertePdfEintraege = basisGefilterteWissenEintraege.filter(
    w => !(w.datei_name && w.datei_name.toLowerCase().endsWith('.md'))
  );

  const aktiveListe = wissenAnzeigeModus === 'md' ? gefilterteMdEintraege : gefiltertePdfEintraege;

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
            <label style={labelStyle}>Dokumente wählen (.md und .pdf Dateien markieren)*</label>
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
          {laedt ? 'Importiere...' : `+ ${bulkDateien.length > 0 ? bulkDateien.length : ''} Datei(en) in den Speicher laden`}
        </button>
      </form>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ margin: '0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="book" size={20} /> Indizierte Dokumente ({aktiveListe.length})
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
            MD Datenbank ({gefilterteMdEintraege.length})
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
            PDF Datenbank ({gefiltertePdfEintraege.length})
          </button>
        </div>
      </div>
      
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

      {/* --- DESKTOP ODER MOBILE LAYOUT LOGIK --- */}
      <div style={{ borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.cardBg, overflow: 'hidden' }}>
        
        {!isMobile ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: theme.border, color: theme.textMain }}>
                  <th style={{ padding: '12px 15px' }}>Dokument / Datei</th>
                  <th style={{ padding: '12px 15px' }}>Zugeordnete Firma</th>
                  <th style={{ padding: '12px 15px', textAlign: 'center', width: '80px' }}>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {aktiveListe.slice(0, 50).length > 0 ? (
                  aktiveListe.slice(0, 50).map(w => (
                    <tr key={w.id} style={{ borderBottom: `1px solid ${theme.border}`, transition: 'background 0.2s' }}>
                      <td style={{ padding: '12px 15px' }}>
                        {w.dokument_url ? (
                          <a href={w.dokument_url} target="_blank" rel="noreferrer" style={{ color: theme.wissenAccent, textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon name="file" size={14} /> {w.datei_name}
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => oeffneTextVorschau(w)}
                            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'bold', color: theme.wissenAccent, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', textAlign: 'left' }}
                            title="Gespeicherten Textinhalt im neuen Tab anzeigen"
                          >
                            <Icon name="file" size={14} /> {w.datei_name}
                          </button>
                        )}
                        {w.inhalt_text && (
                          <div style={{ fontSize: '11px', color: theme.textMuted, marginTop: '4px' }}>
                            {w.inhalt_text.length > 80 ? w.inhalt_text.substring(0, 80) + '...' : w.inhalt_text}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 15px', color: theme.textMain }}>{w.firma || 'Allgemein'}</td>
                      <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                        <button onClick={() => loescheWissenEintrag(w)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '4px' }} title="Eintrag löschen">
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>
                      {wissenAnzeigeModus === 'md'
                        ? 'Keine MD-Dokumente im Wissensspeicher gefunden.'
                        : 'Keine PDF-Dokumente für diese Filterung gefunden.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {aktiveListe.slice(0, 50).length > 0 ? (
              aktiveListe.slice(0, 50).map(w => (
                <div key={w.id} style={{ padding: '15px', borderBottom: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {w.dokument_url ? (
                    <a href={w.dokument_url} target="_blank" rel="noreferrer" title={w.datei_name} style={{ color: theme.wissenAccent, textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
                      <div style={{ flexShrink: 0, display: 'flex' }}><Icon name="file" size={14} /></div>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
                        {w.datei_name}
                      </span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => oeffneTextVorschau(w)}
                      title={w.datei_name}
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontWeight: 'bold', color: theme.wissenAccent, display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%', fontSize: '13px', textAlign: 'left' }}
                    >
                      <div style={{ flexShrink: 0, display: 'flex' }}><Icon name="file" size={14} /></div>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
                        {w.datei_name}
                      </span>
                    </button>
                  )}

                  {w.inhalt_text && (
                    <div style={{ fontSize: '11px', color: theme.textMuted, lineHeight: '1.4' }}>
                      {w.inhalt_text.length > 80 ? w.inhalt_text.substring(0, 80) + '...' : w.inhalt_text}
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: theme.textMain, fontWeight: '500' }}>{w.firma || 'Allgemein'}</span>
                    <button onClick={() => loescheWissenEintrag(w)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '4px' }} title="Eintrag löschen">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>
                {wissenAnzeigeModus === 'md'
                  ? 'Keine MD-Dokumente im Wissensspeicher gefunden.'
                  : 'Keine PDF-Dokumente für diese Filterung gefunden.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}