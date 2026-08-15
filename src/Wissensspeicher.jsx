import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub } from './utils';

export default function Wissensspeicher({ theme, wissenEintraege, mandanten, gegnerListe, ladeDaten, showToast }) {
  const [laedt, setLaedt] = useState(false);
  const [bulkDateien, setBulkDateien] = useState([]);
  const [bulkFirma, setBulkFirma] = useState('');
  const [bulkStatus, setBulkStatus] = useState(null);
  const [wissenSuchbegriff, setWissenSuchbegriff] = useState('');
  const [wissenFirmaFilter, setWissenFirmaFilter] = useState('');
  const [wissenGegnerFilter, setWissenGegnerFilter] = useState('');
  
  const [wissenAnzeigeModus, setWissenAnzeigeModus] = useState('md'); 
  const [githubFiles, setGithubFiles] = useState([]);
  const [loadingGithub, setLoadingGithub] = useState(false);

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word' };

  // --- NEU: GITHUB LIVE-FETCH LOGIK ---
  const fetchGithubFiles = async () => {
    setLoadingGithub(true);
    try {
      const { data, error } = await supabase.functions.invoke('github-sync', {
        body: { action: 'list' },
        headers: { 'Content-Type': 'application/json' }
      });
      if (error) throw error;
      if (data && data.success) {
         // Filtern auf .md Dateien zur Sicherheit
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

  // --- BESTEHENDE FUNKTIONEN ---
  const StarteBulkImport = async (e) => {
    e.preventDefault();
    if (!bulkDateien || bulkDateien.length === 0) {
      showToast("Bitte wähle zuerst mindestens eine Datei aus!", 'warning');
      return;
    }

    setLaedt(true);
    const gesamt = bulkDateien.length;

    for (let i = 0; i < gesamt; i++) {
      const file = bulkDateien[i];
      setBulkStatus({ fortschritt: i + 1, gesamt: gesamt, text: `Verarbeite: ${file.name}...` });

      try {
        const isMd = file.name.toLowerCase().endsWith('.md');
        let pubUrl = null;
        let finalDbText = '';

        if (isMd) {
          const mdInhalt = await file.text();
          finalDbText = mdInhalt.substring(0, 3000); 

          await supabase.from('wissensdatenbank').insert([{
            datei_name: file.name,
            firma: bulkFirma || 'Allgemein',
            inhalt_text: finalDbText,
            dokument_url: null 
          }]);

          await syncToGithub(file.name, mdInhalt, null, null, showToast); 
        } else {
          const sichererName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const storagePath = `wissen_${Date.now()}_${sichererName}`;
          const { error: uploadError } = await supabase.storage.from('dokumente').upload(storagePath, file);

          if (!uploadError) {
            const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(storagePath);
            pubUrl = linkData.publicUrl;

            await supabase.from('wissensdatenbank').insert([{
              datei_name: file.name,
              firma: bulkFirma || 'Allgemein',
              inhalt_text: `Dokument: ${file.name}\n(PDF/Bilddatei - Kein Text-Extrakt vorhanden)`,
              dokument_url: pubUrl
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
    setTimeout(() => { ladeDaten(); if(wissenAnzeigeModus === 'md') fetchGithubFiles(); }, 300);
    if (document.getElementById('bulk-file-input')) document.getElementById('bulk-file-input').value = '';
    showToast(`✅ KI-Wissensspeicher Import abgeschlossen!`, 'success');
  };

  const loescheWissenEintrag = async (id) => {
    if (!window.confirm("Diesen PDF-Eintrag aus dem Speicher entfernen?")) return;
    await supabase.from('wissensdatenbank').delete().eq('id', id);
    showToast(`✅ PDF-Eintrag gelöscht!`, 'success');
    ladeDaten();
  };

  // Filter-Logik für PDFs
  const gefilterteWissenEintraege = wissenEintraege.filter(w => {
    const matchSuche = !wissenSuchbegriff.trim() || 
      (w.datei_name || '').toLowerCase().includes(wissenSuchbegriff.toLowerCase()) || 
      (w.firma || '').toLowerCase().includes(wissenSuchbegriff.toLowerCase()) ||
      (w.inhalt_text || '').toLowerCase().includes(wissenSuchbegriff.toLowerCase());
    
    const matchFirma = !wissenFirmaFilter || w.firma === wissenFirmaFilter;
    const matchGegner = !wissenGegnerFilter || (w.inhalt_text || '').toLowerCase().includes(wissenGegnerFilter.toLowerCase());
    
    const isMd = w.datei_name && w.datei_name.toLowerCase().endsWith('.md');
    
    return matchSuche && matchFirma && matchGegner && !isMd; // Supabase zeigt nur Nicht-MDs an
  });

  // Filter-Logik für MDs (GitHub)
  const gefilterteGithubFiles = githubFiles.filter(f => 
    !wissenSuchbegriff.trim() || f.name.toLowerCase().includes(wissenSuchbegriff.toLowerCase())
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
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 min(100%, 200px)' }}>
          <input 
            type="text" 
            placeholder="Suchen nach Dateiname, Inhalt oder Firma..." 
            value={wissenSuchbegriff}
            onChange={(e) => setWissenSuchbegriff(e.target.value)}
            style={{ ...inputStyle, padding: '10px', fontSize: '13px' }}
          />
        </div>
        
        {wissenAnzeigeModus === 'pdf' && (
          <>
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
          </>
        )}
      </div>

      <div style={{ borderRadius: '8px', border: `1px solid ${theme.border}`, overflowX: 'auto', background: theme.cardBg }}>
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
              // --- RENDER LOGIK: MD DATENBANK (LIVE GITHUB) ---
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
                    Keine MD-Dateien auf GitHub gefunden.
                  </td>
                </tr>
              )
            ) : (
              // --- RENDER LOGIK: PDF DATENBANK (SUPABASE MIT TOP 20 LIMIT) ---
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
    </div>
  );
}