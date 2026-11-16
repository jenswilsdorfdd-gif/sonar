import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import BeschlussGenerator from './BeschlussGenerator';
import {
  RECHTSFORMEN,
  HEADCOUNT_THRESHOLDS,
  RECURRING_COMPLIANCE_DEADLINES,
  calculateKSchGFTE
} from './config/sonarComplianceRules';

const DEFAULT_PROFILE = {
  rechtsform: 'GmbH',
  headcount_total: 0,
  headcount_parttime_20: 0,
  headcount_parttime_30: 0,
  headcount_fulltime: 0,
  uses_external_creatives: false,
  ships_physical_goods: false,
  is_hazardous_branch: false,
  befreit_181_bgb: false,
  last_pulse_check_at: null
};

export default function ComplianceRadar({
  session,
  theme,
  mandanten,
  akten,
  ladeDaten,
  showToast
}) {
  const [selectedMandantId, setSelectedMandantId] = useState('');
  const [pulseModalMandant, setPulseModalMandant] = useState(null);
  const [pulseForm, setPulseForm] = useState(DEFAULT_PROFILE);
  const [savingPulse, setSavingPulse] = useState(false);
  const [creatingWiedervorlageId, setCreatingWiedervorlageId] = useState(null);

  const isDarkMode = theme?.bg === '#020617';
  const btnTextColor = isDarkMode ? '#000000' : '#ffffff';

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    boxSizing: 'border-box',
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: theme.inputBg,
    color: theme.textMain,
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 'bold',
    color: theme.textMuted,
    marginBottom: '6px',
    textTransform: 'uppercase'
  };

  const panelStyle = {
    background: theme.cardBg,
    borderRadius: '12px',
    border: `1px solid ${theme.border}`,
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box',
    textAlign: 'left'
  };

  // Sicheres Auslesen des Compliance-Profils eines Mandanten
  const getSafeProfile = (m) => {
    const raw = m && typeof m.compliance_profile === 'object' && m.compliance_profile !== null
      ? m.compliance_profile
      : {};
    return {
      ...DEFAULT_PROFILE,
      ...raw,
      rechtsform: raw.rechtsform || 'GmbH',
      headcount_total: Number(raw.headcount_total || 0),
      headcount_parttime_20: Number(raw.headcount_parttime_20 || 0),
      headcount_parttime_30: Number(raw.headcount_parttime_30 || 0),
      headcount_fulltime: Number(raw.headcount_fulltime || 0),
      uses_external_creatives: Boolean(raw.uses_external_creatives),
      ships_physical_goods: Boolean(raw.ships_physical_goods),
      is_hazardous_branch: Boolean(raw.is_hazardous_branch),
      befreit_181_bgb: Boolean(raw.befreit_181_bgb),
      last_pulse_check_at: raw.last_pulse_check_at || null
    };
  };

  // Initialen Mandanten wählen & prüfen, ob für einen Mandanten der 90-Tage-Quartals-Puls fällig ist
  useEffect(() => {
    if (mandanten && mandanten.length > 0) {
      if (!selectedMandantId || !mandanten.some((m) => String(m.id) === String(selectedMandantId))) {
        setSelectedMandantId(mandanten[0].id);
      }

      const nowMs = Date.now();
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

      const dueMandant = mandanten.find((m) => {
        const cp = getSafeProfile(m);
        if (!cp.last_pulse_check_at) return true;
        const lastCheckMs = new Date(cp.last_pulse_check_at).getTime();
        return isNaN(lastCheckMs) || nowMs - lastCheckMs > ninetyDaysMs;
      });

      if (dueMandant && !pulseModalMandant) {
        setPulseModalMandant(dueMandant);
        setPulseForm(getSafeProfile(dueMandant));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandanten]);

  const activeMandant = mandanten.find((m) => String(m.id) === String(selectedMandantId)) || mandanten[0] || null;
  const activeProfile = getSafeProfile(activeMandant);
  const activeKSchGFTE = calculateKSchGFTE(
    activeProfile.headcount_parttime_20,
    activeProfile.headcount_parttime_30,
    activeProfile.headcount_fulltime
  );

  // Speichert das bestätigte/aktualisierte 90-Tage-Quartals-Puls-Profil
  const handleSavePulseCheck = async (e) => {
    e?.preventDefault();
    if (!pulseModalMandant) return;
    setSavingPulse(true);

    try {
      const sumParts =
        Number(pulseForm.headcount_parttime_20 || 0) +
        Number(pulseForm.headcount_parttime_30 || 0) +
        Number(pulseForm.headcount_fulltime || 0);
      const effectiveTotal = Math.max(Number(pulseForm.headcount_total || 0), sumParts);

      const updatedProfile = {
        ...pulseForm,
        headcount_total: effectiveTotal,
        headcount_parttime_20: Number(pulseForm.headcount_parttime_20 || 0),
        headcount_parttime_30: Number(pulseForm.headcount_parttime_30 || 0),
        headcount_fulltime: Number(pulseForm.headcount_fulltime || 0),
        last_pulse_check_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('mandanten')
        .update({ compliance_profile: updatedProfile })
        .eq('id', pulseModalMandant.id);

      if (error) throw new Error(error.message);

      setPulseModalMandant(null);
      await ladeDaten();
      showToast(`✅ 90-Tage-Quartals-Puls für ${pulseModalMandant.firmenname} bestätigt!`, 'success');
    } catch (err) {
      showToast('❌ Fehler beim Speichern des Puls-Checks: ' + (err.message || err), 'error');
    } finally {
      setSavingPulse(false);
    }
  };

  // Berechnet für eine wiederkehrende Frist aus RECURRING_COMPLIANCE_DEADLINES das nächste Fälligkeitsdatum und die verbleibenden Tage
  const computeNextDeadlineInfo = (deadlineRule) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    let nextDate = null;

    if (deadlineRule.cycle === 'MONTHLY') {
      if (deadlineRule.id === 'ticker_ustva_lst') {
        nextDate = new Date(currentYear, currentMonth, 10);
        if (nextDate < today) {
          nextDate = new Date(currentYear, currentMonth + 1, 10);
        }
      } else {
        // SV-Beitragsnachweis (~24. des Monats)
        nextDate = new Date(currentYear, currentMonth, 24);
        if (nextDate < today) {
          nextDate = new Date(currentYear, currentMonth + 1, 24);
        }
      }
    } else if (deadlineRule.cycle === 'YEARLY') {
      const targetMonthIdx = Number(deadlineRule.month || 1) - 1;
      const targetDay = Number(deadlineRule.day || 1);
      nextDate = new Date(currentYear, targetMonthIdx, targetDay);
      if (nextDate < today) {
        nextDate = new Date(currentYear + 1, targetMonthIdx, targetDay);
      }
    }

    if (!nextDate) return { isoDate: '', daysLeft: 999 };
    const diffDays = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    return {
      isoDate: `${yyyy}-${mm}-${dd}`,
      formattedDate: `${dd}.${mm}.${yyyy}`,
      daysLeft: diffDays
    };
  };

  // 1-Klick-Übernahme einer Compliance-Frist oder Schwellenwert-Pflicht als Wiedervorlage-Akte in akten + akten_historie
  const handleCreateComplianceWiedervorlage = async (itemTitle, legalBasis, warningText, targetDateIso) => {
    if (!activeMandant || !session?.user?.id) {
      showToast('Bitte wähle zuerst einen Mandanten aus.', 'warning');
      return;
    }

    const lockKey = `${activeMandant.id}_${itemTitle}`;
    setCreatingWiedervorlageId(lockKey);

    try {
      const uid = session.user.id;
      const wvDate = targetDateIso || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const akteThema = `Compliance-Pflicht: ${itemTitle}`;

      // Dubletten-Schutz: Prüfen, ob bereits eine offene Akte zu diesem Thema für den Mandanten existiert
      const existingOpenAkte = (akten || []).find(
        (a) =>
          a.status !== 'Erledigt' &&
          a.thema === akteThema &&
          a.mandant_name === activeMandant.firmenname
      );

      if (existingOpenAkte) {
        showToast('ℹ️ Für diese Compliance-Pflicht existiert bereits eine offene Wiedervorlage-Akte.', 'warning');
        setCreatingWiedervorlageId(null);
        return;
      }

      const kuerzel = String(activeMandant.firmenname || 'COMP')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 4)
        .toUpperCase();
      const unserZeichen = `COMP-${kuerzel}-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;

      const { data: insertedAkte, error: akteErr } = await supabase
        .from('akten')
        .insert([
          {
            user_id: uid,
            unser_zeichen: unserZeichen,
            mandant_name: activeMandant.firmenname,
            gegner_name: 'Interne Organ-Compliance / Behördenfrist',
            aktenzeichen_gegner: legalBasis,
            thema: akteThema,
            status: 'Offen'
          }
        ])
        .select()
        .single();

      if (akteErr || !insertedAkte) {
        throw new Error(akteErr?.message || 'Akte konnte nicht erstellt werden.');
      }

      const { error: histErr } = await supabase.from('akten_historie').insert([
        {
          user_id: uid,
          akte_id: insertedAkte.id,
          datum: new Date().toISOString().split('T')[0],
          typ: 'Eingang',
          kanal: 'Compliance-Radar',
          aktion: itemTitle,
          frist_extern: wvDate,
          wiedervorlage: wvDate,
          brief_entwurf: `GESETZLICHE GRUNDLAGE: ${legalBasis}\n\nHAFTUNGS- & PFLICHTHINWEIS:\n${warningText}`
        }
      ]);

      if (histErr) throw new Error(histErr.message);

      await ladeDaten();
      showToast(`✅ Als Wiedervorlage-Akte [${unserZeichen}] für ${activeMandant.firmenname} angelegt!`, 'success');
    } catch (err) {
      console.error('Fehler beim Anlegen der Compliance-Wiedervorlage:', err);
      showToast('❌ Fehler: ' + (err.message || err), 'error');
    } finally {
      setCreatingWiedervorlageId(null);
    }
  };

  // Filterung der relevanten Fristen aus RECURRING_COMPLIANCE_DEADLINES für den ausgewählten Mandanten
  const applicableDeadlines = RECURRING_COMPLIANCE_DEADLINES.filter((d) => {
    if (d.appliesTo && !d.appliesTo.includes(activeProfile.rechtsform)) return false;
    if (Number(activeProfile.headcount_total || 0) < Number(d.minHeadcount || 0)) return false;
    return true;
  })
    .map((d) => ({
      ...d,
      ...computeNextDeadlineInfo(d)
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const pulseFte = calculateKSchGFTE(
    pulseForm.headcount_parttime_20,
    pulseForm.headcount_parttime_30,
    pulseForm.headcount_fulltime
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* --- 90-TAGE-QUARTALS-PULS MODAL --- */}
      {pulseModalMandant && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.82)',
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: theme.cardBg,
              border: `2px solid ${theme.tresorAccent}`,
              borderRadius: '14px',
              maxWidth: '640px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(45, 212, 191, 0.16)',
                    color: theme.tresorAccent,
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginBottom: '6px'
                  }}
                >
                  ⏱️ 90-Tage-Quartals-Compliance-Puls
                </span>
                <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px' }}>
                  Quartals-Compliance-Check für „{pulseModalMandant.firmenname}“
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: theme.textMuted }}>
                  Stimmen deine Parameter noch (Aktuell: {pulseForm.headcount_total} Mitarbeiter / {pulseFte.toFixed(2)} KSchG-FTE)?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPulseModalMandant(null)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  color: theme.textMuted,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePulseCheck} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Rechtsform</label>
                  <select
                    value={pulseForm.rechtsform}
                    onChange={(e) => setPulseForm((p) => ({ ...p, rechtsform: e.target.value }))}
                    style={inputStyle}
                  >
                    {RECHTSFORMEN.map((rf) => (
                      <option key={rf.id} value={rf.id}>
                        {rf.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Teilzeit &lt;= 20h (0,5)</label>
                  <input
                    type="number"
                    min="0"
                    value={pulseForm.headcount_parttime_20}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value || '0', 10));
                      setPulseForm((p) => ({
                        ...p,
                        headcount_parttime_20: val,
                        headcount_total: Math.max(
                          Number(p.headcount_total || 0),
                          val + Number(p.headcount_parttime_30 || 0) + Number(p.headcount_fulltime || 0)
                        )
                      }));
                    }}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Teilzeit &lt;= 30h (0,75)</label>
                  <input
                    type="number"
                    min="0"
                    value={pulseForm.headcount_parttime_30}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value || '0', 10));
                      setPulseForm((p) => ({
                        ...p,
                        headcount_parttime_30: val,
                        headcount_total: Math.max(
                          Number(p.headcount_total || 0),
                          Number(p.headcount_parttime_20 || 0) + val + Number(p.headcount_fulltime || 0)
                        )
                      }));
                    }}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Vollzeit &gt; 30h (1,0)</label>
                  <input
                    type="number"
                    min="0"
                    value={pulseForm.headcount_fulltime}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value || '0', 10));
                      setPulseForm((p) => ({
                        ...p,
                        headcount_fulltime: val,
                        headcount_total: Math.max(
                          Number(p.headcount_total || 0),
                          Number(p.headcount_parttime_20 || 0) + Number(p.headcount_parttime_30 || 0) + val
                        )
                      }));
                    }}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Gesamtkopfzahl (inkl. Minijobs)</label>
                  <input
                    type="number"
                    min="0"
                    value={pulseForm.headcount_total}
                    onChange={(e) =>
                      setPulseForm((p) => ({
                        ...p,
                        headcount_total: Math.max(0, parseInt(e.target.value || '0', 10))
                      }))
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>KSchG-Wert (§ 23 KSchG)</label>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      border: `2px solid ${pulseFte > 10 ? '#ef4444' : '#10b981'}`,
                      color: pulseFte > 10 ? '#ef4444' : '#10b981',
                      backgroundColor: pulseFte > 10 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'
                    }}
                  >
                    {pulseFte.toFixed(2)} FTE ({pulseFte > 10 ? 'KSchG aktiv!' : '<= 10,0 FTE'})
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPulseModalMandant(null)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.border}`,
                    background: 'transparent',
                    color: theme.textMuted,
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Später erinnern
                </button>
                <button
                  type="submit"
                  disabled={savingPulse}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: theme.tresorAccent,
                    color: btnTextColor,
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {savingPulse ? 'Speichere...' : '✅ Parameter für 90 Tage bestätigen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- KOPFBEREICH & MANDANTEN-UMSCHALTER --- */}
      <div style={{ ...panelStyle, border: `1px solid ${theme.tresorAccent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, color: theme.textMain, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon name="shield" size={24} style={{ color: theme.tresorAccent }} />
              SONAR COMPLIANCE RADAR & BOARDROOM
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textMuted }}>
              Proaktive Organhaftungs-Prävention, Mitarbeiter-Schwellenwerte (KSchG / BetrVG / HinSchG), Behörden-Ticker & Gesellschafterbeschlüsse
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={activeMandant?.id || ''}
              onChange={(e) => setSelectedMandantId(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: '240px', fontWeight: 'bold' }}
            >
              {mandanten.map((m) => {
                const cp = getSafeProfile(m);
                return (
                  <option key={m.id} value={m.id}>
                    {m.firmenname} ({cp.rechtsform} • {cp.headcount_total} MA)
                  </option>
                );
              })}
            </select>

            {activeMandant && (
              <button
                type="button"
                onClick={() => {
                  setPulseModalMandant(activeMandant);
                  setPulseForm(activeProfile);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${theme.tresorAccent}`,
                  background: 'transparent',
                  color: theme.tresorAccent,
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ⚙️ Mitarbeiter & Puls-Check anpassen
              </button>
            )}
          </div>
        </div>

        {/* STATUS-LEISTE DES AKTIVEN MANDANTEN */}
        {activeMandant && (
          <div
            style={{
              marginTop: '16px',
              paddingTop: '14px',
              borderTop: `1px solid ${theme.border}`,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '12px'
            }}
          >
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>Rechtsform</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: theme.textMain, marginTop: '2px' }}>{activeProfile.rechtsform}</div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>Kopfzahl Beschäftigte</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: theme.textMain, marginTop: '2px' }}>
                {activeProfile.headcount_total} Mitarbeiter (Köpfe)
              </div>
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: activeKSchGFTE > 10 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                border: `1px solid ${activeKSchGFTE > 10 ? '#ef4444' : '#10b981'}`
              }}
            >
              <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>
                KSchG-Äquivalente (§ 23 KSchG)
              </div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: activeKSchGFTE > 10 ? '#ef4444' : '#10b981', marginTop: '2px' }}>
                {activeKSchGFTE.toFixed(2)} FTE {activeKSchGFTE > 10 ? '⚠️ KSchG AKTIV' : '✅ Kleinbetrieb'}
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}` }}>
              <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>Letzter 90-Tage-Puls</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginTop: '2px' }}>
                {activeProfile.last_pulse_check_at
                  ? new Date(activeProfile.last_pulse_check_at).toLocaleDateString('de-DE')
                  : 'Noch offen'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- SEKTION 1: MITARBEITER-SCHWELLENWERT-MATRIX (HEADCOUNT_THRESHOLDS) --- */}
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 6px 0', color: theme.textMain, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="alert" size={18} style={{ color: '#f59e0b' }} />
          1. Gesetzliche Mitarbeiter-Schwellenwert-Matrix (Arbeitgeber- & Organpflichten)
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: theme.textMuted }}>
          Zeigt alle gesetzlichen Schwellenwerte von 1 bis 50+ Mitarbeitern und markiert ausgelöste Pflichten für „{activeMandant?.firmenname || 'Mandant'}“.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {HEADCOUNT_THRESHOLDS.map((th, idx) => {
            const currentVal = th.metric === 'fte_kschg' ? activeKSchGFTE : Number(activeProfile.headcount_total || 0);
            const isTriggered = currentVal >= th.threshold;

            return (
              <div
                key={idx}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${isTriggered ? (th.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b') : theme.border}`,
                  borderLeft: `5px solid ${isTriggered ? (th.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b') : theme.border}`,
                  background: isTriggered
                    ? (isDarkMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)')
                    : theme.inputBg,
                  opacity: isTriggered ? 1 : 0.72
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        backgroundColor: isTriggered ? '#ef4444' : theme.border,
                        color: isTriggered ? '#ffffff' : theme.textMuted
                      }}
                    >
                      {isTriggered ? '🔴 SCHWELLE ERREICHT / AKTIV' : `⚪ AB SCHWELLE ${th.threshold}`}
                    </span>
                    <strong style={{ fontSize: '14px', color: theme.textMain }}>{th.title}</strong>
                  </div>

                  {isTriggered && (
                    <button
                      type="button"
                      disabled={creatingWiedervorlageId === `${activeMandant?.id}_${th.title}`}
                      onClick={() =>
                        handleCreateComplianceWiedervorlage(
                          th.title,
                          th.legalBasis,
                          th.obligations.join('\n• '),
                          null
                        )
                      }
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.accent}`,
                        background: 'transparent',
                        color: theme.accent,
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      + Als Wiedervorlage-Akte anlegen
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '8px' }}>
                  Rechtsgrundlagen: <strong>{th.legalBasis}</strong>
                </div>

                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: theme.textMain, lineHeight: '1.5' }}>
                  {th.obligations.map((ob, oIdx) => (
                    <li key={oIdx} style={{ marginBottom: '4px' }}>
                      {ob}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- SEKTION 2: UNTERJÄHRIGER BEHÖRDEN-, ABGABEN- & FRISTEN-TICKER --- */}
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 6px 0', color: theme.textMain, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="folder" size={18} style={{ color: theme.accent }} />
          2. Unterjähriger Behörden-, Abgaben- & Fristen-Ticker (Organhaftung & Pflichttermine)
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: theme.textMuted }}>
          Alle für {activeMandant?.firmenname || 'die Gesellschaft'} relevanten Monats- und Jahresfristen mit Countdown und 1-Klick-Wiedervorlage.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '12px' }}>
          {applicableDeadlines.map((dl) => {
            const isUrgent = dl.daysLeft <= 30;
            const lockKey = `${activeMandant?.id}_${dl.title}`;

            return (
              <div
                key={dl.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${isUrgent ? '#ef4444' : theme.border}`,
                  background: isUrgent
                    ? (isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)')
                    : theme.inputBg,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: isUrgent ? '#ef4444' : 'rgba(14, 165, 233, 0.18)',
                        color: isUrgent ? '#ffffff' : theme.accent
                      }}
                    >
                      {dl.cycle === 'MONTHLY' ? 'MONATLICH' : `JÄHRLICH (${dl.formattedDate})`} • NOCH {dl.daysLeft} TAGE
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>
                      Frist: {dl.formattedDate}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginBottom: '4px' }}>
                    {dl.title}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '6px' }}>
                    Rechtsnorm: {dl.legalBasis} {dl.dueRule ? `| Regel: ${dl.dueRule}` : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textMain, lineHeight: '1.4' }}>
                    {dl.warningText}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    disabled={creatingWiedervorlageId === lockKey}
                    onClick={() =>
                      handleCreateComplianceWiedervorlage(
                        dl.title,
                        dl.legalBasis,
                        dl.warningText,
                        dl.isoDate
                      )
                    }
                    style={{
                      padding: '7px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isUrgent ? '#ef4444' : theme.accent,
                      color: isUrgent ? '#ffffff' : btnTextColor,
                      fontSize: '11.5px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {creatingWiedervorlageId === lockKey
                      ? '⏳ Lege Akte an...'
                      : '📌 1-Klick-Übernahme als Wiedervorlage-Akte'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- SEKTION 3: 1-KLICK-BOARDROOM & GESELLSCHAFTERBESCHLUSS-GENERATOR --- */}
      <BeschlussGenerator
        theme={theme}
        mandanten={mandanten}
        selectedMandantId={activeMandant?.id || ''}
        setSelectedMandantId={setSelectedMandantId}
        ladeDaten={ladeDaten}
        showToast={showToast}
      />
    </div>
  );
}