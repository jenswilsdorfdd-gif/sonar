import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';

const OWNER_USER_ID = 'ea175141-2c03-4f93-ba1b-392570229cb2';

const KATEGORIEN = [
  'Gerichte',
  'Steuern_Zoll',
  'Aufsicht',
  'Wirtschaft_Gesetze',
  'Europa_Ticker'
];

export default function RssFeedHealthAlert({
  theme,
  showToast,
  ladeDaten,
  mode = 'popup' // 'popup' = globales Fehler-Popup | 'monitor' = 25-Feeds-Übersichtskachel
}) {
  const [feeds, setFeeds] = useState([]);
  const [errorFeeds, setErrorFeeds] = useState([]);
  const [editedUrls, setEditedUrls] = useState({});
  const [busyFeedId, setBusyFeedId] = useState(null);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [isMonitorExpanded, setIsMonitorExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isOwnerUser, setIsOwnerUser] = useState(false);

  // States für "+ Neue RSS-Quelle hinzufügen"
  const [newName, setNewName] = useState('');
  const [newKategorie, setNewKategorie] = useState('Gerichte');
  const [newUrl, setNewUrl] = useState('');
  const [newFallbackDomain, setNewFallbackDomain] = useState('');
  const [addingFeed, setAddingFeed] = useState(false);

  const pageAccent = mode === 'monitor' ? (theme?.wissenAccent || '#a855f7') : (theme?.warningBorder || '#f43f5e');

  const inputStyle = {
    width: '100%',
    padding: '9px 12px',
    boxSizing: 'border-box',
    border: `1px solid ${theme?.inputBorder || '#334155'}`,
    borderRadius: '6px',
    fontSize: '12.5px',
    backgroundColor: theme?.inputBg || '#020617',
    color: theme?.textMain || '#ffffff',
    outline: 'none'
  };

  const outlineBtnBase = {
    background: 'transparent',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    textAlign: 'center',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap'
  };

  const fetchFeedStatuses = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || '';
      setIsOwnerUser(uid === OWNER_USER_ID);

      if (mode === 'popup') {
        const { data, error } = await supabase
          .from('rss_feed_status')
          .select('*')
          .eq('is_active', true)
          .eq('status', 'error')
          .order('consecutive_failures', { ascending: false });

        if (!error && Array.isArray(data)) {
          setErrorFeeds(data);
          const urlMap = {};
          data.forEach((f) => {
            urlMap[f.id] = f.url || '';
          });
          setEditedUrls((prev) => ({ ...urlMap, ...prev }));
        }
      } else {
        const { data, error } = await supabase
          .from('rss_feed_status')
          .select('*')
          .order('kategorie', { ascending: true })
          .order('name', { ascending: true });

        if (!error && Array.isArray(data)) {
          setFeeds(data);
          const errList = data.filter((f) => f.is_active && f.status === 'error');
          setErrorFeeds(errList);
          const urlMap = {};
          data.forEach((f) => {
            urlMap[f.id] = f.url || '';
          });
          setEditedUrls((prev) => ({ ...urlMap, ...prev }));
        }
      }
    } catch (e) {
      console.warn('RSS-Health-Status konnte nicht geladen werden:', e);
    }
  };

  useEffect(() => {
    fetchFeedStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Button 1: URL speichern & sofort über Edge Function rss-knowledge-scraper testen
  const handleSaveAndTestFeed = async (feed) => {
    if (!feed || !feed.id) return;
    const targetUrl = String(editedUrls[feed.id] ?? feed.url ?? '').trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      if (showToast) showToast('Bitte eine gültige http(s):// RSS-URL eingeben.', 'warning');
      return;
    }

    setBusyFeedId(feed.id);
    try {
      // 1. In rss_feed_status URL aktualisieren und Fehlerzähler zurücksetzen
      const { error: updateErr } = await supabase
        .from('rss_feed_status')
        .update({
          url: targetUrl,
          is_active: true,
          status: 'ok',
          consecutive_failures: 0,
          last_error: null,
          last_checked_at: new Date().toISOString()
        })
        .eq('id', feed.id);

      if (updateErr) throw new Error(updateErr.message);

      // 2. Sofort-Test über die Edge Function rss-knowledge-scraper mit Body { gericht: feed.name, items: 1 }
      const { data: testData, error: testErr } = await supabase.functions.invoke('rss-knowledge-scraper', {
        body: {
          gericht: feed.name,
          items: 1
        }
      });

      if (testErr) throw new Error(testErr.message);
      if (testData?.error) throw new Error(testData.error);

      if (showToast) {
        showToast(`RSS-Quelle "${feed.name}" erfolgreich aktualisiert und live getestet.`, 'success');
      }
      await fetchFeedStatuses();
      if (typeof ladeDaten === 'function') await ladeDaten();
    } catch (err) {
      console.error('Fehler beim Testen des RSS-Feeds:', err);
      if (showToast) {
        showToast(`Test für "${feed.name}" fehlgeschlagen: ${err.message || err}`, 'error');
      }
      await fetchFeedStatuses();
    } finally {
      setBusyFeedId(null);
    }
  };

  // Button 2: Feed dauerhaft abschalten (is_active: false, status: 'disabled')
  const handleDisableFeed = async (feed) => {
    if (!feed || !feed.id) return;
    if (!window.confirm(`RSS-Quelle "${feed.name}" dauerhaft abschalten, damit der Cron-Job sie künftig überspringt?`)) {
      return;
    }

    setBusyFeedId(feed.id);
    try {
      const { error } = await supabase
        .from('rss_feed_status')
        .update({
          is_active: false,
          status: 'disabled'
        })
        .eq('id', feed.id);

      if (error) throw new Error(error.message);

      if (showToast) {
        showToast(`RSS-Quelle "${feed.name}" wurde deaktiviert.`, 'success');
      }
      await fetchFeedStatuses();
    } catch (err) {
      if (showToast) {
        showToast('Fehler beim Abschalten: ' + (err.message || err), 'error');
      }
    } finally {
      setBusyFeedId(null);
    }
  };

  // Reaktivieren eines abgeschalteten Feeds im Monitor
  const handleEnableFeed = async (feed) => {
    if (!feed || !feed.id) return;
    setBusyFeedId(feed.id);
    try {
      const { error } = await supabase
        .from('rss_feed_status')
        .update({
          is_active: true,
          status: 'ok',
          consecutive_failures: 0,
          last_error: null
        })
        .eq('id', feed.id);

      if (error) throw new Error(error.message);
      if (showToast) showToast(`RSS-Quelle "${feed.name}" wieder aktiviert.`, 'success');
      await fetchFeedStatuses();
    } catch (err) {
      if (showToast) showToast('Fehler beim Aktivieren: ' + (err.message || err), 'error');
    } finally {
      setBusyFeedId(null);
    }
  };

  // Neue RSS-Quelle in public.rss_feed_status anlegen
  const handleAddNewFeed = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    setAddingFeed(true);
    try {
      let fallbackDom = newFallbackDomain.trim();
      if (!fallbackDom) {
        try {
          const u = new URL(newUrl.trim());
          fallbackDom = `${u.protocol}//${u.hostname}`;
        } catch (_e) {
          fallbackDom = '';
        }
      }

      const { error } = await supabase.from('rss_feed_status').insert([
        {
          name: newName.trim(),
          kategorie: newKategorie,
          url: newUrl.trim(),
          fallback_domain: fallbackDom || null,
          is_active: true,
          status: 'ok',
          consecutive_failures: 0
        }
      ]);

      if (error) throw new Error(error.message);

      setNewName('');
      setNewUrl('');
      setNewFallbackDomain('');
      setShowAddForm(false);
      if (showToast) showToast(`Neue RSS-Quelle "${newName.trim()}" hinzugefügt.`, 'success');
      await fetchFeedStatuses();
    } catch (err) {
      if (showToast) showToast('Fehler beim Hinzufügen: ' + (err.message || err), 'error');
    } finally {
      setAddingFeed(false);
    }
  };

  // Liefert die Rahmen-/Textfarbe je nach Feed-Status (im ruhigen Outline-Design)
  const getStatusStyle = (status, isActive) => {
    if (!isActive || status === 'disabled') {
      return { label: 'DEAKTIVIERT', color: theme?.textMuted || '#94a3b8' };
    }
    switch (status) {
      case 'error':
        return { label: 'FEHLER (ERROR)', color: theme?.warningBorder || '#f43f5e' };
      case 'warning':
        return { label: 'WARNUNG', color: '#f59e0b' };
      case 'repaired':
        return { label: 'AUTO-REPARIERT', color: theme?.accent || '#00e5ff' };
      default:
        return { label: 'AKTIV (OK)', color: '#10b981' };
    }
  };

  // ============================================================================
  // MODUS 1: GLOBALES ALARM-POPUP (RENDERT NULL, WENN KEINE FEHLER VORLIEGEN)
  // ============================================================================
  if (mode === 'popup') {
    if (!isOwnerUser || popupDismissed || errorFeeds.length === 0) {
      return null;
    }

    return (
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 10040,
          maxWidth: '560px',
          width: 'calc(100vw - 32px)',
          background: theme?.cardBg || '#0f172a',
          border: `2px solid ${theme?.warningBorder || '#f43f5e'}`,
          borderRadius: '12px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.75)',
          padding: '18px 20px',
          textAlign: 'left',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px',
                borderRadius: '4px',
                border: `1px solid ${theme?.warningBorder || '#f43f5e'}`,
                color: theme?.warningBorder || '#f43f5e',
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}
            >
              <Icon name="alert" size={13} /> RSS-Quellen-Alarm ({errorFeeds.length} gestört)
            </div>
            <h4 style={{ margin: 0, color: theme?.textMain || '#ffffff', fontSize: '15px' }}>
              Automatische Selbstheilung bei {errorFeeds.length === 1 ? 'einer Rechtsquelle' : `${errorFeeds.length} Rechtsquellen`} fehlgeschlagen
            </h4>
          </div>

          <button
            type="button"
            onClick={() => setPopupDismissed(true)}
            style={{
              background: 'transparent',
              border: `1px solid ${theme?.border || '#1e293b'}`,
              color: theme?.textMuted || '#94a3b8',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            title="Alarm für diese Sitzung ausblenden"
          >
            <Icon name="x" size={14} />
          </button>
        </div>

        <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {errorFeeds.map((feed) => {
            const isBusy = busyFeedId === feed.id;
            return (
              <div
                key={feed.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: theme?.inputBg || '#020617',
                  border: `1px solid ${theme?.border || '#1e293b'}`,
                  borderLeft: `4px solid ${theme?.warningBorder || '#f43f5e'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <strong style={{ fontSize: '13.5px', color: theme?.textMain || '#ffffff' }}>
                    {feed.name} ({feed.kategorie})
                  </strong>
                  <span style={{ fontSize: '11px', color: theme?.warningBorder || '#f43f5e', fontWeight: 'bold' }}>
                    {feed.consecutive_failures || 3} Fehlversuche | {feed.last_error || `HTTP ${feed.last_http_status || 'Fehler'}`}
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={editedUrls[feed.id] ?? feed.url ?? ''}
                    onChange={(e) =>
                      setEditedUrls((prev) => ({
                        ...prev,
                        [feed.id]: e.target.value
                      }))
                    }
                    placeholder="Neue RSS-XML-URL eintragen..."
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleDisableFeed(feed)}
                    style={{
                      ...outlineBtnBase,
                      border: `1px solid ${theme?.border || '#334155'}`,
                      color: theme?.textMuted || '#94a3b8'
                    }}
                  >
                    <Icon name="trash" size={13} />
                    <span>Feed dauerhaft abschalten</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleSaveAndTestFeed(feed)}
                    style={{
                      ...outlineBtnBase,
                      border: `1px solid ${theme?.warningBorder || '#f43f5e'}`,
                      color: theme?.warningBorder || '#f43f5e'
                    }}
                  >
                    <Icon name="check" size={13} />
                    <span>{isBusy ? 'Teste Feed...' : 'URL speichern & sofort testen'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODUS 2: ÜBERSICHTS-KACHEL "RSS-QUELLEN-MONITOR (25 FEEDS)" IM WISSENSSPEICHER
  // ============================================================================
  const okCount = feeds.filter((f) => f.is_active && (f.status === 'ok' || f.status === 'repaired')).length;
  const warnCount = feeds.filter((f) => f.is_active && f.status === 'warning').length;
  const errCount = feeds.filter((f) => f.is_active && f.status === 'error').length;
  const disabledCount = feeds.filter((f) => !f.is_active || f.status === 'disabled').length;

  return (
    <div
      style={{
        background: theme.cardBg,
        borderRadius: '12px',
        border: `1px solid ${errCount > 0 ? theme.warningBorder : theme.border}`,
        padding: '18px 20px',
        marginBottom: '20px',
        width: '100%',
        boxSizing: 'border-box',
        textAlign: 'left'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          cursor: 'pointer'
        }}
        onClick={() => setIsMonitorExpanded(!isMonitorExpanded)}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Icon name="signal" size={18} style={{ color: pageAccent }} />
            <strong style={{ fontSize: '15px', color: theme.textMain }}>
              RSS-Quellen-Monitor ({feeds.length} Rechts-, Steuer- & Behörden-Feeds)
            </strong>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '4px',
                border: `1px solid ${errCount > 0 ? theme.warningBorder : pageAccent}`,
                color: errCount > 0 ? theme.warningBorder : pageAccent,
                fontWeight: 'bold'
              }}
            >
              {okCount} OK • {warnCount} Warnung • {errCount} Fehler • {disabledCount} Aus
            </span>
          </div>
          <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>
            Store-First-Volltext-Pipeline (bis 85.000 Zeichen pro Entscheidung inkl. automatischer §§-Indexierung im Storage-Bucket)
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
          {isOwnerUser && (
            <button
              type="button"
              onClick={() => {
                setIsMonitorExpanded(true);
                setShowAddForm(!showAddForm);
              }}
              style={{
                ...outlineBtnBase,
                border: `1px solid ${pageAccent}`,
                color: pageAccent
              }}
            >
              + Neue RSS-Quelle hinzufügen
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMonitorExpanded(!isMonitorExpanded)}
            style={{
              ...outlineBtnBase,
              border: `1px solid ${theme.border}`,
              color: theme.textMain
            }}
          >
            <span>{isMonitorExpanded ? 'Monitor zuklappen' : 'Alle Feeds anzeigen'}</span>
            <Icon name={isMonitorExpanded ? 'down' : 'right'} size={16} />
          </button>
        </div>
      </div>

      {/* FORMULAR: + NEUE RSS-QUELLE HINZUFÜGEN */}
      {isMonitorExpanded && showAddForm && isOwnerUser && (
        <form
          onSubmit={handleAddNewFeed}
          style={{
            marginTop: '16px',
            padding: '14px',
            borderRadius: '8px',
            background: theme.inputBg,
            border: `1px solid ${pageAccent}`,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
            gap: '12px',
            alignItems: 'end'
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
              Name (Gericht / Behörde)*
            </label>
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="z.B. FG Münster / BMF"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
              Kategorie*
            </label>
            <select value={newKategorie} onChange={(e) => setNewKategorie(e.target.value)} style={inputStyle}>
              {KATEGORIEN.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
              RSS-XML-URL*
            </label>
            <input
              required
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://.../rss.xml"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
              Fallback-Domain (Optional)
            </label>
            <input
              value={newFallbackDomain}
              onChange={(e) => setNewFallbackDomain(e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              disabled={addingFeed}
              style={{
                ...outlineBtnBase,
                border: `1px solid ${pageAccent}`,
                color: pageAccent,
                width: '100%'
              }}
            >
              <Icon name="check" size={14} />
              <span>{addingFeed ? 'Speichere...' : 'Quelle speichern'}</span>
            </button>
          </div>
        </form>
      )}

      {/* LISTE ALLER 25 FEEDS */}
      {isMonitorExpanded && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {feeds.map((feed) => {
            const st = getStatusStyle(feed.status, feed.is_active);
            const isBusy = busyFeedId === feed.id;
            return (
              <div
                key={feed.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: theme.inputBg,
                  border: `1px solid ${feed.status === 'error' && feed.is_active ? theme.warningBorder : theme.border}`,
                  borderLeft: `4px solid ${st.color}`,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                  gap: '10px',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '13px', color: theme.textMain }}>{feed.name}</strong>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        border: `1px solid ${st.color}`,
                        color: st.color,
                        fontWeight: 'bold'
                      }}
                    >
                      {st.label}
                    </span>
                    <span style={{ fontSize: '11px', color: theme.textMuted }}>({feed.kategorie})</span>
                  </div>
                  {feed.last_error && (
                    <div style={{ fontSize: '11px', color: theme.warningBorder, marginTop: '3px' }}>
                      Fehler ({feed.consecutive_failures || 0}x): {feed.last_error}
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    disabled={!isOwnerUser}
                    value={editedUrls[feed.id] ?? feed.url ?? ''}
                    onChange={(e) =>
                      setEditedUrls((prev) => ({
                        ...prev,
                        [feed.id]: e.target.value
                      }))
                    }
                    style={{ ...inputStyle, padding: '7px 10px', fontSize: '11.5px' }}
                  />
                </div>

                {isOwnerUser && (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSaveAndTestFeed(feed)}
                      style={{
                        ...outlineBtnBase,
                        padding: '6px 10px',
                        fontSize: '11px',
                        border: `1px solid ${pageAccent}`,
                        color: pageAccent
                      }}
                    >
                      <Icon name="check" size={12} />
                      <span>{isBusy ? 'Teste...' : 'URL speichern & testen'}</span>
                    </button>

                    {feed.is_active ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDisableFeed(feed)}
                        style={{
                          ...outlineBtnBase,
                          padding: '6px 10px',
                          fontSize: '11px',
                          border: `1px solid ${theme.warningBorder}`,
                          color: theme.warningBorder
                        }}
                      >
                        <span>Abschalten</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleEnableFeed(feed)}
                        style={{
                          ...outlineBtnBase,
                          padding: '6px 10px',
                          fontSize: '11px',
                          border: `1px solid ${theme.border}`,
                          color: theme.textMain
                        }}
                      >
                        <span>Aktivieren</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}