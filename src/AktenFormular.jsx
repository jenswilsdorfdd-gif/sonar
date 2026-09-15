import React from 'react';
import Icon from './Icon';
import { supabase } from './supabaseClient'; // <-- NEU: Für die Datenbankabfrage der Altlasten

export default function AktenFormular({
  theme,
  btnTextColor,
  inputStyle,
  labelStyle,
  h4StyleAkten,
  quickBtnStyle,
  modus,
  setModus,
  selectedAkteId,
  handleAkteAuswahl,
  sortedAktenForDropdown,
  getAkteDropdownText,
  unserZeichen,
  setUnserZeichen,
  thema,
  setThema,
  aktenzeichen,
  setAktenzeichen,
  gegnerListe,
  handleGegnerAuswahl,
  gegnerName,
  setGegnerName,
  gegnerAnsprechpartner,
  setGegnerAnsprechpartner,
  gegnerTelefon,
  setGegnerTelefon,
  gegnerFax,
  setGegnerFax,
  gegnerEmail,
  setGegnerEmail,
  mandanten,
  handleTresorAuswahl,
  unsereFirma,
  setUnsereFirma,
  unserAnsprechpartner,
  setUnserAnsprechpartner,
  unserEmail,
  setUnserEmail,
  unserTelefon,
  setUnserTelefon,
  typ,
  setTyp,
  datum,
  setDatum,
  aktion,
  setAktion,
  activeAkteObj,
  bezugId,
  setBezugId,
  formatDatum,
  fristExtern,
  handleFristChange,
  wiedervorlage,
  handleWVChange,
  setzeWV,
  clearOldFristen,
  setClearOldFristen,
  faxZhd,
  setFaxZhd,
  setShowVersandHistorie,
  handleResendVersand,
  setActiveWarRoomDossier,
  setIsWarRoomOpen,
  emailAnhaenge,
  setEmailAnhaenge,
  briefEntwurf,
  setBriefEntwurf,
  versandPdfUrl,
  laedt,
  handleSpeichernCheck,
  gegnerPrompt,
  handleGegnerPromptAccept,
  setGegnerPrompt,
  tresorPrompt,
  handleTresorPromptAccept,
  setTresorPrompt,
  formatRufnummer,
  rawText
}) {
  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word', boxSizing: 'border-box' };

  return (
    <form onSubmit={handleSpeichernCheck} style={panelStyle}>
      {gegnerPrompt && (
        <div style={{ background: theme.gegnerAccent || '#f43f5e', color: '#fff', padding: '18px 20px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <strong style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="alert" size={16} /> 
              {gegnerPrompt.typ === 'neu' 
                ? `Unbekannte Behörde: "${gegnerPrompt.obj.name}" erkannt` 
                : `Neuer Ansprechpartner "${gegnerPrompt.obj.ansprechpartner}" bei "${gegnerPrompt.targetName}" erkannt`}
            </strong>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
              {gegnerPrompt.typ === 'neu' ? (
                <button type="button" onClick={() => handleGegnerPromptAccept('neu')} style={{ background: '#fff', color: theme.gegnerAccent || '#f43f5e', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Ja, Behörde neu im CRM anlegen
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => handleGegnerPromptAccept('erweitern')} style={{ background: '#fff', color: theme.gegnerAccent || '#f43f5e', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Als weiteren Kontakt hinzufügen
                  </button>
                  <button type="button" onClick={() => handleGegnerPromptAccept('hauptkontakt')} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid #fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Als Hauptansprechpartner setzen
                  </button>
                </>
              )}
              <button type="button" onClick={() => setGegnerPrompt(null)} style={{ background: 'transparent', border: '1px solid #fff', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Ignorieren (nur für diesen Vorgang)
              </button>
            </div>
          </div>
        </div>
      )}

      {tresorPrompt && (
        <div style={{ background: theme.accent, color: '#000', padding: '18px 20px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <strong style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon name="alert" size={16} /> Unbekannter Mandant: "{tresorPrompt.obj.unsere_firma}" neu in den Tresor aufnehmen?</strong>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={handleTresorPromptAccept} style={{ background: '#000', color: theme.accent, border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Ja, anlegen</button>
              <button type="button" onClick={() => setTresorPrompt(null)} style={{ background: 'transparent', border: '1px solid #000', color: '#000', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Nein</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '20px', textAlign: 'left', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'neu' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><input type="radio" checked={modus === 'neu'} onChange={() => setModus('neu')} /><Icon name="folder" size={16} /> Neue Akte / Hülle anlegen</label>
        <label style={{ fontWeight: 'bold', cursor: 'pointer', color: modus === 'bestehend' ? theme.accent : theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}><input type="radio" checked={modus === 'bestehend'} onChange={() => setModus('bestehend')} /><Icon name="folder" size={16} /> Zu bestehender Akte hinzufügen</label>
        {modus === 'bestehend' && (
          <div style={{ flex: '1 1 min(100%, 200px)', marginLeft: 'auto' }}>
            <select value={selectedAkteId} onChange={handleAkteAuswahl} required style={{...inputStyle, padding: '8px', fontSize: '13px'}}>
              <option value="">-- Ziel-Akte wählen --</option>
              {sortedAktenForDropdown.map(a => <option key={a.id} value={a.id}>{getAkteDropdownText(a)}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '20px' }}>
        {modus === 'neu' && (
          <>
            <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                <h4 style={{margin: 0, color: theme.textMain}}>1. Akten-Stammdaten</h4>
              </div>
            </div>
            <div><label style={labelStyle}>Unser Zeichen</label><input type="text" value={unserZeichen} onChange={(e) => setUnserZeichen(e.target.value)} placeholder="z.B. 0001-JW-Finanzamt" style={inputStyle} /></div>
            <div><label style={labelStyle}>Gegenstand (Thema)*</label><input type="text" value={thema} onChange={(e) => setThema(e.target.value)} required style={inputStyle} /></div>
            <div><label style={labelStyle}>Aktenzeichen (Behörde)</label><input type="text" value={aktenzeichen} onChange={(e) => setAktenzeichen(e.target.value)} style={inputStyle} /></div>

            <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                <h4 style={{margin: 0, color: theme.textMain}}>2. Gegenpartei / Behörde</h4>
                {gegnerListe.length > 0 && (
                  <select onChange={handleGegnerAuswahl} style={{padding: '6px 10px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '13px', background: theme.inputBg, color: theme.textMain, flex: '1 1 250px', maxWidth: '350px'}}>
                    <option value="">+ Aus Gegner-CRM laden...</option>
                    {gegnerListe.map(g => {
                      let ansList = [];
                      try { const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen; if (Array.isArray(parsed)) ansList = parsed; } catch(e){}
                      if (ansList.length > 0) { return ansList.map((ans, idx) => ( <option key={`${g.id}-${idx}`} value={`${g.id}|${idx}`}>{g.name} — {ans.abteilung ? `${ans.abteilung}: ` : ''}{ans.name || 'Zentrale'}</option> )); }
                      return <option key={g.id} value={`${g.id}|0`}>{g.name}</option>;
                    })}
                  </select>
                )}
              </div>
            </div>
            <div><label style={labelStyle}>Behörde / Gegner*</label><input type="text" value={gegnerName} onChange={(e) => setGegnerName(e.target.value)} required style={inputStyle} /></div>
            <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={gegnerAnsprechpartner} onChange={(e) => setGegnerAnsprechpartner(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Telefon</label><input type="text" value={gegnerTelefon} onChange={(e) => setGegnerTelefon(e.target.value)} onBlur={(e) => setGegnerTelefon(formatRufnummer(e.target.value))} style={inputStyle} /></div>
            <div><label style={labelStyle}>Faxnummer</label><input type="text" value={gegnerFax} onChange={(e) => setGegnerFax(e.target.value)} onBlur={(e) => setGegnerFax(formatRufnummer(e.target.value))} style={inputStyle} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>E-Mail</label><input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} style={inputStyle} /></div>
            
            <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
                <h4 style={{margin: 0, color: theme.textMain}}>3. Wir (Mandant)</h4>
                {mandanten.length > 0 && (
                  <select onChange={handleTresorAuswahl} style={{padding: '6px 10px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '13px', background: theme.inputBg, color: theme.textMain, flex: '1 1 250px', maxWidth: '350px'}}>
                    <option value="">+ Aus Firmen-Tresor laden...</option>
                    {mandanten.map(m => <option key={m.id} value={m.id}>{m.firmenname}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div><label style={labelStyle}>Firma / Person*</label><input type="text" value={unsereFirma} onChange={(e) => setUnsereFirma(e.target.value)} required style={inputStyle} /></div>
            <div><label style={labelStyle}>Ansprechpartner</label><input type="text" value={unserAnsprechpartner} onChange={(e) => setUnserAnsprechpartner(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>E-Mail (Mandant)</label><input type="email" value={unserEmail} onChange={(e) => setUnserEmail(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Telefon (Mandant)</label><input type="text" value={unserTelefon} onChange={(e) => setUnserTelefon(e.target.value)} onBlur={(e) => setUnserTelefon(formatRufnummer(e.target.value))} style={inputStyle} /></div>
          </>
        )}

        <div style={{ gridColumn: '1 / -1', textAlign: 'left', marginTop: '10px' }}><h4 style={h4StyleAkten}>Dokument-Eintrag / Arbeitsanweisung</h4></div>
        <div><label style={labelStyle}>Typ*</label><select value={typ} onChange={(e) => setTyp(e.target.value)} style={inputStyle}><option value="Eingang">Eingang</option><option value="Ausgang">Ausgang</option><option value="Intern">Intern</option></select></div>
        <div><label style={labelStyle}>Datum</label><input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} style={inputStyle} /></div>
        
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Vorgang / Betreff / Aktion</label>
          <input type="text" value={aktion} onChange={(e) => setAktion(e.target.value)} placeholder="z.B. Rechnung Landesjustizkasse / Überweisung fällig" style={inputStyle} />
        </div>

        {activeAkteObj && activeAkteObj.akten_historie && activeAkteObj.akten_historie.length > 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '12px', background: 'rgba(14, 165, 233, 0.1)', border: '1px dashed #0ea5e9', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{...labelStyle, color: theme.textMain, margin: 0}}>Ist eine Antwort auf (Bezug & Auto-Kill Frist):</label>
              {bezugId && (
                <span style={{ fontSize: '11px', background: '#0ea5e9', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  ★ Bezug verknüpft
                </span>
              )}
            </div>
            <select value={bezugId} onChange={(e) => setBezugId(e.target.value)} style={{...inputStyle, borderColor: '#0ea5e9'}}>
              <option value="">-- Kein direkter Bezug --</option>
              {activeAkteObj.akten_historie.map(h => {
                const briefSnippet = h.brief_entwurf ? ` | "${h.brief_entwurf.substring(0, 40).replace(/\n/g, ' ')}..."` : '';
                const aktionSnippet = h.aktion ? ` | ${h.aktion}` : '';
                const isSuggested = (h.id === bezugId);
                return (
                  <option key={h.id} value={h.id}>
                    {isSuggested ? '★ ' : ''}{formatDatum(h.datum)} | {h.typ}{briefSnippet}{aktionSnippet}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div>
          <label style={labelStyle}>Frist (Behörde)</label>
          <input type="date" value={fristExtern} onChange={(e) => handleFristChange(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>WV (Intern)</label>
          <input type="date" value={wiedervorlage} onChange={(e) => handleWVChange(e.target.value)} style={inputStyle} />
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setzeWV(3)} style={quickBtnStyle}>+3T</button>
            <button type="button" onClick={() => setzeWV(7)} style={quickBtnStyle}>+1W</button>
            <button type="button" onClick={() => setzeWV(14)} style={quickBtnStyle}>+2W</button>
            <button type="button" onClick={() => setzeWV(0, 1)} style={quickBtnStyle}>+1M</button>
          </div>
        </div>
        
        {modus === 'bestehend' && (
          <div style={{ gridColumn: '1 / -1', marginTop: '5px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', borderRadius: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: theme.textMain, fontWeight: 'bold' }}>
              <input type="checkbox" checked={clearOldFristen} onChange={(e) => setClearOldFristen(e.target.checked)} style={{ accentColor: '#10b981', width: '16px', height: '16px' }} />
              Alle bisherigen Fristen & Wiedervorlagen dieser Akte als erledigt markieren
            </label>
          </div>
        )}
      </div>

      <div style={{ background: theme.inputBg, padding: '20px', border: `1px solid ${theme.border}`, borderRadius: '8px', marginTop: '25px', textAlign: 'left' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '15px', marginBottom: '20px', padding: '15px', background: theme.cardBg, borderRadius: '8px', border: `1px dashed ${theme.border}` }}>
          <div>
            <label style={{...labelStyle, color: theme.textMain}}>Versand-E-Mail (Gegner)</label>
            <input type="email" value={gegnerEmail} onChange={(e) => setGegnerEmail(e.target.value)} placeholder="z.B. poststelle@..." style={{...inputStyle, padding: '8px'}} />
          </div>
          <div>
            <label style={{...labelStyle, color: theme.textMain}}>Versand-Faxnummer (Gegner)</label>
            <input type="text" value={gegnerFax} onChange={(e) => setGegnerFax(e.target.value)} onBlur={(e) => setGegnerFax(formatRufnummer(e.target.value))} placeholder="z.B. 0351 123456" style={{...inputStyle, padding: '8px'}} />
          </div>
          <div>
            <label style={{...labelStyle, color: theme.textMain}}>z. Hd. (Fax-Deckblatt)</label>
            <input type="text" value={faxZhd} onChange={(e) => setFaxZhd(e.target.value)} placeholder="z.B. Frau Klemmer" style={{...inputStyle, padding: '8px'}} title="Dieser Name wird exklusiv für den Fax-Versand genutzt und überschreibt nicht das CRM." />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{...labelStyle, color: theme.accent, margin: 0, display: 'flex', alignItems: 'center', gap: '6px'}}><Icon name="file" size={16} /> Textentwurf / Schreiben verfassen / Arbeitsanweisung & Notizen</label>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', width: '100%' }}>
            <button type="button" onClick={() => setShowVersandHistorie(true)} style={{ background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="Sendeliste und Nachweise einsehen"><Icon name="folder" size={16} /> Versandhistorie</button>
            <button type="button" onClick={() => handleResendVersand('email')} style={{ background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Icon name="send" size={16} /> E-Mail senden (Resend)</button>
            <button type="button" onClick={() => handleResendVersand('fax')} style={{ background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Icon name="phone" size={16} /> E-Fax (Simple-Fax)</button>
            
            <button type="button" onClick={async (e) => {
              const btn = e.currentTarget;
              const originalContent = btn.innerHTML;
              
              // Kurzer Lade-Indikator, falls die Datenbank gefragt wird
              btn.innerHTML = `<span style="display:flex; align-items:center; gap:6px;"><Icon name="file" size={16}/> Lade Volltext...</span>`;
              btn.style.opacity = '0.7';
              btn.style.pointerEvents = 'none';

              let finalRawText = rawText || briefEntwurf || "Kein Volltext hinterlegt.";
              
              try {
                // --- PHASE 3: MD-INJEKTION FÜR ALTLASTEN ---
                if (!rawText && modus === 'bestehend' && activeAkteObj && bezugId) {
                  const hist = activeAkteObj.akten_historie.find(h => h.id === bezugId);
                  if (hist && hist.dokument_url) {
                    const urls = hist.dokument_url.split(',');
                    const mdUrl = urls.find(u => u.toLowerCase().endsWith('.md'));
                    const pdfUrl = urls.find(u => u.toLowerCase().endsWith('.pdf'));
                    
                    if (mdUrl) {
                      const res = await fetch(mdUrl);
                      if (res.ok) finalRawText = await res.text();
                    } else if (pdfUrl) {
                      const { data } = await supabase
                        .from('wissensdatenbank')
                        .select('inhalt_text')
                        .eq('dokument_url', pdfUrl)
                        .limit(1);
                      if (data && data.length > 0 && data[0].inhalt_text) {
                        finalRawText = data[0].inhalt_text;
                      }
                    }
                  }
                }
                // ------------------------------------------
              } catch (err) {
                console.error("Fehler beim Laden des alten Volltexts:", err);
              } finally {
                btn.innerHTML = originalContent;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';

                setActiveWarRoomDossier({
                  akte_id: selectedAkteId,
                  unsere_firma: unsereFirma,
                  unser_ansprechpartner: unserAnsprechpartner,
                  aktenzeichen: aktenzeichen,
                  kontakt: gegnerName,
                  thema: thema,
                  frist_extern: fristExtern,
                  brief_entwurf: briefEntwurf || "Kein Volltext hinterlegt. Bitte auf Basis der Metadaten/Thema analysieren.",
                  raw_text: finalRawText // <-- INJEKTION ERFOLGT!
                });
                setIsWarRoomOpen(true);
              }
            }} style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px 14px', minHeight: '44px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s ease' }} title="Diesen Vorgang zur forensischen Analyse in den War-Room schicken">
              <Icon name="alert" size={16} /> In War-Room senden
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '15px', padding: '12px', background: theme.cardBg, border: `1px dashed ${theme.border}`, borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <label style={{ ...labelStyle, margin: 0, color: theme.textMain, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="paperclip" size={14} /> Versand-Dateianhänge ({emailAnhaenge.length})
            </label>
            <label style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="paperclip" size={14} /> Datei(en) anhängen
              <input 
                id="email-anhaenge-upload" 
                type="file" 
                multiple 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  setEmailAnhaenge(prev => [...prev, ...files]);
                  e.target.value = '';
                }} 
              />
            </label>
          </div>
          {emailAnhaenge.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {emailAnhaenge.map((f, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '4px', padding: '4px 8px', fontSize: '12px', color: theme.textMain }}>
                  <span style={{ marginRight: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}><Icon name="paperclip" size={12} /> {f.name}</span>
                  <button 
                    type="button" 
                    onClick={() => setEmailAnhaenge(prev => prev.filter((_, i) => i !== idx))} 
                    style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '0 2px', fontWeight: 'bold' }} 
                    title="Anhang entfernen"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <textarea value={briefEntwurf} onChange={(e) => setBriefEntwurf(e.target.value)} placeholder="Trage hier deinen Brief- oder E-Mail-Text, Arbeitsanweisungen oder Notizen ein..." style={{ ...inputStyle, minHeight: '180px', fontFamily: 'monospace', background: 'transparent' }} />
        {versandPdfUrl && typ === 'Ausgang' && (<div style={{ marginTop: '15px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px dashed #10b981', color: '#10b981', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon name="check" size={16} /> Versand-PDF generiert & verschickt! Vergiss nicht, unten auf "+ In Akte abheften" zu klicken.</div>)}
        {versandPdfUrl && typ !== 'Ausgang' && (<div style={{ marginTop: '15px', padding: '10px', background: 'rgba(14, 165, 233, 0.1)', border: '1px dashed #0ea5e9', color: '#0ea5e9', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><Icon name="check" size={16} /> Scan-PDF erfolgreich verknüpft! Bereit zum Abheften.</div>)}
      </div>

      <button disabled={laedt} type="submit" style={{ padding: '15px', background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '16px', marginTop: '25px' }}>
        {laedt ? 'Speichere...' : '+ In Akte abheften'}
      </button>
    </form>
  );
}