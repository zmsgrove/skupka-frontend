import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';

const FILIALS = [
  { id:'sv47', label:'СВ47', city:'Уральск' },
  { id:'k162', label:'К162', city:'Уральск' },
  { id:'s32',  label:'С32',  city:'Атырау'  },
  { id:'a21',  label:'А21',  city:'Актобе'  },
];
const MANAGERS   = ['Максатов Сырым','Кожа Бегдос','Кылышбаева Макпал','Аминов Нурлан','Александров Даниил'];
const CITIES     = ['Атырау','Актобе','Уральск'];
const CAN_SEE_ALL = ['admin','dir','zamdir','sysadmin','rev'];
const CAN_MOVE   = ['admin','dir','zamdir','sysadmin','rgmu','rgma'];

function canSeeSpo(user, card) {
  if (CAN_SEE_ALL.includes(user.role)) return true;
  if (['rgmu','rgma'].includes(user.role)) {
    const f = FILIALS.find(f => f.id === card.filial);
    return f && user.cities.includes(f.city);
  }
  return card.created_by === user.username;
}

function filterByPeriod(shifts, filter, customFrom, customTo) {
  if (filter === 'all') return shifts;
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);
  if (filter === 'today') return shifts.filter(s => { const d = new Date(s.shift_date); return d >= todayStart && d <= todayEnd; });
  if (filter === 'week')  { const w = new Date(now); w.setDate(now.getDate()-7); w.setHours(0,0,0,0); return shifts.filter(s => new Date(s.shift_date) >= w); }
  if (filter === 'month') { const m = new Date(now.getFullYear(), now.getMonth(), 1); return shifts.filter(s => new Date(s.shift_date) >= m); }
  if (filter === 'custom' && customFrom && customTo) {
    const f = new Date(customFrom); f.setHours(0,0,0,0);
    const t = new Date(customTo);   t.setHours(23,59,59,999);
    return shifts.filter(s => { const d = new Date(s.shift_date); return d >= f && d <= t; });
  }
  return shifts;
}

export default function AttendanceSpo({ user, theme }) {
  const t = theme;
  const [shifts, setShifts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [filter, setFilter]       = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]   = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const draggingRef = useRef(null);
  const [dragOver, setDragOver]   = useState(null);
  const isAdmin = ['admin','dir','zamdir','sysadmin'].includes(user.role);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase.from('shifts_spo').select('*').order('created_at', { ascending:false });
    setShifts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel('spo-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'shifts_spo' }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  const move = async (id, status) => {
    await supabase.from('shifts_spo').update({ status }).eq('id', id);
    fetchAll();
  };

  const handleDelete = async (card) => {
    if (isAdmin) {
      await supabase.from('shifts_spo').delete().eq('id', card.id);
    } else {
      await supabase.from('shifts_spo').update({ delete_requested: true }).eq('id', card.id).catch(() => {});
    }
    fetchAll();
    setContextMenu(null);
  };

  const handleContextMenu = (card, e) => {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ card, x: Math.min(e.clientX, window.innerWidth - 190), y: Math.min(e.clientY, window.innerHeight - 200) });
  };

  const handleDrop = (targetStatus) => {
    const drag = draggingRef.current;
    if (drag && drag.status !== targetStatus) move(drag.id, targetStatus);
    draggingRef.current = null; setDragOver(null);
  };

  const visible = filterByPeriod(shifts, filter, customFrom, customTo).filter(s => canSeeSpo(user, s));
  const active  = visible.filter(s => s.status === 'active');
  const done    = visible.filter(s => s.status === 'done');

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:t.text2 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:`3px solid ${t.border}`, borderTop:'3px solid #10b981', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        Загрузка...
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 70px)', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 24px', borderBottom:`1px solid ${t.border}`, background:t.surface, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, flexWrap:'wrap', gap:8 }}>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:15, fontWeight:700, color:t.text }}>👷 Отметка на смене</span>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          {/* Filters */}
          <div style={{ display:'flex', gap:4 }}>
            {[['today','Сегодня'],['week','Неделя'],['month','Месяц'],['custom','Период']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{ background:filter===v?'rgba(16,185,129,0.15)':'transparent', border:`1px solid ${filter===v?'rgba(16,185,129,0.4)':t.border}`, borderRadius:8, color:filter===v?'#10b981':t.text2, fontSize:11, padding:'5px 10px', cursor:'pointer' }}>{l}</button>
            ))}
          </div>
          {filter === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:6, color:t.text, fontSize:11, padding:'4px 8px', outline:'none' }} />
              <span style={{ color:t.text2, fontSize:11 }}>—</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:6, color:t.text, fontSize:11, padding:'4px 8px', outline:'none' }} />
            </>
          )}
          <button onClick={() => setShowForm(true)} style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)', borderRadius:8, color:'#10b981', fontSize:12, fontWeight:700, padding:'8px 14px', cursor:'pointer' }}>
            + На смену
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ flex:1, overflowX:'auto', overflowY:'hidden', padding:'16px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, height:'100%', maxWidth:800 }}>
          {/* На смене */}
          <KanbanCol
            title="🟢 На смене" color="#10b981" cards={active}
            dragOver={dragOver==='active'} status="active"
            onDragOver={() => setDragOver('active')} onDragLeave={() => setDragOver(null)} onDrop={() => handleDrop('active')}
            t={t} user={user} draggingRef={draggingRef}
            onOpen={card => setSelected(card)} onContextMenu={handleContextMenu}
            canMove={(s) => CAN_MOVE.includes(user.role) || (['rgmu','rgma'].includes(user.role) && user.cities.includes(FILIALS.find(f=>f.id===s.filial)?.city))}
            onMove={s => move(s.id, 'done')}
          />
          {/* Отработано */}
          <KanbanCol
            title="✅ Отработано" color={t.text2} cards={done}
            dragOver={dragOver==='done'} status="done"
            onDragOver={() => setDragOver('done')} onDragLeave={() => setDragOver(null)} onDrop={() => handleDrop('done')}
            t={t} user={user} draggingRef={draggingRef}
            onOpen={card => setSelected(card)} onContextMenu={handleContextMenu}
            canMove={() => false} onMove={() => {}}
          />
        </div>
      </div>

      {showForm && <ShiftForm user={user} t={t} onClose={() => setShowForm(false)} onCreate={() => { setShowForm(false); fetchAll(); }} />}
      {selected && <ShiftModal shift={selected} t={t} onClose={() => setSelected(null)} />}

      {contextMenu && (
        <div onClick={e=>e.stopPropagation()} style={{ position:'fixed', top:contextMenu.y, left:contextMenu.x, zIndex:2000, background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', minWidth:180, overflow:'hidden' }}>
          {[
            { label:'✅ Отработано', action:() => { move(contextMenu.card.id,'done'); setContextMenu(null); } },
            { label:'↩️ На смену',   action:() => { move(contextMenu.card.id,'active'); setContextMenu(null); } },
            { label:'📂 Открыть',   action:() => { setSelected(contextMenu.card); setContextMenu(null); } },
            { label:'🗑️ Удалить',   action:() => handleDelete(contextMenu.card), danger:true },
          ].map(item => (
            <div key={item.label} onClick={item.action} style={{ padding:'9px 14px', cursor:'pointer', fontSize:13, color:item.danger?'#ef4444':t.text, borderBottom:`1px solid ${t.border}22` }}
              onMouseEnter={e => e.currentTarget.style.background=item.danger?'rgba(239,68,68,0.1)':t.surface2}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanCol({ title, color, cards, dragOver, onDragOver, onDragLeave, onDrop, t, user, draggingRef, onOpen, onContextMenu, canMove, onMove }) {
  return (
    <div onDragOver={e=>{e.preventDefault();onDragOver();}} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{ display:'flex', flexDirection:'column', background:t.surface, border:`2px solid ${dragOver?color:t.border}`, borderRadius:14, overflow:'hidden', transition:'border-color 0.15s' }}>
      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:600, color }}>{title}</span>
        <span style={{ background:color+'22', color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{cards.length}</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
        {cards.map(s => (
          <SpoCard key={s.id} shift={s} t={t} user={user} draggingRef={draggingRef}
            onOpen={() => onOpen(s)} onContextMenu={(s,e) => onContextMenu(s,e)}
            canMove={canMove(s)} onMove={() => onMove(s)} />
        ))}
        {cards.length === 0 && <div style={{ color:t.text2, fontSize:12, textAlign:'center', padding:'20px 0' }}>Пусто</div>}
      </div>
    </div>
  );
}

function SpoCard({ shift, t, onOpen, canMove, onMove, draggingRef, onContextMenu }) {
  const filial = FILIALS.find(f => f.id === shift.filial);
  return (
    <div draggable onDragStart={() => { draggingRef.current = { id:shift.id, status:shift.status }; }} onDragEnd={() => { draggingRef.current = null; }}
      onClick={onOpen} onContextMenu={e => onContextMenu(shift, e)}
      style={{ background:t.surface2, border:`1px solid ${t.border}`, borderLeft:`3px solid ${shift.delete_requested?'#ef4444':'#10b981'}`, borderRadius:10, padding:'10px 12px', cursor:'grab', opacity:shift.delete_requested?0.7:1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:t.text, fontSize:13, fontWeight:600 }}>{shift.worker_name}</span>
        {shift.delete_requested && <span style={{ background:'rgba(239,68,68,0.15)', color:'#ef4444', fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:20 }}>На удаление</span>}
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:4, flexWrap:'wrap' }}>
        <span style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', fontSize:10, padding:'2px 7px', borderRadius:20 }}>{filial?.label}</span>
        <span style={{ background:'rgba(139,92,246,0.15)', color:'#8b5cf6', fontSize:10, padding:'2px 7px', borderRadius:20 }}>{shift.shift_type==='day'?'Дневная':'Суточная'}</span>
        {shift.is_replacement && <span style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', fontSize:10, padding:'2px 7px', borderRadius:20 }}>Замена</span>}
      </div>
      <div style={{ color:t.text2, fontSize:11 }}>{new Date(shift.shift_date).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
      {canMove && (
        <button onClick={e=>{e.stopPropagation();onMove();}} style={{ marginTop:8, width:'100%', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:6, color:'#10b981', fontSize:11, padding:'5px', cursor:'pointer' }}>
          ✅ Отработано
        </button>
      )}
    </div>
  );
}

function ShiftForm({ user, t, onClose, onCreate }) {
  const [form, setForm] = useState({ worker_name:'', filial:'', manager:'', shift_date:'', shift_type:'day', is_replacement:false, replace_who:'', replace_hours:'' });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const valid = form.worker_name && form.filial && form.manager && form.shift_date;

  const submit = async () => {
    if (!valid) return;
    const filial = FILIALS.find(f=>f.id===form.filial);
    await supabase.from('shifts_spo').insert({
      worker_name:form.worker_name, filial:form.filial, manager:form.manager,
      shift_date:form.shift_date, shift_type:form.shift_type,
      is_replacement:form.is_replacement,
      replace_who:form.is_replacement?form.replace_who:null,
      replace_hours:form.is_replacement?parseInt(form.replace_hours)||null:null,
      city:filial?.city, created_by:user.username,
    });
    onCreate();
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:480, maxHeight:'85vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>👷 Отметка на смене</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <FRow label="Кто на смене *" t={t}><input value={form.worker_name} onChange={e=>set('worker_name',e.target.value)} placeholder="Имя" style={inp(t)} /></FRow>
          <FRow label="Филиал *" t={t}>
            <div style={{ display:'flex', gap:6 }}>
              {FILIALS.map(f => (
                <button key={f.id} onClick={()=>set('filial',f.id)} style={{ flex:1, background:form.filial===f.id?'rgba(16,185,129,0.15)':'transparent', border:`1px solid ${form.filial===f.id?'rgba(16,185,129,0.4)':t.border}`, borderRadius:8, color:form.filial===f.id?'#10b981':t.text2, fontSize:11, fontWeight:600, padding:'7px 4px', cursor:'pointer' }}>{f.label}</button>
              ))}
            </div>
          </FRow>
          <FRow label="Руководитель *" t={t}>
            <select value={form.manager} onChange={e=>set('manager',e.target.value)} style={sel(t)}>
              <option value="">— Выбрать —</option>
              {MANAGERS.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </FRow>
          <FRow label="Дата и время *" t={t}><input type="datetime-local" value={form.shift_date} onChange={e=>set('shift_date',e.target.value)} style={inp(t)} /></FRow>
          <FRow label="Тип смены" t={t}>
            <div style={{ display:'flex', gap:8 }}>
              {[['day','Дневная'],['daily','Суточная']].map(([v,l])=>(
                <button key={v} onClick={()=>set('shift_type',v)} style={{ flex:1, background:form.shift_type===v?'rgba(139,92,246,0.15)':'transparent', border:`1px solid ${form.shift_type===v?'rgba(139,92,246,0.4)':t.border}`, borderRadius:8, color:form.shift_type===v?'#8b5cf6':t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>{l}</button>
              ))}
            </div>
          </FRow>
          <FRow label="По графику или замена?" t={t}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>set('is_replacement',false)} style={{ flex:1, background:!form.is_replacement?'rgba(16,185,129,0.15)':'transparent', border:`1px solid ${!form.is_replacement?'rgba(16,185,129,0.4)':t.border}`, borderRadius:8, color:!form.is_replacement?'#10b981':t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>По графику</button>
              <button onClick={()=>set('is_replacement',true)} style={{ flex:1, background:form.is_replacement?'rgba(245,158,11,0.15)':'transparent', border:`1px solid ${form.is_replacement?'rgba(245,158,11,0.4)':t.border}`, borderRadius:8, color:form.is_replacement?'#f59e0b':t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>Замена</button>
            </div>
          </FRow>
          {form.is_replacement && (
            <>
              <FRow label="Кого заменяете" t={t}><input value={form.replace_who} onChange={e=>set('replace_who',e.target.value)} placeholder="Имя" style={inp(t)} /></FRow>
              <FRow label="На сколько часов" t={t}><input type="number" value={form.replace_hours} onChange={e=>set('replace_hours',e.target.value)} placeholder="Кол-во часов" style={inp(t)} /></FRow>
            </>
          )}
        </div>
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${t.border}`, display:'flex', gap:10, flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:13, padding:'11px', cursor:'pointer' }}>Отмена</button>
          <button onClick={submit} disabled={!valid} style={{ flex:2, background:valid?'#10b981':t.surface2, border:'none', borderRadius:8, color:valid?'#fff':t.text2, fontSize:13, fontWeight:700, padding:'11px', cursor:valid?'pointer':'default' }}>Отметиться</button>
        </div>
      </div>
    </>
  );
}

function ShiftModal({ shift, t, onClose }) {
  const filial = FILIALS.find(f=>f.id===shift.filial);
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:400, background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>👷 Смена СПО</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:8 }}>
          {[
            ['Сотрудник', shift.worker_name],
            ['Филиал', filial?.label],
            ['Руководитель', shift.manager],
            ['Дата смены', new Date(shift.shift_date).toLocaleString('ru-RU')],
            ['Тип смены', shift.shift_type==='day'?'Дневная':'Суточная'],
            ['Замена', shift.is_replacement?`Да — вместо ${shift.replace_who} на ${shift.replace_hours}ч`:'Нет'],
            ['Статус', shift.status==='active'?'🟢 На смене':'✅ Отработано'],
          ].map(([l,v])=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${t.border}22` }}>
              <span style={{ color:t.text2, fontSize:13 }}>{l}</span>
              <span style={{ color:t.text, fontSize:13 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FRow({ label, children, t }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ color:t.text2, fontSize:12, fontWeight:500 }}>{label}</label>
      {children}
    </div>
  );
}

const inp = (t) => ({ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'9px 12px', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' });
const sel = (t) => ({ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'9px 12px', outline:'none' });
