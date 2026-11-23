// src/DemoAccessAlert.jsx
// TÜRSTEHER-ALARM FÜR DEN OWNER: Zeigt offene Demo-Testzugangs-Anfragen prominent oben im Cockpit an
// und versendet bei 1-Klick-Freigabe sofort die Einladungs-E-Mail (ohne PDF-Anhang) über Resend.

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';

const OWNER_USER_ID = 'ea175141-2c03-4f93-ba1b-392570229cb2';

export default function DemoAccessAlert({ session, theme, showToast }) {
  const isOwner = session?.user?.id === OWNER_USER_ID;

  const [requests, setRequests] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!isOwner) return;
    try {
      const { data, error } = await supabase
        .from('demo_access_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        setRequests(data);
      }
    } catch (err) {
      console.warn('Demo-Anfragen konnten nicht geladen werden:', err);
    }
  }, [isOwner]);

  useEffect(() => {
    if (!isOwner) return;
    loadRequests();

    // Echtzeit-Listener: Neue Anfragen ploppen live im offenen Cockpit auf!
    const channel = supabase
      .channel('owner_demo_access_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demo_access_requests'
        },
        (payload) => {
          loadRequests();
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            if (typeof showToast === 'function') {
              showToast(
                `Neue Testzugangs-Anfrage eingegangen: ${payload.new.name || payload.new.email}`,
                'warning'
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOwner, loadRequests, showToast]);

  if (!isOwner) return null;

  const pendingList = requests.filter((r) => r.status === 'pending');
  const processedList = requests.filter((r) => r.status !== 'pending');

  // Wenn weder offene Anfragen vorliegen noch die Historie aufgeklappt ist: Komplett unsichtbar bleiben,
  // außer es gibt bereits freigegebene Tester -> dann dezenter kleiner Verwaltungslink rechts.
  if (pendingList.length === 0 && !showHistory) {
    if (processedList.length === 0) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.border}`,
            color: theme.textMuted,
            borderRadius: '20px',
            padding: '5px 12px',
            fontSize: '11.5px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Icon name="user" size={13} />
          <span>Freigegebene Demo-Zugänge verwalten ({processedList.filter((x) => x.status === 'approved').length})</span>
        </button>
      </div>
    );
  }

  const handleApproveAndNotify = async (reqItem) => {
    if (!reqItem || busyId) return;
    setBusyId(reqItem.id);

    try {
      // 1. Status in Datenbank auf 'approved' setzen
      const { error: dbErr } = await supabase
        .from('demo_access_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          rejected_at: null
        })
        .eq('id', reqItem.id);

      if (dbErr) throw new Error(dbErr.message);

      // 2. Saubere Freigabe-E-Mail (OHNE PDF-Anhang) über sonar-send-email an den Interessenten senden
      const cockpitUrl = window.location.origin;
      const salutation = reqItem.name
        ? `Guten Tag ${reqItem.name},`
        : 'Guten Tag,';

      const mailText = [
        salutation,
        '',
        'vielen Dank für Ihr Interesse an unserem KI-gestützten Kanzlei-, Behördenabwehr- & Compliance-System SMART SONAR COCKPIT.',
        '',
        `Ihre E-Mail-Adresse (${reqItem.email}) wurde soeben für den kostenfreien Testzugang freigeschaltet!`,
        '',
        'SO STARTEN SIE IN 2 SCHRITTEN:',
        `1. Öffnen Sie das Cockpit unter: ${cockpitUrl}`,
        `2. Wählen Sie oben rechts den Reiter „Testzugang (Demo)“, geben Sie Ihre E-Mail-Adresse (${reqItem.email}) ein und klicken Sie auf „Magic Link senden“.`,
        '',
        'Sie erhalten daraufhin sofort Ihren persönlichen Einmal-Login-Link per E-Mail und starten direkt in Ihrer datenschutzisolierten Demo-Umgebung (inklusive 3 vorbereiteter Musterakten sowie bis zu 10 eigenen Test-Vorgängen).',
        '',
        'Bei Rückfragen zu einer individuellen Unternehmens-Einrichtung antworten Sie jederzeit gerne direkt auf diese E-Mail.',
        '',
        'Mit freundlichen Grüßen',
        '',
        'Jens Wilsdorf',
        'Wilsdorf & Sommer GmbH'
      ].join('\n');

      const mailHtml = `
        <div style="font-family: system-ui, -apple-system, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #0f172a; max-width: 620px;">
          <p>${salutation}</p>
          <p>vielen Dank für Ihr Interesse an unserem KI-gestützten Kanzlei-, Behördenabwehr- &amp; Compliance-System <strong>SMART SONAR COCKPIT</strong>.</p>
          <p style="padding: 12px 16px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 6px; font-weight: bold; color: #065f46;">
            Ihre E-Mail-Adresse (${reqItem.email}) wurde soeben für den kostenfreien Testzugang freigeschaltet!
          </p>
          <p><strong>So starten Sie jetzt in 2 Schritten:</strong></p>
          <ol style="padding-left: 20px;">
            <li style="margin-bottom: 6px;">Öffnen Sie das SONAR Cockpit über den untenstehenden Button.</li>
            <li>Wählen Sie den Reiter <strong>„Testzugang (Demo)“</strong>, tragen Sie noch einmal Ihre E-Mail-Adresse <strong>${reqItem.email}</strong> ein und fordern Sie Ihren sofortigen Magic Link an.</li>
          </ol>
          <p style="margin: 22px 0;">
            <a href="${cockpitUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 22px; border-radius: 8px;">
              Jetzt zum SONAR Cockpit wechseln &amp; anmelden
            </a>
          </p>
          <p style="font-size: 12.5px; color: #475569;">
            In Ihrer datenschutzisolierten Testumgebung stehen Ihnen sofort 3 schreibgeschützte Musterakten (Steuerrecht, OWiG, B2B-Inkassoabwehr), alle höchstrichterlichen Gerichts-Streams sowie bis zu 10 eigene Test-Vorgänge zur Verfügung.
          </p>
          <p>Mit freundlichen Grüßen</p>
        </div>
      `;

      const { data: mailRes, error: mailErr } = await supabase.functions.invoke('sonar-send-email', {
        body: {
          to: reqItem.email,
          subject: 'Ihr Testzugang für das SMART SONAR COCKPIT ist freigeschaltet',
          text: mailText,
          html: mailHtml,
          isOwnerAccount: true,
          unsereFirma: 'Wilsdorf & Sommer GmbH',
          skipPdfAttachment: true,
          skipOwnerCc: true
        }
      });

      if (mailErr || mailRes?.error) {
        console.warn('Hinweis beim Senden der Freigabe-Mail:', mailErr || mailRes?.error);
        showToast(
          `Zugang für ${reqItem.email} wurde in der Datenbank freigegeben (Hinweis beim Mailversand: ${mailErr?.message || mailRes?.error}).`,
          'warning'
        );
      } else {
        showToast(
          `Testzugang für ${reqItem.email} freigeschaltet & Einladungs-Mail erfolgreich versendet!`,
          'success'
        );
      }

      await loadRequests();
    } catch (err) {
      showToast('Fehler bei der Freigabe: ' + (err.message || err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectOrRevoke = async (reqItem, isRevoke = false) => {
    if (!reqItem || busyId) return;
    const confirmMsg = isRevoke
      ? `Testzugang für „${reqItem.email}“ wieder entziehen / sperren?`
      : `Testzugangs-Anfrage von „${reqItem.email}“ ablehnen?`;

    if (!window.confirm(confirmMsg)) return;

    setBusyId(reqItem.id);
    try {
      const { error } = await supabase
        .from('demo_access_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', reqItem.id);

      if (error) throw new Error(error.message);

      showToast(
        isRevoke
          ? `Testzugang für ${reqItem.email} wurde gesperrt.`
          : `Anfrage von ${reqItem.email} abgelehnt.`,
        'success'
      );
      await loadRequests();
    } catch (err) {
      showToast('Fehler: ' + (err.message || err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteEntry = async (reqItem) => {
    if (!reqItem || busyId) return;
    if (!window.confirm(`Eintrag „${reqItem.email}“ komplett aus der Liste entfernen?`)) return;
    setBusyId(reqItem.id);
    try {
      await supabase.from('demo_access_requests').delete().eq('id', reqItem.id);
      await loadRequests();
      showToast(`Eintrag ${reqItem.email} gelöscht.`, 'success');
    } catch (_e) {} finally {
      setBusyId(null);
    }
  };

  const formatTs = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const alertAccent = '#f59e0b';

  return (
    <div
      style={{
        background: theme.cardBg,
        border: `2px solid ${pendingList.length > 0 ? alertAccent : theme.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        textAlign: 'left',
        boxShadow: pendingList.length > 0 ? '0 8px 24px rgba(245, 158, 11, 0.18)' : 'none',
        boxSizing: 'border-box',
        width: '100%'
      }}
    >
      {/* KOPFZEILE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: pendingList.length > 0 || showHistory ? '14px' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              background: pendingList.length > 0 ? alertAccent : '#10b981',
              color: '#000000',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            {pendingList.length > 0 ? `${pendingList.length} OFFENE DEMO-ANFRAGE(N)` : 'DEMO-ZUGÄNGE'}
          </span>
          <strong style={{ color: theme.textMain, fontSize: '15px' }}>
            {pendingList.length > 0
              ? 'Neue Interessenten warten auf Freischaltung der Testversion'
              : 'Übersicht freigeschalteter & bearbeiteter Testzugänge'}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {processedList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                color: theme.textMuted,
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {showHistory ? 'Verlauf ausblenden' : `Verlauf (${processedList.length})`}
            </button>
          )}
        </div>
      </div>

      {/* OFFENE ANFRAGEN (WIE AKTEN-ALARME GESTALTET) */}
      {pendingList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendingList.map((req) => {
            const isBusy = busyId === req.id;
            return (
              <div
                key={req.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: theme.inputBg,
                  border: `1px solid ${theme.border}`,
                  borderLeft: `4px solid ${alertAccent}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px', flex: '1 1 260px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>
                    Interessent: <span style={{ color: alertAccent }}>{req.name || 'Ohne Namensangabe'}</span>
                    {req.firma ? ` (${req.firma})` : ''}
                  </div>
                  <div style={{ fontSize: '13px', color: theme.accent, fontWeight: 'bold', wordBreak: 'break-all' }}>
                    E-Mail: {req.email}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.textMuted }}>
                    Angefragt am: {formatTs(req.created_at)} • Möchte seine kostenfreie Testversion freigeschaltet bekommen
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleApproveAndNotify(req)}
                    style={{
                      background: '#10b981',
                      color: '#000000',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      fontWeight: 900,
                      fontSize: '12.5px',
                      cursor: isBusy ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Icon name="check" size={15} />
                    <span>{isBusy ? 'Sende Einladung...' : 'Freigeben & Einladungs-Mail senden'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleRejectOrRevoke(req, false)}
                    style={{
                      background: 'transparent',
                      color: theme.warningBorder,
                      border: `1px solid ${theme.warningBorder}`,
                      padding: '9px 14px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      cursor: isBusy ? 'wait' : 'pointer'
                    }}
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OPTIONAL AUFKLAPPBARE LISTE BEREITS FREIGEGEBENER / ABGELEHNTER TESTER */}
      {showHistory && processedList.length > 0 && (
        <div style={{ marginTop: pendingList.length > 0 ? '14px' : 0, paddingTop: pendingList.length > 0 ? '12px' : 0, borderTop: pendingList.length > 0 ? `1px dashed ${theme.border}` : 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {processedList.map((item) => {
            const isApproved = item.status === 'approved';
            return (
              <div
                key={item.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: theme.inputBg,
                  border: `1px solid ${theme.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  fontSize: '12.5px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      border: `1px solid ${isApproved ? '#10b981' : theme.warningBorder}`,
                      color: isApproved ? '#10b981' : theme.warningBorder
                    }}
                  >
                    {isApproved ? 'Freigegeben' : 'Gesperrt / Abgelehnt'}
                  </span>
                  <strong style={{ color: theme.textMain }}>{item.email}</strong>
                  {(item.name || item.firma) && (
                    <span style={{ color: theme.textMuted }}>
                      ({[item.name, item.firma].filter(Boolean).join(' • ')})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {isApproved ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleRejectOrRevoke(item, true)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${theme.warningBorder}`,
                        color: theme.warningBorder,
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Zugang sperren
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleApproveAndNotify(item)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #10b981',
                        color: '#10b981',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Doch freigeben & Mail senden
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleDeleteEntry(item)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: theme.textMuted,
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                    title="Eintrag löschen"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}