import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub, extractFilename, cleanVal } from './utils';

export default function FirmenTresor({ session, theme, mandanten, ladeDaten, showToast }) {
  const [laedt, setLaedt] = useState(false);
  const [uploadingMandantId, setUploadingMandantId] = useState(null);
  const [editMandantId, setEditMandantId] = useState(null);
  
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

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const h4StyleTresor = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word' };

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
          
          await supabase.from('wissensdatenbank').insert([{
            datei_name: f.name,
            firma: m_firmenname || 'Allgemein',
            inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`,
            dokument_url: null
          }]);

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
      
      await supabase.from('wissensdatenbank').insert([{
        datei_name: file.name,
        firma: fName,
        inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`,
        dokument_url: null
      }]);

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
       try {
          const parts = decodeURIComponent(urlZumLoeschen).split('/');
          const fileName = parts[parts.length - 1];
          await supabase.storage.from('dokumente').remove([fileName]);
       } catch (e) { }
       ladeDaten();
       showToast('Datei erfolgreich aus Tresor entfernt!', 'success');
    } else {
       showToast("Fehler beim Entfernen der Datei: " + dbError.message, 'error');
    }
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
          
          <div style={{ background: theme.inputBg, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
            <label style={labelStyle}>USt-Voranmeldung</label>
            <select value={m_ust_intervall} onChange={e=>setM_ust_intervall(e.target.value)} style={inputStyle}>
              <option value="Monatlich">Monatlich</option>
              <option value="Vierteljährlich">Vierteljährlich</option>
              <option value="Jährlich">Jährlich (Keine VA)</option>
            </select>
          </div>
          
          <div style={{ background: theme.inputBg, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center' }}>
            <label style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="checkbox" checked={m_dauerfrist} onChange={e=>setM_dauerfrist(e.target.checked)} style={{ transform: 'scale(1.3)', accentColor: theme.tresorAccent }}/>
              Dauerfristverlängerung (DFV)
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '25px', flexWrap: 'wrap' }}>
          <button type="submit" disabled={laedt} style={{ padding: '14px', background: theme.tresorAccent, color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', flex: '1 1 auto' }}>
            {laedt ? 'Speichere...' : (editMandantId ? '💾 Änderungen speichern' : '+ Mandant im Tresor ablegen')}
          </button>
          {editMandantId && (
            <button type="button" onClick={resetMandantForm} style={{ padding: '14px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: '1 1 auto' }}>
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <h3 style={{ margin: '30px 0 15px 0', color: theme.textMain, textAlign: 'left' }}>🗃️ Gespeicherte Mandanten & Firmen</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '20px', textAlign: 'left' }}>
        {mandanten.map(m => (
          <div key={m.id} style={{ ...panelStyle, cursor: 'pointer', position: 'relative', border: editMandantId === m.id ? `2px solid ${theme.tresorAccent}` : `1px solid ${theme.border}` }} onClick={() => ladeInFormularMandant(m)}>
            <button onClick={(e) => { e.stopPropagation(); loescheMandant(m.id); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', fontSize: '18px', zIndex: 10 }} title="Mandant löschen">
              <Icon name="trash" size={18} />
            </button>

            <h3 style={{ margin: '0 0 10px 0', color: theme.tresorAccent, fontSize: '18px', paddingRight: '30px' }}>{m.firmenname}</h3>
            
            <div style={{ fontSize: '13px', color: theme.textMuted, display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' }}>
              <span>👤 {cleanVal(m.ansprechpartner) || '-'}</span>
              <span>📍 {cleanVal(m.adresse) || '-'}</span>
              <span>📞 {cleanVal(m.telefon) || '-'} | ✉️ {cleanVal(m.email) || '-'}</span>
            </div>

            <div style={{ fontSize: '12px', color: theme.textMain, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: theme.inputBg, padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
              <div><strong style={{color: theme.textMuted}}>Steuer-Nr:</strong><br/>{cleanVal(m.steuernummer) || '-'}</div>
              <div><strong style={{color: theme.textMuted}}>USt-Id:</strong><br/>{cleanVal(m.ust_id) || '-'}</div>
              <div><strong style={{color: theme.textMuted}}>VBG:</strong><br/>{cleanVal(m.vbg_nummer) || '-'}</div>
              <div><strong style={{color: theme.textMuted}}>Betriebs-Nr:</strong><br/>{cleanVal(m.betriebsnummer) || '-'}</div>
              <div><strong style={{color: theme.textMuted}}>HR-Nr:</strong><br/>{cleanVal(m.handelsregister) || '-'}</div>
              <div><strong style={{color: theme.textMuted}}>Bank:</strong><br/>{cleanVal(m.bank_name) || '-'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong style={{color: theme.textMuted}}>IBAN:</strong> {cleanVal(m.iban) || '-'}</div>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '12px' }}>
              <strong style={{color: theme.textMuted, display: 'block', marginBottom: '6px', fontSize: '12px'}}>Dokumente:</strong>
              {m.dokument_url && m.dokument_url.split(',').map((url, idx) => {
                const fileName = extractFilename(url);
                return (
                  <div key={idx} onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'stretch', background: theme.border, borderRadius: '6px', marginRight: '6px', marginBottom: '6px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', color: theme.textMain, background: 'rgba(0,0,0,0.1)' }} title={fileName}>
                      <Icon name="file" size={12} /> {fileName.length > 18 ? fileName.substring(0, 15) + '...' : fileName}
                    </a>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); loescheDateiAusMandant(m.id, m.dokument_url, url); }} style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 6px', cursor: 'pointer', color: theme.textMuted }} title="Datei löschen">
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                )
              })}
              
              {uploadingMandantId === m.id ? (
                <span style={{ fontSize: '11px', color: theme.tresorAccent }}>⏳ Upload...</span>
              ) : (
                <label onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer', fontSize: '11px', background: 'transparent', padding: '4px 8px', borderRadius: '6px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', color: theme.textMuted }}>
                  + Datei
                  <input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUploadMandant(m.id, m.dokument_url, e)} />
                </label>
              )}
            </div>

            <div style={{ marginTop: '12px', padding: '8px', background: theme.bg, borderRadius: '6px', fontSize: '12px', color: theme.tresorAccent, fontWeight: 'bold' }}>
              USt-Radar: {m.ust_intervall || 'Vierteljährlich'} {m.dauerfrist ? '(mit DFV)' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}