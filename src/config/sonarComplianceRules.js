// src/config/sonarComplianceRules.js
// JURISTISCHE MASTER-KONFIGURATION: SONAR COMPLIANCE RADAR & BOARDROOM
// Stand: 2026 | Rechtsstand: MoPeG, BEG IV, HinSchG, DSGVO, GmbHG, AO, SGB IV/VII/IX

export const RECHTSFORMEN = [
    { id: 'Einzelunternehmen', label: 'Einzelunternehmen (Kleingewerbe / Freiberufler)', category: 'einzel' },
    { id: 'e.K.', label: 'Eingetragener Kaufmann (e.K.)', category: 'einzel_hr' },
    { id: 'GbR', label: 'Gesellschaft bürgerlichen Rechts (GbR)', category: 'personen' },
    { id: 'eGbR', label: 'Eingetragene GbR (eGbR nach § 707a BGB)', category: 'personen_hr' },
    { id: 'OHG', label: 'Offene Handelsgesellschaft (OHG)', category: 'personen_hr' },
    { id: 'KG', label: 'Kommanditgesellschaft (KG)', category: 'personen_hr' },
    { id: 'GmbH & Co. KG', label: 'GmbH & Co. KG', category: 'hybrid' },
    { id: 'UG', label: 'UG (haftungsbeschränkt) nach § 5a GmbHG', category: 'kapital' },
    { id: 'GmbH', label: 'Gesellschaft mit beschränkter Haftung (GmbH)', category: 'kapital' },
    { id: 'AG', label: 'Aktiengesellschaft (AG)', category: 'kapital' }
  ];
  
  // BERECHNUNGS-HELPER FÜR § 23 ABS. 1 SATZ 4 KSchG (KÜNDIGUNGSSCHUTZ-SCHWELLE > 10,0 FTE)
  export function calculateKSchGFTE(partTimeUpTo20 = 0, partTimeUpTo30 = 0, fullTimeOver30 = 0) {
    return Number(((Number(partTimeUpTo20 || 0) * 0.5) + (Number(partTimeUpTo30 || 0) * 0.75) + (Number(fullTimeOver30 || 0) * 1.0)).toFixed(2));
  }
  
  // 1. PFLICHT-STAMMDOKUMENTE IM FIRMENTRESOR (MATCHING ÜBER #label=...)
  export const REQUIRED_VAULT_DOCUMENTS = [
    {
      id: 'doc_gewerbeanmeldung',
      labelHash: 'Gewerbeanmeldung',
      title: 'Gewerbeanmeldung (§ 14 Abs. 1 GewO)',
      appliesTo: ['Einzelunternehmen', 'e.K.', 'GbR', 'eGbR', 'OHG', 'KG', 'GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 0,
      unloeschbar: false,
      legalBasis: '§ 14 Abs. 1 GewO i. V. m. § 146 Abs. 2 Nr. 2 GewO',
      riskWarning: 'Bei fehlender Anmeldung oder unterlassener Ummeldung nach Sitzverlegung/Gegenstandsänderung drohen bis zu 1.000 EUR Bußgeld.'
    },
    {
      id: 'doc_steuer_erfassung',
      labelHash: 'Steuernummer-Bescheid',
      title: 'Steuerliche Erfassung / Steuernummer & USt-IdNr. (§ 138 AO, § 27a UStG)',
      appliesTo: ['Einzelunternehmen', 'e.K.', 'GbR', 'eGbR', 'OHG', 'KG', 'GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 0,
      unloeschbar: false,
      legalBasis: '§ 138 Abs. 1 und 4 AO',
      riskWarning: 'Anzeigefrist 1 Monat nach Betriebseröffnung. Ohne gültige Steuernummer/USt-IdNr. kein Vorsteuerabzug aus Ausgangsrechnungen (§ 14 Abs. 4 UStG).'
    },
    {
      id: 'doc_bg_mitgliedsschein',
      labelHash: 'BG-Mitgliedsschein',
      title: 'Mitgliedsschein Berufsgenossenschaft (§ 192 Abs. 1 SGB VII)',
      appliesTo: ['Einzelunternehmen', 'e.K.', 'GbR', 'eGbR', 'OHG', 'KG', 'GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 0,
      unloeschbar: false,
      legalBasis: '§ 192 Abs. 1 SGB VII i. V. m. § 209 Abs. 1 Nr. 8 SGB VII',
      riskWarning: 'Pflichtanmeldung binnen 1 Woche nach Unternehmensbeginn (auch ohne Mitarbeiter!). Bußgeld bis 2.500 EUR.'
    },
    {
      id: 'doc_gesellschaftsvertrag',
      labelHash: 'Gesellschaftsvertrag',
      title: 'Aktueller Gesellschaftsvertrag / Satzung (§ 2 GmbHG / § 705 BGB)',
      appliesTo: ['GbR', 'eGbR', 'OHG', 'KG', 'GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 0,
      unloeschbar: true,
      legalBasis: '§ 2 GmbHG, §§ 705 ff. BGB, §§ 105 ff. HGB',
      riskWarning: 'Verfassungsurkunde der Gesellschaft. Bestimmt Vertretungsmacht, Ladungsfristen und Gewinnverteilung.'
    },
    {
      id: 'doc_handelsregisterauszug',
      labelHash: 'Handelsregisterauszug',
      title: 'Aktueller & Chronologischer Handels-/Gesellschaftsregisterauszug',
      appliesTo: ['e.K.', 'eGbR', 'OHG', 'KG', 'GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 0,
      unloeschbar: false,
      legalBasis: '§§ 15, 29 HGB, § 707a BGB, § 35 GmbHG',
      riskWarning: 'Legitimationsnachweis im Rechtsverkehr und Prüfung der Befreiung von § 181 BGB (Insichgeschäft).'
    },
    {
      id: 'doc_gesellschafterliste',
      labelHash: 'Gesellschafterliste',
      title: 'Im Handelsregister aufgenommene Gesellschafterliste (§ 40 GmbHG)',
      appliesTo: ['GmbH & Co. KG', 'UG', 'GmbH'],
      minHeadcount: 0,
      unloeschbar: true,
      legalBasis: '§ 16 Abs. 1 GmbHG, § 40 Abs. 1 GmbHG',
      riskWarning: 'KRITISCH: Nach § 16 Abs. 1 GmbHG gilt gegenüber der Gesellschaft NUR als Gesellschafter (stimm- & gewinnberechtigt), wer in dieser Liste im HR steht!'
    },
    {
      id: 'doc_stammkapital_nachweis',
      labelHash: 'Stammkapital-Einzahlungsnachweis',
      title: 'Nachweis der Stammkapitaleinzahlung (Kontoauszug Gründung § 7 Abs. 2 GmbHG)',
      appliesTo: ['GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 0,
      unloeschbar: true,
      legalBasis: '§ 7 Abs. 2 GmbHG, § 19 GmbHG (BGH, Urt. v. 19.01.2016 – II ZR 61/15)',
      riskWarning: 'LEBENSWICHTIG (UNLÖSCHBAR): Der Gesellschafter trägt auch nach 10+ Jahren in der Insolvenz die volle Beweislast für die Einzahlung der Stammeinlage!'
    },
    {
      id: 'doc_transparenzregister',
      labelHash: 'Transparenzregister-Auszug',
      title: 'Eintragungsbestätigung Transparenzregister (§ 20 Abs. 1 GwG)',
      appliesTo: ['eGbR', 'OHG', 'KG', 'GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 0,
      unloeschbar: false,
      legalBasis: '§ 20 Abs. 1 GwG i. V. m. § 56 Abs. 1 Nr. 55 GwG',
      riskWarning: 'Pflicht zur Meldung der wirtschaftlich Berechtigten (auch bei eGbR!). Bei Verstoß oder veralteter Wohnadresse des GF drohen bis zu 150.000 EUR Bußgeld durch das Bundesverwaltungsamt.'
    },
    {
      id: 'doc_gf_anstellungsvertrag',
      labelHash: 'GF-Anstellungsvertrag',
      title: 'Geschäftsführer-Anstellungsvertrag inkl. Gesellschafterbeschluss (§ 46 Nr. 5 GmbHG)',
      appliesTo: ['GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 0,
      unloeschbar: true,
      legalBasis: '§ 46 Nr. 5 GmbHG, § 8 Abs. 3 Satz 2 KStG (BFH, Urt. v. 11.12.1991 – I R 49/90)',
      riskWarning: 'STEUERFALLE vGA: Ohne schriftlichen Vorab-Vertrag und Gesellschafterbeschluss stuft das Finanzamt GF-Gehälter, Boni und PKW-Nutzung rückwirkend als verdeckte Gewinnausschüttung ein!'
    },
    {
      id: 'doc_betriebsnummer',
      labelHash: 'Betriebsnummer-Bescheid',
      title: 'Bescheid über Betriebsnummer der Bundesagentur für Arbeit (§ 18i SGB IV)',
      appliesTo: ['Einzelunternehmen', 'e.K.', 'GbR', 'eGbR', 'OHG', 'KG', 'GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 1,
      unloeschbar: false,
      legalBasis: '§ 18i Abs. 1 SGB IV, § 28a SGB IV',
      riskWarning: 'Zwingend ab dem 1. Mitarbeiter (auch Minijobber) für die Sozialversicherungsmeldung erforderlich.'
    },
    {
      id: 'doc_gefaehrdungsbeurteilung',
      labelHash: 'Gefaehrdungsbeurteilung',
      title: 'Dokumentierte Gefährdungsbeurteilung & Unterweisungsnachweis (§§ 5, 12 ArbSchG)',
      appliesTo: ['Einzelunternehmen', 'e.K.', 'GbR', 'eGbR', 'OHG', 'KG', 'GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 1,
      unloeschbar: false,
      legalBasis: '§§ 5, 6, 12 ArbSchG i. V. m. § 4 DGUV Vorschrift 1',
      riskWarning: 'Pflicht ab dem 1. Mitarbeiter! Bei Arbeitsunfällen ohne dokumentierte Gefährdungsbeurteilung droht Regress der Berufsgenossenschaft gegen den Geschäftsführer (§ 110 SGB VII).'
    },
    {
      id: 'doc_dsb_benennung',
      labelHash: 'Datenschutzbeauftragter-Benennung',
      title: 'Urkunde Benennung Datenschutzbeauftragter & Behördenmeldung (§ 38 BDSG)',
      appliesTo: ['Einzelunternehmen', 'e.K.', 'GbR', 'eGbR', 'OHG', 'KG', 'GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      minHeadcount: 20,
      unloeschbar: false,
      legalBasis: 'Art. 37 Abs. 7 DSGVO i. V. m. § 38 Abs. 1 Satz 1 BDSG',
      riskWarning: 'Ab 20 Personen, die ständig automatisiert personenbezogene Daten verarbeiten (PC/E-Mail), zwingend zu benennen und der Landesdatenschutzbehörde zu melden!'
    }
  ];
  
  // 2. MITARBEITER-SCHWELLENWERT-MATRIX (HEADCOUNT- & FTE-TRIGGER)
  export const HEADCOUNT_THRESHOLDS = [
    {
      threshold: 1,
      metric: 'headcount_total',
      title: 'SCHWELLE 1 MITARBEITER: Eintritt in den Arbeitgeber-Status',
      severity: 'CRITICAL',
      legalBasis: '§ 18i SGB IV, § 28a Abs. 4 SGB IV, § 2 NachwG, §§ 3, 5, 10, 12 ArbSchG, § 17 MiLoG',
      obligations: [
        'Betriebsnummer beim Betriebsnummern-Service (BNS) der Agentur für Arbeit elektronisch beantragen (§ 18i SGB IV).',
        'SOFORTMELDUNG (§ 28a Abs. 4 SGB IV) in Branchen nach SchwarzArbG (Bau, Gastro, Logistik, Reinigung, Immobilien) VOR Arbeitsantritt abgeben (sonst bis 25.000 EUR Zoll-Bußgeld!).',
        'Arbeitsvertrag nach § 2 NachwG erstellen (Textform nach BEG IV zulässig, außer in § 2a SchwarzArbG-Branchen -> dort strenge Schriftform nach § 126 BGB!).',
        'Systematische elektronische Arbeitszeiterfassung ab Tag 1 einrichten (BAG, Beschl. v. 13.09.2022 – 1 ABR 22/21; bei Minijobs binnen 7 Tagen nach § 17 Abs. 1 MiLoG!).',
        'Gefährdungsbeurteilung (§ 5 ArbSchG) erstellen, Ersthelfer (§ 26 DGUV V1) & Brandschutzhelfer (ASR A2.2: mind. 5 % der Belegschaft) bestellen und Erstunterweisung (§ 12 ArbSchG) dokumentieren.',
        'Aushangpflichtige Gesetze (ArbZG, AGG, MuSchG, TzBfG) im Betrieb oder digital im Intranet zugänglich machen.'
      ]
    },
    {
      threshold: 5,
      metric: 'headcount_total',
      title: 'SCHWELLE 5 MITARBEITER: Betriebsratsfähigkeit (§ 1 BetrVG)',
      severity: 'WARNING',
      legalBasis: '§ 1 Abs. 1 Satz 1 BetrVG, § 15 Abs. 3a KSchG',
      obligations: [
        'Betrieb ist ab 5 ständigen wahlberechtigten Arbeitnehmern (davon 3 wählbar) betriebsratsfähig (§ 1 Abs. 1 BetrVG).',
        'Beachte bei Konflikten den besonderen Kündigungsschutz für Wahlinitiatoren (§ 15 Abs. 3a KSchG).'
      ]
    },
    {
      threshold: 10.01,
      metric: 'fte_kschg',
      title: 'SCHWELLE > 10 VOLLZEITÄQUIVALENTE (FTE): Allgemeiner Kündigungsschutz (§ 23 KSchG)!',
      severity: 'CRITICAL',
      legalBasis: '§ 23 Abs. 1 Satz 3 und 4 KSchG, Anhang 4.2 Abs. 1 ArbStättV',
      obligations: [
        'ACHTUNG KÜNDIGUNGSSCHUTZ: Mit Überschreiten von 10,0 FTE (Teilzeit <=20h = 0,5; <=30h = 0,75; >30h = 1,0) greift das Kündigungsschutzgesetz (§ 1 KSchG) für alle nach dem 31.12.2003 eingestellten Arbeitnehmer nach 6 Monaten Wartezeit!',
        'Strategischer Hinweis vor Neueinstellung: Prüfe bei genau 10,0 FTE, ob durch Teilzeit-Stückelung (<= 20 Std.) oder externe Vergabe der Schwellenwert von <= 10,0 FTE gehalten werden kann.',
        'Ab mehr als 10 Beschäftigten: Pflicht zur Bereitstellung eines Pausenraums bzw. Pausenbereichs nach Anhang 4.2 Abs. 1 ArbStättV.'
      ]
    },
    {
      threshold: 20,
      metric: 'headcount_total',
      title: 'SCHWELLE 20 MITARBEITER: Schwerbehindertenabgabe, Datenschutzbeauftragter & Arbeitsschutzausschuss!',
      severity: 'CRITICAL',
      legalBasis: '§ 154 Abs. 1 SGB IX, § 38 Abs. 1 BDSG, § 22 SGB VII, § 11 ASiG, §§ 99, 111 BetrVG, § 17 KSchG',
      obligations: [
        'SCHWERBEHINDERTEN-PFLICHTPLATZ (§ 154 Abs. 1 SGB IX): Ab 20 Arbeitsplätzen müssen 5 % (mind. 1 Platz) mit schwerbehinderten Menschen besetzt werden. Jährliche Meldung bis 31.03. an die Agentur für Arbeit (§ 163 Abs. 2 SGB IX) + ggf. Ausgleichsabgabe (140 bis 720 EUR/Monat nach § 160 SGB IX).',
        'DATENSCHUTZBEAUFTRAGTER (§ 38 Abs. 1 BDSG): Ab 20 Personen, die ständig automatisiert personenbezogene Daten verarbeiten, muss ein interner oder externer DSB schriftlich bestellt und der Aufsichtsbehörde (Art. 37 Abs. 7 DSGVO) gemeldet werden!',
        'SICHERHEITSBEAUFTRAGTER (§ 22 SGB VII i. V. m. § 20 DGUV V1): Bei mehr als 20 Beschäftigten schriftliche Bestellung eines Sicherheitsbeauftragten Pflicht.',
        'ARBEITSSCHUTZAUSSCHUSS – ASA (§ 11 ASiG): Bei mehr als 20 Beschäftigten Bildung eines ASA, der mindestens 1x pro Quartal (alle 3 Monate) tagen und protokolliert werden muss!',
        'MASSENENTLASSUNGSSCHWELLE (§ 17 Abs. 1 Satz 1 Nr. 1 KSchG): Bei > 20 Mitarbeitern ist schon die Entlassung von > 5 Arbeitnehmern binnen 30 Tagen vorab bei der Agentur für Arbeit anzeigepflichtig (sonst Nichtigkeit nach § 134 BGB!).'
      ]
    },
    {
      threshold: 31,
      metric: 'headcount_total',
      title: 'SCHWELLE > 30 MITARBEITER: Wegfall der Umlage U1 (Entgeltfortzahlungsversicherung)',
      severity: 'WARNING',
      legalBasis: '§ 1 Abs. 1 AAG (Aufwendungsausgleichsgesetz)',
      obligations: [
        'Ab mehr als 30 Arbeitnehmern endet zum Beginn des nächsten Kalenderjahres die Teilnahme am U1-Erstattungsverfahren bei Krankheit (§ 1 Abs. 1 AAG). Das volle Lohnfortzahlungsrisiko (§ 3 EFZG) liegt nun beim Unternehmen!'
      ]
    },
    {
      threshold: 50,
      metric: 'headcount_total',
      title: 'SCHWELLE 50 MITARBEITER: Interne Meldestelle (HinSchG) & Bilanz-Prüfungspflicht (§ 267 HGB)!',
      severity: 'CRITICAL',
      legalBasis: '§§ 12, 40 Abs. 2 Nr. 2 HinSchG, §§ 267 Abs. 2, 316 Abs. 1 HGB',
      obligations: [
        'WHISTLEBLOWER-MELDESTELLE (§ 12 Abs. 1 HinSchG): Ab 50 Beschäftigten (nach Köpfen!) zwingende Einrichtung einer internen Meldestelle nach dem Hinweisgeberschutzgesetz. Bei Fehlen drohen bis zu 20.000 EUR Bußgeld (§ 40 Abs. 6 HinSchG)!',
        'MITTELGROSSE KAPITALGESELLSCHAFT (§ 267 Abs. 2 HGB): Werden > 50 Arbeitnehmer im Jahresdurchschnitt + Bilanzsumme (> 7,5 Mio. EUR) oder Umsatz (> 15 Mio. EUR) an 2 Stichtagen überschritten, besteht zwingende Wirtschaftsprüfer-Pflicht nach § 316 Abs. 1 HGB!'
      ]
    }
  ];
  
  // 3. UNTERJÄHRIGER BEHÖRDEN-, ABGABEN- & FRISTEN-TICKER (AUTOMATISCHE ALARME)
  export const RECURRING_COMPLIANCE_DEADLINES = [
    {
      id: 'ticker_sv_beitraege',
      cycle: 'MONTHLY',
      dueRule: '5. drittletzter Bankarbeitstag (Beitragsnachweis) / drittletzter Bankarbeitstag (Zahlung)',
      title: 'Sozialversicherungs-Beitragsnachweis & Zahlung (§ 23 Abs. 1 SGB IV)',
      minHeadcount: 1,
      legalBasis: '§ 23 Abs. 1 SGB IV, § 28f SGB IV i. V. m. § 266a StGB',
      warningText: 'STRENGSTE ORGANHAFTUNG: Das Nichtabführen von Arbeitnehmeranteilen zur Sozialversicherung bei Fälligkeit ist nach § 266a Abs. 1 StGB strafbar und begründet die unbeschränkte persönliche Deliktshaftung des Geschäftsführers (§ 823 Abs. 2 BGB)!'
    },
    {
      id: 'ticker_ustva_lst',
      cycle: 'MONTHLY',
      dueRule: '10. Tag jedes Kalendermonats (+ 3 Tage Zahlungsschonfrist nach § 240 Abs. 3 AO)',
      title: 'Umsatzsteuer-Voranmeldung (UStVA) & Lohnsteuer-Anmeldung (§ 18 UStG, § 41a EStG)',
      minHeadcount: 0,
      legalBasis: '§ 18 Abs. 1 UStG, § 41a Abs. 1 EStG, §§ 34, 69, 152, 240 AO',
      warningText: 'Verspätete Abgabe triggert Verspätungszuschläge (§ 152 AO); Nichtabführung von Lohnsteuer führt zur persönlichen Haftung des Geschäftsführers nach § 69 AO!'
    },
    {
      id: 'ticker_bg_lohnnachweis',
      cycle: 'YEARLY',
      month: 2,
      day: 16,
      title: 'Berufsgenossenschaft: Digitaler Lohnnachweis & UV-Jahresmeldung (Frist: 16.02.)',
      minHeadcount: 1,
      legalBasis: '§ 165 Abs. 1 SGB VII, § 28a Abs. 2a SGB IV',
      warningText: 'Bis spätestens 16. Februar muss der digitale Lohnnachweis des Vorjahres über den UV-Stammdatendienst an die Berufsgenossenschaft übermittelt sein (sonst Strafschätzung + Bußgeld nach § 209 SGB VII).'
    },
    {
      id: 'ticker_ksk_meldung',
      cycle: 'YEARLY',
      month: 3,
      day: 31,
      title: 'Künstlersozialkasse (KSK): Jahresmeldung Verwerterabgabe 5,0 % (Frist: 31.03.)',
      minHeadcount: 0,
      legalBasis: '§§ 24, 27, 36 Abs. 3 KSG',
      warningText: 'Wurden im Vorjahr externe Designer, Texter, Fotografen, Webentwickler (mit Gestaltung), Musiker oder Influencer (> 1.000 EUR/Jahr gesamt) beauftragt? Meldung bis 31.03. abgeben – sonst bis 50.000 EUR Bußgeld bei DRV-Betriebsprüfung!'
    },
    {
      id: 'ticker_schwerbehinderten_anzeige',
      cycle: 'YEARLY',
      month: 3,
      day: 31,
      title: 'Bundesagentur für Arbeit: Schwerbehinderten-Anzeige IW-Elan (Frist: 31.03.)',
      minHeadcount: 20,
      legalBasis: '§ 163 Abs. 2 SGB IX, § 160 SGB IX',
      warningText: 'Ausschlussfrist 31. März für Unternehmen ab 20 Arbeitsplätzen: Anzeige an die Agentur für Arbeit übermitteln und Ausgleichsabgabe überweisen.'
    },
    {
      id: 'ticker_lucid_verpackg',
      cycle: 'YEARLY',
      month: 5,
      day: 15,
      title: 'Verpackungsregister LUCID: Jahresmengenmeldung (§§ 9, 10 VerpackG)',
      minHeadcount: 0,
      legalBasis: '§§ 9, 10, 11, 36 Abs. 2 VerpackG',
      warningText: 'Jeder Versandhändler/Hersteller, der Versandkartons oder Produktverpackungen befüllt, muss im Register LUCID registriert sein und seine Jahresmengen melden (Bußgeld bis 200.000 EUR + Verkaufsverbot!).'
    },
    {
      id: 'ticker_ja_feststellung',
      cycle: 'YEARLY',
      month: 8,
      day: 31,
      title: 'Gesellschafterbeschluss: Feststellung Jahresabschluss & GF-Entlastung (§ 42a, § 46 GmbHG)',
      minHeadcount: 0,
      appliesTo: ['GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      legalBasis: '§ 42a Abs. 2 GmbHG, § 46 Nr. 1 und Nr. 5 GmbHG, § 5a Abs. 3 GmbHG',
      warningText: 'Jahresabschluss feststellen (Frist 8 bzw. 11 Monate), bei UG zwingend 25 % gesetzliche Rücklage (§ 5a Abs. 3 GmbHG) bilden und Entlastungsbeschluss für die Geschäftsführung (§ 46 Nr. 5 GmbHG) im Tresor sichern!'
    },
    {
      id: 'ticker_verjaehrung_check',
      cycle: 'YEARLY',
      month: 11,
      day: 15,
      title: 'Silvester-Verjährungs-Alarm (§§ 195, 199 BGB): Offene Forderungen aus dem drittletzten Jahr prüfen!',
      minHeadcount: 0,
      legalBasis: '§§ 195, 199 Abs. 1, 204 Abs. 1 Nr. 3 BGB',
      warningText: 'Am 31.12. um 24:00 Uhr verjähren alle offenen Rechnungen und Ansprüche aus dem drittvorangegangenen Kalenderjahr! Verjährungshemmung nur durch gerichtlichen Mahnbescheid, Klage oder schriftlichen Verjährungsverzicht des Schuldners!'
    },
    {
      id: 'ticker_bundesanzeiger_offenlegung',
      cycle: 'YEARLY',
      month: 12,
      day: 31,
      title: 'Unternehmensregister: Offenlegung / Hinterlegung Jahresabschluss (§ 325 HGB – Frist: 31.12.)',
      minHeadcount: 0,
      appliesTo: ['GmbH & Co. KG', 'UG', 'GmbH', 'AG'],
      legalBasis: '§§ 325, 326, 335 HGB',
      warningText: 'Zwingende elektronische Einreichung des Vorjahresabschlusses beim Unternehmensregister bis 31.12.! Ab 01.01. leitet das Bundesamt für Justiz (BfJ) automatisch Ordnungsgeldverfahren (§ 335 HGB: 2.500 bis 25.000 EUR) ein.'
    },
    {
      id: 'ticker_arbeitsschutz_dguv_unterweisung',
      cycle: 'YEARLY',
      month: 10,
      day: 1,
      title: 'Pflicht-Jahresunterweisung: Arbeitsschutz, Brandschutz, Erste Hilfe & DSGVO (§ 12 ArbSchG)',
      minHeadcount: 1,
      legalBasis: '§ 12 Abs. 1 ArbSchG, § 4 DGUV Vorschrift 1, Art. 32 Abs. 4 DSGVO',
      warningText: 'Alle Beschäftigten müssen mindestens 1x jährlich nachweislich im Arbeitsschutz/Brandschutz sowie im Datenschutz unterwiesen werden; alle 2 Jahre Ersthelfer-Fortbildung (§ 26 Abs. 3 DGUV V1) und DGUV-V3-Elektroprüfung prüfen!'
    }
  ];
  
  // 4. DIE 5 WASSERDICHTEN BOARDROOM- & BESCHLUSS-VORLAGEN (INKL. EINLADUNGS-GENERATOR)
  export const BOARDROOM_TEMPLATES = [
    {
      id: 'tpl_einladung_gv',
      title: '1. Formwirksame Einladung zur Gesellschafterversammlung (§ 51 GmbHG)',
      category: 'Einladung',
      legalBasis: '§§ 49, 51 Abs. 1, 2 und 4 GmbHG',
      description: 'Rechtssichere Einberufung unter Wahrung der gesetzlichen 1-Wochen-Ladungsfrist (+ Postlaufzeit) und der 3-Tages-Frist für die Tagesordnung.',
      templateText: `ABSENDER:
  <Firmenname der GmbH / UG (haftungsbeschränkt)>
  Vertreten durch die Geschäftsführung: <Vorname Nachname Geschäftsführer>
  <Straße Hausnummer>, <PLZ Ort>
  
  AN DEN GESELLSCHAFTER:
  <Vorname Nachname / Firma des Gesellschafters>
  <Straße Hausnummer>, <PLZ Ort>
  
  Per Einschreiben / Vorab per E-Mail (gemäß § 51 Abs. 1 GmbHG / Gesellschaftsvertrag)
  
  Datum: <TT.MM.JJJJ>
  
  EINLADUNG ZUR ORDENTLICHEN / AUSSERORDENTLICHEN GESELLSCHAFTERVERSAMMLUNG
  der <Firmenname der GmbH / UG (haftungsbeschränkt)> (Amtsgericht <Ort>, <HRB-Nummer>)
  
  Sehr geehrte(r) Mitgesellschafter(in) <Nachname>,
  
  hiermit berufen wir als einzelvertretungsberechtigte Geschäftsführung gemäß § 35 Abs. 1 Satz 1, § 49 Abs. 1, § 51 Abs. 1 des Gesetzes betreffend die Gesellschaften mit beschränkter Haftung (GmbHG) in Verbindung mit den Bestimmungen unseres Gesellschaftsvertrages frist- und formgerecht eine Gesellschafterversammlung ein:
  
  Termin: <Wochentag>, den <TT.MM.JJJJ> (unter Wahrung der Mindestladungsfrist von 7 Kalendertagen zzgl. Laufzeit gemäß § 51 Abs. 1 Satz 2 GmbHG i. V. m. §§ 187 Abs. 1, 188 Abs. 2 BGB)
  Uhrzeit: <HH:MM> Uhr
  Ort: Geschäftsräume der Gesellschaft, <Straße Hausnummer, PLZ Ort>
  
  TAGESORDNUNG (§ 51 Abs. 2 und 4 GmbHG):
  
  TOP 1: Feststellung der Beschlussfähigkeit sowie Vorlage und Erörterung des Jahresabschlusses zum <31.12.JJJJ>
  TOP 2: Beschlussfassung über die Feststellung des Jahresabschlusses zum <31.12.JJJJ> (§ 46 Nr. 1, § 42a Abs. 2 GmbHG)
  TOP 3: Beschlussfassung über die Ergebnisverwendung (Einstellung in die gesetzliche Rücklage nach § 5a Abs. 3 GmbHG / Gewinnvortrag / Ausschüttung nach § 29 GmbHG)
  TOP 4: Beschlussfassung über die Entlastung der Geschäftsführung für das Geschäftsjahr <JJJJ> (§ 46 Nr. 5 GmbHG)
  TOP 5: Verschiedenes
  
  Die zur Vorbereitung auf die Tagesordnungspunkte erforderlichen Unterlagen (insbesondere der Entwurf des Jahresabschlusses) liegen dieser Einladung in Kopie bei und können zudem in den Geschäftsräumen der Gesellschaft eingesehen werden.
  
  Mit freundlichen Grüßen
  
  ________________________________________
  <Firmenname der GmbH / UG (haftungsbeschränkt)>
  <Vorname Nachname>, Geschäftsführer`
    },
    {
      id: 'tpl_beschluss_jahresabschluss_entlastung',
      title: '2. Gesellschafterbeschluss: Jahresabschluss, Ergebnisverwendung (inkl. UG-Rücklage) & GF-Entlastung',
      category: 'Pflichtbeschluss (Jährlich)',
      legalBasis: '§ 46 Nr. 1 und Nr. 5, § 42a Abs. 2, § 51 Abs. 3, § 5a Abs. 3 GmbHG',
      description: 'Kombiniert die Feststellung des Jahresabschlusses, die korrekte Thesaurierung (25 % Pflichtrücklage bei UG zur Vermeidung der Nichtigkeit nach § 241 Nr. 3 AktG analog) und die haftungsbefreiende Entlastung des Geschäftsführers.',
      templateText: `PROTOKOLL DER GESELLSCHAFTERVERSAMMLUNG & GESELLSCHAFTERBESCHLUSS
  der <Firmenname der GmbH / UG (haftungsbeschränkt)>
  mit dem Sitz in <Ort>, eingetragen im Handelsregister des Amtsgerichts <Ort> unter <HRB-Nummer>
  
  Datum der Beschlussfassung: <TT.MM.JJJJ>
  Ort: <PLZ Ort>
  
  I. FESTSTELLUNG DER VOLLVERSAMMLUNG & FORMVERZICHT (§ 51 ABS. 3 GMBHG)
  Anwesend bzw. wirksam vertreten sind sämtliche im Handelsregister gemäß § 40 Abs. 1, § 16 Abs. 1 GmbHG eingetragenen Gesellschafter, die zusammen 100 % des gesamten Stammkapitals der Gesellschaft in Höhe von <Betrag Stammkapital> EUR halten:
  1. <Name Gesellschafter 1>, haltend Geschäftsanteile im Nennbetrag von <Betrag> EUR (<Prozent> %)
  2. <Falls vorhanden: Name Gesellschafter 2, sonst streichen>
  
  Sämtliche Gesellschafter treten hiermit unter ausdrücklichem Verzicht auf alle gesetzlichen und gesellschaftsvertraglichen Form- und Fristvorschriften für die Einberufung, Ankündigung und Durchführung einer Gesellschafterversammlung (§ 51 Abs. 3 GmbHG) zu einer beschlussfähigen Vollversammlung zusammen (bzw. fassen diesen Beschluss im allseitigen Einverständnis gemäß § 48 Abs. 2 GmbHG) und beschließen einstimmig was folgt:
  
  II. BESCHLÜSSE
  
  1. FESTSTELLUNG DES JAHRESABSCHLUSSES (§ 46 NR. 1, § 42a ABS. 2 GMBHG)
  Der von der Geschäftsführung vorgelegte Jahresabschluss der Gesellschaft für das Geschäftsjahr vom <01.01.JJJJ> bis zum <31.12.JJJJ> – bestehend aus Bilanz und Gewinn- und Verlustrechnung (sowie ggf. Anhang) – mit einer Bilanzsumme in Höhe von <Betrag Bilanzsumme> EUR und einem Jahresüberschuss / Jahresfehlbetrag in Höhe von <Betrag Ergebnis> EUR wird hiermit vollumfänglich genehmigt und verbindlich festgestellt.
  
  2. ERGEBNISVERWENDUNG (§ 29 GMBHG / BEI UG ZWINGEND § 5a ABS. 3 GMBHG)
  Der im Geschäftsjahr <JJJJ> erzielte Jahresüberschuss in Höhe von <Betrag> EUR wird wie folgt verwendet:
  a) <Nur bei UG (haftungsbeschränkt), sonst 0,00 EUR:> Gemäß § 5a Abs. 3 Satz 1 GmbHG wird ein Betrag in Höhe von <25 % des um einen Verlustvortrag geminderten Jahresüberschusses> EUR in die gesetzliche Rücklage eingestellt.
  b) Ein Betrag in Höhe von <Betrag> EUR wird auf neue Rechnung vorgetragen (bzw. in die Gewinnrücklagen eingestellt).
  c) Ein Betrag in Höhe von <Betrag> EUR wird an die Gesellschafter im Verhältnis ihrer Geschäftsanteile ausgeschüttet.
  
  3. ENTLASTUNG DER GESCHÄFTSFÜHRUNG (§ 46 NR. 5 GMBHG)
  Dem Geschäftsführer, Herrn/Frau <Vorname Nachname>, wird für seine/ihre gesamte Amts- und Geschäftsführung im abgelaufenen Geschäftsjahr <JJJJ> für sämtliche aus den vorgelegten Büchern, Schriften und Berichten erkennbaren Geschäftsvorfälle uneingeschränkte Entlastung erteilt (Präklusionswirkung gemäß BGH, Urteil v. 21.04.1986 – II ZR 165/85; soweit der Geschäftsführer zugleich Gesellschafter ist, ruht sein Stimmrecht nach § 47 Abs. 4 Satz 1 GmbHG, sofern weitere Gesellschafter vorhanden sind; bei der Ein-Personen-GmbH bzw. allseitigem Einverständnis erfolgt die Entlastung einstimmig).
  
  4. OFFENLEGUNGS- / HINTERLEGUNGSANWEISUNG (§§ 325, 326 HGB)
  Die Geschäftsführung wird angewiesen, den festgestellten Jahresabschluss fristgerecht vor Ablauf des <31.12.JJJJ> elektronisch zur Hinterlegung bzw. Offenlegung beim Unternehmensregister einzureichen.
  
  Weitere Punkte stehen nicht zur Beschlussfassung an. Das Protokoll wird gemäß § 48 Abs. 3 GmbHG (soweit anwendbar) unverzüglich nach der Beschlussfassung unterzeichnet und zu den Gesellschaftsakten im Firmen-Tresor genommen.
  
  <Ort>, den <TT.MM.JJJJ>
  
  ________________________________________
  <Unterschrift Gesellschafter 1 (und ggf. Alleingesellschafter-Geschäftsführer)>`
    },
    {
      id: 'tpl_beschluss_gf_verguetung_vga_schutz',
      title: '3. Gesellschafterbeschluss: GF-Gehaltsanpassung / Tantieme / PKW (Steuer-Schutzschild gegen vGA)',
      category: 'Steuer- & Organ-Schutz',
      legalBasis: '§ 46 Nr. 5 GmbHG, § 181 BGB, § 8 Abs. 3 Satz 2 KStG (BFH I R 49/90)',
      description: 'Zwingender Vorab-Beschluss vor jeder Änderung von GF-Gehalt, Bonus oder Firmenwagen zur Abwehr einer verdeckten Gewinnausschüttung (vGA) bei der Betriebsprüfung.',
      templateText: `GESELLSCHAFTERBESCHLUSS ÜBER DIE ANPASSUNG DER GESCHÄFTSFÜHRERVERGÜTUNG
  (Zivilrechtliche Wirksamkeit nach § 46 Nr. 5 GmbHG & Fremdvergleich nach § 8 Abs. 3 Satz 2 KStG)
  
  der <Firmenname der GmbH / UG (haftungsbeschränkt)>
  (Amtsgericht <Ort>, <HRB-Nummer>)
  
  Sämtliche Gesellschafter der Gesellschaft halten hiermit unter Verzicht auf alle gesetzlichen und gesellschaftsvertraglichen Form- und Fristvorschriften (§ 51 Abs. 3 GmbHG) eine Gesellschafterversammlung ab und fassen – im Einklang mit den Grundsätzen der höchstrichterlichen Rechtsprechung (BGH, Urteil v. 25.03.1991 – II ZR 169/90 sowie BFH, Urteil v. 11.12.1991 – I R 49/90 zum formellen Fremdvergleich bei beherrschenden Gesellschafter-Geschäftsführern) – im Voraus für die Zukunft einstimmig folgenden
  
  BESCHLUSS:
  
  1. ANPASSUNG DER FESTVERGÜTUNG (IM VORAUS AB DEM <01.MM.JJJJ>)
  In Abänderung des bestehenden Geschäftsführeranstellungsvertrages vom <Datum Altvertrag> erhält der Geschäftsführer, Herr/Frau <Vorname Nachname>, mit Wirkung ab dem <01.MM.JJJJ> (zukünftiger Zeitraum) ein monatliches Brutto-Festgehalt in Höhe von <Betrag in Zahlen> EUR (in Worten: <Betrag in Worten> Euro), zahlbar jeweils zum Ende eines Kalendermonats.
  
  2. SONDERVERGÜTUNG / DIENSTWAGENREGELUNG
  <Optional: Dem Geschäftsführer wird zur dienstlichen und privaten Nutzung ein betriebliches Kraftfahrzeug des Typs <Marke/Modell, Kennzeichen> überlassen; die Versteuerung des geldwerten Vorteils erfolgt nach der 1-%-Regelung (§ 6 Abs. 1 Nr. 4 Satz 2 EStG) bzw. ordnungsgemäßem Fahrtenbuch.>
  
  3. BEFREIUNG VON DEN BESCHRÄNKUNGEN DES § 181 BGB & SCHRIFTFORMNACHTRAG
  Der Geschäftsführer ist für die Unterzeichnung des entsprechenden schriftlichen Nachtrags zum Geschäftsführeranstellungsvertrag von den Beschränkungen des § 181 BGB (Verbot des Insichgeschäfts) befreit, soweit diese Befreiung satzungsgemäß und im Handelsregister eingetragen ist; hilfsweise schließen die unterzeichnenden Gesellschafter in Ausübung ihrer Annexkompetenz aus § 46 Nr. 5 GmbHG diesen Nachtrag hiermit unmittelbar im Namen der Gesellschaft mit dem Geschäftsführer ab.
  
  Dieser Beschluss wird gemäß § 48 Abs. 3 GmbHG unverzüglich nach Beschlussfassung unterzeichnet und vor dem ersten Auszahlungszeitraum im Firmen-Tresor hinterlegt.
  
  <Ort>, den <TT.MM.JJJJ>
  
  ________________________________________          ________________________________________
  Für die Gesellschafterversammlung                 Angenommen: <Vorname Nachname> (Geschäftsführer)`
    },
    {
      id: 'tpl_beschluss_181_bgb_insichgeschaeft',
      title: '4. Gesellschafterbeschluss: Einzelgenehmigung eines Rechtsgeschäfts / Darlehens (§ 181 BGB & § 46 GmbHG)',
      category: 'Vertrags- & Darlehensschutz',
      legalBasis: '§ 181 BGB, § 30 GmbHG, § 8 Abs. 3 Satz 2 KStG',
      description: 'Schützt Verträge, Darlehen oder Mietverhältnisse zwischen der GmbH und ihrem Geschäftsführer bzw. verbundenen Schwestergesellschaften vor schwebender Unwirksamkeit (§ 177 BGB) und vGA.',
      templateText: `GESELLSCHAFTERBESCHLUSS ZUR GENEHMIGUNG EINES RECHTSGESCHÄFTS & BEFREIUNG VON § 181 BGB
  
  der <Firmenname der GmbH / UG (haftungsbeschränkt)>
  (Amtsgericht <Ort>, <HRB-Nummer>)
  
  Sämtliche Gesellschafter der Gesellschaft fassen unter Verzicht auf alle gesetzlichen und gesellschaftsvertraglichen Form- und Fristvorschriften (§ 51 Abs. 3 GmbHG) einstimmig folgenden
  
  BESCHLUSS:
  
  1. ZUSTIMMUNG ZUM RECHTSGESCHÄFT UNTER FREMDVERGLEICHSBEDINGUNGEN
  Die Gesellschafterversammlung stimmt dem Abschluss des nachfolgend bezeichneten Vertrages zwischen der Gesellschaft und <Name des Vertragspartners / Geschäftsführers / der verbundenen Gesellschaft> vollumfänglich zu:
  - Vertragsgegenstand: <z. B. Darlehensvertrag / Gewerbemietvertrag / IT-Systemvertrag vom TT.MM.JJJJ>
  - Konditionen (Fremdvergleich): <z. B. Darlehensbetrag X EUR, Verzinsung X,XX % p.a. gemäß § 247 BGB + Aufschlag, Rückzahlungstermin TT.MM.JJJJ / monatliche Vergütung X EUR netto>
  
  2. EINZELBEFREIUNG VOM SELBSTGESCHÄFTSVERBOT (§ 181 BGB) & BESTÄTIGUNG (§ 177 ABS. 1 BGB)
  Soweit der Geschäftsführer Herr/Frau <Vorname Nachname> auf beiden Seiten des Rechtsgeschäfts (im eigenen Namen oder als Vertreter eines Dritten) handelt, wird ihm für den Abschluss, die Durchführung und etwaige Änderungen dieses Vertrages die ausdrückliche Einwilligung bzw. nachträgliche Genehmigung nach §§ 181, 177 Abs. 1, 184 Abs. 1 BGB erteilt; zugleich vertreten die unterzeichnenden Gesellschafter die Gesellschaft insoweit unmittelbar selbst.
  
  <Ort>, den <TT.MM.JJJJ>
  
  ________________________________________
  <Unterschrift sämtlicher Gesellschafter>`
    },
    {
      id: 'tpl_krisenprotokoll_49_abs_3_gmbhg',
      title: '5. Krisen-Dokumentation & Beschluss bei Verlust der Hälfte des Stammkapitals (§ 49 Abs. 3 / § 5a Abs. 4 GmbHG)',
      category: 'Strafrechts- & Haftungsabwehr',
      legalBasis: '§ 49 Abs. 3 GmbHG, § 5a Abs. 4 GmbHG, § 84 Abs. 1 Nr. 1 GmbHG, § 15a InsO, § 1 StaRUG',
      description: 'Schützt den Geschäftsführer vor der Strafbarkeit nach § 84 Abs. 1 Nr. 1 GmbHG (bis zu 3 Jahre Freiheitsstrafe bei unterlassener Anzeige eines hälftigen Stammkapitalverlusts) und dokumentiert die Fortführungsprognose (§ 1 StaRUG).',
      templateText: `PROTOKOLL DER AUSSERORDENTLICHEN GESELLSCHAFTERVERSAMMLUNG GEMÄSS § 49 ABS. 3 / § 5a ABS. 4 GMBHG
  (Pflicht-Dokumentation zur Erfüllung von § 84 Abs. 1 Nr. 1 GmbHG & § 1 Abs. 1 StaRUG)
  
  der <Firmenname der GmbH / UG (haftungsbeschränkt)>
  (Amtsgericht <Ort>, <HRB-Nummer>)
  
  Datum: <TT.MM.JJJJ> | Uhrzeit: <HH:MM> Uhr | Ort: <PLZ Ort>
  
  I. PFLICHTGEMÄSSE ANZEIGE DER GESCHÄFTSFÜHRUNG (§ 49 ABS. 3 / § 5a ABS. 4 GMBHG)
  Die Geschäftsführung (<Vorname Nachname>) hat sämtliche Gesellschafter unverzüglich nach Aufstellung der aktuellen betriebswirtschaftlichen Auswertung (BWA) / Zwischenbilanz zum Stichtag <TT.MM.JJJJ> zusammengerufen und zeigt den Gesellschaftern hiermit offiziell an, dass das Reinvermögen der Gesellschaft unter die Hälfte des satzungsmäßigen Stammkapitals gesunken ist (bzw. bei der UG eine Liquiditätsanspannung im Sinne des § 5a Abs. 4 GmbHG vorliegt).
  
  II. PRÜFUNG DER ZAHLUNGSFÄHIGKEIT & ÜBERSCHULDUNG (§§ 17, 19, 15a INSO)
  Die Geschäftsführung legt einen aktuellen Finanz- und Liquiditätsstatus sowie eine 12-Monats-Fortführungsprognose vor und stellt fest:
  1. Keine Zahlungsunfähigkeit (§ 17 Abs. 2 InsO): Die Gesellschaft kann ihre fälligen Zahlungsverpflichtungen zum heutigen Stichtag vollständig bedienen (bzw. eine etwaige Liquiditätslücke liegt unter 10 % und wird innerhalb von 3 Wochen geschlossen).
  2. Keine insolvenzrechtliche Überschuldung (§ 19 Abs. 2 Satz 1 InsO): Auf Grundlage der erstellten Zahlungsfähigkeitsprognose ist die Fortführung des Unternehmens in den nächsten 12 Monaten überwiegend wahrscheinlich (positive Fortführungsprognose).
  
  III. SANIERUNGS- UND FORTFÜHRUNGSBESCHLUSS DER GESELLSCHAFTER
  Sämtliche Gesellschafter nehmen den Bericht der Geschäftsführung unter Verzicht auf alle Form- und Fristvorschriften (§ 51 Abs. 3 GmbHG) entgegen und beschließen einstimmig folgende Maßnahmen zur Stärkung der Eigenkapital- und Liquiditätsbasis:
  1. <Maßnahme 1: z. B. Erklärung eines qualifizierten Rangrücktritts gemäß § 19 Abs. 2 Satz 2 InsO / § 5 Abs. 2a EStG für bestehende Gesellschafterdarlehen in Höhe von X EUR>
  2. <Maßnahme 2: z. B. Zuführung einer freien Kapitalrücklage nach § 272 Abs. 2 Nr. 4 HGB in Höhe von X EUR / Kostensenkungsprogramm>
  3. Die Geschäftsführung wird beauftragt, die Liquiditätsentwicklung im Rahmen der Krisenfrüherkennung nach § 1 Abs. 1 StaRUG wöchentlich zu überwachen und in den Gesellschaftsakten zu dokumentieren.
  
  <Ort>, den <TT.MM.JJJJ>
  
  ________________________________________          ________________________________________
  <Vorname Nachname> (Geschäftsführer)              <Unterschrift sämtlicher Gesellschafter>`
    }
  ];