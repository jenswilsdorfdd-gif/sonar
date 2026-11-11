import { supabase } from './supabaseClient'

// --- HILFSFUNKTION FÜR GITHUB SYNC (STILLGELEGT / NO-OP FÜR SUPABASE TWIN-STORAGE) ---
export const syncToGithub = async (filename, contentText, pdfUrl = null, action = null, showToast = alert) => {
  // GitHub-Sync ist zugunsten des mandantenisolierten Supabase Twin-Storage deaktiviert.
  return;
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