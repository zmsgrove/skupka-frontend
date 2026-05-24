import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import DateFilter, { computeDateRange } from './DateFilter';

const COLS = [
  { id:'new',      label:'🆕 Новые',           color:'#3b82f6' },
  { id:'review',   label:'⚡ На согласовании',  color:'#f59e0b' },
  { id:'waiting',  label:'🕐 Ждёт закрывашки', color:'#8b5cf6' },
  { id:'done',     label:'✅ Закрытые',         color:'#10b981' },
  { id:'rejected', label:'❌ Отказ',            color:'#ef4444' },
];
const CAN_SEE  = ['admin','dir','zamdir','sysadmin','rev','rgmu','rgma'];
const CAN_MOVE = ['admin','dir','zamdir','sysadmin'];
const FMT = n => new Intl.NumberFormat('ru-KZ').format(Math.round(n||0));

export default function ZrsPage({ user, theme }) {
  const t = theme;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const canSee  = CAN_SEE.includes(user.role);
  const canMove = CAN_MOVE.includes(user.role);
  const isAdmin = ['admin','dir','zamdir','sysadmin'].includes(user.role);
  const draggingRef = useRef(null);
  const [dragOver, setDragOver]     = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [dateFilter, setDateFilter] = useState({ preset:'today', range: computeDateRange('today') });

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('zrs_requests').select('*').order('created_at',{ascending:false});
    setRequests(data||[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!canSee) return;
    fetch();
    const ch = supabase.channel('zrs-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'zrs_requests'},fetch)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetch, canSee]);

  const moveCard = async (id, status) => {
    await supabase.from('zrs_requests').update({status,updated_at:new Date().toISOString()}).eq('id',id);
    fetch();
  };

  const handleDelete = async (card) => {
    if (isAdmin) {
      await supabase.from('zrs_requests').delete().eq('id', card.id);
    } else {
      await supabase.from('zrs_requests').update({ delete_requested: true }).eq('id', card.id).catch(() => {});
    }
    fetch();
    setContextMenu(null);
  };

  const handleContextMenu = (card, e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ card, x: Math.min(e.clientX, window.innerWidth - 190), y: Math.min(e.clientY, window.innerHeight - 220) });
  };

  const handleDrop = (targetStatus) => {
    if (draggingRef.current && canMove && draggingRef.current.status !== targetStatus) {
      moveCard(draggingRef.current.id, targetStatus);
    }
    draggingRef.current = null;
    setDragOver(null);
  };

  if (!canSee) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:t.text2,fontSize:14}}>Нет доступа к разделу ЗРС</div>;

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:t.text2}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:36,height:36,border:`3px solid ${t.border}`,borderTop:'3px solid #06b6d4',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}}/>
        Загрузка ЗРС...
      </div>
    </div>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      <div style={{padding:'12px 24px',borderBottom:`1px solid ${t.border}`,background:t.surface,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,flexWrap:'wrap',gap:8}}>
        <span style={{fontFamily:'Unbounded,sans-serif',fontSize:16,fontWeight:700,color:t.text}}>📝 ЗРС</span>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <DateFilter value={dateFilter} onChange={setDateFilter} theme={t} showAll />
          <button onClick={()=>setShowForm(true)} style={{background:'rgba(6,182,212,0.15)',border:'1px solid rgba(6,182,212,0.4)',borderRadius:8,color:'#06b6d4',fontSize:12,fontWeight:700,padding:'8px 16px',cursor:'pointer'}}>+ Новая заявка</button>
        </div>
      </div>
      <div style={{flex:1,overflowX:'auto',overflowY:'hidden',padding:'16px 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:`repeat(${COLS.length},minmax(200px,1fr))`,gap:12,height:'100%'}}>
          {COLS.map(col => {
            const baseCards = requests.filter(r=>r.status===col.id);
            const cards = dateFilter?.range
              ? baseCards.filter(r => { const d = new Date(r.created_at); return d >= dateFilter.range.from && d <= dateFilter.range.to; })
              : baseCards;
            const isOver = dragOver === col.id;
            return (
              <div key={col.id}
                onDragOver={e=>{ e.preventDefault(); setDragOver(col.id); }}
                onDragLeave={()=>setDragOver(null)}
                onDrop={()=>handleDrop(col.id)}
                style={{display:'flex',flexDirection:'column',background:t.surface,border:`2px solid ${isOver?col.color:t.border}`,borderRadius:14,overflow:'hidden',height:'100%',transition:'border-color 0.15s'}}>
                <div style={{padding:'10px 14px',borderBottom:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
                  <span style={{fontFamily:'Unbounded,sans-serif',fontSize:11,fontWeight:600,color:col.color}}>{col.label}</span>
                  <span style={{background:col.color+'22',color:col.color,fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{cards.length}</span>
                </div>
                <div style={{flex:1,overflowY:'auto',padding:8,display:'flex',flexDirection:'column',gap:6}}>
                  {cards.length===0&&<div style={{color:t.text2,fontSize:12,textAlign:'center',padding:'20px 0'}}>Нет заявок</div>}
                  {cards.map(card=>(
                    <ZrsCard key={card.id} card={card} user={user} t={t} color={col.color}
                      onOpen={()=>setSelected(card)}
                      canMove={canMove&&col.id!=='done'&&col.id!=='rejected'}
                      onMove={(s)=>moveCard(card.id,s)}
                      draggingRef={draggingRef}
                      onContextMenu={handleContextMenu}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {showForm&&<ZrsForm user={user} t={t} onClose={()=>setShowForm(false)} onCreate={()=>{setShowForm(false);fetch();}}/>}
      {selected&&<ZrsModal request={selected} user={user} t={t} onClose={()=>setSelected(null)} canMove={canMove} onMove={(s)=>{moveCard(selected.id,s);setSelected(null);}}/>}

      {contextMenu && (
        <div onClick={e=>e.stopPropagation()} style={{ position:'fixed', top:contextMenu.y, left:contextMenu.x, zIndex:2000, background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.3)', minWidth:180, overflow:'hidden' }}>
          {[
            { label:'✅ Закрыть', action:()=>{ moveCard(contextMenu.card.id,'done'); setContextMenu(null); } },
            { label:'❌ Отказ', action:()=>{ moveCard(contextMenu.card.id,'rejected'); setContextMenu(null); } },
            { label:'📂 Открыть', action:()=>{ setSelected(contextMenu.card); setContextMenu(null); } },
            { label:'🗑️ Удалить', action:()=>handleDelete(contextMenu.card), danger:true },
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

function ZrsCard({ card, t, color, onOpen, canMove, onMove, draggingRef, onContextMenu }) {
  const MOVES = {
    new:    [{status:'review',label:'⚡ В работу'},{status:'rejected',label:'❌ Отказ'}],
    review: [{status:'waiting',label:'🕐 Ждёт закрывашки'},{status:'rejected',label:'❌ Отказ'}],
    waiting:[{status:'done',label:'✅ Закрыть'},{status:'rejected',label:'❌ Отказ'}],
  };
  const moves = MOVES[card.status]||[];
  return (
    <div
      draggable
      onDragStart={()=>{ draggingRef.current = card; }}
      onDragEnd={()=>{ draggingRef.current = null; }}
      onClick={onOpen}
      onContextMenu={e=>onContextMenu(card,e)}
      style={{background:t.surface2,border:`1px solid ${t.border}`,borderLeft:`3px solid ${card.delete_requested?'#ef4444':color}`,borderRadius:10,padding:'10px 12px',cursor:'grab',opacity:card.delete_requested?0.7:1}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
        <span style={{color:t.text,fontSize:13,fontWeight:600}}>{card.requester}</span>
        {card.delete_requested && <span style={{background:'rgba(239,68,68,0.15)',color:'#ef4444',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:20}}>🗑️ На удаление</span>}
      </div>
      <div style={{color:'#f0b429',fontSize:14,fontWeight:700,marginBottom:4}}>{FMT(card.amount)} ₸</div>
      <div style={{color:t.text2,fontSize:11,marginBottom:4}}>{card.goal}</div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{background:card.payment_type==='rko'?'rgba(245,158,11,0.15)':'rgba(59,130,246,0.15)',color:card.payment_type==='rko'?'#f59e0b':'#3b82f6',fontSize:10,padding:'2px 7px',borderRadius:20}}>{card.payment_type==='rko'?'РКО':'Безнал'}</span>
        <span style={{color:t.text2,fontSize:10}}>{new Date(card.plan_date).toLocaleDateString('ru-RU')}</span>
      </div>
      {canMove&&moves.length>0&&(
        <div style={{display:'flex',gap:4,marginTop:8}} onClick={e=>e.stopPropagation()}>
          {moves.map(m=><button key={m.status} onClick={()=>onMove(m.status)} style={{flex:1,background:'transparent',border:`1px solid ${t.border}`,borderRadius:6,color:t.text2,fontSize:10,padding:'4px 2px',cursor:'pointer'}}>{m.label}</button>)}
        </div>
      )}
    </div>
  );
}

function ZrsForm({ user, t, onClose, onCreate }) {
  const [form, setForm] = useState({requester:'',amount:'',goal:'',plan_date:'',payment_type:''});
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const valid = form.requester&&form.amount&&form.goal&&form.plan_date&&form.payment_type;
  const submit = async () => {
    if (!valid) return;
    await supabase.from('zrs_requests').insert({...form,amount:parseFloat(form.amount),created_by:user.username});
    onCreate();
  };
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:500}}/>
      <div className="skupka-modal" style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:460,background:t.surface,border:`1px solid ${t.border}`,borderRadius:20,padding:24,zIndex:501,display:'flex',flexDirection:'column',gap:14}}>
        <div style={{fontFamily:'Unbounded,sans-serif',fontSize:14,fontWeight:700,color:t.text}}>📝 Новая заявка ЗРС</div>
        {[['requester','Кто запрашивает *','text','Имя'],['amount','Сумма *','number','0 ₸'],['goal','Цель *','text','На что запрашивается']].map(([k,l,tp,ph])=>(
          <div key={k} style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{color:t.text2,fontSize:12}}>{l}</label>
            <input type={tp} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} style={inp(t)}/>
          </div>
        ))}
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <label style={{color:t.text2,fontSize:12}}>Дата фин. планирования *</label>
          <input type="date" value={form.plan_date} onChange={e=>set('plan_date',e.target.value)} style={inp(t)}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <label style={{color:t.text2,fontSize:12}}>Вариант выплаты *</label>
          <div style={{display:'flex',gap:8}}>
            {[['rko','РКО с кассы'],['noncash','Безнал']].map(([v,l])=>(
              <button key={v} onClick={()=>set('payment_type',v)} style={{flex:1,background:form.payment_type===v?'rgba(6,182,212,0.15)':'transparent',border:`1px solid ${form.payment_type===v?'rgba(6,182,212,0.4)':t.border}`,borderRadius:8,color:form.payment_type===v?'#06b6d4':t.text2,fontSize:12,padding:'10px',cursor:'pointer'}}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:10,marginTop:4}}>
          <button onClick={onClose} style={{flex:1,background:'transparent',border:`1px solid ${t.border}`,borderRadius:8,color:t.text2,fontSize:13,padding:'11px',cursor:'pointer'}}>Отмена</button>
          <button onClick={submit} disabled={!valid} style={{flex:2,background:valid?'#06b6d4':t.surface2,border:'none',borderRadius:8,color:valid?'#fff':t.text2,fontSize:13,fontWeight:700,padding:'11px',cursor:valid?'pointer':'default'}}>Создать заявку</button>
        </div>
      </div>
    </>
  );
}

function ZrsModal({ request, t, onClose, canMove, onMove }) {
  const statusLabel = {new:'🆕 Новая',review:'⚡ На согласовании',waiting:'🕐 Ждёт закрывашки',done:'✅ Закрыта',rejected:'❌ Отказ'};
  const MOVES = {
    new:    [{s:'review',l:'⚡ В работу',c:'#f59e0b'},{s:'rejected',l:'❌ Отказ',c:'#ef4444'}],
    review: [{s:'waiting',l:'🕐 Ждёт закрывашки',c:'#8b5cf6'},{s:'rejected',l:'❌ Отказ',c:'#ef4444'}],
    waiting:[{s:'done',l:'✅ Закрыть',c:'#10b981'},{s:'rejected',l:'❌ Отказ',c:'#ef4444'}],
  };
  const moves = MOVES[request.status]||[];
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    supabase.from('zrs_comments').select('*').eq('request_id',request.id).order('created_at').then(({data})=>setComments(data||[]));
  }, [request.id]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    await supabase.from('zrs_comments').insert({request_id:request.id,user_id:request.created_by,sender_name:request.created_by,text:newComment.trim()});
    setNewComment('');
    const {data} = await supabase.from('zrs_comments').select('*').eq('request_id',request.id).order('created_at');
    setComments(data||[]);
  };

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:500}}/>
      <div className="skupka-modal" style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:460,maxHeight:'85vh',background:t.surface,border:`1px solid ${t.border}`,borderRadius:20,zIndex:501,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'16px 24px',borderBottom:`1px solid ${t.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <span style={{fontFamily:'Unbounded,sans-serif',fontSize:14,fontWeight:700,color:t.text}}>📝 Заявка ЗРС</span>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:t.text2,fontSize:20,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'16px 24px'}}>
          {[['Статус',statusLabel[request.status]],['Кто запрашивает',request.requester],['Сумма',`${FMT(request.amount)} ₸`],['Цель',request.goal],['Дата планирования',new Date(request.plan_date).toLocaleDateString('ru-RU')],['Вариант выплаты',request.payment_type==='rko'?'РКО с кассы':'Безнал'],['Создал',request.created_by],['Дата заявки',new Date(request.created_at).toLocaleString('ru-RU')]].map(([l,v])=>(
            <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${t.border}22`}}>
              <span style={{color:t.text2,fontSize:13}}>{l}</span>
              <span style={{color:t.text,fontSize:13}}>{v}</span>
            </div>
          ))}
          <div style={{margin:'16px 0 8px',fontFamily:'Unbounded,sans-serif',fontSize:10,color:t.text2}}>💬 КОММЕНТАРИИ</div>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
            {comments.length===0&&<div style={{color:t.text2,fontSize:12,textAlign:'center',padding:'10px 0'}}>Нет комментариев</div>}
            {comments.map(c=>(
              <div key={c.id} style={{background:t.surface2,border:`1px solid ${t.border}`,borderRadius:8,padding:'8px 12px'}}>
                <div style={{fontSize:11,color:t.text2,marginBottom:3}}>{c.sender_name} · {new Date(c.created_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</div>
                <div style={{color:t.text,fontSize:13}}>{c.text}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment()} placeholder="Написать комментарий..." style={{flex:1,background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:13,padding:'8px 12px',outline:'none',fontFamily:'Inter,sans-serif'}}/>
            <button onClick={addComment} disabled={!newComment.trim()} style={{background:newComment.trim()?'#06b6d4':t.surface2,border:'none',borderRadius:8,color:newComment.trim()?'#fff':t.text2,fontSize:16,width:40,height:40,cursor:newComment.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>➤</button>
          </div>
        </div>
        {canMove&&moves.length>0&&(
          <div style={{padding:'14px 24px',borderTop:`1px solid ${t.border}`,display:'flex',gap:8,flexShrink:0}}>
            {moves.map(m=><button key={m.s} onClick={()=>onMove(m.s)} style={{flex:1,background:m.c+'22',border:`1px solid ${m.c}44`,borderRadius:8,color:m.c,fontSize:12,fontWeight:700,padding:'10px',cursor:'pointer'}}>{m.l}</button>)}
          </div>
        )}
      </div>
    </>
  );
}

const inp = t=>({width:'100%',background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:13,padding:'9px 12px',outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box'});
