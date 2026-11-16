import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { syncToGithub, extractFilename, cleanVal } from './utils';
import {
  RECHTSFORMEN,
  REQUIRED_VAULT_DOCUMENTS,
  WZ_BRANCHEN_KATALOG,
  calculateKSchGFTE,
  findMatchingBranches
} from './config/sonarComplianceRules';

const OWNER_USER_ID = 'ea175141-2c03-4f93-ba1b-392570229cb2';
const OWNER_DEFAULT_FAX = '035185074535';

const DEFAULT_COMPLIANCE_PROFILE = {
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

export default function FirmenTresor({ session, theme, mandanten, ladeDaten, showToast, suchbegriff }) {
  const isOwnerUser = session?.user?.id === OWNER_USER_ID;

  const [laedt, setLaedt] = useState(false);
  const [uploadingMandantId, setUploadingMandantId] = useState(null);
  const [editMandantId, setEditMandantId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // Welches fehlende Pflichtdokument im Formular bzw. in der Mandantenliste gerade per Klick aufgeklappt ist
  const [selectedMissingDocId, setSelectedMissingDocId] = useState(null);
  const [expandedRowMissingDoc, setExpandedRowMissingDoc] = useState({});

  // 1. Allgemeine Kontaktdaten
  const [m_firmenname, setM_firmenname] = useState('');
  const [m_ansprechpartner, setM_ansprechpartner] = useState('');
  const [m_adresse, setM_adresse] = useState('');
  const [m_telefon, setM_telefon] = useState('');
  const [m_fax, setM_fax] = useState(isOwnerUser ? OWNER_DEFAULT_FAX : '');
  const [m_email, setM_email] = useState('');

  // 2. Gewerbe-, Register- & Steuernummern
  const [m_steuernummer, setM_steuernummer] = useState('');
  const [m_ust_id, setM_ust_id] = useState('');
  const [m_wirtschafts_id, setM_wirtschafts_id] = useState('');
  const [m_betriebsnummer, setM_betriebsnummer] = useState('');
  const [m_vbg_nummer, setM_vbg_nummer] = useState('');
  const [m_handelsregister, setM_handelsregister] = useState('');
  const [m_transparenzregister_nr, setM_transparenzregister_nr] = useState('');
  const [m_ihk_hwk_nr, setM_ihk_hwk_nr] = useState('');
  const [m_lucid_nr, setM_lucid_nr] = useState('');
  const [m_ust_intervall, setM_ust_intervall] = useState('Vierteljährlich');
  const [m_dauerfrist, setM_dauerfrist] = useState(false);

  // 3. Bankverbindungen (Hauptkonto + beliebig viele weitere Bankverbindungen)
  const [m_iban, setM_iban] = useState('');
  const [m_bank_name, setM_bank_name] = useState('');
  const [m_additional_banks, setM_additional_banks] = useState([]);

  // 4. Compliance-, Branchen- & Mitarbeiter-Profil
  const [m_rechtsform, setM_rechtsform] = useState('GmbH');
  const [m_compliance_disabled, setM_compliance_disabled] = useState(false);
  const [m_wz_code, setM_wz_code] = useState('70.22.0');
  const [m_wz_search, setM_wz_search] = useState('');
  const [m_headcount_total, setM_headcount_total] = useState(0);
  const [m_headcount_parttime_20, setM_headcount_parttime_20] = useState(0);
  const [m_headcount_parttime_30, setM_headcount_parttime_30] = useState(0);
  const [m_headcount_fulltime, setM_headcount_fulltime] = useState(0);
  const [m_uses_external_creatives, setM_uses_external_creatives] = useState(false);
  const [m_ships_physical_goods, setM_ships_physical_goods] = useState(false);
  const [m_is_hazardous_branch, setM_is_hazardous_branch] = useState(false);
  const [m_befreit_181_bgb, setM_befreit_181_bgb] = useState(false);
  const [m_last_pulse_check_at, setM_last_pulse_check_at] = useState(null);

  // Neue Dateien vor dem Upload + zugehörige Beschriftungen
  const [m_dateien, setM_dateien] = useState([]);
  const [m_dateien_labels, setM_dateien_labels] = useState([]);

  // Bereits beim Mandanten gespeicherte Dokumente [{ cleanUrl, label, rawEntry }]
  const [m_existing_docs, setM_existing_docs] = useState([]);

  const isDarkMode = theme.bg === '#020617';
  const btnTextColor = isDarkMode ? '#000' : '#ffffff';

  const inputStyle = {
    width: '100%',
    padding: '12px',
    boxSizing: 'border-box',
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: theme.inputBg,
    color: theme.textMain,
    outline: 'none'
  };
  const labelStyle = {
    display: 'block',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 'bold',
    color: theme.textMuted,
    marginBottom: '6px',
    textTransform: 'uppercase'
  };
  const h4StyleTresor = {
    margin: '0',
    color: theme.textMain,
    borderBottom: `1px solid ${theme.border}`,
    paddingBottom: '8px',
    fontSize: '16px',
    fontWeight: '600'
  };
  const panelStyle = {
    background: theme.cardBg,
    borderRadius: '12px',
    border: `1px solid ${theme.border}`,
    padding: '20px',
    width: '100%',
    wordBreak: 'break-word',
    boxSizing: 'border-box'
  };

  // Einheitlicher Button-Stil analog zu "Mandant aus Tresor löschen"
  const outlineDangerBtnStyle = {
    background: 'transparent',
    border: `1px solid ${theme.warningBorder}`,
    color: theme.warningBorder,
    padding: '10px 14px',
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

  const outlineAccentBtnStyle = {
    background: 'transparent',
    border: `1px solid ${theme.tresorAccent}`,
    color: theme.tresorAccent,
    padding: '10px 14px',
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

  const listGrid = '2.5fr 2fr 3fr 2.5fr 50px';

  // Liest das compliance_profile eines Mandanten sicher mit Fallbacks aus
  const getSafeComplianceProfile = (m) => {
    const raw = m && typeof m.compliance_profile === 'object' && m.compliance_profile !== null
      ? m.compliance_profile
      : {};
    const rf = raw.rechtsform || 'GmbH';
    return {
      ...DEFAULT_COMPLIANCE_PROFILE,
      ...raw,
      rechtsform: rf,
      compliance_disabled: rf === 'Privat' ? Boolean(raw.compliance_disabled ?? true) : Boolean(raw.compliance_disabled),
      wz_code: raw.wz_code || (rf === 'Privat' ? '00.00.0' : '70.22.0'),
      wz_label: raw.wz_label || '',
      wirtschafts_id: cleanVal(raw.wirtschafts_id) || '',
      transparenzregister_nr: cleanVal(raw.transparenzregister_nr) || '',
      ihk_hwk_nr: cleanVal(raw.ihk_hwk_nr) || '',
      lucid_nr: cleanVal(raw.lucid_nr) || '',
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

  const getCleanDefaultLabel = (filenameOrUrl) => {
    const rawFile = extractFilename(String(filenameOrUrl || '').split('#')[0]);
    const withoutPrefix = rawFile.replace(/^(m|h)_\d+_/, '');
    const withoutExt = withoutPrefix.replace(/\.[^/.]+$/, '');
    return withoutExt.replace(/_/g, ' ').trim() || rawFile;
  };

  const parseDocEntry = (rawUrlStr) => {
    const str = String(rawUrlStr || '').trim();
    if (!str) return { cleanUrl: '', label: 'Dokument', rawEntry: '' };
    const [cleanUrl, hashPart] = str.split('#');
    let customLabel = '';
    if (hashPart && hashPart.startsWith('label=')) {
      try {
        customLabel = decodeURIComponent(hashPart.replace(/^label=/, '')).trim();
      } catch (_e) {
        customLabel = hashPart.replace(/^label=/, '').trim();
      }
    }
    const fallbackLabel = getCleanDefaultLabel(cleanUrl);
    return {
      cleanUrl,
      label: customLabel || fallbackLabel,
      rawEntry: str
    };
  };

  const buildDocUrlWithLabel = (cleanUrl, labelText) => {
    const base = String(cleanUrl || '').split('#')[0].trim();
    const cleanLabel = String(labelText || '').trim();
    if (!cleanLabel) return base;
    return `${base}#label=${encodeURIComponent(cleanLabel)}`;
  };

  // Prüft für eine Rechtsform + Mitarbeiterzahl alle relevanten Pflichtdokumente
  const evaluateVaultCompliance = (rechtsform, headcountTotal, parsedDocsList, complianceDisabled = false) => {
    if (complianceDisabled || rechtsform === 'Privat') {
      return {
        requiredList: [],
        missingList: [],
        presentCount: 0,
        totalRequired: 0,
        allComplete: true
      };
    }

    const rf = rechtsform || 'GmbH';
    const hc = Number(headcountTotal || 0);
    const docs = Array.isArray(parsedDocsList) ? parsedDocsList : [];

    const requiredDocs = REQUIRED_VAULT_DOCUMENTS.filter(
      (reqDoc) => reqDoc.appliesTo.includes(rf) && hc >= Number(reqDoc.minHeadcount || 0)
    );

    const results = requiredDocs.map((reqDoc) => {
      const targetHashLow = String(reqDoc.labelHash || '').toLowerCase();
      const matchedDoc = docs.find((d) => {
        const lblLow = String(d.label || '').toLowerCase();
        const rawLow = String(d.rawEntry || '').toLowerCase();
        return (
          lblLow === targetHashLow ||
          lblLow.includes(targetHashLow) ||
          rawLow.includes(`#label=${encodeURIComponent(reqDoc.labelHash).toLowerCase()}`) ||
          rawLow.includes(`#label=${targetHashLow}`)
        );
      });
      return {
        ...reqDoc,
        isPresent: Boolean(matchedDoc),
        matchedDoc: matchedDoc || null
      };
    });

    const missingList = results.filter((r) => !r.isPresent);
    const presentCount = results.filter((r) => r.isPresent).length;
    return {
      requiredList: results,
      missingList,
      presentCount,
      totalRequired: results.length,
      allComplete: missingList.length === 0
    };
  };

  const findUnloeschbarRuleForDoc = (docLabel) => {
    const lblLow = String(docLabel || '').toLowerCase();
    if (!lblLow) return null;
    const ruleMatch = REQUIRED_VAULT_DOCUMENTS.find(
      (reqDoc) =>
        reqDoc.unloeschbar &&
        (lblLow === reqDoc.labelHash.toLowerCase() || lblLow.includes(reqDoc.labelHash.toLowerCase()))
    );
    if (ruleMatch) return ruleMatch;
    if (lblLow.includes('gesellschafterbeschluss')) {
      return {
        title: 'Gesellschafterbeschluss (Boardroom-Archiv)',
        legalBasis: '§ 48 Abs. 3 GmbHG, § 8 Abs. 3 Satz 2 KStG',
        riskWarning: 'UNLÖSCHBARES ORGAN-DOKUMENT: Gesellschafterbeschlüsse dienen als zwingender Nachweis gegenüber Finanzamt (vGA-Abwehr) und Insolvenzverwalter!'
      };
    }
    return null;
  };

  const gefilterteMandanten = mandanten.filter((m) => {
    if (!suchbegriff || !suchbegriff.trim()) return true;
    const s = suchbegriff.toLowerCase();
    const cp = getSafeComplianceProfile(m);
    const fName = (m.firmenname || '').toLowerCase();
    const ans = (m.ansprechpartner || '').toLowerCase();
    const mail = (m.email || '').toLowerCase();
    const adr = (m.adresse || '').toLowerCase();
    const fx = (m.fax || '').toLowerCase();
    const extraNums = `${cp.wirtschafts_id} ${cp.transparenzregister_nr} ${cp.ihk_hwk_nr} ${cp.lucid_nr} ${cp.wz_code}`.toLowerCase();
    const docsText = (m.dokument_url || '')
      .split(',')
      .filter(Boolean)
      .map((u) => parseDocEntry(u).label.toLowerCase())
      .join(' ');
    return (
      fName.includes(s) ||
      ans.includes(s) ||
      mail.includes(s) ||
      adr.includes(s) ||
      fx.includes(s) ||
      extraNums.includes(s) ||
      docsText.includes(s)
    );
  });

  const ladeInFormularMandant = (m) => {
    setEditMandantId(m.id);
    setM_firmenname(cleanVal(m.firmenname) || '');
    setM_ansprechpartner(cleanVal(m.ansprechpartner) || '');
    setM_adresse(cleanVal(m.adresse) || '');
    setM_telefon(cleanVal(m.telefon) || '');
    setM_fax(cleanVal(m.fax) || (isOwnerUser ? OWNER_DEFAULT_FAX : ''));
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

    const cp = getSafeComplianceProfile(m);
    setM_rechtsform(cp.rechtsform);
    setM_compliance_disabled(cp.compliance_disabled);
    setM_wz_code(cp.wz_code);
    setM_wirtschafts_id(cp.wirtschafts_id);
    setM_transparenzregister_nr(cp.transparenzregister_nr);
    setM_ihk_hwk_nr(cp.ihk_hwk_nr);
    setM_lucid_nr(cp.lucid_nr);
    setM_headcount_total(cp.headcount_total);
    setM_headcount_parttime_20(cp.headcount_parttime_20);
    setM_headcount_parttime_30(cp.headcount_parttime_30);
    setM_headcount_fulltime(cp.headcount_fulltime);
    setM_uses_external_creatives(cp.uses_external_creatives);
    setM_ships_physical_goods(cp.ships_physical_goods);
    setM_is_hazardous_branch(cp.is_hazardous_branch);
    setM_befreit_181_bgb(cp.befreit_181_bgb);
    setM_additional_banks(cp.additional_banks);
    setM_last_pulse_check_at(cp.last_pulse_check_at);
    setSelectedMissingDocId(null);

    if (m.dokument_url) {
      const parsedList = m.dokument_url
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean)
        .map((u) => parseDocEntry(u));
      setM_existing_docs(parsedList);
    } else {
      setM_existing_docs([]);
    }

    setM_dateien([]);
    setM_dateien_labels([]);
    if (document.getElementById('tresor-datei-upload')) document.getElementById('tresor-datei-upload').value = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetMandantForm = () => {
    setEditMandantId(null);
    setM_firmenname('');
    setM_ansprechpartner('');
    setM_adresse('');
    setM_telefon('');
    setM_fax(isOwnerUser ? OWNER_DEFAULT_FAX : '');
    setM_email('');
    setM_steuernummer('');
    setM_ust_id('');
    setM_wirtschafts_id('');
    setM_betriebsnummer('');
    setM_vbg_nummer('');
    setM_handelsregister('');
    setM_transparenzregister_nr('');
    setM_ihk_hwk_nr('');
    setM_lucid_nr('');
    setM_iban('');
    setM_bank_name('');
    setM_additional_banks([]);
    setM_ust_intervall('Vierteljährlich');
    setM_dauerfrist(false);
    setM_rechtsform('GmbH');
    setM_compliance_disabled(false);
    setM_wz_code('70.22.0');
    setM_wz_search('');
    setM_headcount_total(0);
    setM_headcount_parttime_20(0);
    setM_headcount_parttime_30(0);
    setM_headcount_fulltime(0);
    setM_uses_external_creatives(false);
    setM_ships_physical_goods(false);
    setM_is_hazardous_branch(false);
    setM_befreit_181_bgb(false);
    setM_last_pulse_check_at(null);
    setSelectedMissingDocId(null);
    setM_dateien([]);
    setM_dateien_labels([]);
    setM_existing_docs([]);
    if (document.getElementById('tresor-datei-upload')) document.getElementById('tresor-datei-upload').value = '';
  };

  // Weitere Bankverbindung hinzufügen / bearbeiten / löschen
  const handleAddBankAccount = () => {
    setM_additional_banks((prev) => [...prev, { bank_name: '', iban: '', note: '' }]);
  };

  const handleUpdateBankAccount = (idx, field, value) => {
    setM_additional_banks((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveBankAccount = (idx) => {
    setM_additional_banks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleNeuerDateiUploadSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setM_dateien(selectedFiles);
    setM_dateien_labels(selectedFiles.map((f) => getCleanDefaultLabel(f.name)));
  };

  const handleTargetedLabelUpload = async (mId, currentUrls, requiredLabelHash, e) => {
    const file = e.target.files?.[0];
    if (!file || !mId) return;

    setUploadingMandantId(mId);
    const matchMandant = mandanten.find((x) => x.id === mId);
    const fName = matchMandant ? matchMandant.firmenname : (m_firmenname || 'Allgemein');

    try {
      const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const dateiName = `m_${Date.now()}_${sichererDateiname}`;
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file);

      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        const newUrlWithLabel = buildDocUrlWithLabel(linkData.publicUrl, requiredLabelHash);
        const updatedUrls = currentUrls ? `${currentUrls},${newUrlWithLabel}` : newUrlWithLabel;

        await supabase.from('mandanten').update({ dokument_url: updatedUrls }).eq('id', mId);
        await syncToGithub(
          `${requiredLabelHash}_${sichererDateiname}.md`,
          `Pflichtdokument (${requiredLabelHash}) für ${fName}`,
          linkData.publicUrl,
          'tresor_pflicht_doc',
          showToast
        );

        if (editMandantId === mId) {
          setM_existing_docs((prev) => [...prev, parseDocEntry(newUrlWithLabel)]);
        }

        setSelectedMissingDocId(null);
        ladeDaten();
        showToast(`Pflichtdokument mit Label "${requiredLabelHash}" im Tresor gesichert.`, 'success');
      } else {
        showToast('Fehler beim Upload: ' + uploadError.message, 'error');
      }
    } catch (err) {
      showToast('Upload-Fehler: ' + (err.message || err), 'error');
    } finally {
      setUploadingMandantId(null);
      e.target.value = '';
    }
  };

  const speichereMandant = async (e) => {
    e.preventDefault();
    setLaedt(true);

    let alleUrls = [];
    if (m_dateien && m_dateien.length > 0) {
      for (let i = 0; i < m_dateien.length; i++) {
        const f = m_dateien[i];
        const customLabel = (m_dateien_labels[i] || '').trim() || getCleanDefaultLabel(f.name);
        const isMd = f.name.toLowerCase().endsWith('.md');

        if (isMd) {
          const mdInhalt = await f.text();
          const baseInfo = `Stammdokument (${customLabel}) aus Firmen-Tresor. Firma: ${m_firmenname}`;
          await supabase.from('wissensdatenbank').insert([
            {
              datei_name: `${customLabel} (${f.name})`,
              firma: m_firmenname || 'Allgemein',
              inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`,
              dokument_url: null
            }
          ]);
          await syncToGithub(f.name, mdInhalt, null, null, showToast);
        } else {
          const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const dateiName = `m_${Date.now()}_${i}_${sichererDateiname}`;
          const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, f);
          if (!uploadError) {
            const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
            const labeledUrl = buildDocUrlWithLabel(linkData.publicUrl, customLabel);
            alleUrls.push(labeledUrl);
          }
        }
      }
    }

    const existingUrlsWithUpdatedLabels = m_existing_docs
      .filter((d) => d && d.cleanUrl)
      .map((d) => buildDocUrlWithLabel(d.cleanUrl, d.label));

    const combinedUrlArray = [...existingUrlsWithUpdatedLabels, ...alleUrls];
    const finalDocs = combinedUrlArray.length > 0 ? combinedUrlArray.join(',') : null;

    const computedSumHeadcount =
      Number(m_headcount_parttime_20 || 0) +
      Number(m_headcount_parttime_30 || 0) +
      Number(m_headcount_fulltime || 0);
    const effectiveTotalHeadcount = Math.max(Number(m_headcount_total || 0), computedSumHeadcount);

    const matchedBranchObj = WZ_BRANCHEN_KATALOG.find((b) => b.code === m_wz_code);
    const cleanAdditionalBanks = (m_additional_banks || []).filter(
      (b) => (b.iban && b.iban.trim()) || (b.bank_name && b.bank_name.trim())
    );

    const updatedComplianceProfile = {
      rechtsform: m_rechtsform || 'GmbH',
      compliance_disabled: m_rechtsform === 'Privat' ? true : Boolean(m_compliance_disabled),
      wz_code: m_wz_code || '70.22.0',
      wz_label: matchedBranchObj ? matchedBranchObj.label : m_wz_code,
      wirtschafts_id: m_wirtschafts_id.trim(),
      transparenzregister_nr: m_transparenzregister_nr.trim(),
      ihk_hwk_nr: m_ihk_hwk_nr.trim(),
      lucid_nr: m_lucid_nr.trim(),
      headcount_total: effectiveTotalHeadcount,
      headcount_parttime_20: Number(m_headcount_parttime_20 || 0),
      headcount_parttime_30: Number(m_headcount_parttime_30 || 0),
      headcount_fulltime: Number(m_headcount_fulltime || 0),
      uses_external_creatives: Boolean(m_uses_external_creatives),
      ships_physical_goods: Boolean(m_ships_physical_goods),
      is_hazardous_branch: Boolean(m_is_hazardous_branch),
      befreit_181_bgb: Boolean(m_befreit_181_bgb),
      additional_banks: cleanAdditionalBanks,
      last_pulse_check_at: m_last_pulse_check_at || new Date().toISOString()
    };

    const payload = {
      user_id: session.user.id,
      firmenname: m_firmenname,
      ansprechpartner: m_ansprechpartner,
      adresse: m_adresse,
      telefon: m_telefon,
      fax: m_fax,
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
      dokument_url: finalDocs,
      compliance_profile: updatedComplianceProfile
    };

    if (editMandantId) {
      await supabase.from('mandanten').update(payload).eq('id', editMandantId);
      showToast('Änderungen im Firmen-Tresor gespeichert.', 'success');
    } else {
      await supabase.from('mandanten').insert([payload]);
      showToast('Neuer Mandant im Firmen-Tresor angelegt.', 'success');
    }
    resetMandantForm();
    ladeDaten();
    setLaedt(false);
  };

  const loescheMandant = async (id) => {
    if (!window.confirm('Firma komplett aus dem Tresor löschen?')) return;
    await supabase.from('mandanten').delete().eq('id', id);
    ladeDaten();
    showToast('Firma aus Tresor gelöscht.', 'success');
  };

  const handleNachtragUploadMandant = async (mId, currentUrls, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const defaultLabel = getCleanDefaultLabel(file.name);
    const inputLabel = window.prompt(
      'Wie soll dieses Stammdokument beschriftet werden (z.B. "Gewerbeanmeldung", "Handelsregisterauszug", "Stammkapital-Einzahlungsnachweis")?',
      defaultLabel
    );
    const chosenLabel = inputLabel !== null && inputLabel.trim() !== '' ? inputLabel.trim() : defaultLabel;

    setUploadingMandantId(mId);

    const isMd = file.name.toLowerCase().endsWith('.md');
    const matchMandant = mandanten.find((x) => x.id === mId);
    const fName = matchMandant ? matchMandant.firmenname : 'Allgemein';

    if (isMd) {
      const mdInhalt = await file.text();
      const baseInfo = `Nachträgliches Stammdokument (${chosenLabel}). Firma: ${fName}`;
      await supabase.from('wissensdatenbank').insert([
        {
          datei_name: `${chosenLabel} (${file.name})`,
          firma: fName,
          inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`,
          dokument_url: null
        }
      ]);
      await syncToGithub(file.name, mdInhalt, null, null, showToast);
      ladeDaten();
      showToast(`Stammdokument "${chosenLabel}" angehängt.`, 'success');
    } else {
      const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const dateiName = `m_${Date.now()}_${sichererDateiname}`;
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file);
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        const newUrlWithLabel = buildDocUrlWithLabel(linkData.publicUrl, chosenLabel);
        const updatedUrls = currentUrls ? `${currentUrls},${newUrlWithLabel}` : newUrlWithLabel;
        await supabase.from('mandanten').update({ dokument_url: updatedUrls }).eq('id', mId);

        if (editMandantId === mId) {
          setM_existing_docs((prev) => [...prev, parseDocEntry(newUrlWithLabel)]);
        }

        ladeDaten();
        showToast(`Stammdokument "${chosenLabel}" angehängt.`, 'success');
      } else {
        showToast('Fehler beim Upload: ' + uploadError.message, 'error');
      }
    }
    setUploadingMandantId(null);
    e.target.value = '';
  };

  const loescheDateiAusMandant = async (mId, aktuelleUrls, urlZumLoeschen) => {
    const cleanTarget = String(urlZumLoeschen || '').split('#')[0].trim();
    const urlArray = (aktuelleUrls || '')
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    const targetEntryRaw = urlArray.find((u) => String(u).split('#')[0].trim() === cleanTarget);
    const parsedTarget = targetEntryRaw ? parseDocEntry(targetEntryRaw) : { label: '' };

    const unloeschbarRule = findUnloeschbarRuleForDoc(parsedTarget.label);
    if (unloeschbarRule) {
      const confirmWord = window.prompt(
        `GESETZLICHE LÖSCH-SPERRE (${unloeschbarRule.title} | ${unloeschbarRule.legalBasis}):\n\n` +
          `${unloeschbarRule.riskWarning}\n\n` +
          `Um dieses Dokument dennoch unwiderruflich aus dem Tresor zu entfernen, tippe bitte exakt das Wort LOESCHEN ein:`
      );
      if (confirmWord !== 'LOESCHEN') {
        showToast('Löschvorgang abgebrochen – Pflichtdokument bleibt geschützt im Tresor.', 'warning');
        return;
      }
    } else {
      if (!window.confirm('Diese Datei wirklich aus dem Firmen-Profil entfernen?')) return;
    }

    const neueUrls = urlArray.filter((url) => String(url).split('#')[0].trim() !== cleanTarget);
    const neuerUrlString = neueUrls.length > 0 ? neueUrls.join(',') : null;
    const { error: dbError } = await supabase.from('mandanten').update({ dokument_url: neuerUrlString }).eq('id', mId);
    if (!dbError) {
      try {
        const parts = decodeURIComponent(cleanTarget).split('/');
        const fileName = parts[parts.length - 1];
        await supabase.storage.from('dokumente').remove([fileName]);
      } catch (_e) {}
      if (editMandantId === mId) {
        setM_existing_docs((prev) => prev.filter((d) => d.cleanUrl !== cleanTarget));
      }
      ladeDaten();
      showToast('Datei erfolgreich aus Tresor entfernt.', 'success');
    } else {
      showToast('Fehler beim Entfernen der Datei: ' + dbError.message, 'error');
    }
  };

  // Live-Berechnung des Vollzeit-Richtwerts nach § 23 KSchG
  const currentFormKSchGRichtwert = calculateKSchGFTE(
    m_headcount_parttime_20,
    m_headcount_parttime_30,
    m_headcount_fulltime
  );
  const isFormKSchGTriggered = currentFormKSchGRichtwert > 10.0;

  // Live-Soll/Ist-Abgleich für das aktuelle Formular
  const currentFormVaultEval = evaluateVaultCompliance(
    m_rechtsform,
    Math.max(
      Number(m_headcount_total || 0),
      Number(m_headcount_parttime_20 || 0) + Number(m_headcount_parttime_30 || 0) + Number(m_headcount_fulltime || 0)
    ),
    m_existing_docs,
    m_rechtsform === 'Privat' || m_compliance_disabled
  );

  const selectedMissingDocObj = currentFormVaultEval.missingList.find((d) => d.id === selectedMissingDocId) || null;
  const filteredBranches = findMatchingBranches(m_wz_search);

  return (
    <div>
      <style>{`
        .tresor-desktop-only {
          display: initial;
        }
        .tresor-mobile-only {
          display: none !important;
        }
        .tresor-desktop-header {
          display: grid;
          grid-template-columns: ${listGrid};
          gap: 15px;
          padding: 15px 20px;
          font-weight: bold;
          font-size: 12px;
          text-transform: uppercase;
          text-align: left;
        }
        .tresor-main-row {
          display: grid;
          grid-template-columns: ${listGrid};
          gap: 15px;
          align-items: center;
          width: 100%;
        }
        .tresor-expanded-grid {
          display: grid;
          grid-template-columns: 2.5fr 3fr 2.5fr auto;
          gap: 20px;
          align-items: start;
        }

        @media (max-width: 768px) {
          .tresor-desktop-only {
            display: none !important;
          }
          .tresor-mobile-only {
            display: flex !important;
          }
          .tresor-desktop-header {
            display: none !important;
          }
          .tresor-main-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 8px !important;
          }
          .tresor-mobile-top {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
          }
          .tresor-expanded-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          .tresor-expanded-grid > div {
            width: 100% !important;
          }
          .tresor-delete-btn {
            width: 100% !important;
            justify-content: center !important;
            min-height: 42px !important;
          }
        }
      `}</style>

      <h2 style={{ margin: '0 0 20px 0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
        <Icon name="building" size={24} style={{ color: theme.tresorAccent }} />
        {editMandantId ? 'Firma / Person im Tresor bearbeiten' : 'Neuer Mandant / Firma im Tresor'}
      </h2>

      <form onSubmit={speichereMandant} style={{ ...panelStyle, marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '20px', textAlign: 'left' }}>
          
          {/* 1. ALLGEMEINE KONTAKTDATEN */}
          <div style={{ gridColumn: '1 / -1' }}>
            <h4 style={h4StyleTresor}>1. Allgemeine Kontaktdaten & Rechtsform</h4>
          </div>

          <div>
            <label style={labelStyle}>Firma / Name*</label>
            <input required value={m_firmenname} onChange={(e) => setM_firmenname(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Rechtsform*</label>
            <select
              value={m_rechtsform}
              onChange={(e) => {
                const val = e.target.value;
                setM_rechtsform(val);
                if (val === 'Privat') {
                  setM_compliance_disabled(true);
                  setM_wz_code('00.00.0');
                } else {
                  setM_compliance_disabled(false);
                }
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
            <label style={labelStyle}>
              {m_rechtsform === 'Einzelunternehmen' || m_rechtsform === 'e.K.'
                ? 'Geschäftsinhaber / Ansprechpartner'
                : m_rechtsform === 'Privat'
                ? 'Vor- und Nachname'
                : 'Geschäftsführer / Ansprechpartner'}
            </label>
            <input value={m_ansprechpartner} onChange={(e) => setM_ansprechpartner(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Adresse (Sitz / Zustellanschrift)</label>
            <input value={m_adresse} onChange={(e) => setM_adresse(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Telefon</label>
            <input value={m_telefon} onChange={(e) => setM_telefon(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Faxnummer</label>
            <input value={m_fax} onChange={(e) => setM_fax(e.target.value)} placeholder="z.B. 035185074535" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>E-Mail</label>
            <input value={m_email} onChange={(e) => setM_email(e.target.value)} style={inputStyle} />
          </div>

          {/* 2. STEUER-, REGISTER- & GEWERBETECHNISCHE NUMMERN */}
          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
            <h4 style={h4StyleTresor}>2. Steuer-, Register- & Gewerbe-Identifikationsnummern</h4>
          </div>

          <div>
            <label style={labelStyle}>Steuernummer (Finanzamt)</label>
            <input value={m_steuernummer} onChange={(e) => setM_steuernummer(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Umsatzsteuer-IdNr. (§ 27a UStG)</label>
            <input value={m_ust_id} onChange={(e) => setM_ust_id(e.target.value)} placeholder="z.B. DE123456789" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Wirtschafts-IdNr. (§ 139c AO)</label>
            <input value={m_wirtschafts_id} onChange={(e) => setM_wirtschafts_id(e.target.value)} placeholder="z.B. DE123456789-00001" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>USt-Voranmeldungs-Intervall</label>
            <select value={m_ust_intervall} onChange={(e) => setM_ust_intervall(e.target.value)} style={inputStyle}>
              <option value="Monatlich">Monatlich</option>
              <option value="Vierteljährlich">Vierteljährlich</option>
              <option value="Jährlich">Jährlich (Keine Voranmeldung)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Dauerfristverlängerung (DFV)</label>
            <select value={m_dauerfrist ? 'true' : 'false'} onChange={(e) => setM_dauerfrist(e.target.value === 'true')} style={inputStyle}>
              <option value="false">Nein</option>
              <option value="true">Ja (+1 Monat Frist)</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Handels-/Gesellschaftsregister</label>
            <input value={m_handelsregister} onChange={(e) => setM_handelsregister(e.target.value)} placeholder="z.B. AG Dresden HRB 43220" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Transparenzregister-Nummer</label>
            <input value={m_transparenzregister_nr} onChange={(e) => setM_transparenzregister_nr(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Betriebsnummer (Agentur für Arbeit)</label>
            <input value={m_betriebsnummer} onChange={(e) => setM_betriebsnummer(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>BG-Mitgliedsnummer (VBG / BG BAU etc.)</label>
            <input value={m_vbg_nummer} onChange={(e) => setM_vbg_nummer(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>IHK- / Handwerkskammer-Nr.</label>
            <input value={m_ihk_hwk_nr} onChange={(e) => setM_ihk_hwk_nr(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>LUCID-Verpackungsregister-Nr.</label>
            <input value={m_lucid_nr} onChange={(e) => setM_lucid_nr(e.target.value)} placeholder="z.B. DE1234567890123" style={inputStyle} />
          </div>

          {/* WZ-2008 BRANCHENKENNZAHL-AUSWAHL & SUCHHILFE */}
          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '15px' }}>
            <div>
              <label style={labelStyle}>Branchenkennzahl (WZ 2008) per Stichwort ermitteln</label>
              <input
                type="text"
                value={m_wz_search}
                onChange={(e) => {
                  const val = e.target.value;
                  setM_wz_search(val);
                  const matches = findMatchingBranches(val);
                  if (matches.length > 0) {
                    setM_wz_code(matches[0].code);
                    if (matches[0].isSchwarzArbG) setM_is_hazardous_branch(true);
                  }
                }}
                placeholder="Stichwort tippen (z.B. Handwerk, Elektro, IT, Bau, Gastro)..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Amtliche Branchenkennzahl (für Fördermittel & BG-Pflichten)</label>
              <select
                value={m_wz_code}
                onChange={(e) => {
                  const code = e.target.value;
                  setM_wz_code(code);
                  const found = WZ_BRANCHEN_KATALOG.find((b) => b.code === code);
                  if (found && found.isSchwarzArbG) {
                    setM_is_hazardous_branch(true);
                  }
                }}
                style={inputStyle}
              >
                {filteredBranches.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. BANKVERBINDUNGEN (HAUPTKONTO + WEITERE KONTEN) */}
          <div style={{ gridColumn: '1 / -1', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>
            <h4 style={{ margin: 0, color: theme.textMain, fontSize: '16px', fontWeight: '600' }}>
              3. Bankverbindungen (Geschäftskonten)
            </h4>
            <button type="button" onClick={handleAddBankAccount} style={outlineAccentBtnStyle}>
              + Weitere Bankverbindung hinzufügen
            </button>
          </div>

          <div>
            <label style={labelStyle}>Hauptbank (Name des Kreditinstituts)</label>
            <input value={m_bank_name} onChange={(e) => setM_bank_name(e.target.value)} placeholder="z.B. Commerzbank / Sparkasse" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Hauptkonto IBAN</label>
            <input value={m_iban} onChange={(e) => setM_iban(e.target.value)} placeholder="DE..." style={inputStyle} />
          </div>

          {m_additional_banks.length > 0 && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {m_additional_banks.map((bankRow, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.6fr 1fr auto',
                    gap: '10px',
                    alignItems: 'end',
                    padding: '12px',
                    borderRadius: '8px',
                    background: theme.inputBg,
                    border: `1px solid ${theme.border}`
                  }}
                >
                  <div>
                    <label style={labelStyle}>Bank {idx + 2} (Kreditinstitut)</label>
                    <input
                      value={bankRow.bank_name || ''}
                      onChange={(e) => handleUpdateBankAccount(idx, 'bank_name', e.target.value)}
                      placeholder="Name der Bank"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>IBAN {idx + 2}</label>
                    <input
                      value={bankRow.iban || ''}
                      onChange={(e) => handleUpdateBankAccount(idx, 'iban', e.target.value)}
                      placeholder="DE..."
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Bezeichnung / Zweck</label>
                    <input
                      value={bankRow.note || ''}
                      onChange={(e) => handleUpdateBankAccount(idx, 'note', e.target.value)}
                      placeholder="z.B. Tagesgeld / Steuerkonto"
                      style={inputStyle}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveBankAccount(idx)}
                    style={{ ...outlineDangerBtnStyle, height: '42px' }}
                    title="Bankverbindung entfernen"
                  >
                    <Icon name="trash" size={14} /> Entfernen
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 4. MITARBEITER-STRUKTUR & COMPLIANCE-PARAMETER */}
          <div style={{ gridColumn: '1 / -1', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>
            <h4 style={{ margin: 0, color: theme.textMain, fontSize: '16px', fontWeight: '600' }}>
              4. Mitarbeiter-Struktur & Compliance-Einstellungen
            </h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.textMain, cursor: 'pointer', fontWeight: 'bold' }}>
              <input
                type="checkbox"
                checked={m_compliance_disabled}
                onChange={(e) => setM_compliance_disabled(e.target.checked)}
              />
              <span>Compliance-Überwachung für diesen Eintrag deaktivieren (z.B. für Privat)</span>
            </label>
          </div>

          {!m_compliance_disabled && m_rechtsform !== 'Privat' && (
            <>
              <div>
                <label style={labelStyle}>Teilzeit bis 20 Std./Woche (Zählfaktor 0,5)</label>
                <input
                  type="number"
                  min="0"
                  value={m_headcount_parttime_20}
                  onChange={(e) => {
                    const v = Math.max(0, parseInt(e.target.value || '0', 10));
                    setM_headcount_parttime_20(v);
                    const newSum = v + Number(m_headcount_parttime_30 || 0) + Number(m_headcount_fulltime || 0);
                    if (newSum > Number(m_headcount_total || 0)) setM_headcount_total(newSum);
                  }}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Teilzeit bis 30 Std./Woche (Zählfaktor 0,75)</label>
                <input
                  type="number"
                  min="0"
                  value={m_headcount_parttime_30}
                  onChange={(e) => {
                    const v = Math.max(0, parseInt(e.target.value || '0', 10));
                    setM_headcount_parttime_30(v);
                    const newSum = Number(m_headcount_parttime_20 || 0) + v + Number(m_headcount_fulltime || 0);
                    if (newSum > Number(m_headcount_total || 0)) setM_headcount_total(newSum);
                  }}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Vollzeit über 30 Std./Woche (Zählfaktor 1,0)</label>
                <input
                  type="number"
                  min="0"
                  value={m_headcount_fulltime}
                  onChange={(e) => {
                    const v = Math.max(0, parseInt(e.target.value || '0', 10));
                    setM_headcount_fulltime(v);
                    const newSum = Number(m_headcount_parttime_20 || 0) + Number(m_headcount_parttime_30 || 0) + v;
                    if (newSum > Number(m_headcount_total || 0)) setM_headcount_total(newSum);
                  }}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Gesamtkopfzahl Beschäftigte (inkl. Minijobs)</label>
                <input
                  type="number"
                  min="0"
                  value={m_headcount_total}
                  onChange={(e) => setM_headcount_total(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  style={inputStyle}
                />
              </div>

              {/* KLARTEXT-ANZEIGE OHNE ABKÜRZUNG FTE UND OHNE OPAZITÄTS-HINTERGRUND */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>
                  Vollzeit-Richtwert nach Kündigungsschutzgesetz (§ 23 Abs. 1 Satz 4 KSchG – Grenze für Kleinbetriebe: max. 10,00)
                </label>
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    backgroundColor: theme.inputBg,
                    border: `1px solid ${isFormKSchGTriggered ? theme.warningBorder : theme.tresorAccent}`,
                    color: isFormKSchGTriggered ? theme.warningBorder : theme.tresorAccent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <span>Berechneter Vollzeit-Richtwert: {currentFormKSchGRichtwert.toFixed(2)} von max. 10,00</span>
                  <span>
                    {isFormKSchGTriggered
                      ? 'Achtung: Über 10,00 – Allgemeiner Kündigungsschutz (§ 1 KSchG) ist aktiv'
                      : 'Bis 10,00 – Kleinbetriebs-Regelung (kein allgemeiner Kündigungsschutz nach § 23 KSchG)'}
                  </span>
                </div>
              </div>

              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '8px',
                  background: theme.inputBg,
                  border: `1px solid ${theme.border}`
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.textMain, cursor: 'pointer' }}>
                  <input type="checkbox" checked={m_befreit_181_bgb} onChange={(e) => setM_befreit_181_bgb(e.target.checked)} />
                  <span>Befreiung vom Selbstkontrahierungsverbot (§ 181 BGB) liegt vor</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.textMain, cursor: 'pointer' }}>
                  <input type="checkbox" checked={m_uses_external_creatives} onChange={(e) => setM_uses_external_creatives(e.target.checked)} />
                  <span>Beauftragt externe Kreative / Agenturen (KSK-Meldung 31.03.)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.textMain, cursor: 'pointer' }}>
                  <input type="checkbox" checked={m_ships_physical_goods} onChange={(e) => setM_ships_physical_goods(e.target.checked)} />
                  <span>Versendet physische Waren / Pakete (LUCID-Verpackungsregister)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: theme.textMain, cursor: 'pointer' }}>
                  <input type="checkbox" checked={m_is_hazardous_branch} onChange={(e) => setM_is_hazardous_branch(e.target.checked)} />
                  <span>Branche nach § 2a SchwarzArbG (Bau, Handwerk, Gastro, Logistik)</span>
                </label>
              </div>

              {/* KOMPAKTE BUTTON-MATRIX DER FEHLENDEN PFLICHTDOKUMENTE (NUR ZWEIZEILIGE ZENTRIERTE BUTTONS, DETAILS ERST BEI KLICK) */}
              <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                <div style={{ padding: '16px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.inputBg }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>
                        Fehlende Pflichtdokumente für „{m_rechtsform}“ ({currentFormVaultEval.missingList.length} offen)
                      </div>
                      <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '2px' }}>
                        Klicke auf einen Button, um die gesetzliche Anforderung einzusehen und das Dokument direkt hochzuladen.
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: 'transparent',
                        color: currentFormVaultEval.allComplete ? theme.tresorAccent : theme.warningBorder,
                        border: `1px solid ${currentFormVaultEval.allComplete ? theme.tresorAccent : theme.warningBorder}`
                      }}
                    >
                      {currentFormVaultEval.presentCount} von {currentFormVaultEval.totalRequired} hinterlegt
                    </span>
                  </div>

                  {currentFormVaultEval.missingList.length === 0 ? (
                    <div style={{ fontSize: '13px', color: theme.tresorAccent, fontWeight: 'bold' }}>
                      Alle vorgesehenen Pflichtdokumente für diese Rechtsform sind vollständig im Tresor hinterlegt.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                      {currentFormVaultEval.missingList.map((missingDoc) => {
                        const isSelected = selectedMissingDocId === missingDoc.id;
                        const lines = (missingDoc.shortBtnTitle || missingDoc.title).split('\n');
                        return (
                          <button
                            key={missingDoc.id}
                            type="button"
                            onClick={() => setSelectedMissingDocId(isSelected ? null : missingDoc.id)}
                            style={{
                              ...outlineDangerBtnStyle,
                              width: '100%',
                              minHeight: '54px',
                              padding: '8px 12px',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              lineHeight: '1.35',
                              borderWidth: isSelected ? '2px' : '1px'
                            }}
                          >
                            <span style={{ display: 'block', fontWeight: 'bold', fontSize: '12px' }}>{lines[0]}</span>
                            <span style={{ display: 'block', fontSize: '11px', opacity: 0.85 }}>{lines[1] || `#${missingDoc.labelHash}`}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* AUFKLAPP-DETAILFENSTER FÜR DEN GEKLICKTEN BUTTON */}
                  {selectedMissingDocObj && (
                    <div
                      style={{
                        marginTop: '14px',
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: `1px solid ${theme.warningBorder}`,
                        background: theme.cardBg,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '14px'
                      }}
                    >
                      <div style={{ flex: '1 1 320px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>
                          {selectedMissingDocObj.title}
                        </div>
                        <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>
                          Gesetzliche Grundlage: {selectedMissingDocObj.legalBasis} | Tresor-Kennzeichnung: #{selectedMissingDocObj.labelHash}
                        </div>
                        <div style={{ fontSize: '12px', color: theme.textMain, marginTop: '6px', lineHeight: '1.45' }}>
                          Hinweis: {selectedMissingDocObj.riskWarning}
                        </div>
                      </div>

                      <div>
                        {editMandantId ? (
                          <label style={{ ...outlineDangerBtnStyle, cursor: uploadingMandantId === editMandantId ? 'wait' : 'pointer' }}>
                            <Icon name="paperclip" size={14} />
                            <span>
                              {uploadingMandantId === editMandantId
                                ? 'Lädt hoch...'
                                : `Datei für [${selectedMissingDocObj.labelHash}] hochladen`}
                            </span>
                            <input
                              type="file"
                              style={{ display: 'none' }}
                              disabled={uploadingMandantId === editMandantId}
                              onChange={(e) => {
                                const currentRow = mandanten.find((x) => x.id === editMandantId);
                                handleTargetedLabelUpload(
                                  editMandantId,
                                  currentRow?.dokument_url || '',
                                  selectedMissingDocObj.labelHash,
                                  e
                                );
                              }}
                            />
                          </label>
                        ) : (
                          <span style={{ fontSize: '12px', color: theme.textMuted }}>
                            Bitte Mandant zuerst speichern oder Datei unten im Upload-Feld auswählen.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* 5. ALLGEMEINER STAMMDOKUMENTEN-UPLOAD & BEREITS HINTERLEGTE DOKUMENTE */}
          <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="paperclip" size={16} /> Weitere Stammdokumente hochladen & verwalten
            </label>
            <input
              id="tresor-datei-upload"
              type="file"
              multiple
              onChange={handleNeuerDateiUploadSelect}
              style={{ ...inputStyle, border: `1px dashed ${theme.tresorAccent}`, cursor: 'pointer', padding: '10px' }}
            />

            {m_dateien.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', background: theme.inputBg, border: `1px solid ${theme.tresorAccent}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.tresorAccent, textTransform: 'uppercase' }}>
                  Neue Datei(en) vor dem Speichern beschriften ({m_dateien.length}):
                </div>
                {m_dateien.map((fileObj, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileObj.name}>
                      Originaldatei: {fileObj.name}
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const chosen = e.target.value;
                          setM_dateien_labels((prev) => prev.map((lbl, i) => (i === idx ? chosen : lbl)));
                        }}
                        style={{ ...inputStyle, width: 'auto', flex: '0 0 200px', padding: '8px 10px', fontSize: '12px' }}
                      >
                        <option value="">-- Pflicht-Label wählen --</option>
                        {REQUIRED_VAULT_DOCUMENTS.map((d) => (
                          <option key={d.id} value={d.labelHash}>
                            {d.labelHash}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={m_dateien_labels[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setM_dateien_labels((prev) => prev.map((lbl, i) => (i === idx ? val : lbl)));
                        }}
                        placeholder="Bezeichnung eingeben..."
                        style={{ ...inputStyle, flex: '1 1 200px', padding: '8px 10px', fontSize: '13px', borderColor: theme.tresorAccent }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editMandantId && m_existing_docs.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain, textTransform: 'uppercase' }}>
                  Bereits hinterlegte Stammdokumente ({m_existing_docs.length}):
                </div>
                {m_existing_docs.map((docItem, idx) => {
                  const lockedRule = findUnloeschbarRuleForDoc(docItem.label);
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const newLbl = e.target.value;
                          setM_existing_docs((prev) => prev.map((item, i) => (i === idx ? { ...item, label: newLbl } : item)));
                        }}
                        style={{ ...inputStyle, width: 'auto', flex: '0 0 190px', padding: '8px 10px', fontSize: '12px' }}
                      >
                        <option value="">-- Pflicht-Label setzen --</option>
                        {REQUIRED_VAULT_DOCUMENTS.map((d) => (
                          <option key={d.id} value={d.labelHash}>
                            {d.labelHash}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={docItem.label}
                        onChange={(e) => {
                          const newLbl = e.target.value;
                          setM_existing_docs((prev) => prev.map((item, i) => (i === idx ? { ...item, label: newLbl } : item)));
                        }}
                        placeholder="Bezeichnung..."
                        style={{ ...inputStyle, flex: '1 1 220px', padding: '8px 10px', fontSize: '13px' }}
                      />
                      {lockedRule && (
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${theme.border}`,
                            color: theme.textMuted,
                            fontWeight: 'bold'
                          }}
                          title={lockedRule.riskWarning}
                        >
                          Löschgeschützt
                        </span>
                      )}
                      <a
                        href={docItem.cleanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...outlineAccentBtnStyle, textDecoration: 'none', padding: '8px 12px' }}
                        title={extractFilename(docItem.cleanUrl)}
                      >
                        <Icon name="file" size={14} /> Dokument öffnen
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const currentMandant = mandanten.find((x) => x.id === editMandantId);
                          loescheDateiAusMandant(editMandantId, currentMandant?.dokument_url || '', docItem.cleanUrl);
                        }}
                        style={{ ...outlineDangerBtnStyle, padding: '8px 10px' }}
                        title={lockedRule ? 'Geschütztes Pflichtdokument (erfordert LOESCHEN-Bestätigung)' : 'Dokument löschen'}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '25px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={laedt}
            style={{
              padding: '14px',
              background: theme.tresorAccent,
              color: btnTextColor,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '15px',
              flex: '1 1 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {laedt ? 'Speichere...' : editMandantId ? <><Icon name="check" size={16} /> Änderungen speichern</> : '+ Mandant im Tresor ablegen'}
          </button>
          {editMandantId && (
            <button
              type="button"
              onClick={resetMandantForm}
              style={{
                padding: '14px',
                background: 'transparent',
                color: theme.textMain,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                flex: '1 1 auto'
              }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <h3 style={{ margin: '30px 0 15px 0', color: theme.textMain, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Icon name="archive" size={20} style={{ color: theme.tresorAccent }} /> Gespeicherte Mandanten & Firmen
      </h3>

      <div style={{ borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', background: theme.cardBg, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ width: '100%' }}>
          <div className="tresor-desktop-header" style={{ background: theme.inputBg, borderBottom: `1px solid ${theme.border}`, color: theme.textMuted }}>
            <div>Firma / Mandant</div>
            <div>Kontakt</div>
            <div>Steuern, Register & Bank</div>
            <div>Dokumente & Pflicht-Status</div>
            <div style={{ textAlign: 'center' }}>Aktion</div>
          </div>

          {gefilterteMandanten.map((m) => {
            const isExpanded = expandedId === m.id;
            const isActive = editMandantId === m.id;
            const parsedDocs = m.dokument_url
              ? m.dokument_url
                  .split(',')
                  .map((u) => u.trim())
                  .filter(Boolean)
                  .map((u) => parseDocEntry(u))
              : [];
            const numDocs = parsedDocs.length;
            const displayFax = cleanVal(m.fax) || (isOwnerUser ? OWNER_DEFAULT_FAX : '');

            const cp = getSafeComplianceProfile(m);
            const rowRichtwert = calculateKSchGFTE(cp.headcount_parttime_20, cp.headcount_parttime_30, cp.headcount_fulltime);
            const vaultEval = evaluateVaultCompliance(cp.rechtsform, cp.headcount_total, parsedDocs, cp.compliance_disabled);
            const activeRowMissingId = expandedRowMissingDoc[m.id] || null;
            const activeRowMissingObj = vaultEval.missingList.find((d) => d.id === activeRowMissingId) || null;

            return (
              <div
                key={m.id}
                style={{
                  padding: '15px 20px',
                  cursor: 'pointer',
                  borderBottom: `1px solid ${theme.border}`,
                  borderLeft: isActive ? `4px solid ${theme.tresorAccent}` : '4px solid transparent',
                  background: isActive ? theme.inputBg : 'transparent',
                  transition: 'all 0.2s ease',
                  margin: 0,
                  textAlign: 'left',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                onClick={() => {
                  ladeInFormularMandant(m);
                  setExpandedId(isExpanded ? null : m.id);
                }}
              >
                <div className="tresor-main-row">
                  {/* SPALTE 1 DESKTOP */}
                  <div className="tresor-desktop-only" style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ color: theme.tresorAccent, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.firmenname}
                        </strong>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: theme.inputBg,
                            border: `1px solid ${theme.border}`,
                            color: theme.textMain,
                            fontWeight: 'bold'
                          }}
                        >
                          {cp.rechtsform}
                          {!cp.compliance_disabled && cp.rechtsform !== 'Privat' ? ` • ${cp.headcount_total} MA` : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="user" size={10} /> {cleanVal(m.ansprechpartner) || '-'}
                      </span>
                    </div>
                  </div>

                  {/* SPALTE 1 MOBIL */}
                  <div className="tresor-mobile-only tresor-mobile-top">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ color: theme.tresorAccent, fontSize: '14px' }}>
                        {m.firmenname} ({cp.rechtsform})
                      </strong>
                      <span style={{ fontSize: '11px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="user" size={10} /> {cleanVal(m.ansprechpartner) || '-'}
                      </span>
                    </div>
                    <div style={{ color: isActive ? theme.tresorAccent : theme.textMuted, paddingLeft: '8px' }}>
                      <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                    </div>
                  </div>

                  {/* SPALTE 2: KONTAKT */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="phone" size={12} /> {cleanVal(m.telefon) || '-'}
                    </span>
                    {displayFax && (
                      <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        FAX: {displayFax}
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="mail" size={12} /> {cleanVal(m.email) || '-'}
                    </span>
                  </div>

                  {/* SPALTE 3: STEUERN, REGISTER & BANK (ALLE WICHTIGEN NUMMERN VORNE SICHTBAR) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                    <span style={{ fontSize: '12px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      St-Nr: {cleanVal(m.steuernummer) || '-'} | USt-Id: {cleanVal(m.ust_id) || '-'}
                    </span>
                    <span style={{ fontSize: '11px', color: theme.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      HR: {cleanVal(m.handelsregister) || '-'} | WZ: {cp.wz_code || '-'}
                    </span>
                    <span style={{ fontSize: '11px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      IBAN: {cleanVal(m.iban) || '-'}
                      {cp.additional_banks.length > 0 ? ` (+${cp.additional_banks.length} weitere)` : ''}
                    </span>
                  </div>

                  {/* SPALTE 4: DOKUMENTE & PFLICHT-STATUS OHNE BUNTEN HINTERGRUND */}
                  <div style={{ fontSize: '12px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: theme.tresorAccent, fontWeight: 'bold' }}>
                          {numDocs} {numDocs === 1 ? 'Dokument' : 'Dokumente'}
                        </span>
                        {!cp.compliance_disabled && cp.rechtsform !== 'Privat' && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              background: 'transparent',
                              border: `1px solid ${vaultEval.allComplete ? theme.tresorAccent : theme.warningBorder}`,
                              color: vaultEval.allComplete ? theme.tresorAccent : theme.warningBorder
                            }}
                          >
                            {vaultEval.allComplete
                              ? 'Pflichtdokumente komplett'
                              : `${vaultEval.missingList.length} Pflichtdok. offen`}
                          </span>
                        )}
                      </div>
                      {numDocs > 0 && (
                        <span style={{ fontSize: '11px', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {parsedDocs.map((d) => d.label).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SPALTE 5 DESKTOP */}
                  <div className="tresor-desktop-only" style={{ color: isActive ? theme.tresorAccent : theme.textMuted, textAlign: 'center' }}>
                    <Icon name={isExpanded ? 'down' : 'right'} size={20} />
                  </div>
                </div>

                {/* AUFGEKLAPPTER BEREICH */}
                {isExpanded && (
                  <div
                    style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${theme.border}`, cursor: 'default' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="tresor-expanded-grid">
                      {/* SPALTE 1: ADRESSE, BRANCHE & KÜNDIGUNGSSCHUTZ-RICHTWERT */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: theme.textMain }}>{cleanVal(m.adresse) || '-'}</span>
                        {displayFax && <span style={{ fontSize: '12px', color: theme.textMain }}>Fax: {displayFax}</span>}
                        <div style={{ marginTop: '4px', fontSize: '11px', color: theme.textMain, fontWeight: 'bold' }}>
                          USt-Turnus: <span style={{ color: theme.tresorAccent }}>{m.ust_intervall || 'Vierteljährlich'} {m.dauerfrist ? '(DFV)' : ''}</span>
                        </div>
                        {!cp.compliance_disabled && cp.rechtsform !== 'Privat' && (
                          <div style={{ fontSize: '11px', color: rowRichtwert > 10 ? theme.warningBorder : theme.tresorAccent, fontWeight: 'bold' }}>
                            Kündigungsschutz-Richtwert (§ 23 KSchG): {rowRichtwert.toFixed(2)} / 10,00
                          </div>
                        )}
                      </div>

                      {/* SPALTE 2: ALLE NUMMERN & WEITERE BANKVERBINDUNGEN */}
                      <div style={{ fontSize: '11px', color: theme.textMain, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <div><span style={{ color: theme.textMuted }}>Steuernr.:</span> {cleanVal(m.steuernummer) || '-'}</div>
                          <div><span style={{ color: theme.textMuted }}>USt-IdNr.:</span> {cleanVal(m.ust_id) || '-'}</div>
                          <div><span style={{ color: theme.textMuted }}>W-IdNr.:</span> {cp.wirtschafts_id || '-'}</div>
                          <div><span style={{ color: theme.textMuted }}>HR-Nr.:</span> {cleanVal(m.handelsregister) || '-'}</div>
                          <div><span style={{ color: theme.textMuted }}>Betriebsnr.:</span> {cleanVal(m.betriebsnummer) || '-'}</div>
                          <div><span style={{ color: theme.textMuted }}>BG-Nr.:</span> {cleanVal(m.vbg_nummer) || '-'}</div>
                          <div><span style={{ color: theme.textMuted }}>Transparenzreg.:</span> {cp.transparenzregister_nr || '-'}</div>
                          <div><span style={{ color: theme.textMuted }}>IHK/HWK:</span> {cp.ihk_hwk_nr || '-'}</div>
                          <div><span style={{ color: theme.textMuted }}>LUCID-Nr.:</span> {cp.lucid_nr || '-'}</div>
                          <div><span style={{ color: theme.textMuted }}>WZ-Branche:</span> {cp.wz_code || '-'}</div>
                        </div>

                        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div>
                            <span style={{ color: theme.textMuted }}>Hauptbank:</span> {cleanVal(m.bank_name) || '-'} ({cleanVal(m.iban) || '-'})
                          </div>
                          {cp.additional_banks.map((b, bIdx) => (
                            <div key={bIdx}>
                              <span style={{ color: theme.textMuted }}>Bank {bIdx + 2}{b.note ? ` (${b.note})` : ''}:</span> {b.bank_name || '-'} ({b.iban || '-'})
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* SPALTE 3: BEREITS HINTERLEGTE DOKUMENTE */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {parsedDocs.map((docObj, idx) => {
                          const lockedRule = findUnloeschbarRuleForDoc(docObj.label);
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'stretch',
                                background: theme.inputBg,
                                borderRadius: '4px',
                                overflow: 'hidden',
                                border: `1px solid ${theme.border}`,
                                width: 'fit-content',
                                maxWidth: '100%'
                              }}
                            >
                              <a
                                href={docObj.cleanUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '5px 8px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  color: theme.textMain,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={`${docObj.label} (${extractFilename(docObj.cleanUrl)})`}
                              >
                                <Icon name="file" size={12} /> {docObj.label}
                              </a>
                              <button
                                onClick={() => loescheDateiAusMandant(m.id, m.dokument_url, docObj.cleanUrl)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  borderLeft: `1px solid ${theme.border}`,
                                  padding: '0 6px',
                                  cursor: 'pointer',
                                  color: theme.textMuted
                                }}
                                title={lockedRule ? 'Geschütztes Pflichtdokument (erfordert LOESCHEN-Bestätigung)' : 'Datei löschen'}
                              >
                                <Icon name="x" size={11} />
                              </button>
                            </div>
                          );
                        })}
                        {uploadingMandantId === m.id ? (
                          <span style={{ fontSize: '11px', color: theme.tresorAccent }}>Upload läuft...</span>
                        ) : (
                          <label
                            style={{
                              cursor: 'pointer',
                              fontSize: '11px',
                              background: 'transparent',
                              padding: '5px 10px',
                              borderRadius: '4px',
                              border: `1px dashed ${theme.tresorAccent}`,
                              display: 'inline-block',
                              color: theme.tresorAccent,
                              fontWeight: 'bold',
                              width: 'fit-content'
                            }}
                          >
                            + Datei anhängen
                            <input type="file" style={{ display: 'none' }} onChange={(e) => handleNachtragUploadMandant(m.id, m.dokument_url, e)} />
                          </label>
                        )}
                      </div>

                      {/* SPALTE 4: LÖSCHEN-BUTTON */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="tresor-delete-btn"
                          onClick={() => loescheMandant(m.id)}
                          style={outlineDangerBtnStyle}
                          title="Mandant löschen"
                        >
                          <Icon name="trash" size={14} /> Mandant aus Tresor löschen
                        </button>
                      </div>
                    </div>

                    {/* FEHLENDE PFLICHTDOKUMENTE UNTEN IM AUFGEKLAPPTEN BEREICH: NUR ZENTRIERTE ZWEIZEILIGE OUTLINE-BUTTONS */}
                    {!cp.compliance_disabled && cp.rechtsform !== 'Privat' && !vaultEval.allComplete && (
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${theme.border}` }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain, marginBottom: '10px' }}>
                          Fehlende Pflichtdokumente ({vaultEval.missingList.length}) – Klick auf Button öffnet Details & Direkt-Upload:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
                          {vaultEval.missingList.map((missingDoc) => {
                            const isSelected = activeRowMissingId === missingDoc.id;
                            const lines = (missingDoc.shortBtnTitle || missingDoc.title).split('\n');
                            return (
                              <button
                                key={missingDoc.id}
                                type="button"
                                onClick={() =>
                                  setExpandedRowMissingDoc((prev) => ({
                                    ...prev,
                                    [m.id]: isSelected ? null : missingDoc.id
                                  }))
                                }
                                style={{
                                  ...outlineDangerBtnStyle,
                                  width: '100%',
                                  minHeight: '50px',
                                  padding: '7px 10px',
                                  flexDirection: 'column',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  lineHeight: '1.3',
                                  borderWidth: isSelected ? '2px' : '1px'
                                }}
                              >
                                <span style={{ display: 'block', fontWeight: 'bold', fontSize: '11.5px' }}>{lines[0]}</span>
                                <span style={{ display: 'block', fontSize: '10.5px', opacity: 0.85 }}>{lines[1] || `#${missingDoc.labelHash}`}</span>
                              </button>
                            );
                          })}
                        </div>

                        {activeRowMissingObj && (
                          <div
                            style={{
                              marginTop: '10px',
                              padding: '12px 14px',
                              borderRadius: '6px',
                              border: `1px solid ${theme.warningBorder}`,
                              background: theme.inputBg,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '12px'
                            }}
                          >
                            <div style={{ flex: '1 1 300px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 'bold', color: theme.textMain }}>
                                {activeRowMissingObj.title} ({activeRowMissingObj.legalBasis})
                              </div>
                              <div style={{ fontSize: '11.5px', color: theme.textMuted, marginTop: '4px' }}>
                                {activeRowMissingObj.riskWarning}
                              </div>
                            </div>
                            <label style={{ ...outlineDangerBtnStyle, cursor: uploadingMandantId === m.id ? 'wait' : 'pointer' }}>
                              <Icon name="paperclip" size={14} />
                              <span>
                                {uploadingMandantId === m.id
                                  ? 'Lädt hoch...'
                                  : `Jetzt hochladen [${activeRowMissingObj.labelHash}]`}
                              </span>
                              <input
                                type="file"
                                style={{ display: 'none' }}
                                disabled={uploadingMandantId === m.id}
                                onChange={(e) => handleTargetedLabelUpload(m.id, m.dokument_url, activeRowMissingObj.labelHash, e)}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}