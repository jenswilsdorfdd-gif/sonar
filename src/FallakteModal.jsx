// src/FallakteModal.jsx
// VISUELLE DURCHGÄNGIGE FALLAKTE & KI-CHRONOLOGIE-ZENTRALE FÜR SONAR COCKPIT
// - Zeigt den kompletten Aktenverlauf (#01 .. #NN) als übersichtliche Timeline mit Bezugs-Pfeilen (bezug_id)
// - Umschaltbar: Chronologisch (Tag 1 -> Heute) vs. Neueste zuerst | Filter: Alle / Eingang / Ausgang / Intern + Live-Suche
// - Direktes Aufklappen aller Schriftsätze & Notizen (inkl. Nachladen von .md-Zwillingen bei Bedarf), OHNE das Formular oben zu überschreiben
// - 1-Klick-Export der KI-Fallakte (.md) in Zwischenablage oder als Download, Direkt-Druck & manueller Storage-/Wissensspeicher-Sync
// - Volle Live-Bedienhilfe-Integration (data-help Anker + 2/3-Desktop-Split) & Kopierschutz für Demo-Accounts

import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import { supabase } from './supabaseClient';
import {
  buildFallakteChronologie,
  buildFallakteMarkdown,
  druckeFallakteKomplett
} from './utils/fallakteBuilder';

export default function FallakteModal({
  isOpen,
  onClose,
  akte,
  theme,
  isDarkMode,
  isOwnerAccount,
  onLoadVorgangInMaske,
  onOpenWarRoom,
  onSyncFallakte,
  showToast
}) {
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = Tag 1 -> Heute (Ablaufplan) | 'desc' = Aktuellste zuerst
  const [typFilter, setTypFilter] = useState('ALL'); // 'ALL' | 'Eingang' | 'Ausgang' | 'Intern'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState({});
  const [expandAllTexts, setExpandAllTexts] = useState(false);
  const [twinTextsById, setTwinTextsById] = useState({});
  const [loadingTwinId, setLoadingTwinId] = useState(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const [desktopHelpSplitActive, setDesktopHelpSplitActive] = useState(false);

  // Berücksichtigt das geöffnete 1/3-Live-Hilfe-Dock auf großen Bildschirmen
  useEffect(() => {
    const checkHelpSplit = () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      setDesktopHelpSplitActive(
        window.innerWidth > 1024 && document.body.classList.contains('sonar-live-help-desktop')
      );
    };

    checkHelpSplit();
    window.addEventListener('resize', checkHelpSplit);

    let observer = null;
    if (typeof document !== 'undefined' && document.body) {
      observer = new MutationObserver(checkHelpSplit);
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      window.removeEventListener('resize', checkHelpSplit);
      if (observer) observer.disconnect();
    };
  }, [isOpen]);

  // Beim Öffnen einer neuen Akte Filter sauber zurücksetzen
  useEffect(() => {
    if (isOpen && akte?.id) {
      setTypFilter('ALL');
      setSearchQuery('');
      setExpandedIds({});
      setExpandAllTexts(false);
      setTwinTextsById({});
    }
  }, [isOpen, akte?.id]);

  // ESC-Taste schließt die Fallakte (sofern nicht gerade auf dem Smartphone ein Hilfe-Pop-up offen ist)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const parsedFallakte = useMemo(() => buildFallakteChronologie(akte), [akte]);

  if (!isOpen || !akte) return null;

  const { meta, stats, activeDeadlines, entriesAsc, entriesDesc, storageFilename } = parsedFallakte;
  const baseList = sortOrder === 'asc' ? entriesAsc : entriesDesc;

  const filteredEntries = baseList.filter((entry) => {
    if (typFilter !== 'ALL' && entry.typ !== typFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const hay = `${entry.stepCode} ${entry.datumFormatted} ${entry.typ} ${entry.kanal} ${entry.aktion} ${
        entry.briefText || ''
      } ${entry.visibleDocs.map((d) => d.fileName).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const btnTextColor = isDarkMode ? '#000000' : '#ffffff';

  const getTypBadgeColors = (typ) => {
    if (typ === 'Eingang') {
      return {
        bg: isDarkMode ? 'rgba(56, 189, 248, 0.16)' : '#e0f2fe',
        border: '#0284c7',
        text: isDarkMode ? '#38bdf8' : '#0369a1'
      };
    }
    if (typ === 'Ausgang') {
      return {
        bg: isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#d1fae5',
        border: '#10b981',
        text: isDarkMode ? '#34d399' : '#047857'
      };
    }
    return {
      bg: isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7',
      border: '#f59e0b',
      text: isDarkMode ? '#fbbf24' : '#b45309'
    };
  };

  // Kopierschutz für Demo-Accounts
  const handleDemoCopyGuard = (e) => {
    if (!isOwnerAccount) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof showToast === 'function') {
        showToast(
          'Kopieren und Exportieren der Roh-Fallakte ist in der kostenfreien Demo-Version gesperrt.',
          'warning'
        );
      }
    }
  };

  const toggleSingleEntryText = (histId) => {
    setExpandedIds((prev) => ({
      ...prev,
      [histId]: !prev[histId]
    }));
  };

  const handleToggleAllTexts = () => {
    const nextVal = !expandAllTexts;
    setExpandAllTexts(nextVal);
    if (!nextVal) {
      setExpandedIds({});
    } else {
      const allMap = {};
      baseList.forEach((e) => {
        if (e.briefText || e.mdTwins.length > 0 || e.visibleDocs.some((d) => d.twinCandidateUrl)) {
          allMap[e.id] = true;
        }
      });
      setExpandedIds(allMap);
    }
  };

  // Lädt bei Bedarf den .md-Volltextzwilling aus dem Bucket 'dokumente', falls im Vorgang nur die PDF hängt
  const handleLoadMdTwin = async (entry) => {
    if (!entry || loadingTwinId) return;
    const directMdUrl = entry.mdTwins?.[0]?.url || null;
    const pdfTwinUrl = entry.visibleDocs?.find((d) => d.twinCandidateUrl)?.twinCandidateUrl || null;
    const targetUrl = directMdUrl || pdfTwinUrl;

    if (!targetUrl) {
      if (typeof showToast === 'function') {
        showToast('Für diesen Vorgang liegt kein separater .md-Textzwilling vor.', 'warning');
      }
      return;
    }

    setLoadingTwinId(entry.id);
    try {
      let loadedText = '';
      const cleanUrl = targetUrl.split('#')[0].trim();
      const res = await fetch(cleanUrl);
      if (res.ok) {
        loadedText = await res.text();
      } else {
        const parts = decodeURIComponent(cleanUrl.split('?')[0]).split('/');
        const storageName = parts[parts.length - 1];
        if (storageName) {
          const { data, error } = await supabase.storage.from('dokumente').download(storageName);
          if (!error && data) {
            loadedText = await data.text();
          }
        }
      }

      if (loadedText && loadedText.trim().length > 0) {
        setTwinTextsById((prev) => ({ ...prev, [entry.id]: loadedText.trim() }));
        setExpandedIds((prev) => ({ ...prev, [entry.id]: true }));
      } else if (typeof showToast === 'function') {
        showToast('Kein hinterlegter OCR-Volltext zu dieser PDF gefunden.', 'warning');
      }
    } catch (err) {
      console.warn('MD-Zwilling konnte nicht geladen werden:', err);
      if (typeof showToast === 'function') {
        showToast('OCR-Zwilling konnte nicht abgerufen werden.', 'warning');
      }
    } finally {
      setLoadingTwinId(null);
    }
  };

  // 1-Klick Kopieren des gesamten Markdown-Dossiers für KI-Chats (nur Vollzugang)
  const handleCopyMarkdownForAi = async () => {
    if (!isOwnerAccount) {
      if (typeof showToast === 'function') {
        showToast('Der KI-Markdown-Export ist exklusiv in der Vollversion freigeschaltet.', 'warning');
      }
      return;
    }

    try {
      const mdContent = buildFallakteMarkdown(akte, null, { includeFullTexts: true });
      await navigator.clipboard.writeText(mdContent);
      if (typeof showToast === 'function') {
        showToast(
          `Komplette KI-Fallakte (${stats.total} Vorgänge) in die Zwischenablage kopiert!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Clipboard Fehler:', err);
      if (typeof showToast === 'function') {
        showToast('Kopieren fehlgeschlagen – bitte nutze den .md-Download.', 'error');
      }
    }
  };

  // Download als lokale FALLAKTE_<Zeichen>.md Datei (nur Vollzugang)
  const handleDownloadMarkdown = () => {
    if (!isOwnerAccount) {
      if (typeof showToast === 'function') {
        showToast('Der Datei-Export der Fallakte ist in der Demo-Version gesperrt.', 'warning');
      }
      return;
    }

    const mdContent = buildFallakteMarkdown(akte, null, { includeFullTexts: true });
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = storageFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') {
      showToast(`Fallakte "${storageFilename}" heruntergeladen.`, 'success');
    }
  };

  // Manueller Sofort-Sync der Fallakte in Supabase Storage, Wissensspeicher & GitHub/Drive
  const handleManualSyncClick = async () => {
    if (typeof onSyncFallakte !== 'function' || syncingNow || meta.isShowcase) return;
    setSyncingNow(true);
    try {
      await onSyncFallakte(akte);
      if (typeof showToast === 'function') {
        showToast(`Fallakte "${storageFilename}" im Wissensspeicher & Storage aktualisiert!`, 'success');
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('Fehler beim Synchronisieren der Fallakte: ' + (err.message || err), 'error');
      }
    } finally {
      setSyncingNow(false);
    }
  };

  const jumpToStepCard = (targetHistId) => {
    const el = document.getElementById(`fallakte-step-${targetHistId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setExpandedIds((prev) => ({ ...prev, [targetHistId]: true }));
    }
  };

  const pillBtnStyle = (active = false, customColor = theme.accent) => ({
    background: active ? customColor : 'transparent',
    color: active ? (isDarkMode ? '#020617' : '#ffffff') : theme.textMain,
    border: `1px solid ${active ? customColor : theme.border}`,
    borderRadius: '6px',
    padding: '6px 11px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap'
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        right: desktopHelpSplitActive ? '33.333%' : 0,
        backgroundColor: 'rgba(2, 6, 23, 0.84)',
        backdropFilter: 'blur(4px)',
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px'
      }}
      onClick={onClose}
    >
      <div
        data-sonar-modal-root="true"
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: '14px',
          width: '100%',
          maxWidth: '1120px',
          height: '92vh',
          maxHeight: '94dvh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
          textAlign: 'left',
          userSelect: !isOwnerAccount ? 'none' : 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
        onCopy={handleDemoCopyGuard}
        onCut={handleDemoCopyGuard}
        onContextMenu={handleDemoCopyGuard}
      >
        {/* 1. KOPFBEREICH MIT LIVE-HILFE-ANKER 1 & 2 */}
        <div
          style={{
            padding: '16px 20px',
            background: theme.inputBg,
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            flexShrink: 0
          }}
        >
          {/* HILFE-BEREICH 1: STECKBRIEF, WAR-ROOM-ÜBERGABE & KI-EXPORT */}
          <div
            data-help="fallakte_header_export"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Icon name="cabinet" size={20} style={{ color: theme.accent, flexShrink: 0 }} />
                  <span
                    style={{
                      color: meta.status === 'Erledigt' ? '#f59e0b' : theme.accent,
                      fontWeight: 900,
                      fontSize: '16px',
                      letterSpacing: '0.3px'
                    }}
                  >
                    FALLAKTE [{meta.unserZeichen}]
                  </span>
                  <span
                    style={{
                      background: meta.status === 'Erledigt' ? '#f59e0b' : theme.accent,
                      color: meta.status === 'Erledigt' ? '#000000' : btnTextColor,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}
                  >
                    {meta.status}
                  </span>
                  {meta.isShowcase && (
                    <span
                      style={{
                        border: `1px solid ${theme.wissenAccent || '#a855f7'}`,
                        color: theme.wissenAccent || '#a855f7',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 'bold'
                      }}
                    >
                      MUSTERAKTE
                    </span>
                  )}
                </div>

                <div
                  style={{
                    color: theme.textMain,
                    fontSize: '15px',
                    fontWeight: 'bold',
                    marginTop: '4px',
                    wordBreak: 'break-word'
                  }}
                >
                  {meta.gegnerName} — {meta.thema}
                </div>

                <div
                  style={{
                    color: theme.textMuted,
                    fontSize: '12px',
                    marginTop: '4px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <span>
                    <strong>Mandant:</strong> {meta.unsereFirma} ({meta.unserAnsprechpartner})
                  </span>
                  <span>
                    <strong>Fremd-AZ:</strong> {meta.aktenzeichenGegner}
                  </span>
                  <span>
                    <strong>AP Gegenseite:</strong> {meta.gegnerAnsprechpartner}
                  </span>
                  <span>
                    <strong>Zeitraum:</strong> {meta.ersterVorgangAm} – {meta.letzterVorgangAm}
                  </span>
                </div>
              </div>

              {/* Aktions-Leiste oben rechts */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingRight: '18px' }}>
                {typeof onOpenWarRoom === 'function' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWarRoom(akte);
                    }}
                    style={{
                      background: '#fbbf24',
                      color: '#000000',
                      border: '1px solid #f59e0b',
                      borderRadius: '6px',
                      padding: '7px 12px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Komplette Fallakte direkt im Kanzlei-War-Room öffnen"
                  >
                    <Icon name="brain" size={15} />
                    War-Room mit Fallakte öffnen
                  </button>
                )}

                {isOwnerAccount && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyMarkdownForAi}
                      style={pillBtnStyle(false)}
                      title="Gesamte Fallakte inkl. Ablaufplan & allen Schriftsätzen für KI-Skills in die Zwischenablage kopieren"
                    >
                      <Icon name="file" size={14} />
                      KI-Fallakte kopieren (.md)
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      style={pillBtnStyle(false)}
                      title={`Als ${storageFilename} herunterladen`}
                    >
                      <Icon name="in" size={14} />
                      .md Download
                    </button>

                    {!meta.isShowcase && typeof onSyncFallakte === 'function' && (
                      <button
                        type="button"
                        disabled={syncingNow}
                        onClick={handleManualSyncClick}
                        style={pillBtnStyle(false, '#10b981')}
                        title="FALLAKTE im Supabase Storage, Wissensspeicher und Backup aktualisieren"
                      >
                        <Icon name="refresh" size={14} />
                        {syncingNow ? 'Sync...' : 'Sync in Wissen'}
                      </button>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => druckeFallakteKomplett(akte, true)}
                  style={pillBtnStyle(false)}
                  title="Komplette Fallakte inkl. Ablaufplan & Brieftexten drucken / als PDF speichern"
                >
                  <Icon name="print" size={14} />
                  Drucken
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${theme.border}`,
                    color: theme.textMuted,
                    borderRadius: '6px',
                    padding: '6px 11px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                  title="Fallakte schließen (ESC)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Aktive Fristen- & Wiedervorlage-Warnleiste (sofern vorhanden) */}
            {activeDeadlines.length > 0 && (
              <div
                style={{
                  background: isDarkMode ? 'rgba(244, 63, 94, 0.12)' : '#fff1f2',
                  border: `1px solid ${theme.warningBorder}`,
                  borderRadius: '8px',
                  padding: '9px 14px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12.5px'
                }}
              >
                <strong
                  style={{
                    color: theme.warningBorder,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Icon name="alert" size={15} />
                  Offene Fristen / WV:
                </strong>
                {activeDeadlines.map((dl) => {
                  const restBadge =
                    dl.daysLeft === null
                      ? ''
                      : dl.daysLeft < 0
                      ? ` (überfällig seit ${Math.abs(dl.daysLeft)} T.)`
                      : dl.daysLeft === 0
                      ? ' (HEUTE!)'
                      : ` (in ${dl.daysLeft} T.)`;
                  return (
                    <button
                      key={`${dl.histId}-${dl.kind}`}
                      type="button"
                      onClick={() => jumpToStepCard(dl.histId)}
                      style={{
                        background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
                        border: `1px solid ${theme.warningBorder}`,
                        color: theme.textMain,
                        borderRadius: '999px',
                        padding: '3px 10px',
                        fontSize: '11.5px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                      title="Zum auslösenden Vorgang springen"
                    >
                      {dl.kind === 'BEHÖRDEN-/GERICHTSFRIST' ? 'Frist' : 'WV'}: {dl.formattedDate}
                      {restBadge} • {dl.stepCode}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* HILFE-BEREICH 2: FILTER-, SORTIER- & SUCHLEISTE */}
          <div
            data-help="fallakte_filter_sort"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              paddingTop: '6px',
              paddingRight: '18px',
              borderTop: `1px dashed ${theme.border}`
            }}
          >
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setTypFilter('ALL')}
                style={pillBtnStyle(typFilter === 'ALL')}
              >
                Gesamt ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setTypFilter('Eingang')}
                style={pillBtnStyle(typFilter === 'Eingang', '#0284c7')}
              >
                Eingänge ({stats.eingaenge})
              </button>
              <button
                type="button"
                onClick={() => setTypFilter('Ausgang')}
                style={pillBtnStyle(typFilter === 'Ausgang', '#10b981')}
              >
                Ausgänge ({stats.ausgaenge})
              </button>
              <button
                type="button"
                onClick={() => setTypFilter('Intern')}
                style={pillBtnStyle(typFilter === 'Intern', '#f59e0b')}
              >
                Intern / Notizen ({stats.intern})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 280px', justifyContent: 'flex-end' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: theme.cardBg,
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: '6px',
                  padding: '5px 10px',
                  minWidth: '190px',
                  flex: '0 1 260px'
                }}
              >
                <Icon name="search" size={14} style={{ color: theme.textMuted }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="In Fallakte suchen..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.textMain,
                    fontSize: '12px',
                    width: '100%',
                    outline: 'none'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: theme.textMuted,
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '12px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                style={pillBtnStyle(false)}
                title="Reihenfolge der Chronik umschalten"
              >
                {sortOrder === 'asc' ? '↑ Tag 1 → Heute' : '↓ Aktuellste zuerst'}
              </button>

              <button
                type="button"
                onClick={handleToggleAllTexts}
                style={pillBtnStyle(expandAllTexts)}
              >
                {expandAllTexts ? 'Texte einklappen' : 'Alle Texte aufklappen'}
              </button>
            </div>
          </div>
        </div>

        {/* 3. HAUPTBEREICH MIT LIVE-HILFE-ANKER 3: CHRONOLOGISCHE VERFAHRENS-TIMELINE */}
        <div
          data-help="fallakte_timeline_list"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px',
            background: theme.bg
          }}
        >
          {filteredEntries.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: theme.textMuted,
                border: `1px dashed ${theme.border}`,
                borderRadius: '10px',
                background: theme.cardBg
              }}
            >
              Keine passenden Vorgänge in dieser Ansicht gefunden.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredEntries.map((entry) => {
                const colors = getTypBadgeColors(entry.typ);
                const isExpanded = Boolean(expandedIds[entry.id]);
                const loadedTwinText = twinTextsById[entry.id] || '';
                const hasAnyText = Boolean(entry.briefText || loadedTwinText);
                const canFetchTwin =
                  !loadedTwinText &&
                  (entry.mdTwins.length > 0 || entry.visibleDocs.some((d) => d.twinCandidateUrl));

                return (
                  <div
                    id={`fallakte-step-${entry.id}`}
                    key={entry.id}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'stretch'
                    }}
                  >
                    {/* Linke Nummern- & Zeitstrahl-Spalte */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '50px',
                        flexShrink: 0
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '32px',
                          borderRadius: '8px',
                          background: colors.bg,
                          border: `2px solid ${colors.border}`,
                          color: colors.text,
                          fontWeight: 900,
                          fontSize: '12.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {entry.stepCode}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          width: '2px',
                          background: theme.border,
                          marginTop: '6px'
                        }}
                      />
                    </div>

                    {/* Rechte Vorgangs-Karte */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        background: theme.cardBg,
                        border: `1px solid ${theme.border}`,
                        borderLeft: `4px solid ${colors.border}`,
                        borderRadius: '10px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      {/* Zeile 1: Typ, Datum, Kanal & Aktionen */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              background: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                              padding: '2px 8px',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase'
                            }}
                          >
                            {entry.typ}
                          </span>

                          <strong style={{ color: theme.textMain, fontSize: '13.5px' }}>
                            {entry.datumFormatted}
                          </strong>

                          {entry.kanal && entry.kanal !== '-' && (
                            <span
                              style={{
                                fontSize: '11.5px',
                                color: theme.textMuted,
                                background: theme.inputBg,
                                border: `1px solid ${theme.border}`,
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}
                            >
                              Kanal: {entry.kanal}
                            </span>
                          )}

                          {entry.fristFormatted && (
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 'bold',
                                color: '#ffffff',
                                background: '#dc2626',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}
                            >
                              Behördenfrist: {entry.fristFormatted}
                            </span>
                          )}

                          {entry.wvFormatted && (
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 'bold',
                                color: '#000000',
                                background: '#fbbf24',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}
                            >
                              WV: {entry.wvFormatted}
                            </span>
                          )}
                        </div>

                        {/* Rechts: Text aufklappen / OCR laden / In Maske übernehmen */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {hasAnyText && (
                            <button
                              type="button"
                              onClick={() => toggleSingleEntryText(entry.id)}
                              style={pillBtnStyle(isExpanded)}
                            >
                              <Icon name={isExpanded ? 'eyeOff' : 'eye'} size={13} />
                              {isExpanded ? 'Text zuklappen' : 'Schreiben lesen'}
                            </button>
                          )}

                          {canFetchTwin && (
                            <button
                              type="button"
                              disabled={loadingTwinId === entry.id}
                              onClick={() => handleLoadMdTwin(entry)}
                              style={pillBtnStyle(false, theme.wissenAccent || '#a855f7')}
                              title="Extrahierten Dokumenten-Volltext (.md-Zwilling) aus Storage nachladen"
                            >
                              <Icon name="file" size={13} />
                              {loadingTwinId === entry.id ? 'Lade OCR...' : 'PDF-Volltext lesen'}
                            </button>
                          )}

                          {typeof onLoadVorgangInMaske === 'function' && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onLoadVorgangInMaske(akte, entry.raw);
                              }}
                              style={{
                                background: theme.accent,
                                color: btnTextColor,
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                fontSize: '11.5px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                              title="Diesen Vorgang zur Bearbeitung / Beantwortung ins obere Formular übernehmen"
                            >
                              In Maske laden
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Zeile 2: Vorgangsbeschreibung / Betreff */}
                      <div
                        style={{
                          color: theme.textMain,
                          fontSize: '14px',
                          fontWeight: 600,
                          lineHeight: 1.45,
                          wordBreak: 'break-word'
                        }}
                      >
                        {entry.aktion}
                      </div>

                      {/* Zeile 3: Bezugs-Kette (Rückwärts & Vorwärts) */}
                      {(entry.bezugInfo || entry.folgevorgaengeCodes.length > 0) && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            fontSize: '11.5px'
                          }}
                        >
                          {entry.bezugInfo && (
                            <button
                              type="button"
                              onClick={() => jumpToStepCard(entry.bezugInfo.id)}
                              style={{
                                background: theme.inputBg,
                                border: `1px dashed ${theme.accent}`,
                                color: theme.accent,
                                borderRadius: '5px',
                                padding: '3px 8px',
                                fontSize: '11.5px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                            >
                              ↳ Bezug auf {entry.bezugInfo.stepCode} ({entry.bezugInfo.typ} vom{' '}
                              {entry.bezugInfo.datumFormatted})
                            </button>
                          )}

                          {entry.folgevorgaengeCodes.length > 0 && (
                            <span style={{ color: theme.textMuted }}>
                              → Fortgeführt / Beantwortet in:{' '}
                              <strong style={{ color: theme.textMain }}>
                                {entry.folgevorgaengeCodes.join(', ')}
                              </strong>
                            </span>
                          )}
                        </div>
                      )}

                      {/* Zeile 4: Angehängte Original-Dokumente (PDFs / Anlagen) */}
                      {entry.visibleDocs.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                          {entry.visibleDocs.map((doc, dIdx) => (
                            <a
                              key={dIdx}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                background: theme.inputBg,
                                border: `1px solid ${theme.border}`,
                                color: theme.accent
                              }}
                              title={`Original-Dokument öffnen: ${doc.fileName}`}
                            >
                              <Icon name="paperclip" size={13} />
                              {doc.fileName}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Zeile 5: Kurz-Vorschau (wenn eingeklappt) oder Volltext (wenn aufgeklappt) */}
                      {!isExpanded && entry.previewText && (
                        <div
                          onClick={() => toggleSingleEntryText(entry.id)}
                          style={{
                            fontSize: '12.5px',
                            color: theme.textMuted,
                            background: theme.inputBg,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            lineHeight: 1.45
                          }}
                          title="Klicken zum vollständigen Aufklappen"
                        >
                          {entry.previewText}
                        </div>
                      )}

                      {isExpanded && hasAnyText && (
                        <div
                          style={{
                            position: 'relative',
                            background: theme.inputBg,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '8px',
                            padding: '14px',
                            marginTop: '2px',
                            overflow: 'hidden'
                          }}
                        >
                          {!isOwnerAccount && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                opacity: 0.12
                              }}
                            >
                              <span
                                style={{
                                  transform: 'rotate(-10deg)',
                                  border: '3px solid #dc2626',
                                  color: '#dc2626',
                                  fontWeight: 900,
                                  fontSize: '22px',
                                  padding: '6px 14px'
                                }}
                              >
                                MUSTER • DEMO-ANSICHT
                              </span>
                            </div>
                          )}

                          {entry.briefText && (
                            <div style={{ marginBottom: loadedTwinText ? '14px' : 0 }}>
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  color: theme.accent,
                                  textTransform: 'uppercase',
                                  marginBottom: '6px'
                                }}
                              >
                                Hinterlegter Schriftsatz / Zusammenfassung / Vermerk:
                              </div>
                              <pre
                                style={{
                                  margin: 0,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  fontFamily: 'ui-monospace, Consolas, monospace',
                                  fontSize: '12.5px',
                                  lineHeight: 1.55,
                                  color: theme.textMain
                                }}
                              >
                                {entry.briefText}
                              </pre>
                            </div>
                          )}

                          {loadedTwinText && (
                            <div
                              style={{
                                borderTop: entry.briefText ? `1px dashed ${theme.border}` : 'none',
                                paddingTop: entry.briefText ? '12px' : 0
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  color: theme.wissenAccent || '#a855f7',
                                  textTransform: 'uppercase',
                                  marginBottom: '6px'
                                }}
                              >
                                Extrahierter Original-Dokumententext (.md-Zwilling):
                              </div>
                              <pre
                                style={{
                                  margin: 0,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  fontFamily: 'ui-monospace, Consolas, monospace',
                                  fontSize: '12px',
                                  lineHeight: 1.5,
                                  color: theme.textMain,
                                  maxHeight: '420px',
                                  overflowY: 'auto'
                                }}
                              >
                                {loadedTwinText}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}