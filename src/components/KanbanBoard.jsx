import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import LeadCard from './LeadCard';
import LeadModal from './LeadModal';

const COLUMNS = [
  { id: 'new', label: 'Новые', color: '#3b82f6', emoji: '🆕' },
  { id: 'in_progress', label: 'В работе', color: '#8b5cf6', emoji: '⚡' },
  { id: 'success', label: 'Успешно', color: '#10b981', emoji: '✅' },
  { id: 'fail', label: 'Провал', color: '#ef4444', emoji: '❌' },
];

export default function KanbanBoard({ city, user }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (city !== 'all') query = query.eq('city', city);
    const { data } = await query;
    setLeads(data || []);
    setLoading(false);
  }, [city]);

  useEffect(() => {
    fetchLeads();

    // Realtime подписка
    const channel = supabase
      .channel(`leads-${city}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leads',
      }, () => fetchLeads())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [city, fetchLeads]);

  const getColumnLeads = (status) => leads.filter(l => l.status === status);

  if (loading) return (
    <div style={styles.loading}>
      <div style={styles.spinner} />
      <span>Загрузка заявок...</span>
    </div>
  );

  return (
    <>
      <div style={styles.board}>
        {COLUMNS.map(col => {
          const colLeads = getColumnLeads(col.id);
          return (
            <div key={col.id} style={styles.column}>
              <div style={styles.colHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{col.emoji}</span>
                  <span style={{ ...styles.colTitle, color: col.color }}>{col.label}</span>
                </div>
                <span style={{ ...styles.badge, background: col.color + '22', color: col.color }}>
                  {colLeads.length}
                </span>
              </div>
              <div style={styles.cardList}>
                {colLeads.length === 0 && (
                  <div style={styles.empty}>Нет заявок</div>
                )}
                {colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    colColor={col.color}
                    onClick={() => setSelectedLead(lead)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          user={user}
          onClose={() => setSelectedLead(null)}
          onUpdate={(updated) => {
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            setSelectedLead(updated);
          }}
        />
      )}
    </>
  );
}

const styles = {
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    padding: '0 24px 24px',
    minHeight: 'calc(100vh - 120px)',
    alignItems: 'start',
  },
  column: {
    background: '#1a1a22',
    border: '1px solid #2e2e3e',
    borderRadius: 16,
    overflow: 'hidden',
  },
  colHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 16px 12px',
    borderBottom: '1px solid #2e2e3e',
  },
  colTitle: {
    fontFamily: 'Unbounded, sans-serif',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  badge: {
    fontSize: 12,
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: 20,
    fontFamily: 'Unbounded, sans-serif',
  },
  cardList: {
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 80,
  },
  empty: {
    color: '#9090a8',
    fontSize: 13,
    textAlign: 'center',
    padding: '20px 0',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    height: 300,
    color: '#9090a8',
    fontSize: 14,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #2e2e3e',
    borderTop: '3px solid #f0b429',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
