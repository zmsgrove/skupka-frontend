import React, { useState } from 'react';

const CHANGELOG = [
  {
    version: 'v6 + v7',
    date: 'Май 2026',
    color: '#06b6d4',
    changes: [
      'ЗРС — заявки на расход ДС, канбан 5 колонок',
      'Согласование заявок: РКО с кассы или безнал',
      'Отметка на смене — СПО и Админ состав',
      'Геолокация для Админ состава',
      'Ссылка на карту по локации',
      'Ролевой доступ для всех разделов',
    ],
  },
  {
    version: 'v5',
    date: 'Май 2026',
    color: '#f0b429',
    changes: [
      'Полноценная касса — утренний и вечерний отчёт',
      'Канбан кассы — 3 колонки: утро, вечер, завершённые',
      'Форма отчёта — наличные, безнал, расхождения, документы',
      'Доступы по ролям — филиалы видят свои, РГМ свой город',
      'Tilda — заглушка (заявки с сайта · v8)',
    ],
  },
  {
    version: 'v4',
    date: 'Май 2026',
    color: '#8b5cf6',
    changes: [
      'Полноценный канбан задач — 5 колонок с drag & drop',
      'Карточка задачи — чеклист, комментарии, история, теги',
      'Виды: Канбан, Календарь, Моя доска',
      'Шаблоны задач — сохранить и повторно использовать',
      'Повторяющиеся задачи — ежедневно/еженедельно/ежемесячно',
      'Архив задач — автоматически через 15 дней',
      'Статистика задач для администраторов',
      'Поиск, фильтры, сортировка по задачам',
      'Быстрое создание и закрытие задач',
      'Избранное, закрепление, цвет карточки',
    ],
  },
  {
    version: 'v3 Patch 4',
    date: 'Май 2026',
    color: '#06b6d4',
    changes: [
      'Заглушки с описанием: Касса, ЗРС, Отметка на смене',
      'Обновлена дорожная карта версий',
    ],
  },
  {
    version: 'v3 Patch 3',
    date: 'Май 2026',
    color: '#06b6d4',
    changes: [
      'Telegram уведомления разделены по 3 городам',
      'Утренний отчёт, просрочки, новые заявки — в свой канал',
    ],
  },
  {
    version: 'v3 Patch 2',
    date: 'Май 2026',
    color: '#06b6d4',
    changes: [
      '10 тем оформления от тёмной до светлой',
      '10 вариантов звука уведомлений с превью',
      'Страницы ЗРС и Отметка на смене в сайдбаре',
    ],
  },
  {
    version: 'v3 Patch 1',
    date: 'Май 2026',
    color: '#06b6d4',
    changes: [
      'Чат — исправлена загрузка (user.id → user.username)',
      'Быстрые фильтры StatsBar починены',
      'Дашборд — фильтр по городу для администраторов',
      'Страница входа — форма по центру',
    ],
  },
  {
    version: 'v3',
    date: 'Май 2026',
    color: '#10b981',
    changes: [
      'Чат между сотрудниками — общий и приватные',
      'Реакции на сообщения в чате',
      'Страница настроек — громкость, тема, главный экран',
      'Сумма заявок в шапке колонок канбана',
      'Касса, ЗРС, Смена — заглушки',
      'Топ-5 причин провалов в дашборде',
    ],
  },
  {
    version: 'v2 Patch 3',
    date: '21 мая 2026',
    color: '#f0b429',
    changes: [
      'Левый сайдбар 200px/60px',
      'Индикатор статуса сервера 🟢/🔴',
      'Мобильный гамбургер ☰',
    ],
  },
  {
    version: 'v2',
    date: 'Май 2026',
    color: '#3b82f6',
    changes: [
      '5 колонок канбан включая Ждём на филиал',
      'Drag & Drop, контекстное меню, Telegram',
      'Дашборд, Excel, темы, звук, таймер',
    ],
  },
  {
    version: 'v1',
    date: 'Апрель 2026',
    color: '#6b7280',
    changes: [
      'Базовый канбан, Wazzup, бот, авторизация',
    ],
  },
];

export default function ChangelogWidget({ theme }) {
  const t = theme;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)} title="История обновлений" style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:8, color:'#8b5cf6', fontSize:13, padding:'5px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'Inter,sans-serif' }}>
        📋
        <span style={{ background:'#f0b429', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:10, fontFamily:'Unbounded,sans-serif' }}>v6+v7</span>
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
                    {i===0 && <span style={{ background:'#8b5cf622', color:'#8b5cf6', fontSize:9, padding:'1px 6px', borderRadius:10 }}>НОВОЕ</span>}
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
              SKUPKA CRM · <span style={{ color:'#8b5cf6' }}>v6+v7</span> · 2026
            </div>
          </div>
        </>
      )}
    </>
  );
}
