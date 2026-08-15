import { supabase } from './supabaseClient'

// --- HILFSFUNKTION FÜR GITHUB SYNC (EDGE FUNCTION) ---
export const syncToGithub = async (filename, contentText, pdfUrl = null, action = null, showToast = alert) => {
  try {
    console.log(`[GitHub Sync] Starte Sync für: ${filename} (Aktion: ${action || 'put'})...`);
    
    const payload = { filename };
    if (action === 'delete') {
      payload.action = 'delete';
    } else {
      payload.content = contentText;
      payload.pdfUrl = pdfUrl;
    }

    const { data, error } = await supabase.functions.invoke('github-sync', {
      body: payload,
      headers: { 'Content-Type': 'application/json' }
    });

    if (error) {
      console.error("[GitHub Sync] Supabase Invoke Fehler:", error);
      showToast(`⚠️ GitHub Sync Fehler bei ${filename}: ${error.message}`, 'error');
    } else {
      console.log("[GitHub Sync] Erfolg:", data);
    }
  } catch (err) {
    console.error("[GitHub Sync] Unerwarteter Ausnahme-Fehler:", err);
    showToast(`❌ Sync-Ausnahme bei ${filename}: ${err.message}`, 'error');
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