/**
 * SONAR MEGA LEGAL - Supabase Data Fetcher Module
 * Diese Schnittstelle verbindet den Gemini Gem mit der Supabase Datenbank.
 */

const SUPABASE_CONFIG = {
  url: "https://loyzfkxkuyypgteskxkm.supabase.co/rest/v1",
  endpoint: "/rpc/gem_sonar_suche"
};

/**
 * Durchsucht Supabase nach Akten, Mandanten, Gegnern und Wissensdatenbank.
 * @param {string} suchbegriff - Der Suchbegriff (Firma, Aktenzeichen, Behörde)
 */
async function sucheInSupabase(suchbegriff) {
  try {
    const response = await fetch(`${SUPABASE_CONFIG.url}${SUPABASE_CONFIG.endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ suchbegriff: suchbegriff })
    });

    if (!response.ok) {
      throw new Error(`HTTP Fehler! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fehler bei der Supabase-Suche:", error);
    return null;
  }
}