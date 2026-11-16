import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Icon from './Icon';
import {
  BOARDROOM_TEMPLATES,
  getLeaderTitleForRechtsform
} from './config/sonarComplianceRules';
import { syncToGithub, cleanVal } from './utils';

export default function BeschlussGenerator({
  theme,
  mandanten,
  selectedMandantId,
  setSelectedMandantId,
  ladeDaten,
  showToast
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    BOARDROOM_TEMPLATES[0]?.id || 'tpl_einladung_gv'
  );
  const [draftText, setDraftText] = useState('');
  const [customLabel, setCustomLabel] = useState('Gesellschafterbeschluss');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);

  const isDarkMode = theme?.bg === '#020617';
  const pageAccent = theme?.complianceAccent || '#f59e0b';
  const btnTextColor = isDarkMode ? '#000000' : '#ffffff';

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    boxSizing: 'border-box',
    border: `1px solid ${theme.inputBorder}`,
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: theme.inputBg,
    color: theme.textMain,
    outline: 'none'
  };

  const labelStyle = {
    display: 'block',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 'bold',
    color: theme.textMuted,
    marginBottom: '6px',
    textTransform: 'uppercase'
  };

  const outlineAccentBtnStyle = {
    background: 'transparent',
    border: `1px solid ${pageAccent}`,
    color: pageAccent,
    padding: '11px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textAlign: 'center',
    boxSizing: 'border-box'
  };

  const solidAccentBtnStyle = {
    background: pageAccent,
    border: `1px solid ${pageAccent}`,
    color: btnTextColor,
    padding: '11px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    textAlign: 'center',
    boxSizing: 'border-box'
  };

  const activeMandant =
    mandanten.find((m) => String(m.id) === String(selectedMandantId)) ||
    mandanten[0] ||
    null;
  const activeTemplate =
    BOARDROOM_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
    BOARDROOM_TEMPLATES[0];

  // Ersetzt alle Platzhalter im Template automatisch mit den echten Mandanten-Stammdaten und der korrekten Organ-/Inhaber-Bezeichnung
  const buildPrefilledTemplate = (tpl, mandant) => {
    if (!tpl || !tpl.templateText) return '';
    let text = tpl.templateText;

    const todayDate = new Date();
    const todayStr = todayDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const lastYear = todayDate.getFullYear() - 1;
    const currentYear = todayDate.getFullYear();

    // Ladungstermin +10 Tage (7 Tage Ladungsfrist + 3 Tage Postlaufzeit nach § 51 Abs. 1 GmbHG)
    const meetingDate = new Date();
    meetingDate.setDate(meetingDate.getDate() + 10);
    const weekdaysDE = [
      'Sonntag',
      'Montag',
      'Dienstag',
      'Mittwoch',
      'Donnerstag',
      'Freitag',
      'Samstag'
    ];
    const meetingWeekday = weekdaysDE[meetingDate.getDay()];
    const meetingDateStr = meetingDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const nextMonthFirst = new Date(
      todayDate.getFullYear(),
      todayDate.getMonth() + 1,
      1
    );
    const nextMonthStr = nextMonthFirst.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const rechtsform = mandant?.compliance_profile?.rechtsform || 'GmbH';
    const organTitel = getLeaderTitleForRechtsform(rechtsform);
    const firma = cleanVal(mandant?.firmenname) || 'Unternehmen';
    const personName = cleanVal(mandant?.ansprechpartner) || organTitel;
    const adresse = cleanVal(mandant?.adresse) || 'Geschäftsanschrift';
    const hrbRaw = cleanVal(mandant?.handelsregister) || '';
    const steuerNr = cleanVal(mandant?.steuernummer) || '';

    let plzOrt = adresse;
    let ortName = 'Dresden';
    const plzMatch = adresse.match(/\b(\d{5})\s+([A-Za-zÄÖÜäöüß\-\s]+)/);
    if (plzMatch) {
      plzOrt = `${plzMatch[1]} ${plzMatch[2].trim()}`;
      ortName = plzMatch[2].trim();
    }

    const registerInfo = hrbRaw
      ? `Registergericht ${ortName}, ${hrbRaw}`
      : steuerNr
      ? `Steuernummer: ${steuerNr}`
      : `Rechtsform: ${rechtsform}`;

    text = text
      .replace(/<Firmenname der Gesellschaft>/g, firma)
      .replace(/<Firmenname der GmbH \/ UG \(haftungsbeschränkt\)>/g, firma)
      .replace(/<Organ_Titel>/g, organTitel)
      .replace(/<Vorname Nachname Organ>/g, personName)
      .replace(/<Vorname Nachname Geschäftsführer>/g, personName)
      .replace(/<Vorname Nachname>/g, personName)
      .replace(/<Straße Hausnummer, PLZ Ort>/g, adresse)
      .replace(/<Straße Hausnummer>, <PLZ Ort>/g, adresse)
      .replace(/<Register_Info>/g, registerInfo)
      .replace(/<HRB-Nummer>/g, hrbRaw || 'HRB [Nummer]')
      .replace(/<PLZ Ort>/g, plzOrt)
      .replace(/<Ort>/g, ortName)
      .replace(/<TT\.MM\.JJJJ>/g, tpl.id === 'tpl_einladung_gv' ? meetingDateStr : todayStr)
      .replace(/<Wochentag>/g, meetingWeekday)
      .replace(/<HH:MM>/g, '10:00')
      .replace(
        /<31\.12\.JJJJ>/g,
        tpl.id === 'tpl_einladung_gv'
          ? `31.12.${lastYear}`
          : `31.12.${currentYear}`
      )
      .replace(/<01\.01\.JJJJ>/g, `01.01.${lastYear}`)
      .replace(/<JJJJ>/g, String(lastYear))
      .replace(/<01\.MM\.JJJJ>/g, nextMonthStr)
      .replace(/<Name Gesellschafter 1>/g, personName)
      .replace(
        /<Unterschrift Gesellschafter \/ Inhaber>/g,
        `${personName} (${organTitel})`
      )
      .replace(
        /<Unterschrift sämtlicher Gesellschafter \/ Inhaber>/g,
        `${personName} (${organTitel})`
      )
      .replace(
        /<Unterschrift Gesellschafter 1 \(und ggf\. Alleingesellschafter-Geschäftsführer\)>/g,
        `${personName} (${organTitel})`
      )
      .replace(
        /<Unterschrift sämtlicher Gesellschafter>/g,
        `${personName} (${organTitel})`
      );

    if (tpl.id === 'tpl_einladung_gv') {
      text = text.replace(`Datum: ${meetingDateStr}`, `Datum: ${todayStr}`);
    }

    return text;
  };

  useEffect(() => {
    if (activeTemplate) {
      const prefilled = buildPrefilledTemplate(activeTemplate, activeMandant);
      setDraftText(prefilled);
      setRecipientEmail(cleanVal(activeMandant?.email) || '');

      const defaultLabel =
        activeTemplate.id === 'tpl_einladung_gv'
          ? 'Einladung-Gesellschafterversammlung'
          : activeTemplate.id === 'tpl_beschluss_gf_verguetung_vga_schutz'
          ? 'GF-Anstellungsvertrag'
          : 'Gesellschafterbeschluss';
      setCustomLabel(defaultLabel);

      setEmailSubject(
        `${activeTemplate.title.replace(/^\d+\.\s*/, '')} – ${
          cleanVal(activeMandant?.firmenname) || 'Unternehmen'
        }`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, selectedMandantId, mandanten.length]);

  const handlePrintOrDownloadPdf = () => {
    if (!draftText.trim()) return;
    const printWin = window.open('', '_blank', 'width=850,height=950');
    if (!printWin) {
      showToast('Bitte erlaube Popups für die PDF-Druckvorschau.', 'warning');
      return;
    }

    const escapedHtml = draftText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="utf-8" />
        <title>${activeTemplate?.title || 'Dokument'} - ${activeMandant?.firmenname || ''}</title>
        <style>
          @page { size: A4; margin: 22mm 20mm 22mm 22mm; }
          body {
            font-family: "Times New Roman", Georgia, serif;
            font-size: 11.5pt;
            line-height: 1.5;
            color: #000000;
            background: #ffffff;
            margin: 0;
            padding: 0;
          }
          .doc-body {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .no-print-bar {
            background: #0f172a;
            color: #ffffff;
            padding: 12px 20px;
            font-family: system-ui, sans-serif;
            font-size: 13px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            border-radius: 6px;
          }
          .no-print-bar button {
            background: #f59e0b;
            color: #000000;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            cursor: pointer;
          }
          @media print {
            .no-print-bar { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <span><strong>SONAR BOARDROOM DRUCKVORSCHAU</strong> – Über „Als PDF speichern“ direkt signierfertig ablegen</span>
          <button onclick="window.print()">Jetzt drucken / Als PDF speichern</button>
        </div>
        <div class="doc-body">${escapedHtml}</div>
        <script>
          setTimeout(() => { window.print(); }, 350);
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleArchiveInVault = async () => {
    if (!activeMandant || !draftText.trim()) {
      showToast('Bitte wähle zuerst einen Mandanten aus.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const timestamp = Date.now();
      const safeFirma = String(activeMandant.firmenname || 'Mandant').replace(
        /[^a-zA-Z0-9]/g,
        '_'
      );
      const safeLabel = String(customLabel || 'Gesellschafterbeschluss').trim();
      const fileName = `m_${timestamp}_Beschluss_${safeFirma}.md`;

      const mdBlob = new Blob([draftText], {
        type: 'text/markdown;charset=utf-8'
      });
      const { error: upErr } = await supabase.storage
        .from('dokumente')
        .upload(fileName, mdBlob, {
          contentType: 'text/markdown;charset=utf-8',
          upsert: true
        });

      if (upErr) throw new Error(upErr.message);

      const { data: pubData } = supabase.storage
        .from('dokumente')
        .getPublicUrl(fileName);
      const publicUrl = pubData?.publicUrl;

      if (publicUrl) {
        const labeledUrl = `${publicUrl}#label=${encodeURIComponent(safeLabel)}`;
        const currentUrls = activeMandant.dokument_url
          ? String(activeMandant.dokument_url).trim()
          : '';
        const updatedUrls = currentUrls
          ? `${currentUrls},${labeledUrl}`
          : labeledUrl;

        const { error: dbErr } = await supabase
          .from('mandanten')
          .update({ dokument_url: updatedUrls })
          .eq('id', activeMandant.id);

        if (dbErr) throw new Error(dbErr.message);

        await supabase.from('wissensdatenbank').insert([
          {
            datei_name: `${safeLabel}_${safeFirma}_${
              new Date().toISOString().split('T')[0]
            }.md`,
            firma: activeMandant.firmenname || 'Allgemein',
            inhalt_text: draftText.substring(0, 3500),
            dokument_url: publicUrl
          }
        ]);

        await syncToGithub(
          `${safeLabel}_${safeFirma}.md`,
          draftText,
          publicUrl,
          'boardroom_beschluss',
          showToast
        );

        await ladeDaten();
        showToast(
          `Dokument mit #label=${safeLabel} erfolgreich im Firmen-Tresor (${activeMandant.firmenname}) archiviert.`,
          'success'
        );
      }
    } catch (err) {
      console.error('Fehler beim Archivieren des Beschlusses:', err);
      showToast('Fehler beim Archivieren: ' + (err.message || err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendViaEmail = async () => {
    if (!recipientEmail.trim() || !draftText.trim()) {
      showToast('Bitte gib eine Empfänger-E-Mail-Adresse ein.', 'warning');
      return;
    }

    setIsSendingMail(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'sonar-send-email',
        {
          body: {
            to: recipientEmail.trim(),
            subject:
              emailSubject.trim() ||
              'Einladung zur Gesellschafterversammlung / Beschlussvorlage',
            text: draftText,
            sender_name: activeMandant?.firmenname || 'Unternehmensleitung'
          }
        }
      );

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      showToast(
        `Vorlage erfolgreich per E-Mail an ${recipientEmail.trim()} versendet.`,
        'success'
      );
    } catch (err) {
      console.error('E-Mail-Versandfehler:', err);
      showToast('Fehler beim E-Mail-Versand: ' + (err.message || err), 'error');
    } finally {
      setIsSendingMail(false);
    }
  };

  const activeRechtsform = activeMandant?.compliance_profile?.rechtsform || 'GmbH';
  const activeOrganTitle = getLeaderTitleForRechtsform(activeRechtsform);

  return (
    <div
      style={{
        background: theme.cardBg,
        borderRadius: '12px',
        border: `1px solid ${theme.border}`,
        padding: '20px',
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
          gap: '10px',
          marginBottom: '16px'
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: theme.textMain,
              fontSize: '17px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Icon name="book" size={18} style={{ color: pageAccent }} />
            4. 1-Klick-Boardroom, Einladungs- & Beschluss-Generator
          </h3>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: theme.textMuted
            }}
          >
            Automatisch angepasst auf Rechtsform „{activeRechtsform}“ (Rolle: {activeOrganTitle})
          </p>
        </div>
      </div>

      {/* AUSWAHL MANDANT, VORLAGE & TRESOR-LABEL */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '16px',
          marginBottom: '16px'
        }}
      >
        <div>
          <label style={labelStyle}>1. Unternehmen / Mandant auswählen</label>
          <select
            value={activeMandant?.id || ''}
            onChange={(e) => setSelectedMandantId(e.target.value)}
            style={inputStyle}
          >
            {mandanten.length === 0 && (
              <option value="">-- Bitte zuerst Mandant im Tresor anlegen --</option>
            )}
            {mandanten.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firmenname} ({m.compliance_profile?.rechtsform || 'GmbH'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>
            2. Geprüfte Beschluss- oder Einladungs-Vorlage wählen
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            style={inputStyle}
          >
            {BOARDROOM_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>
            3. Tresor-Label für Soll/Ist-Abgleich (#label=...)
          </label>
          <select
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            style={inputStyle}
          >
            <option value="Gesellschafterbeschluss">
              #label=Gesellschafterbeschluss (Löschgeschützt im Tresor)
            </option>
            <option value="GF-Anstellungsvertrag">
              #label=GF-Anstellungsvertrag (Erfüllt vGA-Pflichtdokument)
            </option>
            <option value="Gesellschaftsvertrag">
              #label=Gesellschaftsvertrag
            </option>
            <option value="Einladung-Gesellschafterversammlung">
              #label=Einladung-Gesellschafterversammlung
            </option>
          </select>
        </div>
      </div>

      {/* JURISTISCHE KURZ-INFO ZUR GEWÄHLTEN VORLAGE */}
      {activeTemplate && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            background: theme.inputBg,
            border: `1px solid ${theme.border}`,
            borderLeft: `4px solid ${pageAccent}`,
            marginBottom: '16px',
            fontSize: '12px',
            lineHeight: '1.45'
          }}
        >
          <div style={{ fontWeight: 'bold', color: pageAccent }}>
            {activeTemplate.category} | Rechtsgrundlage: {activeTemplate.legalBasis}
          </div>
          <div style={{ color: theme.textMain, marginTop: '4px' }}>
            {activeTemplate.description}
          </div>
        </div>
      )}

      {/* EDITOR-TEXTFELD */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>
          Ausgefüllter Text (Platzhalter in &lt;...&gt; bitte vor dem Speichern mit den konkreten Zahlen ergänzen):
        </label>
        <textarea
          rows={18}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          style={{
            ...inputStyle,
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '12.5px',
            lineHeight: '1.55',
            resize: 'vertical'
          }}
        />
      </div>

      {/* OPTIONALER E-MAIL-VERSAND */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '8px',
          background: theme.inputBg,
          border: `1px solid ${theme.border}`,
          marginBottom: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: '12px',
          alignItems: 'end'
        }}
      >
        <div>
          <label style={labelStyle}>Empfänger E-Mail (Optionaler Vorab-Versand)</label>
          <input
            type="email"
            placeholder="name@firma.de"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>E-Mail-Betreff</label>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <button
            type="button"
            disabled={isSendingMail || !recipientEmail.trim()}
            onClick={handleSendViaEmail}
            style={{
              ...outlineAccentBtnStyle,
              width: '100%',
              padding: '10px 14px',
              cursor: isSendingMail || !recipientEmail.trim() ? 'not-allowed' : 'pointer',
              opacity: isSendingMail || !recipientEmail.trim() ? 0.6 : 1
            }}
          >
            <Icon name="send" size={14} />
            <span>
              {isSendingMail ? 'Sende E-Mail...' : 'Vorab per E-Mail senden'}
            </span>
          </button>
        </div>
      </div>

      {/* HAUPT-AKTIONSBUTTONS IM EINHEITLICHEN COMPLIANCE-DESIGN */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          onClick={handlePrintOrDownloadPdf}
          style={{
            ...outlineAccentBtnStyle,
            flex: '1 1 240px',
            padding: '13px 18px',
            fontSize: '14px'
          }}
        >
          <Icon name="file" size={16} />
          <span>Unterschriftsreifes PDF öffnen / drucken</span>
        </button>

        <button
          type="button"
          disabled={isSaving || !activeMandant}
          onClick={handleArchiveInVault}
          style={{
            ...solidAccentBtnStyle,
            flex: '1 1 260px',
            padding: '13px 18px',
            fontSize: '14px',
            cursor: isSaving || !activeMandant ? 'not-allowed' : 'pointer',
            opacity: isSaving || !activeMandant ? 0.6 : 1
          }}
        >
          <Icon name="check" size={16} />
          <span>
            {isSaving
              ? 'Archiviere im Tresor...'
              : `Direkt mit #label=${customLabel} im Firmen-Tresor sichern`}
          </span>
        </button>
      </div>
    </div>
  );
}