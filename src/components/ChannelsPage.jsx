import React from 'react';

const CHANNELS = [
  { name: 'Instagram Уральск', handle: '@skupka_oral', icon: '📸', url: 'https://www.instagram.com/skupka_oral/', color: '#E1306C', desc: 'Уральск' },
  { name: 'Instagram Атырау', handle: '@skupka_atyrau_', icon: '📸', url: 'https://www.instagram.com/skupka_atyrau_/', color: '#E1306C', desc: 'Атырау' },
  { name: 'Instagram Актобе', handle: '@skupka_aqtobe', icon: '📸', url: 'https://www.instagram.com/skupka_aqtobe/', color: '#E1306C', desc: 'Актобе' },
  { name: 'WhatsApp Канал', handle: 'SKUPKA CRM', icon: '💬', url: 'https://whatsapp.com/channel/0029Vag5dVYJP2184pWnKl0H', color: '#25D366', desc: 'Все города' },
];

export default function ChannelsPage({ theme }) {
  const t = theme;
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '0 0 40px' }}>
      <div style={{ padding: '18px 24px 16px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ fontFamily: 'Unbounded,sans-serif', fontSize: 17, fontWeight: 700, color: t.text }}>📡 Каналы</div>
        <div style={{ color: t.text2, fontSize: 12, marginTop: 2 }}>Официальные каналы SKUPKA CRM · {CHANNELS.length} канала</div>
      </div>

      <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {CHANNELS.map(ch => (
          <ChannelCard key={ch.url} channel={ch} t={t} />
        ))}
      </div>

      <div style={{ padding: '0 24px' }}>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontFamily: 'Unbounded,sans-serif', fontSize: 11, fontWeight: 600, color: t.text2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Зачем следить</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['📢 Актуальные акции и предложения по выкупу', '📸 Фото принятой техники и оценок', '🔔 Анонсы обновлений и новостей', '💬 Обратная связь от клиентов'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#E8263A', fontSize: 9, marginTop: 4, flexShrink: 0 }}>●</span>
                <span style={{ color: t.text2, fontSize: 13 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({ channel: ch, t }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <a href={ch.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: t.surface,
          border: `1px solid ${hovered ? ch.color : t.border}`,
          borderRadius: 18, padding: '28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(12px)',
          boxShadow: hovered ? `0 8px 32px ${ch.color}22` : undefined,
          transform: hovered ? 'translateY(-2px)' : 'none',
        }}
      >
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: ch.color + '18', border: `2px solid ${ch.color}${hovered ? '88' : '33'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, transition: 'border-color 0.2s' }}>
          {ch.icon}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: t.text, fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{ch.name}</div>
          <div style={{ color: ch.color, fontSize: 12, fontWeight: 600 }}>{ch.handle}</div>
          <div style={{ color: t.text2, fontSize: 11, marginTop: 4 }}>📍 {ch.desc}</div>
        </div>
        <div style={{ background: ch.color + (hovered ? '25' : '15'), color: ch.color, fontSize: 11, fontWeight: 700, padding: '6px 18px', borderRadius: 20, border: `1px solid ${ch.color}${hovered ? '66' : '33'}`, transition: 'all 0.2s', fontFamily: 'Unbounded,sans-serif' }}>
          Открыть →
        </div>
      </div>
    </a>
  );
}
