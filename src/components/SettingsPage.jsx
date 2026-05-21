import React, { useState } from 'react';
import { getSettings, saveSettings } from '../App';

const CITY_OPTIONS = ['Атырау','Актобе','Уральск'];
const HOME_TAB_OPTIONS = [
  { value:'board',     label:'💬 WAZZUP (Доска)' },
  { value:'dashboard', label:'📊 Дашборд' },
  { value:'chat',      label:'🗨️ Чат' },
  { value:'tasks',     label:'✅ Задачи' },
];

export default function SettingsPage({ user, theme, settings, onUpdate }) {
  const t = theme;

  const handleVolume = (e) => onUpdate({ volume: Number(e.target.value) });
  const handleSound  = () => onUpdate({ sound: !(settings.sound !== false) });
  const handleTheme  = (v) => onUpdate({ theme: v });
  const handleHomeTab = (v) => onUpdate({ homeTab: v });
  const handleHomeCity = (v) => onUpdate({ homeCity: v });
  const handleCompact  = () => onUpdate({ compact: !settings.compact });
  const handleTimers   = () => onUpdate({ showTimers: settings.showTimers === false ? true : false });
  const handleAutoRefresh = (v) => onUpdate({ autoRefresh: v });

  const volume = settings.volume ?? 40;
  const soundOn = settings.sound !== false;
  const themeName = settings.theme || 'dark';
  const showTimers = settings.showTimers !== false;
  const compact = !!settings.compact;
  const autoRefresh = settings.autoRefresh || 'off';
  const homeTab = settings.homeTab || 'board';
  const homeCity = settings.homeCity || user.cities[0];

  return (
    <div style={{ padding:'0 24px 40px', maxWidth:640 }}>
      <div style={{ padding:'20px 0 24px' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:20, fontWeight:700, color:t.text }}>⚙️ Настройки</div>
        <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>Персональные настройки интерфейса</div>
      </div>

      {/* Sound */}
      <Section title="🔔 Уведомления" t={t}>
        <Row label="Звук уведомлений" t={t}>
          <Toggle value={soundOn} onChange={handleSound} t={t} />
        </Row>
        <Row label={`Громкость — ${volume}%`} t={t}>
          <input type="range" min={0} max={100} value={volume} onChange={handleVolume}
            style={{ width:'100%', accentColor:'#f0b429', cursor:'pointer' }} />
        </Row>
      </Section>

      {/* Theme */}
      <Section title="🎨 Оформление" t={t}>
        <Row label="Тема" t={t}>
          <div style={{ display:'flex', gap:8 }}>
            {[['dark','🌙 Тёмная'],['light','☀️ Светлая']].map(([val,label]) => (
              <button key={val} onClick={() => handleTheme(val)} style={{
                background: themeName===val ? 'rgba(240,180,41,0.15)' : 'transparent',
                border:`1px solid ${themeName===val ? 'rgba(240,180,41,0.5)' : t.border}`,
                borderRadius:8, color: themeName===val ? '#f0b429' : t.text2,
                fontSize:12, padding:'6px 14px', cursor:'pointer', transition:'all 0.15s',
              }}>{label}</button>
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

      {/* Home screen */}
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

      {/* Auto refresh */}
      <Section title="🔄 Автообновление" t={t}>
        <Row label="Принудительно обновлять каждые" t={t}>
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

      {/* Info */}
      <div style={{ marginTop:8, padding:'14px 18px', background:t.surface, border:`1px solid ${t.border}`, borderRadius:12 }}>
        <div style={{ color:t.text2, fontSize:12 }}>
          👤 <b style={{ color:t.text }}>{user.name}</b> · {user.username} · роль: <b style={{ color:'#f0b429' }}>{user.role}</b>
        </div>
        <div style={{ color:t.text2, fontSize:11, marginTop:4 }}>
          Города: {user.cities.join(', ')}
        </div>
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

function Row({ label, children, t }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderBottom:`1px solid ${t.border}22`, gap:16, flexWrap:'wrap' }}>
      <span style={{ color:t.text3, fontSize:13, minWidth:180 }}>{label}</span>
      <div style={{ flex:1, minWidth:160 }}>{children}</div>
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
