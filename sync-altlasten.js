const SUPABASE_URL = "https://loyzfkxkuyypgteskxkm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxveXpma3hrdXl5cGd0ZXNreGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDc2OTcsImV4cCI6MjEwMDEyMzY5N30.1MfQqCDmyUdSwgzty10mUMe7SFGdsw-1azjhndOC000";

async function syncAltlasten() {
  console.log("Starte Migration der Altlasten in Richtung GitHub...");

  const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/wissensdatenbank?select=*`, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!dbResponse.ok) {
    console.error("Fehler beim Abrufen der Datenbank:", await dbResponse.text());
    return;
  }

  const eintraege = await dbResponse.json();
  console.log(`${eintraege.length} Einträge gefunden. Beginne mit dem Upload...`);

  for (let i = 0; i < eintraege.length; i++) {
    const eintrag = eintraege[i];
    console.log(`[${i + 1}/${eintraege.length}] Verarbeite: ${eintrag.datei_name}`);

    const sichererName = eintrag.datei_name ? eintrag.datei_name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'unbekannt';
    const filename = `alt_${eintrag.id}_${sichererName}.txt`;

    const content = `Datei: ${eintrag.datei_name}\nFirma: ${eintrag.firma || 'Allgemein'}\nKategorie: ${eintrag.kategorie || 'Sonstiges'}\nLink: ${eintrag.dokument_url || '-'}\n\nInhalt/Info:\n${eintrag.inhalt_text || '-'}`;

    try {
      const syncRes = await fetch(`${SUPABASE_URL}/functions/v1/github-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ filename, content })
      });

      if (!syncRes.ok) {
        console.error(`❌ Fehler bei ${filename}:`, await syncRes.text());
      } else {
        console.log(`✅ Erfolgreich zu GitHub gepusht: ${filename}`);
      }
    } catch (err) {
      console.error(`❌ Ausnahme bei ${filename}:`, err.message);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("Migration komplett abgeschlossen! JETZT kannst du diese Datei löschen.");
}

syncAltlasten();