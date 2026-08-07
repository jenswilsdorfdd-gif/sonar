import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// --- HILFSFUNKTION FÜR DATEINAMEN ---
const extractFilename = (url) => {
  if (!url) return 'Datei';
  try {
    const decodedUrl = decodeURIComponent(url);
    const parts = decodedUrl.split('/');
    const fullName = parts[parts.length - 1];
    const cleanName = fullName.replace(/^\d+_/, '');
    return cleanName;
  } catch (e) {
    return 'Datei';
  }
};

// --- HILFSFUNKTION FÜR TOLERANTE FIRMEN-SUCHE (Fuzzy Search) ---
const normalizeName = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\b(gmbh|ug|ag|gbr|ohg|kg|haftungsbeschränkt|ev|familie|finanzamt|landratsamt|stadt|landeshauptstadt|ordnungsamt)\b/g, '') 
    .replace(/&/g, 'und') 
    .replace(/[^a-z0-9]/g, ''); 
};

// --- FILTER GEGEN "null" STRINGS ---
const cleanVal = (val) => {
  if (!val || val === 'null' || val === 'undefined' || String(val).trim() === '') return null;
  return val;
};

// --- ECHTE VEKTOR-ICONS ---
const Icon = ({ name, size = 18, style }) => {
  const UI_ICONS = {
    signal: <><circle cx="12" cy="12" r="2"/><path d="M5 19a10 10 0 0 1 0-14"/><path d="M19 5a10 10 0 0 1 0 14"/><path d="M8 16a6 6 0 0 1 0-8"/><path d="M16 8a6 6 0 0 1 0 8"/></>,
    radar: <><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    bulb: <><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></>,
    wand: <><path d="M15 4V2m0 14v-2M8 9h2m10 0h2m-13.8 6.2 1.4-1.4m11.2-8.6 1.4-1.4M6.2 6.2l1.4 1.4m8.6 11.2 1.4 1.4M3 21l9-9m3.5-3.5L17 7"/></>,
    paperclip: <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>,
    cabinet: <><rect width="20" height="20" x="2" y="2" rx="2" ry="2"/><path d="M2 12h20M6 7h12M6 17h12"/></>,
    building: <><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M16 10h.01M8 10h.01M8 14h.01M12 14h.01"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4m0 4h.01"/></>,
    folder: <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M12 11v6m-3-3h6"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    file: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></>,
    eyeOff: <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24m-4.24-4.24a3 3 0 0 1 4.24 4.24m-4.24-4.24L2 2m20 20-9.88-9.88M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    down: <path d="m6 9 6 6 6-6"/>,
    right: <path d="m9 18 6-6-6-6"/>,
    user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    check: <path d="M20 6 9 17l-5-5"/>,
    refresh: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>,
    trash: <><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>,
    in: <><polyline points="8 12 12 16 16 12"/><line x1="12" x2="12" y1="8" y2="16"/><path d="M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6"/><path d="M22 12 19 6H5l-3 6"/></>,
    out: <><polyline points="16 12 12 8 8 12"/><line x1="12" x2="12" y1="16" y2="8"/><path d="M22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6"/><path d="M22 12 19 6H5l-3 6"/></>,
    note: <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
    mail: <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
    x: <path d="M18 6L6 18M6 6l12 12"/>,
    send: <><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></>,
    swap: <><path d="M16 3l4 4-4 4"/><path d="M20 7H4"/><path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/></>
  };

  return (
    <svg 
      width={size} height={size} 
      viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
    >
      {UI_ICONS[name]}
    </svg>
  );
};

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('akten') 
  const [isDarkMode, setIsDarkMode] = useState(true) 
  const [laedt, setLaedt] = useState(false)
  
  const [akten, setAkten] = useState([])
  const [uploadingHistId, setUploadingHistId] = useState(null)
  
  const [modus, setModus] = useState('neu') 
  const [selectedAkteId, setSelectedAkteId] = useState('')
  
  const [aktenzeichen, setAktenzeichen] = useState('')
  const [gegnerName, setGegnerName] = useState('')
  const [gegnerAnsprechpartner, setGegnerAnsprechpartner] = useState('')
  const [gegnerTelefon, setGegnerTelefon] = useState('')
  const [gegnerEmail, setGegnerEmail] = useState('')
  
  const [unsereFirma, setUnsereFirma] = useState('')
  const [unserAnsprechpartner, setUnserAnsprechpartner] = useState('')
  const [unserTelefon, setUnserTelefon] = useState('')
  const [unserEmail, setUnserEmail] = useState('')
  const [thema, setThema] = useState('')
  
  const [typ, setTyp] = useState('Eingang')
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0])
  const [aktion, setAktion] = useState('')
  const [kanal, setKanal] = useState('')
  const [fristExtern, setFristExtern] = useState('')
  const [wiedervorlage, setWiedervorlage] = useState('')
  
  const [dateien, setDateien] = useState([])
  const [briefEntwurf, setBriefEntwurf] = useState('')
  const [jsonImport, setJsonImport] = useState('')
  const [tresorPrompt, setTresorPrompt] = useState(null) 

  const [aufgeklappteAkten, setAufgeklappteAkten] = useState([])
  const [zeigeErledigte, setZeigeErledigte] = useState(false)

  // MANDANTEN CRM
  const [mandanten, setMandanten] = useState([])
  const [editMandantId, setEditMandantId] = useState(null)
  const [m_firmenname, setM_firmenname] = useState('')
  const [m_ansprechpartner, setM_ansprechpartner] = useState('')
  const [m_adresse, setM_adresse] = useState('')
  const [m_telefon, setM_telefon] = useState('')
  const [m_email, setM_email] = useState('')
  const [m_steuernummer, setM_steuernummer] = useState('')
  const [m_ust_id, setM_ust_id] = useState('')
  const [m_betriebsnummer, setM_betriebsnummer] = useState('')
  const [m_vbg_nummer, setM_vbg_nummer] = useState('')
  const [m_handelsregister, setM_handelsregister] = useState('')
  const [m_iban, setM_iban] = useState('')
  const [m_bank_name, setM_bank_name] = useState('')
  const [m_ust_intervall, setM_ust_intervall] = useState('Vierteljährlich')
  const [m_dauerfrist, setM_dauerfrist] = useState(false)

  // GEGNER / BEHÖRDEN CRM
  const [gegnerListe, setGegnerListe] = useState([])
  const [editGegnerId, setEditGegnerId] = useState(null)
  const [g_name, setG_name] = useState('')
  const [g_abteilung, setG_abteilung] = useState('')
  const [g_ansprechpartner, setG_ansprechpartner] = useState('')
  const [g_adresse, setG_adresse] = useState('')
  const [g_telefon, setG_telefon] = useState('')
  const [g_fax, setG_fax] = useState('')
  const [g_email, setG_email] = useState('')
  const [g_notizen, setG_notizen] = useState('')

  // ZUSTÄNDIGKEITS-WECHSEL STATE
  const [transferAkteId, setTransferAkteId] = useState(null)
  const [neuerGegnerName, setNeuerGegnerName] = useState('')

  const theme = isDarkMode ? {
    bg: '#020617', cardBg: '#0f172a', border: '#1e293b', textMain: '#ffffff', textMuted: '#94a3b8',
    accent: '#00e5ff', accentHover: '#00b8cc', tresorAccent: '#2dd4bf',
    gegnerAccent: '#f43f5e',
    inputBg: '#020617', inputBorder: '#334155', warningBg: 'rgba(244, 63, 94, 0.1)', warningBorder: '#f43f5e', 
    warningText: '#fda4af', hintBg: 'rgba(250, 204, 21, 0.1)', hintBorder: '#facc15', hintText: '#fef08a' 
  } : {
    bg: '#f8fafc', cardBg: '#ffffff', border: '#e2e8f0', textMain: '#0f172a', textMuted: '#64748b',
    accent: '#0284c7', accentHover: '#0369a1', tresorAccent: '#0f766e',
    gegnerAccent: '#e11d48',
    inputBg: '#f8fafc', inputBorder: '#cbd5e1', warningBg: '#fff1f2', warningBorder: '#e11d48', 
    warningText: '#be123c', hintBg: '#fefce8', hintBorder: '#fde047', hintText: '#854d0e' 
  };

  useEffect(() => {
    const styleId = 'sonar-global-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background-color: ${theme.bg} !important; overflow-x: hidden !important; }
      * { box-sizing: border-box !important; }
      input::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; transition: 0.2s; }
      input::-webkit-calendar-picker-indicator:hover { opacity: 1; }
    `;

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2300e5ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M5 19a10 10 0 0 1 0-14"/><path d="M19 5a10 10 0 0 1 0 14"/><path d="M8 16a6 6 0 0 1 0-8"/><path d="M16 8a6 6 0 0 1 0 8"/></svg>`;

    return () => { if (styleTag) document.head.removeChild(styleTag); };
  }, [isDarkMode, theme.bg]);

  // STAPEL-SORTIERUNG: Neuestes Dokument ZUERST (DESC)
  const ladeDaten = async () => {
    const { data: aktenData, error: aktenError } = await supabase.from('akten').select(`*, akten_historie (*)`).order('created_at', { ascending: false })
    if (!aktenError && aktenData) {
      aktenData.forEach(akte => { 
        if(akte.akten_historie) {
          akte.akten_historie.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) 
        } 
      })
      setAkten(aktenData)
    }
    const { data: mandantenData } = await supabase.from('mandanten').select('*').order('firmenname', { ascending: true })
    if (mandantenData) setMandanten(mandantenData)

    const { data: gegnerData } = await supabase.from('gegner').select('*').order('name', { ascending: true })
    if (gegnerData) setGegnerListe(gegnerData)
  }

  useEffect(() => { ladeDaten() }, [])

  const handleInlineEdit = async (histId, feld, wert) => {
    const { error } = await supabase.from('akten_historie').update({ [feld]: wert || null }).eq('id', histId);
    if (!error) ladeDaten(); else alert("Fehler beim Speichern: " + error.message);
  };

  const loescheHistorieEintrag = async (histId) => {
    if(!window.confirm("Diesen einzelnen Eintrag aus der Akte löschen?")) return;
    await supabase.from('akten_historie').delete().eq('id', histId);
    ladeDaten();
  };

  const setzeWV = (tage, monate = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + tage);
    if (monate > 0) d.setMonth(d.getMonth() + monate);
    setWiedervorlage(d.toISOString().split('T')[0]);
  };

  const toggleTresorUpdateKey = (key) => {
    setTresorPrompt(prev => {
      if (!prev) return prev;
      const keys = prev.selectedKeys.includes(key)
        ? prev.selectedKeys.filter(k => k !== key)
        : [...prev.selectedKeys, key];
      return { ...prev, selectedKeys: keys };
    });
  };

  // --- PARSEN VON GEM SONAR MEGA-LEGAL JSON ---
  const handleJsonImport = (e) => {
    setActiveTab('akten')
    const val = e.target.value
    setJsonImport(val)
    
    try {
      const obj = JSON.parse(val)

      setAktenzeichen(obj.aktenzeichen || '')
      setThema(obj.thema || '')
      setGegnerName(obj.kontakt || '') 
      setGegnerAnsprechpartner(obj.ansprechpartner || '')
      setGegnerTelefon(obj.gegner_telefon || '')
      setGegnerEmail(obj.gegner_email || '')
      setFristExtern(obj.frist_extern || '')
      setBriefEntwurf(obj.brief_entwurf || '')
      setAktion(obj.aktion || '')
      setKanal(obj.kanal || 'Post / Fax / E-Mail')
      setTyp(obj.typ || 'Eingang')
      setDatum(new Date().toISOString().split('T')[0])

      if (obj.aktenzeichen) {
        const match = akten.find(a => a.aktenzeichen === obj.aktenzeichen && a.status !== 'Erledigt')
        if (match) {
          setModus('bestehend');
          setSelectedAkteId(match.id);
        } else {
          setModus('neu');
        }
      } else {
        setModus('neu');
      }

      if (obj.unsere_firma) {
        const existingMandant = mandanten.find(m => normalizeName(m.firmenname) === normalizeName(obj.unsere_firma));
        if (!existingMandant) {
          setUnsereFirma(obj.unsere_firma || '');
          setUnserAnsprechpartner(cleanVal(obj.unser_ansprechpartner) || '');
          setUnserTelefon(cleanVal(obj.unser_telefon) || '');
          setUnserEmail(cleanVal(obj.unser_email) || '');
          setTresorPrompt({ typ: 'neu', obj });
        } else {
           setUnsereFirma(existingMandant.firmenname); 
           setUnserAnsprechpartner(cleanVal(obj.unser_ansprechpartner) || cleanVal(existingMandant.ansprechpartner) || '');
           setUnserTelefon(cleanVal(obj.unser_telefon) || cleanVal(existingMandant.telefon) || '');
           setUnserEmail(cleanVal(obj.unser_email) || cleanVal(existingMandant.email) || '');

           let updates = {};
           const checkUpdate = (oldVal, newVal) => {
             const o = (!oldVal || oldVal === 'null' || oldVal === 'undefined') ? '' : String(oldVal).trim();
             const n = (!newVal || newVal === 'null' || newVal === 'undefined') ? '' : String(newVal).trim();
             return (n !== '' && o !== n) ? n : null;
           };
           
           let u1 = checkUpdate(existingMandant.ansprechpartner, obj.unser_ansprechpartner); if(u1) updates.ansprechpartner = u1;
           let u2 = checkUpdate(existingMandant.telefon, obj.unser_telefon); if(u2) updates.telefon = u2;
           let u3 = checkUpdate(existingMandant.email, obj.unser_email); if(u3) updates.email = u3;
           let u4 = checkUpdate(existingMandant.adresse, obj.unsere_adresse); if(u4) updates.adresse = u4;
           let u5 = checkUpdate(existingMandant.steuernummer, obj.unsere_steuernummer); if(u5) updates.steuernummer = u5;
           let u6 = checkUpdate(existingMandant.ust_id, obj.unsere_ust_id); if(u6) updates.ust_id = u6;

           if (Object.keys(updates).length > 0) {
              setTresorPrompt({ 
                typ: 'update', existingId: existingMandant.id, updates, 
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
        ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || ''
      }]).select();
      if (!error && data) {
        setMandanten(prev => [...prev, data[0]]);
        alert(`✅ Mandant "${tresorPrompt.obj.unsere_firma}" im Tresor angelegt!`);
      }
    } else if (tresorPrompt.typ === 'update') {
      let finalUpdates = {};
      tresorPrompt.selectedKeys.forEach(k => { finalUpdates[k] = tresorPrompt.updates[k]; });
      if (Object.keys(finalUpdates).length > 0) {
        await supabase.from('mandanten').update(finalUpdates).eq('id', tresorPrompt.existingId);
        ladeDaten();
        alert(`✅ Tresor-Eintrag für "${tresorPrompt.firma}" aktualisiert!`);
      }
    }
    setTresorPrompt(null);
  };

  // RESEND VERSAND LOGIK
  const handleResendVersand = async (versandArt) => {
    if (!gegnerEmail && versandArt === 'email') {
      alert("⚠️ Bitte trage zuerst eine E-Mail-Adresse der Gegenseite / Behörde ein!");
      return;
    }
    if (!gegnerTelefon && versandArt === 'fax') {
      alert("⚠️ Bitte trage zuerst eine Faxnummer der Gegenseite ein!");
      return;
    }

    setLaedt(true);
    try {
      const targetAddress = versandArt === 'email' 
        ? gegnerEmail 
        : `${gegnerTelefon.replace(/[^0-9]/g, '')}@pdf24.org`; 

      alert(`🚀 RESEND VERSANDGANG INITIERT:\n\nArt: ${versandArt.toUpperCase()}\nEmpfänger: ${targetAddress}\nBetreff: AZ ${aktenzeichen || 'Neu'} - ${thema}`);
    } catch (e) {
      alert("Versandfehler: " + e.message);
    }
    setLaedt(false);
  };

  const handleNachtragUpload = async (histId, currentUrls, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingHistId(histId);
    const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const dateiName = `${Date.now()}_${sichererDateiname}`; 
    const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file);
    if (!uploadError) {
      const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
      const newUrl = linkData.publicUrl;
      const updatedUrls = currentUrls ? `${currentUrls},${newUrl}` : newUrl;
      const { error } = await supabase.from('akten_historie').update({ dokument_url: updatedUrls }).eq('id', histId);
      if (!error) ladeDaten();
    }
    setUploadingHistId(null);
    e.target.value = ''; 
  };

  const speichereEintrag = async (e) => {
    e.preventDefault()
    setLaedt(true)

    if (tresorPrompt && tresorPrompt.typ === 'neu') {
      const { data: mData } = await supabase.from('mandanten').insert([{
        user_id: session.user.id,
        firmenname: tresorPrompt.obj.unsere_firma,
        ansprechpartner: cleanVal(tresorPrompt.obj.unser_ansprechpartner) || '',
        telefon: cleanVal(tresorPrompt.obj.unser_telefon) || '',
        email: cleanVal(tresorPrompt.obj.unser_email) || '',
        adresse: cleanVal(tresorPrompt.obj.unsere_adresse) || '',
        steuernummer: cleanVal(tresorPrompt.obj.unsere_steuernummer) || '',
        ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || ''
      }]).select();
      if (mData) setMandanten(prev => [...prev, mData[0]]);
    }

    let alleUrls = [];
    if (dateien && dateien.length > 0) {
      for (const f of dateien) {
        const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const dateiName = `${Date.now()}_${sichererDateiname}` 
        const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f)
        if (!uploadError) {
          const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName)
          alleUrls.push(linkData.publicUrl)
        }
      }
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
      if (aktenError) { alert("Fehler Akte: " + aktenError.message); setLaedt(false); return; }
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
      setAktenzeichen(''); setGegnerName(''); setGegnerAnsprechpartner(''); setGegnerTelefon(''); setGegnerEmail(''); 
      setUnsereFirma(''); setUnserAnsprechpartner(''); setUnserTelefon(''); setUnserEmail(''); setThema(''); 
      setAktion(''); setKanal(''); setFristExtern(''); setWiedervorlage(''); setDateien([]); 
      setBriefEntwurf(''); setJsonImport(''); setTresorPrompt(null);
      if (document.getElementById('datei-upload-manuell')) document.getElementById('datei-upload-manuell').value = '';
      ladeDaten()
    }
    setLaedt(false)
  }

  // GEGNER WECHSEL
  const naechsterGegnerUebergeben = async (akteId) => {
    if (!neuerGegnerName) {
      alert("Bitte gib den Namen der neuen Behörde / des neuen Gegners ein!");
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
      alert(`✅ Akte an "${neuerGegnerName}" übergeben!`);
    }
  };

  const toggleAkte = (id) => {
    if (aufgeklappteAkten.includes(id)) setAufgeklappteAkten(aufgeklappteAkten.filter(aId => aId !== id))
    else setAufgeklappteAkten([...aufgeklappteAkten, id])
  }

  const loescheAkte = async (id) => {
    if(!window.confirm("Ganze Akte löschen?")) return
    await supabase.from('akten').delete().eq('id', id)
    ladeDaten()
  }

  const setzeAkteErledigt = async (id, isErledigt) => {
    const status = isErledigt ? 'Erledigt' : 'Offen'
    const d = isErledigt ? new Date().toISOString().split('T')[0] : null
    await supabase.from('akten').update({ status: status, erledigt_am: d }).eq('id', id)
    ladeDaten()
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
    const gId = e.target.value
    if(!gId) return
    const g = gegnerListe.find(x => x.id === gId)
    if(g) {
      setGegnerName(g.name || ''); setGegnerAnsprechpartner(g.ansprechpartner || '');
      setGegnerTelefon(g.telefon || ''); setGegnerEmail(g.email || '');
    }
  }

  const ladeInFormularMandant = (m) => {
    setEditMandantId(m.id);
    setM_firmenname(cleanVal(m.firmenname) || '');
    setM_ansprechpartner(cleanVal(m.ansprechpartner) || '');
    setM_adresse(cleanVal(m.adresse) || '');
    setM_telefon(cleanVal(m.telefon) || '');
    setM_email(cleanVal(m.email) || '');
    setM_steuernummer(cleanVal(m.steuernummer) || '');
    setM_ust_id(cleanVal(m.ust_id) || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const speichereMandant = async (e) => {
    e.preventDefault()
    setLaedt(true)
    const payload = {
      user_id: session.user.id, firmenname: m_firmenname, ansprechpartner: m_ansprechpartner, adresse: m_adresse,
      telefon: m_telefon, email: m_email, steuernummer: m_steuernummer, ust_id: m_ust_id
    };

    if (editMandantId) {
      await supabase.from('mandanten').update(payload).eq('id', editMandantId);
    } else {
      await supabase.from('mandanten').insert([payload]);
    }
    setEditMandantId(null); setM_firmenname(''); ladeDaten(); setLaedt(false);
  }

  const speichereGegner = async (e) => {
    e.preventDefault()
    setLaedt(true)
    const payload = {
      user_id: session.user.id, name: g_name, abteilung: g_abteilung, ansprechpartner: g_ansprechpartner,
      adresse: g_adresse, telefon: g_telefon, fax: g_fax, email: g_email, notizen: g_notizen
    };

    if (editGegnerId) {
      await supabase.from('gegner').update(payload).eq('id', editGegnerId);
    } else {
      await supabase.from('gegner').insert([payload]);
    }
    setEditGegnerId(null); setG_name(''); setG_abteilung(''); setG_ansprechpartner(''); ladeDaten(); setLaedt(false);
  }

  const berechneTageBis = (datumStr) => {
    if (!datumStr) return null;
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const frist = new Date(datumStr); frist.setHours(0, 0, 0, 0);
    return Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
  };

  // --- WIEDERVORLAGE UND FRISTEN LEISTE ---
  const fristenWarnungen = [];
  akten.filter(a => a.status !== 'Erledigt').forEach(akte => {
    if(akte.akten_historie) {
      akte.akten_historie.forEach(hist => {
        // Prüfe sowohl Frist als auch Wiedervorlage
        const zielDatum = hist.wiedervorlage || hist.frist_extern;
        if(zielDatum) {
          const tage = berechneTageBis(zielDatum);
          if (tage !== null && tage <= 7) { 
            let alarmStufe = '1. ERINNERUNG';
            if (tage <= 4 && tage > 2) alarmStufe = '2. ERINNERUNG';
            if (tage <= 2) alarmStufe = 'ALARM';
            fristenWarnungen.push({ 
              ...hist, 
              akte_id: akte.id,
              akte_thema: akte.thema, 
              akte_gegner: akte.gegner_name, 
              tageUebrig: tage, 
              alarmStufe,
              isWiedervorlage: !!hist.wiedervorlage,
              aktivesDatum: zielDatum
            })
          }
        }
      })
    }
  });
  fristenWarnungen.sort((a, b) => a.tageUebrig - b.tageUebrig);

  const gefilterteAkten = akten.filter((akte) => zeigeErledigte ? true : akte.status !== 'Erledigt')
  const formatDatum = (datum) => datum ? new Date(datum).toLocaleDateString('de-DE') : '-'

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const h4StyleAkten = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%' };
  const quickBtnStyle = { background: theme.border, color: theme.textMain, border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: '1200px', padding: 'max(15px, 2vw)', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER & THEME TOGGLE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0, color: theme.textMain, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="signal" size={24} style={{ color: theme.accent }} /> SONAR COCKPIT
          </h1>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            style={{ background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <Icon name={isDarkMode ? 'sun' : 'moon'} size={18} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* EBENE 1: MAGIC IMPORT & SONAR GUIDE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px', width: '100%' }}>
          <div style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px dashed ${theme.hintBorder}` }}>
            <label style={{...labelStyle, color: theme.hintText, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Icon name="wand" size={18} /> Magic Import (JSON aus SONAR MEGA-LEGAL)
            </label>
            <textarea 
              value={jsonImport} onChange={handleJsonImport} 
              placeholder='{"typ": "Eingang", "aktenzeichen": "...", "thema": "..."}'
              style={{ ...inputStyle, background: 'rgba(0,0,0,0.1)', border: `1px solid ${theme.hintBorder}`, color: theme.hintText, height: '100px', fontFamily: 'monospace', fontSize: '14px', marginTop: '5px' }} 
            />
          </div>

          <div style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px solid ${theme.hintBorder}`, color: theme.hintText, display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
            <div style={{ marginTop: '2px', color: theme.hintText }}><Icon name="bulb" size={24} /></div>
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: theme.hintText }}>Sonar Workflow: SONAR MEGA-LEGAL ➔ Cockpit</h4>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>
                1. Dokument in <strong>SONAR MEGA-LEGAL</strong> prüfen lassen.<br/>
                2. KI erzeugt das Erst-JSON (Eingang) ➔ Hier einfügen.<br/>
                3. Nach Freigabe des Antwortschreibens: Ausgangs-JSON einfügen & per Resend versenden!
              </p>
            </div>
          </div>
        </div>

        {/* EBENE 2: TABS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px', width: '100%' }}>
          <button 
            onClick={() => setActiveTab('akten')} 
            style={{ flex: '1 1 120px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'akten' ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'akten' ? theme.accent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="cabinet" size={22} /> Akten-Cockpit
          </button>

          <button 
            onClick={() => setActiveTab('tresor')} 
            style={{ flex: '1 1 120px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'tresor' ? `2px solid ${theme.tresorAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'tresor' ? theme.tresorAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="building" size={22} /> Firmen-Tresor
          </button>

          <button 
            onClick={() => setActiveTab('gegner')} 
            style={{ flex: '1 1 120px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'gegner' ? `2px solid ${theme.gegnerAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'gegner' ? theme.gegnerAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="shield" size={22} /> Behörden / Gegner CRM
          </button>

          <div style={{ flex: '1 1 260px', ...panelStyle, margin: 0, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
               <Icon name="paperclip" size={16} /> Manueller Upload (PDF/Scan)
            </label>
            <input 
              id="datei-upload-manuell" 
              type="file" multiple 
              onChange={(e) => { setDateien(Array.from(e.target.files)); setActiveTab('akten'); }} 
              style={{...inputStyle, border: `1px dashed ${theme.accent}`, cursor: 'pointer', padding: '6px', fontSize: '12px'}} 
            />
          </div>
        </div>

        {/* ========================================= */}
        {/* ============= AKTEN COCKPIT ============= */}
        {/* ========================================= */}
        {activeTab === 'akten' && (
        <>
          {/* FRISTEN & WIEDERVORLAGE RADAR */}
          {fristenWarnungen.length > 0 && (
            <div style={{ ...panelStyle, background: theme.warningBg, border: `1px solid ${theme.warningBorder}`, marginBottom: '20px' }}>
              <h4 style={{ color: theme.warningText, margin: '0 0 15px 0', textAlign: 'left', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon name="alert" size={20} /> Dringende Alarme & Wiedervorlagen
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
                {fristenWarnungen.map(w => {
                  const heute = new Date();
                  const zielDatum = new Date(w.aktivesDatum);
                  
                  // BERECHNE +3 TAGE ZUKUNFT
                  const plusDreiDate = new Date(zielDatum);
                  plusDreiDate.setDate(plusDreiDate.getDate() + 3);

                  // STRIKTE PRÜFUNG: Darf niemals hinter der originalen Frist_extern liegen!
                  let shiftDisabled = false;
                  if (w.frist_extern) {
                    const originalFristDate = new Date(w.frist_extern);
                    // Wenn +3 Tage hinter der Originalfrist liegen würde -> SPERRE!
                    if (plusDreiDate > originalFristDate) {
                      shiftDisabled = true;
                    }
                  }

                  const plusDreiIso = plusDreiDate.toISOString().split('T')[0];

                  return (
                    <div key={`warn-${w.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 15px', borderRadius: '6px', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <strong style={{color: theme.warningText}}>{w.akte_gegner}</strong> ({w.akte_thema}) — <span style={{fontWeight: 'bold'}}>{w.isWiedervorlage ? 'Wiedervorlage' : 'Frist'}: {formatDatum(w.aktivesDatum)}</span>
                        {w.frist_extern && w.isWiedervorlage && <span style={{fontSize: '11px', opacity: 0.8, marginLeft: '8px'}}>(Hartes Fristdatum: {formatDatum(w.frist_extern)})</span>}
                        <span style={{ marginLeft: '10px', fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: theme.warningBorder, color: '#fff', fontWeight: 'bold' }}>
                          {w.tageUebrig < 0 ? `Überfällig: ${Math.abs(w.tageUebrig)} Tage` : w.tageUebrig === 0 ? 'HEUTE FÄLLIG!' : `Noch ${w.tageUebrig} Tage`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* 1. GRÜNER ERLEDIGT BUTTON */}
                        <button 
                          onClick={() => {
                            if (w.isWiedervorlage) handleInlineEdit(w.id, 'wiedervorlage', null);
                            else handleInlineEdit(w.id, 'frist_extern', null);
                          }} 
                          style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          ✓ Erledigt
                        </button>

                        {/* 2. MAXIMAL +3 TAGE VERSCHIEBEN (MIT STRIKTER SPERRE) */}
                        <button 
                          disabled={shiftDisabled}
                          onClick={() => {
                            if (w.isWiedervorlage) handleInlineEdit(w.id, 'wiedervorlage', plusDreiIso);
                            else handleInlineEdit(w.id, 'frist_extern', plusDreiIso);
                          }} 
                          style={{ 
                            background: shiftDisabled ? '#334155' : theme.border, 
                            color: shiftDisabled ? '#64748b' : theme.textMain, 
                            border: 'none', padding: '6px 12px', borderRadius: '4px', 
                            cursor: shiftDisabled ? 'not-allowed' : 'pointer', 
                            fontSize: '12px', fontWeight: 'bold',
                            opacity: shiftDisabled ? 0.5 : 1 
                          }}
                          title={shiftDisabled ? "Sperre: Verschiebung um 3 Tage würde hinter der harten Originalfrist liegen!" : "Um 3 Tage verschieben"}
                        >
                          +3 Tage {shiftDisabled ? '🔒' : ''}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={speichereEintrag} style={{ ...panelStyle, marginBottom: '20px' }}>
            {tresorPrompt && (
              <div style={{ background: theme.accent, color: '#000', padding: '15px 20px', borderRadius: '8px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <strong style={{ fontSize: '15px' }}>🏢 Firmen-Tresor Match:</strong> {tresorPrompt.typ === 'neu' ? `Mandant "${tresorPrompt.obj.unsere_firma}" neu anlegen?` : `Stammdaten für "${tresorPrompt.firma}" aktualisieren?`}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={handleTresorPromptAccept} style={{ background: '#000', color: theme.accent, border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ja, übernehmen</button>
                  <button type="button" onClick={() => setTresorPrompt(null)} style={{ background: 'transparent', border: '1px solid #000', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Nein</button>
                </div>
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
                <div style={{ flex: '1 1 200px', marginLeft: 'auto' }}>
                  <select value={selectedAkteId} onChange={(e) => setSelectedAkteId(e.target.value)} required style={{...inputStyle, padding: '8px', fontSize: '13px'}}>
                    <option value="">-- Ziel-Akte wählen --</option>
                    {akten.map(a => <option key={a.id} value={a.id}>[#{a.id.substring(0,6).toUpperCase()}] {a.gegner_name} | {a.thema}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              {modus === 'neu' && (
                <>
                  <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px'}}>
                      <h4 style={{margin: 0, color: theme.textMain}}>1. Gegenpartei / Behörde</h4>
                      {gegnerListe.length > 0 && (
                        <select onChange={handleGegnerAuswahl} style={{padding: '4px 8px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '12px', background: theme.inputBg, color: theme.textMain}}>
                          <option value="">+ Aus Gegner-CRM laden...</option>
                          {gegnerListe.map(g => <option key={g.id} value={g.id}>{g.name} ({g.abteilung || 'Hauptstelle'})</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div><label style={labelStyle}>Behörde / Gegner*</label><input type="text" value={gegnerName} onChange={(e) => setGegnerName(e.target.value)} required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={gegnerAnsprechpartner} onChange={(e) => setGegnerAnsprechpartner(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Telefon / Fax</label><input type="text" value={gegnerTelefon} onChange={(e) => setGegnerTelefon(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>E-Mail</label><input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} style={inputStyle} /></div>
                  
                  <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px'}}>
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
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setzeWV(3)} style={quickBtnStyle}>+3T</button>
                  <button type="button" onClick={() => setzeWV(7)} style={quickBtnStyle}>+1W</button>
                </div>
              </div>
            </div>

            {briefEntwurf && (
              <div style={{ background: theme.inputBg, padding: '20px', border: `1px solid ${theme.border}`, borderRadius: '8px', marginTop: '25px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                  <label style={{...labelStyle, color: theme.accent, margin: 0}}>
                    <Icon name="file" size={16} /> Freigegebener KI-Textentwurf (SONAR MEGA-LEGAL)
                  </label>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={() => handleResendVersand('email')} style={{ background: theme.accent, color: isDarkMode ? '#000' : '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="send" size={14} /> E-Mail senden (Resend)
                    </button>
                    <button type="button" onClick={() => handleResendVersand('fax')} style={{ background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="phone" size={14} /> E-Fax senden (Resend)
                    </button>
                  </div>
                </div>

                <textarea value={briefEntwurf} onChange={(e) => setBriefEntwurf(e.target.value)} style={{ ...inputStyle, minHeight: '180px', fontFamily: 'monospace', background: 'transparent' }} />
              </div>
            )}

            <button disabled={laedt} type="submit" style={{ padding: '15px', background: theme.accent, color: isDarkMode ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '25px' }}>
              {laedt ? 'Speichere...' : '+ In Akte abheften'}
            </button>
          </form>

          {/* AKTEN UBERSICHT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '40px' }}>
            <h2 style={{ margin: '0', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
              <Icon name="cabinet" size={24} /> Akten-Übersicht
            </h2>
            <button onClick={() => setZeigeErledigte(!zeigeErledigte)} style={{ padding: '8px 16px', background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
              {zeigeErledigte ? 'Erledigte ausblenden' : 'Erledigte einblenden'}
            </button>
          </div>

          <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', textAlign: 'left', background: theme.cardBg }}>
            {gefilterteAkten.map((akte) => {
              const isExpanded = aufgeklappteAkten.includes(akte.id);
              const letzteAktion = akte.akten_historie && akte.akten_historie.length > 0 ? akte.akten_historie[0] : null;

              return (
                <div key={akte.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', cursor: 'pointer', flexWrap: 'wrap', gap: '10px' }} onClick={() => toggleAkte(akte.id)}>
                    <div style={{ width: '30px', color: theme.accent }}><Icon name={isExpanded ? 'down' : 'right'} size={20} /></div>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>
                        {akte.gegner_name}
                        {akte.vorgaenger_gegner && <span style={{fontSize: '11px', color: theme.textMuted, marginLeft: '8px'}}>(vormals: {akte.vorgaenger_gegner})</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.textMuted }}>AZ: {akte.aktenzeichen || '-'}</div>
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>{akte.thema}</div>
                      <div style={{ fontSize: '12px', color: theme.textMuted }}>Letzter Eintrag: {letzteAktion ? `${formatDatum(letzteAktion.datum)} - ${letzteAktion.aktion}` : '-'}</div>
                    </div>
                    <div style={{ flex: '1 1 100px', textAlign: 'right' }}>
                      {akte.status === 'Erledigt' ? <span style={{ background: theme.border, padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>Erledigt</span> : <span style={{ background: theme.accent, color: '#000', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>Offen</span>}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ background: theme.inputBg, padding: '20px', borderTop: `1px solid ${theme.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.cardBg, padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${theme.border}`, flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ fontSize: '13px' }}>
                          <strong>Aktuelle Behörde / Gegner:</strong> {akte.gegner_name}
                        </div>
                        
                        {transferAkteId === akte.id ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                              type="text" placeholder="Neuer Gegner / Behörde (z.B. Landesdirektion)" 
                              value={neuerGegnerName} onChange={(e) => setNeuerGegnerName(e.target.value)}
                              style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', width: '260px' }}
                            />
                            <button onClick={() => naechsterGegnerUebergeben(akte.id)} style={{ background: theme.accent, color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Übergabe bestätigen</button>
                            <button onClick={() => setTransferAkteId(null)} style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Abbrechen</button>
                          </div>
                        ) : (
                          <button onClick={() => setTransferAkteId(akte.id)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon name="swap" size={14} /> Zuständigkeit / Gegner übertragen
                          </button>
                        )}
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: theme.cardBg, borderRadius: '8px', overflow: 'hidden' }}>
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
                          {/* OBERSTES DOKUMENT ZUERST (DESC) */}
                          {akte.akten_historie.map((hist) => (
                            <tr key={hist.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                              <td style={{ padding: '10px', fontWeight: 'bold' }}>{hist.typ}</td>
                              <td style={{ padding: '10px' }}>{formatDatum(hist.datum)}</td>
                              <td style={{ padding: '10px' }}>{hist.aktion}</td>
                              <td style={{ padding: '10px', color: theme.warningBorder }}>
                                {hist.wiedervorlage ? `WV: ${formatDatum(hist.wiedervorlage)}` : (hist.frist_extern ? `Frist: ${formatDatum(hist.frist_extern)}` : '-')}
                              </td>
                              <td style={{ padding: '10px' }}>
                                {hist.dokument_url && hist.dokument_url.split(',').map((url, idx) => (
                                  <a key={idx} href={url} target="_blank" rel="noreferrer" style={{ color: theme.accent, display: 'inline-block', marginRight: '8px' }}>
                                    📄 {extractFilename(url)}
                                  </a>
                                ))}
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
                  )}
                </div>
              )
            })}
          </div>
        </>
        )}

        {/* ========================================= */}
        {/* ============= FIRMEN TRESOR ============= */}
        {/* ========================================= */}
        {activeTab === 'tresor' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', color: theme.textMain, textAlign: 'left' }}>🏢 Firmen-Tresor (Mandanten)</h2>
            <form onSubmit={speichereMandant} style={{ ...panelStyle, marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', textAlign: 'left' }}>
                <div><label style={labelStyle}>Firma / Name*</label><input required value={m_firmenname} onChange={e=>setM_firmenname(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>Ansprechpartner</label><input value={m_ansprechpartner} onChange={e=>setM_ansprechpartner(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>E-Mail</label><input value={m_email} onChange={e=>setM_email(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>Telefon</label><input value={m_telefon} onChange={e=>setM_telefon(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>Steuernummer</label><input value={m_steuernummer} onChange={e=>setM_steuernummer(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>USt-IdNr.</label><input value={m_ust_id} onChange={e=>setM_ust_id(e.target.value)} style={inputStyle}/></div>
              </div>
              <button type="submit" style={{ padding: '12px', background: theme.tresorAccent, color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px', width: '100%' }}>
                {editMandantId ? 'Speichern' : '+ Mandant im Tresor ablegen'}
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', textAlign: 'left' }}>
              {mandanten.map(m => (
                <div key={m.id} style={{ ...panelStyle, cursor: 'pointer' }} onClick={() => ladeInFormularMandant(m)}>
                  <h3 style={{ margin: '0 0 10px 0', color: theme.tresorAccent }}>{m.firmenname}</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: theme.textMuted }}>{m.ansprechpartner} | {m.email}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* ============= GEGNER CRM =============== */}
        {/* ========================================= */}
        {activeTab === 'gegner' && (
          <div>
            <h2 style={{ margin: '0 0 20px 0', color: theme.textMain, textAlign: 'left' }}>🛡️ Behörden & Gegner CRM</h2>
            <form onSubmit={speichereGegner} style={{ ...panelStyle, marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', textAlign: 'left' }}>
                <div><label style={labelStyle}>Behörde / Gegner Name*</label><input required value={g_name} onChange={e=>setG_name(e.target.value)} placeholder="z.B. Finanzamt Dresden-Süd" style={inputStyle}/></div>
                <div><label style={labelStyle}>Unterabteilung</label><input value={g_abteilung} onChange={e=>setG_abteilung(e.target.value)} placeholder="z.B. Gewerbesteuerstelle" style={inputStyle}/></div>
                <div><label style={labelStyle}>Ansprechpartner / Bearbeiter</label><input value={g_ansprechpartner} onChange={e=>setG_ansprechpartner(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>Telefon / Durchwahl</label><input value={g_telefon} onChange={e=>setG_telefon(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>Faxnummer</label><input value={g_fax} onChange={e=>setG_fax(e.target.value)} style={inputStyle}/></div>
                <div><label style={labelStyle}>E-Mail</label><input value={g_email} onChange={e=>setG_email(e.target.value)} style={inputStyle}/></div>
              </div>
              <button type="submit" style={{ padding: '12px', background: theme.gegnerAccent, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px', width: '100%' }}>
                + Behörde / Gegner im CRM speichern
              </button>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', textAlign: 'left' }}>
              {gegnerListe.map(g => (
                <div key={g.id} style={{ ...panelStyle }}>
                  <h3 style={{ margin: '0 0 5px 0', color: theme.gegnerAccent }}>{g.name}</h3>
                  <div style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '8px' }}>{g.abteilung || 'Hauptstelle'}</div>
                  <div style={{ fontSize: '13px', color: theme.textMain, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>👤 {g.ansprechpartner || '-'}</span>
                    <span>📞 {g.telefon || '-'} | Fax: {g.fax || '-'}</span>
                    <span>✉️ {g.email || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}