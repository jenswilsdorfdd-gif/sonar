import { supabase } from './supabaseClient'

const OWNER_USER_ID = 'ea175141-2c03-4f93-ba1b-392570229cb2';

// --- UNIVERSELLE BACKUP-BRIDGE (GOOGLE DRIVE / KUNDEN-SERVER) ---
// Behält den etablierten Funktionsnamen syncToGithub bei, damit alle bestehenden Aufrufe im Projekt nahtlos funktionieren.
export const syncToGithub = async (filename, contentText, pdfUrl = null, action = null, showToast = alert) => {
  try {
    const backupWebhookUrl = import.meta.env.VITE_BACKUP_WEBHOOK_URL;
    if (!backupWebhookUrl || String(backupWebhookUrl).trim() === '') {
      // Falls in der .env noch keine externe Backup-URL hinterlegt ist: Stiller Rücksprung (Supabase speichert normal weiter)
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id || null;
    const currentUserEmail = authData?.user?.email || 'unbekannt';
    const isOwner = currentUserId === OWNER_USER_ID;

    const payload = {
      target: isOwner ? 'owner' : 'demo',
      retentionDays: isOwner ? null : 30,
      userId: currentUserId,
      userEmail: currentUserEmail,
      filename: filename || `dokument_${Date.now()}.md`,
      mdContent: contentText || '',
      pdfUrl: pdfUrl || null,
      action: action || 'backup',
      timestamp: new Date().toISOString()
    };

    // Nicht-blockierender Hintergrund-Sync (verhindert jegliche Verzögerung im Cockpit)
    fetch(String(backupWebhookUrl).trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).catch((err) => {
      console.warn('Hintergrund-Backup Warnung:', err);
    });
  } catch (err) {
    console.warn('Backup-Bridge Fehler (ignoriert, um Supabase-Speicherung nicht zu blockieren):', err);
  }
};

// --- HILFSFUNKTION FÜR DATEINAMEN ---
export const extractFilename = (url) => {
  if (!url) return 'Datei';
  try {
    const decodedUrl = decodeURIComponent(url);
    const parts = decodedUrl.split('/');
    const fullName = parts[parts.length - 1];
    const cleanName = fullName.replace(/^\d+_/, '');
    return cleanName;
  } catch (e) {
    return 'Datei';
  }
};

// --- HILFSFUNKTION FÜR TOLERANTE FIRMEN-SUCHE (Fuzzy Search) ---
export const normalizeName = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\b(gmbh|ug|ag|gbr|ohg|kg|haftungsbeschränkt|ev|familie|finanzamt|landratsamt|stadt|landeshauptstadt|ordnungsamt)\b/g, '') 
    .replace(/&/g, 'und') 
    .replace(/[^a-z0-9]/g, ''); 
};

// --- FILTER GEGEN "null" STRINGS ---
export const cleanVal = (val) => {
  if (!val || val === 'null' || val === 'undefined' || String(val).trim() === '') return null;
  return val;
};