// src/config/sonarHelpCatalog.js
// ZENTRALER, FEINGRANULARER HILFE- & TOUR-KATALOG FÜR DIE INTERAKTIVE SONAR LIVE-BEDIENHILFE
// Erklärt jedes einzelne Arbeitsfeld, jeden Button und jedes Modul nach dem 3-Fragen-Prinzip:
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
        'Ihr mitarbeitender Echtzeit-Begleiter für jedes einzelne Feld, jeden Scanner-Bereich und jeden Button im SONAR Cockpit.',
      whatHappens:
        'Sobald Sie links in irgendein Eingabefeld klicken (z. B. Magic Import, Web-Scanner, Frist oder Schreibfenster), springt diese Anzeige automatisch auf genau dieses Feld. Ein Klick auf eines der kleinen „i“-Symbole an den Kanten pinnt das Thema fest (bzw. öffnet auf dem Smartphone die Info-Karte).',
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
        'Ein kombiniertes Suchfeld für Akten, Behörden und Urteile – gleichzeitig ein Live-Webseiten-Leser.',
      whatHappens:
        'Normale Suchbegriffe filtern sofort die aktuelle Ansicht. Fügen Sie eine komplette Webadresse (https://...) ein, liest das System den Text der Webseite aus und legt ihn direkt in Ihr Schreibfenster.',
      watchOut:
        'Falls in Ihrer Akten- oder Wissensliste plötzlich Einträge fehlen, prüfen Sie kurz, ob hier noch ein Suchwort steht (Klick auf „✕“ leert den Filter).'
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
    // 2. FRISTEN- & UST-RADAR + EINGANGS-PIPELINE (AktenAlarme.jsx & AktenCockpit.jsx)
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
        'Nach dem Scan sind die Felder bereits fertig befüllt – prüfen Sie kurz Mandant, Gegner und Fristdatum und klicken Sie unten auf Speichern, um die Akte anzulegen bzw. direkt in den War-Room zu starten.'
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
    // 3. AKTEN-ERFASSUNGSFORMULAR IM DETAIL (AktenFormular.jsx)
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
  
    // =========================================================================
    // 4. VERSAND-COCKPIT, SCHREIBFENSTER & SPEICHERN (AktenFormular.jsx)
    // =========================================================================
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
      title: 'Akten-Dokumente beifügen & Eintrag speichern',
      whatIsIt:
        'Der untere Abschlussbereich zum Anhängen von Eingangs-/Akten-PDFs (ohne sofortigen Außenversand) und zum endgültigen Speichern des Vorgangs.',
      whatHappens:
        'Speichert Akte und Historieneintrag in Supabase, erzeugt für jedes hochgeladene PDF automatisch den durchsuchbaren .md-Zwilling im Wissensspeicher und fragt bei Eingängen, ob Sie sofort im War-Room antworten oder eine Wiedervorlage setzen möchten.',
      watchOut:
        'Falls Sie versehentlich ohne Datei auf Speichern klicken, warnt Sie ein kurzer Sicherheits-Dialog vorab („Dateien vergessen?“).'
    },
  
    // =========================================================================
    // 5. AKTEN-ÜBERSICHT & MUSTERAKTEN (AktenListe.jsx)
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
  
    // =========================================================================
    // 6. STRATEGISCHER KANZLEI-WAR-ROOM (MegaLegalModal.jsx)
    // =========================================================================
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
    // 7. TRESOR, GEGNER-CRM, COMPLIANCE & WISSEN
    // =========================================================================
    tresor_main: {
      id: 'tresor_main',
      module: 'WIR – Firmen-Tresor',
      title: 'Mandanten-, Steuer-, Bank- & Gesellschafts-Tresor',
      whatIsIt:
        'Verwaltet alle eigenen Gesellschaften und Privatpersonen inklusive Rechtsform, WZ-2008-Branchenschlüssel, Steuernummern, HRB, Transparenzregister, mehreren Bankkonten und Gesellschaftsverträgen.',
      whatHappens:
        'Versorgt Akten-Cockpit, Briefköpfe, USt-Radar und Compliance-Radar zentral mit allen Stammdaten und prüft automatisch, welche Pflichtdokumente im Tresor noch fehlen.',
      watchOut:
        'Stellen Sie bei Privatpersonen die Rechtsform auf „Privat“ (oder aktivieren Sie „Gewerbliche Compliance deaktivieren“), damit keine unpassenden Arbeitgeber- oder USt-Alarme ausgelöst werden.'
    },
  
    gegner_crm_main: {
      id: 'gegner_crm_main',
      module: 'GEGNER – Behörden-CRM',
      title: 'Zentrales Behörden-, Gerichts- & Ansprechpartner-Verzeichnis',
      whatIsIt:
        'Ihre strukturierte Kontaktdatenbank für Ämter, Finanzämter, Gerichte, Kassen und Gegner – inklusive beliebig vieler Unterabteilungen und Sachbearbeiter pro Behörde.',
      whatHappens:
        'Hier gespeicherte Faxnummern, Durchwahlen und Abteilungs-E-Mails stehen sofort in jeder neuen und bestehenden Akte per 1-Klick-Dropdown bereit.',
      watchOut:
        'Hinterlegen Sie unterschiedliche Stellen eines Amts (z. B. Veranlagung vs. Erhebungs-/Vollstreckungsstelle) einfach als eigene Ansprechpartner-Zeilen unter derselben Behörde.'
    },
  
    compliance_radar_main: {
      id: 'compliance_radar_main',
      module: 'COMPLIANCE – Radar & Boardroom',
      title: 'Schwellenwert-Überwachung & Gesellschafterbeschluss-Generator',
      whatIsIt:
        'Prüft anhand Ihrer Mitarbeiterstruktur (§ 23 KSchG Teilzeit-/Vollzeit-Rechner) und Branche alle gesetzlichen Arbeitgeberpflichten und generiert fertige GmbH-/UG-Beschlüsse.',
      whatHappens:
        'Mit einem Klick wandeln Sie fällige Pflichten (z. B. DGUV, KSK bis 31.03., LUCID bis 15.05.) in eine echte Wiedervorlage-Akte um oder erstellen vorausgefüllte Gesellschafter-Einladungen samt Versand-Option.',
      watchOut:
        'Nutzen Sie den „90-Tage-Pulse-Check“, sobald sich Mitarbeiterzahlen, Teilzeitquoten oder Geschäftsmodell ändern.'
    },
  
    wissen_main: {
      id: 'wissen_main',
      module: 'WISSEN – Rechtsdatenbank & Streams',
      title: 'Gerichts-Streams (RSS-Monitor), Bulk-Upload & Volltext-Archiv',
      whatIsIt:
        'Das juristische Langzeitgedächtnis des Systems: Überwacht live 25 Gerichts- und Behörden-Feeds (BFH, BGH, BVerwG, BAG, BSG, BVerfG, BMF u. a.) und speichert alle Akten-Volltexte.',
      whatHappens:
        'Über das Auge-Symbol öffnen Sie den ungekürzten Original-Volltext aus dem Storage; im Hintergrund zieht sich der KI-War-Room passende Entscheidungen bei jedem Rechtsfall vollautomatisch heran.',
      watchOut:
        'Über die Umschalter filtern Sie gezielt nach Mandant oder Gegner; der RSS-Health-Monitor oben zeigt sofort an, falls eine behördliche Feed-URL gewartet werden muss.'
    }
  };
  
  // Geführte 8-Stationen-Schnelltour quer durch die wichtigsten Arbeitsfelder
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
      helpId: 'akten_modus_wahl',
      label: '5. Akten-Maske & Zuordnung'
    },
    {
      step: 6,
      tab: 'akten',
      helpId: 'akten_btn_warroom',
      label: '6. Strategischer Kanzlei-War-Room'
    },
    {
      step: 7,
      tab: 'akten',
      helpId: 'akten_btn_fax_send',
      label: '7. Direkt-Versand (E-Mail & Telefax)'
    },
    {
      step: 8,
      tab: 'akten',
      helpId: 'akten_liste_overview',
      label: '8. Akten-Register & Musterakten'
    }
  ];