import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
// @ts-ignore
import Dashboard from './Dashboard'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [requesterName, setRequesterName] = useState('')
  const [requesterFirma, setRequesterFirma] = useState('')
  const [loading, setLoading] = useState(false)

  // Login-Modus ('password' | 'magic') & Status-Meldungen
  const [loginMode, setLoginMode] = useState<'password' | 'magic'>('password')
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Responsive State für die Login-Box
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize() // Initialer Check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Klassischer Passwort-Login (Owner / Vollzugang)
  const handleLogin = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    setAuthError(null)
    setAuthNotice(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      setAuthError(error.message)
    }
    setLoading(false)
  }

  // Türsteher-geschützter Magic-Link-Login für Test- & Demo-Interessenten
  const handleMagicLink = async (e: any) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return

    setLoading(true)
    setAuthError(null)
    setAuthNotice(null)

    try {
      // 1. Prüfen, ob E-Mail bereits freigeschaltet ist oder neue Anfrage für das Owner-Cockpit anlegen
      const { data: gateRes, error: gateErr } = await supabase.rpc('check_or_request_demo_access', {
        p_email: cleanEmail,
        p_name: requesterName.trim() || null,
        p_firma: requesterFirma.trim() || null
      })

      if (gateErr) {
        throw new Error(gateErr.message || 'Freigabe-Prüfung konnte nicht durchgeführt werden.')
      }

      const accessStatus = gateRes?.status || 'requested'

      if (accessStatus === 'invalid_email') {
        setAuthError('Bitte gib eine gültige geschäftliche E-Mail-Adresse ein.')
        setLoading(false)
        return
      }

      if (accessStatus === 'rejected') {
        setAuthError('Für diese E-Mail-Adresse konnte leider kein Testzugang freigeschaltet werden.')
        setLoading(false)
        return
      }

      if (accessStatus === 'requested') {
        setAuthNotice(
          `Anfrage erfolgreich übermittelt: Wir haben deine Anfrage für ${cleanEmail} erhalten. Sobald dein kostenfreier Testzugang freigegeben ist, erhältst du eine E-Mail und kannst dich hier direkt anmelden.`
        )
        setLoading(false)
        return
      }

      if (accessStatus === 'already_pending') {
        setAuthNotice(
          `Deine Anfrage für ${cleanEmail} liegt uns bereits zur Prüfung vor. Sobald die Freigabe erfolgt ist, benachrichtigen wir dich umgehend per E-Mail.`
        )
        setLoading(false)
        return
      }

      // 2. Nur wenn status === 'approved' -> echten Magic Link versenden!
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (otpErr) {
        setAuthError(otpErr.message)
      } else {
        setAuthNotice(
          `Dein Zugang ist freigeschaltet – der Magic Link wurde soeben an ${cleanEmail} gesendet! Bitte klicke auf den Zugangslink in deiner E-Mail, um direkt ins Cockpit zu starten.`
        )
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verbindungsfehler bei der Zugangs-Prüfung.')
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    return <Dashboard session={session} />
  }

  const inputBaseStyle = {
    padding: '12px 14px',
    width: '100%',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#020617',
    color: '#ffffff',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#020617',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        padding: isMobile ? '24px 20px' : '36px 32px',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        width: '100%',
        maxWidth: '440px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        {/* Branding Header */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#00e5ff', letterSpacing: '1px' }}>
            ((o))
          </span>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '0.5px' }}>
            SONAR COCKPIT
          </h1>
        </div>
        <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8' }}>
          KI-gestütztes Kanzlei- & Behörden-Abwehrsystem
        </p>

        {/* Umschalter: Passwort vs. Testzugang (Magic Link) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          background: '#020617',
          padding: '5px',
          borderRadius: '10px',
          border: '1px solid #1e293b',
          marginBottom: '22px'
        }}>
          <button
            type="button"
            onClick={() => { setLoginMode('password'); setAuthError(null); setAuthNotice(null); }}
            style={{
              padding: '9px 10px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              backgroundColor: loginMode === 'password' ? '#00e5ff' : 'transparent',
              color: loginMode === 'password' ? '#020617' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            Mandanten-Login
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('magic'); setAuthError(null); setAuthNotice(null); }}
            style={{
              padding: '9px 10px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 'bold',
              backgroundColor: loginMode === 'magic' ? '#00e5ff' : 'transparent',
              color: loginMode === 'magic' ? '#020617' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            Testzugang (Demo)
          </button>
        </div>

        {/* Formular */}
        <form onSubmit={loginMode === 'password' ? handleLogin : handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
              Geschäftliche E-Mail-Adresse*
            </label>
            <input
              type="email"
              placeholder="name@unternehmen.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputBaseStyle}
            />
          </div>

          {loginMode === 'magic' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Ihr Name (bei Erst-Anfrage)
                </label>
                <input
                  type="text"
                  placeholder="z.B. Max Mustermann"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  style={inputBaseStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Firma / Kanzlei (optional)
                </label>
                <input
                  type="text"
                  placeholder="z.B. Muster GmbH"
                  value={requesterFirma}
                  onChange={(e) => setRequesterFirma(e.target.value)}
                  style={inputBaseStyle}
                />
              </div>
            </div>
          )}

          {loginMode === 'password' && (
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
                Passwort
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputBaseStyle}
              />
            </div>
          )}

          {authError && (
            <div style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid #f43f5e',
              color: '#fda4af',
              fontSize: '13px',
              textAlign: 'left',
              lineHeight: '1.45'
            }}>
              {authError}
            </div>
          )}

          {authNotice && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid #10b981',
              color: '#6ee7b7',
              fontSize: '13px',
              textAlign: 'left',
              lineHeight: '1.45'
            }}>
              {authNotice}
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            style={{
              marginTop: '6px',
              padding: '13px',
              width: '100%',
              backgroundColor: '#00e5ff',
              color: '#020617',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(0, 229, 255, 0.25)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading
              ? 'Prüfe Zugang...'
              : loginMode === 'password'
                ? 'Im Cockpit anmelden'
                : 'Testzugang anfordern / Magic Link senden'}
          </button>
        </form>

        {loginMode === 'magic' && (
          <p style={{ marginTop: '16px', marginBottom: 0, fontSize: '11.5px', color: '#64748b', lineHeight: '1.45' }}>
            Neue Interessenten werden nach kurzer Freigabe per E-Mail informiert. Bereits freigeschaltete Adressen erhalten sofort ihren Einmal-Login-Link.
          </p>
        )}
      </div>
    </div>
  )
}