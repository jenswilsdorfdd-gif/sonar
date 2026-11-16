import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import {
  HEADCOUNT_THRESHOLDS,
  RECURRING_COMPLIANCE_DEADLINES,
  calculateKSchGFTE
} from './config/sonarComplianceRules';

export default function AktenAlarme({
  theme,
  isDarkMode,
  btnTextColor,
  akten,
  mandanten,
  isAlarmsOpen,
  setIsAlarmsOpen,
  openMenuId,
  setOpenMenuId,
  handleAlarmKlick,
  ladeVorgangInMaske,
  handleInlineEdit,
  handleTerminVerschieben,
  handleNachhaken,
  formatDatum,
  ladeDaten,
  showToast
}) {
  const [creatingComplianceKey, setCreatingComplianceKey] = useState(null);

  const panelStyle = { background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '20px', width: '100%', wordBreak: 'break-word', boxSizing: 'border-box' };
  const complianceColor = theme?.complianceAccent || '#f59e0b';

  const berechneTageBis = (datumStr) => {
    if (!datumStr) return null; let rawDate = String(datumStr).trim(); if (rawDate.length === 8 && rawDate.endsWith('206')) { rawDate = rawDate.replace('206', '2026'); }
    const heute = new Date(); heute.setHours(0, 0, 0, 0); const frist = new Date(rawDate); if (frist.getFullYear() < 2000) { frist.setFullYear(2026); } frist.setHours(0, 0, 0, 0); return Math.ceil((frist - heute) / (1000 * 60 * 60 * 24));
  };

  const fristenWarnungen = [];
  akten.filter(a => a.status !== 'Erledigt').forEach(akte => {
    if (akte.akten_historie && akte.akten_historie.length > 0) {
      const relevanteEintraege = akte.akten_historie.filter(h => h.wiedervorlage || h.frist_extern);
      
      relevanteEintraege.forEach(dokument => {
        let zielDatum = null; let isWV = false; let sollAlarmMachen = false;
        
        if (dokument.wiedervorlage) { 
          const wvTage = berechneTageBis(dokument.wiedervorlage); 
          if (wvTage !== null && wvTage <= 0) { zielDatum = dokument.wiedervorlage; isWV = true; sollAlarmMachen = true; } 
        } 
        
        if (!sollAlarmMachen && dokument.frist_extern) { 
          const fristTage = berechneTageBis(dokument.frist_extern); 
          if (fristTage !== null && fristTage <= 7) { zielDatum = dokument.frist_extern; isWV = false; sollAlarmMachen = true; } 
        } 
        
        if (sollAlarmMachen && zielDatum) { 
          const tage = berechneTageBis(zielDatum); 
          let alarmStufe = '1. ERINNERUNG'; 
          if (tage <= 4 && tage > 2) alarmStufe = '2. ERINNERUNG'; 
          if (tage <= 2) alarmStufe = 'ALARM'; 
          
          fristenWarnungen.push({ 
            ...dokument, 
            akte_id: akte.id, 
            akte_thema: akte.thema, 
            akte_gegner: akte.gegner_name, 
            tageUebrig: tage, 
            alarmStufe, 
            isWiedervorlage: isWV, 
            aktivesDatum: zielDatum, 
            unser_zeichen: akte.unser_zeichen,
            ganze_akte: akte
          }); 
        }
      });
    }
  });
  fristenWarnungen.sort((a, b) => a.tageUebrig - b.tageUebrig);

  const ustRadar = [];
  const heuteDate = new Date(); const actYear = heuteDate.getFullYear(); const actMonth = heuteDate.getMonth(); 
  mandanten.forEach(m => {
    const cpCheck = (m && typeof m.compliance_profile === 'object' && m.compliance_profile !== null) ? m.compliance_profile : {};
    if (cpCheck.rechtsform === 'Privat' || cpCheck.compliance_disabled) return;
    if (m.ust_intervall === 'Jährlich' || !m.ust_intervall) return;
    let nextFristDate = null; let bezeichnung = "";
    if (m.ust_intervall === 'Monatlich') {
      const shift = m.dauerfrist ? 2 : 1; let targetMonth = actMonth + shift; let targetYear = actYear;
      if (targetMonth > 11) { targetMonth -= 12; targetYear++; } nextFristDate = new Date(targetYear, targetMonth, 10); bezeichnung = `USt (Monat ${targetMonth === 0 ? 12 : targetMonth})`;
      if (heuteDate.getDate() <= 10) { let currentShift = m.dauerfrist ? 1 : 0; let checkM = actMonth + currentShift; let checkY = actYear; if (checkM > 11) { checkM -= 12; checkY++; } nextFristDate = new Date(checkY, checkM, 10); bezeichnung = `USt-Voranmeldung`; }
    } else if (m.ust_intervall === 'Vierteljährlich') {
      const fälligkeitsMonate = m.dauerfrist ? [4, 7, 10, 1] : [3, 6, 9, 0]; let foundFrist = null;
      for (let i = 0; i < 4; i++) { let testMonth = fälligkeitsMonate[i]; let testYear = actYear; if (m.dauerfrist && testMonth === 1) testYear++; if (!m.dauerfrist && testMonth === 0) testYear++; let testDate = new Date(testYear, testMonth, 10); if (testDate >= heuteDate || (testDate.getMonth() === actMonth && heuteDate.getDate() <= 10)) { foundFrist = testDate; bezeichnung = `USt-Voranmeldung (Quartal ${i+1})`; break; } }
      nextFristDate = foundFrist;
    }
    if (nextFristDate) { const tage = berechneTageBis(nextFristDate.toISOString().split('T')[0]); if (tage !== null && tage <= 7) { ustRadar.push({ firma: m.firmenname, bezeichnung: bezeichnung, datum: nextFristDate.toISOString().split('T')[0], tageUebrig: tage }); } }
  });
  ustRadar.sort((a,b) => a.tageUebrig - b.tageUebrig);

  // --- SONAR COMPLIANCE RADAR: UNTERJÄHRIGE GESETZLICHE FRISTEN (<= 30 TAGE) & KRITISCHE SCHWELLENWERTE ---
  const complianceAlarme = [];
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  mandanten.forEach(m => {
    const cp = (m && typeof m.compliance_profile === 'object' && m.compliance_profile !== null)
      ? m.compliance_profile
      : {};
    const rechtsform = cp.rechtsform || 'GmbH';
    if (rechtsform === 'Privat' || cp.compliance_disabled) return;

    const headcountTotal = Number(cp.headcount_total || 0);
    const richtwertKschg = calculateKSchGFTE(cp.headcount_parttime_20, cp.headcount_parttime_30, cp.headcount_fulltime);

    // 1. Jahresfristen aus RECURRING_COMPLIANCE_DEADLINES prüfen (Anzeige wenn <= 30 Tage entfernt)
    RECURRING_COMPLIANCE_DEADLINES.forEach(dl => {
      if (dl.cycle !== 'YEARLY') return;
      if (dl.appliesTo && !dl.appliesTo.includes(rechtsform)) return;
      if (headcountTotal < Number(dl.minHeadcount || 0)) return;
      if (dl.id === 'ticker_ksk_meldung' && !cp.uses_external_creatives) return;
      if (dl.id === 'ticker_lucid_verpackg' && !cp.ships_physical_goods) return;

      let targetDate = new Date(actYear, Number(dl.month || 1) - 1, Number(dl.day || 1));
      if (targetDate < todayMidnight) {
        targetDate = new Date(actYear + 1, Number(dl.month || 1) - 1, Number(dl.day || 1));
      }
      const isoStr = targetDate.toISOString().split('T')[0];
      const tage = berechneTageBis(isoStr);

      if (tage !== null && tage <= 30) {
        const akteThema = `Compliance-Pflicht: ${dl.title}`;
        const alreadyExists = akten.some(
          a => a.status !== 'Erledigt' && a.thema === akteThema && a.mandant_name === m.firmenname
        );
        if (!alreadyExists) {
          complianceAlarme.push({
            key: `dl_${m.id}_${dl.id}`,
            firma: m.firmenname,
            title: dl.title,
            legalBasis: dl.legalBasis,
            warningText: dl.warningText,
            datum: isoStr,
            tageUebrig: tage
          });
        }
      }
    });

    // 2. Kritische KSchG-Schwelle (> 10,00 Vollzeit-Richtwert) als Warnkarte, falls noch nicht als Wiedervorlage hinterlegt
    if (richtwertKschg > 10.0) {
      const kschgRule = HEADCOUNT_THRESHOLDS.find(t => t.metric === 'fte_kschg');
      if (kschgRule) {
        const akteThema = `Compliance-Pflicht: ${kschgRule.title}`;
        const alreadyExists = akten.some(
          a => a.status !== 'Erledigt' && a.thema === akteThema && a.mandant_name === m.firmenname
        );
        if (!alreadyExists) {
          complianceAlarme.push({
            key: `th_${m.id}_kschg`,
            firma: m.firmenname,
            title: `${kschgRule.title} (Aktueller Vollzeit-Richtwert: ${richtwertKschg.toFixed(2)})`,
            legalBasis: kschgRule.legalBasis,
            warningText: kschgRule.obligations.join('\n• '),
            datum: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            tageUebrig: 7
          });
        }
      }
    }
  });

  // 1-Klick-Erstellung einer Wiedervorlage-Akte direkt aus der Alarmbox
  const handleCreateComplianceWiedervorlageFromAlarm = async (item) => {
    if (!item || creatingComplianceKey) return;
    setCreatingComplianceKey(item.key);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) throw new Error('Nicht angemeldet.');

      const akteThema = `Compliance-Pflicht: ${item.title}`;
      const kuerzel = String(item.firma || 'COMP').replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      const unserZeichen = `COMP-${kuerzel}-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;

      const { data: newAkte, error: akteErr } = await supabase
        .from('akten')
        .insert([{
          user_id: uid,
          unser_zeichen: unserZeichen,
          mandant_name: item.firma,
          gegner_name: 'Interne Organ-Compliance / Behördenfrist',
          aktenzeichen_gegner: item.legalBasis,
          thema: akteThema,
          status: 'Offen'
        }])
        .select()
        .single();

      if (akteErr || !newAkte) throw new Error(akteErr?.message || 'Fehler beim Anlegen der Akte.');

      await supabase.from('akten_historie').insert([{
        user_id: uid,
        akte_id: newAkte.id,
        datum: new Date().toISOString().split('T')[0],
        typ: 'Eingang',
        kanal: 'Compliance-Radar',
        aktion: item.title,
        frist_extern: item.datum,
        wiedervorlage: item.datum,
        brief_entwurf: `GESETZLICHE GRUNDLAGE: ${item.legalBasis}\n\nHAFTUNGS- & PFLICHTHINWEIS:\n${item.warningText}`
      }]);

      if (typeof ladeDaten === 'function') await ladeDaten();
      if (typeof showToast === 'function') {
        showToast(`Compliance-Wiedervorlage [${unserZeichen}] für ${item.firma} angelegt.`, 'success');
      }
    } catch (err) {
      console.error('Compliance-Wiedervorlage Fehler:', err);
      if (typeof showToast === 'function') {
        showToast('Fehler: ' + (err.message || err), 'error');
      }
    } finally {
      setCreatingComplianceKey(null);
    }
  };

  if (fristenWarnungen.length === 0 && ustRadar.length === 0 && complianceAlarme.length === 0) {
    return null;
  }

  return (
    <>
      <style>{`
        .alarm-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: nowrap;
          gap: 15px;
        }
        .alarm-btn-group {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
          position: relative;
        }
        @media (max-width: 768px) {
          .alarm-card-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
          }
          .alarm-btn-group {
            width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 10px !important;
          }
          .alarm-btn-group button {
            flex: 1 1 50% !important;
            justify-content: center !important;
            padding: 8px 10px !important;
          }
        }
      `}</style>
      
      <div style={{ ...panelStyle, background: theme.warningBg, border: `1px solid ${theme.warningBorder}` }}>
        <h4 onClick={() => setIsAlarmsOpen(!isAlarmsOpen)} style={{ color: theme.warningText, margin: isAlarmsOpen ? '0 0 15px 0' : '0', textAlign: 'left', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Icon name="alert" size={20} /> Dringende Alarme, Compliance-Radar & Fällige Wiedervorlagen ({fristenWarnungen.length + ustRadar.length + complianceAlarme.length})</div>
          <div style={{ color: theme.warningBorder }}><Icon name={isAlarmsOpen ? 'down' : 'right'} size={20} /></div>
        </h4>
        {isAlarmsOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            {fristenWarnungen.map(w => {
              const isOverdue = w.tageUebrig < 0; const isDueToday = w.tageUebrig === 0; const actionBg = isOverdue ? theme.warningBorder : theme.accent; const actionColor = isOverdue ? '#ffffff' : btnTextColor;
              return (
                <div key={`warn-${w.id}`} onClick={() => handleAlarmKlick(w.akte_id)} style={{ background: theme.cardItemBg, padding: '14px 18px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: `5px solid ${theme.warningBorder}`, boxShadow: isDarkMode ? 'none' : '0 2px 4px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: '8px' }} title="Klicken, um diese Akte unten zu fokussieren!">
                  
                  <div className="alarm-card-header">
                    <strong style={{ color: theme.warningBorder, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="folder" size={14} /> [{w.unser_zeichen || '---'}] {w.akte_gegner}
                    </strong>
                    <div className="alarm-btn-group" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => ladeVorgangInMaske(w.ganze_akte, w)} style={{ background: theme.accent, color: btnTextColor, border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }} title="Diesen Vorgang oben in die Maske laden"><Icon name="folder" size={12} /> In Maske laden</button>
                      <button onClick={() => setOpenMenuId(openMenuId === w.id ? null : w.id)} style={{ background: actionBg, color: actionColor, border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s ease' }}><Icon name="settings" size={12} /> Aktionen {openMenuId === w.id ? '▲' : '▼'}</button>
                      {openMenuId === w.id && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '5px', background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 50, minWidth: '180px', boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)' }}>
                          <button onClick={() => { if (w.isWiedervorlage) handleInlineEdit(w.id, 'wiedervorlage', null); else handleInlineEdit(w.id, 'frist_extern', null); setOpenMenuId(null); }} style={{ background: '#10b981', color: '#ffffff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textAlign: 'left', width: '100%' }}>Erledigt</button>
                          <div style={{ display: 'flex', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                            <button title="+3 Tage verschieben" onClick={() => handleTerminVerschieben(w, 3)} style={{ flex: 1, background: theme.border, color: theme.textMain, border: 'none', padding: '6px 0', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap' }}>+3</button>
                            <button title="+7 Tage verschieben" onClick={() => handleTerminVerschieben(w, 7)} style={{ flex: 1, background: theme.border, color: theme.textMain, border: 'none', padding: '6px 0', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap' }}>+7</button>
                            <button title="+14 Tage verschieben" onClick={() => handleTerminVerschieben(w, 14)} style={{ flex: 1, background: theme.border, color: theme.textMain, border: 'none', padding: '6px 0', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap' }}>+14</button>
                          </div>
                          <button onClick={() => handleNachhaken(w.akte_id)} style={{ background: 'transparent', color: theme.accent, border: `1px solid ${theme.accent}`, padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', textAlign: 'left', width: '100%' }}><Icon name="send" size={12} /> Nachhaken</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: theme.textMuted, flexWrap: 'wrap', gap: '10px' }}>
                    <span style={{ color: theme.textMain, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}><Icon name="file" size={12} /> {w.akte_thema} <span style={{opacity: 0.7}}>➔ {w.aktion || 'Vorgang ohne Titel'}</span></span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span>{w.isWiedervorlage ? 'Wiedervorlage' : 'Frist'}: <strong style={{color: theme.textMain}}>{formatDatum(w.aktivesDatum)}</strong></span>
                      {w.frist_extern && w.isWiedervorlage && <span style={{fontSize: '11px', opacity: 0.8}}>(Frist: {formatDatum(w.frist_extern)})</span>}
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: isOverdue || isDueToday ? theme.warningBorder : theme.textMain }}>{isOverdue ? `(Überfällig: ${Math.abs(w.tageUebrig)} Tage)` : isDueToday ? '(HEUTE FÄLLIG!)' : `(Noch ${w.tageUebrig} Tage)`}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {ustRadar.map((r, i) => (
              <div key={`ust-${i}`} style={{ background: theme.cardItemBg, padding: '12px 18px', borderRadius: '8px', border: `1px solid ${theme.border}`, borderLeft: `5px solid ${theme.tresorAccent}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><strong style={{ color: theme.tresorAccent }}><Icon name="folder" size={14} /> {r.firma}</strong> — <span style={{ color: theme.textMain }}>{r.bezeichnung}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}><span style={{ fontSize: '13px', color: theme.textMuted }}>Fällig am {formatDatum(r.datum)}</span><span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>(Noch {r.tageUebrig} Tage)</span></div>
              </div>
            ))}
            {complianceAlarme.map((c) => (
              <div
                key={c.key}
                style={{
                  background: theme.cardItemBg,
                  padding: '12px 18px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.border}`,
                  borderLeft: `5px solid ${complianceColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: '1 1 320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong style={{ color: complianceColor, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="alert" size={14} /> [{c.firma}] {c.title}
                    </strong>
                    <span style={{ fontSize: '11px', color: theme.textMuted }}>({c.legalBasis})</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: theme.textMain }}>{c.warningText}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: complianceColor }}>
                    Frist: {formatDatum(c.datum)} (Noch {c.tageUebrig} Tage)
                  </span>
                  <button
                    type="button"
                    disabled={creatingComplianceKey === c.key}
                    onClick={() => handleCreateComplianceWiedervorlageFromAlarm(c)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: `1px solid ${complianceColor}`,
                      background: 'transparent',
                      color: complianceColor,
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {creatingComplianceKey === c.key ? 'Lege an...' : '+ Als Wiedervorlage-Akte'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}