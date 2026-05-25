import React, { useState, useEffect } from 'react';
import { USERS } from '../auth';
import { supabase } from '../supabase';
import { fib, radius } from '../theme';

const ROLE_LABELS = {
  admin:'Администратор',dir:'Директор',zamdir:'Зам. Директора',sysadmin:'Сис. Администратор',
  rev:'Ревизор',rgmu:'РГМ Уральск',rgma:'РГМ Атырау',uralsk:'СПО Уральск',
  atyray:'СПО Атырау',aktobe:'СПО Актобе',okk:'ОКК',ovn:'ОВН',smm:'Маркетинг',dev:'Разработчик',
};

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function isOnline(lastSeen) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

function fmtLastSeen(lastSeen) {
  if (!lastSeen) return 'Никогда';
  const diff = Date.now() - new Date(lastSeen).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч назад`;
  return new Date(lastSeen).toLocaleDateString('ru-RU', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}

export default function OnlinePage({ user, theme }) {
  const t = theme;
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  const employees = Object.entries(USERS)
    .filter(([id]) => id !== 'zmsgrove' || user.role === 'admin')
    .map(([id, u]) => ({ id, ...u }));

  useEffect(() => {
    loadProfiles();
    // Ping every 60 sec
    const iv = setInterval(pingActivity, 60000);
    pingActivity();
    return () => clearInterval(iv);
  }, []);

  async function pingActivity() {
    await supabase.from('profiles').upsert(
      { user_id: user.username, last_seen: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  }

  async function loadProfiles() {
    const { data } = await supabase.from('profiles').select('user_id, last_seen');
    if (data) {
      setProfiles(Object.fromEntries(data.map(r => [r.user_id, r])));
    }
    setLoading(false);
  }

  useEffect(() => {
    const ch = supabase.channel('online-watcher')
      .on('postgres_changes', { event:'*', schema:'public', table:'profiles' }, () => loadProfiles())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const online = employees.filter(e => isOnline(profiles[e.id]?.last_seen));
  const offline = employees.filter(e => !isOnline(profiles[e.id]?.last_seen));

  return (
    <div style={{ padding:'0 24px 40px', height:'100%', overflowY:'auto' }}>
      <div style={{ padding:'20px 0 20px' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:20, fontWeight:700, color:t.text }}>🟢 Кто в сети</div>
        <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>
          Онлайн — последняя активность менее 2 минут назад · {loading ? '...' : `${online.length} из ${employees.length}`} сотрудников
        </div>
      </div>

      {loading ? (
        <div style={{ color:t.text2, textAlign:'center', padding:60 }}>Загрузка...</div>
      ) : (
        <>
          {online.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ color:'#10b981', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
                🟢 В сети — {online.length}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {online.map(emp => (
                  <EmployeeCard key={emp.id} emp={emp} lastSeen={profiles[emp.id]?.last_seen} online t={t} />
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ color:t.text2, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
              ⚫ Не в сети — {offline.length}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {offline.map(emp => (
                <EmployeeCard key={emp.id} emp={emp} lastSeen={profiles[emp.id]?.last_seen} online={false} t={t} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmployeeCard({ emp, lastSeen, online, t }) {
  return (
    <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:radius.md, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, backdropFilter:'blur(8px)', transition:'all 0.2s' }}>
      <div style={{ width:10, height:10, borderRadius:'50%', background: online ? '#10b981' : '#555', flexShrink:0, boxShadow: online ? '0 0 8px #10b981' : 'none', transition:'all 0.3s' }} />
      <div style={{ flex:1 }}>
        <div style={{ color:t.text, fontSize:14, fontWeight:600 }}>{emp.name}</div>
        <div style={{ color:t.text2, fontSize:12, marginTop:2 }}>{ROLE_LABELS[emp.role] || emp.role} · {emp.cities?.join(', ')}</div>
      </div>
      <div style={{ color: online ? '#10b981' : t.text2, fontSize:12, flexShrink:0 }}>
        {online ? 'В сети' : fmtLastSeen(lastSeen)}
      </div>
    </div>
  );
}
