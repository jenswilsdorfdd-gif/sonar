import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function Dashboard({ session }) {
  const [aktenzeichen, setAktenzeichen] = useState('')
  const [kontakt, setKontakt] = useState('')
  const [person, setPerson] = useState('')
  const [thema, setThema] = useState('')
  const [eingangsdatum, setEingangsdatum] = useState('')
  const [aktion, setAktion] = useState('')
  const [kanal, setKanal] = useState('')
  const [fristExtern, setFristExtern] = useState('')
  const [wiedervorlage, setWiedervorlage] = useState('')
  const [ueberwachung, setUeberwachung] = useState('')
  const [status, setStatus] = useState('Offen')
  const [datei, setDatei] = useState(null)
  
  // --- NEUE KI-STATE-VARIABLEN ---
  const [briefEntwurf, setBriefEntwurf] = useState('')
  const [kiLaedt, setKiLaedt] = useState(false)

  const [vorgaenge, setVorgaenge] = useState([])
  const [laedt, setLaedt] = useState(false)
  const [zeigeErledigte, setZeigeErledigte] = useState(false)

  const [bearbeiteId, setBearbeiteId] = useState(null)
  const [editAktenzeichen, setEditAktenzeichen] = useState('')
  const [editKontakt, setEditKontakt] = useState('')
  const [editPerson, setEditPerson] = useState('')
  const [editThema, setEditThema] = useState('')
  const [editEingangsdatum, setEditEingangsdatum] = useState('')
  const [editAktion, setEditAktion] = useState('')
  const [editKanal, setEditKanal] = useState('')
  const [editFristExtern, setEditFristExtern] = useState('')
  const [editWiedervorlage, setEditWiedervorlage] = useState('')
  const [editUeberwachung, setEditUeberwachung] = useState('')
  const [editErledigtAm, setEditErledigtAm] = useState('')

  const ladeDaten = async () => {
    const { data, error } = await supabase
      .from('vorgaenge')
      .select('*')
      .order('frist_extern', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setVorgaenge(data)
    }
  }

  useEffect(() => {
    ladeDaten()
  }, [])

  // --- DIE NEUE KI-ANALYSE FUNKTION BEIM UPLOAD ---
  const handleDateiAuswahl = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setDatei(file)

    // Nur Bilder und PDFs können zur KI geschickt werden
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) return;

    setKiLaedt(true)

    // Datei in lesbaren Code (Base64) verwandeln
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
          const kiDaten = await res.json()
          
          // Formular wie von Geisterhand ausfüllen!
          if (kiDaten.aktenzeichen) setAktenzeichen(kiDaten.aktenzeichen)
          if (kiDaten.thema) setThema(kiDaten.thema)
          if (kiDaten.kontakt) setKontakt(kiDaten.kontakt)
          if (kiDaten.frist_extern) setFristExtern(kiDaten.frist_extern)
          if (kiDaten.brief_entwurf) setBriefEntwurf(kiDaten.brief_entwurf)
          
          // Eingangsdatum direkt auf heute setzen
          setEingangsdatum(new Date().toISOString().split('T')[0])
        }
      } catch (err) {
        console.error("KI-Fehler:", err)
      }
      setKiLaedt(false)
    }
  }

  const speichereEintrag = async (e) => {
    e.preventDefault()
    setLaedt(true)
    
    let dokumentUrl = null
    let antwortUrl = null // Unser neues Ausgangsdokument!

    // 1. Originaldatei (Eingang) hochladen
    if (datei) {
      const sichererDateiname = datei.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const dateiName = `${Date.now()}_${sichererDateiname}` 
      
      const { error: uploadError } = await supabase.storage
        .from('dokumente')
        .upload(dateiName, datei)

      if (!uploadError) {
        const { data: linkData } = supabase.storage
          .from('dokumente')
          .getPublicUrl(dateiName)
          
        dokumentUrl = linkData.publicUrl
      } else {
        alert("Fehler beim Upload des Originals: " + uploadError.message)
      }
    }

    // 2. KI-Antwortschreiben als Text-Datei speichern und hochladen!
    if (briefEntwurf) {
      const antwortName = `Antwortschreiben_${Date.now()}.txt`
      // Den Text aus dem Feld in eine echte Datei verwandeln
      const blob = new Blob([briefEntwurf], { type: "text/plain;charset=utf-8" })
      const { error: antwortUploadError } = await supabase.storage
        .from('dokumente')
        .upload(antwortName, blob)

      if (!antwortUploadError) {
        const { data: antwortLinkData } = supabase.storage
          .from('dokumente')
          .getPublicUrl(antwortName)
        antwortUrl = antwortLinkData.publicUrl
      } else {
        alert("Fehler beim Upload der Antwort: " + antwortUploadError.message)
      }
    }

    // Alles zusammen in die Datenbank eintragen
    const { error } = await supabase
      .from('vorgaenge')
      .insert([{ 
        user_id: session.user.id, 
        aktenzeichen: aktenzeichen || null,
        kontakt: kontakt || null,
        person: person || null,
        thema: thema || null,
        eingangsdatum: eingangsdatum || null,
        aktion: aktion || null,
        kanal: kanal || null,
        frist_extern: fristExtern || null,
        wiedervorlage: wiedervorlage || null,
        ueberwachung: ueberwachung || null,
        status: status, 
        dokument_url: dokumentUrl,
        antwort_url: antwortUrl // Hier fließt unser neues Feld rein!
      }])

    if (!error) {
      setAktenzeichen(''); setKontakt(''); setPerson(''); setThema('');
      setEingangsdatum(''); setAktion(''); setKanal(''); setFristExtern('');
      setWiedervorlage(''); setUeberwachung(''); setStatus('Offen'); setDatei(null);
      setBriefEntwurf(''); // Brief löschen
      document.getElementById('datei-upload').value = '';
      ladeDaten();
    } else {
      alert("Fehler beim Speichern in der Datenbank: " + error.message)
    }
    setLaedt(false)
  }

  const loescheEintrag = async (id) => {
    if (!window.confirm("Wirklich löschen?")) return 
    const { error } = await supabase.from('vorgaenge').delete().eq('id', id)
    if (!error) ladeDaten()
  }

  const aendereStatus = async (id, neuerStatus) => {
    let updateData = { status: neuerStatus }
    if (neuerStatus === 'Erledigt') {
      updateData.erledigt_am = new Date().toISOString().split('T')[0]
    } else {
      updateData.erledigt_am = null 
    }
    const { error } = await supabase.from('vorgaenge').update(updateData).eq('id', id)
    if (!error) ladeDaten() 
  }

  const erstelleFolgeaktion = async (vorgang) => {
    const heute = new Date().toISOString().split('T')[0]

    await supabase.from('vorgaenge').update({ 
      status: 'Erledigt', 
      erledigt_am: heute 
    }).eq('id', vorgang.id)

    const neuesWvDatum = new Date()
    neuesWvDatum.setDate(neuesWvDatum.getDate() + 28)
    const neuesWvDatumStr = neuesWvDatum.toISOString().split('T')[0]

    const { error } = await supabase.from('vorgaenge').insert([{
      user_id: session.user.id,
      aktenzeichen: vorgang.aktenzeichen,
      kontakt: vorgang.kontakt,
      person: vorgang.person,
      thema: vorgang.thema,
      aktion: 'Überwachung Eingang Antwort/Bescheid',
      kanal: 'Intern (Warten)',
      wiedervorlage: neuesWvDatumStr,
      status: 'Offen'
    }])

    if (!error) {
      ladeDaten()
    } else {
      alert("Fehler bei Folgeaktion: " + error.message)
    }
  }

  const startBearbeiten = (vorgang) => {
    setBearbeiteId(vorgang.id)
    setEditAktenzeichen(vorgang.aktenzeichen || '')
    setEditKontakt(vorgang.kontakt || '')
    setEditPerson(vorgang.person || '')
    setEditThema(vorgang.thema || '')
    setEditEingangsdatum(vorgang.eingangsdatum || '')
    setEditAktion(vorgang.aktion || '')
    setEditKanal(vorgang.kanal || '')
    setEditFristExtern(vorgang.frist_extern || '')
    setEditWiedervorlage(vorgang.wiedervorlage || '')
    setEditUeberwachung(vorgang.ueberwachung || '')
    setEditErledigtAm(vorgang.erledigt_am || '')
  }

  const abbrechenBearbeiten = () => setBearbeiteId(null)

  const speichereBearbeitung = async (id) => {
    const { error } = await supabase
      .from('vorgaenge')
      .update({ 
        aktenzeichen: editAktenzeichen || null,
        kontakt: editKontakt || null,
        person: editPerson || null,
        thema: editThema || null,
        eingangsdatum: editEingangsdatum || null,
        aktion: editAktion || null,
        kanal: editKanal || null,
        frist_extern: editFristExtern || null,
        wiedervorlage: editWiedervorlage || null,
        ueberwachung: editUeberwachung || null,
        erledigt_am: editErledigtAm || null
      })
      .eq('id', id)

    if (!error) {
      setBearbeiteId(null) 
      ladeDaten() 
    } else {
      alert("Fehler beim Speichern: " + error.message)
    }
  }

  const gefilterteVorgaenge = vorgaenge.filter((vorgang) => {
    if (zeigeErledigte) return true; 
    return vorgang.status !== 'Erledigt'; 
  })

  const formatDatum = (datum) => datum ? new Date(datum).toLocaleDateString('de-DE') : '-'

  const berechneTageBisFrist = (datum) => {
    if (!datum) return null;
    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    const frist = new Date(datum);
    frist.setHours(0, 0, 0, 0);
    const diffTime = frist - heute;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const fristenWarnungen = vorgaenge
    .filter(v => v.status !== 'Erledigt' && v.frist_extern)
    .map(v => ({ ...v, tageUebrig: berechneTageBisFrist(v.frist_extern) }))
    .filter(v => v.tageUebrig !== null && v.tageUebrig <= 3)
    .sort((a, b) => a.tageUebrig - b.tageUebrig);

  const setzeWiedervorlageTage = (tage) => {
    const datum = new Date();
    datum.setDate(datum.getDate() + tage);
    setWiedervorlage(datum.toISOString().split('T')[0]);
  };

  const inputStyle = { 
    width: '100%', 
    padding: '10px', 
    boxSizing: 'border-box', 
    border: '1px solid #dcdde1', 
    borderRadius: '4px', 
    fontSize: '14px',
    backgroundColor: '#fbfbfb'
  };
  
  const labelStyle = { 
    display: 'block', 
    textAlign: 'left',
    fontSize: '12px', 
    fontWeight: 'bold', 
    color: '#2f3640', 
    marginBottom: '5px' 
  };

  const quickBtnStyle = {
    background: '#3498db', 
    color: 'white', 
    border: 'none', 
    borderRadius: '3px', 
    padding: '2px 6px', 
    fontSize: '10px', 
    cursor: 'pointer',
    fontWeight: 'bold'
  };

  return (
    <div style={{ marginTop: '20px', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      
      {/* 1. Hauptüberschrift zentriert mit Antenne */}
      <h1 style={{ margin: '0 0 30px 0', color: '#2c3e50', textAlign: 'center' }}>📡 Sonar-Cockpit</h1>

      {/* VORDEFINIERTE LISTEN FÜR DIE DROPDOWNS */}
      <datalist id="firmen-list">
        <option value="SmartBizz Services UG (haftungsbeschränkt) | Wittenberger Str. 78 - 01309 Dresden" />
        <option value="Wilsdorf & Sommer GmbH | Wittenberger Str. 78 - 01309 Dresden" />
        <option value="Alexander & Jens Wilsdorf | Voglerstr. 28 - 01277 Dresden" />
      </datalist>

      <datalist id="bescheid-list">
        <option value="Umsatzsteuer-Jahresbescheid" />
        <option value="Umsatzsteuer-Vorauszahlungsbescheid" />
        <option value="Körperschaftsteuerbescheid" />
        <option value="Gewerbesteuermessbescheid (Finanzamt)" />
        <option value="Gewerbesteuerbescheid (Stadt/Kommune)" />
        <option value="Mahnung / Vollstreckungsankündigung" />
      </datalist>

      <datalist id="aktion-list">
        <option value="Einspruch eingelegt" />
        <option value="Widerspruch eingelegt" />
        <option value="Antrag auf Erlass gestellt" />
        <option value="Antrag auf Aussetzung der Vollziehung (AdV)" />
        <option value="Überwachung Eingang Antwort/Bescheid" />
      </datalist>

      <datalist id="versandart-list">
        <option value="ELSTER" />
        <option value="Telefax" />
        <option value="E-Mail" />
        <option value="Brief / Einschreiben" />
        <option value="Intern (Warten)" />
      </datalist>

      {/* 2. Neuer Vorgang und Ausloggen auf einer Höhe */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f5f6fa', paddingBottom: '10px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, textAlign: 'left' }}>📊 Neuer Vorgang</h2>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Ausloggen
        </button>
      </div>
      
      <form onSubmit={speichereEintrag} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px', alignItems: 'end' }}>
        
        {/* Datei Upload OBERHALB platziert, da es jetzt der Startpunkt ist! */}
        <div style={{ gridColumn: '1 / -1', background: '#e1f5fe', padding: '15px', borderRadius: '8px', border: '2px dashed #0288d1' }}>
          <label style={{...labelStyle, color: '#0277bd', fontSize: '14px'}}>1. Dokument anhängen & KI analysieren lassen 🪄</label>
          <input id="datei-upload" type="file" onChange={handleDateiAuswahl} style={{...inputStyle, padding: '7px', backgroundColor: '#fff', border: 'none'}} />
          {kiLaedt && <div style={{ color: '#0277bd', fontWeight: 'bold', marginTop: '10px' }}>⏳ KI liest das Dokument und verfasst eine Antwort... Bitte warten...</div>}
        </div>

        <div>
          <label style={labelStyle}>Aktenzeichen</label>
          <input type="text" value={aktenzeichen} onChange={(e) => setAktenzeichen(e.target.value)} style={inputStyle} />
        </div>
        
        <div>
          <label style={labelStyle}>Firma (Kontakt)*</label>
          <input type="text" value={kontakt} onChange={(e) => setKontakt(e.target.value)} list="firmen-list" required style={inputStyle} />
        </div>
        
        <div>
          <label style={labelStyle}>Person</label>
          <input type="text" value={person} onChange={(e) => setPerson(e.target.value)} style={inputStyle} />
        </div>
        
        <div>
          <label style={labelStyle}>Bescheid (Thema)*</label>
          <input type="text" value={thema} onChange={(e) => setThema(e.target.value)} list="bescheid-list" required style={inputStyle} />
        </div>
        
        <div>
          <label style={labelStyle}>Eingangsdatum</label>
          <input type="date" value={eingangsdatum} onChange={(e) => setEingangsdatum(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Aktion</label>
          <input type="text" value={aktion} onChange={(e) => setAktion(e.target.value)} list="aktion-list" style={inputStyle} />
        </div>
        
        <div>
          <label style={labelStyle}>Versandart (Kanal)</label>
          <input type="text" value={kanal} onChange={(e) => setKanal(e.target.value)} list="versandart-list" style={inputStyle} />
        </div>
        
        <div>
          <label style={labelStyle}>Frist Behörde</label>
          <input type="date" value={fristExtern} onChange={(e) => setFristExtern(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Wiedervorlage</span>
            <span style={{ display: 'flex', gap: '4px' }}>
              <button type="button" onClick={() => setzeWiedervorlageTage(14)} style={quickBtnStyle}>+2 Wo</button>
              <button type="button" onClick={() => setzeWiedervorlageTage(28)} style={quickBtnStyle}>+4 Wo</button>
              <button type="button" onClick={() => setzeWiedervorlageTage(30)} style={quickBtnStyle}>+1 Mo</button>
            </span>
          </label>
          <input type="date" value={wiedervorlage} onChange={(e) => setWiedervorlage(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Überwachung (Info für Wiedervorlage)</label>
          <input type="text" value={ueberwachung} onChange={(e) => setUeberwachung(e.target.value)} style={inputStyle} />
        </div>

        {/* NEU: Das Antwortschreiben-Vorschaufeld */}
        {briefEntwurf && (
          <div style={{ gridColumn: '1 / -1', background: '#f9f9f9', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '10px' }}>
            <label style={labelStyle}>📄 Generiertes Antwortschreiben (Du kannst den Text hier noch anpassen!)</label>
            <textarea 
              value={briefEntwurf} 
              onChange={(e) => setBriefEntwurf(e.target.value)} 
              style={{ ...inputStyle, minHeight: '180px', fontFamily: 'monospace', resize: 'vertical' }} 
            />
            <small style={{color: '#7f8c8d'}}>Wird beim Speichern automatisch als Datei hochgeladen.</small>
          </div>
        )}

        <button disabled={laedt || kiLaedt} type="submit" style={{ padding: '12px', background: (laedt || kiLaedt) ? '#95a5a6' : '#27ae60', color: '#fff', border: 'none', borderRadius: '6px', cursor: (laedt || kiLaedt) ? 'not-allowed' : 'pointer', fontWeight: 'bold', gridColumn: '1 / -1', fontSize: '16px', marginTop: '10px', transition: 'background 0.2s' }}>
          {laedt ? 'Speichere...' : '+ Vorgang speichern'}
        </button>
      </form>

      {fristenWarnungen.length > 0 && (
        <div style={{ background: '#ffefef', borderLeft: '5px solid #e74c3c', padding: '15px', marginBottom: '20px', borderRadius: '4px' }}>
          <h4 style={{ color: '#c0392b', margin: '0 0 10px 0', textAlign: 'left' }}>⚠️ Achtung: Dringende Fristen</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', textAlign: 'left' }}>
            {fristenWarnungen.map(w => (
              <li key={`warn-${w.id}`} style={{ marginBottom: '5px' }}>
                <strong>{w.kontakt} ({w.thema})</strong> - Frist: {formatDatum(w.frist_extern)} 
                <span style={{ color: '#e74c3c', fontWeight: 'bold', marginLeft: '10px' }}>
                  {w.tageUebrig < 0 ? `(Bereits ${Math.abs(w.tageUebrig)} Tage überfällig!)` : w.tageUebrig === 0 ? '(Verfristet HEUTE!)' : `(Verfristet in ${w.tageUebrig} Tag(en))` }
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>📋 Vorgänge</h2>
        <button onClick={() => setZeigeErledigte(!zeigeErledigte)} style={{ padding: '8px 15px', background: zeigeErledigte ? '#34495e' : '#ecf0f1', color: zeigeErledigte ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {zeigeErledigte ? '🙈 Erledigte ausblenden' : '👁️ Erledigte einblenden'}
        </button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #eee' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#2c3e50', color: 'white' }}>
              <th style={{ padding: '12px' }}>AZ</th>
              <th style={{ padding: '12px' }}>Firma</th>
              <th style={{ padding: '12px' }}>Person</th>
              <th style={{ padding: '12px' }}>Bescheid</th>
              <th style={{ padding: '12px' }}>Eingang</th>
              <th style={{ padding: '12px' }}>Aktion</th>
              <th style={{ padding: '12px' }}>Versand</th>
              <th style={{ padding: '12px' }}>Frist</th>
              <th style={{ padding: '12px' }}>WV</th>
              <th style={{ padding: '12px' }}>Überwachung (Info für WV)</th>
              <th style={{ padding: '12px' }}>Erledigt am</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Dok</th>
              <th style={{ padding: '12px', textAlign: 'right' }}>Bearbeitung</th>
            </tr>
          </thead>
          <tbody>
            {gefilterteVorgaenge.map((vorgang) => {
              const tageBisFrist = berechneTageBisFrist(vorgang.frist_extern);
              const isKritisch = vorgang.status !== 'Erledigt' && tageBisFrist !== null && tageBisFrist <= 3;
              const rowBg = isKritisch ? '#fff5f5' : '#fff';

              return (
              <tr key={vorgang.id} style={{ borderBottom: '1px solid #ecf0f1', background: rowBg }}>
                
                {bearbeiteId === vorgang.id ? (
                  <>
                    <td style={{ padding: '5px' }}><input type="text" value={editAktenzeichen} onChange={(e) => setEditAktenzeichen(e.target.value)} style={{ width: '60px', padding: '4px' }} /></td>
                    <td style={{ padding: '5px' }}><input type="text" value={editKontakt} onChange={(e) => setEditKontakt(e.target.value)} list="firmen-list" style={{ width: '90px', padding: '4px' }} /></td>
                    <td style={{ padding: '5px' }}><input type="text" value={editPerson} onChange={(e) => setEditPerson(e.target.value)} style={{ width: '80px', padding: '4px' }} /></td>
                    <td style={{ padding: '5px' }}><input type="text" value={editThema} onChange={(e) => setEditThema(e.target.value)} list="bescheid-list" style={{ width: '90px', padding: '4px' }} /></td>
                    <td style={{ padding: '5px' }}><input type="date" value={editEingangsdatum} onChange={(e) => setEditEingangsdatum(e.target.value)} style={{ padding: '4px' }}/></td>
                    <td style={{ padding: '5px' }}><input type="text" value={editAktion} onChange={(e) => setEditAktion(e.target.value)} list="aktion-list" style={{ width: '80px', padding: '4px' }} /></td>
                    <td style={{ padding: '5px' }}><input type="text" value={editKanal} onChange={(e) => setEditKanal(e.target.value)} list="versandart-list" style={{ width: '60px', padding: '4px' }} /></td>
                    <td style={{ padding: '5px' }}><input type="date" value={editFristExtern} onChange={(e) => setEditFristExtern(e.target.value)} style={{ padding: '4px' }}/></td>
                    <td style={{ padding: '5px' }}><input type="date" value={editWiedervorlage} onChange={(e) => setEditWiedervorlage(e.target.value)} style={{ padding: '4px' }}/></td>
                    <td style={{ padding: '5px' }}><input type="text" value={editUeberwachung} onChange={(e) => setEditUeberwachung(e.target.value)} style={{ width: '80px', padding: '4px' }} /></td>
                    <td style={{ padding: '5px' }}><input type="date" value={editErledigtAm} onChange={(e) => setEditErledigtAm(e.target.value)} style={{ padding: '4px' }}/></td>
                    <td style={{ padding: '10px' }}>{vorgang.status}</td>
                    
                    {/* HIER WURDE DIE BEARBEITUNGSZEILE FÜR DOKUMENTE ANGEPASST */}
                    <td style={{ padding: '10px' }}>
                      {vorgang.dokument_url || vorgang.antwort_url ? '📄' : '-'}
                    </td>
                    
                    <td style={{ padding: '10px', textAlign: 'right', minWidth: '100px' }}>
                      <button onClick={() => speichereBearbeitung(vorgang.id)} style={{ padding: '6px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>💾</button>
                      <button onClick={abbrechenBearbeiten} style={{ padding: '6px', background: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>❌</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '10px' }}>{vorgang.aktenzeichen || '-'}</td>
                    <td style={{ padding: '10px' }}><strong>{vorgang.kontakt}</strong></td>
                    <td style={{ padding: '10px' }}>{vorgang.person || '-'}</td>
                    <td style={{ padding: '10px' }}>{vorgang.thema}</td>
                    <td style={{ padding: '10px' }}>{formatDatum(vorgang.eingangsdatum)}</td>
                    <td style={{ padding: '10px' }}>{vorgang.aktion || '-'}</td>
                    <td style={{ padding: '10px' }}>{vorgang.kanal || '-'}</td>
                    <td style={{ padding: '10px', color: isKritisch ? '#e74c3c' : 'inherit', fontWeight: isKritisch ? 'bold' : 'normal' }}>{formatDatum(vorgang.frist_extern)}</td>
                    <td style={{ padding: '10px' }}>{formatDatum(vorgang.wiedervorlage)}</td>
                    <td style={{ padding: '10px' }}>{vorgang.ueberwachung || '-'}</td>
                    <td style={{ padding: '10px' }}>{formatDatum(vorgang.erledigt_am)}</td>
                    <td style={{ padding: '10px' }}>
                      <select
                        value={vorgang.status || 'Offen'}
                        onChange={(e) => aendereStatus(vorgang.id, e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: vorgang.status === 'Erledigt' ? '#2ecc71' : (vorgang.status === 'In Bearbeitung' ? '#f1c40f' : '#e74c3c'), color: vorgang.status === 'In Bearbeitung' ? '#333' : '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        <option value="Offen" style={{ background: '#fff', color: '#333' }}>Offen</option>
                        <option value="In Bearbeitung" style={{ background: '#fff', color: '#333' }}>Bearbeitung</option>
                        <option value="Erledigt" style={{ background: '#fff', color: '#333' }}>Erledigt</option>
                      </select>
                    </td>
                    
                    {/* NEU: HIER WERDEN BEIDE DOKUMENTE ANGEZEIGT (Eingang & Ausgang) in der normalen Tabellenansicht */}
                    <td style={{ padding: '10px', fontSize: '18px', whiteSpace: 'nowrap' }}>
                      {vorgang.dokument_url && <a href={vorgang.dokument_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', marginRight: '4px' }} title="Eingang (Bescheid)">📥</a>}
                      {vorgang.antwort_url && <a href={vorgang.antwort_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} title="Ausgang (Antwortschreiben)">📤</a>}
                      {!vorgang.dokument_url && !vorgang.antwort_url && <span style={{fontSize: '12px'}}>-</span>}
                    </td>

                    <td style={{ padding: '10px', textAlign: 'right', minWidth: '120px' }}>
                      <button onClick={() => erstelleFolgeaktion(vorgang)} title="Folgeaktion anlegen" style={{ padding: '6px', background: '#f39c12', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>➡️</button>
                      <button onClick={() => startBearbeiten(vorgang)} title="Bearbeiten" style={{ padding: '6px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '4px' }}>✏️</button>
                      <button onClick={() => loescheEintrag(vorgang.id)} title="Löschen" style={{ padding: '6px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                    </td>
                  </>
                )}
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  )
}