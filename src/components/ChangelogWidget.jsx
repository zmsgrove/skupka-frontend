import React, { useState } from 'react';

const CHANGELOG = [
  {
    version: 'v3',
    date: 'Май 2026',
    color: '#10b981',
    changes: [
      'Чат между сотрудниками — общий и приватные',
      'Реакции на сообщения в чате',
      'Логотип SKUPKA CRM всегда виден в хедере',
      'Страница настроек в сайдбаре',
      'Регулировка громкости уведомлений',
      'Выбор главного экрана при входе',
      'Компактный вид карточек',
      'Управление таймером и автообновлением',
      'Сумма заявок в шапке колонок канбана',
      'Касса — заглушка (утренний/вечерний отчёт, пересменка)',
      'ЗРС и Отметка на смене — заглушки v6',
      'Топ-5 причин провалов с кнопкой «Показать все»',
    ],
  },
  {
    version: 'v2 Patch 3',
    date: '21 мая 2026',
    color: '#06b6d4',
    changes: [
      'Левый сайдбар 200px/60px — навигация вынесена из хедера',
      'Сайдбар сворачивается и запоминает состояние',
      'Бейдж непрочитанных сообщений на пункте WAZZUP',
      'Хедер — логотип, города, утилиты',
      'Индикатор статуса сервера 🟢/🔴 с пингом каждые 30 сек',
      'Мобильный режим — гамбургер ☰, сайдбар выезжает сбоку',
    ],
  },
  {
    version: 'v2 Patch 2',
    date: '21 мая 2026',
    color: '#f0b429',
    changes: [
      'Фикс ошибок',
    ],
  },
  {
    version: 'v2 Patch 1',
    date: '21 мая 2026',
    color: '#f0b429',
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
    color: '#8b5cf6',
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
    color: '#3b82f6',
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

export default function ChangelogWidget({ theme }) {
  const t = theme;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(!open)} title="История обновлений" style={{
        background:t.surface2, border:`1px solid ${t.border}`,
        borderRadius:8, color:'#f0b429', fontSize:13,
        padding:'5px 10px', cursor:'pointer',
        display:'flex', alignItems:'center', gap:6, fontFamily:'Inter,sans-serif', position:'relative',
      }}>
        📋
        <span style={{ background:'#10b981', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:10, fontFamily:'Unbounded,sans-serif' }}>v3</span>
      </button>

      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:1500 }} onClick={() => setOpen(false)} />
          <div style={{ position:'fixed', top:64, right:16, width:320, maxHeight:'80vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, boxShadow:t.shadow, zIndex:1600, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text }}>📋 История обновлений</div>
                <div style={{ color:t.text2, fontSize:11, marginTop:2 }}>SKUPKA CRM</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background:'transparent', border:'none', color:t.text2, fontSize:16, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:20 }}>
              {CHANGELOG.map((entry, i) => (
                <div key={entry.version}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ background:entry.color+'22', color:entry.color, border:`1px solid ${entry.color}44`, fontFamily:'Unbounded,sans-serif', fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{entry.version}</span>
                    <span style={{ color:t.text2, fontSize:11 }}>{entry.date}</span>
                    {i===0 && <span style={{ background:'#10b98122', color:'#10b981', fontSize:9, padding:'1px 6px', borderRadius:10 }}>НОВОЕ</span>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {entry.changes.map((c, j) => (
                      <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:6 }}>
                        <span style={{ color:entry.color, fontSize:9, marginTop:3, flexShrink:0 }}>●</span>
                        <span style={{ color:i===0?t.text3:t.text2, fontSize:12, lineHeight:1.5 }}>{c}</span>
                      </div>
                    ))}
                  </div>
                  {i < CHANGELOG.length-1 && <div style={{ height:1, background:t.border, marginTop:16 }} />}
                </div>
              ))}
            </div>
            <div style={{ padding:'12px 20px', borderTop:`1px solid ${t.border}`, textAlign:'center', color:t.text2, fontSize:11 }}>
              SKUPKA CRM · <span style={{ color:'#10b981' }}>v3</span> · 2026
            </div>
          </div>
        </>
      )}
    </>
  );
}
