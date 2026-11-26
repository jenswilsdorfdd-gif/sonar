// src/config/authRoles.js
// ZENTRALE ROLLEN- & BERECHTIGUNGS-WEICHE (OWNER vs. PARTNER-VOLLZUGANG vs. DEMO-TESTER)
// - Primärer Owner (Jens Wilsdorf): Volle Systemrechte + private blaue Original-Unterschrift & Dresdner Kanzlei-Fax
// - Partner-Vollzugang (Nicolas Luca Afritsch - mail@agenturbooster.de):
//   100 % Vollzugang (unbegrenzte Akten, kein Demo-Wasserzeichen, freies Kopieren/Exportieren, Gemini Pro & Claude Sonnet,
//   Admin-Support-Center & RSS-Steuerung), aber strikt eigene Daten-Umgebung (eigener Tresor/Akten) OHNE Jens' persönliche Signatur!

export const PRIMARY_OWNER_USER_ID = 'ea175141-2c03-4f93-ba1b-392570229cb2';

export const FULL_ACCESS_PARTNER_EMAILS = [
  'mail@agenturbooster.de'
];

// Prüft, ob exakt der primäre System-Owner (Jens Wilsdorf) eingeloggt ist (für persönliche Signatur & Dresdner Fax-Defaults)
export function isPrimaryOwnerSession(sessionOrUser) {
  const user = sessionOrUser?.user ? sessionOrUser.user : sessionOrUser;
  const uid = String(user?.id || '').trim();
  return uid === PRIMARY_OWNER_USER_ID;
}

// Prüft, ob ein Vollzugangs-Account (Jens ODER freigeschalteter Compagnon/Partner wie Nico) eingeloggt ist
// -> Schaltet alle Demo-Limits, Wasserzeichen, Kopiersperren und Türsteher-Checks ab!
export function isFullAccessSession(sessionOrUser) {
  const user = sessionOrUser?.user ? sessionOrUser.user : sessionOrUser;
  if (!user) return false;
  if (isPrimaryOwnerSession(user)) return true;

  const email = String(user.email || '').trim().toLowerCase();
  if (email && FULL_ACCESS_PARTNER_EMAILS.includes(email)) {
    return true;
  }
  return false;
}

// Prüft über rohe User-ID + E-Mail (z. B. innerhalb von asynchronen supabase.auth.getUser()-Aufrufen)
export function isFullAccessIdentity(userId, userEmail) {
  if (String(userId || '').trim() === PRIMARY_OWNER_USER_ID) return true;
  const cleanMail = String(userEmail || '').trim().toLowerCase();
  return Boolean(cleanMail && FULL_ACCESS_PARTNER_EMAILS.includes(cleanMail));
}