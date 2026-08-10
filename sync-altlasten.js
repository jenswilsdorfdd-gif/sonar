const SUPABASE_URL = "DEINE_SUPABASE_URL";
const SUPABASE_ANON_KEY = "DEIN_SUPABASE_ANON_KEY";

async function syncAltlasten() {
  console.log("Starte Migration der Altlasten in Richtung GitHub...");

  // 1. Alle Einträge aus der Tabelle 'wissensdatenbank' abrufen
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

  // 2. Schleife über alle Einträge
  for (let i = 0; i < eintraege.length; i++) {
    const eintrag = eintraege[i];
    console.log(`[${i + 1}/${eintraege.length}] Verarbeite: ${eintrag.datei_name}`);

    // Dateiname für GitHub sicher formatieren
    const sichererName = eintrag.datei_name ? eintrag.datei_name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'unbekannt';
    const filename = `alt_${eintrag.id}_${sichererName}.txt`;

    // Textinhalt zusammenbauen
    const content = `Datei: ${eintrag.datei_name}\nFirma: ${eintrag.firma || 'Allgemein'}\nKategorie: ${eintrag.kategorie || 'Sonstiges'}\nLink: ${eintrag.dokument_url || '-'}\n\nInhalt/Info:\n${eintrag.inhalt_text || '-'}`;

    // 3. An deine Edge Function 'github-sync' schicken
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

    // Halbe Sekunde Pause, damit uns GitHub wegen Spam (Rate Limit) nicht wegsperrt
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("Migration komplett abgeschlossen! Du kannst diese Datei jetzt löschen.");
}

syncAltlasten();