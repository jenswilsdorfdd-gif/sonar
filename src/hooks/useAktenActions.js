// src/hooks/useAktenActions.js
// KAPSELT SPEICHERN (TWIN-STORAGE + AUTO-FALLAKTE), RESEND-VERSAND (E-MAIL/FAX), ADMIN-SCHLOSS-LOGIK, DUPLIKAT-SCHUTZ, MERGE & NACHTRAGS-UPLOADS
// Saubere Isolierung zwischen primärem Owner (Jens) und Partner-Vollzugang (Nico).

import { supabase } from '../supabaseClient';
import { syncToGithub } from '../utils';
import {
  formatDatum,
  sanitizeOwnContactName,
  formatRufnummer,
  fuzzyMatch,
  cleanZeichenString,
  parseAktenNummer,
  extractTextFromPDF,
  fileToBase64
} from '../utils/aktenHelpers';
import {
  buildFallakteMarkdown,
  getFallakteStorageFilename
} from '../utils/fallakteBuilder';

export function useAktenActions({
  session,
  OWNER_USER_ID,
  isOwnerAccount, // true NUR für Jens Wilsdorf (für private Signatur, Kürzel & GitHub-Backup)
  hasFullAccess,  // true für Jens UND Partner-Vollzugang Nico
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
}) {
  const effectiveFullAccess = Boolean(hasFullAccess || isOwnerAccount);

  // Passwortprüfung über die aktive Supabase-Session für Vollzugangs-Accounts (jeder prüft sein eigenes Passwort für seine eigenen Akten)
  const checkAdminAuth = async (
    promptText = 'Sicherheit: Bitte Ihr Login-Passwort eingeben, um die Akten-Sperre aufzuheben.'
  ) => {
    const userEmail = String(session?.user?.email || '').trim();
    const currentUid = String(session?.user?.id || '').trim();
    if (!effectiveFullAccess || !userEmail || !currentUid) {
      showToast('Nur Vollzugangs-Administratoren können versiegelte Akten oder Sperren öffnen.', 'error');
      return false;
    }

    const pw = window.prompt(promptText);
    if (pw === null) return false;
    if (!pw.trim()) {
      showToast('Bitte ein Passwort eingeben.', 'error');
      return false;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: pw.trim()
    });

    if (error || !data?.user || data.user.id !== currentUid) {
      showToast('Passwort inkorrekt! Aktion blockiert.', 'error');
      return false;
    }

    return true;
  };

  // --- AUTOMATISCHER & MANUELLER FALLAKTEN-GENERATOR (STORAGE + WISSENSDATENBANK + OPTIONAL GITHUB FÜR OWNER) ---
  const syncFallakteById = async (targetAkteId) => {
    if (!targetAkteId || !session?.user?.id) return null;
    try {
      const { data: freshAkte, error: fetchErr } = await supabase
        .from('akten')
        .select('*, akten_historie (*)')
        .eq('id', targetAkteId)
        .single();

      if (fetchErr || !freshAkte || freshAkte.is_demo_showcase) return null;

      const baseFallakteName = getFallakteStorageFilename(freshAkte);
      // Für Nicht-Primary-Owner wird ein kurzer User-Präfix im Storage-Key genutzt, damit im Bucket niemals Namenskollisionen bei "0001-..." entstehen
      const storageObjectKey = isOwnerAccount
        ? baseFallakteName
        : `u_${String(session.user.id).slice(0, 8)}_${baseFallakteName}`;

      const mdContent = buildFallakteMarkdown(freshAkte, freshAkte.akten_historie || [], {
        includeFullTexts: true
      });

      const mdBlob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
      const { error: upErr } = await supabase.storage
        .from('dokumente')
        .upload(storageObjectKey, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });

      let pubUrl = null;
      if (!upErr) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(storageObjectKey);
        pubUrl = linkData?.publicUrl || null;
      }

      const firmaLabel = freshAkte.unsere_firma || 'Allgemein';
      const previewDbText = mdContent.substring(0, 7500);

      const { data: existingRows } = await supabase
        .from('wissensdatenbank')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('datei_name', baseFallakteName)
        .limit(1);

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        await supabase
          .from('wissensdatenbank')
          .update({
            firma: firmaLabel,
            kategorie: 'Fallakte',
            inhalt_text: previewDbText,
            dokument_url: pubUrl
          })
          .eq('id', existingRows[0].id);
      } else {
        await supabase.from('wissensdatenbank').insert([
          {
            user_id: session.user.id,
            datei_name: baseFallakteName,
            firma: firmaLabel,
            kategorie: 'Fallakte',
            inhalt_text: previewDbText,
            dokument_url: pubUrl
          }
        ]);
      }

      if (isOwnerAccount) {
        await syncToGithub(baseFallakteName, mdContent, pubUrl, 'fallakte_sync', showToast);
      }
      return pubUrl;
    } catch (err) {
      console.warn('Hintergrund-Sync der Fallakte Hinweis:', err);
      return null;
    }
  };

  const syncFallakteDocument = async (akteOrId) => {
    const id = typeof akteOrId === 'string' ? akteOrId : akteOrId?.id;
    if (!id) return null;
    return await syncFallakteById(id);
  };

  // --- NAVIGATION & MASKEN-LADEN ---
  const handleAkteAuswahl = (e) => {
    const val = e.target.value;
    setSelectedAkteId(val);
    setBezugId('');
    if (val) {
      const a = akten.find((x) => x.id === val);
      if (a) {
        setUnserZeichen(a.unser_zeichen || '');
        setGegnerName(a.gegner_name || '');
        setGegnerAnsprechpartner(a.gegner_ansprechpartner || '');
        setFaxZhd(a.gegner_ansprechpartner || '');
        setGegnerTelefon(formatRufnummer(a.gegner_telefon || ''));
        setGegnerEmail(a.gegner_email || '');
        setUnsereFirma(a.unsere_firma || '');
        setUnserAnsprechpartner(
          sanitizeOwnContactName(a.unser_ansprechpartner, a.gegner_ansprechpartner, a.gegner_name)
        );
        setUnserTelefon(formatRufnummer(a.unser_telefon || ''));
        setUnserEmail(a.unser_email || '');
        setThema(a.thema || '');
        setAktenzeichen(a.aktenzeichen || '');

        if (a.gegner_name) {
          const crmGegner = gegnerListe.find((g) => fuzzyMatch(g.name, a.gegner_name));
          if (crmGegner) {
            setGegnerFax(formatRufnummer(crmGegner.fax || ''));
            if (!a.gegner_email) setGegnerEmail(crmGegner.email || crmGegner.email_zentrale || '');
          } else {
            setGegnerFax('');
          }
        }
      }
    }
  };

  const springeZuAkteAusgang = (akteId, histId) => {
    setShowVersandHistorie(false);

    const zielAkte = akten.find((a) => a.id === akteId);
    if (zielAkte && zielAkte.status === 'Erledigt' && !zeigeErledigte) {
      setZeigeErledigte(true);
    }

    if (!aufgeklappteAkten.includes(akteId)) {
      setAufgeklappteAkten((prev) => [...prev, akteId]);
    }

    setFokussierteAkteId(akteId);
    setFokussierterHistId(histId);

    setTimeout(() => {
      const histElement = document.getElementById(`hist-zeile-${histId}`);
      if (histElement) {
        histElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const aktenElement = document.getElementById(`akte-karte-${akteId}`);
        if (aktenElement) {
          aktenElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 250);

    setTimeout(() => {
      setFokussierterHistId(null);
    }, 3500);
  };

  const ladeVorgangInMaske = (akte, hist) => {
    setSelectedAkteId(akte.id);
    setModus('bestehend');
    setBezugId(hist.id);

    setUnserZeichen(akte.unser_zeichen || '');
    setGegnerName(akte.gegner_name || '');
    setGegnerAnsprechpartner(akte.gegner_ansprechpartner || '');
    setFaxZhd(akte.gegner_ansprechpartner || '');
    setGegnerTelefon(formatRufnummer(akte.gegner_telefon || ''));
    setGegnerEmail(akte.gegner_email || '');
    setUnsereFirma(akte.unsere_firma || '');
    setUnserAnsprechpartner(
      sanitizeOwnContactName(akte.unser_ansprechpartner, akte.gegner_ansprechpartner, akte.gegner_name)
    );
    setUnserTelefon(formatRufnummer(akte.unser_telefon || ''));
    setUnserEmail(akte.unser_email || '');
    setThema(akte.thema || '');
    setAktenzeichen(akte.aktenzeichen || '');

    if (akte.gegner_name) {
      const crmGegner = gegnerListe.find((g) => fuzzyMatch(g.name, akte.gegner_name));
      if (crmGegner) {
        setGegnerFax(formatRufnummer(crmGegner.fax || ''));
        if (!akte.gegner_email) setGegnerEmail(crmGegner.email || crmGegner.email_zentrale || '');
      } else {
        setGegnerFax('');
      }
    }

    setTyp(hist.typ || 'Intern');
    setDatum(hist.datum ? new Date(hist.datum).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setAktion(hist.aktion || '');
    setKanal(hist.kanal || '');
    setFristExtern(hist.frist_extern || '');
    setWiedervorlage(hist.wiedervorlage || '');
    setBriefEntwurf(hist.brief_entwurf || '');
    setDateien([]);
    setEmailAnhaenge([]);

    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Vorgang "${hist.aktion || hist.typ}" in Maske geladen! Bezug gesetzt.`, 'success');
  };

  const handleNachhaken = (akteId) => {
    const akte = akten.find((a) => a.id === akteId);
    if (!akte) return;

    const safeOwnAp = sanitizeOwnContactName(akte.unser_ansprechpartner, akte.gegner_ansprechpartner, akte.gegner_name);

    setSelectedAkteId(akteId);
    setModus('bestehend');
    setBezugId('');
    setUnserZeichen(akte.unser_zeichen || '');
    setGegnerName(akte.gegner_name || '');
    setGegnerAnsprechpartner(akte.gegner_ansprechpartner || '');
    setFaxZhd(akte.gegner_ansprechpartner || '');
    setGegnerTelefon(formatRufnummer(akte.gegner_telefon || ''));
    setGegnerEmail(akte.gegner_email || '');
    setUnsereFirma(akte.unsere_firma || '');
    setUnserAnsprechpartner(safeOwnAp);
    setUnserTelefon(formatRufnummer(akte.unser_telefon || ''));
    setUnserEmail(akte.unser_email || '');
    setThema(akte.thema || '');
    setAktenzeichen(akte.aktenzeichen || '');
    setTyp('Ausgang');

    if (akte.gegner_name) {
      const crmGegner = gegnerListe.find((g) => fuzzyMatch(g.name, akte.gegner_name));
      if (crmGegner) {
        setGegnerFax(formatRufnummer(crmGegner.fax || ''));
        if (!akte.gegner_email) setGegnerEmail(crmGegner.email || crmGegner.email_zentrale || '');
      } else {
        setGegnerFax('');
      }
    }

    const defaultSenderName = isOwnerAccount
      ? 'Jens Wilsdorf'
      : akte.unsere_firma || mandanten[0]?.ansprechpartner || mandanten[0]?.firmenname || 'Geschäftsführung';
    const template = `Sehr geehrte Damen und Herren,\n\nbezugnehmend auf unsere bisherige Korrespondenz in der obigen Angelegenheit bitten wir höflich um einen kurzen Sachstandsbericht, da wir bislang noch keine Rückmeldung erhalten haben.\n\nSollten Ihnen noch Unterlagen zur Bearbeitung fehlen, lassen Sie es uns bitte wissen.\n\nMit freundlichen Grüßen\n\n${safeOwnAp || defaultSenderName}`;
    setBriefEntwurf(template);

    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Akte geladen & Follow-Up Vorlage eingefügt!', 'success');
  };

  const handleTresorAuswahl = (e) => {
    const mId = e.target.value;
    if (!mId) return;
    const m = mandanten.find((x) => x.id === mId);
    if (m) {
      setUnsereFirma(m.firmenname || '');
      setUnserAnsprechpartner(m.ansprechpartner || '');
      setUnserTelefon(formatRufnummer(m.telefon || ''));
      setUnserEmail(m.email || '');
    }
  };

  const handleGegnerAuswahl = (e) => {
    const val = e.target.value;
    if (!val) return;
    const [gId, ansIdx] = val.split('|');
    const g = gegnerListe.find((x) => x.id === gId);
    if (g) {
      setGegnerName(g.name || '');
      setGegnerFax(formatRufnummer(g.fax || ''));
      let ansprechpartnerObj = null;
      let ansList = [];
      try {
        const parsed = typeof g.notizen === 'string' ? JSON.parse(g.notizen) : g.notizen;
        if (Array.isArray(parsed)) ansList = parsed;
      } catch (_e) {}
      if (ansList.length > 0 && ansList[ansIdx]) ansprechpartnerObj = ansList[ansIdx];

      if (ansprechpartnerObj) {
        setGegnerAnsprechpartner(ansprechpartnerObj.name || g.ansprechpartner || '');
        setFaxZhd(ansprechpartnerObj.name || g.ansprechpartner || '');
        setGegnerTelefon(formatRufnummer(ansprechpartnerObj.telefon || g.telefon || ''));
        setGegnerEmail(ansprechpartnerObj.email || g.email || g.email_zentrale || '');
      } else {
        setGegnerAnsprechpartner(g.ansprechpartner || '');
        setFaxZhd(g.ansprechpartner || '');
        setGegnerTelefon(formatRufnummer(g.telefon || ''));
        setGegnerEmail(g.email || g.email_zentrale || '');
      }
    }
  };

  const handleAlarmKlick = (akteId) => {
    setFokussierteAkteId(akteId);
    if (!aufgeklappteAkten.includes(akteId)) {
      setAufgeklappteAkten((prev) => [...prev, akteId]);
    }
    setTimeout(() => {
      const el = document.getElementById(`akte-karte-${akteId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const toggleAkte = (id) => {
    if (aufgeklappteAkten.includes(id)) setAufgeklappteAkten(aufgeklappteAkten.filter((aId) => aId !== id));
    else setAufgeklappteAkten([...aufgeklappteAkten, id]);
  };

  // --- INLINE-EDITS, FRISTEN, SCHLOSS-LOGIK & DUPLIKAT-SCHUTZ ---
  const handleInlineEdit = async (histId, feld, wert) => {
    if (feld === 'is_locked' && wert === false) {
      const ok = await checkAdminAuth('Sicherheit: Vorgang entsperren? Bitte Ihr Passwort eingeben.');
      if (!ok) return;
    }

    const dbWert = typeof wert === 'boolean' ? wert : wert !== '' ? wert : null;
    const updates = { [feld]: dbWert };

    if (feld === 'frist_extern' && wert) updates.wiedervorlage = null;
    if (feld === 'wiedervorlage' && wert) updates.frist_extern = null;

    const { data: updatedRows, error } = await supabase
      .from('akten_historie')
      .update(updates)
      .eq('id', histId)
      .select('akte_id');

    if (!error) {
      const parentAkteId = updatedRows?.[0]?.akte_id || null;
      if (parentAkteId) {
        syncFallakteById(parentAkteId);
      }
      ladeDaten();
    } else {
      showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
  };

  const handleTerminVerschieben = async (item, tagePlus) => {
    const basisDatumStr = item.aktivesDatum || item.wiedervorlage || item.frist_extern;
    const basis = basisDatumStr ? new Date(basisDatumStr) : new Date();
    const neuDate = new Date(basis);
    neuDate.setDate(neuDate.getDate() + tagePlus);
    const neuIso = neuDate.toISOString().split('T')[0];

    if (!item.isWiedervorlage && (item.frist_extern || !item.wiedervorlage)) {
      const fristDatum = item.frist_extern
        ? new Date(item.frist_extern).toLocaleDateString('de-DE')
        : formatDatum(item.aktivesDatum);
      const text =
        `ACHTUNG: Es handelt sich um eine behördliche Frist (Fälligkeit: ${fristDatum})!\n\n` +
        `Lass diese Frist keinesfalls kommentarlos verstreichen. Nutze die Möglichkeit im War-Room, ` +
        `die Behörde fristwahrend um eine Fristverlängerung zu bitten oder die Aussetzung der Vollziehung zu beantragen.\n\n` +
        `Möchtest du die Frist dennoch eigenverantwortlich um +${tagePlus} Tage (auf den ${formatDatum(neuIso)}) verschieben?`;

      if (!window.confirm(text)) return;
      await handleInlineEdit(item.id, 'frist_extern', neuIso);
      showToast(
        `Behördliche Frist um +${tagePlus} Tage verschoben (${formatDatum(neuIso)})! Bitte rechtzeitig Schreiben senden.`,
        'warning'
      );
    } else {
      const wvDatum = item.wiedervorlage
        ? new Date(item.wiedervorlage).toLocaleDateString('de-DE')
        : formatDatum(item.aktivesDatum);
      const text = `Interne Wiedervorlage (Fällig: ${wvDatum}) um +${tagePlus} Tage auf den ${formatDatum(neuIso)} verschieben?`;
      if (!window.confirm(text)) return;
      await handleInlineEdit(item.id, 'wiedervorlage', neuIso);
      showToast(`Wiedervorlage um +${tagePlus} Tage verschoben (${formatDatum(neuIso)}).`, 'success');
    }

    setOpenMenuId(null);
  };

  const reopenErledigteAkte = async (akteId) => {
    const bestaetigung = window.confirm(
      "Diese Akte ist als 'Erledigt' archiviert & versiegelt. Wollen Sie die Akte wirklich wieder öffnen und alle Vorgänge entsperren?"
    );
    if (!bestaetigung) return;

    const ok = await checkAdminAuth('Sicherheit: Bitte Ihr Passwort eingeben, um die Akte wieder zu öffnen.');
    if (!ok) return;

    const { error } = await supabase.from('akten').update({ status: 'Offen', is_locked: false }).eq('id', akteId);
    if (!error) {
      await supabase.from('akten_historie').update({ is_locked: false }).eq('akte_id', akteId);
      await supabase.from('akten_historie').insert([
        {
          akte_id: akteId,
          user_id: session.user.id,
          typ: 'Intern',
          datum: new Date().toISOString().split('T')[0],
          aktion: 'Akte wiedereröffnet & entsperrt.'
        }
      ]);
      await syncFallakteById(akteId);
      ladeDaten();
      showToast('Akte wurde wieder geöffnet und alle Vorgänge entsperrt.', 'success');
    } else {
      showToast('Fehler beim Wiederöffnen der Akte: ' + error.message, 'error');
    }
  };

  const toggleAkteStatus = async (akteId, currentStatus) => {
    const neuerStatus = currentStatus === 'Erledigt' ? 'Offen' : 'Erledigt';

    if (neuerStatus === 'Offen') {
      await reopenErledigteAkte(akteId);
    } else {
      const bestaetigung = window.confirm(
        "Akte auf 'Erledigt' setzen? Die Akte und alle Vorgänge werden dadurch versiegelt. Einsicht und Downloads bleiben weiterhin möglich, aber eine Wiedereröffnung zur Bearbeitung erfordert Ihre Passwort-Bestätigung. Fortfahren?"
      );
      if (!bestaetigung) return;

      const { error } = await supabase
        .from('akten')
        .update({ status: neuerStatus, is_locked: true })
        .eq('id', akteId);
      if (!error) {
        await supabase.from('akten_historie').update({ is_locked: true }).eq('akte_id', akteId);

        const d = new Date();
        d.setFullYear(d.getFullYear() + 10);
        const wvDatum = d.toISOString().split('T')[0];
        await supabase.from('akten_historie').insert([
          {
            akte_id: akteId,
            user_id: session.user.id,
            typ: 'Intern',
            datum: new Date().toISOString().split('T')[0],
            aktion: 'Akte geschlossen. Automatische Wiedervorlage zur Löschung (Ablauf Aufbewahrungsfrist).',
            wiedervorlage: wvDatum,
            is_locked: true
          }
        ]);
        await syncFallakteById(akteId);
        ladeDaten();
        showToast('Akte und alle Vorgänge versiegelt und geschlossen.', 'success');
      } else {
        showToast('Fehler beim Ändern des Akten-Status: ' + error.message, 'error');
      }
    }
  };

  const handleAkteStammdatenEdit = async (akteId, feld, wert) => {
    const aktuelleAkte = akten.find((a) => a.id === akteId);

    if (feld === 'is_locked') {
      if (wert === false) {
        if (aktuelleAkte?.status === 'Erledigt') {
          await reopenErledigteAkte(akteId);
          return;
        }
        const ok = await checkAdminAuth(
          'Sicherheit: Wollen Sie die Sperre dieser Akte öffnen? Bitte Passwort eingeben.'
        );
        if (!ok) return;
      } else if (wert === true && aktuelleAkte?.status !== 'Erledigt') {
        const alsErledigtSchliessen = window.confirm(
          "Akte versiegeln und direkt auf 'Erledigt' setzen? (OK = Auf 'Erledigt' setzen & versiegeln, Abbrechen = Vorgang abbrechen)"
        );
        if (!alsErledigtSchliessen) return;
        await toggleAkteStatus(akteId, aktuelleAkte?.status || 'Offen');
        return;
      }
    }

    if (feld === 'unser_zeichen' && wert && String(wert).trim() !== '') {
      const trimmedZeichen = String(wert).trim();
      const candidateNum = parseAktenNummer(trimmedZeichen);
      const konfligierendeAkte = akten.find((a) => {
        if (a.id === akteId || a.is_demo_showcase) return false;
        if (cleanZeichenString(a.unser_zeichen) === cleanZeichenString(trimmedZeichen)) return true;
        if (candidateNum !== null && parseAktenNummer(a.unser_zeichen) === candidateNum) return true;
        return false;
      });

      if (konfligierendeAkte) {
        showToast(
          `Speichern blockiert: Die Aktennummer / das Zeichen kollidiert mit der bestehenden Akte [${konfligierendeAkte.unser_zeichen}] (${konfligierendeAkte.gegner_name || 'Unbekannt'}).`,
          'error'
        );
        ladeDaten();
        return;
      }
    }

    const dbWert = typeof wert === 'boolean' ? wert : wert !== '' ? wert : null;
    const { error } = await supabase.from('akten').update({ [feld]: dbWert }).eq('id', akteId);
    if (!error) {
      syncFallakteById(akteId);
      ladeDaten();
    } else {
      showToast('Fehler beim Speichern: ' + error.message, 'error');
    }
  };

  // --- LÖSCHEN, MERGE & NACHTRAGS-UPLOAD ---
  const loescheAkte = async (id) => {
    if (!window.confirm('Ganze Akte löschen?')) return;
    const zielAkte = akten.find((a) => a.id === id);
    await supabase.from('akten').delete().eq('id', id);

    if (zielAkte && !zielAkte.is_demo_showcase) {
      try {
        const baseName = getFallakteStorageFilename(zielAkte);
        const storageKey = isOwnerAccount ? baseName : `u_${String(session.user.id).slice(0, 8)}_${baseName}`;
        await supabase.storage.from('dokumente').remove([storageKey]);
        await supabase
          .from('wissensdatenbank')
          .delete()
          .eq('user_id', session.user.id)
          .eq('datei_name', baseName);
      } catch (_e) {}
    }

    ladeDaten();
    showToast('Akte komplett gelöscht.', 'success');
  };

  const loescheHistorieEintrag = async (histId) => {
    if (!window.confirm('Diesen gesamten Eintrag inkl. aller darin verknüpften Dateien aus der Akte löschen?')) return;
    const { data: oldRow } = await supabase.from('akten_historie').select('akte_id').eq('id', histId).single();
    await supabase.from('akten_historie').delete().eq('id', histId);
    if (oldRow?.akte_id) {
      syncFallakteById(oldRow.akte_id);
    }
    ladeDaten();
    showToast('Eintrag komplett gelöscht!', 'success');
  };

  const loescheDateiAusHistorie = async (histId, aktuelleUrls, urlZumLoeschen) => {
    if (!window.confirm('Diese Datei wirklich aus dem Akten-Eintrag entfernen?')) return;
    const urlArray = aktuelleUrls.split(',');
    const neueUrls = urlArray.filter((url) => url !== urlZumLoeschen);
    const neuerUrlString = neueUrls.length > 0 ? neueUrls.join(',') : null;

    const { data: updatedRows, error: dbError } = await supabase
      .from('akten_historie')
      .update({ dokument_url: neuerUrlString })
      .eq('id', histId)
      .select('akte_id');

    if (!dbError) {
      try {
        const parts = decodeURIComponent(urlZumLoeschen).split('/');
        const fileName = parts[parts.length - 1];
        await supabase.storage.from('dokumente').remove([fileName]);
      } catch (_e) {}
      if (updatedRows?.[0]?.akte_id) {
        syncFallakteById(updatedRows[0].akte_id);
      }
      ladeDaten();
      showToast('Datei erfolgreich entfernt!', 'success');
    } else {
      showToast('Fehler beim Entfernen der Datei: ' + dbError.message, 'error');
    }
  };

  const mergeAkte = async (sourceId) => {
    if (!mergeTargetId) {
      showToast('Bitte wähle zuerst eine Ziel-Akte aus!', 'warning');
      return;
    }
    if (sourceId === mergeTargetId) {
      showToast('Quell- und Ziel-Akte dürfen nicht identisch sein!', 'warning');
      return;
    }

    if (
      !window.confirm(
        'Möchtest du alle Inhalte (Historie & Dokumente) aus dieser Akte in die gewählte Ziel-Akte verschieben? Diese Akte bleibt danach als leere Hülle bestehen.'
      )
    ) {
      return;
    }

    const { error: moveErr } = await supabase
      .from('akten_historie')
      .update({ akte_id: mergeTargetId })
      .eq('akte_id', sourceId);
    if (moveErr) {
      showToast('Fehler beim Verschieben der Inhalte: ' + moveErr.message, 'error');
      return;
    }

    const sourceAkte = akten.find((a) => a.id === sourceId);
    await supabase.from('akten_historie').insert([
      {
        akte_id: mergeTargetId,
        user_id: session.user.id,
        typ: 'Intern',
        datum: new Date().toISOString().split('T')[0],
        aktion: `Akte zusammengeführt: Inhalte aus "${sourceAkte?.thema || 'Unbekannt'}" (${sourceAkte?.unser_zeichen || 'Kein Zeichen'}) wurden integriert.`
      }
    ]);

    await syncFallakteById(mergeTargetId);
    await syncFallakteById(sourceId);

    setMergeSourceId(null);
    setMergeTargetId('');
    ladeDaten();
    showToast('Akteninhalte erfolgreich übertragen & Fallakte aktualisiert!', 'success');
  };

  const handleNachtragUploadAkte = async (histId, currentUrls, akteFirma, akteGegner, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingHistId(histId);
    const isMd = file.name.toLowerCase().endsWith('.md');
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const sichererDateiname = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const dateiName = `h_${Date.now()}_${sichererDateiname}`;

    if (isMd) {
      const mdInhalt = await file.text();
      const baseInfo = `Nachträglich an Akte angehängt. Gegner: ${akteGegner || 'Unbekannt'}`;
      const mdBlob = new Blob([mdInhalt], { type: 'text/markdown;charset=utf-8' });
      const { error: upErr } = await supabase.storage
        .from('dokumente')
        .upload(dateiName, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });
      let mdPubUrl = null;
      if (!upErr) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        mdPubUrl = linkData?.publicUrl || null;
      }
      await supabase.from('wissensdatenbank').insert([
        {
          datei_name: file.name,
          firma: akteFirma || 'Allgemein',
          inhalt_text: `${baseInfo}\n\n${mdInhalt.substring(0, 3000)}...`,
          dokument_url: mdPubUrl
        }
      ]);
      if (isOwnerAccount) {
        await syncToGithub(file.name, mdInhalt, null, null, showToast);
      }
      ladeDaten();
      showToast('MD-Dokument im Wissensspeicher hinterlegt!', 'success');
    } else {
      const { error: uploadError } = await supabase.storage.from('dokumente').upload(dateiName, file, { upsert: true });
      if (!uploadError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
        const newUrl = linkData.publicUrl;
        const updatedUrls = currentUrls ? `${currentUrls},${newUrl}` : newUrl;
        const { data: updatedHist } = await supabase
          .from('akten_historie')
          .update({ dokument_url: updatedUrls })
          .eq('id', histId)
          .select('akte_id');

        let extrahierterText = '';
        if (isPdf) {
          try {
            extrahierterText = await extractTextFromPDF(file);
          } catch (_err) {}
        }
        const infoTxt =
          extrahierterText && extrahierterText.trim().length > 50
            ? `Nachträglich an Akte angehängt. Gegner: ${akteGegner || 'Unbekannt'}\n\n${extrahierterText.substring(0, 3000)}`
            : `Nachträglich an Akte angehängt. Gegner: ${akteGegner || 'Unbekannt'}`;

        await supabase.from('wissensdatenbank').insert([
          {
            datei_name: file.name,
            firma: akteFirma || 'Allgemein',
            inhalt_text: infoTxt,
            dokument_url: newUrl
          }
        ]);

        if (isPdf && extrahierterText && extrahierterText.trim().length > 50) {
          const twinName = dateiName.replace(/\.[^/.]+$/, '') + '.md';
          const mdDisplayName = file.name.replace(/\.[^/.]+$/, '') + '.md';
          const twinBlob = new Blob([extrahierterText], { type: 'text/markdown;charset=utf-8' });
          const { error: twinErr } = await supabase.storage
            .from('dokumente')
            .upload(twinName, twinBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });
          let twinPubUrl = newUrl;
          if (!twinErr) {
            const { data: twinLink } = supabase.storage.from('dokumente').getPublicUrl(twinName);
            if (twinLink?.publicUrl) twinPubUrl = twinLink.publicUrl;
          }
          await supabase.from('wissensdatenbank').insert([
            {
              datei_name: mdDisplayName,
              firma: akteFirma || 'Allgemein',
              inhalt_text: infoTxt,
              dokument_url: twinPubUrl
            }
          ]);
          if (isOwnerAccount) {
            await syncToGithub(mdDisplayName, extrahierterText, newUrl, 'nachtrag_upload', showToast);
          }
        } else if (isOwnerAccount) {
          await syncToGithub(file.name.replace(/\.[^/.]+$/, '') + '.md', infoTxt, newUrl, 'nachtrag_upload', showToast);
        }

        if (updatedHist?.[0]?.akte_id) {
          syncFallakteById(updatedHist[0].akte_id);
        }

        ladeDaten();
        showToast('Dokument erfolgreich angehängt & Fallakte aktualisiert!', 'success');
      } else {
        showToast('Fehler beim Upload: ' + uploadError.message, 'error');
      }
    }
    setUploadingHistId(null);
    e.target.value = '';
  };

  // --- SPEICHERN (TWIN-STORAGE + DUPLIKAT-SPERRE + AUTO-FALLAKTE) & RESEND-VERSAND ---
  const speichereEintragLogik = async (autoSaveOverrides = null) => {
    setShowUploadReminder(false);
    setLaedt(true);

    const alleUrls = [];
    const zuSpeicherndeDateien = [...dateien, ...emailAnhaenge];
    const zugewieseneFirma =
      unsereFirma || (tresorPrompt && tresorPrompt.typ === 'neu' ? tresorPrompt.obj.unsere_firma : 'Allgemein');

    if (zuSpeicherndeDateien && zuSpeicherndeDateien.length > 0) {
      for (const f of zuSpeicherndeDateien) {
        const isMd = f.name.toLowerCase().endsWith('.md');
        const isPdf = f.name.toLowerCase().endsWith('.pdf');

        if (isMd) {
          const fileInhalt = await f.text();
          const baseInfo = `Upload via Akten-Cockpit. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}`;
          const finalDbText = `${baseInfo}\n\n${fileInhalt.substring(0, 3000)}...`;
          const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const dateiName = `${Date.now()}_${sichererDateiname}`;
          const mdBlob = new Blob([fileInhalt], { type: 'text/markdown;charset=utf-8' });
          const { error: upErr } = await supabase.storage
            .from('dokumente')
            .upload(dateiName, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });

          let mdPubUrl = null;
          if (!upErr) {
            const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
            mdPubUrl = linkData?.publicUrl || null;
          }

          await supabase.from('wissensdatenbank').insert([
            {
              datei_name: f.name,
              firma: zugewieseneFirma,
              inhalt_text: finalDbText,
              dokument_url: mdPubUrl
            }
          ]);
          if (isOwnerAccount) {
            await syncToGithub(f.name, fileInhalt, null, null, showToast);
          }
        } else {
          const sichererDateiname = f.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const dateiName = `${Date.now()}_${sichererDateiname}`;
          const { error: uploadError } = await supabase.storage
            .from('dokumente')
            .upload(dateiName, f, { upsert: true });
          if (!uploadError) {
            const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(dateiName);
            const pdfPubUrl = linkData.publicUrl;
            alleUrls.push(pdfPubUrl);
            const hatMdGegenstueck = zuSpeicherndeDateien.some(
              (d) => d.name.toLowerCase() === f.name.toLowerCase().replace('.pdf', '.md')
            );
            let extrahierterText = '';
            let finalDbText = `Upload via Akten-Cockpit. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}`;

            if (isPdf && !hatMdGegenstueck) {
              showToast(`Lese digitalen Text aus PDF (${f.name}) aus...`, 'success');
              try {
                extrahierterText = await extractTextFromPDF(f);
              } catch (err) {
                console.error('Fehler bei PDF-Extraktion:', err);
              }
            }

            const textFuerWissen =
              extrahierterText && extrahierterText.trim().length > 50 ? extrahierterText : rawText || briefEntwurf || '';

            if (textFuerWissen) {
              finalDbText = `Auto-Extraktion (PDF). Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}\n\n${textFuerWissen.substring(0, 3000)}...`;
            }

            await supabase.from('wissensdatenbank').insert([
              {
                datei_name: f.name,
                firma: zugewieseneFirma,
                inhalt_text: finalDbText,
                dokument_url: pdfPubUrl
              }
            ]);

            if (isPdf && !hatMdGegenstueck && textFuerWissen.trim().length > 0) {
              const storageMdName = dateiName.replace(/\.[^/.]+$/, '') + '.md';
              const mdFileName = f.name.replace(/\.[^/.]+$/, '') + '.md';
              const mdInhalt = `${finalDbText}\n\nOriginal-PDF: ${pdfPubUrl}\n\n${textFuerWissen}`;
              const mdBlob = new Blob([mdInhalt], { type: 'text/markdown;charset=utf-8' });
              const { error: twinUpErr } = await supabase.storage
                .from('dokumente')
                .upload(storageMdName, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });

              let mdPubUrl = pdfPubUrl;
              if (!twinUpErr) {
                const { data: twinLinkData } = supabase.storage.from('dokumente').getPublicUrl(storageMdName);
                if (twinLinkData?.publicUrl) mdPubUrl = twinLinkData.publicUrl;
              }

              await supabase.from('wissensdatenbank').insert([
                {
                  datei_name: mdFileName,
                  firma: zugewieseneFirma,
                  inhalt_text: finalDbText,
                  dokument_url: mdPubUrl
                }
              ]);
              if (isOwnerAccount) {
                await syncToGithub(mdFileName, mdInhalt, pdfPubUrl, null, showToast);
              }
            }
          }
        }
      }
    }

    const activeVersandPdfUrl =
      autoSaveOverrides && autoSaveOverrides.overridePdfUrl !== undefined
        ? autoSaveOverrides.overridePdfUrl
        : versandPdfUrl;
    const activeTyp =
      autoSaveOverrides && autoSaveOverrides.overrideTyp !== undefined ? autoSaveOverrides.overrideTyp : typ;

    if (activeVersandPdfUrl) {
      alleUrls.push(activeVersandPdfUrl);
      const urlParts = decodeURIComponent(activeVersandPdfUrl).split('/');
      const rawStoragePdfName = urlParts[urlParts.length - 1].split('?')[0];
      const fallbackPrefix = activeTyp === 'Ausgang' ? 'Ausgang' : activeTyp === 'Eingang' ? 'Eingang' : 'Dokument';
      const fallbackBase = `${fallbackPrefix}_${new Date().toISOString().split('T')[0]}_${(thema || 'Schreiben')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 30)}`;

      const finalPdfDbName =
        rawStoragePdfName && rawStoragePdfName.toLowerCase().endsWith('.pdf')
          ? rawStoragePdfName
          : `${fallbackBase}.pdf`;
      const finalMdDbName = finalPdfDbName.replace(/\.[^/.]+$/, '') + '.md';

      const volltextQuelle = rawText && rawText.trim().length > 0 ? rawText : briefEntwurf || '';
      const briefTxt = `${activeTyp}-Dokument. Gegner: ${gegnerName || 'Unbekannt'} | Gegenstand: ${thema || 'Ohne Gegenstand'}\n\n${volltextQuelle}`.substring(
        0,
        3000
      );

      await supabase.from('wissensdatenbank').insert([
        {
          datei_name: finalPdfDbName,
          firma: zugewieseneFirma,
          inhalt_text: briefTxt,
          dokument_url: activeVersandPdfUrl
        }
      ]);

      const mdInhalt = `${activeTyp}-Dokument\nGegenstand: ${thema || 'Ohne Gegenstand'}\nGegner: ${gegnerName || 'Unbekannt'}\nLink: ${activeVersandPdfUrl}\n\nDokumententext:\n${volltextQuelle}`;
      if (isOwnerAccount) {
        await syncToGithub(finalMdDbName, mdInhalt, activeVersandPdfUrl, null, showToast);
      }

      let twinMdPublicUrl = activeVersandPdfUrl.replace(/\.pdf(\?.*)?$/i, '.md');
      try {
        if (rawStoragePdfName) {
          const twinFileName = rawStoragePdfName.replace(/\.[^/.]+$/, '') + '.md';
          const twinBlob = new Blob([mdInhalt], { type: 'text/markdown;charset=utf-8' });
          const { error: twinErr } = await supabase.storage
            .from('dokumente')
            .upload(twinFileName, twinBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });
          if (!twinErr) {
            const { data: mdLinkData } = supabase.storage.from('dokumente').getPublicUrl(twinFileName);
            if (mdLinkData?.publicUrl) twinMdPublicUrl = mdLinkData.publicUrl;
          }
        }
      } catch (e) {
        console.error('Twin Upload für PDF fehlgeschlagen', e);
      }

      await supabase.from('wissensdatenbank').insert([
        {
          datei_name: finalMdDbName,
          firma: zugewieseneFirma,
          inhalt_text: briefTxt,
          dokument_url: twinMdPublicUrl
        }
      ]);
    } else if (briefEntwurf && briefEntwurf.trim() !== '') {
      const prefix = activeTyp === 'Eingang' ? 'Eingang' : activeTyp === 'Ausgang' ? 'Ausgang' : 'Entwurf';
      const fileName = `${prefix}_${Date.now()}_${(thema || 'Schreiben').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.md`;

      let fileContent = `${prefix}-Dokument\nGegenstand: ${thema || 'Ohne Gegenstand'}\nGegner: ${gegnerName || 'Unbekannt'}\n\nZusammenfassung / Text:\n${briefEntwurf}`;
      if (rawText) {
        fileContent += `\n\n--- ORIGINAL VOLLTEXT (OCR) ---\n${rawText}`;
      }

      if (isOwnerAccount) {
        await syncToGithub(fileName, fileContent, null, null, showToast);
      }

      const entBlob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
      const { error: entError } = await supabase.storage
        .from('dokumente')
        .upload(fileName, entBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });
      let entPubUrl = null;
      if (!entError) {
        const { data: linkData } = supabase.storage.from('dokumente').getPublicUrl(fileName);
        entPubUrl = linkData?.publicUrl || null;
      }

      if (zuSpeicherndeDateien.length === 0) {
        await supabase.from('wissensdatenbank').insert([
          {
            datei_name: fileName,
            firma: zugewieseneFirma,
            inhalt_text: fileContent.substring(0, 3000),
            dokument_url: entPubUrl
          }
        ]);
      }
    }

    const dokumentUrl = alleUrls.length > 0 ? alleUrls.join(',') : null;
    let aktuelleAkteId = selectedAkteId;
    const cleanedOwnApForDb = sanitizeOwnContactName(unserAnsprechpartner, gegnerAnsprechpartner, gegnerName) || null;

    if (modus === 'neu') {
      let finalesUnserZeichen = unserZeichen ? String(unserZeichen).trim() : '';
      if (finalesUnserZeichen) {
        const gepruefteNummer = parseAktenNummer(finalesUnserZeichen);
        const duplikatAkte = akten.find((a) => {
          if (a.is_demo_showcase) return false;
          if (cleanZeichenString(a.unser_zeichen) === cleanZeichenString(finalesUnserZeichen)) return true;
          if (gepruefteNummer !== null && parseAktenNummer(a.unser_zeichen) === gepruefteNummer) return true;
          return false;
        });

        if (duplikatAkte) {
          let maxFreieNum = 0;
          akten.forEach((a) => {
            if (a.is_demo_showcase) return;
            const n = parseAktenNummer(a.unser_zeichen);
            if (n !== null && n > maxFreieNum) maxFreieNum = n;
          });
          const naechsteFreieStr = String(maxFreieNum + 1).padStart(4, '0');
          const vorgeschlagenesZeichen = finalesUnserZeichen.match(/^\d+-/)
            ? finalesUnserZeichen.replace(/^\d+-/, `${naechsteFreieStr}-`)
            : `${naechsteFreieStr}-${finalesUnserZeichen}`;

          const autoKorrekturOk = window.confirm(
            `ACHTUNG – Doppelte Aktennummer verhindert!\n\n` +
              `Die Nummer aus "${finalesUnserZeichen}" ist bereits bei der Akte [${duplikatAkte.unser_zeichen}] (${duplikatAkte.gegner_name || 'Unbekannt'}) vergeben.\n\n` +
              `Soll diese neue Akte stattdessen automatisch mit der nächsten freien Nummer "${vorgeschlagenesZeichen}" angelegt werden?`
          );

          if (!autoKorrekturOk) {
            setLaedt(false);
            showToast('Speichern abgebrochen – bitte ein freies Aktenzeichen wählen.', 'warning');
            return;
          }
          finalesUnserZeichen = vorgeschlagenesZeichen;
          setUnserZeichen(vorgeschlagenesZeichen);
        }
      }

      const { data: neueAkte, error: aktenError } = await supabase
        .from('akten')
        .insert([
          {
            user_id: session.user.id,
            unser_zeichen: finalesUnserZeichen || null,
            aktenzeichen: aktenzeichen || null,
            gegner_name: gegnerName || null,
            gegner_ansprechpartner: gegnerAnsprechpartner || null,
            gegner_telefon: gegnerTelefon || null,
            gegner_email: gegnerEmail || null,
            unsere_firma: unsereFirma || null,
            unser_ansprechpartner: cleanedOwnApForDb,
            unser_telefon: unserTelefon || null,
            unser_email: unserEmail || null,
            thema: thema || null,
            status: 'Offen'
          }
        ])
        .select();
      if (aktenError) {
        showToast('Fehler Akte: ' + aktenError.message, 'error');
        setLaedt(false);
        return;
      }
      aktuelleAkteId = neueAkte[0].id;
    } else if (clearOldFristen && aktuelleAkteId) {
      await supabase
        .from('akten_historie')
        .update({ frist_extern: null, wiedervorlage: null })
        .eq('akte_id', aktuelleAkteId);
    }

    const activeAktion =
      autoSaveOverrides && autoSaveOverrides.overrideAktion !== undefined ? autoSaveOverrides.overrideAktion : aktion;
    const activeKanal =
      autoSaveOverrides && autoSaveOverrides.overrideKanal !== undefined ? autoSaveOverrides.overrideKanal : kanal;
    const activeWv =
      autoSaveOverrides && autoSaveOverrides.overrideWv !== undefined ? autoSaveOverrides.overrideWv : wiedervorlage;

    const { error: histError } = await supabase.from('akten_historie').insert([
      {
        akte_id: aktuelleAkteId,
        user_id: session.user.id,
        typ: activeTyp,
        datum: datum || null,
        aktion: activeAktion || null,
        kanal: activeKanal || null,
        frist_extern: fristExtern || null,
        wiedervorlage: activeWv || null,
        dokument_url: dokumentUrl,
        brief_entwurf: briefEntwurf || null,
        bezug_id: bezugId || null
      }
    ]);

    if (!histError) {
      if (bezugId) {
        await supabase.from('akten_historie').update({ frist_extern: null, wiedervorlage: null }).eq('id', bezugId);
      }

      if (aktuelleAkteId) {
        syncFallakteById(aktuelleAkteId);
      }

      const preventWarRoom = autoSaveOverrides && autoSaveOverrides.preventWarRoom;

      if (activeTyp === 'Eingang' && !preventWarRoom) {
        setActiveWarRoomDossier({
          akte_id: aktuelleAkteId,
          unsere_firma: unsereFirma || (tresorPrompt && tresorPrompt.typ === 'neu' ? tresorPrompt.obj.unsere_firma : ''),
          unser_ansprechpartner: cleanedOwnApForDb || '',
          aktenzeichen: aktenzeichen,
          kontakt: gegnerName,
          thema: thema,
          frist_extern: fristExtern,
          brief_entwurf: briefEntwurf,
          raw_text: rawText || briefEntwurf
        });
        setIsWarRoomOpen(true);
      }

      setUnserZeichen('');
      setAktenzeichen('');
      setGegnerName('');
      setGegnerAnsprechpartner('');
      setGegnerTelefon('');
      setGegnerFax('');
      setGegnerEmail('');
      setUnsereFirma('');
      setUnserAnsprechpartner('');
      setUnserTelefon('');
      setUnserEmail('');
      setThema('');
      setAktion('');
      setKanal('');
      setFristExtern('');
      setWiedervorlage('');
      setDateien([]);
      setEmailAnhaenge([]);
      setBriefEntwurf('');
      setJsonImport('');
      setRawText('');
      setTresorPrompt(null);
      setGegnerPrompt(null);
      setFaxZhd('');
      setBezugId('');
      setClearOldFristen(true);
      setVersandPdfUrl(null);
      autoGenRef.current = '';
      if (document.getElementById('datei-upload-manuell')) document.getElementById('datei-upload-manuell').value = '';
      if (document.getElementById('email-anhaenge-upload')) document.getElementById('email-anhaenge-upload').value = '';
      ladeDaten();
      showToast('Akteneintrag & Fallakte erfolgreich gespeichert!', 'success');
    } else {
      showToast('Fehler beim Speichern der Historie: ' + histError.message, 'error');
    }
    setLaedt(false);
  };

  const proceedToSaveOrTriage = () => {
    setShowUploadReminder(false);
    if (typ === 'Eingang') {
      setShowTriageModal(true);
    } else {
      speichereEintragLogik();
    }
  };

  const handleSpeichernCheck = (e) => {
    e.preventDefault();
    if (dateien.length === 0 && emailAnhaenge.length === 0 && !versandPdfUrl) {
      setShowUploadReminder(true);
    } else {
      proceedToSaveOrTriage();
    }
  };

  const handleResendVersand = async (versandArt) => {
    if (!briefEntwurf || briefEntwurf.trim() === '') {
      showToast('Bitte gib zuerst einen Text im Schreibfenster ein!', 'warning');
      return;
    }
    if (!gegnerEmail && versandArt === 'email') {
      showToast('Bitte trage zuerst eine E-Mail-Adresse der Gegenseite / Behörde ein!', 'warning');
      return;
    }
    if (!gegnerFax && versandArt === 'fax') {
      showToast('Bitte trage zuerst eine Faxnummer der Gegenseite ein!', 'warning');
      return;
    }

    setLaedt(true);
    try {
      const formattedFax = formatRufnummer(gegnerFax);
      const rawFax = formattedFax ? formattedFax.replace(/[^0-9+]/g, '') : '';
      const targetAddress = versandArt === 'email' ? gegnerEmail : `${rawFax}@simple-fax.de`;
      const betreff = `Unser Zeichen: ${unserZeichen || 'Neu'} / AZ: ${aktenzeichen || 'Neu'} — ${thema || 'Schreiben'}`;

      const safeUnserAnsprechpartner = sanitizeOwnContactName(
        unserAnsprechpartner,
        faxZhd || gegnerAnsprechpartner,
        gegnerName
      );

      const firmaSearch = (unsereFirma || '').toLowerCase().trim();
      const matchedMandant =
        mandanten.find((m) => {
          if (fuzzyMatch(m.firmenname, unsereFirma)) return true;
          if (isOwnerAccount && m.firmenname) {
            const mLow = m.firmenname.toLowerCase();
            if (
              (firmaSearch === 'wus' || firmaSearch === 'w&s' || firmaSearch === 'wosfi') &&
              mLow.includes('wilsdorf') &&
              mLow.includes('sommer')
            ) {
              return true;
            }
            if (firmaSearch === 'sbs' && mLow.includes('smartbizz')) return true;
            if (firmaSearch === 'bam' && mLow.includes('brand')) return true;
            if (firmaSearch === 'jw' && mLow.includes('jens wilsdorf')) return true;
          }
          return false;
        }) || (mandanten.length === 1 && !unsereFirma ? mandanten[0] : null);

      const mandantProfil = matchedMandant
        ? {
            ...matchedMandant,
            email: matchedMandant.email || unserEmail || null,
            ansprechpartner:
              sanitizeOwnContactName(matchedMandant.ansprechpartner, faxZhd || gegnerAnsprechpartner, gegnerName) ||
              safeUnserAnsprechpartner ||
              null
          }
        : unserEmail || safeUnserAnsprechpartner
        ? {
            firmenname: unsereFirma || null,
            email: unserEmail || null,
            ansprechpartner: safeUnserAnsprechpartner || null
          }
        : null;

      const alleAnhangDateien = [...emailAnhaenge, ...dateien].filter(
        (f) => f && f.name && !f.name.toLowerCase().endsWith('.md')
      );

      const extraAttachments = [];
      if (alleAnhangDateien.length > 0) {
        showToast(
          versandArt === 'email' ? 'Verarbeite Dateien für E-Mail-Anhang...' : 'Verarbeite Dateien für Fax-Anhang...',
          'success'
        );
        for (const f of alleAnhangDateien) {
          try {
            const b64 = await fileToBase64(f);
            extraAttachments.push({ filename: f.name, content: b64 });
          } catch (err) {
            console.error('Fehler beim Konvertieren der Datei', f.name, err);
          }
        }
      }

      const cleanTextForPdf = String(briefEntwurf || '')
        .replace(/🔴/g, '***')
        .replace(/\*\*(.*?)\*\*/g, '$1');

      const defaultFirmaName = isOwnerAccount
        ? 'Jens Wilsdorf'
        : matchedMandant?.firmenname || safeUnserAnsprechpartner || 'Mandant';
      const userLoginEmail = session?.user?.email ? String(session.user.email).trim() : '';

      const response = await fetch('https://loyzfkxkuyypgteskxkm.supabase.co/functions/v1/sonar-send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          to: targetAddress,
          subject: betreff,
          text: cleanTextForPdf,
          isOwnerAccount: isOwnerAccount,           // true NUR für Jens (blaue Signatur & W&S/SBS-Footer)
          isFullAccessAccount: effectiveFullAccess, // true für Jens & Nico (echter Versand ohne Demo-Musterstempel)
          userLoginEmail: userLoginEmail,
          signatureUrl: SIGNATUR_URL,
          unsereFirma: unsereFirma || matchedMandant?.firmenname || defaultFirmaName,
          mandantProfil: mandantProfil,
          gegnerName: gegnerName,
          gegnerAnsprechpartner: faxZhd || gegnerAnsprechpartner,
          gegnerFax: rawFax,
          extraAttachments: extraAttachments.length > 0 ? extraAttachments : undefined
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || resData.message || JSON.stringify(resData));
      }
      if (resData.pdfUrl) {
        setVersandPdfUrl(resData.pdfUrl);
      }

      const successAktion = `${versandArt === 'email' ? 'E-Mail' : 'E-Fax (Simple-Fax)'} versendet an ${targetAddress}`;
      const successKanal = versandArt === 'email' ? 'E-Mail (Resend)' : 'E-Fax (Simple-Fax via Resend)';

      setAktion(successAktion);
      setKanal(successKanal);
      setTyp('Ausgang');
      showToast(
        `${versandArt === 'email' ? 'E-Mail' : 'E-Fax'} erfolgreich versendet! Auto-Save wird ausgeführt...`,
        'success'
      );

      await speichereEintragLogik({
        overridePdfUrl: resData.pdfUrl || null,
        overrideAktion: successAktion,
        overrideKanal: successKanal,
        overrideTyp: 'Ausgang'
      });
    } catch (e) {
      console.error('Versandfehler:', e);
      showToast('Rückmeldung von Resend: ' + e.message, 'error');
      setLaedt(false);
    }
  };

  return {
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
  };
}