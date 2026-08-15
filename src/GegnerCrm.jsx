import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';

export default function GegnerCrm({ session, theme, gegnerListe, ladeDaten, showToast }) {
  const [laedt, setLaedt] = useState(false);
  const [editGegnerId, setEditGegnerId] = useState(null);
  
  const [g_name, setG_name] = useState('');
  const [g_adresse, setG_adresse] = useState('');
  const [g_fax, setG_fax] = useState('');
  const [g_email, setG_email] = useState('');
  const [g_ansprechpartnerListe, setG_ansprechpartnerListe] = useState([{ abteilung: '', name: '', telefon: '', email: '' }]);

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word' };

  const speichereGegner = async (e) => {
    e.preventDefault();
    setLaedt(true);
    const payload = {
      user_id: session.user.id, 
      name: g_name, 
      adresse: g_adresse, 
      fax: g_fax, 
      email: g_email,
      notizen: JSON.stringify(g_ansprechpartnerListe)
    };

    if (editGegnerId) {
      await supabase.from('gegner').update(payload).eq('id', editGegnerId);
      showToast('Behörden-Daten aktualisiert!', 'success');
    } else {
      await supabase.from('gegner').insert([payload]);
      showToast('Neue Behörde im CRM angelegt!', 'success');
    }
    setEditGegnerId(null); setG_name(''); setG_adresse(''); setG_fax(''); setG_email(''); setG_ansprechpartnerListe([{ abteilung: '', name: '', telefon: '', email: '' }]); ladeDaten(); setLaedt(false);
  };

  const loescheGegner = async (id) => {
    if(!window.confirm("Behörde / Gegner komplett aus dem CRM löschen?")) return;
    await supabase.from('gegner').delete().eq('id', id);
    ladeDaten();
    showToast('Behörde aus CRM gelöscht.', 'success');
  };

  const ladeInFormularGegner = (g) => {
    setEditGegnerId(g.id);
    setG_name(g.name || '');
    setG_adresse(g.adresse || '');
    setG_fax(g.fax || '');
    setG_email(g.email || g.email_zentrale || '');
    
    try {
      const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen;
      if (Array.isArray(parsed) && parsed.length > 0) {
        setG_ansprechpartnerListe(parsed);
      } else {
        setG_ansprechpartnerListe([{ abteilung: g.abteilung || '', name: g.ansprechpartner || '', telefon: g.telefon || '', email: g.email || '' }]);
      }
    } catch(e) {
      setG_ansprechpartnerListe([{ abteilung: g.abteilung || '', name: g.ansprechpartner || '', telefon: g.telefon || '', email: g.email || '' }]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addAnsprechpartnerRow = () => {
    setG_ansprechpartnerListe([...g_ansprechpartnerListe, { abteilung: '', name: '', telefon: '', email: '' }]);
  };

  const removeAnsprechpartnerRow = (index) => {
    const list = [...g_ansprechpartnerListe];
    list.splice(index, 1);
    setG_ansprechpartnerListe(list.length > 0 ? list : [{ abteilung: '', name: '', telefon: '', email: '' }]);
  };

  const updateAnsprechpartnerRow = (index, field, value) => {
    const list = [...g_ansprechpartnerListe];
    list[index][field] = value;
    setG_ansprechpartnerListe(list);
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
        <Icon name="shield" size={24} /> {editGegnerId ? 'Behörde / Gegner bearbeiten' : 'Behörden & Gegner CRM'}
      </h2>
      <form onSubmit={speichereGegner} style={{ ...panelStyle, marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '15px', textAlign: 'left' }}>
          <div style={{ gridColumn: '1 / -1' }}><h4 style={{ margin: 0, color: theme.gegnerAccent }}>1. Hauptdaten der Behörde / Gegners</h4></div>
          <div><label style={labelStyle}>Behörde / Gegner Name*</label><input required value={g_name} onChange={e=>setG_name(e.target.value)} placeholder="z.B. Finanzamt Dresden-Süd" style={inputStyle}/></div>
          <div><label style={labelStyle}>Zentrale Postadresse</label><input value={g_adresse} onChange={e=>setG_adresse(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Zentrale Faxnummer</label><input value={g_fax} onChange={e=>setG_fax(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Zentrale E-Mail</label><input type="email" value={g_email} onChange={e=>setG_email(e.target.value)} placeholder="z.B. poststelle@fa-dresden.de" style={inputStyle}/></div>

          <div style={{ gridColumn: '1 / -1', marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ margin: 0, color: theme.textMain }}>2. Abteilungen & Ansprechpartner</h4>
              <button type="button" onClick={addAnsprechpartnerRow} style={{ background: theme.gegnerAccent, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                + Ansprechpartner / Abteilung hinzufügen
              </button>
            </div>

            {g_ansprechpartnerListe.map((item, idx) => (
              <div key={idx} style={{ background: theme.inputBg, padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'end' }}>
                <div style={{ flex: '1 1 min(100%, 120px)' }}><label style={labelStyle}>Abteilung</label><input value={item.abteilung} onChange={e => updateAnsprechpartnerRow(idx, 'abteilung', e.target.value)} placeholder="z.B. Gewerbesteuer" style={{ ...inputStyle, padding: '8px' }}/></div>
                <div style={{ flex: '1 1 min(100%, 120px)' }}><label style={labelStyle}>Name Bearbeiter</label><input value={item.name} onChange={e => updateAnsprechpartnerRow(idx, 'name', e.target.value)} placeholder="z.B. Herr Müller" style={{ ...inputStyle, padding: '8px' }}/></div>
                <div style={{ flex: '1 1 min(100%, 120px)' }}><label style={labelStyle}>Durchwahl / Tel</label><input value={item.telefon} onChange={e => updateAnsprechpartnerRow(idx, 'telefon', e.target.value)} placeholder="z.B. 0351/12345" style={{ ...inputStyle, padding: '8px' }}/></div>
                <div style={{ flex: '1 1 min(100%, 120px)' }}><label style={labelStyle}>E-Mail</label><input value={item.email} onChange={e => updateAnsprechpartnerRow(idx, 'email', e.target.value)} placeholder="z.B. mueller@fa.de" style={{ ...inputStyle, padding: '8px' }}/></div>
                <div>
                  {g_ansprechpartnerListe.length > 1 && (
                    <button type="button" onClick={() => removeAnsprechpartnerRow(idx)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '8px', width: '100%' }} title="Zeile entfernen">
                      <Icon name="x" size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button type="submit" disabled={laedt} style={{ padding: '12px', background: theme.gegnerAccent, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: '1 1 auto' }}>
            {laedt ? 'Speichere...' : (editGegnerId ? '💾 Änderungen der Behörde speichern' : '+ Behörde / Gegner im CRM speichern')}
          </button>
          {editGegnerId && (
            <button type="button" onClick={() => { setEditGegnerId(null); setG_name(''); setG_adresse(''); setG_fax(''); setG_email(''); setG_ansprechpartnerListe([{ abteilung: '', name: '', telefon: '', email: '' }]); }} style={{ padding: '12px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: '1 1 auto' }}>
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '15px', textAlign: 'left' }}>
        {gegnerListe.map(g => {
          let ansList = [];
          try {
            const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen;
            if (Array.isArray(parsed)) ansList = parsed;
          } catch(e){}

          return (
            <div key={g.id} style={{ ...panelStyle, cursor: 'pointer', position: 'relative' }} onClick={() => ladeInFormularGegner(g)}>
              <button onClick={(e) => { e.stopPropagation(); loescheGegner(g.id); }} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', fontSize: '18px', zIndex: 10 }} title="Behörde löschen">
                <Icon name="trash" size={18} />
              </button>

              <h3 style={{ margin: '0 0 5px 0', color: theme.gegnerAccent, paddingRight: '30px' }}>{g.name}</h3>
              <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '10px' }}>
                📍 {g.adresse || 'Keine Adresse'}<br/>
                📟 Fax: {g.fax || '-'} | ✉️ Mail: {g.email || g.email_zentrale || '-'}
              </div>

              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <strong style={{ color: theme.textMuted }}>Hinterlegte Abteilungen ({ansList.length}):</strong>
                {ansList.length > 0 ? (
                  ansList.map((ans, idx) => (
                    <div key={idx} style={{ background: theme.inputBg, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                      <div style={{ color: theme.gegnerAccent, fontWeight: 'bold' }}>{ans.abteilung || 'Zentrale / Allgemein'}</div>
                      <div style={{ color: theme.textMain }}>👤 {ans.name || '-'}</div>
                      <div style={{ color: theme.textMuted, fontSize: '11px' }}>📞 {ans.telefon || '-'} | ✉️ {ans.email || '-'}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: theme.textMain }}>👤 {g.ansprechpartner || '-'} (Tel: {g.telefon || '-'})</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}