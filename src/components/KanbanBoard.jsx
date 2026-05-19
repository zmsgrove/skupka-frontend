import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../supabase';
import LeadCard from './LeadCard';
import LeadModal from './LeadModal';
import StatsBar from './StatsBar';

const API = process.env.REACT_APP_BACKEND_URL;

const COLUMNS = [
  { id: 'new', label: 'Новые', color: '#3b82f6', emoji: '🆕', filterByDate: false, showSum: false },
  { id: 'in_progress', label: 'В работе', color: '#8b5cf6', emoji: '⚡', filterByDate: false, showSum: true },
  { id: 'waiting', label: 'Ждём на филиал', color: '#f59e0b', emoji: '🏪', filterByDate: false, showSum: true },
  { id: 'success', label: 'Успешно', color: '#10b981', emoji: '✅', filterByDate: true, showSum: true },
  { id: 'fail', label: 'Провал', color: '#ef4444', emoji: '❌', filterByDate: true, showSum: false },
];

function getDateRange(dateStr) {
  const start = new Date(dateStr); start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr); end.setHours(23, 59, 59, 999);
  return { start, end };
}

function fmt(n) {
  return new Intl.NumberFormat('ru-KZ').format(n);
}

export default function KanbanBoard({ city, user }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [search, setSearch] = useState('');
  const draggingRef = useRef(null);
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
    let filtered = leads.filter(l => l.status === col.id);

    // Фильтр по дате для успешно/провал
    if (col.filterByDate) {
      const { start, end } = getDateRange(filterDate);
      filtered = filtered.filter(l => {
        const d = new Date(l.updated_at || l.created_at);
        return d >= start && d <= end;
      });
    }

    // Поиск
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(l =>
        l.client_name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.device?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  const getColSum = (colLeads) =>
    colLeads.reduce((sum, l) => sum + (Number(l.estimate_amount) || 0), 0);

  // Просрочка — карточка в "В работе" > 10 часов
  const isOverdue = (lead) => {
    if (lead.status !== 'in_progress') return false;
    const created = new Date(lead.updated_at || lead.created_at);
    const hours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
    return hours > 10;
  };

  // Повторный клиент — тот же номер встречается в других карточках
  const isRepeatClient = (lead) => {
    return leads.filter(l => l.phone === lead.phone && l.id !== lead.id).length > 0;
  };

  const handleDragStart = (e, lead) => {
    draggingRef.current = lead;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault(); e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(colId);
  };

  const handleDrop = async (e, colId) => {
    e.preventDefault(); e.stopPropagation();
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
      <StatsBar city={city} user={user} />

      {totalUnread > 0 && (
        <div style={styles.globalAlert}>
          🔔 {totalUnread} непрочитанных — карточки помечены жёлтым
        </div>
      )}

      {/* Поиск + фильтр даты */}
      <div style={styles.toolbar}>
        <div style={styles.searchWrap}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.searchInput}
            placeholder="Поиск по имени, телефону, технике..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button style={styles.clearSearch} onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <div style={styles.dateWrap}>
          <span style={styles.filterLabel}>📅 Успешно / Провал:</span>
          <input
            type="date"
            value={filterDate}
            max={todayStr}
            onChange={e => setFilterDate(e.target.value)}
            style={styles.dateInput}
          />
          {!isToday && (
            <button style={styles.resetBtn} onClick={() => setFilterDate(todayStr)}>
              Сегодня
            </button>
          )}
        </div>
      </div>

      <div style={styles.board}>
        {COLUMNS.map(col => {
          const colLeads = getColumnLeads(col);
          const isOver = dragOver === col.id;
          const colUnread = colLeads.reduce((sum, l) => sum + (l.unread_count || 0), 0);
          const colSum = col.showSum ? getColSum(colLeads) : 0;

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{col.emoji}</span>
                  <span style={{ ...styles.colTitle, color: col.color }}>{col.label}</span>
                  {colUnread > 0 && (
                    <span style={styles.unreadBadge}>{colUnread}</span>
                  )}
                </div>
                <span style={{ ...styles.badge, background: col.color + '22', color: col.color }}>
                  {colLeads.length}
                </span>
              </div>

              {/* Сумма колонки */}
              {col.showSum && colSum > 0 && (
                <div style={styles.colSum}>
                  {colLeads.length} заявок на {fmt(colSum)} ₸
                  {col.filterByDate && !isToday && (
                    <span style={{ color: '#f0b429', marginLeft: 4 }}>({filterDate})</span>
                  )}
                </div>
              )}

              <div style={styles.cardList}>
                {colLeads.length === 0 && (
                  <div style={{
                    ...styles.empty,
                    border: isOver ? `2px dashed ${col.color}66` : 'none',
                    borderRadius: 8,
                    color: isOver ? col.color : '#9090a8',
                  }}>
                    {isOver ? '➕ Отпусти здесь' : 'Нет заявок'}
                  </div>
                )}
                {colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    colColor={col.color}
                    isDragging={draggingRef.current?.id === lead.id}
                    isOverdue={isOverdue(lead)}
                    isRepeat={isRepeatClient(lead)}
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
    margin: '0 24px 10px',
    background: '#f0b42915', border: '1px solid #f0b42944',
    borderRadius: 10, color: '#f0b429',
    fontSize: 13, fontWeight: 600, padding: '8px 16px',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    margin: '0 24px 14px', gap: 12, flexWrap: 'wrap',
  },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#1a1a22', border: '1px solid #2e2e3e',
    borderRadius: 10, padding: '8px 14px', flex: 1, maxWidth: 360,
  },
  searchIcon: { fontSize: 14 },
  searchInput: {
    background: 'transparent', border: 'none',
    color: '#f0f0f5', fontSize: 13, outline: 'none', flex: 1,
    fontFamily: 'Inter, sans-serif',
  },
  clearSearch: {
    background: 'transparent', border: 'none',
    color: '#9090a8', cursor: 'pointer', fontSize: 12,
  },
  dateWrap: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#1a1a22', border: '1px solid #2e2e3e',
    borderRadius: 10, padding: '8px 14px',
  },
  filterLabel: { color: '#9090a8', fontSize: 12 },
  dateInput: {
    background: '#22222e', border: '1px solid #2e2e3e',
    borderRadius: 7, color: '#f0f0f5', fontSize: 13,
    padding: '4px 8px', outline: 'none', fontFamily: 'Inter, sans-serif',
  },
  resetBtn: {
    background: '#f0b42922', border: '1px solid #f0b42966',
    borderRadius: 7, color: '#f0b429', fontSize: 12,
    padding: '4px 10px', cursor: 'pointer',
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 14, padding: '0 24px 24px',
    minHeight: 'calc(100vh - 220px)', alignItems: 'start',
    overflowX: 'auto',
  },
  column: {
    border: '2px solid', borderRadius: 14, overflow: 'hidden',
    transition: 'border-color 0.15s, background 0.15s',
    minWidth: 200,
  },
  colHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px 10px', borderBottom: '1px solid #2e2e3e',
  },
  colTitle: { fontFamily: 'Unbounded, sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: 0.3 },
  badge: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontFamily: 'Unbounded, sans-serif' },
  unreadBadge: {
    background: '#f0b429', color: '#0f0f13',
    fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 20,
  },
  colSum: {
    padding: '6px 14px', background: '#22222e',
    color: '#9090a8', fontSize: 11, borderBottom: '1px solid #2e2e3e',
  },
  cardList: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 },
  empty: { color: '#9090a8', fontSize: 12, textAlign: 'center', padding: '20px 0', transition: 'all 0.15s' },
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
