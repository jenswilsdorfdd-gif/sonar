// src/InteractiveHelpDock.jsx
// ADAPTIVE LIVE-BEDIENHILFE FÜR SONAR COCKPIT
// - Desktop & großes Tablet (> 1024px): Festes 1/3-Kontext-Dock rechts neben dem 2/3-Cockpit (Elementor-Prinzip)
// - Smartphone & kompakte Screens (<= 1024px): 100 % Cockpit-Breite + antippbare "i"-Badges + kompaktes 1-Ebenen-Pop-up

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SONAR_HELP_CATALOG, SONAR_GUIDED_TOUR } from './config/sonarHelpCatalog';

export default function InteractiveHelpDock({
  isOpen,
  onClose,
  theme,
  isDarkMode,
  activeTab,
  setActiveTab,
  isCompactViewport
}) {
  const [activeHelpId, setActiveHelpId] = useState('default_welcome');
  const [pinnedHelpId, setPinnedHelpId] = useState(null);
  const [mobilePopupHelpId, setMobilePopupHelpId] = useState(null);
  const [tourIndex, setTourIndex] = useState(null);

  const hoverTimerRef = useRef(null);
  const pinnedRef = useRef(null);

  useEffect(() => {
    pinnedRef.current = pinnedHelpId;
  }, [pinnedHelpId]);

  // Beim Ausschalten der Live-Hilfe alle temporären Overlays & Pins sauber zurücksetzen
  useEffect(() => {
    if (!isOpen) {
      setPinnedHelpId(null);
      setMobilePopupHelpId(null);
      setTourIndex(null);
      setActiveHelpId('default_welcome');
    }
  }, [isOpen]);

  // ESC-Taste schließt auf Mobilgeräten zuerst das Info-Pop-up (ohne den darunterliegenden War-Room zu blockieren)
  useEffect(() => {
    if (!isOpen || !mobilePopupHelpId) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMobilePopupHelpId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, mobilePopupHelpId]);

  // =========================================================================
  // DESKTOP (> 1024px): GLOBALE EVENT-DELEGATION MIT DEBOUNCE & PIN-SCHUTZ
  // =========================================================================
  useEffect(() => {
    if (!isOpen || isCompactViewport) return;

    const findHelpKeyFromTarget = (target) => {
      if (!target || typeof target.closest !== 'function') return null;
      // Ignoriere Events innerhalb des Hilfe-Docks selbst
      if (target.closest('[data-sonar-help-ignore="true"]')) return null;
      const el = target.closest('[data-help]');
      if (!el) return null;
      const key = el.getAttribute('data-help');
      return key && SONAR_HELP_CATALOG[key] ? key : null;
    };

    const handleMouseOver = (e) => {
      if (pinnedRef.current) return;
      const key = findHelpKeyFromTarget(e.target);
      if (!key) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        if (!pinnedRef.current) {
          setActiveHelpId(key);
        }
      }, 90);
    };

    const handleFocusIn = (e) => {
      if (pinnedRef.current) return;
      const key = findHelpKeyFromTarget(e.target);
      if (key) {
        setActiveHelpId(key);
      }
    };

    const handleClickCapture = (e) => {
      if (e.target && typeof e.target.closest === 'function') {
        if (e.target.closest('[data-sonar-help-ignore="true"]')) return;
      }
      const key = findHelpKeyFromTarget(e.target);
      if (key && !pinnedRef.current) {
        setActiveHelpId(key);
      }
    };

    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('click', handleClickCapture, true);

    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('click', handleClickCapture, true);
    };
  }, [isOpen, isCompactViewport]);

  // =========================================================================
  // SMARTPHONE / KOMPAKT (<= 1024px): AUTOMATISCHE "i"-BADGES AN [data-help]
  // =========================================================================
  const syncMobileBadges = useCallback(() => {
    const cleanupBadges = () => {
      if (typeof document === 'undefined') return;
      document.querySelectorAll('.sonar-mobile-help-badge').forEach((btn) => btn.remove());
      document.querySelectorAll('[data-sonar-pos-patched="true"]').forEach((el) => {
        el.style.position = '';
        el.removeAttribute('data-sonar-pos-patched');
      });
    };

    if (!isOpen || !isCompactViewport || typeof document === 'undefined') {
      cleanupBadges();
      return;
    }

    const helpNodes = document.querySelectorAll('[data-help]');
    const validNodes = new Set();

    helpNodes.forEach((node) => {
      const key = node.getAttribute('data-help');
      if (!key || !SONAR_HELP_CATALOG[key]) return;
      validNodes.add(node);

      // Falls noch kein Badge in diesem Container steckt, sauber einhängen
      let existingBadge = node.querySelector(`:scope > .sonar-mobile-help-badge[data-badge-for="${key}"]`);
      if (!existingBadge) {
        const computedPos = window.getComputedStyle(node).position;
        if (computedPos === 'static') {
          node.style.position = 'relative';
          node.setAttribute('data-sonar-pos-patched', 'true');
        }

        const badgeBtn = document.createElement('button');
        badgeBtn.type = 'button';
        badgeBtn.className = 'sonar-mobile-help-badge';
        badgeBtn.setAttribute('data-badge-for', key);
        badgeBtn.setAttribute('data-sonar-help-ignore', 'true');
        badgeBtn.setAttribute('aria-label', `Erklärung öffnen: ${SONAR_HELP_CATALOG[key].title}`);
        badgeBtn.textContent = 'i';

        badgeBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setMobilePopupHelpId(key);
        });

        node.appendChild(badgeBtn);
      }
    });

    // Verwaiste Badges entfernen
    document.querySelectorAll('.sonar-mobile-help-badge').forEach((btn) => {
      if (!btn.parentElement || !validNodes.has(btn.parentElement)) {
        btn.remove();
      }
    });
  }, [isOpen, isCompactViewport]);

  useEffect(() => {
    if (!isOpen || !isCompactViewport) {
      if (typeof document !== 'undefined') {
        document.querySelectorAll('.sonar-mobile-help-badge').forEach((btn) => btn.remove());
        document.querySelectorAll('[data-sonar-pos-patched="true"]').forEach((el) => {
          el.style.position = '';
          el.removeAttribute('data-sonar-pos-patched');
        });
      }
      return;
    }

    syncMobileBadges();

    // MutationObserver erkennt sofort, wenn z. B. der War-Room aufgeht oder Akten aufgeklappt werden
    const observer = new MutationObserver(() => {
      syncMobileBadges();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      document.querySelectorAll('.sonar-mobile-help-badge').forEach((btn) => btn.remove());
      document.querySelectorAll('[data-sonar-pos-patched="true"]').forEach((el) => {
        el.style.position = '';
        el.removeAttribute('data-sonar-pos-patched');
      });
    };
  }, [isOpen, isCompactViewport, activeTab, syncMobileBadges]);

  // =========================================================================
  // GEFÜHRTE SCHRITT-FÜR-SCHRITT-TOUR (FÜR DESKTOP & SMARTPHONE)
  // =========================================================================
  const jumpToTourStep = (idx) => {
    if (idx < 0 || idx >= SONAR_GUIDED_TOUR.length) {
      setTourIndex(null);
      setPinnedHelpId(null);
      return;
    }
    const stepObj = SONAR_GUIDED_TOUR[idx];
    setTourIndex(idx);

    if (stepObj.tab && typeof setActiveTab === 'function' && activeTab !== stepObj.tab) {
      setActiveTab(stepObj.tab);
    }

    if (isCompactViewport) {
      setMobilePopupHelpId(stepObj.helpId);
    } else {
      setActiveHelpId(stepObj.helpId);
      setPinnedHelpId(stepObj.helpId);
    }

    // Sanft zum Ziel-Element scrollen und kurz optisch markieren
    setTimeout(() => {
      if (typeof document === 'undefined') return;
      const targetEl = document.querySelector(`[data-help="${stepObj.helpId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('sonar-help-pulse-target');
        setTimeout(() => {
          targetEl.classList.remove('sonar-help-pulse-target');
        }, 1600);
      }
    }, 140);
  };

  if (!isOpen) return null;

  // Farbschema des Hilfe-Systems (klar vom Cockpit abgesetzt in Smaragd/Cyan-Akzentik)
  const helpAccent = '#06b6d4';
  const dockBg = isDarkMode ? '#081226' : '#f0f9ff';
  const dockCardBg = isDarkMode ? '#0f1d36' : '#ffffff';
  const dockBorder = isDarkMode ? '#1e3a5f' : '#bae6fd';
  const textMain = theme?.textMain || (isDarkMode ? '#f8fafc' : '#0f172a');
  const textMuted = theme?.textMuted || (isDarkMode ? '#94a3b8' : '#475569');

  const displayedKey = isCompactViewport
    ? (mobilePopupHelpId || 'default_welcome')
    : (pinnedHelpId || activeHelpId || 'default_welcome');

  const entry = SONAR_HELP_CATALOG[displayedKey] || SONAR_HELP_CATALOG.default_welcome;
  const isPinned = Boolean(pinnedHelpId);

  return (
    <>
      {/* Globale Styles für dezente Hover-Markierung & Smartphone-"i"-Badges */}
      <style>{`
        [data-help] {
          transition: outline-color 0.15s ease, box-shadow 0.15s ease;
        }
        @media (min-width: 1025px) {
          body.sonar-live-help-desktop [data-help]:hover {
            outline: 1.5px dashed rgba(6, 182, 212, 0.65);
            outline-offset: 3px;
            border-radius: 8px;
          }
        }
        .sonar-help-pulse-target {
          outline: 2.5px solid #06b6d4 !important;
          outline-offset: 4px !important;
          box-shadow: 0 0 0 6px rgba(6, 182, 212, 0.22) !important;
          border-radius: 8px;
        }
        .sonar-mobile-help-badge {
          position: absolute;
          top: -7px;
          right: -7px;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: #06b6d4;
          color: #020617;
          border: 2px solid #0f172a;
          font-family: ui-sans-serif, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 900;
          font-style: italic;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 45;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
          padding: 0;
          user-select: none;
        }
        .sonar-mobile-help-badge:active {
          transform: scale(0.92);
        }
      `}</style>

      {/* =================================================================== */}
      {/* MODUS A: DESKTOP & GROSSES TABLET (> 1024px) -> FESTES 1/3-DOCK     */}
      {/* =================================================================== */}
      {!isCompactViewport && (
        <aside
          data-sonar-help-ignore="true"
          style={{
            width: '33.333%',
            minWidth: '320px',
            maxWidth: '460px',
            backgroundColor: dockBg,
            borderLeft: `2px solid ${helpAccent}`,
            color: textMain,
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
            boxSizing: 'border-box',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            textAlign: 'left',
            zIndex: 60,
            flexShrink: 0
          }}
        >
          {/* Dock-Kopfzeile */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${dockBorder}`
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: helpAccent
                }}
              >
                LIVE-INSPEKTOR (ELEMENTOR-MODUS)
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: textMain, marginTop: '2px' }}>
                Kontext-Erklärung in Echtzeit
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setPinnedHelpId(isPinned ? null : entry.id)}
                style={{
                  background: isPinned ? helpAccent : 'transparent',
                  color: isPinned ? '#020617' : helpAccent,
                  border: `1px solid ${helpAccent}`,
                  borderRadius: '6px',
                  padding: '5px 9px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Aktuelle Erklärung festpinnen, damit sie beim Mausbewegen stehen bleibt"
              >
                {isPinned ? 'Gepinnt' : 'Anpinnen'}
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  color: textMuted,
                  border: `1px solid ${dockBorder}`,
                  borderRadius: '6px',
                  padding: '5px 9px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Live-Bedienhilfe schließen"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Aktives Modul & Element-Titel */}
          <div
            style={{
              backgroundColor: dockCardBg,
              border: `1px solid ${dockBorder}`,
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  color: helpAccent,
                  marginBottom: '6px'
                }}
              >
                {entry.module}
              </span>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: textMain, lineHeight: 1.3 }}>
                {entry.title}
              </h3>
            </div>

            {/* Sektion 1: Was ist das? */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
                border: `1px solid ${dockBorder}`
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: helpAccent, marginBottom: '4px' }}>
                1. Was ist das?
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: textMain }}>
                {entry.whatIsIt}
              </div>
            </div>

            {/* Sektion 2: Was passiert beim Klick? */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.65)' : '#f8fafc',
                border: `1px solid ${dockBorder}`
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', marginBottom: '4px' }}>
                2. Was passiert hier?
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: textMain }}>
                {entry.whatHappens}
              </div>
            </div>

            {/* Sektion 3: Worauf muss ich achten? */}
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb',
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#f59e0b', marginBottom: '4px' }}>
                3. Praxis-Hinweis
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.5, color: textMain }}>
                {entry.watchOut}
              </div>
            </div>
          </div>

          {/* Geführte 6-Schritte-Schnelltour */}
          <div
            style={{
              backgroundColor: dockCardBg,
              border: `1px solid ${dockBorder}`,
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: textMuted }}>
                Geführter Cockpit-Rundgang (6 Stationen)
              </span>
              {tourIndex !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setTourIndex(null);
                    setPinnedHelpId(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: helpAccent,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Tour beenden
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {SONAR_GUIDED_TOUR.map((t, idx) => {
                const activeStep = tourIndex === idx;
                return (
                  <button
                    key={t.step}
                    type="button"
                    onClick={() => jumpToTourStep(idx)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: activeStep ? 800 : 600,
                      border: `1px solid ${activeStep ? helpAccent : dockBorder}`,
                      backgroundColor: activeStep ? 'rgba(6, 182, 212, 0.16)' : 'transparent',
                      color: activeStep ? helpAccent : textMain,
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => jumpToTourStep(tourIndex === null ? 0 : Math.max(0, tourIndex - 1))}
                disabled={tourIndex === null || tourIndex === 0}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: `1px solid ${dockBorder}`,
                  background: 'transparent',
                  color: textMain,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: tourIndex === null || tourIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: tourIndex === null || tourIndex === 0 ? 0.45 : 1
                }}
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={() => jumpToTourStep(tourIndex === null ? 0 : (tourIndex + 1) % SONAR_GUIDED_TOUR.length)}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: `1px solid ${helpAccent}`,
                  background: helpAccent,
                  color: '#020617',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {tourIndex === null ? 'Rundgang starten' : 'Nächster Punkt'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* =================================================================== */}
      {/* MODUS B: SMARTPHONE / KOMPAKT (<= 1024px) -> NUR 1 KOMPAKTES POP-UP */}
      {/* =================================================================== */}
      {isCompactViewport && mobilePopupHelpId && (
        <div
          data-sonar-help-ignore="true"
          onClick={() => setMobilePopupHelpId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.72)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              maxHeight: '82vh',
              overflowY: 'auto',
              backgroundColor: dockCardBg,
              border: `2px solid ${helpAccent}`,
              borderRadius: '12px',
              padding: '16px',
              boxSizing: 'border-box',
              color: textMain,
              textAlign: 'left',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    backgroundColor: 'rgba(6, 182, 212, 0.16)',
                    color: helpAccent,
                    marginBottom: '4px'
                  }}
                >
                  {entry.module}
                </span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: textMain, lineHeight: 1.3 }}>
                  {entry.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setMobilePopupHelpId(null)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${dockBorder}`,
                  color: textMain,
                  borderRadius: '6px',
                  width: '30px',
                  height: '30px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                aria-label="Hilfe-Karte schließen"
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '12.5px', lineHeight: 1.45 }}>
              <strong style={{ color: helpAccent, display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>
                Was ist das?
              </strong>
              {entry.whatIsIt}
            </div>

            <div style={{ fontSize: '12.5px', lineHeight: 1.45 }}>
              <strong style={{ color: '#10b981', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>
                Was passiert hier?
              </strong>
              {entry.whatHappens}
            </div>

            <div
              style={{
                fontSize: '12px',
                lineHeight: 1.45,
                padding: '9px 10px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}
            >
              <strong style={{ color: '#f59e0b', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', marginBottom: '2px' }}>
                Worauf achten?
              </strong>
              {entry.watchOut}
            </div>

            <button
              type="button"
              onClick={() => setMobilePopupHelpId(null)}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: helpAccent,
                color: '#020617',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Verstanden & schließen
            </button>
          </div>
        </div>
      )}
    </>
  );
}