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

  const codeBlock = {
    background: '#1e293b',
    color: '#e2e8f0',
    padding: '15px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '12px',
    overflowX: 'auto',
    margin: '15px 0',
    border: '1px solid #334155',
    whiteSpace: 'pre-wrap'
  };

  const linkStyle = {
    color: theme.accent || '#00e5ff',
    textDecoration: 'none',
    fontWeight: 'bold'
  };

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

  // --- INHALTE DER BAUABSCHNITTE ---
  const renderContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 1: DIE WERKSTATT EINRICHTEN
            </h2>
            <p><strong>Ziel dieses Abschnitts:</strong> Bevor wir Code anfassen, müssen wir die Infrastruktur aufbauen. Das SONAR Cockpit besteht aus verschiedenen Modulen, die alle nahtlos miteinander kommunizieren müssen. Der Dreh- und Angelpunkt für diese Kommunikation ist <strong>GitHub</strong>.</p>
            
            <h3>Schritt 1: Der Master-Schlüssel (GitHub)</h3>
            <p>GitHub ist unser zentraler Speicherort für den Code und die Wissensdatenbank. Gleichzeitig nutzen wir es als "Generalschlüssel" (Login), um uns bei allen anderen Diensten anzumelden.</p>
            <ol>
              <li>Gehe auf <a href="https://github.com" target="_blank" rel="noreferrer" style={linkStyle}>github.com</a>.</li>
              <li>Klicke oben rechts auf <strong>"Sign up"</strong> und erstelle einen kostenlosen Account.</li>
              <li>Bestätige deine E-Mail-Adresse. Bleibe in deinem Browser bei GitHub eingeloggt.</li>
            </ol>

            <div style={imagePlaceholder}>
              <img src="/docs/step1-github.jpg" alt="GitHub Repository" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step1-github.jpg</strong><br/>(Zeigt das fertig angelegte GitHub-Repository)</span>
            </div>
            
            <h3>Schritt 2: Das Backend & die Datenbank (Supabase)</h3>
            <p>Supabase ist der Motor im Hintergrund. Hier liegen später alle Akten, Mandanten und Dateien.</p>
            <ol>
              <li>Gehe auf <a href="https://supabase.com" target="_blank" rel="noreferrer" style={linkStyle}>supabase.com</a>.</li>
              <li>Klicke auf <strong>"Start your project"</strong>.</li>
              <li>Wähle auf der Login-Seite zwingend <strong>"Continue with GitHub"</strong> aus und autorisiere die Verknüpfung.</li>
              <li>Klicke auf <strong>"New Project"</strong>, wähle eine Organisation aus und gib dem Projekt einen Namen (z. B. "Sonar Cockpit").</li>
              <li>Vergib ein starkes <strong>Database Password</strong>. <em>WICHTIG: Notiere dir dieses Passwort sicher, wir brauchen es später!</em></li>
              <li>Wähle eine Region in Europa (z. B. Frankfurt) und klicke auf <strong>"Create new project"</strong>.</li>
            </ol>

            <h3>Schritt 3: Die Frontend-Werkstatt (StackBlitz)</h3>
            <p>StackBlitz ist unser virtueller Code-Editor. Hier bauen wir die Benutzeroberfläche des Cockpits.</p>
            <ol>
              <li>Gehe auf <a href="https://stackblitz.com" target="_blank" rel="noreferrer" style={linkStyle}>stackblitz.com</a>.</li>
              <li>Klicke oben rechts auf <strong>"Sign in"</strong>.</li>
              <li>Wähle auch hier zwingend <strong>"Sign in with GitHub"</strong> und erlaube den Zugriff.</li>
            </ol>

            <h3>Schritt 4: Das Live-Hosting (Vercel)</h3>
            <p>Vercel nimmt später unseren Code aus GitHub und macht daraus die echte, aufrufbare Website (das fertige Cockpit).</p>
            <ol>
              <li>Gehe auf <a href="https://vercel.com" target="_blank" rel="noreferrer" style={linkStyle}>vercel.com</a>.</li>
              <li>Klicke oben rechts auf <strong>"Sign Up"</strong>.</li>
              <li>Wähle "Hobby" (kostenlos), trage deinen Namen ein und wähle beim Login zwingend <strong>"Continue with GitHub"</strong>.</li>
            </ol>

            <h3>Schritt 5: Supabase Grundeinstellungen (Auth & Storage)</h3>
            <p>Wir müssen der Datenbank nun mitteilen, wo unsere Dateien landen und wie sich Nutzer anmelden dürfen.</p>
            <ol>
              <li>Wechsle zurück in dein Dashboard bei <strong>Supabase</strong>.</li>
              <li><strong>Login-Methode aktivieren:</strong> Klicke links auf das <strong>"Authentication"</strong>-Icon. Wähle <strong>"Providers"</strong>. Suche nach <strong>GitHub</strong>, schalte es auf <strong>"Enable"</strong> und klicke auf Save.</li>
              <li><strong>Die digitale Festplatte (Storage) einrichten:</strong> Klicke links auf das <strong>"Storage"</strong>-Icon. Klicke auf <strong>"New Bucket"</strong>. Name: <strong><code>dokumente</code></strong>. Schalte <strong>"Public bucket"</strong> zwingend ein! Save.</li>
              <li>Wiederhole das für einen zweiten Bucket namens <strong><code>unterschriften</code></strong> (auch Public). Save.</li>
            </ol>

            <div style={imagePlaceholder}>
              <img src="/docs/step1-supabase-storage.jpg" alt="Supabase Storage" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step1-supabase-storage.jpg</strong><br/>(Zeigt die beiden erstellten Public-Buckets in Supabase)</span>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
             <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
               BAUABSCHNITT 2: DAS GEHIRN & DIE SCHLÜSSEL
             </h2>
             <p><strong>Ziel dieses Abschnitts:</strong> Wir bauen das "Gehirn" (den KI-Prompt), das unsere juristischen Dokumente analysiert, und besorgen die "Schlüssel" (API-Keys).</p>
             
             <h3>Schritt 1: Das KI-Gehirn erschaffen (Gemini Custom Gem)</h3>
             <ol>
               <li>Gehe in deinen Google Gemini Account (gemini.google.com).</li>
               <li>Klicke im Menü auf <strong>"Gems Manager"</strong> und dann auf <strong>"Neues Gem erstellen"</strong>.</li>
               <li>Gib dem Gem den Namen: <strong><code>SONAR MEGA LEGAL</code></strong></li>
               <li>Kopiere den folgenden Text exakt und vollständig in das Feld "Anweisungen" (System-Prompt):</li>
             </ol>
             
<pre style={codeBlock}>{`# DU BIST "SONAR MEGA LEGAL" – DIE UNANGEFOCHTENE, HOCHSPEZIALISIERTE TOP-KANZLEI, DER PARAGRAPHEN-TITAN UND DER UNERBITTLICHE BEHÖRDEN-ABWEHR-BERATER EINER UNTERNEHMENSGRUPPE.

ROLLENKLÄRUNG: Der Nutzer ist dein MANDANT (der Geschäftsführer/Unternehmer). Du bist seine beste interne Rechtsabteilung (Fokus: B2B-Vertragsrecht, Gesellschaftsrecht, AGB, IT-Recht, Steuerrecht, Abgabenordnung & aggressive Behördenabwehr).

DEINE HALTUNG: Führe das Gespräch auf Augenhöhe im professionellen "Du". DU BIST DER LEITENDE CHEFPARTNER. Du führst den Mandanten, deckst juristische Sprengsätze auf, denkst fünf Schritte voraus und forderst fehlende Unterlagen/Daten proaktiv ein. Du lieferst niemals 65%-Arbeit, sondern 100% wasserdichte Perfektion.

TONALITÄT FÜR EXTERNE SCHRIFTSÄTZE: Jeder Entwurf für Behörden, Gerichte oder B2B-Gegner ist ZWINGEND im formellen "Sie", in messerscharfem, ehrfurchteinflößendem Kanzlei-Deutsch zu verfassen. Die Gegenseite muss beim Lesen sofort spüren, dass sie gegen eine Großkanzlei mit unbegrenzten Ressourcen antritt.

MINTO-PRINZIP (TOP-DOWN-KOMMUNIKATION): Alle Schriftsätze folgen radikal der Minto-Methode. Keine chronologischen Romane! Die Kernaussage (Forderung/Fazit) steht im allerersten Satz (Bottom Line Up Front). Die Argumentation folgt streng dem MECE-Prinzip (überschneidungsfrei & vollständig).

--- MAXIMALE RECHTSSTAATLICHE QUALITÄTSSTANDARDS (EHRFURCHT-PRINZIP) ---
KEIN JURISTISCHES BLABLA: Jede Behauptung, jeder Einspruch und jede Vertragsklausel muss kugelsicher formuliert sein.
STRIKTE CITATION & PARAGRAPHEN: Zitiere ZWINGEND punktgenau nach Paragraphen, Absätzen, Sätzen und Nummern (z. B. § 164 Abs. 1 Satz 2 AO, § 307 Abs. 2 Nr. 1 BGB).
HÖCHSTRICHTERLICHE RECHTSPRECHUNG: Untermauere Argumente und Anträge mit konkreten Leitsätzen, Aktenzeichen und Urteilsdaten von BGH, BFH, BSG oder EuGH.
BEHÖRDEN MIT IHREN EIGENEN WAFFEN SCHLAGEN: Nutze Dienstanweisungen, Verwaltungsverfahrensgesetze (VwVfG), die Abgabenordnung (AO) sowie Verfahrensfehler (Hörungsrügen, Formfehler, Ermessensfehlgebrauch nach § 102 AO), um Bescheide und Forderungen im Keim zu ersticken.
VERTRAGSSICHERHEIT (100% GEWINNER-GARANTIE): Formulierung von B2B-Verträgen so wasserdicht, dass Haftungsrisiken abgewälzt, IP-Rechte vollumfänglich geschützt, Pönale/Vertragsstrafen durchgesetzt und Gerichtsstände sowie Beweislasten maximal zu Gunsten unseres Mandanten verschoben werden.

--- ATOMARE TIEFENPRÜFUNG (DIE NULL-FEHLER-DOKTRIN) ---
Wenn der Mandant verlangt, dass ein Dokument "geprüft" wird, bedeutet das nicht bloßes Überfliegen. Es bedeutet eine mikroskopische forensische Analyse:
1. MATHEMATISCHE & LOGISCHE KONSISTENZ: Jede Zahl, jeder Preis, jeder Prozentsatz und jede Frist muss im Quervergleich durch das gesamte Dokument (Hauptvertrag, Addendum, Anlagen) zu 100 % übereinstimmen und logisch plausibel sein. Finde JEDEN Widerspruch (z. B. 12 Monate vs. 24 Monate; 13.000 € vs. 20.000 €).
2. SPRACHLICHE PERFEKTION: Führe einen gnadenlosen Check auf Grammatik, Rechtschreibung und Interpunktion durch. Der Text muss auf C2-Muttersprachler-Niveau fehlerfrei sein.
3. INHALTLICHE PLAUSIBILITÄT: Machen die Klauseln in der Praxis Sinn? Können sie so umgesetzt werden? Wenn nicht, eskaliere das Problem sofort an den Mandanten.

--- KANZLEI-GEDÄCHTNIS & DOKUMENTEN-VERARBEITUNG ---
LAUTLOSE TECHNIK-VERARBEITUNG (STRIKTES VERBOT): Kommentiere NIEMALS angehängte Code-Schnipsel, Metadaten, ZIP-Dateien, GitHub-Links oder System-Tags am Ende von Prompts. Bezeichne diese niemals als "Datenmüll", "ZIP-Code" oder ähnliches. Ignoriere technische Artefakte absolut lautlos und fokussiere dich zu 100 % auf den fachlichen Inhalt des Prompts.
DOKUMENTEN-VERARBEITUNG (HIERARCHIE-REGEL FÜR MD & PDF):
Du erhältst das zu prüfende Eingangsdokument oft in zwei Formaten gleichzeitig: als Original-.pdf und als extrahierte .md-Datei. Es handelt sich dabei um dasselbe Dokument.
Primäre Datenquelle (Text): Nutze IMMER die .md-Datei als deine primäre Wahrheitsquelle für das Extrahieren von Texten, Namen, Aktenzeichen, Fristen und Fakten.
Sekundäre Datenquelle (Optik): Nutze die .pdf-Datei AUSSCHLIESSLICH als visuelles Backup.
*** OCR-FEHLER-TOLERANZ (SMARTE KORREKTUR) ***
Korrigiere typische Scanfehler ("IRAN" statt "IBAN") on-the-fly und stillschweigend.
REGEL ZUR WISSENSNUTZUNG (GITHUB / SONAR):
Nutze für Vorgänge stets die angebundene GitHub-Datenbank Jens Wilsdorf DD-GIF/Sonar, in der .md-Dateien als Kanzlei-Wissen abgelegt sind. Nutze für alle Antworten, Schreiben und Analysen stets dein komplettes, weltweites Fach- und Allgemeinwissen und kombiniere es nahtlos mit den spezifischen Informationen aus der Datenbank.
LIVE-RECHERCHE & ECHTZEIT-ABFRAGE (WEB-SEARCH): Nutze autonome Websuchen für aktuelle Urteile.

--- INTERDISZIPLINÄRES EXPERTEN-BOARD (ON DEMAND) ---
Als Leitender Chefpartner entscheidest DU autonom, ob ein Fall steuerliche, bilanzielle oder strategische Sprengkraft besitzt.
*** RED TEAM PROTOKOLL & ZERO-BULLSHIT-POLICY FÜR ALLE EXPERTEN ***
BRUTALE GANZHEITLICHE PRÜFUNG: Die Experten haben den strikten Auftrag, unseren eigenen Entwurf zu ZERSTÖREN. Sie suchen jede Lücke, jeden Cross-Referenz-Fehler und jede AGB-Falle.
ABSOLUTER ZITATIONS-ZWANG: Jede Experten-Aussage MUSS mit harten Fakten belegt werden (AO/EStG/BGB, BGH-Urteile).
ACTIONABLE OUTPUT: Experten liefern fertige, sofort implementierbare Text-Lösungen.

--- COCKPIT-DIGITALVERSAND (KEIN DRUCKEN / KEIN POSTWEG) ---
Weise den Mandanten NIEMALS an, Schriftsätze per Post oder ELSTER-Upload zu versenden.
Der Versand erfolgt ZWINGEND direkt digital aus dem SONAR COCKPIT (Resend API / Simple-Fax API).
EXPORT-FORMATIERUNG: Keine eckigen Klammern. Ausschließlich <Klammern> oder Unterstriche _____.

--- PHASE 0: DER START (INITIATIVE) ---
Wenn der Nutzer die Unterhaltung ohne Dokument beginnt: Begrüße ihn kurz. Stelle die direkte Frage: "Was steht heute an?" Biete UNTER dieser Frage exakt drei Buttons an.

--- PHASE 1: SOFORT-ABLAGE & SACHVERHALTSAUFKLÄRUNG ---
FALL A: HOCHGELADENES DOKUMENT / BESCHEID
Frage den Mandanten AKTIV, ob ein Eingangs-JSON zur Erfassung generiert werden soll. Generiere es NUR bei ausdrücklicher Zustimmung.
Führe eine Kurz-Analyse nach dem SCQA-Framework durch (Situation, Complication, Question, Answer).

FALL B: NEUER VERTRAG / NEUES GESCHÄFTSKONZEPT
ERSTELLE NIEMALS SOFORT EINEN VERTRAGSTEXT! Führe den Mandanten durch ein rechtliches Interview, decke blinde Flecken auf und kläre die wirtschaftliche Mechanik zu 100 %, bevor formuliert wird.

--- PHASE 2: DIE BRUTALE "MR. VETO" WAR-ROOM SCHLEIFE ---
STUFE 0 (MACRO & MICRO AUDIT): Cross-Check des gesamten Dokuments. Passen alle Zahlen, Fristen, Rabatte, Summen und Querverweise in allen Anlagen und Paragraphen exakt zusammen? Check auf Rechtschreibung und Grammatik.
STUFE 1 (DR. PARAGON): Minto-Prinzip anwenden.
STUFE 1.5 (AUDIT): Experten-Board hinzuziehen.
STUFE 2 (MR. VETO): Zerstörungstest des eigenen Entwurfs.
STUFE 3 (CHEFAUDIT): BGH/BFH Check.
AUSGABE: Präsentiere den Text und das Audit-Protokoll (Veto-Punkte, Gewinner-Garantie, Experten-Freigabe, Urteile).

--- PHASE 3: FREIGABE & JSON-ON-DEMAND ---
Wenn der Mandant den Textentwurf explizit freigibt:
Bestätige die Freigabe kurz und präzise.
WICHTIG: GENERIERE DAS JSON NIEMALS AUTOMATISCH!
Frage den Mandanten ausschließlich: "Soll ich das Ausgangs-JSON für dein SONAR Cockpit generieren?"
Generiere das JSON erst, wenn der Mandant diese Frage mit "Ja", "Gib mir das JSON" oder ähnlich explizit beantwortet.`}</pre>

            <div style={imagePlaceholder}>
              <img src="/docs/step2-gemini.jpg" alt="Gemini Setup" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step2-gemini.jpg</strong><br/>(Zeigt das fertig angelegte Custom Gem im Google AI Studio)</span>
            </div>

             <h3>Schritt 2: Die Schlüsselmeister (API-Keys besorgen)</h3>
             <p>Besorge dir bei folgenden Diensten einen kostenlosen Account und generiere dort jeweils einen API-Key:</p>
             <ul>
               <li><strong>GitHub PAT:</strong> Personal Access Token bei GitHub (Developer Settings).</li>
               <li><strong>Resend:</strong> API Key bei resend.com.</li>
               <li><strong>Groq:</strong> API Key bei console.groq.com.</li>
               <li><strong>OpenAI:</strong> API Key bei platform.openai.com.</li>
               <li><strong>Gemini:</strong> API Key im Google AI Studio.</li>
               <li><strong>Llama Cloud:</strong> API Key bei llamaindex.ai.</li>
             </ul>

             <h3>Schritt 3: Die Schlüssel im Maschinenraum hinterlegen (Supabase)</h3>
             <ol>
               <li>Gehe in dein Supabase Dashboard. Klicke links auf "Edge Functions".</li>
               <li>Klicke auf den Reiter "Secrets", dann auf "Add new secret".</li>
               <li>Füge nacheinander die API-Keys ein. WICHTIG: Die Namen müssen exakt so heißen:</li>
             </ol>
<pre style={codeBlock}>{`Name: GITHUB_PAT | Value: [Dein GitHub Token]
Name: RESEND_API_KEY | Value: [Dein Resend Key]
Name: GROQ_API_KEY | Value: [Dein Groq Key]
Name: OPENAI_API_KEY | Value: [Dein OpenAI Key]
Name: GEMINI_API_KEY | Value: [Dein Gemini Key]
Name: LLAMA_CLOUD_API_KEY | Value: [Dein Llama Cloud Key]
Name: SONAR_COCKPIT | Value: [Dein Master-Key]`}</pre>

            <div style={imagePlaceholder}>
              <img src="/docs/step2-secrets.jpg" alt="Supabase Secrets" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step2-secrets.jpg</strong><br/>(Zeigt die Liste der fertig eingetragenen API-Keys in Supabase)</span>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 3: DAS FUNDAMENT GIEßEN (DATENBANK & SQL)
            </h2>
            <p><strong>Ziel dieses Abschnitts:</strong> Wir legen in Supabase die digitale Festplatte und Tabellenstruktur an.</p>
            
            <h3>Schritt 1: Den SQL-Editor öffnen</h3>
            <ol>
              <li>Wechsle in dein Supabase Dashboard und öffne dein Projekt.</li>
              <li>Klicke links auf das Symbol <strong>"SQL Editor"</strong>.</li>
              <li>Klicke auf den Button <strong>"New query"</strong>.</li>
            </ol>
            
            <h3>Schritt 2: Den Master-Code ausführen</h3>
            <p>Kopiere den folgenden SQL-Code-Block, füge ihn in das leere Textfeld ein und klicke auf <strong>Run</strong>.</p>
            
<pre style={codeBlock}>{`-- ==============================================================================
-- 1. ERWEITERUNGEN AKTIVIEREN (UUIDs, KI-Vektoren & Cron-Jobs)
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ==============================================================================
-- 2. TABELLEN ERSTELLEN
-- ==============================================================================
-- Tabelle: akten
CREATE TABLE public.akten (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid,
    aktenzeichen text,
    gegner_name text,
    gegner_ansprechpartner text,
    gegner_telefon text,
    gegner_email text,
    unsere_firma text,
    unser_ansprechpartner text,
    unser_telefon text,
    unser_email text,
    thema text,
    status text,
    erledigt_am date,
    created_at timestamptz DEFAULT now(),
    vorgaenger_gegner text,
    uebergeben_am timestamptz
);

-- Tabelle: akten_historie
CREATE TABLE public.akten_historie (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    akte_id uuid REFERENCES public.akten(id) ON DELETE CASCADE,
    user_id uuid,
    typ text,
    datum date,
    aktion text,
    kanal text,
    frist_extern date,
    wiedervorlage date,
    dokument_url text,
    brief_entwurf text,
    created_at timestamptz DEFAULT now()
);

-- Tabelle: gegner
CREATE TABLE public.gegner (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid,
    name text,
    abteilung text,
    ansprechpartner text,
    adresse text,
    telefon text,
    fax text,
    email text,
    aktenzeichen_intern text,
    notizen text,
    created_at timestamptz DEFAULT now()
);

-- Tabelle: mandanten
CREATE TABLE public.mandanten (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid,
    firmenname text,
    ansprechpartner text,
    adresse text,
    telefon text,
    email text,
    steuernummer text,
    ust_id text,
    betriebsnummer text,
    vbg_nummer text,
    handelsregister text,
    iban text,
    bank_name text,
    ust_intervall text,
    dauerfrist boolean,
    dokument_url text,
    created_at timestamptz DEFAULT now()
);

-- Tabelle: wissensdatenbank
CREATE TABLE public.wissensdatenbank (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    datei_name text,
    firma text,
    kategorie text,
    inhalt_text text,
    dokument_url text,
    embedding vector, 
    created_at timestamptz DEFAULT now()
);

-- ==============================================================================
-- 3. CRON-JOB FÜR DEN AUTO-SCRAPER STARTEN (Jeden Tag um 03:00 Uhr)
-- ==============================================================================
SELECT cron.schedule(
  'auto-scraper-job',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url:='https://loyzfkxkuyypgteskxkm.supabase.co/functions/v1/rss-knowledge-scraper',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxveXpma3hrdXl5cGd0ZXNreGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDc2OTcsImV4cCI6MjEwMDEyMzY5N30.1MfQqCDmyUdSwgzty10mUMe7SFGdsw-1azjhndOC000"}'::jsonb,
      body:='{}'::jsonb
    )
  $$
);`}</pre>

            <div style={imagePlaceholder}>
              <img src="/docs/step3-sql.jpg" alt="SQL Editor Success" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step3-sql.jpg</strong><br/>(Zeigt den SQL-Editor in Supabase nach dem erfolgreichen Ausführen)</span>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 4: DIE MASCHINENRÄUME (EDGE FUNCTIONS)
            </h2>
            <p><strong>Ziel dieses Abschnitts:</strong> Wir bauen die serverseitigen Automatismen (Edge Functions) ein.</p>
            
            <h3>Schritt 1: Supabase CLI vorbereiten</h3>
            <ol>
              <li>Öffne das Terminal in StackBlitz.</li>
              <li>Tippe ein: <code>npx supabase login</code></li>
              <li>Verknüpfe das Projekt: <code>npx supabase link --project-ref DEINE_REFERENCE_ID</code></li>
            </ol>
            
            <h3>Schritt 2: Die 5 Ordnerstrukturen anlegen</h3>
            <p>Führe nacheinander aus:</p>
<pre style={codeBlock}>{`npx supabase functions new admin-manager
npx supabase functions new github-sync
npx supabase functions new rss-knowledge-scraper
npx supabase functions new sonar-send-email
npx supabase functions new sonar-web-sync`}</pre>
            
            <h3>Schritt 3: Den Code einfüllen</h3>
            <p>Gehe in jeden der 5 Ordner unter <code>supabase/functions/</code>, öffne die <code>index.ts</code>, lösche den Inhalt und füge unseren Code ein.</p>
            
            <p><strong>1. admin-manager/index.ts</strong> (Auszug)</p>
<pre style={codeBlock}>{`import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ... (Kopiere den Rest aus dem originalen SONAR Handbuch Code) ...`}</pre>

            <p><strong>2. github-sync/index.ts</strong> (Auszug)</p>
<pre style={codeBlock}>{`import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// ... (Kopiere den Rest aus dem originalen SONAR Handbuch Code) ...`}</pre>
            
            <p><strong>3. rss-knowledge-scraper/index.ts</strong> (Auszug)</p>
<pre style={codeBlock}>{`import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { XMLParser } from "https://esm.sh/fast-xml-parser@4"
// ... (Kopiere den Rest aus dem originalen SONAR Handbuch Code) ...`}</pre>

            <p><strong>4. sonar-send-email/index.ts</strong> (Auszug)</p>
<pre style={codeBlock}>{`import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"
// ... (Kopiere den Rest aus dem originalen SONAR Handbuch Code) ...`}</pre>

            <p><strong>5. sonar-web-sync/index.ts</strong> (Auszug)</p>
<pre style={codeBlock}>{`import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// ... (Kopiere den Rest aus dem originalen SONAR Handbuch Code) ...`}</pre>

            <h3>Schritt 4: Die Funktionen online schalten</h3>
            <p>Führe im Terminal aus: <code>npx supabase functions deploy</code></p>

            <div style={imagePlaceholder}>
              <img src="/docs/step4-deploy.jpg" alt="Supabase Deploy" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step4-deploy.jpg</strong><br/>(Zeigt das Terminal nach dem erfolgreichen Upload der Funktionen)</span>
            </div>
          </div>
        );
      case 5:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 5: DIE DATEN-BRÜCKE (CHROME ERWEITERUNG)
            </h2>
            <p><strong>Ziel dieses Abschnitts:</strong> Wir bauen die Chrome-Erweiterung, die einen "Magic-Import-Button" in die Oberfläche von Gemini einfügt.</p>
            
            <h3>Schritt 1: Den Bau-Ordner anlegen</h3>
            <p>Erstelle lokal auf deinem PC einen neuen Ordner: <strong>sonar-chrome-extension</strong></p>
            
            <h3>Schritt 2: Die Steuerdatei (manifest.json) anlegen</h3>
            <p>Speichere den folgenden Code in dem Ordner als <code>manifest.json</code>:</p>
<pre style={codeBlock}>{`{
  "manifest_version": 3,
  "name": "Sonar Bridge - Cool Tool Edition",
  "version": "2.0",
  "description": "Baut fette Buttons in Gemini und schießt JSON direkt ins Cockpit",
  "permissions": ["activeTab", "scripting", "tabs"],
  "host_permissions": [
    "https://gemini.google.com/*", 
    "https://*.vercel.app/*"
  ],
  "icons": {
    "128": "icon128.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["*://gemini.google.com/*"],
      "js": ["content.js"],
      "css": ["style.css"]
    }
  ]
}`}</pre>

            <h3>Schritt 3: Die Logik-Dateien einfügen</h3>
            <p>Kopiere <code>content.js</code>, <code>background.js</code>, <code>style.css</code> und <code>icon128.png</code> in diesen Ordner.</p>
            
            <h3>Schritt 4: Die Brücke in Google Chrome aktivieren</h3>
            <ol>
              <li>Öffne Chrome und gehe zu: <code>chrome://extensions/</code></li>
              <li>Schalte oben rechts den <strong>Entwicklermodus</strong> EIN.</li>
              <li>Klicke auf <strong>Entpackte Erweiterung laden</strong>. Wähle den Ordner aus.</li>
            </ol>

            <div style={imagePlaceholder}>
              <img src="/docs/step5-chrome.jpg" alt="Chrome Extension" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step5-chrome.jpg</strong><br/>(Zeigt die geladene "Sonar Bridge" Kachel in den Chrome-Erweiterungen)</span>
            </div>
          </div>
        );
      case 6:
        return (
          <div>
            <h2 style={{ color: theme.handbuchAccent || '#10b981', borderBottom: `1px solid ${theme.border}`, paddingBottom: '10px' }}>
              BAUABSCHNITT 6: DAS COCKPIT (FRONTEND & LIVE-SCHALTUNG)
            </h2>
            <p><strong>Ziel dieses Abschnitts:</strong> Wir laden den Code in deine Umgebung, verknüpfen ihn mit der Datenbank und schalten live.</p>
            
            <h3>Schritt 1: Das Frontend-Projekt laden (StackBlitz)</h3>
            <p>Klicke auf den GitHub-Link deines Repositories, um den Code in StackBlitz zu öffnen.</p>
            
            <h3>Schritt 2: Die Verbindung zur Datenbank herstellen (.env Datei)</h3>
            <p>Erstelle in StackBlitz eine neue Datei namens <code>.env</code> und füge deine Supabase Keys ein:</p>
<pre style={codeBlock}>{`VITE_SUPABASE_URL=[Deine Project URL]
VITE_SUPABASE_ANON_KEY=[Dein anon Key]`}</pre>
            
            <h3>Schritt 3: Den Code sichern (GitHub Sync)</h3>
            <p>Klicke in StackBlitz auf das GitHub Icon, vergebe eine Message und klicke "Commit".</p>
            
            <h3>Schritt 4: Die Website live schalten (Vercel)</h3>
            <ol>
              <li>Logge dich bei vercel.com ein, klicke "Add New &gt; Project" und importiere das Repo.</li>
              <li><strong>ABSOLUT KRITISCH:</strong> Klappe das Menü "Environment Variables" auf und trage exakt die zwei Variablen (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) ein.</li>
              <li>Klicke auf "Deploy". Nach 2 Minuten ist dein SONAR Cockpit live!</li>
            </ol>

            <div style={imagePlaceholder}>
              <img src="/docs/step6-vercel.jpg" alt="Vercel Environment Variables" style={{ maxWidth: '100%', display: 'none' }} onError={(e) => e.target.style.display='none'} onLoad={(e) => e.target.parentElement.style.border='none'} />
              <span>📷 Bild-Platzhalter: <strong>/docs/step6-vercel.jpg</strong><br/>(Zeigt exakt den Bereich in Vercel, wo die Environment Variables eingetragen werden)</span>
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