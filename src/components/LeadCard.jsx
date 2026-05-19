import React from 'react';

const CITY_COLORS = {
  'Атырау': '#f59e0b',
  'Актобе': '#06b6d4',
  'Уральск': '#a78bfa',
};

export default function LeadCard({ lead, colColor, onClick, onDragStart, onDragEnd, isDragging, isOverdue, isRepeat }) {
  const date = new Date(lead.created_at).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
  const cityColor = CITY_COLORS[lead.city] || '#9090a8';
  const hasUnread = lead.unread_count > 0;

  // Просрочка имеет приоритет над непрочитанными
  const borderColor = isOverdue ? '#ef4444' : hasUnread ? '#f0b429' : '#2e2e3e';
  const glowColor = isOverdue ? '#ef444433' : hasUnread ? '#f0b42933' : 'none';

  return (
    <div
      draggable="true"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        ...styles.card,
        opacity: isDragging ? 0.4 : 1,
        borderColor,
        boxShadow: glowColor !== 'none' ? `0 0 0 1px ${glowColor}` : 'none',
      }}
    >
      {/* Просрочка */}
      {isOverdue && (
        <div style={{ ...styles.alertBar, background: '#ef444418', borderColor: '#ef444433' }}>
          <span>🔴</span>
          <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>Просрочено 10+ часов</span>
        </div>
      )}

      {/* Непрочитанные */}
      {!isOverdue && hasUnread && (
        <div style={{ ...styles.alertBar, background: '#f0b42915', borderColor: '#f0b42933' }}>
          <span style={{ color: '#f0b429', fontSize: 10 }}>●</span>
          <span style={{ color: '#f0b429', fontSize: 11, fontWeight: 600, flex: 1 }}>
            {lead.unread_count} новое сообщение{lead.unread_count > 1 ? 'я' : ''}
          </span>
          <span style={styles.unreadBadge}>{lead.unread_count}</span>
        </div>
      )}

      {/* Повторный клиент */}
      {isRepeat && (
        <div style={{ ...styles.alertBar, background: '#06b6d418', borderColor: '#06b6d433' }}>
          <span>🔄</span>
          <span style={{ color: '#06b6d4', fontSize: 11, fontWeight: 600 }}>Повторный клиент</span>
        </div>
      )}

      <div style={{ ...styles.topBar, background: colColor + '22', borderBottom: `1px solid ${colColor}44` }}>
        <span style={{ ...styles.cityTag, color: cityColor, background: cityColor + '18' }}>
          {lead.city}
        </span>
        <span style={styles.date}>{date}</span>
      </div>

      <div style={styles.body}>
        <div style={styles.name}>{lead.client_name}</div>
        <div style={styles.phone}>{lead.phone}</div>
        <div style={styles.device}>📱 {lead.device}</div>
        {lead.estimate_amount && (
          <div style={styles.amount}>
            💰 {new Intl.NumberFormat('ru-KZ').format(lead.estimate_amount)} ₸
          </div>
        )}
        {lead.visit_date && (
          <div style={styles.visitDate}>
            📅 Придёт: {new Date(lead.visit_date).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>
      <div style={styles.dragHint}>⠿ перетащи для смены статуса</div>
    </div>
  );
}

const styles = {
  card: {
    background: '#22222e', border: '1px solid',
    borderRadius: 12, overflow: 'hidden',
    cursor: 'grab', userSelect: 'none',
    transition: 'transform 0.15s, opacity 0.15s, border-color 0.2s',
  },
  alertBar: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderBottom: '1px solid',
  },
  unreadBadge: {
    background: '#f0b429', color: '#0f0f13',
    fontSize: 10, fontWeight: 700,
    padding: '1px 6px', borderRadius: 20,
  },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' },
  cityTag: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, fontFamily: 'Unbounded, sans-serif' },
  date: { color: '#9090a8', fontSize: 11 },
  body: { padding: '10px 12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
  name: { color: '#f0f0f5', fontWeight: 600, fontSize: 14 },
  phone: { color: '#9090a8', fontSize: 12 },
  device: { color: '#c0c0d8', fontSize: 13, marginTop: 4 },
  amount: { color: '#f0b429', fontSize: 13, fontWeight: 600, marginTop: 4 },
  visitDate: { color: '#06b6d4', fontSize: 12, marginTop: 4 },
  dragHint: { color: '#4a4a5e', fontSize: 10, textAlign: 'center', padding: '4px 0 6px' },
};
