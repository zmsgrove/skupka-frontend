import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function StatsBar({ city, user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
    const channel = supabase
      .channel('stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchStats)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [city]);

  async function fetchStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let base = supabase.from('leads').select('*');
    if (city !== 'all') base = supabase.from('leads').select('*').eq('city', city);

    const { data: all } = await base;
    if (!all) return;

    const today = all.filter(l => {
      const d = new Date(l.updated_at || l.created_at);
      return d >= todayStart && d <= todayEnd;
    });

    const newToday = today.filter(l => l.status === 'new').length;
    const successToday = today.filter(l => l.status === 'success');
    const successAmount = successToday.reduce((sum, l) => sum + (Number(l.estimate_amount) || 0), 0);
    const inProgress = all.filter(l => l.status === 'in_progress').length;
    const waiting = all.filter(l => l.status === 'waiting').length;
    const totalToday = today.length;
    const conversion = totalToday > 0 ? Math.round((successToday.length / totalToday) * 100) : 0;

    // По городам (только для админа)
    const cityStats = {};
    if (user.role === 'admin') {
      ['Атырау', 'Актобе', 'Уральск'].forEach(c => {
        const citySuccess = today.filter(l => l.status === 'success' && l.city === c);
        cityStats[c] = {
          count: citySuccess.length,
          amount: citySuccess.reduce((sum, l) => sum + (Number(l.estimate_amount) || 0), 0),
        };
      });
    }

    setStats({ newToday, successAmount, successCount: successToday.length, inProgress, waiting, conversion, cityStats });
  }

  if (!stats) return null;

  const fmt = (n) => new Intl.NumberFormat('ru-KZ').format(n);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.cardIcon}>🆕</div>
        <div style={styles.cardVal}>{stats.newToday}</div>
        <div style={styles.cardLabel}>Новых сегодня</div>
      </div>
      <div style={styles.card}>
        <div style={styles.cardIcon}>⚡</div>
        <div style={styles.cardVal}>{stats.inProgress}</div>
        <div style={styles.cardLabel}>В работе</div>
      </div>
      <div style={styles.card}>
        <div style={styles.cardIcon}>🏪</div>
        <div style={styles.cardVal}>{stats.waiting}</div>
        <div style={styles.cardLabel}>Ждём на филиал</div>
      </div>
      <div style={{ ...styles.card, borderColor: '#10b98144' }}>
        <div style={styles.cardIcon}>✅</div>
        <div style={{ ...styles.cardVal, color: '#10b981' }}>{fmt(stats.successAmount)} ₸</div>
        <div style={styles.cardLabel}>Сумма успешных сегодня ({stats.successCount})</div>
      </div>
      <div style={styles.card}>
        <div style={styles.cardIcon}>📊</div>
        <div style={styles.cardVal}>{stats.conversion}%</div>
        <div style={styles.cardLabel}>Конверсия сегодня</div>
      </div>

      {user.role === 'admin' && Object.keys(stats.cityStats).length > 0 && (
        <div style={styles.cityStats}>
          {Object.entries(stats.cityStats).map(([city, s]) => (
            <div key={city} style={styles.cityCard}>
              <span style={styles.cityName}>{city}</span>
              <span style={styles.cityVal}>{s.count} сд. / {fmt(s.amount)} ₸</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '0 24px 16px', flexWrap: 'wrap',
  },
  card: {
    background: '#1a1a22', border: '1px solid #2e2e3e',
    borderRadius: 12, padding: '12px 16px',
    display: 'flex', flexDirection: 'column', gap: 2,
    minWidth: 120,
  },
  cardIcon: { fontSize: 18, marginBottom: 2 },
  cardVal: { fontFamily: 'Unbounded, sans-serif', fontSize: 18, fontWeight: 700, color: '#f0f0f5' },
  cardLabel: { color: '#9090a8', fontSize: 11 },
  cityStats: {
    display: 'flex', gap: 8, flexWrap: 'wrap',
    background: '#1a1a22', border: '1px solid #2e2e3e',
    borderRadius: 12, padding: '10px 16px',
  },
  cityCard: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100 },
  cityName: { color: '#9090a8', fontSize: 11, fontWeight: 600 },
  cityVal: { color: '#f0f0f5', fontSize: 12, fontWeight: 600 },
};
