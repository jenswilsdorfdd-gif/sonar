// src/config/sonarLegalConfig.js
// ZENTRALE ANBIETER-, IMPRESSUMS-, SUPPORT- & LIZENZ-KONFIGURATION (1-SCHALTER-PRINZIP)
// 'nico' = Übergangs- & Vertriebsbetrieb über Unternehmensberatung Nicolas Luca Afritsch (ohne Namensnennung Dritter)
// 'wus'  = Späterer Direktbetrieb über die Wilsdorf & Sommer GmbH

export const ACTIVE_OPERATOR = 'nico'; // Später einfach auf 'wus' ändern!

export const LEGAL_OPERATORS = {
  nico: {
    id: 'nico',
    companyName: 'Unternehmensberatung Nicolas Luca Afritsch',
    brandAddition: 'SONAR Systems & Vertrieb',
    legalFormNote: 'Einzelunternehmen',
    representativeLabel: 'Inhaber & Verantwortlicher',
    representativeName: 'Nicolas Luca Afritsch',
    addressLine: 'Am Teich 1, 22941 Delingsdorf, Deutschland',
    registerInfo: null, // Kein HRB-Eintrag erforderlich
    vatId: null,        // Optional nachrüstbar, sobald USt-IdNr. vorliegt
    contactEmail: 'mail@agenturbooster.de',
    contactFax: null,
    jurisdictionCity: 'Ahrensburg',
    footerCopyrightLine:
      '© 2026 SMART SONAR COCKPIT – Vertrieb & Bereitstellung: Unternehmensberatung Nicolas Luca Afritsch. Alle Urheber- und Schutzrechte vorbehalten (§§ 69a ff. UrhG, GeschGehG).',
    modalFooterCopyrightLine:
      '© 2026 SMART SONAR COCKPIT – Bereitstellung: Unternehmensberatung Nicolas Luca Afritsch. Alle Rechte an Software & Prüf-Algorithmen vorbehalten (§§ 69a ff. UrhG, GeschGehG).',
    ipHolderClause:
      'der berechtigten Urheber und Lizenzgeber (vertrieben durch die Unternehmensberatung Nicolas Luca Afritsch)',
    supportSenderName: 'SONAR Support-Team',
    supportMailSignOffName: 'Nicolas Luca Afritsch',
    supportMailSignOffCompany: 'Unternehmensberatung Nicolas Luca Afritsch',
    adminNotifyEmail: 'mail@agenturbooster.de'
  },

  wus: {
    id: 'wus',
    companyName: 'Wilsdorf & Sommer GmbH',
    brandAddition: 'SMART SONAR COCKPIT',
    legalFormNote: 'Gesellschaft mit beschränkter Haftung (GmbH)',
    representativeLabel: 'Vertreten durch den einzelvertretungsberechtigten Geschäftsführer',
    representativeName: 'Jens Wilsdorf',
    addressLine: 'Voglerstraße 28, 01277 Dresden, Deutschland',
    registerInfo: 'Registergericht: Amtsgericht Dresden | Handelsregisternummer: HRB 43220',
    vatId: 'DE354922817',
    contactEmail: 'post@wilsdorf.org / wilsdorf.und.sommer@gmail.com',
    contactFax: '0351 85074535',
    jurisdictionCity: 'Dresden',
    footerCopyrightLine:
      '© 2026 Wilsdorf & Sommer GmbH – SMART SONAR COCKPIT. Alle Rechte vorbehalten (§§ 69a ff. UrhG, GeschGehG).',
    modalFooterCopyrightLine:
      '© 2026 Wilsdorf & Sommer GmbH – SMART SONAR COCKPIT. Alle Rechte vorbehalten (§§ 69a ff. UrhG, GeschGehG).',
    ipHolderClause: 'der Wilsdorf & Sommer GmbH',
    supportSenderName: 'SONAR Support (Jens Wilsdorf)',
    supportMailSignOffName: 'Jens Wilsdorf',
    supportMailSignOffCompany: 'Wilsdorf & Sommer GmbH',
    adminNotifyEmail: 'post@wilsdorf.org'
  }
};

export function getActiveLegalOperator() {
  return LEGAL_OPERATORS[ACTIVE_OPERATOR] || LEGAL_OPERATORS.nico;
}