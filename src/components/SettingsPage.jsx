import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../App';
import { themes } from '../theme';
import { supabase } from '../supabase';
import { USERS } from '../auth';
import { PAGES, PAGE_LABELS, getDefaultPermissions } from '../permissions';

const HOME_TAB_OPTIONS = [
  { value:'board',     label:'💬 WAZZUP (Доска)' },
  { value:'dashboard', label:'📊 Дашборд' },
  { value:'chat',      label:'🗨️ Чат' },
  { value:'tasks',     label:'✅ Задачи' },
];

const SUMMARY_SECTIONS = [
  { key:'tasks',  icon:'✅', label:'Задачи',        adminOnly:false },
  { key:'leads',  icon:'💬', label:'Заявки WAZZUP', adminOnly:false },
  { key:'cities', icon:'🏙️', label:'По городам',    adminOnly:true  },
  { key:'kassa',  icon:'💰', label:'Касса',          adminOnly:true  },
  { key:'zrs',    icon:'📝', label:'ЗРС',            adminOnly:true  },
  { key:'shifts', icon:'🕐', label:'Смены',          adminOnly:true  },
];
const DEFAULT_SUMMARY_CONFIG = { tasks:true, leads:true, cities:true, kassa:true, zrs:true, shifts:true };

const SOUNDS = [
  { id:'ping',     label:'🔔 Пинг',         desc:'Классический',  freq:[880,440],   type:'sine' },
  { id:'chime',    label:'🎵 Звон',          desc:'Мелодичный',    freq:[1047,784],  type:'sine' },
  { id:'pop',      label:'🫧 Поп',           desc:'Мягкий',        freq:[600,300],   type:'sine' },
  { id:'beep',     label:'📟 Бип',           desc:'Чёткий',        freq:[1200,1200], type:'square' },
  { id:'soft',     label:'🌊 Мягкий',        desc:'Тихий',         freq:[440,330],   type:'sine' },
  { id:'alert',    label:'🚨 Алерт',         desc:'Срочный',       freq:[1500,1000], type:'sawtooth' },
  { id:'bell',     label:'🔕 Колокол',       desc:'Долгий',        freq:[523,392],   type:'sine' },
  { id:'blip',     label:'👾 Блип',          desc:'Игровой',       freq:[800,1600],  type:'square' },
  { id:'knock',    label:'🚪 Стук',          desc:'Глухой',        freq:[200,150],   type:'triangle' },
  { id:'digital',  label:'💻 Цифровой',      desc:'Электронный',   freq:[2000,1500], type:'sawtooth' },
];

function playSound(sound, volume) {
  try {
    const vol = (volume ?? 40) / 100;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = sound.type;
    o.frequency.setValueAtTime(sound.freq[0], ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(sound.freq[1], ctx.currentTime + 0.15);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

const SOUND_FILES = ['OK.mp3','2toon.mp3','classic.mp3','crash.mp3','disck.mp3','error.mp3','hw.mp3','old.mp3','old2.mp3','rim.mp3','steam.mp3','toon.mp3'];

const SOUND_EVENTS = [
  { key:'wazzup_msg',     label:'📱 Новое сообщение Wazzup' },
  { key:'new_lead',       label:'🆕 Новая заявка' },
  { key:'chat_msg',       label:'💬 Новое сообщение в чате' },
  { key:'task_assign',    label:'✅ Новая задача назначена' },
  { key:'task_deadline',  label:'⏰ Дедлайн задачи приближается' },
  { key:'feed_like',      label:'👍 Лайк на пост' },
  { key:'feed_comment',   label:'💬 Комментарий на пост' },
  { key:'feed_announce',  label:'📢 Новое закреплённое объявление' },
  { key:'birthday',       label:'🎂 День рождения сотрудника' },
  { key:'late',           label:'⚠️ Опоздание зафиксировано' },
  { key:'crm_update',     label:'🔄 Обновление CRM' },
  { key:'save_success',   label:'✅ Успешное сохранение' },
  { key:'save_error',     label:'❌ Ошибка' },
];

function playMp3(file, volume) {
  try {
    const audio = new Audio(`/sound/${file}`);
    audio.volume = (volume ?? 40) / 100;
    audio.play().catch(() => {});
  } catch(e) {}
}

export default function SettingsPage({ user, theme, settings, onUpdate }) {
  const t = theme;
  const isAdmin = ['admin','dir','zamdir','sysadmin','rev','rgmu','rgma','dev','okk','ovn','smm'].includes(user.role);
  const canManagePermissions = ['admin','dir','dev'].includes(user.role);
  const [summaryConfig, setSummaryConfig] = useState(DEFAULT_SUMMARY_CONFIG);
  const [summarySaving, setSummarySaving] = useState(false);
  const [soundSettings, setSoundSettings] = useState({});
  const [soundSaving, setSoundSaving] = useState(false);

  useEffect(() => {
    supabase.from('user_settings').select('summary_config, sound_settings').eq('user_id', user.username).single()
      .then(({ data }) => {
        if (data?.summary_config) setSummaryConfig({ ...DEFAULT_SUMMARY_CONFIG, ...data.summary_config });
        if (data?.sound_settings) setSoundSettings(data.sound_settings);
      })
      .catch(() => {});
  }, [user.username]);

  const handleVolume    = (e) => onUpdate({ volume: Number(e.target.value) });
  const handleSound     = () => onUpdate({ sound: !(settings.sound !== false) });
  const handleSoundType = (id) => { onUpdate({ soundType: id }); playSound(SOUNDS.find(s=>s.id===id), settings.volume??40); };
  const handleTheme     = (v) => onUpdate({ theme: v });
  const handleHomeTab   = async (v) => {
    onUpdate({ homeTab: v });
    supabase.from('user_settings').upsert(
      { user_id: user.username, default_page: v, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    ).catch(() => {});
  };
  const handleHomeCity  = (v) => onUpdate({ homeCity: v });
  const handleCompact   = () => onUpdate({ compact: !settings.compact });
  const handleTimers    = () => onUpdate({ showTimers: settings.showTimers === false ? true : false });
  const handleAutoRefresh = (v) => onUpdate({ autoRefresh: v });

  const handleSummaryToggle = async (key) => {
    const next = { ...summaryConfig, [key]: !summaryConfig[key] };
    setSummaryConfig(next);
    setSummarySaving(true);
    await supabase.from('user_settings').upsert(
      { user_id: user.username, summary_config: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    ).catch(() => {});
    setSummarySaving(false);
  };

  const handleSoundEvent = async (eventKey, file) => {
    const next = { ...soundSettings, [eventKey]: file };
    setSoundSettings(next);
    setSoundSaving(true);
    await supabase.from('user_settings').upsert(
      { user_id: user.username, sound_settings: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    ).catch(() => {});
    setSoundSaving(false);
  };

  const volume      = settings.volume ?? 40;
  const soundOn     = settings.sound !== false;
  const soundType   = settings.soundType || 'ping';
  const themeName   = settings.theme || 'dark';
  const showTimers  = settings.showTimers !== false;
  const compact     = !!settings.compact;
  const autoRefresh = settings.autoRefresh || 'off';
  const homeTab     = settings.homeTab || 'board';
  const homeCity    = settings.homeCity || user.cities[0];

  return (
    <>
    <style>{`@media (min-width:769px){.settings-cols{display:grid!important;grid-template-columns:1fr 1fr;gap:21px;align-items:start;}}`}</style>
    <div style={{ padding:'0 24px 40px', height:'100%', overflowY:'auto' }}>
      <div style={{ padding:'20px 0 24px' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:20, fontWeight:700, color:t.text }}>⚙️ Настройки</div>
        <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>Персональные настройки интерфейса</div>
      </div>

      <div className={canManagePermissions ? 'settings-cols' : ''} style={{ display:'flex', flexDirection:'column' }}>
      {/* Левая колонка */}
      <div>

      {/* Профиль */}
      <div style={{ marginBottom:20, background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:'14px 18px' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:12, fontWeight:600, color:t.text, marginBottom:10 }}>👤 Профиль</div>
        <div style={{ color:t.text2, fontSize:13 }}>
          <b style={{ color:t.text }}>{user.name}</b> · {user.username} · роль: <b style={{ color:'#E8263A' }}>{user.role}</b>
        </div>
        <div style={{ color:t.text2, fontSize:11, marginTop:4 }}>Города: {user.cities.join(', ')}</div>
      </div>

      {/* Уведомления */}
      <Section title="🔔 Уведомления" t={t}>
        <Row label="Звук уведомлений" t={t}>
          <Toggle value={soundOn} onChange={handleSound} t={t} />
        </Row>
        <Row label={`Громкость — ${volume}%`} t={t}>
          <input type="range" min={0} max={100} value={volume} onChange={handleVolume}
            style={{ width:'100%', accentColor:'#E8263A', cursor:'pointer' }} />
        </Row>
        <Row label="Тип звука" t={t} vertical>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, width:'100%' }}>
            {SOUNDS.map(s => (
              <button key={s.id} onClick={() => handleSoundType(s.id)} style={{
                background: soundType===s.id ? 'rgba(232,38,58,0.15)' : t.surface2,
                border:`1px solid ${soundType===s.id ? 'rgba(232,38,58,0.5)' : t.border}`,
                borderRadius:10, padding:'10px 6px', cursor:'pointer', textAlign:'center',
                transition:'all 0.15s',
              }}>
                <div style={{ fontSize:18 }}>{s.label.split(' ')[0]}</div>
                <div style={{ color: soundType===s.id ? '#E8263A' : t.text, fontSize:11, fontWeight:600, marginTop:3 }}>{s.label.split(' ').slice(1).join(' ')}</div>
                <div style={{ color:t.text2, fontSize:10, marginTop:1 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* Темы */}
      <Section title="🎨 Оформление" t={t}>
        <Row label="Тема" t={t} vertical>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, width:'100%' }}>
            {Object.entries(themes).map(([key, th]) => (
              <button key={key} onClick={() => handleTheme(key)} style={{
                background: themeName===key ? th.surface2 : th.surface,
                border:`2px solid ${themeName===key ? '#E8263A' : th.border}`,
                borderRadius:10, padding:'10px 6px', cursor:'pointer', textAlign:'center',
                transition:'all 0.15s', position:'relative',
              }}>
                {themeName===key && <div style={{ position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%', background:'#E8263A' }} />}
                <div style={{ fontSize:16 }}>{th.name.split(' ')[0]}</div>
                <div style={{ color:th.text, fontSize:10, fontWeight:600, marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{th.name.split(' ').slice(1).join(' ')}</div>
                <div style={{ display:'flex', gap:2, marginTop:4, justifyContent:'center' }}>
                  {[th.bg, th.surface, th.accent, th.text2].map((c,i) => (
                    <div key={i} style={{ width:10, height:10, borderRadius:2, background:c, border:`1px solid ${th.border}` }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </Row>
        <Row label="Компактный вид карточек" t={t}>
          <Toggle value={compact} onChange={handleCompact} t={t} />
        </Row>
        <Row label="Таймер на карточках" t={t}>
          <Toggle value={showTimers} onChange={handleTimers} t={t} />
        </Row>
      </Section>

      {/* Главный экран */}
      <Section title="🏠 Главный экран" t={t}>
        <Row label="Открывать при входе" t={t}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {HOME_TAB_OPTIONS.map(opt => (
              <label key={opt.value} style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="radio" name="homeTab" value={opt.value} checked={homeTab===opt.value} onChange={() => handleHomeTab(opt.value)} style={{ accentColor:'#E8263A' }} />
                <span style={{ color:t.text, fontSize:13 }}>{opt.label}</span>
              </label>
            ))}
          </div>
        </Row>
        {homeTab === 'board' && user.cities.length > 1 && (
          <Row label="Город по умолчанию" t={t}>
            <div style={{ display:'flex', gap:8 }}>
              {user.cities.map(city => (
                <button key={city} onClick={() => handleHomeCity(city)} style={{
                  background: homeCity===city ? 'rgba(232,38,58,0.15)' : 'transparent',
                  border:`1px solid ${homeCity===city ? 'rgba(232,38,58,0.5)' : t.border}`,
                  borderRadius:8, color: homeCity===city ? '#E8263A' : t.text2,
                  fontSize:12, padding:'6px 14px', cursor:'pointer', transition:'all 0.15s',
                }}>{city}</button>
              ))}
            </div>
          </Row>
        )}
      </Section>

      {/* Автообновление */}
      <Section title="🔄 Автообновление" t={t}>
        <Row label="Обновлять каждые" t={t}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['off','Выкл'],['5','5 мин'],['10','10 мин'],['30','30 мин']].map(([val,label]) => (
              <button key={val} onClick={() => handleAutoRefresh(val)} style={{
                background: autoRefresh===val ? 'rgba(232,38,58,0.15)' : 'transparent',
                border:`1px solid ${autoRefresh===val ? 'rgba(232,38,58,0.5)' : t.border}`,
                borderRadius:8, color: autoRefresh===val ? '#E8263A' : t.text2,
                fontSize:12, padding:'6px 14px', cursor:'pointer', transition:'all 0.15s',
              }}>{label}</button>
            ))}
          </div>
        </Row>
      </Section>

      {/* Сводка */}
      <Section title={`🗒️ Блоки сводки${summarySaving?' · Сохраняю...':''}`} t={t}>
        {SUMMARY_SECTIONS.filter(s => !s.adminOnly || isAdmin).map(s => (
          <Row key={s.key} label={`${s.icon} ${s.label}`} t={t}>
            <Toggle value={!!summaryConfig[s.key]} onChange={() => handleSummaryToggle(s.key)} t={t} />
          </Row>
        ))}
      </Section>

      {/* Звуки событий */}
      <Section title={`🔊 Звуки событий${soundSaving?' · Сохраняю...':''}`} t={t}>
        <div style={{ padding:'10px 18px 6px', borderBottom:`1px solid ${t.border}22` }}>
          <span style={{ color:t.text2, fontSize:12 }}>По умолчанию для всех событий установлен <b style={{ color:t.text }}>OK.mp3</b></span>
        </div>
        {SOUND_EVENTS.map(ev => {
          const selected = soundSettings[ev.key] || 'OK.mp3';
          return (
            <div key={ev.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 18px', borderBottom:`1px solid ${t.border}22`, gap:12 }}>
              <span style={{ color:t.text2, fontSize:13, flex:1 }}>{ev.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <select value={selected} onChange={e => handleSoundEvent(ev.key, e.target.value)}
                  style={{ background:t.inputBg||t.surface2, border:`1px solid ${t.border}`, borderRadius:6, color:t.text, fontSize:12, padding:'5px 8px', outline:'none', cursor:'pointer' }}>
                  {SOUND_FILES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <button onClick={() => playMp3(selected, settings.volume ?? 40)}
                  title="Прослушать"
                  style={{ background:`${t.surface2||t.surface}`, border:`1px solid ${t.border}`, borderRadius:6, color:'#E8263A', fontSize:14, padding:'5px 10px', cursor:'pointer' }}>
                  🔊
                </button>
              </div>
            </div>
          );
        })}
      </Section>

      </div>{/* end left column */}

      {/* Правая колонка — только dir/admin */}
      {canManagePermissions && (
        <div>
          <PermissionsPanel t={t} currentUser={user} />
        </div>
      )}
      </div>{/* end settings-cols */}
    </div>
    </>
  );
}

function Section({ title, children, t }) {
  return (
    <div style={{ marginBottom:20, background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'12px 18px', borderBottom:`1px solid ${t.border}`, fontFamily:'Unbounded,sans-serif', fontSize:12, fontWeight:600, color:t.text }}>{title}</div>
      <div style={{ padding:'4px 0' }}>{children}</div>
    </div>
  );
}

function Row({ label, children, t, vertical }) {
  return (
    <div style={{ display:'flex', alignItems: vertical ? 'flex-start' : 'center', justifyContent:'space-between', padding:'12px 18px', borderBottom:`1px solid ${t.border}22`, gap:16, flexWrap: vertical ? 'wrap' : 'nowrap', flexDirection: vertical ? 'column' : 'row' }}>
      {!vertical && <span style={{ color:t.text2, fontSize:13, minWidth:180, flexShrink:0 }}>{label}</span>}
      {vertical && <span style={{ color:t.text2, fontSize:13 }}>{label}</span>}
      <div style={{ flex:1, width: vertical ? '100%' : 'auto' }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange, t }) {
  return (
    <div onClick={onChange} style={{ width:44, height:24, borderRadius:12, background: value ? '#E8263A' : t.border, cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left: value ? 23 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  );
}

// ─── Панель управления правами (admin, dir, dev) ───────────
const ALL_CITIES = ['Атырау','Актобе','Уральск'];
const DEPARTMENTS = ['Руководство', 'Разработка', 'Продажи', 'Товароведение', 'ОКК', 'Маркетинг', 'ОВН'];
const ALWAYS_VIEW = ['feed', 'employees', 'channels'];

function PermissionsPanel({ t, currentUser }) {
  const manageableUsers = Object.entries(USERS).filter(([id, u]) => {
    // admin виден только себе
    if (u.role === 'admin') return currentUser.role === 'admin';
    // не показывать себя (кроме admin смотрит себя)
    if (id === currentUser.username) return false;
    return true;
  });
  const [selectedUser, setSelectedUser] = useState('');
  const [cities, setCities]         = useState([]);
  const [perms, setPerms]           = useState({});
  const [special, setSpecial]       = useState({ is_tovarovyed: false, check_access: false, birthday: '', departments: [] });
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  const selectedRole = selectedUser ? USERS[selectedUser]?.role : null;
  const isDirSelected = selectedRole === 'dir';

  useEffect(() => {
    if (!selectedUser) return;
    const u = USERS[selectedUser];
    const defaults = getDefaultPermissions(u.role);
    supabase.from('user_permissions').select('*').eq('user_id', selectedUser)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setPerms(Object.fromEntries(data.map(r => [r.page, { can_view:r.can_view, can_create:r.can_create, can_edit:r.can_edit, can_delete:r.can_delete }])));
        } else {
          setPerms(defaults);
        }
      });
    supabase.from('user_cities').select('city').eq('user_id', selectedUser)
      .then(({ data }) => { setCities(data && data.length ? data.map(r=>r.city) : u.cities); });
    supabase.from('user_special').select('*').eq('user_id', selectedUser).single()
      .then(({ data }) => { setSpecial(data ? { is_tovarovyed: !!data.is_tovarovyed, check_access: !!data.check_access, birthday: data.birthday || '', departments: data.departments || [] } : { is_tovarovyed: false, check_access: false, birthday: '', departments: [] }); })
      .catch(() => setSpecial({ is_tovarovyed: false, check_access: false, birthday: '', departments: [] }));
  }, [selectedUser]);

  const toggleCity = (city) => setCities(prev => prev.includes(city) ? prev.filter(c=>c!==city) : [...prev, city]);
  const togglePerm = (page, field) => setPerms(prev => ({ ...prev, [page]: { ...prev[page], [field]: !prev[page]?.[field] } }));
  const toggleAccess = (page) => {
    const cur = perms[page]?.can_view;
    setPerms(prev => ({ ...prev, [page]: cur ? { can_view:false, can_create:false, can_edit:false, can_delete:false } : { can_view:true, can_create:false, can_edit:false, can_delete:false } }));
  };

  const save = async () => {
    if (!selectedUser) return;
    setSaving(true);
    if (!isDirSelected) {
      // Save permissions (only for non-dir users)
      const rows = PAGES.map(page => ({
        user_id: selectedUser, page,
        can_view:   ALWAYS_VIEW.includes(page) ? true : (perms[page]?.can_view   || false),
        can_create: perms[page]?.can_create || false,
        can_edit:   perms[page]?.can_edit   || false,
        can_delete: perms[page]?.can_delete || false,
        updated_by: currentUser.username,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('user_permissions').upsert(rows, { onConflict: 'user_id,page' });
      // Save cities
      await supabase.from('user_cities').delete().eq('user_id', selectedUser);
      if (cities.length > 0) await supabase.from('user_cities').insert(cities.map(city => ({ user_id: selectedUser, city })));
    }
    // Save special (includes birthday, departments for dir/admin/dev editing)
    await supabase.from('user_special').upsert({
      user_id: selectedUser,
      is_tovarovyed: special.is_tovarovyed,
      check_access: special.check_access,
      birthday: special.birthday || null,
      departments: special.departments,
    }, { onConflict: 'user_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const PERM_COLS = [
    { key: 'can_view',   label: 'Просмотр' },
    { key: 'can_create', label: 'Создание' },
    { key: 'can_edit',   label: 'Редакт.' },
    { key: 'can_delete', label: 'Удаление' },
  ];

  return (
    <div style={{ marginBottom:20, background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'12px 18px', borderBottom:`1px solid ${t.border}`, fontFamily:'Unbounded,sans-serif', fontSize:12, fontWeight:600, color:t.text }}>🔑 Управление доступами</div>
      <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>
        {/* Выбор пользователя */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <span style={{ color:t.text2, fontSize:12 }}>Выберите сотрудника</span>
          <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
            style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'9px 12px', outline:'none' }}>
            <option value="">— Выбрать —</option>
            {manageableUsers.map(([id, u]) => (
              <option key={id} value={id}>{u.name} ({u.role})</option>
            ))}
          </select>
        </div>

        {selectedUser && (
          <>
            {/* Для dir — только специальные права */}
            {isDirSelected && (
              <div style={{ background:`${t.surface2}66`, borderRadius:10, padding:'10px 12px', marginBottom:4 }}>
                <div style={{ color:t.text2, fontSize:11, marginBottom:6 }}>ℹ️ Для директора доступны только специальные права</div>
              </div>
            )}

            {/* Города — только не для dir */}
            {!isDirSelected && (
              <div>
                <div style={{ color:t.text2, fontSize:12, marginBottom:6 }}>🏙️ Города</div>
                <div style={{ display:'flex', gap:8 }}>
                  {ALL_CITIES.map(city => (
                    <button key={city} onClick={() => toggleCity(city)} style={{
                      flex:1, background: cities.includes(city) ? 'rgba(232,38,58,0.15)' : 'transparent',
                      border:`1px solid ${cities.includes(city) ? 'rgba(232,38,58,0.5)' : t.border}`,
                      borderRadius:8, color: cities.includes(city) ? '#E8263A' : t.text2,
                      fontSize:12, padding:'7px', cursor:'pointer', transition:'all 0.15s',
                    }}>{city}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Таблица доступов — только не для dir */}
            {!isDirSelected && (
              <div>
                <div style={{ color:t.text2, fontSize:12, marginBottom:8 }}>📋 Доступы по разделам</div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign:'left', color:t.text2, padding:'6px 8px', borderBottom:`1px solid ${t.border}` }}>Раздел</th>
                        <th style={{ color:t.text2, padding:'6px 8px', borderBottom:`1px solid ${t.border}`, textAlign:'center' }}>Доступ</th>
                        {PERM_COLS.map(c => (
                          <th key={c.key} style={{ color:t.text2, padding:'6px 8px', borderBottom:`1px solid ${t.border}`, textAlign:'center', whiteSpace:'nowrap' }}>{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PAGES.map(page => {
                        const p = perms[page] || {};
                        const locked = ALWAYS_VIEW.includes(page);
                        return (
                          <tr key={page} style={{ borderBottom:`1px solid ${t.border}22`, opacity: locked ? 0.6 : 1 }}>
                            <td style={{ padding:'6px 8px', color:t.text }}>{PAGE_LABELS[page]}</td>
                            <td style={{ padding:'6px 8px', textAlign:'center' }}>
                              <input type="checkbox" checked={locked ? true : !!p.can_view} onChange={() => !locked && toggleAccess(page)} disabled={locked} style={{ accentColor:'#E8263A', cursor: locked ? 'default' : 'pointer' }} />
                            </td>
                            {PERM_COLS.map(c => (
                              <td key={c.key} style={{ padding:'6px 8px', textAlign:'center' }}>
                                <input type="checkbox" checked={locked && c.key === 'can_view' ? true : !!p[c.key]} onChange={() => !locked && togglePerm(page, c.key)}
                                  disabled={locked || (c.key !== 'can_view' && !p.can_view)}
                                  style={{ accentColor:'#E8263A', cursor: (locked || (c.key !== 'can_view' && !p.can_view)) ? 'default' : 'pointer', opacity: (c.key !== 'can_view' && !p.can_view) ? 0.3 : 1 }} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Специальные права */}
            <div>
              <div style={{ color:t.text2, fontSize:12, marginBottom:8 }}>🔑 Специальные права</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                  <input type="checkbox" checked={special.is_tovarovyed} onChange={() => setSpecial(s => ({...s, is_tovarovyed: !s.is_tovarovyed}))}
                    style={{ accentColor:'#E8263A', width:16, height:16, cursor:'pointer' }} />
                  <div>
                    <span style={{ color:t.text, fontSize:13, fontWeight:600 }}>Товаровед</span>
                    <span style={{ color:t.text2, fontSize:11, marginLeft:8 }}>— право вносить цены через ассистента</span>
                  </div>
                </label>
                {currentUser.role === 'admin' && (
                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                    <input type="checkbox" checked={!!special.check_access} onChange={() => setSpecial(s => ({...s, check_access: !s.check_access}))}
                      style={{ accentColor:'#E8263A', width:16, height:16, cursor:'pointer' }} />
                    <div>
                      <span style={{ color:t.text, fontSize:13, fontWeight:600 }}>🟢 Кто в сети</span>
                      <span style={{ color:t.text2, fontSize:11, marginLeft:8 }}>— видит страницу мониторинга онлайна</span>
                    </div>
                  </label>
                )}
                <div>
                  <div style={{ color:t.text2, fontSize:11, marginBottom:4 }}>🎂 Дата рождения</div>
                  <input type="date" value={special.birthday || ''} onChange={e => setSpecial(s => ({...s, birthday: e.target.value}))}
                    style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:12, padding:'7px 10px', outline:'none', fontFamily:'Inter,sans-serif' }} />
                  {selectedUser === 'zmsgrove' && <div style={{ color:t.text2, fontSize:10, marginTop:3 }}>ДР admin скрыто — автопост не создаётся</div>}
                </div>
                <div>
                  <div style={{ color:t.text2, fontSize:11, marginBottom:6 }}>🏢 Отделы</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {DEPARTMENTS.map(d => {
                      const sel = (special.departments || []).includes(d);
                      return (
                        <button key={d} onClick={() => setSpecial(s => ({ ...s, departments: sel ? (s.departments||[]).filter(x=>x!==d) : [...(s.departments||[]), d] }))} style={{
                          background: sel ? 'rgba(232,38,58,0.12)' : 'transparent',
                          border:`1px solid ${sel ? 'rgba(232,38,58,0.4)' : t.border}`,
                          borderRadius:20, color: sel ? '#E8263A' : t.text2,
                          fontSize:11, padding:'3px 10px', cursor:'pointer', transition:'all 0.15s',
                        }}>{d}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={save} disabled={saving} style={{
              background: saving ? t.surface2 : '#E8263A', border:'none', borderRadius:10,
              color: saving ? t.text2 : '#fff', fontSize:13, fontWeight:700, padding:'11px',
              cursor: saving ? 'default' : 'pointer', fontFamily:'Unbounded,sans-serif',
            }}>
              {saved ? '✅ Сохранено!' : saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
