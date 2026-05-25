import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { playSound } from '../utils/sound';

const PRIORITY_COLORS = { high:'#ef4444', medium:'#f59e0b', low:'#10b981' };
const PRIORITY_LABELS = { high:'🔴 Высокий', medium:'🟡 Средний', low:'🟢 Низкий' };
const STATUS_COLS = [
  { id:'new',    label:'🆕 Новые',      color:'#3b82f6' },
  { id:'today',  label:'📅 Сегодня',    color:'#f59e0b' },
  { id:'week',   label:'📆 На неделе',  color:'#8b5cf6' },
  { id:'month',  label:'🗓️ На месяц',   color:'#06b6d4' },
  { id:'review', label:'👀 На проверке',color:'#f97316' },
  { id:'done',   label:'✅ Закрытые',   color:'#10b981' },
];
const REPEAT_LABELS = { none:'Не повторять', daily:'Ежедневно', weekly:'Еженедельно', monthly:'Ежемесячно' };
const CAN_SEE_ALL = ['admin','dir','zamdir','sysadmin','rev'];

export default function TasksPage({ user, theme }) {
  const t = theme;
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState('kanban'); // kanban | calendar | mine
  const [showAll, setShowAll]       = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showStats, setShowStats]   = useState(false);
  const [search, setSearch]         = useState('');
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterTag, setFilterTag]   = useState(null);
  const [sortBy, setSortBy]         = useState('created_at');
  const [dragOver, setDragOver]     = useState(null);
  const draggingRef                 = useRef(null);
  const deadlineSoundedRef          = useRef(new Set());
  const canSeeAll = CAN_SEE_ALL.includes(user.role);
  const isAdmin = ['admin','dir','zamdir','sysadmin'].includes(user.role);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const fetchTasks = useCallback(async () => {
    let q = supabase.from('tasks').select(`*, task_observers(*), task_checklist(*), task_comments(*), task_tags(*), task_favorites(*)`).eq('is_archived', false).order('is_pinned', { ascending: false }).order(sortBy, { ascending: false });
    const { data } = await q;
    setTasks(data || []);
    setLoading(false);
    // Deadline sound: once per task per session
    const today = new Date().toDateString();
    (data || []).filter(t =>
      t.assigned_to === user.username && t.status !== 'done' && t.deadline &&
      new Date(t.deadline).toDateString() === today && !deadlineSoundedRef.current.has(t.id)
    ).forEach(t => { deadlineSoundedRef.current.add(t.id); playSound('task_deadline'); });
  }, [sortBy, user.username]);

  useEffect(() => {
    fetchTasks();
    const ch = supabase.channel('tasks-realtime')
      .on('postgres_changes', { event:'*', schema:'public', table:'tasks' }, (payload) => {
        fetchTasks();
        if (payload.eventType === 'INSERT' &&
            payload.new?.assigned_to === user.username &&
            payload.new?.created_by !== user.username) {
          playSound('task_assign');
        }
      })
      .on('postgres_changes', { event:'*', schema:'public', table:'task_comments' }, fetchTasks)
      .on('postgres_changes', { event:'*', schema:'public', table:'task_checklist' }, fetchTasks)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchTasks]);

  // Archive done tasks older than 15 days
  useEffect(() => {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    supabase.from('tasks').update({ is_archived: true })
      .eq('status', 'done').eq('is_archived', false)
      .lt('closed_at', fifteenDaysAgo.toISOString());
  }, []);

  const isVisible = (task) => {
    if (showAll && canSeeAll) return true;
    return task.created_by === user.username ||
      task.assigned_to === user.username ||
      task.task_observers?.some(o => o.user_id === user.username);
  };

  const getFilteredTasks = (colId) => {
    return tasks.filter(t => {
      if (t.status !== colId) return false;
      if (!isVisible(t)) return false;
      if (view === 'mine' && t.assigned_to !== user.username) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterTag && !t.task_tags?.some(tg => tg.tag === filterTag)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !String(t.number).includes(q)) return false;
      }
      return true;
    });
  };

  const allTags = [...new Set(tasks.flatMap(t => t.task_tags?.map(tg => tg.tag) || []))];
  const unreadCount = tasks.filter(t => isVisible(t) && t.status !== 'done' && t.assigned_to === user.username).length;

  const handleDrop = async (colId) => {
    const task = draggingRef.current;
    draggingRef.current = null;
    setDragOver(null);
    if (!task || task.status === colId) return;
    // Only assignee/observer can send to review, only creator can accept
    if (colId === 'done' && task.created_by !== user.username) return;
    await supabase.from('tasks').update({ status: colId, updated_at: new Date().toISOString(), ...(colId === 'done' ? { closed_at: new Date().toISOString() } : {}) }).eq('id', task.id);
    await supabase.from('task_history').insert({ task_id: task.id, user_id: user.username, user_name: user.name, action: `Перенёс в "${STATUS_COLS.find(c=>c.id===colId)?.label}"` });
    fetchTasks();
  };

  const handleDeleteTask = async (task) => {
    if (isAdmin) {
      await supabase.from('tasks').delete().eq('id', task.id);
    } else {
      await supabase.from('tasks').update({ delete_requested: true }).eq('id', task.id).catch(() => {});
    }
    fetchTasks();
    setContextMenu(null);
  };

  const handleTaskContextMenu = (task, e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ task, x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 240) });
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:t.text2 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:`3px solid ${t.border}`, borderTop:'3px solid #8b5cf6', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        Загрузка задач...
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 70px)', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 24px', borderBottom:`1px solid ${t.border}`, background:t.surface, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:16, fontWeight:700, color:t.text }}>✅ Задачи</span>
          {unreadCount > 0 && <span style={{ background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20 }}>{unreadCount}</span>}
        </div>

        {/* View switcher */}
        <div style={{ display:'flex', gap:4 }}>
          {[['kanban','📋'],['calendar','📅'],['mine','🎯']].map(([v,icon]) => (
            <button key={v} onClick={() => setView(v)} style={{ background: view===v?'rgba(139,92,246,0.15)':'transparent', border:`1px solid ${view===v?'rgba(139,92,246,0.5)':t.border}`, borderRadius:8, color: view===v?'#8b5cf6':t.text2, fontSize:12, padding:'5px 10px', cursor:'pointer' }}>{icon}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display:'flex', alignItems:'center', gap:8, background:t.surface2, border:`1px solid ${t.border}`, borderRadius:10, padding:'6px 12px', flex:1, maxWidth:280 }}>
          <span style={{ fontSize:13 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию, #номеру..." style={{ background:'transparent', border:'none', color:t.text, fontSize:12, outline:'none', flex:1, fontFamily:'Inter,sans-serif' }} />
          {search && <button onClick={() => setSearch('')} style={{ background:'transparent', border:'none', color:t.text2, cursor:'pointer', fontSize:12 }}>✕</button>}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:4 }}>
          {['high','medium','low'].map(p => (
            <button key={p} onClick={() => setFilterPriority(filterPriority===p?null:p)} style={{ background: filterPriority===p?PRIORITY_COLORS[p]+'22':'transparent', border:`1px solid ${filterPriority===p?PRIORITY_COLORS[p]:t.border}`, borderRadius:8, color: filterPriority===p?PRIORITY_COLORS[p]:t.text2, fontSize:11, padding:'4px 8px', cursor:'pointer' }}>
              {p==='high'?'🔴':p==='medium'?'🟡':'🟢'}
            </button>
          ))}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:11, padding:'4px 8px', cursor:'pointer', outline:'none' }}>
            <option value="created_at">По дате</option>
            <option value="deadline">По дедлайну</option>
            <option value="priority">По приоритету</option>
          </select>
        </div>

        <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
          {canSeeAll && <button onClick={() => setShowAll(v=>!v)} style={{ background: showAll?'rgba(232,38,58,0.15)':'transparent', border:`1px solid ${showAll?'rgba(232,38,58,0.5)':t.border}`, borderRadius:8, color: showAll?'#E8263A':t.text2, fontSize:12, padding:'6px 12px', cursor:'pointer' }}>{showAll?'👁️ Все':'👁️ Все'}</button>}
          <button onClick={() => setShowArchive(true)} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:12, padding:'6px 12px', cursor:'pointer' }}>🗄️ Архив</button>
          {canSeeAll && <button onClick={() => setShowStats(true)} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:12, padding:'6px 12px', cursor:'pointer' }}>📊</button>}
          <button onClick={() => setShowTemplates(true)} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:12, padding:'6px 12px', cursor:'pointer' }}>📋 Шаблоны</button>
          <button onClick={() => setShowCreate(true)} style={{ background:'#8b5cf6', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, padding:'6px 16px', cursor:'pointer' }}>+ Задача</button>
        </div>
      </div>

      {/* Board */}
      {view === 'kanban' && (
        <div style={{ flex:1, overflowX:'auto', overflowY:'hidden', padding:'16px 24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${STATUS_COLS.length},minmax(200px,1fr))`, gap:12, height:'100%' }}>
            {STATUS_COLS.map(col => {
              const colTasks = getFilteredTasks(col.id);
              const isOver = dragOver === col.id;
              return (
                <div key={col.id}
                  style={{ display:'flex', flexDirection:'column', background: isOver?col.color+'0a':t.surface, border:`2px solid ${isOver?col.color:t.border}`, borderRadius:14, overflow:'hidden', transition:'all 0.15s' }}
                  onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                  onDrop={() => handleDrop(col.id)}
                  onDragLeave={e => { if(!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
                >
                  {/* Col header */}
                  <div style={{ padding:'10px 14px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                    <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:600, color:col.color }}>{col.label}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ background:col.color+'22', color:col.color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{colTasks.length}</span>
                      <button onClick={() => setShowCreate(true)} style={{ background:'transparent', border:'none', color:t.text2, fontSize:16, cursor:'pointer', padding:'0 2px', lineHeight:1 }}>+</button>
                    </div>
                  </div>
                  {/* Tasks */}
                  <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
                    {colTasks.length === 0 && (
                      <div style={{ color:isOver?col.color:t.text2, fontSize:12, textAlign:'center', padding:'20px 0', border:isOver?`2px dashed ${col.color}44`:'none', borderRadius:8 }}>
                        {isOver ? '➕ Отпусти здесь' : 'Нет задач'}
                      </div>
                    )}
                    {colTasks.map(task => (
                      <TaskCard key={task.id} task={task} user={user} t={t}
                        onClick={() => setSelectedTask(task)}
                        onDragStart={() => { draggingRef.current = task; }}
                        onDragEnd={() => { draggingRef.current = null; setDragOver(null); }}
                        onContextMenu={(e) => handleTaskContextMenu(task, e)}
                        onQuickDone={async () => {
                          if (task.created_by !== user.username) return;
                          await supabase.from('tasks').update({ status:'done', closed_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq('id', task.id);
                          fetchTasks();
                        }}
                        onFavorite={async () => {
                          const fav = task.task_favorites?.find(f => f.user_id === user.username);
                          if (fav) await supabase.from('task_favorites').delete().eq('id', fav.id);
                          else await supabase.from('task_favorites').insert({ task_id:task.id, user_id:user.username });
                          fetchTasks();
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'calendar' && <CalendarView tasks={tasks.filter(isVisible)} user={user} t={t} onOpen={setSelectedTask} />}
      {view === 'mine' && (
        <div style={{ flex:1, overflowX:'auto', overflowY:'hidden', padding:'16px 24px' }}>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${STATUS_COLS.length},minmax(200px,1fr))`, gap:12, height:'100%' }}>
            {STATUS_COLS.map(col => {
              const colTasks = getFilteredTasks(col.id).filter(t => t.assigned_to === user.username);
              const isOver = dragOver === col.id;
              return (
                <div key={col.id}
                  style={{ display:'flex', flexDirection:'column', background: isOver?col.color+'0a':t.surface, border:`2px solid ${isOver?col.color:t.border}`, borderRadius:14, overflow:'hidden' }}
                  onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                  onDrop={() => handleDrop(col.id)}
                  onDragLeave={e => { if(!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
                >
                  <div style={{ padding:'10px 14px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:600, color:col.color }}>{col.label}</span>
                    <span style={{ background:col.color+'22', color:col.color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{colTasks.length}</span>
                  </div>
                  <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
                    {colTasks.map(task => <TaskCard key={task.id} task={task} user={user} t={t} onClick={() => setSelectedTask(task)} onDragStart={() => { draggingRef.current = task; }} onDragEnd={() => { draggingRef.current = null; }} onContextMenu={(e) => handleTaskContextMenu(task, e)} />)}
                    {colTasks.length === 0 && <div style={{ color:t.text2, fontSize:12, textAlign:'center', padding:'20px 0' }}>Нет задач</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateTaskModal user={user} t={t} onClose={() => setShowCreate(false)} onCreate={fetchTasks} />}
      {selectedTask && <TaskModal task={selectedTask} user={user} t={t} onClose={() => setSelectedTask(null)} onUpdate={fetchTasks} />}
      {showTemplates && <TemplatesModal user={user} t={t} onClose={() => setShowTemplates(false)} onCreate={(tpl) => { setShowTemplates(false); setShowCreate(true); }} />}
      {showArchive && <ArchiveModal user={user} t={t} onClose={() => setShowArchive(false)} />}
      {showStats && canSeeAll && <StatsModal t={t} onClose={() => setShowStats(false)} />}

      {contextMenu && (
        <div onClick={e=>e.stopPropagation()} style={{ position:'fixed', top:contextMenu.y, left:contextMenu.x, zIndex:2000, background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', minWidth:190, overflow:'hidden' }}>
          {[
            { label:'📂 Открыть', action:()=>{ setSelectedTask(contextMenu.task); setContextMenu(null); } },
            { label:'✅ Закрыть', action:async ()=>{ await supabase.from('tasks').update({status:'done',closed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',contextMenu.task.id); fetchTasks(); setContextMenu(null); } },
            { label:'🔴 Высокий приоритет', action:async ()=>{ await supabase.from('tasks').update({priority:'high',updated_at:new Date().toISOString()}).eq('id',contextMenu.task.id); fetchTasks(); setContextMenu(null); } },
            { label:'🟡 Средний приоритет', action:async ()=>{ await supabase.from('tasks').update({priority:'medium',updated_at:new Date().toISOString()}).eq('id',contextMenu.task.id); fetchTasks(); setContextMenu(null); } },
            { label:'🟢 Низкий приоритет', action:async ()=>{ await supabase.from('tasks').update({priority:'low',updated_at:new Date().toISOString()}).eq('id',contextMenu.task.id); fetchTasks(); setContextMenu(null); } },
            { label:'⏰ +1 день', action:async ()=>{
                const d = contextMenu.task.deadline ? new Date(contextMenu.task.deadline) : new Date();
                d.setDate(d.getDate()+1);
                await supabase.from('tasks').update({deadline:d.toISOString(),updated_at:new Date().toISOString()}).eq('id',contextMenu.task.id);
                fetchTasks(); setContextMenu(null);
              }
            },
            { label:'🗑️ Удалить', action:()=>handleDeleteTask(contextMenu.task), danger:true },
          ].map(item => (
            <div key={item.label} onClick={item.action} style={{ padding:'9px 14px', cursor:'pointer', fontSize:13, color:item.danger?'#ef4444':t.text, borderBottom:`1px solid ${t.border}22` }}
              onMouseEnter={e=>e.currentTarget.style.background=item.danger?'rgba(239,68,68,0.1)':t.surface2}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Task Card (канбан превью) ─────────────────────────────────
function TaskCard({ task, user, t, onClick, onDragStart, onDragEnd, onQuickDone, onFavorite, onContextMenu }) {
  const done      = task.task_checklist?.filter(c => c.is_done).length || 0;
  const total     = task.task_checklist?.length || 0;
  const isFav     = task.task_favorites?.some(f => f.user_id === user.username);
  const comments  = task.task_comments?.length || 0;
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';
  const deadlineColor = !task.deadline ? t.text2 : isOverdue ? '#ef4444' : new Date(task.deadline) - new Date() < 86400000 ? '#f59e0b' : t.text2;

  return (
    <div draggable
      onDragStart={onDragStart} onDragEnd={onDragEnd}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        background: task.color ? task.color+'22' : t.surface2,
        border:`1px solid ${task.delete_requested?'#ef4444':task.color || t.border}`,
        borderLeft:`3px solid ${task.delete_requested?'#ef4444':PRIORITY_COLORS[task.priority]||t.border}`,
        borderRadius:10, padding:'10px 12px', cursor:'grab',
        transition:'all 0.15s', userSelect:'none', opacity:task.delete_requested?0.7:1,
      }}
    >
      {task.is_pinned && <div style={{ fontSize:10, color:'#E8263A', marginBottom:4 }}>📌 Закреплено</div>}
      {task.delete_requested && <div style={{ fontSize:10, color:'#ef4444', marginBottom:4, background:'rgba(239,68,68,0.1)', padding:'2px 6px', borderRadius:6, display:'inline-block' }}>🗑️ На удаление</div>}
      <div style={{ color:t.text, fontSize:13, fontWeight:600, marginBottom:4, lineHeight:1.4 }}>{task.title}</div>
      <div style={{ color:t.text2, fontSize:10, marginBottom:6 }}>#{task.number} · {PRIORITY_LABELS[task.priority]}</div>
      <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:t.text2, flexWrap:'wrap' }}>
        <span>👤 {task.assigned_to || '—'}</span>
        {task.deadline && <span style={{ color:deadlineColor }}>⏰ {new Date(task.deadline).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>}
      </div>
      {total > 0 && (
        <div style={{ marginTop:6 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
            <span style={{ fontSize:10, color:t.text2 }}>✅ {done}/{total}</span>
            <span style={{ fontSize:10, color:t.text2 }}>{Math.round(done/total*100)}%</span>
          </div>
          <div style={{ height:3, background:t.border, borderRadius:2 }}>
            <div style={{ height:'100%', width:`${Math.round(done/total*100)}%`, background:'#10b981', borderRadius:2, transition:'width 0.3s' }} />
          </div>
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
        <div style={{ display:'flex', gap:6 }}>
          {comments > 0 && <span style={{ fontSize:10, color:t.text2 }}>💬 {comments}</span>}
          {task.task_tags?.slice(0,2).map(tg => (
            <span key={tg.id} style={{ background:'rgba(139,92,246,0.15)', color:'#8b5cf6', fontSize:9, padding:'1px 5px', borderRadius:10 }}>{tg.tag}</span>
          ))}
        </div>
        <div style={{ display:'flex', gap:4 }} onClick={e => e.stopPropagation()}>
          {onFavorite && <button onClick={onFavorite} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:12, padding:2 }}>{isFav?'⭐':'☆'}</button>}
          {onQuickDone && task.status !== 'done' && task.created_by === user.username && (
            <button onClick={onQuickDone} style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:6, color:'#10b981', fontSize:10, padding:'2px 6px', cursor:'pointer' }}>✓</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Task Modal (открытая карточка) ───────────────────────────
function TaskModal({ task, user, t, onClose, onUpdate }) {
  const [data, setData]           = useState(task);
  const [comments, setComments]   = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [history, setHistory]     = useState([]);
  const [observers, setObservers] = useState([]);
  const [allUsers, setAllUsers]   = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [tab, setTab]             = useState('main'); // main | checklist | comments | history
  const [tags, setTags]           = useState([]);
  const [newTag, setNewTag]       = useState('');
  const isCreator = data.created_by === user.username;
  const isAssignee = data.assigned_to === user.username;
  const canEdit = isCreator;
  const canSendReview = (isAssignee || observers.some(o => o.user_id === user.username)) && data.status !== 'done' && data.status !== 'review';

  useEffect(() => {
    supabase.from('task_comments').select('*').eq('task_id', task.id).order('created_at').then(({data}) => setComments(data||[]));
    supabase.from('task_checklist').select('*').eq('task_id', task.id).order('position').then(({data}) => setChecklist(data||[]));
    supabase.from('task_history').select('*').eq('task_id', task.id).order('created_at', {ascending:false}).then(({data}) => setHistory(data||[]));
    supabase.from('task_observers').select('*').eq('task_id', task.id).then(({data}) => setObservers(data||[]));
    supabase.from('task_tags').select('*').eq('task_id', task.id).then(({data}) => setTags(data||[]));
    supabase.from('profiles').select('*').then(({data}) => setAllUsers(data||[]));
    // Mark view
    supabase.from('task_views').upsert({ task_id:task.id, user_id:user.username, viewed_at:new Date().toISOString() }, { onConflict:'task_id,user_id' });
  }, [task.id]);

  const save = async (patch) => {
    await supabase.from('tasks').update({ ...patch, updated_at:new Date().toISOString() }).eq('id', task.id);
    setData(prev => ({...prev,...patch}));
    onUpdate();
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    const mentions = (newComment.match(/@(\w+)/g)||[]).map(m=>m.slice(1));
    await supabase.from('task_comments').insert({ task_id:task.id, user_id:user.username, sender_name:user.name, text:newComment.trim(), mentions });
    await supabase.from('task_history').insert({ task_id:task.id, user_id:user.username, user_name:user.name, action:'Добавил комментарий' });
    setNewComment('');
    const {data} = await supabase.from('task_comments').select('*').eq('task_id', task.id).order('created_at');
    setComments(data||[]);
  };

  const toggleCheckItem = async (item) => {
    await supabase.from('task_checklist').update({ is_done:!item.is_done }).eq('id', item.id);
    setChecklist(prev => prev.map(c => c.id===item.id ? {...c,is_done:!c.is_done} : c));
    onUpdate();
  };

  const addCheckItem = async () => {
    if (!newCheckItem.trim() || !canEdit) return;
    await supabase.from('task_checklist').insert({ task_id:task.id, text:newCheckItem.trim(), position:checklist.length });
    setNewCheckItem('');
    const {data} = await supabase.from('task_checklist').select('*').eq('task_id', task.id).order('position');
    setChecklist(data||[]);
    onUpdate();
  };

  const addObserver = async (userId) => {
    if (observers.some(o=>o.user_id===userId)) return;
    await supabase.from('task_observers').insert({ task_id:task.id, user_id:userId });
    setObservers(prev => [...prev, {user_id:userId}]);
  };

  const addTag = async () => {
    if (!newTag.trim() || !canEdit) return;
    await supabase.from('task_tags').insert({ task_id:task.id, tag:newTag.trim() });
    setTags(prev => [...prev, {tag:newTag.trim()}]);
    setNewTag('');
  };

  const sendToReview = async () => {
    await save({ status:'review' });
    await supabase.from('task_history').insert({ task_id:task.id, user_id:user.username, user_name:user.name, action:'Отправил на проверку' });
  };

  const acceptTask = async () => {
    await save({ status:'done', closed_at:new Date().toISOString() });
    await supabase.from('task_history').insert({ task_id:task.id, user_id:user.username, user_name:user.name, action:'Принял задачу — закрыта' });
  };

  const returnTask = async () => {
    await save({ status:'today' });
    await supabase.from('task_history').insert({ task_id:task.id, user_id:user.username, user_name:user.name, action:'Вернул на доработку' });
  };

  const doneChecklist = checklist.filter(c=>c.is_done).length;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:680, maxHeight:'90vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:t.text2, fontSize:11, marginBottom:6 }}>#{data.number} · {new Date(data.created_at).toLocaleDateString('ru-RU')}</div>
              {canEdit ? (
                <input value={data.title} onChange={e => setData(p=>({...p,title:e.target.value}))} onBlur={() => save({title:data.title})}
                  style={{ width:'100%', background:'transparent', border:'none', color:t.text, fontSize:18, fontWeight:700, outline:'none', fontFamily:'Inter,sans-serif' }} />
              ) : (
                <div style={{ color:t.text, fontSize:18, fontWeight:700 }}>{data.title}</div>
              )}
            </div>
            <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer', flexShrink:0 }}>✕</button>
          </div>

          {/* Status actions */}
          <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
            {canSendReview && <button onClick={sendToReview} style={{ background:'rgba(249,115,22,0.15)', border:'1px solid rgba(249,115,22,0.4)', borderRadius:8, color:'#f97316', fontSize:12, padding:'6px 14px', cursor:'pointer', fontWeight:600 }}>👀 На проверку</button>}
            {isCreator && data.status === 'review' && (
              <>
                <button onClick={acceptTask} style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)', borderRadius:8, color:'#10b981', fontSize:12, padding:'6px 14px', cursor:'pointer', fontWeight:600 }}>✅ Принять</button>
                <button onClick={returnTask} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#ef4444', fontSize:12, padding:'6px 14px', cursor:'pointer', fontWeight:600 }}>↩️ На доработку</button>
              </>
            )}
            {canEdit && <button onClick={() => save({is_pinned:!data.is_pinned})} style={{ background:data.is_pinned?'rgba(232,38,58,0.15)':'transparent', border:`1px solid ${data.is_pinned?'rgba(232,38,58,0.4)':t.border}`, borderRadius:8, color:data.is_pinned?'#E8263A':t.text2, fontSize:12, padding:'6px 12px', cursor:'pointer' }}>{data.is_pinned?'📌 Откреп.':'📌 Закрепить'}</button>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${t.border}`, flexShrink:0 }}>
          {[
            ['main','📋 Основное'],
            ['checklist', checklist.length>0 ? `✅ Чеклист (${doneChecklist}/${checklist.length})` : '✅ Чеклист'],
            ['comments', comments.length>0 ? `💬 Комментарии (${comments.length})` : '💬 Комментарии'],
            ['history','📜 История'],
          ].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex:1, background:'transparent', border:'none', borderBottom:`2px solid ${tab===id?'#8b5cf6':'transparent'}`, color:tab===id?'#8b5cf6':t.text2, fontSize:12, padding:'10px 8px', cursor:'pointer', transition:'all 0.15s' }}>{label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
          {tab === 'main' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Description */}
              <div>
                <label style={{ color:t.text2, fontSize:12, display:'block', marginBottom:6 }}>Описание</label>
                {canEdit ? (
                  <textarea value={data.description||''} onChange={e => setData(p=>({...p,description:e.target.value}))} onBlur={() => save({description:data.description})}
                    placeholder="Описание задачи..." rows={3}
                    style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'10px', outline:'none', fontFamily:'Inter,sans-serif', resize:'vertical' }} />
                ) : (
                  <div style={{ color:t.text, fontSize:13, lineHeight:1.6 }}>{data.description || <span style={{color:t.text2}}>Нет описания</span>}</div>
                )}
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {/* Priority */}
                <div>
                  <label style={{ color:t.text2, fontSize:12, display:'block', marginBottom:6 }}>Приоритет</label>
                  {canEdit ? (
                    <select value={data.priority} onChange={e => save({priority:e.target.value})}
                      style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'8px', outline:'none' }}>
                      {Object.entries(PRIORITY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : <div style={{ color:PRIORITY_COLORS[data.priority], fontSize:13, fontWeight:600 }}>{PRIORITY_LABELS[data.priority]}</div>}
                </div>

                {/* Deadline */}
                <div>
                  <label style={{ color:t.text2, fontSize:12, display:'block', marginBottom:6 }}>Срок</label>
                  {canEdit ? (
                    <input type="datetime-local" value={data.deadline ? new Date(data.deadline).toISOString().slice(0,16) : ''} onChange={e => save({deadline:e.target.value})}
                      style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'8px', outline:'none' }} />
                  ) : <div style={{ color:t.text, fontSize:13 }}>{data.deadline ? new Date(data.deadline).toLocaleString('ru-RU') : 'Не указан'}</div>}
                </div>

                {/* Assigned */}
                <div>
                  <label style={{ color:t.text2, fontSize:12, display:'block', marginBottom:6 }}>Исполнитель</label>
                  {canEdit ? (
                    <select value={data.assigned_to||''} onChange={e => save({assigned_to:e.target.value||null})}
                      style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'8px', outline:'none' }}>
                      <option value="">— Выбрать —</option>
                      {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  ) : <div style={{ color:t.text, fontSize:13 }}>{data.assigned_to || '—'}</div>}
                </div>

                {/* Repeat */}
                <div>
                  <label style={{ color:t.text2, fontSize:12, display:'block', marginBottom:6 }}>Повтор</label>
                  {canEdit ? (
                    <select value={data.repeat||'none'} onChange={e => save({repeat:e.target.value})}
                      style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'8px', outline:'none' }}>
                      {Object.entries(REPEAT_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : <div style={{ color:t.text, fontSize:13 }}>{REPEAT_LABELS[data.repeat||'none']}</div>}
                </div>
              </div>

              {/* Observers */}
              <div>
                <label style={{ color:t.text2, fontSize:12, display:'block', marginBottom:8 }}>Наблюдатели</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                  {observers.map(o => (
                    <span key={o.user_id} style={{ background:'rgba(139,92,246,0.15)', color:'#8b5cf6', fontSize:12, padding:'3px 10px', borderRadius:20 }}>{o.user_id}</span>
                  ))}
                </div>
                <select onChange={e => { if(e.target.value) addObserver(e.target.value); e.target.value=''; }}
                  style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:12, padding:'6px 10px', outline:'none' }}>
                  <option value="">+ Добавить наблюдателя</option>
                  {allUsers.filter(u => !observers.some(o=>o.user_id===u.id)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label style={{ color:t.text2, fontSize:12, display:'block', marginBottom:8 }}>Теги</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                  {tags.map(tg => (
                    <span key={tg.tag} style={{ background:'rgba(6,182,212,0.15)', color:'#06b6d4', fontSize:11, padding:'2px 8px', borderRadius:20 }}>#{tg.tag}</span>
                  ))}
                </div>
                {canEdit && (
                  <div style={{ display:'flex', gap:6 }}>
                    <input value={newTag} onChange={e=>setNewTag(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag()} placeholder="Добавить тег..."
                      style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:12, padding:'6px 10px', outline:'none', flex:1 }} />
                    <button onClick={addTag} style={{ background:'rgba(6,182,212,0.15)', border:'1px solid rgba(6,182,212,0.3)', borderRadius:8, color:'#06b6d4', fontSize:12, padding:'6px 12px', cursor:'pointer' }}>+</button>
                  </div>
                )}
              </div>

              {/* Color */}
              {canEdit && (
                <div>
                  <label style={{ color:t.text2, fontSize:12, display:'block', marginBottom:8 }}>Цвет карточки</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {[null,'#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#f97316','#06b6d4'].map(c => (
                      <button key={c||'none'} onClick={() => save({color:c})} style={{ width:24, height:24, borderRadius:'50%', background:c||t.border, border:`2px solid ${data.color===c?'#fff':t.border}`, cursor:'pointer' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Save as template */}
              {canEdit && (
                <button onClick={async () => {
                  await supabase.from('task_templates').insert({ title:data.title, description:data.description, priority:data.priority, checklist:checklist.map(c=>({text:c.text})), tags:tags.map(t=>t.tag), created_by:user.username });
                  alert('Сохранено как шаблон!');
                }} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>
                  📋 Сохранить как шаблон
                </button>
              )}
            </div>
          )}

          {tab === 'checklist' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {checklist.length > 0 && (
                <div style={{ marginBottom:8 }}>
                  <div style={{ height:6, background:t.border, borderRadius:3, marginBottom:8 }}>
                    <div style={{ height:'100%', width:`${Math.round(doneChecklist/checklist.length*100)}%`, background:'#10b981', borderRadius:3, transition:'width 0.3s' }} />
                  </div>
                  <div style={{ color:t.text2, fontSize:12, textAlign:'right' }}>{doneChecklist}/{checklist.length} выполнено</div>
                </div>
              )}
              {checklist.map(item => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:item.is_done?'rgba(16,185,129,0.07)':t.surface2, borderRadius:8, border:`1px solid ${t.border}` }}>
                  <input type="checkbox" checked={item.is_done} onChange={() => toggleCheckItem(item)} style={{ accentColor:'#10b981', width:16, height:16, cursor:'pointer' }} />
                  <span style={{ color:item.is_done?t.text2:t.text, fontSize:13, textDecoration:item.is_done?'line-through':'none', flex:1 }}>{item.text}</span>
                </div>
              ))}
              {canEdit && (
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <input value={newCheckItem} onChange={e=>setNewCheckItem(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCheckItem()} placeholder="Новый пункт..."
                    style={{ flex:1, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'8px 12px', outline:'none', fontFamily:'Inter,sans-serif' }} />
                  <button onClick={addCheckItem} style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, color:'#10b981', fontSize:13, padding:'8px 14px', cursor:'pointer' }}>+</button>
                </div>
              )}
            </div>
          )}

          {tab === 'comments' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {comments.map(c => (
                <div key={c.id} style={{ display:'flex', flexDirection:'column', alignItems:c.user_id===user.username?'flex-end':'flex-start' }}>
                  <div style={{ fontSize:11, color:t.text2, marginBottom:3 }}>
                    {c.user_id!==user.username && <span style={{ fontWeight:600, color:t.text3, marginRight:6 }}>{c.sender_name}</span>}
                    {new Date(c.created_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                  <div style={{ maxWidth:'70%', background:c.user_id===user.username?'rgba(139,92,246,0.18)':t.surface2, border:`1px solid ${c.user_id===user.username?'rgba(139,92,246,0.4)':t.border}`, borderRadius:c.user_id===user.username?'14px 14px 4px 14px':'14px 14px 14px 4px', padding:'10px 14px', color:t.text, fontSize:13, lineHeight:1.5, wordBreak:'break-word' }}>
                    {c.text}
                  </div>
                </div>
              ))}
              {comments.length === 0 && <div style={{ color:t.text2, textAlign:'center', padding:40, fontSize:13 }}>Нет комментариев</div>}
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&addComment()} placeholder="Комментарий... (@username для упоминания)"
                  style={{ flex:1, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, color:t.text, fontSize:13, padding:'10px 14px', outline:'none', fontFamily:'Inter,sans-serif' }} />
                <button onClick={addComment} disabled={!newComment.trim()} style={{ background:newComment.trim()?'#8b5cf6':t.surface2, border:'none', borderRadius:10, color:newComment.trim()?'#fff':t.text2, fontSize:16, width:44, height:44, cursor:newComment.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>➤</button>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {history.map(h => (
                <div key={h.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:t.surface2, borderRadius:8 }}>
                  <span style={{ fontSize:16 }}>📝</span>
                  <div style={{ flex:1 }}>
                    <span style={{ color:t.text, fontSize:12, fontWeight:600 }}>{h.user_name} </span>
                    <span style={{ color:t.text2, fontSize:12 }}>{h.action}</span>
                  </div>
                  <span style={{ color:t.text2, fontSize:11 }}>{new Date(h.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              ))}
              {history.length === 0 && <div style={{ color:t.text2, textAlign:'center', padding:40, fontSize:13 }}>История пуста</div>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Create Task Modal ─────────────────────────────────────────
function CreateTaskModal({ user, t, onClose, onCreate }) {
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [priority, setPriority]   = useState('medium');
  const [deadline, setDeadline]   = useState('');
  const [assignedTo, setAssigned] = useState(user.username);
  const [repeat, setRepeat]       = useState('none');
  const [allUsers, setAllUsers]   = useState([]);

  useEffect(() => { supabase.from('profiles').select('*').then(({data}) => setAllUsers(data||[])); }, []);

  const create = async () => {
    if (!title.trim()) return;
    const { data } = await supabase.from('tasks').insert({
      title: title.trim(), description: description.trim() || null,
      priority, deadline: deadline || null, assigned_to: assignedTo || null,
      repeat, created_by: user.username, status: 'new',
    }).select().single();
    if (data) {
      await supabase.from('task_history').insert({ task_id:data.id, user_id:user.username, user_name:user.name, action:'Создал задачу' });
    }
    onCreate();
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:480, background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:24, zIndex:501, display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>+ Новая задача</div>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Название задачи *" autoFocus
          style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:14, padding:'10px 14px', outline:'none', fontFamily:'Inter,sans-serif' }} />
        <textarea value={description} onChange={e=>setDesc(e.target.value)} placeholder="Описание (необязательно)" rows={2}
          style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'10px 14px', outline:'none', fontFamily:'Inter,sans-serif', resize:'none' }} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <label style={{ color:t.text2, fontSize:11, display:'block', marginBottom:4 }}>Приоритет</label>
            <select value={priority} onChange={e=>setPriority(e.target.value)} style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'8px', outline:'none' }}>
              {Object.entries(PRIORITY_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color:t.text2, fontSize:11, display:'block', marginBottom:4 }}>Срок</label>
            <input type="datetime-local" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'8px', outline:'none' }} />
          </div>
          <div>
            <label style={{ color:t.text2, fontSize:11, display:'block', marginBottom:4 }}>Исполнитель</label>
            <select value={assignedTo} onChange={e=>setAssigned(e.target.value)} style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'8px', outline:'none' }}>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color:t.text2, fontSize:11, display:'block', marginBottom:4 }}>Повтор</label>
            <select value={repeat} onChange={e=>setRepeat(e.target.value)} style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'8px', outline:'none' }}>
              {Object.entries(REPEAT_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:13, padding:'10px', cursor:'pointer' }}>Отмена</button>
          <button onClick={create} disabled={!title.trim()} style={{ flex:1, background:title.trim()?'#8b5cf6':t.surface2, border:'none', borderRadius:8, color:title.trim()?'#fff':t.text2, fontSize:13, fontWeight:700, padding:'10px', cursor:title.trim()?'pointer':'default' }}>Создать</button>
        </div>
      </div>
    </>
  );
}

// ─── Templates Modal ───────────────────────────────────────────
function TemplatesModal({ user, t, onClose, onCreate }) {
  const [templates, setTemplates] = useState([]);
  useEffect(() => { supabase.from('task_templates').select('*').order('created_at',{ascending:false}).then(({data}) => setTemplates(data||[])); }, []);

  const deleteTemplate = async (id) => {
    await supabase.from('task_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:440, maxHeight:'70vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, zIndex:501, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text }}>📋 Шаблоны</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:16, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:8 }}>
          {templates.length === 0 && <div style={{ color:t.text2, textAlign:'center', padding:40, fontSize:13 }}>Нет шаблонов</div>}
          {templates.map(tpl => (
            <div key={tpl.id} style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ color:t.text, fontSize:13, fontWeight:600 }}>{tpl.title}</div>
                {tpl.description && <div style={{ color:t.text2, fontSize:11, marginTop:2 }}>{tpl.description.slice(0,60)}{tpl.description.length>60?'...':''}</div>}
                <div style={{ color:t.text2, fontSize:11, marginTop:4 }}>{PRIORITY_LABELS[tpl.priority]} · {tpl.checklist?.length||0} пунктов</div>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => onCreate(tpl)} style={{ background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:8, color:'#8b5cf6', fontSize:12, padding:'5px 10px', cursor:'pointer' }}>Создать</button>
                {tpl.created_by === user.username && <button onClick={() => deleteTemplate(tpl.id)} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:'#ef4444', fontSize:12, padding:'5px 8px', cursor:'pointer' }}>🗑</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Archive Modal ─────────────────────────────────────────────
function ArchiveModal({ user, t, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const canSeeAll = CAN_SEE_ALL.includes(user.role);

  useEffect(() => {
    let q = supabase.from('tasks').select('*, task_observers(*)').eq('is_archived', true).order('closed_at', {ascending:false});
    q.then(({data}) => {
      const filtered = (data||[]).filter(t =>
        canSeeAll ||
        t.created_by === user.username ||
        t.assigned_to === user.username ||
        t.task_observers?.some(o => o.user_id === user.username)
      );
      setTasks(filtered);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:520, maxHeight:'75vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, zIndex:501, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text }}>🗄️ Архив задач</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:16, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:8 }}>
          {loading ? <div style={{ color:t.text2, textAlign:'center', padding:40 }}>Загрузка...</div> :
           tasks.length === 0 ? <div style={{ color:t.text2, textAlign:'center', padding:40, fontSize:13 }}>Архив пуст</div> :
           tasks.map(task => (
            <div key={task.id} style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:12, padding:'12px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <span style={{ color:t.text2, fontSize:11 }}>#{task.number}</span>
                <span style={{ color:t.text, fontSize:13, fontWeight:600 }}>{task.title}</span>
              </div>
              <div style={{ color:t.text2, fontSize:11 }}>
                👤 {task.assigned_to||'—'} · ✅ {task.closed_at?new Date(task.closed_at).toLocaleDateString('ru-RU'):'—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Stats Modal ───────────────────────────────────────────────
function StatsModal({ t, onClose }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    supabase.from('tasks').select('*, task_observers(*)').then(({data}) => {
      if (!data) return;
      const byUser = {};
      data.forEach(task => {
        const u = task.assigned_to || 'Не назначен';
        if (!byUser[u]) byUser[u] = { open:0, done:0, overdue:0, review:0 };
        if (task.status === 'done') byUser[u].done++;
        else if (task.status === 'review') byUser[u].review++;
        else {
          byUser[u].open++;
          if (task.deadline && new Date(task.deadline) < new Date()) byUser[u].overdue++;
        }
      });
      setStats(byUser);
    });
  }, []);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:520, maxHeight:'70vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, zIndex:501, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text }}>📊 Статистика задач</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:16, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:16 }}>
          {!stats ? <div style={{ color:t.text2, textAlign:'center', padding:40 }}>Загрузка...</div> : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`2px solid ${t.border}` }}>
                  {['Сотрудник','Открытых','На проверке','Просрочено','Закрытых'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', color:t.text2, fontWeight:600, textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats).map(([u, s], i) => (
                  <tr key={u} style={{ borderBottom:`1px solid ${t.border}`, background:i%2===0?'transparent':t.surface2+'44' }}>
                    <td style={{ padding:'10px', color:t.text, fontWeight:600 }}>{u}</td>
                    <td style={{ padding:'10px', color:'#3b82f6' }}>{s.open}</td>
                    <td style={{ padding:'10px', color:'#f97316' }}>{s.review}</td>
                    <td style={{ padding:'10px', color:'#ef4444', fontWeight:s.overdue>0?700:400 }}>{s.overdue}</td>
                    <td style={{ padding:'10px', color:'#10b981' }}>{s.done}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Calendar View ─────────────────────────────────────────────
function CalendarView({ tasks, user, t, onOpen }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const today = new Date();

  const getTasksForDay = (day) => {
    const date = new Date(year, month, day);
    return tasks.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return d.getDate()===day && d.getMonth()===month && d.getFullYear()===year;
    });
  };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <button onClick={() => setCurrentDate(new Date(year,month-1,1))} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:16, padding:'6px 12px', cursor:'pointer' }}>‹</button>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text, flex:1, textAlign:'center' }}>
          {currentDate.toLocaleString('ru-RU',{month:'long',year:'numeric'})}
        </span>
        <button onClick={() => setCurrentDate(new Date(year,month+1,1))} style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:16, padding:'6px 12px', cursor:'pointer' }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} style={{ textAlign:'center', color:t.text2, fontSize:11, fontWeight:600, padding:'6px 0' }}>{d}</div>
        ))}
        {Array.from({length:(firstDay||7)-1}).map((_,i) => <div key={`empty-${i}`} />)}
        {Array.from({length:daysInMonth}).map((_,i) => {
          const day = i+1;
          const dayTasks = getTasksForDay(day);
          const isToday = today.getDate()===day && today.getMonth()===month && today.getFullYear()===year;
          return (
            <div key={day} style={{ minHeight:80, background:isToday?'rgba(139,92,246,0.1)':t.surface, border:`1px solid ${isToday?'#8b5cf6':t.border}`, borderRadius:8, padding:'6px', display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ fontSize:12, fontWeight:isToday?700:400, color:isToday?'#8b5cf6':t.text2, marginBottom:2 }}>{day}</div>
              {dayTasks.slice(0,3).map(task => (
                <div key={task.id} onClick={() => onOpen(task)} style={{ background:PRIORITY_COLORS[task.priority]+'22', border:`1px solid ${PRIORITY_COLORS[task.priority]}44`, borderRadius:4, padding:'2px 4px', fontSize:10, color:t.text, cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {task.title}
                </div>
              ))}
              {dayTasks.length > 3 && <div style={{ fontSize:9, color:t.text2 }}>+{dayTasks.length-3} ещё</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
