export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Nur POST erlaubt' });
    }
  
    try {
      const { base64Data, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
  
      if (!apiKey) {
        console.error("API Key fehlt in den Environment Variables!");
        return res.status(500).json({ error: 'API Key fehlt' });
      }
  
      // HIER IST DER UNIVERSELLE ABWEHR-PROMPT:
      const prompt = `Rolle: Handle als hochqualifizierter juristischer und kaufmännischer Assistent zur kompromisslosen Abwehr und Bearbeitung von unberechtigten Behörden- und Geschäftsforderungen.
  
  Aufgabe:
  Analysiere das angehängte Dokument präzise und entlarve typische Fallstricke, Fehler oder unberechtigte Forderungen (z.B. fiktive Schätzungen, grundlose Gebühren/Zuschläge bei Null-Zahllast, einbehaltene Guthaben, Frist- und Formfehler).
  
  Gehe in zwei Schritten vor:
  1. KLARE ANALYSE: Erfasse in einfachen, direkten Worten, wer das schreibt, was die konkret fordern und wo die rechtlichen oder sachlichen Fehler liegen.
  2. MASSNAHMEN & GEGENANGRIFF: Entwirf eine professionelle, rechtssichere und scharf abwehrende Antwort (z.B. Einspruch, Widerspruch, Auskunftsersuchen, Erlassantrag) an den Absender. Verwende Platzhalter wie [Name der Gesellschaft/Person] für fehlende Daten.
  
  Gib mir die Antwort AUSSCHLIESSLICH als formatiertes JSON-Objekt mit exakt diesen Schlüsseln zurück:
  - "aktenzeichen" (Das gefundene Aktenzeichen, Steuernummer oder Geschäftszeichen)
  - "thema" (Genaue Bezeichnung des Schreibens / Bescheids)
  - "kontakt" (Name der Behörde, Firma oder des Absenders)
  - "frist_extern" (Berechne das genaue Ablaufdatum einer gesetzten oder gesetzlichen Frist im Format YYYY-MM-DD. Wenn keine Frist erkennbar, lass es leer "")
  - "brief_entwurf" (Schreibe hier ZUERST deine KLARE ANALYSE (was wurde gemacht, wo ist der Fehler). Danach liefere direkt die NOTWENDIGEN MASSNAHMEN & ANTRÄGE inkl. des fertigen, rechtssicheren Textentwurfs zum Kopieren.)`;
  
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
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
  
      if (data.error) {
        console.error("Google API hat gemeckert:", data.error.message);
        return res.status(500).json({ error: `Google API Fehler: ${data.error.message}` });
      }
  
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          console.error("Unerwartetes Datenformat von Google:", JSON.stringify(data));
          return res.status(500).json({ error: 'Unerwartetes Format von Google erhalten.' });
      }
  
      const textResult = data.candidates[0].content.parts[0].text;
      res.status(200).json(JSON.parse(textResult));
  
    } catch (error) {
      console.error("KI Backend Fehler:", error);
      res.status(500).json({ error: 'Fehler bei der KI-Verarbeitung' });
    }
  }