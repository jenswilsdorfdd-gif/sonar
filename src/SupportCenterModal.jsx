// src/SupportCenterModal.jsx
// ZENTRALES SUPPORT-, FREIGABE- & TICKET-CENTER (FÜR OWNER/PARTNER-ADMIN & DEMO-/KUNDEN-ACCOUNTS)
// - Echtzeit-Badge-Berechnung via Supabase Realtime (demo_access_requests + support_tickets)
// - Admin (Jens & Vertriebspartner Nico): Direkte Passwort-Vergabe in Supabase Auth, 1-Klick-Zugangs-Mail & Ticket-Beantwortung
// - Kunde/Tester: Eigene Inbox (Antworten & Freischalt-Status) + Neues Ticket stellen (Support / Lizenz- & Sales-Anfrage)
// - Außenauftritt & E-Mail-Signaturen dynamisch gesteuert über src/config/sonarLegalConfig.js

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import { getActiveLegalOperator } from './config/sonarLegalConfig';
import { isFullAccessSession } from './config/authRoles';

// Erzeugt ein gut lesbares, sicheres Initial-Passwort ohne verwechselbare Zeichen (0/O, 1/l/I)
function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let part = '';
  for (let i = 0; i < 8; i++) {
    part += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Sonar-${part}!`;
}

export default function SupportCenterModal({
  session,
  theme,
  isDarkMode,
  isOpen,
  onClose,
  onUnreadCountChange,
  showToast
}) {
  const userId = session?.user?.id || null;
  const userEmail = (session?.user?.email || '').trim().toLowerCase();
  const isOwner = isFullAccessSession(session);
  const op = getActiveLegalOperator();

  // Navigation im Modal
  const [adminTab, setAdminTab] = useState('access'); // 'access' | 'tickets'
  const [showAccessHistory, setShowAccessHistory] = useState(false);

  // Daten-States
  const [accessRequests, setAccessRequests] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // Passwort-Verwaltung pro Eintrag (id -> passwort) + Direkt-Anlage für neue Accounts
  const [passwordMap, setPasswordMap] = useState({});
  const [showDirectCreate, setShowDirectCreate] = useState(false);
  const [directEmail, setDirectEmail] = useState('');
  const [directName, setDirectName] = useState('');
  const [directFirma, setDirectFirma] = useState('');
  const [directPassword, setDirectPassword] = useState(() => generateSecurePassword());
  const [directSendMail, setDirectSendMail] = useState(true);
  const [busyDirectCreate, setBusyDirectCreate] = useState(false);

  // Formular-States (Kunde/Tester: Neues Ticket)
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketType, setNewTicketType] = useState('support'); // 'support' | 'sales_upgrade'
  const [newSubject, setNewSubject] = useState('');
  const [newName, setNewName] = useState('');
  const [newFirma, setNewFirma] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Antwort-Feld im offenen Ticket-Thread
  const [replyText, setReplyText] = useState('');
  const [busyAction, setBusyAction] = useState(false);
  const [busyAccessId, setBusyAccessId] = useState(null);

  const escapeHtml = (str) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

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

  const getPasswordForItem = (itemId) => {
    if (passwordMap[itemId] !== undefined) return passwordMap[itemId];
    return '';
  };

  const setPasswordForItem = (itemId, val) => {
    setPasswordMap((prev) => ({ ...prev, [itemId]: val }));
  };

  // --- DATEN LADEN & UNREAD-BADGE BERECHNEN ---
  const loadSupportData = useCallback(async () => {
    if (!userId) return;

    try {
      if (isOwner) {
        const [accRes, tickRes] = await Promise.all([
          supabase
            .from('demo_access_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('support_tickets')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(100)
        ]);

        const accList = !accRes.error && Array.isArray(accRes.data) ? accRes.data : [];
        const tickList = !tickRes.error && Array.isArray(tickRes.data) ? tickRes.data : [];

        setAccessRequests(accList);
        setTickets(tickList);

        // Offenen Anfragen direkt ein vorgeschlagenes sicheres Passwort hinterlegen, falls noch leer
        setPasswordMap((prev) => {
          const next = { ...prev };
          accList.forEach((r) => {
            if (r.status === 'pending' && !next[r.id]) {
              next[r.id] = generateSecurePassword();
            }
          });
          return next;
        });

        const pendingAccessCount = accList.filter((r) => r.status === 'pending').length;
        const unreadTicketCount = tickList.filter((t) => Boolean(t.unread_by_owner)).length;

        if (typeof onUnreadCountChange === 'function') {
          onUnreadCountChange(pendingAccessCount + unreadTicketCount);
        }
      } else {
        const { data: tickData, error: tickErr } = await supabase
          .from('support_tickets')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(50);

        const tickList = !tickErr && Array.isArray(tickData) ? tickData : [];
        setTickets(tickList);

        const unreadUserCount = tickList.filter((t) => Boolean(t.unread_by_user)).length;
        if (typeof onUnreadCountChange === 'function') {
          onUnreadCountChange(unreadUserCount);
        }
      }
    } catch (err) {
      console.warn('Support-Center Datenabruf Hinweis:', err);
    }
  }, [userId, isOwner, onUnreadCountChange]);

  // --- INITIALER ABRUF & ECHTZEIT-LISTENER (AUCH WENN MODAL GESCHLOSSEN IST -> FÜR HEADER-BADGE!) ---
  useEffect(() => {
    if (!userId) return;
    loadSupportData();

    const channelName = isOwner ? `sonar_support_center_admin_${userId}` : `sonar_support_center_user_${userId}`;
    let channel = supabase.channel(channelName).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'support_tickets'
      },
      (payload) => {
        loadSupportData();

        if (isOwner && payload.eventType === 'INSERT' && payload.new?.unread_by_owner) {
          if (typeof showToast === 'function') {
            showToast(
              `Neues Support-Ticket eingegangen: ${payload.new.subject || payload.new.user_email}`,
              'warning'
            );
          }
        }

        if (
          !isOwner &&
          payload.eventType === 'UPDATE' &&
          payload.new?.unread_by_user === true &&
          payload.old?.unread_by_user !== true &&
          (payload.new?.user_id === userId ||
            String(payload.new?.user_email || '').toLowerCase() === userEmail)
        ) {
          if (typeof showToast === 'function') {
            showToast(
              `Neue Antwort vom SONAR Support zu „${payload.new.subject}“ eingegangen.`,
              'success'
            );
          }
        }
      }
    );

    if (isOwner) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demo_access_requests'
        },
        (payload) => {
          loadSupportData();
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            if (typeof showToast === 'function') {
              showToast(
                `Neue Zugangs-Anfrage im Support-Center: ${payload.new.name || payload.new.email}`,
                'warning'
              );
            }
          }
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userEmail, isOwner, loadSupportData, showToast]);

  // Wenn das Modal geöffnet wird: Passenden Standard-Reiter vorwählen
  useEffect(() => {
    if (!isOpen) return;
    loadSupportData();

    if (isOwner) {
      const pendingAccess = accessRequests.filter((r) => r.status === 'pending').length;
      const unreadTicks = tickets.filter((t) => Boolean(t.unread_by_owner)).length;
      if (pendingAccess === 0 && unreadTicks > 0) {
        setAdminTab('tickets');
      } else if (pendingAccess > 0) {
        setAdminTab('access');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // --- TICKET ÖFFNEN UND AUTOMATISCH ALS GELESEN MARKIEREN ---
  const handleSelectTicket = async (ticket) => {
    if (!ticket) return;
    setSelectedTicketId(ticket.id);
    setShowNewTicketForm(false);

    if (isOwner && ticket.unread_by_owner) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, unread_by_owner: false } : t))
      );
      await supabase
        .from('support_tickets')
        .update({ unread_by_owner: false })
        .eq('id', ticket.id);
      loadSupportData();
    } else if (!isOwner && ticket.unread_by_user) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, unread_by_user: false } : t))
      );
      await supabase
        .from('support_tickets')
        .update({ unread_by_user: false })
        .eq('id', ticket.id);
      loadSupportData();
    }
  };

  // --- ZENTRALE HELFER-FUNKTION: AUTH-USER MIT PASSWORT ANLEGEN/AKTUALISIEREN + OPTIONAL MAIL SENDEN ---
  const provisionUserWithPassword = async ({
    email,
    password,
    name,
    firma,
    requestRowId = null,
    sendMail = true
  }) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Bitte eine gültige E-Mail-Adresse angeben.');
    }
    if (cleanPassword.length < 6) {
      throw new Error('Das Passwort muss mindestens 6 Zeichen lang sein.');
    }

    // 1. Echten Passwort-Benutzer in Supabase Auth anlegen oder aktualisieren (via Edge Function)
    const { data: provRes, error: provErr } = await supabase.functions.invoke('sonar-send-email', {
      body: {
        action: 'admin_provision_user',
        targetEmail: cleanEmail,
        targetPassword: cleanPassword,
        userName: name || '',
        userFirma: firma || ''
      }
    });

    if (provErr || provRes?.error) {
      throw new Error(provErr?.message || provRes?.error || 'Fehler bei der Benutzer-Einrichtung in Supabase Auth.');
    }

    const nowIso = new Date().toISOString();

    // 2. Eintrag in demo_access_requests synchronisieren (auf 'approved' setzen oder neu anlegen)
    if (requestRowId) {
      const { error: dbErr } = await supabase
        .from('demo_access_requests')
        .update({
          status: 'approved',
          approved_at: nowIso,
          rejected_at: null
        })
        .eq('id', requestRowId);

      if (dbErr) throw new Error(dbErr.message);
    } else {
      const existingReq = accessRequests.find(
        (r) => String(r.email || '').trim().toLowerCase() === cleanEmail
      );
      if (existingReq) {
        await supabase
          .from('demo_access_requests')
          .update({
            status: 'approved',
            name: name || existingReq.name || null,
            firma: firma || existingReq.firma || null,
            approved_at: nowIso,
            rejected_at: null
          })
          .eq('id', existingReq.id);
      } else {
        await supabase.from('demo_access_requests').insert([
          {
            email: cleanEmail,
            name: name || null,
            firma: firma || null,
            status: 'approved',
            approved_at: nowIso,
            created_at: nowIso
          }
        ]);
      }
    }

    // 3. Willkommens-Nachricht ins In-App Support-Center legen (falls noch nicht vorhanden)
    const existingWelcome = tickets.find(
      (t) =>
        t.ticket_type === 'access_request' &&
        String(t.user_email || '').trim().toLowerCase() === cleanEmail
    );

    if (!existingWelcome) {
      const welcomeMsgObj = {
        id: 'msg_' + Date.now(),
        sender: 'admin',
        sender_name: op.supportSenderName,
        text: `Herzlich willkommen im SMART SONAR COCKPIT! Ihr Zugang (${cleanEmail}) wurde erfolgreich eingerichtet. Falls Sie Fragen haben oder Unterstützung wünschen, können Sie uns jederzeit direkt hier über diesen Support-Bereich schreiben.`,
        created_at: nowIso
      };

      await supabase.from('support_tickets').insert([
        {
          user_id: provRes?.userId || null,
          user_email: cleanEmail,
          user_name: name || null,
          user_firma: firma || null,
          ticket_type: 'access_request',
          subject: 'Zugangs-Freischaltung & Willkommen im SONAR Cockpit',
          status: 'answered',
          messages: [welcomeMsgObj],
          unread_by_owner: false,
          unread_by_user: true,
          created_at: nowIso,
          updated_at: nowIso
        }
      ]);
    }

    // 4. Optional: Zugangsdaten-E-Mail mit E-Mail + Passwort für den Reiter "Mandanten-Login" senden
    let mailWarning = null;
    if (sendMail) {
      const cockpitUrl = window.location.origin;
      const salutation = name ? `Guten Tag ${name},` : 'Guten Tag,';

      const mailText = [
        salutation,
        '',
        'Ihr persönlicher Zugang für das KI-gestützte Kanzlei-, Behördenabwehr- & Compliance-System SMART SONAR COCKPIT ist ab sofort aktiv.',
        '',
        'IHRE PERSÖNLICHEN ZUGANGSDATEN (REITER „MANDANTEN-LOGIN“):',
        `• Cockpit-Link: ${cockpitUrl}`,
        `• E-Mail-Adresse: ${cleanEmail}`,
        `• Passwort: ${cleanPassword}`,
        '',
        'SO MELDEN SIE SICH AN:',
        `1. Öffnen Sie das Cockpit unter: ${cockpitUrl}`,
        '2. Bleiben Sie im ersten Reiter „Mandanten-Login“.',
        '3. Geben Sie Ihre E-Mail-Adresse und Ihr oben stehendes Passwort ein und klicken Sie auf „Im Cockpit anmelden“.',
        '',
        'Für Rückfragen steht Ihnen direkt oben rechts im Cockpit jederzeit der Button „Support“ zur Verfügung.',
        '',
        'Mit freundlichen Grüßen',
        op.supportMailSignOffName,
        op.supportMailSignOffCompany
      ].join('\n');

      const mailHtml = `
        <div style="font-family: system-ui, -apple-system, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #0f172a; max-width: 620px;">
          <p>${escapeHtml(salutation)}</p>
          <p>Ihr persönlicher Zugang für unser KI-gestütztes Kanzlei-, Behördenabwehr- &amp; Compliance-System <strong>SMART SONAR COCKPIT</strong> ist ab sofort eingerichtet!</p>
          <div style="padding: 14px 18px; background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0284c7; border-radius: 8px; margin: 16px 0;">
            <div style="font-weight: bold; color: #0f172a; margin-bottom: 8px;">Ihre Anmeldedaten (Reiter „Mandanten-Login“):</div>
            <div><strong>E-Mail-Adresse:</strong> ${escapeHtml(cleanEmail)}</div>
            <div style="margin-top: 4px;"><strong>Passwort:</strong> <code style="background: #e2e8f0; padding: 2px 7px; border-radius: 4px; font-size: 14px; font-weight: bold; color: #0f172a;">${escapeHtml(cleanPassword)}</code></div>
          </div>
          <p><strong>So melden Sie sich direkt an:</strong></p>
          <ol style="padding-left: 20px;">
            <li style="margin-bottom: 6px;">Öffnen Sie das SONAR Cockpit über den untenstehenden Button.</li>
            <li style="margin-bottom: 6px;">Nutzen Sie direkt den voreingestellten Reiter <strong>„Mandanten-Login“</strong>.</li>
            <li>Geben Sie Ihre E-Mail-Adresse und das oben genannte Passwort ein.</li>
          </ol>
          <p style="margin: 22px 0;">
            <a href="${cockpitUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-weight: bold; padding: 12px 22px; border-radius: 8px;">
              Jetzt im SONAR Cockpit anmelden
            </a>
          </p>
          <p style="font-size: 12.5px; color: #475569;">
            Bei Fragen erreichen Sie uns jederzeit direkt im Cockpit über den Button <strong>„Support“</strong> oben rechts.
          </p>
          <p>Mit freundlichen Grüßen<br/><strong>${escapeHtml(op.supportMailSignOffName)}</strong><br/>${escapeHtml(op.supportMailSignOffCompany)}</p>
        </div>
      `;

      const { data: mailRes, error: mailErr } = await supabase.functions.invoke('sonar-send-email', {
        body: {
          to: cleanEmail,
          subject: 'Ihre Zugangsdaten für das SMART SONAR COCKPIT',
          text: mailText,
          html: mailHtml,
          isOwnerAccount: false,
          isFullAccessAccount: true,
          userLoginEmail: op.contactEmail,
          unsereFirma: op.supportMailSignOffCompany,
          mandantProfil: {
            firmenname: op.supportMailSignOffCompany,
            email: op.contactEmail
          },
          skipPdfAttachment: true,
          skipOwnerCc: true
        }
      });

      if (mailErr || mailRes?.error) {
        mailWarning = mailErr?.message || mailRes?.error;
      }
    }

    return { mode: provRes?.mode || 'created', mailWarning };
  };

  // --- ADMIN AKTION 1: ANFRAGE FREIGEBEN ODER PASSWORT NEU SETZEN (+ ZUGANGS-MAIL) ---
  const handleApproveAndNotify = async (reqItem, sendMail = true) => {
    if (!reqItem || busyAccessId) return;

    const chosenPwd = (getPasswordForItem(reqItem.id) || '').trim();
    if (chosenPwd.length < 6) {
      showToast('Bitte gib ein Passwort mit mindestens 6 Zeichen ein (oder klicke auf „Neu“).', 'warning');
      return;
    }

    setBusyAccessId(reqItem.id);

    try {
      const { mode, mailWarning } = await provisionUserWithPassword({
        email: reqItem.email,
        password: chosenPwd,
        name: reqItem.name,
        firma: reqItem.firma,
        requestRowId: reqItem.id,
        sendMail
      });

      const actionLabel = mode === 'updated' ? 'Passwort aktualisiert' : 'Zugang angelegt';

      if (!sendMail) {
        showToast(`${actionLabel} für ${reqItem.email} (ohne E-Mail-Versand).`, 'success');
      } else if (mailWarning) {
        showToast(
          `${actionLabel} für ${reqItem.email} (Mail-Hinweis: ${mailWarning}).`,
          'warning'
        );
      } else {
        showToast(
          `${actionLabel} für ${reqItem.email} & Zugangsdaten per E-Mail versendet!`,
          'success'
        );
      }

      // Passwortfeld nach erfolgreichem Setzen für bereits bearbeitete Einträge leeren
      setPasswordMap((prev) => ({ ...prev, [reqItem.id]: '' }));
      await loadSupportData();
    } catch (err) {
      showToast('Fehler bei der Freigabe: ' + (err.message || err), 'error');
    } finally {
      setBusyAccessId(null);
    }
  };

  // --- ADMIN AKTION 1B: NEUEN MANDANTEN / PARTNER DIREKT MIT PASSWORT ANLEGEN ---
  const handleDirectProvisionSubmit = async (e) => {
    e.preventDefault();
    if (busyDirectCreate) return;

    const cleanMail = directEmail.trim().toLowerCase();
    const cleanPwd = directPassword.trim();

    if (!cleanMail || !cleanMail.includes('@')) {
      showToast('Bitte eine gültige E-Mail-Adresse eingeben.', 'warning');
      return;
    }
    if (cleanPwd.length < 6) {
      showToast('Das Passwort muss mindestens 6 Zeichen lang sein.', 'warning');
      return;
    }

    setBusyDirectCreate(true);
    try {
      const { mode, mailWarning } = await provisionUserWithPassword({
        email: cleanMail,
        password: cleanPwd,
        name: directName.trim(),
        firma: directFirma.trim(),
        requestRowId: null,
        sendMail: directSendMail
      });

      const label = mode === 'updated' ? 'Passwort aktualisiert' : 'Konto erstellt';
      if (!directSendMail) {
        showToast(`${label}: ${cleanMail} kann sich sofort über „Mandanten-Login“ anmelden!`, 'success');
      } else if (mailWarning) {
        showToast(`${label} für ${cleanMail} (E-Mail-Hinweis: ${mailWarning}).`, 'warning');
      } else {
        showToast(`${label} & Zugangsdaten per E-Mail an ${cleanMail} gesendet!`, 'success');
      }

      setDirectEmail('');
      setDirectName('');
      setDirectFirma('');
      setDirectPassword(generateSecurePassword());
      setShowDirectCreate(false);
      await loadSupportData();
    } catch (err) {
      showToast('Fehler bei der Konto-Anlage: ' + (err.message || err), 'error');
    } finally {
      setBusyDirectCreate(false);
    }
  };

  const handleRejectOrRevokeAccess = async (reqItem, isRevoke = false) => {
    if (!reqItem || busyAccessId) return;
    const confirmMsg = isRevoke
      ? `Zugang für „${reqItem.email}“ sofort sperren (inkl. Login-Sperre in Supabase Auth)?`
      : `Zugangs-Anfrage von „${reqItem.email}“ ablehnen?`;
    if (!window.confirm(confirmMsg)) return;

    setBusyAccessId(reqItem.id);
    try {
      // Bei Sperrung eines bestehenden Zugangs auch den Auth-User in Supabase sperren
      if (isRevoke) {
        const { data: banRes, error: banErr } = await supabase.functions.invoke('sonar-send-email', {
          body: {
            action: 'admin_ban_user',
            targetEmail: reqItem.email
          }
        });
        if (banErr || banRes?.error) {
          throw new Error(banErr?.message || banRes?.error || 'Auth-Sperre fehlgeschlagen.');
        }
      }

      const { error } = await supabase
        .from('demo_access_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', reqItem.id);

      if (error) throw new Error(error.message);
      showToast(
        isRevoke ? `Zugang & Login für ${reqItem.email} gesperrt.` : `Anfrage von ${reqItem.email} abgelehnt.`,
        'success'
      );
      await loadSupportData();
    } catch (err) {
      showToast('Fehler: ' + (err.message || err), 'error');
    } finally {
      setBusyAccessId(null);
    }
  };

  const handleDeleteAccessEntry = async (reqItem) => {
    if (!reqItem || busyAccessId) return;
    if (!window.confirm(`Eintrag „${reqItem.email}“ aus der Zugangsliste löschen?`)) return;
    setBusyAccessId(reqItem.id);
    try {
      await supabase.from('demo_access_requests').delete().eq('id', reqItem.id);
      await loadSupportData();
      showToast(`Eintrag ${reqItem.email} entfernt.`, 'success');
    } catch (_e) {
      // ignore
    } finally {
      setBusyAccessId(null);
    }
  };

  // --- KUNDE / TESTER: NEUES SUPPORT- ODER SALES-TICKET ANLEGEN ---
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim() || busyAction) return;

    setBusyAction(true);
    try {
      const nowIso = new Date().toISOString();
      const firstMsg = {
        id: 'msg_' + Date.now(),
        sender: 'user',
        sender_name: newName.trim() || userEmail,
        text: newMessage.trim(),
        created_at: nowIso
      };

      const { data: inserted, error } = await supabase
        .from('support_tickets')
        .insert([
          {
            user_id: userId,
            user_email: userEmail,
            user_name: newName.trim() || null,
            user_firma: newFirma.trim() || null,
            ticket_type: newTicketType,
            subject: newSubject.trim(),
            status: 'open',
            messages: [firstMsg],
            unread_by_owner: true,
            unread_by_user: false,
            created_at: nowIso,
            updated_at: nowIso
          }
        ])
        .select('*')
        .single();

      if (error) throw new Error(error.message);

      // E-Mail-Benachrichtigung an die konfigurierte Betreiber-/Vertriebsadresse
      try {
        await supabase.functions.invoke('sonar-send-email', {
          body: {
            to: op.adminNotifyEmail || op.contactEmail,
            subject: `[SONAR Support-Ticket] ${newSubject.trim()} (${userEmail})`,
            text: `Neues Ticket im SONAR Cockpit:\n\nVon: ${newName.trim() || '-'} (${userEmail})\nFirma: ${newFirma.trim() || '-'}\nKategorie: ${newTicketType === 'sales_upgrade' ? 'Vollversion / Einrichtung (Sales)' : 'Technischer Support'}\nBetreff: ${newSubject.trim()}\n\nNachricht:\n${newMessage.trim()}`,
            isOwnerAccount: false,
            isFullAccessAccount: true,
            userLoginEmail: op.contactEmail,
            unsereFirma: op.supportMailSignOffCompany,
            skipPdfAttachment: true,
            skipOwnerCc: true
          }
        });
      } catch (_mailIgnore) {
        // Kein Blocker für den User
      }

      setNewSubject('');
      setNewMessage('');
      setShowNewTicketForm(false);
      await loadSupportData();
      if (inserted?.id) setSelectedTicketId(inserted.id);

      showToast('Ihre Support-Anfrage wurde übermittelt. Wir melden uns in Kürze hier & per E-Mail!', 'success');
    } catch (err) {
      showToast('Fehler beim Senden des Tickets: ' + (err.message || err), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  // --- ANTWORT IM TICKET SENDEN (ADMIN -> USER MIT PFLICHT-EMAIL | ODER USER -> ADMIN) ---
  const handleSendReply = async (e) => {
    e.preventDefault();
    const activeTicket = tickets.find((t) => t.id === selectedTicketId);
    if (!activeTicket || !replyText.trim() || busyAction) return;

    setBusyAction(true);
    try {
      const nowIso = new Date().toISOString();
      const cleanReply = replyText.trim();
      const existingMsgs = Array.isArray(activeTicket.messages) ? activeTicket.messages : [];

      const newMsg = {
        id: 'msg_' + Date.now(),
        sender: isOwner ? 'admin' : 'user',
        sender_name: isOwner
          ? op.supportSenderName
          : activeTicket.user_name || userEmail,
        text: cleanReply,
        created_at: nowIso
      };

      const updatedMessages = [...existingMsgs, newMsg];

      const updatePayload = isOwner
        ? {
            messages: updatedMessages,
            status: 'answered',
            unread_by_owner: false,
            unread_by_user: true,
            updated_at: nowIso
          }
        : {
            messages: updatedMessages,
            status: 'open',
            unread_by_owner: true,
            unread_by_user: false,
            updated_at: nowIso
          };

      const { error: updErr } = await supabase
        .from('support_tickets')
        .update(updatePayload)
        .eq('id', activeTicket.id);

      if (updErr) throw new Error(updErr.message);

      if (isOwner && activeTicket.user_email) {
        const cockpitUrl = window.location.origin;
        const salutation = activeTicket.user_name
          ? `Guten Tag ${activeTicket.user_name},`
          : 'Guten Tag,';

        const mailText = [
          salutation,
          '',
          `zu Ihrer Anfrage „${activeTicket.subject}“ liegt eine neue Antwort in Ihrem SMART SONAR COCKPIT vor:`,
          '',
          '--------------------------------------------------',
          cleanReply,
          '--------------------------------------------------',
          '',
          `Sie können direkt im Cockpit oben rechts über den Button „Support“ antworten: ${cockpitUrl}`,
          '',
          'Mit freundlichen Grüßen',
          op.supportMailSignOffName,
          op.supportMailSignOffCompany
        ].join('\n');

        const mailHtml = `
          <div style="font-family: system-ui, -apple-system, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #0f172a; max-width: 620px;">
            <p>${escapeHtml(salutation)}</p>
            <p>zu Ihrer Anfrage <strong>„${escapeHtml(activeTicket.subject)}“</strong> liegt eine neue Nachricht vom SONAR Support vor:</p>
            <div style="padding: 14px 18px; background: #f8fafc; border-left: 4px solid #0284c7; border-radius: 6px; margin: 16px 0; white-space: pre-wrap; color: #0f172a;">${escapeHtml(cleanReply)}</div>
            <p style="margin: 22px 0;">
              <a href="${cockpitUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-weight: bold; padding: 11px 20px; border-radius: 8px;">
                Im SONAR Cockpit öffnen &amp; antworten
              </a>
            </p>
            <p style="font-size: 12px; color: #64748b;">
              Öffnen Sie nach der Anmeldung einfach oben rechts den Button <strong>„Support“</strong>.
            </p>
            <p>Mit freundlichen Grüßen<br/><strong>${escapeHtml(op.supportMailSignOffName)}</strong><br/>${escapeHtml(op.supportMailSignOffCompany)}</p>
          </div>
        `;

        const { data: mailRes, error: mailErr } = await supabase.functions.invoke('sonar-send-email', {
          body: {
            to: activeTicket.user_email,
            subject: `Neue Antwort zu Ihrer SONAR-Anfrage: ${activeTicket.subject}`,
            text: mailText,
            html: mailHtml,
            isOwnerAccount: false,
            isFullAccessAccount: true,
            userLoginEmail: op.contactEmail,
            unsereFirma: op.supportMailSignOffCompany,
            mandantProfil: {
              firmenname: op.supportMailSignOffCompany,
              email: op.contactEmail
            },
            skipPdfAttachment: true,
            skipOwnerCc: true
          }
        });

        if (mailErr || mailRes?.error) {
          showToast(
            `Antwort im Cockpit gespeichert (E-Mail-Hinweis: ${mailErr?.message || mailRes?.error}).`,
            'warning'
          );
        } else {
          showToast(
            `Antwort gespeichert & per E-Mail an ${activeTicket.user_email} gesendet!`,
            'success'
          );
        }
      } else {
        showToast('Nachricht erfolgreich gesendet.', 'success');
      }

      setReplyText('');
      await loadSupportData();
    } catch (err) {
      showToast('Fehler beim Senden der Antwort: ' + (err.message || err), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleToggleTicketStatus = async (ticket) => {
    if (!isOwner || !ticket || busyAction) return;
    const nextStatus = ticket.status === 'closed' ? 'open' : 'closed';
    setBusyAction(true);
    try {
      await supabase
        .from('support_tickets')
        .update({
          status: nextStatus,
          unread_by_owner: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.id);
      await loadSupportData();
      showToast(
        nextStatus === 'closed' ? 'Ticket als erledigt geschlossen.' : 'Ticket wieder geöffnet.',
        'success'
      );
    } catch (err) {
      showToast('Status-Fehler: ' + (err.message || err), 'error');
    } finally {
      setBusyAction(false);
    }
  };

  if (!isOpen) return null;

  const pendingAccessList = accessRequests.filter((r) => r.status === 'pending');
  const processedAccessList = accessRequests.filter((r) => r.status !== 'pending');
  const unreadTicketsOwnerCount = tickets.filter((t) => Boolean(t.unread_by_owner)).length;
  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${theme.inputBorder}`,
    background: theme.inputBg,
    color: theme.textMain,
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const getStatusBadge = (status) => {
    if (status === 'closed') {
      return { label: 'Erledigt', color: theme.textMuted, border: theme.border };
    }
    if (status === 'answered') {
      return { label: 'Beantwortet', color: '#10b981', border: '#10b981' };
    }
    return { label: 'Offen', color: '#f59e0b', border: '#f59e0b' };
  };

  const getTypeLabel = (type) => {
    if (type === 'sales_upgrade') return 'Vollversion / Einrichtung';
    if (type === 'access_request') return 'Zugangs-Freigabe';
    return 'Technischer Support';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        zIndex: 10070,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: '14px',
          maxWidth: '940px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 22px 55px rgba(0,0,0,0.75)',
          textAlign: 'left'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Icon name="mail" size={20} style={{ color: theme.accent }} />
              <strong style={{ color: theme.textMain, fontSize: '16px' }}>
                {isOwner
                  ? 'SONAR Support-, Zugangs- & Ticket-Zentrale (Admin)'
                  : 'SONAR Support & Mitteilungen'}
              </strong>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                color: theme.textMuted,
                borderRadius: '6px',
                padding: '5px 11px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              ✕
            </button>
          </div>

          {isOwner ? (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAdminTab('access')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: adminTab === 'access' ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  background: adminTab === 'access' ? theme.accent : theme.cardBg,
                  color: adminTab === 'access' ? (isDarkMode ? '#020617' : '#ffffff') : theme.textMain,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Icon name="unlock" size={15} />
                <span>Zugangs-Freischaltungen</span>
                {pendingAccessList.length > 0 && (
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '1px 7px',
                      fontSize: '11px',
                      fontWeight: 900
                    }}
                  >
                    {pendingAccessList.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('tickets')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: adminTab === 'tickets' ? `1px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  background: adminTab === 'tickets' ? theme.accent : theme.cardBg,
                  color: adminTab === 'tickets' ? (isDarkMode ? '#020617' : '#ffffff') : theme.textMain,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Icon name="in" size={15} />
                <span>Support- &amp; Kunden-Tickets ({tickets.length})</span>
                {unreadTicketsOwnerCount > 0 && (
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '1px 7px',
                      fontSize: '11px',
                      fontWeight: 900
                    }}
                  >
                    {unreadTicketsOwnerCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: theme.textMuted }}>
                Direkter Draht zur Systembetreuung – Antworten erscheinen live hier und gehen zusätzlich an <strong>{userEmail}</strong>.
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(null);
                  setShowNewTicketForm(true);
                }}
                style={{
                  background: theme.accent,
                  color: isDarkMode ? '#020617' : '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Icon name="send" size={14} />
                <span>Neue Anfrage stellen</span>
              </button>
            </div>
          )}
        </div>

        {/* MODAL BODY */}
        <div
          style={{
            padding: '20px 22px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {isOwner && adminTab === 'access' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* TOP ACTION BAR: INFO + DIREKT-ANLAGE + HISTORIE */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '13.5px', color: theme.textMuted }}>
                  {pendingAccessList.length > 0
                    ? `${pendingAccessList.length} offene Anfrage(n) warten auf Passwort-Freigabe:`
                    : 'Aktuell warten keine neuen E-Mail-Adressen auf Freischaltung.'}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowDirectCreate(!showDirectCreate)}
                    style={{
                      background: showDirectCreate ? 'transparent' : theme.accent,
                      border: `1px solid ${theme.accent}`,
                      color: showDirectCreate ? theme.accent : (isDarkMode ? '#020617' : '#ffffff'),
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {showDirectCreate ? 'Direkt-Anlage schließen' : '+ Zugang direkt mit Passwort anlegen'}
                  </button>

                  {processedAccessList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAccessHistory(!showAccessHistory)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${theme.border}`,
                        color: theme.textMain,
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {showAccessHistory
                        ? 'Bearbeitete Zugänge ausblenden'
                        : `Freigegebene / gesperrte Zugänge (${processedAccessList.length})`}
                    </button>
                  )}
                </div>
              </div>

              {/* DIREKT-ANLAGE FORMULAR (NEUER MANDANT / PARTNER / TESTER MIT FESTEM PASSWORT) */}
              {showDirectCreate && (
                <form
                  onSubmit={handleDirectProvisionSubmit}
                  style={{
                    padding: '15px 16px',
                    borderRadius: '10px',
                    background: theme.inputBg,
                    border: `1px solid ${theme.accent}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <strong style={{ fontSize: '13.5px', color: theme.accent }}>
                    Mandanten- / Partner-Zugang direkt einrichten (für Reiter „Mandanten-Login“)
                  </strong>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
                        E-Mail-Adresse*
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="mail@unternehmen.de"
                        value={directEmail}
                        onChange={(e) => setDirectEmail(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
                        Name (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="z. B. Nicolas Luca Afritsch"
                        value={directName}
                        onChange={(e) => setDirectName(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
                        Firma / Kanzlei (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="z. B. Unternehmensberatung..."
                        value={directFirma}
                        onChange={(e) => setDirectFirma(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
                        Passwort (min. 6 Zeichen)*
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          required
                          value={directPassword}
                          onChange={(e) => setDirectPassword(e.target.value)}
                          style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 'bold' }}
                        />
                        <button
                          type="button"
                          onClick={() => setDirectPassword(generateSecurePassword())}
                          style={{
                            background: theme.cardBg,
                            border: `1px solid ${theme.border}`,
                            color: theme.textMain,
                            borderRadius: '8px',
                            padding: '0 10px',
                            fontSize: '11.5px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                          title="Neues sicheres Passwort generieren"
                        >
                          Neu
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: theme.textMain, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={directSendMail}
                        onChange={(e) => setDirectSendMail(e.target.checked)}
                      />
                      <span>Zugangsdaten (E-Mail + Passwort) sofort per E-Mail zusenden</span>
                    </label>

                    <button
                      type="submit"
                      disabled={busyDirectCreate}
                      style={{
                        background: '#10b981',
                        color: '#020617',
                        border: 'none',
                        padding: '9px 16px',
                        borderRadius: '8px',
                        fontWeight: 900,
                        fontSize: '12.5px',
                        cursor: busyDirectCreate ? 'wait' : 'pointer'
                      }}
                    >
                      {busyDirectCreate
                        ? 'Richte Zugang ein...'
                        : directSendMail
                        ? 'Zugang aktivieren & E-Mail senden'
                        : 'Zugang aktivieren (ohne E-Mail)'}
                    </button>
                  </div>
                </form>
              )}

              {/* OFFENE ZUGANGS-ANFRAGEN */}
              {pendingAccessList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingAccessList.map((req) => {
                    const isBusy = busyAccessId === req.id;
                    const itemPwd = getPasswordForItem(req.id);
                    return (
                      <div
                        key={req.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          background: theme.inputBg,
                          border: `1px solid ${theme.border}`,
                          borderLeft: '4px solid #f59e0b',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 260px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.textMain }}>
                              Interessent: <span style={{ color: '#f59e0b' }}>{req.name || 'Ohne Namensangabe'}</span>
                              {req.firma ? ` (${req.firma})` : ''}
                            </div>
                            <div style={{ fontSize: '13px', color: theme.accent, fontWeight: 'bold', wordBreak: 'break-all' }}>
                              {req.email}
                            </div>
                            <div style={{ fontSize: '11.5px', color: theme.textMuted }}>
                              Angefragt am: {formatTs(req.created_at)}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: `1px solid ${theme.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 250px', maxWidth: '360px' }}>
                            <input
                              type="text"
                              placeholder="Passwort festlegen..."
                              value={itemPwd}
                              onChange={(e) => setPasswordForItem(req.id, e.target.value)}
                              style={{ ...inputStyle, padding: '8px 10px', fontFamily: 'monospace', fontWeight: 'bold' }}
                            />
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setPasswordForItem(req.id, generateSecurePassword())}
                              style={{
                                background: theme.cardBg,
                                border: `1px solid ${theme.border}`,
                                color: theme.textMain,
                                borderRadius: '8px',
                                padding: '8px 10px',
                                fontSize: '11.5px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              title="Neues Passwort würfeln"
                            >
                              Neu
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleApproveAndNotify(req, true)}
                              style={{
                                background: '#10b981',
                                color: '#020617',
                                border: 'none',
                                padding: '9px 14px',
                                borderRadius: '8px',
                                fontWeight: 900,
                                fontSize: '12.5px',
                                cursor: isBusy ? 'wait' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Icon name="check" size={15} />
                              <span>{isBusy ? 'Richte ein...' : 'Konto anlegen & Passwort senden'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleApproveAndNotify(req, false)}
                              style={{
                                background: 'transparent',
                                color: '#10b981',
                                border: '1px solid #10b981',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: isBusy ? 'wait' : 'pointer'
                              }}
                              title="Legt den Passwort-Account in Supabase an, ohne eine E-Mail zu senden"
                            >
                              Nur Passwort setzen
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRejectOrRevokeAccess(req, false)}
                              style={{
                                background: 'transparent',
                                color: theme.warningBorder,
                                border: `1px solid ${theme.warningBorder}`,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                cursor: isBusy ? 'wait' : 'pointer'
                              }}
                            >
                              Ablehnen
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* BEREITS BEARBEITETE ZUGÄNGE (INKL. DIREKTER PASSWORT-VERGABE FÜR BESTEHENDE EINTRÄGE WIE NICO!) */}
              {(showAccessHistory || pendingAccessList.length === 0) && processedAccessList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <strong style={{ fontSize: '12px', color: theme.textMuted, textTransform: 'uppercase' }}>
                    Bereits eingerichtete / bearbeitete Zugänge ({processedAccessList.length})
                  </strong>
                  {processedAccessList.map((item) => {
                    const isApproved = item.status === 'approved';
                    const isBusy = busyAccessId === item.id;
                    const itemPwd = getPasswordForItem(item.id);

                    return (
                      <div
                        key={item.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: theme.inputBg,
                          border: `1px solid ${theme.border}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          fontSize: '12.5px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
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
                              {isApproved ? 'Freigegeben' : 'Gesperrt'}
                            </span>
                            <strong style={{ color: theme.textMain }}>{item.email}</strong>
                            {(item.name || item.firma) && (
                              <span style={{ color: theme.textMuted }}>
                                ({[item.name, item.firma].filter(Boolean).join(' • ')})
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {isApproved && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRejectOrRevokeAccess(item, true)}
                                style={{
                                  background: 'transparent',
                                  border: `1px solid ${theme.warningBorder}`,
                                  color: theme.warningBorder,
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                Zugang sperren
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteAccessEntry(item)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: theme.textMuted,
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                              title="Eintrag aus Liste entfernen"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Direkt-Zeile zum Passwort setzen / neu senden für diesen Account */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: `1px solid ${theme.border}` }}>
                          <input
                            type="text"
                            placeholder="Neues Passwort für Mandanten-Login..."
                            value={itemPwd}
                            onChange={(e) => setPasswordForItem(item.id, e.target.value)}
                            style={{ ...inputStyle, flex: '1 1 200px', maxWidth: '280px', padding: '7px 10px', fontSize: '12px', fontFamily: 'monospace' }}
                          />
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setPasswordForItem(item.id, generateSecurePassword())}
                            style={{
                              background: theme.cardBg,
                              border: `1px solid ${theme.border}`,
                              color: theme.textMain,
                              borderRadius: '6px',
                              padding: '7px 10px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Neu
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApproveAndNotify(item, true)}
                            style={{
                              background: '#10b981',
                              color: '#020617',
                              border: 'none',
                              padding: '7px 12px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 900,
                              cursor: isBusy ? 'wait' : 'pointer'
                            }}
                          >
                            {isBusy ? 'Speichere...' : isApproved ? 'Passwort setzen & per Mail senden' : 'Wieder freigeben & Passwort senden'}
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleApproveAndNotify(item, false)}
                            style={{
                              background: 'transparent',
                              border: '1px solid #10b981',
                              color: '#10b981',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Nur Passwort speichern
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(!isOwner || adminTab === 'tickets') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {!isOwner && (showNewTicketForm || tickets.length === 0) && !activeTicket && (
                <form
                  onSubmit={handleCreateTicket}
                  style={{
                    background: theme.inputBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: theme.accent, fontSize: '14px' }}>
                      Neue Anfrage an das SONAR-Team senden
                    </strong>
                    {tickets.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNewTicketForm(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: theme.textMuted,
                          cursor: 'pointer',
                          fontSize: '12px',
                          textDecoration: 'underline'
                        }}
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '5px', textTransform: 'uppercase' }}>
                        Anliegen / Kategorie
                      </label>
                      <select
                        value={newTicketType}
                        onChange={(e) => setNewTicketType(e.target.value)}
                        style={inputStyle}
                      >
                        <option value="support">Technischer Support / Rückfrage zur Funktion</option>
                        <option value="sales_upgrade">Eigene Unternehmens-Vollversion / Angebot anfragen</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '5px', textTransform: 'uppercase' }}>
                        Ihr Name (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="z. B. Max Mustermann"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '5px', textTransform: 'uppercase' }}>
                        Firma / Kanzlei (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="z. B. Muster GmbH"
                        value={newFirma}
                        onChange={(e) => setNewFirma(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '5px', textTransform: 'uppercase' }}>
                      Betreff*
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Kurze Zusammenfassung Ihres Anliegens..."
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: theme.textMuted, marginBottom: '5px', textTransform: 'uppercase' }}>
                      Ihre Nachricht*
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Beschreiben Sie kurz Ihre Frage oder Ihren Einrichtungswunsch..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={busyAction}
                      style={{
                        background: theme.accent,
                        color: isDarkMode ? '#020617' : '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 18px',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        cursor: busyAction ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Icon name="send" size={15} />
                      <span>{busyAction ? 'Übermittle...' : 'Ticket jetzt absenden'}</span>
                    </button>
                  </div>
                </form>
              )}

              {activeTicket ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(null)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${theme.border}`,
                        color: theme.textMain,
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      ← Zurück zur Übersicht
                    </button>

                    {isOwner && (
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => handleToggleTicketStatus(activeTicket)}
                        style={{
                          background: 'transparent',
                          border: `1px solid ${activeTicket.status === 'closed' ? '#10b981' : theme.border}`,
                          color: activeTicket.status === 'closed' ? '#10b981' : theme.textMuted,
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {activeTicket.status === 'closed' ? 'Ticket wieder öffnen' : 'Als erledigt schließen'}
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: theme.inputBg,
                      border: `1px solid ${theme.border}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${getStatusBadge(activeTicket.status).border}`,
                          color: getStatusBadge(activeTicket.status).color
                        }}
                      >
                        {getStatusBadge(activeTicket.status).label}
                      </span>
                      <span style={{ fontSize: '11.5px', color: theme.accent, fontWeight: 'bold' }}>
                        {getTypeLabel(activeTicket.ticket_type)}
                      </span>
                    </div>
                    <strong style={{ fontSize: '15px', color: theme.textMain, display: 'block' }}>
                      {activeTicket.subject}
                    </strong>
                    <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>
                      Konto: {activeTicket.user_email}
                      {activeTicket.user_name ? ` • ${activeTicket.user_name}` : ''}
                      {activeTicket.user_firma ? ` (${activeTicket.user_firma})` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(Array.isArray(activeTicket.messages) ? activeTicket.messages : []).map((msg, idx) => {
                      const fromAdmin = msg.sender === 'admin';
                      return (
                        <div
                          key={msg.id || idx}
                          style={{
                            alignSelf: fromAdmin ? (isOwner ? 'flex-end' : 'flex-start') : (isOwner ? 'flex-start' : 'flex-end'),
                            maxWidth: '88%',
                            width: 'fit-content',
                            minWidth: '220px',
                            padding: '12px 15px',
                            borderRadius: '10px',
                            background: fromAdmin ? 'rgba(6, 182, 212, 0.12)' : theme.inputBg,
                            border: `1px solid ${fromAdmin ? '#06b6d4' : theme.border}`
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '11px', marginBottom: '5px', color: fromAdmin ? '#06b6d4' : theme.textMuted, fontWeight: 'bold' }}>
                            <span>{fromAdmin ? op.supportSenderName : (msg.sender_name || activeTicket.user_email)}</span>
                            <span>{formatTs(msg.created_at)}</span>
                          </div>
                          <div style={{ fontSize: '13.5px', color: theme.textMain, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {activeTicket.status !== 'closed' && (
                    <form
                      onSubmit={handleSendReply}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        paddingTop: '10px',
                        borderTop: `1px solid ${theme.border}`
                      }}
                    >
                      <textarea
                        required
                        rows={3}
                        placeholder={
                          isOwner
                            ? `Antwort an ${activeTicket.user_email} schreiben (wird live im Cockpit angezeigt UND automatisch per E-Mail zugestellt)...`
                            : 'Weitere Rückfrage oder Ergänzung hinzufügen...'
                        }
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="submit"
                          disabled={busyAction}
                          style={{
                            background: '#10b981',
                            color: '#020617',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 18px',
                            fontWeight: 900,
                            fontSize: '13px',
                            cursor: busyAction ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <Icon name="send" size={15} />
                          <span>
                            {busyAction
                              ? 'Sende...'
                              : isOwner
                              ? 'Antwort senden & E-Mail verschicken'
                              : 'Antwort absenden'}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                tickets.length > 0 && !showNewTicketForm && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tickets.map((tItem) => {
                      const isUnread = isOwner ? Boolean(tItem.unread_by_owner) : Boolean(tItem.unread_by_user);
                      const statusInfo = getStatusBadge(tItem.status);
                      const msgList = Array.isArray(tItem.messages) ? tItem.messages : [];
                      const lastMsg = msgList.length > 0 ? msgList[msgList.length - 1] : null;

                      return (
                        <div
                          key={tItem.id}
                          onClick={() => handleSelectTicket(tItem)}
                          style={{
                            padding: '13px 16px',
                            borderRadius: '10px',
                            background: theme.inputBg,
                            border: isUnread ? '2px solid #ef4444' : `1px solid ${theme.border}`,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 280px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {isUnread && (
                                <span
                                  style={{
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    padding: '2px 7px',
                                    borderRadius: '999px',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  Neu
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  border: `1px solid ${statusInfo.border}`,
                                  color: statusInfo.color
                                }}
                              >
                                {statusInfo.label}
                              </span>
                              <span style={{ fontSize: '11px', color: theme.accent, fontWeight: 'bold' }}>
                                {getTypeLabel(tItem.ticket_type)}
                              </span>
                              {isOwner && (
                                <span style={{ fontSize: '12px', color: theme.textMuted, fontWeight: 'bold' }}>
                                  • {tItem.user_email}
                                  {tItem.user_firma ? ` (${tItem.user_firma})` : ''}
                                </span>
                              )}
                            </div>

                            <strong style={{ fontSize: '14px', color: theme.textMain }}>
                              {tItem.subject}
                            </strong>

                            {lastMsg && (
                              <div
                                style={{
                                  fontSize: '12.5px',
                                  color: theme.textMuted,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '620px'
                                }}
                              >
                                {lastMsg.sender === 'admin' ? `${op.supportSenderName}: ` : 'Nachricht: '}
                                {lastMsg.text}
                              </div>
                            )}
                          </div>

                          <div style={{ fontSize: '11.5px', color: theme.textMuted, whiteSpace: 'nowrap' }}>
                            {formatTs(tItem.updated_at)} →
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {isOwner && tickets.length === 0 && (
                <div style={{ padding: '28px', textAlign: 'center', color: theme.textMuted, fontSize: '13.5px' }}>
                  Aktuell liegen noch keine Support- oder Kunden-Tickets vor.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}