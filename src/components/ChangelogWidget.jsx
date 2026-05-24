import React, { useState } from 'react';

const CHANGELOG = [
  {
    version: '2.2.6',
    date: 'Май 2026',
    color: '#E8263A',
    changes: [
      'Умный бот Wazzup: 4-шаговый диалог, Claude Haiku для разбора, двуязычность (ру/кз)',
      'Защита от спама: задержка 2с, тишина после 5+ сообщений подряд',
      'Обработка медиа: фото, голосовые, стикеры — бот отвечает текстовой подсказкой',
      'Кнопка управления ботом в карточке лида — включить/остановить в один клик',
      'Новый формат ТГ уведомлений: SKUPKA CRM с описанием, временем, городом',
      'Разделение смены: Отметка на смене (СПО) и Отметка о прибытии (Адм)',
      'Фильтры дат: Сегодня / Неделя / Месяц / Произвольный период',
      'Анимация ассистента: кольца летят свободно по разным 3D осям',
    ],
  },
  {
    version: '2.2.6',
    date: 'Май 2026',
    color: '#E8263A',
    changes: [
      'Орбитальная анимация — 5 эллипсоидных колец (Кольца Сатурна) на кнопке ассистента',
      'Тёмный фон кнопки, ядро 20px с cyan glow, скорости 3–8s / 0.5s при запросе',
      'Смена СПО и Смена Админ разделены — каждая роль видит только своё',
      'Управление доступами: только Директор и admin, admin/dir не отображаются в списке',
      'Дашборд: если в Supabase can_view=true — показывается вне зависимости от роли',
    ],
  },
  {
    version: '2.2.3',
    date: 'Май 2026',
    color: '#E8263A',
    changes: [
      'Акцентный цвет #E8263A применён по всему интерфейсу (сайдбар, хедер, логотип, страница входа)',
      'Орбитальная анимация ассистента — 5 эллипсоидных орбит в стиле атомных орбит',
    ],
  },
  {
    version: '2.2.2',
    date: 'Май 2026',
    color: '#E8263A',
    changes: [
      'CRM ассистент: умный роутинг — быстро для общих вопросов, поиск только при оценке',
      'Обновлён системный промпт: маржа, формула OLX, корректировки состояния',
      'Орбитальная анимация кнопки ассистента — cyan glow, 3 кольца в разных плоскостях',
      'Акцентный цвет #E8263A по всему интерфейсу ассистента',
      'Фильтр городов: передаёт контекст OLX/Каспи по конкретному городу',
    ],
  },
  {
    version: '2.2.1',
    date: 'Май 2026',
    color: '#06b6d4',
    changes: [
      'Фикс: модель API claude-sonnet-4-5',
      'Фикс: insert в Supabase assistant_history',
      'Web search подключён и работает',
    ],
  },
  {
    version: '2.2.0',
    date: 'Май 2026',
    color: '#8b5cf6',
    changes: [
      'CRM ассистент: плавающая кнопка, чат, web_search',
      'Голосовой ввод (ru-RU)',
      'История переписки 24ч в Supabase',
      'Логирование API URL, реальные ошибки в консоли',
    ],
  },
  {
    version: '2.1.1',
    date: 'Май 2026',
    color: '#8b5cf6',
    changes: [
      'Drag & Drop в Кассе, ЗРС и Отметке на смене',
      'ПКМ-меню в Задачах, Кассе, ЗРС, Смене',
      'Удаление: admin — сразу, остальные — запрос на удаление',
      'StatsBar: отступ 21px от хедера (Фибоначчи)',
      'Фикс: сводка в настройках теперь скроллится',
      'Обновлён changelog — реальная история версий',
    ],
  },
  {
    version: '2.1.0',
    date: 'Май 2026',
    color: '#f0b429',
    changes: [
      'Система Фибоначчи: пространство, отступы, радиусы',
      'Glassmorphism: хедер, сайдбар, карточки, модалки',
      'LeadCard: современный дизайн, мягкие тени',
      'LoginPage: обновлённый дизайн с blur-фоном',
      'StatsBar: одинаковый размер всех карточек',
      '10 тем оформления — без изменений',
    ],
  },
  {
    version: '2.0.7',
    date: 'Май 2026',
    color: '#10b981',
    changes: [
      'Фильтр утро/вечер в блоке Касса сводки',
      'Карточки StatsBar — единый размер и шрифт',
      'Настройки сводки открываются корректно',
    ],
  },
  {
    version: '2.0.6',
    date: 'Май 2026',
    color: '#3b82f6',
    changes: [
      'Настройки сводки продублированы в SettingsPage',
      'Стартовый экран сохраняется в Supabase (cross-device sync)',
      'Касса: разделение списков запустивших по утреннему/вечернему отчёту',
      'Сводка: исправлена фильтрация смен — показывает сегодняшний день',
    ],
  },
  {
    version: '2.0.5',
    date: 'Май 2026',
    color: '#10b981',
    changes: [
      'Фикс: калькулятор теперь открывается из сайдбара',
      'Фикс: скролл только внутри колонок канбана',
      'Фикс: фон не скроллится при открытой сводке',
      'Убран дублированный таймер автооткрытия сводки',
    ],
  },
  {
    version: '2.0.4',
    date: 'Май 2026',
    color: '#f59e0b',
    changes: [
      'Добавлен Калькулятор в сайдбаре',
      'Переработана Сводка: новый дизайн, расширенные метрики',
      'Обновлён StatsBar — быстрые фильтры',
      'Фикс LeadCard, KanbanBoard',
    ],
  },
  {
    version: '2.0.3',
    date: 'Май 2026',
    color: '#f59e0b',
    changes: [
      'Фикс скролла колонок канбана',
      'Рефакторинг App.jsx',
    ],
  },
  {
    version: '2.0.2',
    date: 'Май 2026',
    color: '#06b6d4',
    changes: [
      'Переработана KassaPage: форма отчёта, валидация документов',
      'Обновлена AttendancePage — улучшен UX смен',
      'ZrsPage — переработан интерфейс',
      'LoginPage — обновлён дизайн',
    ],
  },
  {
    version: '2.0.1',
    date: 'Май 2026',
    color: '#06b6d4',
    changes: [
      'Первые фиксы после релиза 2.0',
      'Стабилизация Сводки и автооткрытия',
    ],
  },
  {
    version: '2.0',
    date: 'Май 2026',
    color: '#f0b429',
    changes: [
      'Сводка — попап с аналитикой, автооткрытие 09:00/14:00/21:00',
      'Тренд-индикаторы ↑↓ по всем метрикам',
      'Сравнение недели с предыдущей неделей',
      'Аналитика по городам с динамикой',
      'Лучший день недели по сделкам',
      'Брендинг: Лучше чем Все!',
      'Версионирование 2.0',
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
        <span style={{ background:'#E8263A', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:10, fontFamily:'Unbounded,sans-serif' }}>2.2.6</span>
      </button>
      {open && (
        <>
          <div style={{ position:'fixed', inset:0, zIndex:1500 }} onClick={() => setOpen(false)} />
          <div style={{ position:'fixed', top:64, right:16, width:320, maxHeight:'80vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, boxShadow:t.shadow, zIndex:1600, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'16px 20px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text }}>📋 История обновлений</div>
                <div style={{ color:t.text2, fontSize:11, marginTop:2 }}>SKUPKA CRM · v2.2.6</div>
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
              SKUPKA CRM · <span style={{ color:'#E8263A' }}>2.2.6</span> · 2026
            </div>
          </div>
        </>
      )}
    </>
  );
}
