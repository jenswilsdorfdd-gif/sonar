// src/config/sonarHelpCatalog.js
// ZENTRALER, FEINGRANULARER HILFE- & TOUR-KATALOG FÜR DIE INTERAKTIVE SONAR LIVE-BEDIENHILFE
// Erklärt jedes einzelne Arbeitsfeld, jeden Button und jedes Modul in ALLEN Reitern nach dem 3-Fragen-Prinzip:
// 1. Was ist das? | 2. Was passiert hier? | 3. Worauf muss ich achten?

export const SONAR_HELP_CATALOG = {
    // =========================================================================
    // 0. DEFAULT / STARTZUSTAND
    // =========================================================================
    default_welcome: {
      id: 'default_welcome',
      module: 'SONAR Live-Inspektor',
      title: 'Interaktive Feld-für-Feld-Hilfe aktiv',
      whatIsIt:
        'Ihr mitarbeitender Echtzeit-Begleiter für jedes einzelne Feld, jeden Scanner-Bereich und jeden Button in allen Reitern des SONAR Cockpits.',
      whatHappens:
        'Sobald Sie links in irgendein Eingabefeld klicken (egal ob Akten, Tresor, Behörden-CRM, Compliance oder Wissen), springt diese Anzeige automatisch auf genau dieses Feld. Ein Klick auf eines der kleinen „i“-Symbole an den Kanten pinnt das Thema fest (bzw. öffnet auf dem Smartphone die Info-Karte).',
      watchOut:
        'Schalten Sie oben rechts „Live-Hilfe“ wieder aus, verschwinden sämtliche „i“-Symbole auf Desktop und Smartphone sofort wieder restlos.'
    },
  
    // =========================================================================
    // 1. HEADER, NAVIGATION & GLOBALE SUCHE (Dashboard.jsx)
    // =========================================================================
    nav_tabs: {
      id: 'nav_tabs',
      module: 'Hauptnavigation',
      title: 'Die 5 Kern-Abteilungen des Cockpits',
      whatIsIt:
        'Die zentrale Umschaltleiste zwischen AKTEN (Tagesgeschäft & Versand), WIR (Firmen-Tresor), GEGNER (Behörden-CRM), COMPLIANCE (Schwellenwerte & Beschlüsse) und WISSEN (Gerichts-Streams & Volltexte).',
      whatHappens:
        'Ein Klick wechselt sofort den Arbeitsbereich, ohne dass Ihre Sitzung oder laufende Hintergrunddaten verloren gehen.',
      watchOut:
        'Pflegen Sie eigene Firmen und Privatprofile einmal sauber unter „WIR“, damit alle Briefköpfe, Steuernummern und USt-Fristen im gesamten System automatisch sitzen.'
    },
  
    global_search: {
      id: 'global_search',
      module: 'Globale Suche & Web-Scraper',
      title: 'Volltextsuche & Direkt-Abruf von Webseiten',
      whatIsIt:
        'Ein kombiniertes Suchfeld für Akten, Mandanten, Behörden und Urteile – gleichzeitig ein Live-Webseiten-Leser.',
      whatHappens:
        'Normale Suchbegriffe filtern sofort die Liste des jeweils aktiven Reiters. Fügen Sie eine komplette Webadresse (https://...) ein, liest das System den Text der Webseite aus und legt ihn direkt in Ihr Schreibfenster.',
      watchOut:
        'Falls in einer Liste plötzlich Einträge fehlen, prüfen Sie kurz, ob hier oben noch ein Suchwort steht (Klick auf „✕“ leert den Filter).'
    },
  
    header_theme_toggle: {
      id: 'header_theme_toggle',
      module: 'Anzeige',
      title: 'Umschalter Dark Mode / Light Mode',
      whatIsIt:
        'Wechselt das gesamte Cockpit inklusive Kanzlei-War-Room zwischen dunklem Kontrast-Modus und hellem Tageslicht-Design.',
      whatHappens:
        'Alle Hintergründe, Rahmen, Textfarben und Statuskarten schalten verzögerungsfrei um.',
      watchOut:
        'Die kleinen „i“-Hilfesymbole und alle roten RDG-/Fristen-Warnungen passen ihren Kontrast in beiden Modi automatisch an.'
    },
  
    header_demo_reset: {
      id: 'header_demo_reset',
      module: 'Datenschutz (Demo-Zugang)',
      title: 'Eigene Testdaten & Uploads restlos löschen',
      whatIsIt:
        'Der Selbstreinigungs-Schalter für Demo-Tester zum Abschluss einer Test-Session.',
      whatHappens:
        'Entfernt nach Bestätigung alle selbst hochgeladenen PDFs, .md-Textzwillinge, Testakten, Mandanten und Gegner rückstandslos aus Datenbank und Storage.',
      watchOut:
        'Die 3 schreibgeschützten Showcase-Musterakten (MUSTER-01 bis MUSTER-03) und die globalen Gerichts-Streams bleiben erhalten; das verbrauchte 10er-Testkontingent wird durch das Löschen nicht zurückgesetzt.'
    },
  
    // =========================================================================
    // 2. AKTEN-COCKPIT: RADAR, SCANNER & MAGIC IMPORT (AktenCockpit.jsx)
    // =========================================================================
    akten_alarme_panel: {
      id: 'akten_alarme_panel',
      module: 'Frühwarnsystem',
      title: 'Fristen-, Wiedervorlage- & USt-Radar',
      whatIsIt:
        'Ihre tägliche Kommandozentrale oben im Akten-Cockpit: Zeigt fällige Wiedervorlagen, kritische Behördenfristen (<= 7 Tage), anstehende USt-Voranmeldungen und gesetzliche Compliance-Termine.',
      whatHappens:
        'Klicken Sie auf den Namen eines Alarms, klappt unten sofort die passende Akte auf. Über das Aktionsmenü am Eintrag können Sie den Vorgang direkt in die Maske laden, nachhaken oder Termine verschieben.',
      watchOut:
        'Behördliche Notfristen niemals kommentarlos verschieben – nutzen Sie lieber den War-Room für einen fristwahrenden Verlängerungs- oder Aussetzungsantrag.'
    },
  
    akten_web_scanner: {
      id: 'akten_web_scanner',
      module: 'KI-Posteingang (Twin-Storage)',
      title: 'KI-Web-Scanner & Automatische Dokumenten-Triage',
      whatIsIt:
        'Der vollautomatische PDF-/Dokumentenscanner direkt im Browser (inklusive Vision-OCR-Fallback für reine Bild-Scans ohne Textschicht).',
      whatHappens:
        'Wählen Sie ein Bescheid- oder Vertrags-PDF aus und starten Sie den KI-Web-Scan: Das System extrahiert den Volltext, legt synchron PDF + .md-Textzwilling im Cloud-Bucket an, erkennt Bestandsakten und füllt unten sämtliche Felder samt Ersteinschätzung automatisch aus.',
      watchOut:
        'Nach dem Scan sind die Felder bereits fertig befüllt – prüfen Sie kurz Mandant, Gegner und Fristdatum und klicken Sie unten auf „+ In Akte abheften“.'
    },
  
    akten_magic_import: {
      id: 'akten_magic_import',
      module: 'Schnittstelle & Schnell-Import',
      title: 'Magic Import (JSON / ScanSuite / Rechtskanzlei-Übergabe)',
      whatIsIt:
        'Die Hochgeschwindigkeits-Datenschleuse für strukturierte JSON-Pakete aus Ihrer lokalen Python-ScanSuite (Prüftisch), externen KI-Vorprüfungen oder Bulk-Behördenlisten.',
      whatHappens:
        'Sobald Sie ein gültiges SONAR-JSON in dieses Feld einfügen, zerlegt das Cockpit in Millisekunden alle Felder (Unser Zeichen, Aktenzeichen, Gegner, Frist, Volltext, Entwurf), ordnet passende Bestandsakten samt Vorläufer-Bezug zu und gleicht Tresor & Gegner-CRM ab.',
      watchOut:
        'Auch Sammel-Importe für das Behörden-CRM (`typ: "Bulk-Gegner"`) können direkt hier hineinkopiert werden und legen fehlende Ämter automatisch an.'
    },
  
    // =========================================================================
    // 3. AKTEN-FORMULAR & VERSAND (AktenFormular.jsx)
    // =========================================================================
    akten_modus_wahl: {
      id: 'akten_modus_wahl',
      module: 'Akten-Zuordnung',
      title: 'Neue Akte anlegen vs. Zu bestehender Akte hinzufügen',
      whatIsIt:
        'Entscheidet, ob ein neuer Aktenordner mit neuer laufender Nummer eröffnet wird oder das Schriftstück in eine bereits existierende Akte wandert.',
      whatHappens:
        'Bei „Zu bestehender Akte hinzufügen“ wählen Sie rechts die Ziel-Akte aus – alle Stammdaten (Unser Zeichen, Gegner, Mandant, Aktenzeichen) werden sofort geladen.',
      watchOut:
        'Führen Sie zusammengehörige Verfahren (z. B. Bescheid -> Einspruch -> Einspruchsentscheidung) immer in derselben Akte, damit der War-Room sämtliche Vorläufer-Dokumente gemeinsam analysiert.'
    },
  
    akten_stammdaten_1: {
      id: 'akten_stammdaten_1',
      module: '1. Akten-Stammdaten',
      title: 'Unser Zeichen, Gegenstand & Behörden-Aktenzeichen',
      whatIsIt:
        'Die eindeutige Kennung Ihrer Akte nach innen („Unser Zeichen“) und gegenüber der Behörde („Aktenzeichen / Steuernummer“).',
      whatHappens:
        'Sobald unten Mandant und Gegner eingetragen sind, generiert das System „Unser Zeichen“ automatisch fortlaufend (z. B. `0042-WUS-Finanzamt`), sofern Sie kein eigenes Zeichen vergeben.',
      watchOut:
        'Tragen Sie das behördliche Aktenzeichen bzw. die Steuernummer möglichst exakt ein – daran erkennt die Automatik spätere Folgeschreiben vollautomatisch wieder.'
    },
  
    akten_gegner_2: {
      id: 'akten_gegner_2',
      module: '2. Gegenpartei / Behörde',
      title: 'Behörden-Auswahl & Sachbearbeiter-Daten',
      whatIsIt:
        'Alle Kontaktdaten der Gegenseite (Finanzamt, Gericht, Stadtkasse, Krankenkasse, Inkasso oder Vertragspartner).',
      whatHappens:
        'Über das Dropdown „+ Aus Gegner-CRM laden...“ übernehmen Sie gespeicherte Behörden samt konkreter Abteilung, Sachbearbeiter, Durchwahl, E-Mail und Faxnummer mit einem Klick.',
      watchOut:
        'Erkennt der Scanner einen neuen Sachbearbeiter zu einer bekannten Behörde, erscheint oben automatisch ein roter Zuweisungs-Dialog zur dauerhaften Speicherung im CRM.'
    },
  
    akten_mandant_3: {
      id: 'akten_mandant_3',
      module: '3. Wir (Mandant)',
      title: 'Eigene Gesellschaft / Privatperson aus dem Tresor',
      whatIsIt:
        'Legt fest, in wessen Namen die Akte geführt und spätere Schriftsätze im Briefkopf sowie in der Vertretungsformel verfasst werden.',
      whatHappens:
        'Ein Klick auf „+ Aus Firmen-Tresor laden...“ füllt Firmenname, Geschäftsführer/Ansprechpartner, E-Mail und Telefon sofort aus.',
      watchOut:
        'Im War-Room steuert diese Auswahl automatisch die korrekte Gesellschafts-Vertretungsformel (z. B. GmbH durch den Geschäftsführer vs. Privatperson).'
    },
  
    akten_vorgang_bezug: {
      id: 'akten_vorgang_bezug',
      module: 'Dokument-Eintrag & Verlauf',
      title: 'Typ (Eingang/Ausgang/Intern), Aktion & Vorläufer-Bezug',
      whatIsIt:
        'Klassifiziert den konkreten Vorgang nach Richtung, Datum, Kurzbeschreibung und verknüpft ihn bei bestehenden Akten mit dem vorherigen Schreiben.',
      whatHappens:
        'Wählen Sie „Eingang“, bietet Ihnen das Cockpit beim Speichern direkt den Sprung in den Kanzlei-War-Room an. Setzen Sie einen „Bezug“, wird die alte Frist des beantworteten Schreibens beim Speichern automatisch erledigt („Auto-Kill Frist“).',
      watchOut:
        'Nutzen Sie den Typ „Intern“ für Aktennotizen, Telefonvermerke oder Zahlungsanweisungen, die nicht nach außen versendet werden.'
    },
  
    akten_fristen_wv: {
      id: 'akten_fristen_wv',
      module: 'Fristen-Kontrolle',
      title: 'Frist (Behörde) vs. Wiedervorlage (Intern)',
      whatIsIt:
        'Steuert die Terminüberwachung im Fristen-Radar: Links harte gesetzliche/behördliche Fristen, rechts Ihre eigene Wiedervorlage inklusive Schnellwahltasten (+3T, +1W, +2W, +1M).',
      whatHappens:
        'Beide Felder schließen sich gegenseitig sauber aus, damit pro Vorgang ein eindeutiger Kontrolltermin im Alarm-Radar aktiv ist. Der grüne Haken darunter erledigt bei Folgeeinträgen veraltete Alarme derselben Akte.',
      watchOut:
        'Tragen Sie echte Rechtsbehelfs- oder Zahlungsfristen der Gegenseite immer in „Frist (Behörde)“ ein, damit die dreistufige Alarm-Eskalation rechtzeitig ab 7 Tagen Restlaufzeit anschlägt.'
    },
  
    akten_versand_adressen: {
      id: 'akten_versand_adressen',
      module: 'Empfänger-Routing',
      title: 'Versand-E-Mail, Versand-Faxnummer & z. Hd. (Deckblatt)',
      whatIsIt:
        'Die Zieladressen, an die der E-Mail- oder E-Fax-Versand dieses konkreten Schreibens technisch übermittelt wird.',
      whatHappens:
        'Das Feld „z. Hd. (Fax-Deckblatt)“ steuert gezielt den Empfängervermerk auf dem generierten PDF-Briefkopf/Telefax, ohne Ihren allgemeinen Stammdatensatz im Behörden-CRM zu überschreiben.',
      watchOut:
        'Im E-Mail-Feld können Sie bei Bedarf mehrere Empfänger durch Komma oder Semikolon trennen (1. Adresse = Hauptempfänger, weitere = CC).'
    },
  
    akten_clickwrap_confirm: {
      id: 'akten_clickwrap_confirm',
      module: 'Rechtssicherheit (Human-in-the-Loop)',
      title: 'Pflicht-Bestätigung vor dem Außenversand',
      whatIsIt:
        'Die gesetzlich und vertraglich verankerte Freigabe-Schranke gemäß KI-Verordnung und RDG/StBerG vor jedem echten Versand per E-Mail oder Telefax.',
      whatHappens:
        'Solange dieses Häkchen bei Gast-/Mandanten-Accounts nicht aktiv gesetzt ist, bleiben die Buttons „E-Mail senden“ und „E-Fax“ technisch gesperrt.',
      watchOut:
        'Prüfen Sie vor dem Setzen des Hakens insbesondere Aktenzeichen, Beträge, Anträge, Datumsangaben und die Ziel-Faxnummer bzw. Ziel-E-Mail.'
    },
  
    akten_btn_versandhistorie: {
      id: 'akten_btn_versandhistorie',
      module: 'Ausgangsnachweise',
      title: 'Versandhistorie & Sendeberichte drucken',
      whatIsIt:
        'Öffnet das Protokoll aller bisherigen E-Mail- und Telefax-Ausgänge (gefiltert auf die gewählte Akte oder global über alle Akten).',
      whatHappens:
        'Sie sehen jedes versendete Schreiben im Volltext samt verknüpftem Ausgangs-PDF, können direkt in die Akte springen oder einen formellen DIN-A4-Sendebericht ausdrucken.',
      watchOut:
        'Perfekt als schneller Zustell- und Ausgangsnachweis gegenüber Finanzämtern, Gerichten oder der eigenen Buchhaltung.'
    },
  
    akten_btn_email_send: {
      id: 'akten_btn_email_send',
      module: 'Direkt-Versand (E-Mail)',
      title: 'Schreiben per E-Mail senden (inkl. Auto-PDF)',
      whatIsIt:
        'Versendet Ihren Textentwurf über die Resend-Schnittstelle inklusive automatisch generiertem, mehrseitigem Geschäftsbrief-PDF.',
      whatHappens:
        'Erzeugt im Backend ein sauberes DIN-A4-PDF (mit Absender, Empfänger, Datum, Betreff und im Vollbetrieb Ihrer Unterschrift), hängt ausgewählte Anlagen an, verschickt die E-Mail und speichert den Ausgang samt PDF automatisch in der Akte.',
      watchOut:
        'Interne `.md`-Zwillingsdateien werden beim Außenversand automatisch herausgefiltert, sodass niemals Rohdaten nach außen gehen.'
    },
  
    akten_btn_fax_send: {
      id: 'akten_btn_fax_send',
      module: 'Direkt-Versand (Telefax)',
      title: 'Schreiben als E-Fax übermitteln (Simple-Fax)',
      whatIsIt:
        'Übermittelt Ihren Schriftsatz als vollwertiges, mehrseitiges Telefax direkt an die eingetragene Behörden- oder Gerichts-Faxnummer.',
      whatHappens:
        'Baut ein formelles Telefax-PDF im DIN-A4-Format, sendet es über das Fax-Gateway, legt das versendete PDF im Storage ab und protokolliert den Ausgang automatisch in der Aktenhistorie.',
      watchOut:
        'Gerade bei fristgebundenen Einsprüchen und Anträgen gegenüber Behörden liefert das Fax vorab den schnellsten formellen Zugangsnachweis.'
    },
  
    akten_btn_termin_zahlung: {
      id: 'akten_btn_termin_zahlung',
      module: 'Aufgaben- & Zahlungs-Planer',
      title: 'Internen Termin / Überweisung planen & Google Kalender',
      whatIsIt:
        'Ein aufklappbares Planungsmodul für Zahlungsziele (mit Betrag, IBAN, Verwendungszweck), Telefonate oder interne Prüfaufträge.',
      whatHappens:
        'Übernimmt alle Zahlungs- oder Termindaten formatiert als internen Vorgang samt Wiedervorlage in die Maske – oder öffnet mit einem Klick direkt einen fertig ausgefüllten Termin in Ihrem Google Kalender.',
      watchOut:
        'Ideal, wenn eine Zahlung erst unter einer Bedingung ausgelöst werden soll (z. B. „In 10 Tagen prüfen, ob Aussetzungsbescheid da ist, sonst überweisen“).'
    },
  
    akten_btn_warroom: {
      id: 'akten_btn_warroom',
      module: 'Überkanzlei-Engine',
      title: 'Vorgang in den Kanzlei-War-Room senden',
      whatIsIt:
        'Öffnet den strategischen KI-War-Room (Chefabteilungs-Lagebesprechung, Kanzlei Alpha, Spiegel-Kanzlei Omega & Revisionssenat) für den aktuellen Fall.',
      whatHappens:
        'Zieht sämtliche historischen Dokumente (.md-Zwillinge) der Akte sowie einschlägige Volltext-Urteile zusammen, kalkuliert 4 wähl-/kombinierbare Rechtsstrategien und fertigt nach Ihrer Auswahl den revisionsgeprüften Schriftsatz.',
      watchOut:
        'Wenn Sie eine bestehende Akte bearbeiten, wählen Sie diese vorher oben aus (oder klicken Sie unten in der Aktenliste auf „Laden“), damit der War-Room die gesamte Aktenhistorie mitliest.'
    },
  
    akten_versand_anhaenge: {
      id: 'akten_versand_anhaenge',
      module: 'Anlagen-Management',
      title: 'Versand-Dateianhänge für E-Mail & Fax',
      whatIsIt:
        'Hier hängen Sie zusätzliche Belege, Vollmachten, Kontoauszüge oder Verträge an, die zusammen mit Ihrem Hauptschreiben versendet werden sollen.',
      whatHappens:
        'Alle hier ausgewählten Dateien (außer internen .md-Dateien) werden beim Klick auf E-Mail oder E-Fax automatisch mitübertragen und gleichzeitig zur Akte gespeichert.',
      watchOut:
        'Einzelne versehentlich gewählte Anhänge können Sie vor dem Senden jederzeit über das kleine „✕“ am Dateinamen wieder entfernen.'
    },
  
    akten_textentwurf_box: {
      id: 'akten_textentwurf_box',
      module: 'Schreibfenster',
      title: 'Textentwurf / Schriftsatz / Aktenvermerk',
      whatIsIt:
        'Das zentrale Editor-Feld für Ihren ausgehenden Brieftext (z. B. direkt aus dem War-Room übergeben) oder für ausführliche Eingangs-Zusammenfassungen und Aktennotizen.',
      whatHappens:
        'Der exakte Inhalt dieses Feldes bildet beim E-Mail- und Fax-Versand den gedruckten Brieftext im generierten DIN-A4-PDF.',
      watchOut:
        'Im kostenfreien Demo-Modus ist dieses Feld durch ein Wasserzeichen sowie eine Kopier- und Markiersperre geschützt; im Vollbetrieb stehen Ihnen alle Bearbeitungsfunktionen uneingeschränkt offen.'
    },
  
    akten_manuell_upload_save: {
      id: 'akten_manuell_upload_save',
      module: 'Archivierung & Abschluss',
      title: 'In Akte abheften & speichern',
      whatIsIt:
        'Speichert den aktuellen Posteingang, Ausgang oder internen Vermerk samt ausgewählten Dokumenten dauerhaft in der Akte.',
      whatHappens:
        'Sichert Akte und Historieneintrag in Supabase, erzeugt für jedes hochgeladene PDF automatisch den durchsuchbaren .md-Zwilling im Wissensspeicher und fragt bei Eingängen, ob Sie sofort im War-Room antworten oder eine Wiedervorlage setzen möchten.',
      watchOut:
        'Falls Sie versehentlich ohne Datei auf Speichern klicken, erinnert Sie ein kurzer Sicherheits-Dialog vorab („Dateien vergessen?“).'
    },
  
    // =========================================================================
    // 4. AKTEN-ÜBERSICHT & WAR-ROOM (AktenListe.jsx & MegaLegalModal.jsx)
    // =========================================================================
    akten_liste_overview: {
      id: 'akten_liste_overview',
      module: 'Akten-Register',
      title: 'Akten-Übersicht, Verlaufshistorie & Musterakten',
      whatIsIt:
        'Ihre gesamte Kanzlei- und Unternehmensregistratur – inklusive Inline-Bearbeitung, Akten-Schloss, Akten-Zusammenführung (Merge), Druckauszug und den 3 Demo-Musterakten.',
      whatHappens:
        'Klicken Sie auf eine Akte, klappt die gesamte Dokumenten- und Versandhistorie auf. Mit „Laden“ holen Sie jeden Vorgang samt gespeichertem War-Room-Schriftsatz sofort nach oben in die Bearbeitungsmaske.',
      watchOut:
        'Über den Button „Erledigte einblenden“ rechts oben machen Sie geschlossene und versiegelte Akten jederzeit wieder sichtbar.'
    },
  
    warroom_stations: {
      id: 'warroom_stations',
      module: 'War-Room Prüfkette',
      title: 'Die 4 Pflicht-Stationen (Alpha • Omega • Delta • Senat)',
      whatIsIt:
        'Die Echtzeit-Qualitätskontrolle Ihrer gedoppelten Kanzlei-Architektur: Erstentwurf durch Kanzlei Alpha, kontradiktorische Gegenprüfung durch Spiegel-Kanzlei Omega, deterministischer Delta-Patch und Endabnahme durch den Revisionssenat.',
      whatHappens:
        'Zeigt live an, an welcher Station gerade gearbeitet wird. Erst bei „4x GRÜN“ wird die Übergabe ans Cockpit entsperrt.',
      watchOut:
        'Auf dem Smartphone können Sie diese Leiste oben rechts über „Stationen ▼ / Kompakt ▲“ ein- und ausklappen, um maximalen Leseraum zu gewinnen.'
    },
  
    warroom_briefing_options: {
      id: 'warroom_briefing_options',
      module: 'Phase A: Chefabteilungs-Lagebesprechung',
      title: 'Sachverhalts-Analyse & 4 kombinierbare Strategie-Optionen',
      whatIsIt:
        'Ihre strukturierte SCQA-Entscheidungsvorlage mit Schwachstellen-Analyse, Vertretungszwang-Prüfung sowie Kosten-, Dauer- und Erfolgsbewertung je Strategie.',
      whatHappens:
        'Tippen Sie eine oder mehrere Strategie-Karten gleichzeitig an, tragen Sie optional eigene Hinweise ein und starten Sie über den gelben Button die vollständige Schriftsatz-Ausarbeitung.',
      watchOut:
        'Die grün markierte Empfehlung zeigt Ihnen sofort, welche Einzeloption oder Kombination wirtschaftlich und prozessual die höchste Schlagkraft hat.'
    },
  
    warroom_footer_transfer: {
      id: 'warroom_footer_transfer',
      module: 'Phase B: Nachschärfen & Übergabe',
      title: 'Korrektur-Anweisung, Dokument-Nachreichung & Cockpit-Transfer',
      whatIsIt:
        'Die untere Kommandozeile des War-Rooms für nachträgliche Änderungswünsche, fehlende PDF-Anlagen (Büroklammer) und den finalen Export.',
      whatHappens:
        'Jede Nachanweisung durchläuft erneut die Qualitätskontrolle von Spiegel-Kanzlei Omega. „Ins Cockpit übergeben“ trägt den sauberen Brieftext samt +14-Tage-Wiedervorlage direkt in Ihr Versandformular ein.',
      watchOut:
        'Wenn Sie auf „Schließen“ klicken, geht nichts verloren: Der abgenommene Schriftsatz bleibt dauerhaft an der Akte gespeichert.'
    },
  
    // =========================================================================
    // 5. REITER „WIR“ – FIRMEN-TRESOR IM DETAIL (FirmenTresor.jsx)
    // =========================================================================
    tresor_main: {
      id: 'tresor_main',
      module: 'WIR – Firmen-Tresor',
      title: 'Mandanten-, Steuer-, Bank- & Gesellschafts-Tresor',
      whatIsIt:
        'Das zentrale Stammdaten-Herz für alle eigenen Firmen und Privatprofile.',
      whatHappens:
        'Alle hier gepflegten Angaben speisen automatisch Ihre Briefköpfe, das USt-Voranmeldungs-Radar sowie das Compliance-Radar.',
      watchOut:
        'Klicken Sie unten in der Liste auf eine bestehende Firma, um deren Stammdaten und Dokumente oben im Formular zu bearbeiten.'
    },
  
    tresor_stammdaten_1: {
      id: 'tresor_stammdaten_1',
      module: 'Tresor – 1. Kontaktdaten & Rechtsform',
      title: 'Firmenname, Rechtsform, Vertretungsorgan & Rückfax',
      whatIsIt:
        'Erfasst die juristische Einheit (GmbH, UG, GmbH & Co. KG, Einzelunternehmen, Privat usw.), den Geschäftsführer/Inhaber sowie Anschrift, Telefon, Fax und E-Mail.',
      whatHappens:
        'Die gewählte Rechtsform steuert automatisch die korrekte Organbezeichnung (z. B. Geschäftsführer vs. Vorstand vs. Privatperson) in Schriftsätzen und Gesellschafterbeschlüssen. Bei Auswahl von „Privat“ werden gewerbliche Warnungen automatisch abgeschaltet.',
      watchOut:
        'Hinterlegen Sie hier Ihre offizielle Kanzlei-/Unternehmens-Faxnummer, damit Empfängerbehörden Rückantworten sauber zuordnen können.'
    },
  
    tresor_steuern_wz_2: {
      id: 'tresor_steuern_wz_2',
      module: 'Tresor – 2. Steuern, Register & WZ-2008',
      title: 'Steuernummern, USt-Turnus, Register & Branchenkennzahl',
      whatIsIt:
        'Bündelt Steuernummer, USt-IdNr., Wirtschafts-IdNr. (§ 139c AO), HRB, Transparenzregister, Betriebsnummer, BG-Nummer, IHK/HWK, LUCID sowie die amtliche WZ-2008-Branchenkennzahl.',
      whatHappens:
        'USt-Intervall und Dauerfristverlängerung (DFV) berechnen im Akten-Cockpit vollautomatisch Ihre monatlichen bzw. vierteljährlichen USt-Alarme zum 10. des Monats. Die Stichwortsuche findet sofort den passenden WZ-2008-Code.',
      watchOut:
        'Branchen nach § 2a SchwarzArbG (z. B. Bau, Handwerk, Gastronomie, Logistik) aktivieren automatisch die passenden Sofortmelde- und Prüfhinweise im Compliance-Radar.'
    },
  
    tresor_banken_3: {
      id: 'tresor_banken_3',
      module: 'Tresor – 3. Geschäftskonten',
      title: 'Hauptbankverbindung & Zusatzkonten',
      whatIsIt:
        'Verwaltet Ihr Hauptgeschäftskonto sowie beliebig viele weitere Bankkonten inklusive Verwendungszweck (z. B. Steuerkonto, Tagesgeld, Rücklagenkonto).',
      whatHappens:
        'Über „+ Weitere Bankverbindung hinzufügen“ legen Sie zusätzliche IBAN-Zeilen an, die sofort übersichtlich im Tresor-Auszug erscheinen.',
      watchOut:
        'Besonders hilfreich bei Erstattungs- und Guthabenauskehrungsanträgen (§ 37 Abs. 2 AO), damit dem Finanzamt sofort das richtige Zielkonto genannt wird.'
    },
  
    tresor_mitarbeiter_4: {
      id: 'tresor_mitarbeiter_4',
      module: 'Tresor – 4. Mitarbeiter & § 23 KSchG',
      title: 'Teilzeit-/Vollzeit-Rechner & Compliance-Schalter',
      whatIsIt:
        'Berechnet live aus Teilzeitkräften (Faktor 0,5 bis 20 Std. / Faktor 0,75 bis 30 Std.) und Vollzeitkräften (Faktor 1,0) den exakten Richtwert nach § 23 Abs. 1 Satz 4 KSchG sowie die Gesamtkopfzahl.',
      whatHappens:
        'Zeigt sofort im Klartext an, ob noch die Kleinbetriebsregelung (<= 10,00) greift oder das Kündigungsschutzgesetz aktiv ist, und steuert die Zusatzpflichten (§ 181 BGB-Befreiung, KSK-Abgabe, LUCID, § 2a SchwarzArbG).',
      watchOut:
        'Für reine Holding-Hüllen ohne operativen Betrieb oder Privatprofile können Sie die Compliance-Überwachung rechts oben mit einem Haken komplett stummschalten.'
    },
  
    tresor_dokumente_5: {
      id: 'tresor_dokumente_5',
      module: 'Tresor – 5. Pflicht- & Stammdokumente',
      title: 'Soll/Ist-Pflichtdokumente & #label-Tresor-Upload',
      whatIsIt:
        'Prüft anhand der Rechtsform automatisch, welche Gesellschaftsdokumente vorliegen müssen (z. B. Gesellschaftsvertrag, HR-Auszug, GF-Anstellungsvertrag, Transparenzregister) und verwaltet alle Uploads.',
      whatHappens:
        'Klicken Sie auf ein rot markiertes fehlendes Pflichtdokument, sehen Sie die gesetzliche Grundlage samt Haftungshinweis und können die Datei passgenau mit `#label=...` hochladen. Kritische Organdokumente erhalten automatisch einen Löschschutz.',
      watchOut:
        'Auch im Boardroom erzeugte Gesellschafterbeschlüsse landen mit passendem `#label` direkt hier im Tresor.'
    },
  
    tresor_liste_overview: {
      id: 'tresor_liste_overview',
      module: 'Tresor-Verzeichnis',
      title: 'Gespeicherte Mandanten, Gesellschaften & Schnellansicht',
      whatIsIt:
        'Die kompakte Übersicht aller angelegten Firmen und Personen mit Sofortblick auf Steuernummer, HRB, IBAN und den Status der Pflichtdokumente.',
      whatHappens:
        'Ein Klick auf eine Zeile klappt sämtliche Registerdaten, Bankkonten und Direkt-Links zu den hinterlegten Dokumenten auf und lädt den Datensatz gleichzeitig oben zur Bearbeitung.',
      watchOut:
        'Geschützte Organdokumente (z. B. GF-Vertrag, Gesellschafterbeschluss) verlangen vor dem Entfernen bewusst die Sicherheitsbestätigung `LOESCHEN`.'
    },
  
    // =========================================================================
    // 6. REITER „GEGNER“ – BEHÖRDEN- & GEGNER-CRM IM DETAIL (GegnerCrm.jsx)
    // =========================================================================
    gegner_crm_main: {
      id: 'gegner_crm_main',
      module: 'GEGNER – Behörden-CRM',
      title: 'Zentrales Behörden-, Gerichts- & Gegner-CRM',
      whatIsIt:
        'Ihre strukturierte Adress-, Fax- und Durchwahldatenbank für sämtliche Ämter, Gerichte und Gegenseiten.',
      whatHappens:
        'Einmal erfasste Behörden stehen sofort im Aktenformular und beim automatischen Scanner-Abgleich zur Verfügung.',
      watchOut:
        'Über das globale Suchfeld oben finden Sie hier auch einzelne Sachbearbeiternamen oder Abteilungen innerhalb Sekunden.'
    },
  
    gegner_hauptdaten_1: {
      id: 'gegner_hauptdaten_1',
      module: 'Gegner-CRM – 1. Behörden-Stammdaten',
      title: 'Behördenname, Postanschrift, Zentral-Fax & Zentral-Mail',
      whatIsIt:
        'Erfasst die übergeordneten Stammdaten der Behörde, des Gerichts oder des Unternehmens (z. B. Finanzamt Dresden-Süd, Hauptpoststelle).',
      whatHappens:
        'Die zentrale Faxnummer und zentrale E-Mail dienen im Akten-Cockpit automatisch als verlässlicher Fallback, falls ein einzelner Sachbearbeiter keine eigene Durchwahl/Mail hat.',
      watchOut:
        'Achten Sie auf eine saubere Schreibweise des Behördennamens, damit die Fuzzy-Erkennung beim KI-Scan neue Bescheide sofort diesem CRM-Eintrag zuordnet.'
    },
  
    gegner_abteilungen_2: {
      id: 'gegner_abteilungen_2',
      module: 'Gegner-CRM – 2. Abteilungen & Sachbearbeiter',
      title: 'Beliebig viele Stellen & Durchwahlen unter einer Behörde',
      whatIsIt:
        'Ermöglicht das Anlegen beliebig vieler Fachabteilungen (z. B. Veranlagung, Erhebungsstelle, Vollstreckungsstelle, Rechtsbehelfsstelle) samt konkretem Bearbeiter, Durchwahl und E-Mail.',
      whatHappens:
        'Im Aktenformular erscheint später jede Abteilung einzeln auswählbar im Dropdown (z. B. „Finanzamt — Erhebungsstelle: Frau Müller“) und setzt das `z. Hd.`-Deckblatt automatisch passend.',
      watchOut:
        'Legen Sie keine doppelten Behörden für verschiedene Abteilungen an – hängen Sie neue Sachbearbeiter einfach per „+ Ansprechpartner / Abteilung hinzufügen“ an die bestehende Behörde an.'
    },
  
    gegner_liste_overview: {
      id: 'gegner_liste_overview',
      module: 'Behörden-Register',
      title: 'Gespeicherte Behörden & Aufklappbare Abteilungsliste',
      whatIsIt:
        'Das alphabetische Register aller hinterlegten Ämter, Gerichte, Kassen und Gegner.',
      whatHappens:
        'Ein Klick auf eine Zeile lädt die Behörde oben ins Bearbeitungsformular und klappt darunter sofort die Hausanschrift sowie sämtliche gespeicherten Abteilungen und Durchwahlen auf.',
      watchOut:
        'Auch neue Kontakte, die Sie direkt aus einem gescannten Bescheid im Akten-Cockpit übernehmen, erscheinen sofort dauerhaft hier in der aufgeklappten Liste.'
    },
  
    // =========================================================================
    // 7. REITER „COMPLIANCE“ – RADAR & BOARDROOM IM DETAIL (ComplianceRadar.jsx & BeschlussGenerator.jsx)
    // =========================================================================
    compliance_radar_main: {
      id: 'compliance_radar_main',
      module: 'COMPLIANCE – Radar & Boardroom',
      title: 'Organhaftungs-Prävention & Gesellschaftsrecht',
      whatIsIt:
        'Das Frühwarn- und Dokumentationssystem für Geschäftsführer und Inhaber zur Vermeidung persönlicher Haftungsfallen.',
      whatHappens:
        'Kombiniert Branchenpflichten, Mitarbeiter-Schwellenwerte, gesetzliche Meldetermine und den 1-Klick-Beschlussgenerator.',
      watchOut:
        'Wählen Sie zuerst ganz oben die gewünschte Gesellschaft aus dem Dropdown aus.'
    },
  
    compliance_header_puls: {
      id: 'compliance_header_puls',
      module: 'Compliance-Steuerung',
      title: 'Mandanten-Umschalter & 90-Tage-Quartals-Puls-Check',
      whatIsIt:
        'Zeigt auf einen Blick Rechtsform, WZ-2008-Branche, Beschäftigtenzahl, § 23 KSchG-Richtwert und das Datum der letzten Parameter-Prüfung.',
      whatHappens:
        'Über „Mitarbeiter & Puls-Check anpassen“ öffnen Sie das Schnell-Modal, um geänderte Mitarbeiterzahlen oder Branchen zu aktualisieren und für weitere 90 Tage zu bestätigen.',
      watchOut:
        'Nach Ablauf von 90 Tagen färbt sich der Button dezent als Erinnerung ein, ohne Sie durch ungefragte Pop-ups bei der Arbeit zu unterbrechen.'
    },
  
    compliance_branchen_1: {
      id: 'compliance_branchen_1',
      module: 'Compliance – 1. Betriebssicherheit & BG',
      title: 'Branchenspezifische Prüfpflichten (DGUV, BetrSichV, SchwarzArbG)',
      whatIsIt:
        'Listet anhand des hinterlegten WZ-2008-Codes die zuständige Berufsgenossenschaft sowie konkrete Prüfpflichten auf (z. B. DGUV Vorschrift 3 Elektroprüfung, UVV-Fahrzeugprüfung, Angebotsvorsorge oder § 2a SchwarzArbG).',
      whatHappens:
        'Mit Klick auf „+ Branchen-Prüfliste als Wiedervorlage-Akte anlegen“ erzeugt das System automatisch eine echte Akte im Akten-Cockpit samt Frist-Erinnerung.',
      watchOut:
        'Dokumentierte Prüfprotokolle schützen die Geschäftsführung im Schadens- oder Betriebsprüfungsfall vor dem Vorwurf des Organisationsverschuldens (§ 43 GmbHG / § 130 OWiG).'
    },
  
    compliance_schwellen_2: {
      id: 'compliance_schwellen_2',
      module: 'Compliance – 2. Arbeitgeber-Schwellenwerte',
      title: 'Gesetzliche Schwellenwerte von 1 bis 50+ Mitarbeitern',
      whatIsIt:
        'Überwacht alle kritischen Personal-Stufen (z. B. ab 1 MA Arbeitsschutz/Gefährdungsbeurteilung, > 10,00 Vollzeit-Richtwert KSchG, ab 20 MA Datenschutzbeauftragter/Schwerbehindertenabgabe, ab 50 MA HinSchG-Meldestelle).',
      whatHappens:
        'Bereits erreichte Schwellen werden farblich hervorgehoben und lassen sich per 1-Klick direkt als Wiedervorlage-Akte ins Tagesgeschäft übernehmen.',
      watchOut:
        'Prüfen Sie diese Liste vor jeder geplanten Neueinstellung oder Stundenerhöhung, um nicht unbeabsichtigt über die 10,00-Schwelle des KSchG oder die 20-Köpfe-Grenze zu rutschen.'
    },
  
    compliance_ticker_3: {
      id: 'compliance_ticker_3',
      module: 'Compliance – 3. Gesetzlicher Fristen-Ticker',
      title: 'Unterjährige Abgaben-, Register- & Meldetermine',
      whatIsIt:
        'Zeigt alle für diese Rechtsform geltenden Monats- und Jahresfristen mit Live-Tages-Countdown (z. B. SV-Beitragsnachweis, UStVA/LSt, UV-Jahresmeldung BG, KSK bis 31.03., LUCID bis 15.05., Offenlegung Jahresabschluss).',
      whatHappens:
        'Termine mit <= 30 Tagen Restlaufzeit werden rot markiert; jeder Termin kann mit einem Klick samt Rechtsgrundlage als Wiedervorlage-Akte angelegt werden.',
      watchOut:
        'Sozialversicherungsbeiträge (drittletzter Bankarbeitstag) und Lohnsteuer sind besonders haftungsscharf (§ 266a StGB / § 69 AO) und genießen höchste Priorität.'
    },
  
    compliance_boardroom_4: {
      id: 'compliance_boardroom_4',
      module: 'Compliance – 4. Boardroom & Beschluss-Generator',
      title: 'Vorausgefüllte Gesellschafterbeschlüsse & Einladungen',
      whatIsIt:
        'Generiert rechtssicher formulierte GmbH-/UG-Einladungen (inkl. automatischer +10-Tage-Ladungsfrist nach § 51 GmbHG), Jahresabschluss-Feststellungen, Gewinnverwendungen und vGA-sichere GF-Vergütungsbeschlüsse.',
      whatHappens:
        'Setzt Firmenname, Sitz, HRB und Geschäftsführer automatisch aus dem Tresor ein. Sie können das Dokument als unterschriftsreifes DIN-A4-PDF drucken, vorab per E-Mail versenden oder direkt mit passendem `#label` löschgeschützt im Firmen-Tresor archivieren.',
      watchOut:
        'Ergänzen Sie vor dem Archivieren lediglich die konkreten Euro-Beträge oder individuellen Eckdaten in den spitzen Klammern `<...>` direkt im Editorfeld.'
    },
  
    // =========================================================================
    // 8. REITER „WISSEN“ – GERICHTS-STREAMS & ARCHIV IM DETAIL (Wissensspeicher.jsx)
    // =========================================================================
    wissen_main: {
      id: 'wissen_main',
      module: 'WISSEN – Rechtsdatenbank & Streams',
      title: 'Volltext-Wissensbasis & Höchstgerichts-Archiv',
      whatIsIt:
        'Das zentrale juristische Gedächtnis des gesamten SONAR Cockpits.',
      whatHappens:
        'Vereint 25 überwachte Gerichts-/Behörden-Feeds mit sämtlichen eigenen Akten-Volltexten für die automatische Live-Recherche im War-Room.',
      watchOut:
        'Demo-Tester haben hier vollen Lesezugriff auf alle echten Gerichtsentscheidungen, sehen jedoch keine privaten Dokumente fremder Mandanten.'
    },
  
    wissen_rss_monitor: {
      id: 'wissen_rss_monitor',
      module: 'Feed-Überwachung (Self-Healing)',
      title: 'RSS-Quellen-Monitor (25 Gerichts- & Behörden-Feeds)',
      whatIsIt:
        'Überwacht den Gesundheitsstatus aller angebundenen Rechtsquellen (Gerichte, Steuern/Zoll, Aufsichtsbehörden, Gesetzgebung, EU-Ticker).',
      whatHappens:
        'Klappen Sie den Monitor auf, sehen Sie den Live-Status jeder Quelle. Als Owner können Sie geänderte Behörden-URLs direkt eintragen, live testen oder neue RSS-Quellen hinzufügen.',
      watchOut:
        'Falls ein behördlicher Server ausfällt, meldet sich das System automatisch und hält bestehende Urteile im Archiv uneingeschränkt verfügbar.'
    },
  
    wissen_court_sync: {
      id: 'wissen_court_sync',
      module: 'Live-Rechtsprechung',
      title: 'Höchstrichterliche Gerichts-Streams abrufen',
      whatIsIt:
        'Die Direkt-Steuerung für den Volltext-Scraper der obersten Gerichte (BVerfG, BFH, BGH, BVerwG, BSG, BAG, EuGH, EGMR, BMF, BaFin).',
      whatHappens:
        'Als System-Owner können Sie gezielt ein einzelnes Gericht oder alle Quellen gleichzeitig abrufen; neue Entscheidungen werden bis 85.000 Zeichen Volltext inkl. Paragraphen-Index im Bucket gespeichert.',
      watchOut:
        'Der KI-War-Room durchsucht diese Urteile bei jeder Lagebesprechung vollautomatisch nach passenden Paragraphen und dreht sie für Ihre Argumentation ein.'
    },
  
    wissen_bulk_upload: {
      id: 'wissen_bulk_upload',
      module: 'Massen-Import (Twin-Storage)',
      title: 'Alt-Dokumente, Verträge & Fachliteratur hochladen',
      whatIsIt:
        'Der Sammel-Uploader für bestehende PDF- und Markdown-Bestände (z. B. aus Ihrer lokalen ScanSuite, Musterverträgen oder BMF-Schreiben).',
      whatHappens:
        'Liest hochgeladene PDFs lokal im Browser aus, erzeugt fehlende `.md`-Textzwillinge vollautomatisch im Cloud-Speicher und ordnet sie optional einer konkreten Firma aus dem Tresor zu.',
      watchOut:
        'Wenn Sie aus der ScanSuite bereits gepaarte `.pdf`- und `.md`-Dateien gemeinsam auswählen, erkennt der Importer das Paar automatisch und spart den doppelten OCR-Lauf.'
    },
  
    wissen_filter_list: {
      id: 'wissen_filter_list',
      module: 'Volltext-Datenbank',
      title: 'MD- / PDF-Umschalter, Quellenfilter & Volltext-Ansicht',
      whatIsIt:
        'Die durchsuchbare Dokumenten- und Urteilsliste, sauber getrennt nach KI-lesbaren `.md`-Volltexten und Original-`.pdf`-Dokumenten.',
      whatHappens:
        'Filtern Sie gezielt nach „Allgemein (Gerichte/Behörden - RSS)“, einzelnen Mandanten oder Behörden. Ein Klick auf den Dateinamen öffnet das Original-PDF bzw. den ungekürzten Volltext in einem neuen Tab.',
      watchOut:
        'Über den Button „Weitere Entscheidungen anzeigen (+50)“ am unteren Ende blättern Sie schnell und ressourcenschonend auch durch sehr große Urteilsbestände.'
    }
  };
  
  // Geführte 8-Stationen-Schnelltour quer durch das gesamte System
  export const SONAR_GUIDED_TOUR = [
    {
      step: 1,
      tab: 'akten',
      helpId: 'nav_tabs',
      label: '1. Hauptmodule & Navigation'
    },
    {
      step: 2,
      tab: 'akten',
      helpId: 'akten_alarme_panel',
      label: '2. Fristen- & USt-Radar'
    },
    {
      step: 3,
      tab: 'akten',
      helpId: 'akten_web_scanner',
      label: '3. KI-Web-Scanner (Posteingang)'
    },
    {
      step: 4,
      tab: 'akten',
      helpId: 'akten_magic_import',
      label: '4. Magic Import (JSON-Schleuse)'
    },
    {
      step: 5,
      tab: 'akten',
      helpId: 'akten_btn_warroom',
      label: '5. Strategischer Kanzlei-War-Room'
    },
    {
      step: 6,
      tab: 'tresor',
      helpId: 'tresor_dokumente_5',
      label: '6. Firmen-Tresor & Pflichtdokumente'
    },
    {
      step: 7,
      tab: 'compliance',
      helpId: 'compliance_boardroom_4',
      label: '7. Compliance-Radar & Boardroom'
    },
    {
      step: 8,
      tab: 'wissen',
      helpId: 'wissen_filter_list',
      label: '8. Gerichts-Streams & Volltexte'
    }
  ];