import React, { useState } from 'react';
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
  "Больше сделок. Меньше хаоса.",
  "Система которая не спит.",
  "Три города. Один экран.",
];

const CHANGELOG = [
  {
    version: '2.0',
    date: 'Май 2026',
    changes: [
      'Касса — утренний и вечерний отчёт',
      'Канбан кассы с ролевым доступом',
      'Tilda — заглушка v8',
    ],
  },
  {
    version: '2.0',
    date: 'Май 2026',
    changes: [
      'Полноценный канбан задач — 5 колонок',
      'Чеклист, комментарии, история изменений',
      'Виды: Канбан, Календарь, Моя доска',
      'Шаблоны и повторяющиеся задачи',
      'Архив задач через 15 дней',
    ],
  },
  {
    version: 'v3',
    date: 'Май 2026',
    changes: [
      'Чат между сотрудниками',
      'Настройки: темы, звук, главный экран',
      'Telegram разделён по 3 городам',
      'Сумма в шапке колонок канбана',
    ],
  },
  {
    version: 'v2',
    date: 'Май 2026',
    changes: [
      'Канбан 5 колонок, Drag & Drop',
      'Дашборд, Excel, темы, звук',
      'Сайдбар, статус сервера, мобайл',
    ],
  },
  {
    version: 'v1',
    date: 'Апрель 2026',
    changes: [
      'Базовый канбан, Wazzup, бот',
      'Авторизация, Realtime, Render',
    ],
  },
];

const VERSION_COLORS = ['#8b5cf6','#10b981','#3b82f6','#6b7280'];

export default function LoginPage({ onLogin, theme }) {
  const t = theme || { bg:'#0f0f13', surface:'#1a1a22', border:'#2e2e3e', text:'#f0f0f5', text2:'#9090a8' };
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [slogan]                = useState(() => SLOGANS[Math.floor(Math.random()*SLOGANS.length)]);

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
    <div style={{ height:'100vh', display:'flex', overflow:'hidden', background:'radial-gradient(ellipse at 30% 20%, #1a0a2e 0%, #0f0f13 55%), radial-gradient(ellipse at 80% 80%, #0a1a1f 0%, transparent 60%)' }}>
      {/* Left */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24, overflow:'hidden' }}>
        <div style={{ width:'100%', maxWidth:400 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:32, fontWeight:700, color:'#f0b429', letterSpacing:3 }}>SKUPKA</span>
            <span style={{ background:'#f0b429', color:'#0f0f13', fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:8 }}>CRM</span>
          </div>
          <p style={{ color:'#9090a8', fontSize:13, marginBottom:8, fontStyle:'italic' }}>{slogan}</p>
          <p style={{ fontFamily:'Unbounded,sans-serif', fontSize:9, color:'#f0b42988', letterSpacing:2, marginBottom:34 }}>Лучше чем Все!</p>
          <div style={{ background:'rgba(26,26,34,0.80)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:21, padding:'34px 32px', boxShadow:'0 32px 80px rgba(0,0,0,0.5)', backdropFilter:'blur(20px)' }}>
            <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:15, fontWeight:700, color:'#f0f0f5', marginBottom:21 }}>Войти в систему</div>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ color:'#9090a8', fontSize:11, fontWeight:600, display:'block', marginBottom:8, letterSpacing:0.5 }}>ЛОГИН</label>
                <input style={inp} type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Введите логин" autoFocus required />
              </div>
              <div>
                <label style={{ color:'#9090a8', fontSize:11, fontWeight:600, display:'block', marginBottom:8, letterSpacing:0.5 }}>ПАРОЛЬ</label>
                <input style={inp} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Введите пароль" required />
              </div>
              {error && <div style={{ background:'rgba(239,68,68,0.10)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:13, color:'#ef4444', fontSize:13, padding:'10px 14px', textAlign:'center' }}>{error}</div>}
              <button type="submit" disabled={loading} style={{ background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', border:'none', borderRadius:13, color:'#fff', fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, padding:'14px', cursor:'pointer', marginTop:8, opacity:loading?0.7:1, boxShadow:'0 4px 16px rgba(139,92,246,0.35)', transition:'all 0.18s' }}>
                {loading ? 'Входим...' : 'Войти'}
              </button>
            </form>
          </div>
          <div style={{ textAlign:'center', marginTop:21, color:'#4a4a5e', fontSize:11 }}>
            SKUPKA CRM · <span style={{ color:'#f0b429' }}>2.1.0</span> · 2026
          </div>
        </div>
      </div>

      {/* Right - scrollable changelog */}
      <div style={{ width:360, borderLeft:'1px solid rgba(255,255,255,0.08)', padding:'40px 28px', overflowY:'auto', display:'flex', flexDirection:'column', background:'rgba(255,255,255,0.02)', backdropFilter:'blur(4px)' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:'#f0f0f5', marginBottom:4 }}>📋 История обновлений</div>
        <div style={{ color:'#9090a8', fontSize:12, marginBottom:21 }}>Что нового в системе</div>
        {CHANGELOG.map((entry, i) => (
          <div key={entry.version} style={{ marginBottom:21 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ background:VERSION_COLORS[i]+'22', color:VERSION_COLORS[i], border:`1px solid ${VERSION_COLORS[i]}44`, fontFamily:'Unbounded,sans-serif', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:21 }}>{entry.version}</span>
              <span style={{ color:'#4a4a5e', fontSize:11 }}>{entry.date}</span>
              {i===0 && <span style={{ background:VERSION_COLORS[0]+'18', color:VERSION_COLORS[0], fontSize:9, padding:'2px 7px', borderRadius:13 }}>НОВОЕ</span>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {entry.changes.map((c, j) => (
                <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                  <span style={{ color:VERSION_COLORS[i], fontSize:10, marginTop:3, flexShrink:0 }}>◆</span>
                  <span style={{ color:i===0?'#c0c0d8':'#6a6a7e', fontSize:12, lineHeight:1.5 }}>{c}</span>
                </div>
              ))}
            </div>
            {i < CHANGELOG.length-1 && <div style={{ height:1, background:'rgba(255,255,255,0.06)', margin:'18px 0 0' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

const inp = { background:'rgba(34,34,46,0.70)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:13, color:'#f0f0f5', fontSize:14, padding:'12px 16px', outline:'none', width:'100%', fontFamily:'Inter,sans-serif', backdropFilter:'blur(4px)', transition:'border-color 0.18s' };
