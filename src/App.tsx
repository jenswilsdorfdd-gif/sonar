import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
// @ts-ignore
import Dashboard from './Dashboard'
// Handbuch importieren (mit ts-ignore für Vercel Build)
// @ts-ignore
import Handbuch from './Handbuch'

export default function App() {
  // Prüfen, ob die URL den Parameter ?public=handbuch enthält
  const urlParams = new URLSearchParams(window.location.search);
  const isPublicHandbuch = urlParams.get('public') === 'handbuch';

  // Standard-Theme für die öffentliche Handbuch-Ansicht (Dark Mode orientiert)
  const publicTheme = {
    bg: '#0f172a',
    cardBg: '#1e293b',
    border: '#334155',
    textMain: '#ffffff',
    textMuted: '#94a3b8',
    accent: '#10b981',
    handbuchBg: 'rgba(16, 185, 129, 0.1)',
    handbuchAccent: '#10b981'
  };

  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // --- NEU: Login-Modus ('password' | 'magic') & Status-Meldungen für Magic Link ---
  const [loginMode, setLoginMode] = useState<'password' | 'magic'>('password')
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  
  // --- Responsive State für den Public Wrapper ---
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Resize-Listener für die mobile Header-Anpassung
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize(); // Initialer Check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Auth-Listener nur starten, wenn wir nicht im öffentlichen Handbuch sind
    if (!isPublicHandbuch) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })

      return () => subscription.unsubscribe()
    }
  }, [isPublicHandbuch])

  // Wenn die öffentliche URL aufgerufen wurde, zeige Header + Handbuch
  if (isPublicHandbuch) {
    return (
      <div style={{ backgroundColor: publicTheme.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header-Leiste für das öffentliche Handbuch */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: isMobile ? '12px 15px' : '15px 30px', // Weniger Padding auf Mobile
          backgroundColor: publicTheme.cardBg,
          borderBottom: `1px solid ${publicTheme.border}`,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          gap: isMobile ? '10px' : '0' // Verhindert Überlappung bei kleinen Screens
        }}>
          {/* Logo / Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 'bold', color: publicTheme.accent, letterSpacing: '1px' }}>
              ((o))
            </span>
            <h1 style={{ margin: 0, fontSize: isMobile ? '16px' : '20px', fontWeight: '500', color: publicTheme.textMain, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
              SONAR COCKPIT
            </h1>
          </div>
          {/* Titel der Seite */}
          <div style={{ 
            fontSize: isMobile ? '11px' : '14px', 
            color: publicTheme.textMuted, 
            fontWeight: '500',
            textAlign: 'right',
            lineHeight: '1.2'
          }}>
            Technisches Handbuch{isMobile ? <br /> : ' '}zur System-Einrichtung
          </div>
        </div>

        {/* Eigentlicher Handbuch-Inhalt */}
        <div style={{ padding: isMobile ? '10px' : '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Handbuch theme={publicTheme} />
        </div>
      </div>
    )
  }

  // Klassischer Passwort-Login
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

  // Passwortloser Magic-Link-Login (ideal für Test- & Demo-Accounts)
  const handleMagicLink = async (e: any) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setAuthError(null)
    setAuthNotice(null)

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthError(error.message)
    } else {
      setAuthNotice(
        `✅ Magic Link wurde an ${email.trim()} gesendet! Bitte klicke auf den Zugangslink in deiner E-Mail, um direkt ins Cockpit zu starten.`
      )
    }
    setLoading(false)
  }

  if (session) {
    return <Dashboard session={session} />
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
        maxWidth: '420px',
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

        {/* Umschalter: Passwort vs. Magic Link (Test-Zugang) */}
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
            🔑 Passwort
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
            ✨ Magic Link (Test)
          </button>
        </div>

        {/* Formular */}
        <form onSubmit={loginMode === 'password' ? handleLogin : handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase' }}>
              E-Mail-Adresse
            </label>
            <input
              type="email"
              placeholder="name@kanzlei.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: '12px 14px',
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#020617',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

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
                style={{
                  padding: '12px 14px',
                  width: '100%',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: '#020617',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
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
              lineHeight: '1.4'
            }}>
              ⚠️ {authError}
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
              lineHeight: '1.4'
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
              ? 'Verbinde...'
              : loginMode === 'password'
                ? '🔒 Im Cockpit anmelden'
                : '✨ Magic Link per E-Mail senden'}
          </button>
        </form>

        {loginMode === 'magic' && (
          <p style={{ marginTop: '16px', marginBottom: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
            Du erhältst einen Einmal-Login-Link per E-Mail und startest in deiner eigenen, datenschutzisolierten Sandbox.
          </p>
        )}
      </div>
    </div>
  )
}