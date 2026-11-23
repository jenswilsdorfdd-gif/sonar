// src/config/sonarHelpCatalog.js
// ZENTRALER HILFE- & TOUR-KATALOG FÜR DIE INTERAKTIVE SONAR LIVE-BEDIENHILFE
// Erklärt jedes markierte UI-Element nach dem 3-Fragen-Prinzip:
// 1. Was ist das? | 2. Was passiert beim Klick / Eingeben? | 3. Worauf muss ich achten?

export const SONAR_HELP_CATALOG = {
    // =========================================================================
    // 0. DEFAULT / STARTZUSTAND WENN NOCH KEIN ELEMENT GEWÄHLT IST
    // =========================================================================
    default_welcome: {
      id: 'default_welcome',
      module: 'SONAR Live-Inspektor',
      title: 'Interaktive Bedienhilfe aktiv',
      whatIsIt:
        'Dies ist Ihr persönlicher Echtzeit-Erklärbegleiter für das gesamte SONAR Cockpit.',
      whatHappens:
        'Auf großem Bildschirm (Desktop / Tablet quer) fahren Sie einfach links mit der Maus über einen Bereich oder klicken ein Feld an – hier rechts erscheint sofort die passende Erklärung. Auf dem Smartphone tippen Sie einfach auf eines der kleinen „i“-Symbole.',
      watchOut:
        'Mit dem Pin-Button können Sie eine Erklärung feststellen. Sobald Sie die Live-Hilfe oben in der Kopfleiste ausschalten, verschwinden alle Hilfe-Symbole wieder restlos.'
    },
  
    // =========================================================================
    // 1. GLOBALE STEUERLEISTE & NAVIGATION (Dashboard.jsx)
    // =========================================================================
    nav_tabs: {
      id: 'nav_tabs',
      module: 'Navigation',
      title: 'Hauptmodule des Cockpits',
      whatIsIt:
        'Die zentrale Umschaltleiste zwischen Ihren 6 Arbeitsbereichen: Akten-Cockpit, Firmen-Tresor, Behörden-CRM, Compliance-Radar, Wissensspeicher und System-Handbuch.',
      whatHappens:
        'Ein Klick wechselt sofort die Ansicht, ohne dass ungespeicherte Filter oder Ihre laufende Sitzung verloren gehen.',
      watchOut:
        'Legen Sie neue eigene Gesellschaften zuerst im Reiter „TRESOR“ an, damit Ihre Stammdaten, Steuernummern und Faxnummern später in allen Akten und Schriftsätzen automatisch bereitstehen.'
    },
  
    global_search: {
      id: 'global_search',
      module: 'Globale Suche & Live-Web-Abruf',
      title: 'Universelles Such- & URL-Feld',
      whatIsIt:
        'Ein kombiniertes Such- und Web-Importfeld für das gesamte System.',
      whatHappens:
        'Tippen Sie ein Aktenzeichen, einen Behördennamen oder ein Stichwort ein, um sofort die aktuelle Liste zu filtern. Fügen Sie eine Internetadresse (https://...) ein und bestätigen Sie, lädt das System den Webseiten-Text direkt in Ihr Schreibfenster.',
      watchOut:
        'Wenn in einer Liste scheinbar Einträge fehlen, prüfen Sie kurz, ob hier oben noch ein alter Suchbegriff eingetragen ist.'
    },
  
    header_theme_toggle: {
      id: 'header_theme_toggle',
      module: 'Oberfläche',
      title: 'Hell- / Dunkel-Modus',
      whatIsIt:
        'Schaltet das gesamte Cockpit inklusive KI-War-Room zwischen abgedunkeltem Fokus-Design und tageslichtfreundlichem Hell-Modus um.',
      whatHappens:
        'Alle Karten, Kontraste, Rahmen und der Kanzlei-War-Room passen sich augenblicklich an.',
      watchOut:
        'Für lange Lese-Sessions bei Tageslicht oder vor dem Drucken empfiehlt sich oft der Hell-Modus.'
    },
  
    header_demo_reset: {
      id: 'header_demo_reset',
      module: 'Datenschutz (Demo)',
      title: ' Eigene Testdaten restlos löschen',
      whatIsIt:
        'Ein Ein-Klick-Datenschutz-Reset speziell für Gäste und Demo-Tester.',
      whatHappens:
        'Löscht nach Sicherheitsabfrage unwiderruflich alle von Ihnen selbst hochgeladenen Test-PDFs, Textzwillinge, Testakten, Mandanten und Gegner aus Datenbank und Cloud-Speicher.',
      watchOut:
        'Die 3 schreibgeschützten Musterakten (MUSTER-01 bis MUSTER-03) sowie die globalen Gerichts-Streams bleiben für weitere Tests unberührt erhalten.'
    },
  
    // =========================================================================
    // 2. FRISTEN- & COMPLIANCE-ALARME (AktenAlarme.jsx)
    // =========================================================================
    akten_alarme_panel: {
      id: 'akten_alarme_panel',
      module: 'Fristen- & USt-Radar',
      title: 'Dreistufiges Frühwarnsystem',
      whatIsIt:
        'Überwacht vollautomatisch alle offenen Behördenfristen, internen Wiedervorlagen, Umsatzsteuer-Voranmeldungen (inkl. Dauerfristverlängerung) und gesetzlichen Meldetermine.',
      whatHappens:
        'Ein Klick auf einen Alarmeintrag lädt die zugehörige Akte direkt in Ihre Bearbeitungsmaske und hebt sie unten in der Akten-Übersicht hervor.',
      watchOut:
        'Kritische Fristen ab 2 Tagen Restlaufzeit springen auf „ALARM“. Über das Schnellmenü rechts am Eintrag können Sie Wiedervorlagen verschieben oder direkt nachhaken.'
    },
  
    // =========================================================================
    // 3. AKTEN-FORMULAR, SCANNER & VERSAND (AktenFormular.jsx)
    // =========================================================================
    akten_modus_wahl: {
      id: 'akten_modus_wahl',
      module: 'Akten-Erfassung',
      title: 'Neue Akte anlegen vs. Bestehende Akte ergänzen',
      whatIsIt:
        'Steuert, ob das aktuelle Dokument einen komplett neuen Fall eröffnet oder als weiterer Vorgang (z. B. Antwort, Einspruchsentscheidung, Nachschreiben) an eine laufende Akte angehängt wird.',
      whatHappens:
        'Bei Auswahl einer bestehenden Akte übernimmt das Cockpit automatisch Aktenzeichen, Unser Zeichen, Mandant und Behörde.',
      watchOut:
        'Hängen Sie Folgeschreiben zum selben Streitgegenstand immer an die bestehende Akte an – nur so kennt der KI-War-Room später die lückenlose Vorgeschichte.'
    },
  
    akten_scanner_upload: {
      id: 'akten_scanner_upload',
      module: 'KI-Dokumentenscanner (Twin-Storage)',
      title: 'PDF-Upload & Automatische KI-Triage',
      whatIsIt:
        'Der intelligente Posteingang des Cockpits für Bescheide, Behördenpost, Verträge und Gerichtsschreiben.',
      whatHappens:
        'Liest den PDF-Text direkt im Browser aus, legt synchron einen durchsuchbaren .md-Textzwilling im Tresor-Speicher an und füllt Aktenzeichen, Behörde, Frist, Zusammenfassung und Erst-Einschätzung automatisch vor.',
      watchOut:
        'Prüfen Sie das automatisch erkannte Fristdatum kurz gegen das Zustelldatum auf dem Briefumschlag, bevor Sie speichern.'
    },
  
    akten_stammdaten_block: {
      id: 'akten_stammdaten_block',
      module: 'Akten-Stammdaten',
      title: 'Mandant (Tresor) & Gegenpartei (Behörden-CRM)',
      whatIsIt:
        'Verknüpft den Fall mit Ihrer eigenen Gesellschaft/Person und dem Empfänger (Finanzamt, Behörde, Gericht, Inkasso oder Vertragspartner).',
      whatHappens:
        'Wählen Sie per Dropdown einen gespeicherten Mandanten oder Gegner aus, werden Anschrift, Ansprechpartner, E-Mail und Faxnummer sofort übernommen.',
      watchOut:
        'Für den späteren Direktversand per Telefax oder E-Mail muss beim Gegner entweder eine gültige Faxnummer oder E-Mail-Adresse eingetragen sein.'
    },
  
    akten_fristen_wv: {
      id: 'akten_fristen_wv',
      module: 'Fristen-Steuerung',
      title: 'Externe Notfrist & Interne Wiedervorlage',
      whatIsIt:
        'Trennt scharf zwischen der harten behördlichen/gesetzlichen Frist („Frist Extern“) und Ihrem internen Kontrolltermin („Wiedervorlage“).',
      whatHappens:
        'Mit den Schnellbuttons (+7 Tage, +14 Tage, +1 Monat) setzen Sie Wiedervorlagen mit einem Klick. Ist „Alte Fristen der Akte erledigen“ aktiv, werden überholte Alarme beim Speichern sauber bereinigt.',
      watchOut:
        'Setzen Sie bei eigenen Ausgangsschreiben immer eine Wiedervorlage (z. B. +14 Tage), damit keine ausbleibende Behördenreaktion untergeht.'
    },
  
    akten_warroom_button: {
      id: 'akten_warroom_button',
      module: 'Überkanzlei-Engine',
      title: 'Strategischen Kanzlei-War-Room öffnen',
      whatIsIt:
        'Startet das mehrstufige juristische Analyse- und Schriftsatz-System (Chefabteilungs-Lagebesprechung, Kanzlei Alpha, Spiegel-Kanzlei Omega und Revisionssenat).',
      whatHappens:
        'Lädt vollautomatisch alle bisherigen Schreiben und .md-Volltexte dieser Akte sowie passende Höchstgerichts-Urteile aus dem Wissensspeicher und präsentiert Ihnen bis zu 4 kombinierbare Strategie-Optionen.',
      watchOut:
        'Speichern Sie neu hochgeladene Dokumente idealerweise zuerst zur Akte oder laden Sie den Vorgang aus der Aktenliste, damit alle historischen Zwillinge vollständig verknüpft sind.'
    },
  
    akten_entwurf_versand: {
      id: 'akten_entwurf_versand',
      module: 'Schriftsatz & Direkt-Versand',
      title: 'Schreibfenster, E-Mail- & Telefax-Dispatch',
      whatIsIt:
        'Hier liegt Ihr versandfertiger Schriftsatz-Text (aus dem War-Room übernommen oder frei bearbeitet) inklusive Anhang-Auswahl und Versandsteuerung.',
      whatHappens:
        'Beim Versand per E-Mail oder Telefax erzeugt das Backend automatisch ein mehrseitiges DIN-A4-Schreiben als PDF (inkl. Briefkopf & hinterlegter Signatur), versendet es und archiviert das Ausgangs-PDF direkt in der Akte.',
      watchOut:
        'Vor dem echten Versand muss die Prüf-Bestätigung (Human-in-the-Loop) abgehakt sein. Im Demo-Modus greift eine zweistufige Sicherheitssperre samt Muster-Kennzeichnung.'
    },
  
    akten_speichern_button: {
      id: 'akten_speichern_button',
      module: 'Aktenführung',
      title: 'Vorgang rechtssicher in der Akte speichern',
      whatIsIt:
        'Sichert den aktuellen Posteingang, Aktenvermerk oder Schriftsatz dauerhaft in der Datenbank und lädt angehängte Dateien in den geschützten Cloud-Speicher.',
      whatHappens:
        'Legt die Akte bzw. den neuen Historien-Eintrag an, aktualisiert das Fristen-Radar und schließt neue Vorgänge zum Schutz vor versehentlichem Überschreiben ab.',
      watchOut:
        'Falls das System erkennt, dass Mandant oder Behörde noch nicht im Tresor/CRM stehen, bietet es Ihnen direkt nach dem Speichern die 1-Klick-Übernahme an.'
    },
  
    // =========================================================================
    // 4. AKTEN-ÜBERSICHT & MUSTERAKTEN (AktenListe.jsx)
    // =========================================================================
    akten_liste_overview: {
      id: 'akten_liste_overview',
      module: 'Akten-Übersicht',
      title: 'Laufende Akten, Historie & Showcase-Musterakten',
      whatIsIt:
        'Das zentrale Aktenregister mit Aufklapp-Historie, Schloss-Schutz, Akten-Zusammenführung (Merge), Druckansicht und den 3 schreibgeschützten Demo-Musterakten.',
      whatHappens:
        'Ein Klick auf eine Zeile klappt sämtliche historischen Eingänge und Ausgänge auf. Mit „Laden“ holen Sie jeden Vorgang samt fertigem Schriftsatz oben in die Bearbeitungsmaske und in den War-Room.',
      watchOut:
        'Gesperrte Akten (Schloss-Symbol) schützen vor versehentlichen Tippfehlern. Eigene Akten können Sie per Klick auf das Schloss jederzeit entriegeln; „MUSTER“-Akten sind dauerhaft schreibgeschützt.'
    },
  
    // =========================================================================
    // 5. STRATEGISCHER KANZLEI-WAR-ROOM (MegaLegalModal.jsx)
    // =========================================================================
    warroom_stations: {
      id: 'warroom_stations',
      module: 'War-Room Qualitätskontrolle',
      title: 'Die 4 Pflicht-Stationen (Alpha • Omega • Senat)',
      whatIsIt:
        'Live-Fortschrittsanzeige der gedoppelten Kanzlei-Prüfkette: 1. Kanzlei Alpha (Entwurf), 2. Spiegel-Kanzlei Omega (Gegenprüfung), 3. Delta-Patch, 4. Revisionssenat.',
      whatHappens:
        'Erst wenn alle 4 Stationen fehlerfrei durchlaufen und grün abgenommen sind, wird die Übergabe des Schriftsatzes an das Cockpit freigeschaltet.',
      watchOut:
        'Auf kleinen Bildschirmen können Sie die Kopf- und Stationsleiste kompakt einklappen, damit Sie maximalen Platz zum Lesen der Strategie-Optionen und des Schriftsatzes haben.'
    },
  
    warroom_briefing_options: {
      id: 'warroom_briefing_options',
      module: 'Phase A: Chefabteilungs-Lagebesprechung',
      title: 'Strategie-Karten wählen & kombinieren',
      whatIsIt:
        'Ihre juristische und wirtschaftliche Entscheidungsvorlage vor dem Schreiben – inklusive Kostenrisiko, Verfahrensdauer, Erfolgschance und Prüfung auf gesetzlichen Anwalts-/Steuerberaterzwang.',
      whatHappens:
        'Klicken Sie eine oder mehrere passende Optionen gleichzeitig an (Mehrfachauswahl möglich), ergänzen Sie optional einen eigenen Hinweis und starten Sie über den gelben Button die Ausarbeitung.',
      watchOut:
        'Achten Sie auf die grüne Empfehlung des Leitenden Chefpartners: Oft ist eine zweigleisige Kombination (z. B. Vollstreckungsschutz + sachlicher Erlassantrag) der stärkste Hebel.'
    },
  
    warroom_footer_transfer: {
      id: 'warroom_footer_transfer',
      module: 'Phase B: Korrektur & Übergabe',
      title: 'Nachschärfen, Datei nachreichen & Übergabe',
      whatIsIt:
        'Die Steuerleiste für eigene Zusatzanweisungen, nachgereichte PDF-Anlagen (Büroklammer) und den finalen Transfer ins Akten-Cockpit.',
      whatHappens:
        'Jede Zusatzanweisung wird sofort eingearbeitet und erneut durch Spiegel-Kanzlei Omega geprüft. „Ins Cockpit übergeben“ überträgt den reinen, druckfertigen Brieftext direkt in Ihr Versandfenster.',
      watchOut:
        'Sie können den War-Room jederzeit über „Schließen“ verlassen – ein bereits abgenommener Schriftsatz bleibt in der Akte gespeichert und ist beim nächsten Öffnen sofort wieder da.'
    },
  
    // =========================================================================
    // 6. WEITERE HAUPTMODULE (Tresor, CRM, Compliance, Wissensspeicher)
    // =========================================================================
    tresor_main: {
      id: 'tresor_main',
      module: 'Firmen-Tresor',
      title: 'Gesellschafts-, Steuer-, Bank- & Pflichtdokumenten-Tresor',
      whatIsIt:
        'Verwaltet alle eigenen Firmen und Privatprofile inklusive Rechtsform, WZ-2008-Branche, Steuernummern, HRB, Transparenzregister, Bankkonten und Gesellschaftsdokumenten.',
      whatHappens:
        'Hier hinterlegte Daten speisen automatisch die Briefköpfe, das USt-Radar sowie die Schwellenwert-Berechnungen im Compliance-Radar.',
      watchOut:
        'Wählen Sie bei Privatpersonen die Rechtsform „Privat“, damit gewerbliche IHK-, USt- und Arbeitgeber-Warnungen für dieses Profil automatisch stummgeschaltet bleiben.'
    },
  
    gegner_crm_main: {
      id: 'gegner_crm_main',
      module: 'Behörden- & Gegner-CRM',
      title: 'Zentrales Adress-, Fax- & Abteilungsregister',
      whatIsIt:
        'Speichert Finanzämter, Gerichte, Krankenkassen, Behörden und Vertragspartner inklusive beliebig vieler Abteilungen und Durchwahlen.',
      whatHappens:
        'Einmal angelegte Behörden stehen sofort in jeder Akte per Schnellauswahl bereit – inklusive direkter Fax- und E-Mail-Übergabe.',
      watchOut:
        'Pflegen Sie bei Behörden besonders die direkte Telefaxnummer der zuständigen Stelle (z. B. Erhebungsstelle vs. Rechtsbehelfsstelle), um Zustellnachweise per Faxprotokoll zu sichern.'
    },
  
    compliance_radar_main: {
      id: 'compliance_radar_main',
      module: 'Compliance-Radar & Boardroom',
      title: 'Arbeitgeber-Schwellenwerte & Beschluss-Generator',
      whatIsIt:
        'Überwacht gesetzliche Mitarbeiter-Schwellenwerte (z. B. § 23 KSchG Vollzeit-Richtwert, BetrVG, HinSchG, DGUV, KSK, LUCID) und erstellt fertige Gesellschafterbeschlüsse.',
      whatHappens:
        'Erzeugt auf Knopfdruck mit Ihren echten Tresor-Daten vorausgefüllte Einladungen und GmbH-/UG-Beschlüsse oder legt fällige Prüfpflichten direkt als Wiedervorlage-Akte an.',
      watchOut:
        'Halten Sie die Teilzeit- und Vollzeit-Kopfzahlen im 90-Tage-Check aktuell, damit Schwellenwerte rechtzeitig vor Neueinstellungen erkannt werden.'
    },
  
    wissen_main: {
      id: 'wissen_main',
      module: 'Wissensspeicher & Gerichts-Streams',
      title: 'Volltext-Rechtsdatenbank & Höchstgerichts-Ticker',
      whatIsIt:
        'Ihr zentrales Rechts- und Dokumentengedächtnis mit laufend synchronisierten Entscheidungen der obersten Bundesgerichte (BFH, BGH, BVerwG, BAG, BSG, BVerfG) und Behörden-Streams.',
      whatHappens:
        'Über das Auge-Symbol lesen Sie den ungekürzten Original-Volltext; der KI-War-Room greift bei passenden Paragraphen vollautomatisch auf diese Entscheidungen zu.',
      watchOut:
        'Nutzen Sie die oberen Filter nach Mandant, Behörde oder Stichwort sowie den Button „Weitere Entscheidungen anzeigen (+50)“ am Listenende zum schnellen Durchblättern.'
    }
  };
  
  // Geführte 6-Stationen-Schnelltour für neue Nutzer & Demo-Tester
  export const SONAR_GUIDED_TOUR = [
    {
      step: 1,
      tab: 'akten',
      helpId: 'nav_tabs',
      label: '1. Überblick & Module'
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
      helpId: 'akten_scanner_upload',
      label: '3. KI-Scanner & Posteingang'
    },
    {
      step: 4,
      tab: 'akten',
      helpId: 'akten_warroom_button',
      label: '4. Kanzlei-War-Room (Alpha/Omega)'
    },
    {
      step: 5,
      tab: 'akten',
      helpId: 'akten_liste_overview',
      label: '5. Aktenregister & Musterakten'
    },
    {
      step: 6,
      tab: 'wissen',
      helpId: 'wissen_main',
      label: '6. Gerichts-Streams & Volltexte'
    }
  ];