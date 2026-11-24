// src/hooks/useAktenScannerImport.js
// KAPSELT KI-WEB-SCANNER, MAGIC-/JSON-IMPORT, IMPORT_QUEUE-REALTIME & TRESOR-/GEGNER-CRM-ABGLEICH
// 100 % verlustfreie Auslagerung aus AktenCockpit.jsx zur drastischen Reduktion der Dateigröße.

import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { syncToGithub, normalizeName, cleanVal } from '../utils';
import {
  sanitizeOwnContactName,
  cleanSlugForFilename,
  normalizeDateForInput,
  formatRufnummer,
  cleanOrgName,
  fuzzyMatch,
  findBestMatchingAkteInList,
  findSmartBezugInAkte,
  extractTextFromPDF,
  fileToBase64
} from '../utils/aktenHelpers';

export function useAktenScannerImport({
  session,
  akten,
  mandanten,
  gegnerListe,
  ladeDaten,
  showToast,
  dateien,
  setDateien,
  setLaedt,
  setWebScanLaedt,
  setWebScanStatus,
  setJsonImport,
  setModus,
  setSelectedAkteId,
  setBezugId,
  setUnserZeichen,
  setAktenzeichen,
  setThema,
  gegnerName,
  setGegnerName,
  gegnerAnsprechpartner,
  setGegnerAnsprechpartner,
  setGegnerTelefon,
  gegnerFax,
  setGegnerFax,
  setGegnerEmail,
  setFaxZhd,
  setUnsereFirma,
  setUnserAnsprechpartner,
  unserTelefon,
  setUnserTelefon,
  unserEmail,
  setUnserEmail,
  setTyp,
  setDatum,
  setAktion,
  setKanal,
  setFristExtern,
  setWiedervorlage,
  handleFristChange,
  handleWVChange,
  setBriefEntwurf,
  setRawText,
  setVersandPdfUrl,
  tresorPrompt,
  setTresorPrompt,
  gegnerPrompt,
  setGegnerPrompt
}) {
  // --- INTELLIGENTE GEGNER-PRÜFUNG MIT MEHREREN VORSCHLÄGEN & ANSPRECHPARTNER-TIEFE ---
  const checkGegnerDiff = (neuName, neuFax, neuEmail, neuAnsprechpartner, neuTelefon) => {
    if (!neuName) return false;

    const cleanNeuAP = (neuAnsprechpartner || '').trim().toLowerCase();
    const isZentrale = !cleanNeuAP || cleanNeuAP === 'zentrale' || cleanNeuAP === 'poststelle';

    const exactTarget = gegnerListe.find((g) => normalizeName(g.name) === normalizeName(neuName));
    const fuzzyTargets = gegnerListe.filter((g) => fuzzyMatch(g.name, neuName));

    let vorschlaege = [];
    if (exactTarget) {
      const restFuzzy = fuzzyTargets.filter((f) => f.id !== exactTarget.id);
      vorschlaege = [exactTarget, ...restFuzzy];
    } else if (fuzzyTargets.length > 0) {
      vorschlaege = fuzzyTargets;
    }

    if (vorschlaege.length === 1 && exactTarget) {
      const target = vorschlaege[0];
      let contacts = [];
      try {
        contacts = typeof target.notizen === 'string' ? JSON.parse(target.notizen) : target.notizen || [];
        if (!Array.isArray(contacts)) contacts = [];
      } catch (_e) {
        contacts = [];
      }

      if (isZentrale && contacts.length === 0) {
        setGegnerName(target.name);
        if (!neuTelefon && target.telefon) setGegnerTelefon(formatRufnummer(target.telefon));
        if (!neuEmail && (target.email || target.email_zentrale)) {
          setGegnerEmail(target.email || target.email_zentrale);
        }
        if (!neuFax && target.fax) setGegnerFax(formatRufnummer(target.fax));
        return false;
      }

      if (!isZentrale) {
        const matchedContact = contacts.find((c) => {
          const cName = (c.name || '').trim().toLowerCase();
          const cAbt = (c.abteilung || '').trim().toLowerCase();
          return (
            (cName && (cName.includes(cleanNeuAP) || cleanNeuAP.includes(cName))) ||
            (cAbt && (cAbt.includes(cleanNeuAP) || cleanNeuAP.includes(cAbt)))
          );
        });

        if (matchedContact) {
          setGegnerName(target.name);
          const displayAP = matchedContact.name || matchedContact.abteilung || neuAnsprechpartner;
          setGegnerAnsprechpartner(displayAP);
          setFaxZhd(displayAP);
          if (!neuTelefon && matchedContact.telefon) setGegnerTelefon(formatRufnummer(matchedContact.telefon));
          if (!neuEmail && (matchedContact.email || target.email || target.email_zentrale)) {
            setGegnerEmail(matchedContact.email || target.email || target.email_zentrale);
          }
          if (!neuFax && target.fax) setGegnerFax(formatRufnummer(target.fax));
          return false;
        }
      }
    }

    setGegnerPrompt({
      typ: 'auswahl',
      obj: {
        name: neuName,
        ansprechpartner: neuAnsprechpartner,
        telefon: formatRufnummer(neuTelefon),
        fax: formatRufnummer(neuFax),
        email: neuEmail
      },
      vorschlaege: vorschlaege
    });
    return true;
  };

  // --- MAGIC- / JSON-IMPORT & BULK-GEGNER-IMPORT ---
  const handleJsonImport = async (e) => {
    const val = e.target.value.trim();
    setJsonImport(val);

    try {
      const obj = JSON.parse(val);

      if (obj.typ === 'Bulk-Gegner' && Array.isArray(obj.daten)) {
        setLaedt(true);
        let addedCount = 0;
        let updatedCount = 0;
        for (const item of obj.daten) {
          if (!item.gegner_name) continue;
          const existingGegner = gegnerListe.find((g) => fuzzyMatch(g.name, item.gegner_name));
          if (!existingGegner) {
            await supabase.from('gegner').insert([
              {
                user_id: session.user.id,
                name: item.gegner_name,
                fax: formatRufnummer(item.fax),
                email: item.email || null,
                notizen: JSON.stringify([
                  {
                    abteilung: item.abteilung || '',
                    name: item.ansprechpartner || '',
                    telefon: formatRufnummer(item.telefon),
                    email: item.email || ''
                  }
                ])
              }
            ]);
            addedCount++;
          } else {
            const updates = {};
            let needsUpdate = false;
            if (!existingGegner.fax && item.fax) {
              updates.fax = formatRufnummer(item.fax);
              needsUpdate = true;
            }
            if (!existingGegner.email && item.email) {
              updates.email = item.email;
              needsUpdate = true;
            }
            let currentContacts = [];
            try {
              currentContacts =
                typeof existingGegner.notizen === 'string'
                  ? JSON.parse(existingGegner.notizen)
                  : existingGegner.notizen || [];
              if (!Array.isArray(currentContacts)) currentContacts = [];
            } catch (_err) {
              currentContacts = [];
            }
            if (item.ansprechpartner || item.abteilung) {
              const contactExists = currentContacts.some(
                (c) =>
                  (c.name || '').toLowerCase() === (item.ansprechpartner || '').toLowerCase() &&
                  (c.abteilung || '').toLowerCase() === (item.abteilung || '').toLowerCase()
              );
              if (!contactExists) {
                currentContacts.push({
                  abteilung: item.abteilung || '',
                  name: item.ansprechpartner || '',
                  telefon: formatRufnummer(item.telefon),
                  email: item.email || ''
                });
                updates.notizen = JSON.stringify(currentContacts);
                needsUpdate = true;
              }
            }
            if (needsUpdate) {
              await supabase.from('gegner').update(updates).eq('id', existingGegner.id);
              updatedCount++;
            }
          }
        }
        await ladeDaten();
        setJsonImport('');
        setLaedt(false);
        showToast(
          `KI-Gegner-Scan abgeschlossen!\n\n${addedCount} neue Behörden/Gegner angelegt.\n${updatedCount} bestehende aktualisiert.`,
          'success'
        );
        return;
      }

      const fallbackUnserZeichen = obj.unser_zeichen || '';
      const fallbackAktenzeichen = obj.aktenzeichen || '';
      const fallbackThema = obj.thema || obj.betreff || obj.gegenstand || '';
      const fallbackGegnerName = obj.kontakt || (obj.empfaenger ? obj.empfaenger.name : '') || '';
      const fallbackGegnerAnsprechpartner =
        obj.ansprechpartner || (obj.empfaenger ? obj.empfaenger.abteilung : '') || '';
      const fallbackGegnerTelefon = obj.gegner_telefon || '';
      const fallbackGegnerFax =
        obj.gegner_fax || obj.versand_faxnummer_gegner || (obj.empfaenger ? obj.empfaenger.fax : '') || '';
      const fallbackGegnerEmail =
        obj.gegner_email || obj.versand_e_mail_gegner || (obj.empfaenger ? obj.empfaenger.email : '') || '';

      const rawFristExtern = normalizeDateForInput(obj.frist_extern || obj.frist || '');
      const rawWiedervorlage = normalizeDateForInput(obj.wiedervorlage || obj.wv_intern || obj.wv || '');
      const parsedDocDatum = normalizeDateForInput(obj.datum || '') || new Date().toISOString().split('T')[0];

      const fallbackBriefEntwurf = obj.brief_entwurf || obj.textentwurf || obj.nachricht || '';
      const fallbackRawText = obj.raw_text || '';
      const fallbackAktion = obj.aktion || obj.status || '';
      const fallbackKanal = obj.kanal || obj.versandweg || 'Post / Fax / E-Mail';
      const fallbackTyp = obj.typ || obj.dokumententyp || 'Eingang';
      const fallbackUnsereFirma = obj.unsere_firma || (obj.absender ? obj.absender.name : '') || '';

      if (fallbackUnserZeichen) setUnserZeichen(fallbackUnserZeichen);
      setAktenzeichen(fallbackAktenzeichen);
      setThema(fallbackThema);
      setGegnerName(fallbackGegnerName);
      setGegnerAnsprechpartner(fallbackGegnerAnsprechpartner);
      setGegnerTelefon(formatRufnummer(fallbackGegnerTelefon));
      setGegnerFax(formatRufnummer(fallbackGegnerFax));
      setGegnerEmail(fallbackGegnerEmail);

      const aktionLower = fallbackAktion.toLowerCase();
      const rawLower = fallbackRawText.toLowerCase();
      const hasExplicitAuthorityDeadlineInText =
        rawLower.includes('frist') ||
        rawLower.includes('innerhalb von') ||
        rawLower.includes('bis spätestens') ||
        rawLower.includes('bis zum') ||
        rawLower.includes('rechtsbehelf');
      const looksLikeInternalWv =
        fallbackTyp !== 'Eingang' ||
        aktionLower.includes('wiedervorlage') ||
        aktionLower.includes('abwarten') ||
        aktionLower.includes('interne prüfung') ||
        (aktionLower.includes('überweisung') && !hasExplicitAuthorityDeadlineInText);

      if (rawWiedervorlage) {
        handleWVChange(rawWiedervorlage);
      } else if (rawFristExtern) {
        if (looksLikeInternalWv) {
          handleWVChange(rawFristExtern);
        } else {
          handleFristChange(rawFristExtern);
        }
      } else {
        setFristExtern('');
        setWiedervorlage('');
      }

      setBriefEntwurf(fallbackBriefEntwurf);
      setRawText(fallbackRawText);
      setAktion(fallbackAktion);
      setKanal(fallbackKanal);
      setTyp(fallbackTyp);
      setDatum(parsedDocDatum);
      setFaxZhd(fallbackGegnerAnsprechpartner);

      if (obj.pdf_url) {
        setVersandPdfUrl(obj.pdf_url);
      }

      const promptNeeded = checkGegnerDiff(
        fallbackGegnerName,
        fallbackGegnerFax,
        fallbackGegnerEmail,
        fallbackGegnerAnsprechpartner,
        fallbackGegnerTelefon
      );
      if (!promptNeeded) {
        setGegnerPrompt(null);
      }

      // Mehrstufige Bestandsakten-Erkennung (inkl. Duplikat-Sicherung bei doppelt vergebenen Alt-Nummern)
      const matchResult = findBestMatchingAkteInList(
        akten,
        fallbackUnserZeichen,
        fallbackAktenzeichen,
        fallbackGegnerName,
        fallbackUnsereFirma,
        fallbackThema,
        fallbackBriefEntwurf
      );

      if (matchResult && matchResult.akte) {
        const matchedAkte = matchResult.akte;
        setModus('bestehend');
        setSelectedAkteId(matchedAkte.id);

        if (!fallbackUnserZeichen && matchedAkte.unser_zeichen) setUnserZeichen(matchedAkte.unser_zeichen);
        if (!fallbackAktenzeichen && matchedAkte.aktenzeichen) setAktenzeichen(matchedAkte.aktenzeichen);
        if (!fallbackUnsereFirma && matchedAkte.unsere_firma) setUnsereFirma(matchedAkte.unsere_firma);
        if (!fallbackGegnerEmail && matchedAkte.gegner_email) setGegnerEmail(matchedAkte.gegner_email);
        if (!fallbackGegnerTelefon && matchedAkte.gegner_telefon) {
          setGegnerTelefon(formatRufnummer(matchedAkte.gegner_telefon));
        }

        if (!fallbackGegnerFax && matchedAkte.gegner_name) {
          const crmGegner = gegnerListe.find((g) => fuzzyMatch(g.name, matchedAkte.gegner_name));
          if (crmGegner && crmGegner.fax) setGegnerFax(formatRufnummer(crmGegner.fax));
        }

        const autoBezugId = findSmartBezugInAkte(matchedAkte, obj);
        if (autoBezugId) {
          setBezugId(autoBezugId);
          showToast(
            `Bestandsakte [${matchedAkte.unser_zeichen || '---'}] (${matchResult.reason}) & Vorläufer-Vorgang automatisch verknüpft!`,
            'success'
          );
        } else if (fallbackTyp !== 'Eingang' && matchedAkte.akten_historie && matchedAkte.akten_historie.length > 0) {
          const sortedHist = [...matchedAkte.akten_historie].sort(
            (a, b) => new Date(b.datum || 0) - new Date(a.datum || 0)
          );
          const latestEingang = sortedHist.find((h) => h.typ === 'Eingang') || sortedHist[0];
          if (latestEingang) {
            setBezugId(latestEingang.id);
            showToast(
              `Bestandsakte [${matchedAkte.unser_zeichen || '---'}] erkannt & auf letzten Vorgang bezogen!`,
              'success'
            );
          } else {
            setBezugId('');
          }
        } else {
          setBezugId('');
          showToast(
            `Bestandsakte [${matchedAkte.unser_zeichen || '---'}] (${matchResult.reason}) automatisch ausgewählt!`,
            'success'
          );
        }
      } else {
        setModus('neu');
        setSelectedAkteId(null);
        setBezugId('');
      }

      // Intelligente Tresor-Prüfung (strikt ohne Gegner-Ansprechpartner-Fallback)
      if (fallbackUnsereFirma) {
        const rawOwnAp =
          cleanVal(obj.unser_ansprechpartner) ||
          (obj.absender ? cleanVal(obj.absender.ansprechpartner || obj.absender.name) : '') ||
          '';
        const parsedAnsprechpartner = sanitizeOwnContactName(
          rawOwnAp,
          fallbackGegnerAnsprechpartner,
          fallbackGegnerName
        );
        const parsedTelefon = formatRufnummer(cleanVal(obj.unser_telefon) || '');
        const parsedEmail = cleanVal(obj.unser_email) || '';
        const parsedAdresse =
          cleanVal(obj.unsere_adresse) ||
          (obj.absender ? `${obj.absender.strasse || ''}, ${obj.absender.plz_ort || ''}` : '') ||
          '';

        const fuzzyMandanten = mandanten.filter((m) => fuzzyMatch(m.firmenname, fallbackUnsereFirma));

        setUnsereFirma(fallbackUnsereFirma);
        setUnserAnsprechpartner(parsedAnsprechpartner);
        setUnserTelefon(parsedTelefon);
        setUnserEmail(parsedEmail);

        if (fuzzyMandanten.length === 1 && cleanOrgName(fuzzyMandanten[0].firmenname) === cleanOrgName(fallbackUnsereFirma)) {
          setUnsereFirma(fuzzyMandanten[0].firmenname);
          setUnserAnsprechpartner(
            parsedAnsprechpartner ||
              sanitizeOwnContactName(
                fuzzyMandanten[0].ansprechpartner,
                fallbackGegnerAnsprechpartner,
                fallbackGegnerName
              )
          );
          setUnserTelefon(parsedTelefon || cleanVal(fuzzyMandanten[0].telefon) || '');
          setUnserEmail(parsedEmail || cleanVal(fuzzyMandanten[0].email) || '');
          setTresorPrompt(null);
        } else {
          setTresorPrompt({
            typ: 'auswahl',
            obj: {
              ...obj,
              unsere_firma: fallbackUnsereFirma,
              unser_ansprechpartner: parsedAnsprechpartner,
              unser_telefon: parsedTelefon,
              unser_email: parsedEmail,
              unsere_adresse: parsedAdresse
            },
            vorschlaege: fuzzyMandanten
          });
        }
      }
    } catch (err) {
      console.error('JSON Error:', err);
    }
  };

  const handleJsonImportRef = useRef(handleJsonImport);
  useEffect(() => {
    handleJsonImportRef.current = handleJsonImport;
  }, [handleJsonImport]);

  // --- BROWSER-BASIERTE WEB-INGEST-PIPELINE (SCANNER-ERSATZ IM WEB-COCKPIT) ---
  const handleWebScannerIngest = async (selectedFiles = null) => {
    const targetList = selectedFiles || dateien;
    if (!targetList || targetList.length === 0) {
      showToast('Bitte wähle zuerst eine PDF- oder MD-Datei aus!', 'warning');
      return;
    }

    const primaryFile = targetList.find((f) => f.name.toLowerCase().endsWith('.pdf')) || targetList[0];
    const isPdf = primaryFile.name.toLowerCase().endsWith('.pdf');
    const isMdOrTxt =
      primaryFile.name.toLowerCase().endsWith('.md') || primaryFile.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isMdOrTxt) {
      showToast('Für den KI-Web-Scan bitte eine PDF- oder MD-Datei wählen.', 'warning');
      return;
    }

    setWebScanLaedt(true);
    setWebScanStatus(`1/3 Lese Dokument "${primaryFile.name}" aus...`);

    try {
      let extractedText = '';
      let pdfBase64 = null;

      if (isPdf) {
        try {
          extractedText = await extractTextFromPDF(primaryFile);
        } catch (pdfErr) {
          console.warn('PDF.js Extraktions-Warnung (nutze OCR-Fallback):', pdfErr);
        }

        if (!extractedText || extractedText.replace(/--- Seite \d+ ---/g, '').trim().length < 50) {
          setWebScanStatus(`1/3 Bild-Scan erkannt – aktiviere KI-Vision-OCR für "${primaryFile.name}"...`);
          extractedText = '';
          pdfBase64 = await fileToBase64(primaryFile);
        }
      } else {
        extractedText = await primaryFile.text();
      }

      setWebScanStatus('2/3 Sende Dokument zur forensischen KI-Triage...');

      const { data: triageRes, error: triageErr } = await supabase.functions.invoke('sonar-ai-triage', {
        body: {
          mode: 'ingestion',
          text: extractedText ? extractedText.substring(0, 12000) : '',
          pdf_base64: pdfBase64 || undefined
        }
      });

      if (triageErr) {
        throw new Error(triageErr.message || 'Fehler beim Aufruf von sonar-ai-triage');
      }

      const rawReply = triageRes?.reply || triageRes;
      let parsedData = null;

      if (typeof rawReply === 'object' && rawReply !== null) {
        parsedData = rawReply;
      } else {
        const strReply = String(rawReply || '').trim();
        const jsonMatch = strReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      }

      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('KI-Triage hat kein gültiges JSON zurückgegeben.');
      }

      const ocrFallback = parsedData.extracted_ocr_text || parsedData.raw_text || '';
      delete parsedData.extracted_ocr_text;
      const finalFullText = extractedText && extractedText.trim().length >= 50 ? extractedText : ocrFallback;
      parsedData.raw_text = finalFullText;

      const rawBase = parsedData.clean_filename_base || parsedData.filename || parsedData.dateiname || '';
      delete parsedData.clean_filename_base;
      delete parsedData.filename;
      delete parsedData.dateiname;

      const todayCompact = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const cleanedSlug = cleanSlugForFilename(rawBase);
      const baseName = cleanedSlug || `${todayCompact}-dokument-${Date.now().toString().slice(-4)}`;

      const finalPdfName = `${baseName}.pdf`;
      const finalMdName = `${baseName}.md`;

      setWebScanStatus(`3/3 Speichere Twin-Storage (${finalPdfName} & .md) in Supabase...`);

      let uploadedPublicPdfUrl = null;

      if (isPdf) {
        const { error: pdfUpErr } = await supabase.storage
          .from('dokumente')
          .upload(finalPdfName, primaryFile, { contentType: 'application/pdf', upsert: true });

        if (pdfUpErr) {
          throw new Error('Storage-Upload (PDF) fehlgeschlagen: ' + pdfUpErr.message);
        }

        const { data: pubData } = supabase.storage.from('dokumente').getPublicUrl(finalPdfName);
        uploadedPublicPdfUrl = pubData?.publicUrl || null;
      }

      const mdContentToStore = finalFullText || parsedData.brief_entwurf || 'Kein Textinhalt erkannt.';
      const mdBlob = new Blob([mdContentToStore], { type: 'text/markdown;charset=utf-8' });
      await supabase.storage
        .from('dokumente')
        .upload(finalMdName, mdBlob, { contentType: 'text/markdown;charset=utf-8', upsert: true });

      await syncToGithub(finalMdName, mdContentToStore, uploadedPublicPdfUrl, 'web_scan', showToast);

      if (uploadedPublicPdfUrl) {
        parsedData.pdf_url = uploadedPublicPdfUrl;
      }

      const finalJsonString = JSON.stringify(parsedData);
      if (handleJsonImportRef.current) {
        handleJsonImportRef.current({ target: { value: finalJsonString } });
      } else {
        handleJsonImport({ target: { value: finalJsonString } });
      }

      const remainingFiles = targetList.filter((f) => f !== primaryFile);
      setDateien(remainingFiles);
      if (remainingFiles.length === 0 && document.getElementById('datei-upload-manuell')) {
        document.getElementById('datei-upload-manuell').value = '';
      }

      showToast(
        `Web-Scan abgeschlossen!\nTwin-Storage angelegt: ${finalPdfName}\nAlle Felder wurden automatisch befüllt.`,
        'success'
      );
    } catch (err) {
      console.error('Web-Scanner Fehler:', err);
      showToast('Fehler beim KI-Web-Scan: ' + (err.message || err), 'error');
    } finally {
      setWebScanLaedt(false);
      setWebScanStatus('');
    }
  };

  // --- INTELLIGENTER TRESOR ACCEPT-HANDLER ---
  const handleTresorPromptAccept = async (actionType = 'neu', targetId = null) => {
    if (!tresorPrompt) return;

    if (actionType === 'neu') {
      const { data, error } = await supabase
        .from('mandanten')
        .insert([
          {
            user_id: session.user.id,
            firmenname: tresorPrompt.obj.unsere_firma,
            ansprechpartner: sanitizeOwnContactName(
              tresorPrompt.obj.unser_ansprechpartner,
              gegnerAnsprechpartner,
              gegnerName
            ),
            telefon: formatRufnummer(cleanVal(tresorPrompt.obj.unser_telefon) || ''),
            email: cleanVal(tresorPrompt.obj.unser_email) || '',
            adresse: cleanVal(tresorPrompt.obj.unsere_adresse) || '',
            steuernummer: cleanVal(tresorPrompt.obj.unsere_steuernummer) || '',
            ust_id: cleanVal(tresorPrompt.obj.unsere_ust_id) || '',
            betriebsnummer: cleanVal(tresorPrompt.obj.unsere_betriebsnummer) || '',
            vbg_nummer: cleanVal(tresorPrompt.obj.unsere_vbg_nummer) || '',
            handelsregister: cleanVal(tresorPrompt.obj.unsere_handelsregister) || '',
            iban: cleanVal(tresorPrompt.obj.unsere_iban) || ''
          }
        ])
        .select();
      if (!error && data) {
        showToast(`Mandant "${tresorPrompt.obj.unsere_firma}" im Tresor angelegt!`, 'success');
        ladeDaten();
      }
    } else if (actionType === 'zuweisen' && targetId) {
      const existing = mandanten.find((m) => m.id === targetId);
      if (existing) {
        setUnsereFirma(existing.firmenname);
        setUnserAnsprechpartner(
          sanitizeOwnContactName(existing.ansprechpartner, gegnerAnsprechpartner, gegnerName) ||
            sanitizeOwnContactName(tresorPrompt.obj.unser_ansprechpartner, gegnerAnsprechpartner, gegnerName)
        );
        if (existing.telefon && !unserTelefon) setUnserTelefon(formatRufnummer(existing.telefon));
        if (existing.email && !unserEmail) setUnserEmail(existing.email);
        showToast(`Zuweisung zu Mandant "${existing.firmenname}" erfolgreich!`, 'success');
      }
    }
    setTresorPrompt(null);
  };

  // --- INTELLIGENTER GEGNER ACCEPT-HANDLER ---
  const handleGegnerPromptAccept = async (actionType = 'neu', targetId = null, contactOption = null) => {
    if (!gegnerPrompt) return;

    if (actionType === 'neu') {
      const apAbt = contactOption?.abteilung || '';
      const apName = contactOption?.name !== undefined ? contactOption.name : gegnerPrompt.obj.ansprechpartner || '';
      const apTel = formatRufnummer(
        contactOption?.telefon !== undefined ? contactOption.telefon : gegnerPrompt.obj.telefon || ''
      );
      const apMail = contactOption?.email !== undefined ? contactOption.email : gegnerPrompt.obj.email || '';

      await supabase.from('gegner').insert([
        {
          user_id: session.user.id,
          name: gegnerPrompt.obj.name,
          fax: formatRufnummer(gegnerPrompt.obj.fax),
          email: apMail || gegnerPrompt.obj.email || null,
          notizen: JSON.stringify([
            {
              abteilung: apAbt,
              name: apName,
              telefon: apTel,
              email: apMail
            }
          ])
        }
      ]);

      const displayAP = apName || apAbt || '';
      setGegnerName(gegnerPrompt.obj.name);
      setGegnerAnsprechpartner(displayAP);
      setFaxZhd(displayAP);
      if (apTel) setGegnerTelefon(apTel);
      if (apMail) setGegnerEmail(apMail);

      showToast(`Behörde/Gegner "${gegnerPrompt.obj.name}" ins CRM aufgenommen!`, 'success');
    } else if (actionType === 'zuweisen' && targetId) {
      const existing = gegnerListe.find((g) => String(g.id) === String(targetId));
      if (existing) {
        setGegnerName(existing.name);
        if (existing.fax && !gegnerFax) setGegnerFax(formatRufnummer(existing.fax));

        const gUpdates = {};
        let currentContacts = [];
        try {
          currentContacts =
            typeof existing.notizen === 'string' ? JSON.parse(existing.notizen) : existing.notizen || [];
        } catch (_e) {}
        if (!Array.isArray(currentContacts)) currentContacts = [];

        if (contactOption && contactOption.mode === 'existing') {
          if (contactOption.index === 'zentrale') {
            setGegnerAnsprechpartner('Zentrale');
            setFaxZhd('Zentrale');
            if (existing.telefon) setGegnerTelefon(formatRufnummer(existing.telefon));
            if (existing.email || existing.email_zentrale) setGegnerEmail(existing.email || existing.email_zentrale);
          } else {
            const chosen = currentContacts[Number(contactOption.index)];
            if (chosen) {
              const displayAP = chosen.name || chosen.abteilung || '';
              setGegnerAnsprechpartner(displayAP);
              setFaxZhd(displayAP);
              if (chosen.telefon) setGegnerTelefon(formatRufnummer(chosen.telefon));
              if (chosen.email || existing.email || existing.email_zentrale) {
                setGegnerEmail(chosen.email || existing.email || existing.email_zentrale);
              }
            }
          }
          showToast(`Gegner "${existing.name}" und Ansprechpartner übernommen!`, 'success');
        } else {
          const newAbt = (contactOption?.abteilung || '').trim();
          const newName = (
            contactOption?.name !== undefined ? contactOption.name : gegnerPrompt.obj.ansprechpartner || ''
          ).trim();
          const newTel = formatRufnummer(
            contactOption?.telefon !== undefined ? contactOption.telefon : gegnerPrompt.obj.telefon || ''
          );
          const newMail = (
            contactOption?.email !== undefined ? contactOption.email : gegnerPrompt.obj.email || ''
          ).trim();

          if (newName || newAbt) {
            const existingIdx = currentContacts.findIndex(
              (c) =>
                (c.name || '').trim().toLowerCase() === newName.toLowerCase() &&
                (c.abteilung || '').trim().toLowerCase() === newAbt.toLowerCase()
            );

            if (existingIdx === -1) {
              currentContacts.push({
                abteilung: newAbt,
                name: newName,
                telefon: newTel,
                email: newMail
              });
              gUpdates.notizen = JSON.stringify(currentContacts);
            } else {
              if (newTel && !currentContacts[existingIdx].telefon) currentContacts[existingIdx].telefon = newTel;
              if (newMail && !currentContacts[existingIdx].email) currentContacts[existingIdx].email = newMail;
              gUpdates.notizen = JSON.stringify(currentContacts);
            }

            const displayAP = newName || newAbt;
            setGegnerAnsprechpartner(displayAP);
            setFaxZhd(displayAP);
          }

          if (newTel) setGegnerTelefon(newTel);
          if (newMail) setGegnerEmail(newMail);
          else if (existing.email || existing.email_zentrale) setGegnerEmail(existing.email || existing.email_zentrale);

          if (!existing.fax && gegnerPrompt.obj.fax) gUpdates.fax = formatRufnummer(gegnerPrompt.obj.fax);
          if (!existing.email && newMail) gUpdates.email = newMail;

          if (Object.keys(gUpdates).length > 0) {
            await supabase.from('gegner').update(gUpdates).eq('id', existing.id);
            showToast(`Neuer Kontakt bei "${existing.name}" im CRM gespeichert & zugewiesen!`, 'success');
          } else {
            showToast(`Gegner "${existing.name}" zugewiesen.`, 'success');
          }
        }
      }
    }

    ladeDaten();
    setGegnerPrompt(null);
  };

  // --- ECHTZEIT-QUEUE FÜR LOKALEN PYTHON-SCANNER (IMPORT_QUEUE) ---
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchMissedImports = async () => {
      const { data, error } = await supabase
        .from('import_queue')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        for (const record of data) {
          if (record.payload) {
            const jsonString = JSON.stringify(record.payload);
            if (handleJsonImportRef.current) {
              handleJsonImportRef.current({ target: { value: jsonString } });
            }
            showToast('Verpassten Auto-Import nachgeladen!', 'success');
            await supabase.from('import_queue').delete().eq('id', record.id);
          }
        }
      }
    };

    fetchMissedImports();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMissedImports();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const channelName = `import_queue_${session.user.id}`;
    const queueSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'import_queue',
          filter: `user_id=eq.${session.user.id}`
        },
        async (payload) => {
          const newRecord = payload.new;
          if (newRecord && newRecord.payload) {
            const jsonString = JSON.stringify(newRecord.payload);
            if (handleJsonImportRef.current) {
              handleJsonImportRef.current({ target: { value: jsonString } });
            }
            showToast('Auto-Import empfangen und eingefügt!', 'success');
            await supabase.from('import_queue').delete().eq('id', newRecord.id);
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(queueSubscription);
    };
  }, [session?.user?.id, showToast]);

  return {
    handleWebScannerIngest,
    handleJsonImport,
    handleTresorPromptAccept,
    handleGegnerPromptAccept
  };
}