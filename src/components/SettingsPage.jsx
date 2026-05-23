import React, { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../App';
import { themes } from '../theme';
import { supabase } from '../supabase';

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

export default function SettingsPage({ user, theme, settings, onUpdate }) {
  const t = theme;
  const isAdmin = ['admin','dir','zamdir','rgmu','rgma'].includes(user.role);
  const [summaryConfig, setSummaryConfig] = useState(DEFAULT_SUMMARY_CONFIG);
  const [summarySaving, setSummarySaving] = useState(false);

  useEffect(() => {
    supabase.from('user_settings').select('summary_config').eq('user_id', user.username).single()
      .then(({ data }) => { if (data?.summary_config) setSummaryConfig({ ...DEFAULT_SUMMARY_CONFIG, ...data.summary_config }); })
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
    <div style={{ padding:'0 24px 40px', maxWidth:700 }}>
      <div style={{ padding:'20px 0 24px' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:20, fontWeight:700, color:t.text }}>⚙️ Настройки</div>
        <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>Персональные настройки интерфейса</div>
      </div>

      {/* Уведомления */}
      <Section title="🔔 Уведомления" t={t}>
        <Row label="Звук уведомлений" t={t}>
          <Toggle value={soundOn} onChange={handleSound} t={t} />
        </Row>
        <Row label={`Громкость — ${volume}%`} t={t}>
          <input type="range" min={0} max={100} value={volume} onChange={handleVolume}
            style={{ width:'100%', accentColor:'#f0b429', cursor:'pointer' }} />
        </Row>
        <Row label="Тип звука" t={t} vertical>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, width:'100%' }}>
            {SOUNDS.map(s => (
              <button key={s.id} onClick={() => handleSoundType(s.id)} style={{
                background: soundType===s.id ? 'rgba(240,180,41,0.15)' : t.surface2,
                border:`1px solid ${soundType===s.id ? 'rgba(240,180,41,0.5)' : t.border}`,
                borderRadius:10, padding:'10px 6px', cursor:'pointer', textAlign:'center',
                transition:'all 0.15s',
              }}>
                <div style={{ fontSize:18 }}>{s.label.split(' ')[0]}</div>
                <div style={{ color: soundType===s.id ? '#f0b429' : t.text, fontSize:11, fontWeight:600, marginTop:3 }}>{s.label.split(' ').slice(1).join(' ')}</div>
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
                border:`2px solid ${themeName===key ? '#f0b429' : th.border}`,
                borderRadius:10, padding:'10px 6px', cursor:'pointer', textAlign:'center',
                transition:'all 0.15s', position:'relative',
              }}>
                {themeName===key && <div style={{ position:'absolute', top:4, right:4, width:8, height:8, borderRadius:'50%', background:'#f0b429' }} />}
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
                <input type="radio" name="homeTab" value={opt.value} checked={homeTab===opt.value} onChange={() => handleHomeTab(opt.value)} style={{ accentColor:'#f0b429' }} />
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
                  background: homeCity===city ? 'rgba(240,180,41,0.15)' : 'transparent',
                  border:`1px solid ${homeCity===city ? 'rgba(240,180,41,0.5)' : t.border}`,
                  borderRadius:8, color: homeCity===city ? '#f0b429' : t.text2,
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
                background: autoRefresh===val ? 'rgba(240,180,41,0.15)' : 'transparent',
                border:`1px solid ${autoRefresh===val ? 'rgba(240,180,41,0.5)' : t.border}`,
                borderRadius:8, color: autoRefresh===val ? '#f0b429' : t.text2,
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

      {/* Инфо */}
      <div style={{ padding:'14px 18px', background:t.surface, border:`1px solid ${t.border}`, borderRadius:12 }}>
        <div style={{ color:t.text2, fontSize:12 }}>
          👤 <b style={{ color:t.text }}>{user.name}</b> · {user.username} · роль: <b style={{ color:'#f0b429' }}>{user.role}</b>
        </div>
        <div style={{ color:t.text2, fontSize:11, marginTop:4 }}>Города: {user.cities.join(', ')}</div>
      </div>
    </div>
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
    <div onClick={onChange} style={{ width:44, height:24, borderRadius:12, background: value ? '#f0b429' : t.border, cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left: value ? 23 : 3, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  );
}
