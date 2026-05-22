import React from 'react';

const KASSA_ITEMS = [
  {
    emoji: '🌅',
    title: 'Пересменка кассира (утро)',
    desc: 'Приём кассы от ночной смены. Пересчёт остатка, подпись в журнале передачи.',
    version: 'v6',
    color: '#f59e0b',
  },
  {
    emoji: '🌆',
    title: 'Пересменка кассира (вечер)',
    desc: 'Сдача кассы ночной смене. Итоговый остаток, подпись обеих сторон.',
    version: 'v6',
    color: '#8b5cf6',
  },
  {
    emoji: '📋',
    title: 'X-Отчёт',
    desc: 'Промежуточный отчёт без обнуления счётчиков. Снимается в течение смены для контроля.',
    version: 'v6',
    color: '#06b6d4',
  },
  {
    emoji: '📊',
    title: 'Z-Отчёт',
    desc: 'Итоговый отчёт по закрытию смены с обнулением счётчиков. Фиксирует все операции за день.',
    version: 'v6',
    color: '#10b981',
  },
  {
    emoji: '💵',
    title: 'Покупюрная ведомость',
    desc: 'Подсчёт купюр по номиналам: 200₸, 500₸, 1000₸, 2000₸, 5000₸, 10000₸, 20000₸. Итоговая сумма.',
    version: 'v6',
    color: '#f0b429',
  },
];

export default function KassaPage({ user, theme }) {
  const t = theme;
  return (
    <div style={{ padding:'0 24px 40px', maxWidth:640 }}>
      <div style={{ padding:'20px 0 24px' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:20, fontWeight:700, color:t.text }}>💰 Касса</div>
        <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>Управление кассовыми операциями филиала</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {KASSA_ITEMS.map(item => (
          <div key={item.title} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:'20px 24px', opacity:0.6 }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
              <span style={{ fontSize:32, flexShrink:0 }}>{item.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text }}>{item.title}</span>
                  <span style={{ background:item.color+'22', color:item.color, border:`1px solid ${item.color}44`, fontFamily:'Unbounded,sans-serif', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>{item.version}</span>
                </div>
                <div style={{ color:t.text2, fontSize:12, lineHeight:1.6 }}>{item.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:20, padding:'14px 18px', background:'rgba(240,180,41,0.07)', border:'1px solid rgba(240,180,41,0.2)', borderRadius:12, color:t.text2, fontSize:12 }}>
        🚧 Полный функционал кассы выйдет в v6
      </div>
    </div>
  );
}
