// src/InteractiveHelpDock.jsx
// ADAPTIVE FELD-FÜR-FELD LIVE-BEDIENHILFE FÜR SONAR COCKPIT
// - Desktop & großes Tablet (> 1024px): Feststehendes (position: fixed) 1/3-Kontext-Dock rechts, das beim Scrollen immer sichtbar mitläuft + "i"-Badges
// - Smartphone & kompakte Screens (<= 1024px): 100 % Cockpit-Breite + antippbare "i"-Badges + kompaktes 1-Ebenen-Pop-up
// - Mitlaufender Schnellstart-Trigger: Ab leichtem Scrollen jederzeit unten rechts klickbar -> öffnet sofort das passende Feld im Sichtbereich!
// - Automatische Overflow-Erkennung: Container mit overflow: hidden schneiden das "i"-Badge niemals ab (.sonar-help-badge-inset)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SONAR_HELP_CATALOG, SONAR_GUIDED_TOUR } from './config/sonarHelpCatalog';

export default function InteractiveHelpDock({
  isOpen,
  onOpen,
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
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  const hoverTimerRef = useRef(null);
  const pinnedRef = useRef(null);
  const compactRef = useRef(isCompactViewport);
  const dockAsideRef = useRef(null);
  const lastInteractedHelpRef = useRef(null);
  const pendingInitialHelpRef = useRef(null);

  useEffect(() => {
    pinnedRef.current = pinnedHelpId;
  }, [pinnedHelpId]);

  useEffect(() => {
    compactRef.current = isCompactViewport;
  }, [isCompactViewport]);

  // Überwacht die Scroll-Position, damit beim Runterscrollen in lange Listen (z. B. Akten) ein mitlaufender Hilfe-Trigger bereitsteht
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setIsScrolledDown(y > 160);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Merkt sich auch bei ausgeschalteter Hilfe lautlos das zuletzt fokussierte/angeklickte [data-help]-Feld
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const trackLastField = (e) => {
      const target = e.target;
      if (!target || typeof target.closest !== 'function') return;
      if (target.closest('[data-sonar-help-ignore="true"]')) return;
      const el = target.closest('[data-help]');
      if (!el) return;
      const key = el.getAttribute('data-help');
      if (key && SONAR_HELP_CATALOG[key]) {
        lastInteractedHelpRef.current = { key, el };
      }
    };

    document.addEventListener('focusin', trackLastField, true);
    document.addEventListener('pointerdown', trackLastField, true);
    return () => {
      document.removeEventListener('focusin', trackLastField, true);
      document.removeEventListener('pointerdown', trackLastField, true);
    };
  }, []);

  // Ermittelt intelligent das [data-help]-Feld, an dem der Nutzer gerade arbeitet bzw. das aktuell im Sichtbereich liegt
  const detectVisibleContextHelpKey = useCallback(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return 'default_welcome';
    }

    const vh = window.innerHeight || 800;

    // 1. Direkt fokussiertes Element prüfen
    if (document.activeElement && typeof document.activeElement.closest === 'function') {
      const activeHelpEl = document.activeElement.closest('[data-help]');
      if (activeHelpEl) {
        const activeKey = activeHelpEl.getAttribute('data-help');
        if (activeKey && SONAR_HELP_CATALOG[activeKey]) return activeKey;
      }
    }

    // 2. Zuletzt angeklicktes Feld prüfen, sofern es noch im aktuellen Sichtbereich liegt
    const last = lastInteractedHelpRef.current;
    if (last && last.el && document.body.contains(last.el) && SONAR_HELP_CATALOG[last.key]) {
      const rect = last.el.getBoundingClientRect();
      if (rect.height > 0 && rect.bottom > 40 && rect.top < vh - 40) {
        return last.key;
      }
    }

    // 3. Bestes sichtbares [data-help]-Element im aktuellen Viewport bestimmen (Spezifischere Felder vor großen Wrappern)
    const centerY = vh * 0.42;
    let bestKey = null;
    let bestScore = Infinity;

    document.querySelectorAll('[data-help]').forEach((el) => {
      const key = el.getAttribute('data-help');
      if (!key || !SONAR_HELP_CATALOG[key]) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      if (rect.bottom < 60 || rect.top > vh - 60) return;

      const containsCenter = rect.top <= centerY && rect.bottom >= centerY;
      const distToCenter = containsCenter
        ? 0
        : Math.min(Math.abs(rect.top - centerY), Math.abs(rect.bottom - centerY));

      // Kleinere/spezifischere Boxen erhalten bei Überlappung Vorrang vor riesigen Gesamt-Containern
      const sizePenalty = Math.min(rect.height, 1400) * 0.12;
      const score = distToCenter + sizePenalty;

      if (score < bestScore) {
        bestScore = score;
        bestKey = key;
      }
    });

    return bestKey || 'default_welcome';
  }, []);

  // Öffnet die Live-Hilfe von jeder beliebigen Scroll-Stelle aus und lädt rechts sofort das passende Thema
  const handleFloatingOpen = () => {
    const contextKey = detectVisibleContextHelpKey();
    pendingInitialHelpRef.current = contextKey;

    if (isCompactViewport) {
      setMobilePopupHelpId(contextKey);
    } else {
      setActiveHelpId(contextKey);
    }

    if (typeof onOpen === 'function') {
      onOpen();
    } else if (typeof document !== 'undefined') {
      // Sicherheits-Fallback, falls onOpen noch nicht als Prop übergeben wurde
      const headerHelpBtn = document.querySelector('button[title*="Live-Bedienhilfe"]');
      if (headerHelpBtn) headerHelpBtn.click();
    }
  };

  // Beim Ein- und Ausschalten der Live-Hilfe Zustände sauber setzen
  useEffect(() => {
    if (!isOpen) {
      setPinnedHelpId(null);
      setMobilePopupHelpId(null);
      setTourIndex(null);
      setActiveHelpId('default_welcome');
    } else {
      const targetKey = pendingInitialHelpRef.current || detectVisibleContextHelpKey();
      pendingInitialHelpRef.current = null;
      if (targetKey && SONAR_HELP_CATALOG[targetKey]) {
        setActiveHelpId(targetKey);
      }
    }
  }, [isOpen, detectVisibleContextHelpKey]);

  // Scrollt den Inhalt innerhalb des rechten Desktop-Docks nach oben, sobald ein neues Feld gewählt wird
  const scrollDockToTop = useCallback(() => {
    if (dockAsideRef.current) {
      dockAsideRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // ESC-Taste schließt auf Mobilgeräten zuerst das Info-Pop-up (ohne den darunterliegenden War-Room zu schließen)
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
  // DESKTOP (> 1024px): LIVE-MITLAUFEN BEI HOVER, FOKUS & KLICK INS FELD
  // =========================================================================
  useEffect(() => {
    if (!isOpen || isCompactViewport) return;

    const findHelpKeyFromTarget = (target) => {
      if (!target || typeof target.closest !== 'function') return null;
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
      }, 80);
    };

    const handleFocusIn = (e) => {
      const key = findHelpKeyFromTarget(e.target);
      if (!key) return;
      setActiveHelpId(key);
      if (pinnedRef.current && pinnedRef.current !== key) {
        setPinnedHelpId(null);
      }
      scrollDockToTop();
    };

    const handleClickCapture = (e) => {
      if (e.target && typeof e.target.closest === 'function') {
        if (e.target.closest('[data-sonar-help-ignore="true"]')) return;
      }
      const key = findHelpKeyFromTarget(e.target);
      if (!key) return;
      setActiveHelpId(key);
      if (pinnedRef.current && pinnedRef.current !== key) {
        setPinnedHelpId(null);
      }
      scrollDockToTop();
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
  }, [isOpen, isCompactViewport, scrollDockToTop]);

  // =========================================================================
  // UNIVERSELLE "i"-BADGES AN ALLEN [data-help]-BEREICHEN (INKL. CLIPPING-SCHUTZ)
  // =========================================================================
  const removeAllHelpBadges = useCallback(() => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.sonar-help-corner-badge').forEach((btn) => btn.remove());
    document.querySelectorAll('[data-sonar-pos-patched="true"]').forEach((el) => {
      el.style.position = '';
      el.removeAttribute('data-sonar-pos-patched');
    });
  }, []);

  const syncHelpBadges = useCallback(() => {
    if (!isOpen || typeof document === 'undefined') {
      removeAllHelpBadges();
      return;
    }

    const helpNodes = document.querySelectorAll('[data-help]');
    const validNodes = new Set();

    helpNodes.forEach((node) => {
      const key = node.getAttribute('data-help');
      if (!key || !SONAR_HELP_CATALOG[key]) return;
      validNodes.add(node);

      const computedStyle = window.getComputedStyle(node);
      const clipsContent =
        computedStyle.overflow !== 'visible' ||
        computedStyle.overflowX !== 'visible' ||
        computedStyle.overflowY !== 'visible';

      let existingBadge = node.querySelector(`:scope > .sonar-help-corner-badge[data-badge-for="${key}"]`);
      if (!existingBadge) {
        if (computedStyle.position === 'static') {
          node.style.position = 'relative';
          node.setAttribute('data-sonar-pos-patched', 'true');
        }

        const badgeBtn = document.createElement('button');
        badgeBtn.type = 'button';
        badgeBtn.className = clipsContent
          ? 'sonar-help-corner-badge sonar-help-badge-inset'
          : 'sonar-help-corner-badge';
        badgeBtn.setAttribute('data-badge-for', key);
        badgeBtn.setAttribute('data-sonar-help-ignore', 'true');
        badgeBtn.setAttribute('title', `Hilfe anzeigen: ${SONAR_HELP_CATALOG[key].title}`);
        badgeBtn.setAttribute('aria-label', `Erklärung öffnen: ${SONAR_HELP_CATALOG[key].title}`);
        badgeBtn.textContent = 'i';

        badgeBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (compactRef.current) {
            setMobilePopupHelpId(key);
          } else {
            setActiveHelpId(key);
            setPinnedHelpId((prev) => (prev === key ? null : key));
            scrollDockToTop();
          }
        });

        node.appendChild(badgeBtn);
      } else {
        // Falls sich das Overflow-Verhalten z. B. durch Resize ändert, Inset-Klasse live nachziehen
        if (clipsContent) {
          existingBadge.classList.add('sonar-help-badge-inset');
        } else {
          existingBadge.classList.remove('sonar-help-badge-inset');
        }
      }
    });

    document.querySelectorAll('.sonar-help-corner-badge').forEach((btn) => {
      if (!btn.parentElement || !validNodes.has(btn.parentElement)) {
        btn.remove();
      }
    });
  }, [isOpen, removeAllHelpBadges, scrollDockToTop]);

  // Markiert das aktuell im Desktop-Dock aktive "i"-Badge optisch (Gold-Amber)
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const currentKey = isCompactViewport
      ? mobilePopupHelpId
      : (pinnedHelpId || activeHelpId);

    document.querySelectorAll('.sonar-help-corner-badge').forEach((btn) => {
      const bKey = btn.getAttribute('data-badge-for');
      if (bKey && bKey === currentKey) {
        btn.classList.add('sonar-help-badge-active');
      } else {
        btn.classList.remove('sonar-help-badge-active');
      }
    });
  }, [isOpen, isCompactViewport, activeHelpId, pinnedHelpId, mobilePopupHelpId, activeTab]);

  useEffect(() => {
    if (!isOpen) {
      removeAllHelpBadges();
      return;
    }

    syncHelpBadges();

    let rafId = null;
    const observer = new MutationObserver(() => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        syncHelpBadges();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      removeAllHelpBadges();
    };
  }, [isOpen, activeTab, isCompactViewport, syncHelpBadges, removeAllHelpBadges]);

  // =========================================================================
  // GEFÜHRTE 8-SCHRITTE-SCHNELLTOUR (FÜR DESKTOP & SMARTPHONE)
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
      scrollDockToTop();
    }

    setTimeout(() => {
      if (typeof document === 'undefined') return;
      const targetEl = document.querySelector(`[data-help="${stepObj.helpId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('sonar-help-pulse-target');
        setTimeout(() => {
          targetEl.classList.remove('sonar-help-pulse-target');
        }, 1700);
      }
    }, 150);
  };

  // Dynamische Reiterfarbe für den mitlaufenden Hilfe-Button (konsistent zur Header-Logik)
  const getFloatingAccentColor = () => {
    if (!theme) return '#06b6d4';
    switch (activeTab) {
      case 'tresor':
        return theme.tresorAccent || '#2dd4bf';
      case 'compliance':
        return theme.complianceAccent || '#f59e0b';
      case 'wissen':
        return theme.wissenAccent || '#a855f7';
      case 'handbuch':
        return theme.handbuchAccent || '#10b981';
      case 'gegner':
        return isDarkMode ? '#94a3b8' : '#64748b';
      default:
        return theme.accent || '#06b6d4';
    }
  };

  // =========================================================================
  // WENN LIVE-HILFE AUS IST: MITLAUFENDER SCHNELLSTART-BUTTON BEIM SCROLLEN
  // =========================================================================
  if (!isOpen) {
    if (!isScrolledDown) return null;

    const floatColor = getFloatingAccentColor();
    const floatBg = isDarkMode ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';

    return (
      <button
        type="button"
        data-sonar-help-ignore="true"
        onClick={handleFloatingOpen}
        title="Live-Bedienhilfe direkt an dieser Stelle öffnen"
        aria-label="Live-Bedienhilfe direkt an dieser Stelle öffnen"
        style={{
          position: 'fixed',
          bottom: isCompactViewport ? '18px' : '24px',
          right: isCompactViewport ? '16px' : '24px',
          zIndex: 85,
          background: floatBg,
          color: floatColor,
          border: `1.5px solid ${floatColor}`,
          borderRadius: '9999px',
          padding: isCompactViewport ? '9px 14px' : '10px 18px',
          fontSize: '13px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: isDarkMode
            ? '0 8px 24px rgba(0, 0, 0, 0.55)'
            : '0 8px 24px rgba(15, 23, 42, 0.16)',
          backdropFilter: 'blur(8px)',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease'
        }}
      >
        <span
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '9999px',
            background: floatColor,
            color: isDarkMode ? '#020617' : '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
            fontSize: '12px',
            fontWeight: 900,
            fontStyle: 'italic',
            lineHeight: 1,
            flexShrink: 0
          }}
        >
          i
        </span>
        <span>{isCompactViewport ? 'Hilfe' : 'Live-Hilfe hier starten'}</span>
      </button>
    );
  }

  const helpAccent = '#06b6d4';
  const dockBg = isDarkMode ? '#081226' : '#f0f9ff';
  const dockCardBg = isDarkMode ? '#0f1d36' : '#ffffff';
  const dockBorder = isDarkMode ? '#1e3a5f' : '#bae6fd';
  const textMain = theme?.textMain || (isDarkMode ? '#f8fafc' : '#0f172a');
  const textMuted = theme?.textMuted || (isDarkMode ? '#94a3b8' : '#475569');
  const badgeBorderColor = isDarkMode ? '#020617' : '#ffffff';

  const displayedKey = isCompactViewport
    ? (mobilePopupHelpId || 'default_welcome')
    : (pinnedHelpId || activeHelpId || 'default_welcome');

  const entry = SONAR_HELP_CATALOG[displayedKey] || SONAR_HELP_CATALOG.default_welcome;
  const isPinned = Boolean(pinnedHelpId);

  return (
    <>
      <style>{`
        [data-help] {
          transition: outline-color 0.15s ease, box-shadow 0.15s ease;
        }
        @media (min-width: 1025px) {
          body.sonar-live-help-desktop [data-help]:hover,
          body.sonar-live-help-desktop [data-help]:focus-within {
            outline: 1.5px dashed rgba(6, 182, 212, 0.75);
            outline-offset: 3px;
            border-radius: 8px;
          }
        }
        .sonar-help-pulse-target {
          outline: 2.5px solid #06b6d4 !important;
          outline-offset: 4px !important;
          box-shadow: 0 0 0 6px rgba(6, 182, 212, 0.24) !important;
          border-radius: 8px;
        }
        .sonar-help-corner-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 21px;
          height: 21px;
          border-radius: 9999px;
          background: #06b6d4;
          color: #020617;
          border: 2px solid ${badgeBorderColor};
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 12px;
          font-weight: 900;
          font-style: italic;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 55;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
          padding: 0;
          user-select: none;
          transition: transform 0.15s ease, background-color 0.15s ease;
        }
        /* Verhindert jedes Abschneiden bei Boxen mit overflow: hidden (z. B. Tresor- & Gegner-Listen) */
        .sonar-help-corner-badge.sonar-help-badge-inset {
          top: 6px;
          right: 6px;
        }
        .sonar-help-corner-badge:hover {
          transform: scale(1.12);
          background: #22d3ee;
        }
        .sonar-help-corner-badge.sonar-help-badge-active {
          background: #fbbf24;
          color: #020617;
          transform: scale(1.14);
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.35), 0 2px 8px rgba(0, 0, 0, 0.4);
        }
      `}</style>

      {/* =================================================================== */}
      {/* MODUS A: DESKTOP (> 1024px) -> PLATZHALTER + FIXED MITLAUF-DOCK     */}
      {/* =================================================================== */}
      {!isCompactViewport && (
        <>
          {/* Stiller 1/3-Platzhalter im Flex-Layout, damit das linke 2/3-Cockpit exakt seine Breite behält */}
          <div
            aria-hidden="true"
            style={{
              width: '33.333%',
              minWidth: '320px',
              flexShrink: 0,
              pointerEvents: 'none'
            }}
          />

          {/* Echtes Fixed-Dock am rechten Bildschirmrand: Scrollt zu 100 % immer neben deiner aktuellen Position mit! */}
          <aside
            ref={dockAsideRef}
            data-sonar-help-ignore="true"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '33.333%',
              minWidth: '320px',
              height: '100vh',
              backgroundColor: dockBg,
              borderLeft: `2px solid ${helpAccent}`,
              color: textMain,
              overflowY: 'auto',
              boxSizing: 'border-box',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              textAlign: 'left',
              zIndex: 60,
              boxShadow: isDarkMode ? '-8px 0 28px rgba(0, 0, 0, 0.45)' : '-8px 0 24px rgba(15, 23, 42, 0.08)'
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
                  LIVE-HILFE (SCROLLT AUTOMATISCH MIT)
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: textMuted, marginTop: '2px' }}>
                  Ins Feld klicken oder kleines „i“ wählen
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setPinnedHelpId(isPinned ? null : entry.id)}
                  style={{
                    background: isPinned ? '#fbbf24' : 'transparent',
                    color: isPinned ? '#020617' : helpAccent,
                    border: `1px solid ${isPinned ? '#fbbf24' : helpAccent}`,
                    borderRadius: '6px',
                    padding: '5px 9px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                  title="Aktuelle Erklärung festpinnen (wird bei Klick in ein neues Eingabefeld automatisch aktualisiert)"
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
                  title="Live-Bedienhilfe ausschalten"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Aktives Feld / Element */}
            <div
              style={{
                backgroundColor: dockCardBg,
                border: `1px solid ${isPinned ? '#fbbf24' : dockBorder}`,
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

              {/* Sektion 2: Was passiert hier? */}
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

            {/* Geführte 8-Schritte-Schnelltour */}
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
                  Schnelltour durch die wichtigsten Felder
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
                    Tour lösen
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {SONAR_GUIDED_TOUR.map((t, idx) => {
                  const activeStep = tourIndex === idx || entry.id === t.helpId;
                  return (
                    <button
                      key={t.step}
                      type="button"
                      onClick={() => jumpToTourStep(idx)}
                      style={{
                        textAlign: 'left',
                        padding: '7px 10px',
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
                  {tourIndex === null ? 'Rundgang starten' : 'Weiter'}
                </button>
              </div>
            </div>
          </aside>
        </>
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
              onClick={() => {
                setMobilePopupHelpId(null);
                onClose();
              }}
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