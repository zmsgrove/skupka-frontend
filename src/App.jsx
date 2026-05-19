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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) { setUser(session); setActiveCity(session.cities[0]); }
  }, []);

  const handleLogin = (user) => { setUser(user); setActiveCity(user.cities[0]); };
  const handleLogout = () => { clearSession(); setUser(null); setActiveCity(null); };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
        @media (max-width: 768px) {
          .board-grid { grid-template-columns: repeat(2, minmax(280px, 1fr)) !important; }
          .modal-body { grid-template-columns: 1fr !important; }
          .modal-left { border-right: none !important; border-bottom: 1px solid #2e2e3e !important; max-height: 300px; }
          .stats-wrap { padding: 0 12px 12px !important; }
          .toolbar { margin: 0 12px 12px !important; flex-direction: column !important; }
          .board-wrap { padding: 0 12px 24px !important; }
        }
        @media (max-width: 480px) {
          .board-grid { grid-template-columns: minmax(260px, 1fr) !important; }
        }
      `}</style>

      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoText}>SKUPKA</span>
          <span style={styles.logoBadge}>CRM</span>
        </div>

        {/* Десктоп табы */}
        <nav style={styles.tabs} className="desktop-tabs">
          {user.cities.map(city => {
            const tab = CITY_TABS[city];
            const isActive = activeCity === city;
            return (
              <button key={city} style={{
                ...styles.tab,
                color: isActive ? tab.color : '#9090a8',
                borderBottomColor: isActive ? tab.color : 'transparent',
                background: isActive ? tab.color + '15' : 'transparent',
              }} onClick={() => setActiveCity(city)}>
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div style={styles.userInfo}>
          <div style={styles.userDetails}>
            <span style={styles.userName}>{user.name}</span>
            <span style={styles.userPosition}>{user.position}</span>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>Выйти</button>

          {/* Мобильное меню */}
          <button style={styles.menuBtn} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        </div>
      </header>

      {/* Мобильные табы */}
      {menuOpen && (
        <div style={styles.mobileMenu}>
          {user.cities.map(city => {
            const tab = CITY_TABS[city];
            const isActive = activeCity === city;
            return (
              <button key={city} style={{
                ...styles.mobileTab,
                color: isActive ? tab.color : '#9090a8',
                background: isActive ? tab.color + '15' : 'transparent',
                borderColor: isActive ? tab.color : 'transparent',
              }} onClick={() => { setActiveCity(city); setMenuOpen(false); }}>
                {tab.label}
              </button>
            );
          })}
          <button style={styles.mobileLogout} onClick={handleLogout}>Выйти</button>
        </div>
      )}

      {/* Мобильные табы под хедером */}
      <div style={styles.mobileTabs}>
        {user.cities.map(city => {
          const tab = CITY_TABS[city];
          const isActive = activeCity === city;
          return (
            <button key={city} style={{
              ...styles.mobileTabInline,
              color: isActive ? tab.color : '#9090a8',
              borderBottomColor: isActive ? tab.color : 'transparent',
            }} onClick={() => setActiveCity(city)}>
              {tab.label}
            </button>
          );
        })}
      </div>

      <main style={styles.main}>
        {activeCity && <KanbanBoard key={activeCity} city={activeCity} user={user} />}
      </main>
    </div>
  );
}

const styles = {
  app: { minHeight: '100vh', background: '#0f0f13', display: 'flex', flexDirection: 'column' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', height: 56,
    background: '#1a1a22', borderBottom: '1px solid #2e2e3e',
    position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoText: { fontFamily: 'Unbounded, sans-serif', fontSize: 17, fontWeight: 700, color: '#f0b429', letterSpacing: 2 },
  logoBadge: { background: '#f0b429', color: '#0f0f13', fontFamily: 'Unbounded, sans-serif', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, letterSpacing: 1 },
  tabs: { display: 'flex', gap: 4, height: '100%' },
  tab: {
    background: 'transparent', border: 'none', borderBottom: '2px solid transparent',
    padding: '0 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Unbounded, sans-serif', letterSpacing: 0.5, transition: 'all 0.15s',
    borderRadius: '8px 8px 0 0',
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  userDetails: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  userName: { color: '#f0f0f5', fontSize: 12, fontWeight: 600 },
  userPosition: { color: '#9090a8', fontSize: 10 },
  logoutBtn: {
    background: 'transparent', border: '1px solid #2e2e3e',
    borderRadius: 8, color: '#9090a8', fontSize: 12,
    padding: '5px 12px', cursor: 'pointer',
  },
  menuBtn: {
    display: 'none', background: 'transparent', border: '1px solid #2e2e3e',
    borderRadius: 8, color: '#9090a8', fontSize: 18, padding: '4px 10px', cursor: 'pointer',
  },
  mobileMenu: {
    display: 'none', position: 'fixed', top: 56, right: 0, left: 0,
    background: '#1a1a22', borderBottom: '1px solid #2e2e3e',
    padding: 12, flexDirection: 'column', gap: 8, zIndex: 99,
  },
  mobileTab: {
    border: '1px solid', borderRadius: 10, padding: '10px 16px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Unbounded, sans-serif', textAlign: 'left',
  },
  mobileLogout: {
    background: 'transparent', border: '1px solid #2e2e3e',
    borderRadius: 10, color: '#9090a8', fontSize: 13,
    padding: '10px 16px', cursor: 'pointer', textAlign: 'left',
    fontFamily: 'Inter, sans-serif',
  },
  mobileTabs: {
    display: 'none', padding: '0 16px',
    background: '#1a1a22', borderBottom: '1px solid #2e2e3e',
    gap: 0, overflowX: 'auto',
  },
  mobileTabInline: {
    background: 'transparent', border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 16px', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Unbounded, sans-serif',
    whiteSpace: 'nowrap', transition: 'all 0.15s',
  },
  main: { flex: 1, paddingTop: 16, overflowX: 'auto' },
};
