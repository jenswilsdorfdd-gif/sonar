import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
// @ts-ignore
import Dashboard from './Dashboard'
// Handbuch importieren
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
    textMain: '#f8fafc',
    textMuted: '#94a3b8',
    accent: '#00e5ff',
    handbuchBg: 'rgba(16, 185, 129, 0.1)',
    handbuchAccent: '#10b981'
  };

  // useState<any> behebt den Session-Fehler
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Auth-Listener nur starten, wenn wir nicht im öffentlichen Handbuch sind
    if (!isPublicHandbuch) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
      })

      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
      })
    }
  }, [isPublicHandbuch])

  // Wenn die öffentliche URL aufgerufen wurde, zeige NUR das Handbuch
  if (isPublicHandbuch) {
    return (
      <div style={{ backgroundColor: publicTheme.bg, minHeight: '100vh', padding: '20px' }}>
        <Handbuch theme={publicTheme} />
      </div>
    )
  }

  // (e: any) behebt den Parameter-Fehler
  const handleLogin = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) alert(error.message)
    setLoading(false)
  }

  if (session) {
    return <Dashboard session={session} />
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f7f6' }}>
      <form onSubmit={handleLogin} style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '20px' }}>🔒 Sonar Login</h2>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="email"
            placeholder="Deine E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '10px', width: '220px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <input
            type="password"
            placeholder="Dein Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '10px', width: '220px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>
        <button disabled={loading} type="submit" style={{ padding: '10px', width: '100%', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? 'Lädt...' : 'Einloggen'}
        </button>
      </form>
    </div>
  )
}