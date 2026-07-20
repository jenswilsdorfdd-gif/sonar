import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Dashboard from './Dashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert('Fehler beim Login: ' + error.message);
  };

  if (!session) {
    return (
      <div
        style={{
          padding: '40px',
          fontFamily: 'sans-serif',
          maxWidth: '400px',
          margin: '0 auto',
        }}
      >
        <h2>🔒 Sonar Login</h2>
        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
        >
          <input
            type="email"
            placeholder="Deine E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <input
            type="password"
            placeholder="Dein Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <button
            type="submit"
            style={{
              padding: '12px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            Einloggen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '40px',
        fontFamily: 'sans-serif',
        background: '#f4f7f6',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0 }}>🚀 Sonar-Cockpit</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            padding: '8px 12px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Ausloggen
        </button>
      </div>

      <Dashboard session={session} />
    </div>
  );
}
