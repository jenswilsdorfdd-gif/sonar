import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// --- KORRIGIERTE HILFSFUNKTION FÜR GITHUB SYNC (EDGE FUNCTION) INKL. DELETE UND TOASTS ---
const syncToGithub = async (filename, contentText, pdfUrl = null, action = null, showToast = alert) => {
  try {
    console.log(`[GitHub Sync] Starte Sync für: ${filename} (Aktion: ${action || 'put'})...`);
    
    const payload = { filename };
    if (action === 'delete') {
      payload.action = 'delete';
    } else {
      payload.content = contentText;
      payload.pdfUrl = pdfUrl;
    }

    const { data, error } = await supabase.functions.invoke('github-sync', {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    });

    if (error) {
      console.error("[GitHub Sync] Supabase Invoke Fehler:", error);
      showToast(`⚠️ GitHub Sync Fehler bei ${filename}: ${error.message}`, 'error');
    } else {
      console.log("[GitHub Sync] Erfolg:", data);
    }
  } catch (err) {
    console.error("[GitHub Sync] Unerwarteter Ausnahme-Fehler:", err);
    showToast(`❌ Sync-Ausnahme bei ${filename}: ${err.message}`, 'error');
  }
};

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
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    print: <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
    brain: <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    bulb: <><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></>,
    wand: <><path d="M15 4V2m0 14v-2M8 9h2m10 0h2m-13.8 6.2 1.4-1.4m11.2-8.6 1.4-1.4M6.2 6.2l1.4 1.4m8.6 11.2 1.4 1.4M3 21l9-9m3.5-3.5L17 7"/></>,
    paperclip: <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>,
    cabinet: <><rect width="20" height="20" x="2" y="2" rx="2" ry="2"/><path d="M2 12h20M6 7h12M6 17h12"/></>,
    building: <><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M16 10h.01M8 10h.01M8 14h.01"/></>,
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
    swap: <><path d="M16 3l4 4-4 4"/><path d="M20 7H4"/><path d="M8 21l-4-4 4-4"/><path d="M4 17h16"/></>,
    globe: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>
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
  const [suchbegriff, setSuchbegriff] = useState('')
  const [webFetchLoading, setWebFetchLoading] = useState(false)
  
  const [akten, setAkten] = useState([])
  const [uploadingHistId, setUploadingHistId] = useState(null)
  
  const [modus, setModus] = useState('neu') 
  const [selectedAkteId, setSelectedAkteId] = useState('')
  
  const [aktenzeichen, setAktenzeichen] = useState('')
  const [gegnerName, setGegnerName] = useState('')
  const [gegnerAnsprechpartner, setGegnerAnsprechpartner] = useState('')
  const [gegnerTelefon, setGegnerTelefon] = useState('')
  const [gegnerFax, setGegnerFax] = useState('')
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

  // --- NEUER STATE FÜR DAS UPLOAD-REMINDER POPUP ---
  const [showUploadReminder, setShowUploadReminder] = useState(false)

  // --- SIGNATUR STATE ---
  const [signaturPreview, setSignaturPreview] = useState(localStorage.getItem('sonar_signature') || null)
  
  // --- STATE FÜR DAS GEMERKTE VERSAND-PDF ---
  const [versandPdfUrl, setVersandPdfUrl] = useState(null)

  const [aufgeklappteAkten, setAufgeklappteAkten] = useState([])

  // GEZIELTES FOKUSSIEREN DER ANGEKLICKTEN AKTE
  const [fokussierteAkteId, setFokussierteAkteId] = useState(null)

  // MANDANTEN CRM
  const [mandanten, setMandanten] = useState([])
  const [uploadingMandantId, setUploadingMandantId] = useState(null)
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
  const [m_dateien, setM_dateien] = useState([])

  // GEGNER / BEHÖRDEN CRM
  const [gegnerListe, setGegnerListe] = useState([])
  const [editGegnerId, setEditGegnerId] = useState(null)
  const [g_name, setG_name] = useState('')
  const [g_adresse, setG_adresse] = useState('')
  const [g_fax, setG_fax] = useState('')
  const [g_email, setG_email] = useState('')
  const [g_notizen, setG_notizen] = useState('')
  const [g_ansprechpartnerListe, setG_ansprechpartnerListe] = useState([{ abteilung: '', name: '', telefon: '', email: '' }])

  // ZUSTÄNDIGKEITS-WECHSEL & MERGE STATE
  const [transferAkteId, setTransferAkteId] = useState(null)
  const [neuerGegnerName, setNeuerGegnerName] = useState('')
  const [mergeSourceId, setMergeSourceId] = useState(null)
  const [mergeTargetId, setMergeTargetId] = useState('')

  // WISSENSDATENBANK STATE
  const [wissenEintraege, setWissenEintraege] = useState([])
  const [bulkDateien, setBulkDateien] = useState([])
  const [bulkFirma, setBulkFirma] = useState('')
  const [bulkStatus, setBulkStatus] = useState(null)
  
  // --- FILTER-STATE-VARIABLEN FÜR KI-WISSENSSPEICHER ---
  const [wissenSuchbegriff, setWissenSuchbegriff] = useState('')
  const [wissenFirmaFilter, setWissenFirmaFilter] = useState('')
  const [wissenGegnerFilter, setWissenGegnerFilter] = useState('')
  const [wissenAnzeigeModus, setWissenAnzeigeModus] = useState('md') // 'md' oder 'pdf'

  // --- FEST HINTERLEGTE SIGNATUR-URL ---
  const SIGNATUR_URL = "https://loyzfkxkuyypgteskxkm.supabase.co/storage/v1/object/public/dokumente/jw-signum-lang-blau.png";

  // =================================================================
  // NEU: TOAST NOTIFICATION STATE & LOGIK
  // =================================================================
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, fadingOut: false }]);
    
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, fadingOut: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  };

  const theme = isDarkMode ? {
    bg: '#020617', cardBg: '#0f172a', border: '#1e293b', textMain: '#ffffff', textMuted: '#94a3b8',
    accent: '#00e5ff', accentHover: '#00b8cc', tresorAccent: '#2dd4bf', tresorBg: 'rgba(45, 212, 191, 0.1)',
    wissenAccent: '#a855f7', wissenBg: 'rgba(168, 85, 247, 0.1)',
    gegnerAccent: '#f43f5e', gegnerBg: 'rgba(244, 63, 94, 0.1)',
    inputBg: '#020617', inputBorder: '#334155', warningBg: 'rgba(244, 63, 94, 0.1)', warningBorder: '#f43f5e', 
    warningText: '#fda4af', hintBg: 'rgba(250, 204, 21, 0.1)', hintBorder: '#facc15', hintText: '#fef08a',
    cardItemBg: 'rgba(15, 23, 42, 0.7)'
  } : {
    bg: '#f8fafc', cardBg: '#ffffff', border: '#e2e8f0', textMain: '#0f172a', textMuted: '#64748b',
    accent: '#0284c7', accentHover: '#0369a1', tresorAccent: '#0f766e', tresorBg: '#f0fdfa',
    wissenAccent: '#7e22ce', wissenBg: '#faf5ff',
    gegnerAccent: '#e11d48', gegnerBg: '#fff1f2',
    inputBg: '#f8fafc', inputBorder: '#cbd5e1', warningBg: '#fff1f2', warningBorder: '#e11d48', 
    warningText: '#be123c', hintBg: '#fefce8', hintBorder: '#fde047', hintText: '#854d0e',
    cardItemBg: '#ffffff'
  };

  const getLogoColor = () => {
    switch (activeTab) {
      case 'wissen': return theme.wissenAccent;
      case 'tresor': return theme.tresorAccent;
      case 'gegner': return theme.gegnerAccent;
      default: return theme.accent;
    }
  };

  const activeColor = getLogoColor();

  const handleLiveUrlFetch = async (urlStr) => {
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) return;
    setWebFetchLoading(true);
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlStr)}`);
      const data = await response.json();
      if (data.contents) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        const textContent = doc.body.innerText || doc.body.textContent || '';
        const cleanText = textContent.replace(/\s+/g, ' ').trim().substring(0, 3000);

        setBriefEntwurf(`--- LIVE WEBSEITEN-INHALT VON ${urlStr} ---\n\n${cleanText}`);
        setActiveTab('akten');
        showToast(`✅ Inhalte von ${urlStr} erfolgreich aus dem Netz geladen und im Schreibfenster eingefügt!`, 'success');
      }
    } catch (e) {
      console.error("Fehler beim Abrufen der URL:", e);
      showToast("❌ Fehler beim Abrufen der URL aus dem Netz.", 'error');
    }
    setWebFetchLoading(false);
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
      @keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
      @keyframes fadeOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
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

  const ladeDaten = async () => {
    // NUR OFFENE AKTEN LADEN (Performance-Boost)
    const { data: aktenData, error: aktenError } = await supabase
      .from('akten')
      .select(`*, akten_historie (*)`)
      .eq('status', 'Offen')
      .order('created_at', { ascending: false })
      
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

    const { data: wissenData, error: wissenErr } = await supabase.from('wissensdatenbank').select('*').order('created_at', { ascending: false })
    if (!wissenErr && wissenData) {
      setWissenEintraege(wissenData)
    }
  }

  useEffect(() => { ladeDaten() }, [])

  // =================================================================
  // 1. UPLOAD-WEICHE: KI-WISSENSSPEICHER (StarteBulkImport)
  // =================================================================
  const StarteBulkImport = async (e) => {
    e.preventDefault()
    if (!bulkDateien || bulkDateien.length === 0) {
      showToast("Bitte wähle zuerst mindestens eine Datei aus!", 'warning');
      return;
    }

    setLaedt(true)
    const gesamt = bulkDateien.length;

    for (let i = 0; i < gesamt; i++) {
      const file = bulkDateien[i];
      setBulkStatus({ fortschritt: i + 1, gesamt: gesamt, text: `Verarbeite: ${file.name}...` });

      try {
        const isMd = file.name.toLowerCase().endsWith('.md');
        let pubUrl = null;
        let finalDbText = '';

        if (isMd) {
          // WEG A: Reine Textdatei -> Nur nach GitHub & DB, KEIN Storage
          const mdInhalt = await file.text();
          finalDbText = mdInhalt.substring(0, 3000); // Max Zeichen für die DB Vorschau

          await supabase.from('wissensdatenbank').insert([{
            datei_name: file.name,
            firma: bulkFirma || 'Allgemein',
            inhalt_text: finalDbText,
            dokument_url: null // Keine Storage-URL vorhanden
          }]);

          await syncToGithub(file.name, mdInhalt, null, null, showToast); 
        } else {
          // WEG B: PDF / Binärdaten -> Storage Upload
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
    setTimeout(() => { ladeDaten(); }, 300);
    if (document.getElementById('bulk-file-input')) document.getElementById('bulk-file-input').value = '';
    showToast(`✅ KI-Wissensspeicher Import abgeschlossen!`, 'success');
  };

  const loescheWissenEintrag = async (id) => {
    if (!window.confirm("Diesen Wissens-Eintrag aus dem Speicher entfernen?")) return;
    
    // Ziel-Eintrag vorher sichern, damit wir den Dateinamen für GitHub haben
    const target = wissenEintraege.find(w => w.id === id);

    await supabase.from('wissensdatenbank').delete().eq('id', id);
    setWissenEintraege(prev => prev.filter(w => w.id !== id));
    
    if (target && target.datei_name && target.datei_name.toLowerCase().endsWith('.md')) {
      await syncToGithub(target.datei_name, null, null, 'delete', showToast);
    } else {
      showToast(`✅ Wissens-Eintrag gelöscht!`, 'success');
    }

    ladeDaten();
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

  const handleAkteAuswahl = (e) => {
    const val = e.target.value;
    setSelectedAkteId(val);
    if (val) {
       const a = akten.find(x => x.id === val);
       if (a) {
          setGegnerName(a.gegner_name || '');
          setGegnerAnsprechpartner(a.gegner_ansprechpartner || '');
          setGegnerTelefon(a.gegner_telefon || '');
          setGegnerEmail(a.gegner_email || '');
          setUnsereFirma(a.unsere_firma || '');
          setUnserAnsprechpartner(a.unser_ansprechpartner || '');
          setThema(a.thema || '');
          setAktenzeichen(a.aktenzeichen || '');
          
          if (a.gegner_name) {
             const crmGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(a.gegner_name));
             if (crmGegner) {
                setGegnerFax(crmGegner.fax || '');
                if (!a.gegner_email) setGegnerEmail(crmGegner.email || crmGegner.email_zentrale || '');
             } else {
                setGegnerFax('');
             }
          }
       }
    }
  };

  const handleJsonImport = async (e) => {
    setActiveTab('akten');
    const val = e.target.value.trim();
    setJsonImport(val);
    
    if (val.startsWith('http://') || val.startsWith('https://')) {
      handleLiveUrlFetch(val);
      return;
    }

    try {
      const obj = JSON.parse(val);

      if (obj.typ === 'Bulk-Gegner' && Array.isArray(obj.daten)) {
        setLaedt(true);
        let addedCount = 0;
        let updatedCount = 0;

        for (const item of obj.daten) {
           if (!item.gegner_name) continue;
           const existingGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(item.gegner_name));

           if (!existingGegner) {
              await supabase.from('gegner').insert([{
                user_id: session.user.id,
                name: item.gegner_name,
                fax: item.fax || null,
                email: item.email || null,
                notizen: JSON.stringify([{
                  abteilung: item.abteilung || '',
                  name: item.ansprechpartner || '',
                  telefon: item.telefon || '',
                  email: item.email || ''
                }])
              }]);
              addedCount++;
           } else {
              let updates = {};
              let needsUpdate = false;

              if (!existingGegner.fax && item.fax) { updates.fax = item.fax; needsUpdate = true; }
              if (!existingGegner.email && item.email) { updates.email = item.email; needsUpdate = true; }

              let currentContacts = [];
              try {
                currentContacts = typeof existingGegner.notizen === 'string' ? JSON.parse(existingGegner.notizen) : (existingGegner.notizen || []);
                if (!Array.isArray(currentContacts)) currentContacts = [];
              } catch(e) { currentContacts = []; }

              if (item.ansprechpartner || item.abteilung) {
                 const contactExists = currentContacts.some(c => 
                   (c.name || '').toLowerCase() === (item.ansprechpartner || '').toLowerCase() &&
                   (c.abteilung || '').toLowerCase() === (item.abteilung || '').toLowerCase()
                 );

                 if (!contactExists) {
                    currentContacts.push({
                       abteilung: item.abteilung || '',
                       name: item.ansprechpartner || '',
                       telefon: item.telefon || '',
                       email: item.email || ''
                    });
                    updates.notizen = JSON.stringify(currentContacts);
                    needsUpdate = true;
                 }
              }

              if (needsUpdate) {
                await supabase.from('gegner').update(updates).eq('id', existingGegner.id);
                updatedCount++;
              }
           }
        }
        await ladeDaten();
        setJsonImport('');
        setLaedt(false);
        showToast(`✅ KI-Gegner-Scan abgeschlossen!\n\n${addedCount} neue Behörden/Gegner angelegt.\n${updatedCount} bestehende aktualisiert.`, 'success');
        return; 
      }

      setAktenzeichen(obj.aktenzeichen || '')
      setThema(obj.thema || '')
      setGegnerName(obj.kontakt || '') 
      setGegnerAnsprechpartner(obj.ansprechpartner || '')
      setGegnerTelefon(obj.gegner_telefon || '')
      setGegnerFax(obj.gegner_fax || '')
      setGegnerEmail(obj.gegner_email || '')
      setFristExtern(obj.frist_extern || '')
      setBriefEntwurf(obj.brief_entwurf || '')
      setAktion(obj.aktion || '')
      setKanal(obj.kanal || 'Post / Fax / E-Mail')
      setTyp(obj.typ || 'Eingang')
      setDatum(new Date().toISOString().split('T')[0])

      if (obj.aktenzeichen) {
        let match = akten.find(a => a.aktenzeichen === obj.aktenzeichen);

        // Deep-Check in Supabase, falls die Akte im lokalen (offenen) State nicht existiert
        if (!match) {
          const { data: dbMatch, error: dbErr } = await supabase
            .from('akten')
            .select('*, akten_historie (*)')
            .eq('aktenzeichen', obj.aktenzeichen)
            .single();

          if (dbMatch && !dbErr) {
             if (dbMatch.akten_historie) {
               dbMatch.akten_historie.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
             }
             setAkten(prev => [dbMatch, ...prev]); // Akte reaktivieren in der lokalen Ansicht
             match = dbMatch;
          }
        }

        if (match) {
          setModus('bestehend');
          setSelectedAkteId(match.id);
          if (!obj.gegner_fax && match.gegner_name) {
             const crmGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(match.gegner_name));
             if (crmGegner && crmGegner.fax) {
                setGegnerFax(crmGegner.fax);
             }
          }
        } else {
          setModus('neu');
          if (obj.kontakt) {
             const crmGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(obj.kontakt));
             if (crmGegner && crmGegner.fax) {
                setGegnerFax(crmGegner.fax);
             }
          }
        }
      } else {
        setModus('neu');
      }

      if (obj.unsere_firma) {
        const existingMandant = mandanten.find(m => normalizeName(m.firmenname) === normalizeName(obj.unsere_firma));
        const parsedAnsprechpartner = cleanVal(obj.unser_ansprechpartner) || cleanVal(obj.ansprechpartner) || '';
        const parsedTelefon = cleanVal(obj.unser_telefon) || cleanVal(obj.telefon) || '';
        const parsedEmail = cleanVal(obj.unser_email) || cleanVal(obj.email) || '';
        const parsedAdresse = cleanVal(obj.unsere_adresse) || cleanVal(obj.adresse) || '';

        if (!existingMandant) {
          setUnsereFirma(obj.unsere_firma || '');
          setUnserAnsprechpartner(parsedAnsprechpartner);
          setUnserTelefon(parsedTelefon);
          setUnserEmail(parsedEmail);
          setTresorPrompt({ 
            typ: 'neu', 
            obj: { 
              ...obj, 
              unser_ansprechpartner: parsedAnsprechpartner, 
              unser_telefon: parsedTelefon, 
              unser_email: parsedEmail, 
              unsere_adresse: parsedAdresse 
            } 
          });
        } else {
           setUnsereFirma(existingMandant.firmenname); 
           setUnserAnsprechpartner(parsedAnsprechpartner || cleanVal(existingMandant.ansprechpartner) || '');
           setUnserTelefon(parsedTelefon || cleanVal(existingMandant.telefon) || '');
           setUnserEmail(parsedEmail || cleanVal(existingMandant.email) || '');

           let updates = {};
           let oldValues = {};
           const checkUpdate = (oldVal, newVal) => {
             const o = (!oldVal || oldVal === 'null' || oldVal === 'undefined') ? '' : String(oldVal).trim();
             const n = (!newVal || newVal === 'null' || newVal === 'undefined') ? '' : String(newVal).trim();
             return (n !== '' && o !== n) ? { old: o, new: n } : null;
           };
           
           let u1 = checkUpdate(existingMandant.ansprechpartner, parsedAnsprechpartner); if(u1) { updates.ansprechpartner = u1.new; oldValues.ansprechpartner = u1.old; }
           let u2 = checkUpdate(existingMandant.telefon, parsedTelefon); if(u2) { updates.telefon = u2.new; oldValues.telefon = u2.old; }
           let u3 = checkUpdate(existingMandant.email, parsedEmail); if(u3) { updates.email = u3.new; oldValues.email = u3.old; }
           let u4 = checkUpdate(existingMandant.adresse, parsedAdresse); if(u4) { updates.adresse = u4.new; oldValues.adresse = u4.old; }
           let u5 = checkUpdate(existingMandant.steuernummer, obj.unsere_steuernummer); if(u5) { updates.steuernummer = u5.new; oldValues.steuernummer = u5.old; }
           let u6 = checkUpdate(existingMandant.ust_id, obj.unsere_ust_id); if(u6) { updates.ust_id = u6.new; oldValues.ust_id = u6.old; }
           let u7 = checkUpdate(existingMandant.betriebsnummer, obj.unsere_betriebsnummer); if(u7) { updates.betriebsnummer = u7.new; oldValues.betriebsnummer = u7.old; }
           let u8 = checkUpdate(existingMandant.vbg_nummer, obj.unsere_vbg_nummer); if(u8) { updates.vbg_nummer = u8.new; oldValues.vbg_nummer = u8.old; }
           let u9 = checkUpdate(existingMandant.handelsregister, obj.unsere_handelsregister); if(u9) { updates.handelsregister = u9.new; oldValues.handelsregister = u9.old; }
           let u10 = checkUpdate(existingMandant.iban, obj.unsere_iban); if(u10) { updates.iban = u10.new; oldValues.iban = u10.old; }

           if (Object.keys(updates).length > 0) {
              setTresorPrompt({ 
                typ: 'update', existingId: existingMandant.id, updates, oldValues,
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
        ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || '',
        betriebsnummer: cleanVal(tresorPrompt.obj.unsere_betriebsnummer) || '',
        vbg_nummer: cleanVal(tresorPrompt.obj.unsere_vbg_nummer) || '',
        handelsregister: cleanVal(tresorPrompt.obj.unsere_handelsregister) || '',
        iban: cleanVal(tresorPrompt.obj.unsere_iban) || ''
      }]).select();
      if (!error && data) {
        setMandanten(prev => [...prev, data[0]]);
        showToast(`✅ Mandant "${tresorPrompt.obj.unsere_firma}" im Tresor angelegt!`, 'success');
      }
    } else if (tresorPrompt.typ === 'update') {
      let finalUpdates = {};
      tresorPrompt.selectedKeys.forEach(k => { finalUpdates[k] = tresorPrompt.updates[k]; });
      if (Object.keys(finalUpdates).length > 0) {
        await supabase.from('mandanten').update(finalUpdates).eq('id', tresorPrompt.existingId);
        ladeDaten();
        showToast(`✅ Tresor-Eintrag für "${tresorPrompt.firma}" aktualisiert!`, 'success');
      }
    }
    setTresorPrompt(null);
  };

  const handleInlineEdit = async (histId, feld, wert) => {
    const { error } = await supabase.from('akten_historie').update({ [feld]: wert || null }).eq('id', histId);
    if (!error) {
      ladeDaten(); 
      showToast('Änderung gespeichert!', 'success');
    } else {
      showToast("Fehler beim Speichern: " + error.message, 'error');
    }
  };

  const loescheHistorieEintrag = async (histId) => {
    if(!window.confirm("Diesen gesamten Eintrag inkl. aller darin verknüpften Dateien aus der Akte löschen?")) return;
    await supabase.from('akten_historie').delete().eq('id', histId);
    ladeDaten();
    showToast('Eintrag komplett gelöscht!', 'success');
  };

  const loescheDateiAusHistorie = async (histId, aktuelleUrls, urlZumLoeschen) => {
    if (!window.confirm("Diese Datei wirklich aus dem Akten-Eintrag entfernen?")) return;
    const urlArray = aktuelleUrls.split(',');
    const neueUrls = urlArray.filter(url => url !== urlZumLoeschen);
    const neuerUrlString = neueUrls.length > 0 ? neueUrls.join(',') : null;
    
    const { error: dbError } = await supabase.from('akten_historie').update({ dokument_url: neuerUrlString }).eq('id', histId);
    
    if (!dbError) {
       try {
          const parts = decodeURIComponent(urlZumLoeschen).split('/');
          const fileName = parts[parts.length - 1];
          await supabase.storage.from('dokumente').remove([fileName]);
       } catch (e) { }
       ladeDaten();
       showToast('Datei erfolgreich entfernt!', 'success');
    } else {
       showToast("Fehler beim Entfernen der Datei: " + dbError.message, 'error');
    }
  };

  const toggleAkteStatus = async (akteId, currentStatus) => {
    const neuerStatus = currentStatus === 'Erledigt' ? 'Offen' : 'Erledigt';
    const { error } = await supabase.from('akten').update({ status: neuerStatus }).eq('id', akteId);
    
    if (!error) {
      if (neuerStatus === 'Erledigt') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 10);
        const wvDatum = d.toISOString().split('T')[0];

        await supabase.from('akten_historie').insert([{
          akte_id: akteId,
          user_id: session.user.id,
          typ: 'Intern',
          datum: new Date().toISOString().split('T')[0],
          aktion: 'Akte geschlossen. Automatische Wiedervorlage zur Löschung (Ablauf Aufbewahrungsfrist).',
          wiedervorlage: wvDatum
        }]);
      }
      ladeDaten(); 
      showToast(`Akte wurde ${neuerStatus === 'Erledigt' ? 'geschlossen' : 'wieder geöffnet'}.`, 'success');
    } else {
      showToast("Fehler beim Ändern des Akten-Status: " + error.message, 'error');
    }
  };

  // =================================================================
  // 2. UPLOAD-WEICHE: AKTEN HISTORIE NACHTRAG (handleNachtragUploadAkte)
  // =================================================================
  const handleNachtragUploadAkte = async (histId, currentUrls, akteFirma, akteGegner, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingHistId(histId);
    
    const isMd = file.name.toLowerCase().endsWith('.md');

    if (isMd) {
      // WEG A: Reine Textdatei -> Nur nach GitHub & DB, KEIN Storage
      const mdInhalt = await file.text();
      const baseInfo = `Nachträglich an Akte angehängt. Gegner: ${akteGegner || 'Unbekannt'}`;
      
      await supabase.from('wissensdatenbank').insert([{
        datei_name: file.name,
        firma: akteFirma || 'Allgemein',
        inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`,
        dokument_url: null
      }]);

      await syncToGithub(file.name, mdInhalt, null, null, showToast);
      ladeDaten(); // Refresh um die Tabelle zu aktualisieren
      showToast('Dokument erfolgreich angehängt!', 'success');
    } else {
      // WEG B: PDF / Binärdaten -> Storage Upload
      const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const dateiName = `h_${Date.now()}_${sichererDateiname}`;
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file);
      
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        const newUrl = linkData.publicUrl;
        const updatedUrls = currentUrls ? `${currentUrls},${newUrl}` : newUrl;
        
        await supabase.from('akten_historie').update({ dokument_url: updatedUrls }).eq('id', histId);
        ladeDaten();
        showToast('Dokument erfolgreich angehängt!', 'success');
      } else {
        showToast("Fehler beim Upload: " + uploadError.message, 'error');
      }
    }
    
    setUploadingHistId(null);
    e.target.value = '';
  };

  const handleSignaturUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result;
      setSignaturPreview(base64data);
      localStorage.setItem('sonar_signature', base64data);
    };
    reader.readAsDataURL(file);
  };

  const loescheSignatur = () => {
    setSignaturPreview(null);
    localStorage.removeItem('sonar_signature');
  };

  const setzeWV = (tage, monate = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + tage);
    if (monate > 0) d.setMonth(d.getMonth() + monate);
    setWiedervorlage(d.toISOString().split('T')[0]);
  };

  const druckeAkte = (akte) => {
    const printWindow = window.open('', '_blank');
    const historieRows = akte.akten_historie ? akte.akten_historie.map(h => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${h.typ}</td>
        <td style="padding: 8px; border: 1px solid #ccc;">${h.datum ? new Date(h.datum).toLocaleDateString('de-DE') : '-'}</td>
        <td style="padding: 8px; border: 1px solid #ccc;">${h.aktion || '-'}</td>
        <td style="padding: 8px; border: 1px solid #ccc; color: #d97706;">
          ${h.wiedervorlage ? 'WV: ' + new Date(h.wiedervorlage).toLocaleDateString('de-DE') : (h.frist_extern ? 'Frist: ' + new Date(h.frist_extern).toLocaleDateString('de-DE') : '-')}
        </td>
      </tr>
    `).join('') : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Aktenauszug - ${akte.gegner_name || 'Akte'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #111; line-height: 1.5; }
            h1 { font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 13px; background: #f4f4f4; padding: 15px; border-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background: #eee; padding: 8px; border: 1px solid #ccc; text-align: left; }
          </style>
        </head>
        <body>
          <h1>SONAR AKTEN-AUSZUG | AZ: ${akte.aktenzeichen || 'Neu'}</h1>
          <div class="grid">
            <div>
              <strong>GEGENPARTEI / BEHÖRDE:</strong><br/>
              ${akte.gegner_name}<br/>
              Ansprechpartner: ${akte.gegner_ansprechpartner || '-'}<br/>
              E-Mail: ${akte.gegner_email || '-'}
            </div>
            <div>
              <strong>MANDANT / FIRMA:</strong><br/>
              ${akte.unsere_firma}<br/>
              Ansprechpartner: ${akte.unser_ansprechpartner || '-'}<br/>
              Thema: ${akte.thema}
            </div>
          </div>
          <h3>DOKUMENTEN- & VERLAUFSHISTORIE</h3>
          <table>
            <thead>
              <tr>
                <th>Typ</th>
                <th>Datum</th>
                <th>Aktion / Vorgang</th>
                <th>WV / Frist</th>
              </tr>
            </thead>
            <tbody>
              ${historieRows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleResendVersand = async (versandArt) => {
    if (!briefEntwurf || briefEntwurf.trim() === '') {
      showToast("⚠️ Bitte gib zuerst einen Text im Schreibfenster ein!", 'warning');
      return;
    }
    if (!gegnerEmail && versandArt === 'email') {
      showToast("⚠️ Bitte trage zuerst eine E-Mail-Adresse der Gegenseite / Behörde ein!", 'warning');
      return;
    }
    if (!gegnerFax && versandArt === 'fax') {
      showToast("⚠️ Bitte trage zuerst eine Faxnummer der Gegenseite ein!", 'warning');
      return;
    }

    setLaedt(true);
    try {
      const rawFax = gegnerFax ? gegnerFax.replace(/[^0-9]/g, '') : '';
      const targetAddress = versandArt === 'email' 
        ? gegnerEmail 
        : `${rawFax}@simple-fax.de`; 

      const betreff = `Aktenzeichen: ${aktenzeichen || 'Neu'} — ${thema || 'Schreiben'}`;

      const mandantProfil = mandanten.find(m => normalizeName(m.firmenname) === normalizeName(unsereFirma)) || null;

      const response = await fetch("https://loyzfkxkuyypgteskxkm.supabase.co/functions/v1/sonar-send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          to: targetAddress,
          subject: betreff,
          text: briefEntwurf,
          signatureUrl: SIGNATUR_URL,
          unsereFirma: unsereFirma || 'Jens Wilsdorf',
          mandantProfil: mandantProfil,
          gegnerName: gegnerName,
          gegnerAnsprechpartner: gegnerAnsprechpartner,
          gegnerFax: gegnerFax
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || resData.message || JSON.stringify(resData));
      }

      if (resData.pdfUrl) {
         setVersandPdfUrl(resData.pdfUrl);
      }
      
      setAktion(`${versandArt === 'email' ? 'E-Mail' : 'E-Fax (Simple-Fax)'} versendet an ${targetAddress}`);
      setKanal(versandArt === 'email' ? 'E-Mail (Resend)' : 'E-Fax (Simple-Fax via Resend)');
      setTyp('Ausgang');

      showToast(`✅ ${versandArt === 'email' ? 'E-Mail' : 'E-Fax'} erfolgreich versendet!\nDas PDF wurde generiert. Klicke jetzt noch unten auf "+ In Akte abheften", um den Vorgang endgültig in der Akte zu speichern.`, 'success');

    } catch (e) {
      console.error("Versandfehler:", e);
      showToast("❌ Rückmeldung von Resend: " + e.message, 'error');
    }
    setLaedt(false);
  };

  // =================================================================
  // 3. UPLOAD-WEICHE: TRESOR NACHTRAG (handleNachtragUploadMandant)
  // =================================================================
  const handleNachtragUploadMandant = async (mId, currentUrls, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingMandantId(mId);
    
    const isMd = file.name.toLowerCase().endsWith('.md');
    const matchMandant = mandanten.find(x => x.id === mId);
    const fName = matchMandant ? matchMandant.firmenname : 'Allgemein';

    if (isMd) {
      // WEG A: Reine Textdatei -> Nur nach GitHub & DB, KEIN Storage
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
      // WEG B: PDF / Binärdaten -> Storage Upload
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

  // =================================================================
  // NEUER UPLOAD-REMINDER INTERCEPTOR
  // =================================================================
  const handleSpeichernCheck = (e) => {
    e.preventDefault();
    // Prüfen, ob keine Dateien manuell ausgewählt wurden
    if (dateien.length === 0) {
      setShowUploadReminder(true);
    } else {
      speichereEintragLogik();
    }
  };

  // =================================================================
  // 4. UPLOAD-WEICHE: HAUPT-FORMULAR (speichereEintragLogik)
  // =================================================================
  const speichereEintragLogik = async () => {
    setShowUploadReminder(false);
    setLaedt(true);

    if (tresorPrompt && tresorPrompt.typ === 'neu') {
      const { data: mData } = await supabase.from('mandanten').insert([{
        user_id: session.user.id,
        firmenname: tresorPrompt.obj.unsere_firma,
        ansprechpartner: cleanVal(tresorPrompt.obj.unser_ansprechpartner) || '',
        telefon: cleanVal(tresorPrompt.obj.unser_telefon) || '',
        email: cleanVal(tresorPrompt.obj.unser_email) || '',
        adresse: cleanVal(tresorPrompt.obj.unsere_adresse) || '',
        steuernummer: cleanVal(tresorPrompt.obj.unsere_steuernummer) || '',
        ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || '',
        betriebsnummer: cleanVal(tresorPrompt.obj.unsere_betriebsnummer) || '',
        vbg_nummer: cleanVal(tresorPrompt.obj.unsere_vbg_nummer) || '',
        handelsregister: cleanVal(tresorPrompt.obj.unsere_handelsregister) || '',
        iban: cleanVal(tresorPrompt.obj.unsere_iban) || ''
      }]).select();
      if (mData) setMandanten(prev => [...prev, mData[0]]);
    }

    let alleUrls = [];
    
    // Manuell hochgeladene Dateien verarbeiten 
    if (dateien && dateien.length > 0) {
      for (const f of dateien) {
        const isMd = f.name.toLowerCase().endsWith('.md');
        const zugewieseneFirma = unsereFirma || (tresorPrompt && tresorPrompt.typ === 'neu' ? tresorPrompt.obj.unsere_firma : 'Allgemein');

        if (isMd) {
           // WEG A: Reine Textdatei -> Nur nach GitHub & DB, KEIN Storage
           const fileInhalt = await f.text();
           const baseInfo = `Upload via Akten-Cockpit. Gegner: ${gegnerName || 'Unbekannt'} | Thema: ${thema || 'Ohne Thema'}`;
           const finalDbText = `${baseInfo}\n\n${fileInhalt.substring(0, 3000)}...`;

           await supabase.from('wissensdatenbank').insert([{
             datei_name: f.name,
             firma: zugewieseneFirma,
             inhalt_text: finalDbText,
             dokument_url: null
           }]);

           await syncToGithub(f.name, fileInhalt, null, null, showToast);
        } else {
           // WEG B: PDF / Binärdaten -> Storage Upload
           const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_')
           const dateiName = `${Date.now()}_${sichererDateiname}` 
           const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f)
           
           if (!uploadError) {
             const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName)
             alleUrls.push(linkData.publicUrl)
           }
        }
      }
    }
    
    // Das generierte Versand-PDF hinzufügen, falls vorhanden
    if (versandPdfUrl) {
      alleUrls.push(versandPdfUrl);
      
      await supabase.from('wissensdatenbank').insert([{
        datei_name: `Ausgang_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 30)}.pdf`,
        firma: unsereFirma || 'Allgemein',
        inhalt_text: `Automatisch versendetes Dokument. Gegner: ${gegnerName || 'Unbekannt'} | Thema: ${thema || 'Ohne Thema'}\n\n[Text-Entwurf]\n${briefEntwurf}`,
        dokument_url: versandPdfUrl
      }]);

      const ausgangName = `Ausgang_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 30)}.md`;
      await syncToGithub(ausgangName, `Versendetes Dokument\nThema: ${thema || 'Ohne Thema'}\nGegner: ${gegnerName || 'Unbekannt'}\nLink: ${versandPdfUrl}\n\nDokumententext:\n${briefEntwurf}`, versandPdfUrl, null, showToast);
    } else if (briefEntwurf && briefEntwurf.trim() !== '') {
      const entwurfName = `Entwurf_${Date.now()}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 30)}.md`;
      await syncToGithub(entwurfName, `Text-Entwurf\nThema: ${thema || 'Ohne Thema'}\nGegner: ${gegnerName || 'Unbekannt'}\n\nDokumententext:\n${briefEntwurf}`, null, null, showToast);
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
      if (aktenError) { 
        showToast("Fehler Akte: " + aktenError.message, 'error'); 
        setLaedt(false); 
        return; 
      }
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
      if (gegnerName) {
        const existingGegner = gegnerListe.find(g => normalizeName(g.name) === normalizeName(gegnerName));
        if (!existingGegner) {
          await supabase.from('gegner').insert([{
            user_id: session.user.id,
            name: gegnerName,
            fax: gegnerFax || null,
            email: gegnerEmail || null,
            notizen: JSON.stringify([{ abteilung: '', name: gegnerAnsprechpartner || '', telefon: gegnerTelefon || '', email: gegnerEmail || '' }])
          }]);
        } else {
          let updates = {};
          let needsUpdate = false;

          if (!existingGegner.fax && gegnerFax) {
            updates.fax = gegnerFax;
            needsUpdate = true;
          }
          if (!existingGegner.email && gegnerEmail) {
            updates.email = gegnerEmail;
            needsUpdate = true;
          }

          let currentContacts = [];
          try {
            currentContacts = typeof existingGegner.notizen === 'string' ? JSON.parse(existingGegner.notizen) : (existingGegner.notizen || []);
            if (!Array.isArray(currentContacts)) currentContacts = [];
          } catch(e) {
             currentContacts = [];
          }

          if (gegnerAnsprechpartner) {
             const contactExists = currentContacts.some(c => 
               (c.name || '').toLowerCase() === gegnerAnsprechpartner.toLowerCase()
             );

             if (!contactExists) {
                currentContacts.push({
                   abteilung: '',
                   name: gegnerAnsprechpartner,
                   telefon: gegnerTelefon || '',
                   email: gegnerEmail || ''
                });
                updates.notizen = JSON.stringify(currentContacts);
                needsUpdate = true;
             }
          }

          if (needsUpdate) {
            await supabase.from('gegner').update(updates).eq('id', existingGegner.id);
          }
        }
      }

      setAktenzeichen(''); setGegnerName(''); setGegnerAnsprechpartner(''); setGegnerTelefon(''); setGegnerFax(''); setGegnerEmail(''); 
      setUnsereFirma(''); setUnserAnsprechpartner(''); setUnserTelefon(''); setUnserEmail(''); setThema(''); 
      setAktion(''); setKanal(''); setFristExtern(''); setWiedervorlage(''); setDateien([]); 
      setBriefEntwurf(''); setJsonImport(''); setTresorPrompt(null);
      setVersandPdfUrl(null); 
      if (document.getElementById('datei-upload-manuell')) document.getElementById('datei-upload-manuell').value = '';
      ladeDaten();
      showToast('✅ Akteneintrag erfolgreich gespeichert!', 'success');
    } else {
      showToast('❌ Fehler beim Speichern der Historie: ' + histError.message, 'error');
    }
    setLaedt(false)
  }

  const naechsterGegnerUebergeben = async (akteId) => {
    if (!neuerGegnerName) {
      showToast("Bitte gib den Namen der neuen Behörde / des neuen Gegners ein!", 'warning');
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
      showToast(`✅ Akte an "${neuerGegnerName}" übergeben!`, 'success');
    } else {
      showToast("Fehler bei der Übergabe: " + error.message, 'error');
    }
  };

  const mergeAkte = async (sourceId) => {
    if (!mergeTargetId) { showToast("Bitte wähle zuerst eine Ziel-Akte aus!", 'warning'); return; }
    if (sourceId === mergeTargetId) { showToast("Quell- und Ziel-Akte dürfen nicht identisch sein!", 'warning'); return; }
    if (!window.confirm("Achtung: Die komplette Historie (inkl. Dokumente) wird in die Ziel-Akte verschoben. Die aktuelle Akte wird anschließend gelöscht. Fortfahren?")) return;

    const sourceAkte = akten.find(a => a.id === sourceId);
    const histToMove = sourceAkte.akten_historie || [];

    for (const h of histToMove) {
      await supabase.from('akten_historie').update({ akte_id: mergeTargetId }).eq('id', h.id);
    }

    await supabase.from('akten_historie').insert([{
      akte_id: mergeTargetId,
      user_id: session.user.id,
      typ: 'Intern',
      datum: new Date().toISOString().split('T')[0],
      aktion: `Akte zusammengeführt: Die Akte "${sourceAkte.thema}" (AZ: ${sourceAkte.aktenzeichen || '-'}) von Gegner "${sourceAkte.gegner_name}" wurde in diese Akte integriert.`
    }]);

    await supabase.from('akten').delete().eq('id', sourceId);

    setMergeSourceId(null);
    setMergeTargetId('');
    ladeDaten();
    showToast("✅ Akten erfolgreich zusammengeführt!", 'success');
  };

  const toggleAkte = (id) => {
    if (aufgeklappteAkten.includes(id)) setAufgeklappteAkten(aufgeklappteAkten.filter(aId => aId !== id))
    else setAufgeklappteAkten([...aufgeklappteAkten, id])
  }

  const loescheAkte = async (id) => {
    if(!window.confirm("Ganze Akte löschen?")) return
    await supabase.from('akten').delete().eq('id', id)
    ladeDaten()
    showToast('Akte komplett gelöscht.', 'success');
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
    const val = e.target.value;
    if(!val) return;
    const [gId, ansIndex] = val.split('|');
    const g = gegnerListe.find(x => x.id === gId);
    if(g) {
      setGegnerName(g.name || ''); 
      setGegnerFax(g.fax || '');
      
      let ansprechpartnerObj = null;
      try {
        const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen;
        if (Array.isArray(parsed) && parsed[ansIndex]) {
          ansprechpartnerObj = parsed[ansIndex];
        }
      } catch(e){}

      if (ansprechpartnerObj) {
        setGegnerAnsprechpartner(ansprechpartnerObj.name || g.ansprechpartner || '');
        setGegnerTelefon(ansprechpartnerObj.telefon || g.telefon || '');
        setGegnerEmail(ansprechpartnerObj.email || g.email || g.email_zentrale || '');
      } else {
        setGegnerAnsprechpartner(g.ansprechpartner || '');
        setGegnerTelefon(g.telefon || '');
        setGegnerEmail(g.email || g.email_zentrale || '');
      }
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

  // =================================================================
  // 5. UPLOAD-WEICHE: TRESOR HAUPTFORMULAR (speichereMandant)
  // =================================================================
  const speichereMandant = async (e) => {
    e.preventDefault()
    setLaedt(true)

    let alleUrls = [];
    if (m_dateien && m_dateien.length > 0) {
      for (const f of m_dateien) {
        const isMd = f.name.toLowerCase().endsWith('.md');
        
        if (isMd) {
          // WEG A: Reine Textdatei -> Nur nach GitHub & DB, KEIN Storage
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
          // WEG B: PDF / Binärdaten -> Storage Upload
          const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const dateiName = `m_${Date.now()}_${sichererDateiname}` 
          const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f)
          
          if (!uploadError) {
            const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName)
            alleUrls.push(linkData.publicUrl)
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
  }

  const loescheMandant = async (id) => {
    if(!window.confirm("Firma komplett aus dem Tresor löschen?")) return
    await supabase.from('mandanten').delete().eq('id', id)
    ladeDaten()
    showToast('Firma aus Tresor gelöscht.', 'success');
  }

  const speichereGegner = async (e) => {
    e.preventDefault()
    setLaedt(true)
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
  }

  const loescheGegner = async (id) => {
    if(!window.confirm("Behörde / Gegner komplett aus dem CRM löschen?")) return
    await supabase.from('gegner').delete().eq('id', id)
    ladeDaten()
    showToast('Behörde aus CRM gelöscht.', 'success');
  }

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

  const berechneTageBis = (datumStr) => {
    if (!datumStr) return null;
    let rawDate = String(datumStr).trim();
    
    if (rawDate.length === 8 && rawDate.endsWith('206')) {
      rawDate = rawDate.replace('206', '2026');
    }
    
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const frist = new Date(rawDate);
    
    if (frist.getFullYear() < 2000) {
      frist.setFullYear(2026);
    }
    
    frist.setHours(0, 0, 0, 0);
    return Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
  };

  const handleAlarmKlick = (akteId) => {
    setActiveTab('akten');
    setFokussierteAkteId(akteId);
    
    if (!aufgeklappteAkten.includes(akteId)) {
      setAufgeklappteAkten(prev => [...prev, akteId]);
    }
    setTimeout(() => {
      const el = document.getElementById(`akte-karte-${akteId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const fristenWarnungen = [];

  akten.filter(a => a.status !== 'Erledigt').forEach(akte => {
    if (akte.akten_historie && akte.akten_historie.length > 0) {
      const relevanteEintraege = akte.akten_historie.filter(h => h.wiedervorlage || h.frist_extern);
      
      if (relevanteEintraege.length > 0) {
        const neuestesDokument = relevanteEintraege[0];
        
        let zielDatum = null;
        let isWV = false;
        let sollAlarmMachen = false;

        if (neuestesDokument.wiedervorlage) {
          const wvTage = berechneTageBis(neuestesDokument.wiedervorlage);
          if (wvTage !== null && wvTage <= 0) { 
            zielDatum = neuestesDokument.wiedervorlage;
            isWV = true;
            sollAlarmMachen = true;
          }
        } 
        
        if (!sollAlarmMachen && neuestesDokument.frist_extern) {
          const fristTage = berechneTageBis(neuestesDokument.frist_extern);
          if (fristTage !== null && fristTage <= 7) { 
            zielDatum = neuestesDokument.frist_extern;
            isWV = false;
            sollAlarmMachen = true;
          }
        }

        if (sollAlarmMachen && zielDatum) {
          const tage = berechneTageBis(zielDatum);
          let alarmStufe = '1. ERINNERUNG';
          if (tage <= 4 && tage > 2) alarmStufe = '2. ERINNERUNG';
          if (tage <= 2) alarmStufe = 'ALARM';

          fristenWarnungen.push({
            ...neuestesDokument,
            akte_id: akte.id,
            akte_thema: akte.thema,
            akte_gegner: akte.gegner_name,
            tageUebrig: tage,
            alarmStufe,
            isWiedervorlage: isWV,
            aktivesDatum: zielDatum
          });
        }
      }
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
      if (tage !== null && tage <= 7) { 
         ustRadar.push({ firma: m.firmenname, bezeichnung: bezeichnung, datum: nextFristDate.toISOString().split('T')[0], tageUebrig: tage });
      }
    }
  });
  ustRadar.sort((a,b) => a.tageUebrig - b.tageUebrig);

  const gefilterteAkten = akten.filter((akte) => {
    if (!suchbegriff.trim()) return true;

    const s = suchbegriff.toLowerCase();
    const gName = (akte.gegner_name || '').toLowerCase();
    const gAns = (akte.gegner_ansprechpartner || '').toLowerCase();
    const az = (akte.aktenzeichen || '').toLowerCase();
    const uFirma = (akte.unsere_firma || '').toLowerCase();
    const th = (akte.thema || '').toLowerCase();

    const histMatch = akte.akten_historie?.some(h => 
      (h.aktion || '').toLowerCase().includes(s) || (h.brief_entwurf || '').toLowerCase().includes(s)
    );

    return gName.includes(s) || gAns.includes(s) || az.includes(s) || uFirma.includes(s) || th.includes(s) || histMatch;
  });

  const gefilterteWissenEintraege = wissenEintraege.filter(w => {
    const matchSuche = !wissenSuchbegriff.trim() || 
      (w.datei_name || '').toLowerCase().includes(wissenSuchbegriff.toLowerCase()) || 
      (w.firma || '').toLowerCase().includes(wissenSuchbegriff.toLowerCase()) ||
      (w.inhalt_text || '').toLowerCase().includes(wissenSuchbegriff.toLowerCase());
    
    const matchFirma = !wissenFirmaFilter || w.firma === wissenFirmaFilter;
    const matchGegner = !wissenGegnerFilter || (w.inhalt_text || '').toLowerCase().includes(wissenGegnerFilter.toLowerCase());
    
    // NEU: Dateityp-Filter (.md vs .pdf)
    const isMd = w.datei_name && w.datei_name.toLowerCase().endsWith('.md');
    const matchModus = wissenAnzeigeModus === 'md' ? isMd : !isMd;
    
    return matchSuche && matchFirma && matchGegner && matchModus;
  });

  const formatDatum = (datum) => datum ? new Date(datum).toLocaleDateString('de-DE') : '-'

  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase' };
  const h4StyleAkten = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const h4StyleTresor = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word' };
  const quickBtnStyle = { background: theme.border, color: theme.textMain, border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '100vh', position: 'relative' }}>
      
      {/* ================================================================= */}
      {/* GLOBAL TOAST CONTAINER */}
      {/* ================================================================= */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: theme.cardBg,
            color: theme.textMain,
            borderLeft: `5px solid ${t.type === 'success' ? '#10b981' : t.type === 'error' ? theme.gegnerAccent : theme.hintBorder}`,
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: isDarkMode ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '280px',
            maxWidth: '450px',
            wordBreak: 'break-word',
            border: `1px solid ${theme.border}`,
            animation: t.fadingOut ? 'fadeOut 0.3s forwards' : 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ color: t.type === 'success' ? '#10b981' : t.type === 'error' ? theme.gegnerAccent : theme.hintBorder }}>
               <Icon name={t.type === 'success' ? 'check' : t.type === 'error' ? 'x' : 'alert'} size={24} />
            </div>
            <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.4', textAlign: 'left' }}>{t.message}</div>
          </div>
        ))}
      </div>

      {/* ================================================================= */}
      {/* OVERLAY POPUP FÜR FEHLENDE DATEIEN BEIM SPEICHERN */}
      {/* ================================================================= */}
      {showUploadReminder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: theme.cardBg, border: `1px solid ${theme.warningBorder}`, borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
            <Icon name="alert" size={48} style={{ color: theme.warningBorder, marginBottom: '15px' }} />
            <h3 style={{ margin: '0 0 15px 0', color: theme.textMain, fontSize: '20px' }}>Dateien vergessen?</h3>
            <p style={{ color: theme.textMuted, fontSize: '15px', marginBottom: '25px', lineHeight: '1.5' }}>
              Du hast aktuell <strong>keine</strong> Dokumente (PDF/MD) für den Upload in diese Akte ausgewählt.<br/><br/>
              Möchtest du die Akte / den Eintrag wirklich <strong>ohne Dateien</strong> anlegen?
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setShowUploadReminder(false)} 
                style={{ padding: '12px 18px', background: theme.accent, color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}
              >
                Abbrechen & Dateien auswählen
              </button>
              <button 
                onClick={speichereEintragLogik} 
                style={{ padding: '12px 18px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flex: '1 1 auto' }}
              >
                Trotzdem ohne Dateien speichern
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '1200px', padding: 'max(15px, 2vw)', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER & THEME TOGGLE (LOGO-FARBE PASST SICH AN TAB AN) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0, color: theme.textMain, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="signal" size={24} style={{ color: activeColor, transition: 'color 0.3s ease' }} /> SONAR COCKPIT
          </h1>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            style={{ background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <Icon name={isDarkMode ? 'sun' : 'moon'} size={18} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* DYNAMISCHE VOLLTEXT-SUCHLEISTE */}
        <div style={{ ...panelStyle, padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${activeColor}`, transition: 'border-color 0.3s ease' }}>
          <Icon name="search" size={20} style={{ color: activeColor, transition: 'color 0.3s ease' }} />
          <input 
            type="text" 
            placeholder="Erweiterte Volltextsuche oder URL eingeben (z.B. https://finanzamt.de...)" 
            value={suchbegriff}
            onChange={(e) => {
              const val = e.target.value;
              setSuchbegriff(val);
              if (val.startsWith('http://') || val.startsWith('https://')) {
                handleLiveUrlFetch(val);
              }
            }}
            style={{ width: '100%', background: 'transparent', border: 'none', color: theme.textMain, fontSize: '15px', outline: 'none' }}
          />
          {webFetchLoading && <span style={{ fontSize: '12px', color: activeColor }}>🌐 Lade Webseite...</span>}
          {suchbegriff && (
            <button onClick={() => setSuchbegriff('')} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer' }}>
              <Icon name="x" size={18} />
            </button>
          )}
        </div>

        {/* EBENE 1: MAGIC IMPORT & SONAR GUIDE (DYNAMISCHER STRICH/ICON RAHMEN) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', marginBottom: '20px', width: '100%' }}>
          <div style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px dashed ${activeColor}`, transition: 'border-color 0.3s ease' }}>
            <label style={{...labelStyle, color: activeColor, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.3s ease'}}>
              <Icon name="wand" size={18} /> MAGIC IMPORT (JSON AUS SONAR MEGA-LEGAL)
            </label>
            <textarea 
              id="magic-import"
              value={jsonImport} onChange={handleJsonImport} 
              placeholder='{"typ": "Eingang", "aktenzeichen": "...", "thema": "..."}'
              style={{ ...inputStyle, background: 'rgba(0,0,0,0.1)', border: `1px solid ${activeColor}`, color: theme.textMain, height: '100px', fontFamily: 'monospace', fontSize: '14px', marginTop: '5px', transition: 'border-color 0.3s ease' }} 
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

        {/* EBENE 2: TABS INKL. MANUELLER UPLOAD (DYNAMISCH MITGEFARBT) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px', width: '100%' }}>
          <button 
            onClick={() => setActiveTab('akten')} 
            style={{ flex: '1 1 120px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'akten' ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'akten' ? theme.accent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="cabinet" size={22} /> Akten-Cockpit
          </button>

          <button 
            onClick={() => setActiveTab('wissen')} 
            style={{ flex: '1 1 120px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'wissen' ? `2px solid ${theme.wissenAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'wissen' ? theme.wissenAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="brain" size={22} /> 🧠 KI-Wissensspeicher ({wissenEintraege.length})
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

          <div style={{ flex: '1 1 min(100%, 260px)', ...panelStyle, margin: 0, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${theme.border}` }}>
            <label style={{...labelStyle, color: activeColor, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', transition: 'color 0.3s ease'}}>
               <Icon name="paperclip" size={16} /> MANUELLER UPLOAD (PDF/MD)
            </label>
            <input 
              id="datei-upload-manuell" 
              type="file" multiple 
              onChange={(e) => { setDateien(Array.from(e.target.files)); setActiveTab('akten'); }} 
              style={{...inputStyle, border: `1px dashed ${activeColor}`, cursor: 'pointer', padding: '6px', fontSize: '12px', transition: 'border-color 0.3s ease'}} 
            />
          </div>
        </div>

        {/* ========================================= */}
        {/* ============= AKTEN COCKPIT ============= */}
        {/* ========================================= */}
        {activeTab === 'akten' && (
        <>
          {(fristenWarnungen.length > 0 || ustRadar.length > 0) && (
            <div style={{ ...panelStyle, background: theme.warningBg, border: `1px solid ${theme.warningBorder}`, marginBottom: '25px' }}>
              <h4 style={{ color: theme.warningText, margin: '0 0 15px 0', textAlign: 'left', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon name="alert" size={20} /> Dringende Alarme & Fällige Wiedervorlagen ({fristenWarnungen.length + ustRadar.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                {fristenWarnungen.map(w => {
                  const zielDatum = new Date(w.aktivesDatum);
                  const plusDreiDate = new Date(zielDatum);
                  plusDreiDate.setDate(plusDreiDate.getDate() + 3);

                  let shiftDisabled = false;
                  if (w.frist_extern) {
                    const originalFristDate = new Date(w.frist_extern);
                    if (plusDreiDate > originalFristDate) {
                      shiftDisabled = true;
                    }
                  }

                  const plusDreiIso = plusDreiDate.toISOString().split('T')[0];

                  return (
                    <div 
                      key={`warn-${w.id}`} 
                      onClick={() => handleAlarmKlick(w.akte_id)}
                      style={{ 
                        background: theme.cardItemBg, 
                        padding: '14px 18px', 
                        borderRadius: '8px', 
                        border: `1px solid ${theme.border}`,
                        borderLeft: `5px solid ${theme.warningBorder}`,
                        boxShadow: isDarkMode ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
                        cursor: 'pointer', 
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                      title="Klicken, um diese Akte unten zu fokussieren!"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '15px' }}>
                        <strong style={{ color: theme.warningBorder, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🏢 {w.akte_gegner}
                        </strong>

                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              if (w.isWiedervorlage) handleInlineEdit(w.id, 'wiedervorlage', null);
                              else handleInlineEdit(w.id, 'frist_extern', null);
                            }} 
                            style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                          >
                            ✓ Erledigt
                          </button>

                          <button 
                            disabled={shiftDisabled}
                            onClick={() => {
                              if (w.isWiedervorlage) handleInlineEdit(w.id, 'wiedervorlage', plusDreiIso);
                              else handleInlineEdit(w.id, 'frist_extern', plusDreiIso);
                            }} 
                            style={{ 
                              background: shiftDisabled ? (isDarkMode ? '#334155' : '#e2e8f0') : theme.border, 
                              color: shiftDisabled ? theme.textMuted : theme.textMain, 
                              border: 'none', padding: '6px 12px', borderRadius: '4px', 
                              cursor: shiftDisabled ? 'not-allowed' : 'pointer', 
                              fontSize: '12px', fontWeight: 'bold',
                              opacity: shiftDisabled ? 0.6 : 1,
                              whiteSpace: 'nowrap'
                            }}
                            title={shiftDisabled ? "Sperre: Verschiebung um 3 Tage würde hinter der harten Originalfrist liegen!" : "Um 3 Tage verschieben"}
                          >
                            +3 Tage {shiftDisabled ? '🔒' : ''}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: theme.textMuted, flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ color: theme.textMain, fontWeight: '500' }}>📋 {w.akte_thema}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                          <span>{w.isWiedervorlage ? 'Wiedervorlage' : 'Frist'}: <strong style={{color: theme.textMain}}>{formatDatum(w.aktivesDatum)}</strong></span>
                          {w.frist_extern && w.isWiedervorlage && <span style={{fontSize: '11px', opacity: 0.8}}>(Frist: {formatDatum(w.frist_extern)})</span>}
                          
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: theme.warningBorder, color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {w.tageUebrig < 0 ? `Überfällig: ${Math.abs(w.tageUebrig)} Tage` : w.tageUebrig === 0 ? 'HEUTE FÄLLIG!' : `Noch ${w.tageUebrig} Tage`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* USt-RADAR ALARME */}
                {ustRadar.map((r, i) => (
                  <div key={`ust-${i}`} style={{ background: theme.cardItemBg, padding: '12px 18px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: `5px solid ${theme.tresorAccent}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ color: theme.tresorAccent }}>🏛️ {r.firma}</strong> — <span style={{ color: theme.textMain }}>{r.bezeichnung}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', color: theme.textMuted, marginRight: '10px' }}>Fällig am {formatDatum(r.datum)}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: theme.tresorAccent, color: '#000', fontWeight: 'bold' }}>
                        Noch {r.tageUebrig} Tage
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NEU: FORMULAR NUTZT JETZT handleSpeichernCheck STATT DIREKT speichereEintragLogik */}
          <form onSubmit={handleSpeichernCheck} style={{ ...panelStyle, marginBottom: '20px' }}>
            
            {/* ERWEITERTES TRESOR MATCH BANNER MIT DETAILLIERTER ÄNDERUNGSANZEIGE */}
            {tresorPrompt && (
              <div style={{ background: theme.accent, color: '#000', padding: '18px 20px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', marginBottom: tresorPrompt.typ === 'update' ? '12px' : '0' }}>
                  <strong style={{ fontSize: '15px' }}>
                    🏢 Firmen-Tresor Match: {tresorPrompt.typ === 'neu' ? `Mandant "${tresorPrompt.obj.unsere_firma}" neu anlegen?` : `Folgende Daten für "${tresorPrompt.firma}" im Tresor aktualisieren?`}
                  </strong>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" onClick={handleTresorPromptAccept} style={{ background: '#000', color: theme.accent, border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Ja, {tresorPrompt.typ === 'neu' ? 'anlegen' : 'übernehmen'}
                    </button>
                    <button type="button" onClick={() => setTresorPrompt(null)} style={{ background: 'transparent', border: '1px solid #000', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Nein
                    </button>
                  </div>
                </div>

                {tresorPrompt.typ === 'update' && (
                  <div style={{ background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '6px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', opacity: 0.8 }}>Erkannte Feld-Änderungen:</div>
                    {Object.keys(tresorPrompt.updates).map(k => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={tresorPrompt.selectedKeys.includes(k)} 
                          onChange={() => toggleTresorUpdateKey(k)} 
                          style={{ accentColor: '#000' }}
                        />
                        <span>
                          <strong>{k}:</strong> <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{tresorPrompt.oldValues[k] || '(leer)'}</span> ➔ <strong>{tresorPrompt.updates[k]}</strong>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
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
                <div style={{ flex: '1 1 min(100%, 200px)', marginLeft: 'auto' }}>
                  <select value={selectedAkteId} onChange={handleAkteAuswahl} required style={{...inputStyle, padding: '8px', fontSize: '13px'}}>
                    <option value="">-- Ziel-Akte wählen --</option>
                    {akten.map(a => <option key={a.id} value={a.id}>[#{a.id.substring(0,6).toUpperCase()}] {a.gegner_name} | {a.thema}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}>
              {modus === 'neu' && (
                <>
                  <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                      <h4 style={{margin: 0, color: theme.textMain}}>1. Gegenpartei / Behörde</h4>
                      {gegnerListe.length > 0 && (
                        <select onChange={handleGegnerAuswahl} style={{padding: '4px 8px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '12px', background: theme.inputBg, color: theme.textMain}}>
                          <option value="">+ Aus Gegner-CRM laden...</option>
                          {gegnerListe.map(g => {
                            let ansList = [];
                            try {
                              const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen;
                              if (Array.isArray(parsed)) ansList = parsed;
                            } catch(e){}
                            
                            if (ansList.length > 0) {
                              return ansList.map((ans, idx) => (
                                <option key={`${g.id}-${idx}`} value={`${g.id}|${idx}`}>
                                  {g.name} — {ans.abteilung ? `${ans.abteilung}: ` : ''}{ans.name || 'Zentrale'}
                                </option>
                              ));
                            }
                            return <option key={g.id} value={`${g.id}|0`}>{g.name}</option>;
                          })}
                        </select>
                      )}
                    </div>
                  </div>
                  <div><label style={labelStyle}>Behörde / Gegner*</label><input type="text" value={gegnerName} onChange={(e) => setGegnerName(e.target.value)} required style={inputStyle} /></div>
                  <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={gegnerAnsprechpartner} onChange={(e) => setGegnerAnsprechpartner(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Telefon</label><input type="text" value={gegnerTelefon} onChange={(e) => setGegnerTelefon(e.target.value)} style={inputStyle} /></div>
                  
                  {/* Wir lassen Fax/Mail im Eingabeformular zur Anlage stehen, syncen es aber mit den Versandfeldern unten */}
                  <div><label style={labelStyle}>Faxnummer</label><input type="text" value={gegnerFax} onChange={(e) => setGegnerFax(e.target.value)} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>E-Mail</label><input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} style={inputStyle} /></div>
                  
                  <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
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
                  <div><label style={labelStyle}>E-Mail (Mandant)</label><input type="email" value={unserEmail} onChange={(e) => setUnserEmail(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Telefon (Mandant)</label><input type="text" value={unserTelefon} onChange={(e) => setUnserTelefon(e.target.value)} style={inputStyle} /></div>
                  
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
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setzeWV(3)} style={quickBtnStyle}>+3T</button>
                  <button type="button" onClick={() => setzeWV(7)} style={quickBtnStyle}>+1W</button>
                  <button type="button" onClick={() => setzeWV(14)} style={quickBtnStyle}>+2W</button>
                  <button type="button" onClick={() => setzeWV(0, 1)} style={quickBtnStyle}>+1M</button>
                </div>
              </div>
            </div>

            {/* SCHREIBTEXT-EDITOR UND VERSAND-BUTTONS */}
            <div style={{ background: theme.inputBg, padding: '20px', border: `1px solid ${theme.border}`, borderRadius: '8px', marginTop: '25px', textAlign: 'left' }}>
              
              {/* IMMER SICHTBARE VERSAND-FELDER (AUCH BEI BESTEHENDEN AKTEN) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '15px', marginBottom: '20px', padding: '15px', background: theme.cardBg, borderRadius: '8px', border: `1px dashed ${theme.border}` }}>
                <div>
                  <label style={{...labelStyle, color: theme.textMain}}>Versand-E-Mail (Gegner)</label>
                  <input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} placeholder="z.B. poststelle@..." style={{...inputStyle, padding: '8px'}} />
                </div>
                <div>
                  <label style={{...labelStyle, color: theme.textMain}}>Versand-Faxnummer (Gegner)</label>
                  <input type="text" value={gegnerFax} onChange={(e) => setGegnerFax(e.target.value)} placeholder="z.B. 0351 123456" style={{...inputStyle, padding: '8px'}} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <label style={{...labelStyle, color: theme.accent, margin: 0}}>
                  <Icon name="file" size={16} /> Textentwurf / Schreiben verfassen
                </label>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => handleResendVersand('email')} style={{ background: theme.accent, color: isDarkMode ? '#000' : '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="send" size={14} /> E-Mail senden (Resend)
                  </button>
                  <button type="button" onClick={() => handleResendVersand('fax')} style={{ background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon name="phone" size={14} /> E-Fax senden (Simple-Fax)
                  </button>
                </div>
              </div>

              <textarea 
                value={briefEntwurf} 
                onChange={(e) => setBriefEntwurf(e.target.value)} 
                placeholder="Trage hier deinen Brief- oder E-Mail-Text ein..."
                style={{ ...inputStyle, minHeight: '180px', fontFamily: 'monospace', background: 'transparent' }} 
              />
              
              {/* --- ERFOLGSMELDUNG NACH DEM VERSAND (PDF WARTET) --- */}
              {versandPdfUrl && (
                <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', color: '#10b981', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="check" size={16} /> Versand-PDF generiert & verschickt! Vergiss nicht, unten auf "+ In Akte abheften" zu klicken.
                </div>
              )}

            </div>

            <button disabled={laedt} type="submit" style={{ padding: '15px', background: theme.accent, color: isDarkMode ? '#000' : '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '25px' }}>
              {laedt ? 'Speichere...' : '+ In Akte abheften'}
            </button>
          </form>

          {/* AKTEN UBERSICHT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '40px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ margin: '0', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
              <Icon name="cabinet" size={24} /> Akten-Übersicht
            </h2>
          </div>

          <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', textAlign: 'left', background: theme.cardBg }}>
            {gefilterteAkten.map((akte) => {
              const isExpanded = aufgeklappteAkten.includes(akte.id);
              const letzteAktion = akte.akten_historie && akte.akten_historie.length > 0 ? akte.akten_historie[0] : null;
              
              const istFokussiert = (fokussierteAkteId === akte.id);

              return (
                <div 
                  id={`akte-karte-${akte.id}`} 
                  key={akte.id} 
                  style={{ 
                    borderBottom: `1px solid ${theme.border}`,
                    background: istFokussiert ? (isDarkMode ? 'rgba(0, 229, 255, 0.12)' : '#e0f2fe') : 'transparent',
                    borderLeft: istFokussiert ? `6px solid ${theme.accent}` : '6px solid transparent',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', cursor: 'pointer', flexWrap: 'wrap', gap: '10px' }} onClick={() => toggleAkte(akte.id)}>
                    <div style={{ width: '30px', color: istFokussiert ? theme.accent : theme.textMuted }}><Icon name={isExpanded ? 'down' : 'right'} size={20} /></div>
                    <div style={{ flex: '1 1 min(100%, 200px)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>
                        {akte.gegner_name}
                        {akte.vorgaenger_gegner && <span style={{fontSize: '11px', color: theme.textMuted, marginLeft: '8px'}}>(vormals: {akte.vorgaenger_gegner})</span>}
                        {istFokussiert && <span style={{marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: theme.accent, color: '#000', fontWeight: 'bold'}}>🎯 AUSGEWÄHLT</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.textMuted }}>AZ: {akte.aktenzeichen || '-'}</div>
                    </div>
                    <div style={{ flex: '1 1 min(100%, 200px)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>{akte.thema}</div>
                      <div style={{ fontSize: '12px', color: theme.textMuted }}>Letzter Eintrag: {letzteAktion ? `${formatDatum(letzteAktion.datum)} - ${letzteAktion.aktion}` : '-'}</div>
                    </div>
                    <div style={{ flex: '1 1 100px', textAlign: 'right' }}>
                      {akte.status === 'Erledigt' ? <span style={{ background: theme.border, padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>Erledigt</span> : <span style={{ background: istFokussiert ? theme.accent : theme.border, color: istFokussiert ? '#000' : theme.textMain, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>Offen</span>}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ background: theme.inputBg, padding: '20px', borderTop: `1px solid ${theme.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.cardBg, padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${theme.border}`, flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ fontSize: '13px' }}>
                          <strong>Aktuelle Behörde / Gegner:</strong> {akte.gegner_name}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          
                          <button 
                            onClick={() => toggleAkteStatus(akte.id, akte.status)} 
                            style={{ 
                              background: akte.status === 'Erledigt' ? 'transparent' : '#10b981', 
                              color: akte.status === 'Erledigt' ? theme.textMain : '#ffffff', 
                              border: akte.status === 'Erledigt' ? `1px solid ${theme.border}` : 'none', 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              cursor: 'pointer', 
                              fontSize: '12px', 
                              fontWeight: 'bold', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px' 
                            }}
                          >
                            <Icon name={akte.status === 'Erledigt' ? 'refresh' : 'check'} size={14} /> 
                            {akte.status === 'Erledigt' ? 'Akte wieder öffnen' : 'Akte abschließen'}
                          </button>

                          <button 
                            onClick={() => loescheAkte(akte.id)} 
                            style={{ 
                              background: 'transparent', 
                              color: theme.warningBorder, 
                              border: `1px solid ${theme.warningBorder}`, 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              cursor: 'pointer', 
                              fontSize: '12px', 
                              fontWeight: 'bold', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px' 
                            }}
                          >
                            <Icon name="trash" size={14} /> Akte löschen
                          </button>

                          <button onClick={() => druckeAkte(akte)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon name="print" size={14} /> Akte exportieren / drucken
                          </button>

                          {mergeSourceId === akte.id ? (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <select 
                                value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)} 
                                style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', width: '220px' }}
                              >
                                <option value="">-- Ziel-Akte wählen --</option>
                                {akten.filter(a => a.id !== akte.id).map(a => (
                                  <option key={a.id} value={a.id}>[#{a.id.substring(0,6).toUpperCase()}] {a.gegner_name} | {a.thema}</option>
                                ))}
                              </select>
                              <button onClick={() => mergeAkte(akte.id)} style={{ background: theme.accent, color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Merge bestätigen</button>
                              <button onClick={() => { setMergeSourceId(null); setMergeTargetId(''); }} style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Abbrechen</button>
                            </div>
                          ) : (
                            <button onClick={() => setMergeSourceId(akte.id)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Icon name="link" size={14} /> Akte zusammenführen (Merge)
                            </button>
                          )}

                          {transferAkteId === akte.id ? (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                      </div>

                      <div style={{ overflowX: 'auto', width: '100%', borderRadius: '8px' }}>
                        <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '13px', background: theme.cardBg, overflow: 'hidden' }}>
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
                            {akte.akten_historie.map((hist) => (
                              <tr key={hist.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{hist.typ}</td>
                                <td style={{ padding: '10px' }}>{formatDatum(hist.datum)}</td>
                                <td style={{ padding: '10px' }}>{hist.aktion}</td>
                                <td style={{ padding: '10px', color: theme.warningBorder }}>
                                  {hist.wiedervorlage ? `WV: ${formatDatum(hist.wiedervorlage)}` : (hist.frist_extern ? `Frist: ${formatDatum(hist.frist_extern)}` : '-')}
                                </td>
                                <td style={{ padding: '10px' }}>
                                  {hist.dokument_url && hist.dokument_url.split(',').map((url, idx) => {
                                    const fileName = extractFilename(url);
                                    return (
                                      <div key={idx} onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'stretch', background: theme.border, borderRadius: '6px', marginRight: '6px', marginBottom: '6px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', color: theme.textMain, background: 'rgba(0,0,0,0.1)' }} title={fileName}>
                                          <Icon name="file" size={12} /> {fileName.length > 18 ? fileName.substring(0, 15) + '...' : fileName}
                                        </a>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); loescheDateiAusHistorie(hist.id, hist.dokument_url, url); }} style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 6px', cursor: 'pointer', color: theme.textMuted }} title="Datei löschen">
                                          <Icon name="x" size={12} />
                                        </button>
                                      </div>
                                    )
                                  })}
                                  
                                  {uploadingHistId === hist.id ? (
                                    <span style={{ fontSize: '11px', color: theme.accent }}>⏳ Upload...</span>
                                  ) : (
                                    <label style={{ cursor: 'pointer', fontSize: '11px', background: 'transparent', padding: '2px 6px', borderRadius: '4px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', color: theme.textMuted, marginLeft: '4px' }} title="Datei nachträglich an diesen Vorgang anhängen">
                                      + Datei
                                      <input 
                                        type="file" 
                                        style={{ display: 'none' }} 
                                        onChange={(e) => handleNachtragUploadAkte(hist.id, hist.dokument_url, akte.unsere_firma, akte.gegner_name, e)} 
                                      />
                                    </label>
                                  )}
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
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
        )}

        {/* ======================================================== */}
        {/* ============= 🧠 KI WISSENSSPEICHER (LOKALER MD UPLOAD) ======= */}
        {/* ======================================================== */}
        {activeTab === 'wissen' && (
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
               <h3 style={{ margin: '0', color: theme.textMain, textAlign: 'left' }}>📚 Indizierte Dokumente ({gefilterteWissenEintraege.length})</h3>
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
            
            {/* --- FILTER & SUCHLEISTE --- */}
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

            {/* --- TABELLEN-ANSICHT --- */}
            <div style={{ borderRadius: '8px', border: `1px solid ${theme.border}`, overflowX: 'auto', background: theme.cardBg }}>
              <table style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: theme.border, color: theme.textMain }}>
                    <th style={{ padding: '12px 15px' }}>Dokument / Datei</th>
                    <th style={{ padding: '12px 15px' }}>Zugeordnete Firma</th>
                    <th style={{ padding: '12px 15px', textAlign: 'center', width: '80px' }}>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {gefilterteWissenEintraege.length > 0 ? (
                    gefilterteWissenEintraege.map(w => (
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
                        Keine Dokumente für diese Filterung gefunden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* ============= FIRMEN TRESOR ============= */}
        {/* ========================================= */}
        {activeTab === 'tresor' && (
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
                <button type="submit" style={{ padding: '14px', background: theme.tresorAccent, color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', flex: '1 1 auto' }}>
                  {editMandantId ? '💾 Änderungen speichern' : '+ Mandant im Tresor ablegen'}
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
        )}

        {/* ========================================= */}
        {/* ============= GEGNER CRM =============== */}
        {/* ========================================= */}
        {activeTab === 'gegner' && (
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
                <button type="submit" style={{ padding: '12px', background: theme.gegnerAccent, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: '1 1 auto' }}>
                  {editGegnerId ? '💾 Änderungen der Behörde speichern' : '+ Behörde / Gegner im CRM speichern'}
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
        )}

      </div>
    </div>
  )
}