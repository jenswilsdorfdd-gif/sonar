import React, { useState } from 'react';

export default function Handbuch({ theme }) {
  const [activeStep, setActiveStep] = useState(1);

  // --- STYLES ---
  const sidebarStyle = {
    width: '280px',
    background: theme.cardBg,
    borderRight: `1px solid ${theme.border}`,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    borderRadius: '12px 0 0 12px'
  };

  const contentStyle = {
    flex: 1,
    background: theme.cardBg,
    padding: '30px 40px',
    overflowY: 'auto',
    borderRadius: '0 12px 12px 0',
    color: theme.textMain,
    lineHeight: '1.6'
  };

  const buttonStyle = (isActive) => ({
    padding: '12px 15px',
    background: isActive ? (theme.handbuchBg || 'rgba(16, 185, 129, 0.1)') : 'transparent',
    color: isActive ? (theme.handbuchAccent || '#10b981') : theme.textMain,
    border: `1px solid ${isActive ? (theme.handbuchAccent || '#10b981') : 'transparent'}`,
    borderRadius: '8px',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s ease',
    fontSize: '14px'
  });

  const imagePlaceholder = {
    width: '100%',
    minHeight: '200px',
    background: theme.bg,
    border: `2px dashed ${theme.border}`,
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '20px 0',
    padding: '20px',
    color: theme.textMuted,
    textAlign: 'center'
  };

  const codeBlock = {
    background: '#1e293b',
    color: '#e2e8f0',
    padding: '15px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '13px',
    overflowX: 'auto',
    margin: '15px 0',
    border: '1px solid #334155'
  };

  const linkStyle = {
    color: theme.accent || '#00e5ff',
    textDecoration: 'none',
    fontWeight: 'bold'
  };

  // --- INHALTE DER BAUABSCHNITTE ---
  const renderContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 1: DIE WERKSTATT EINRICHTEN (INFRASTRUKTUR)
            </h2>
            <p>Bevor wir Code schreiben, bauen wir das Fundament. SONAR besteht aus Frontend (React/Vite) und Backend (Supabase). Alles wird über GitHub synchronisiert.</p>
            
            <h3>1. Der Master-Schlüssel (GitHub)</h3>
            <p>
              <strong>Warum?</strong> GitHub hostet unseren Code und fungiert als Auth-Provider (Login). Supabase und Vercel greifen beide darauf zu.<br/>
              <strong>To-Do:</strong> Gehe zu <a href="https://github.com" target="_blank" rel="noreferrer" style={linkStyle}>github.com</a>, erstelle einen Account und bleibe im Browser eingeloggt.
            </p>
            
            {/* PLATZHALTER FÜR SCREENSHOT */}
            <div style={imagePlaceholder}>
              <img src="/docs/step1-github.jpg" alt="GitHub Setup" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step1-github.jpg</strong><br/>(Screenshot deines GitHub Repositories einfügen)</span>
            </div>

            <h3>2. Das Backend & Datenbank (Supabase)</h3>
            <p>
              <strong>Warum?</strong> Supabase ist unsere PostgreSQL-Datenbank und unser Datei-Server.<br/>
              <strong>To-Do:</strong>
            </p>
            <ul>
              <li>Gehe auf <a href="https://supabase.com" target="_blank" rel="noreferrer" style={linkStyle}>supabase.com</a> und klicke auf "Start your project".</li>
              <li>Logge dich über "Continue with GitHub" ein.</li>
              <li>Erstelle ein neues Projekt (Region: <strong>Frankfurt</strong>). <strong>Wichtig:</strong> Kopiere das Datenbank-Passwort und speichere es sicher ab!</li>
            </ul>

            <div style={imagePlaceholder}>
              <img src="/docs/step1-supabase.jpg" alt="Supabase Setup" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step1-supabase.jpg</strong></span>
            </div>
            
            <h3>3. Storage (Dateispeicher) einrichten</h3>
            <p>
              <strong>Warum?</strong> In der Datenbank speichern wir Texte, im Storage speichern wir PDFs, Scans und Bilder.<br/>
              <strong>To-Do:</strong>
            </p>
            <ul>
              <li>Klicke im Supabase-Dashboard links auf "Storage" (Ordner-Symbol).</li>
              <li>Klicke auf "New Bucket".</li>
              <li>Name: <strong>dokumente</strong>. Schalte den Toggle "Public bucket" zwingend auf <strong>ON</strong>.</li>
              <li>Wiederhole das für einen zweiten Bucket namens <strong>unterschriften</strong> (ebenfalls Public).</li>
            </ul>
          </div>
        );
      case 2:
        return (
          <div>
             <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
               BAUABSCHNITT 2: DAS GEHIRN & DIE SCHLÜSSEL (APIs)
             </h2>
             <p>SONAR ist dumm, bis wir es mit KI und externen Diensten verknüpfen. Hierfür brauchen wir API-Keys (Zugangscodes), die wir sicher in Supabase lagern.</p>
             
             <h3>1. Das KI-Gehirn erschaffen (Google Gemini)</h3>
             <p>
               <strong>Warum?</strong> Gemini analysiert unsere juristischen Texte, extrahiert Daten und befüllt das Akten-Cockpit.<br/>
               <strong>To-Do:</strong> Gehe zu <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={linkStyle}>Google AI Studio</a>, logge dich ein und klicke auf "Get API Key". Kopiere diesen Key.
             </p>
             
             <div style={imagePlaceholder}>
              <img src="/docs/step2-gemini.jpg" alt="Gemini Setup" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step2-gemini.jpg</strong></span>
            </div>

             <h3>2. API Keys in Supabase hinterlegen (Secrets)</h3>
             <p>
               <strong>Warum?</strong> Wir dürfen API-Keys niemals direkt in den React-Code schreiben (Sicherheitsrisiko). Die Supabase Edge Functions rufen sie serverseitig ab.<br/>
               <strong>To-Do:</strong> 
             </p>
             <ul>
                <li>Gehe in Supabase zu <strong>Project Settings</strong> (Zahnrad unten links) &gt; <strong>Edge Functions</strong>.</li>
                <li>Füge dort als "Secrets" folgende Keys hinzu:</li>
             </ul>
             <div style={codeBlock}>
               Name: GEMINI_API_KEY | Value: [Dein kopierter Key]<br/>
               Name: GITHUB_PAT | Value: [Dein Personal Access Token von GitHub]<br/>
               Name: RESEND_API_KEY | Value: [Dein E-Mail Versand Key]
             </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 3: FUNDAMENT (DATENBANKSTRUKTUR)
            </h2>
            <p>Damit React (Frontend) Daten speichern kann, müssen in Supabase exakte Tabellen existieren. Das machen wir automatisiert per SQL-Skript.</p>
            
            <h3>1. SQL Editor ausführen</h3>
            <p>
              <strong>Warum?</strong> Anstatt händisch Spalten anzulegen, jagen wir einen Master-Code durch die Datenbank, der `akten`, `mandanten`, `gegner` und `wissensdatenbank` in Sekunden aufbaut.<br/>
              <strong>To-Do:</strong>
            </p>
            <ul>
              <li>Klicke im Supabase-Dashboard links auf den <strong>SQL Editor</strong>.</li>
              <li>Klicke auf "New Query".</li>
              <li>Füge den Master-SQL-Code für das SONAR-System ein und klicke unten rechts auf <strong>Run</strong>.</li>
            </ul>
            
            <div style={imagePlaceholder}>
              <img src="/docs/step3-sql.jpg" alt="SQL Setup" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step3-sql.jpg</strong></span>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 4: MASCHINENRÄUME (EDGE FUNCTIONS)
            </h2>
            <p>Edge Functions sind winzige Server-Skripte, die bei Supabase liegen. Sie übernehmen gefährliche oder unsichtbare Aufgaben wie E-Mails versenden oder KI-Abfragen durchführen.</p>
            
            <h3>1. Supabase CLI (Terminal Befehle)</h3>
            <p>
              <strong>Warum?</strong> Um Functions zu Supabase hochzuladen, müssen wir das Terminal in StackBlitz (oder VS Code) nutzen.<br/>
              <strong>To-Do:</strong> Öffne das Terminal und führe nacheinander diese Befehle aus:
            </p>
            
            <div style={codeBlock}>
              <span style={{ color: '#94a3b8' }}># 1. In Supabase einloggen (Browser öffnet sich zur Bestätigung)</span><br/>
              npx supabase login<br/><br/>
              
              <span style={{ color: '#94a3b8' }}># 2. Projekt lokal initialisieren</span><br/>
              npx supabase init<br/><br/>
              
              <span style={{ color: '#94a3b8' }}># 3. Projekt verknüpfen (Ersetze [PROJECT_REF] mit der ID aus deiner Supabase URL)</span><br/>
              npx supabase link --project-ref [PROJECT_REF]<br/><br/>
              
              <span style={{ color: '#94a3b8' }}># 4. Neue Funktion erstellen</span><br/>
              npx supabase functions new sonar-ai-task<br/><br/>
              
              <span style={{ color: '#94a3b8' }}># 5. Funktion live auf den Supabase-Server laden</span><br/>
              npx supabase functions deploy sonar-ai-task
            </div>
            
            <div style={imagePlaceholder}>
              <img src="/docs/step4-functions.jpg" alt="Edge Functions" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step4-functions.jpg</strong></span>
            </div>
          </div>
        );
      case 5:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 5: DIE CHROME BRÜCKE (EXTENSION)
            </h2>
            <p>Damit du Daten aus dem echten Leben (z.B. aus Web-Portalen) ins SONAR Cockpit bekommst, nutzen wir eine Chrome Extension.</p>
            
            <h3>1. Plugin lokal in Chrome laden</h3>
            <p>
              <strong>Warum?</strong> Die Extension agiert als "Kopierer". Sie liest markierte Texte auf Webseiten und schickt sie per API direkt in deine Supabase-Datenbank.<br/>
              <strong>To-Do:</strong>
            </p>
            <ul>
              <li>Gib in die Adresszeile deines Browsers ein: <code>chrome://extensions</code></li>
              <li>Aktiviere oben rechts den <strong>Entwicklermodus (Developer mode)</strong>.</li>
              <li>Klicke oben links auf <strong>Entpackte Erweiterung laden (Load unpacked)</strong>.</li>
              <li>Wähle den Ordner auf deiner Festplatte aus, in dem die Dateien `manifest.json` und `popup.html` liegen.</li>
            </ul>
            
            <div style={imagePlaceholder}>
              <img src="/docs/step5-chrome.jpg" alt="Chrome Extension" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step5-chrome.jpg</strong></span>
            </div>
          </div>
        );
      case 6:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 6: COCKPIT LIVE SCHALTEN (VERCEL)
            </h2>
            <p>Dein React-Code aus StackBlitz muss als echte Webseite ins Netz. Dafür nutzen wir Vercel.</p>
            
            <h3>1. Projekt deployen</h3>
            <p>
              <strong>Warum?</strong> Vercel zieht sich bei jedem Git-Commit automatisch den neuesten Code von GitHub und baut die Seite neu.<br/>
              <strong>To-Do:</strong>
            </p>
            <ul>
              <li>Gehe auf <a href="https://vercel.com" target="_blank" rel="noreferrer" style={linkStyle}>vercel.com</a> und logge dich mit GitHub ein.</li>
              <li>Klicke auf <strong>Add New... &gt; Project</strong> und importiere dein SONAR-Repository.</li>
              <li><strong>WICHTIG:</strong> Bevor du auf "Deploy" klickst, musst du die Environment Variables setzen!</li>
            </ul>

            <div style={codeBlock}>
              Name: VITE_SUPABASE_URL<br/>
              Value: [Deine Supabase Projekt URL, z.B. https://xyz.supabase.co]<br/><br/>
              Name: VITE_SUPABASE_ANON_KEY<br/>
              Value: [Dein langer anon/public key aus Supabase]
            </div>
            
            <p>Klicke danach auf <strong>Deploy</strong>. Fertig!</p>
            
            <div style={imagePlaceholder}>
              <img src="/docs/step6-vercel.jpg" alt="Vercel Deployment" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step6-vercel.jpg</strong></span>
            </div>
          </div>
        );
      default:
        return <div>Wähle einen Bauabschnitt aus.</div>;
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '75vh', border: `1px solid ${theme.border}`, borderRadius: '12px', overflow: 'hidden' }}>
      
      {/* SIDEBAR NAVIGATION */}
      <div style={sidebarStyle}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: theme.textMain }}>📚 Tech-Handbuch</h3>
        <button onClick={() => setActiveStep(1)} style={buttonStyle(activeStep === 1)}>1. Die Werkstatt</button>
        <button onClick={() => setActiveStep(2)} style={buttonStyle(activeStep === 2)}>2. Gehirn & Schlüssel</button>
        <button onClick={() => setActiveStep(3)} style={buttonStyle(activeStep === 3)}>3. Das Fundament</button>
        <button onClick={() => setActiveStep(4)} style={buttonStyle(activeStep === 4)}>4. Edge Functions</button>
        <button onClick={() => setActiveStep(5)} style={buttonStyle(activeStep === 5)}>5. Chrome Brücke</button>
        <button onClick={() => setActiveStep(6)} style={buttonStyle(activeStep === 6)}>6. Live-Schaltung</button>
        
        <div style={{ marginTop: 'auto', paddingTop: '20px', fontSize: '11px', color: theme.textMuted, borderTop: `1px solid ${theme.border}` }}>
          SONAR System v1.0<br/>Status: Online
        </div>
      </div>

      {/* HAUPTINHALT */}
      <div style={contentStyle}>
        {renderContent()}
      </div>

    </div>
  );
}