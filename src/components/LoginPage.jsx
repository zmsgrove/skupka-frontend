import React, { useState, useEffect } from 'react';
import { login, saveSession } from '../auth';

const SLOGANS = [
  "Скупаем быстро. Управляем умно.",
  "Каждая заявка на счету.",
  "Твой центр управления скупкой.",
  "Заявки под контролем. Сделки в плюсе.",
  "Технику в деньги. Быстро и чётко.",
  "Один экран — весь бизнес.",
  "От заявки до сделки — без потерь.",
  "Контроль над каждым клиентом.",
  "Скупка под управлением.",
  "Больше сделок. Меньше хаоса.",
  "Система которая не спит.",
  "Каждый клиент на виду.",
  "Скорость решает. Мы помогаем.",
  "Прозрачность на каждом этапе.",
  "Сделки закрываются здесь.",
  "Твоя команда всегда в теме.",
  "Заявки не теряются.",
  "От звонка до договора — всё здесь.",
  "Управляй, а не угадывай.",
  "CRM которая работает пока ты спишь.",
  "Три города. Один экран.",
  "Данные в реальном времени.",
  "Клиент написал — ты уже знаешь.",
];

const CHANGELOG = [
  {
    version: 'v2 Patch 1',
    date: '21 мая 2026',
    changes: [
      'Логика повторных сообщений — диалог без создания лишних заявок',
      'Новая заявка только если статус closed или тишина 2+ суток',
      'Редактирование имени клиента в карточке',
      'WhatsApp имя клиента сохраняется и отображается',
      'Страница входа — версия, слоган, история изменений',
      'Виджет changelog на доске',
    ],
  },
  {
    version: 'v2',
    date: 'Май 2026',
    changes: [
      '5 колонок канбан включая Ждём на филиал',
      'Drag & Drop с попапами при переносе статуса',
      'Контекстное меню (ПКМ) на карточках',
      'Telegram уведомления — новые заявки и расписание',
      'Дашборд с фильтром периода для директора и РГМ',
      'Excel выгрузка 5 листов с диаграммами',
      'Тёмная и светлая тема',
      'Звуковые уведомления',
      'Таймер на карточках',
      'Авто-возврат из провала через 2 недели',
      'Архивирование через 3 месяца',
      'Расширенный список городов 30+ вариантов',
      'Меню для повторных клиентов (1/2)',
      '11 пользователей с ролями',
    ],
  },
  {
    version: 'v1',
    date: 'Апрель 2026',
    changes: [
      'Базовый канбан — 4 колонки',
      'Интеграция с Wazzup WhatsApp',
      'Бот — сбор имени, города, техники',
      'Авторизация по логину и паролю',
      'Realtime через Supabase',
      'Деплой на Render',
    ],
  },
];

export default function LoginPage({ onLogin, theme }) {
  const t = theme || {
    bg:'#0f0f13', surface:'#1a1a22', surface2:'#22222e',
    border:'#2e2e3e', text:'#f0f0f5', text2:'#9090a8',
    accent:'#f0b429', inputBg:'#22222e',
  };

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slogan] = useState(() => SLOGANS[Math.floor(Math.random() * SLOGANS.length)]);
  const [showChangelog, setShowChangelog] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    await new Promise(r => setTimeout(r, 400));
    const user = login(username, password);
    if (user) { saveSession(user); onLogin(user); }
    else setError('Неверный логин или пароль');
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'radial-gradient(ellipse at 50% 0%, #2a1f00 0%, #0f0f13 60%)' }}>

      {/* Левая часть — форма */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ width:'100%', maxWidth:400 }}>
          {/* Лого */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:32, fontWeight:700, color:'#f0b429', letterSpacing:3 }}>SKUPKA</span>
            <span style={{ background:'#f0b429', color:'#0f0f13', fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:6 }}>CRM</span>
          </div>

          {/* Слоган */}
          <p style={{ color:'#9090a8', fontSize:13, marginBottom:40, fontStyle:'italic' }}>
            {slogan}
          </p>

          {/* Форма */}
          <div style={{ background:'#1a1a22', border:'1px solid #2e2e3e', borderRadius:20, padding:'36px 32px', boxShadow:'0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:16, fontWeight:600, color:'#f0f0f5', marginBottom:24 }}>
              Войти в систему
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ color:'#9090a8', fontSize:12, fontWeight:500, letterSpacing:0.5, display:'block', marginBottom:6 }}>ЛОГИН</label>
                <input style={inputStyle} type="text" value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Введите логин" autoFocus required />
              </div>
              <div>
                <label style={{ color:'#9090a8', fontSize:12, fontWeight:500, letterSpacing:0.5, display:'block', marginBottom:6 }}>ПАРОЛЬ</label>
                <input style={inputStyle} type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Введите пароль" required />
              </div>
              {error && (
                <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#ef4444', fontSize:13, padding:'10px 14px', textAlign:'center' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={{
                background:'#f0b429', border:'none', borderRadius:10,
                color:'#0f0f13', fontFamily:'Unbounded,sans-serif',
                fontSize:13, fontWeight:700, padding:'14px',
                cursor:'pointer', marginTop:8, letterSpacing:1,
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? 'Входим...' : 'Войти'}
              </button>
            </form>
          </div>

          {/* Версия */}
          <div style={{ textAlign:'center', marginTop:20, color:'#4a4a5e', fontSize:11 }}>
            SKUPKA CRM · <span style={{ color:'#f0b429' }}>v2 patch 1</span> · 2026
          </div>
        </div>
      </div>

      {/* Правая часть — changelog */}
      <div style={{ width:360, borderLeft:'1px solid #2e2e3e', padding:'40px 28px', overflowY:'auto', display:'flex', flexDirection:'column', gap:0 }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:'#f0f0f5', marginBottom:4 }}>
          📋 История обновлений
        </div>
        <div style={{ color:'#9090a8', fontSize:12, marginBottom:24 }}>
          Что нового в системе
        </div>

        {CHANGELOG.map((entry, i) => (
          <div key={entry.version} style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{
                background: i===0?'#f0b429':'#2e2e3e',
                color: i===0?'#0f0f13':'#9090a8',
                fontFamily:'Unbounded,sans-serif', fontSize:10, fontWeight:700,
                padding:'3px 10px', borderRadius:20,
              }}>{entry.version}</span>
              <span style={{ color:'#4a4a5e', fontSize:11 }}>{entry.date}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {entry.changes.map((c, j) => (
                <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                  <span style={{ color: i===0?'#f0b429':'#4a4a5e', fontSize:10, marginTop:2, flexShrink:0 }}>•</span>
                  <span style={{ color: i===0?'#c0c0d8':'#6a6a7e', fontSize:12, lineHeight:1.5 }}>{c}</span>
                </div>
              ))}
            </div>
            {i < CHANGELOG.length-1 && (
              <div style={{ height:1, background:'#2e2e3e', margin:'20px 0 0' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  background:'#22222e', border:'1px solid #2e2e3e',
  borderRadius:10, color:'#f0f0f5', fontSize:15,
  padding:'12px 16px', outline:'none', width:'100%',
  fontFamily:'Inter,sans-serif',
};
