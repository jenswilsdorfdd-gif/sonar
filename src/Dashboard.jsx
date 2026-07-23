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

// --- ECHTE VEKTOR-ICONS ---
const Icon = ({ name, size = 18, style }) => {
  const UI_ICONS = {
    radar: <><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    bulb: <><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></>,
    wand: <><path d="M15 4V2m0 14v-2M8 9h2m10 0h2m-13.8 6.2 1.4-1.4m11.2-8.6 1.4-1.4M6.2 6.2l1.4 1.4m8.6 11.2 1.4 1.4M3 21l9-9m3.5-3.5L17 7"/></>,
    paperclip: <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>,
    cabinet: <><rect width="20" height="20" x="2" y="2" rx="2" ry="2"/><path d="M2 12h20M6 7h12M6 17h12"/></>,
    building: <><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M16 10h.01M8 10h.01M8 14h.01M12 14h.01M16 14h.01"/></>,
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
    x: <path d="M18 6L6 18M6 6l12 12"/>
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
  // --- GENERELLE STATES ---
  const [activeTab, setActiveTab] = useState('akten') 
  const [isDarkMode, setIsDarkMode] = useState(true) 
  const [laedt, setLaedt] = useState(false)
  
  // --- AKTEN STATES ---
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

  const [aufgeklappteAkten, setAufgeklappteAkten] = useState([])
  const [zeigeErledigte, setZeigeErledigte] = useState(false)

  // --- TRESOR (MANDANTEN) STATES ---
  const [mandanten, setMandanten] = useState([])
  const [uploadingMandantId, setUploadingMandantId] = useState(null)
  
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
  const [m_dateien, setM_dateien] = useState([])

  // --- DESIGN THEME ---
  const theme = isDarkMode ? {
    bg: '#020617', 
    cardBg: '#0f172a', 
    border: '#1e293b', 
    textMain: '#ffffff', 
    textMuted: '#94a3b8',
    accent: '#00e5ff', 
    accentHover: '#00b8cc',
    tresorAccent: '#2dd4bf', 
    tresorBg: 'rgba(45, 212, 191, 0.1)',
    inputBg: '#020617',
    inputBorder: '#334155',
    warningBg: 'rgba(244, 63, 94, 0.1)', 
    warningBorder: '#f43f5e', 
    warningText: '#fda4af',
    hintBg: 'rgba(250, 204, 21, 0.1)', 
    hintBorder: '#facc15',
    hintText: '#fef08a' 
  } : {
    bg: '#f8fafc',
    cardBg: '#ffffff',
    border: '#e2e8f0',
    textMain: '#0f172a',
    textMuted: '#64748b',
    accent: '#0284c7', 
    accentHover: '#0369a1',
    tresorAccent: '#0f766e', 
    tresorBg: '#f0fdfa',
    inputBg: '#f8fafc',
    inputBorder: '#cbd5e1',
    warningBg: '#fff1f2',
    warningBorder: '#e11d48', 
    warningText: '#be123c', 
    hintBg: '#fefce8',
    hintBorder: '#fde047',
    hintText: '#854d0e' 
  };

  // --- GLOBALER HINTERGRUND-KILLER ---
  useEffect(() => {
    const styleId = 'sonar-global-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      html, body, #root {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: 100vh !important;
        background-color: ${theme.bg} !important;
        overflow-x: hidden !important;
      }
      * {
        box-sizing: border-box !important;
      }
      input[type="date"]::-webkit-calendar-picker-indicator {
        cursor: pointer;
        opacity: 0.6;
        transition: 0.2s;
      }
      input[type="date"]::-webkit-calendar-picker-indicator:hover {
        opacity: 1;
      }
    `;
    return () => {
      if (styleTag) document.head.removeChild(styleTag);
    };
  }, [isDarkMode, theme.bg]);

  const ladeDaten = async () => {
    const { data: aktenData, error: aktenError } = await supabase
      .from('akten')
      .select(`*, akten_historie (*)`)
      .order('created_at', { ascending: false })

    if (!aktenError && aktenData) {
      aktenData.forEach(akte => {
        if(akte.akten_historie) {
          akte.akten_historie.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        }
      })
      setAkten(aktenData)
    }

    const { data: mandantenData, error: mandantenError } = await supabase
      .from('mandanten')
      .select('*')
      .order('firmenname', { ascending: true })
      
    if (!mandantenError && mandantenData) {
      setMandanten(mandantenData)
    }
  }

  useEffect(() => { ladeDaten() }, [])

  // --- INLINE EDITING ---
  const handleInlineEdit = async (histId, feld, wert) => {
    const { error } = await supabase.from('akten_historie').update({ [feld]: wert || null }).eq('id', histId);
    if (!error) {
      ladeDaten();
    } else {
      alert("Fehler beim Speichern: " + error.message);
    }
  };

  const loescheHistorieEintrag = async (histId) => {
    if(!window.confirm("Diesen einzelnen Eintrag aus der Akte löschen?")) return;
    await supabase.from('akten_historie').delete().eq('id', histId);
    ladeDaten();
  };

  // --- DATEI LÖSCHEN LOGIK (Akten Historie) ---
  const loescheDateiAusHistorie = async (histId, aktuelleUrls, urlZumLoeschen) => {
    if (!window.confirm("Diese Datei wirklich entfernen?")) return;

    // 1. URL aus dem String entfernen
    const urlArray = aktuelleUrls.split(',');
    const neueUrls = urlArray.filter(url => url !== urlZumLoeschen);
    const neuerUrlString = neueUrls.length > 0 ? neueUrls.join(',') : null;

    // 2. Datenbank Update
    const { error: dbError } = await supabase.from('akten_historie').update({ dokument_url: neuerUrlString }).eq('id', histId);

    if (!dbError) {
       // 3. Aus Storage löschen, um Platz zu sparen
       try {
          const parts = decodeURIComponent(urlZumLoeschen).split('/');
          const fileName = parts[parts.length - 1];
          await supabase.storage.from('dokumente').remove([fileName]);
       } catch (e) {
          console.error("Storage delete error", e);
       }
       ladeDaten();
    } else {
       alert("Fehler beim Löschen der Datei: " + dbError.message);
    }
  };

  // --- WIEDERVORLAGE QUICK BUTTONS ---
  const setzeWV = (tage, monate = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + tage);
    if (monate > 0) d.setMonth(d.getMonth() + monate);
    setWiedervorlage(d.toISOString().split('T')[0]);
  };

  // --- AKTEN LOGIK ---
  const handleJsonImport = (e) => {
    setActiveTab('akten')
    const val = e.target.value
    setJsonImport(val)
    try {
      const obj = JSON.parse(val)
      let matchedAkteId = null;
      if (obj.aktenzeichen) {
        setAktenzeichen(obj.aktenzeichen)
        const match = akten.find(a => a.aktenzeichen === obj.aktenzeichen && a.status !== 'Erledigt')
        if (match) {
          matchedAkteId = match.id;
          setModus('bestehend');
          setSelectedAkteId(match.id);
        } else {
          setModus('neu');
        }
      }
      if (!matchedAkteId) {
        if (obj.thema) setThema(obj.thema)
        if (obj.kontakt) setGegnerName(obj.kontakt) 
        if (obj.ansprechpartner) setGegnerAnsprechpartner(obj.ansprechpartner)
        if (obj.gegner_telefon) setGegnerTelefon(obj.gegner_telefon)
        if (obj.gegner_email) setGegnerEmail(obj.gegner_email)
        if (obj.unsere_firma) setUnsereFirma(obj.unsere_firma)
        if (obj.unser_ansprechpartner) setUnserAnsprechpartner(obj.unser_ansprechpartner)
      }
      if (obj.frist_extern) setFristExtern(obj.frist_extern)
      if (obj.brief_entwurf) setBriefEntwurf(obj.brief_entwurf)
      if (obj.aktion) setAktion(obj.aktion)
      if (obj.kanal) setKanal(obj.kanal)
      if (obj.typ) { setTyp(obj.typ) } else { setTyp('Eingang') }
      setDatum(new Date().toISOString().split('T')[0])
    } catch(err) { }
  }

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
          user_id: session.user.id, 
          aktenzeichen: aktenzeichen || null,
          gegner_name: gegnerName || null,
          gegner_ansprechpartner: gegnerAnsprechpartner || null,
          gegner_telefon: gegnerTelefon || null,
          gegner_email: gegnerEmail || null,
          unsere_firma: unsereFirma || null,
          unser_ansprechpartner: unserAnsprechpartner || null,
          unser_telefon: unserTelefon || null,
          unser_email: unserEmail || null,
          thema: thema || null,
          status: 'Offen'
        }]).select()
        
      if (aktenError) { alert("Fehler Akte: " + aktenError.message); setLaedt(false); return; }
      aktuelleAkteId = neueAkte[0].id
    }

    const { error: histError } = await supabase
      .from('akten_historie')
      .insert([{ 
        akte_id: aktuelleAkteId,
        user_id: session.user.id, 
        typ: typ,
        datum: datum || null,
        aktion: aktion || null,
        kanal: kanal || null,
        frist_extern: fristExtern || null,
        wiedervorlage: wiedervorlage || null,
        dokument_url: dokumentUrl,
        brief_entwurf: briefEntwurf || null 
      }])

    if (!histError) {
      setAktenzeichen(''); setGegnerName(''); setGegnerAnsprechpartner(''); 
      setGegnerTelefon(''); setGegnerEmail(''); setUnsereFirma(''); 
      setUnserAnsprechpartner(''); setUnserTelefon(''); setUnserEmail(''); 
      setThema(''); setAktion(''); setKanal(''); setFristExtern(''); setWiedervorlage(''); 
      setDateien([]); 
      setBriefEntwurf(''); setJsonImport('');
      if (document.getElementById('datei-upload-manuell')) document.getElementById('datei-upload-manuell').value = '';
      ladeDaten()
    }
    setLaedt(false)
  }

  const toggleAkte = (id) => {
    if (aufgeklappteAkten.includes(id)) {
      setAufgeklappteAkten(aufgeklappteAkten.filter(aId => aId !== id))
    } else {
      setAufgeklappteAkten([...aufgeklappteAkten, id])
    }
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

  // --- TRESOR LOGIK ---
  const handleTresorAuswahl = (e) => {
    const mId = e.target.value
    if(!mId) return
    const m = mandanten.find(x => x.id === mId)
    if(m) {
      setUnsereFirma(m.firmenname || '')
      setUnserAnsprechpartner(m.ansprechpartner || '')
      setUnserTelefon(m.telefon || '')
      setUnserEmail(m.email || '')
    }
  }

  const handleNachtragUploadMandant = async (mId, currentUrls, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingMandantId(mId);
    
    const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const dateiName = `m_${Date.now()}_${sichererDateiname}`; 
    const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file);

    if (!uploadError) {
      const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
      const newUrl = linkData.publicUrl;
      const updatedUrls = currentUrls ? `${currentUrls},${newUrl}` : newUrl;
      const { error } = await supabase.from('mandanten').update({ dokument_url: updatedUrls }).eq('id', mId);
      if (!error) ladeDaten();
    }
    setUploadingMandantId(null);
    e.target.value = ''; 
  };

  // --- DATEI LÖSCHEN LOGIK (Firmen-Tresor) ---
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
    } else {
       alert("Fehler beim Löschen: " + dbError.message);
    }
  };

  const speichereMandant = async (e) => {
    e.preventDefault()
    setLaedt(true)
    
    let alleUrls = [];
    if (m_dateien && m_dateien.length > 0) {
      for (const f of m_dateien) {
        const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const dateiName = `m_${Date.now()}_${sichererDateiname}` 
        const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f)
        if (!uploadError) {
          const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName)
          alleUrls.push(linkData.publicUrl)
        }
      }
    }
    const dokumentUrl = alleUrls.length > 0 ? alleUrls.join(',') : null;

    const { error } = await supabase.from('mandanten').insert([{
      user_id: session.user.id,
      firmenname: m_firmenname,
      ansprechpartner: m_ansprechpartner,
      adresse: m_adresse,
      telefon: m_telefon,
      email: m_email,
      steuernummer: m_steuernummer,
      ust_id: m_ust_id,
      betriebsnummer: m_betriebsnummer,
      vbg_nummer: m_vbg_nummer,
      handelsregister: m_handelsregister,
      iban: m_iban,
      bank_name: m_bank_name,
      ust_intervall: m_ust_intervall,
      dauerfrist: m_dauerfrist,
      dokument_url: dokumentUrl
    }])

    if (!error) {
      setM_firmenname(''); setM_ansprechpartner(''); setM_adresse('');
      setM_telefon(''); setM_email(''); setM_steuernummer('');
      setM_ust_id(''); setM_betriebsnummer(''); setM_vbg_nummer('');
      setM_handelsregister(''); setM_iban(''); setM_bank_name('');
      setM_dateien([]);
      if (document.getElementById('tresor-datei-upload')) document.getElementById('tresor-datei-upload').value = '';
      ladeDaten()
    }
    setLaedt(false)
  }

  const loescheMandant = async (id) => {
    if(!window.confirm("Firma komplett aus dem Tresor löschen?")) return
    await supabase.from('mandanten').delete().eq('id', id)
    ladeDaten()
  }

  // --- BERECHNUNGEN ---
  const berechneTageBis = (datumStr) => {
    if (!datumStr) return null;
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const frist = new Date(datumStr); frist.setHours(0, 0, 0, 0);
    return Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
  };

  const fristenWarnungen = [];
  akten.filter(a => a.status !== 'Erledigt').forEach(akte => {
    if(akte.akten_historie) {
      akte.akten_historie.forEach(hist => {
        if(hist.frist_extern) {
          const tage = berechneTageBis(hist.frist_extern);
          if (tage !== null && tage <= 7) { 
            let alarmStufe = '1. Erinnerung';
            if (tage <= 4 && tage > 2) alarmStufe = '2. Erinnerung';
            if (tage <= 2) alarmStufe = 'ALARM';
            fristenWarnungen.push({ ...hist, akte_thema: akte.thema, akte_gegner: akte.gegner_name, tageUebrig: tage, alarmStufe })
          }
        }
      })
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
      if (tage !== null && tage <= 14) { 
         ustRadar.push({ firma: m.firmenname, bezeichnung: bezeichnung, datum: nextFristDate.toISOString().split('T')[0], tageUebrig: tage });
      }
    }
  });
  ustRadar.sort((a,b) => a.tageUebrig - b.tageUebrig);

  const gefilterteAkten = akten.filter((akte) => zeigeErledigte ? true : akte.status !== 'Erledigt')
  const formatDatum = (datum) => datum ? new Date(datum).toLocaleDateString('de-DE') : '-'

  // --- STYLES ---
  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, transition: '0.2s', outline: 'none', colorScheme: isDarkMode ? 'dark' : 'light' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const h4StyleAkten = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const h4StyleTresor = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: isDarkMode ? '0 10px 25px -5px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '20px', width: '100%' };
  const quickBtnStyle = { background: theme.border, color: theme.textMain, border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: '1200px', padding: 'max(15px, 2vw)', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER & THEME TOGGLE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0, color: theme.textMain, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="radar" size={24} style={{ color: activeTab === 'akten' ? theme.accent : theme.tresorAccent }} /> Sonar-Cockpit
          </h1>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            style={{ background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <Icon name={isDarkMode ? 'sun' : 'moon'} size={18} /> <span style={{display: 'none', '@media (min-width: 400px)': {display: 'inline'}}}>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* EBENE 1: MAGIC IMPORT & SONAR GUIDE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px', width: '100%' }}>
          
          {/* LINKS: MAGIC IMPORT */}
          <div style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px dashed ${theme.hintBorder}` }}>
            <label style={{...labelStyle, color: theme.hintText, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Icon name="wand" size={18} /> Magic Import (JSON)
            </label>
            <textarea 
              value={jsonImport} onChange={handleJsonImport} 
              placeholder='{"typ": "Eingang", "aktenzeichen": "...", "thema": "..."}'
              style={{ ...inputStyle, background: 'rgba(0,0,0,0.1)', border: `1px solid ${theme.hintBorder}`, color: theme.hintText, height: '100px', fontFamily: 'monospace', fontSize: '14px', marginTop: '5px' }} 
            />
          </div>

          {/* RECHTS: SONAR GUIDE */}
          <div style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px solid ${theme.hintBorder}`, color: theme.hintText, display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
            <div style={{ marginTop: '2px', color: theme.hintText }}><Icon name="bulb" size={24} /></div>
            <div style={{ textAlign: 'left' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: theme.hintText }}>Sonar Guide: {activeTab === 'akten' ? 'Der Workflow' : 'Firmen & Dokumente verwalten'}</h4>
              {activeTab === 'akten' ? (
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>
                  1. Dokument in deinem <strong>Gemini Gem</strong> hochladen. <br/>
                  2. <strong>JSON 1 (Eingang)</strong> hier drüben in den Magic Import einfügen. <br/>
                  3. Entwurf im Gem freigeben & verschicken. <br/>
                  4. <strong>JSON 2 (Ausgang)</strong> in den Magic Import einfügen und PDF anhängen.
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>
                  1. <strong>Stammdaten:</strong> Lege hier deine Firmen, UGs oder Einzelunternehmen zentral an.<br/>
                  2. <strong>Dokumente:</strong> Hänge essenzielle Papiere (HR-Auszug, Gewerbeanmeldung) direkt an das Firmenprofil (beliebig viele).<br/>
                  3. <strong>DFV & Radar:</strong> Setze den Haken bei Dauerfristverlängerung, damit das USt-Radar deine Fristen im Akten-Cockpit korrekt berechnet!
                </p>
              )}
            </div>
          </div>

        </div>

        {/* EBENE 2: TABS & MANUELLER UPLOAD */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px', width: '100%' }}>
          
          {/* TAB 1: AKTEN */}
          <button 
            onClick={() => setActiveTab('akten')} 
            style={{ flex: '1 1 140px', minWidth: '140px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'akten' ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: activeTab === 'akten' ? (isDarkMode ? 'rgba(0, 229, 255, 0.05)' : theme.accent) : theme.cardBg, color: activeTab === 'akten' ? (isDarkMode ? theme.accent : '#fff') : theme.textMuted, transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Icon name="cabinet" size={24} /> Akten-Cockpit
          </button>

          {/* TAB 2: TRESOR */}
          <button 
            onClick={() => setActiveTab('tresor')} 
            style={{ flex: '1 1 140px', minWidth: '140px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'tresor' ? `2px solid ${theme.tresorAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: activeTab === 'tresor' ? (isDarkMode ? theme.tresorBg : theme.tresorAccent) : theme.cardBg, color: activeTab === 'tresor' ? (isDarkMode ? theme.tresorAccent : '#fff') : theme.textMuted, transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Icon name="building" size={24} /> Firmen-Tresor
          </button>

          {/* UPLOAD BEREICH */}
          <div style={{ flex: '1 1 300px', minWidth: '260px', ...panelStyle, margin: 0, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
               <Icon name="paperclip" size={16} /> Manueller Upload (PDF/Scan)
            </label>
            <input 
              id="datei-upload-manuell" 
              type="file" 
              multiple 
              onChange={(e) => { setDateien(Array.from(e.target.files)); setActiveTab('akten'); }} 
              style={{...inputStyle, border: `1px dashed ${theme.accent}`, cursor: 'pointer', padding: '8px', fontSize: '13px'}} 
            />
            {dateien.length > 0 ? (
              <span style={{fontSize: '12px', color: theme.accent, marginTop: '5px'}}>Gewählt: {dateien.length} Datei(en)</span>
            ) : (
              <small style={{ color: theme.textMuted, marginTop: '5px', display: 'block', fontSize: '11px' }}>Für 1 bis 10 Dokumente zur Akte.</small>
            )}
          </div>

        </div>

        {/* ========================================= */}
        {/* ============= AKTEN COCKPIT ============= */}
        {/* ========================================= */}
        
        {activeTab === 'akten' && (
        <>
          {/* WARNUNGEN & FRISTEN */}
          {(ustRadar.length > 0 || fristenWarnungen.length > 0) && (
            <div style={{ ...panelStyle, background: theme.warningBg, border: `1px solid ${theme.warningBorder}`, marginBottom: '20px' }}>
              <h4 style={{ color: theme.warningText, margin: '0 0 15px 0', textAlign: 'left', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon name="alert" size={20} /> Dringende Alarme & Fristen
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '15px', textAlign: 'left', color: theme.warningText }}>
                {fristenWarnungen.map(w => (
                  <li key={`warn-${w.id}`} style={{ marginBottom: '8px' }}>
                    <strong>{w.akte_gegner} ({w.akte_thema})</strong> - Frist: {formatDatum(w.frist_extern)} 
                    <span style={{ fontWeight: 'bold', marginLeft: '10px', textTransform: 'uppercase' }}>
                      {w.tageUebrig < 0 ? `(Überfällig: ${Math.abs(w.tageUebrig)} Tage!)` : w.tageUebrig === 0 ? '(Verfristet HEUTE!)' : `(${w.alarmStufe}: Noch ${w.tageUebrig} Tage)` }
                    </span>
                  </li>
                ))}
                {ustRadar.map((r, i) => (
                  <li key={`ust-${i}`} style={{ marginBottom: '8px' }}>
                    <strong>{r.firma}</strong>: {r.bezeichnung} am {formatDatum(r.datum)} 
                    <span style={{ fontWeight: 'bold', marginLeft: '10px', textTransform: 'uppercase' }}>
                      (Noch {r.tageUebrig} Tage)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={speichereEintrag} style={{ ...panelStyle, marginBottom: '20px' }}>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px', textAlign: 'left', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'neu' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="radio" checked={modus === 'neu'} onChange={() => setModus('neu')} style={{marginRight: '4px'}}/>
                <Icon name="folder" size={16} /> Neue Akte anlegen
              </label>
              <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'bestehend' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input type="radio" checked={modus === 'bestehend'} onChange={() => setModus('bestehend')} style={{marginRight: '4px'}}/>
                <Icon name="link" size={16} /> Zu bestehender Akte {selectedAkteId && '(Match!)'}
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
                  <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}><h4 style={h4StyleAkten}>1. Gegenpartei</h4></div>
                  <div><label style={labelStyle}>Name (Behörde)*</label><input type="text" value={gegnerName} onChange={(e) => setGegnerName(e.target.value)} required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={gegnerAnsprechpartner} onChange={(e) => setGegnerAnsprechpartner(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Telefon</label><input type="text" value={gegnerTelefon} onChange={(e) => setGegnerTelefon(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>E-Mail</label><input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} style={inputStyle} /></div>
                  
                  <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '20px' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                      <h4 style={{margin: 0, color: theme.textMain, fontSize: '16px'}}>2. Wir</h4>
                      {mandanten.length > 0 && (
                        <select onChange={handleTresorAuswahl} style={{padding: '6px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '12px', background: theme.inputBg, color: theme.textMain}}>
                          <option value="">+ Aus Tresor laden...</option>
                          {mandanten.map(m => <option key={m.id} value={m.id}>{m.firmenname}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div><label style={labelStyle}>Firma / Person*</label><input type="text" value={unsereFirma} onChange={(e) => setUnsereFirma(e.target.value)} required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={unserAnsprechpartner} onChange={(e) => setUnserAnsprechpartner(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Telefon</label><input type="text" value={unserTelefon} onChange={(e) => setUnserTelefon(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>E-Mail</label><input type="email" value={unserEmail} onChange={(e) => setUnserEmail(e.target.value)} style={inputStyle} /></div>
                  
                  <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '20px' }}><h4 style={h4StyleAkten}>3. Akten-Stammdaten</h4></div>
                  <div><label style={labelStyle}>Bescheid / Thema*</label><input type="text" value={thema} onChange={(e) => setThema(e.target.value)} required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Aktenzeichen</label><input type="text" value={aktenzeichen} onChange={(e) => setAktenzeichen(e.target.value)} style={inputStyle} /></div>
                </>
              )}

              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '20px' }}>
                <h4 style={{ ...h4StyleAkten, color: theme.textMuted }}>Details zum aktuellen Dokument</h4>
              </div>

              <div>
                <label style={labelStyle}>Typ*</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: typ === 'Eingang' ? theme.hintBorder : (typ === 'Ausgang' ? theme.accent : theme.textMuted), pointerEvents: 'none' }}>
                    <Icon name={typ === 'Eingang' ? 'in' : (typ === 'Ausgang' ? 'out' : 'note')} size={16} />
                  </div>
                  <select value={typ} onChange={(e) => setTyp(e.target.value)} style={{...inputStyle, paddingLeft: '36px'}}>
                    <option value="Eingang">Eingang</option>
                    <option value="Ausgang">Ausgang</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>Datum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Aktion</label><input type="text" value={aktion} onChange={(e) => setAktion(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Kanal</label><input type="text" value={kanal} onChange={(e) => setKanal(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Frist (Behörde)</label><input type="date" value={fristExtern} onChange={(e) => setFristExtern(e.target.value)} style={inputStyle} /></div>
              
              <div>
                <label style={labelStyle}>WV (Intern)</label>
                <input type="date" value={wiedervorlage} onChange={(e) => setWiedervorlage(e.target.value)} style={inputStyle} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="button" onClick={() => setzeWV(7)} style={quickBtnStyle}>+1W</button>
                  <button type="button" onClick={() => setzeWV(14)} style={quickBtnStyle}>+2W</button>
                  <button type="button" onClick={() => setzeWV(0, 1)} style={quickBtnStyle}>+1M</button>
                </div>
              </div>
            </div>

            {briefEntwurf && (
              <div style={{ background: theme.inputBg, padding: '20px', border: `1px solid ${theme.border}`, borderRadius: '8px', marginTop: '30px', textAlign: 'left' }}>
                <label style={{...labelStyle, color: theme.accent, display: 'flex', alignItems: 'center', gap: '8px'}}><Icon name="file" size={16} /> KI Analyse / Textentwurf</label>
                <textarea value={briefEntwurf} onChange={(e) => setBriefEntwurf(e.target.value)} style={{ ...inputStyle, minHeight: '180px', fontFamily: 'monospace', border: 'none', background: 'transparent', padding: 0, marginTop: '10px' }} />
              </div>
            )}

            <button disabled={laedt} type="submit" style={{ padding: '15px', background: theme.accent, color: isDarkMode ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '30px', transition: '0.2s', boxShadow: isDarkMode ? `0 0 15px ${theme.accent}40` : 'none' }}>
              {laedt ? 'Speichere...' : '+ In Akte abheften'}
            </button>
          </form>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '40px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ margin: '0', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
              <Icon name="cabinet" size={24} /> Deine Akten
            </h2>
            <button onClick={() => setZeigeErledigte(!zeigeErledigte)} style={{ padding: '8px 16px', background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name={zeigeErledigte ? 'eyeOff' : 'eye'} size={16} /> {zeigeErledigte ? 'Erledigte ausblenden' : 'Erledigte einblenden'}
            </button>
          </div>

          <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', textAlign: 'left', background: theme.cardBg }}>
            {gefilterteAkten.length === 0 && <div style={{padding: '30px', color: theme.textMuted, textAlign: 'center'}}>Keine Akten gefunden.</div>}
            
            {gefilterteAkten.map((akte) => {
              const isExpanded = aufgeklappteAkten.includes(akte.id);
              const letzteAktion = akte.akten_historie && akte.akten_historie.length > 0 ? akte.akten_historie[akte.akten_historie.length - 1] : null;
              const offeneFristen = akte.akten_historie ? akte.akten_historie.filter(h => h.frist_extern).sort((a,b) => new Date(a.frist_extern) - new Date(b.frist_extern)) : [];
              const naechsteFrist = offeneFristen.length > 0 ? offeneFristen[0].frist_extern : null;

              return (
                <div key={akte.id} style={{ borderBottom: `1px solid ${theme.border}`, opacity: akte.status === 'Erledigt' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', cursor: 'pointer', transition: 'background 0.2s', flexWrap: 'wrap', gap: '10px' }} onClick={() => toggleAkte(akte.id)}>
                    <div style={{ width: '30px', color: theme.accent, textAlign: 'center' }}>
                      <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>
                        {akte.gegner_name || 'Keine Gegenpartei'}
                        <span style={{background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '8px', color: theme.accent}}>#{akte.id.substring(0,6).toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: theme.textMuted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="user" size={14} /> {akte.gegner_ansprechpartner || '-'}
                      </div>
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>{akte.thema}</div>
                      <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>Letzte Aktion: {letzteAktion ? `${formatDatum(letzteAktion.datum)} - ${letzteAktion.aktion || ''}` : '-'}</div>
                    </div>
                    <div style={{ flex: '1 1 100px', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      {akte.status === 'Erledigt' ? <span style={{ background: theme.border, color: theme.textMain, padding: '4px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 'bold' }}>Erledigt</span> : <span style={{ background: theme.accent, color: isDarkMode ? '#000' : '#fff', padding: '4px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 'bold' }}>Offen</span>}
                      {naechsteFrist && akte.status !== 'Erledigt' && <span style={{ fontSize: '11px', color: theme.warningBorder, fontWeight: 'bold' }}>Frist: {formatDatum(naechsteFrist)}</span>}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ background: theme.inputBg, padding: '20px', borderTop: `1px solid ${theme.border}`, overflowX: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 5px 0', color: theme.accent, fontSize: '15px' }}>Verlauf & Dokumente</h4>
                          <p style={{ margin: '0', fontSize: '12px', color: theme.textMuted }}>Interne Sonar-ID: <strong style={{color: theme.textMain}}>#{akte.id.substring(0,6).toUpperCase()}</strong> | Mandant: {akte.unsere_firma} | AZ: {akte.aktenzeichen}</p>
                        </div>
                        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                          {akte.status !== 'Erledigt' ? 
                            <button onClick={(e) => { e.stopPropagation(); setzeAkteErledigt(akte.id, true) }} style={{ padding: '6px 12px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="check" size={14} /> Schließen</button>
                            :
                            <button onClick={(e) => { e.stopPropagation(); setzeAkteErledigt(akte.id, false) }} style={{ padding: '6px 12px', background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="refresh" size={14} /> Wiedereröffnen</button>
                          }
                          <button onClick={(e) => { e.stopPropagation(); loescheAkte(akte.id) }} style={{ padding: '6px 12px', background: 'transparent', color: theme.warningBorder, border: `1px solid ${theme.warningBorder}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="trash" size={14} /> Akte löschen</button>
                        </div>
                      </div>

                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: theme.cardBg, borderRadius: '8px', overflow: 'hidden', minWidth: '700px' }}>
                        <thead>
                          <tr style={{ background: theme.border, color: theme.textMain }}>
                            <th style={{ padding: '12px', textAlign: 'left', width: '100px' }}>Typ</th>
                            <th style={{ padding: '12px', textAlign: 'left', width: '140px' }}>Datum</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Aktion</th>
                            <th style={{ padding: '12px', textAlign: 'left', width: '140px' }}>Frist</th>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Dokumente</th>
                            <th style={{ padding: '12px', textAlign: 'center', width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {akte.akten_historie.map((hist) => (
                            <tr key={hist.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                              
                              <td style={{ padding: '12px', fontWeight: 'bold', color: hist.typ === 'Eingang' ? theme.hintBorder : (hist.typ === 'Ausgang' ? theme.accent : theme.textMuted) }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Icon name={hist.typ === 'Eingang' ? 'in' : (hist.typ === 'Ausgang' ? 'out' : 'note')} size={16} /> {hist.typ}
                                </div>
                              </td>

                              {/* INLINE EDIT: Datum */}
                              <td style={{ padding: '12px' }}>
                                <input 
                                  type="date" 
                                  defaultValue={hist.datum || ''} 
                                  onBlur={(e) => { if(e.target.value !== (hist.datum||'')) handleInlineEdit(hist.id, 'datum', e.target.value) }} 
                                  style={{ background: 'transparent', border: '1px dashed transparent', color: theme.textMain, fontSize: '13px', outline: 'none', colorScheme: isDarkMode ? 'dark' : 'light', cursor: 'text', padding: '4px', borderRadius: '4px' }} 
                                  onFocus={(e) => e.target.style.border = `1px dashed ${theme.accent}`} 
                                  onBlurCapture={(e) => e.target.style.border = '1px dashed transparent'}
                                />
                              </td>

                              {/* INLINE EDIT: Aktion */}
                              <td style={{ padding: '12px' }}>
                                <input 
                                  type="text" 
                                  defaultValue={hist.aktion || ''} 
                                  onBlur={(e) => { if(e.target.value !== (hist.aktion||'')) handleInlineEdit(hist.id, 'aktion', e.target.value) }} 
                                  style={{ background: 'transparent', border: '1px dashed transparent', color: theme.textMain, fontSize: '13px', outline: 'none', cursor: 'text', width: '100%', padding: '4px', borderRadius: '4px' }} 
                                  onFocus={(e) => e.target.style.border = `1px dashed ${theme.accent}`} 
                                  onBlurCapture={(e) => e.target.style.border = '1px dashed transparent'}
                                />
                                <br/><span style={{fontSize: '11px', color: theme.textMuted, marginLeft: '4px'}}>{hist.kanal}</span>
                              </td>

                              {/* INLINE EDIT: Frist */}
                              <td style={{ padding: '12px' }}>
                                <input 
                                  type="date" 
                                  defaultValue={hist.frist_extern || ''} 
                                  onBlur={(e) => { if(e.target.value !== (hist.frist_extern||'')) handleInlineEdit(hist.id, 'frist_extern', e.target.value) }} 
                                  style={{ background: 'transparent', border: '1px dashed transparent', color: theme.warningBorder, fontWeight: 'bold', fontSize: '13px', outline: 'none', colorScheme: isDarkMode ? 'dark' : 'light', cursor: 'text', padding: '4px', borderRadius: '4px' }} 
                                  onFocus={(e) => e.target.style.border = `1px dashed ${theme.accent}`} 
                                  onBlurCapture={(e) => e.target.style.border = '1px dashed transparent'}
                                />
                              </td>

                              <td style={{ padding: '12px' }}>
                                {hist.dokument_url && hist.dokument_url.split(',').map((url, idx) => {
                                  const fileName = extractFilename(url);
                                  return (
                                    <div key={idx} style={{ display: 'inline-flex', alignItems: 'stretch', background: theme.border, borderRadius: '6px', marginRight: '8px', marginBottom: '6px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', color: theme.textMain, background: 'rgba(0,0,0,0.1)' }} title={fileName}>
                                        <Icon name="file" size={12} /> {fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName}
                                      </a>
                                      <button onClick={(e) => { e.preventDefault(); loescheDateiAusHistorie(hist.id, hist.dokument_url, url); }} style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 6px', cursor: 'pointer', color: theme.textMuted, transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={(e) => e.currentTarget.style.color = theme.warningBorder} onMouseOut={(e) => e.currentTarget.style.color = theme.textMuted} title="Datei löschen">
                                        <Icon name="x" size={12} />
                                      </button>
                                    </div>
                                  )
                                })}
                                {uploadingHistId === hist.id ? (
                                  <span style={{ fontSize: '11px', color: theme.accent }}>⏳...</span>
                                ) : (
                                  <label style={{ cursor: 'pointer', fontSize: '11px', background: 'transparent', padding: '4px 10px', borderRadius: '6px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', marginBottom: '6px', color: theme.textMuted }}>
                                    + Datei
                                    <input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUpload(hist.id, hist.dokument_url, e)} />
                                  </label>
                                )}
                                {hist.brief_entwurf && (
                                  <details style={{ cursor: 'pointer', marginTop: '8px' }}>
                                    <summary style={{ color: theme.accent, fontWeight: 'bold', fontSize: '12px', outline: 'none' }}>Analyse / Text</summary>
                                    <div style={{ padding: '12px', background: theme.bg, border: `1px solid ${theme.border}`, marginTop: '8px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '11px', maxHeight: '200px', overflowY: 'auto', borderRadius: '6px', color: theme.textMain }}>
                                      {hist.brief_entwurf}
                                    </div>
                                  </details>
                                )}
                              </td>

                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); loescheHistorieEintrag(hist.id); }} 
                                  style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '4px', opacity: 0.6, transition: '0.2s' }} 
                                  onMouseOver={(e) => e.currentTarget.style.opacity = 1} 
                                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.6} 
                                  title="Eintrag löschen"
                                >
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
        {/* ============= FIRMEN-TRESOR ============= */}
        {/* ========================================= */}

        {activeTab === 'tresor' && (
        <div>
          <h2 style={{ margin: '0 0 20px 0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
            <Icon name="building" size={24} /> Neuer Mandant / Firma
          </h2>
          <form onSubmit={speichereMandant} style={{ ...panelStyle, marginBottom: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', textAlign: 'left' }}>
              <div style={{ gridColumn: '1 / -1' }}><h4 style={h4StyleTresor}>1. Allgemeine Kontaktdaten</h4></div>
              <div><label style={labelStyle}>Firma / Person*</label><input required value={m_firmenname} onChange={e=>setM_firmenname(e.target.value)} style={inputStyle}/></div>
              <div><label style={labelStyle}>Ansprechpartner</label><input value={m_ansprechpartner} onChange={e=>setM_ansprechpartner(e.target.value)} style={inputStyle}/></div>
              <div><label style={labelStyle}>Adresse</label><input value={m_adresse} onChange={e=>setM_adresse(e.target.value)} style={inputStyle}/></div>
              <div><label style={labelStyle}>Telefon</label><input value={m_telefon} onChange={e=>setM_telefon(e.target.value)} style={inputStyle}/></div>
              <div><label style={labelStyle}>E-Mail</label><input value={m_email} onChange={e=>setM_email(e.target.value)} style={inputStyle}/></div>

              <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}><h4 style={h4StyleTresor}>2. Wichtige Nummern & Dokumente</h4></div>
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
              <div><label style={labelStyle}>Bank</label><input value={m_bank_name} onChange={e=>setM_bank_name(e.target.value)} style={inputStyle}/></div>
              
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
            
            <button disabled={laedt} type="submit" style={{ padding: '15px', background: theme.tresorAccent, color: isDarkMode ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '30px', transition: '0.2s', boxShadow: isDarkMode ? `0 0 15px ${theme.tresorAccent}40` : 'none' }}>
              {laedt ? 'Speichere...' : '+ Im Tresor ablegen'}
            </button>
          </form>

          <h2 style={{ margin: '40px 0 20px 0', color: theme.textMain, textAlign: 'left', fontSize: '20px' }}>🗃️ Gespeicherte Firmen</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', textAlign: 'left' }}>
            {mandanten.map(m => (
              <div key={m.id} style={{ ...panelStyle, position: 'relative', marginBottom: 0 }}>
                <button onClick={() => loescheMandant(m.id)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', fontSize: '18px' }} title="Löschen"><Icon name="trash" size={18} /></button>
                
                <h3 style={{ margin: '0 0 10px 0', color: theme.tresorAccent, fontSize: '18px' }}>{m.firmenname}</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: theme.textMuted, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="user" size={14} /> {m.ansprechpartner || '-'}</span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="phone" size={14} /> {m.telefon || '-'} | <Icon name="mail" size={14} /> {m.email || '-'}</span>
                </p>
                
                <div style={{ fontSize: '12px', color: theme.textMain, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><strong style={{color: theme.textMuted}}>Steuer-Nr:</strong><br/>{m.steuernummer || '-'}</div>
                  <div><strong style={{color: theme.textMuted}}>USt-Id:</strong><br/>{m.ust_id || '-'}</div>
                  <div><strong style={{color: theme.textMuted}}>VBG:</strong><br/>{m.vbg_nummer || '-'}</div>
                  <div><strong style={{color: theme.textMuted}}>Betriebs-Nr:</strong><br/>{m.betriebsnummer || '-'}</div>
                  <div style={{ gridColumn: '1 / -1' }}><strong style={{color: theme.textMuted}}>Bank:</strong> {m.iban ? `${m.iban} (${m.bank_name})` : '-'}</div>
                  
                  {/* DOKUMENTE ANZEIGEN & NACHTRAG UPLOAD */}
                  <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                    <strong style={{color: theme.textMuted, display: 'block', marginBottom: '8px'}}>Dokumente:</strong>
                    {m.dokument_url && m.dokument_url.split(',').map((url, idx) => {
                      const fileName = extractFilename(url);
                      return (
                        <div key={idx} style={{ display: 'inline-flex', alignItems: 'stretch', background: theme.border, borderRadius: '6px', marginRight: '8px', marginBottom: '6px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                          <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', color: theme.textMain, background: 'rgba(0,0,0,0.1)' }} title={fileName}>
                            <Icon name="file" size={12} /> {fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName}
                          </a>
                          <button onClick={(e) => { e.preventDefault(); loescheDateiAusMandant(m.id, m.dokument_url, url); }} style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 6px', cursor: 'pointer', color: theme.textMuted, transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={(e) => e.currentTarget.style.color = theme.warningBorder} onMouseOut={(e) => e.currentTarget.style.color = theme.textMuted} title="Datei löschen">
                            <Icon name="x" size={12} />
                          </button>
                        </div>
                      )
                    })}
                    
                    {uploadingMandantId === m.id ? (
                      <span style={{ fontSize: '11px', color: theme.tresorAccent }}>⏳ Upload...</span>
                    ) : (
                      <label style={{ cursor: 'pointer', fontSize: '11px', background: 'transparent', padding: '4px 10px', borderRadius: '6px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', marginBottom: '6px', color: theme.textMuted }}>
                        + Datei
                        <input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUploadMandant(m.id, m.dokument_url, e)} />
                      </label>
                    )}
                  </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: '5px', padding: '10px', background: theme.bg, borderRadius: '6px', border: `1px solid ${theme.border}` }}>
                    <strong style={{color: theme.tresorAccent}}>USt-Radar:</strong> {m.ust_intervall} {m.dauerfrist ? '(mit DFV)' : ''}
                  </div>
                </div>
              </div>
            ))}
            {mandanten.length === 0 && <div style={{ color: theme.textMuted }}>Noch keine Firmen im Tresor.</div>}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}