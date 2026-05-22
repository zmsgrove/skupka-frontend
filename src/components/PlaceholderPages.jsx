import React from 'react';

export function TasksPage({ theme }) {
  return (
    <PlaceholderPage
      emoji="✅" title="Задачи" version="v4" versionColor="#8b5cf6"
      slogan="Работаем вместе!"
      description="Личные и командные задачи с дедлайнами, приоритетами и статусами."
      features={[
        '📋 Личные задачи — создавай и отслеживай свои задачи',
        '👥 Назначение задач — ставь задачи сотрудникам',
        '⏰ Дедлайны — сроки выполнения с напоминаниями',
        '🔴 Приоритеты — высокий, средний, низкий',
        '📊 Статусы — новая, в работе, на проверке, выполнена',
        '🔔 Уведомления — напоминания о задачах',
      ]}
      t={theme}
    />
  );
}

export function KassaPage({ theme }) {
  return (
    <PlaceholderPage
      emoji="💰" title="Касса" version="v5" versionColor="#f0b429"
      slogan="Деньги любят счёт!"
      description="Управление кассовыми операциями: пересменка, отчёты и покупюрная ведомость."
      features={[
        '🌅 Пересменка кассира (утро) — приём кассы, пересчёт остатка',
        '🌆 Пересменка кассира (вечер) — сдача кассы, итоговый остаток',
        '📋 X-Отчёт — промежуточный отчёт без обнуления счётчиков',
        '📊 Z-Отчёт — итоговый отчёт закрытия смены',
        '💵 Покупюрная ведомость — подсчёт по номиналам купюр',
      ]}
      t={theme}
    />
  );
}

export function ZrsPage({ theme }) {
  return (
    <PlaceholderPage
      emoji="📝" title="ЗРС" version="v6" versionColor="#06b6d4"
      slogan="Контроль каждого тенге!"
      description="Заявка на расход денежных средств. Подача, согласование и контроль расходов."
      features={[
        '💸 Создание заявки — сумма, цель, обоснование',
        '✅ Согласование — директор или зам. директор',
        '📋 История заявок — все расходы в одном месте',
        '📊 Аналитика расходов по категориям',
      ]}
      t={theme}
    />
  );
}

export function AttendancePage({ theme }) {
  return (
    <PlaceholderPage
      emoji="🕐" title="Отметка на смене" version="v7" versionColor="#10b981"
      slogan="Всегда на месте!"
      description="Учёт рабочего времени сотрудников. Кто, когда и на каком филиале на смене."
      features={[
        '📍 Отметка прихода и ухода на смену',
        '🏢 Привязка к филиалу',
        '👔 Отметка для административного состава',
        '📊 Табель — история присутствия за период',
        '🔔 Уведомление директору о начале смены',
      ]}
      t={theme}
    />
  );
}

function PlaceholderPage({ emoji, title, version, versionColor, slogan, description, features, t }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh', padding:24 }}>
      <div style={{ maxWidth:480, textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>{emoji}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:8 }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:22, fontWeight:700, color:t.text }}>{title}</span>
          <span style={{ background:versionColor+'22', color:versionColor, border:`1px solid ${versionColor}44`, fontFamily:'Unbounded,sans-serif', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20 }}>{version}</span>
        </div>
        <div style={{ color:versionColor, fontFamily:'Unbounded,sans-serif', fontSize:12, fontWeight:700, marginBottom:12 }}>{slogan}</div>
        <p style={{ color:t.text2, fontSize:14, lineHeight:1.7, marginBottom:24 }}>{description}</p>
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:'20px 24px', textAlign:'left' }}>
          <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:600, color:t.text2, marginBottom:14, textTransform:'uppercase', letterSpacing:1 }}>Что будет доступно</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <span style={{ color:versionColor, fontSize:10, marginTop:4, flexShrink:0 }}>●</span>
                <span style={{ color:t.text3, fontSize:13, lineHeight:1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop:16, color:t.text2, fontSize:12 }}>
          🚧 Выйдет в <span style={{ color:versionColor, fontWeight:700 }}>{version}</span>
        </div>
      </div>
    </div>
  );
}
