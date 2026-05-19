import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../supabase';
import LeadCard from './LeadCard';
import LeadModal from './LeadModal';

const API = process.env.REACT_APP_BACKEND_URL;

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
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);

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
    const channel = supabase
      .channel(`leads-${city}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [city, fetchLeads]);

  const getColumnLeads = (status) => leads.filter(l => l.status === status);

  const handleDragStart = (e, lead) => {
    setDragging(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colId);
  };

  const handleDrop = async (e, colId) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging || dragging.status === colId) return;
    setLeads(prev => prev.map(l => l.id === dragging.id ? { ...l, status: colId } : l));
    try {
      await axios.patch(`${API}/api/leads/${dragging.id}`, { status: colId });
    } catch (err) {
      console.error('❌ Drag error:', err);
      fetchLeads();
    }
    setDragging(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

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
          const isOver = dragOver === col.id;
          return (
            <div
              key={col.id}
              style={{
                ...styles.column,
                borderColor: isOver ? col.color : '#2e2e3e',
                background: isOver ? col.color + '0a' : '#1a1a22',
              }}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              onDragLeave={() => setDragOver(null)}
            >
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
                  <div style={{
                    ...styles.empty,
                    border: isOver ? '2px dashed' : 'none',
                    borderColor: col.color + '44',
                    borderRadius: 8,
                  }}>
                    {isOver ? '➕ Перетащи сюда' : 'Нет заявок'}
                  </div>
                )}
                {colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    colColor={col.color}
                    isDragging={dragging?.id === lead.id}
                    onClick={() => setSelectedLead(lead)}
                    onDragStart={(e) => handleDragStart(e, lead)}
                    onDragEnd={handleDragEnd}
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
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16, padding: '0 24px 24px',
    minHeight: 'calc(100vh - 120px)', alignItems: 'start',
  },
  column: {
    border: '1px solid', borderRadius: 16, overflow: 'hidden',
    transition: 'border-color 0.15s, background 0.15s',
  },
  colHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 16px 12px', borderBottom: '1px solid #2e2e3e',
  },
  colTitle: { fontFamily: 'Unbounded, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: 0.5 },
  badge: { fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontFamily: 'Unbounded, sans-serif' },
  cardList: { padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 80 },
  empty: { color: '#9090a8', fontSize: 13, textAlign: 'center', padding: '20px 0' },
  loading: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 16, height: 300, color: '#9090a8', fontSize: 14,
  },
  spinner: {
    width: 32, height: 32, border: '3px solid #2e2e3e',
    borderTop: '3px solid #f0b429', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
