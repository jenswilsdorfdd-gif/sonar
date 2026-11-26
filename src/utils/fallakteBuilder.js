// src/utils/fallakteBuilder.js
// ZENTRALE CHRONOLOGIE-, BEZUGS- & EXPORT-ENGINE FÜR DIE DURCHGÄNGIGE FALLAKTE (MENSCH & KI)
// Baut aus den Stammdaten (akten) und den Einzelvorgängen (akten_historie) deterministisch:
// 1. Einen lückenlosen, durchnummerierten Zeitstrahl (#01 .. #NN) inkl. bezug_id-Auflösung und Fristen-Status
// 2. Ein standardisiertes, KI- & menschenlesbares Master-Protokoll (FALLAKTE_<Unser_Zeichen>.md)
// 3. Einen kompakten Kopf-Index für den War-Room (MegaLegalModal.jsx)
// 4. Eine saubere, mehrseitige Druckansicht der kompletten Fallakte inkl. Schriftsatztexten

import { extractFilename, cleanVal } from '../utils';

// Sicheres deutsches Datumsformat TT.MM.JJJJ ohne Zeitzonen-Verschiebung bei YYYY-MM-DD
export function formatFallakteDatum(val) {
  if (!val) return '-';
  const s = String(val).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Sortier-Zeitstempel für streng chronologische Reihenfolge (Tag 1 -> Heute)
function getChronoSortKey(entry) {
  const dateStr = entry?.datum ? String(entry.datum).trim() : '';
  const createdStr = entry?.created_at ? String(entry.created_at).trim() : '';

  let primaryTs = 0;
  if (dateStr) {
    const parsed = Date.parse(dateStr.length === 10 ? `${dateStr}T00:00:00Z` : dateStr);
    if (!Number.isNaN(parsed)) primaryTs = parsed;
  }

  let secondaryTs = 0;
  if (createdStr) {
    const parsedC = Date.parse(createdStr);
    if (!Number.isNaN(parsedC)) secondaryTs = parsedC;
  }

  return {
    primary: primaryTs || secondaryTs || 0,
    secondary: secondaryTs || primaryTs || 0
  };
}

// Berechnet Kalendertage bis zu einer Frist / Wiedervorlage relativ zum heutigen Tag
function computeDaysUntil(isoDateStr) {
  if (!isoDateStr) return null;
  const match = String(isoDateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Zerlegt dokument_url sauber in sichtbare Original-Dokumente (PDF/Bilder/etc.) und .md-Textzwillinge
export function parseHistorieDokumente(dokumentUrlStr) {
  if (!dokumentUrlStr || typeof dokumentUrlStr !== 'string') {
    return { visibleDocs: [], mdTwins: [] };
  }

  const parts = dokumentUrlStr
    .split(',')
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  const visibleDocs = [];
  const mdTwins = [];

  parts.forEach((url) => {
    const baseClean = url.split('?')[0].split('#')[0].toLowerCase();
    const labelHashMatch = url.match(/#label=([^&]+)/i);
    const customLabel = labelHashMatch ? decodeURIComponent(labelHashMatch[1]) : null;
    const fileName = customLabel || extractFilename(url);

    if (baseClean.endsWith('.md')) {
      mdTwins.push({ url, fileName });
    } else {
      visibleDocs.push({
        url,
        fileName,
        twinCandidateUrl: baseClean.endsWith('.pdf')
          ? url.replace(/\.pdf(\?.*)?$/i, '.md')
          : null
      });
    }
  });

  return { visibleDocs, mdTwins };
}

// Erzeugt einen sauberen, eindeutigen Dateinamen für das Fallakten-Masterdokument im Storage / GitHub / Drive
export function getFallakteStorageFilename(akte) {
  const rawZeichen = cleanVal(akte?.unser_zeichen) || cleanVal(akte?.id) || 'UNBEKANNT';
  const safeSlug = String(rawZeichen)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `FALLAKTE_${safeSlug || 'AKTE'}.md`;
}

/**
 * Kern-Builder: Erstellt die strukturierte Fallakte aus einem Akten-Objekt (inkl. akte.akten_historie)
 * Optional kann eine explizite Historien-Liste übergeben werden (z. B. direkt nach DB-Insert).
 */
export function buildFallakteChronologie(akte, explicitHistorie = null) {
  if (!akte) {
    return {
      akteId: null,
      storageFilename: 'FALLAKTE_LEER.md',
      meta: {},
      stats: { total: 0, eingaenge: 0, ausgaenge: 0, intern: 0, docsTotal: 0 },
      activeDeadlines: [],
      nextDeadline: null,
      entriesAsc: [],
      entriesDesc: []
    };
  }

  const rawList = Array.isArray(explicitHistorie)
    ? explicitHistorie
    : Array.isArray(akte.akten_historie)
    ? akte.akten_historie
    : [];

  // 1. Streng chronologisch sortieren (Ältester Vorgang = #01 bis Neuester Vorgang = #NN)
  const sortedAsc = [...rawList].sort((a, b) => {
    const ka = getChronoSortKey(a);
    const kb = getChronoSortKey(b);
    if (ka.primary !== kb.primary) return ka.primary - kb.primary;
    if (ka.secondary !== kb.secondary) return ka.secondary - kb.secondary;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  // 2. Map für Nummerierung (#01, #02 ...) und Rückwärts-/Vorwärts-Bezüge (bezug_id) aufbauen
  const byIdMap = new Map();
  sortedAsc.forEach((item, index) => {
    const stepNo = index + 1;
    const stepCode = `#${String(stepNo).padStart(2, '0')}`;
    byIdMap.set(item.id, { item, stepNo, stepCode, childrenCodes: [] });
  });

  sortedAsc.forEach((item) => {
    if (item.bezug_id && byIdMap.has(item.bezug_id)) {
      const parentRef = byIdMap.get(item.bezug_id);
      const selfRef = byIdMap.get(item.id);
      if (parentRef && selfRef) {
        parentRef.childrenCodes.push(selfRef.stepCode);
      }
    }
  });

  // 3. Einträge anreichern & Statistiken / offene Fristen sammeln
  let eingaenge = 0;
  let ausgaenge = 0;
  let intern = 0;
  let docsTotal = 0;
  const activeDeadlines = [];

  const entriesAsc = sortedAsc.map((h) => {
    const refInfo = byIdMap.get(h.id);
    const typNorm = cleanVal(h.typ) || 'Intern';
    if (typNorm === 'Eingang') eingaenge += 1;
    else if (typNorm === 'Ausgang') ausgaenge += 1;
    else intern += 1;

    const { visibleDocs, mdTwins } = parseHistorieDokumente(h.dokument_url);
    docsTotal += visibleDocs.length;

    let bezugInfo = null;
    if (h.bezug_id && byIdMap.has(h.bezug_id)) {
      const target = byIdMap.get(h.bezug_id);
      bezugInfo = {
        id: h.bezug_id,
        stepCode: target.stepCode,
        typ: target.item.typ || 'Vorgang',
        datumFormatted: formatFallakteDatum(target.item.datum || target.item.created_at),
        aktionKurz: (cleanVal(target.item.aktion) || target.item.typ || 'Vorgang').substring(0, 80)
      };
    }

    const fristIso = cleanVal(h.frist_extern) || null;
    const wvIso = cleanVal(h.wiedervorlage) || null;
    const fristDaysLeft = fristIso ? computeDaysUntil(fristIso) : null;
    const wvDaysLeft = wvIso ? computeDaysUntil(wvIso) : null;

    if (fristIso && akte.status !== 'Erledigt') {
      activeDeadlines.push({
        histId: h.id,
        stepCode: refInfo.stepCode,
        kind: 'BEHÖRDEN-/GERICHTSFRIST',
        isoDate: fristIso,
        formattedDate: formatFallakteDatum(fristIso),
        daysLeft: fristDaysLeft,
        aktion: cleanVal(h.aktion) || typNorm
      });
    }

    if (wvIso && akte.status !== 'Erledigt') {
      activeDeadlines.push({
        histId: h.id,
        stepCode: refInfo.stepCode,
        kind: 'WIEDERVORLAGE',
        isoDate: wvIso,
        formattedDate: formatFallakteDatum(wvIso),
        daysLeft: wvDaysLeft,
        aktion: cleanVal(h.aktion) || typNorm
      });
    }

    const fullText = cleanVal(h.brief_entwurf) || '';
    const previewText =
      fullText.length > 260 ? `${fullText.substring(0, 260).trim()} …` : fullText;

    return {
      id: h.id,
      stepNo: refInfo.stepNo,
      stepCode: refInfo.stepCode,
      typ: typNorm,
      datumIso: cleanVal(h.datum) || (h.created_at ? String(h.created_at).split('T')[0] : ''),
      datumFormatted: formatFallakteDatum(h.datum || h.created_at),
      aktion: cleanVal(h.aktion) || 'Ohne Vorgangsbeschreibung',
      kanal: cleanVal(h.kanal) || '-',
      fristIso,
      fristFormatted: fristIso ? formatFallakteDatum(fristIso) : null,
      fristDaysLeft,
      wvIso,
      wvFormatted: wvIso ? formatFallakteDatum(wvIso) : null,
      wvDaysLeft,
      bezugInfo,
      folgevorgaengeCodes: refInfo.childrenCodes,
      visibleDocs,
      mdTwins,
      briefText: fullText,
      previewText,
      isLocked: Boolean(h.is_locked || akte.is_demo_showcase),
      raw: h
    };
  });

  // Offene Fristen nach Dringlichkeit sortieren (Behördenfristen & frühestes Datum zuerst)
  activeDeadlines.sort((a, b) => {
    const da = a.daysLeft ?? 99999;
    const db = b.daysLeft ?? 99999;
    if (da !== db) return da - db;
    if (a.kind !== b.kind) return a.kind === 'BEHÖRDEN-/GERICHTSFRIST' ? -1 : 1;
    return 0;
  });

  const meta = {
    unserZeichen: cleanVal(akte.unser_zeichen) || 'Ohne Zeichen',
    aktenzeichenGegner: cleanVal(akte.aktenzeichen) || '-',
    thema: cleanVal(akte.thema) || 'Ohne Gegenstand',
    status: cleanVal(akte.status) || 'Offen',
    unsereFirma: cleanVal(akte.unsere_firma) || '-',
    unserAnsprechpartner: cleanVal(akte.unser_ansprechpartner) || '-',
    unserTelefon: cleanVal(akte.unser_telefon) || '-',
    unserEmail: cleanVal(akte.unser_email) || '-',
    gegnerName: cleanVal(akte.gegner_name) || 'Unbekannte Gegenpartei',
    gegnerAnsprechpartner: cleanVal(akte.gegner_ansprechpartner) || '-',
    gegnerTelefon: cleanVal(akte.gegner_telefon) || '-',
    gegnerEmail: cleanVal(akte.gegner_email) || '-',
    angelegtAm: formatFallakteDatum(akte.created_at),
    ersterVorgangAm: entriesAsc.length > 0 ? entriesAsc[0].datumFormatted : '-',
    letzterVorgangAm:
      entriesAsc.length > 0 ? entriesAsc[entriesAsc.length - 1].datumFormatted : '-',
    isLocked: Boolean(akte.is_locked || akte.is_demo_showcase),
    isShowcase: Boolean(akte.is_demo_showcase)
  };

  return {
    akteId: akte.id,
    storageFilename: getFallakteStorageFilename(akte),
    meta,
    stats: {
      total: entriesAsc.length,
      eingaenge,
      ausgaenge,
      intern,
      docsTotal
    },
    activeDeadlines,
    nextDeadline: activeDeadlines.length > 0 ? activeDeadlines[0] : null,
    entriesAsc,
    entriesDesc: [...entriesAsc].reverse()
  };
}

/**
 * Erzeugt einen ultrakompakten, strukturierten Master-Ablaufplan für den KI-War-Room (MegaLegalModal.jsx),
 * damit die KI sofort chronologisch sieht, was wann rein- und rausging, was worauf Bezug nimmt
 * und welche Frist aktuell offen ist – ohne im Blindflug suchen zu müssen.
 */
export function buildCompactWarRoomIndex(akte, explicitHistorie = null) {
  const parsed = buildFallakteChronologie(akte, explicitHistorie);
  const { meta, stats, activeDeadlines, entriesAsc } = parsed;

  const lines = [
    '====================================================================',
    `SONAR FALLAKTE (CHRONOLOGISCHER MASTER-INDEX FÜR KI & SACHBEARBEITUNG)`,
    '====================================================================',
    `- Unser Zeichen: ${meta.unserZeichen} | Status: ${meta.status}`,
    `- Gegenstand / Thema: ${meta.thema}`,
    `- Mandant (Wir): ${meta.unsereFirma} (Ansprechpartner: ${meta.unserAnsprechpartner})`,
    `- Gegenpartei / Behörde / Gericht: ${meta.gegnerName} (AP: ${meta.gegnerAnsprechpartner} | Fremd-AZ: ${meta.aktenzeichenGegner})`,
    `- Umfang: ${stats.total} Vorgänge (${stats.eingaenge}x Eingang, ${stats.ausgaenge}x Ausgang, ${stats.intern}x Intern) | ${stats.docsTotal} Original-Dokument(e)`,
    ''
  ];

  if (activeDeadlines.length > 0) {
    lines.push('AKTIVE FRISTEN & WIEDERVORLAGEN IN DIESER AKTE:');
    activeDeadlines.forEach((dl) => {
      const restHinweis =
        dl.daysLeft === null
          ? ''
          : dl.daysLeft < 0
          ? ` [ÜBERFÄLLIG SEIT ${Math.abs(dl.daysLeft)} TAGEN!]`
          : dl.daysLeft === 0
          ? ' [HEUTE FÄLLIG!]'
          : ` [noch ${dl.daysLeft} Tag(e)]`;
      lines.push(
        `  * ${dl.kind}: ${dl.formattedDate}${restHinweis} – aus Vorgang ${dl.stepCode} (${dl.aktion})`
      );
    });
    lines.push('');
  } else {
    lines.push('AKTIVE FRISTEN & WIEDERVORLAGEN: Keine offenen Fristen eingetragen.');
    lines.push('');
  }

  lines.push('CHRONOLOGISCHER VERFAHRENSABLAUF (VON TAG 1 BIS AKTUELLER STAND):');
  if (entriesAsc.length === 0) {
    lines.push('  (Noch keine Vorgänge in akten_historie gespeichert)');
  } else {
    entriesAsc.forEach((e) => {
      const bezugPart = e.bezugInfo ? ` | Bezug auf ${e.bezugInfo.stepCode}` : '';
      const folgePart =
        e.folgevorgaengeCodes.length > 0
          ? ` | Beantwortet/Fortgeführt in ${e.folgevorgaengeCodes.join(', ')}`
          : '';
      const fristPart = e.fristFormatted
        ? ` | Offene Frist: ${e.fristFormatted}`
        : e.wvFormatted
        ? ` | Offene WV: ${e.wvFormatted}`
        : '';
      const docNames =
        e.visibleDocs.length > 0
          ? ` | Dateien: ${e.visibleDocs.map((d) => d.fileName).join(', ')}`
          : '';
      lines.push(
        `  ${e.stepCode} [${e.datumFormatted}] ${e.typ.toUpperCase()} (${e.kanal}): ${e.aktion}${bezugPart}${folgePart}${fristPart}${docNames}`
      );
    });
  }
  lines.push('====================================================================');

  return lines.join('\n');
}

/**
 * Erzeugt das vollständige, speicher- und exportfähige Markdown-Dokument FALLAKTE_<Unser_Zeichen>.md
 * (ideal für automatischen Storage-/Wissensspeicher-/Drive-Sync sowie 1-Klick-Übergabe an externe KI-Skills).
 */
export function buildFallakteMarkdown(akte, explicitHistorie = null, options = {}) {
  const { includeFullTexts = true, maxCharsPerEntry = 25000 } = options;
  const parsed = buildFallakteChronologie(akte, explicitHistorie);
  const { meta, stats, activeDeadlines, entriesAsc, storageFilename } = parsed;
  const generatedAt = new Date().toLocaleString('de-DE');

  const md = [
    `# FALLAKTE: [${meta.unserZeichen}] ${meta.gegnerName} – ${meta.thema}`,
    '',
    `- **Datei-Kennung:** \`${storageFilename}\``,
    `- **Stand der Fallakte:** ${generatedAt}`,
    `- **Akten-Status:** ${meta.status}${meta.isLocked ? ' (Versiegelt / Schreibgeschützt)' : ''}`,
    '',
    '## 1. Stammdaten & Parteien',
    '| Feld | Wert |',
    '| :--- | :--- |',
    `| **Unser Zeichen** | ${meta.unserZeichen} |`,
    `| **Fremd-Aktenzeichen / StNr.** | ${meta.aktenzeichenGegner} |`,
    `| **Gegenstand / Thema** | ${meta.thema} |`,
    `| **Mandant (Wir)** | ${meta.unsereFirma} (${meta.unserAnsprechpartner}) |`,
    `| **Gegenpartei / Behörde / Gericht** | ${meta.gegnerName} |`,
    `| **Ansprechpartner Gegenseite** | ${meta.gegnerAnsprechpartner} |`,
    `| **Kontakt Gegenseite** | Tel: ${meta.gegnerTelefon} / E-Mail: ${meta.gegnerEmail} |`,
    `| **Zeitraum der Akte** | ${meta.ersterVorgangAm} bis ${meta.letzterVorgangAm} (${stats.total} Vorgänge, ${stats.docsTotal} Original-Dokumente) |`,
    '',
    '## 2. Aktuelle Fristen- & Wiedervorlagen-Lage'
  ];

  if (activeDeadlines.length === 0) {
    md.push('- Aktuell sind keine offenen Fristen oder Wiedervorlagen in dieser Akte aktiv.');
  } else {
    activeDeadlines.forEach((dl) => {
      const statusTag =
        dl.daysLeft === null
          ? ''
          : dl.daysLeft < 0
          ? ` **(ÜBERFÄLLIG seit ${Math.abs(dl.daysLeft)} Tagen!)**`
          : dl.daysLeft === 0
          ? ' **(HEUTE FÄLLIG!)**'
          : ` *(noch ${dl.daysLeft} Kalendertage)*`;
      md.push(
        `- **${dl.kind}: ${dl.formattedDate}**${statusTag} — Vorgang ${dl.stepCode}: ${dl.aktion}`
      );
    });
  }

  md.push('');
  md.push('## 3. Chronologischer Ablaufplan (Übersicht von Tag 1 bis heute)');

  if (entriesAsc.length === 0) {
    md.push('_Noch keine Historieneinträge vorhanden._');
  } else {
    md.push('| Nr. | Datum | Typ | Kanal | Vorgang / Aktion | Bezug | Frist / WV | Dokumente |');
    md.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
    entriesAsc.forEach((e) => {
      const safeAktion = e.aktion.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
      const bezugCol = e.bezugInfo ? `↳ zu ${e.bezugInfo.stepCode}` : '-';
      const fristCol = e.fristFormatted
        ? `Frist: ${e.fristFormatted}`
        : e.wvFormatted
        ? `WV: ${e.wvFormatted}`
        : '-';
      const docsCol =
        e.visibleDocs.length > 0
          ? e.visibleDocs.map((d) => d.fileName.replace(/\|/g, '/')).join(', ')
          : '-';
      md.push(
        `| **${e.stepCode}** | ${e.datumFormatted} | ${e.typ} | ${e.kanal.replace(/\|/g, '/')} | ${safeAktion} | ${bezugCol} | ${fristCol} | ${docsCol} |`
      );
    });
  }

  if (includeFullTexts && entriesAsc.length > 0) {
    md.push('');
    md.push('---');
    md.push('## 4. Detailliertes Vorgangs- & Schriftsatz-Protokoll');

    entriesAsc.forEach((e) => {
      md.push('');
      md.push(`### ${e.stepCode} — [${e.datumFormatted}] ${e.typ.toUpperCase()}: ${e.aktion}`);
      md.push(`- **Kanal:** ${e.kanal}`);
      if (e.bezugInfo) {
        md.push(
          `- **Bezug:** Antwort / Folgeschritt zu ${e.bezugInfo.stepCode} (${e.bezugInfo.typ} vom ${e.bezugInfo.datumFormatted} – ${e.bezugInfo.aktionKurz})`
        );
      }
      if (e.folgevorgaengeCodes.length > 0) {
        md.push(`- **Weitergeführt in:** ${e.folgevorgaengeCodes.join(', ')}`);
      }
      if (e.fristFormatted) md.push(`- **Externe Frist:** ${e.fristFormatted}`);
      if (e.wvFormatted) md.push(`- **Interne Wiedervorlage:** ${e.wvFormatted}`);

      if (e.visibleDocs.length > 0) {
        md.push('- **Verknüpfte Original-Dokumente:**');
        e.visibleDocs.forEach((d) => {
          md.push(`  - [${d.fileName}](${d.url})`);
        });
      }

      if (e.briefText) {
        const clipped =
          e.briefText.length > maxCharsPerEntry
            ? `${e.briefText.substring(0, maxCharsPerEntry)}\n\n[... gekürzt bei ${maxCharsPerEntry} Zeichen ...]`
            : e.briefText;
        md.push('');
        md.push('**Hinterlegter Schriftsatz / Inhalt / Aktenvermerk:**');
        md.push('```text');
        md.push(clipped);
        md.push('```');
      } else {
        md.push('- _Kein separater Brieftext / Entwurfstext im Vorgang hinterlegt._');
      }
    });
  }

  return md.join('\n');
}

function escapeHtmlSafe(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Öffnet eine saubere, druckfertige Komplett-Fallakte (inkl. Zeitstrahl-Tabelle und optional allen Schriftsätzen).
 */
export function druckeFallakteKomplett(akte, includeFullTexts = true) {
  if (typeof window === 'undefined' || !akte) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const parsed = buildFallakteChronologie(akte);
  const { meta, stats, activeDeadlines, entriesAsc } = parsed;

  const deadlineBannerHtml =
    activeDeadlines.length > 0
      ? `<div class="deadline-box"><strong>AKTIVE FRISTEN / WIEDERVORLAGEN:</strong><ul>${activeDeadlines
          .map(
            (dl) =>
              `<li><strong>${escapeHtmlSafe(dl.kind)}: ${escapeHtmlSafe(
                dl.formattedDate
              )}</strong> (${escapeHtmlSafe(dl.stepCode)} – ${escapeHtmlSafe(dl.aktion)})</li>`
          )
          .join('')}</ul></div>`
      : '';

  const tableRowsHtml = entriesAsc
    .map((e) => {
      const bezugTxt = e.bezugInfo ? `↳ ${e.bezugInfo.stepCode}` : '-';
      const fristTxt = e.fristFormatted
        ? `Frist: ${e.fristFormatted}`
        : e.wvFormatted
        ? `WV: ${e.wvFormatted}`
        : '-';
      const docsTxt =
        e.visibleDocs.length > 0 ? e.visibleDocs.map((d) => d.fileName).join(', ') : '-';
      return `<tr>
        <td><strong>${escapeHtmlSafe(e.stepCode)}</strong></td>
        <td>${escapeHtmlSafe(e.datumFormatted)}</td>
        <td><strong>${escapeHtmlSafe(e.typ)}</strong><br/><span class="muted">${escapeHtmlSafe(
        e.kanal
      )}</span></td>
        <td>${escapeHtmlSafe(e.aktion)}</td>
        <td>${escapeHtmlSafe(bezugTxt)}</td>
        <td>${escapeHtmlSafe(fristTxt)}</td>
        <td>${escapeHtmlSafe(docsTxt)}</td>
      </tr>`;
    })
    .join('');

  const detailBlocksHtml = includeFullTexts
    ? entriesAsc
        .map(
          (e) => `<div class="entry-block">
            <div class="entry-head">
              <strong>${escapeHtmlSafe(e.stepCode)} | ${escapeHtmlSafe(
            e.datumFormatted
          )} | ${escapeHtmlSafe(e.typ.toUpperCase())}</strong> — ${escapeHtmlSafe(e.aktion)}
            </div>
            <div class="entry-meta">
              Kanal: ${escapeHtmlSafe(e.kanal)}
              ${
                e.bezugInfo
                  ? ` | Bezug: ${escapeHtmlSafe(e.bezugInfo.stepCode)} (${escapeHtmlSafe(
                      e.bezugInfo.datumFormatted
                    )})`
                  : ''
              }
              ${
                e.visibleDocs.length > 0
                  ? ` | Dokumente: ${escapeHtmlSafe(
                      e.visibleDocs.map((d) => d.fileName).join(', ')
                    )}`
                  : ''
              }
            </div>
            ${
              e.briefText
                ? `<pre>${escapeHtmlSafe(e.briefText)}</pre>`
                : '<div class="muted" style="margin-top:6px;">(Kein Schriftsatz-/Notiztext hinterlegt)</div>'
            }
          </div>`
        )
        .join('')
    : '';

  printWindow.document.write(`<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Fallakte - ${escapeHtmlSafe(meta.unserZeichen)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111; line-height: 1.45; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 6px 0; border-bottom: 2px solid #000; padding-bottom: 6px; text-transform: uppercase; }
    h2 { font-size: 14px; margin: 22px 0 8px 0; border-bottom: 1px solid #999; padding-bottom: 4px; text-transform: uppercase; }
    .sub { font-size: 11px; color: #444; margin-bottom: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f4f4f5; padding: 12px; border-radius: 6px; border: 1px solid #d4d4d8; margin-bottom: 14px; }
    .deadline-box { background: #fef2f2; border: 1px solid #ef4444; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; }
    .deadline-box ul { margin: 6px 0 0 18px; padding: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #e2e8f0; font-weight: bold; }
    .muted { color: #64748b; font-size: 10.5px; }
    .entry-block { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; page-break-inside: avoid; }
    .entry-head { font-size: 12.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px; }
    .entry-meta { font-size: 10.5px; color: #475569; margin-bottom: 6px; }
    pre { white-space: pre-wrap; word-break: break-word; font-family: Consolas, Courier, monospace; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 4px; margin: 6px 0 0 0; }
  </style>
</head>
<body>
  <h1>SONAR FALLAKTE | UNSER ZEICHEN: ${escapeHtmlSafe(meta.unserZeichen)}</h1>
  <div class="sub">Gegenstand: <strong>${escapeHtmlSafe(meta.thema)}</strong> | Status: <strong>${escapeHtmlSafe(
    meta.status
  )}</strong> | Vorgänge gesamt: ${stats.total} (${stats.eingaenge} Eingang / ${
    stats.ausgaenge
  } Ausgang / ${stats.intern} Intern)</div>

  <div class="grid">
    <div>
      <strong>GEGENPARTEI / BEHÖRDE / GERICHT:</strong><br/>
      ${escapeHtmlSafe(meta.gegnerName)}<br/>
      Ansprechpartner: ${escapeHtmlSafe(meta.gegnerAnsprechpartner)}<br/>
      Fremd-Aktenzeichen: <strong>${escapeHtmlSafe(meta.aktenzeichenGegner)}</strong><br/>
      Tel: ${escapeHtmlSafe(meta.gegnerTelefon)} | E-Mail: ${escapeHtmlSafe(meta.gegnerEmail)}
    </div>
    <div>
      <strong>MANDANT / EIGENE EINHEIT:</strong><br/>
      ${escapeHtmlSafe(meta.unsereFirma)}<br/>
      Ansprechpartner: ${escapeHtmlSafe(meta.unserAnsprechpartner)}<br/>
      Zeitraum: ${escapeHtmlSafe(meta.ersterVorgangAm)} bis ${escapeHtmlSafe(meta.letzterVorgangAm)}<br/>
      Original-Anhänge: ${stats.docsTotal} Datei(en)
    </div>
  </div>

  ${deadlineBannerHtml}

  <h2>1. Chronologischer Ablaufplan</h2>
  <table>
    <thead>
      <tr>
        <th style="width:42px;">Nr.</th>
        <th style="width:78px;">Datum</th>
        <th style="width:105px;">Typ / Kanal</th>
        <th>Vorgang / Aktion</th>
        <th style="width:65px;">Bezug</th>
        <th style="width:95px;">Frist / WV</th>
        <th style="width:140px;">Dokumente</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml || '<tr><td colspan="7">Noch keine Vorgänge eingetragen.</td></tr>'}
    </tbody>
  </table>

  ${includeFullTexts ? `<h2>2. Vollständiges Vorgangs- & Schriftsatz-Protokoll</h2>${detailBlocksHtml}` : ''}

  <script>window.onload = function() { window.print(); window.close(); };</script>
</body>
</html>`);

  printWindow.document.close();
}