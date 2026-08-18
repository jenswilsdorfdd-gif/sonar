import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import AktenCockpit from './AktenCockpit';
import Wissensspeicher from './Wissensspeicher';
import FirmenTresor from './FirmenTresor';
import GegnerCrm from './GegnerCrm';

export default function Dashboard({ session }) {
  // --- GLOBALES ROUTING & THEME ---
  const [activeTab, setActiveTab] = useState('akten');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // --- GLOBALE DATEN-STATES (Source of Truth) ---
  const [akten, setAkten] = useState([]);
  const [mandanten, setMandanten] = useState([]);
  const [gegnerListe, setGegnerListe] = useState([]);
  const [wissenEintraege, setWissenEintraege] = useState([]);

  // --- GLOBALES TOAST-SYSTEM ---
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, fadingOut: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, fadingOut: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 4000);
  };

  // --- NEU: GLOBALE SUCHE & URL FETCH LOGIK ---
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
        showToast(`✅ Inhalte von ${urlStr} erfolgreich aus dem Netz geladen und im Schreibfenster eingefügt!`, 'success');
      }
    } catch (e) {
      console.error("Fehler beim Abrufen der URL:", e);
      showToast("❌ Fehler beim Abrufen der URL aus dem Netz.", 'error');
    }
    setWebFetchLoading(false);
  };

  // --- LOGOUT LOGIK ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); // Erzwingt sofortigen Sprung auf den Login-Screen
  };

  // --- THEME-ENGINE ---
  const theme = isDarkMode ? {
    bg: '#020617', cardBg: '#0f172a', border: '#1e293b', textMain: '#ffffff', textMuted: '#94a3b8',
    accent: '#00e5ff', accentHover: '#00b8cc', tresorAccent: '#2dd4bf', tresorBg: 'rgba(45, 212, 191, 0.1)',
    wissenAccent: '#a855f7', wissenBg: 'rgba(168, 85, 247, 0.1)',
    gegnerAccent: '#f43f5e', gegnerBg: 'rgba(244, 63, 94, 0.1)',
    inputBg: '#020617', inputBorder: '#334155', warningBg: 'rgba(244, 63, 94, 0.1)', warningBorder: '#f43f5e',
    warningText: '#fda4af', hintBg: 'rgba(250, 204, 21, 0.1)', hintBorder: '#facc15', hintText: '#fef08a',
    cardItemBg: 'rgba(15, 23, 42, 0.7)'
  } : {
    bg: '#f8fafc', cardBg: '#ffffff', border: '#e2e8f0', textMain: '#0f172a', textMuted: '#64748b',
    accent: '#0284c7', accentHover: '#0369a1', tresorAccent: '#0f766e', tresorBg: '#f0fdfa',
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
      case 'gegner': return theme.gegnerAccent;
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
    styleTag.innerHTML = `
      html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background-color: ${theme.bg} !important; overflow-x: hidden !important; }
      * { box-sizing: border-box !important; }
      input::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; transition: 0.2s; }
      input::-webkit-calendar-picker-indicator:hover { opacity: 1; }
      @keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
      @keyframes fadeOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
    `;

    return () => { if (styleTag) document.head.removeChild(styleTag); };
  }, [isDarkMode, theme.bg]);

  const ladeDaten = async () => {
    const { data: aktenData, error: aktenError } = await supabase
      .from('akten')
      .select('*, akten_historie (*)')
      .eq('status', 'Offen')
      .order('created_at', { ascending: false });

    if (!aktenError && aktenData) {
      aktenData.forEach(akte => {
        if (akte.akten_historie) {
          akte.akten_historie.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
      });
      setAkten(aktenData);
    }

    const { data: mandantenData } = await supabase.from('mandanten').select('*').order('firmenname', { ascending: true });
    if (mandantenData) setMandanten(mandantenData);

    const { data: gegnerData } = await supabase.from('gegner').select('*').order('name', { ascending: true });
    if (gegnerData) setGegnerListe(gegnerData);

    const { data: wissenData, error: wissenErr } = await supabase.from('wissensdatenbank').select('*').order('created_at', { ascending: false });
    if (!wissenErr && wissenData) {
      setWissenEintraege(wissenData);
    }
  };

  useEffect(() => { ladeDaten(); }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '100vh', position: 'relative' }}>

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

      <div style={{ width: '100%', maxWidth: '1200px', padding: 'max(15px, 2vw)', display: 'flex', flexDirection: 'column' }}>

        {/* --- HEADER & THEME TOGGLE & LOGOUT --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0, color: theme.textMain, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="signal" size={24} style={{ color: activeColor, transition: 'color 0.3s ease' }} /> SONAR COCKPIT
          </h1>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{ background: theme.cardBg, color: theme.textMain, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
              <Icon name={isDarkMode ? 'sun' : 'moon'} size={18} /> {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            
            <button
              onClick={handleLogout}
              style={{ background: 'transparent', color: theme.textMain, border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', opacity: 0.8 }}>
              <Icon name="x" size={18} /> Abmelden
            </button>
          </div>
        </div>

        {/* --- TAB NAVIGATION --- */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px', width: '100%' }}>
          <button
            onClick={() => setActiveTab('akten')}
            style={{ flex: '1 1 120px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'akten' ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'akten' ? theme.accent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="cabinet" size={22} /> Akten-Cockpit
          </button>

          <button
            onClick={() => setActiveTab('wissen')}
            style={{ flex: '1 1 120px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'wissen' ? `2px solid ${theme.wissenAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'wissen' ? theme.wissenAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="brain" size={22} /> 🧠 KI-Wissensspeicher ({wissenEintraege.length})
          </button>

          <button
            onClick={() => setActiveTab('tresor')}
            style={{ flex: '1 1 120px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'tresor' ? `2px solid ${theme.tresorAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'tresor' ? theme.tresorAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="building" size={22} /> Firmen-Tresor
          </button>

          <button
            onClick={() => setActiveTab('gegner')}
            style={{ flex: '1 1 120px', padding: '15px', fontSize: '15px', fontWeight: 'bold', borderRadius: '12px', border: activeTab === 'gegner' ? `2px solid ${theme.gegnerAccent}` : `1px solid ${theme.border}`, cursor: 'pointer', background: theme.cardBg, color: activeTab === 'gegner' ? theme.gegnerAccent : theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon name="shield" size={22} /> Behörden / Gegner CRM
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
          {webFetchLoading && <span style={{ fontSize: '12px', color: activeColor }}>🌐 Lade Webseite...</span>}
          {suchbegriff && (
            <button onClick={() => setSuchbegriff('')} style={{ background: 'transparent', border: 'none', color: theme.textMuted, cursor: 'pointer' }}>
              <Icon name="x" size={18} />
            </button>
          )}
        </div>

        {/* --- VIEWS ROUTING --- */}
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

      </div>
    </div>
  );
}