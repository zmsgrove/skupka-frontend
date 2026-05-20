import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import KanbanBoard from './components/KanbanBoard';
import Dashboard from './components/Dashboard';
import ExcelExport from './components/ExcelExport';
import { getSession, clearSession } from './auth';
import { themes, getTheme, saveTheme } from './theme';
import { supabase } from './supabase';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const CITY_TABS = {
  'Атырау': { label:'Атырау', color:'#f59e0b' },
  'Актобе': { label:'Актобе', color:'#06b6d4' },
  'Уральск': { label:'Уральск', color:'#a78bfa' },
};

const DASHBOARD_USERS = ['maksatovs','koshab','aleksandrovd','aminovn','zmsgrove','kylyshbaenam','revizor'];

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
  } catch(e) {}
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeCity, setActiveCity] = useState(null);
  const [activeTab, setActiveTab] = useState('board');
  const [themeName, setThemeName] = useState(getTheme());
  const [soundOn, setSoundOn] = useState(localStorage.getItem('skupka_sound') !== 'off');
  const theme = themes[themeName];
  const t = theme;

  useEffect(() => {
    const session = getSession();
    if (session) { setUser(session); setActiveCity(session.cities[0]); }
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('unread-watcher')
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'leads' }, (payload) => {
        if (soundOn && payload.new.unread_count > (payload.old.unread_count || 0)) {
          playPing();
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
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
  const canSeeDeleted = user && ['maksatovs','koshab','zmsgrove','kylyshbaenam'].includes(user.username);

  if (!user) return <LoginPage onLogin={handleLogin} theme={t} />;

  return (
    <div style={{ minHeight:'100vh', background:t.bg, display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:${t.surface}; }
        ::-webkit-scrollbar-thumb { background:${t.border}; border-radius:3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter:${themeName==='light'?'none':'invert(0.6)'}; cursor:pointer; }
        @media (max-width:600px) {
          .header-tabs { display:none !important; }
          .mobile-tabs { display:flex !important; }
        }
      `}</style>

      <header style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',height:54,background:t.headerBg,borderBottom:`1px solid ${t.border}`,position:'sticky',top:0,zIndex:100,flexShrink:0,boxShadow:t.shadow }}>
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <span style={{ fontFamily:'Unbounded,sans-serif',fontSize:16,fontWeight:700,color:'#f0b429',letterSpacing:2 }}>SKUPKA</span>
          <span style={{ background:'#f0b429',color:'#0f0f13',fontFamily:'Unbounded,sans-serif',fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:5 }}>CRM</span>
        </div>

        <nav className="header-tabs" style={{ display:'flex',gap:2,height:'100%',alignItems:'center' }}>
          {activeTab === 'board' && user.cities.map(city => {
            const tab = CITY_TABS[city];
            const isActive = activeCity === city;
            return (
              <button key={city} onClick={() => setActiveCity(city)} style={{
                background:'transparent', border:'none',
                borderBottom:`2px solid ${isActive?tab.color:'transparent'}`,
                padding:'0 16px', height:'100%', fontSize:12, fontWeight:600,
                cursor:'pointer', fontFamily:'Unbounded,sans-serif',
                color:isActive?tab.color:t.text2, transition:'all 0.15s',
              }}>{tab.label}</button>
            );
          })}
          <div style={{ display:'flex',alignItems:'center',gap:4,marginLeft:12 }}>
            <NavBtn label="📋 Доска" active={activeTab==='board'} onClick={() => setActiveTab('board')} t={t} />
            {canSeeDashboard && <NavBtn label="📊 Дашборд" active={activeTab==='dashboard'} onClick={() => setActiveTab('dashboard')} t={t} />}
            <NavBtn label="🗄️ Архив" active={activeTab==='archive'} onClick={() => setActiveTab('archive')} t={t} />
            {canSeeDeleted && <NavBtn label="🗑️ Удалённые" active={activeTab==='deleted'} onClick={() => setActiveTab('deleted')} t={t} />}
          </div>
        </nav>

        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <ExcelExport user={user} theme={t} />
          <button onClick={toggleSound} title={soundOn?'Выключить звук':'Включить звук'} style={{ background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,fontSize:15,padding:'5px 10px',cursor:'pointer' }}>
            {soundOn ? '🔔' : '🔕'}
          </button>
          <button onClick={toggleTheme} title="Сменить тему" style={{ background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,fontSize:15,padding:'5px 10px',cursor:'pointer' }}>
            {themeName === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={{ display:'flex',flexDirection:'column',alignItems:'flex-end' }}>
            <span style={{ color:t.text,fontSize:12,fontWeight:600 }}>{user.name}</span>
            <span style={{ color:t.text2,fontSize:10 }}>{user.position}</span>
          </div>
          <button onClick={handleLogout} style={{ background:'transparent',border:`1px solid ${t.border}`,borderRadius:8,color:t.text2,fontSize:12,padding:'5px 12px',cursor:'pointer' }}>
            Выйти
          </button>
        </div>
      </header>

      {/* Мобильные табы */}
      <div className="mobile-tabs" style={{ display:'none',padding:'0 16px',background:t.headerBg,borderBottom:`1px solid ${t.border}`,gap:0,overflowX:'auto' }}>
        {user.cities.map(city => {
          const tab = CITY_TABS[city];
          const isActive = activeCity===city && activeTab==='board';
          return (
            <button key={city} onClick={() => { setActiveCity(city); setActiveTab('board'); }} style={{
              background:'transparent',border:'none',
              borderBottom:`2px solid ${isActive?tab.color:'transparent'}`,
              padding:'10px 16px',fontSize:12,fontWeight:600,cursor:'pointer',
              fontFamily:'Unbounded,sans-serif',color:isActive?tab.color:t.text2,whiteSpace:'nowrap',
            }}>{tab.label}</button>
          );
        })}
        {canSeeDashboard && (
          <button onClick={() => setActiveTab('dashboard')} style={{ background:'transparent',border:'none',borderBottom:`2px solid ${activeTab==='dashboard'?'#f0b429':'transparent'}`,padding:'10px 16px',fontSize:12,cursor:'pointer',color:activeTab==='dashboard'?'#f0b429':t.text2,whiteSpace:'nowrap' }}>
            📊 Дашборд
          </button>
        )}
      </div>

      <main style={{ flex:1,paddingTop:16,overflowX:'auto' }}>
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
  );
}

function NavBtn({ label, active, onClick, t }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(240,180,41,0.12)' : 'transparent',
      border: `1px solid ${active ? 'rgba(240,180,41,0.4)' : 'transparent'}`,
      borderRadius:8, color: active ? '#f0b429' : t.text2,
      fontSize:12, padding:'5px 12px', cursor:'pointer',
      fontFamily:'Inter,sans-serif', transition:'all 0.15s',
    }}>{label}</button>
  );
}

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

function SimpleLeadList({ leads, loading, title, subtitle, theme, onRestore }) {
  const t = theme;
  const STATUS_LABELS = { new:'Новый', in_progress:'В работе', waiting:'Ждём на филиал', success:'Успешно', fail:'Провал' };
  const STATUS_COLORS = { new:'#3b82f6', in_progress:'#8b5cf6', waiting:'#f59e0b', success:'#10b981', fail:'#ef4444' };

  return (
    <div style={{ padding:'0 24px 32px' }}>
      <div style={{ padding:'20px 0 16px' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif',fontSize:18,fontWeight:700,color:t.text }}>{title}</div>
        <div style={{ color:t.text2,fontSize:13,marginTop:4 }}>{subtitle} · {leads.length} карточек</div>
      </div>
      {loading ? (
        <div style={{ color:t.text2,textAlign:'center',padding:40 }}>Загрузка...</div>
      ) : leads.length === 0 ? (
        <div style={{ color:t.text2,textAlign:'center',padding:60,fontSize:14 }}>Пусто</div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {leads.map(l => (
            <div key={l.id} style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:'14px 18px',display:'flex',alignItems:'center',gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ color:t.text,fontWeight:600,fontSize:14 }}>{l.client_name}</div>
                <div style={{ color:t.text2,fontSize:12,marginTop:2 }}>{l.phone} · {l.device} · {l.city}</div>
                <div style={{ color:t.text2,fontSize:11,marginTop:2 }}>{new Date(l.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <span style={{ color:STATUS_COLORS[l.status],fontSize:12,fontWeight:600 }}>{STATUS_LABELS[l.status]}</span>
                {l.estimate_amount && (
                  <span style={{ color:'#f0b429',fontSize:13,fontWeight:700 }}>
                    {new Intl.NumberFormat('ru-KZ').format(l.estimate_amount)} ₸
                  </span>
                )}
                {onRestore && (
                  <button onClick={() => onRestore(l.id)} style={{ background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:8,color:'#10b981',fontSize:12,padding:'5px 12px',cursor:'pointer' }}>
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
