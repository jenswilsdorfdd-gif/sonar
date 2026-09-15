import React from 'react';
import Icon from './Icon';
import { extractFilename } from './utils';

export default function AktenListe({
  theme,
  isDarkMode,
  btnTextColor,
  inputStyle,
  inlineInputStyle,
  zeigeErledigte,
  setZeigeErledigte,
  gefilterteAkten,
  aufgeklappteAkten,
  toggleAkte,
  fokussierteAkteId,
  fokussierterHistId,
  toggleAkteStatus,
  handleAkteStammdatenEdit,
  loescheAkte,
  druckeAkte,
  mergeSourceId,
  setMergeSourceId,
  mergeTargetId,
  setMergeTargetId,
  mergeAkte,
  sortedAktenForDropdown,
  getAkteDropdownText,
  handleInlineEdit,
  ladeVorgangInMaske,
  loescheHistorieEintrag,
  loescheDateiAusHistorie,
  handleNachtragUploadAkte,
  uploadingHistId,
  formatDatum
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '40px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: '0', color: theme.textMain, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
          <Icon name="folder" size={24} /> Akten-Übersicht
        </h2>
        <button 
          onClick={() => setZeigeErledigte(!zeigeErledigte)}
          style={{ background: theme.accent, color: btnTextColor, border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Icon name="folder" size={14} /> {zeigeErledigte ? 'Erledigte ausblenden' : 'Erledigte einblenden'}
        </button>
      </div>

      {/* AKTEN-ÜBERSICHT WRAPPER */}
      <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', textAlign: 'left', background: theme.cardBg, width: '100%', boxSizing: 'border-box' }}>
        
        {/* DESKTOP HEADER */}
        <div className="akten-desktop-header" style={{ background: theme.inputBg, borderBottom: `1px solid ${theme.border}`, color: theme.textMuted }}>
          <div style={{ width: '30px' }}></div>
          <div style={{ flex: '1 1 100%' }}>
            <div className="akten-desktop-grid">
              <div>Unser Zeichen</div>
              <div>Gegner</div>
              <div>Gegenstand</div>
              <div>Ansprechpartner</div>
              <div>Aktenzeichen</div>
            </div>
          </div>
          <div style={{ width: '110px', textAlign: 'right' }}>Status</div>
        </div>

        {/* AKTEN EINTRÄGE */}
        {gefilterteAkten.map((akte) => {
          const isExpanded = aufgeklappteAkten.includes(akte.id);
          const istFokussiert = (fokussierteAkteId === akte.id);

          return (
            <div id={`akte-karte-${akte.id}`} key={akte.id} style={{ borderBottom: `1px solid ${theme.border}`, background: istFokussiert ? (isDarkMode ? 'rgba(0, 229, 255, 0.12)' : '#e0f2fe') : 'transparent', borderLeft: istFokussiert ? `6px solid ${theme.accent}` : '6px solid transparent', transition: 'all 0.3s ease', width: '100%', boxSizing: 'border-box' }}>
              
              <div className="akten-row-wrapper" onClick={() => toggleAkte(akte.id)}>
                
                {/* 1. DESKTOP CHEVRON */}
                <div className="desktop-only" style={{ width: '30px', color: istFokussiert ? theme.accent : theme.textMuted }}>
                  <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                </div>

                {/* 2. MOBILER KOPF */}
                <div className="mobile-only" style={{ width: '100%' }}>
                  <div className="akten-mobile-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', color: istFokussiert ? theme.accent : theme.textMuted }}>
                        <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                      </div>
                      <strong style={{ color: theme.accent, fontSize: '14px' }}>
                        [{akte.unser_zeichen || '---'}]
                      </strong>
                    </div>
                    <div style={{ width: '110px', textAlign: 'right', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                      <select 
                        value={akte.status || 'Offen'} 
                        onChange={(e) => { if(e.target.value !== akte.status) toggleAkteStatus(akte.id, akte.status); }} 
                        style={{ background: akte.status === 'Erledigt' ? theme.border : theme.accent, color: akte.status === 'Erledigt' ? theme.textMain : btnTextColor, border: 'none', padding: '4px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', outline: 'none', width: '100%', textAlign: 'center' }}
                      >
                        <option value="Offen">Offen</option>
                        <option value="Erledigt">Erledigt</option>
                      </select>
                      <button 
                        onClick={() => handleAkteStammdatenEdit(akte.id, 'is_locked', !akte.is_locked)} 
                        style={{ background: 'transparent', border: 'none', color: akte.is_locked ? theme.warningBorder : theme.textMuted, cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={akte.is_locked ? 'Akte entsperren' : 'Akte versiegeln (Read-Only)'}
                      >
                        <Icon name={akte.is_locked ? "lock" : "eye"} size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* 3. FELDER CONTAINER */}
                <div style={{ flex: '1 1 100%', width: '100%', boxSizing: 'border-box' }}>
                  <div className="akten-desktop-grid">
                    
                    <div className="akten-field-box desktop-only">
                      <input 
                        type="text" 
                        defaultValue={akte.unser_zeichen || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.unser_zeichen || '')) handleAkteStammdatenEdit(akte.id, 'unser_zeichen', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Unser Zeichen" 
                        style={{ ...inlineInputStyle, color: theme.accent, fontSize: '14px', fontWeight: 'bold', padding: '2px' }} 
                      />
                    </div>

                    <div className="akten-field-box">
                      <input 
                        type="text" 
                        defaultValue={akte.gegner_name || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.gegner_name || '')) handleAkteStammdatenEdit(akte.id, 'gegner_name', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Gegner" 
                        style={{ ...inlineInputStyle, color: theme.textMain, fontSize: '15px', fontWeight: 'bold', padding: '2px' }} 
                      />
                    </div>

                    <div className="akten-field-box">
                      <input 
                        type="text" 
                        defaultValue={akte.thema || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.thema || '')) handleAkteStammdatenEdit(akte.id, 'thema', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Gegenstand" 
                        style={{ ...inlineInputStyle, color: theme.textMain, fontSize: '14px', padding: '2px' }} 
                      />
                    </div>

                    <div className="akten-field-box">
                      <input 
                        type="text" 
                        defaultValue={akte.gegner_ansprechpartner || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.gegner_ansprechpartner || '')) handleAkteStammdatenEdit(akte.id, 'gegner_ansprechpartner', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Ansprechpartner" 
                        style={{ ...inlineInputStyle, color: theme.textMuted, fontSize: '13px', padding: '2px' }} 
                      />
                    </div>

                    <div className="akten-field-box">
                      <input 
                        type="text" 
                        defaultValue={akte.aktenzeichen || ''} 
                        onBlur={(e) => { if (e.target.value !== (akte.aktenzeichen || '')) handleAkteStammdatenEdit(akte.id, 'aktenzeichen', e.target.value); }} 
                        onClick={(e) => e.stopPropagation()} 
                        placeholder="Aktenzeichen" 
                        style={{ ...inlineInputStyle, color: theme.textMuted, fontSize: '13px', padding: '2px' }} 
                      />
                    </div>

                  </div>
                </div>

                {/* 4. DESKTOP STATUS BUTTON (RECHTE SPALTE) */}
                <div className="desktop-only" style={{ width: '110px', textAlign: 'right', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                  <select 
                    value={akte.status || 'Offen'} 
                    onChange={(e) => { if(e.target.value !== akte.status) toggleAkteStatus(akte.id, akte.status); }} 
                    style={{ background: akte.status === 'Erledigt' ? theme.border : theme.accent, color: akte.status === 'Erledigt' ? theme.textMain : btnTextColor, border: 'none', padding: '4px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', outline: 'none', flex: '1 1 auto', textAlign: 'center' }}
                  >
                    <option value="Offen">Offen</option>
                    <option value="Erledigt">Erledigt</option>
                  </select>
                  <button 
                    onClick={() => handleAkteStammdatenEdit(akte.id, 'is_locked', !akte.is_locked)} 
                    style={{ background: 'transparent', border: 'none', color: akte.is_locked ? theme.warningBorder : theme.textMuted, cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title={akte.is_locked ? 'Akte entsperren' : 'Akte versiegeln (Read-Only)'}
                  >
                    <Icon name={akte.is_locked ? "lock" : "eye"} size={18} />
                  </button>
                </div>

              </div>

              {/* AUFGEKLAPPTER BEREICH */}
              {isExpanded && (
                <div style={{ background: theme.inputBg, padding: '15px', borderTop: `1px solid ${theme.border}`, width: '100%', boxSizing: 'border-box' }}>
                  
                  {/* AKTIONSMENÜ */}
                  <div className="akten-actions-bar" style={{ background: theme.cardBg, border: `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: '13px', color: theme.textMain, fontWeight: 'bold' }}>
                      Aktions-Menü
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', maxWidth: '600px' }}>
                      {akte.status === 'Erledigt' && (
                        <button onClick={() => toggleAkteStatus(akte.id, akte.status)} style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="folder" size={14} /> Akte wiedereröffnen</button>
                      )}
                      <button onClick={() => loescheAkte(akte.id)} style={{ background: 'transparent', color: theme.warningBorder, border: `1px solid ${theme.warningBorder}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="trash" size={14} /> Akte löschen</button>
                      <button onClick={() => druckeAkte(akte)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="print" size={14} /> Akte exportieren / drucken</button>
                      
                      {mergeSourceId === akte.id ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                          <select value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)} style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', flex: '1 1 auto' }}>
                            <option value="">-- Ziel-Akte wählen --</option>
                            {sortedAktenForDropdown.filter(a => a.id !== akte.id).map(a => (<option key={a.id} value={a.id}>{getAkteDropdownText(a)}</option>))}
                          </select>
                          <button onClick={() => mergeAkte(akte.id)} style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>Merge bestätigen</button>
                          <button onClick={() => { setMergeSourceId(null); setMergeTargetId(''); }} style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Abbrechen</button>
                        </div>
                      ) : (
                        <button onClick={() => setMergeSourceId(akte.id)} style={{ background: 'transparent', color: theme.accent, border: `1px dashed ${theme.accent}`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="link" size={14} /> In Sammelakte verschieben (Merge)</button>
                      )}
                    </div>
                  </div>

                  {/* HISTORIEN-VORGÄNGE (DESKTOP: TABELLE / MOBIL: CARDS) */}
                  <div style={{ width: '100%', boxSizing: 'border-box' }}>
                    <table className="hist-desktop-table" style={{ background: theme.cardBg }}>
                      <thead>
                        <tr style={{ background: theme.border, color: theme.textMain }}>
                          <th style={{ padding: '10px', textAlign: 'left', width: '110px' }}>Typ</th>
                          <th style={{ padding: '10px', textAlign: 'left', width: '130px' }}>Datum</th>
                          <th style={{ padding: '10px', textAlign: 'left', width: '230px' }}>Aktion</th>
                          <th style={{ padding: '10px', textAlign: 'left', width: '160px' }}>Frist / WV</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Dokumente</th>
                          <th style={{ padding: '10px', textAlign: 'center', width: '90px' }}>Aktionen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {akte.akten_historie.map((hist) => {
                          const istHervorgehoben = fokussierterHistId === hist.id;

                          return (
                            <tr id={`hist-zeile-${hist.id}`} key={hist.id} style={{ borderBottom: `1px solid ${theme.border}`, background: istHervorgehoben ? (isDarkMode ? 'rgba(0, 229, 255, 0.15)' : '#e0f2fe') : 'transparent', transition: 'background 0.5s ease' }}>
                              
                              {/* MOBILER KOPF (NUR MOBIL) */}
                              <td className="mobile-only">
                                <div className="hist-mobile-header-row">
                                  <select 
                                    defaultValue={hist.typ || ''} 
                                    onChange={(e) => { if (e.target.value !== (hist.typ || '')) handleInlineEdit(hist.id, 'typ', e.target.value); }} 
                                    className="hist-typ-select"
                                    style={{ width: 'auto', flex: '1 1 auto' }}
                                  >
                                    <option value="Eingang">Eingang</option>
                                    <option value="Ausgang">Ausgang</option>
                                    <option value="Intern">Intern</option>
                                  </select>
                                  <input 
                                    type="date" 
                                    defaultValue={hist.datum || ''} 
                                    onBlur={(e) => { if (e.target.value !== (hist.datum || '')) handleInlineEdit(hist.id, 'datum', e.target.value); }} 
                                    style={{ ...inlineInputStyle, width: 'auto', flex: '1 1 auto' }} 
                                  />
                                  <button onClick={() => ladeVorgangInMaske(akte, hist)} style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>Laden</button>
                                  <button onClick={() => loescheHistorieEintrag(hist.id)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '4px' }}>
                                    <Icon name="trash" size={16} />
                                  </button>
                                </div>
                              </td>

                              {/* DESKTOP SPALTE 1: TYP */}
                              <td style={{ padding: '8px 10px' }} className="desktop-only">
                                 <select 
                                   defaultValue={hist.typ || ''} 
                                   onChange={(e) => { if (e.target.value !== (hist.typ || '')) handleInlineEdit(hist.id, 'typ', e.target.value); }} 
                                   className="hist-typ-select"
                                 >
                                    <option value="Eingang">Eingang</option>
                                    <option value="Ausgang">Ausgang</option>
                                    <option value="Intern">Intern</option>
                                 </select>
                              </td>

                              {/* DESKTOP SPALTE 2: DATUM */}
                              <td style={{ padding: '8px 10px' }} className="desktop-only">
                                <input 
                                  type="date" 
                                  defaultValue={hist.datum || ''} 
                                  onBlur={(e) => { if (e.target.value !== (hist.datum || '')) handleInlineEdit(hist.id, 'datum', e.target.value); }} 
                                  style={inlineInputStyle} 
                                />
                              </td>

                              {/* AKTION */}
                              <td style={{ padding: '8px 10px' }}>
                                <input 
                                  type="text" 
                                  defaultValue={hist.aktion || ''} 
                                  onBlur={(e) => { if (e.target.value !== (hist.aktion || '')) handleInlineEdit(hist.id, 'aktion', e.target.value); }} 
                                  style={inlineInputStyle} 
                                  placeholder="Ohne Aktion" 
                                />
                              </td>

                              {/* FRIST / WV */}
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: theme.textMuted, width: '30px' }}>Frist:</span>
                                    <input 
                                      type="date" 
                                      key={`frist-${hist.frist_extern}`}
                                      defaultValue={hist.frist_extern || ''} 
                                      onBlur={(e) => { if (e.target.value !== (hist.frist_extern || '')) handleInlineEdit(hist.id, 'frist_extern', e.target.value); }} 
                                      style={{...inlineInputStyle, padding: '2px', borderBottom: 'none'}} 
                                      title="Frist setzen (löscht automatisch WV)" 
                                    />
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: theme.warningBorder, fontWeight: 'bold', width: '30px' }}>WV:</span>
                                    <input 
                                      type="date" 
                                      key={`wv-${hist.wiedervorlage}`}
                                      defaultValue={hist.wiedervorlage || ''} 
                                      onBlur={(e) => { if (e.target.value !== (hist.wiedervorlage || '')) handleInlineEdit(hist.id, 'wiedervorlage', e.target.value); }} 
                                      style={{...inlineInputStyle, padding: '2px', borderBottom: 'none'}} 
                                      title="WV setzen (löscht automatisch Frist)" 
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* DOKUMENTE */}
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                  {hist.dokument_url && hist.dokument_url.split(',').map((url, idx) => {
                                    const fileName = extractFilename(url);
                                    return (
                                      <div key={idx} onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'stretch', background: theme.border, borderRadius: '6px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px', color: theme.textMain, background: 'rgba(0,0,0,0.1)' }} title={fileName}><Icon name="file" size={12} /> {fileName.length > 18 ? fileName.substring(0, 15) + '...' : fileName}</a>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); loescheDateiAusHistorie(hist.id, hist.dokument_url, url); }} style={{ background: 'transparent', border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 6px', cursor: 'pointer', color: theme.textMuted }} title="Datei löschen"><Icon name="x" size={12} /></button>
                                      </div>
                                    )
                                  })}
                                  {uploadingHistId === hist.id ? (<span style={{ fontSize: '11px', color: theme.accent }}><Icon name="file" size={12} /> Upload...</span>) : (<label style={{ cursor: 'pointer', fontSize: '11px', background: 'transparent', padding: '4px 8px', borderRadius: '4px', border: `1px dashed ${theme.textMuted}`, display: 'inline-block', color: theme.textMuted }} title="Datei nachträglich an diesen Vorgang anhängen">+ Datei<input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUploadAkte(hist.id, hist.dokument_url, akte.unsere_firma, akte.gegner_name, e)} /></label>)}
                                </div>
                              </td>

                              {/* DESKTOP SPALTE 6: AKTIONEN (LADEN & LÖSCHEN) */}
                              <td style={{ padding: '8px 10px', textAlign: 'center' }} className="desktop-only">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                  <button onClick={() => ladeVorgangInMaske(akte, hist)} style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }} title="Diesen Vorgang oben in die Maske laden">Laden</button>
                                  <button onClick={() => loescheHistorieEintrag(hist.id)} style={{ background: 'transparent', border: 'none', color: theme.warningBorder, cursor: 'pointer', padding: '4px' }} title="Vorgang löschen"><Icon name="trash" size={14} /></button>
                                </div>
                              </td>

                            </tr>
                          );
                        })}
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
  );
}