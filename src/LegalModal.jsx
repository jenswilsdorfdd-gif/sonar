// src/LegalModal.jsx
// AUSGELAGERTES 3-TAB RECHTS-, DATENSCHUTZ- & LIZENZ-MODAL (MODULARE ENTSCHLACKUNG VON DASHBOARD.JSX)
// Zieht sämtliche Anbieter-, Impressums-, Gerichtsstands- & Schutzrechtsangaben dynamisch aus src/config/sonarLegalConfig.js

import React from 'react';
import Icon from './Icon';
import { getActiveLegalOperator } from './config/sonarLegalConfig';

export default function LegalModal({
  legalModalTab,
  setLegalModalTab,
  theme,
  activeColor,
  isDarkMode
}) {
  if (!legalModalTab) return null;

  const op = getActiveLegalOperator();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 10060,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={() => setLegalModalTab(null)}
    >
      <div
        style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: '14px',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.75)',
          textAlign: 'left'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER + TAB-AUSWAHL */}
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
            <strong style={{ color: theme.textMain, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="shield" size={20} style={{ color: activeColor }} />
              Rechtliche Hinweise, Datenschutz &amp; Lizenzbedingungen (SMART SONAR COCKPIT)
            </strong>
            <button
              type="button"
              onClick={() => setLegalModalTab(null)}
              style={{
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                color: theme.textMuted,
                borderRadius: '6px',
                padding: '4px 10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setLegalModalTab('impressum')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: legalModalTab === 'impressum' ? `1px solid ${activeColor}` : `1px solid ${theme.border}`,
                background: legalModalTab === 'impressum' ? activeColor : theme.cardBg,
                color: legalModalTab === 'impressum' ? (isDarkMode ? '#000' : '#fff') : theme.textMain
              }}
            >
              Impressum (§ 5 DDG)
            </button>
            <button
              type="button"
              onClick={() => setLegalModalTab('datenschutz')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: legalModalTab === 'datenschutz' ? `1px solid ${activeColor}` : `1px solid ${theme.border}`,
                background: legalModalTab === 'datenschutz' ? activeColor : theme.cardBg,
                color: legalModalTab === 'datenschutz' ? (isDarkMode ? '#000' : '#fff') : theme.textMain
              }}
            >
              Datenschutz &amp; Cloud-Architektur (DSGVO / KI-VO)
            </button>
            <button
              type="button"
              onClick={() => setLegalModalTab('haftung')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                border: legalModalTab === 'haftung' ? `1px solid ${activeColor}` : `1px solid ${theme.border}`,
                background: legalModalTab === 'haftung' ? activeColor : theme.cardBg,
                color: legalModalTab === 'haftung' ? (isDarkMode ? '#000' : '#fff') : theme.textMain
              }}
            >
              Lizenz-, Haftungs- &amp; RDG/StBerG-Bedingungen
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            color: theme.textMain,
            fontSize: '13.5px',
            lineHeight: '1.65',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {legalModalTab === 'impressum' && (
            <>
              <h3 style={{ margin: 0, color: activeColor, fontSize: '16px', textTransform: 'uppercase' }}>
                ANBIETERKENNZEICHNUNG &amp; IMPRESSUM GEMÄSS § 5 DIGITALE-DIENSTE-GESETZ (DDG)
              </h3>

              <div>
                <strong>1. Anbieter, Vertrieb &amp; Bereitstellung der Software-Applikation („SMART SONAR COCKPIT“):</strong><br />
                {op.companyName}{op.brandAddition ? ` (${op.brandAddition})` : ''}<br />
                Geschäftsanschrift: {op.addressLine}<br />
                {op.representativeLabel}: {op.representativeName}<br />
                {op.registerInfo && (
                  <>
                    {op.registerInfo}<br />
                  </>
                )}
                {op.vatId && (
                  <>
                    Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {op.vatId}<br />
                  </>
                )}
                Kontakt E-Mail: {op.contactEmail}
                {op.contactFax && (
                  <>
                    <br />Kontakt Telefax: {op.contactFax}
                  </>
                )}
              </div>

              <div>
                <strong>2. Rechtlicher Status der Software-Instanz (Mandanten-Eigenbetrieb vs. Demo-Umgebung):</strong><br />
                Diese Software-Applikation ist eine proprietäre B2B-Systemlösung zur technischen Post-, Akten- und Fristenverwaltung sowie zur KI-gestützten Textentwurfs-Automatisierung.
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '6px' }}>
                    <strong>Im produktiven Kunden-Eigenbetrieb (Dedicated Instance / BYOC):</strong> Soweit diese Instanz im Rahmen eines B2B-Systemintegrations-, Pflege- und Lizenzvertrages für ein bestimmtes Unternehmen eingerichtet wurde, ist ausschließlich das jeweilige Lizenznehmer-Unternehmen Betreiber der Datenbank- und Versand-Infrastruktur sowie Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO. {op.companyName} fungiert in diesem Verhältnis ausschließlich als lizenzgebende Vertriebs- und IT-Support-Einheit ohne eigene Rechts- oder Steuerberatungsbefugnis.
                  </li>
                  <li>
                    <strong>Im Test- und Demonstrationsbetrieb (Demo-Modus):</strong> Soweit Dritten ein zeitlich und mengenmäßig limitierter Testzugang gewährt wird, dient dieser ausschließlich der unverbindlichen technischen Demonstration der Software-Funktionalitäten im geschäftlichen Verkehr (B2B nach § 14 BGB).
                  </li>
                </ul>
              </div>

              <div>
                <strong>3. Aufsichts- und Kammerhinweis (Abgrenzung zu § 3 RDG / § 5 StBerG):</strong><br />
                {op.companyName} ist weder eine zugelassene Rechtsanwaltsgesellschaft noch eine Steuerberatungsgesellschaft. Es werden keine Rechtsdienstleistungen im Sinne des § 2 Abs. 1 des Rechtsdienstleistungsgesetzes (RDG) und keine geschäftsmäßigen Hilfeleistungen in Steuersachen im Sinne des § 5 Abs. 1 des Steuerberatungsgesetzes (StBerG) erbracht.
              </div>
            </>
          )}

          {legalModalTab === 'datenschutz' && (
            <>
              <h3 style={{ margin: 0, color: activeColor, fontSize: '16px', textTransform: 'uppercase' }}>
                DATENSCHUTZ-, CLOUD-ARCHITEKTUR- &amp; KI-TRANSPARENZHINWEISE (DSGVO &amp; EU-KI-VO)
              </h3>

              <div>
                <strong>1. Grundsatz der Datenhoheit (Bring Your Own Cloud / Bring Your Own Key – BYOK):</strong><br />
                Das System „SMART SONAR COCKPIT“ folgt im produktiven B2B-Einsatz dem Prinzip der strikten mandantenbezogenen Infrastruktur-Trennung:
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '6px' }}>
                    <strong>Verantwortlicher nach Art. 4 Nr. 7 DSGVO:</strong> Im produktiven Eigenbetrieb werden sämtliche Datenbanken (Supabase PostgreSQL &amp; Storage-Buckets), E-Mail-/Fax-Versandschnittstellen (Resend API / Simple-Fax) sowie Schnittstellen zu großen Sprachmodellen (Google Gemini API / Anthropic Claude API) über dedizierte, im eigenen Namen und auf eigene Rechnung des Lizenznehmer-Unternehmens geführte Konten betrieben. Verantwortlicher für die Verarbeitung sämtlicher dort gespeicherter Personen-, Mandanten-, Behörden- und Verfahrensdaten ist allein das jeweilige Lizenznehmer-Unternehmen. Für die Bereitstellung der vorgeschalteten Demo-Umgebung und Bearbeitung von Anfragen ist Verantwortlicher: {op.companyName}, {op.addressLine}, E-Mail: {op.contactEmail}.
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    <strong>Wartung und technischer Support:</strong> Soweit {op.companyName} (oder beauftragte technische Erfüllungsgehilfen) im Rahmen von Einrichtungs-, Wartungs- oder Entstörungsarbeiten auf Wunsch des Lizenznehmers temporären Zugriff auf Systeme oder Metadaten erhält, erfolgt dies streng weisungsgebunden auf Grundlage eines gesonderten Auftragsverarbeitungsvertrages (AVV) gemäß Art. 28 Abs. 3 DSGVO.
                  </li>
                  <li>
                    <strong>Stateless-Lizenz- &amp; Engine-Routing:</strong> Soweit die zentrale Triage-Engine zur Laufzeitvalidierung und Prompt-Orchestrierung angesprochen wird, erfolgt die Verarbeitung flüchtig im Arbeitsspeicher (In-Memory / Stateless Pass-Through) unter Einsatz des kundeneigenen LLM-API-Schlüssels ohne dauerhafte Speicherung der Akteninhalte auf Servern des Anbieters.
                  </li>
                </ul>
              </div>

              <div>
                <strong>2. Technische Verarbeitungspfade innerhalb der Applikation:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li style={{ marginBottom: '6px' }}>
                    <strong>Clientseitige OCR- &amp; Textextraktion:</strong> Die Umwandlung hochgeladener PDF-Dokumente in strukturierte Textzwillinge (<code>.md</code>) erfolgt über PDF.js primär clientseitig im Arbeitsspeicher des Endgeräts, bevor das Originaldokument und der Textzwilling verschlüsselt (TLS 1.3 / AES-256) in der zugeordneten Supabase-Instanz abgelegt werden.
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    <strong>Zugriffsschutz &amp; Row Level Security (RLS):</strong> Die Datenbankarchitektur erzwingt über kryptografische Authentifizierungs-Tokens (JWT) und PostgreSQL Row Level Security (RLS) eine strikte logische Mandanten- und Kontentrennung.
                  </li>
                  <li style={{ marginBottom: '6px' }}>
                    <strong>KI-Schnittstellen (LLM-API-Calls):</strong> Bei Aktivierung der KI-Triage (<code>sonar-ai-triage</code>) oder des strategischen War-Rooms (<code>MegaLegalModal</code>) werden die relevanten Textextrakte der Akte über verschlüsselte HTTPS-Endpunkte an die angebundenen Enterprise-KI-Schnittstellen (Google Ireland Ltd. / Google LLC bzw. Anthropic Ireland Ltd. / Anthropic PBC) übermittelt. Sofern kommerzielle Paid-API-Keys (Tier 1+ / Vertex AI / Anthropic Commercial API) des Lizenznehmers hinterlegt sind, unterliegen die API-Payloads gemäß den Enterprise-Bedingungen der Drittanbieter keinem Modell-Training durch die KI-Provider (Zero-Data-Retention / No-Training-Policy).
                  </li>
                  <li>
                    <strong>Digitaler Versand-Dispatch:</strong> Bei Auslösung des E-Mail- oder E-Fax-Versands (<code>sonar-send-email</code>) werden Empfängerdaten, Betreff und das generierte PDF-Schriftstück an den angebundenen Transaktionsdienstleister (Resend Inc. / Simple-Fax GmbH) zur unmittelbaren Übermittlung weitergeleitet.
                  </li>
                </ul>
              </div>

              <div>
                <strong>3. Besondere Bestimmungen für den Demo- und Testmodus:</strong><br />
                Nutzer eines unentgeltlichen Demo-Zugangs sind ausdrücklich angewiesen, im Testbetrieb <strong>keine ungeschwärzten Echt-Daten realer Dritter</strong>, keine besonderen Kategorien personenbezogener Daten (Art. 9 DSGVO) sowie keine dem Steuergeheimnis (§ 30 AO) oder einem Berufsgeheimnis (§ 203 StGB) unterliegenden Originaldokumente ohne vorherige Anonymisierung hochzuladen. Zur Verhinderung von Missbrauch und zur Durchsetzung des Nutzungslimits protokolliert das System in den Tabellen <code>demo_access_requests</code> und <code>demo_usage_log</code> die Benutzer-ID, die Login-E-Mail-Adresse sowie den Zeitstempel der Test-Transaktionen auf Grundlage unseres berechtigten Interesses am Schutz der Systemressourcen und Schutzrechte gemäß Art. 6 Abs. 1 Unterabs. 1 Buchst. f DSGVO.
              </div>

              <div>
                <strong>4. Transparenzhinweis nach Art. 50 der Europäischen KI-Verordnung (Verordnung (EU) 2024/1689 – AI Act):</strong><br />
                Diese Software setzt künstliche Intelligenz (Large Language Models) zur automatisierten Dokumentenanalyse, Fristenberechnung und Erstellung von Schriftsatzentwürfen ein. Sämtliche im Bereich „KI-Entwurf“, „Triage“ und „War-Room / SONAR NEMESIS“ erzeugten Analysen, Strategieoptionen und Brieftexte sind maschinell generierte Ausgaben eines KI-Systems und bedürfen vor ihrer Verwendung im Rechtsverkehr zwingend der eigenverantwortlichen menschlichen Prüfung und Freigabe durch den Nutzer (Human-in-the-Loop-Prinzip gemäß Art. 4 und Art. 14 KI-VO).
              </div>
            </>
          )}

          {legalModalTab === 'haftung' && (
            <>
              <h3 style={{ margin: 0, color: activeColor, fontSize: '16px', textTransform: 'uppercase' }}>
                NUTZUNGS-, LIZENZ-, HAFTUNGS- UND SCHUTZRECHTSBEDINGUNGEN (B2B)
              </h3>

              <div>
                <strong>§ 1 Ausschließliche Ausrichtung auf Unternehmer (B2B) &amp; Rechtsnatur der Software (Reines IT-Werkzeug)</strong><br />
                (1) Das System „SMART SONAR COCKPIT“ richtet sich ausschließlich an Unternehmer im Sinne des § 14 Abs. 1 BGB, juristische Personen des öffentlichen Rechts und öffentlich-rechtliche Sondervermögen. Eine Nutzung durch Verbraucher (§ 13 BGB) ist ausgeschlossen.<br />
                (2) Die Software stellt ein rein technisches Informations-, Dokumentenmanagement- und Textentwurfswerkzeug (Decision-Support- &amp; Drafting-System) für die unternehmensinterne Eigenverwaltung des Lizenznehmers dar.<br />
                (3) <strong>Keine Rechts- oder Steuerberatung (§ 3 RDG / § 5 StBerG):</strong> Die durch die Software-Algorithmen (<code>sonar-ai-triage</code> / <code>SONAR NEMESIS</code>) automatisiert erstellten rechtlichen oder steuerlichen Einschätzungen, Subsumtionen, Fristenberechnungen und Schriftsatzentwürfe stellen <strong>keine Rechtsdienstleistung nach § 2 Abs. 1 RDG</strong> und <strong>keine Hilfeleistung in Steuersachen nach § 5 Abs. 1 StBerG</strong> durch {op.companyName} dar. Das System ersetzt im Streit- oder Zweifelsfall nicht die Konsultation eines zugelassenen Rechtsanwalts, Patentanwalts, Steuerberaters oder Wirtschaftsprüfers.
              </div>

              <div>
                <strong>§ 2 Eigenverantwortung des Nutzers (Mandatory Human-in-the-Loop) &amp; Fristenkontrolle</strong><br />
                (1) Große Sprachmodelle (LLMs) und OCR-Texterkennungsverfahren arbeiten probabilistisch und können trotz mehrstufiger algorithmischer Qualitätskontrollen (<code>STAGE_0_FORENSIC_LOCK</code> und <code>SONAR NEMESIS</code>) im Einzelfall Sachverhalte, Zahlen, Daten, Aktenzeichen, Gesetzesnormen oder Gerichtsurteile unvollständig erfassen, fehlinterpretieren oder fehlerhaft generieren („KI-Halluzinationen“).<br />
                (2) <strong>Alleinige Prüf- und Freigabepflicht:</strong> Der Nutzer (insbesondere die Geschäftsführung bzw. die vertretungsberechtigten Organe des Lizenznehmers nach § 35 GmbHG / § 34 AO) ist zwingend verpflichtet, jeden durch das System generierten Schriftsatzentwurf, jede Fristenberechnung (insbesondere Not-, Einspruchs-, Widerspruchs- und Klagefristen nach AO, VwVfG, FGO, VwGO, SGG, ZPO) sowie jede Empfängeradresse vor dem elektronischen Versand per E-Mail oder Telefax eigenhändig auf sachliche, rechnerische und rechtliche Richtigkeit sowie Vollständigkeit zu überprüfen.<br />
                (3) Mit dem Auslösen des Versandbefehls gibt der Nutzer eine eigene, ihm unmittelbar nach §§ 164 ff. BGB zuzurechnende Willens- bzw. Wissenserklärung im eigenen Namen ab. Die Software fungiert beim Versand über Resend oder Simple-Fax lediglich als technisches Übermittlungswerkzeug (Erklärungsbote).
              </div>

              <div>
                <strong>§ 3 Haftungsbeschränkung &amp; Ausschluss von § 536a Abs. 1 Alt. 1 BGB</strong><br />
                (1) Der Anbieter ({op.companyName}) haftet unbeschränkt nur für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer Pflichtverletzung des Anbieters, seiner gesetzlichen Vertreter oder Erfüllungsgehilfen (§ 278 BGB) beruhen, sowie für sonstige Schäden, die auf Vorsatz oder grober Fahrlässigkeit (§ 276 BGB) oder dem Fehlen einer ausdrücklich übernommenen Beschaffenheitsgarantie (§ 443 BGB) oder Ansprüchen nach dem Produkthaftungsgesetz beruhen.<br />
                (2) Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrages überhaupt erst ermöglicht und auf deren Einhaltung der Vertragspartner regelmäßig vertrauen darf (<strong>Kardinalpflichten</strong>, vgl. § 307 Abs. 2 Nr. 2 BGB), ist die Haftung der Höhe nach auf den vertragstypischen, bei Vertragsschluss vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.<br />
                (3) <strong>Ausschluss der verschuldensunabhängigen Garantiehaftung:</strong> Soweit auf die dauerhafte Überlassung, Systempflege oder Lizenzierung der Software oder einzelner Backend-Komponenten mietvertragliche Vorschriften (§§ 535 ff. BGB) Anwendung finden, wird die verschuldensunabhängige Garantiehaftung für bei Vertragsschluss vorhandene (anfängliche) Mängel gemäß <strong>§ 536a Abs. 1 Alt. 1 BGB ausdrücklich ausgeschlossen</strong>.<br />
                (4) <strong>Haftungsausschluss für Dritt-APIs &amp; Versäumnis ungeprüfter KI-Entwürfe:</strong> Es besteht keine Haftung für Ausfälle, Rate-Limits oder Übermittlungsfehler externer Drittanbieter-Infrastrukturen (Supabase, Google Cloud/Gemini, Anthropic, Resend, Simple-Fax) sowie für Vermögensschäden, Rechtsverluste, Säumniszuschläge, Verspätungszuschläge oder Fristversäumnisse, die daraus resultieren, dass der Nutzer entgegen § 2 Abs. 2 einen KI-generierten Entwurf oder eine KI-Fristenberechnung ohne eigenverantwortliche sachliche und rechtliche Endkontrolle übernommen oder versendet hat (überwiegendes Mitverschulden des Nutzers gemäß § 254 Abs. 1 BGB).<br />
                (5) Im reinen <strong>unentgeltlichen Demo- und Testbetrieb</strong> ist die Haftung analog §§ 521, 599 BGB auf Vorsatz und grobe Fahrlässigkeit beschränkt.
              </div>

              <div>
                <strong>§ 4 Urheberrechtsschutz (§§ 69a ff. UrhG), Laufzeitbindung &amp; Schutz von Geschäftsgeheimnissen (GeschGehG)</strong><br />
                (1) Sämtliche Rechte an der Software „SMART SONAR COCKPIT“, insbesondere am Quellcode, dem UI/UX-Design, der Datenbank-Architektur sowie vor allem an den <strong>juristischen Prüf-Algorithmen, System-Prompts, Forensik-Regelwerken (<code>STAGE_0_FORENSIC_LOCK</code>) und Red-Team-Validierungsroutinen (<code>SONAR NEMESIS</code> / <code>sonar-ai-triage</code>)</strong>, stehen im ausschließlichen geistigen Eigentum {op.ipHolderClause} und sind sowohl als Computerprogramme nach <strong>§§ 69a ff. UrhG</strong> als auch als streng vertrauliche Geschäftsgeheimnisse im Sinne des <strong>§ 2 Nr. 1 des Gesetzes zum Schutz von Geschäftsgeheimnissen (GeschGehG)</strong> geschützt.<br />
                (2) Dem Lizenznehmer bzw. Nutzer wird – vorbehaltlich abweichender schriftlicher Individualvereinbarungen und unter der auflösenden Bedingung (§ 158 Abs. 2 BGB) der fristgerechten Zahlung der vereinbarten Setup- sowie laufenden Systempflege- und Engine-Nutzungspauschalen – lediglich ein einfaches, nicht übertragbares, nicht unterlizenzierbares und auf den eigenen internen Geschäftsbetrieb beschränktes Nutzungsrecht eingeräumt (§ 31 Abs. 2 UrhG). Bei Zahlungsverzug oder Beendigung des Pflege- und Lizenzverhältnisses ist der Anbieter berechtigt, den Zugriff auf die zentrale KI-Triage-Engine (§§ 273, 320 BGB) bis zum Ausgleich der Rückstände technisch zu sperren; der Zugriff des Kunden auf seine in der eigenen Datenbank gespeicherten Bestandsdokumente bleibt hiervon unberührt.<br />
                (3) <strong>Striktes Reverse-Engineering- &amp; Extraktionsverbot:</strong> Es ist dem Nutzer und seinen Erfüllungsgehilfen strengstens untersagt, die Backend-Funktionen (insbesondere die Edge Function <code>sonar-ai-triage</code>), System-Prompts oder Prüfmatrizen ohne ausdrückliche schriftliche Zustimmung auszulesen, zu dekompilieren (§ 69e UrhG bleibt nur im zwingenden gesetzlichen Rahmen unberührt), durch Prompt-Injection-Techniken zu extrahieren, zu vervielfältigen (§ 69c Nr. 1 UrhG), umzuarbeiten (§ 69c Nr. 2 UrhG), an Dritte weiterzugeben oder für den Aufbau eigener konkurrierender Software- oder KI-Produkte zu verwenden (§ 4 Abs. 2 und 3 GeschGehG).
              </div>

              <div>
                <strong>§ 5 Rechtswahl, Erfüllungsort &amp; Ausschließlicher Gerichtsstand {op.jurisdictionCity}</strong><br />
                (1) Es gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).<br />
                (2) Erfüllungsort sowie ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit der Bereitstellung, Lizenzierung und Nutzung dieser Software ist – soweit die Vertragsparteien Kaufleute, juristische Personen des öffentlichen Rechts oder öffentlich-rechtliche Sondervermögen sind – gemäß <strong>§ 38 Abs. 1 ZPO {op.jurisdictionCity}</strong>.
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '14px 22px',
            background: theme.inputBg,
            borderTop: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <span style={{ fontSize: '11px', color: theme.textMuted }}>
            {op.modalFooterCopyrightLine}
          </span>
          <button
            type="button"
            onClick={() => setLegalModalTab(null)}
            style={{
              background: activeColor,
              color: isDarkMode ? '#000' : '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              fontWeight: 'bold',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}