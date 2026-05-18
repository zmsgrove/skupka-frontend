import React, { useState } from 'react';
import { login, saveSession } from '../auth';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 400));
    const user = login(username, password);
    if (user) {
      saveSession(user);
      onLogin(user);
    } else {
      setError('Неверный логин или пароль');
    }
    setLoading(false);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoText}>SKUPKA</span>
          <span style={styles.logoBadge}>CRM</span>
        </div>
        <p style={styles.subtitle}>Система управления заявками</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Логин</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Введите логин"
              autoFocus
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Пароль</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 0%, #2a1f00 0%, #0f0f13 60%)',
  },
  card: {
    background: '#1a1a22',
    border: '1px solid #2e2e3e',
    borderRadius: 20,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoText: {
    fontFamily: 'Unbounded, sans-serif',
    fontSize: 28,
    fontWeight: 700,
    color: '#f0b429',
    letterSpacing: 2,
  },
  logoBadge: {
    background: '#f0b429',
    color: '#0f0f13',
    fontFamily: 'Unbounded, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    letterSpacing: 1,
  },
  subtitle: {
    color: '#9090a8',
    fontSize: 13,
    marginBottom: 36,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: '#9090a8', fontSize: 12, fontWeight: 500, letterSpacing: 0.5 },
  input: {
    background: '#22222e',
    border: '1px solid #2e2e3e',
    borderRadius: 10,
    color: '#f0f0f5',
    fontSize: 15,
    padding: '12px 16px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 13,
    padding: '10px 14px',
    textAlign: 'center',
  },
  btn: {
    background: '#f0b429',
    border: 'none',
    borderRadius: 10,
    color: '#0f0f13',
    fontFamily: 'Unbounded, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    padding: '14px',
    marginTop: 8,
    letterSpacing: 1,
    transition: 'opacity 0.2s, transform 0.1s',
  },
};
