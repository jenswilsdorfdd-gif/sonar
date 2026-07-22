import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Dashboard({ session }) {
  const [akten, setAkten] = useState([])
  const [laedt, setLaedt] = useState(false)
  const [uploadingHistId, setUploadingHistId] = useState(null) // Neu: Zeigt Lade-Spinner in der Tabelle
  
  // --- FORMULAR STATE ---
  const [modus, setModus] = useState('neu') 
  const [selectedAkteId, setSelectedAkteId] = useState('')
  
  // Akten-Stammdaten
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
  
  // Historien-Daten
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

  const ladeDaten = async () => {
    const { data, error } = await supabase
      .from('akten')
      .select(`*, akten_historie (*)`)
      .order('created_at', { ascending: false })

    if (!error && data) {
      data.forEach(akte => {
        if(akte.akten_historie) {
          akte.akten_historie.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        }
      })
      setAkten(data)
    }
  }

  useEffect(() => { ladeDaten() }, [])

  // --- MAGIC JSON IMPORT ---
  const handleJsonImport = (e) => {
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

  // --- KI UPLOAD (1b) ---
  const handleDateiAuswahlKI = async (e) => {
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

  // --- NACHTRÄGLICHER UPLOAD IN DER HISTORIE ---
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
      // Kombiniert alte Links mit dem neuen (Kommagetrennt)
      const updatedUrls = currentUrls ? `${currentUrls},${newUrl}` : newUrl;

      const { error } = await supabase.from('akten_historie').update({ dokument_url: updatedUrls }).eq('id', histId);
      if (!error) {
        ladeDaten();
      } else {
        alert("Fehler in der Datenbank: " + error.message);
      }
    } else {
      alert("Fehler beim Datei-Upload: " + uploadError.message);
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
    } else {
      alert("Fehler Historie: " + histError.message)
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

  const setzeAkteErledigt = async (id, isErledigt) => {
    const status = isErledigt ? 'Erledigt' : 'Offen'
    const datum = isErledigt ? new Date().toISOString().split('T')[0] : null
    await supabase.from('akten').update({ status: status, erledigt_am: datum }).eq('id', id)
    ladeDaten()
  }

  const loescheAkte = async (id) => {
    if(!window.confirm("Ganze Akte inkl. aller Briefe löschen?")) return
    await supabase.from('akten').delete().eq('id', id)
    ladeDaten()
  }

  const berechneTageBisFrist = (datum) => {
    if (!datum) return null;
    const heute = new Date(); heute.setHours(0, 0, 0, 0);
    const frist = new Date(datum); frist.setHours(0, 0, 0, 0);
    return Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
  };

  const fristenWarnungen = [];
  akten.filter(a => a.status !== 'Erledigt').forEach(akte => {
    if(akte.akten_historie) {
      akte.akten_historie.forEach(hist => {
        if(hist.frist_extern) {
          const tage = berechneTageBisFrist(hist.frist_extern);
          if (tage !== null && tage <= 7) { 
            let alarmStufe = '🟡 1. Erinnerung';
            let farbe = '#f39c12';
            if (tage <= 4 && tage > 2) { alarmStufe = '🟠 2. Erinnerung'; farbe = '#d35400'; }
            if (tage <= 2) { alarmStufe = '🔴 ALARM'; farbe = '#c0392b'; }

            fristenWarnungen.push({ 
              ...hist, 
              akte_thema: akte.thema, 
              akte_gegner: akte.gegner_name, 
              tageUebrig: tage,
              alarmStufe: alarmStufe,
              farbe: farbe
            })
          }
        }
      })
    }
  });
  fristenWarnungen.sort((a, b) => a.tageUebrig - b.tageUebrig);

  const gefilterteAkten = akten.filter((akte) => zeigeErledigte ? true : akte.status !== 'Erledigt')
  const formatDatum = (datum) => datum ? new Date(datum).toLocaleDateString('de-DE') : '-'

  const inputStyle = { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #dcdde1', borderRadius: '4px', fontSize: '14px', backgroundColor: '#fbfbfb' };
  const labelStyle = { display: 'block', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#2f3640', marginBottom: '5px' };

  return (
    <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h1 style={{ margin: '0 0 30px 0', color: '#2c3e50', textAlign: 'center' }}>📡 Sonar-Cockpit (Akten-System)</h1>

      <div style={{ background: '#fcf3cf', padding: '15px', borderRadius: '8px', border: '2px solid #f1c40f', marginBottom: '20px', textAlign: 'left' }}>
        <label style={{...labelStyle, color: '#d35400', fontSize: '14px'}}>✨ Magic Import: Gemini-Datensatz hier einfügen</label>
        <textarea 
          value={jsonImport} 
          onChange={handleJsonImport} 
          placeholder='{"aktenzeichen": "...", "thema": "...", "kontakt": "..."}'
          style={{ width: '100%', boxSizing: 'border-box', height: '80px', marginTop: '5px', fontFamily: 'monospace', padding: '10px', border: '1px solid #f39c12', borderRadius: '4px' }} 
        />
        <small style={{color: '#d35400'}}>Fügt sich automatisch ein & checkt, ob das Aktenzeichen schon existiert!</small>
      </div>

      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div style={{ flex: 1, background: '#f5f6fa', padding: '15px', borderRadius: '8px', border: '2px dashed #bdc3c7', minWidth: '250px' }}>
          <label style={{...labelStyle, color: '#2c3e50'}}>1a. Klassischer Upload (PDF/Scan) 📎</label>
          <input id="datei-upload-manuell" type="file" onChange={(e) => setDatei(e.target.files[0])} style={{...inputStyle, padding: '7px', backgroundColor: '#fff', border: 'none'}} />
        </div>
        <div style={{ flex: 1, background: '#e1f5fe', padding: '15px', borderRadius: '8px', border: '2px dashed #0288d1', minWidth: '250px' }}>
          <label style={{...labelStyle, color: '#0277bd'}}>1b. Direkte KI-Analyse 🪄</label>
          <input id="datei-upload" type="file" onChange={handleDateiAuswahlKI} style={{...inputStyle, padding: '7px', backgroundColor: '#fff', border: 'none'}} />
          {kiLaedt && <div style={{ color: '#0277bd', fontWeight: 'bold', marginTop: '5px', fontSize: '12px', textAlign: 'left' }}>⏳ KI liest...</div>}
        </div>
      </div>

      <form onSubmit={speichereEintrag} style={{ background: '#fdfdfd', padding: '20px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '30px' }}>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '15px', textAlign: 'left' }}>
          <label style={{ fontWeight: 'bold', cursor: 'pointer' }}>
            <input type="radio" checked={modus === 'neu'} onChange={() => setModus('neu')} style={{marginRight: '8px'}}/>
            📁 Neue Akte anlegen
          </label>
          <label style={{ fontWeight: 'bold', cursor: 'pointer', color: selectedAkteId ? '#27ae60' : 'inherit' }}>
            <input type="radio" checked={modus === 'bestehend'} onChange={() => setModus('bestehend')} style={{marginRight: '8px'}}/>
            🔗 Zu bestehender Akte hinzufügen {selectedAkteId && '(Match gefunden!)'}
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
                <h4 style={{ margin: '0', color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '8px' }}>1. Gegenpartei</h4>
              </div>
              <div><label style={labelStyle}>Name (Behörde/Firma)*</label><input type="text" value={gegnerName} onChange={(e) => setGegnerName(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={gegnerAnsprechpartner} onChange={(e) => setGegnerAnsprechpartner(e.target.value)} placeholder="Z.B. Herr Müller" style={inputStyle} /></div>
              <div><label style={labelStyle}>Telefon</label><input type="text" value={gegnerTelefon} onChange={(e) => setGegnerTelefon(e.target.value)} placeholder="0351..." style={inputStyle} /></div>
              <div><label style={labelStyle}>E-Mail</label><input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} placeholder="mail@..." style={inputStyle} /></div>
              
              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '15px' }}>
                <h4 style={{ margin: '0', color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '8px' }}>2. Wir</h4>
              </div>
              <div><label style={labelStyle}>Unsere Firma / Person*</label><input type="text" value={unsereFirma} onChange={(e) => setUnsereFirma(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Unser Ansprechpartner</label><input type="text" value={unserAnsprechpartner} onChange={(e) => setUnserAnsprechpartner(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>Telefon</label><input type="text" value={unserTelefon} onChange={(e) => setUnserTelefon(e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>E-Mail</label><input type="email" value={unserEmail} onChange={(e) => setUnserEmail(e.target.value)} style={inputStyle} /></div>
              
              <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '15px' }}>
                <h4 style={{ margin: '0', color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '8px' }}>3. Akten-Stammdaten</h4>
              </div>
              <div><label style={labelStyle}>Bescheid / Thema*</label><input type="text" value={thema} onChange={(e) => setThema(e.target.value)} required style={inputStyle} /></div>
              <div><label style={labelStyle}>Aktenzeichen</label><input type="text" value={aktenzeichen} onChange={(e) => setAktenzeichen(e.target.value)} style={inputStyle} /></div>
            </>
          )}

          <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '15px' }}>
            <h4 style={{ margin: '0', color: '#7f8c8d', borderBottom: '2px solid #ecf0f1', paddingBottom: '8px' }}>Details zum aktuellen Dokument / Schritt</h4>
          </div>

          <div>
            <label style={labelStyle}>Typ*</label>
            <select value={typ} onChange={(e) => setTyp(e.target.value)} style={inputStyle}>
              <option value="Eingang">📥 Eingang (Post bekommen)</option>
              <option value="Ausgang">📤 Ausgang (Post verschickt)</option>
              <option value="Intern">📝 Intern (Notiz / WV)</option>
            </select>
          </div>
          <div><label style={labelStyle}>Datum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={inputStyle} /></div>
          
          <div><label style={labelStyle}>Aktion</label><input type="text" value={aktion} onChange={(e) => setAktion(e.target.value)} placeholder="z.B. Einspruch eingelegt" style={inputStyle} /></div>
          <div><label style={labelStyle}>Kanal (Versand/Empfang)</label><input type="text" value={kanal} onChange={(e) => setKanal(e.target.value)} placeholder="z.B. ELSTER, E-Mail, Post" style={inputStyle} /></div>
          
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
              
              <div style={{ display: 'flex', alignItems: 'center', padding: '15px', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => toggleAkte(akte.id)} onMouseOver={(e) => e.currentTarget.style.background = '#f1f2f6'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: '20px', width: '30px', color: '#3498db' }}>
                  {isExpanded ? '🔽' : '▶️'}
                </div>
                
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c3e50' }}>{akte.gegner_name || 'Keine Gegenpartei'}</div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>👤 {akte.gegner_ansprechpartner || '-'} {akte.gegner_telefon && `📞 ${akte.gegner_telefon}`}</div>
                </div>
                
                <div style={{ flex: 3 }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#2c3e50' }}>{akte.thema}</div>
                  <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                    Letzte Aktion: {letzteAktion ? `${formatDatum(letzteAktion.datum)} (${letzteAktion.typ}) - ${letzteAktion.aktion || ''}` : '-'}
                  </div>
                </div>

                <div style={{ flex: 1, textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                  {akte.status === 'Erledigt' ? (
                    <span style={{ background: '#2ecc71', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Erledigt</span>
                  ) : (
                    <span style={{ background: '#e74c3c', color: '#fff', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Offen</span>
                  )}
                  {naechsteFrist && akte.status !== 'Erledigt' && (
                    <span style={{ fontSize: '11px', color: '#e74c3c', fontWeight: 'bold' }}>Frist: {formatDatum(naechsteFrist)}</span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={{ background: '#fafbfc', padding: '15px 20px 20px 45px', borderTop: '1px dashed #bdc3c7' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', color: '#34495e' }}>Verlauf & Dokumente</h4>
                      <p style={{ margin: '0', fontSize: '12px', color: '#7f8c8d' }}>Mandant: {akte.unsere_firma} ({akte.unser_ansprechpartner}) | AZ: {akte.aktenzeichen}</p>
                    </div>
                    <div>
                      {akte.status !== 'Erledigt' ? 
                        <button onClick={(e) => { e.stopPropagation(); setzeAkteErledigt(akte.id, true) }} style={{ padding: '4px 8px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '8px' }}>✔️ Akte schließen</button>
                        :
                        <button onClick={(e) => { e.stopPropagation(); setzeAkteErledigt(akte.id, false) }} style={{ padding: '4px 8px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '8px' }}>🔄 Wiedereröffnen</button>
                      }
                      <button onClick={(e) => { e.stopPropagation(); loescheAkte(akte.id) }} style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🗑️ Akte löschen</button>
                    </div>
                  </div>

                  {(!akte.akten_historie || akte.akten_historie.length === 0) ? (
                    <p style={{fontSize: '13px', color: '#7f8c8d'}}>Noch keine Dokumente vorhanden.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <thead>
                        <tr style={{ background: '#ecf0f1', color: '#333' }}>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Typ</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Datum</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Aktion & Kanal</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Frist (Behörde)</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>WV (Intern)</th>
                          <th style={{ padding: '8px', textAlign: 'left', minWidth: '150px' }}>Dokumente / Text</th>
                        </tr>
                      </thead>
                      <tbody>
                        {akte.akten_historie.map((hist) => (
                          <tr key={hist.id} style={{ borderBottom: '1px solid #f5f6fa' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: hist.typ === 'Eingang' ? '#e67e22' : (hist.typ === 'Ausgang' ? '#2980b9' : '#7f8c8d') }}>
                              {hist.typ === 'Eingang' && '📥 Eingang'}
                              {hist.typ === 'Ausgang' && '📤 Ausgang'}
                              {hist.typ === 'Intern' && '📝 Intern'}
                            </td>
                            <td style={{ padding: '8px' }}>{formatDatum(hist.datum)}</td>
                            <td style={{ padding: '8px' }}>
                              {hist.aktion || '-'} <br/>
                              <span style={{fontSize: '11px', color: '#7f8c8d'}}>{hist.kanal}</span>
                            </td>
                            <td style={{ padding: '8px', color: '#c0392b', fontWeight: 'bold' }}>{formatDatum(hist.frist_extern)}</td>
                            <td style={{ padding: '8px' }}>{formatDatum(hist.wiedervorlage)}</td>
                            <td style={{ padding: '8px' }}>
                              
                              {/* DOKUMENTE ANZEIGEN (Kommagetrennt möglich) */}
                              {hist.dokument_url && hist.dokument_url.split(',').map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginRight: '10px', display: 'inline-block', marginBottom: '4px' }} title="Dokument öffnen">📄 Datei {idx + 1}</a>
                              ))}
                              
                              {/* NEU: NACHTRÄGLICHER UPLOAD BUTTON */}
                              {uploadingHistId === hist.id ? (
                                <span style={{ fontSize: '11px', color: '#3498db' }}>⏳ Upload...</span>
                              ) : (
                                <label style={{ cursor: 'pointer', fontSize: '11px', background: '#ecf0f1', padding: '2px 6px', borderRadius: '4px', border: '1px solid #bdc3c7', display: 'inline-block', marginBottom: '4px' }}>
                                  + Datei
                                  <input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUpload(hist.id, hist.dokument_url, e)} />
                                </label>
                              )}

                              {hist.brief_entwurf && (
                                <details style={{ cursor: 'pointer', marginTop: '4px' }}>
                                  <summary style={{ color: '#2980b9', fontWeight: 'bold' }}>Text anzeigen</summary>
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
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}