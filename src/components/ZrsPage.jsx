import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const COLS = [
  { id:'new',      label:'🆕 Новые',              color:'#3b82f6' },
  { id:'review',   label:'⚡ На согласовании',     color:'#f59e0b' },
  { id:'waiting',  label:'🕐 Ждёт закрывашки',    color:'#8b5cf6' },
  { id:'done',     label:'✅ Закрытые',            color:'#10b981' },
  { id:'rejected', label:'❌ Отказ',               color:'#ef4444' },
];

const CAN_SEE  = ['admin','dir','zamdir','rgmu','rgma'];
const CAN_MOVE = ['admin','dir','zamdir'];
const FMT = n => new Intl.NumberFormat('ru-KZ').format(Math.round(n||0));

export default function ZrsPage({ user, theme }) {
  const t = theme;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const canSee  = CAN_SEE.includes(user.role);
  const canMove = CAN_MOVE.includes(user.role);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('zrs_requests').select('*').order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!canSee) return;
    fetch();
    const ch = supabase.channel('zrs-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'zrs_requests' }, fetch)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetch, canSee]);

  const moveCard = async (id, status) => {
    await supabase.from('zrs_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetch();
  };

  if (!canSee) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:t.text2, fontSize:14 }}>
      Нет доступа к разделу ЗРС
    </div>
  );

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:t.text2 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:`3px solid ${t.border}`, borderTop:'3px solid #06b6d4', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        Загрузка ЗРС...
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 70px)', overflow:'hidden' }}>
      <div style={{ padding:'12px 24px', borderBottom:`1px solid ${t.border}`, background:t.surface, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:16, fontWeight:700, color:t.text }}>📝 ЗРС</span>
        <button onClick={() => setShowForm(true)} style={{ background:'rgba(6,182,212,0.15)', border:'1px solid rgba(6,182,212,0.4)', borderRadius:8, color:'#06b6d4', fontSize:12, fontWeight:700, padding:'8px 16px', cursor:'pointer' }}>
          + Новая заявка
        </button>
      </div>

      <div style={{ flex:1, overflowX:'auto', overflowY:'hidden', padding:'16px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:`repeat(${COLS.length},minmax(220px,1fr))`, gap:12, height:'100%' }}>
          {COLS.map(col => {
            const cards = requests.filter(r => r.status === col.id);
            return (
              <div key={col.id} style={{ display:'flex', flexDirection:'column', background:t.surface, border:`2px solid ${t.border}`, borderRadius:14, overflow:'hidden' }}>
                <div style={{ padding:'10px 14px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:600, color:col.color }}>{col.label}</span>
                  <span style={{ background:col.color+'22', color:col.color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{cards.length}</span>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
                  {cards.length === 0 && <div style={{ color:t.text2, fontSize:12, textAlign:'center', padding:'20px 0' }}>Нет заявок</div>}
                  {cards.map(card => (
                    <ZrsCard key={card.id} card={card} user={user} t={t} color={col.color}
                      onOpen={() => setSelected(card)}
                      canMove={canMove && col.id !== 'done' && col.id !== 'rejected'}
                      onMove={(status) => moveCard(card.id, status)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && <ZrsForm user={user} t={t} onClose={() => setShowForm(false)} onCreate={() => { setShowForm(false); fetch(); }} />}
      {selected && <ZrsModal request={selected} user={user} t={t} onClose={() => setSelected(null)} canMove={canMove} onMove={(s) => { moveCard(selected.id, s); setSelected(null); }} />}
    </div>
  );
}

function ZrsCard({ card, t, color, onOpen, canMove, onMove }) {
  const MOVE_OPTIONS = {
    new:     [{ status:'review',   label:'⚡ В работу' },  { status:'rejected', label:'❌ Отказ' }],
    review:  [{ status:'waiting',  label:'🕐 Ждёт закрывашки' }, { status:'rejected', label:'❌ Отказ' }],
    waiting: [{ status:'done',     label:'✅ Закрыть' },   { status:'rejected', label:'❌ Отказ' }],
  };
  const moves = MOVE_OPTIONS[card.status] || [];

  return (
    <div onClick={onOpen} style={{ background:t.surface2, border:`1px solid ${t.border}`, borderLeft:`3px solid ${color}`, borderRadius:10, padding:'10px 12px', cursor:'pointer' }}>
      <div style={{ color:t.text, fontSize:13, fontWeight:600, marginBottom:4 }}>{card.requester}</div>
      <div style={{ color:'#f0b429', fontSize:14, fontWeight:700, marginBottom:4 }}>{FMT(card.amount)} ₸</div>
      <div style={{ color:t.text2, fontSize:11, marginBottom:4 }}>{card.goal}</div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ background:card.payment_type==='rko'?'rgba(245,158,11,0.15)':'rgba(59,130,246,0.15)', color:card.payment_type==='rko'?'#f59e0b':'#3b82f6', fontSize:10, padding:'2px 7px', borderRadius:20 }}>
          {card.payment_type==='rko'?'РКО':'Безнал'}
        </span>
        <span style={{ color:t.text2, fontSize:10 }}>{new Date(card.plan_date).toLocaleDateString('ru-RU')}</span>
      </div>
      {canMove && moves.length > 0 && (
        <div style={{ display:'flex', gap:4, marginTop:8 }} onClick={e => e.stopPropagation()}>
          {moves.map(m => (
            <button key={m.status} onClick={() => onMove(m.status)} style={{ flex:1, background:'transparent', border:`1px solid ${t.border}`, borderRadius:6, color:t.text2, fontSize:10, padding:'4px 2px', cursor:'pointer' }}>{m.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ZrsForm({ user, t, onClose, onCreate }) {
  const [form, setForm] = useState({ requester:'', amount:'', goal:'', plan_date:'', payment_type:'' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const valid = form.requester && form.amount && form.goal && form.plan_date && form.payment_type;

  const submit = async () => {
    if (!valid) return;
    await supabase.from('zrs_requests').insert({ ...form, amount: parseFloat(form.amount), created_by: user.username });
    onCreate();
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:460, background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:24, zIndex:501, display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>📝 Новая заявка ЗРС</div>

        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <label style={{ color:t.text2, fontSize:12 }}>Кто запрашивает *</label>
          <input value={form.requester} onChange={e => set('requester', e.target.value)} placeholder="Имя" style={inp(t)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <label style={{ color:t.text2, fontSize:12 }}>Сумма *</label>
          <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0 ₸" style={inp(t)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <label style={{ color:t.text2, fontSize:12 }}>Цель *</label>
          <input value={form.goal} onChange={e => set('goal', e.target.value)} placeholder="На что запрашивается сумма" style={inp(t)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <label style={{ color:t.text2, fontSize:12 }}>Дата фин. планирования *</label>
          <input type="date" value={form.plan_date} onChange={e => set('plan_date', e.target.value)} style={inp(t)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <label style={{ color:t.text2, fontSize:12 }}>Вариант выплаты *</label>
          <div style={{ display:'flex', gap:8 }}>
            {[['rko','РКО с кассы'],['noncash','Безнал']].map(([val,label]) => (
              <button key={val} onClick={() => set('payment_type', val)} style={{ flex:1, background:form.payment_type===val?'rgba(6,182,212,0.15)':'transparent', border:`1px solid ${form.payment_type===val?'rgba(6,182,212,0.4)':t.border}`, borderRadius:8, color:form.payment_type===val?'#06b6d4':t.text2, fontSize:12, padding:'10px', cursor:'pointer' }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:13, padding:'11px', cursor:'pointer' }}>Отмена</button>
          <button onClick={submit} disabled={!valid} style={{ flex:2, background:valid?'#06b6d4':t.surface2, border:'none', borderRadius:8, color:valid?'#fff':t.text2, fontSize:13, fontWeight:700, padding:'11px', cursor:valid?'pointer':'default' }}>Создать заявку</button>
        </div>
      </div>
    </>
  );
}

function ZrsModal({ request, t, onClose, canMove, onMove }) {
  const statusLabel = { new:'🆕 Новая', review:'⚡ На согласовании', waiting:'🕐 Ждёт закрывашки', done:'✅ Закрыта', rejected:'❌ Отказ' };
  const MOVES = {
    new:    [{ s:'review', l:'⚡ В работу', c:'#f59e0b' }, { s:'rejected', l:'❌ Отказ', c:'#ef4444' }],
    review: [{ s:'waiting', l:'🕐 Ждёт закрывашки', c:'#8b5cf6' }, { s:'rejected', l:'❌ Отказ', c:'#ef4444' }],
    waiting:[{ s:'done', l:'✅ Закрыть', c:'#10b981' }, { s:'rejected', l:'❌ Отказ', c:'#ef4444' }],
  };
  const moves = MOVES[request.status] || [];

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:440, background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>📝 Заявка ЗРС</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:10 }}>
          {[
            ['Статус', statusLabel[request.status]],
            ['Кто запрашивает', request.requester],
            ['Сумма', `${FMT(request.amount)} ₸`],
            ['Цель', request.goal],
            ['Дата планирования', new Date(request.plan_date).toLocaleDateString('ru-RU')],
            ['Вариант выплаты', request.payment_type==='rko'?'РКО с кассы':'Безнал'],
            ['Создал', request.created_by],
            ['Дата заявки', new Date(request.created_at).toLocaleString('ru-RU')],
          ].map(([label, value]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:`1px solid ${t.border}22` }}>
              <span style={{ color:t.text2, fontSize:13 }}>{label}</span>
              <span style={{ color:t.text, fontSize:13, fontWeight:500 }}>{value}</span>
            </div>
          ))}
        </div>
        {canMove && moves.length > 0 && (
          <div style={{ padding:'0 24px 20px', display:'flex', gap:8 }}>
            {moves.map(m => (
              <button key={m.s} onClick={() => onMove(m.s)} style={{ flex:1, background:m.c+'22', border:`1px solid ${m.c}44`, borderRadius:8, color:m.c, fontSize:12, fontWeight:700, padding:'10px', cursor:'pointer' }}>{m.l}</button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const inp = (t) => ({ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'9px 12px', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' });
