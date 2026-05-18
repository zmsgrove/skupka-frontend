import React from 'react';

const CITY_COLORS = {
  'Атырау': '#f59e0b',
  'Актобе': '#06b6d4',
  'Уральск': '#a78bfa',
};

export default function LeadCard({ lead, colColor, onClick }) {
  const date = new Date(lead.created_at).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });

  const cityColor = CITY_COLORS[lead.city] || '#9090a8';

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={{ ...styles.topBar, background: colColor + '22', borderColor: colColor + '44' }}>
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
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#22222e',
    border: '1px solid #2e2e3e',
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
    ':hover': { transform: 'translateY(-2px)' },
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    border: '0 0 1px 0',
    borderStyle: 'solid',
  },
  cityTag: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 20,
    fontFamily: 'Unbounded, sans-serif',
  },
  date: {
    color: '#9090a8',
    fontSize: 11,
  },
  body: {
    padding: '10px 12px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  name: {
    color: '#f0f0f5',
    fontWeight: 600,
    fontSize: 14,
  },
  phone: {
    color: '#9090a8',
    fontSize: 12,
  },
  device: {
    color: '#c0c0d8',
    fontSize: 13,
    marginTop: 4,
  },
  amount: {
    color: '#f0b429',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 4,
  },
};
