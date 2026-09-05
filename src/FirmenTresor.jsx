import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub, extractFilename, cleanVal } from './utils';

export default function FirmenTresor({ session, theme, mandanten, ladeDaten, showToast, suchbegriff }) {
  const [laedt, setLaedt] = useState(false);
  const [uploadingMandantId, setUploadingMandantId] = useState(null);
  const [editMandantId, setEditMandantId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  
  const [m_firmenname, setM_firmenname] = useState('');
  const [m_ansprechpartner, setM_ansprechpartner] = useState('');
  const [m_adresse, setM_adresse] = useState('');
  const [m_telefon, setM_telefon] = useState('');
  const [m_email, setM_email] = useState('');
  const [m_steuernummer, setM_steuernummer] = useState('');
  const [m_ust_id, setM_ust_id] = useState('');
  const [m_betriebsnummer, setM_betriebsnummer] = useState('');
  const [m_vbg_nummer, setM_vbg_nummer] = useState('');
  const [m_handelsregister, setM_handelsregister] = useState('');
  const [m_iban, setM_iban] = useState('');
  const [m_bank_name, setM_bank_name] = useState('');
  const [m_ust_intervall, setM_ust_intervall] = useState('Vierteljährlich');
  const [m_dauerfrist, setM_dauerfrist] = useState(false);
  const [m_dateien, setM_dateien] = useState([]);

  const isDarkMode = theme.bg === '#020617';

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const h4StyleTresor = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word' };

  // Striktes Grid-Layout für geschlossenen und aufgeklappten Zustand
  const listGrid = "2.5fr 2fr 3fr 2.5fr 50px"; 

  const gefilterteMandanten = mandanten.filter((m) => {
    if (!suchbegriff || !suchbegriff.trim()) return true;
    const s = suchbegriff.toLowerCase();
    const fName = (m.firmenname || '').toLowerCase();
    const ans = (m.ansprechpartner || '').toLowerCase();
    const mail = (m.email || '').toLowerCase();
    const adr = (m.adresse || '').toLowerCase();
    return fName.includes(s) || ans.includes(s) || mail.includes(s) || adr.includes(s);
  });

  const ladeInFormularMandant = (m) => {
    setEditMandantId(m.id);
    setM_firmenname(cleanVal(m.firmenname) || '');
    setM_ansprechpartner(cleanVal(m.ansprechpartner) || '');
    setM_adresse(cleanVal(m.adresse) || '');
    setM_telefon(cleanVal(m.telefon) || '');
    setM_email(cleanVal(m.email) || '');
    setM_steuernummer(cleanVal(m.steuernummer) || '');
    setM_ust_id(cleanVal(m.ust_id) || '');
    setM_betriebsnummer(cleanVal(m.betriebsnummer) || '');
    setM_vbg_nummer(cleanVal(m.vbg_nummer) || '');
    setM_handelsregister(cleanVal(m.handelsregister) || '');
    setM_iban(cleanVal(m.iban) || '');
    setM_bank_name(cleanVal(m.bank_name) || '');
    setM_ust_intervall(m.ust_intervall || 'Vierteljährlich');
    setM_dauerfrist(m.dauerfrist || false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetMandantForm = () => {
    setEditMandantId(null);
    setM_firmenname(''); setM_ansprechpartner(''); setM_adresse(''); setM_telefon(''); setM_email('');
    setM_steuernummer(''); setM_ust_id(''); setM_betriebsnummer(''); setM_vbg_nummer(''); setM_handelsregister('');
    setM_iban(''); setM_bank_name(''); setM_ust_intervall('Vierteljährlich'); setM_dauerfrist(false); setM_dateien([]);
    if (document.getElementById('tresor-datei-upload')) document.getElementById('tresor-datei-upload').value = '';
  };

  const speichereMandant = async (e) => {
    e.preventDefault();
    setLaedt(true);

    let alleUrls = [];
    if (m_dateien && m_dateien.length > 0) {
      for (const f of m_dateien) {
        const isMd = f.name.toLowerCase().endsWith('.md');
        if (isMd) {
          const mdInhalt = await f.text();
          const baseInfo = `Stammdokument aus Firmen-Tresor. Firma: ${m_firmenname}`;
          await supabase.from('wissensdatenbank').insert([{ datei_name: f.name, firma: m_firmenname || 'Allgemein', inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`, dokument_url: null }]);
          await syncToGithub(f.name, mdInhalt, null, null, showToast);
        } else {
          const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const dateiName = `m_${Date.now()}_${sichererDateiname}`; 
          const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f);
          if (!uploadError) {
            const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
            alleUrls.push(linkData.publicUrl);
          }
        }
      }
    }
    
    let neuDokumentUrl = alleUrls.length > 0 ? alleUrls.join(',') : null;
    let finalDocs = neuDokumentUrl;
    
    if (editMandantId) {
        const existing = mandanten.find(x => x.id === editMandantId);
        if (existing && existing.dokument_url) {
            finalDocs = neuDokumentUrl ? `${existing.dokument_url},${neuDokumentUrl}` : existing.dokument_url;
        }
    }

    const payload = {
      user_id: session.user.id, firmenname: m_firmenname, ansprechpartner: m_ansprechpartner, adresse: m_adresse,
      telefon: m_telefon, email: m_email, steuernummer: m_steuernummer, ust_id: m_ust_id, betriebsnummer: m_betriebsnummer,
      vbg_nummer: m_vbg_nummer, handelsregister: m_handelsregister, iban: m_iban, bank_name: m_bank_name,
      ust_intervall: m_ust_intervall, dauerfrist: m_dauerfrist, dokument_url: finalDocs
    };

    if (editMandantId) {
      await supabase.from('mandanten').update(payload).eq('id', editMandantId);
      showToast('Änderungen im Tresor gespeichert!', 'success');
    } else {
      await supabase.from('mandanten').insert([payload]);
      showToast('Neuer Mandant im Tresor angelegt!', 'success');
    }
    resetMandantForm(); ladeDaten(); setLaedt(false);
  };

  const loescheMandant = async (id) => {
    if(!window.confirm("Firma komplett aus dem Tresor löschen?")) return;
    await supabase.from('mandanten').delete().eq('id', id);
    ladeDaten();
    showToast('Firma aus Tresor gelöscht.', 'success');
  };

  const handleNachtragUploadMandant = async (mId, currentUrls, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingMandantId(mId);
    
    const isMd = file.name.toLowerCase().endsWith('.md');
    const matchMandant = mandanten.find(x => x.id === mId);
    const fName = matchMandant ? matchMandant.firmenname : 'Allgemein';

    if (isMd) {
      const mdInhalt = await file.text();
      const baseInfo = `Nachträgliches Stammdokument. Firma: ${fName}`;
      await supabase.from('wissensdatenbank').insert([{ datei_name: file.name, firma: fName, inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`, dokument_url: null }]);
      await syncToGithub(file.name, mdInhalt, null, null, showToast);
      ladeDaten();
      showToast('Stammdokument angehängt!', 'success');
    } else {
      const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const dateiName = `m_${Date.now()}_${sichererDateiname}`; 
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file);
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        const newUrl = linkData.publicUrl;
        const updatedUrls = currentUrls ? `${currentUrls},${newUrl}` : newUrl;
        await supabase.from('mandanten').update({ dokument_url: updatedUrls }).eq('id', mId);
        ladeDaten();
        showToast('Stammdokument angehängt!', 'success');
      } else {
        showToast("Fehler beim Upload: " + uploadError.message, 'error');
      }
    }
    setUploadingMandantId(null);
    e.target.value = ''; 
  };

  const loescheDateiAusMandant = async (mId, aktuelleUrls, urlZumLoeschen) => {
    if (!window.confirm("Diese Datei wirklich aus dem Firmen-Profil entfernen?")) return;
    const urlArray = aktuelleUrls.split(',');
    const neueUrls = urlArray.filter(url => url !== urlZumLoeschen);
    const neuerUrlString = neueUrls.length > 0 ? neueUrls.join(',') : null;
    const { error: dbError } = await supabase.from('mandanten').update({ dokument_url: neuerUrlString }).eq('id', mId);
    if (!dbError) {
       try { const parts = decodeURIComponent(urlZumLoeschen).split('/'); const fileName = parts[parts.length - 1]; await supabase.storage.from('dokumente').remove([fileName]); } catch (e) { }
       ladeDaten();
       showToast('Datei erfolgreich aus Tresor entfernt!', 'success');
    } else { showToast("Fehler beim Entfernen der Datei: " + dbError.message, 'error'); }
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
        <Icon name="building" size={24} /> {editMandantId ? 'Firma / Person bearbeiten' : 'Neuer Mandant / Firma im Tresor'}
      </h2>
      <form onSubmit={speichereMandant} style={{ ...panelStyle, marginBottom: '20px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '20px', textAlign: 'left' }}>
          <div style={{ gridColumn: '1 / -1' }}><h4 style={h4StyleTresor}>1. Allgemeine Kontaktdaten</h4></div>
          <div><label style={labelStyle}>Firma / Person*</label><input required value={m_firmenname} onChange={e=>setM_firmenname(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Ansprechpartner</label><input value={m_ansprechpartner} onChange={e=>setM_ansprechpartner(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Adresse</label><input value={m_adresse} onChange={e=>setM_adresse(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Telefon</label><input value={m_telefon} onChange={e=>setM_telefon(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>E-Mail</label><input value={m_email} onChange={e=>setM_email(e.target.value)} style={inputStyle}/></div>

          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}><h4 style={h4StyleTresor}>2. Wichtige Nummern & Stammdokumente</h4></div>
          <div><label style={labelStyle}>Steuernummer</label><input value={m_steuernummer} onChange={e=>setM_steuernummer(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>USt-IdNr.</label><input value={m_ust_id} onChange={e=>setM_ust_id(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Betriebsnummer</label><input value={m_betriebsnummer} onChange={e=>setM_betriebsnummer(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>VBG-Nummer</label><input value={m_vbg_nummer} onChange={e=>setM_vbg_nummer(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Handelsregister</label><input value={m_handelsregister} onChange={e=>setM_handelsregister(e.target.value)} style={inputStyle}/></div>

          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
            <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '8px'}}>
               <Icon name="paperclip" size={16} /> Stammdokumente (HR-Auszug, Gewerbeanmeldung...)
            </label>
            <input id="tresor-datei-upload" type="file" multiple onChange={(e) => setM_dateien(Array.from(e.target.files))} style={{...inputStyle, border: `1px dashed ${theme.tresorAccent}`, cursor: 'pointer', padding: '10px'}} />
            {m_dateien.length > 0 && <span style={{fontSize: '13px', color: theme.tresorAccent, marginTop: '8px'}}>Gewählt: {m_dateien.length} Datei(en)</span>}
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}><h4 style={h4StyleTresor}>3. Bank & Steuer-Setup</h4></div>
          
          <div><label style={labelStyle}>IBAN</label><input value={m_iban} onChange={e=>setM_iban(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Bank Name</label><input value={m_bank_name} onChange={e=>setM_bank_name(e.target.value)} style={inputStyle}/></div>
          <div>
            <label style={labelStyle}>USt-Voranmeldung</label>
            <select value={m_ust_intervall} onChange={e=>setM_ust_intervall(e.target.value)} style={inputStyle}>
              <option value="Monatlich">Monatlich</option>
              <option value="Vierteljährlich">Vierteljährlich</option>
              <option value="Jährlich">Jährlich (Keine VA)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Dauerfrist (DFV)</label>
            <select value={m_dauerfrist ? 'true' : 'false'} onChange={e=>setM_dauerfrist(e.target.value === 'true')} style={inputStyle}>
              <option value="false">Nein</option>
              <option value="true">Ja</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '25px', flexWrap: 'wrap' }}>
          <button type="submit" disabled={laedt} style={{ padding: '14px', background: theme.tresorAccent, color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {laedt ? 'Speichere...' : (editMandantId ? <><Icon name="check" size={16} /> Änderungen speichern</> : '+ Mandant im Tresor ablegen')}
          </button>
          {editMandantId && (
            <button type="button" onClick={resetMandantForm} style={{ padding: '14px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: '1 1 auto' }}>
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <h3 style={{ margin: '30px 0 15px 0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Icon name="archive" size={20} /> Gespeicherte Mandanten & Firmen
      </h3>
      
      <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflowX: 'auto', background: theme.cardBg }}>
        <div style={{ minWidth: '950px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: listGrid, gap: '15px', padding: '15px 20px', background: theme.inputBg, borderBottom: `1px solid ${theme.border}`, fontWeight: 'bold', color: theme.textMuted, fontSize: '12px', textTransform: 'uppercase', textAlign: 'left' }}>
            <div>Firma / Mandant</div>
            <div>Kontakt</div>
            <div>Steuern & Bank</div>
            <div>Dokumente</div>
            <div style={{ textAlign: 'center' }}>Aktion</div>
          </div>

          {gefilterteMandanten.map(m => {
            const isExpanded = expandedId === m.id;
            const isActive = editMandantId === m.id;
            const numDocs = m.dokument_url ? m.dokument_url.split(',').length : 0;

            return (
              <div 
                key={m.id} 
                style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, borderLeft: isActive ? `4px solid ${theme.tresorAccent}` : `4px solid transparent`, background: isActive ? (isDarkMode ? 'rgba(0, 229, 255, 0.08)' : '#f0f9ff') : 'transparent', transition: 'all 0.2s ease', margin: 0, textAlign: 'left' }}
                onClick={() => { ladeInFormularMandant(m); setExpandedId(isExpanded ? null : m.id); }}
              >
                {/* SINGLE LINE DEFAULT */}
                <div style={{ display: 'grid', gridTemplateColumns: listGrid, gap: '15px', alignItems: 'center', width: '100%' }}>
                  
                  {/* Spalte 1: Firma */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <strong style={{ color: theme.tresorAccent, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.firmenname}</strong>
                    <span style={{ fontSize: '11px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="user" size={10} /> {cleanVal(m.ansprechpartner) || '-'}</span>
                  </div>
                  
                  {/* Spalte 2: Kontakt */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="phone" size={12}/> {cleanVal(m.telefon) || '-'}</span>
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="mail" size={12}/> {cleanVal(m.email) || '-'}</span>
                  </div>

                  {/* Spalte 3: Steuern & Bank */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>USt-Id: {cleanVal(m.ust_id) || '-'}</span>
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>IBAN: {cleanVal(m.iban) || '-'}</span>
                  </div>

                  {/* Spalte 4: Dokumente */}
                  <div style={{ fontSize: '12px', color: theme.textMuted }}>
                    {numDocs > 0 ? `(${numDocs} ${numDocs === 1 ? 'Dokument' : 'Dokumente'})` : '-'}
                  </div>

                  {/* Spalte 5: Aktion */}
                  <div style={{ color: isActive ? theme.tresorAccent : theme.textMuted, textAlign: 'center' }}>
                    <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                  </div>
                </div>

                {/* EXPANDED CONTENT (Strikt im Raster) */}
                {isExpanded && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.border}`, display: 'grid', gridTemplateColumns: listGrid, gap: '15px', cursor: 'default', alignItems: 'start' }} onClick={(e) => e.stopPropagation()}>
                    
                    {/* Spalte 1: Exakt linksbündig unter dem Namen */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: theme.textMain }}>{cleanVal(m.adresse) || '-'}</span>
                      <div style={{ marginTop: '4px', padding: '4px 8px', background: theme.bg, borderRadius: '4px', fontSize: '11px', color: theme.tresorAccent, fontWeight: 'bold', display: 'inline-block', width: 'fit-content' }}>
                        USt-Radar: {m.ust_intervall || 'Vierteljährlich'} {m.dauerfrist ? '(DFV)' : ''}
                      </div>
                    </div>

                    {/* Spalte 2: Leer, damit das Grid erhalten bleibt */}
                    <div></div>

                    {/* Spalte 3: Steuern Details */}
                    <div style={{ fontSize: '11px', color: theme.textMain, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: theme.inputBg, padding: '8px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                      <div><span style={{color: theme.textMuted}}>St-Nr:</span> {cleanVal(m.steuernummer) || '-'}</div>
                      <div><span style={{color: theme.textMuted}}>VBG:</span> {cleanVal(m.vbg_nummer) || '-'}</div>
                      <div><span style={{color: theme.textMuted}}>Betr.-Nr:</span> {cleanVal(m.betriebsnummer) || '-'}</div>
                      <div><span style={{color: theme.textMuted}}>Bank:</span> {cleanVal(m.bank_name) || '-'}</div>
                    </div>

                    {/* Spalte 4: Dokumente */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {m.dokument_url && m.dokument_url.split(',').map((url, idx) => {
                        const fileName = extractFilename(url);
                        return (
                          <div key={idx} style={{ display: 'inline-flex', alignItems: 'stretch', background: theme.border, borderRadius: '4px', overflow: 'hidden', border: `1px solid ${theme.border}`, width: 'fit-content', maxWidth: '100%' }}>
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px', fontSize: '10px', color: theme.textMain, background: 'rgba(0,0,0,0.1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fileName}>
                              <Icon name="file" size={10} /> {fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName}
                            </a>
                            <button onClick={() => loescheDateiAusMandant(m.id, m.dokument_url, url)} style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 4px', cursor: 'pointer', color: theme.textMuted }} title="Datei löschen">
                              <Icon name="x" size={10} />
                            </button>
                          </div>
                        )
                      })}
                      {uploadingMandantId === m.id ? (
                        <span style={{ fontSize: '11px', color: theme.tresorAccent }}><Icon name="file" size={10}/> Upload...</span>
                      ) : (
                        <label style={{ cursor: 'pointer', fontSize: '10px', background: 'transparent', padding: '4px 6px', borderRadius: '4px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', color: theme.textMuted, width: 'fit-content' }}>
                          + Datei anhängen
                          <input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUploadMandant(m.id, m.dokument_url, e)} />
                        </label>
                      )}
                    </div>

                    {/* Spalte 5: Aktion (Trash) */}
                    <div style={{ textAlign: 'center' }}>
                      <button onClick={() => loescheMandant(m.id)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '8px' }} title="Mandant löschen">
                        <Icon name="trash" size={16} />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}