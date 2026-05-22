import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../supabase';
import LeadCard from './LeadCard';
import LeadModal from './LeadModal';
import StatsBar from './StatsBar';
import DragDropModal from './DragDropModal';
import ContextMenu from './ContextMenu';

const API = process.env.REACT_APP_BACKEND_URL;

const COLUMNS = [
  { id:'new',         label:'Новые',          color:'#3b82f6', emoji:'🆕', filterByDate:false, showSum:false, timerOn:true },
  { id:'in_progress', label:'В работе',        color:'#8b5cf6', emoji:'⚡', filterByDate:false, showSum:true,  timerOn:true },
  { id:'waiting',     label:'Ждём на филиал',  color:'#f59e0b', emoji:'🏪', filterByDate:false, showSum:true,  timerOn:true },
  { id:'success',     label:'Успешно',         color:'#10b981', emoji:'✅', filterByDate:true,  showSum:true,  timerOn:false },
  { id:'fail',        label:'Провал',          color:'#ef4444', emoji:'❌', filterByDate:true,  showSum:true,  timerOn:false },
];

const POPUP_STATUSES = ['in_progress','waiting','success','fail'];

function getDateRange(dateStr) {
  const start = new Date(dateStr); start.setHours(0,0,0,0);
  const end   = new Date(dateStr); end.setHours(23,59,59,999);
  return { start, end };
}

function fmt(n) { return new Intl.NumberFormat('ru-KZ').format(Math.round(n||0)); }

export default function KanbanBoard({ city, user, theme, settings = {} }) {
  const t = theme;
  const showTimers = settings.showTimers !== false;
  const compact    = settings.compact === true;

  const [leads, setLeads]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [dragOver, setDragOver]     = useState(null);
  const [search, setSearch]         = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [dragPopup, setDragPopup]   = useState(null);
  const [collapsed, setCollapsed]   = useState({});
  const [statsFilter, setStatsFilter] = useState(null);
  const draggingRef = useRef(null);
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(todayStr);
  const [ticker, setTicker]         = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTicker(t => t+1), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeads = useCallback(async () => {
    let query = supabase.from('leads').select('*')
      .eq('is_deleted',false).eq('is_archived',false)
      .order('created_at',{ascending:false});
    if (city !== 'all') query = query.eq('city',city);
    const { data } = await query;
    setLeads(data||[]);
    setLoading(false);
  }, [city]);

  useEffect(() => {
    fetchLeads();
    const channel = supabase.channel(`leads-${city}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},() => fetchLeads())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [city, fetchLeads]);

  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const getColumnLeads = (col) => {
    let filtered = leads.filter(l => l.status === col.id);
    if (col.filterByDate) {
      const { start, end } = getDateRange(filterDate);
      filtered = filtered.filter(l => { const d = new Date(l.updated_at||l.created_at); return d>=start && d<=end; });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(l => l.client_name?.toLowerCase().includes(q) || l.phone?.includes(q) || l.device?.toLowerCase().includes(q));
    }
    if (statsFilter === 'overdue') {
      filtered = filtered.filter(l => (Date.now()-new Date(l.updated_at||l.created_at).getTime()) > 10*3600*1000);
    }
    return filtered;
  };

  const toggleCollapse = (colId) => setCollapsed(prev => ({ ...prev, [colId]: !prev[colId] }));
  const isOverdue = (lead) => lead.status==='in_progress' && (Date.now()-new Date(lead.updated_at||lead.created_at).getTime()) > 10*3600*1000;
  const isRepeatClient = (lead) => leads.filter(l => l.phone===lead.phone && l.id!==lead.id).length > 0;

  const handleDragStart = (e, lead) => { draggingRef.current = lead; e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain',lead.id); };
  const handleDragOver  = (e, colId) => { e.preventDefault(); e.stopPropagation(); setDragOver(colId); };
  const handleDrop = async (e, colId) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(null);
    const lead = draggingRef.current; draggingRef.current = null;
    if (!lead || lead.status===colId) return;
    if (POPUP_STATUSES.includes(colId)) { setDragPopup({ lead, toStatus:colId }); }
    else { await updateLeadStatus(lead.id, { status:colId }); }
  };
  const handleDragEnd = () => { draggingRef.current=null; setDragOver(null); };

  const updateLeadStatus = async (id, data) => {
    setLeads(prev => prev.map(l => l.id===id ? {...l,...data} : l));
    try { await axios.patch(`${API}/api/leads/${id}`, data); }
    catch(err) { console.error('❌ Update error:',err); fetchLeads(); }
  };

  const handleDragPopupConfirm = async (data) => {
    if (!dragPopup) return;
    await updateLeadStatus(dragPopup.lead.id, data);
    setDragPopup(null);
  };

  const handleCardClick = async (lead) => {
    setSelectedLead(lead);
    if (lead.unread_count > 0) {
      await axios.post(`${API}/api/leads/${lead.id}/read`);
      setLeads(prev => prev.map(l => l.id===lead.id ? {...l,unread_count:0} : l));
    }
  };

  const handleContextMenu = (e, lead) => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, lead }); };
  const handleDelete = async (lead) => {
    if (!window.confirm(`Удалить карточку ${lead.client_name}?`)) return;
    await axios.delete(`${API}/api/leads/${lead.id}`);
    setLeads(prev => prev.filter(l => l.id !== lead.id));
  };

  const totalUnread = leads.reduce((s,l) => s+(l.unread_count||0), 0);
  const isToday = filterDate === todayStr;

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:400,flexDirection:'column',gap:16,color:t.text2 }}>
      <div style={{ width:36,height:36,border:`3px solid ${t.border}`,borderTop:'3px solid #f0b429',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
      <span style={{ fontSize:14 }}>Загрузка заявок...</span>
    </div>
  );

  return (
    <>
      <StatsBar city={city} user={user} theme={t} onFilter={setStatsFilter} />

      {totalUnread > 0 && (
        <div style={{ margin:'0 24px 10px',background:'rgba(240,180,41,0.1)',border:'1px solid rgba(240,180,41,0.3)',borderRadius:10,color:'#f0b429',fontSize:13,fontWeight:600,padding:'8px 16px' }}>
          🔔 {totalUnread} непрочитанных — карточки помечены жёлтым
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',margin:'0 24px 14px',gap:12,flexWrap:'wrap' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:'8px 14px',flex:1,maxWidth:340 }}>
          <span>🔍</span>
          <input style={{ background:'transparent',border:'none',color:t.text,fontSize:13,outline:'none',flex:1,fontFamily:'Inter,sans-serif' }}
            placeholder="Поиск по имени, телефону, технике..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button style={{ background:'transparent',border:'none',color:t.text2,cursor:'pointer',fontSize:12 }} onClick={() => setSearch('')}>✕</button>}
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:8,background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:'8px 14px' }}>
          <span style={{ color:t.text2,fontSize:12 }}>📅 Успешно / Провал:</span>
          <input type="date" value={filterDate} max={todayStr} onChange={e => setFilterDate(e.target.value)}
            style={{ background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:7,color:t.text,fontSize:13,padding:'4px 8px',outline:'none' }} />
          {!isToday && <button onClick={() => setFilterDate(todayStr)} style={{ background:'rgba(240,180,41,0.15)',border:'1px solid rgba(240,180,41,0.4)',borderRadius:7,color:'#f0b429',fontSize:12,padding:'4px 10px',cursor:'pointer' }}>Сегодня</button>}
        </div>
      </div>

      {/* Board */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(190px,1fr))', gap:14, padding:'0 24px 16px', flex:1, overflowX:'auto', overflowY:'hidden' }}>
        {COLUMNS.map(col => {
          const colLeads  = getColumnLeads(col);
          const isOver    = dragOver === col.id;
          const isCollapsed = collapsed[col.id];
          const colUnread = colLeads.reduce((s,l) => s+(l.unread_count||0), 0);
          const colSum    = col.showSum ? colLeads.reduce((s,l) => s+(Number(l.estimate_amount)||0), 0) : 0;

          return (
            <div key={col.id}
              style={{ border:`2px solid ${isOver?col.color:t.border}`,borderRadius:14,overflow:'hidden',transition:'border-color 0.15s,background 0.15s',background:isOver?col.color+'0a':t.surface,minWidth:190,display:'flex',flexDirection:'column',height:'100%' }}
              onDragOver={e => handleDragOver(e,col.id)}
              onDrop={e => handleDrop(e,col.id)}
              onDragLeave={e => { if(!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
            >
              {/* Заголовок колонки */}
              <div onClick={() => toggleCollapse(col.id)} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',borderBottom:`1px solid ${t.border}`,cursor:'pointer',userSelect:'none' }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,minWidth:0 }}>
                  <span style={{ flexShrink:0 }}>{col.emoji}</span>
                  <span style={{ fontFamily:'Unbounded,sans-serif',fontSize:11,fontWeight:600,color:col.color,whiteSpace:'nowrap' }}>{col.label}</span>
                  {colUnread > 0 && <span style={{ background:'#f0b429',color:'#0f0f13',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:20,flexShrink:0 }}>{colUnread}</span>}
                </div>
                <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0,marginLeft:6 }}>
                  {/* Счётчик заявок */}
                  <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:col.color+'22',color:col.color }}>{colLeads.length}</span>
                  {/* Сумма в той же строке */}
                  {col.showSum && colSum > 0 && (
                    <span style={{ fontSize:11,fontWeight:700,color:'#f0b429',background:'rgba(240,180,41,0.1)',padding:'2px 8px',borderRadius:20 }}>
                      {fmt(colSum)} ₸
                    </span>
                  )}
                  <span style={{ color:t.text2,fontSize:12,transition:'transform 0.2s',transform:isCollapsed?'rotate(-90deg)':'rotate(0deg)' }}>▾</span>
                </div>
              </div>

              {!isCollapsed && (
                <div style={{ padding:10,display:'flex',flexDirection:'column',gap:compact?4:8,flex:1,overflowY:'auto' }}>
                  {colLeads.length===0 && (
                    <div style={{ color:isOver?col.color:t.text2,fontSize:12,textAlign:'center',padding:'20px 0',border:isOver?`2px dashed ${col.color}66`:'none',borderRadius:8,transition:'all 0.15s' }}>
                      {isOver?'➕ Отпусти здесь':'Нет заявок'}
                    </div>
                  )}
                  {colLeads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} colColor={col.color} theme={t}
                      isDragging={draggingRef.current?.id===lead.id}
                      isOverdue={isOverdue(lead)} isRepeat={isRepeatClient(lead)}
                      showTimer={col.timerOn && showTimers} ticker={ticker}
                      compact={compact}
                      onClick={() => handleCardClick(lead)}
                      onDragStart={e => handleDragStart(e,lead)}
                      onDragEnd={handleDragEnd}
                      onContextMenu={e => handleContextMenu(e,lead)}
                    />
                  ))}
                </div>
              )}

              {isCollapsed && (
                <div style={{ padding:'8px 14px',color:t.text2,fontSize:11,display:'flex',justifyContent:'space-between' }}>
                  <span>{colLeads.length} заявок</span>
                  {colSum > 0 && <span style={{ color:'#f0b429' }}>{fmt(colSum)} ₸</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} lead={contextMenu.lead} user={user} theme={t}
          onClose={() => setContextMenu(null)}
          onStatusChange={async (newStatus) => {
            if (POPUP_STATUSES.includes(newStatus)) { setDragPopup({ lead:contextMenu.lead, toStatus:newStatus }); }
            else { await updateLeadStatus(contextMenu.lead.id, { status:newStatus }); }
          }}
          onOpenCard={() => handleCardClick(contextMenu.lead)}
          onRead={async () => {
            await axios.post(`${API}/api/leads/${contextMenu.lead.id}/read`);
            setLeads(prev => prev.map(l => l.id===contextMenu.lead.id ? {...l,unread_count:0} : l));
          }}
          onDelete={() => handleDelete(contextMenu.lead)}
        />
      )}

      {dragPopup && (
        <DragDropModal fromStatus={dragPopup.lead.status} toStatus={dragPopup.toStatus}
          lead={dragPopup.lead} theme={t}
          onConfirm={handleDragPopupConfirm}
          onCancel={() => setDragPopup(null)}
        />
      )}

      {selectedLead && (
        <LeadModal lead={selectedLead} user={user} theme={t}
          onClose={() => setSelectedLead(null)}
          onUpdate={updated => { setLeads(prev => prev.map(l => l.id===updated.id?updated:l)); setSelectedLead(updated); }}
        />
      )}
    </>
  );
}
