import React from 'react';

export default function KassaPage({ user, theme }) {
  const t = theme;

  const buttons = [
    { label:'🌅 Утренний отчёт', desc:'Открытие смены, остаток кассы' },
    { label:'🌆 Вечерний отчёт', desc:'Закрытие смены, итоги дня' },
    { label:'🔄 Пересменка',     desc:'Передача кассы между сменами' },
  ];

  return (
    <div style={{ padding:'0 24px 40px', maxWidth:560 }}>
      <div style={{ padding:'20px 0 24px' }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:20, fontWeight:700, color:t.text }}>💰 Касса</div>
        <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>Управление кассовыми операциями</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {buttons.map(btn => (
          <button key={btn.label} disabled style={{
            background:t.surface, border:`1px solid ${t.border}`,
            borderRadius:14, padding:'20px 24px',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            cursor:'not-allowed', opacity:0.5, textAlign:'left',
          }}>
            <div>
              <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:600, color:t.text, marginBottom:4 }}>{btn.label}</div>
              <div style={{ color:t.text2, fontSize:12 }}>{btn.desc}</div>
            </div>
            <span style={{ color:t.text2, fontSize:20 }}>›</span>
          </button>
        ))}
      </div>

      <div style={{ marginTop:24, padding:'14px 18px', background:'rgba(240,180,41,0.07)', border:'1px solid rgba(240,180,41,0.2)', borderRadius:12, color:t.text2, fontSize:12 }}>
        🚧 Функционал кассы в разработке
      </div>
    </div>
  );
}
