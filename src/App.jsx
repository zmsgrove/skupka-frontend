import React, { useState, useEffect, useRef } from 'react';
import LoginPage from './components/LoginPage';
import KanbanBoard from './components/KanbanBoard';
import Dashboard from './components/Dashboard';
import ExcelExport from './components/ExcelExport';
import ChangelogWidget from './components/ChangelogWidget';
import { getSession, clearSession } from './auth';
import { themes, getTheme, saveTheme } from './theme';
import { supabase } from './supabase';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const CITY_TABS = {
  'Атырау': { label: 'Атырау', color: '#f59e0b' },
  'Актобе': { label: 'Актобе', color: '#06b6d4' },
  'Уральск': { label: 'Уральск', color: '#a78bfa' },
};

const DASHBOARD_USERS = ['maksatovs', 'koshab', 'aleksandrovd', 'aminovn', 'zmsgrove', 'kylyshbaenam', 'revizor'];

function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

// ─── Sidebar item ──────────────────────────────────────────────
function SideItem({ icon, label, active, onClick, badge, collapsed, t }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        width: '100%',
        padding: collapsed ? '10px 0' : '9px 14px',
        background: active ? 'rgba(240,180,41,0.13)' : 'transparent',
        border: 'none',
        borderRadius: 10,
        cursor: 'pointer',
        color: active ? '#f0b429' : t.text2,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        fontFamily: 'Inter, sans-serif',
        transition: 'all 0.15s',
        position: 'relative',
        borderLeft: active ? '2px solid #f0b429' : '2px solid transparent',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <span style={{ fontSize: 17, flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>}
      {badge > 0 && (
        <span style={{
          position: collapsed ? 'absolute' : 'static',
          top: collapsed ? 4 : undefined,
          right: collapsed ? 4 : undefined,
          background: '#ef4444',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 99,
          padding: '1px 5px',
          minWidth: 16,
          textAlign: 'center',
          lineHeight: '16px',
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

// ─── Server Status Dot ─────────────────────────────────────────
function ServerStatus({ t }) {
  const [status, setStatus] = useState('checking'); // 'ok' | 'error' | 'checking'

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${API}/ping`, { signal: AbortSignal.timeout(5000) });
        if (!cancelled) setStatus(res.ok ? 'ok' : 'error');
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const colors = { ok: '#10b981', error: '#ef4444', checking: '#f59e0b' };
  const labels = { ok: 'Сервер онлайн', error: 'Сервер недоступен', checking: 'Проверка...' };
  const color = colors[status];

  return (
    <div title={labels[status]} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'default' }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
        boxShadow: status === 'ok' ? `0 0 6px ${color}` : 'none',
        animation: status === 'checking' ? 'pulse 1s infinite' : 'none',
      }} />
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────────
function Sidebar({ activeTab, setActiveTab, canSeeDashboard, canSeeDeleted, totalUnread, collapsed, setCollapsed, mobileOpen, setMobileOpen, t }) {
  const w = collapsed ? 60 : 200;

  const nav = (
    <div style={{
      width: w,
      background: t.headerBg,
      borderRight: `1px solid ${t.border}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Logo area */}
      <div style={{
        height: 54,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? 0 : '0 14px',
        borderBottom: `1px solid ${t.border}`,
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Unbounded,sans-serif', fontSize: 14, fontWeight: 700, color: '#f0b429', letterSpacing: 2 }}>SKUPKA</span>
            <span style={{ background: '#f0b429', color: '#0f0f13', fontFamily: 'Unbounded,sans-serif', fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>CRM</span>
          </div>
        )}
        {collapsed && <span style={{ fontFamily: 'Unbounded,sans-serif', fontSize: 11, fontWeight: 700, color: '#f0b429' }}>S</span>}
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <SideItem icon="💬" label="WAZZUP" active={activeTab === 'board'} onClick={() => { setActiveTab('board'); setMobileOpen(false); }} badge={totalUnread} collapsed={collapsed} t={t} />
        <SideItem icon="📊" label="Дашборд" active={activeTab === 'dashboard'} onClick={() => { if (canSeeDashboard) { setActiveTab('dashboard'); setMobileOpen(false); } }} collapsed={collapsed} t={t} />
        <SideItem icon="🗨️" label="Чат" active={false} onClick={() => {}} collapsed={collapsed} t={t} />
        <SideItem icon="✅" label="Задачи" active={false} onClick={() => {}} collapsed={collapsed} t={t} />
        <div style={{ flex: 1 }} />
        <div style={{ height: 1, background: t.border, margin: '6px 0' }} />
        <SideItem icon="🗄️" label="Архив" active={activeTab === 'archive'} onClick={() => { setActiveTab('archive'); setMobileOpen(false); }} collapsed={collapsed} t={t} />
        {canSeeDeleted && (
          <SideItem icon="🗑️" label="Удалённые" active={activeTab === 'deleted'} onClick={() => { setActiveTab('deleted'); setMobileOpen(false); }} collapsed={collapsed} t={t} />
        )}
      </div>

      {/* Collapse toggle */}
      <div style={{ padding: '8px 6px', borderTop: `1px solid ${t.border}` }}>
        <button
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Развернуть' : 'Свернуть'}
          style={{
            width: '100%',
            background: 'transparent',
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            color: t.text2,
            fontSize: 14,
            padding: '7px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>◀</span>
          {!collapsed && <span style={{ fontSize: 12, fontFamily: 'Inter,sans-serif' }}>Свернуть</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="sidebar-desktop" style={{ height: '100%', display: 'flex' }}>
        {nav}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 199 }}
        />
      )}
      <div
        className="sidebar-mobile"
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 220,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          zIndex: 200,
          background: t.headerBg,
          borderRight: `1px solid ${t.border}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Unbounded,sans-serif', fontSize: 14, fontWeight: 700, color: '#f0b429', letterSpacing: 2 }}>SKUPKA</span>
            <span style={{ background: '#f0b429', color: '#0f0f13', fontFamily: 'Unbounded,sans-serif', fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>CRM</span>
          </div>
          <button onClick={() => setMobileOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, color: t.text2, cursor: 'pointer', padding: 4 }}>✕</button>
        </div>
        <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <SideItem icon="💬" label="WAZZUP" active={activeTab === 'board'} onClick={() => { setActiveTab('board'); setMobileOpen(false); }} badge={totalUnread} collapsed={false} t={t} />
          <SideItem icon="📊" label="Дашборд" active={activeTab === 'dashboard'} onClick={() => { if (canSeeDashboard) { setActiveTab('dashboard'); setMobileOpen(false); } }} collapsed={false} t={t} />
          <SideItem icon="🗨️" label="Чат" active={false} onClick={() => {}} collapsed={false} t={t} />
          <SideItem icon="✅" label="Задачи" active={false} onClick={() => {}} collapsed={false} t={t} />
          <div style={{ flex: 1 }} />
          <div style={{ height: 1, background: t.border, margin: '6px 0' }} />
          <SideItem icon="🗄️" label="Архив" active={activeTab === 'archive'} onClick={() => { setActiveTab('archive'); setMobileOpen(false); }} collapsed={false} t={t} />
          {canSeeDeleted && (
            <SideItem icon="🗑️" label="Удалённые" active={activeTab === 'deleted'} onClick={() => { setActiveTab('deleted'); setMobileOpen(false); }} collapsed={false} t={t} />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main App ──────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [activeCity, setActiveCity] = useState(null);
  const [activeTab, setActiveTab] = useState('board');
  const [themeName, setThemeName] = useState(getTheme());
  const [soundOn, setSoundOn] = useState(localStorage.getItem('skupka_sound') !== 'off');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('skupka_sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const theme = themes[themeName];
  const t = theme;

  // Persist sidebar collapse state
  useEffect(() => {
    localStorage.setItem('skupka_sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
  }, [sidebarCollapsed]);

  useEffect(() => {
    const session = getSession();
    if (session) { setUser(session); setActiveCity(session.cities[0]); }
  }, []);

  // Unread count watcher (global — needed for sidebar badge)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    // Initial load
    async function fetchUnread() {
      const { data } = await supabase
        .from('leads')
        .select('unread_count')
        .eq('is_deleted', false)
        .eq('is_archived', false);
      if (!cancelled && data) {
        setTotalUnread(data.reduce((s, l) => s + (l.unread_count || 0), 0));
      }
    }
    fetchUnread();

    // Realtime updates
    const channel = supabase.channel('unread-watcher')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        if (soundOn && payload.new.unread_count > (payload.old.unread_count || 0)) {
          playPing();
        }
        // Re-fetch aggregate
        fetchUnread();
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user, soundOn]);

  const toggleTheme = () => {
    const next = themeName === 'dark' ? 'light' : 'dark';
    setThemeName(next); saveTheme(next);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem('skupka_sound', next ? 'on' : 'off');
  };

  const handleLogin = (u) => { setUser(u); setActiveCity(u.cities[0]); };
  const handleLogout = () => { clearSession(); setUser(null); setActiveCity(null); };

  const canSeeDashboard = user && DASHBOARD_USERS.includes(user.username);
  const canSeeDeleted = user && ['maksatovs', 'koshab', 'zmsgrove', 'kylyshbaenam'].includes(user.username);

  if (!user) return <LoginPage onLogin={handleLogin} theme={t} />;

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:${t.surface}; }
        ::-webkit-scrollbar-thumb { background:${t.border}; border-radius:3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter:${themeName === 'light' ? 'none' : 'invert(0.6)'}; cursor:pointer; }

        /* Desktop: sidebar visible, hamburger hidden */
        .sidebar-desktop { display:flex !important; }
        .sidebar-mobile { display:none; }
        .hamburger-btn { display:none !important; }

        /* Mobile breakpoint */
        @media (max-width:700px) {
          .sidebar-desktop { display:none !important; }
          .sidebar-mobile { display:flex !important; flex-direction:column; }
          .hamburger-btn { display:flex !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 54,
        background: t.headerBg, borderBottom: `1px solid ${t.border}`,
        position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
        boxShadow: t.shadow,
      }}>
        {/* Left: hamburger (mobile) + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Hamburger — only on mobile */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileOpen(v => !v)}
            style={{
              background: 'transparent', border: `1px solid ${t.border}`,
              borderRadius: 8, color: t.text, fontSize: 18,
              width: 36, height: 36, cursor: 'pointer',
              display: 'none', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ☰
          </button>
          {/* Logo — only on mobile (desktop logo is in sidebar) */}
          <div className="hamburger-btn" style={{ display: 'none', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Unbounded,sans-serif', fontSize: 14, fontWeight: 700, color: '#f0b429', letterSpacing: 2 }}>SKUPKA</span>
            <span style={{ background: '#f0b429', color: '#0f0f13', fontFamily: 'Unbounded,sans-serif', fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 4 }}>CRM</span>
          </div>
        </div>

        {/* Center: City tabs (only on board view) */}
        <nav style={{ display: 'flex', gap: 2, height: '100%', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          {activeTab === 'board' && user.cities.map(city => {
            const tab = CITY_TABS[city];
            const isActive = activeCity === city;
            return (
              <button key={city} onClick={() => setActiveCity(city)} style={{
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${isActive ? tab.color : 'transparent'}`,
                padding: '0 16px', height: '100%', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'Unbounded,sans-serif',
                color: isActive ? tab.color : t.text2, transition: 'all 0.15s',
              }}>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ServerStatus t={t} />
          <ExcelExport user={user} theme={t} />
          <ChangelogWidget theme={t} />
          <button onClick={toggleSound} title={soundOn ? 'Выключить звук' : 'Включить звук'} style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 15, padding: '5px 10px', cursor: 'pointer' }}>
            {soundOn ? '🔔' : '🔕'}
          </button>
          <button onClick={toggleTheme} title="Сменить тему" style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 15, padding: '5px 10px', cursor: 'pointer' }}>
            {themeName === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: t.text, fontSize: 12, fontWeight: 600 }}>{user.name}</span>
            <span style={{ color: t.text2, fontSize: 10 }}>{user.position}</span>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.text2, fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>
            Выйти
          </button>
        </div>
      </header>

      {/* ── Body (sidebar + main) ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          canSeeDashboard={canSeeDashboard}
          canSeeDeleted={canSeeDeleted}
          totalUnread={totalUnread}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          t={t}
        />

        {/* Main content */}
        <main style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', paddingTop: 16 }}>
          {activeTab === 'board' && activeCity && (
            <KanbanBoard key={activeCity} city={activeCity} user={user} theme={t} />
          )}
          {activeTab === 'dashboard' && canSeeDashboard && (
            <Dashboard user={user} theme={t} />
          )}
          {activeTab === 'archive' && (
            <ArchiveView user={user} theme={t} />
          )}
          {activeTab === 'deleted' && canSeeDeleted && (
            <DeletedView user={user} theme={t} />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Archive view ──────────────────────────────────────────────
function ArchiveView({ user, theme }) {
  const t = theme;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const city = user.cities.length === 1 ? user.cities[0] : null;

  useEffect(() => {
    let q = supabase.from('leads').select('*')
      .eq('is_archived', true).eq('is_deleted', false)
      .order('updated_at', { ascending: false });
    if (city) q = q.eq('city', city);
    q.then(({ data }) => { setLeads(data || []); setLoading(false); });
  }, []);

  return <SimpleLeadList leads={leads} loading={loading} title="🗄️ Архив" subtitle="Карточки старше 3 месяцев" theme={t} />;
}

// ─── Deleted view ──────────────────────────────────────────────
function DeletedView({ user, theme }) {
  const t = theme;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('leads').select('*').eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
      .then(({ data }) => { setLeads(data || []); setLoading(false); });
  }, []);

  const handleRestore = async (id) => {
    await axios.post(`${API}/api/leads/${id}/restore`);
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  return <SimpleLeadList leads={leads} loading={loading} title="🗑️ Удалённые" subtitle="Только директор может восстановить" theme={t} onRestore={handleRestore} />;
}

// ─── Simple list (archive / deleted) ──────────────────────────
function SimpleLeadList({ leads, loading, title, subtitle, theme, onRestore }) {
  const t = theme;
  const STATUS_LABELS = { new: 'Новый', in_progress: 'В работе', waiting: 'Ждём на филиал', success: 'Успешно', fail: 'Провал' };
  const STATUS_COLORS = { new: '#3b82f6', in_progress: '#8b5cf6', waiting: '#f59e0b', success: '#10b981', fail: '#ef4444' };

  return (
    <div style={{ padding: '0 24px 32px' }}>
      <div style={{ padding: '20px 0 16px' }}>
        <div style={{ fontFamily: 'Unbounded,sans-serif', fontSize: 18, fontWeight: 700, color: t.text }}>{title}</div>
        <div style={{ color: t.text2, fontSize: 13, marginTop: 4 }}>{subtitle} · {leads.length} карточек</div>
      </div>
      {loading ? (
        <div style={{ color: t.text2, textAlign: 'center', padding: 40 }}>Загрузка...</div>
      ) : leads.length === 0 ? (
        <div style={{ color: t.text2, textAlign: 'center', padding: 60, fontSize: 14 }}>Пусто</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {leads.map(l => (
            <div key={l.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: t.text, fontWeight: 600, fontSize: 14 }}>{l.client_name}</div>
                <div style={{ color: t.text2, fontSize: 12, marginTop: 2 }}>{l.phone} · {l.device} · {l.city}</div>
                <div style={{ color: t.text2, fontSize: 11, marginTop: 2 }}>{new Date(l.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: STATUS_COLORS[l.status], fontSize: 12, fontWeight: 600 }}>{STATUS_LABELS[l.status]}</span>
                {l.estimate_amount && (
                  <span style={{ color: '#f0b429', fontSize: 13, fontWeight: 700 }}>
                    {new Intl.NumberFormat('ru-KZ').format(l.estimate_amount)} ₸
                  </span>
                )}
                {onRestore && (
                  <button onClick={() => onRestore(l.id)} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}>
                    ♻️ Восстановить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
