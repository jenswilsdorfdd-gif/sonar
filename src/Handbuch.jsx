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
    margin: '15px 0'
  };

  // --- INHALTE DER BAUABSCHNITTE ---
  const renderContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>BAUABSCHNITT 1: DIE WERKSTATT EINRICHTEN</h2>
            <p>Bevor wir Code anfassen, müssen wir die Infrastruktur aufbauen. Das SONAR Cockpit besteht aus verschiedenen Modulen, die alle nahtlos miteinander kommunizieren müssen.</p>
            
            <h3>Schritt 1: Der Master-Schlüssel (GitHub)</h3>
            <p>GitHub ist unser zentraler Speicherort für den Code und die Wissensdatenbank. Gleichzeitig nutzen wir es als "Generalschlüssel" (Login), um uns bei allen anderen Diensten anzumelden.</p>
            <ul>
              <li>Gehe auf github.com und erstelle einen Account.</li>
              <li>Bleibe im Browser eingeloggt.</li>
            </ul>
            
            {/* PLATZHALTER FÜR SCREENSHOT */}
            <div style={imagePlaceholder}>
              <img src="/docs/step1-github.jpg" alt="GitHub Setup" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step1-github.jpg</strong><br/>(Lade einen Screenshot der GitHub-Registrierung hier hoch)</span>
            </div>

            <h3>Schritt 2: Das Backend & Datenbank (Supabase)</h3>
            <p>Supabase ist der Motor im Hintergrund. Hier liegen später alle Akten, Mandanten und Dateien.</p>
            <ul>
              <li>Gehe auf supabase.com und logge dich über "Continue with GitHub" ein.</li>
              <li>Erstelle ein neues Projekt (Region: Frankfurt). Notiere das Datenbank-Passwort!</li>
            </ul>

            <div style={imagePlaceholder}>
              <img src="/docs/step1-supabase.jpg" alt="Supabase Setup" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step1-supabase.jpg</strong></span>
            </div>
            
            <h3>Schritt 3: Storage (Dateispeicher) einrichten</h3>
            <p>Wir müssen der Datenbank mitteilen, wo unsere Dateien landen.</p>
            <ul>
              <li>Gehe im Supabase-Menü auf "Storage" (Ordner-Symbol).</li>
              <li>Erstelle den Bucket <strong>dokumente</strong> (zwingend als Public markieren!).</li>
              <li>Erstelle den Bucket <strong>unterschriften</strong> (zwingend als Public markieren!).</li>
            </ul>
          </div>
        );
      case 2:
        return (
          <div>
             <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>BAUABSCHNITT 2: DAS GEHIRN & DIE SCHLÜSSEL</h2>
             <p>Wir bauen das "Gehirn" (den KI-Prompt), das unsere juristischen Dokumente analysiert, und besorgen die "Schlüssel" (API-Keys).</p>
             
             <h3>Schritt 1: Das KI-Gehirn erschaffen</h3>
             <p>Gehe in Gemini und erstelle ein neues Gem namens <strong>SONAR MEGA LEGAL</strong>. Nutze den Master-Prompt für die Anweisungen.</p>
             
             <div style={imagePlaceholder}>
              <img src="/docs/step2-gemini.jpg" alt="Gemini Setup" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step2-gemini.jpg</strong></span>
            </div>

             <h3>Schritt 2: API Keys in Supabase hinterlegen</h3>
             <p>Die gesammelten API-Keys (Groq, Resend, GitHub etc.) müssen in Supabase als "Secrets" gespeichert werden (Unter Edge Functions &gt; Secrets).</p>
             <div style={codeBlock}>
               Name: GITHUB_PAT | Value: [Token]<br/>
               Name: RESEND_API_KEY | Value: [Token]<br/>
               Name: GROQ_API_KEY | Value: [Token]
             </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>BAUABSCHNITT 3: FUNDAMENT (DATENBANK)</h2>
            <p>Wir legen die Tabellenstruktur in Supabase an.</p>
            
            <h3>Schritt 1: SQL Editor</h3>
            <p>Öffne in Supabase den "SQL Editor", erstelle eine neue Abfrage und führe den Master-Code aus, um die Tabellen (akten, mandanten, gegner etc.) anzulegen.</p>
            
            <div style={imagePlaceholder}>
              <img src="/docs/step3-sql.jpg" alt="SQL Setup" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step3-sql.jpg</strong></span>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>BAUABSCHNITT 4: MASCHINENRÄUME (EDGE FUNCTIONS)</h2>
            <p>Wir richten die Hintergrund-Prozesse ein (z.B. E-Mail Versand, GitHub Sync, Scraper).</p>
            
            <h3>Schritt 1: Ordner anlegen</h3>
            <p>Nutze die Supabase CLI, um die Funktionen zu generieren (z.B. <code>npx supabase functions new sonar-send-email</code>).</p>
            
            <div style={imagePlaceholder}>
              <img src="/docs/step4-functions.jpg" alt="Edge Functions" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step4-functions.jpg</strong></span>
            </div>
          </div>
        );
      case 5:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>BAUABSCHNITT 5: DIE CHROME BRÜCKE</h2>
            <p>Die Erweiterung für den Magic-Import Button in Google Gemini.</p>
            
            <h3>Schritt 1: Plugin laden</h3>
            <p>Gehe in Chrome auf <code>chrome://extensions</code>, aktiviere den Entwicklermodus und lade den entpackten Ordner hoch.</p>
            
            <div style={imagePlaceholder}>
              <img src="/docs/step5-chrome.jpg" alt="Chrome Extension" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step5-chrome.jpg</strong></span>
            </div>
          </div>
        );
      case 6:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>BAUABSCHNITT 6: COCKPIT LIVE SCHALTEN</h2>
            <p>Der finale Schritt: Das Frontend ins Netz bringen.</p>
            
            <h3>Schritt 1: Vercel Deployment</h3>
            <p>Logge dich bei Vercel ein, importiere dein GitHub Repository und setze zwingend die Environment Variables (<code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code>).</p>
            
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