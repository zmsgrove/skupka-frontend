import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import DateFilter, { computeDateRange } from './DateFilter';

const FILIALS = [
  { id:'sv47', label:'СВ47', city:'Уральск' },
  { id:'k162', label:'К162', city:'Уральск' },
  { id:'s32',  label:'С32',  city:'Атырау'  },
  { id:'a21',  label:'А21',  city:'Актобе'  },
];
const MANAGERS = ['Максатов Сырым','Кожа Бегдос','Кылышбаева Макпал','Аминов Нурлан','Александров Даниил'];
const FULL_ACCESS = ['admin','dir','zamdir','sysadmin'];
const CAN_MOVE = [...FULL_ACCESS];
const CAN_MOVE_RGM = ['rgmu','rgma'];
const TYPE_LABEL = { morning:'🌅 Утренний', evening:'🌆 Вечерний' };

function canMoveCard(user, card) {
  if (CAN_MOVE.includes(user.role)) return true;
  if (CAN_MOVE_RGM.includes(user.role)) {
    const f = FILIALS.find(f=>f.id===card.filial);
    return f && user.cities.includes(f.city);
  }
  return false;
}
function canSeeCard(user, card) {
  if ([...FULL_ACCESS,'rev'].includes(user.role)) return true;
  if (['rgmu','rgma'].includes(user.role)) {
    const f = FILIALS.find(f=>f.id===card.filial);
    return f && user.cities.includes(f.city);
  }
  return card.created_by === user.username;
}

export default function KassaPage({ user, theme }) {
  const t = theme;
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(null);
  const [selected, setSelected]   = useState(null);
  const [dateFilter, setDateFilter] = useState({ preset:'today', range: computeDateRange('today') });
  const draggingRef = useRef(null);
  const [dragOver, setDragOver]   = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const isAdmin = ['admin','dir','zamdir','sysadmin'].includes(user.role);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase.from('kassa_reports').select('*').order('created_at',{ascending:false});
    setReports(data||[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
    const ch = supabase.channel('kassa-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'kassa_reports'},fetchReports)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchReports]);

  const moveCard = async (id, status) => {
    await supabase.from('kassa_reports').update({status,updated_at:new Date().toISOString()}).eq('id',id);
    fetchReports();
  };

  const handleDelete = async (card) => {
    if (isAdmin) {
      await supabase.from('kassa_reports').delete().eq('id', card.id);
    } else {
      await supabase.from('kassa_reports').update({ delete_requested: true }).eq('id', card.id).catch(() => {});
    }
    fetchReports();
    setContextMenu(null);
  };

  const handleContextMenu = (card, e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ card, x: Math.min(e.clientX, window.innerWidth - 190), y: Math.min(e.clientY, window.innerHeight - 200) });
  };

  const handleDrop = (targetStatus) => {
    if (draggingRef.current && draggingRef.current.status !== targetStatus) {
      moveCard(draggingRef.current.id, targetStatus);
    }
    draggingRef.current = null;
    setDragOver(null);
  };

  const visibleReports = reports.filter(r => {
    if (!canSeeCard(user,r)) return false;
    if (dateFilter?.range) {
      const d = new Date(r.created_at);
      return d >= dateFilter.range.from && d <= dateFilter.range.to;
    }
    return true;
  });

  const morningReports = visibleReports.filter(r=>r.type==='morning' && r.status==='morning');
  const eveningReports = visibleReports.filter(r=>r.type==='evening' && r.status==='evening');
  const doneReports    = visibleReports.filter(r=>r.status==='done');

  const FILIAL_IDS = FILIALS.map(f=>f.id);
  const morningLaunched   = [...new Set(morningReports.map(r=>r.filial))];
  const morningUnlaunched = FILIAL_IDS.filter(f=>!morningLaunched.includes(f));
  const eveningLaunched   = [...new Set(eveningReports.map(r=>r.filial))];
  const eveningUnlaunched = FILIAL_IDS.filter(f=>!eveningLaunched.includes(f));

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:t.text2}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:36,height:36,border:`3px solid ${t.border}`,borderTop:'3px solid #E8263A',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}}/>
        Загрузка кассы...
      </div>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'12px 24px',borderBottom:`1px solid ${t.border}`,background:t.surface,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,flexWrap:'wrap',gap:10}}>
        <span style={{fontFamily:'Unbounded,sans-serif',fontSize:16,fontWeight:700,color:t.text}}>💰 Касса</span>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <DateFilter value={dateFilter} onChange={setDateFilter} theme={t} showAll />
          <button onClick={()=>setShowForm('morning')} style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:8,color:'#f59e0b',fontSize:12,fontWeight:700,padding:'8px 14px',cursor:'pointer'}}>🌅 Утренний</button>
          <button onClick={()=>setShowForm('evening')} style={{background:'rgba(139,92,246,0.15)',border:'1px solid rgba(139,92,246,0.4)',borderRadius:8,color:'#8b5cf6',fontSize:12,fontWeight:700,padding:'8px 14px',cursor:'pointer'}}>🌆 Вечерний</button>
        </div>
      </div>

      {/* Kanban — fixed height, scroll inside columns */}
      <div style={{flex:1,overflowX:'auto',overflowY:'hidden',padding:'16px 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(240px,1fr))',gap:14,height:'100%'}}>
          <KassaCol title="🌅 Утренний отчёт" color="#f59e0b" dropStatus="morning" cards={morningReports} user={user} t={t} onOpen={setSelected} onMove={moveCard} launched={morningLaunched} unlaunched={morningUnlaunched} draggingRef={draggingRef} dragOver={dragOver} setDragOver={setDragOver} onDrop={handleDrop} onContextMenu={handleContextMenu} />
          <KassaCol title="🌆 Вечерний отчёт" color="#8b5cf6" dropStatus="evening" cards={eveningReports} user={user} t={t} onOpen={setSelected} onMove={moveCard} launched={eveningLaunched} unlaunched={eveningUnlaunched} draggingRef={draggingRef} dragOver={dragOver} setDragOver={setDragOver} onDrop={handleDrop} onContextMenu={handleContextMenu} />
          <KassaCol title="✅ Завершённые"    color="#10b981" dropStatus="done"    cards={doneReports}    user={user} t={t} onOpen={setSelected} onMove={null} isDone draggingRef={draggingRef} dragOver={dragOver} setDragOver={setDragOver} onDrop={handleDrop} onContextMenu={handleContextMenu} />
        </div>
      </div>

      {showForm && <KassaForm type={showForm} user={user} t={t} onClose={()=>setShowForm(null)} onCreate={()=>{setShowForm(null);fetchReports();}} />}
      {selected && <KassaModal report={selected} user={user} t={t} onClose={()=>setSelected(null)} onMove={(s)=>{moveCard(selected.id,s);setSelected(null);}} onUpdate={fetchReports} />}

      {contextMenu && (
        <div onClick={e=>e.stopPropagation()} style={{ position:'fixed', top:contextMenu.y, left:contextMenu.x, zIndex:2000, background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', minWidth:180, overflow:'hidden' }}>
          {[
            { label:'✅ Завершить', action:()=>{ moveCard(contextMenu.card.id,'done'); setContextMenu(null); } },
            { label:'↩️ На доработку', action:()=>{ moveCard(contextMenu.card.id,contextMenu.card.type); setContextMenu(null); } },
            { label:'📂 Открыть', action:()=>{ setSelected(contextMenu.card); setContextMenu(null); } },
            { label:'🗑️ Удалить', action:()=>handleDelete(contextMenu.card), danger:true },
          ].map(item => (
            <div key={item.label} onClick={item.action} style={{ padding:'9px 14px', cursor:'pointer', fontSize:13, color:item.danger?'#ef4444':t.text, borderBottom:`1px solid ${t.border}22` }}
              onMouseEnter={e=>e.currentTarget.style.background=item.danger?'rgba(239,68,68,0.1)':t.surface2}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {item.label}
            </div>
          ))}
          {!isAdmin && contextMenu.card.delete_requested && (
            <div style={{ padding:'7px 14px', fontSize:11, color:'#f59e0b', background:'rgba(245,158,11,0.08)' }}>⏳ Запрос на удаление отправлен</div>
          )}
        </div>
      )}
    </div>
  );
}

function KassaCol({ title, color, dropStatus, cards, user, t, onOpen, onMove, isDone, launched, unlaunched, draggingRef, dragOver, setDragOver, onDrop, onContextMenu }) {
  const filialLabel = id => FILIALS.find(f=>f.id===id)?.label || id;
  const isOver = dragOver === dropStatus;
  return (
    <div
      onDragOver={e=>{ e.preventDefault(); setDragOver(dropStatus); }}
      onDragLeave={()=>setDragOver(null)}
      onDrop={()=>onDrop(dropStatus)}
      style={{display:'flex',flexDirection:'column',background:t.surface,border:`2px solid ${isOver?color:t.border}`,borderRadius:14,overflow:'hidden',height:'100%',transition:'border-color 0.15s'}}>
      <div style={{padding:'10px 14px',borderBottom:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <span style={{fontFamily:'Unbounded,sans-serif',fontSize:11,fontWeight:600,color}}>{title}</span>
        <span style={{background:color+'22',color,fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{cards.length}</span>
      </div>
      {!isDone && (launched || unlaunched) && (
        <div style={{padding:'8px 10px',borderBottom:`1px solid ${t.border}`,display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
          {launched && launched.length>0 && (
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              <span style={{color:'#10b981',fontSize:10,fontWeight:600,flexShrink:0}}>✅ Запустили:</span>
              {launched.map(id=><span key={id} style={{background:'rgba(16,185,129,0.12)',color:'#10b981',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:10}}>{filialLabel(id)}</span>)}
            </div>
          )}
          {unlaunched && unlaunched.length>0 && (
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
              <span style={{color:'#ef4444',fontSize:10,fontWeight:600,flexShrink:0}}>⚠️ Не запустили:</span>
              {unlaunched.map(id=><span key={id} style={{background:'rgba(239,68,68,0.12)',color:'#ef4444',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:10}}>{filialLabel(id)}</span>)}
            </div>
          )}
        </div>
      )}
      <div style={{flex:1,overflowY:'auto',padding:8,display:'flex',flexDirection:'column',gap:6}}>
        {cards.length===0 && <div style={{color:t.text2,fontSize:12,textAlign:'center',padding:'20px 0'}}>Нет отчётов</div>}
        {cards.map(card=>(
          <KassaCard key={card.id} card={card} user={user} t={t} color={color} isDone={isDone}
            onOpen={()=>onOpen(card)}
            onMove={onMove&&!isDone?(s)=>onMove(card.id,s):null}
            draggingRef={draggingRef}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  );
}

function KassaCard({ card, user, t, color, isDone, onOpen, onMove, draggingRef, onContextMenu }) {
  const filial = FILIALS.find(f=>f.id===card.filial);
  const hasDiff = card.cash_diff || card.noncash_diff;
  const date = new Date(card.report_date).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const canMove = onMove && canMoveCard(user,card);

  return (
    <div
      draggable
      onDragStart={()=>{ draggingRef.current = card; }}
      onDragEnd={()=>{ draggingRef.current = null; }}
      onClick={onOpen}
      onContextMenu={e=>onContextMenu(card,e)}
      style={{background:t.surface2,border:`1px solid ${hasDiff?'#ef4444':t.border}`,borderLeft:`3px solid ${card.delete_requested?'#ef4444':hasDiff?'#ef4444':color}`,borderRadius:10,padding:'10px 12px',cursor:'grab',transition:'all 0.15s',opacity:card.delete_requested?0.7:1}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <span style={{background:color+'22',color,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{filial?.label}</span>
          {isDone && <span style={{background:'rgba(255,255,255,0.08)',color:t.text2,fontSize:10,padding:'2px 6px',borderRadius:20}}>{TYPE_LABEL[card.type]}</span>}
          {card.delete_requested && <span style={{background:'rgba(239,68,68,0.15)',color:'#ef4444',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:20}}>🗑️ На удаление</span>}
        </div>
        <span style={{color:t.text2,fontSize:10}}>{date}</span>
      </div>
      <div style={{color:t.text,fontSize:12,fontWeight:600,marginBottom:4}}>
        {card.type==='morning'?`${card.who_gives} → ${card.who_accepts}`:card.who_shifts}
      </div>
      <div style={{color:t.text2,fontSize:11,marginBottom:4}}>{card.manager}</div>
      <div style={{display:'flex',gap:6}}>
        {card.kassa_even?<span style={{color:'#10b981',fontSize:10}}>✅ Ровная</span>:<span style={{color:'#ef4444',fontSize:10}}>❌ Не ровная</span>}
        {hasDiff&&<span style={{color:'#ef4444',fontSize:10,fontWeight:600}}>⚠️ Расхождение</span>}
      </div>
      {canMove && (
        <div style={{display:'flex',gap:6,marginTop:8}} onClick={e=>e.stopPropagation()}>
          <button onClick={()=>onMove('done')} style={{flex:1,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:6,color:'#10b981',fontSize:11,padding:'4px',cursor:'pointer'}}>✅ Завершить</button>
          <button onClick={()=>onMove('morning')} style={{flex:1,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,color:'#ef4444',fontSize:11,padding:'4px',cursor:'pointer'}}>↩️ Доработка</button>
        </div>
      )}
    </div>
  );
}

// ─── Форма создания с валидацией ──────────────────────────────
function KassaForm({ type, user, t, onClose, onCreate }) {
  const isMorning = type==='morning';
  const [form, setForm] = useState({
    filial:'',manager:'',report_date:'',
    who_gives:'',who_accepts:'',who_shifts:'',
    cash_kassa:'',cash_1c:'',cash_report:'',cash_diff:false,cash_diff_comment:'',
    noncash_terminal:'',noncash_1c:'',noncash_report:'',noncash_diff:false,noncash_diff_comment:'',
    kassa_even:false,has_z_report:false,has_x_report:false,has_vedomost:false,
  });
  const [warnings, setWarnings] = useState({});
  const set = (k,v) => {
    setForm(prev => {
      const next = {...prev,[k]:v};
      // Auto-detect cash discrepancy
      const w = {};
      const ck=parseFloat(next.cash_kassa), c1=parseFloat(next.cash_1c), cr=parseFloat(next.cash_report);
      if (!isNaN(ck)&&!isNaN(c1)&&!isNaN(cr) && (ck!==c1||ck!==cr||c1!==cr)) w.cash='⚠️ Суммы наличных не совпадают';
      const nt=parseFloat(next.noncash_terminal), n1=parseFloat(next.noncash_1c), nr=parseFloat(next.noncash_report);
      if (!isNaN(nt)&&!isNaN(n1)&&!isNaN(nr) && (nt!==n1||nt!==nr||n1!==nr)) w.noncash='⚠️ Суммы безналичных не совпадают';
      setWarnings(w);
      return next;
    });
  };

  const allChecked = isMorning ? (form.has_z_report && form.has_x_report && form.has_vedomost) : (form.has_x_report && form.has_vedomost);
  const canSubmit = form.filial && form.manager && form.report_date && allChecked;

  const submit = async () => {
    if (!canSubmit) return;
    const filial = FILIALS.find(f=>f.id===form.filial);
    await supabase.from('kassa_reports').insert({
      type, status:type, filial:form.filial, manager:form.manager,
      report_date:form.report_date, city:filial?.city, created_by:user.username,
      who_gives:form.who_gives, who_accepts:form.who_accepts, who_shifts:form.who_shifts,
      cash_kassa:parseFloat(form.cash_kassa)||null, cash_1c:parseFloat(form.cash_1c)||null, cash_report:parseFloat(form.cash_report)||null,
      cash_diff:form.cash_diff, cash_diff_comment:form.cash_diff_comment||null,
      noncash_terminal:parseFloat(form.noncash_terminal)||null, noncash_1c:parseFloat(form.noncash_1c)||null, noncash_report:parseFloat(form.noncash_report)||null,
      noncash_diff:form.noncash_diff, noncash_diff_comment:form.noncash_diff_comment||null,
      kassa_even:form.kassa_even, has_z_report:form.has_z_report, has_x_report:form.has_x_report, has_vedomost:form.has_vedomost,
    });
    onCreate();
  };

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:500}}/>
      <div className="skupka-modal" style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:560,maxHeight:'90vh',background:t.surface,border:`1px solid ${t.border}`,borderRadius:20,zIndex:501,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'16px 24px',borderBottom:`1px solid ${t.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontFamily:'Unbounded,sans-serif',fontSize:14,fontWeight:700,color:t.text}}>{isMorning?'🌅 Утренний отчёт':'🌆 Вечерний отчёт'}</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:t.text2,fontSize:20,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
          <FR label="Филиал *" t={t}>
            <div style={{display:'flex',gap:8}}>
              {FILIALS.map(f=><button key={f.id} onClick={()=>set('filial',f.id)} style={{flex:1,background:form.filial===f.id?'rgba(232,38,58,0.15)':'transparent',border:`1px solid ${form.filial===f.id?'rgba(232,38,58,0.5)':t.border}`,borderRadius:8,color:form.filial===f.id?'#E8263A':t.text2,fontSize:12,fontWeight:600,padding:'8px',cursor:'pointer'}}>{f.label}</button>)}
            </div>
          </FR>
          <FR label="Руководитель *" t={t}>
            <select value={form.manager} onChange={e=>set('manager',e.target.value)} style={sel(t)}>
              <option value="">— Выбрать —</option>
              {MANAGERS.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </FR>
          <FR label="Дата и время *" t={t}>
            <input type="datetime-local" value={form.report_date} onChange={e=>set('report_date',e.target.value)} style={inp(t)}/>
          </FR>
          {isMorning ? (
            <>
              <FR label="Кто сдаёт кассу" t={t}><input value={form.who_gives} onChange={e=>set('who_gives',e.target.value)} placeholder="Имя" style={inp(t)}/></FR>
              <FR label="Кто принимает кассу" t={t}><input value={form.who_accepts} onChange={e=>set('who_accepts',e.target.value)} placeholder="Имя" style={inp(t)}/></FR>
            </>
          ) : (
            <FR label="Кто делает пересменку" t={t}><input value={form.who_shifts} onChange={e=>set('who_shifts',e.target.value)} placeholder="Имя" style={inp(t)}/></FR>
          )}
          <Div label="💵 Наличные" t={t} warning={warnings.cash}/>
          <FR label="Наличных в кассе" t={t}><input type="number" value={form.cash_kassa} onChange={e=>set('cash_kassa',e.target.value)} placeholder="0" style={inp(t)}/></FR>
          <FR label="Наличных в 1С8" t={t}><input type="number" value={form.cash_1c} onChange={e=>set('cash_1c',e.target.value)} placeholder="0" style={inp(t)}/></FR>
          <FR label="Наличных в отчёте" t={t}><input type="number" value={form.cash_report} onChange={e=>set('cash_report',e.target.value)} placeholder="0" style={inp(t)}/></FR>
          <FR label="Расхождения наличных?" t={t}><YesNo val={form.cash_diff} onChange={v=>set('cash_diff',v)} t={t}/></FR>
          {form.cash_diff && <FR label="Комментарий" t={t}><input value={form.cash_diff_comment} onChange={e=>set('cash_diff_comment',e.target.value)} placeholder="Причина..." style={inp(t)}/></FR>}
          <Div label="💳 Безналичные" t={t} warning={warnings.noncash}/>
          <FR label="По терминалу" t={t}><input type="number" value={form.noncash_terminal} onChange={e=>set('noncash_terminal',e.target.value)} placeholder="0" style={inp(t)}/></FR>
          <FR label="По 1С8" t={t}><input type="number" value={form.noncash_1c} onChange={e=>set('noncash_1c',e.target.value)} placeholder="0" style={inp(t)}/></FR>
          <FR label="В отчёте" t={t}><input type="number" value={form.noncash_report} onChange={e=>set('noncash_report',e.target.value)} placeholder="0" style={inp(t)}/></FR>
          <FR label="Расхождения безнала?" t={t}><YesNo val={form.noncash_diff} onChange={v=>set('noncash_diff',v)} t={t}/></FR>
          {form.noncash_diff && <FR label="Комментарий" t={t}><input value={form.noncash_diff_comment} onChange={e=>set('noncash_diff_comment',e.target.value)} placeholder="Причина..." style={inp(t)}/></FR>}
          <Div label="📊 Итог" t={t}/>
          <FR label="Ровная ли общая касса?" t={t}><YesNo val={form.kassa_even} onChange={v=>set('kassa_even',v)} t={t} yesGreen/></FR>
          <Div label="☑️ Документы *" t={t}/>
          {isMorning && <ChkRow label="Выложили Z-отчёт" checked={form.has_z_report} onChange={()=>set('has_z_report',!form.has_z_report)} t={t}/>}
          <ChkRow label="Выложили Х-отчёт" checked={form.has_x_report} onChange={()=>set('has_x_report',!form.has_x_report)} t={t}/>
          <ChkRow label="Выложили покупюрную ведомость" checked={form.has_vedomost} onChange={()=>set('has_vedomost',!form.has_vedomost)} t={t}/>
          {!allChecked && <div style={{color:'#ef4444',fontSize:11,textAlign:'center'}}>⚠️ Отметьте все документы перед отправкой</div>}
        </div>
        <div style={{padding:'16px 24px',borderTop:`1px solid ${t.border}`,display:'flex',gap:10,flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,background:'transparent',border:`1px solid ${t.border}`,borderRadius:8,color:t.text2,fontSize:13,padding:'12px',cursor:'pointer'}}>Отмена</button>
          <button onClick={submit} disabled={!canSubmit} title={!allChecked?'Отметьте все документы':''} style={{flex:2,background:canSubmit?'#E8263A':t.surface2,border:'none',borderRadius:8,color:canSubmit?'#fff':t.text2,fontSize:13,fontWeight:700,padding:'12px',cursor:canSubmit?'pointer':'default'}}>
            {canSubmit ? 'Создать отчёт' : '⚠️ Отметьте документы'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Modal просмотра с комментариями ──────────────────────────
function KassaModal({ report, user, t, onClose, onMove, onUpdate }) {
  const filial = FILIALS.find(f=>f.id===report.filial);
  const isMorning = report.type==='morning';
  const canMove = canMoveCard(user,report) && report.status!=='done';
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    supabase.from('kassa_comments').select('*').eq('report_id',report.id).order('created_at').then(({data})=>setComments(data||[]));
  }, [report.id]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    await supabase.from('kassa_comments').insert({ report_id:report.id, user_id:user.username, sender_name:user.name, text:newComment.trim() });
    setNewComment('');
    const {data} = await supabase.from('kassa_comments').select('*').eq('report_id',report.id).order('created_at');
    setComments(data||[]);
  };

  const Row = ({label,value,highlight}) => (
    <div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${t.border}22`}}>
      <span style={{color:t.text2,fontSize:13}}>{label}</span>
      <span style={{color:highlight?'#ef4444':t.text,fontSize:13,fontWeight:highlight?700:400}}>{value}</span>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:500}}/>
      <div className="skupka-modal" style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:540,maxHeight:'88vh',background:t.surface,border:`1px solid ${t.border}`,borderRadius:20,zIndex:501,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'16px 24px',borderBottom:`1px solid ${t.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Unbounded,sans-serif',fontSize:14,fontWeight:700,color:t.text}}>{TYPE_LABEL[report.type]} — {filial?.label}</div>
            <div style={{color:t.text2,fontSize:11,marginTop:2}}>{new Date(report.report_date).toLocaleString('ru-RU')}</div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:t.text2,fontSize:20,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
          <Row label="Руководитель" value={report.manager}/>
          {isMorning?<><Row label="Кто сдаёт" value={report.who_gives}/><Row label="Кто принимает" value={report.who_accepts}/></>:<Row label="Кто делает пересменку" value={report.who_shifts}/>}
          <div style={{margin:'12px 0 6px',fontFamily:'Unbounded,sans-serif',fontSize:10,color:t.text2}}>💵 НАЛИЧНЫЕ</div>
          <Row label="В кассе" value={`${report.cash_kassa||0} ₸`}/>
          <Row label="В 1С8" value={`${report.cash_1c||0} ₸`}/>
          <Row label="В отчёте" value={`${report.cash_report||0} ₸`}/>
          <Row label="Расхождения" value={report.cash_diff?'Да ⚠️':'Нет ✅'} highlight={report.cash_diff}/>
          {report.cash_diff&&<Row label="Комментарий" value={report.cash_diff_comment} highlight/>}
          <div style={{margin:'12px 0 6px',fontFamily:'Unbounded,sans-serif',fontSize:10,color:t.text2}}>💳 БЕЗНАЛИЧНЫЕ</div>
          <Row label="По терминалу" value={`${report.noncash_terminal||0} ₸`}/>
          <Row label="По 1С8" value={`${report.noncash_1c||0} ₸`}/>
          <Row label="В отчёте" value={`${report.noncash_report||0} ₸`}/>
          <Row label="Расхождения" value={report.noncash_diff?'Да ⚠️':'Нет ✅'} highlight={report.noncash_diff}/>
          {report.noncash_diff&&<Row label="Комментарий" value={report.noncash_diff_comment} highlight/>}
          <div style={{margin:'12px 0 6px',fontFamily:'Unbounded,sans-serif',fontSize:10,color:t.text2}}>📊 ИТОГ</div>
          <Row label="Общая касса ровная" value={report.kassa_even?'Да ✅':'Нет ❌'} highlight={!report.kassa_even}/>
          <div style={{margin:'12px 0 6px',fontFamily:'Unbounded,sans-serif',fontSize:10,color:t.text2}}>☑️ ДОКУМЕНТЫ</div>
          {isMorning&&<Row label="Z-отчёт" value={report.has_z_report?'✅':'❌'} highlight={!report.has_z_report}/>}
          <Row label="Х-отчёт" value={report.has_x_report?'✅':'❌'} highlight={!report.has_x_report}/>
          <Row label="Покупюрная ведомость" value={report.has_vedomost?'✅':'❌'} highlight={!report.has_vedomost}/>

          {/* Комментарии */}
          <div style={{margin:'16px 0 8px',fontFamily:'Unbounded,sans-serif',fontSize:10,color:t.text2}}>💬 КОММЕНТАРИИ</div>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
            {comments.length===0&&<div style={{color:t.text2,fontSize:12,textAlign:'center',padding:'12px 0'}}>Нет комментариев</div>}
            {comments.map(c=>(
              <div key={c.id} style={{display:'flex',flexDirection:'column',alignItems:c.user_id===user.username?'flex-end':'flex-start'}}>
                <div style={{fontSize:11,color:t.text2,marginBottom:2}}>
                  {c.user_id!==user.username&&<span style={{fontWeight:600,color:t.text3,marginRight:4}}>{c.sender_name}</span>}
                  {new Date(c.created_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
                </div>
                <div style={{maxWidth:'75%',background:c.user_id===user.username?'rgba(232,38,58,0.15)':t.surface2,border:`1px solid ${c.user_id===user.username?'rgba(232,38,58,0.3)':t.border}`,borderRadius:10,padding:'8px 12px',color:t.text,fontSize:13,wordBreak:'break-word'}}>{c.text}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment()} placeholder="Написать комментарий..."
              style={{flex:1,background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:13,padding:'8px 12px',outline:'none',fontFamily:'Inter,sans-serif'}}/>
            <button onClick={addComment} disabled={!newComment.trim()} style={{background:newComment.trim()?'#E8263A':t.surface2,border:'none',borderRadius:8,color:newComment.trim()?'#fff':t.text2,fontSize:16,width:40,height:40,cursor:newComment.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>➤</button>
          </div>
        </div>
        {canMove && (
          <div style={{padding:'14px 24px',borderTop:`1px solid ${t.border}`,display:'flex',gap:8,flexShrink:0}}>
            <button onClick={()=>onMove('done')} style={{flex:1,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.4)',borderRadius:8,color:'#10b981',fontSize:13,fontWeight:700,padding:'10px',cursor:'pointer'}}>✅ Завершить</button>
            <button onClick={()=>onMove(report.type)} style={{flex:1,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,color:'#ef4444',fontSize:13,fontWeight:700,padding:'10px',cursor:'pointer'}}>↩️ На доработку</button>
          </div>
        )}
      </div>
    </>
  );
}

function FR({label,children,t}) { return <div style={{display:'flex',flexDirection:'column',gap:6}}><label style={{color:t.text2,fontSize:12,fontWeight:500}}>{label}</label>{children}</div>; }
function Div({label,t,warning}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{flex:1,height:1,background:t.border}}/>
        <span style={{color:t.text2,fontSize:11,fontWeight:600,fontFamily:'Unbounded,sans-serif',whiteSpace:'nowrap'}}>{label}</span>
        <div style={{flex:1,height:1,background:t.border}}/>
      </div>
      {warning && <div style={{color:'#ef4444',fontSize:11,textAlign:'center'}}>{warning}</div>}
    </div>
  );
}
function YesNo({val,onChange,t,yesGreen}) {
  return (
    <div style={{display:'flex',gap:8}}>
      <button onClick={()=>onChange(false)} style={{flex:1,background:!val?(yesGreen?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)'):'transparent',border:`1px solid ${!val?(yesGreen?'rgba(239,68,68,0.4)':'rgba(16,185,129,0.4)'):t.border}`,borderRadius:8,color:!val?(yesGreen?'#ef4444':'#10b981'):t.text2,fontSize:12,padding:'8px',cursor:'pointer'}}>Нет</button>
      <button onClick={()=>onChange(true)} style={{flex:1,background:val?(yesGreen?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)'):'transparent',border:`1px solid ${val?(yesGreen?'rgba(16,185,129,0.4)':'rgba(239,68,68,0.4)'):t.border}`,borderRadius:8,color:val?(yesGreen?'#10b981':'#ef4444'):t.text2,fontSize:12,padding:'8px',cursor:'pointer'}}>Да</button>
    </div>
  );
}
function ChkRow({label,checked,onChange,t}) {
  return (
    <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'5px 0'}}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{accentColor:'#E8263A',width:16,height:16,cursor:'pointer'}}/>
      <span style={{color:t.text,fontSize:13}}>{label}</span>
      {checked&&<span style={{color:'#10b981',fontSize:12}}>✅</span>}
    </label>
  );
}
const inp = t => ({width:'100%',background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:13,padding:'9px 12px',outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box'});
const sel = t => ({width:'100%',background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:13,padding:'9px 12px',outline:'none'});
