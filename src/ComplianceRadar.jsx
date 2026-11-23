import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import BeschlussGenerator from './BeschlussGenerator';
import {
  RECHTSFORMEN,
  WZ_BRANCHEN_KATALOG,
  HEADCOUNT_THRESHOLDS,
  RECURRING_COMPLIANCE_DEADLINES,
  calculateKSchGFTE,
  findMatchingBranches
} from './config/sonarComplianceRules';

const DEFAULT_PROFILE = {
  rechtsform: 'GmbH',
  compliance_disabled: false,
  wz_code: '70.22.0',
  wz_label: '70.22.0 – Unternehmensberatung, Management, Agentur & Verwaltung',
  wirtschafts_id: '',
  transparenzregister_nr: '',
  ihk_hwk_nr: '',
  lucid_nr: '',
  headcount_total: 0,
  headcount_parttime_20: 0,
  headcount_parttime_30: 0,
  headcount_fulltime: 0,
  uses_external_creatives: false,
  ships_physical_goods: false,
  is_hazardous_branch: false,
  befreit_181_bgb: false,
  additional_banks: [],
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
  const [wzSearchTerm, setWzSearchTerm] = useState('');
  const [savingPulse, setSavingPulse] = useState(false);
  const [creatingWiedervorlageId, setCreatingWiedervorlageId] = useState(null);

  const isDarkMode = theme?.bg === '#020617';
  const pageAccent = theme?.complianceAccent || '#f59e0b';
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

  const outlineAccentBtnStyle = {
    background: 'transparent',
    border: `1px solid ${pageAccent}`,
    color: pageAccent,
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    textAlign: 'center',
    boxSizing: 'border-box'
  };

  const outlineDangerBtnStyle = {
    background: 'transparent',
    border: `1px solid ${theme.warningBorder}`,
    color: theme.warningBorder,
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    textAlign: 'center',
    boxSizing: 'border-box'
  };

  const getSafeProfile = (m) => {
    const raw = m && typeof m.compliance_profile === 'object' && m.compliance_profile !== null
      ? m.compliance_profile
      : {};
    const rf = raw.rechtsform || 'GmbH';
    return {
      ...DEFAULT_PROFILE,
      ...raw,
      rechtsform: rf,
      compliance_disabled: rf === 'Privat' ? Boolean(raw.compliance_disabled ?? true) : Boolean(raw.compliance_disabled),
      wz_code: raw.wz_code || (rf === 'Privat' ? '00.00.0' : '70.22.0'),
      wz_label: raw.wz_label || '',
      headcount_total: Number(raw.headcount_total || 0),
      headcount_parttime_20: Number(raw.headcount_parttime_20 || 0),
      headcount_parttime_30: Number(raw.headcount_parttime_30 || 0),
      headcount_fulltime: Number(raw.headcount_fulltime || 0),
      uses_external_creatives: Boolean(raw.uses_external_creatives),
      ships_physical_goods: Boolean(raw.ships_physical_goods),
      is_hazardous_branch: Boolean(raw.is_hazardous_branch),
      befreit_181_bgb: Boolean(raw.befreit_181_bgb),
      additional_banks: Array.isArray(raw.additional_banks) ? raw.additional_banks : [],
      last_pulse_check_at: raw.last_pulse_check_at || null
    };
  };

  // Wählt beim Laden den ersten gewerblichen Mandanten (oder den ersten Eintrag überhaupt), OHNE ein Popup automatisch zu öffnen!
  useEffect(() => {
    if (mandanten && mandanten.length > 0) {
      if (!selectedMandantId || !mandanten.some((m) => String(m.id) === String(selectedMandantId))) {
        const firstActiveMandant =
          mandanten.find((m) => {
            const cp = getSafeProfile(m);
            return !cp.compliance_disabled && cp.rechtsform !== 'Privat';
          }) || mandanten[0];
        setSelectedMandantId(firstActiveMandant.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandanten]);

  const activeMandant = mandanten.find((m) => String(m.id) === String(selectedMandantId)) || mandanten[0] || null;
  const activeProfile = getSafeProfile(activeMandant);
  const activeKSchGRichtwert = calculateKSchGFTE(
    activeProfile.headcount_parttime_20,
    activeProfile.headcount_parttime_30,
    activeProfile.headcount_fulltime
  );

  const activeBranchObj =
    WZ_BRANCHEN_KATALOG.find((b) => b.code === activeProfile.wz_code) || WZ_BRANCHEN_KATALOG[1];

  // Prüft, ob die 90 Tage seit dem letzten Puls-Check abgelaufen sind (nur für dezente Hinweis-Anzeige, kein Auto-Popup)
  const isPulseCheckDue = (() => {
    if (!activeMandant || activeProfile.compliance_disabled || activeProfile.rechtsform === 'Privat') return false;
    if (!activeProfile.last_pulse_check_at) return true;
    const lastMs = new Date(activeProfile.last_pulse_check_at).getTime();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    return isNaN(lastMs) || Date.now() - lastMs > ninetyDaysMs;
  })();

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
      const matchedBranch = WZ_BRANCHEN_KATALOG.find((b) => b.code === pulseForm.wz_code);

      const updatedProfile = {
        ...getSafeProfile(pulseModalMandant),
        ...pulseForm,
        compliance_disabled: pulseForm.rechtsform === 'Privat' ? true : Boolean(pulseForm.compliance_disabled),
        wz_code: pulseForm.wz_code || '70.22.0',
        wz_label: matchedBranch ? matchedBranch.label : pulseForm.wz_code,
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
      showToast(`Compliance-Parameter für ${pulseModalMandant.firmenname} gespeichert.`, 'success');
    } catch (err) {
      showToast('Fehler beim Speichern: ' + (err.message || err), 'error');
    } finally {
      setSavingPulse(false);
    }
  };

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

      const existingOpenAkte = (akten || []).find(
        (a) =>
          a.status !== 'Erledigt' &&
          a.thema === akteThema &&
          (a.unsere_firma === activeMandant.firmenname || a.mandant_name === activeMandant.firmenname)
      );

      if (existingOpenAkte) {
        showToast('Für diese Compliance-Pflicht existiert bereits eine offene Wiedervorlage-Akte.', 'warning');
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
            unsere_firma: activeMandant.firmenname,
            unser_ansprechpartner: activeMandant.ansprechpartner || null,
            gegner_name: 'Interne Organ-Compliance / Behördenfrist',
            aktenzeichen: legalBasis,
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
          typ: 'Intern',
          kanal: 'Compliance-Radar',
          aktion: itemTitle,
          wiedervorlage: wvDate,
          brief_entwurf: `GESETZLICHE GRUNDLAGE: ${legalBasis}\n\nHAFTUNGS- & PFLICHTHINWEIS:\n${warningText}`
        }
      ]);

      if (histErr) throw new Error(histErr.message);

      await ladeDaten();
      showToast(`Als Wiedervorlage-Akte [${unserZeichen}] für ${activeMandant.firmenname} angelegt.`, 'success');
    } catch (err) {
      console.error('Fehler beim Anlegen der Compliance-Wiedervorlage:', err);
      showToast('Fehler: ' + (err.message || err), 'error');
    } finally {
      setCreatingWiedervorlageId(null);
    }
  };

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

  const pulseRichtwert = calculateKSchGFTE(
    pulseForm.headcount_parttime_20,
    pulseForm.headcount_parttime_30,
    pulseForm.headcount_fulltime
  );
  const filteredModalBranches = findMatchingBranches(wzSearchTerm);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* --- MANUELL ÖFFENBARES MODAL FÜR MITARBEITER-, BRANCHEN- & 90-TAGE-PULS-ANPASSUNG --- */}
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
              border: `1px solid ${pageAccent}`,
              borderRadius: '12px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
              textAlign: 'left',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${pageAccent}`,
                    color: pageAccent,
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}
                >
                  90-Tage-Quartals-Compliance-Puls & Parameter
                </div>
                <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px' }}>
                  Compliance-Check für „{pulseModalMandant.firmenname}“
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: theme.textMuted }}>
                  Stimmen Rechtsform, Branche und Mitarbeiterzahlen noch (Aktuell: {pulseForm.headcount_total} Mitarbeiter / Vollzeit-Richtwert: {pulseRichtwert.toFixed(2)})?
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
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePulseCheck} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* SCHALTER FÜR PRIVAT / COMPLIANCE ABWÄHLEN */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: theme.inputBg,
                  border: `1px solid ${theme.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: theme.textMain, fontWeight: 'bold', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={pulseForm.compliance_disabled || pulseForm.rechtsform === 'Privat'}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPulseForm((p) => ({
                        ...p,
                        compliance_disabled: checked
                      }));
                    }}
                  />
                  <span>Compliance-Überwachung für diesen Mandanten deaktivieren (z.B. für Privat)</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Rechtsform</label>
                  <select
                    value={pulseForm.rechtsform}
                    onChange={(e) => {
                      const rf = e.target.value;
                      setPulseForm((p) => ({
                        ...p,
                        rechtsform: rf,
                        compliance_disabled: rf === 'Privat' ? true : p.compliance_disabled,
                        wz_code: rf === 'Privat' ? '00.00.0' : p.wz_code
                      }));
                    }}
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
                  <label style={labelStyle}>Branche per Stichwort suchen</label>
                  <input
                    type="text"
                    value={wzSearchTerm}
                    onChange={(e) => {
                      const q = e.target.value;
                      setWzSearchTerm(q);
                      const matches = findMatchingBranches(q);
                      if (matches.length > 0) {
                        setPulseForm((p) => ({ ...p, wz_code: matches[0].code }));
                      }
                    }}
                    placeholder="z.B. Handwerk, Elektro, IT, Bau..."
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Amtliche Branchenkennzahl (WZ 2008)</label>
                  <select
                    value={pulseForm.wz_code}
                    onChange={(e) => setPulseForm((p) => ({ ...p, wz_code: e.target.value }))}
                    style={inputStyle}
                  >
                    {filteredModalBranches.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!pulseForm.compliance_disabled && pulseForm.rechtsform !== 'Privat' && (
                  <>
                    <div>
                      <label style={labelStyle}>Teilzeit bis 20 Std. (Faktor 0,5)</label>
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
                      <label style={labelStyle}>Teilzeit bis 30 Std. (Faktor 0,75)</label>
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
                      <label style={labelStyle}>Vollzeit über 30 Std. (Faktor 1,0)</label>
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

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Vollzeit-Richtwert nach Kündigungsschutzgesetz (§ 23 KSchG)</label>
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '12.5px',
                          backgroundColor: theme.inputBg,
                          border: `1px solid ${pulseRichtwert > 10 ? theme.warningBorder : pageAccent}`,
                          color: pulseRichtwert > 10 ? theme.warningBorder : pageAccent
                        }}
                      >
                        {pulseRichtwert.toFixed(2)} von max. 10,00 ({pulseRichtwert > 10 ? 'Kündigungsschutzgesetz aktiv' : 'Kleinbetrieb bis 10,00'})
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '8px' }}>
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
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={savingPulse}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: pageAccent,
                    color: btnTextColor,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Icon name="check" size={16} />
                  <span>{savingPulse ? 'Speichere...' : 'Parameter für 90 Tage bestätigen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- KOPFBEREICH, MANDANTEN-AUSWAHL & 90-TAGE-PULS-CHECK --- */}
      <div
        data-help="compliance_header_puls"
        style={{ ...panelStyle, border: `1px solid ${pageAccent}` }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: 0, color: theme.textMain, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icon name="alert" size={24} style={{ color: pageAccent }} />
              SONAR COMPLIANCE RADAR & BOARDROOM
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: theme.textMuted }}>
              Organhaftungs-Prävention, Branchen- & Betriebssicherheitspflichten, Mitarbeiter-Schwellenwerte und Beschluss-Generator
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%', maxWidth: 'fit-content' }}>
            <select
              value={activeMandant?.id || ''}
              onChange={(e) => setSelectedMandantId(e.target.value)}
              style={{ ...inputStyle, width: 'auto', minWidth: 'min(100%, 240px)', flex: '1 1 220px', fontWeight: 'bold' }}
            >
              {mandanten.map((m) => {
                const cp = getSafeProfile(m);
                return (
                  <option key={m.id} value={m.id}>
                    {m.firmenname} ({cp.rechtsform}{cp.compliance_disabled || cp.rechtsform === 'Privat' ? ' – Compliance aus' : ` • ${cp.headcount_total} MA`})
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
                style={isPulseCheckDue ? outlineDangerBtnStyle : outlineAccentBtnStyle}
              >
                <Icon name="settings" size={14} />
                <span>
                  {isPulseCheckDue
                    ? 'Mitarbeiter & Puls-Check anpassen (90-Tage-Check fällig)'
                    : 'Mitarbeiter & Puls-Check anpassen'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* WENN PRIVAT ODER COMPLIANCE DEAKTIVIERT IST */}
        {activeMandant && (activeProfile.compliance_disabled || activeProfile.rechtsform === 'Privat') ? (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: '8px',
              background: theme.inputBg,
              border: `1px solid ${theme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>
                Compliance-Überwachung ist für „{activeMandant.firmenname}“ ({activeProfile.rechtsform}) deaktiviert.
              </div>
              <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>
                Für private Einträge werden keine gewerblichen Behördenfristen oder Arbeitgeber-Schwellenwerte ausgelöst.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPulseModalMandant(activeMandant);
                setPulseForm(activeProfile);
              }}
              style={outlineAccentBtnStyle}
            >
              Einstellungen ändern
            </button>
          </div>
        ) : (
          activeMandant && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: `1px solid ${theme.border}`,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
                gap: '12px'
              }}
            >
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Rechtsform & Branche (WZ 2008)
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginTop: '4px' }}>
                  {activeProfile.rechtsform} | WZ {activeProfile.wz_code}
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Beschäftigte (Kopfzahl)
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginTop: '4px' }}>
                  {activeProfile.headcount_total} Mitarbeiter (inkl. Minijobs)
                </div>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: theme.inputBg,
                  border: `1px solid ${activeKSchGRichtwert > 10 ? theme.warningBorder : theme.border}`
                }}
              >
                <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Vollzeit-Richtwert (§ 23 KSchG)
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: activeKSchGRichtwert > 10 ? theme.warningBorder : pageAccent,
                    marginTop: '4px'
                  }}
                >
                  {activeKSchGRichtwert.toFixed(2)} / 10,00 ({activeKSchGRichtwert > 10 ? 'KSchG aktiv' : 'Kleinbetrieb'})
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: '11px', color: theme.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Letzter 90-Tage-Puls-Check
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain, marginTop: '4px' }}>
                  {activeProfile.last_pulse_check_at
                    ? new Date(activeProfile.last_pulse_check_at).toLocaleDateString('de-DE')
                    : 'Noch nicht bestätigt'}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* HAUPTINHALTE NUR WENN COMPLIANCE NICHT DEAKTIVIERT IST */}
      {activeMandant && !activeProfile.compliance_disabled && activeProfile.rechtsform !== 'Privat' && (
        <>
          {/* --- SEKTION 1: BRANCHENSPEZIFISCHE BETRIEBS- & PRÜFPFLICHTEN --- */}
          {activeBranchObj && activeBranchObj.specificObligations && activeBranchObj.specificObligations.length > 0 && (
            <div data-help="compliance_branchen_1" style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, color: theme.textMain, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="shield" size={18} style={{ color: pageAccent }} />
                    1. Branchen- & Betriebssicherheits-Pflichten ({activeBranchObj.label})
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: theme.textMuted }}>
                    Zuständige Berufsgenossenschaft: {activeBranchObj.bgName} | {activeBranchObj.isSchwarzArbG ? 'Branche unterliegt § 2a SchwarzArbG (Sofortmeldepflicht & Ausweismitführungspflicht)' : 'Reguläre Gewerbeaufsicht'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={creatingWiedervorlageId === `${activeMandant.id}_Branchenpflichten (${activeBranchObj.code})`}
                  onClick={() =>
                    handleCreateComplianceWiedervorlage(
                      `Branchenpflichten (${activeBranchObj.code})`,
                      '§ 14 BetrSichV, DGUV Vorschrift 3, ArbSchG',
                      activeBranchObj.specificObligations.join('\n• '),
                      null
                    )
                  }
                  style={outlineAccentBtnStyle}
                >
                  + Branchen-Prüfliste als Wiedervorlage-Akte anlegen
                </button>
              </div>

              <div style={{ padding: '14px 16px', borderRadius: '8px', background: theme.inputBg, border: `1px solid ${theme.border}` }}>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: theme.textMain, lineHeight: '1.6' }}>
                  {activeBranchObj.specificObligations.map((ob, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>
                      {ob}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* --- SEKTION 2: MITARBEITER-SCHWELLENWERT-MATRIX --- */}
          <div data-help="compliance_schwellen_2" style={panelStyle}>
            <h3 style={{ margin: '0 0 6px 0', color: theme.textMain, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="alert" size={18} style={{ color: pageAccent }} />
              2. Gesetzliche Mitarbeiter-Schwellenwerte (Arbeitgeber- & Organpflichten)
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: theme.textMuted }}>
              Zeigt alle gesetzlichen Schwellenwerte von 1 bis 50+ Mitarbeitern für „{activeMandant.firmenname}“.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {HEADCOUNT_THRESHOLDS.map((th, idx) => {
                const currentVal = th.metric === 'fte_kschg' ? activeKSchGRichtwert : Number(activeProfile.headcount_total || 0);
                const isTriggered = currentVal >= th.threshold;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${isTriggered ? pageAccent : theme.border}`,
                      borderLeft: `4px solid ${isTriggered ? pageAccent : theme.border}`,
                      background: theme.inputBg,
                      opacity: isTriggered ? 1 : 0.75
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
                            border: `1px solid ${isTriggered ? pageAccent : theme.border}`,
                            color: isTriggered ? pageAccent : theme.textMuted
                          }}
                        >
                          {isTriggered ? 'Schwelle erreicht / aktiv' : `Ab Schwelle ${th.threshold}`}
                        </span>
                        <strong style={{ fontSize: '14px', color: theme.textMain }}>{th.title}</strong>
                      </div>

                      {isTriggered && (
                        <button
                          type="button"
                          disabled={creatingWiedervorlageId === `${activeMandant.id}_${th.title}`}
                          onClick={() =>
                            handleCreateComplianceWiedervorlage(
                              th.title,
                              th.legalBasis,
                              th.obligations.join('\n• '),
                              null
                            )
                          }
                          style={outlineAccentBtnStyle}
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

          {/* --- SEKTION 3: UNTERJÄHRIGER BEHÖRDEN-, ABGABEN- & FRISTEN-TICKER --- */}
          <div data-help="compliance_ticker_3" style={panelStyle}>
            <h3 style={{ margin: '0 0 6px 0', color: theme.textMain, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="folder" size={18} style={{ color: pageAccent }} />
              3. Unterjähriger Behörden-, Abgaben- & Fristen-Ticker
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: theme.textMuted }}>
              Alle für „{activeMandant.firmenname}“ relevanten Monats- und Jahresfristen mit Countdown und 1-Klick-Wiedervorlage.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '12px' }}>
              {applicableDeadlines.map((dl) => {
                const isUrgent = dl.daysLeft <= 30;
                const lockKey = `${activeMandant.id}_${dl.title}`;

                return (
                  <div
                    key={dl.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${isUrgent ? theme.warningBorder : theme.border}`,
                      borderLeft: `4px solid ${isUrgent ? theme.warningBorder : pageAccent}`,
                      background: theme.inputBg,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: `1px solid ${isUrgent ? theme.warningBorder : pageAccent}`,
                            color: isUrgent ? theme.warningBorder : pageAccent
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
                      <div style={{ fontSize: '12px', color: theme.textMain, lineHeight: '1.45' }}>
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
                        style={isUrgent ? outlineDangerBtnStyle : outlineAccentBtnStyle}
                      >
                        {creatingWiedervorlageId === lockKey
                          ? 'Lege Akte an...'
                          : '+ Als Wiedervorlage-Akte übernehmen'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- SEKTION 4: 1-KLICK-BOARDROOM & BESCHLUSS-GENERATOR --- */}
          <div data-help="compliance_boardroom_4" style={{ width: '100%' }}>
            <BeschlussGenerator
              theme={theme}
              mandanten={mandanten}
              selectedMandantId={activeMandant.id}
              setSelectedMandantId={setSelectedMandantId}
              ladeDaten={ladeDaten}
              showToast={showToast}
            />
          </div>
        </>
      )}
    </div>
  );
}