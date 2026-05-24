import React, { useState, useEffect, useRef } from 'react';
import LoginPage from './components/LoginPage';
import KanbanBoard from './components/KanbanBoard';
import Dashboard from './components/Dashboard';
import ExcelExport from './components/ExcelExport';
import ChangelogWidget from './components/ChangelogWidget';
import ChatPage from './components/ChatPage';
import SettingsPage from './components/SettingsPage';
import KassaPage from './components/KassaPage';
import ZrsPage from './components/ZrsPage';
import AttendanceSpo from './components/AttendanceSpo';
import AttendanceAdmin from './components/AttendanceAdmin';
import TasksPage from './components/TasksPage';
import SummaryPanel from './components/SummaryPanel';
import Calculator from './components/Calculator';
import CrmAssistant from './components/CrmAssistant';
import { TildaPage } from './components/PlaceholderPages';
import { getSession, clearSession } from './auth';
import { themes, getTheme, saveTheme, radius, fib, glass } from './theme';
import { supabase } from './supabase';
import { FULL_ACCESS_ROLES, loadUserSpecial } from './permissions';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const CITY_TABS = {
  'Атырау': { label:'Атырау', color:'#f59e0b' },
  'Актобе':  { label:'Актобе',  color:'#06b6d4' },
  'Уральск': { label:'Уральск', color:'#a78bfa' },
};
const CAN_SEE_DASHBOARD = [...FULL_ACCESS_ROLES, 'rev', 'rgmu', 'rgma'];
const CAN_SEE_DELETED   = [...FULL_ACCESS_ROLES];

export function getSettings() {
  try { return JSON.parse(localStorage.getItem('skupka_settings')||'{}'); } catch { return {}; }
}
export function saveSettings(s) { localStorage.setItem('skupka_settings', JSON.stringify(s)); }

function playPing(volume, soundType) {
  const SOUNDS = {
    ping:    {freq:[880,440],   type:'sine'},
    chime:   {freq:[1047,784],  type:'sine'},
    pop:     {freq:[600,300],   type:'sine'},
    beep:    {freq:[1200,1200], type:'square'},
    soft:    {freq:[440,330],   type:'sine'},
    alert:   {freq:[1500,1000], type:'sawtooth'},
    bell:    {freq:[523,392],   type:'sine'},
    blip:    {freq:[800,1600],  type:'square'},
    knock:   {freq:[200,150],   type:'triangle'},
    digital: {freq:[2000,1500], type:'sawtooth'},
  };
  const s = SOUNDS[soundType] || SOUNDS.ping;
  try {
    const vol = (volume !== undefined ? volume : (getSettings().volume ?? 40)) / 100;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = s.type;
    o.frequency.setValueAtTime(s.freq[0], ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(s.freq[1], ctx.currentTime + 0.15);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

// ─── Clock UTC+5 ──────────────────────────────────────────────
function Clock({ t }) {
  const [time, setTime] = useState('');
  useEffect(() => {
    function update() {
      const now = new Date();
      const kz = new Date(now.getTime() + 5*3600*1000);
      const h = String(kz.getUTCHours()).padStart(2,'0');
      const m = String(kz.getUTCMinutes()).padStart(2,'0');
      const s = String(kz.getUTCSeconds()).padStart(2,'0');
      setTime(`${h}:${m}:${s}`);
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div title="UTC+5 (Казахстан)" style={{ display:'flex', alignItems:'center', gap:5, cursor:'default' }}>
      <span style={{ color:t.text2, fontSize:10 }}>🕐</span>
      <span style={{ color:t.text, fontSize:13, fontWeight:600, fontFamily:'monospace', letterSpacing:1 }}>{time}</span>
      <span style={{ color:t.text2, fontSize:9 }}>+5</span>
    </div>
  );
}

function ServerStatus() {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${API}/ping`, { signal: AbortSignal.timeout(5000) });
        if (!cancelled) setStatus(res.ok ? 'ok' : 'error');
      } catch { if (!cancelled) setStatus('error'); }
    }
    check();
    const iv = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);
  const colors = { ok:'#10b981', error:'#ef4444', checking:'#f59e0b' };
  const labels = { ok:'Сервер онлайн', error:'Сервер недоступен', checking:'Проверка...' };
  return (
    <div title={labels[status]} style={{ display:'flex', alignItems:'center', cursor:'default' }}>
      <span style={{ width:8, height:8, borderRadius:'50%', background:colors[status], display:'inline-block', boxShadow: status==='ok'?`0 0 6px ${colors[status]}`:'none', animation: status==='checking'?'pulse 1s infinite':'none' }} />
    </div>
  );
}

function SideItem({ icon, label, active, onClick, badge, collapsed, t }) {
  return (
    <button onClick={onClick} title={collapsed ? label : undefined} style={{
      display:'flex', alignItems:'center', gap: collapsed?0:10,
      justifyContent: collapsed?'center':'flex-start',
      width:'100%', padding: collapsed?'10px 0':'8px 13px',
      background: active?'rgba(232,38,58,0.13)':'transparent',
      border:'none', borderLeft: active?'3px solid #E8263A':'3px solid transparent',
      borderRadius: radius.sm, cursor:'pointer',
      color: active?'#E8263A':t.text2,
      fontSize:13, fontWeight: active?700:500,
      fontFamily:'Inter,sans-serif', transition:'all 0.18s',
      position:'relative', whiteSpace:'nowrap', overflow:'hidden',
      boxShadow: active?'0 2px 8px rgba(232,38,58,0.12)':'none',
    }}>
      <span style={{ fontSize:17, flexShrink:0 }}>{icon}</span>
      {!collapsed && <span style={{ flex:1, textAlign:'left' }}>{label}</span>}
      {badge > 0 && (
        <span style={{
          position: collapsed?'absolute':'static',
          top: collapsed?4:undefined, right: collapsed?4:undefined,
          background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700,
          borderRadius:99, padding:'1px 5px', minWidth:16, textAlign:'center', lineHeight:'16px',
        }}>{badge > 99 ? '99+' : badge}</span>
      )}
    </button>
  );
}

function Logo() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:15, fontWeight:700, color:'#E8263A', letterSpacing:2 }}>SKUPKA</span>
        <span style={{ background:'#E8263A', color:'#fff', fontFamily:'Unbounded,sans-serif', fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:4 }}>CRM</span>
      </div>
      <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:7, color:'#E8263A66', letterSpacing:1, lineHeight:1 }}>Лучше чем Все!</span>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab, canSeeDashboard, canSeeDeleted, canSeeZrs, canSeeAttendanceSpo, canSeeAttendanceAdmin, totalUnread, chatUnread, collapsed, setCollapsed, mobileOpen, setMobileOpen, setShowCalc, t }) {
  const items = (forMobile) => (
    <>
      <div style={{ flex:1, padding:'10px 6px', display:'flex', flexDirection:'column', gap:2, overflowY:'auto' }}>
        <SideItem icon="💬" label="WAZZUP"    active={activeTab==='board'}      onClick={() => { setActiveTab('board');      setMobileOpen(false); }} badge={totalUnread} collapsed={!forMobile&&collapsed} t={t} />
        {canSeeDashboard && <SideItem icon="📊" label="Дашборд"   active={activeTab==='dashboard'}   onClick={() => { setActiveTab('dashboard');setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />}
        <SideItem icon="🗨️" label="Чат"       active={activeTab==='chat'}        onClick={() => { setActiveTab('chat');       setMobileOpen(false); }} badge={chatUnread} collapsed={!forMobile&&collapsed} t={t} />
        <SideItem icon="✅" label="Задачи"    active={activeTab==='tasks'}       onClick={() => { setActiveTab('tasks');      setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />
        <SideItem icon="💰" label="Касса"     active={activeTab==='kassa'}       onClick={() => { setActiveTab('kassa');      setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />
        {canSeeZrs && <SideItem icon="📝" label="ЗРС"       active={activeTab==='zrs'}         onClick={() => { setActiveTab('zrs');        setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />}
        {canSeeAttendanceSpo   && <SideItem icon="🕐" label="Отметка на смене"    active={activeTab==='attendance_spo'}   onClick={() => { setActiveTab('attendance_spo');   setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />}
        {canSeeAttendanceAdmin && <SideItem icon="📍" label="Отметка о прибытии" active={activeTab==='attendance_admin'} onClick={() => { setActiveTab('attendance_admin'); setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />}
        <SideItem icon="🌐" label="Tilda"     active={activeTab==='tilda'}       onClick={() => { setActiveTab('tilda');      setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />
        <div style={{ flex:1 }} />
        <div style={{ height:1, background:t.border, margin:'6px 0' }} />
        <SideItem icon="🧮" label="Калькулятор" active={false} onClick={() => { setShowCalc(true); setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />
        <SideItem icon="🗄️" label="Архив"     active={activeTab==='archive'}     onClick={() => { setActiveTab('archive');    setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />
        {canSeeDeleted && <SideItem icon="🗑️" label="Удалённые" active={activeTab==='deleted'} onClick={() => { setActiveTab('deleted'); setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />}
        <div style={{ height:1, background:t.border, margin:'6px 0' }} />
        <SideItem icon="⚙️" label="Настройки" active={activeTab==='settings'}    onClick={() => { setActiveTab('settings');   setMobileOpen(false); }} collapsed={!forMobile&&collapsed} t={t} />
      </div>
      {!forMobile && (
        <div style={{ padding:'8px 6px', borderTop:`1px solid ${t.border}` }}>
          <button onClick={() => setCollapsed(v=>!v)} style={{ width:'100%', background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:14, padding:'7px 0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <span style={{ transform: collapsed?'rotate(180deg)':'none', transition:'transform 0.2s', display:'inline-block' }}>◀</span>
            {!collapsed && <span style={{ fontSize:12, fontFamily:'Inter,sans-serif' }}>Свернуть</span>}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="sidebar-desktop" style={{ width:collapsed?60:200, background:t.headerBg+'ee', borderRight:`1px solid ${t.border}`, display:'flex', flexDirection:'column', height:'100%', transition:'width 0.2s ease', overflow:'hidden', flexShrink:0, backdropFilter:'blur(12px)' }}>
        {items(false)}
      </div>
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:199 }} />}
      <div className="sidebar-mobile" style={{ position:'fixed', top:0, left:0, bottom:0, width:220, transform:mobileOpen?'translateX(0)':'translateX(-100%)', transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)', zIndex:200, background:t.headerBg+'f0', borderRight:`1px solid ${t.border}`, display:'flex', flexDirection:'column', backdropFilter:'blur(16px)' }}>
        <div style={{ height:54, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', borderBottom:`1px solid ${t.border}` }}>
          <Logo />
          <button onClick={() => setMobileOpen(false)} style={{ background:'transparent', border:'none', fontSize:20, color:t.text2, cursor:'pointer', padding:4 }}>✕</button>
        </div>
        {items(true)}
      </div>
    </>
  );
}

export default function App() {
  const [user, setUser]             = useState(null);
  const [userSpecial, setUserSpecial] = useState({ is_tovarovyed: false });
  const [userPerms, setUserPerms]   = useState({});
  const [activeCity, setActiveCity] = useState(null);
  const [activeTab, setActiveTab]   = useState('board');
  const [settings, setSettings]     = useState(() => getSettings());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('skupka_sidebar')==='collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [chatUnread, setChatUnread]   = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  useEffect(() => {
    if (!user) return;
    function checkAutoOpen() {
      const kz = new Date(Date.now() + 5*3600*1000);
      const h = kz.getUTCHours(), m = kz.getUTCMinutes(), s = kz.getUTCSeconds();
      if ((h===9||h===14||h===21) && m===0 && s===0) setShowSummary(true);
    }
    const iv = setInterval(checkAutoOpen, 1000);
    return () => clearInterval(iv);
  }, [user]);


  useEffect(() => {
    document.body.style.overflow = showSummary ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showSummary]);

  const themeName = settings.theme || getTheme();
  const t = themes[themeName];
  const soundOn = settings.sound !== false;

  useEffect(() => { localStorage.setItem('skupka_sidebar', sidebarCollapsed?'collapsed':'expanded'); }, [sidebarCollapsed]);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setUser(session);
      const s = getSettings();
      setActiveTab(s.homeTab || 'board');
      setActiveCity(s.homeCity || session.cities[0]);
      supabase.from('user_settings').select('default_page').eq('user_id', session.username).single()
        .then(({ data }) => {
          if (data?.default_page) {
            setActiveTab(data.default_page);
            saveSettings({ ...getSettings(), homeTab: data.default_page });
          }
        }).catch(() => {});
      loadUserSpecial(supabase, session.username).then(setUserSpecial).catch(() => {});
      supabase.from('user_permissions').select('*').eq('user_id', session.username)
        .then(({ data }) => { if (data) setUserPerms(Object.fromEntries(data.map(r => [r.page, r]))); }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function fetchUnread() {
      const { data } = await supabase.from('leads').select('unread_count').eq('is_deleted',false).eq('is_archived',false);
      if (!cancelled && data) setTotalUnread(data.reduce((s,l)=>s+(l.unread_count||0),0));
    }
    fetchUnread();
    const ch = supabase.channel('unread-watcher')
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'leads'},(payload) => {
        if (soundOn && payload.new.unread_count>(payload.old.unread_count||0)) playPing(settings.volume, settings.soundType);
        fetchUnread();
      }).subscribe();
    return () => { cancelled=true; supabase.removeChannel(ch); };
  }, [user, soundOn, settings.volume, settings.soundType]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function fetchChatUnread() {
      try {
        const { data: reads }       = await supabase.from('chat_reads').select('chat_id,last_read_at').eq('user_id',user.username);
        const { data: memberships } = await supabase.from('chat_members').select('chat_id').eq('user_id',user.username);
        if (!memberships||cancelled) return;
        let total = 0;
        for (const m of memberships) {
          const read = reads?.find(r=>r.chat_id===m.chat_id);
          const { count } = await supabase.from('chat_messages').select('id',{count:'exact',head:true})
            .eq('chat_id',m.chat_id).neq('user_id',user.username).gt('created_at',read?.last_read_at||'1970-01-01');
          total += count||0;
        }
        if (!cancelled) setChatUnread(total);
      } catch {}
    }
    fetchChatUnread();
    const ch = supabase.channel('chat-unread')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},fetchChatUnread)
      .subscribe();
    return () => { cancelled=true; supabase.removeChannel(ch); };
  }, [user]);

  const updateSettings = (patch) => {
    const next = {...settings,...patch};
    setSettings(next); saveSettings(next);
    if (patch.theme) saveTheme(patch.theme);
  };

  const handleLogin = (u) => {
    setUser(u);
    const s = getSettings();
    setActiveTab(s.homeTab || 'board');
    setActiveCity(s.homeCity || u.cities[0]);
    supabase.from('user_settings').select('default_page').eq('user_id', u.username).single()
      .then(({ data }) => {
        if (data?.default_page) {
          setActiveTab(data.default_page);
          saveSettings({ ...getSettings(), homeTab: data.default_page });
        }
      }).catch(() => {});
    loadUserSpecial(supabase, u.username).then(setUserSpecial).catch(() => {});
    supabase.from('user_permissions').select('*').eq('user_id', u.username)
      .then(({ data }) => { if (data) setUserPerms(Object.fromEntries(data.map(r => [r.page, r]))); }).catch(() => {});
  };
  const handleLogout = () => { clearSession(); setUser(null); setActiveCity(null); setActiveTab('board'); setUserPerms({}); };

  const canSeeDashboard = user && (CAN_SEE_DASHBOARD.includes(user.role) || userPerms['dashboard']?.can_view === true);
  const canSeeDeleted   = user && CAN_SEE_DELETED.includes(user.role);
  const canSeeAttendanceSpo   = user && (FULL_ACCESS_ROLES.includes(user.role) || ['uralsk','atyray','aktobe'].includes(user.role) || userPerms['attendance_spo']?.can_view === true);
  const canSeeAttendanceAdmin = user && (FULL_ACCESS_ROLES.includes(user.role) || ['rev','rgmu','rgma'].includes(user.role) || userPerms['attendance_admin']?.can_view === true);

  if (!user) return <LoginPage onLogin={handleLogin} theme={t} />;

  return (
    <div style={{ height:'100vh', overflow:'hidden', background:t.bg, display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes jarvis-pulse { 0%,100%{opacity:0.85;transform:scale(1)} 50%{opacity:1;transform:scale(1.07)} }
        @keyframes jarvis-ring { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.55} 100%{transform:translate(-50%,-50%) scale(2.6);opacity:0} }
        @keyframes jarvis-ring-active { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.8} 100%{transform:translate(-50%,-50%) scale(2.2);opacity:0} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:${t.surface}; }
        ::-webkit-scrollbar-thumb { background:${t.border}; border-radius:3px; }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter:${themeName==='light'?'none':'invert(0.6)'}; cursor:pointer; }
        .sidebar-desktop { display:flex !important; }
        .sidebar-mobile { display:none; }
        .hamburger-btn { display:none !important; }
        @media (max-width:700px) {
          .sidebar-desktop { display:none !important; }
          .sidebar-mobile { display:flex !important; flex-direction:column; }
          .hamburger-btn { display:flex !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:54, background:t.headerBg+'ee', borderBottom:`1px solid ${t.border}`, flexShrink:0, zIndex:100, backdropFilter:'blur(12px)', boxShadow:'0 2px 16px rgba(0,0,0,0.12)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="hamburger-btn" onClick={() => setMobileOpen(v=>!v)} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:18, width:36, height:36, cursor:'pointer', display:'none', alignItems:'center', justifyContent:'center' }}>☰</button>
          <Logo />
        </div>

        <nav style={{ display:'flex', gap:2, height:'100%', alignItems:'center', flex:1, justifyContent:'center' }}>
          {activeTab==='board' && user.cities.map(city => {
            const tab = CITY_TABS[city]; const isActive = activeCity===city;
            return (
              <button key={city} onClick={() => setActiveCity(city)} style={{ background:'transparent', border:'none', borderBottom:`2px solid ${isActive?tab.color:'transparent'}`, padding:'0 16px', height:'100%', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'Unbounded,sans-serif', color:isActive?tab.color:t.text2, transition:'all 0.15s' }}>{tab.label}</button>
            );
          })}
        </nav>

        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <Clock t={t} />
          <ServerStatus />
          {/* Сводка */}
          <button onClick={() => setShowSummary(v=>!v)} title="Сводка" style={{ background: showSummary?'rgba(232,38,58,0.15)':'transparent', border:`1px solid ${showSummary?'rgba(232,38,58,0.4)':t.border}`, borderRadius:8, color: showSummary?'#E8263A':t.text2, fontSize:13, padding:'5px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            📊 <span style={{ fontSize:12, fontFamily:'Inter,sans-serif' }}>Сводка</span>
          </button>
          <ExcelExport user={user} theme={t} />
          <ChangelogWidget theme={t} />
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            <span style={{ color:t.text, fontSize:12, fontWeight:600 }}>{user.name}</span>
            <span style={{ color:t.text2, fontSize:10 }}>{user.position}</span>
          </div>
          <button onClick={handleLogout} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:12, padding:'5px 12px', cursor:'pointer' }}>Выйти</button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <Sidebar
          activeTab={activeTab} setActiveTab={setActiveTab}
          canSeeDashboard={canSeeDashboard} canSeeDeleted={canSeeDeleted}
          canSeeZrs={user && ['admin','dir','zamdir','sysadmin','rev','rgmu','rgma'].includes(user.role)}
          canSeeAttendanceSpo={canSeeAttendanceSpo} canSeeAttendanceAdmin={canSeeAttendanceAdmin}
          totalUnread={totalUnread} chatUnread={chatUnread}
          collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}
          mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
          setShowCalc={setShowCalc}
          t={t}
        />
        <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {activeTab==='board'      && activeCity && <KanbanBoard key={activeCity} city={activeCity} user={user} theme={t} settings={settings} />}
          {activeTab==='dashboard'  && canSeeDashboard && <Dashboard user={user} theme={t} />}
          {activeTab==='chat'       && <ChatPage user={user} theme={t} onUnreadChange={setChatUnread} />}
          {activeTab==='tasks'      && <TasksPage user={user} theme={t} />}
          {activeTab==='kassa'      && <KassaPage user={user} theme={t} />}
          {activeTab==='zrs'        && <ZrsPage user={user} theme={t} />}
          {activeTab==='attendance_spo'   && canSeeAttendanceSpo   && <AttendanceSpo   user={user} theme={t} />}
          {activeTab==='attendance_admin' && canSeeAttendanceAdmin && <AttendanceAdmin user={user} theme={t} />}
          {activeTab==='tilda'      && <TildaPage theme={t} />}
          {activeTab==='archive'    && <ArchiveView user={user} theme={t} />}
          {activeTab==='deleted'    && canSeeDeleted && <DeletedView user={user} theme={t} />}
          {activeTab==='settings'   && <SettingsPage user={user} theme={t} settings={settings} onUpdate={updateSettings} />}
        </main>
      </div>

      {/* Summary panel */}
      {showSummary && <SummaryPanel user={user} theme={t} onClose={() => setShowSummary(false)} />}
      {/* Calculator */}
      {showCalc && <Calculator theme={t} onClose={() => setShowCalc(false)} />}
      {/* CRM Assistant — always visible */}
      <CrmAssistant user={user} theme={t} isTovarovyed={userSpecial.is_tovarovyed} />
    </div>
  );
}

function ArchiveView({ user, theme }) {
  const t = theme;
  const [leads, setLeads] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const city = user.cities.length===1 ? user.cities[0] : null;
  React.useEffect(() => {
    let q = supabase.from('leads').select('*').eq('is_archived',true).eq('is_deleted',false).order('updated_at',{ascending:false});
    if (city) q = q.eq('city',city);
    q.then(({data}) => { setLeads(data||[]); setLoading(false); });
  }, []);
  return <SimpleLeadList leads={leads} loading={loading} title="🗄️ Архив" subtitle="Карточки старше 3 месяцев" theme={t} />;
}

function DeletedView({ user, theme }) {
  const t = theme;
  const [leads, setLeads] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    supabase.from('leads').select('*').eq('is_deleted',true).order('deleted_at',{ascending:false})
      .then(({data}) => { setLeads(data||[]); setLoading(false); });
  }, []);
  const handleRestore = async (id) => {
    await axios.post(`${API}/api/leads/${id}/restore`);
    setLeads(prev => prev.filter(l=>l.id!==id));
  };
  return <SimpleLeadList leads={leads} loading={loading} title="🗑️ Удалённые" subtitle="Только директор может восстановить" theme={t} onRestore={handleRestore} />;
}

function SimpleLeadList({ leads, loading, title, subtitle, theme, onRestore }) {
  const t = theme;
  const STATUS_LABELS = { new:'Новый', in_progress:'В работе', waiting:'Ждём на филиал', success:'Успешно', fail:'Провал' };
  const STATUS_COLORS = { new:'#3b82f6', in_progress:'#8b5cf6', waiting:'#f59e0b', success:'#10b981', fail:'#ef4444' };
  return (
    <div style={{ padding:'0 24px 32px', overflowY:'auto', height:'100%' }}>
      <div style={{ padding:'20px 0 16px' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:18, fontWeight:700, color:t.text }}>{title}</div>
        <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>{subtitle} · {leads.length} карточек</div>
      </div>
      {loading ? <div style={{ color:t.text2, textAlign:'center', padding:40 }}>Загрузка...</div> :
       leads.length===0 ? <div style={{ color:t.text2, textAlign:'center', padding:60, fontSize:14 }}>Пусто</div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {leads.map(l => (
            <div key={l.id} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ color:t.text, fontWeight:600, fontSize:14 }}>{l.client_name}</div>
                <div style={{ color:t.text2, fontSize:12, marginTop:2 }}>{l.phone} · {l.device} · {l.city}</div>
                <div style={{ color:t.text2, fontSize:11, marginTop:2 }}>{new Date(l.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ color:STATUS_COLORS[l.status], fontSize:12, fontWeight:600 }}>{STATUS_LABELS[l.status]}</span>
                {l.estimate_amount && <span style={{ color:'#f0b429', fontSize:13, fontWeight:700 }}>{new Intl.NumberFormat('ru-KZ').format(l.estimate_amount)} ₸</span>}
                {onRestore && <button onClick={() => onRestore(l.id)} style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, color:'#10b981', fontSize:12, padding:'5px 12px', cursor:'pointer' }}>♻️ Восстановить</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
