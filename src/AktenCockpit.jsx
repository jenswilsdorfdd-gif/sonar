import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import {
  formatDatum,
  formatRufnummer,
  normalizeDateForInput,
  parseAktenNummer,
  generateMandantPrefix,
  druckeAkte
} from './utils/aktenHelpers';
import { useAktenScannerImport } from './hooks/useAktenScannerImport';
import { useAktenActions } from './hooks/useAktenActions';
import { isPrimaryOwnerSession, isFullAccessSession, PRIMARY_OWNER_USER_ID } from './config/authRoles';
import MegaLegalModal from './MegaLegalModal';
import FallakteModal from './FallakteModal';
import AktenAlarme from './AktenAlarme';
import AktenListe from './AktenListe';
import AktenFormular from './AktenFormular';
import AktenModals from './AktenModals';

export default function AktenCockpit({
  session,
  theme,
  akten,
  mandanten,
  gegnerListe,
  ladeDaten,
  showToast,
  suchbegriff,
  globalUrlText,
  setGlobalUrlText
}) {
  const OWNER_USER_ID = PRIMARY_OWNER_USER_ID;
  const isPrimaryOwner = isPrimaryOwnerSession(session);
  const hasFullAccess = isFullAccessSession(session);

  // STRIKT EXKLUSIV FÜR JENS WILSDORF (NIEMALS FÜR NICO ODER DRITTE!)
  const SIGNATUR_URL = isPrimaryOwner
    ? 'https://loyzfkxkuyypgteskxkm.supabase.co/storage/v1/object/public/dokumente/jw-signum-lang-blau.png'
    : null;

  const [laedt, setLaedt] = useState(false);
  const [webScanLaedt, setWebScanLaedt] = useState(false);
  const [webScanStatus, setWebScanStatus] = useState('');
  const [selectedAkteId, setSelectedAkteId] = useState(null);

  const [modus, setModus] = useState('neu');
  const [jsonImport, setJsonImport] = useState('');

  const [unserZeichen, setUnserZeichen] = useState('');
  const [gegnerName, setGegnerName] = useState('');
  const [gegnerAnsprechpartner, setGegnerAnsprechpartner] = useState('');
  const [gegnerTelefon, setGegnerTelefon] = useState('');
  const [gegnerFax, setGegnerFax] = useState('');
  const [gegnerEmail, setGegnerEmail] = useState('');
  const [aktenzeichen, setAktenzeichen] = useState('');

  const [unsereFirma, setUnsereFirma] = useState('');
  const [unserAnsprechpartner, setUnserAnsprechpartner] = useState('');
  const [unserTelefon, setUnserTelefon] = useState('');
  const [unserEmail, setUnserEmail] = useState('');
  const [thema, setThema] = useState('');

  const [typ, setTyp] = useState('Eingang');
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
  const [fristExtern, setFristExtern] = useState('');
  const [wiedervorlage, setWiedervorlage] = useState('');
  const [aktion, setAktion] = useState('');
  const [kanal, setKanal] = useState('');
  const [bezugId, setBezugId] = useState('');

  const [clearOldFristen, setClearOldFristen] = useState(true);

  const [dateien, setDateien] = useState([]);
  const [briefEntwurf, setBriefEntwurf] = useState('');
  const [rawText, setRawText] = useState('');
  const [emailAnhaenge, setEmailAnhaenge] = useState([]);
  const [versandPdfUrl, setVersandPdfUrl] = useState('');
  const [tresorPrompt, setTresorPrompt] = useState(null);

  const [gegnerPrompt, setGegnerPrompt] = useState(null);
  const [faxZhd, setFaxZhd] = useState('');

  const [showUploadReminder, setShowUploadReminder] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [triageWvDate, setTriageWvDate] = useState('');

  const [showVersandHistorie, setShowVersandHistorie] = useState(false);
  const [expandedVersandId, setExpandedVersandId] = useState(null);
  const [zeigeErledigte, setZeigeErledigte] = useState(false);

  const [aufgeklappteAkten, setAufgeklappteAkten] = useState([]);
  const [mergeSourceId, setMergeSourceId] = useState(null);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [uploadingHistId, setUploadingHistId] = useState(null);
  const [fokussierteAkteId, setFokussierteAkteId] = useState(null);
  const [fokussierterHistId, setFokussierterHistId] = useState(null);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [isAlarmsOpen, setIsAlarmsOpen] = useState(true);

  const [isWarRoomOpen, setIsWarRoomOpen] = useState(false);
  const [activeWarRoomDossier, setActiveWarRoomDossier] = useState(null);
  const [fallakteModalAkteId, setFallakteModalAkteId] = useState(null);
  const [duplikatNummerFilter, setDuplikatNummerFilter] = useState(null);

  const autoGenRef = useRef('');

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
  const h4StyleAkten = {
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
  const quickBtnStyle = {
    background: theme.border,
    color: theme.textMain,
    border: 'none',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 'bold'
  };
  const inlineInputStyle = {
    background: 'transparent',
    border: '1px dashed transparent',
    color: theme.textMain,
    width: '100%',
    fontSize: '13px',
    padding: '4px',
    outline: 'none',
    cursor: 'text',
    borderBottom: `1px dashed ${theme.border}`,
    boxSizing: 'border-box'
  };

  const isDarkMode = theme.bg === '#020617';
  const btnTextColor = isDarkMode ? '#000' : '#ffffff';

  const handleFristChange = (val) => {
    setFristExtern(val);
    if (val) setWiedervorlage('');
  };

  const handleWVChange = (val) => {
    setWiedervorlage(val);
    if (val) setFristExtern('');
  };

  const setzeWV = (tage, monate = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + tage);
    if (monate > 0) d.setMonth(d.getMonth() + monate);
    handleWVChange(d.toISOString().split('T')[0]);
  };

  useEffect(() => {
    if (globalUrlText) {
      setBriefEntwurf(globalUrlText);
      setGlobalUrlText(null);
    }
  }, [globalUrlText, setGlobalUrlText]);

  useEffect(() => {
    if (modus === 'neu' && unsereFirma && gegnerName) {
      const mPrefix = generateMandantPrefix(unsereFirma, isPrimaryOwner).toUpperCase();
      let gPrefix = gegnerName.trim().split(' ')[0].replace(/[^a-zA-ZäöüÄÖÜß0-9]/g, '');
      if (!gPrefix) gPrefix = 'Gegner';

      let maxGlobalNum = 0;
      akten.forEach((a) => {
        if (a.is_demo_showcase) return;
        const num = parseAktenNummer(a.unser_zeichen);
        if (num !== null && num > maxGlobalNum) maxGlobalNum = num;
      });

      const nextNum = String(maxGlobalNum + 1).padStart(4, '0');
      const newZeichen = `${nextNum}-${mPrefix}-${gPrefix}`;

      setUnserZeichen((prev) => {
        if (!prev || prev === autoGenRef.current) {
          autoGenRef.current = newZeichen;
          return newZeichen;
        }
        return prev;
      });
    }
  }, [unsereFirma, gegnerName, modus, akten, isPrimaryOwner]);

  const {
    handleWebScannerIngest,
    handleJsonImport,
    handleTresorPromptAccept,
    handleGegnerPromptAccept
  } = useAktenScannerImport({
    session,
    akten,
    mandanten,
    gegnerListe,
    ladeDaten,
    showToast,
    dateien,
    setDateien,
    setLaedt,
    setWebScanLaedt,
    setWebScanStatus,
    setJsonImport,
    setModus,
    setSelectedAkteId,
    setBezugId,
    setUnserZeichen,
    setAktenzeichen,
    setThema,
    gegnerName,
    setGegnerName,
    gegnerAnsprechpartner,
    setGegnerAnsprechpartner,
    setGegnerTelefon,
    gegnerFax,
    setGegnerFax,
    setGegnerEmail,
    setFaxZhd,
    setUnsereFirma,
    setUnserAnsprechpartner,
    unserTelefon,
    setUnserTelefon,
    unserEmail,
    setUnserEmail,
    setTyp,
    setDatum,
    setAktion,
    setKanal,
    setFristExtern,
    setWiedervorlage,
    handleFristChange,
    handleWVChange,
    setBriefEntwurf,
    setRawText,
    setVersandPdfUrl,
    tresorPrompt,
    setTresorPrompt,
    gegnerPrompt,
    setGegnerPrompt
  });

  const {
    handleAkteAuswahl,
    springeZuAkteAusgang,
    ladeVorgangInMaske,
    handleNachhaken,
    handleTresorAuswahl,
    handleGegnerAuswahl,
    handleAlarmKlick,
    toggleAkte,
    handleInlineEdit,
    handleTerminVerschieben,
    toggleAkteStatus,
    handleAkteStammdatenEdit,
    loescheAkte,
    loescheHistorieEintrag,
    loescheDateiAusHistorie,
    mergeAkte,
    handleNachtragUploadAkte,
    speichereEintragLogik,
    proceedToSaveOrTriage,
    handleSpeichernCheck,
    handleResendVersand,
    syncFallakteDocument
  } = useAktenActions({
    session,
    OWNER_USER_ID,
    isOwnerAccount: isPrimaryOwner,
    hasFullAccess: hasFullAccess,
    SIGNATUR_URL,
    akten,
    mandanten,
    gegnerListe,
    ladeDaten,
    showToast,
    modus,
    setModus,
    selectedAkteId,
    setSelectedAkteId,
    bezugId,
    setBezugId,
    unserZeichen,
    setUnserZeichen,
    aktenzeichen,
    setAktenzeichen,
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
    faxZhd,
    setFaxZhd,
    unsereFirma,
    setUnsereFirma,
    unserAnsprechpartner,
    setUnserAnsprechpartner,
    unserTelefon,
    setUnserTelefon,
    unserEmail,
    setUnserEmail,
    thema,
    setThema,
    typ,
    setTyp,
    datum,
    setDatum,
    fristExtern,
    setFristExtern,
    wiedervorlage,
    setWiedervorlage,
    aktion,
    setAktion,
    kanal,
    setKanal,
    clearOldFristen,
    setClearOldFristen,
    dateien,
    setDateien,
    emailAnhaenge,
    setEmailAnhaenge,
    briefEntwurf,
    setBriefEntwurf,
    rawText,
    setRawText,
    versandPdfUrl,
    setVersandPdfUrl,
    tresorPrompt,
    setTresorPrompt,
    setGegnerPrompt,
    setJsonImport,
    setLaedt,
    setShowUploadReminder,
    setShowTriageModal,
    setShowVersandHistorie,
    zeigeErledigte,
    setZeigeErledigte,
    aufgeklappteAkten,
    setAufgeklappteAkten,
    mergeTargetId,
    setMergeTargetId,
    setMergeSourceId,
    setUploadingHistId,
    setFokussierteAkteId,
    setFokussierterHistId,
    setOpenMenuId,
    setActiveWarRoomDossier,
    setIsWarRoomOpen,
    autoGenRef
  });

  // Öffnet den War-Room direkt aus einer bestehenden Akte / Fallakte heraus
  const openWarRoomFromAkte = (targetAkte) => {
    if (!targetAkte) return;
    const histSorted = [...(targetAkte.akten_historie || [])].sort(
      (a, b) => new Date(b.datum || b.created_at || 0) - new Date(a.datum || a.created_at || 0)
    );
    const latestHist = histSorted[0] || null;
    const activeFristEntry = (targetAkte.akten_historie || []).find((h) => h.frist_extern);

    let crmFax = '';
    if (targetAkte.gegner_name) {
      const crmMatch = gegnerListe.find((g) => g.name && g.name.toLowerCase() === targetAkte.gegner_name.toLowerCase());
      if (crmMatch?.fax) crmFax = crmMatch.fax;
    }

    setActiveWarRoomDossier({
      akte_id: targetAkte.id,
      unser_zeichen: targetAkte.unser_zeichen || '',
      unsere_firma: targetAkte.unsere_firma || '',
      unser_ansprechpartner: targetAkte.unser_ansprechpartner || '',
      aktenzeichen: targetAkte.aktenzeichen || '',
      kontakt: targetAkte.gegner_name || '',
      ansprechpartner: targetAkte.gegner_ansprechpartner || '',
      gegner_fax: crmFax,
      gegner_email: targetAkte.gegner_email || '',
      thema: targetAkte.thema || '',
      frist_extern: activeFristEntry?.frist_extern || '',
      brief_entwurf: latestHist?.brief_entwurf || 'Siehe vollständige Akten-Historie & Fallakte.',
      raw_text: latestHist?.brief_entwurf || ''
    });
    setIsWarRoomOpen(true);
  };

  // Doppelte Alt-Aktennummern ermitteln (ohne Umhängen) + Filter & Sortierung
  const aktenNummernGruppen = {};
  akten.forEach((a) => {
    if (a.is_demo_showcase) return;
    const num = parseAktenNummer(a.unser_zeichen);
    if (num !== null) {
      const paddedKey = String(num).padStart(4, '0');
      if (!aktenNummernGruppen[paddedKey]) aktenNummernGruppen[paddedKey] = [];
      aktenNummernGruppen[paddedKey].push(a);
    }
  });
  const doppelteNummernListe = Object.entries(aktenNummernGruppen)
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  const sortByAktenNummerDesc = (a, b) => {
    const numA = parseAktenNummer(a.unser_zeichen);
    const numB = parseAktenNummer(b.unser_zeichen);
    if (numA !== null && numB !== null) {
      if (numA !== numB) return numB - numA;
      return (a.unser_zeichen || '').localeCompare(b.unser_zeichen || '', 'de', { numeric: true, sensitivity: 'base' });
    }
    if (numA !== null && numB === null) return -1;
    if (numA === null && numB !== null) return 1;
    return (a.unser_zeichen || '').localeCompare(b.unser_zeichen || '', 'de', { numeric: true, sensitivity: 'base' });
  };

  const gefilterteAkten = akten
    .filter((akte) => {
      if (duplikatNummerFilter) {
        if (akte.is_demo_showcase) return false;
        const num = parseAktenNummer(akte.unser_zeichen);
        return num !== null && String(num).padStart(4, '0') === duplikatNummerFilter;
      }
      if (!zeigeErledigte && akte.status === 'Erledigt') return false;
      if (!suchbegriff.trim()) return true;
      const s = suchbegriff.toLowerCase();
      const uZ = (akte.unser_zeichen || '').toLowerCase();
      const gName = (akte.gegner_name || '').toLowerCase();
      const gAns = (akte.gegner_ansprechpartner || '').toLowerCase();
      const az = (akte.aktenzeichen || '').toLowerCase();
      const uFirma = (akte.unsere_firma || '').toLowerCase();
      const th = (akte.thema || '').toLowerCase();
      const histMatch = akte.akten_historie?.some(
        (h) => (h.aktion || '').toLowerCase().includes(s) || (h.brief_entwurf || '').toLowerCase().includes(s)
      );
      return (
        uZ.includes(s) ||
        gName.includes(s) ||
        gAns.includes(s) ||
        az.includes(s) ||
        uFirma.includes(s) ||
        th.includes(s) ||
        histMatch
      );
    })
    .sort(sortByAktenNummerDesc);

  const sortedAktenForDropdown = [...akten].sort(sortByAktenNummerDesc);

  const getAkteDropdownText = (akte) =>
    `${akte.unser_zeichen ? `[${akte.unser_zeichen}]` : '[---]'} ${akte.gegner_name || 'Unbekannter Gegner'} | ${akte.thema || 'Ohne Gegenstand'}`;

  const alleAusgaenge = [];
  akten.forEach((a) => {
    if (a.akten_historie && a.akten_historie.length > 0) {
      a.akten_historie
        .filter((h) => h.typ === 'Ausgang')
        .forEach((h) => {
          alleAusgaenge.push({
            ...h,
            akte_id: a.id,
            unser_zeichen: a.unser_zeichen,
            aktenzeichen: a.aktenzeichen,
            gegner_name: a.gegner_name,
            gegner_ansprechpartner: a.gegner_ansprechpartner,
            unsere_firma: a.unsere_firma,
            thema: a.thema
          });
        });
    }
  });
  alleAusgaenge.sort((a, b) => new Date(b.datum || b.created_at || 0) - new Date(a.datum || a.created_at || 0));

  const anzeigeAusgaenge =
    modus === 'bestehend' && selectedAkteId
      ? alleAusgaenge.filter((a) => a.akte_id === selectedAkteId)
      : alleAusgaenge;

  const activeAkteObj = modus === 'bestehend' && selectedAkteId ? akten.find((a) => a.id === selectedAkteId) : null;
  const fallakteModalObj = fallakteModalAkteId ? akten.find((a) => a.id === fallakteModalAkteId) || null : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
      <AktenModals
        theme={theme}
        isDarkMode={isDarkMode}
        btnTextColor={btnTextColor}
        inputStyle={inputStyle}
        quickBtnStyle={quickBtnStyle}
        showTriageModal={showTriageModal}
        setShowTriageModal={setShowTriageModal}
        triageWvDate={triageWvDate}
        setTriageWvDate={setTriageWvDate}
        aktion={aktion}
        speichereEintragLogik={speichereEintragLogik}
        showUploadReminder={showUploadReminder}
        setShowUploadReminder={setShowUploadReminder}
        proceedToSaveOrTriage={proceedToSaveOrTriage}
        showVersandHistorie={showVersandHistorie}
        setShowVersandHistorie={setShowVersandHistorie}
        modus={modus}
        selectedAkteId={selectedAkteId}
        activeAkteObj={activeAkteObj}
        anzeigeAusgaenge={anzeigeAusgaenge}
        expandedVersandId={expandedVersandId}
        setExpandedVersandId={setExpandedVersandId}
        springeZuAkteAusgang={springeZuAkteAusgang}
      />

      <FallakteModal
        isOpen={Boolean(fallakteModalObj)}
        onClose={() => setFallakteModalAkteId(null)}
        akte={fallakteModalObj}
        theme={theme}
        isDarkMode={isDarkMode}
        isOwnerAccount={hasFullAccess}
        onLoadVorgangInMaske={ladeVorgangInMaske}
        onOpenWarRoom={openWarRoomFromAkte}
        onSyncFallakte={syncFallakteDocument}
        showToast={showToast}
      />

      {/* --- MAGIC IMPORT & KI-WEB-SCANNER --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px', width: '100%' }}>
        <div
          data-help="akten_magic_import"
          style={{ ...panelStyle, margin: 0, background: theme.hintBg, border: `1px dashed ${theme.accent}`, transition: 'border-color 0.3s ease' }}
        >
          <label style={{ ...labelStyle, color: theme.accent, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.3s ease' }}>
            <Icon name="folder" size={18} /> MAGIC IMPORT (JSON AUS SONAR WAR-ROOM)
          </label>
          <textarea
            id="magic-import"
            value={jsonImport}
            onChange={handleJsonImport}
            placeholder={
              isPrimaryOwner
                ? '{"typ": "Eingang", "unser_zeichen": "0001-SBS-Finanzamt", "thema": "..."}'
                : '{"typ": "Eingang", "unser_zeichen": "0001-UBN-Finanzamt", "thema": "..."}'
            }
            style={{
              ...inputStyle,
              background: 'rgba(0,0,0,0.1)',
              border: `1px solid ${theme.accent}`,
              color: theme.textMain,
              height: '100px',
              fontFamily: 'monospace',
              fontSize: '14px',
              marginTop: '5px',
              transition: 'border-color 0.3s ease'
            }}
          />
        </div>

        <div
          data-help="akten_web_scanner"
          style={{ ...panelStyle, margin: 0, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: `1px solid ${theme.border}` }}
        >
          <label style={{ ...labelStyle, color: theme.accent, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', transition: 'color 0.3s ease' }}>
            <Icon name="file" size={16} /> WEB-SCANNER &amp; MANUELLER UPLOAD (PDF/MD)
          </label>
          <input
            id="datei-upload-manuell"
            type="file"
            multiple
            disabled={webScanLaedt}
            onChange={(e) => {
              const chosen = Array.from(e.target.files || []);
              setDateien(chosen);
            }}
            style={{ ...inputStyle, border: `1px dashed ${theme.accent}`, cursor: 'pointer', padding: '10px', fontSize: '13px', transition: 'border-color 0.3s ease' }}
          />
          {dateien.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <span style={{ fontSize: '13px', color: theme.accent, fontWeight: 'bold' }}>
                <Icon name="folder" size={12} /> {dateien.length} Datei(en) gewählt ({dateien.map((d) => d.name).join(', ')})
              </span>
              <button
                type="button"
                disabled={webScanLaedt}
                onClick={() => handleWebScannerIngest(dateien)}
                style={{
                  background: theme.accent,
                  color: btnTextColor,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: webScanLaedt ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Icon name="brain" size={16} />
                <span>{webScanLaedt ? webScanStatus : 'PDF per KI-Web-Scanner auslesen & Akte vorbefüllen'}</span>
              </button>
            </div>
          )}
          {webScanLaedt && dateien.length === 0 && (
            <span style={{ fontSize: '12px', color: theme.accent, marginTop: '8px', fontWeight: 'bold' }}>
              {webScanStatus}
            </span>
          )}
        </div>
      </div>

      {/* --- FRISTEN-, WIEDERVORLAGE- & UST-RADAR --- */}
      <div data-help="akten_alarme_panel" style={{ width: '100%' }}>
        <AktenAlarme
          theme={theme}
          isDarkMode={isDarkMode}
          btnTextColor={btnTextColor}
          akten={akten}
          mandanten={mandanten}
          isAlarmsOpen={isAlarmsOpen}
          setIsAlarmsOpen={setIsAlarmsOpen}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          handleAlarmKlick={handleAlarmKlick}
          ladeVorgangInMaske={ladeVorgangInMaske}
          handleInlineEdit={handleInlineEdit}
          handleTerminVerschieben={handleTerminVerschieben}
          handleNachhaken={handleNachhaken}
          formatDatum={formatDatum}
          ladeDaten={ladeDaten}
          showToast={showToast}
        />
      </div>

      {/* --- AKTEN-ERFASSUNGS- & VERSANDFORMULAR --- */}
      <AktenFormular
        theme={theme}
        btnTextColor={btnTextColor}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        h4StyleAkten={h4StyleAkten}
        quickBtnStyle={quickBtnStyle}
        modus={modus}
        setModus={setModus}
        selectedAkteId={selectedAkteId}
        handleAkteAuswahl={handleAkteAuswahl}
        sortedAktenForDropdown={sortedAktenForDropdown}
        getAkteDropdownText={getAkteDropdownText}
        unserZeichen={unserZeichen}
        setUnserZeichen={setUnserZeichen}
        thema={thema}
        setThema={setThema}
        aktenzeichen={aktenzeichen}
        setAktenzeichen={setAktenzeichen}
        gegnerListe={gegnerListe}
        handleGegnerAuswahl={handleGegnerAuswahl}
        gegnerName={gegnerName}
        setGegnerName={setGegnerName}
        gegnerAnsprechpartner={gegnerAnsprechpartner}
        setGegnerAnsprechpartner={setGegnerAnsprechpartner}
        gegnerTelefon={gegnerTelefon}
        setGegnerTelefon={setGegnerTelefon}
        gegnerFax={gegnerFax}
        setGegnerFax={setGegnerFax}
        gegnerEmail={gegnerEmail}
        setGegnerEmail={setGegnerEmail}
        mandanten={mandanten}
        handleTresorAuswahl={handleTresorAuswahl}
        unsereFirma={unsereFirma}
        setUnsereFirma={setUnsereFirma}
        unserAnsprechpartner={unserAnsprechpartner}
        setUnserAnsprechpartner={setUnserAnsprechpartner}
        unserEmail={unserEmail}
        setUnserEmail={setUnserEmail}
        unserTelefon={unserTelefon}
        setUnserTelefon={setUnserTelefon}
        typ={typ}
        setTyp={setTyp}
        datum={datum}
        setDatum={setDatum}
        aktion={aktion}
        setAktion={setAktion}
        activeAkteObj={activeAkteObj}
        bezugId={bezugId}
        setBezugId={setBezugId}
        formatDatum={formatDatum}
        fristExtern={fristExtern}
        setFristExtern={setFristExtern}
        handleFristChange={handleFristChange}
        wiedervorlage={wiedervorlage}
        setWiedervorlage={setWiedervorlage}
        handleWVChange={handleWVChange}
        setzeWV={setzeWV}
        clearOldFristen={clearOldFristen}
        setClearOldFristen={setClearOldFristen}
        faxZhd={faxZhd}
        setFaxZhd={setFaxZhd}
        setShowVersandHistorie={setShowVersandHistorie}
        handleResendVersand={handleResendVersand}
        setActiveWarRoomDossier={setActiveWarRoomDossier}
        setIsWarRoomOpen={setIsWarRoomOpen}
        onOpenFallakte={(akteId) => setFallakteModalAkteId(akteId)}
        emailAnhaenge={emailAnhaenge}
        setEmailAnhaenge={setEmailAnhaenge}
        briefEntwurf={briefEntwurf}
        setBriefEntwurf={setBriefEntwurf}
        versandPdfUrl={versandPdfUrl}
        laedt={laedt}
        handleSpeichernCheck={handleSpeichernCheck}
        gegnerPrompt={gegnerPrompt}
        handleGegnerPromptAccept={handleGegnerPromptAccept}
        setGegnerPrompt={setGegnerPrompt}
        tresorPrompt={tresorPrompt}
        handleTresorPromptAccept={handleTresorPromptAccept}
        setTresorPrompt={setTresorPrompt}
        formatRufnummer={formatRufnummer}
        rawText={rawText}
        dateien={dateien}
        setDateien={setDateien}
        showUploadReminder={showUploadReminder}
        setShowUploadReminder={setShowUploadReminder}
        showTriageModal={showTriageModal}
        setShowTriageModal={setShowTriageModal}
        triageWvDate={triageWvDate}
        setTriageWvDate={setTriageWvDate}
        session={session}
        ladeDaten={ladeDaten}
        showToast={showToast}
      />

      {/* --- AKTEN-ÜBERSICHT & SHOWCASE-MUSTERAKTEN --- */}
      <div data-help="akten_liste_overview" style={{ width: '100%' }}>
        {doppelteNummernListe.length > 0 && (
          <div
            style={{
              marginTop: '24px',
              marginBottom: '-20px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: theme.hintBg,
              border: `1px solid ${theme.hintBorder}`,
              color: theme.textMain,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              textAlign: 'left',
              fontSize: '13px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Icon name="alert" size={16} style={{ color: theme.hintBorder, flexShrink: 0 }} />
              <span>
                <strong>Bestands-Hinweis (Alte Nummern-Zwillinge):</strong> Folgende Führungsnummern existieren mehrfach – bitte beim Prüfen auf Firmenkürzel &amp; Gegner achten (Klick filtert die Paare):
              </span>
              {doppelteNummernListe.map(([numStr, gruppe]) => {
                const isSelected = duplikatNummerFilter === numStr;
                return (
                  <button
                    key={numStr}
                    type="button"
                    onClick={() => setDuplikatNummerFilter(isSelected ? null : numStr)}
                    title={gruppe.map((g) => `${g.unser_zeichen} (${g.gegner_name || '-'})`).join(' | ')}
                    style={{
                      background: isSelected ? theme.hintBorder : 'transparent',
                      color: isSelected ? '#020617' : theme.textMain,
                      border: `1px solid ${theme.hintBorder}`,
                      borderRadius: '999px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    #{numStr} ({gruppe.length}x)
                  </button>
                );
              })}
            </div>

            {duplikatNummerFilter && (
              <button
                type="button"
                onClick={() => setDuplikatNummerFilter(null)}
                style={{
                  background: 'transparent',
                  color: theme.textMain,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✕ Filter #{duplikatNummerFilter} aufheben
              </button>
            )}
          </div>
        )}

        <AktenListe
          theme={theme}
          isDarkMode={isDarkMode}
          btnTextColor={btnTextColor}
          inputStyle={inputStyle}
          inlineInputStyle={inlineInputStyle}
          zeigeErledigte={zeigeErledigte}
          setZeigeErledigte={setZeigeErledigte}
          gefilterteAkten={gefilterteAkten}
          aufgeklappteAkten={aufgeklappteAkten}
          toggleAkte={toggleAkte}
          fokussierteAkteId={fokussierteAkteId}
          fokussierterHistId={fokussierterHistId}
          toggleAkteStatus={toggleAkteStatus}
          handleAkteStammdatenEdit={handleAkteStammdatenEdit}
          loescheAkte={loescheAkte}
          druckeAkte={druckeAkte}
          onOpenFallakte={(akteId) => setFallakteModalAkteId(akteId)}
          mergeSourceId={mergeSourceId}
          setMergeSourceId={setMergeSourceId}
          mergeTargetId={mergeTargetId}
          setMergeTargetId={setMergeTargetId}
          mergeAkte={mergeAkte}
          sortedAktenForDropdown={sortedAktenForDropdown}
          getAkteDropdownText={getAkteDropdownText}
          handleInlineEdit={handleInlineEdit}
          ladeVorgangInMaske={ladeVorgangInMaske}
          loescheHistorieEintrag={loescheHistorieEintrag}
          loescheDateiAusHistorie={loescheDateiAusHistorie}
          handleNachtragUploadAkte={handleNachtragUploadAkte}
          uploadingHistId={uploadingHistId}
          formatDatum={formatDatum}
        />
      </div>

      <MegaLegalModal
        isOpen={isWarRoomOpen}
        onClose={() => setIsWarRoomOpen(false)}
        dossier={activeWarRoomDossier}
        theme={theme}
        onApplySchriftsatz={(ausgangsJson) => {
          if (activeWarRoomDossier && activeWarRoomDossier.akte_id) {
            setModus('bestehend');
            setSelectedAkteId(activeWarRoomDossier.akte_id);
          }

          if (ausgangsJson.brief_entwurf) setBriefEntwurf(ausgangsJson.brief_entwurf);

          const isInvalid = (val) =>
            !val ||
            val.toLowerCase().includes('erforderlich') ||
            val.toLowerCase().includes('bescheid') ||
            val.toLowerCase().includes('unbekannt');

          if (ausgangsJson.thema && !isInvalid(ausgangsJson.thema) && !thema) setThema(ausgangsJson.thema);
          if (ausgangsJson.aktenzeichen && !isInvalid(ausgangsJson.aktenzeichen) && !aktenzeichen) {
            setAktenzeichen(ausgangsJson.aktenzeichen);
          }

          if (ausgangsJson.ansprechpartner && !isInvalid(ausgangsJson.ansprechpartner)) {
            setGegnerAnsprechpartner(ausgangsJson.ansprechpartner);
            setFaxZhd(ausgangsJson.ansprechpartner);
          }
          if (ausgangsJson.gegner_fax && !isInvalid(ausgangsJson.gegner_fax)) {
            setGegnerFax(formatRufnummer(ausgangsJson.gegner_fax));
          }
          if (ausgangsJson.gegner_email && !isInvalid(ausgangsJson.gegner_email)) {
            setGegnerEmail(ausgangsJson.gegner_email);
          }

          setTyp(ausgangsJson.typ || 'Ausgang');

          if (ausgangsJson.aktion) setAktion(ausgangsJson.aktion);

          const parsedWv = normalizeDateForInput(
            ausgangsJson.wiedervorlage || ausgangsJson.wv_intern || ausgangsJson.frist_extern || ''
          );
          if (parsedWv) {
            handleWVChange(parsedWv);
          }

          showToast('Schriftsatz übernommen! Akten-Kontext geschützt.', 'success');
        }}
      />
    </div>
  );
}