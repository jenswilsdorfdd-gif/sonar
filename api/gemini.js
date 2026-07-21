export default async function handler(req, res) {
    // Wir erlauben nur das Senden von Daten
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Nur POST erlaubt' });
    }
  
    try {
      const { base64Data, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
  
      // Das hier ist das Gehirn: Dein persönlicher Dokumenten-Prompt an mich!
      const prompt = `Du bist ein hochpräziser juristischer und kaufmännischer Assistent. Analysiere das angehängte Dokument.
      Extrahiere die wichtigsten Daten und erstelle einen passenden Antwortentwurf.
      Gib mir die Antwort AUSSCHLIESSLICH als JSON-Objekt mit exakt diesen Schlüsseln zurück:
      - "aktenzeichen" (Das gefundene Aktenzeichen, Geschäftszeichen oder Steuernummer)
      - "thema" (Kurze Beschreibung, worum es geht, z.B. "Einkommensteuerbescheid 2022")
      - "kontakt" (Wer hat das geschickt? Name der Behörde oder Firma)
      - "frist_extern" (Falls eine Frist im Text steht, berechne das genaue Ablaufdatum im Format YYYY-MM-DD. Wenn nichts steht, lass es leer "")
      - "brief_entwurf" (Schreibe ein formelles, professionelles Antwortschreiben - z.B. Einspruch, Bestätigung oder Rückfrage - passend zum Dokumenteninhalt. Verwende Platzhalter wie [Mein Name] für fehlende Infos.)`;
  
      // Hier ruft Vercel heimlich die KI an
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
          }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
  
      const data = await response.json();
      const textResult = data.candidates[0].content.parts[0].text;
  
      // KI-Antwort an dein Dashboard zurückschicken
      res.status(200).json(JSON.parse(textResult));
    } catch (error) {
      console.error("KI Backend Fehler:", error);
      res.status(500).json({ error: 'Fehler bei der KI-Verarbeitung' });
    }
  }