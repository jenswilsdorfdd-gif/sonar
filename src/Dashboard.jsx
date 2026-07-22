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
  const [activeTab, setActiveTab] = useState('akten') // 'akten' oder 'tresor'
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
  
  const [datei, setDatei] = useState(null)
  const [briefEntwurf, setBriefEntwurf] = useState('')
  const [jsonImport, setJsonImport] = useState('')
  const [kiLaedt, setKiLaedt] = useState(false)

  const [aufgeklappteAkten, setAufgeklappteAkten] = useState([])
  const [zeigeErledigte, setZeigeErledigte] = useState(false)

  // --- TRESOR (MANDANTEN) STATES ---
  const [mandanten, setMandanten] = useState([])
  
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

  // --- DATEN LADEN ---
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
    setActiveTab('akten') // Springt automatisch ins Cockpit
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

  const handleDateiAuswahlKI = async (e) => {
    setActiveTab('akten') // Springt automatisch ins Cockpit
    const file = e.target.files[0]
    if (!file) return
    setDatei(file)
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) return;
    setKiLaedt(true)
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = async () => {
      const base64String = reader.result.split(',')[1]
      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: base64String, mimeType: file.type })
        })
        if (res.ok) {
          const obj = await res.json()
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
        }
      } catch (err) { }
      setKiLaedt(false)
    }
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
    let dokumentUrl = null

    if (datei) {
      const sichererDateiname = datei.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const dateiName = `${Date.now()}_${sichererDateiname}` 
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, datei)
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName)
        dokumentUrl = linkData.publicUrl
      }
    }

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
      setDatei(null); setBriefEntwurf(''); setJsonImport('');
      if (document.getElementById('datei-upload')) document.getElementById('datei-upload').value = '';
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

  // Auto-Fill aus dem Tresor
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

  // --- TRESOR LOGIK ---
  const speichereMandant = async (e) => {
    e.preventDefault()
    setLaedt(true)
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
      dauerfrist: m_dauerfrist
    }])

    if (!error) {
      setM_firmenname(''); setM_ansprechpartner(''); setM_adresse('');
      setM_telefon(''); setM_email(''); setM_steuernummer('');
      setM_ust_id(''); setM_betriebsnummer(''); setM_vbg_nummer('');
      setM_handelsregister(''); setM_iban(''); setM_bank_name('');
      ladeDaten()
    }
    setLaedt(false)
  }

  const loescheMandant = async (id) => {
    if(!window.confirm("Firma aus Tresor löschen?")) return
    await supabase.from('mandanten').delete().eq('id', id)
    ladeDaten()
  }

  // --- FRISTEN & UST BERECHNUNG ---
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
            let alarmStufe = '🟡 1. Erinnerung';
            let farbe = '#f39c12';
            if (tage <= 4 && tage > 2) { alarmStufe = '🟠 2. Erinnerung'; farbe = '#d35400'; }
            if (tage <= 2) { alarmStufe = '🔴 ALARM'; farbe = '#c0392b'; }
            fristenWarnungen.push({ ...hist, akte_thema: akte.thema, akte_gegner: akte.gegner_name, tageUebrig: tage, alarmStufe, farbe })
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
    
    let nextFristDate = null;
    let bezeichnung = "";

    if (m.ust_intervall === 'Monatlich') {
      const shift = m.dauerfrist ? 2 : 1; 
      let targetMonth = actMonth + shift; 
      let targetYear = actYear;
      if (targetMonth > 11) { targetMonth -= 12; targetYear++; }
      nextFristDate = new Date(targetYear, targetMonth, 10);
      bezeichnung = `USt (Monat ${targetMonth === 0 ? 12 : targetMonth})`;
      
      if (heuteDate.getDate() <= 10) {
         let currentShift = m.dauerfrist ? 1 : 0;
         let checkM = actMonth + currentShift;
         let checkY = actYear;
         if (checkM > 11) { checkM -= 12; checkY++; }
         nextFristDate = new Date(checkY, checkM, 10);
         bezeichnung = `USt-Voranmeldung`;
      }
    } 
    else if (m.ust_intervall === 'Vierteljährlich') {
      const fälligkeitsMonate = m.dauerfrist ? [4, 7, 10, 1] : [3, 6, 9, 0]; 
      let foundFrist = null;
      for (let i = 0; i < 4; i++) {
        let testMonth = fälligkeitsMonate[i];
        let testYear = actYear;
        if (m.dauerfrist && testMonth === 1) testYear++; 
        if (!m.dauerfrist && testMonth === 0) testYear++; 
        
        let testDate = new Date(testYear, testMonth, 10);
        if (testDate >= heuteDate || (testDate.getMonth() === actMonth && heuteDate.getDate() <= 10)) {
           foundFrist = testDate;
           bezeichnung = `USt-Voranmeldung (Quartal ${i+1})`;
           break;
        }
      }
      nextFristDate = foundFrist;
    }

    if (nextFristDate) {
      const tage = berechneTageBis(nextFristDate.toISOString().split('T')[0]);
      if (tage !== null && tage <= 14) { 
         ustRadar.push({
           firma: m.firmenname,
           bezeichnung: bezeichnung,
           datum: nextFristDate.toISOString().split('T')[0],
           tageUebrig: tage
         });
      }
    }
  });
  ustRadar.sort((a,b) => a.tageUebrig - b.tageUebrig);


  const gefilterteAkten = akten.filter((akte) => zeigeErledigte ? true : akte.status !== 'Erledigt')
  const formatDatum = (datum) => datum ? new Date(datum).toLocaleDateString('de-DE') : '-'

  const inputStyle = { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #dcdde1', borderRadius: '4px', fontSize: '14px', backgroundColor: '#fbfbfb' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#2f3640', marginBottom: '5px' };
  const h4Style = { margin: '0', color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '8px' };

  return (
    <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h1 style={{ margin: '0 0 20px 0', color: '#2c3e50', textAlign: 'center' }}>📡 Sonar-Cockpit</h1>

      {/* ========================================= */}
      {/* GLOBALER HEADER (Magic Import + Grid)     */}
      {/* ========================================= */}
      
      {/* 1. MAGIC IMPORT (Volle Breite) */}
      <div style={{ background: '#fcf3cf', padding: '15px', borderRadius: '8px', border: '2px solid #f1c40f', marginBottom: '20px', textAlign: 'left' }}>
        <label style={{...labelStyle, color: '#d35400', fontSize: '14px'}}>✨ Magic Import: JSON-Datensatz hier einfügen</label>
        <textarea 
          value={jsonImport} 
          onChange={handleJsonImport} 
          placeholder='{"typ": "Eingang", "aktenzeichen": "...", "thema": "..."}'
          style={{ width: '100%', boxSizing: 'border-box', height: '80px', marginTop: '5px', fontFamily: 'monospace', padding: '10px', border: '1px solid #f39c12', borderRadius: '4px' }} 
        />
      </div>

      {/* 2. DAS 2x2 GRID (Links Uploads, Rechts Navigation) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
        
        {/* LINKE SPALTE (1a und 1b untereinander) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minWidth: '300px' }}>
          <div style={{ background: '#f5f6fa', padding: '15px', borderRadius: '8px', border: '2px dashed #bdc3c7' }}>
            <label style={{...labelStyle, color: '#2c3e50'}}>1a. Klassischer Upload (PDF/Scan) 📎</label>
            <input id="datei-upload-manuell" type="file" onChange={(e) => { setDatei(e.target.files[0]); setActiveTab('akten'); }} style={{...inputStyle, padding: '7px', backgroundColor: '#fff', border: 'none'}} />
          </div>
          <div style={{ background: '#e1f5fe', padding: '15px', borderRadius: '8px', border: '2px dashed #0288d1' }}>
            <label style={{...labelStyle, color: '#0277bd'}}>1b. Direkte KI-Analyse 🪄</label>
            <input id="datei-upload" type="file" onChange={handleDateiAuswahlKI} style={{...inputStyle, padding: '7px', backgroundColor: '#fff', border: 'none'}} />
            {kiLaedt && <div style={{ color: '#0277bd', fontWeight: 'bold', marginTop: '5px', fontSize: '12px', textAlign: 'left' }}>⏳ KI liest...</div>}
          </div>
        </div>

        {/* RECHTE SPALTE (Die Tab-Buttons untereinander) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, minWidth: '300px' }}>
          <button 
            onClick={() => setActiveTab('akten')} 
            style={{ flex: 1, padding: '15px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'akten' ? '#2980b9' : '#ecf0f1', color: activeTab === 'akten' ? '#fff' : '#7f8c8d', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🗄️ Akten-Cockpit
          </button>
          <button 
            onClick={() => setActiveTab('tresor')} 
            style={{ flex: 1, padding: '15px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === 'tresor' ? '#8e44ad' : '#ecf0f1', color: activeTab === 'tresor' ? '#fff' : '#7f8c8d', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🏢 Firmen-Tresor
          </button>
        </div>

      </div>

      {/* ========================================= */}
      {/* ============= AKTEN COCKPIT ============= */}
      {/* ========================================= */}
      
      {activeTab === 'akten' && (
      <>
        {/* --- USt RADAR BOX --- */}
        {ustRadar.length > 0 && (
          <div style={{ background: '#e8f4f8', borderLeft: '5px solid #3498db', padding: '15px', marginBottom: '20px', borderRadius: '4px' }}>
            <h4 style={{ color: '#2980b9', margin: '0 0 10px 0', textAlign: 'left' }}>⚡ USt-Radar (Kommende Fälligkeiten)</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', textAlign: 'left', color: '#2c3e50' }}>
              {ustRadar.map((r, i) => (
                <li key={i} style={{ marginBottom: '5px' }}>
                  <strong>{r.firma}</strong>: {r.bezeichnung} am {formatDatum(r.datum)} 
                  <span style={{ color: r.tageUebrig <= 3 ? '#c0392b' : '#d35400', fontWeight: 'bold', marginLeft: '10px' }}>
                    (Noch {r.tageUebrig} Tage)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={speichereEintrag} style={{ background: '#fdfdfd', padding: '20px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '30px' }}>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px', textAlign: 'left' }}>
            <label style={{ fontWeight: 'bold', cursor: 'pointer' }}>
              <input type="radio" checked={modus === 'neu'} onChange={() => setModus('neu')} style={{marginRight: '8px'}}/>
              📁 Neue Akte anlegen
            </label>
            <label style={{ fontWeight: 'bold', cursor: 'pointer', color: selectedAkteId ? '#27ae60' : 'inherit' }}>
              <input type="radio" checked={modus === 'bestehend'} onChange={() => setModus('bestehend')} style={{marginRight: '8px'}}/>
              🔗 Zu bestehender Akte hinzufügen {selectedAkteId && '(Match!)'}
            </label>
          </div>

          {modus === 'bestehend' && (
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={labelStyle}>Ziel-Akte auswählen*</label>
              <select value={selectedAkteId} onChange={(e) => setSelectedAkteId(e.target.value)} required style={inputStyle}>
                <option value="">-- Bitte wählen --</option>
                {akten.map(a => <option key={a.id} value={a.id}>{a.gegner_name} | {a.thema} (AZ: {a.aktenzeichen || '-'})</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px' }}>
            
            {modus === 'neu' && (
              <>
                <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '5px' }}>
                  <h4 style={h4Style}>1. Gegenpartei</h4>
                </div>
                <div><label style={labelStyle}>Name (Behörde/Firma)*</label><input type="text" value={gegnerName} onChange={(e) => setGegnerName(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={gegnerAnsprechpartner} onChange={(e) => setGegnerAnsprechpartner(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Telefon</label><input type="text" value={gegnerTelefon} onChange={(e) => setGegnerTelefon(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>E-Mail</label><input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} style={inputStyle} /></div>
                
                <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '15px' }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #ecf0f1', paddingBottom: '8px'}}>
                    <h4 style={{margin: 0, color: '#2c3e50'}}>2. Wir</h4>
                    {/* AUTO FILL AUS TRESOR */}
                    {mandanten.length > 0 && (
                      <select onChange={handleTresorAuswahl} style={{padding: '4px 8px', borderRadius: '4px', border: '1px solid #bdc3c7', fontSize: '12px', background: '#f8fdf9'}}>
                        <option value="">+ Aus Tresor laden...</option>
                        {mandanten.map(m => <option key={m.id} value={m.id}>{m.firmenname}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div><label style={labelStyle}>Unsere Firma / Person*</label><input type="text" value={unsereFirma} onChange={(e) => setUnsereFirma(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Unser Ansprechpartner</label><input type="text" value={unserAnsprechpartner} onChange={(e) => setUnserAnsprechpartner(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Telefon</label><input type="text" value={unserTelefon} onChange={(e) => setUnserTelefon(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>E-Mail</label><input type="email" value={unserEmail} onChange={(e) => setUnserEmail(e.target.value)} style={inputStyle} /></div>
                
                <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '15px' }}>
                  <h4 style={h4Style}>3. Akten-Stammdaten</h4>
                </div>
                <div><label style={labelStyle}>Bescheid / Thema*</label><input type="text" value={thema} onChange={(e) => setThema(e.target.value)} required style={inputStyle} /></div>
                <div><label style={labelStyle}>Aktenzeichen</label><input type="text" value={aktenzeichen} onChange={(e) => setAktenzeichen(e.target.value)} style={inputStyle} /></div>
              </>
            )}

            <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '15px' }}>
              <h4 style={{ ...h4Style, color: '#7f8c8d' }}>Details zum aktuellen Dokument / Schritt</h4>
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
            <div><label style={labelStyle}>Kanal (Versand/Empfang)</label><input type="text" value={kanal} onChange={(e) => setKanal(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Frist (Behörde)</label><input type="date" value={fristExtern} onChange={(e) => setFristExtern(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Wiedervorlage (Intern)</label><input type="date" value={wiedervorlage} onChange={(e) => setWiedervorlage(e.target.value)} style={inputStyle} /></div>
          </div>

          {briefEntwurf && (
            <div style={{ background: '#f9f9f9', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '20px', textAlign: 'left' }}>
              <label style={labelStyle}>📄 Text / Analyse / Entwurf</label>
              <textarea value={briefEntwurf} onChange={(e) => setBriefEntwurf(e.target.value)} style={{ ...inputStyle, minHeight: '150px', fontFamily: 'monospace' }} />
            </div>
          )}

          <button disabled={laedt || kiLaedt} type="submit" style={{ padding: '12px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '20px' }}>
            {laedt ? 'Speichere...' : '+ In Akte abheften'}
          </button>
        </form>

        {fristenWarnungen.length > 0 && (
          <div style={{ background: '#fff5f5', borderLeft: '5px solid #c0392b', padding: '15px', marginBottom: '20px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h4 style={{ color: '#c0392b', margin: '0 0 10px 0', textAlign: 'left' }}>🚨 Dringende Fristen & Alarme</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', textAlign: 'left' }}>
              {fristenWarnungen.map(w => (
                <li key={`warn-${w.id}`} style={{ marginBottom: '8px' }}>
                  <span style={{ color: w.farbe, fontWeight: 'bold', marginRight: '10px' }}>{w.alarmStufe}</span>
                  <strong>{w.akte_gegner} ({w.akte_thema})</strong> - Frist: {formatDatum(w.frist_extern)} 
                  <span style={{ color: w.farbe, fontWeight: 'bold', marginLeft: '10px' }}>
                    {w.tageUebrig < 0 ? `(Bereits ${Math.abs(w.tageUebrig)} Tage überfällig!)` : w.tageUebrig === 0 ? '(Verfristet HEUTE!)' : `(Noch ${w.tageUebrig} Tage)` }
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: '0' }}>🗄️ Deine Akten</h2>
          <button onClick={() => setZeigeErledigte(!zeigeErledigte)} style={{ padding: '8px 15px', background: zeigeErledigte ? '#34495e' : '#ecf0f1', color: zeigeErledigte ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {zeigeErledigte ? '🙈 Erledigte ausblenden' : '👁️ Erledigte einblenden'}
          </button>
        </div>

        <div style={{ borderRadius: '8px', border: '1px solid #bdc3c7', overflow: 'hidden', textAlign: 'left' }}>
          {gefilterteAkten.length === 0 && <div style={{padding: '20px', color: '#7f8c8d'}}>Keine Akten gefunden.</div>}
          
          {gefilterteAkten.map((akte) => {
            const isExpanded = aufgeklappteAkten.includes(akte.id);
            const bgColor = akte.status === 'Erledigt' ? '#f8fdf9' : '#fff';
            const letzteAktion = akte.akten_historie && akte.akten_historie.length > 0 ? akte.akten_historie[akte.akten_historie.length - 1] : null;
            const offeneFristen = akte.akten_historie ? akte.akten_historie.filter(h => h.frist_extern).sort((a,b) => new Date(a.frist_extern) - new Date(b.frist_extern)) : [];
            const naechsteFrist = offeneFristen.length > 0 ? offeneFristen[0].frist_extern : null;

            return (
              <div key={akte.id} style={{ borderBottom: '1px solid #ecf0f1', background: bgColor }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '15px', cursor: 'pointer' }} onClick={() => toggleAkte(akte.id)}>
                  <div style={{ fontSize: '20px', width: '30px', color: '#3498db' }}>{isExpanded ? '🔽' : '▶️'}</div>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c3e50' }}>{akte.gegner_name || 'Keine Gegenpartei'}</div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>👤 {akte.gegner_ansprechpartner || '-'}</div>
                  </div>
                  <div style={{ flex: 3 }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c3e50' }}>{akte.thema}</div>
                    <div style={{ fontSize: '12px', color: '#7f8c8d' }}>Aktion: {letzteAktion ? `${formatDatum(letzteAktion.datum)} - ${letzteAktion.aktion || ''}` : '-'}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                    {akte.status === 'Erledigt' ? <span style={{ background: '#2ecc71', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Erledigt</span> : <span style={{ background: '#e74c3c', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Offen</span>}
                    {naechsteFrist && akte.status !== 'Erledigt' && <span style={{ fontSize: '11px', color: '#e74c3c', fontWeight: 'bold' }}>Frist: {formatDatum(naechsteFrist)}</span>}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ background: '#fafbfc', padding: '15px 20px 20px 45px', borderTop: '1px dashed #bdc3c7' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#34495e' }}>Verlauf & Dokumente</h4>
                        <p style={{ margin: '0', fontSize: '12px', color: '#7f8c8d' }}>Mandant: {akte.unsere_firma} | AZ: {akte.aktenzeichen}</p>
                      </div>
                      <div>
                        {akte.status !== 'Erledigt' ? 
                          <button onClick={(e) => { e.stopPropagation(); setzeAkteErledigt(akte.id, true) }} style={{ padding: '4px 8px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '8px' }}>✔️ Akte schließen</button>
                          :
                          <button onClick={(e) => { e.stopPropagation(); setzeAkteErledigt(akte.id, false) }} style={{ padding: '4px 8px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '8px' }}>🔄 Wiedereröffnen</button>
                        }
                        <button onClick={(e) => { e.stopPropagation(); loescheAkte(akte.id) }} style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️ Löschen</button>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <thead>
                        <tr style={{ background: '#ecf0f1', color: '#333' }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Typ</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Datum</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Aktion & Kanal</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Frist</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>WV</th>
                          <th style={{ padding: '8px', textAlign: 'left', minWidth: '150px' }}>Dokumente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {akte.akten_historie.map((hist) => (
                          <tr key={hist.id} style={{ borderBottom: '1px solid #f5f6fa' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: hist.typ === 'Eingang' ? '#e67e22' : (hist.typ === 'Ausgang' ? '#2980b9' : '#7f8c8d') }}>
                              {hist.typ === 'Eingang' && '📥 Eingang'}{hist.typ === 'Ausgang' && '📤 Ausgang'}{hist.typ === 'Intern' && '📝 Intern'}
                            </td>
                            <td style={{ padding: '8px' }}>{formatDatum(hist.datum)}</td>
                            <td style={{ padding: '8px' }}>{hist.aktion} <br/><span style={{fontSize: '11px', color: '#7f8c8d'}}>{hist.kanal}</span></td>
                            <td style={{ padding: '8px', color: '#c0392b', fontWeight: 'bold' }}>{formatDatum(hist.frist_extern)}</td>
                            <td style={{ padding: '8px' }}>{formatDatum(hist.wiedervorlage)}</td>
                            <td style={{ padding: '8px' }}>
                              {hist.dokument_url && hist.dokument_url.split(',').map((url, idx) => {
                                const fileName = extractFilename(url);
                                return (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginRight: '6px', display: 'inline-block', marginBottom: '4px', background: '#ecf0f1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#2c3e50', border: '1px solid #bdc3c7' }} title={fileName}>
                                    📄 {fileName.length > 25 ? fileName.substring(0, 22) + '...' : fileName}
                                  </a>
                                )
                              })}
                              {uploadingHistId === hist.id ? (
                                <span style={{ fontSize: '11px', color: '#3498db' }}>⏳...</span>
                              ) : (
                                <label style={{ cursor: 'pointer', fontSize: '11px', background: '#fff', padding: '2px 8px', borderRadius: '4px', border: '1px dashed #bdc3c7', display: 'inline-block', marginBottom: '4px', color: '#7f8c8d' }}>
                                  + Datei
                                  <input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUpload(hist.id, hist.dokument_url, e)} />
                                </label>
                              )}
                              {hist.brief_entwurf && (
                                <details style={{ cursor: 'pointer', marginTop: '4px' }}>
                                  <summary style={{ color: '#2980b9', fontWeight: 'bold' }}>Text / Info</summary>
                                  <div style={{ padding: '10px', background: '#f9f9f9', border: '1px solid #eee', marginTop: '5px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '11px', maxHeight: '150px', overflowY: 'auto' }}>
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
        <h2 style={{ margin: '0 0 20px 0', color: '#8e44ad', textAlign: 'left' }}>🏢 Neuer Mandant / Firma anlegen</h2>
        <form onSubmit={speichereMandant} style={{ background: '#fbfbfb', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '30px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', textAlign: 'left' }}>
            <div style={{ gridColumn: '1 / -1' }}><h4 style={h4Style}>1. Allgemeine Kontaktdaten</h4></div>
            <div><label style={labelStyle}>Firmenname / Person*</label><input required value={m_firmenname} onChange={e=>setM_firmenname(e.target.value)} style={inputStyle}/></div>
            <div><label style={labelStyle}>Ansprechpartner (GF)</label><input value={m_ansprechpartner} onChange={e=>setM_ansprechpartner(e.target.value)} style={inputStyle}/></div>
            <div><label style={labelStyle}>Adresse</label><input value={m_adresse} onChange={e=>setM_adresse(e.target.value)} style={inputStyle}/></div>
            <div><label style={labelStyle}>Telefon</label><input value={m_telefon} onChange={e=>setM_telefon(e.target.value)} style={inputStyle}/></div>
            <div><label style={labelStyle}>E-Mail</label><input value={m_email} onChange={e=>setM_email(e.target.value)} style={inputStyle}/></div>

            <div style={{ gridColumn: '1 / -1', marginTop: '15px' }}><h4 style={h4Style}>2. Wichtige Nummern</h4></div>
            <div><label style={labelStyle}>Steuernummer</label><input value={m_steuernummer} onChange={e=>setM_steuernummer(e.target.value)} style={inputStyle}/></div>
            <div><label style={labelStyle}>USt-IdNr.</label><input value={m_ust_id} onChange={e=>setM_ust_id(e.target.value)} style={inputStyle}/></div>
            <div><label style={labelStyle}>Betriebsnummer</label><input value={m_betriebsnummer} onChange={e=>setM_betriebsnummer(e.target.value)} style={inputStyle}/></div>
            <div><label style={labelStyle}>VBG-Nummer</label><input value={m_vbg_nummer} onChange={e=>setM_vbg_nummer(e.target.value)} style={inputStyle}/></div>
            <div><label style={labelStyle}>Handelsregister</label><input value={m_handelsregister} onChange={e=>setM_handelsregister(e.target.value)} style={inputStyle}/></div>
            
            <div style={{ gridColumn: '1 / -1', marginTop: '15px' }}><h4 style={h4Style}>3. Bank & Steuer-Setup</h4></div>
            <div><label style={labelStyle}>IBAN</label><input value={m_iban} onChange={e=>setM_iban(e.target.value)} style={inputStyle}/></div>
            <div><label style={labelStyle}>Bank</label><input value={m_bank_name} onChange={e=>setM_bank_name(e.target.value)} style={inputStyle}/></div>
            
            <div style={{ background: '#f5f6fa', padding: '10px', borderRadius: '4px', border: '1px dashed #bdc3c7' }}>
              <label style={labelStyle}>USt-Voranmeldung (Intervall)</label>
              <select value={m_ust_intervall} onChange={e=>setM_ust_intervall(e.target.value)} style={{...inputStyle, background: '#fff'}}>
                <option value="Monatlich">Monatlich</option>
                <option value="Vierteljährlich">Vierteljährlich</option>
                <option value="Jährlich">Jährlich (Keine VA)</option>
              </select>
            </div>
            
            <div style={{ background: '#f5f6fa', padding: '10px', borderRadius: '4px', border: '1px dashed #bdc3c7', display: 'flex', alignItems: 'center' }}>
              <label style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: '#2c3e50', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={m_dauerfrist} onChange={e=>setM_dauerfrist(e.target.checked)} style={{ transform: 'scale(1.2)' }}/>
                Dauerfristverlängerung (DFV) erteilt
              </label>
            </div>
          </div>
          
          <button disabled={laedt} type="submit" style={{ padding: '12px', background: '#8e44ad', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '20px' }}>
            {laedt ? 'Speichere...' : '+ Im Tresor ablegen'}
          </button>
        </form>

        <h2 style={{ margin: '0 0 20px 0', color: '#2c3e50', textAlign: 'left' }}>🗃️ Deine gespeicherten Firmen</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', textAlign: 'left' }}>
          {mandanten.map(m => (
            <div key={m.id} style={{ background: '#fff', border: '1px solid #ecf0f1', borderRadius: '8px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative' }}>
              <button onClick={() => loescheMandant(m.id)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer' }} title="Löschen">🗑️</button>
              
              <h3 style={{ margin: '0 0 10px 0', color: '#2980b9' }}>{m.firmenname}</h3>
              <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#7f8c8d' }}>👤 {m.ansprechpartner || '-'} | 📞 {m.telefon || '-'} | ✉️ {m.email || '-'}</p>
              
              <div style={{ fontSize: '12px', color: '#34495e', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><strong>Steuer-Nr:</strong><br/>{m.steuernummer || '-'}</div>
                <div><strong>USt-Id:</strong><br/>{m.ust_id || '-'}</div>
                <div><strong>VBG:</strong><br/>{m.vbg_nummer || '-'}</div>
                <div><strong>Betriebs-Nr:</strong><br/>{m.betriebsnummer || '-'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Bank:</strong> {m.iban ? `${m.iban} (${m.bank_name})` : '-'}</div>
                <div style={{ gridColumn: '1 / -1', marginTop: '5px', padding: '5px', background: '#f5f6fa', borderRadius: '4px' }}>
                  <strong>USt-Radar:</strong> {m.ust_intervall} {m.dauerfrist ? '(mit DFV)' : ''}
                </div>
              </div>
            </div>
          ))}
          {mandanten.length === 0 && <div style={{ color: '#7f8c8d' }}>Noch keine Firmen im Tresor.</div>}
        </div>
      </div>
      )}

    </div>
  )
}