```markdown
# SONAR TECH-HANDBUCH
**Version:** 1.0
**Stand:** 22. August 2026
**System-Architektur:** React (Vite), Supabase (PostgreSQL, Edge Functions), Node.js, Vercel, Google Gemini

---

## BAUABSCHNITT 1: DIE WERKSTATT EINRICHTEN

**Ziel dieses Abschnitts:** Bevor wir Code anfassen, müssen wir die Infrastruktur aufbauen. Das SONAR Cockpit besteht aus verschiedenen Modulen, die alle nahtlos miteinander kommunizieren müssen. Der Dreh- und Angelpunkt für diese Kommunikation ist **GitHub**.

### Schritt 1: Der Master-Schlüssel (GitHub)
GitHub ist unser zentraler Speicherort für den Code und die Wissensdatenbank. Gleichzeitig nutzen wir es als "Generalschlüssel" (Login), um uns bei allen anderen Diensten anzumelden.
1. Gehe auf [github.com](https://github.com/).
2. Klicke oben rechts auf **"Sign up"** und erstelle einen kostenlosen Account.
3. Bestätige deine E-Mail-Adresse. Bleibe in deinem Browser bei GitHub eingeloggt.

### Schritt 2: Das Backend & die Datenbank (Supabase)
Supabase ist der Motor im Hintergrund. Hier liegen später alle Akten, Mandanten und Dateien.
1. Gehe auf [supabase.com](https://supabase.com/).
2. Klicke auf **"Start your project"**.
3. Wähle auf der Login-Seite zwingend **"Continue with GitHub"** aus und autorisiere die Verknüpfung.
4. Klicke auf **"New Project"**, wähle eine Organisation aus und gib dem Projekt einen Namen (z. B. "Sonar Cockpit").
5. Vergib ein starkes **Database Password**. *WICHTIG: Notiere dir dieses Passwort sicher, wir brauchen es später!*
6. Wähle eine Region in Europa (z. B. Frankfurt) und klicke auf **"Create new project"**. (Der Aufbau dauert nun ein paar Minuten).

### Schritt 3: Die Frontend-Werkstatt (StackBlitz)
StackBlitz ist unser virtueller Code-Editor. Hier bauen wir die Benutzeroberfläche des Cockpits.
1. Gehe auf [stackblitz.com](https://stackblitz.com/).
2. Klicke oben rechts auf **"Sign in"**.
3. Wähle auch hier zwingend **"Sign in with GitHub"** und erlaube den Zugriff.

### Schritt 4: Das Live-Hosting (Vercel)
Vercel nimmt später unseren Code aus GitHub und macht daraus die echte, aufrufbare Website (das fertige Cockpit).
1. Gehe auf [vercel.com](https://vercel.com/).
2. Klicke oben rechts auf **"Sign Up"**.
3. Wähle "Hobby" (kostenlos), trage deinen Namen ein und wähle beim Login zwingend **"Continue with GitHub"**.

### Schritt 5: Supabase Grundeinstellungen (Auth & Storage)
Wir müssen der Datenbank nun mitteilen, wo unsere Dateien landen und wie sich Nutzer anmelden dürfen.
1. Wechsle zurück in dein Dashboard bei **Supabase**.
2. **Login-Methode aktivieren:**
   * Klicke in der ganz linken, dunklen Menüleiste auf das **"Authentication"**-Icon (zwei Personen).
   * Wähle im Menü daneben **"Providers"**.
   * Suche in der Liste nach **GitHub**, klicke es an und schalte den Button auf **"Enable"** (grün). Klicke auf Save.
3. **Die digitale Festplatte (Storage) einrichten:**
   * Klicke in der ganz linken Menüleiste auf das **"Storage"**-Icon (ein kleiner Ordner/Karton).
   * Klicke auf den grünen Button **"New Bucket"**.
   * Trage bei "Name" exakt das Wort **`dokumente`** (alles klein) ein.
   * **ABSOLUT KRITISCH:** Schalte den Schalter bei **"Public bucket"** zwingend ein! Klicke auf "Save".
   * Klicke erneut auf **"New Bucket"**.
   * Nenne diesen Ordner exakt **`unterschriften`**.
   * Schalte auch hier **"Public bucket"** zwingend ein! Klicke auf "Save".

---

## BAUABSCHNITT 2: DAS GEHIRN & DIE SCHLÜSSEL

**Ziel dieses Abschnitts:** Wir bauen das "Gehirn" (den KI-Prompt), das unsere juristischen Dokumente analysiert, und besorgen die "Schlüssel" (API-Keys), damit unser Supabase-Backend eigenständig E-Mails versenden und KIs ansteuern darf.

### Schritt 1: Das KI-Gehirn erschaffen (Gemini Custom Gem)
1. Gehe in deinen Google Gemini Account (gemini.google.com).
2. Klicke im Menü auf **"Gems Manager"** und dann auf **"Neues Gem erstellen"**.
3. Gib dem Gem den Namen: **`SONAR MEGA LEGAL`**
4. Kopiere den folgenden Text **exakt und vollständig** in das Feld "Anweisungen" (System-Prompt):

```text
# DU BIST "SONAR MEGA LEGAL" – DIE UNANGEFOCHTENE, HOCHSPEZIALISIERTE TOP-KANZLEI, DER PARAGRAPHEN-TITAN UND DER UNERBITTLICHE BEHÖRDEN-ABWEHR-BERATER EINER UNTERNEHMENSGRUPPE.

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
Generiere das JSON erst, wenn der Mandant diese Frage mit "Ja", "Gib mir das JSON" oder ähnlich explizit beantwortet.

```

5. Speichere das Gem.

### Schritt 2: Die Schlüsselmeister (API-Keys besorgen)

Besorge dir bei folgenden Diensten einen kostenlosen Account und generiere dort jeweils einen API-Key (kopiere die Keys in eine sichere Textdatei):

* **GitHub PAT:** Personal Access Token bei GitHub (Developer Settings).
* **Resend:** API Key bei resend.com.
* **Groq:** API Key bei console.groq.com.
* **OpenAI:** API Key bei platform.openai.com.
* **Gemini:** API Key im Google AI Studio.
* **Llama Cloud:** API Key bei llamaindex.ai.

### Schritt 3: Die Schlüssel im Maschinenraum hinterlegen (Supabase)

Diese Schlüssel müssen wir jetzt absolut sicher in unserem Backend (Supabase) wegsperren.

1. Gehe in dein Supabase Dashboard.
2. Klicke links in der dunklen Menüleiste auf **"Edge Functions"** (das Blitz-/Klammer-Symbol).
3. Klicke oben auf den Reiter **"Secrets"**.
4. Klicke auf **"Add new secret"**.
5. Füge nacheinander die API-Keys aus deiner Textdatei ein. **WICHTIG:** Die Namen der Secrets müssen exakt so heißen:
* Name: `GITHUB_PAT` | Value: *[Dein GitHub Token]*
* Name: `RESEND_API_KEY` | Value: *[Dein Resend Key]*
* Name: `GROQ_API_KEY` | Value: *[Dein Groq Key]*
* Name: `OPENAI_API_KEY` | Value: *[Dein OpenAI Key]*
* Name: `GEMINI_API_KEY` | Value: *[Dein Gemini Key]*
* Name: `LLAMA_CLOUD_API_KEY` | Value: *[Dein Llama Cloud Key]*
* Name: `SONAR COCKPIT` | Value: *[Dein eigens ausgedachter, sicherer Master-Key]*


6. Speichere alle ab.

---

## BAUABSCHNITT 3: DAS FUNDAMENT GIEßEN (DATENBANK & SQL)

**Ziel dieses Abschnitts:** Wir legen in Supabase die digitale Festplatte und Tabellenstruktur an.

### Schritt 1: Den SQL-Editor öffnen

1. Wechsle in dein **Supabase Dashboard** und öffne dein Projekt.
2. Klicke in der linken, dunklen Menüleiste auf das Symbol **"SQL Editor"**.
3. Klicke auf den Button **"New query"** (Neue Abfrage).

### Schritt 2: Den Master-Code ausführen

Kopiere den folgenden SQL-Code-Block und füge ihn in das leere Textfeld ein. Klicke danach unten rechts auf den grünen Button **"Run"**.

```sql
-- ==============================================================================
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
      url:='[https://loyzfkxkuyypgteskxkm.supabase.co/functions/v1/rss-knowledge-scraper](https://loyzfkxkuyypgteskxkm.supabase.co/functions/v1/rss-knowledge-scraper)',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxveXpma3hrdXl5cGd0ZXNreGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NDc2OTcsImV4cCI6MjEwMDEyMzY5N30.1MfQqCDmyUdSwgzty10mUMe7SFGdsw-1azjhndOC000"}'::jsonb,
      body:='{}'::jsonb
    )
  $$
);

```

---

## BAUABSCHNITT 4: DIE MASCHINENRÄUME (EDGE FUNCTIONS)

**Ziel dieses Abschnitts:** Wir bauen die serverseitigen Automatismen (Edge Functions) ein.

### Schritt 1: Supabase CLI (Kommandozeile) vorbereiten

1. Öffne ein lokales Terminal auf deinem PC oder in StackBlitz.
2. Tippe ein: `npx supabase login`
3. Das Terminal generiert einen Link. Klicke darauf, autorisiere dich und füge den Token ein.
4. Verknüpfe das Projekt (Reference ID unter *Project Settings -> General* in Supabase kopieren):
`npx supabase link --project-ref DEINE_REFERENCE_ID`

### Schritt 2: Die 5 Ordnerstrukturen anlegen

Führe nacheinander aus:
`npx supabase functions new admin-manager`
`npx supabase functions new github-sync`
`npx supabase functions new rss-knowledge-scraper`
`npx supabase functions new sonar-send-email`
`npx supabase functions new sonar-web-sync`

### Schritt 3: Den Code einfüllen

Gehe in jeden der 5 neu erstellten Ordner (unter `supabase/functions/`), öffne die `index.ts`, lösche den Beispielcode und füge exakt den folgenden Code ein:

**1. `admin-manager/index.ts**`

```typescript
import { serve } from "[https://deno.land/std@0.168.0/http/server.ts](https://deno.land/std@0.168.0/http/server.ts)"
import { createClient } from '[https://esm.sh/@supabase/supabase-js@2](https://esm.sh/@supabase/supabase-js@2)'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (userError || !user) throw new Error('Nicht autorisiert. Bitte einloggen.')

    const { data: adminCheck } = await supabaseClient.from('admins').select('email').eq('email', user.email).single()
    if (!adminCheck) throw new Error('Zugriff verweigert: Keine Admin-Rechte.')

    const { action, email, password } = await req.json()

    if (action === 'create') {
      const { data: newAuthUser, error: authErr } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      })
      if (authErr) throw authErr

      const { error: dbErr } = await supabaseClient.from('admins').insert([{ email: email }])
      if (dbErr) throw dbErr

      return new Response(JSON.stringify({ success: true, message: 'Admin erfolgreich erstellt' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } 
    
    if (action === 'reset') {
      const { data: usersData, error: listErr } = await supabaseClient.auth.admin.listUsers()
      if (listErr) throw listErr
      
      const targetUser = usersData.users.find(u => u.email === email)
      if (!targetUser) throw new Error('Benutzer im Auth-System nicht gefunden')

      const { error: updateErr } = await supabaseClient.auth.admin.updateUserById(
        targetUser.id,
        { password: password }
      )
      if (updateErr) throw updateErr

      return new Response(JSON.stringify({ success: true, message: 'Passwort erfolgreich überschrieben' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Ungültige Aktion')

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

```

**2. `github-sync/index.ts**`

```typescript
import { serve } from "[https://deno.land/std@0.168.0/http/server.ts](https://deno.land/std@0.168.0/http/server.ts)"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log("[GITHUB SYNC] Edge Function gestartet.");

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const filename = payload.filename
    const content = payload.content
    const action = payload.action

    const GITHUB_TOKEN = Deno.env.get('GITHUB_PAT')
    if (!GITHUB_TOKEN) {
      throw new Error("Fehler: Das Secret GITHUB_PAT fehlt in Supabase.")
    }

    const repo = "jenswilsdorfdd-gif/sonar"
    const branch = "main" 

    if (action === 'list') {
      const listUrl = `[https://api.github.com/repos/$](https://api.github.com/repos/$){repo}/contents/wissensdatenbank?ref=${branch}`
      const listRes = await fetch(listUrl, {
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "Sonar-Cockpit"
        }
      })

      if (!listRes.ok) {
        const errorData = await listRes.text()
        throw new Error(`GitHub API Fehler beim Listen: ${listRes.status} - ${errorData}`)
      }

      const files = await listRes.json()
      const fileList = Array.isArray(files) ? files.filter((f: any) => f.type === 'file') : []

      return new Response(
        JSON.stringify({ success: true, files: fileList }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (!filename) {
      throw new Error("Fehler: 'filename' muss übergeben werden.")
    }

    const path = `wissensdatenbank/${filename}`
    const url = `[https://api.github.com/repos/$](https://api.github.com/repos/$){repo}/contents/${path}`

    let fileSha = null
    const getRes = await fetch(`${url}?ref=${branch}`, {
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Sonar-Cockpit"
      }
    })

    if (getRes.ok) {
      const fileData = await getRes.json()
      fileSha = fileData.sha
    }

    if (action === 'delete') {
      if (!fileSha) {
        return new Response(
          JSON.stringify({ success: true, message: `Datei ${filename} existierte nicht (mehr) auf GitHub. Nichts zu löschen.` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      const deleteRes = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "Sonar-Cockpit"
        },
        body: JSON.stringify({
          message: `System-Sync: ${filename} gelöscht via SONAR Cockpit`,
          sha: fileSha,
          branch: branch
        })
      })

      if (!deleteRes.ok) {
        const errorData = await deleteRes.text()
        throw new Error(`GitHub API Fehler beim Löschen: ${deleteRes.status} - ${errorData}`)
      }

      return new Response(
        JSON.stringify({ success: true, message: `Datei ${filename} erfolgreich aus dem Repo gelöscht.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (!content) {
      throw new Error("Fehler: 'content' muss für Upload/Update übergeben werden.")
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    let binary = ''
    for (let i = 0; i < data.byteLength; i++) {
      binary += String.fromCharCode(data[i])
    }
    const base64Content = btoa(binary)

    const putBody: any = {
      message: `System-Sync: ${filename} via SONAR Cockpit (Local MD)`,
      content: base64Content,
      branch: branch
    }
    if (fileSha) putBody.sha = fileSha

    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "Sonar-Cockpit"
      },
      body: JSON.stringify(putBody)
    })

    if (!putRes.ok) {
      const errorData = await putRes.text()
      throw new Error(`GitHub API Fehler beim Push: ${putRes.status} - ${errorData}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: `Datei ${filename} erfolgreich ins Repo gepusht.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

```

**3. `rss-knowledge-scraper/index.ts**`

```typescript
import { serve } from "[https://deno.land/std@0.168.0/http/server.ts](https://deno.land/std@0.168.0/http/server.ts)"
import { createClient } from "[https://esm.sh/@supabase/supabase-js@2.39.3](https://esm.sh/@supabase/supabase-js@2.39.3)"
import { XMLParser } from "[https://esm.sh/fast-xml-parser@4](https://esm.sh/fast-xml-parser@4)"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const RSS_FEEDS = [
  { name: "Bundesgerichtshof (BGH)", url: "[https://www.bundesgerichtshof.de/DE/Service/RSSFeed/Function/RSS_EN.xml?nn=373238](https://www.bundesgerichtshof.de/DE/Service/RSSFeed/Function/RSS_EN.xml?nn=373238)" },
  { name: "Bundesfinanzhof (BFH)", url: "[https://www.bundesfinanzhof.de/de/precedent.rss](https://www.bundesfinanzhof.de/de/precedent.rss)" },
  { name: "Bundesverwaltungsgericht (BVerwG)", url: "[https://www.bverwg.de/rss/entscheidungen.rss](https://www.bverwg.de/rss/entscheidungen.rss)" },
  { name: "Bundesarbeitsgericht (BAG)", url: "[https://www.bundesarbeitsgericht.de/feed/?post_type=pressemitteilung](https://www.bundesarbeitsgericht.de/feed/?post_type=pressemitteilung)" },
  { name: "Bundessozialgericht (BSG)", url: "[https://www.bsg.bund.de/DE/Service/RSS-Feed/_functions/rssnewsfeed-entscheidungen.xml](https://www.bsg.bund.de/DE/Service/RSS-Feed/_functions/rssnewsfeed-entscheidungen.xml)" },
  { name: "Europäischer Gerichtshof (EuGH)", url: "[https://curia.europa.eu/site/rss.jsp?lang=de&secondLang=en](https://curia.europa.eu/site/rss.jsp?lang=de&secondLang=en)" },
  { name: "Europäischer Gerichtshof für Menschenrechte (EGMR)", url: "[https://hudoc.echr.coe.int/app/transform/rss?library=echreng&query=((((((((((((((((((((%20contentsitename:ECHR%20AND%20(NOT%20(doctype=PR%20OR%20doctype=HFCOMOLD%20OR%20doctype=HECOMOLD))%20AND%20((respondent=%22DEU%22))%20AND%20((documentcollectionid=%22GRANDCHAMBER%22)))%20XRANK(cb=14)%20doctypebranch:GRANDCHAMBER)%20XRANK(cb=13)%20doctypebranch:DECGRANDCHAMBER)%20XRANK(cb=12)%20doctypebranch:CHAMBER)%20XRANK(cb=11)%20doctypebranch:ADMISSIBILITY)%20XRANK(cb=10)%20doctypebranch:COMMITTEE)%20XRANK(cb=9)%20doctypebranch:ADMISSIBILITYCOM)%20XRANK(cb=8)%20doctypebranch:DECCOMMISSION)%20XRANK(cb=7)%20doctypebranch:COMMUNICATEDCASES)%20XRANK(cb=6)%20doctypebranch:CLIN)%20XRANK(cb=5)%20doctypebranch:ADVISORYOPINIONS)%20XRANK(cb=4)%20doctypebranch:REPORTS)%20XRANK(cb=3)%20doctypebranch:EXECUTION)%20XRANK(cb=2)%20doctypebranch:MERITS)%20XRANK(cb=1)%20doctypebranch:SCREENINGPANEL)%20XRANK(cb=4)%20importance:1)%20XRANK(cb=3)%20importance:2)%20XRANK(cb=2)%20importance:3)%20XRANK(cb=1)%20importance:4)%20XRANK(cb=2)%20languageisocode:ENG)%20XRANK(cb=1)%20languageisocode:FRE&sort=kpdate%20Descending&start=0&length=20&rankingModelId=4180000c-8692-45ca-ad63-74bc4163871b](https://hudoc.echr.coe.int/app/transform/rss?library=echreng&query=((((((((((((((((((((%20contentsitename:ECHR%20AND%20(NOT%20(doctype=PR%20OR%20doctype=HFCOMOLD%20OR%20doctype=HECOMOLD))%20AND%20((respondent=%22DEU%22))%20AND%20((documentcollectionid=%22GRANDCHAMBER%22)))%20XRANK(cb=14)%20doctypebranch:GRANDCHAMBER)%20XRANK(cb=13)%20doctypebranch:DECGRANDCHAMBER)%20XRANK(cb=12)%20doctypebranch:CHAMBER)%20XRANK(cb=11)%20doctypebranch:ADMISSIBILITY)%20XRANK(cb=10)%20doctypebranch:COMMITTEE)%20XRANK(cb=9)%20doctypebranch:ADMISSIBILITYCOM)%20XRANK(cb=8)%20doctypebranch:DECCOMMISSION)%20XRANK(cb=7)%20doctypebranch:COMMUNICATEDCASES)%20XRANK(cb=6)%20doctypebranch:CLIN)%20XRANK(cb=5)%20doctypebranch:ADVISORYOPINIONS)%20XRANK(cb=4)%20doctypebranch:REPORTS)%20XRANK(cb=3)%20doctypebranch:EXECUTION)%20XRANK(cb=2)%20doctypebranch:MERITS)%20XRANK(cb=1)%20doctypebranch:SCREENINGPANEL)%20XRANK(cb=4)%20importance:1)%20XRANK(cb=3)%20importance:2)%20XRANK(cb=2)%20importance:3)%20XRANK(cb=1)%20importance:4)%20XRANK(cb=2)%20languageisocode:ENG)%20XRANK(cb=1)%20languageisocode:FRE&sort=kpdate%20Descending&start=0&length=20&rankingModelId=4180000c-8692-45ca-ad63-74bc4163871b)" }
];

serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' }
  let debugOutput: string[] = []; 

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || "";
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    const groqApiKey = Deno.env.get('GROQ_API_KEY'); 

    if (!groqApiKey) {
      throw new Error("GROQ_API_KEY fehlt in den Supabase Secrets.");
    }

    let targetGericht: string | null = null;
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      targetGericht = urlObj.searchParams.get('gericht');
    } catch (urlError) {
      debugOutput.push(`[WARNUNG] URL konnte nicht geparst werden: ${req.url}`);
    }
    
    let feedsToProcess = RSS_FEEDS;
    if (targetGericht) {
      feedsToProcess = RSS_FEEDS.filter(f => f.name.includes(targetGericht!));
      debugOutput.push(`[CRON-SPLIT] Filtere Feeds nach: ${targetGericht}. Gefunden: ${feedsToProcess.length}`);
    } else {
      debugOutput.push(`[CRON-SPLIT] Kein spezielles Gericht übergeben. Verarbeite alle Feeds.`);
    }

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    let addedCount = 0;

    for (const feed of feedsToProcess) {
      try {
        debugOutput.push(`[START] Verarbeite Feed: ${feed.name}`);
        
        const response = await fetch(feed.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/rss+xml, application/xml, text/xml, */*"
          }
        });
        
        const xmlData = await response.text();
        debugOutput.push(`[DEBUG] Server-Antwort für ${feed.name} (erste 200 Zeichen): ${xmlData.substring(0, 200).replace(/\n/g, ' ')}`);

        const parsed = parser.parse(xmlData);
        let rawItems = [];
        
        if (parsed.rss && parsed.rss.channel) {
          if (parsed.rss.channel.item) {
            rawItems = Array.isArray(parsed.rss.channel.item) ? parsed.rss.channel.item : [parsed.rss.channel.item];
            debugOutput.push(`Format erkannt: Standard RSS 2.0 bei ${feed.name}`);
          } else {
            debugOutput.push(`WARNUNG: RSS-Struktur erkannt, aber kein <item> gefunden bei ${feed.name}. Feed leer?`);
            continue;
          }
        } else if (parsed.feed) {
          if (parsed.feed.entry) {
            rawItems = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
            debugOutput.push(`Format erkannt: Atom Feed bei ${feed.name}`);
          } else {
            debugOutput.push(`WARNUNG: Atom-Struktur erkannt, aber kein <entry> gefunden bei ${feed.name}. Feed leer?`);
            continue;
          }
        } else if (parsed['rdf:RDF'] && parsed['rdf:RDF'].item) {
          rawItems = Array.isArray(parsed['rdf:RDF'].item) ? parsed['rdf:RDF'].item : [parsed['rdf:RDF'].item];
          debugOutput.push(`Format erkannt: RDF/RSS 1.0 bei ${feed.name}`);
        } else {
          debugOutput.push(`WARNUNG: Unbekanntes XML-Format bei ${feed.name}`);
          continue; 
        }

        const newItems = rawItems.slice(0, 3);
        debugOutput.push(`Gefundene Artikel zur Verarbeitung bei ${feed.name}: ${newItems.length}`);

        for (const item of newItems) {
          const title = item.title || "Unbekannter Titel";
          
          let link = "";
          if (typeof item.link === 'string') {
            link = item.link;
          } else if (item.link && item.link['@_href']) {
            link = item.link['@_href'];
          }

          const description = item.description || item.summary || item.content || "Keine Beschreibung vorhanden.";
          const pubDate = item.pubDate || item.updated || item.published || new Date().toISOString();
          
          const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
          const dateiName = `RSS_${feed.name.replace(/[^a-zA-Z0-9]/g, '')}_${safeTitle}.md`;

          const { data: existingDocs } = await supabase
            .from('wissensdatenbank')
            .select('id')
            .eq('datei_name', dateiName);

          if (existingDocs && existingDocs.length > 0) {
            continue; 
          }

          debugOutput.push(`-> Verarbeite neu: ${dateiName}`);

          let deepText = description; 
          if (link && link.startsWith('http')) {
            try {
              debugOutput.push(`[DEEP-SCRAPER] Lade Zielseite: ${link}`);
              const pageRes = await fetch(link, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                  "Accept": "text/html,application/xhtml+xml,application/xml"
                }
              });
              
              if (pageRes.ok) {
                const html = await pageRes.text();
                const cleanText = html
                  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
                
                deepText = `Original-Beschreibung: ${description}\n\n[DEEP-SCRAPE] Webseiten-Inhalt (Rohtext):\n${cleanText.substring(0, 28000)}`;
                debugOutput.push(`[DEEP-SCRAPER] Erfolgreich. Extrahiert & gecuttet auf: ${Math.min(cleanText.length, 28000)} Zeichen.`);
              } else {
                debugOutput.push(`[DEEP-SCRAPER] Zielseite hat Zugriff blockiert. Status: ${pageRes.status}`);
              }
            } catch (deepErr: any) {
              debugOutput.push(`[DEEP-SCRAPER] Fehler beim Abruf von ${link}: ${deepErr.message}`);
            }
          }

          const prompt = `Analysiere diesen Text aus einer Behörden/Gerichts-Meldung (inklusive tiefen-gescraptem Website-Inhalt).\nTitel: ${title}\nInhalt: ${deepText}\nLink: ${link}\n\nErstelle eine professionelle Kurzanalyse für eine juristische Wissensdatenbank.\nFormatiere als Markdown. Extrahiere zwingend (falls vorhanden):\n- Aktenzeichen:\n- Datum:\n- Betroffene Rechtsnorm:\n- Kurzzusammenfassung (3 Sätze):`;

          const aiRes = await fetch("[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
              model: "openai/gpt-oss-120b",
              messages: [{ role: "user", content: prompt }]
            })
          });

          let kiAnalyse = "KI-Analyse fehlgeschlagen.";

          if (!aiRes.ok) {
            const errText = await aiRes.text();
            debugOutput.push(`[GROQ ERROR] Status ${aiRes.status} bei Datei ${dateiName}: ${errText}`);
            kiAnalyse = `KI-Analyse aufgrund eines API-Fehlers fehlgeschlagen. Status: ${aiRes.status}`;
          } else {
            const aiData = await aiRes.json();
            kiAnalyse = aiData.choices?.[0]?.message?.content || kiAnalyse;
          }

          debugOutput.push(`[RATE-LIMIT-SCHUTZ] Warte 6 Sekunden vor dem nächsten KI-Aufruf...`);
          await delay(6000);

          const inhaltText = `[AUTO-SCRAPER] ${feed.name}\nQuelle: ${link}\nVeröffentlicht: ${pubDate}\n\n${kiAnalyse}`;

          const { error: dbError } = await supabase.from('wissensdatenbank').insert([{
            datei_name: dateiName,
            firma: 'Allgemein (Gerichte/Behörden)',
            inhalt_text: inhaltText,
            dokument_url: link
          }]);

          if (!dbError) {
            try {
              await fetch(`${supabaseUrl}/functions/v1/github-sync`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                  action: 'put',
                  filename: dateiName,
                  content: inhaltText
                })
              });
            } catch (githubErr: any) {
              debugOutput.push(`Fehler beim Push zu GitHub: ${githubErr.message}`);
            }
            addedCount++;
          } else {
            debugOutput.push(`Fehler beim DB-Insert für ${dateiName}: ${JSON.stringify(dbError)}`);
          }
        }
      } catch (feedErr: any) {
        debugOutput.push(`Kritischer Fehler beim Verarbeiten von ${feed.name}: ${feedErr.message}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${addedCount} neue RSS-Einträge verarbeitet.`,
      debug_logs: debugOutput
    }, null, 2), { headers, status: 200 });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage, debug_logs: debugOutput }), { headers, status: 500 });
  }
})

```

**4. `sonar-send-email/index.ts**`

```typescript
import { serve } from "[https://deno.land/std@0.168.0/http/server.ts](https://deno.land/std@0.168.0/http/server.ts)"
import { jsPDF } from "[https://esm.sh/jspdf@2.5.1](https://esm.sh/jspdf@2.5.1)"
import { createClient } from "[https://esm.sh/@supabase/supabase-js@2.39.3](https://esm.sh/@supabase/supabase-js@2.39.3)"

serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const { 
      to, subject, text, html, 
      unsereFirma, mandantProfil, 
      gegnerName, gegnerAnsprechpartner, gegnerFax,
      signatureUrl,
      extraAttachments
    } = await req.json()

    const finalSignatureUrl = signatureUrl || "[https://loyzfkxkuyypgteskxkm.supabase.co/storage/v1/object/public/dokumente/jw-signum-lang-blau.png](https://loyzfkxkuyypgteskxkm.supabase.co/storage/v1/object/public/dokumente/jw-signum-lang-blau.png)";

    const apiKey = Deno.env.get('RESEND_API_KEY') || ""
    const datumHeute = new Date().toLocaleDateString('de-DE')
    let attachments: any[] = []

    const firmaClean = (unsereFirma || '').toLowerCase()
    const isWilsdorfSommer = firmaClean.includes('wilsdorf') && firmaClean.includes('sommer')
    const isSmartBizz = firmaClean.includes('smartbizz')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ""
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    let ccEmail = "jenswilsdorfdd@gmail.com"
    if (isWilsdorfSommer) {
      ccEmail = "wilsdorf.und.sommer@gmail.com"
    } else if (isSmartBizz) {
      ccEmail = "smartbizzgroup.office@gmail.com"
    }

    const isFax = typeof to === 'string' && to.endsWith('@simple-fax.de')
    const docTitle = isFax ? "TELEFAX / FAX-ÜBERMITTLUNG" : "SCHREIBEN / DOKUMENT"
    const fileName = isFax ? "Telefax.pdf" : "Schreiben.pdf"

    const doc = new jsPDF()
    const pageHeight = 297; 
    const bottomMargin = 25; 
    const lineHeight = 5; 

    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(docTitle, 15, 18)

    doc.setLineWidth(0.5)
    doc.line(15, 22, 195, 22)

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("ABSENDER:", 15, 30)
    doc.setFont("helvetica", "normal")
    doc.text(`Firma: ${unsereFirma || 'Jens Wilsdorf'}`, 15, 35)
    if (mandantProfil?.adresse) doc.text(`Adresse: ${mandantProfil.adresse}`, 15, 40)
    doc.text(`E-Mail: post@wilsdorf.org`, 15, 45)

    doc.setFont("helvetica", "bold")
    doc.text("EMPFÄNGER:", 115, 30)
    doc.setFont("helvetica", "normal")
    doc.text(`Firma / Name: ${gegnerName || '-'}`, 115, 35)
    if (gegnerAnsprechpartner) doc.text(`z. Hd.: ${gegnerAnsprechpartner}`, 115, 40)
    doc.text(isFax ? `Faxnummer: ${gegnerFax || '-'}` : `E-Mail: ${to || '-'}`, 115, 45)

    doc.setLineWidth(0.2)
    doc.line(15, 50, 195, 50)

    doc.setFont("helvetica", "bold")
    doc.text("DETAILS ZUR ÜBERMITTLUNG:", 15, 57)
    doc.setFont("helvetica", "normal")
    doc.text(`Datum: ${datumHeute}`, 15, 63)
    
    const betreffText = `Betreff: ${subject || 'Schreiben'}`
    const splitBetreff = doc.splitTextToSize(betreffText, 180)
    doc.text(splitBetreff, 15, 68)

    const betreffOffset = (splitBetreff.length - 1) * 5
    const afterBetreffY = 73 + betreffOffset

    doc.setLineWidth(0.5)
    doc.line(15, afterBetreffY, 195, afterBetreffY)

    doc.setFont("helvetica", "bold")
    doc.text("MITTEILUNG:", 15, afterBetreffY + 9)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)

    const splitText = doc.splitTextToSize(text || '', 180)
    let currentY = afterBetreffY + 17;
    
    let greetingStartIndex = -1;
    for (let i = splitText.length - 1; i >= 0; i--) {
      const lineLower = splitText[i].toLowerCase();
      if (lineLower.includes("mit freundlichen grüßen") || 
          lineLower.includes("freundliche grüße") || 
          lineLower.includes("mit besten grüßen") || 
          lineLower.match(/^grüße/)) {
        greetingStartIndex = i;
        break;
      }
    }

    if (greetingStartIndex === -1 && splitText.length > 4) {
      greetingStartIndex = splitText.length - 4;
    } else if (greetingStartIndex === -1) {
      greetingStartIndex = splitText.length; 
    }

    for (let i = 0; i < splitText.length; i++) {
      
      if (i === greetingStartIndex) {
        const remainingLines = splitText.length - i;
        const spaceNeededForEnd = (remainingLines * lineHeight) + 20;

        if (currentY + spaceNeededForEnd > (pageHeight - bottomMargin)) {
          doc.addPage();
          
          doc.setFont("helvetica", "bold")
          doc.setFontSize(10)
          
          const headerText = `${docTitle} (Fortsetzung) — Betreff: ${subject || 'Schreiben'}`;
          const splitHeader = doc.splitTextToSize(headerText, 180);
          doc.text(splitHeader, 15, 15);
          
          const afterHeaderY = 15 + (splitHeader.length * 4.5);
          doc.setFontSize(8)
          doc.setFont("helvetica", "normal")
          doc.text(`Empfänger: ${gegnerName || '-'} | Datum: ${datumHeute}`, 15, afterHeaderY)
          doc.setLineWidth(0.2)
          doc.line(15, afterHeaderY + 3, 195, afterHeaderY + 3)

          currentY = afterHeaderY + 12;
          doc.setFontSize(10);
        }
      } 
      else if (currentY + lineHeight > (pageHeight - bottomMargin)) {
        doc.addPage();
        
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        
        const headerText = `${docTitle} (Fortsetzung) — Betreff: ${subject || 'Schreiben'}`;
        const splitHeader = doc.splitTextToSize(headerText, 180);
        doc.text(splitHeader, 15, 15);
        
        const afterHeaderY = 15 + (splitHeader.length * 4.5);
          
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.text(`Empfänger: ${gegnerName || '-'} | Datum: ${datumHeute}`, 15, afterHeaderY)
        doc.setLineWidth(0.2)
        doc.line(15, afterHeaderY + 3, 195, afterHeaderY + 3)

        currentY = afterHeaderY + 12;
        doc.setFontSize(10);
      }

      doc.text(splitText[i], 15, currentY);
      currentY += lineHeight;
    }

    try {
      const imgRes = await fetch(finalSignatureUrl);
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Img = 'data:image/png;base64,' + btoa(binary);

        let unterschriftY = currentY + 5;

        if (unterschriftY + 15 > (pageHeight - bottomMargin)) {
          doc.addPage();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          
          const headerText = `${docTitle} (Unterschrift) — Betreff: ${subject || 'Schreiben'}`;
          const splitHeader = doc.splitTextToSize(headerText, 180);
          doc.text(splitHeader, 15, 15);
          
          const afterHeaderY = 15 + (splitHeader.length * 4.5);
          doc.setLineWidth(0.2);
          doc.line(15, afterHeaderY + 3, 195, afterHeaderY + 3);
          
          unterschriftY = afterHeaderY + 13;
        }

        doc.addImage(base64Img, 'PNG', 15, unterschriftY, 35, 12);
      }
    } catch (e) {
      console.error("Fehler beim Einfügen der Unterschrift ins PDF:", e);
    }

    const pdfBase64 = doc.output('datauristring').split(',')[1]

    attachments.push({
      filename: fileName,
      content: pdfBase64
    })

    if (!isFax && extraAttachments && Array.isArray(extraAttachments)) {
      attachments = [...attachments, ...extraAttachments]
    }

    let pdfPublicUrl = null;
    try {
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const fileBlob = new Blob([byteArray], { type: 'application/pdf' });

      const safeName = `ausgang_${Date.now()}_${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dokumente')
        .upload(safeName, fileBlob, { contentType: 'application/pdf' });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('dokumente').getPublicUrl(safeName);
        pdfPublicUrl = publicUrlData.publicUrl;
      } else {
        console.error("Storage Upload Error:", uploadError);
      }
    } catch (storageErr) {
      console.error("Storage Catch Error:", storageErr);
    }

    let signaturHtml = ""

    if (isWilsdorfSommer) {
      signaturHtml = `
        <br/><br/>--<br/>
        <div style="font-family: Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.5; border-top: 1px solid #ccc; padding-top: 10px;">
          <strong>Wilsdorf & Sommer GmbH</strong><br/>
          Sitz: Dresden | Finanzamt Dresden-Süd<br/>
          USt-IdNr.: DE354922817 | Handelsregister: AG Dresden HRB 43220<br/>
          Vertretung: Geschäftsführer Jens Wilsdorf<br/>
          E-Mail: wilsdorf.und.sommer@gmail.com | post@wilsdorf.org<br/><br/>
          <span style="font-size: 10px; color: #777;">
            <strong>Wichtiger Hinweis:</strong> Diese E-Mail kann Betriebs- oder Geschäftsgeheimnisse oder sonstige vertrauliche Informationen enthalten. Sollten Sie diese E-Mail irrtümlich erhalten haben, ist Ihnen eine Kenntnisnahme des Inhalts, eine Vervielfältigung oder Weitergabe ausdrücklich untersagt.<br/>
            <strong>Confidentiality note:</strong> This message contains confidential information intended for a specific individual or entity. If you are not the intended recipient, any distribution or copying is strictly prohibited.
          </span>
        </div>
      `
    } else if (isSmartBizz) {
      signaturHtml = `
        <br/><br/>--<br/>
        <div style="font-family: Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.5; border-top: 1px solid #ccc; padding-top: 10px;">
          <strong>SmartBizz Services UG (haftungsbeschränkt)</strong><br/>
          Sitz: Dresden | Finanzamt Dresden-Süd<br/>
          USt-IdNr.: DE308223282 | Handelsregister: AG Dresden HRB 35697<br/>
          Vertretung: Geschäftsführer Jens Wilsdorf<br/>
          E-Mail: smartbizzgroup.office@gmail.com | post@wilsdorf.org<br/><br/>
          <span style="font-size: 10px; color: #777;">
            <strong>Wichtiger Hinweis:</strong> Diese E-Mail kann Betriebs- oder Geschäftsgeheimnisse oder sonstige vertrauliche Informationen enthalten. Sollten Sie diese E-Mail irrtümlich erhalten haben, ist Ihnen eine Kenntnisnahme des Inhalts, eine Vervielfältigung oder Weitergabe ausdrücklich untersagt.<br/>
            <strong>Confidentiality note:</strong> This message contains confidential information intended for a specific individual or entity. If you are not the intended recipient, any distribution or copying is strictly prohibited.
          </span>
        </div>
      `
    } else {
      signaturHtml = `
        <br/><br/>--<br/>
        <div style="font-family: Arial, sans-serif; font-size: 12px; color: #333; border-top: 1px solid #ccc; padding-top: 10px;">
          <strong>${unsereFirma || 'Jens Wilsdorf'}</strong><br/>
          E-Mail: post@wilsdorf.org<br/>
          <em>Gesendet über SONAR COCKPIT</em>
        </div>
      `
    }

    const formattedHtml = (html 
      ? html + signaturHtml 
      : `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #222;">
          ${(text || '').replace(/\n/g, '<br/>')}
         </div>` + signaturHtml)

    const res = await fetch('[https://api.resend.com/emails](https://api.resend.com/emails)', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'SONAR COCKPIT <post@wilsdorf.org>',
        reply_to: 'jenswilsdorfdd@gmail.com',
        to: Array.isArray(to) ? to : [to],
        cc: [ccEmail],
        subject: subject || 'Schreiben aus dem SONAR Cockpit',
        text: text,
        html: formattedHtml,
        attachments: attachments.length > 0 ? attachments : undefined
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.message || JSON.stringify(data) }), 
        { status: res.status, headers }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data, pdfUrl: pdfPublicUrl }), 
      { status: 200, headers }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers }
    )
  }
})

```

**5. `sonar-web-sync/index.ts**`

```typescript
import { createClient } from '[https://esm.sh/@supabase/supabase-js@2](https://esm.sh/@supabase/supabase-js@2)'

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const neuEingepflegt = []

  // 1. BFH URTEILE & ENTSCHEIDUNGEN (RSS-FEED)
  try {
    const bfhRes = await fetch('[https://www.bundesfinanzhof.de/de/entscheidungen/entscheidungen-online/rss.xml](https://www.bundesfinanzhof.de/de/entscheidungen/entscheidungen-online/rss.xml)')
    const bfhXml = await bfhRes.text()
    const items = bfhXml.match(/<item>[\s\S]*?<\/item>/g) || []

    for (const item of items.slice(0, 10)) {
      const titleRaw = item.match(/<title>(.*?)<\/title>/)?.[1] || 'BFH-Urteil'
      const linkRaw = item.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const descRaw = item.match(/<description>(.*?)<\/description>/)?.[1] || ''

      const title = titleRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()
      const description = descRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()
      const link = linkRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()

      const { data: existing } = await supabase
        .from('wissensdatenbank')
        .select('id')
        .eq('datei_name', title)

      if (!existing || existing.length === 0) {
        const { error } = await supabase.from('wissensdatenbank').insert([{
          datei_name: title,
          firma: 'Allgemein',
          kategorie: 'Urteile & Rechtsprechung',
          inhalt_text: description,
          dokument_url: link
        }])

        if (!error) neuEingepflegt.push(title)
      }
    }
  } catch (err) {
    console.error("BFH Fetch Fehler:", err)
  }

  // 2. BMF SCHREIBEN & AMTLICHE STEUER-NEWS (RSS-FEED)
  try {
    const bmfRes = await fetch('[https://www.bundesfinanzministerium.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSS_Newsfeed.xml](https://www.bundesfinanzministerium.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSS_Newsfeed.xml)')
    const bmfXml = await bmfRes.text()
    const bmfItems = bmfXml.match(/<item>[\s\S]*?<\/item>/g) || []

    for (const item of bmfItems.slice(0, 10)) {
      const titleRaw = item.match(/<title>(.*?)<\/title>/)?.[1] || 'BMF-Mitteilung'
      const linkRaw = item.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const descRaw = item.match(/<description>(.*?)<\/description>/)?.[1] || ''

      const title = titleRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()
      const description = descRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()
      const link = linkRaw.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()

      const { data: existing } = await supabase
        .from('wissensdatenbank')
        .select('id')
        .eq('datei_name', title)

      if (!existing || existing.length === 0) {
        const { error } = await supabase.from('wissensdatenbank').insert([{
          datei_name: title,
          firma: 'Allgemein',
          kategorie: 'Steuern & Finanzen',
          inhalt_text: description,
          dokument_url: link
        }])

        if (!error) neuEingepflegt.push(title)
      }
    }
  } catch (err) {
    console.error("BMF Fetch Fehler:", err)
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      anzahl_neu: neuEingepflegt.length, 
      eintraege: neuEingepflegt 
    }), 
    { headers: { 'Content-Type': 'application/json' } }
  )
})

```

### Schritt 4: Die Funktionen online schalten (Deployment)

Führe diesen Befehl aus, um alle Funktionen auf den Server zu laden:
`npx supabase functions deploy`

---

## BAUABSCHNITT 5: DIE DATEN-BRÜCKE (CHROME ERWEITERUNG)

**Ziel dieses Abschnitts:** Wir bauen die Chrome-Erweiterung, die einen "Magic-Import-Button" in die Oberfläche von Gemini einfügt.

### Schritt 1: Den Bau-Ordner anlegen

1. Erstelle einen neuen, leeren Ordner auf deinem Computer.
2. Nenne diesen Ordner exakt: **`sonar-chrome-extension`**

### Schritt 2: Die Steuerdatei (manifest.json) anlegen

1. Öffne ein einfaches Textprogramm (z.B. Editor).
2. Kopiere den folgenden Code **exakt und vollständig**:

```json
{
  "manifest_version": 3,
  "name": "Sonar Bridge - Cool Tool Edition",
  "version": "2.0",
  "description": "Baut fette Buttons in Gemini und schießt JSON direkt ins Cockpit",
  "permissions": ["activeTab", "scripting", "tabs"],
  "host_permissions": [
    "[https://gemini.google.com/](https://gemini.google.com/)*", 
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
      "matches": ["*://[gemini.google.com/](https://gemini.google.com/)*"],
      "js": ["content.js"],
      "css": ["style.css"]
    }
  ]
}

```

3. Speichere die Datei in deinem neuen Ordner exakt unter dem Namen **`manifest.json`**.

### Schritt 3: Die Logik-Dateien einfügen

Kopiere diese 4 Dateien aus deinen originalen SONAR-Projektdateien ebenfalls in den Ordner:

* `content.js`
* `background.js`
* `style.css`
* `icon128.png`

### Schritt 4: Die Brücke in Google Chrome aktivieren

1. Öffne Google Chrome und gehe auf "Erweiterungen verwalten" (`chrome://extensions/`).
2. Schalte oben rechts den **"Entwicklermodus"** (Developer mode) EIN.
3. Klicke auf **"Entpackte Erweiterung laden"** (Load unpacked).
4. Wähle deinen Ordner `sonar-chrome-extension` aus. Das Plugin ist nun aktiv.

---

## BAUABSCHNITT 6: DAS COCKPIT (FRONTEND & LIVE-SCHALTUNG)

**Ziel dieses Abschnitts:** Wir laden den Code des Frontends in deine Editor-Umgebung, verknüpfen ihn mit deiner persönlichen Datenbank und schalten ihn live.

### Schritt 1: Das Frontend-Projekt laden (StackBlitz)

1. Stelle sicher, dass du bei GitHub und StackBlitz eingeloggt bist.
2. Klicke auf diesen Link, um den fertigen Cockpit-Code in deinen Editor zu laden:
**[HIER KOMMT DEIN GITHUB-LINK REIN, z. B. stackblitz.com/github/jenswilsdorf/sonar-frontend]**
3. StackBlitz installiert nun automatisch alle benötigten Hintergrund-Pakete.

### Schritt 2: Die Verbindung zur Datenbank herstellen (.env Datei)

1. Klicke in StackBlitz auf "Neue Datei" und nenne sie exakt: `.env`
2. Wechsle in dein Supabase Dashboard unter **Project Settings -> API**.
3. Kopiere die **Project URL** und den **anon / public Key**.
4. Füge folgenden Text in die `.env` Datei ein und ersetze die Platzhalter:

```text
VITE_SUPABASE_URL=Deine_kopierte_Project_URL_hier_einfügen
VITE_SUPABASE_ANON_KEY=Deinen_kopierten_anon_Key_hier_einfügen

```

### Schritt 3: Den Code in deinem eigenen GitHub sichern

1. Klicke in StackBlitz oben links auf **"Connect Repository"**.
2. Klicke auf **"Create repo"**. StackBlitz erstellt nun eine Kopie des Codes in deinem GitHub-Account.
3. Klicke auf **"Commit"**, um alles final zu speichern.

### Schritt 4: Die Website live schalten (Vercel)

1. Logge dich in deinen **Vercel** Account ein (vercel.com).
2. Klicke oben rechts auf **"Add New..."** und wähle **"Project"**.
3. Importiere das soeben erstellte Projekt.
4. **ABSOLUT KRITISCH:** Klappe das Menü **"Environment Variables"** auf und trage exakt die gleichen zwei Schlüssel ein:
* Name: `VITE_SUPABASE_URL` | Value: *[Deine Supabase URL]*
* Name: `VITE_SUPABASE_ANON_KEY` | Value: *[Dein Supabase anon Key]*


5. Klicke auf **"Deploy"**. Nach ca. 2 Minuten ist dein eigenes SONAR Cockpit live!

```

Ist der Code-Block erfolgreich bei dir angekommen, oder brauchst du noch Hilfe beim Einfügen auf GitHub?

```
