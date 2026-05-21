import React, { useState } from 'react';

const CHANGELOG = [
  {
    version: 'v2 Patch 3',
    date: '21 мая 2026',
    color: '#10b981',
    changes: [
      'Левый сайдбар 200px/60px с кнопкой свернуть',
      'Навигация перенесена из хедера в сайдбар',
      'Бейдж непрочитанных сообщений на WAZZUP',
      'Заглушки: Чат (v3) и Задачи (v5)',
      'Хедер — только логотип, города, утилиты',
      'Индикатор статуса сервера 🟢/🔴 в хедере',
      'Мобильный режим: гамбургер ☰, сайдбар выезжает сбоку',
    ],
  },
  {
    version: 'v2 Patch 2',
    date: 'Май 2026',
    color: '#f0b429',
    changes: [
      'Логика повторных сообщений исправлена',
      'Новая заявка только если статус closed или тишина 2+ суток',
      'Редактирование имени клиента',
      'WhatsApp имя клиента в карточке',
      'Страница входа — версия, слоган, changelog',
      'Виджет истории изменений',
    ],
  },
  {
    version: 'v2',
    date: 'Май 2026',
    color: '#8b5cf6',
    changes: [
      '5 колонок + Ждём на филиал',
      'Drag & Drop с попапами',
      'Контекстное меню ПКМ',
      'Telegram уведомления',
      'Дашборд с фильтром периода',
      'Excel выгрузка 5 листов',
      'Тёмная и светлая тема',
      'Звуковые уведомления',
      'Авто-возврат из провала',
      '30+ вариантов городов',
    ],
  },
  {
    version: 'v1',
    date: 'Апрель 2026',
    color: '#3b82f6',
    changes: [
      'Базовый канбан 4 колонки',
      'Интеграция Wazzup WhatsApp',
      'Бот сбора заявок',
      'Авторизация по ролям',
      'Realtime Supabase',
    ],
  },
];

export default function ChangelogWidget({ theme }) {
  const t = theme;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        title="История обновлений"
        style={{
          background: t.surface2, border:`1px solid ${t.border}`,
          borderRadius:8, color:'#f0b429', fontSize:13,
          padding:'5px 10px', cursor:'pointer',
          display:'flex', alignItems:'center', gap:6,
          fontFamily:'Inter,sans-serif',
          position:'relative',
        }}
      >
        📋
        <span style={{ background:'#10b981', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:10, fontFamily:'Unbounded,sans-serif' }}>
          v2p3
        </span>
      </button>

      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:1500 }} onClick={() => setOpen(false)} />
          <div style={{
            position:'fixed', top:64, right:16,
            width:320, maxHeight:'80vh',
            background:t.surface, border:`1px solid ${t.border}`,
            borderRadius:16, boxShadow:t.shadow,
            zIndex:1600, overflow:'hidden',
            display:'flex', flexDirection:'column',
          }}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text }}>
                  📋 История обновлений
                </div>
                <div style={{ color:t.text2, fontSize:11, marginTop:2 }}>SKUPKA CRM</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background:'transparent', border:'none', color:t.text2, fontSize:16, cursor:'pointer' }}>✕</button>
            </div>

            <div style={{ overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:20 }}>
              {CHANGELOG.map((entry, i) => (
                <div key={entry.version}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{
                      background: entry.color+'22', color:entry.color,
                      border:`1px solid ${entry.color}44`,
                      fontFamily:'Unbounded,sans-serif', fontSize:9, fontWeight:700,
                      padding:'2px 8px', borderRadius:20,
                    }}>{entry.version}</span>
                    <span style={{ color:t.text2, fontSize:11 }}>{entry.date}</span>
                    {i===0 && <span style={{ background:'#10b98122', color:'#10b981', fontSize:9, padding:'1px 6px', borderRadius:10 }}>НОВОЕ</span>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {entry.changes.map((c, j) => (
                      <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:6 }}>
                        <span style={{ color:entry.color, fontSize:9, marginTop:3, flexShrink:0 }}>●</span>
                        <span style={{ color: i===0?t.text3:t.text2, fontSize:12, lineHeight:1.5 }}>{c}</span>
                      </div>
                    ))}
                  </div>
                  {i < CHANGELOG.length-1 && (
                    <div style={{ height:1, background:t.border, marginTop:16 }} />
                  )}
                </div>
              ))}
            </div>

            <div style={{ padding:'12px 20px', borderTop:`1px solid ${t.border}`, textAlign:'center', color:t.text2, fontSize:11 }}>
              SKUPKA CRM · <span style={{ color:'#10b981' }}>v2 patch 3</span> · 2026
            </div>
          </div>
        </>
      )}
    </>
  );
}
