import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';

export default function GegnerCrm({ session, theme, gegnerListe, ladeDaten, showToast, suchbegriff }) {
  const [laedt, setLaedt] = useState(false);
  const [editGegnerId, setEditGegnerId] = useState(null);
  const [expandedId, setExpandedId] = useState(null); 
  
  const [g_name, setG_name] = useState('');
  const [g_adresse, setG_adresse] = useState('');
  const [g_fax, setG_fax] = useState('');
  const [g_email, setG_email] = useState('');
  const [g_ansprechpartnerListe, setG_ansprechpartnerListe] = useState([{ abteilung: '', name: '', telefon: '', email: '' }]);

  const isDarkMode = theme.bg === '#020617';

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word', boxSizing: 'border-box' };

  const contactGrid = "minmax(240px, 3fr) minmax(180px, 2fr) minmax(220px, 2.5fr) 50px";

  const gefilterteGegner = gegnerListe.filter((g) => {
    if (!suchbegriff || !suchbegriff.trim()) return true;
    const s = suchbegriff.toLowerCase();
    const gName = (g.name || '').toLowerCase();
    const adr = (g.adresse || '').toLowerCase();
    const mail = (g.email || g.email_zentrale || '').toLowerCase();
    
    let notizenStr = '';
    if (typeof g.notizen === 'string') {
        notizenStr = g.notizen.toLowerCase();
    } else if (g.notizen) {
        notizenStr = JSON.stringify(g.notizen).toLowerCase();
    }

    return gName.includes(s) || adr.includes(s) || mail.includes(s) || notizenStr.includes(s);
  });

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
    setEditGegnerId(null); 
    setG_name(''); 
    setG_adresse(''); 
    setG_fax(''); 
    setG_email(''); 
    setG_ansprechpartnerListe([{ abteilung: '', name: '', telefon: '', email: '' }]); 
    ladeDaten(); 
    setLaedt(false);
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

  const formatContactName = (abteilung, name) => {
    const a = (abteilung || '').trim();
    const n = (name || '').trim();
    if (a && n) return `${a} — ${n}`;
    if (a) return a;
    if (n) return n;
    return 'Zentrale / Allgemein';
  };

  return (
    <div>
      <style>{`
        .crm-desktop-header {
          display: grid;
          grid-template-columns: ${contactGrid};
          gap: 15px;
          padding: 15px 20px;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
          text-align: left;
          align-items: center;
        }
        .crm-main-row {
          display: grid;
          grid-template-columns: ${contactGrid};
          gap: 15px;
          align-items: center;
          width: 100%;
          padding: 15px 20px;
          cursor: pointer;
          box-sizing: border-box;
        }
        .crm-contact-row {
          display: grid;
          grid-template-columns: ${contactGrid};
          gap: 15px;
          align-items: center;
          padding: 12px 20px;
          box-sizing: border-box;
        }

        @media (max-width: 768px) {
          .crm-desktop-header {
            display: none !important;
          }
          .crm-main-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 14px !important;
            gap: 8px !important;
          }
          .crm-mobile-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
          .crm-contact-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            padding: 12px 14px !important;
            gap: 6px !important;
          }
          .crm-delete-btn {
            width: 100% !important;
            justify-content: center !important;
            min-height: 42px !important;
          }
        }
      `}</style>

      <h2 style={{ margin: '0 0 20px 0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
        <Icon name="shield" size={24} /> {editGegnerId ? 'Behörde / Gegner bearbeiten' : 'Behörden & Gegner CRM'}
      </h2>

      <form onSubmit={speichereGegner} style={{ ...panelStyle, marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '15px', textAlign: 'left' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <h4 style={{ margin: 0, color: theme.gegnerAccent, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="building" size={16} /> 1. Hauptdaten der Behörde / Gegners
            </h4>
          </div>
          <div><label style={labelStyle}>Behörde / Gegner Name*</label><input required value={g_name} onChange={e=>setG_name(e.target.value)} placeholder="z.B. Finanzamt Dresden-Süd" style={inputStyle}/></div>
          <div><label style={labelStyle}>Zentrale Postadresse</label><input value={g_adresse} onChange={e=>setG_adresse(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Zentrale Faxnummer</label><input value={g_fax} onChange={e=>setG_fax(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Zentrale E-Mail</label><input type="email" value={g_email} onChange={e=>setG_email(e.target.value)} placeholder="z.B. poststelle@fa-dresden.de" style={inputStyle}/></div>

          <div style={{ gridColumn: '1 / -1', marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ margin: 0, color: theme.textMain, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="users" size={16} /> 2. Abteilungen & Ansprechpartner
              </h4>
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
          <button type="submit" disabled={laedt} style={{ padding: '14px', background: theme.gegnerAccent, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {laedt ? 'Speichere...' : (editGegnerId ? <><Icon name="check" size={16} /> Änderungen der Behörde speichern</> : '+ Behörde / Gegner im CRM speichern')}
          </button>
          {editGegnerId && (
            <button type="button" onClick={() => { setEditGegnerId(null); setG_name(''); setG_adresse(''); setG_fax(''); setG_email(''); setG_ansprechpartnerListe([{ abteilung: '', name: '', telefon: '', email: '' }]); setExpandedId(null); }} style={{ padding: '14px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: '1 1 auto' }}>
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <h3 style={{ margin: '30px 0 15px 0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Icon name="shield" size={20} /> Gespeicherte Behörden & Gegner
      </h3>

      {/* GESPEICHERTE BEHÖRDEN (MOBIL-OPTIMIERT OHNE OVERFLOW-BREAK) */}
      <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', background: theme.cardBg, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '100%' }}>
          
          {/* DESKTOP HEADER */}
          <div className="crm-desktop-header" style={{ background: theme.inputBg, borderBottom: `1px solid ${theme.border}`, color: theme.textMuted }}>
            <div>Behörde / Kontakt</div>
            <div>Telefon / Fax</div>
            <div>E-Mail</div>
            <div style={{ textAlign: 'center' }}>Aktion</div>
          </div>

          {/* ITEM ROWS */}
          {gefilterteGegner.map(g => {
            const isExpanded = expandedId === g.id;
            const isActive = editGegnerId === g.id;
            let ansList = [];
            
            try {
              const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen;
              if (Array.isArray(parsed)) ansList = parsed;
            } catch(e){}

            return (
              <div 
                key={g.id} 
                style={{ 
                  borderBottom: `1px solid ${theme.border}`, 
                  borderLeft: (isExpanded || isActive) ? `4px solid ${theme.gegnerAccent}` : `4px solid transparent`, 
                  background: theme.cardBg, 
                  transition: 'all 0.2s ease', 
                  margin: 0, 
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {/* HAUPTZEILE (MOBIL STACK) */}
                <div 
                  className="crm-main-row"
                  onClick={() => { ladeInFormularGegner(g); setExpandedId(isExpanded ? null : g.id); }}
                >
                  <div className="crm-mobile-top">
                    <strong style={{ color: theme.gegnerAccent, fontSize: '14px' }}>{g.name}</strong>
                    <div style={{ color: (isExpanded || isActive) ? theme.gegnerAccent : theme.textMuted, paddingLeft: '8px' }}>
                      <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                    </div>
                  </div>

                  <span style={{ fontSize: '13px', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="phone" size={14} /> {g.fax || g.telefon || '-'}
                  </span>
                  
                  <span style={{ fontSize: '13px', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="mail" size={14} /> {g.email || g.email_zentrale || '-'}
                  </span>
                </div>

                {/* AUFGEKLAPPTE KONTAKTLISTE */}
                {isExpanded && (
                  <div style={{ cursor: 'default', background: 'transparent', width: '100%', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
                    
                    {g.adresse && (
                      <div style={{ padding: '8px 20px', fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px', borderTop: `1px dashed ${theme.border}`, background: 'rgba(0,0,0,0.05)' }}>
                        <Icon name="map" size={12} /> {g.adresse}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      {ansList.length > 0 ? (
                        ansList.map((ans, idx) => (
                          <div 
                            key={idx} 
                            className="crm-contact-row"
                            style={{ 
                              borderTop: `1px solid ${theme.border}`,
                              background: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                            }}
                          >
                            <span style={{ fontSize: '13px', color: theme.textMain, fontWeight: '500' }}>
                              {formatContactName(ans.abteilung, ans.name)}
                            </span>
                            <span style={{ fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon name="phone" size={12} /> {ans.telefon || '-'}
                            </span>
                            <span style={{ fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon name="mail" size={12} /> {ans.email || '-'}
                            </span>
                            <div></div>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '12px 20px', fontSize: '12px', color: theme.textMuted, borderTop: `1px solid ${theme.border}` }}>
                          Keine weiteren Ansprechpartner hinterlegt.
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '12px 20px 16px 20px', textAlign: 'right', borderTop: `1px dashed ${theme.border}` }}>
                      <button className="crm-delete-btn" onClick={() => loescheGegner(g.id)} style={{ background: 'transparent', border: `1px solid ${theme.warningBorder}`, color: theme.warningBorder, padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="trash" size={14} /> Behörde aus CRM löschen
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