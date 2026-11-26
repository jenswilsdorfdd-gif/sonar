import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import AktenCockpit from './AktenCockpit';
import Wissensspeicher from './Wissensspeicher';
import FirmenTresor from './FirmenTresor';
import GegnerCrm from './GegnerCrm';
import ComplianceRadar from './ComplianceRadar';
import RssFeedHealthAlert from './RssFeedHealthAlert';
import InteractiveHelpDock from './InteractiveHelpDock';
import SupportCenterModal from './SupportCenterModal';
import LegalModal from './LegalModal';
import { getActiveLegalOperator } from './config/sonarLegalConfig';
import { isFullAccessSession } from './config/authRoles';

export default function Dashboard({ session }) {
  // Vollzugangs-Erkennung (Jens + Partner-Vollzugang Nico) zum Schutz vor Demo-Drosselung & Demo-Reset
  const hasFullAccess = isFullAccessSession(session);
  const isDemoUser = Boolean(session?.user?.id && !hasFullAccess);
  const legalOperator = getActiveLegalOperator();

  // --- ZWEITE SICHERHEITS-SCHRANKE FÜR REINE DEMO-ZUGÄNGE ---
  const [approvalChecking, setApprovalChecking] = useState(Boolean(isDemoUser));
  const [approvalDenied, setApprovalDenied] = useState(false);

  // --- GLOBALES ROUTING & THEME ---
  const [activeTab, setActiveTab] = useState('akten');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);

  // --- LIVE-BEDIENHILFE (2/3 DESKTOP-DOCK & SMARTPHONE "i"-BADGES) ---
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // --- ZENTRALES SUPPORT-, FREIGABE- & TICKET-CENTER ---
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);

  // --- STATE FÜR DAS AUSGELAGERTE 3-TAB RECHTS-MODAL ('impressum' | 'datenschutz' | 'haftung' | null) ---
  const [legalModalTab, setLegalModalTab] = useState(null);

  // --- RESPONSIVE STATES FÜR HEADER-BUTTONS (<= 768px) & SPLIT-DOCK (<= 1024px) ---
  const [isMobile, setIsMobile] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsCompactViewport(window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prüft für reine Demo-Nutzer (!hasFullAccess), ob ihre E-Mail tatsächlich in demo_access_requests freigegeben ('approved') ist
  useEffect(() => {
    const checkDemoGate = async () => {
      if (!session?.user?.id) return;
      if (isFullAccessSession(session)) {
        setApprovalChecking(false);
        setApprovalDenied(false);
        return;
      }

      setApprovalChecking(true);
      try {
        const { data: isApproved, error } = await supabase.rpc('verify_my_demo_approval');
        if (!error && isApproved === false) {
          setApprovalDenied(true);
          setTimeout(async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }, 3200);
          return;
        }
        setApprovalDenied(false);
      } catch (err) {
        console.warn('Hinweis bei Demo-Freigabeprüfung:', err);
      } finally {
        setApprovalChecking(false);
      }
    };

    checkDemoGate();
  }, [session?.user?.id, session?.user?.email]);

  // Setzt eine Body-Klasse für die dezente Hover-Markierung im Desktop-2/3-Modus
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isHelpOpen && !isCompactViewport) {
      document.body.classList.add('sonar-live-help-desktop');
    } else {
      document.body.classList.remove('sonar-live-help-desktop');
    }
    return () => {
      document.body.classList.remove('sonar-live-help-desktop');
    };
  }, [isHelpOpen, isCompactViewport]);

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

  // --- DEMO-DATEN BEREINIGEN (STRIKT NUR FÜR REINE DEMO-ACCOUNTS) ---
  const handleDemoReset = async () => {
    if (!isDemoUser || !session?.user?.id) return;
    const confirmReset = window.confirm(
      "DEMO-BEREINIGUNG (Datenschutz-Reset):\n\nMöchtest du alle in diesem Test-Account selbst angelegten Akten, Dokumente (.pdf / .md), Mandanten und Gegner jetzt vollständig und unwiderruflich löschen? (Die schreibgeschützten Musterakten sowie deine Support-Mitteilungen bleiben erhalten.)"
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

      // 2. Alle Tabellen-Einträge dieses Demo-Users löschen (globale Musterakten, Gerichts-Streams & Support-Tickets bleiben unberührt!)
      await supabase.from('akten_historie').delete().eq('user_id', uid);
      await supabase.from('akten').delete().eq('user_id', uid);
      await supabase.from('mandanten').delete().eq('user_id', uid);
      await supabase.from('gegner').delete().eq('user_id', uid);
      await supabase.from('wissensdatenbank').delete().eq('user_id', uid);
      await supabase.from('import_queue').delete().eq('user_id', uid);

      await ladeDaten();
      showToast("Alle eigenen Test-Daten und Dokumente wurden rückstandslos gelöscht.", "success");
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
    inputBg: '#020617', inputBorder: '#334155', warningBg: 'rgba(244, 63, 94, 0.1)', warningBorder: '#f43f5e',
    warningText: '#fda4af', hintBg: 'rgba(250, 204, 21, 0.1)', hintBorder: '#facc15', hintText: '#fef08a',
    cardItemBg: 'rgba(15, 23, 42, 0.7)'
  } : {
    bg: '#f8fafc', cardBg: '#ffffff', border: '#e2e8f0', textMain: '#0f172a', textMuted: '#64748b',
    accent: '#0284c7', accentHover: '#0369a1', tresorAccent: '#0f766e', tresorBg: '#f0fdfa',
    complianceAccent: '#d97706', complianceBg: '#fffbeb',
    wissenAccent: '#7e22ce', wissenBg: '#faf5ff',
    gegnerAccent: '#e11d48', gegnerBg: '#fff1f2',
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
      default: return theme.accent;
    }
  };

  const activeColor = getLogoColor();

  // --- DYNAMISCHE REITER-FARBE FÜR DIE HEADER-FUNKTIONSBUTTONS ---
  const headerActionColor = activeTab === 'gegner'
    ? (isDarkMode ? '#94a3b8' : '#64748b')
    : activeColor;

  const getInvertedTextForFill = () => {
    if (activeTab === 'gegner') {
      return isDarkMode ? '#020617' : '#ffffff';
    }
    if (!isDarkMode) {
      return '#ffffff';
    }
    return '#020617';
  };

  const getHeaderActionPillStyle = (isActive) => ({
    background: isActive ? headerActionColor : 'transparent',
    color: isActive ? getInvertedTextForFill() : headerActionColor,
    border: `1px solid ${headerActionColor}`,
    padding: isMobile ? '8px 12px' : '8px 16px',
    borderRadius: '30px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '5px' : '8px',
    fontWeight: 'bold',
    fontSize: '13px',
    lineHeight: 1.2,
    transition: 'all 0.22s ease'
  });

  const getHeaderDangerPillStyle = (isBusy = false) => ({
    background: 'transparent',
    color: theme.gegnerAccent,
    border: `1px solid ${theme.gegnerAccent}`,
    padding: isMobile ? '8px 12px' : '8px 16px',
    borderRadius: '30px',
    cursor: isBusy ? 'wait' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0' : '8px',
    fontWeight: 'bold',
    fontSize: '13px',
    lineHeight: 1.2,
    transition: 'all 0.22s ease'
  });

  const footerLinkStyle = {
    background: 'transparent',
    border: 'none',
    color: activeColor,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: 0,
    textDecoration: 'underline',
    transition: 'color 0.25s ease'
  };

  useEffect(() => {
    const styleId = 'sonar-global-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
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
    const isFullUser = isFullAccessSession(session);

    let aktenQuery = supabase
      .from('akten')
      .select('*, akten_historie (*)')
      .order('created_at', { ascending: false });

    // Vollzugänge (Jens & Nico) laden jeweils strikt ihre eigenen echten Akten; Demo-Tester sehen zusätzlich die 3 Musterakten
    if (isFullUser) {
      aktenQuery = aktenQuery.eq('user_id', uid);
    } else {
      aktenQuery = aktenQuery.or(`user_id.eq.${uid},is_demo_showcase.eq.true`);
    }

    const { data: aktenData, error: aktenError } = await aktenQuery;

    if (!aktenError && aktenData) {
      aktenData.forEach(akte => {
        if (akte.akten_historie) {
          akte.akten_historie.sort((a, b) => new Date(b.datum || b.created_at) - new Date(a.datum || a.created_at));
        }
      });

      const sortedAkten = [...aktenData].sort((a, b) => {
        const aShow = Boolean(a.is_demo_showcase);
        const bShow = Boolean(b.is_demo_showcase);
        if (aShow !== bShow) return aShow ? 1 : -1;
        if (aShow && bShow) {
          return String(a.unser_zeichen || '').localeCompare(String(b.unser_zeichen || ''));
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setAkten(sortedAkten);
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

    // Strikt mandantenisolierter Wissensspeicher (eigene Dokumente + globale Gerichts-Streams)
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

  useEffect(() => {
    if (!approvalChecking && !approvalDenied) {
      ladeDaten();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, approvalChecking, approvalDenied]);

  if (approvalChecking) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
        Prüfe Zugangs-Freigabe...
      </div>
    );
  }

  if (approvalDenied) {
    return (
      <div style={{ minHeight: '100vh', background: '#020617', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '460px', background: '#0f172a', border: '1px solid #f43f5e', borderRadius: '14px', padding: '28px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#fda4af' }}>Testzugang noch nicht freigeschaltet</h3>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
            Für diese E-Mail-Adresse liegt aktuell keine aktive Freischaltung vor. Sie werden zur Anmeldeseite zurückgeleitet.
          </p>
        </div>
      </div>
    );
  }

  const desktopSplitActive = isHelpOpen && !isCompactViewport;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: desktopSplitActive ? 'space-between' : 'center',
        width: '100%',
        minHeight: '100vh',
        position: 'relative'
      }}
    >

      {/* --- GLOBALER RSS-HEALTH-ALARM --- */}
      <RssFeedHealthAlert
        theme={theme}
        showToast={showToast}
        ladeDaten={ladeDaten}
        mode="popup"
      />

      {/* --- ZENTRALES SUPPORT-, FREIGABE- & TICKET-CENTER --- */}
      <SupportCenterModal
        session={session}
        theme={theme}
        isDarkMode={isDarkMode}
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        onUnreadCountChange={setSupportUnreadCount}
        showToast={showToast}
      />

      {/* --- GLOBAL TOAST CONTAINER --- */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: isMobile ? '12px' : (desktopSplitActive ? 'calc(33.333% + 16px)' : '20px'),
          left: isMobile ? '12px' : 'auto',
          zIndex: 10110,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{
            pointerEvents: 'auto',
            background: theme.cardBg,
            color: theme.textMain,
            borderLeft: `5px solid ${t.type === 'success' ? '#10b981' : t.type === 'error' ? theme.gegnerAccent : theme.hintBorder}`,
            padding: '14px 18px',
            borderRadius: '8px',
            boxShadow: isDarkMode ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: isMobile ? '0' : '280px',
            maxWidth: isMobile ? '100%' : '450px',
            wordBreak: 'break-word',
            border: `1px solid ${theme.border}`,
            animation: t.fadingOut ? 'fadeOut 0.3s forwards' : 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ color: t.type === 'success' ? '#10b981' : t.type === 'error' ? theme.gegnerAccent : theme.hintBorder, flexShrink: 0 }}>
              <Icon name={t.type === 'success' ? 'check' : t.type === 'error' ? 'x' : 'alert'} size={22} />
            </div>
            <div style={{ fontSize: '13.5px', whiteSpace: 'pre-wrap', lineHeight: '1.4', textAlign: 'left' }}>{t.message}</div>
          </div>
        ))}
      </div>

      {/* --- AUSGELAGERTES 3-TAB RECHTS-, DATENSCHUTZ- & LIZENZ-MODAL --- */}
      <LegalModal
        legalModalTab={legalModalTab}
        setLegalModalTab={setLegalModalTab}
        theme={theme}
        activeColor={activeColor}
        isDarkMode={isDarkMode}
      />

      {/* --- HAUPT-ARBEITSBEREICH (2/3 BEI AKTIVEM DESKTOP-DOCK, SONST ZENTRIERT BIS 1200PX) --- */}
      <div
        style={{
          flex: desktopSplitActive ? '1 1 66.666%' : '0 1 1200px',
          width: desktopSplitActive ? '66.666%' : '100%',
          maxWidth: desktopSplitActive ? 'none' : '1200px',
          minWidth: 0,
          margin: desktopSplitActive ? '0' : '0 auto',
          padding: 'max(14px, 2vw)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}
      >

        {/* --- HEADER: DURCHGÄNGIG REITER-KONSISTENTES OUTLINE-/AKTIV-PANEL --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0, color: theme.textMain, fontSize: isMobile ? '20px' : '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="signal" size={24} style={{ color: activeColor, transition: 'color 0.3s ease' }} /> SONAR COCKPIT
          </h1>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* 1. LIVE-BEDIENHILFE */}
            <button
              type="button"
              data-sonar-help-ignore="true"
              title={isHelpOpen ? 'Interaktive Live-Bedienhilfe ausschalten' : 'Interaktive Live-Bedienhilfe einschalten'}
              onClick={() => setIsHelpOpen(!isHelpOpen)}
              style={getHeaderActionPillStyle(isHelpOpen)}
            >
              <Icon name="bulb" size={18} />
              <span>{isMobile ? (isHelpOpen ? 'Hilfe AN' : 'Hilfe') : (isHelpOpen ? 'Live-Hilfe aktiv' : 'Live-Hilfe')}</span>
            </button>

            {/* OPTIONAL FÜR REINE TESTER: DEMO ZURÜCKSETZEN */}
            {isDemoUser && (
              <button
                type="button"
                data-help="header_demo_reset"
                title="Alle eigenen Test-Daten und Dokumente dieses Demo-Zugangs löschen"
                disabled={resetLoading}
                onClick={handleDemoReset}
                style={getHeaderDangerPillStyle(resetLoading)}
              >
                <Icon name="trash" size={18} />
                {!isMobile && <span>{resetLoading ? 'Bereinige...' : 'Demo zurücksetzen'}</span>}
              </button>
            )}

            {/* 2. SUPPORT MIT LIVE-BADGE */}
            <button
              type="button"
              data-sonar-help-ignore="true"
              title={
                supportUnreadCount > 0
                  ? `Support & Mitteilungen (${supportUnreadCount} neu)`
                  : 'Support & Mitteilungen öffnen'
              }
              onClick={() => setIsSupportOpen(!isSupportOpen)}
              style={{
                ...getHeaderActionPillStyle(isSupportOpen),
                position: 'relative',
                gap: isMobile ? '0' : '8px'
              }}
            >
              <Icon name="support" size={18} />
              {!isMobile && <span>Support</span>}
              {supportUnreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-5px',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 6px',
                    borderRadius: '999px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 900,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.6)',
                    lineHeight: 1
                  }}
                >
                  {supportUnreadCount > 99 ? '99+' : supportUnreadCount}
                </span>
              )}
            </button>

            {/* 3. LIGHT / DARK MODE */}
            <button
              type="button"
              data-help="header_theme_toggle"
              title={isDarkMode ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                ...getHeaderActionPillStyle(!isDarkMode),
                gap: isMobile ? '0' : '8px'
              }}
            >
              <Icon name={isDarkMode ? 'sun' : 'moon'} size={18} />
              {!isMobile && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>

            {/* 4. ABMELDEN */}
            <button
              type="button"
              title="Abmelden"
              onClick={handleLogout}
              style={getHeaderDangerPillStyle(false)}
            >
              <Icon name="x" size={18} />
              {!isMobile && <span>Abmelden</span>}
            </button>
          </div>
        </div>

        {/* --- TAB NAVIGATION (AKTEN – WIR – GEGNER – COMPLIANCE – WISSEN) --- */}
        <div
          data-help="nav_tabs"
          style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '10px' : '15px', marginBottom: '20px', width: '100%' }}
        >
          <button
            onClick={() => setActiveTab('akten')}
            style={{ flex: isMobile ? '1 1 calc(50% - 10px)' : '1 1 110px', padding: isMobile ? '12px 10px' : '15px', fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'akten' ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'akten' ? theme.accent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="cabinet" size={22} /> AKTEN
          </button>

          <button
            onClick={() => setActiveTab('tresor')}
            style={{ flex: isMobile ? '1 1 calc(50% - 10px)' : '1 1 110px', padding: isMobile ? '12px 10px' : '15px', fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'tresor' ? `2px solid ${theme.tresorAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'tresor' ? theme.tresorAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="building" size={22} /> WIR
          </button>

          <button
            onClick={() => setActiveTab('gegner')}
            style={{ flex: isMobile ? '1 1 calc(50% - 10px)' : '1 1 110px', padding: isMobile ? '12px 10px' : '15px', fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'gegner' ? `2px solid ${theme.gegnerAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'gegner' ? theme.gegnerAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="shield" size={22} /> GEGNER
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            style={{ flex: isMobile ? '1 1 calc(50% - 10px)' : '1 1 130px', padding: isMobile ? '12px 10px' : '15px', fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'compliance' ? `2px solid ${theme.complianceAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'compliance' ? theme.complianceAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="alert" size={22} /> COMPLIANCE
          </button>

          <button
            onClick={() => setActiveTab('wissen')}
            style={{ flex: isMobile ? '1 1 100%' : '1 1 110px', padding: isMobile ? '12px 10px' : '15px', fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'wissen' ? `2px solid ${theme.wissenAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'wissen' ? theme.wissenAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="brain" size={22} /> WISSEN
          </button>
        </div>

        {/* --- DYNAMISCHE VOLLTEXT-SUCHLEISTE (GLOBAL) --- */}
        <div
          data-help="global_search"
          style={{ background: theme.cardBg, borderRadius: '12px', padding: '12px 18px', marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${activeColor}`, transition: 'border-color 0.3s ease' }}
        >
          <Icon name="search" size={20} style={{ color: activeColor, transition: 'color 0.3s ease', flexShrink: 0 }} />
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
            style={{ width: '100%', minWidth: 0, background: 'transparent', border: 'none', color: theme.textMain, fontSize: isMobile ? '14px' : '15px', outline: 'none' }}
          />
          {webFetchLoading && <span style={{ fontSize: '12px', color: activeColor, whiteSpace: 'nowrap' }}>Lade Webseite...</span>}
          {suchbegriff && (
            <button onClick={() => setSuchbegriff('')} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="x" size={18} />
            </button>
          )}
        </div>

        {/* --- VIEWS ROUTING --- */}
        <div style={{ flex: '1 0 auto', minWidth: 0 }}>
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
            <div data-help="tresor_main">
              <FirmenTresor
                session={session}
                theme={theme}
                mandanten={mandanten}
                ladeDaten={ladeDaten}
                showToast={showToast}
                suchbegriff={suchbegriff}
              />
            </div>
          )}

          {activeTab === 'gegner' && (
            <div data-help="gegner_crm_main">
              <GegnerCrm
                session={session}
                theme={theme}
                gegnerListe={gegnerListe}
                ladeDaten={ladeDaten}
                showToast={showToast}
                suchbegriff={suchbegriff}
              />
            </div>
          )}

          {activeTab === 'compliance' && (
            <div data-help="compliance_radar_main">
              <ComplianceRadar
                session={session}
                theme={theme}
                mandanten={mandanten}
                akten={akten}
                ladeDaten={ladeDaten}
                showToast={showToast}
              />
            </div>
          )}

          {activeTab === 'wissen' && (
            <div data-help="wissen_main">
              <Wissensspeicher
                theme={theme}
                wissenEintraege={wissenEintraege}
                mandanten={mandanten}
                gegnerListe={gegnerListe}
                ladeDaten={ladeDaten}
                showToast={showToast}
                suchbegriff={suchbegriff}
              />
            </div>
          )}
        </div>

        {/* --- DURCHGÄNGIGER RECHTS-, URHEBERRECHTS- & COMPLIANCE-FOOTER (STEUERBAR ÜBER SONARLEGALCONFIG.JS) --- */}
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
            {legalOperator.footerCopyrightLine}
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setLegalModalTab('impressum')}
              style={footerLinkStyle}
            >
              Impressum (§ 5 DDG)
            </button>

            <button
              type="button"
              onClick={() => setLegalModalTab('datenschutz')}
              style={footerLinkStyle}
            >
              Datenschutz &amp; Cloud-Architektur (DSGVO / KI-VO)
            </button>

            <button
              type="button"
              onClick={() => setLegalModalTab('haftung')}
              style={footerLinkStyle}
            >
              Lizenz-, Haftungs- &amp; RDG/StBerG-Bedingungen
            </button>
          </div>
        </footer>

      </div>

      {/* --- RECHTES 1/3 LIVE-INSPEKTOR-DOCK (> 1024px) BZW. SMARTPHONE-POPUP-CONTROLLER (<= 1024px) --- */}
      <InteractiveHelpDock
        isOpen={isHelpOpen}
        onOpen={() => setIsHelpOpen(true)}
        onClose={() => setIsHelpOpen(false)}
        theme={theme}
        isDarkMode={isDarkMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCompactViewport={isCompactViewport}
      />

    </div>
  );
}