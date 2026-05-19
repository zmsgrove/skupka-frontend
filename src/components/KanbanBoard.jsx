import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../supabase';
import LeadCard from './LeadCard';
import LeadModal from './LeadModal';

const API = process.env.REACT_APP_BACKEND_URL;

const COLUMNS = [
  { id: 'new', label: 'Новые', color: '#3b82f6', emoji: '🆕', filterByDate: false },
  { id: 'in_progress', label: 'В работе', color: '#8b5cf6', emoji: '⚡', filterByDate: false },
  { id: 'success', label: 'Успешно', color: '#10b981', emoji: '✅', filterByDate: true },
  { id: 'fail', label: 'Провал', color: '#ef4444', emoji: '❌', filterByDate: true },
];

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getDateRange(dateStr) {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function KanbanBoard({ city, user }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const draggingRef = useRef(null);

  // Дата фильтра для успешно/провал (по умолчанию сегодня)
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(todayStr);

  const fetchLeads = useCallback(async () => {
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

  const getColumnLeads = (col) => {
    const filtered = leads.filter(l => l.status === col.id);
    if (!col.filterByDate) return filtered;

    // Для успешно/провал — фильтруем по выбранной дате
    const { start, end } = getDateRange(filterDate);
    return filtered.filter(l => {
      const d = new Date(l.updated_at || l.created_at);
      return d >= new Date(start) && d <= new Date(end);
    });
  };

  const handleDragStart = (e, lead) => {
    draggingRef.current = lead;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colId);
  };

  const handleDrop = async (e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const lead = draggingRef.current;
    draggingRef.current = null;
    if (!lead || lead.status === colId) return;
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: colId } : l));
    try {
      await axios.patch(`${API}/api/leads/${lead.id}`, { status: colId });
    } catch (err) {
      console.error('❌ Drag error:', err);
      fetchLeads();
    }
  };

  const handleDragEnd = () => {
    draggingRef.current = null;
    setDragOver(null);
  };

  const handleCardClick = async (lead) => {
    setSelectedLead(lead);
    if (lead.unread_count > 0) {
      await axios.post(`${API}/api/leads/${lead.id}/read`);
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, unread_count: 0 } : l));
    }
  };

  const totalUnread = leads.reduce((sum, l) => sum + (l.unread_count || 0), 0);

  const isToday = filterDate === todayStr;

  if (loading) return (
    <div style={styles.loading}>
      <div style={styles.spinner} />
      <span>Загрузка заявок...</span>
    </div>
  );

  return (
    <>
      {totalUnread > 0 && (
        <div style={styles.globalAlert}>
          🔔 Есть {totalUnread} непрочитанных сообщений — карточки помечены жёлтым
        </div>
      )}

      {/* Панель фильтра даты */}
      <div style={styles.filterBar}>
        <div style={styles.filterLeft}>
          <span style={styles.filterLabel}>📅 Успешно и Провал:</span>
          <button
            style={{ ...styles.filterBtn, ...(isToday ? styles.filterBtnActive : {}) }}
            onClick={() => setFilterDate(todayStr)}
          >
            Сегодня
          </button>
          <button
            style={{ ...styles.filterBtn, ...(!isToday ? styles.filterBtnActive : {}) }}
            onClick={() => {}}
          >
            Выбрать дату
          </button>
        </div>
        <div style={styles.filterRight}>
          <input
            type="date"
            value={filterDate}
            max={todayStr}
            onChange={e => setFilterDate(e.target.value)}
            style={styles.dateInput}
          />
          {!isToday && (
            <button style={styles.resetBtn} onClick={() => setFilterDate(todayStr)}>
              ✕ Сброс
            </button>
          )}
        </div>
      </div>

      <div style={styles.board}>
        {COLUMNS.map(col => {
          const colLeads = getColumnLeads(col);
          const isOver = dragOver === col.id;
          const colUnread = colLeads.reduce((sum, l) => sum + (l.unread_count || 0), 0);

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
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null);
              }}
            >
              <div style={styles.colHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{col.emoji}</span>
                  <span style={{ ...styles.colTitle, color: col.color }}>{col.label}</span>
                  {colUnread > 0 && (
                    <span style={styles.unreadColBadge}>{colUnread}</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {col.filterByDate && (
                    <span style={styles.dateTag}>
                      {isToday ? 'сегодня' : filterDate}
                    </span>
                  )}
                  <span style={{ ...styles.badge, background: col.color + '22', color: col.color }}>
                    {colLeads.length}
                  </span>
                </div>
              </div>

              <div style={styles.cardList}>
                {colLeads.length === 0 && (
                  <div style={{
                    ...styles.empty,
                    border: isOver ? `2px dashed ${col.color}66` : 'none',
                    borderRadius: 8,
                    color: isOver ? col.color : '#9090a8',
                  }}>
                    {isOver ? '➕ Отпусти здесь' : col.filterByDate ? `Нет за ${isToday ? 'сегодня' : filterDate}` : 'Нет заявок'}
                  </div>
                )}
                {colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    colColor={col.color}
                    isDragging={draggingRef.current?.id === lead.id}
                    onClick={() => handleCardClick(lead)}
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
  globalAlert: {
    margin: '0 24px 12px',
    background: '#f0b42915', border: '1px solid #f0b42944',
    borderRadius: 10, color: '#f0b429',
    fontSize: 13, fontWeight: 600, padding: '10px 16px',
  },
  filterBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    margin: '0 24px 16px',
    background: '#1a1a22', border: '1px solid #2e2e3e',
    borderRadius: 12, padding: '10px 16px',
    gap: 12,
  },
  filterLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  filterLabel: { color: '#9090a8', fontSize: 12, fontWeight: 600 },
  filterBtn: {
    background: 'transparent', border: '1px solid #2e2e3e',
    borderRadius: 8, color: '#9090a8', fontSize: 12,
    padding: '5px 12px', cursor: 'pointer', transition: 'all 0.15s',
  },
  filterBtnActive: {
    background: '#f0b42922', borderColor: '#f0b42966',
    color: '#f0b429',
  },
  filterRight: { display: 'flex', alignItems: 'center', gap: 8 },
  dateInput: {
    background: '#22222e', border: '1px solid #2e2e3e',
    borderRadius: 8, color: '#f0f0f5', fontSize: 13,
    padding: '5px 10px', outline: 'none',
    fontFamily: 'Inter, sans-serif',
  },
  resetBtn: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 8, color: '#ef4444', fontSize: 12,
    padding: '5px 10px', cursor: 'pointer',
  },
  dateTag: {
    color: '#9090a8', fontSize: 10,
    background: '#22222e', border: '1px solid #2e2e3e',
    borderRadius: 6, padding: '2px 6px',
  },
  board: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16, padding: '0 24px 24px',
    minHeight: 'calc(100vh - 180px)', alignItems: 'start',
  },
  column: {
    border: '2px solid', borderRadius: 16, overflow: 'hidden',
    transition: 'border-color 0.15s, background 0.15s',
  },
  colHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 16px 12px', borderBottom: '1px solid #2e2e3e',
  },
  colTitle: { fontFamily: 'Unbounded, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: 0.5 },
  badge: { fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontFamily: 'Unbounded, sans-serif' },
  unreadColBadge: {
    background: '#f0b429', color: '#0f0f13',
    fontSize: 10, fontWeight: 700,
    padding: '1px 6px', borderRadius: 20,
    fontFamily: 'Unbounded, sans-serif',
  },
  cardList: { padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 80 },
  empty: { color: '#9090a8', fontSize: 13, textAlign: 'center', padding: '20px 0', transition: 'all 0.15s' },
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
