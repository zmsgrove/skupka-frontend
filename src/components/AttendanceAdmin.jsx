import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';

const CITIES = ['Атырау','Актобе','Уральск'];
const CAN_MOVE = ['admin','dir','zamdir','sysadmin'];

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

export default function AttendanceAdmin({ user, theme }) {
  const t = theme;
  const [shifts, setShifts]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const draggingRef = useRef(null);
  const [dragOver, setDragOver]     = useState(null);
  const isAdmin = ['admin','dir','zamdir','sysadmin'].includes(user.role);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const fetchAll = useCallback(async () => {
    const { data } = await supabase.from('shifts_admin').select('*').order('created_at', { ascending:false });
    setShifts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel('admin-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'shifts_admin' }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  const move = async (id, status) => {
    await supabase.from('shifts_admin').update({ status }).eq('id', id);
    fetchAll();
  };

  const handleDelete = async (card) => {
    if (isAdmin) {
      await supabase.from('shifts_admin').delete().eq('id', card.id);
    } else {
      await supabase.from('shifts_admin').update({ delete_requested: true }).eq('id', card.id).catch(() => {});
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

  const visible = filterByPeriod(shifts, filter, customFrom, customTo);
  const active  = visible.filter(s => s.status === 'active');
  const done    = visible.filter(s => s.status === 'done');

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:t.text2 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:`3px solid ${t.border}`, borderTop:'3px solid #8b5cf6', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        Загрузка...
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 70px)', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 24px', borderBottom:`1px solid ${t.border}`, background:t.surface, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, flexWrap:'wrap', gap:8 }}>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:15, fontWeight:700, color:t.text }}>📍 Отметка о прибытии</span>
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:4 }}>
            {[['today','Сегодня'],['week','Неделя'],['month','Месяц'],['custom','Период']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{ background:filter===v?'rgba(139,92,246,0.15)':'transparent', border:`1px solid ${filter===v?'rgba(139,92,246,0.4)':t.border}`, borderRadius:8, color:filter===v?'#8b5cf6':t.text2, fontSize:11, padding:'5px 10px', cursor:'pointer' }}>{l}</button>
            ))}
          </div>
          {filter === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:6, color:t.text, fontSize:11, padding:'4px 8px', outline:'none' }} />
              <span style={{ color:t.text2, fontSize:11 }}>—</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:6, color:t.text, fontSize:11, padding:'4px 8px', outline:'none' }} />
            </>
          )}
          <button onClick={() => setShowForm(true)} style={{ background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:8, color:'#8b5cf6', fontSize:12, fontWeight:700, padding:'8px 14px', cursor:'pointer' }}>
            + Отметиться
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ flex:1, overflowX:'auto', overflowY:'hidden', padding:'16px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, height:'100%', maxWidth:800 }}>
          <KanbanCol
            title="🟢 Прибыл" color="#8b5cf6" cards={active}
            dragOver={dragOver==='active'}
            onDragOver={() => setDragOver('active')} onDragLeave={() => setDragOver(null)} onDrop={() => handleDrop('active')}
            t={t} user={user} draggingRef={draggingRef}
            onOpen={card => setSelected(card)} onContextMenu={handleContextMenu}
            canMove={CAN_MOVE.includes(user.role)} onMove={s => move(s.id, 'done')}
          />
          <KanbanCol
            title="✅ Отработано" color={t.text2} cards={done}
            dragOver={dragOver==='done'}
            onDragOver={() => setDragOver('done')} onDragLeave={() => setDragOver(null)} onDrop={() => handleDrop('done')}
            t={t} user={user} draggingRef={draggingRef}
            onOpen={card => setSelected(card)} onContextMenu={handleContextMenu}
            canMove={false} onMove={() => {}}
          />
        </div>
      </div>

      {showForm && <ShiftForm user={user} t={t} onClose={() => setShowForm(false)} onCreate={() => { setShowForm(false); fetchAll(); }} />}
      {selected && <ShiftModal shift={selected} t={t} onClose={() => setSelected(null)} />}

      {contextMenu && (
        <div onClick={e=>e.stopPropagation()} style={{ position:'fixed', top:contextMenu.y, left:contextMenu.x, zIndex:2000, background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', minWidth:180, overflow:'hidden' }}>
          {[
            { label:'✅ Отработано',   action:() => { move(contextMenu.card.id,'done'); setContextMenu(null); } },
            { label:'↩️ Вернуть',      action:() => { move(contextMenu.card.id,'active'); setContextMenu(null); } },
            { label:'📂 Открыть',      action:() => { setSelected(contextMenu.card); setContextMenu(null); } },
            { label:'🗑️ Удалить',      action:() => handleDelete(contextMenu.card), danger:true },
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

function KanbanCol({ title, color, cards, dragOver, onDragOver, onDragLeave, onDrop, t, draggingRef, onOpen, onContextMenu, canMove, onMove }) {
  return (
    <div onDragOver={e=>{e.preventDefault();onDragOver();}} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{ display:'flex', flexDirection:'column', background:t.surface, border:`2px solid ${dragOver?color:t.border}`, borderRadius:14, overflow:'hidden', transition:'border-color 0.15s' }}>
      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:600, color }}>{title}</span>
        <span style={{ background:color+'22', color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{cards.length}</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
        {cards.map(s => (
          <AdminCard key={s.id} shift={s} t={t} draggingRef={draggingRef}
            onOpen={() => onOpen(s)} onContextMenu={(s,e) => onContextMenu(s,e)}
            canMove={canMove} onMove={() => onMove(s)} />
        ))}
        {cards.length === 0 && <div style={{ color:t.text2, fontSize:12, textAlign:'center', padding:'20px 0' }}>Пусто</div>}
      </div>
    </div>
  );
}

function AdminCard({ shift, t, onOpen, canMove, onMove, draggingRef, onContextMenu }) {
  return (
    <div draggable onDragStart={() => { draggingRef.current = { id:shift.id, status:shift.status }; }} onDragEnd={() => { draggingRef.current = null; }}
      onClick={onOpen} onContextMenu={e => onContextMenu(shift, e)}
      style={{ background:t.surface2, border:`1px solid ${t.border}`, borderLeft:`3px solid ${shift.delete_requested?'#ef4444':'#8b5cf6'}`, borderRadius:10, padding:'10px 12px', cursor:'grab', opacity:shift.delete_requested?0.7:1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:t.text, fontSize:13, fontWeight:600 }}>{shift.worker_name}</span>
        {shift.delete_requested && <span style={{ background:'rgba(239,68,68,0.15)', color:'#ef4444', fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:20 }}>На удаление</span>}
      </div>
      <div style={{ display:'flex', gap:6, marginBottom:4, flexWrap:'wrap' }}>
        <span style={{ background:'rgba(139,92,246,0.15)', color:'#8b5cf6', fontSize:10, padding:'2px 7px', borderRadius:20 }}>{shift.city}</span>
        {shift.address && <span style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', fontSize:10, padding:'2px 7px', borderRadius:20 }}>📍 {shift.address.slice(0,25)}</span>}
      </div>
      <div style={{ color:t.text2, fontSize:11 }}>{new Date(shift.shift_date).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
      {canMove && (
        <button onClick={e=>{e.stopPropagation();onMove();}} style={{ marginTop:8, width:'100%', background:'rgba(139,92,246,0.1)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:6, color:'#8b5cf6', fontSize:11, padding:'5px', cursor:'pointer' }}>
          ✅ Отработано
        </button>
      )}
    </div>
  );
}

function ShiftForm({ user, t, onClose, onCreate }) {
  const [form, setForm] = useState({ worker_name:'', city:'', shift_date:'', lat:null, lng:null, address:'' });
  const [locLoading, setLocLoading] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const valid = form.worker_name && form.city && form.shift_date;

  const getLocation = () => {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        set('lat', lat); set('lng', lng);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`);
          const data = await res.json();
          set('address', data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch { set('address', `${lat.toFixed(4)}, ${lng.toFixed(4)}`); }
        setLocLoading(false);
      },
      () => { alert('Не удалось получить геолокацию'); setLocLoading(false); }
    );
  };

  const submit = async () => {
    if (!valid) return;
    await supabase.from('shifts_admin').insert({
      worker_name:form.worker_name, city:form.city,
      shift_date:form.shift_date, lat:form.lat, lng:form.lng, address:form.address,
      created_by:user.username,
    });
    onCreate();
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:440, maxHeight:'85vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>📍 Отметка о прибытии</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <FRow label="ФИО *" t={t}><input value={form.worker_name} onChange={e=>set('worker_name',e.target.value)} placeholder="Имя Фамилия" style={inp(t)} /></FRow>
          <FRow label="Город *" t={t}>
            <div style={{ display:'flex', gap:6 }}>
              {CITIES.map(c => (
                <button key={c} onClick={()=>set('city',c)} style={{ flex:1, background:form.city===c?'rgba(139,92,246,0.15)':'transparent', border:`1px solid ${form.city===c?'rgba(139,92,246,0.4)':t.border}`, borderRadius:8, color:form.city===c?'#8b5cf6':t.text2, fontSize:11, fontWeight:600, padding:'7px 4px', cursor:'pointer' }}>{c}</button>
              ))}
            </div>
          </FRow>
          <FRow label="Дата и время *" t={t}><input type="datetime-local" value={form.shift_date} onChange={e=>set('shift_date',e.target.value)} style={inp(t)} /></FRow>
          <FRow label="Местоположение" t={t}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button onClick={getLocation} disabled={locLoading} style={{ background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:8, color:'#8b5cf6', fontSize:12, padding:'8px 14px', cursor:'pointer', flex:1 }}>
                {locLoading ? '⏳ Получаем...' : form.lat ? '📍 Получено' : '📍 Поделиться локацией'}
              </button>
              {form.address && <span style={{ color:'#8b5cf6', fontSize:11, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>✅ {form.address.slice(0,40)}</span>}
            </div>
          </FRow>
        </div>
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${t.border}`, display:'flex', gap:10, flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:13, padding:'11px', cursor:'pointer' }}>Отмена</button>
          <button onClick={submit} disabled={!valid} style={{ flex:2, background:valid?'#8b5cf6':t.surface2, border:'none', borderRadius:8, color:valid?'#fff':t.text2, fontSize:13, fontWeight:700, padding:'11px', cursor:valid?'pointer':'default' }}>Отметиться</button>
        </div>
      </div>
    </>
  );
}

function ShiftModal({ shift, t, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:400, background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>📍 Смена Админ</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:8 }}>
          {[
            ['Сотрудник', shift.worker_name],
            ['Город', shift.city],
            ['Дата и время', new Date(shift.shift_date).toLocaleString('ru-RU')],
            ['Адрес', shift.address||'Не указан'],
            ['Статус', shift.status==='active'?'🟢 Прибыл':'✅ Отработано'],
          ].map(([l,v])=>(
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${t.border}22` }}>
              <span style={{ color:t.text2, fontSize:13 }}>{l}</span>
              <span style={{ color:t.text, fontSize:13 }}>{v}</span>
            </div>
          ))}
          {shift.lat && (
            <a href={`https://maps.google.com/?q=${shift.lat},${shift.lng}`} target="_blank" rel="noopener noreferrer" style={{ display:'block', textAlign:'center', marginTop:8, background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.3)', borderRadius:8, color:'#8b5cf6', fontSize:12, padding:'8px', textDecoration:'none' }}>
              🗺️ Открыть на карте
            </a>
          )}
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
