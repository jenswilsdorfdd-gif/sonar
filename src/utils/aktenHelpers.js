// src/utils/aktenHelpers.js
// AUSGELAGERTE REINE HILFS-, MATCHING-, PDF- & DRUCKFUNKTIONEN FÜR DAS AKTEN-COCKPIT
// Hält AktenCockpit.jsx schlank, wartbar und 100 % identisch in der Fachlogik.

import * as pdfjsLib from 'pdfjs-dist';
import { extractFilename, cleanVal } from '../utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const formatDatum = (datum) => (datum ? new Date(datum).toLocaleDateString('de-DE') : '-');

// Prüft sicher, ob ein vermeintlicher eigener Ansprechpartner in Wahrheit der Sachbearbeiter der Gegenseite ist
export const sanitizeOwnContactName = (ownAp, oppAp, oppName) => {
  const cleanOwn = (cleanVal(ownAp) || '').trim();
  if (!cleanOwn) return '';
  const lowOwn = cleanOwn.toLowerCase();
  const lowOppAp = (cleanVal(oppAp) || '').trim().toLowerCase();
  const lowOppName = (cleanVal(oppName) || '').trim().toLowerCase();
  if (lowOppAp && lowOwn === lowOppAp) return '';
  if (lowOppName && lowOwn === lowOppName) return '';
  if (
    lowOwn.includes('urkundsbeamt') ||
    lowOwn.includes('geschäftsstelle') ||
    lowOwn.includes('rechtspfleger') ||
    lowOwn.includes('poststelle')
  ) {
    return '';
  }
  return cleanOwn;
};

// Slug-Cleaner analog zu AutoConvert.py
export const cleanSlugForFilename = (text) => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/-(gmbh|ag|ug|e-k|kg|ohg|ltd|co-kg|gmbh-co-kg|haftungsbeschraenkt)\b/g, '')
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Datums-Konverter für deutsche & ISO-Formate auf YYYY-MM-DD
export const normalizeDateForInput = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const deMatch = str.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})/);
  if (deMatch) {
    const day = deMatch[1].padStart(2, '0');
    const month = deMatch[2].padStart(2, '0');
    let year = deMatch[3];
    if (year.length === 2) {
      year = '20' + year;
    }
    return `${year}-${month}-${day}`;
  }

  return '';
};

export const formatRufnummer = (nummer) => {
  if (!nummer) return '';
  let clean = String(nummer).replace(/[\s\-\/\(\)]/g, '');
  if (clean.startsWith('0049')) {
    clean = '+49' + clean.substring(4);
  } else if (clean.startsWith('0')) {
    clean = '+49' + clean.substring(1);
  }
  return clean;
};

export const cleanOrgName = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\.,\-\/\(\)]/g, ' ')
    .replace(
      /\b(die|der|das|und|fuer|für|gmbh|ug|ag|haftungsbeschraenkt|haftungsbeschränkt|gesundheitskasse|sachsen|thueringen|thüringen)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
};

export const fuzzyMatch = (str1, str2) => {
  if (!str1 || !str2) return false;
  const n1 = cleanOrgName(str1);
  const n2 = cleanOrgName(str2);
  if (!n1 || !n2) return false;
  if (n1.length < 4 || n2.length < 4) return n1 === n2;
  return n1.includes(n2) || n2.includes(n1);
};

export const cleanZeichenString = (val) => {
  if (!val) return '';
  return String(val)
    .toLowerCase()
    .replace(
      /\b(az|aktenzeichen|steuernummer|st-nr|stnr|kassenzeichen|unser zeichen|ihr zeichen|geschäftszeichen|gz)\b/gi,
      ''
    )
    .replace(/[^a-z0-9]/g, '');
};

export const parseAktenNummer = (zeichen) => {
  if (!zeichen) return null;
  const strZ = String(zeichen);
  const matchNew = strZ.match(/^(\d+)-/);
  if (matchNew) return parseInt(matchNew[1], 10);
  const matchOld = strZ.match(/-(\d+)$/);
  if (matchOld) return parseInt(matchOld[1], 10);
  return null;
};

export const generateMandantPrefix = (name, isOwnerAccount = false) => {
  if (!name) return '';
  const n = name.toLowerCase();
  if (isOwnerAccount) {
    if (n.includes('jens wilsdorf')) return 'jw';
    if (n.includes('smartbizz') || n.includes('sbs')) return 'sbs';
    if (n.includes('brand & market') || n.includes('bam')) return 'bam';
    if (n.includes('wilsdorf & sommer') || n.includes('wus')) return 'wus';
    if (n.includes('wir')) return 'wir';
  }
  return name
    .split(/[\s-]+/)
    .filter((w) => w.length > 0)
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toLowerCase();
};

// Mehrstufige Bestandsakten-Erkennung (inkl. Duplikat-Sicherung bei doppelt vergebenen Alt-Nummern wie 0028)
export const findBestMatchingAkteInList = (
  akten = [],
  inUnserZeichen,
  inAktenzeichen,
  inGegner,
  inFirma,
  inThema,
  inBrief
) => {
  const cleanUZ = cleanZeichenString(inUnserZeichen);
  const cleanAZ = cleanZeichenString(inAktenzeichen);

  // STUFE 1A: Abgleich über Unser Zeichen (exakter Voll-Treffer hat Vorrang; Nummern-Präfix nur wenn eindeutig!)
  if (cleanUZ.length >= 4) {
    const exactUzMatches = akten.filter(
      (a) => !a.is_demo_showcase && cleanZeichenString(a.unser_zeichen) === cleanUZ
    );
    if (exactUzMatches.length === 1) {
      return { akte: exactUzMatches[0], reason: 'Unser Zeichen eindeutig erkannt' };
    }

    const numMatch = String(inUnserZeichen).match(/^(\d{4})-/);
    if (numMatch) {
      const prefixNum = numMatch[1];
      const prefixMatches = akten.filter(
        (a) => !a.is_demo_showcase && a.unser_zeichen && a.unser_zeichen.startsWith(`${prefixNum}-`)
      );
      if (prefixMatches.length === 1) {
        return { akte: prefixMatches[0], reason: `Eindeutige Aktennummer ${prefixNum} erkannt` };
      }
    }
  }

  // STUFE 1B: Abgleich über behördliches Aktenzeichen / Steuernummer
  if (cleanAZ.length >= 5) {
    const exactAzAkte = akten.find((a) => {
      const aAz = cleanZeichenString(a.aktenzeichen);
      if (!aAz || aAz.length < 5) return false;
      return (
        aAz === cleanAZ ||
        (aAz.length >= 6 && cleanAZ.length >= 6 && (aAz.includes(cleanAZ) || cleanAZ.includes(aAz)))
      );
    });
    if (exactAzAkte) return { akte: exactAzAkte, reason: 'Behördliches Aktenzeichen erkannt' };

    const histAzAkte = akten.find(
      (a) =>
        a.akten_historie &&
        a.akten_historie.some((h) => {
          const hText = cleanZeichenString(`${h.aktion || ''} ${h.brief_entwurf || ''}`);
          return cleanAZ.length >= 6 && hText.includes(cleanAZ);
        })
    );
    if (histAzAkte) return { akte: histAzAkte, reason: 'Aktenzeichen im bisherigen Aktenverlauf gefunden' };
  }

  // STUFE 2 & 3: Kombinations-Abgleich über Gegner + Mandant + Thema/Inhalt
  if (inGegner) {
    const kandidaten = akten.filter((a) => {
      if (a.status === 'Erledigt') return false;
      const gegnerPasst = fuzzyMatch(a.gegner_name, inGegner);
      if (!gegnerPasst) return false;
      if (inFirma && a.unsere_firma) {
        return fuzzyMatch(a.unsere_firma, inFirma);
      }
      return true;
    });

    if (kandidaten.length === 1 && inFirma) {
      return {
        akte: kandidaten[0],
        reason: `Offene Bestandsakte für ${kandidaten[0].unsere_firma} & ${kandidaten[0].gegner_name} gefunden`
      };
    }

    if (kandidaten.length > 0) {
      const suchKontext = `${inThema || ''} ${inBrief || ''}`.toLowerCase();
      const fachWoerter = suchKontext
        .replace(/[^a-zäöüß0-9\s]/gi, ' ')
        .split(/\s+/)
        .filter(
          (w) =>
            w.length >= 5 &&
            !['schreiben', 'bescheid', 'betreff', 'geehrte', 'damen', 'herren', 'anlage', 'unser', 'zeichen'].includes(w)
        );

      let bestKandidat = null;
      let bestScore = 0;

      kandidaten.forEach((k) => {
        let score = 0;
        const akteText = `${k.thema || ''} ${k.aktenzeichen || ''} ${(k.akten_historie || [])
          .map((h) => `${h.aktion || ''} ${h.brief_entwurf || ''}`)
          .join(' ')}`.toLowerCase();

        fachWoerter.forEach((w) => {
          if (akteText.includes(w)) score += 10;
        });

        if (inThema && k.thema && fuzzyMatch(k.thema, inThema)) {
          score += 35;
        }

        if (score > bestScore) {
          bestScore = score;
          bestKandidat = k;
        }
      });

      if (bestKandidat && bestScore >= 20) {
        return {
          akte: bestKandidat,
          reason: `Bestandsakte über Gegner & Thema (${bestKandidat.unser_zeichen}) erkannt`
        };
      }
    }
  }

  return null;
};

export const findSmartBezugInAkte = (targetAkte, incomingObj) => {
  if (!targetAkte || !targetAkte.akten_historie || targetAkte.akten_historie.length === 0) return '';

  const newAP = (
    incomingObj.ansprechpartner ||
    (incomingObj.empfaenger ? incomingObj.empfaenger.abteilung : '') ||
    ''
  )
    .toLowerCase()
    .trim();
  const newContext = `${incomingObj.thema || ''} ${incomingObj.betreff || ''} ${incomingObj.aktion || ''} ${
    incomingObj.brief_entwurf || ''
  }`.toLowerCase();

  const keywords = [
    'vollstreckung',
    'erhebung',
    'mahnung',
    'bescheid',
    'haftung',
    'umsatzsteuer',
    'ust',
    'gewerbesteuer',
    'gewst',
    'gst',
    'körperschaftsteuer',
    'kst',
    'lohnsteuer',
    'stundung',
    'aussetzung',
    'insolvenz'
  ];

  let bestId = '';
  let highestScore = -1;

  targetAkte.akten_historie.forEach((h) => {
    let score = 0;
    const hText = `${h.aktion || ''} ${h.brief_entwurf || ''} ${h.typ || ''}`.toLowerCase();

    if (newAP && newAP.length > 2 && hText.includes(newAP)) {
      score += 40;
    }

    keywords.forEach((kw) => {
      if (newContext.includes(kw) && hText.includes(kw)) {
        score += 15;
      }
    });

    if (h.frist_extern || h.wiedervorlage) {
      score += 25;
    }

    if (h.datum) {
      const diffDays = (new Date() - new Date(h.datum)) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays < 30) score += 10;
      else if (diffDays >= 0 && diffDays < 90) score += 5;
    }

    if (score > highestScore && score >= 25) {
      highestScore = score;
      bestId = h.id;
    }
  });

  return bestId;
};

// Clientseitige PDF.js-Textextraktion & Base64-Konverter
export const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    if (pageText.trim()) {
      fullText += `--- Seite ${i} ---\n${pageText}\n\n`;
    }
  }
  return fullText;
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const resultStr = String(reader.result || '');
      const base64Part = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
      resolve(base64Part);
    };
    reader.onerror = (err) => reject(err);
  });
};

// Druckansicht für Aktenauszug & Sendebericht
export const druckeAkte = (akte) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const historieRows = akte.akten_historie
    ? akte.akten_historie
        .map(
          (h) =>
            `<tr><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${h.typ}</td><td style="padding: 8px; border: 1px solid #ccc;">${
              h.datum ? new Date(h.datum).toLocaleDateString('de-DE') : '-'
            }</td><td style="padding: 8px; border: 1px solid #ccc;">${
              h.aktion || '-'
            }</td><td style="padding: 8px; border: 1px solid #ccc; color: #d97706;">${
              h.wiedervorlage
                ? 'WV: ' + new Date(h.wiedervorlage).toLocaleDateString('de-DE')
                : h.frist_extern
                  ? 'Frist: ' + new Date(h.frist_extern).toLocaleDateString('de-DE')
                  : '-'
            }</td></tr>`
        )
        .join('')
    : '';
  printWindow.document.write(
    `<html><head><title>Aktenauszug - ${
      akte.unser_zeichen || 'Akte'
    }</title><style>body { font-family: Arial, sans-serif; padding: 20px; color: #111; line-height: 1.5; } h1 { font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 15px; } .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 13px; background: #f4f4f4; padding: 15px; border-radius: 6px; } table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; } th { background: #eee; padding: 8px; border: 1px solid #ccc; text-align: left; }</style></head><body><h1>SONAR AKTEN-AUSZUG | UNSER ZEICHEN: ${
      akte.unser_zeichen || '-'
    }</h1><div class="grid"><div><strong>GEGENPARTEI / BEHÖRDE:</strong><br/>${
      akte.gegner_name || '-'
    }<br/>Ansprechpartner: ${akte.gegner_ansprechpartner || '-'}<br/>E-Mail: ${
      akte.gegner_email || '-'
    }</div><div><strong>MANDANT / FIRMA:</strong><br/>${akte.unsere_firma || '-'}<br/>Ansprechpartner: ${
      akte.unser_ansprechpartner || '-'
    }<br/>Gegenstand: ${
      akte.thema || '-'
    }</div></div><h3>DOKUMENTEN- & VERLAUFSHISTORIE</h3><table><thead><tr><th>Typ</th><th>Datum</th><th>Aktion / Vorgang</th><th>WV / Frist</th></tr></thead><tbody>${historieRows}</tbody></table><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`
  );
  printWindow.document.close();
};

export const druckeSendebericht = (eintrag) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const sichtbareUrls = eintrag.dokument_url
    ? eintrag.dokument_url
        .split(',')
        .map((u) => u.trim())
        .filter((u) => u !== '' && !u.toLowerCase().split('?')[0].endsWith('.md'))
    : [];
  const anhaengeText =
    sichtbareUrls.length > 0 ? sichtbareUrls.map((url) => extractFilename(url)).join(', ') : 'Keine Anhänge';
  printWindow.document.write(
    `<html><head><title>Sendebericht - ${
      eintrag.unser_zeichen || 'Ausgang'
    }</title><style>body { font-family: Arial, sans-serif; padding: 30px; color: #111; line-height: 1.6; } .box { border: 2px solid #000; padding: 20px; border-radius: 6px; margin-bottom: 20px; } h1 { font-size: 22px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 20px; text-transform: uppercase; } .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 13px; margin-bottom: 20px; } .meta-item { border-bottom: 1px solid #ddd; padding-bottom: 5px; } .badge { display: inline-block; background: #10b981; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; } pre { white-space: pre-wrap; font-family: Courier, monospace; background: #f8f9fa; padding: 15px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; }</style></head><body><h1>SONAR SENDEBERICHT / AUSGANGSNACHWEIS</h1><div class="box"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;"><div><span class="badge">STATUS: ERFOLGREICH VERSENDET</span></div><div><strong>Sendedatum:</strong> ${formatDatum(
      eintrag.datum
    )}</div></div><div class="meta-grid"><div class="meta-item"><strong>Absender / Mandant:</strong><br/>${
      eintrag.unsere_firma || '-'
    }</div><div class="meta-item"><strong>Empfänger / Behörde:</strong><br/>${
      eintrag.gegner_name || '-'
    }</div><div class="meta-item"><strong>Unser Zeichen:</strong><br/>${
      eintrag.unser_zeichen || '-'
    }</div><div class="meta-item"><strong>Aktenzeichen (Gegner):</strong><br/>${
      eintrag.aktenzeichen || '-'
    }</div><div class="meta-item"><strong>Versandart / Kanal:</strong><br/>${
      eintrag.kanal || 'E-Mail / Fax'
    }</div><div class="meta-item"><strong>Vorgang / Zieladresse:</strong><br/>${
      eintrag.aktion || '-'
    }</div><div class="meta-item" style="grid-column: 1 / -1;"><strong>Gegenstand (Thema):</strong><br/>${
      eintrag.thema || '-'
    }</div><div class="meta-item" style="grid-column: 1 / -1;"><strong>Übermittelte Dateianhänge:</strong><br/>${anhaengeText}</div></div></div><h3>DOKUMENTIERTES SCHREIBEN (TEXTINHALT):</h3><pre>${
      eintrag.brief_entwurf || '(Kein Textkörper hinterlegt)'
    }</pre><script>window.onload = function() { window.print(); window.close(); }</script></body></html>`
  );
  printWindow.document.close();
};