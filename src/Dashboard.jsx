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
  
  // NEU: Array für den Multi-Upload im Cockpit
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
  // NEU: Array für den Multi-Upload im Tresor
  const [m_dateien, setM_dateien] = useState([])

  // --- DESIGN THEME (Light & Dark nach farbschema.jpg) ---
  const theme = isDarkMode ? {
    bg: '#020617', // Tiefstes Nachtblau (fast schwarz)
    cardBg: '#0f172a', // Leicht abgehobenes Panel-Blau
    border: '#1e293b', // Subtile Rahmen
    textMain: '#ffffff', // Klares Weiß
    textMuted: '#94a3b8',
    
    // Akten-Cockpit: Leuchtendes Cyan
    accent: '#00e5ff', 
    accentHover: '#00b8cc',
    
    // Firmen-Tresor: Leuchtendes Mint/Teal (kein lila/braun mehr!)
    tresorAccent: '#2dd4bf', 
    tresorBg: 'rgba(45, 212, 191, 0.1)',
    
    inputBg: '#020617',
    inputBorder: '#334155',
    
    // Warnungen: Ausschließlich Magenta/Rot
    warningBg: 'rgba(244, 63, 94, 0.1)', 
    warningBorder: '#f43f5e', 
    warningText: '#fda4af',
    
    // Hinweise (Magic Import): Hellgelb transparent
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
    tresorAccent: '#0d9488', 
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

  // --- ICON KOMPONENTE (Macht alle Emojis streng monochrom Weiß/Schwarz) ---
  const Icon = ({ symbol }) => (
    <span style={{ filter: isDarkMode ? 'brightness(0) invert(1)' : 'grayscale(1) brightness(0)' }}>
      {symbol}
    </span>
  );

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
    
    // NEU: Multi-Upload Logik für Akten
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
      setDatei([]); setBriefEntwurf(''); setJsonImport('');
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

  const speichereMandant = async (e) => {
    e.preventDefault()
    setLaedt(true)
    
    // NEU: Multi-Upload Logik für Tresor
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
  const inputStyle = { width: '100%', padding: '12px', boxSizing: 'border-box', border: `1px solid ${theme.inputBorder}`, borderRadius: '6px', fontSize: '14px', backgroundColor: theme.inputBg, color: theme.textMain, transition: '0.2s', outline: 'none' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const h4StyleAkten = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const h4StyleTresor = { margin: '0', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', fontSize: '16px', fontWeight: '600' };
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: isDarkMode ? '0 10px 25px -5px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgba(0,0,0,0.1)', padding: '20px', marginBottom: '20px' };

  return (
    <div style={{ minHeight: '100vh', padding: '30px', background: theme.bg, color: theme.textMain, transition: 'all 0.3s ease', fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* HEADER & THEME TOGGLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: theme.textMain, fontSize: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon symbol="📡" /> Sonar-Cockpit
        </h1>
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)} 
          style={{ background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <Icon symbol={isDarkMode ? '☀️' : '🌙'} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* DYNAMISCHER SONAR GUIDE */}
      <div style={{ ...panelStyle, background: theme.hintBg, border: `1px solid ${theme.hintBorder}`, color: theme.hintText, display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '24px' }}><Icon symbol="💡" /></div>
        <div style={{ textAlign: 'left' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: theme.hintText }}>Sonar Guide: {activeTab === 'akten' ? 'Der Workflow' : 'Firmen & Dokumente verwalten'}</h4>
          {activeTab === 'akten' ? (
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              1. Dokument in deinem <strong>Gemini Gem</strong> hochladen. <br/>
              2. <strong>JSON 1 (Eingang)</strong> hier unten in den Magic Import einfügen. <br/>
              3. Entwurf im Gem freigeben & verschicken. <br/>
              4. <strong>JSON 2 (Ausgang)</strong> in den Magic Import einfügen und PDF anhängen. Fertig!
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
              1. <strong>Stammdaten:</strong> Lege hier deine Firmen, UGs oder Einzelunternehmen zentral an.<br/>
              2. <strong>Dokumente:</strong> Hänge essenzielle Papiere (HR-Auszug, Gewerbeanmeldung) direkt an das Firmenprofil (beliebig viele).<br/>
              3. <strong>DFV & Radar:</strong> Setze den Haken bei Dauerfristverlängerung, damit das USt-Radar deine Fristen im Akten-Cockpit korrekt berechnet!
            </p>
          )}
        </div>
      </div>

      {/* 2x2 GRID (Upload, Magic Import & Navigation) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
        
        {/* LINKS: MAGIC IMPORT & UPLOAD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minWidth: '300px' }}>
          
          <div style={{ ...panelStyle, marginBottom: 0, background: theme.hintBg, border: `1px dashed ${theme.hintBorder}` }}>
            <label style={{...labelStyle, color: theme.hintText, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Icon symbol="✨" /> Magic Import (JSON)
            </label>
            <textarea 
              value={jsonImport} onChange={handleJsonImport} 
              placeholder='{"typ": "Eingang", "aktenzeichen": "...", "thema": "..."}'
              style={{ ...inputStyle, background: 'rgba(0,0,0,0.1)', border: `1px solid ${theme.hintBorder}`, color: theme.hintText, height: '80px', fontFamily: 'monospace', fontSize: '14px', marginTop: '5px' }} 
            />
          </div>

          <div style={{ ...panelStyle, marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '8px'}}>
               <Icon symbol="📎" /> Manueller Upload (PDF/Scan)
            </label>
            <input 
              id="datei-upload-manuell" 
              type="file" 
              multiple 
              onChange={(e) => { setDateien(Array.from(e.target.files)); setActiveTab('akten'); }} 
              style={{...inputStyle, border: `1px dashed ${theme.accent}`, cursor: 'pointer', padding: '10px'}} 
            />
            {dateien.length > 0 && <span style={{fontSize: '13px', color: theme.accent, marginTop: '8px'}}>Gewählt: {dateien.length} Datei(en)</span>}
            <small style={{ color: theme.textMuted, marginTop: '8px', display: 'block' }}>Für 1 bis 10 Dokumente, die du an die Akte hängen willst.</small>
          </div>

        </div>

        {/* RECHTS: TABS */}
        <div style={{ display: 'flex', gap: '15px', flex: 1, minWidth: '300px' }}>
          <button 
            onClick={() => setActiveTab('akten')} 
            style={{ flex: 1, padding: '20px', fontSize: '16px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'akten' ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: activeTab === 'akten' ? (isDarkMode ? 'rgba(0, 229, 255, 0.05)' : theme.accent) : theme.cardBg, color: activeTab === 'akten' ? (isDarkMode ? theme.accent : '#fff') : theme.textMuted, transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}><Icon symbol="🗄️" /></span> Akten-Cockpit
          </button>
          <button 
            onClick={() => setActiveTab('tresor')} 
            style={{ flex: 1, padding: '20px', fontSize: '16px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'tresor' ? `2px solid ${theme.tresorAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: activeTab === 'tresor' ? theme.tresorBg : theme.cardBg, color: activeTab === 'tresor' ? (isDarkMode ? theme.tresorAccent : '#fff') : theme.textMuted, transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}><Icon symbol="🏢" /></span> Firmen-Tresor
          </button>
        </div>
      </div>

      {/* ========================================= */}
      {/* ============= AKTEN COCKPIT ============= */}
      {/* ========================================= */}
      
      {activeTab === 'akten' && (
      <>
        {/* WARNUNGEN & FRISTEN */}
        {(ustRadar.length > 0 || fristenWarnungen.length > 0) && (
          <div style={{ ...panelStyle, background: theme.warningBg, border: `1px solid ${theme.warningBorder}` }}>
            <h4 style={{ color: theme.warningText, margin: '0 0 15px 0', textAlign: 'left', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon symbol="🚨" /> Dringende Alarme & Fristen
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

        <form onSubmit={speichereEintrag} style={panelStyle}>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px', textAlign: 'left' }}>
            <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'neu' ? theme.accent : theme.textMuted }}>
              <input type="radio" checked={modus === 'neu'} onChange={() => setModus('neu')} style={{marginRight: '8px'}}/>
              <Icon symbol="📁" /> Neue Akte anlegen
            </label>
            <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'bestehend' ? theme.accent : theme.textMuted }}>
              <input type="radio" checked={modus === 'bestehend'} onChange={() => setModus('bestehend')} style={{marginRight: '8px'}}/>
              <Icon symbol="🔗" /> Zu bestehender Akte {selectedAkteId && '(Match!)'}
            </label>
          </div>

          {modus === 'bestehend' && (
            <div style={{ marginBottom: '25px', textAlign: 'left' }}>
              <label style={labelStyle}>Ziel-Akte auswählen*</label>
              <select value={selectedAkteId} onChange={(e) => setSelectedAkteId(e.target.value)} required style={inputStyle}>
                <option value="">-- Bitte wählen --</option>
                {akten.map(a => <option key={a.id} value={a.id}>{a.gegner_name} | {a.thema} (AZ: {a.aktenzeichen || '-'})</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            
            {modus === 'neu' && (
              <>
                <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}><h4 style={h4StyleAkten}>1. Gegenpartei</h4></div>
                <div><label style={labelStyle}>Name (Behörde)*</label><input type="text" value={gegnerName} onChange={(e) => setGegnerName(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={gegnerAnsprechpartner} onChange={(e) => setGegnerAnsprechpartner(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Telefon</label><input type="text" value={gegnerTelefon} onChange={(e) => setGegnerTelefon(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>E-Mail</label><input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} style={inputStyle} /></div>
                
                <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '20px' }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px'}}>
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
              <select value={typ} onChange={(e) => setTyp(e.target.value)} style={inputStyle}>
                <option value="Eingang">📥 Eingang</option>
                <option value="Ausgang">📤 Ausgang</option>
                <option value="Intern">📝 Intern</option>
              </select>
            </div>
            <div><label style={labelStyle}>Datum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Aktion</label><input type="text" value={aktion} onChange={(e) => setAktion(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Kanal</label><input type="text" value={kanal} onChange={(e) => setKanal(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Frist (Behörde)</label><input type="date" value={fristExtern} onChange={(e) => setFristExtern(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>WV (Intern)</label><input type="date" value={wiedervorlage} onChange={(e) => setWiedervorlage(e.target.value)} style={inputStyle} /></div>
          </div>

          {briefEntwurf && (
            <div style={{ background: theme.inputBg, padding: '20px', border: `1px solid ${theme.border}`, borderRadius: '8px', marginTop: '30px', textAlign: 'left' }}>
              <label style={{...labelStyle, color: theme.accent}}><Icon symbol="📄" /> KI Analyse / Textentwurf</label>
              <textarea value={briefEntwurf} onChange={(e) => setBriefEntwurf(e.target.value)} style={{ ...inputStyle, minHeight: '180px', fontFamily: 'monospace', border: 'none', background: 'transparent', padding: 0, marginTop: '10px' }} />
            </div>
          )}

          <button disabled={laedt} type="submit" style={{ padding: '15px', background: theme.accent, color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '30px', transition: '0.2s', boxShadow: isDarkMode ? `0 0 15px ${theme.accent}40` : 'none' }}>
            {laedt ? 'Speichere...' : '+ In Akte abheften'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '40px' }}>
          <h2 style={{ margin: '0', color: theme.textMain }}><Icon symbol="🗄️" /> Deine Akten</h2>
          <button onClick={() => setZeigeErledigte(!zeigeErledigte)} style={{ padding: '10px 20px', background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            <Icon symbol={zeigeErledigte ? '🙈' : '👁️'} /> {zeigeErledigte ? 'Erledigte ausblenden' : 'Erledigte einblenden'}
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
                <div style={{ display: 'flex', alignItems: 'center', padding: '20px', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => toggleAkte(akte.id)}>
                  <div style={{ fontSize: '20px', width: '40px', color: theme.accent, textAlign: 'center' }}>
                    <Icon symbol={isExpanded ? '🔽' : '▶️'} />
                  </div>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>{akte.gegner_name || 'Keine Gegenpartei'}</div>
                    <div style={{ fontSize: '13px', color: theme.textMuted, marginTop: '4px' }}>
                      <Icon symbol="👤" /> {akte.gegner_ansprechpartner || '-'}
                    </div>
                  </div>
                  <div style={{ flex: 3 }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.textMain }}>{akte.thema}</div>
                    <div style={{ fontSize: '13px', color: theme.textMuted, marginTop: '4px' }}>Letzte Aktion: {letzteAktion ? `${formatDatum(letzteAktion.datum)} - ${letzteAktion.aktion || ''}` : '-'}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {akte.status === 'Erledigt' ? <span style={{ background: theme.border, color: theme.textMain, padding: '4px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 'bold' }}>Erledigt</span> : <span style={{ background: theme.accent, color: '#000', padding: '4px 12px', borderRadius: '30px', fontSize: '11px', fontWeight: 'bold' }}>Offen</span>}
                    {naechsteFrist && akte.status !== 'Erledigt' && <span style={{ fontSize: '12px', color: theme.warningBorder, fontWeight: 'bold' }}>Frist: {formatDatum(naechsteFrist)}</span>}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ background: theme.inputBg, padding: '20px 20px 20px 60px', borderTop: `1px solid ${theme.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: theme.accent }}>Verlauf & Dokumente</h4>
                        <p style={{ margin: '0', fontSize: '13px', color: theme.textMuted }}>Mandant: {akte.unsere_firma} | AZ: {akte.aktenzeichen}</p>
                      </div>
                      <div style={{display: 'flex', gap: '10px'}}>
                        {akte.status !== 'Erledigt' ? 
                          <button onClick={(e) => { e.stopPropagation(); setzeAkteErledigt(akte.id, true) }} style={{ padding: '6px 12px', background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}><Icon symbol="✔️" /> Schließen</button>
                          :
                          <button onClick={(e) => { e.stopPropagation(); setzeAkteErledigt(akte.id, false) }} style={{ padding: '6px 12px', background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}><Icon symbol="🔄" /> Wiedereröffnen</button>
                        }
                        <button onClick={(e) => { e.stopPropagation(); loescheAkte(akte.id) }} style={{ padding: '6px 12px', background: 'transparent', color: theme.warningBorder, border: `1px solid ${theme.warningBorder}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}><Icon symbol="🗑️" /> Löschen</button>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', background: theme.cardBg, borderRadius: '8px', overflow: 'hidden' }}>
                      <thead>
                        <tr style={{ background: theme.border, color: theme.textMain }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Typ</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Datum</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Aktion</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Frist</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Dokumente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {akte.akten_historie.map((hist) => (
                          <tr key={hist.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: hist.typ === 'Eingang' ? theme.hintBorder : (hist.typ === 'Ausgang' ? theme.accent : theme.textMuted) }}>
                              {hist.typ === 'Eingang' && <Icon symbol="📥"/>} {hist.typ === 'Ausgang' && <Icon symbol="📤"/>} {hist.typ === 'Intern' && <Icon symbol="📝"/>} {hist.typ}
                            </td>
                            <td style={{ padding: '12px' }}>{formatDatum(hist.datum)}</td>
                            <td style={{ padding: '12px' }}>{hist.aktion} <br/><span style={{fontSize: '12px', color: theme.textMuted}}>{hist.kanal}</span></td>
                            <td style={{ padding: '12px', color: theme.warningBorder, fontWeight: 'bold' }}>{formatDatum(hist.frist_extern)}</td>
                            <td style={{ padding: '12px' }}>
                              {hist.dokument_url && hist.dokument_url.split(',').map((url, idx) => {
                                const fileName = extractFilename(url);
                                return (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginRight: '8px', display: 'inline-block', marginBottom: '6px', background: theme.border, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: theme.textMain }} title={fileName}>
                                    <Icon symbol="📄" /> {fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName}
                                  </a>
                                )
                              })}
                              {uploadingHistId === hist.id ? (
                                <span style={{ fontSize: '12px', color: theme.accent }}>⏳...</span>
                              ) : (
                                <label style={{ cursor: 'pointer', fontSize: '12px', background: 'transparent', padding: '4px 10px', borderRadius: '6px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', marginBottom: '6px', color: theme.textMuted }}>
                                  + Datei
                                  <input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUpload(hist.id, hist.dokument_url, e)} />
                                </label>
                              )}
                              {hist.brief_entwurf && (
                                <details style={{ cursor: 'pointer', marginTop: '8px' }}>
                                  <summary style={{ color: theme.accent, fontWeight: 'bold', fontSize: '13px', outline: 'none' }}>Analyse / Text</summary>
                                  <div style={{ padding: '12px', background: theme.bg, border: `1px solid ${theme.border}`, marginTop: '8px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px', maxHeight: '200px', overflowY: 'auto', borderRadius: '6px' }}>
                                    {hist.brief_entwurf}
                                  </div>
                                </details>
                              )}
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
        <h2 style={{ margin: '0 0 20px 0', color: theme.textMain, textAlign: 'left' }}><Icon symbol="🏢" /> Neuer Mandant / Firma</h2>
        <form onSubmit={speichereMandant} style={panelStyle}>
          
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
                 <Icon symbol="📎" /> Stammdokumente (HR-Auszug, Gewerbeanmeldung...)
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
          
          <button disabled={laedt} type="submit" style={{ padding: '15px', background: theme.tresorAccent, color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '30px', transition: '0.2s', boxShadow: isDarkMode ? `0 0 15px ${theme.tresorAccent}40` : 'none' }}>
            {laedt ? 'Speichere...' : '+ Im Tresor ablegen'}
          </button>
        </form>

        <h2 style={{ margin: '40px 0 20px 0', color: theme.textMain, textAlign: 'left' }}>🗃️ Gespeicherte Firmen</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', textAlign: 'left' }}>
          {mandanten.map(m => (
            <div key={m.id} style={{ ...panelStyle, position: 'relative', marginBottom: 0 }}>
              <button onClick={() => loescheMandant(m.id)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', fontSize: '18px' }} title="Löschen"><Icon symbol="🗑️" /></button>
              
              <h3 style={{ margin: '0 0 10px 0', color: theme.tresorAccent, fontSize: '20px' }}>{m.firmenname}</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: theme.textMuted }}><Icon symbol="👤" /> {m.ansprechpartner || '-'} <br/> <Icon symbol="📞" /> {m.telefon || '-'} | <Icon symbol="✉️" /> {m.email || '-'}</p>
              
              <div style={{ fontSize: '13px', color: theme.textMain, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginRight: '8px', display: 'inline-block', marginBottom: '6px', background: theme.border, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: theme.textMain }} title={fileName}>
                        <Icon symbol="📄" /> {fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName}
                      </a>
                    )
                  })}
                  
                  {uploadingMandantId === m.id ? (
                    <span style={{ fontSize: '12px', color: theme.tresorAccent }}>⏳ Upload...</span>
                  ) : (
                    <label style={{ cursor: 'pointer', fontSize: '12px', background: 'transparent', padding: '4px 10px', borderRadius: '6px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', marginBottom: '6px', color: theme.textMuted }}>
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
  )
}