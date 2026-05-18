import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import KanbanBoard from './components/KanbanBoard';
import { getSession, clearSession } from './auth';

const CITY_TABS = {
  'Атырау': { label: 'Атырау', color: '#f59e0b' },
  'Актобе': { label: 'Актобе', color: '#06b6d4' },
  'Уральск': { label: 'Уральск', color: '#a78bfa' },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeCity, setActiveCity] = useState(null);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
      setActiveCity(session.cities[0]);
    }
  }, []);

  const handleLogin = (user) => {
    setUser(user);
    setActiveCity(user.cities[0]);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setActiveCity(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={styles.app}>
      {/* Top navbar */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoText}>SKUPKA</span>
          <span style={styles.logoBadge}>CRM</span>
        </div>

        {/* City tabs */}
        <nav style={styles.tabs}>
          {user.cities.map(city => {
            const tab = CITY_TABS[city];
            const isActive = activeCity === city;
            return (
              <button
                key={city}
                style={{
                  ...styles.tab,
                  color: isActive ? tab.color : '#9090a8',
                  borderBottomColor: isActive ? tab.color : 'transparent',
                  background: isActive ? tab.color + '15' : 'transparent',
                }}
                onClick={() => setActiveCity(city)}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div style={styles.userInfo}>
          <span style={styles.userName}>
            {user.role === 'admin' ? '👑' : '🏙️'} {user.name}
          </span>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </header>

      {/* Board */}
      <main style={styles.main}>
        {activeCity && (
          <KanbanBoard
            key={activeCity}
            city={activeCity}
            user={user}
          />
        )}
      </main>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    background: '#0f0f13',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 60,
    background: '#1a1a22',
    borderBottom: '1px solid #2e2e3e',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    flexShrink: 0,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoText: {
    fontFamily: 'Unbounded, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    color: '#f0b429',
    letterSpacing: 2,
  },
  logoBadge: {
    background: '#f0b429',
    color: '#0f0f13',
    fontFamily: 'Unbounded, sans-serif',
    fontSize: 9,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 5,
    letterSpacing: 1,
  },
  tabs: {
    display: 'flex',
    gap: 4,
    height: '100%',
  },
  tab: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '0 20px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Unbounded, sans-serif',
    letterSpacing: 0.5,
    transition: 'all 0.15s',
    borderRadius: '8px 8px 0 0',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  userName: {
    color: '#9090a8',
    fontSize: 13,
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid #2e2e3e',
    borderRadius: 8,
    color: '#9090a8',
    fontSize: 12,
    padding: '6px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  main: {
    flex: 1,
    paddingTop: 20,
    overflowX: 'auto',
  },
};
