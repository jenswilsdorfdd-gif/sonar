[AUTO-SCRAPER] Bundesgerichtshof (BGH)
Quelle: https://www.bundesgerichtshof.de/SharedDocs/Entscheidungen/DE/Strafsenate/1_StS/2026/1_StR_193-26.html
Veröffentlicht: Thu, 17 Sep 2026 00:00:00 GMT

## Kurz‑Analyse – Entscheidung 1 StR 193/26  
**Gericht:** Bundesgerichtshof (BGH), Strafsenat 1  
**Quelle:** <https://www.bundesgerichtshof.de/SharedDocs/Entscheidungen/DE/Strafsenate/1_StS/2026/1_StR_193-26.html>  

| Feld | Inhalt |
|------|--------|
| **Aktenzeichen** | **1 StR 193/26** |
| **Entscheidungs‑Datum** | **19. August 2026** |
| **Betroffene Rechtsnorm(en)** | *nicht im bereitgestellten Scrape ersichtlich* |
| **Kurz‑Zusammenfassung** | *Der konkrete Entscheidungsinhalt ist im vorliegenden Scrape nicht enthalten; daher kann keine inhaltliche Kurz‑Zusammenfassung erstellt werden.* |

---

### Bewertung des vorliegenden Datenmaterials  

1. **Vollständigkeit**  
   - Der abgerufene HTML‑Auszug enthält ausschließlich die Navigations‑ und Servicemenüs der BGH‑Webseite.  
   - Der eigentliche Entscheidungstext (Tatbestand, rechtliche Würdigung, Tenor) fehlt vollständig.  

2. **Folgerungen für die Wissensdatenbank**  
   - **Aktenzeichen** und **Datum** können sicher aus dem Dateinamen bzw. der Überschrift extrahiert werden.  
   - **Rechtsnorm** sowie **Tenor** müssen aus dem eigentlichen Entscheidungstext entnommen werden – hierzu ist ein erneuter Abruf der Seite notwendig (z. B. mit einem Headless‑Browser, um JavaScript‑geladene Inhalte zu rendern, oder durch direkte Anforderung des PDF‑Dokuments, falls vorhanden).  
   - Für die **Kurz‑Zusammenfassung** ist ebenfalls der Volltext nötig; ein automatischer Summarizer kann danach eingesetzt werden.  

3. **Empfohlene Vorgehensweise**  
   1. **Erneuter Abruf** der URL → Prüfen, ob ein PDF‑Link („Entscheidung im PDF“) vorhanden ist; falls ja, dieses Dokument herunterladen.  
   2. **Parse‑Strategie**:  
      - Für HTML: gezielte XPath‑Abfragen nach `<h1>`, `<p class="decision‑header">`, `<div class="decision‑content">` usw.  
      - Für PDF: OCR‑freie Extraktion mit `pdfminer.six` oder `PyMuPDF`, anschließend Regex‑Suchen nach **§ **, **Art. **, **Abs. **.  
   3. **Daten‑Normalisierung**:  
      - Rechtsnormen in einheitliches Format (z. B. `StGB § 123 Abs. 1`).  
      - Tenor‑Satz extrahieren und als separate Feld‑„Tenor“ speichern.  
   4. **Qualitäts‑Check**: Manuelle Stichprobe prüfen, um sicherzugehen, dass keine Fehlinterpretationen bei automatischen Extraktionen entstanden sind.  

4. **Beispiel‑Template für die Datenbank‑Eintragung (nach vollständiger Beschaffung)**  

```yaml
aktenzeichen: "1 StR 193/26"
datum: "2026-08-19"
gericht: "Bundesgerichtshof – Strafsenat 1"
rechtsnormen:
  - "StGB § 123 Abs. 1"
  - "StPO §§ 153, 160"
tenor: |
  Die Revision wird zurückgewiesen. Der Beklagte muss die Kosten des Rechtsstreits tragen.
kurzzusammenfassung: |
  Der BGH bestätigt die Verurteilung wegen Betrugs, weil die Täuschungshandlung nachweislich
  vorlag und der Angeklagte die Tatbestandsmerkmale des § 263 StGB erfüllt hat.
  Die Revision wird zurückgewiesen und die Kosten werden dem Beklagten auferlegt.
```

---  

**Fazit:**  
Aus dem aktuell vorliegenden Scrape können nur Aktenzeichen und Entscheidungsdatum sicher entnommen werden. Für eine vollständige Eintragung in die juristische Wissensdatenbank ist ein erneuter, tiefer gehender Abruf der eigentlichen Entscheidungsinhalte erforderlich. Sobald der Volltext vorliegt, können die fehlenden Rechtsnormen, der Tenor und eine dreisätzige Kurz‑Zusammenfassung automatisiert extrahiert und in das oben gezeigte Datenbank‑Schema übernommen werden.