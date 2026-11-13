import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub, extractFilename, cleanVal } from './utils';

const OWNER_USER_ID = 'ea175141-2c03-4f93-ba1b-392570229cb2';
const OWNER_DEFAULT_FAX = '035185074535';

export default function FirmenTresor({ session, theme, mandanten, ladeDaten, showToast, suchbegriff }) {
  const isOwnerUser = session?.user?.id === OWNER_USER_ID;

  const [laedt, setLaedt] = useState(false);
  const [uploadingMandantId, setUploadingMandantId] = useState(null);
  const [editMandantId, setEditMandantId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  
  const [m_firmenname, setM_firmenname] = useState('');
  const [m_ansprechpartner, setM_ansprechpartner] = useState('');
  const [m_adresse, setM_adresse] = useState('');
  const [m_telefon, setM_telefon] = useState('');
  const [m_fax, setM_fax] = useState(isOwnerUser ? OWNER_DEFAULT_FAX : '');
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

  // Neue Dateien vor dem Upload + zugehörige Beschriftungen
  const [m_dateien, setM_dateien] = useState([]);
  const [m_dateien_labels, setM_dateien_labels] = useState([]);

  // Bereits beim Mandanten gespeicherte Dokumente [{ cleanUrl, label, rawEntry }] zum Anzeigen & Umbenennen im Formular
  const [m_existing_docs, setM_existing_docs] = useState([]);

  const isDarkMode = theme.bg === '#020617';
  const btnTextColor = isDarkMode ? '#000' : '#ffffff';

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const h4StyleTresor = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word', boxSizing: 'border-box' };

  const listGrid = "2.5fr 2fr 3fr 2.5fr 50px"; 

  // Hilfsfunktion: Erzeugt aus einem Dateinamen einen sauberen Standard-Anzeigenamen ohne m_Timestamp_-Präfix
  const getCleanDefaultLabel = (filenameOrUrl) => {
    const rawFile = extractFilename(String(filenameOrUrl || '').split('#')[0]);
    const withoutPrefix = rawFile.replace(/^(m|h)_\d+_/, '');
    const withoutExt = withoutPrefix.replace(/\.[^/.]+$/, '');
    return withoutExt.replace(/_/g, ' ').trim() || rawFile;
  };

  // Hilfsfunktion: Liest aus einer gespeicherten URL (inkl. optionalem #label=...) die saubere URL und die Beschriftung aus
  const parseDocEntry = (rawUrlStr) => {
    const str = String(rawUrlStr || '').trim();
    if (!str) return { cleanUrl: '', label: 'Dokument', rawEntry: '' };
    const [cleanUrl, hashPart] = str.split('#');
    let customLabel = '';
    if (hashPart && hashPart.startsWith('label=')) {
      try {
        customLabel = decodeURIComponent(hashPart.replace(/^label=/, '')).trim();
      } catch (_e) {
        customLabel = hashPart.replace(/^label=/, '').trim();
      }
    }
    const fallbackLabel = getCleanDefaultLabel(cleanUrl);
    return {
      cleanUrl,
      label: customLabel || fallbackLabel,
      rawEntry: str
    };
  };

  // Hilfsfunktion: Baut die URL und die Beschriftung wieder zusammen (Kommas werden durch encodeURIComponent geschützt)
  const buildDocUrlWithLabel = (cleanUrl, labelText) => {
    const base = String(cleanUrl || '').split('#')[0].trim();
    const cleanLabel = String(labelText || '').trim();
    if (!cleanLabel) return base;
    return `${base}#label=${encodeURIComponent(cleanLabel)}`;
  };

  const gefilterteMandanten = mandanten.filter((m) => {
    if (!suchbegriff || !suchbegriff.trim()) return true;
    const s = suchbegriff.toLowerCase();
    const fName = (m.firmenname || '').toLowerCase();
    const ans = (m.ansprechpartner || '').toLowerCase();
    const mail = (m.email || '').toLowerCase();
    const adr = (m.adresse || '').toLowerCase();
    const fx = (m.fax || '').toLowerCase();
    const docsText = (m.dokument_url || '')
      .split(',')
      .filter(Boolean)
      .map(u => parseDocEntry(u).label.toLowerCase())
      .join(' ');
    return fName.includes(s) || ans.includes(s) || mail.includes(s) || adr.includes(s) || fx.includes(s) || docsText.includes(s);
  });

  const ladeInFormularMandant = (m) => {
    setEditMandantId(m.id);
    setM_firmenname(cleanVal(m.firmenname) || '');
    setM_ansprechpartner(cleanVal(m.ansprechpartner) || '');
    setM_adresse(cleanVal(m.adresse) || '');
    setM_telefon(cleanVal(m.telefon) || '');
    setM_fax(cleanVal(m.fax) || (isOwnerUser ? OWNER_DEFAULT_FAX : ''));
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

    // Bestehende Dokumente dieses Mandanten für das obere Formular aufbereiten
    if (m.dokument_url) {
      const parsedList = m.dokument_url
        .split(',')
        .map(u => u.trim())
        .filter(Boolean)
        .map(u => parseDocEntry(u));
      setM_existing_docs(parsedList);
    } else {
      setM_existing_docs([]);
    }

    setM_dateien([]);
    setM_dateien_labels([]);
    if (document.getElementById('tresor-datei-upload')) document.getElementById('tresor-datei-upload').value = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetMandantForm = () => {
    setEditMandantId(null);
    setM_firmenname(''); setM_ansprechpartner(''); setM_adresse(''); setM_telefon('');
    setM_fax(isOwnerUser ? OWNER_DEFAULT_FAX : '');
    setM_email('');
    setM_steuernummer(''); setM_ust_id(''); setM_betriebsnummer(''); setM_vbg_nummer(''); setM_handelsregister('');
    setM_iban(''); setM_bank_name(''); setM_ust_intervall('Vierteljährlich'); setM_dauerfrist(false);
    setM_dateien([]); setM_dateien_labels([]); setM_existing_docs([]);
    if (document.getElementById('tresor-datei-upload')) document.getElementById('tresor-datei-upload').value = '';
  };

  // Handler für neue Datei-Auswahl im oberen Formular (erzeugt direkt die Beschriftungsfelder)
  const handleNeuerDateiUploadSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setM_dateien(selectedFiles);
    setM_dateien_labels(selectedFiles.map(f => getCleanDefaultLabel(f.name)));
  };

  const speichereMandant = async (e) => {
    e.preventDefault();
    setLaedt(true);

    let alleUrls = [];
    if (m_dateien && m_dateien.length > 0) {
      for (let i = 0; i < m_dateien.length; i++) {
        const f = m_dateien[i];
        const customLabel = (m_dateien_labels[i] || '').trim() || getCleanDefaultLabel(f.name);
        const isMd = f.name.toLowerCase().endsWith('.md');

        if (isMd) {
          const mdInhalt = await f.text();
          const baseInfo = `Stammdokument (${customLabel}) aus Firmen-Tresor. Firma: ${m_firmenname}`;
          await supabase.from('wissensdatenbank').insert([{ datei_name: `${customLabel} (${f.name})`, firma: m_firmenname || 'Allgemein', inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`, dokument_url: null }]);
          await syncToGithub(f.name, mdInhalt, null, null, showToast);
        } else {
          const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const dateiName = `m_${Date.now()}_${i}_${sichererDateiname}`; 
          const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f);
          if (!uploadError) {
            const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
            const labeledUrl = buildDocUrlWithLabel(linkData.publicUrl, customLabel);
            alleUrls.push(labeledUrl);
          }
        }
      }
    }
    
    // Bestehende (evtl. im Formular umbenannte) Dokumente mit neuen Uploads zusammenführen
    const existingUrlsWithUpdatedLabels = m_existing_docs
      .filter(d => d && d.cleanUrl)
      .map(d => buildDocUrlWithLabel(d.cleanUrl, d.label));

    const combinedUrlArray = [...existingUrlsWithUpdatedLabels, ...alleUrls];
    const finalDocs = combinedUrlArray.length > 0 ? combinedUrlArray.join(',') : null;

    const payload = {
      user_id: session.user.id, firmenname: m_firmenname, ansprechpartner: m_ansprechpartner, adresse: m_adresse,
      telefon: m_telefon, fax: m_fax, email: m_email, steuernummer: m_steuernummer, ust_id: m_ust_id, betriebsnummer: m_betriebsnummer,
      vbg_nummer: m_vbg_nummer, handelsregister: m_handelsregister, iban: m_iban, bank_name: m_bank_name,
      ust_intervall: m_ust_intervall, dauerfrist: m_dauerfrist, dokument_url: finalDocs
    };

    if (editMandantId) {
      await supabase.from('mandanten').update(payload).eq('id', editMandantId);
      showToast('Änderungen & Dokument-Beschriftungen im Tresor gespeichert!', 'success');
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

    const defaultLabel = getCleanDefaultLabel(file.name);
    const inputLabel = window.prompt(
      `Wie soll dieses Stammdokument beschriftet werden (z.B. "Personalausweis", "Handelsregisterauszug", "Reisepass")?`,
      defaultLabel
    );
    const chosenLabel = (inputLabel !== null && inputLabel.trim() !== '') ? inputLabel.trim() : defaultLabel;

    setUploadingMandantId(mId);
    
    const isMd = file.name.toLowerCase().endsWith('.md');
    const matchMandant = mandanten.find(x => x.id === mId);
    const fName = matchMandant ? matchMandant.firmenname : 'Allgemein';

    if (isMd) {
      const mdInhalt = await file.text();
      const baseInfo = `Nachträgliches Stammdokument (${chosenLabel}). Firma: ${fName}`;
      await supabase.from('wissensdatenbank').insert([{ datei_name: `${chosenLabel} (${file.name})`, firma: fName, inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`, dokument_url: null }]);
      await syncToGithub(file.name, mdInhalt, null, null, showToast);
      ladeDaten();
      showToast(`Stammdokument "${chosenLabel}" angehängt!`, 'success');
    } else {
      const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const dateiName = `m_${Date.now()}_${sichererDateiname}`; 
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file);
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        const newUrlWithLabel = buildDocUrlWithLabel(linkData.publicUrl, chosenLabel);
        const updatedUrls = currentUrls ? `${currentUrls},${newUrlWithLabel}` : newUrlWithLabel;
        await supabase.from('mandanten').update({ dokument_url: updatedUrls }).eq('id', mId);

        if (editMandantId === mId) {
          setM_existing_docs(prev => [...prev, parseDocEntry(newUrlWithLabel)]);
        }

        ladeDaten();
        showToast(`Stammdokument "${chosenLabel}" angehängt!`, 'success');
      } else {
        showToast("Fehler beim Upload: " + uploadError.message, 'error');
      }
    }
    setUploadingMandantId(null);
    e.target.value = ''; 
  };

  const loescheDateiAusMandant = async (mId, aktuelleUrls, urlZumLoeschen) => {
    if (!window.confirm("Diese Datei wirklich aus dem Firmen-Profil entfernen?")) return;
    const cleanTarget = String(urlZumLoeschen || '').split('#')[0].trim();
    const urlArray = (aktuelleUrls || '').split(',').map(u => u.trim()).filter(Boolean);
    const neueUrls = urlArray.filter(url => String(url).split('#')[0].trim() !== cleanTarget);
    const neuerUrlString = neueUrls.length > 0 ? neueUrls.join(',') : null;
    const { error: dbError } = await supabase.from('mandanten').update({ dokument_url: neuerUrlString }).eq('id', mId);
    if (!dbError) {
       try {
         const parts = decodeURIComponent(cleanTarget).split('/');
         const fileName = parts[parts.length - 1];
         await supabase.storage.from('dokumente').remove([fileName]);
       } catch (e) { }
       if (editMandantId === mId) {
         setM_existing_docs(prev => prev.filter(d => d.cleanUrl !== cleanTarget));
       }
       ladeDaten();
       showToast('Datei erfolgreich aus Tresor entfernt!', 'success');
    } else { showToast("Fehler beim Entfernen der Datei: " + dbError.message, 'error'); }
  };

  return (
    <div>
      <style>{`
        /* HELPER KLASSEN FÜR STRIKTE TRENNUNG */
        .tresor-desktop-only {
          display: initial;
        }
        .tresor-mobile-only {
          display: none !important;
        }

        .tresor-desktop-header {
          display: grid;
          grid-template-columns: ${listGrid};
          gap: 15px;
          padding: 15px 20px;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
          text-align: left;
        }
        .tresor-main-row {
          display: grid;
          grid-template-columns: ${listGrid};
          gap: 15px;
          align-items: center;
          width: 100%;
        }
        
        /* FIX: Abgekoppeltes Layout für die geöffnete Ansicht (Platz für Button schaffen) */
        .tresor-expanded-grid {
          display: grid;
          grid-template-columns: 2.5fr 3fr 2.5fr auto;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .tresor-desktop-only {
            display: none !important;
          }
          .tresor-mobile-only {
            display: flex !important;
          }

          .tresor-desktop-header {
            display: none !important;
          }
          .tresor-main-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .tresor-mobile-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
          .tresor-expanded-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          .tresor-expanded-grid > div {
            width: 100% !important;
          }
          .tresor-delete-btn {
            width: 100% !important;
            justify-content: center !important;
            min-height: 42px !important;
          }
        }
      `}</style>

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
          <div><label style={labelStyle}>Faxnummer</label><input value={m_fax} onChange={e=>setM_fax(e.target.value)} placeholder="z.B. 035185074535" style={inputStyle}/></div>
          <div><label style={labelStyle}>E-Mail</label><input value={m_email} onChange={e=>setM_email(e.target.value)} style={inputStyle}/></div>

          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}><h4 style={h4StyleTresor}>2. Wichtige Nummern & Stammdokumente</h4></div>
          <div><label style={labelStyle}>Steuernummer</label><input value={m_steuernummer} onChange={e=>setM_steuernummer(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>USt-IdNr.</label><input value={m_ust_id} onChange={e=>setM_ust_id(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Betriebsnummer</label><input value={m_betriebsnummer} onChange={e=>setM_betriebsnummer(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>VBG-Nummer</label><input value={m_vbg_nummer} onChange={e=>setM_vbg_nummer(e.target.value)} style={inputStyle}/></div>
          <div><label style={labelStyle}>Handelsregister</label><input value={m_handelsregister} onChange={e=>setM_handelsregister(e.target.value)} style={inputStyle}/></div>

          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
            <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '8px'}}>
               <Icon name="paperclip" size={16} /> Stammdokumente (HR-Auszug, Personalausweis, Gewerbeanmeldung...)
            </label>
            <input
              id="tresor-datei-upload"
              type="file"
              multiple
              onChange={handleNeuerDateiUploadSelect}
              style={{...inputStyle, border: `1px dashed ${theme.tresorAccent}`, cursor: 'pointer', padding: '10px'}}
            />

            {/* BESCHRIFTUNGSFELDER FÜR NEU AUSGEWÄHLTE DATEIEN VOR DEM UPLOAD */}
            {m_dateien.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', background: theme.inputBg, border: `1px solid ${theme.tresorAccent}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.tresorAccent, textTransform: 'uppercase' }}>
                  Neue Datei(en) vor dem Speichern beschriften ({m_dateien.length}):
                </div>
                {m_dateien.map((fileObj, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileObj.name}>
                      📄 Originaldatei: {fileObj.name}
                    </span>
                    <input
                      type="text"
                      value={m_dateien_labels[idx] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setM_dateien_labels(prev => prev.map((lbl, i) => (i === idx ? val : lbl)));
                      }}
                      placeholder="Bezeichnung eingeben (z.B. Personalausweis, HR-Auszug, Reisepass)..."
                      style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px', borderColor: theme.tresorAccent }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* BEREITS HINTERLEGTE DOKUMENTE DIREKT OBEN IM FORMULAR ANZEIGEN, ÖFFNEN & UMBENENNEN */}
            {editMandantId && m_existing_docs.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain, textTransform: 'uppercase' }}>
                  Bereits hinterlegte Stammdokumente ({m_existing_docs.length}) – Bezeichnung hier direkt änderbar:
                </div>
                {m_existing_docs.map((docItem, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={docItem.label}
                      onChange={(e) => {
                        const newLbl = e.target.value;
                        setM_existing_docs(prev => prev.map((item, i) => (i === idx ? { ...item, label: newLbl } : item)));
                      }}
                      placeholder="Bezeichnung (z.B. Personalausweis, Handelsregisterauszug)..."
                      style={{ ...inputStyle, flex: '1 1 240px', padding: '8px 10px', fontSize: '13px' }}
                    />
                    <a
                      href={docItem.cleanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(45, 212, 191, 0.12)',
                        border: `1px solid ${theme.tresorAccent}`,
                        color: theme.tresorAccent,
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                      title={extractFilename(docItem.cleanUrl)}
                    >
                      <Icon name="file" size={14} /> Dokument öffnen
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const currentMandant = mandanten.find(x => x.id === editMandantId);
                        loescheDateiAusMandant(editMandantId, currentMandant?.dokument_url || '', docItem.cleanUrl);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: `1px solid ${theme.warningBorder}`,
                        color: theme.warningBorder,
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Dokument löschen"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <button type="submit" disabled={laedt} style={{ padding: '14px', background: theme.tresorAccent, color: btnTextColor, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
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
      
      {/* GESPEICHERTE MANDANTEN WRAPPER */}
      <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', background: theme.cardBg, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '100%' }}>
          
          {/* DESKTOP HEADER */}
          <div className="tresor-desktop-header" style={{ background: theme.inputBg, borderBottom: `1px solid ${theme.border}`, color: theme.textMuted }}>
            <div>Firma / Mandant</div>
            <div>Kontakt</div>
            <div>Steuern & Bank</div>
            <div>Dokumente</div>
            <div style={{ textAlign: 'center' }}>Aktion</div>
          </div>

          {gefilterteMandanten.map(m => {
            const isExpanded = expandedId === m.id;
            const isActive = editMandantId === m.id;
            const parsedDocs = m.dokument_url
              ? m.dokument_url.split(',').map(u => u.trim()).filter(Boolean).map(u => parseDocEntry(u))
              : [];
            const numDocs = parsedDocs.length;
            const displayFax = cleanVal(m.fax) || (isOwnerUser ? OWNER_DEFAULT_FAX : '');

            return (
              <div 
                key={m.id} 
                style={{ padding: '15px 20px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, borderLeft: isActive ? `4px solid ${theme.tresorAccent}` : `4px solid transparent`, background: isActive ? (isDarkMode ? 'rgba(0, 229, 255, 0.08)' : '#f0f9ff') : 'transparent', transition: 'all 0.2s ease', margin: 0, textAlign: 'left', width: '100%', boxSizing: 'border-box' }}
                onClick={() => { ladeInFormularMandant(m); setExpandedId(isExpanded ? null : m.id); }}
              >
                {/* HAUPTZEILE */}
                <div className="tresor-main-row">
                  
                  {/* SPALTE 1 DESKTOP: REINE FIRMENDATEN */}
                  <div className="tresor-desktop-only" style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ color: theme.tresorAccent, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.firmenname}</strong>
                      <span style={{ fontSize: '11px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="user" size={10} /> {cleanVal(m.ansprechpartner) || '-'}</span>
                    </div>
                  </div>

                  {/* SPALTE 1 MOBIL: FIRMENDATEN + PFEIL */}
                  <div className="tresor-mobile-only tresor-mobile-top">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ color: theme.tresorAccent, fontSize: '14px' }}>{m.firmenname}</strong>
                      <span style={{ fontSize: '11px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="user" size={10} /> {cleanVal(m.ansprechpartner) || '-'}</span>
                    </div>
                    <div style={{ color: isActive ? theme.tresorAccent : theme.textMuted, paddingLeft: '8px' }}>
                      <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                    </div>
                  </div>
                  
                  {/* SPALTE 2: KONTAKT (INKL. FAXNUMMER) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="phone" size={12}/> {cleanVal(m.telefon) || '-'}</span>
                    {displayFax && (
                      <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>FAX: {displayFax}</span>
                    )}
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="mail" size={12}/> {cleanVal(m.email) || '-'}</span>
                  </div>

                  {/* SPALTE 3: STEUERN & BANK */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>USt-Id: {cleanVal(m.ust_id) || '-'}</span>
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>IBAN: {cleanVal(m.iban) || '-'}</span>
                  </div>

                  {/* SPALTE 4: DOKUMENTE (INKL. BESCHRIFTUNGS-VORSCHAU) */}
                  <div style={{ fontSize: '12px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {numDocs > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: theme.tresorAccent, fontWeight: 'bold' }}>
                          {numDocs} {numDocs === 1 ? 'Dokument' : 'Dokumente'}
                        </span>
                        <span style={{ fontSize: '11px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {parsedDocs.map(d => d.label).join(', ')}
                        </span>
                      </div>
                    ) : '-'}
                  </div>

                  {/* SPALTE 5 DESKTOP: PFEIL GANZ RECHTS */}
                  <div className="tresor-desktop-only" style={{ color: isActive ? theme.tresorAccent : theme.textMuted, textAlign: 'center' }}>
                    <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                  </div>
                </div>

                {/* AUFGEKLAPPTER BEREICH */}
                {isExpanded && (
                  <div className="tresor-expanded-grid" style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.border}`, cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                    
                    {/* SPALTE 1: ADRESSE, FAX & UST-RADAR */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: theme.textMain }}>{cleanVal(m.adresse) || '-'}</span>
                      {displayFax && (
                        <span style={{ fontSize: '12px', color: theme.textMain }}>Fax: {displayFax}</span>
                      )}
                      <div style={{ marginTop: '4px', fontSize: '11px', color: theme.textMain, fontWeight: 'bold' }}>
                        USt-Radar: <span style={{ color: theme.tresorAccent }}>{m.ust_intervall || 'Vierteljährlich'} {m.dauerfrist ? '(DFV)' : ''}</span>
                      </div>
                    </div>

                    {/* SPALTE 2: STEUERN DETAILS */}
                    <div style={{ fontSize: '11px', color: theme.textMain, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div><span style={{color: theme.textMuted}}>St-Nr:</span> {cleanVal(m.steuernummer) || '-'}</div>
                      <div><span style={{color: theme.textMuted}}>VBG:</span> {cleanVal(m.vbg_nummer) || '-'}</div>
                      <div><span style={{color: theme.textMuted}}>Betr.-Nr:</span> {cleanVal(m.betriebsnummer) || '-'}</div>
                      <div><span style={{color: theme.textMuted}}>Bank:</span> {cleanVal(m.bank_name) || '-'}</div>
                    </div>

                    {/* SPALTE 3: DOKUMENTE MIT VOLLER LESBARER BESCHRIFTUNG */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {parsedDocs.map((docObj, idx) => {
                        return (
                          <div key={idx} style={{ display: 'inline-flex', alignItems: 'stretch', background: theme.border, borderRadius: '4px', overflow: 'hidden', border: `1px solid ${theme.border}`, width: 'fit-content', maxWidth: '100%' }}>
                            <a
                              href={docObj.cleanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', fontSize: '11px', fontWeight: 'bold', color: theme.textMain, background: 'rgba(0,0,0,0.1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              title={`${docObj.label} (${extractFilename(docObj.cleanUrl)})`}
                            >
                              <Icon name="file" size={12} /> {docObj.label}
                            </a>
                            <button
                              onClick={() => loescheDateiAusMandant(m.id, m.dokument_url, docObj.cleanUrl)}
                              style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 6px', cursor: 'pointer', color: theme.textMuted }}
                              title="Datei löschen"
                            >
                              <Icon name="x" size={11} />
                            </button>
                          </div>
                        );
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

                    {/* SPALTE 4: LÖSCHEN-BUTTON */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="tresor-delete-btn" onClick={() => loescheMandant(m.id)} style={{ background: 'transparent', border: `1px solid ${theme.warningBorder}`, color: theme.warningBorder, padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }} title="Mandant löschen">
                        <Icon name="trash" size={14} /> Mandant aus Tresor löschen
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