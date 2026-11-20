import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import AktenCockpit from './AktenCockpit';
import Wissensspeicher from './Wissensspeicher';
import FirmenTresor from './FirmenTresor';
import GegnerCrm from './GegnerCrm';
import Handbuch from './Handbuch';
import ComplianceRadar from './ComplianceRadar';
import RssFeedHealthAlert from './RssFeedHealthAlert';

export default function Dashboard({ session }) {
  // Haupt-Mandant (Owner) ID zum Schutz vor versehentlichem Demo-Reset
  const OWNER_USER_ID = 'ea175141-2c03-4f93-ba1b-392570229cb2';
  const isDemoUser = session?.user?.id && session.user.id !== OWNER_USER_ID;

  // --- GLOBALES ROUTING & THEME ---
  const [activeTab, setActiveTab] = useState('akten');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);

  // --- STATE FÜR DAS 3-TAB RECHTS-MODAL ('impressum' | 'datenschutz' | 'haftung' | null) ---
  const [legalModalTab, setLegalModalTab] = useState(null);

  // --- RESPONSIVE STATE FÜR HEADER-BUTTONS ---
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Initialer Check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- GLOBALE DATEN-STATES (Source of Truth) ---
  const [akten, setAkten] = useState([]);
  const [mandanten, setMandanten] = useState([]);
  const [gegnerListe, setGegnerListe] = useState([]);
  const [wissenEintraege, setWissenEintraege] = useState([]);

  // --- GLOBALES TOAST-SYSTEM (Dauer auf 7 Sekunden verlängert) ---
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, fadingOut: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, fadingOut: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 7000);
  };

  // --- GLOBALE SUCHE & URL FETCH LOGIK ---
  const [suchbegriff, setSuchbegriff] = useState('');
  const [webFetchLoading, setWebFetchLoading] = useState(false);
  const [globalUrlText, setGlobalUrlText] = useState(null);

  const handleLiveUrlFetch = async (urlStr) => {
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) return;
    setWebFetchLoading(true);
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(urlStr)}`);
      const data = await response.json();
      if (data.contents) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        const textContent = doc.body.innerText || doc.body.textContent || '';
        const cleanText = textContent.replace(/\s+/g, ' ').trim().substring(0, 3000);

        setGlobalUrlText(`--- LIVE WEBSEITEN-INHALT VON ${urlStr} ---\n\n${cleanText}`);
        setActiveTab('akten');
        showToast(`Inhalte von ${urlStr} erfolgreich aus dem Netz geladen und im Schreibfenster eingefügt.`, 'success');
      }
    } catch (e) {
      console.error("Fehler beim Abrufen der URL:", e);
      showToast("Fehler beim Abrufen der URL aus dem Netz.", 'error');
    }
    setWebFetchLoading(false);
  };

  // --- LOGOUT LOGIK ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // --- DEMO-DATEN BEREINIGEN (NUR FÜR NICHT-OWNER / DEMO-ACCOUNTS) ---
  const handleDemoReset = async () => {
    if (!isDemoUser || !session?.user?.id) return;
    const confirmReset = window.confirm(
      "DEMO-BEREINIGUNG (Datenschutz-Reset):\n\nMöchtest du alle in diesem Test-Account angelegten Akten, Dokumente (.pdf / .md), Mandanten und Gegner jetzt vollständig und unwiderruflich löschen?"
    );
    if (!confirmReset) return;

    setResetLoading(true);
    try {
      const uid = session.user.id;

      // 1. Hochgeladene Dateien dieses Demo-Users aus akten_historie ermitteln und im Storage löschen
      const { data: histRows } = await supabase
        .from('akten_historie')
        .select('dokument_url')
        .eq('user_id', uid);

      const filesToRemove = new Set();
      if (histRows && histRows.length > 0) {
        histRows.forEach(row => {
          if (row.dokument_url) {
            row.dokument_url.split(',').forEach(rawUrl => {
              const cleanUrl = rawUrl.trim();
              if (cleanUrl) {
                try {
                  const parts = decodeURIComponent(cleanUrl).split('/');
                  const fName = parts[parts.length - 1];
                  if (fName) {
                    filesToRemove.add(fName);
                    if (fName.toLowerCase().endsWith('.pdf')) {
                      filesToRemove.add(fName.replace(/\.pdf$/i, '.md'));
                    }
                  }
                } catch (err) {}
              }
            });
          }
        });
      }

      if (filesToRemove.size > 0) {
        await supabase.storage.from('dokumente').remove(Array.from(filesToRemove));
      }

      // 2. Alle Tabellen-Einträge dieses Demo-Users löschen (globale Gerichts-Streams haben eine andere/null user_id und bleiben unberührt!)
      await supabase.from('akten_historie').delete().eq('user_id', uid);
      await supabase.from('akten').delete().eq('user_id', uid);
      await supabase.from('mandanten').delete().eq('user_id', uid);
      await supabase.from('gegner').delete().eq('user_id', uid);
      await supabase.from('wissensdatenbank').delete().eq('user_id', uid);
      await supabase.from('import_queue').delete().eq('user_id', uid);

      await ladeDaten();
      showToast("Alle Test-Daten und Dokumente wurden rückstandslos gelöscht.", "success");
    } catch (err) {
      console.error("Fehler beim Demo-Reset:", err);
      showToast("Fehler beim Zurücksetzen der Demo-Daten: " + (err.message || err), "error");
    } finally {
      setResetLoading(false);
    }
  };

  // --- THEME-ENGINE ---
  const theme = isDarkMode ? {
    bg: '#020617', cardBg: '#0f172a', border: '#1e293b', textMain: '#ffffff', textMuted: '#94a3b8',
    accent: '#00e5ff', accentHover: '#00b8cc', tresorAccent: '#2dd4bf', tresorBg: 'rgba(45, 212, 191, 0.1)',
    complianceAccent: '#f59e0b', complianceBg: 'rgba(245, 158, 11, 0.1)',
    wissenAccent: '#a855f7', wissenBg: 'rgba(168, 85, 247, 0.1)',
    gegnerAccent: '#f43f5e', gegnerBg: 'rgba(244, 63, 94, 0.1)',
    handbuchAccent: '#10b981', handbuchBg: 'rgba(16, 185, 129, 0.1)',
    inputBg: '#020617', inputBorder: '#334155', warningBg: 'rgba(244, 63, 94, 0.1)', warningBorder: '#f43f5e',
    warningText: '#fda4af', hintBg: 'rgba(250, 204, 21, 0.1)', hintBorder: '#facc15', hintText: '#fef08a',
    cardItemBg: 'rgba(15, 23, 42, 0.7)'
  } : {
    bg: '#f8fafc', cardBg: '#ffffff', border: '#e2e8f0', textMain: '#0f172a', textMuted: '#64748b',
    accent: '#0284c7', accentHover: '#0369a1', tresorAccent: '#0f766e', tresorBg: '#f0fdfa',
    complianceAccent: '#d97706', complianceBg: '#fffbeb',
    wissenAccent: '#7e22ce', wissenBg: '#faf5ff',
    gegnerAccent: '#e11d48', gegnerBg: '#fff1f2',
    handbuchAccent: '#059669', handbuchBg: '#d1fae5',
    inputBg: '#f8fafc', inputBorder: '#cbd5e1', warningBg: '#fff1f2', warningBorder: '#e11d48',
    warningText: '#be123c', hintBg: '#fefce8', hintBorder: '#fde047', hintText: '#854d0e',
    cardItemBg: '#ffffff'
  };

  const getLogoColor = () => {
    switch (activeTab) {
      case 'wissen': return theme.wissenAccent;
      case 'tresor': return theme.tresorAccent;
      case 'compliance': return theme.complianceAccent;
      case 'gegner': return theme.gegnerAccent;
      case 'handbuch': return theme.handbuchAccent;
      default: return theme.accent;
    }
  };

  const activeColor = getLogoColor();

  useEffect(() => {
    const styleId = 'sonar-global-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    // --- CSS-MEDIA-QUERIES FÜR DAS HEADER-MENÜ ---
    styleTag.innerHTML = `
      html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background-color: ${theme.bg} !important; overflow-x: hidden !important; }
      * { box-sizing: border-box !important; }
      input::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; transition: 0.2s; }
      input::-webkit-calendar-picker-indicator:hover { opacity: 1; }
      @keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
      @keyframes fadeOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }

      .header-btn {
        padding: 8px 16px !important;
        gap: 8px !important;
      }

      @media (max-width: 850px) {
        .header-btn {
          padding: 8px 12px !important;
          gap: 0 !important;
        }
        .header-btn-text {
          display: none !important;
        }
      }
    `;

    return () => { if (styleTag) document.head.removeChild(styleTag); };
  }, [isDarkMode, theme.bg]);

  const ladeDaten = async () => {
    if (!session?.user?.id) return;
    const uid = session.user.id;

    // Alle Akten (Offen & Erledigt) laden, damit der Filter "Erledigte ein-/ausblenden" in AktenCockpit funktioniert
    const { data: aktenData, error: aktenError } = await supabase
      .from('akten')
      .select('*, akten_historie (*)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (!aktenError && aktenData) {
      aktenData.forEach(akte => {
        if (akte.akten_historie) {
          akte.akten_historie.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
      });
      setAkten(aktenData);
    }

    const { data: mandantenData } = await supabase
      .from('mandanten')
      .select('*')
      .eq('user_id', uid)
      .order('firmenname', { ascending: true });
    if (mandantenData) setMandanten(mandantenData);

    const { data: gegnerData } = await supabase
      .from('gegner')
      .select('*')
      .eq('user_id', uid)
      .order('name', { ascending: true });
    if (gegnerData) setGegnerListe(gegnerData);

    // Lädt eigene Wissenseinträge UND alle global freigegebenen Gerichts-Streams (mit PostgREST-konformen Anführungszeichen für Klammern/Leerzeichen!)
    const { data: wissenData, error: wissenErr } = await supabase
      .from('wissensdatenbank')
      .select('*')
      .or(`user_id.eq.${uid},firma.eq."Allgemein (Gerichte/Behörden)",datei_name.like.RSS_%`)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!wissenErr && wissenData) {
      setWissenEintraege(wissenData);
    } else {
      console.warn("Wissensdatenbank Or-Filter Hinweis, lade per Dual-Fallback:", wissenErr);
      const [{ data: ownWissen }, { data: rssWissen }] = await Promise.all([
        supabase.from('wissensdatenbank').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('wissensdatenbank').select('*').like('datei_name', 'RSS_%').order('created_at', { ascending: false }).limit(500)
      ]);
      const mergedMap = new Map();
      (ownWissen || []).forEach(r => mergedMap.set(r.id, r));
      (rssWissen || []).forEach(r => mergedMap.set(r.id, r));
      setWissenEintraege(Array.from(mergedMap.values()));
    }
  };

  useEffect(() => { ladeDaten(); }, [session?.user?.id]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '100vh', position: 'relative' }}>

      {/* --- GLOBALER RSS-HEALTH-ALARM (RENDERT NUR BEI DEFEKTEN FEEDS MIT STATUS = 'error') --- */}
      <RssFeedHealthAlert
        theme={theme}
        showToast={showToast}
        ladeDaten={ladeDaten}
        mode="popup"
      />

      {/* --- GLOBAL TOAST CONTAINER --- */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: theme.cardBg,
            color: theme.textMain,
            borderLeft: `5px solid ${t.type === 'success' ? '#10b981' : t.type === 'error' ? theme.gegnerAccent : theme.hintBorder}`,
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: isDarkMode ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '280px',
            maxWidth: '450px',
            wordBreak: 'break-word',
            border: `1px solid ${theme.border}`,
            animation: t.fadingOut ? 'fadeOut 0.3s forwards' : 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ color: t.type === 'success' ? '#10b981' : t.type === 'error' ? theme.gegnerAccent : theme.hintBorder }}>
              <Icon name={t.type === 'success' ? 'check' : t.type === 'error' ? 'x' : 'alert'} size={24} />
            </div>
            <div style={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.4', textAlign: 'left' }}>{t.message}</div>
          </div>
        ))}
      </div>

      {/* --- 3-TAB RECHTS-, DATENSCHUTZ- & HAFTUNGS-MODAL --- */}
      {legalModalTab && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 10060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setLegalModalTab(null)}
        >
          <div
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.border}`,
              borderRadius: '14px',
              maxWidth: '920px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
              textAlign: 'left'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER + TAB-AUSWAHL */}
            <div
              style={{
                padding: '16px 22px',
                background: theme.inputBg,
                borderBottom: `1px solid ${theme.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <strong style={{ color: theme.textMain, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="shield" size={20} style={{ color: theme.accent }} />
                  Rechtliche Hinweise, Datenschutz & Lizenzbedingungen (SMART SONAR COCKPIT)
                </strong>
                <button
                  type="button"
                  onClick={() => setLegalModalTab(null)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    color: theme.textMuted,
                    borderRadius: '6px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setLegalModalTab('impressum')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: legalModalTab === 'impressum' ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
                    background: legalModalTab === 'impressum' ? theme.accent : theme.cardBg,
                    color: legalModalTab === 'impressum' ? (isDarkMode ? '#000' : '#fff') : theme.textMain
                  }}
                >
                  Impressum (§ 5 DDG)
                </button>
                <button
                  type="button"
                  onClick={() => setLegalModalTab('datenschutz')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: legalModalTab === 'datenschutz' ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
                    background: legalModalTab === 'datenschutz' ? theme.accent : theme.cardBg,
                    color: legalModalTab === 'datenschutz' ? (isDarkMode ? '#000' : '#fff') : theme.textMain
                  }}
                >
                  Datenschutz & Cloud-Architektur (DSGVO / KI-VO)
                </button>
                <button
                  type="button"
                  onClick={() => setLegalModalTab('haftung')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    border: legalModalTab === 'haftung' ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
                    background: legalModalTab === 'haftung' ? theme.accent : theme.cardBg,
                    color: legalModalTab === 'haftung' ? (isDarkMode ? '#000' : '#fff') : theme.textMain
                  }}
                >
                  Lizenz-, Haftungs- & RDG/StBerG-Bedingungen
                </button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div
              style={{
                padding: '24px',
                overflowY: 'auto',
                color: theme.textMain,
                fontSize: '13.5px',
                lineHeight: '1.65',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {legalModalTab === 'impressum' && (
                <>
                  <h3 style={{ margin: 0, color: theme.accent, fontSize: '16px', textTransform: 'uppercase' }}>
                    ANBIETERKENNZEICHNUNG & IMPRESSUM GEMÄSS § 5 DIGITALE-DIENSTE-GESETZ (DDG)
                  </h3>

                  <div>
                    <strong>1. Lizenzgeberin, Systemarchitektur & Urheberin der Software-Engine („SMART SONAR COCKPIT“):</strong><br />
                    Wilsdorf & Sommer GmbH<br />
                    Geschäftsanschrift: Voglerstraße 28, 01277 Dresden, Deutschland<br />
                    Vertreten durch den einzelvertretungsberechtigten Geschäftsführer: Jens Wilsdorf<br />
                    Registergericht: Amtsgericht Dresden | Handelsregisternummer: HRB 43220<br />
                    Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE354922817<br />
                    Kontakt E-Mail: post@wilsdorf.org / wilsdorf.und.sommer@gmail.com<br />
                    Kontakt Telefax: 0351 85074535
                  </div>

                  <div>
                    <strong>2. Rechtlicher Status der Software-Instanz (Mandanten-Eigenbetrieb vs. Demo-Umgebung):</strong><br />
                    Diese Software-Applikation ist eine proprietäre B2B-Systemlösung zur technischen Post-, Akten- und Fristenverwaltung sowie zur KI-gestützten Textentwurfs-Automatisierung.
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>Im produktiven Kunden-Eigenbetrieb (Dedicated Instance / BYOC):</strong> Soweit diese Instanz im Rahmen eines B2B-Systemintegrations-, Pflege- und Lizenzvertrages für ein bestimmtes Unternehmen eingerichtet wurde, ist ausschließlich das jeweilige Lizenznehmer-Unternehmen Betreiber der Datenbank- und Versand-Infrastruktur sowie Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO. Die Wilsdorf & Sommer GmbH fungiert in diesem Verhältnis ausschließlich als technische Lizenzgeberin und IT-Support-Dienstleisterin ohne eigene Rechts- oder Steuerberatungsbefugnis.
                      </li>
                      <li>
                        <strong>Im Test- und Demonstrationsbetrieb (Demo-Modus):</strong> Soweit Dritten ein zeitlich und mengenmäßig limitierter Testzugang gewährt wird, dient dieser ausschließlich der unverbindlichen technischen Demonstration der Software-Funktionalitäten im geschäftlichen Verkehr (B2B nach § 14 BGB).
                      </li>
                    </ul>
                  </div>

                  <div>
                    <strong>3. Aufsichts- und Kammerhinweis (Abgrenzung zu § 3 RDG / § 5 StBerG):</strong><br />
                    Die Wilsdorf & Sommer GmbH ist ein IT-System- und Softwarehaus und weder eine zugelassene Rechtsanwaltsgesellschaft noch eine Steuerberatungsgesellschaft. Es werden durch die Lizenzgeberin keine Rechtsdienstleistungen im Sinne des § 2 Abs. 1 des Rechtsdienstleistungsgesetzes (RDG) und keine geschäftsmäßigen Hilfeleistungen in Steuersachen im Sinne des § 5 Abs. 1 des Steuerberatungsgesetzes (StBerG) erbracht.
                  </div>
                </>
              )}

              {legalModalTab === 'datenschutz' && (
                <>
                  <h3 style={{ margin: 0, color: theme.accent, fontSize: '16px', textTransform: 'uppercase' }}>
                    DATENSCHUTZ-, CLOUD-ARCHITEKTUR- & KI-TRANSPARENZHINWEISE (DSGVO & EU-KI-VO)
                  </h3>

                  <div>
                    <strong>1. Grundsatz der Datenhoheit (Bring Your Own Cloud / Bring Your Own Key – BYOK):</strong><br />
                    Das System „SMART SONAR COCKPIT“ folgt im produktiven B2B-Einsatz dem Prinzip der strikten mandantenbezogenen Infrastruktur-Trennung:
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>Verantwortlicher nach Art. 4 Nr. 7 DSGVO:</strong> Im produktiven Eigenbetrieb werden sämtliche Datenbanken (Supabase PostgreSQL & Storage-Buckets), E-Mail-/Fax-Versandschnittstellen (Resend API / Simple-Fax) sowie Schnittstellen zu großen Sprachmodellen (Google Gemini API / Anthropic Claude API) über dedizierte, im eigenen Namen und auf eigene Rechnung des Lizenznehmer-Unternehmens geführte Konten betrieben. Verantwortlicher für die Verarbeitung sämtlicher dort gespeicherter Personen-, Mandanten-, Behörden- und Verfahrensdaten ist allein das jeweilige Lizenznehmer-Unternehmen.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>Wartung und technischer Support durch die Wilsdorf & Sommer GmbH:</strong> Soweit die Wilsdorf & Sommer GmbH im Rahmen von Einrichtungs-, Wartungs- oder Entstörungsarbeiten (IT-Support) auf Wunsch des Lizenznehmers temporären Zugriff auf Systeme oder Metadaten erhält, erfolgt dies streng weisungsgebunden auf Grundlage eines gesonderten Auftragsverarbeitungsvertrages (AVV) gemäß Art. 28 Abs. 3 DSGVO.
                      </li>
                      <li>
                        <strong>Stateless-Lizenz- & Engine-Routing:</strong> Soweit die zentrale Triage-Engine der Wilsdorf & Sommer GmbH zur Laufzeitvalidierung und Prompt-Orchestrierung angesprochen wird, erfolgt die Verarbeitung flüchtig im Arbeitsspeicher (In-Memory / Stateless Pass-Through) unter Einsatz des kundeneigenen LLM-API-Schlüssels ohne dauerhafte Speicherung der Akteninhalte auf Servern der Lizenzgeberin.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <strong>2. Technische Verarbeitungspfade innerhalb der Applikation:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>Clientseitige OCR- & Textextraktion:</strong> Die Umwandlung hochgeladener PDF-Dokumente in strukturierte Textzwillinge (<code>.md</code>) erfolgt über PDF.js primär clientseitig im Arbeitsspeicher des Endgeräts, bevor das Originaldokument und der Textzwilling verschlüsselt (TLS 1.3 / AES-256) in der zugeordneten Supabase-Instanz abgelegt werden.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>Zugriffsschutz & Row Level Security (RLS):</strong> Die Datenbankarchitektur erzwingt über kryptografische Authentifizierungs-Tokens (JWT) und PostgreSQL Row Level Security (RLS) eine strikte logische Mandanten- und Kontentrennung.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>KI-Schnittstellen (LLM-API-Calls):</strong> Bei Aktivierung der KI-Triage (<code>sonar-ai-triage</code>) oder des strategischen War-Rooms (<code>MegaLegalModal</code>) werden die relevanten Textextrakte der Akte über verschlüsselte HTTPS-Endpunkte an die angebundenen Enterprise-KI-Schnittstellen (Google Ireland Ltd. / Google LLC bzw. Anthropic Ireland Ltd. / Anthropic PBC) übermittelt. Sofern kommerzielle Paid-API-Keys (Tier 1+ / Vertex AI / Anthropic Commercial API) des Lizenznehmers hinterlegt sind, unterliegen die API-Payloads gemäß den Enterprise-Bedingungen der Drittanbieter keinem Modell-Training durch die KI-Provider (Zero-Data-Retention / No-Training-Policy).
                      </li>
                      <li>
                        <strong>Digitaler Versand-Dispatch:</strong> Bei Auslösung des E-Mail- oder E-Fax-Versands (<code>sonar-send-email</code>) werden Empfängerdaten, Betreff und das generierte PDF-Schriftstück an den angebundenen Transaktionsdienstleister (Resend Inc. / Simple-Fax GmbH) zur unmittelbaren Übermittlung weitergeleitet.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <strong>3. Besondere Bestimmungen für den Demo- und Testmodus:</strong><br />
                    Nutzer eines unentgeltlichen Demo-Zugangs sind ausdrücklich angewiesen, im Testbetrieb <strong>keine ungeschwärzten Echt-Daten realer Dritter</strong>, keine besonderen Kategorien personenbezogener Daten (Art. 9 DSGVO) sowie keine dem Steuergeheimnis (§ 30 AO) oder einem Berufsgeheimnis (§ 203 StGB) unterliegenden Originaldokumente ohne vorherige Anonymisierung hochzuladen. Zur Verhinderung von Missbrauch und zur Durchsetzung des Nutzungslimits protokolliert das System in der Tabelle <code>demo_usage_log</code> die Benutzer-ID, die Login-E-Mail-Adresse sowie den Zeitstempel der Test-Transaktionen auf Grundlage unseres berechtigten Interesses am Schutz unserer Systemressourcen und Urheberrechte gemäß Art. 6 Abs. 1 Unterabs. 1 Buchst. f DSGVO.
                  </div>

                  <div>
                    <strong>4. Transparenzhinweis nach Art. 50 der Europäischen KI-Verordnung (Verordnung (EU) 2024/1689 – AI Act):</strong><br />
                    Diese Software setzt künstliche Intelligenz (Large Language Models) zur automatisierten Dokumentenanalyse, Fristenberechnung und Erstellung von Schriftsatzentwürfen ein. Sämtliche im Bereich „KI-Entwurf“, „Triage“ und „War-Room / SONAR NEMESIS“ erzeugten Analysen, Strategieoptionen und Brieftexte sind maschinell generierte Ausgaben eines KI-Systems und bedürfen vor ihrer Verwendung im Rechtsverkehr zwingend der eigenverantwortlichen menschlichen Prüfung und Freigabe durch den Nutzer (Human-in-the-Loop-Prinzip gemäß Art. 4 und Art. 14 KI-VO).
                  </div>
                </>
              )}

              {legalModalTab === 'haftung' && (
                <>
                  <h3 style={{ margin: 0, color: theme.accent, fontSize: '16px', textTransform: 'uppercase' }}>
                    NUTZUNGS-, LIZENZ-, HAFTUNGS- UND SCHUTZRECHTSBEDINGUNGEN (B2B)
                  </h3>

                  <div>
                    <strong>§ 1 Ausschließliche Ausrichtung auf Unternehmer (B2B) & Rechtsnatur der Software (Reines IT-Werkzeug)</strong><br />
                    (1) Das System „SMART SONAR COCKPIT“ richtet sich ausschließlich an Unternehmer im Sinne des § 14 Abs. 1 BGB, juristische Personen des öffentlichen Rechts und öffentlich-rechtliche Sondervermögen. Eine Nutzung durch Verbraucher (§ 13 BGB) ist ausgeschlossen.<br />
                    (2) Die Software stellt ein rein technisches Informations-, Dokumentenmanagement- und Textentwurfswerkzeug (Decision-Support- & Drafting-System) für die unternehmensinterne Eigenverwaltung des Lizenznehmers dar.<br />
                    (3) <strong>Keine Rechts- oder Steuerberatung (§ 3 RDG / § 5 StBerG):</strong> Die durch die Software-Algorithmen (<code>sonar-ai-triage</code> / <code>SONAR NEMESIS</code>) automatisiert erstellten rechtlichen oder steuerlichen Einschätzungen, Subsumtionen, Fristenberechnungen und Schriftsatzentwürfen stellen <strong>keine Rechtsdienstleistung nach § 2 Abs. 1 RDG</strong> und <strong>keine Hilfeleistung in Steuersachen nach § 5 Abs. 1 StBerG</strong> durch die Wilsdorf & Sommer GmbH dar. Das System ersetzt im Streit- oder Zweifelsfall nicht die Konsultation eines zugelassenen Rechtsanwalts, Patentanwalts, Steuerberaters oder Wirtschaftsprüfers.
                  </div>

                  <div>
                    <strong>§ 2 Eigenverantwortung des Nutzers (Mandatory Human-in-the-Loop) & Fristenkontrolle</strong><br />
                    (1) Große Sprachmodelle (LLMs) und OCR-Texterkennungsverfahren arbeiten probabilistisch und können trotz mehrstufiger algorithmischer Qualitätskontrollen (<code>STAGE_0_FORENSIC_LOCK</code> und <code>SONAR NEMESIS</code>) im Einzelfall Sachverhalte, Zahlen, Daten, Aktenzeichen, Gesetzesnormen oder Gerichtsurteile unvollständig erfassen, fehlinterpretieren oder fehlerhaft generieren („KI-Halluzinationen“).<br />
                    (2) <strong>Alleinige Prüf- und Freigabepflicht:</strong> Der Nutzer (insbesondere die Geschäftsführung bzw. die vertretungsberechtigten Organe des Lizenznehmers nach § 35 GmbHG / § 34 AO) ist zwingend verpflichtet, jeden durch das System generierten Schriftsatzentwurf, jede Fristenberechnung (insbesondere Not-, Einspruchs-, Widerspruchs- und Klagefristen nach AO, VwVfG, FGO, VwGO, SGG, ZPO) sowie jede Empfängeradresse vor dem elektronischen Versand per E-Mail oder Telefax eigenhändig auf sachliche, rechnerische und rechtliche Richtigkeit sowie Vollständigkeit zu überprüfen.<br />
                    (3) Mit dem Auslösen des Versandbefehls gibt der Nutzer eine eigene, ihm unmittelbar nach §§ 164 ff. BGB zuzurechnende Willens- bzw. Wissenserklärung im eigenen Namen ab. Die Software fungiert beim Versand über Resend oder Simple-Fax lediglich als technisches Übermittlungswerkzeug (Erklärungsbote).
                  </div>

                  <div>
                    <strong>§ 3 Haftungsbeschränkung & Ausschluss von § 536a Abs. 1 Alt. 1 BGB</strong><br />
                    (1) Die Wilsdorf & Sommer GmbH haftet unbeschränkt nur für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer Pflichtverletzung der Wilsdorf & Sommer GmbH, ihrer gesetzlichen Vertreter oder Erfüllungsgehilfen (§ 278 BGB) beruhen, sowie für sonstige Schäden, die auf Vorsatz oder grober Fahrlässigkeit (§ 276 BGB) oder dem Fehlen einer ausdrücklich übernommenen Beschaffenheitsgarantie (§ 443 BGB) oder Ansprüchen nach dem Produkthaftungsgesetz beruhen.<br />
                    (2) Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrages überhaupt erst ermöglicht und auf deren Einhaltung der Vertragspartner regelmäßig vertrauen darf (<strong>Kardinalpflichten</strong>, vgl. § 307 Abs. 2 Nr. 2 BGB), ist die Haftung der Wilsdorf & Sommer GmbH der Höhe nach auf den vertragstypischen, bei Vertragsschluss vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.<br />
                    (3) <strong>Ausschluss der verschuldensunabhängigen Garantiehaftung:</strong> Soweit auf die dauerhafte Überlassung, Systempflege oder Lizenzierung der Software oder einzelner Backend-Komponenten mietvertragliche Vorschriften (§§ 535 ff. BGB) Anwendung finden, wird die verschuldensunabhängige Garantiehaftung der Wilsdorf & Sommer GmbH für bei Vertragsschluss vorhandene (anfängliche) Mängel gemäß <strong>§ 536a Abs. 1 Alt. 1 BGB ausdrücklich ausgeschlossen</strong>.<br />
                    (4) <strong>Haftungsausschluss für Dritt-APIs & Versäumnis ungeprüfter KI-Entwürfe:</strong> Die Wilsdorf & Sommer GmbH übernimmt keine Haftung für Ausfälle, Rate-Limits oder Übermittlungsfehler externer Drittanbieter-Infrastrukturen (Supabase, Google Cloud/Gemini, Anthropic, Resend, Simple-Fax) sowie für Vermögensschäden, Rechtsverluste, Säumniszuschläge, Verspätungszuschläge oder Fristversäumnisse, die daraus resultieren, dass der Nutzer entgegen § 2 Abs. 2 einen KI-generierten Entwurf oder eine KI-Fristenberechnung ohne eigenverantwortliche sachliche und rechtliche Endkontrolle übernommen oder versendet hat (überwiegendes Mitverschulden des Nutzers gemäß § 254 Abs. 1 BGB).<br />
                    (5) Im reinen <strong>unentgeltlichen Demo- und Testbetrieb</strong> haftet die Wilsdorf & Sommer GmbH analog §§ 521, 599 BGB ausschließlich für Vorsatz und grobe Fahrlässigkeit.
                  </div>

                  <div>
                    <strong>§ 4 Urheberrechtsschutz (§§ 69a ff. UrhG), Laufzeitbindung & Schutz von Geschäftsgeheimnissen (GeschGehG)</strong><br />
                    (1) Sämtliche Rechte an der Software „SMART SONAR COCKPIT“, insbesondere am Quellcode, dem UI/UX-Design, der Datenbank-Architektur sowie vor allem an den <strong>juristischen Prüf-Algorithmen, System-Prompts, Forensik-Regelwerken (<code>STAGE_0_FORENSIC_LOCK</code>) und Red-Team-Validierungsroutinen (<code>SONAR NEMESIS</code> / <code>sonar-ai-triage</code>)</strong>, stehen im ausschließlichen geistigen Eigentum der Wilsdorf & Sommer GmbH und sind sowohl als Computerprogramme nach <strong>§§ 69a ff. UrhG</strong> als auch als streng vertrauliche Geschäftsgeheimnisse im Sinne des <strong>§ 2 Nr. 1 des Gesetzes zum Schutz von Geschäftsgeheimnissen (GeschGehG)</strong> geschützt.<br />
                    (2) Dem Lizenznehmer bzw. Nutzer wird – vorbehaltlich abweichender schriftlicher Individualvereinbarungen und unter der auflösenden Bedingung (§ 158 Abs. 2 BGB) der fristgerechten Zahlung der vereinbarten Setup- sowie laufenden Systempflege- und Engine-Nutzungspauschalen – lediglich ein einfaches, nicht übertragbares, nicht unterlizenzierbares und auf den eigenen internen Geschäftsbetrieb beschränktes Nutzungsrecht eingeräumt (§ 31 Abs. 2 UrhG). Bei Zahlungsverzug oder Beendigung des Pflege- und Lizenzverhältnisses ist die Wilsdorf & Sommer GmbH berechtigt, den Zugriff auf die zentrale KI-Triage-Engine (§§ 273, 320 BGB) bis zum Ausgleich der Rückstände technisch zu sperren; der Zugriff des Kunden auf seine in der eigenen Datenbank gespeicherten Bestandsdokumente bleibt hiervon unberührt.<br />
                    (3) <strong>Striktes Reverse-Engineering- & Extraktionsverbot:</strong> Es ist dem Nutzer und seinen Erfüllungsgehilfen strengstens untersagt, die Backend-Funktionen (insbesondere die Edge Function <code>sonar-ai-triage</code>), System-Prompts oder Prüfmatrizen ohne ausdrückliche schriftliche Zustimmung der Wilsdorf & Sommer GmbH auszulesen, zu dekompilieren (§ 69e UrhG bleibt nur im zwingenden gesetzlichen Rahmen unberührt), durch Prompt-Injection-Techniken zu extrahieren, zu vervielfältigen (§ 69c Nr. 1 UrhG), umzuarbeiten (§ 69c Nr. 2 UrhG), an Dritte weiterzugeben oder für den Aufbau eigener konkurrierender Software- oder KI-Produkte zu verwenden (§ 4 Abs. 2 und 3 GeschGehG).
                  </div>

                  <div>
                    <strong>§ 5 Rechtswahl, Erfüllungsort & Ausschließlicher Gerichtsstand Dresden</strong><br />
                    (1) Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).<br />
                    (2) Erfüllungsort sowie ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit der Bereitstellung, Lizenzierung und Nutzung dieser Software ist – soweit die Vertragsparteien Kaufleute, juristische Personen des öffentlichen Rechts oder öffentlich-rechtliche Sondervermögen sind – gemäß <strong>§ 38 Abs. 1 ZPO Dresden</strong>.
                  </div>
                </>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div
              style={{
                padding: '14px 22px',
                background: theme.inputBg,
                borderTop: `1px solid ${theme.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '11px', color: theme.textMuted }}>
                © 2026 Wilsdorf & Sommer GmbH – SMART SONAR COCKPIT. Alle Rechte vorbehalten (§§ 69a ff. UrhG, GeschGehG).
              </span>
              <button
                type="button"
                onClick={() => setLegalModalTab(null)}
                style={{
                  background: theme.accent,
                  color: isDarkMode ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 18px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '1200px', padding: 'max(15px, 2vw)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* --- HEADER & THEME TOGGLE & LOGOUT --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0, color: theme.textMain, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="signal" size={24} style={{ color: activeColor, transition: 'color 0.3s ease' }} /> SONAR COCKPIT
          </h1>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* --- DEMO-RESET BUTTON (NUR FÜR DEMO-/TEST-USER SICHTBAR) --- */}
            {isDemoUser && (
              <button
                title="Alle Test-Daten und Dokumente dieses Demo-Zugangs löschen"
                disabled={resetLoading}
                onClick={handleDemoReset}
                style={{
                  background: 'transparent',
                  color: theme.gegnerAccent,
                  border: `1px solid ${theme.gegnerAccent}`,
                  padding: isMobile ? '8px 12px' : '8px 16px',
                  borderRadius: '30px',
                  cursor: resetLoading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: isMobile ? '0' : '8px',
                  fontWeight: 'bold'
                }}
              >
                <Icon name="trash" size={18} />
                {!isMobile && <span>{resetLoading ? 'Bereinige...' : 'Demo zurücksetzen'}</span>}
              </button>
            )}

            {/* --- TECH-HANDBUCH BUTTON (STRIKT NUR FÜR OWNER SICHTBAR, IN TESTVERSION AUSGEBLENDET) --- */}
            {!isDemoUser && (
              <button
                title="Tech-Handbuch"
                onClick={() => setActiveTab('handbuch')}
                style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? '0' : '8px', fontWeight: 'bold' }}>
                <Icon name="book" size={18} />
                {!isMobile && <span>Tech-Handbuch</span>}
              </button>
            )}

            <button
              title={isDarkMode ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{ background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? '0' : '8px', fontWeight: 'bold' }}>
              <Icon name="sun" size={18} />
              {!isMobile && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>

            <button
              title="Abmelden"
              onClick={handleLogout}
              style={{ background: 'transparent', color: theme.gegnerAccent, border: `1px solid ${theme.gegnerAccent}`, padding: isMobile ? '8px 12px' : '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? '0' : '8px', fontWeight: 'bold' }}>
              <Icon name="x" size={18} />
              {!isMobile && <span>Abmelden</span>}
            </button>
          </div>
        </div>

        {/* --- TAB NAVIGATION (EXAKTE REIHENFOLGE: AKTEN – WIR – GEGNER – COMPLIANCE – WISSEN) --- */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px', width: '100%' }}>

          <button
            onClick={() => setActiveTab('akten')}
            style={{ flex: '1 1 110px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'akten' ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'akten' ? theme.accent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="cabinet" size={22} /> AKTEN
          </button>

          <button
            onClick={() => setActiveTab('tresor')}
            style={{ flex: '1 1 110px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'tresor' ? `2px solid ${theme.tresorAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'tresor' ? theme.tresorAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="building" size={22} /> WIR
          </button>

          <button
            onClick={() => setActiveTab('gegner')}
            style={{ flex: '1 1 110px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'gegner' ? `2px solid ${theme.gegnerAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'gegner' ? theme.gegnerAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="shield" size={22} /> GEGNER
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            style={{ flex: '1 1 130px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'compliance' ? `2px solid ${theme.complianceAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'compliance' ? theme.complianceAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="alert" size={22} /> COMPLIANCE
          </button>

          <button
            onClick={() => setActiveTab('wissen')}
            style={{ flex: '1 1 110px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'wissen' ? `2px solid ${theme.wissenAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'wissen' ? theme.wissenAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="brain" size={22} /> WISSEN
          </button>

        </div>

        {/* --- DYNAMISCHE VOLLTEXT-SUCHLEISTE (GLOBAL) --- */}
        <div style={{ background: theme.cardBg, borderRadius: '12px', padding: '12px 18px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${activeColor}`, transition: 'border-color 0.3s ease' }}>
          <Icon name="search" size={20} style={{ color: activeColor, transition: 'color 0.3s ease' }} />
          <input
            type="text"
            placeholder="Übergreifende Volltextsuche oder URL eingeben (z.B. https://finanzamt.de...)"
            value={suchbegriff}
            onChange={(e) => {
              const val = e.target.value;
              setSuchbegriff(val);
              if (val.startsWith('http://') || val.startsWith('https://')) {
                handleLiveUrlFetch(val);
              }
            }}
            style={{ width: '100%', background: 'transparent', border: 'none', color: theme.textMain, fontSize: '15px', outline: 'none' }}
          />
          {webFetchLoading && <span style={{ fontSize: '12px', color: activeColor }}>Lade Webseite...</span>}
          {suchbegriff && (
            <button onClick={() => setSuchbegriff('')} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer' }}>
              <Icon name="x" size={18} />
            </button>
          )}
        </div>

        {/* --- VIEWS ROUTING --- */}
        <div style={{ flex: '1 0 auto' }}>
          {activeTab === 'akten' && (
            <AktenCockpit
              session={session}
              theme={theme}
              akten={akten}
              mandanten={mandanten}
              gegnerListe={gegnerListe}
              ladeDaten={ladeDaten}
              showToast={showToast}
              suchbegriff={suchbegriff}
              globalUrlText={globalUrlText}
              setGlobalUrlText={setGlobalUrlText}
            />
          )}

          {activeTab === 'tresor' && (
            <FirmenTresor
              session={session}
              theme={theme}
              mandanten={mandanten}
              ladeDaten={ladeDaten}
              showToast={showToast}
              suchbegriff={suchbegriff}
            />
          )}

          {activeTab === 'gegner' && (
            <GegnerCrm
              session={session}
              theme={theme}
              gegnerListe={gegnerListe}
              ladeDaten={ladeDaten}
              showToast={showToast}
              suchbegriff={suchbegriff}
            />
          )}

          {activeTab === 'compliance' && (
            <ComplianceRadar
              session={session}
              theme={theme}
              mandanten={mandanten}
              akten={akten}
              ladeDaten={ladeDaten}
              showToast={showToast}
            />
          )}

          {activeTab === 'wissen' && (
            <Wissensspeicher
              theme={theme}
              wissenEintraege={wissenEintraege}
              mandanten={mandanten}
              gegnerListe={gegnerListe}
              ladeDaten={ladeDaten}
              showToast={showToast}
              suchbegriff={suchbegriff}
            />
          )}

          {/* --- HANDBUCH VIEW (STRIKT NUR FÜR OWNER) --- */}
          {!isDemoUser && activeTab === 'handbuch' && (
            <Handbuch theme={theme} />
          )}
        </div>

        {/* --- DURCHGÄNGIGER RECHTS-, URHEBERRECHTS- & COMPLIANCE-FOOTER --- */}
        <footer
          style={{
            marginTop: '48px',
            paddingTop: '18px',
            paddingBottom: '14px',
            borderTop: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12px',
            color: theme.textMuted
          }}
        >
          <div style={{ fontWeight: 'bold', color: theme.textMain }}>
            © 2026 Wilsdorf & Sommer GmbH – SMART SONAR COCKPIT. Alle Rechte vorbehalten (§§ 69a ff. UrhG, GeschGehG).
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setLegalModalTab('impressum')}
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.accent,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              Impressum (§ 5 DDG)
            </button>

            <button
              type="button"
              onClick={() => setLegalModalTab('datenschutz')}
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.accent,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              Datenschutz & Cloud-Architektur (DSGVO / KI-VO)
            </button>

            <button
              type="button"
              onClick={() => setLegalModalTab('haftung')}
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.accent,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              Lizenz-, Haftungs- & RDG/StBerG-Bedingungen
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
}