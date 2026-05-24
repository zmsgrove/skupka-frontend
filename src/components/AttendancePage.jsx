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
const CAN_MOVE_SPO = ['admin','dir','zamdir','sysadmin','rgmu','rgma'];
const CAN_MOVE_ADMIN = ['admin','dir','zamdir','sysadmin'];
const SPO_ONLY_ROLES = ['uralsk', 'atyray', 'aktobe'];
const ADMIN_PANEL_ROLES = ['dir','zamdir','sysadmin','rgmu','rgma','rev'];

function getInitialSection(user) {
  if (SPO_ONLY_ROLES.includes(user.role)) return 'spo';
  if (ADMIN_PANEL_ROLES.includes(user.role)) return 'admin_staff';
  return 'spo'; // admin can switch, starts with spo
}

function canSeeSpo(user, card) {
  if (CAN_SEE_ALL.includes(user.role)) return true;
  if (['rgmu','rgma'].includes(user.role)) {
    const f = FILIALS.find(f => f.id === card.filial);
    return f && user.cities.includes(f.city);
  }
  return card.created_by === user.username;
}

function canSeeAdminShift(user) {
  return ['admin','dir','zamdir','sysadmin','rev','rgmu','rgma'].includes(user.role);
}

export default function AttendancePage({ user, theme }) {
  const t = theme;
  const [section, setSection] = useState(() => getInitialSection(user));
  const canSwitchSections = user.role === 'admin';
  const [spoShifts, setSpoShifts]     = useState([]);
  const [adminShifts, setAdminShifts] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [selected, setSelected]       = useState(null);
  const isAdmin = ['admin','dir','zamdir','sysadmin'].includes(user.role);
  const draggingRef = useRef(null);
  const [dragOver, setDragOver]       = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const fetchAll = useCallback(async () => {
    const [spo, adm] = await Promise.all([
      supabase.from('shifts_spo').select('*').order('created_at', { ascending:false }),
      supabase.from('shifts_admin').select('*').order('created_at', { ascending:false }),
    ]);
    setSpoShifts(spo.data || []);
    setAdminShifts(adm.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel('shifts-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'shifts_spo' }, fetchAll)
      .on('postgres_changes', { event:'*', schema:'public', table:'shifts_admin' }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  const moveSpo = async (id, status) => {
    await supabase.from('shifts_spo').update({ status }).eq('id', id);
    fetchAll();
  };

  const moveAdmin = async (id, status) => {
    await supabase.from('shifts_admin').update({ status }).eq('id', id);
    fetchAll();
  };

  const handleDelete = async (card, cardType) => {
    const table = cardType === 'spo' ? 'shifts_spo' : 'shifts_admin';
    if (isAdmin) {
      await supabase.from(table).delete().eq('id', card.id);
    } else {
      await supabase.from(table).update({ delete_requested: true }).eq('id', card.id).catch(() => {});
    }
    fetchAll();
    setContextMenu(null);
  };

  const handleContextMenu = (card, cardType, e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ card, cardType, x: Math.min(e.clientX, window.innerWidth - 190), y: Math.min(e.clientY, window.innerHeight - 200) });
  };

  const handleDrop = (targetStatus) => {
    const drag = draggingRef.current;
    if (drag && drag.status !== targetStatus) {
      if (drag.cardType === 'spo') moveSpo(drag.id, targetStatus);
      else moveAdmin(drag.id, targetStatus);
    }
    draggingRef.current = null;
    setDragOver(null);
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:t.text2 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:`3px solid ${t.border}`, borderTop:'3px solid #10b981', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        Загрузка смен...
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 70px)', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 24px', borderBottom:`1px solid ${t.border}`, background:t.surface, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:16, fontWeight:700, color:t.text }}>🕐 Отметка на смене</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {canSwitchSections && (
            <div style={{ display:'flex', gap:4 }}>
              {[['spo','👷 СПО'],['admin_staff','👔 Админ состав']].map(([v,l]) => (
                <button key={v} onClick={() => setSection(v)} style={{ background:section===v?'rgba(16,185,129,0.15)':'transparent', border:`1px solid ${section===v?'rgba(16,185,129,0.4)':t.border}`, borderRadius:8, color:section===v?'#10b981':t.text2, fontSize:12, padding:'6px 14px', cursor:'pointer' }}>{l}</button>
              ))}
            </div>
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
          <div
            onDragOver={e=>{ e.preventDefault(); setDragOver('active'); }}
            onDragLeave={()=>setDragOver(null)}
            onDrop={()=>handleDrop('active')}
            style={{ display:'flex', flexDirection:'column', background:t.surface, border:`2px solid ${dragOver==='active'?'#10b981':t.border}`, borderRadius:14, overflow:'hidden', transition:'border-color 0.15s' }}>
            <div style={{ padding:'10px 14px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:600, color:'#10b981' }}>🟢 На смене</span>
              <span style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                {section==='spo' ? spoShifts.filter(s=>s.status==='active'&&canSeeSpo(user,s)).length : adminShifts.filter(s=>s.status==='active'&&canSeeAdminShift(user)).length}
              </span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
              {section === 'spo' ? (
                spoShifts.filter(s => s.status==='active' && canSeeSpo(user,s)).map(s => (
                  <SpoCard key={s.id} shift={s} t={t} onOpen={() => setSelected({type:'spo',data:s})}
                    canMove={CAN_MOVE_SPO.includes(user.role) || (['rgmu','rgma'].includes(user.role) && user.cities.includes(FILIALS.find(f=>f.id===s.filial)?.city))}
                    onMove={() => moveSpo(s.id, 'done')}
                    draggingRef={draggingRef} cardType="spo"
                    onContextMenu={(shift,e) => handleContextMenu(shift,'spo',e)}
                  />
                ))
              ) : (
                adminShifts.filter(s => s.status==='active' && canSeeAdminShift(user)).map(s => (
                  <AdminCard key={s.id} shift={s} t={t} onOpen={() => setSelected({type:'admin',data:s})}
                    canMove={CAN_MOVE_ADMIN.includes(user.role)}
                    onMove={() => moveAdmin(s.id, 'done')}
                    draggingRef={draggingRef} cardType="admin"
                    onContextMenu={(shift,e) => handleContextMenu(shift,'admin',e)}
                  />
                ))
              )}
              {((section==='spo' && spoShifts.filter(s=>s.status==='active'&&canSeeSpo(user,s)).length===0) ||
                (section==='admin_staff' && adminShifts.filter(s=>s.status==='active'&&canSeeAdminShift(user)).length===0)) && (
                <div style={{ color:t.text2, fontSize:12, textAlign:'center', padding:'20px 0' }}>Никого нет на смене</div>
              )}
            </div>
          </div>

          {/* Отработано */}
          <div
            onDragOver={e=>{ e.preventDefault(); setDragOver('done'); }}
            onDragLeave={()=>setDragOver(null)}
            onDrop={()=>handleDrop('done')}
            style={{ display:'flex', flexDirection:'column', background:t.surface, border:`2px solid ${dragOver==='done'?'#9090a8':t.border}`, borderRadius:14, overflow:'hidden', transition:'border-color 0.15s' }}>
            <div style={{ padding:'10px 14px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:600, color:t.text2 }}>✅ Отработано</span>
              <span style={{ background:t.surface2, color:t.text2, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>
                {section==='spo' ? spoShifts.filter(s=>s.status==='done'&&canSeeSpo(user,s)).length : adminShifts.filter(s=>s.status==='done'&&canSeeAdminShift(user)).length}
              </span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
              {section === 'spo' ? (
                spoShifts.filter(s => s.status==='done' && canSeeSpo(user,s)).map(s => (
                  <SpoCard key={s.id} shift={s} t={t} onOpen={() => setSelected({type:'spo',data:s})} canMove={false}
                    draggingRef={draggingRef} cardType="spo"
                    onContextMenu={(shift,e) => handleContextMenu(shift,'spo',e)}
                  />
                ))
              ) : (
                adminShifts.filter(s => s.status==='done' && canSeeAdminShift(user)).map(s => (
                  <AdminCard key={s.id} shift={s} t={t} onOpen={() => setSelected({type:'admin',data:s})} canMove={false}
                    draggingRef={draggingRef} cardType="admin"
                    onContextMenu={(shift,e) => handleContextMenu(shift,'admin',e)}
                  />
                ))
              )}
              {((section==='spo' && spoShifts.filter(s=>s.status==='done'&&canSeeSpo(user,s)).length===0) ||
                (section==='admin_staff' && adminShifts.filter(s=>s.status==='done'&&canSeeAdminShift(user)).length===0)) && (
                <div style={{ color:t.text2, fontSize:12, textAlign:'center', padding:'20px 0' }}>Пусто</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <ShiftForm type={section} user={user} t={t}
          onClose={() => setShowForm(false)}
          onCreate={() => { setShowForm(false); fetchAll(); }}
        />
      )}

      {selected && (
        <ShiftModal item={selected} t={t} onClose={() => setSelected(null)} />
      )}

      {contextMenu && (
        <div onClick={e=>e.stopPropagation()} style={{ position:'fixed', top:contextMenu.y, left:contextMenu.x, zIndex:2000, background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', minWidth:180, overflow:'hidden' }}>
          {[
            { label:'✅ Отработано', action:()=>{ if(contextMenu.cardType==='spo') moveSpo(contextMenu.card.id,'done'); else moveAdmin(contextMenu.card.id,'done'); setContextMenu(null); } },
            { label:'↩️ Вернуть на смену', action:()=>{ if(contextMenu.cardType==='spo') moveSpo(contextMenu.card.id,'active'); else moveAdmin(contextMenu.card.id,'active'); setContextMenu(null); } },
            { label:'📂 Открыть', action:()=>{ setSelected({type:contextMenu.cardType==='spo'?'spo':'admin', data:contextMenu.card}); setContextMenu(null); } },
            { label:'🗑️ Удалить', action:()=>handleDelete(contextMenu.card, contextMenu.cardType), danger:true },
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

// ─── СПО карточка ─────────────────────────────────────────────
function SpoCard({ shift, t, onOpen, canMove, onMove, draggingRef, cardType, onContextMenu }) {
  const filial = FILIALS.find(f => f.id === shift.filial);
  return (
    <div
      draggable
      onDragStart={()=>{ draggingRef.current = { id:shift.id, status:shift.status, cardType }; }}
      onDragEnd={()=>{ draggingRef.current = null; }}
      onClick={onOpen}
      onContextMenu={e=>onContextMenu(shift,e)}
      style={{ background:t.surface2, border:`1px solid ${t.border}`, borderLeft:`3px solid ${shift.delete_requested?'#ef4444':'#10b981'}`, borderRadius:10, padding:'10px 12px', cursor:'grab', opacity:shift.delete_requested?0.7:1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:t.text, fontSize:13, fontWeight:600 }}>{shift.worker_name}</span>
        {shift.delete_requested && <span style={{ background:'rgba(239,68,68,0.15)', color:'#ef4444', fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:20 }}>🗑️ На удаление</span>}
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:4, flexWrap:'wrap' }}>
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

// ─── Админ карточка ────────────────────────────────────────────
function AdminCard({ shift, t, onOpen, canMove, onMove, draggingRef, cardType, onContextMenu }) {
  return (
    <div
      draggable
      onDragStart={()=>{ draggingRef.current = { id:shift.id, status:shift.status, cardType }; }}
      onDragEnd={()=>{ draggingRef.current = null; }}
      onClick={onOpen}
      onContextMenu={e=>onContextMenu(shift,e)}
      style={{ background:t.surface2, border:`1px solid ${t.border}`, borderLeft:`3px solid ${shift.delete_requested?'#ef4444':'#8b5cf6'}`, borderRadius:10, padding:'10px 12px', cursor:'grab', opacity:shift.delete_requested?0.7:1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:t.text, fontSize:13, fontWeight:600 }}>{shift.worker_name}</span>
        {shift.delete_requested && <span style={{ background:'rgba(239,68,68,0.15)', color:'#ef4444', fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:20 }}>🗑️ На удаление</span>}
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:4, flexWrap:'wrap' }}>
        <span style={{ background:'rgba(139,92,246,0.15)', color:'#8b5cf6', fontSize:10, padding:'2px 7px', borderRadius:20 }}>{shift.city}</span>
        {shift.address && <span style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', fontSize:10, padding:'2px 7px', borderRadius:20 }}>📍 {shift.address.slice(0,25)}</span>}
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

// ─── Форма создания ───────────────────────────────────────────
function ShiftForm({ type, user, t, onClose, onCreate }) {
  const isSpo = type === 'spo';
  const [form, setForm] = useState({
    worker_name:'', filial:'', manager:'', shift_date:'',
    shift_type:'day', is_replacement:false, replace_who:'', replace_hours:'',
    city:'', lat:null, lng:null, address:'',
  });
  const [locLoading, setLocLoading] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const getLocation = () => {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        set('lat', lat); set('lng', lng);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ru`);
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          set('address', addr);
        } catch {
          set('address', `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
        setLocLoading(false);
      },
      () => { alert('Не удалось получить геолокацию'); setLocLoading(false); }
    );
  };

  const submit = async () => {
    if (isSpo) {
      if (!form.worker_name || !form.filial || !form.manager || !form.shift_date) return;
      const filial = FILIALS.find(f=>f.id===form.filial);
      await supabase.from('shifts_spo').insert({
        worker_name:form.worker_name, filial:form.filial, manager:form.manager,
        shift_date:form.shift_date, shift_type:form.shift_type,
        is_replacement:form.is_replacement,
        replace_who:form.is_replacement?form.replace_who:null,
        replace_hours:form.is_replacement?parseInt(form.replace_hours)||null:null,
        city:filial?.city, created_by:user.username,
      });
    } else {
      if (!form.worker_name || !form.city || !form.shift_date) return;
      await supabase.from('shifts_admin').insert({
        worker_name:form.worker_name, city:form.city,
        shift_date:form.shift_date, lat:form.lat, lng:form.lng, address:form.address,
        created_by:user.username,
      });
    }
    onCreate();
  };

  const validSpo = form.worker_name && form.filial && form.manager && form.shift_date;
  const validAdm = form.worker_name && form.city && form.shift_date;
  const valid = isSpo ? validSpo : validAdm;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:480, maxHeight:'85vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>{isSpo?'👷 Отметка СПО':'👔 Отметка Админ'}</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
          <FRow label="Кто на смене *" t={t}>
            <input value={form.worker_name} onChange={e=>set('worker_name',e.target.value)} placeholder="Имя" style={inp(t)} />
          </FRow>

          {isSpo ? (
            <>
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
              <FRow label="Дата и время смены *" t={t}>
                <input type="datetime-local" value={form.shift_date} onChange={e=>set('shift_date',e.target.value)} style={inp(t)} />
              </FRow>
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
                  <FRow label="Кого заменяете" t={t}>
                    <input value={form.replace_who} onChange={e=>set('replace_who',e.target.value)} placeholder="Имя" style={inp(t)} />
                  </FRow>
                  <FRow label="На сколько часов" t={t}>
                    <input type="number" value={form.replace_hours} onChange={e=>set('replace_hours',e.target.value)} placeholder="Кол-во часов" style={inp(t)} />
                  </FRow>
                </>
              )}
            </>
          ) : (
            <>
              <FRow label="Город *" t={t}>
                <div style={{ display:'flex', gap:6 }}>
                  {CITIES.map(c=>(
                    <button key={c} onClick={()=>set('city',c)} style={{ flex:1, background:form.city===c?'rgba(139,92,246,0.15)':'transparent', border:`1px solid ${form.city===c?'rgba(139,92,246,0.4)':t.border}`, borderRadius:8, color:form.city===c?'#8b5cf6':t.text2, fontSize:11, fontWeight:600, padding:'7px 4px', cursor:'pointer' }}>{c}</button>
                  ))}
                </div>
              </FRow>
              <FRow label="Дата и время *" t={t}>
                <input type="datetime-local" value={form.shift_date} onChange={e=>set('shift_date',e.target.value)} style={inp(t)} />
              </FRow>
              <FRow label="Местоположение" t={t}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button onClick={getLocation} disabled={locLoading} style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)', borderRadius:8, color:'#10b981', fontSize:12, padding:'8px 14px', cursor:'pointer', flex:1 }}>
                    {locLoading ? '⏳ Получаем...' : form.lat ? '📍 Получено' : '📍 Поделиться локацией'}
                  </button>
                  {form.address && <span style={{ color:'#10b981', fontSize:11, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>✅ {form.address.slice(0,50)}...</span>}
                </div>
              </FRow>
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

// ─── Modal просмотра ──────────────────────────────────────────
function ShiftModal({ item, t, onClose }) {
  const { type, data } = item;
  const filial = FILIALS.find(f=>f.id===data.filial);
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:400, background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>{type==='spo'?'👷 Смена СПО':'👔 Смена Админ'}</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:8 }}>
          {type === 'spo' ? (
            <>
              {[
                ['Сотрудник', data.worker_name],
                ['Филиал', filial?.label],
                ['Руководитель', data.manager],
                ['Дата смены', new Date(data.shift_date).toLocaleString('ru-RU')],
                ['Тип смены', data.shift_type==='day'?'Дневная':'Суточная'],
                ['Замена', data.is_replacement?`Да — вместо ${data.replace_who} на ${data.replace_hours}ч`:'Нет'],
                ['Статус', data.status==='active'?'🟢 На смене':'✅ Отработано'],
              ].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${t.border}22` }}>
                  <span style={{ color:t.text2, fontSize:13 }}>{l}</span>
                  <span style={{ color:t.text, fontSize:13 }}>{v}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              {[
                ['Сотрудник', data.worker_name],
                ['Город', data.city],
                ['Дата и время', new Date(data.shift_date).toLocaleString('ru-RU')],
                ['Адрес', data.address||'Не указан'],
                ['Статус', data.status==='active'?'🟢 На смене':'✅ Отработано'],
              ].map(([l,v])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${t.border}22` }}>
                  <span style={{ color:t.text2, fontSize:13 }}>{l}</span>
                  <span style={{ color:t.text, fontSize:13 }}>{v}</span>
                </div>
              ))}
              {data.lat && (
                <a href={`https://maps.google.com/?q=${data.lat},${data.lng}`} target="_blank" rel="noopener noreferrer" style={{ display:'block', textAlign:'center', marginTop:8, background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, color:'#10b981', fontSize:12, padding:'8px', textDecoration:'none' }}>
                  🗺️ Открыть на карте
                </a>
              )}
            </>
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
const sel = (t) => ({ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'9px 12px', outline:'none' });
