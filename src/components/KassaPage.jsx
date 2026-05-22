import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

const FILIALS = [
  { id:'sv47', label:'СВ47', city:'Уральск' },
  { id:'k162', label:'К162', city:'Уральск' },
  { id:'s32',  label:'С32',  city:'Атырау'  },
  { id:'a21',  label:'А21',  city:'Актобе'  },
];

const MANAGERS = ['Максатов Сырым','Кожа Бегдос','Кылышбаева Макпал','Аминов Нурлан','Александров Даниил'];
const CAN_MOVE = ['admin','dir','zamdir'];
const CAN_MOVE_RGM = ['rgmu','rgma'];

function canMoveCard(user, card) {
  if (CAN_MOVE.includes(user.role)) return true;
  if (CAN_MOVE_RGM.includes(user.role)) {
    const filial = FILIALS.find(f => f.id === card.filial);
    return filial && user.cities.includes(filial.city);
  }
  return false;
}

function canSeeCard(user, card) {
  if (['admin','dir','zamdir'].includes(user.role)) return true;
  if (['rgmu','rgma'].includes(user.role)) {
    const filial = FILIALS.find(f => f.id === card.filial);
    return filial && user.cities.includes(filial.city);
  }
  return card.created_by === user.username;
}

export default function KassaPage({ user, theme }) {
  const t = theme;
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(null); // 'morning' | 'evening'
  const [selected, setSelected]   = useState(null);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase.from('kassa_reports').select('*').order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
    const ch = supabase.channel('kassa-realtime')
      .on('postgres_changes', { event:'*', schema:'public', table:'kassa_reports' }, fetchReports)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchReports]);

  const moveCard = async (id, status) => {
    await supabase.from('kassa_reports').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchReports();
  };

  const visibleReports = reports.filter(r => canSeeCard(user, r));
  const morningReports = visibleReports.filter(r => r.type === 'morning' && r.status === 'morning');
  const eveningReports = visibleReports.filter(r => r.type === 'evening' && r.status === 'evening');
  const doneReports    = visibleReports.filter(r => r.status === 'done');

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:t.text2 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:`3px solid ${t.border}`, borderTop:'3px solid #f0b429', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        Загрузка кассы...
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 70px)', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 24px', borderBottom:`1px solid ${t.border}`, background:t.surface, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:16, fontWeight:700, color:t.text }}>💰 Касса</span>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowForm('morning')} style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.4)', borderRadius:8, color:'#f59e0b', fontSize:12, fontWeight:700, padding:'8px 16px', cursor:'pointer' }}>
            🌅 Утренний отчёт
          </button>
          <button onClick={() => setShowForm('evening')} style={{ background:'rgba(139,92,246,0.15)', border:'1px solid rgba(139,92,246,0.4)', borderRadius:8, color:'#8b5cf6', fontSize:12, fontWeight:700, padding:'8px 16px', cursor:'pointer' }}>
            🌆 Вечерний отчёт
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ flex:1, overflowX:'auto', overflowY:'hidden', padding:'16px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(260px,1fr))', gap:14, height:'100%' }}>

          {/* Утренние */}
          <KassaColumn
            title="🌅 Утренний отчёт" color="#f59e0b"
            cards={morningReports} user={user} t={t}
            onOpen={setSelected} onMove={moveCard}
          />

          {/* Вечерние */}
          <KassaColumn
            title="🌆 Вечерний отчёт" color="#8b5cf6"
            cards={eveningReports} user={user} t={t}
            onOpen={setSelected} onMove={moveCard}
          />

          {/* Завершённые */}
          <KassaColumn
            title="✅ Завершённые" color="#10b981"
            cards={doneReports} user={user} t={t}
            onOpen={setSelected} onMove={null}
            isDone
          />
        </div>
      </div>

      {/* Форма создания */}
      {showForm && (
        <KassaForm type={showForm} user={user} t={t}
          onClose={() => setShowForm(null)}
          onCreate={() => { setShowForm(null); fetchReports(); }}
        />
      )}

      {/* Открытая карточка */}
      {selected && (
        <KassaModal report={selected} user={user} t={t}
          onClose={() => setSelected(null)}
          onMove={(status) => { moveCard(selected.id, status); setSelected(null); }}
        />
      )}
    </div>
  );
}

// ─── Колонка ──────────────────────────────────────────────────
function KassaColumn({ title, color, cards, user, t, onOpen, onMove, isDone }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', background:t.surface, border:`2px solid ${t.border}`, borderRadius:14, overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:600, color }}>{title}</span>
        <span style={{ background:color+'22', color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{cards.length}</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:6 }}>
        {cards.length === 0 && <div style={{ color:t.text2, fontSize:12, textAlign:'center', padding:'20px 0' }}>Нет отчётов</div>}
        {cards.map(card => (
          <KassaCard key={card.id} card={card} user={user} t={t} color={color}
            onOpen={() => onOpen(card)}
            onMove={onMove && !isDone ? (status) => onMove(card.id, status) : null}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Карточка ─────────────────────────────────────────────────
function KassaCard({ card, user, t, color, onOpen, onMove }) {
  const filial = FILIALS.find(f => f.id === card.filial);
  const canMove = onMove && canMoveCard(user, card);
  const date = new Date(card.report_date).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
  const hasDiff = card.cash_diff || card.noncash_diff;

  return (
    <div onClick={onOpen} style={{ background:t.surface2, border:`1px solid ${hasDiff?'#ef4444':t.border}`, borderLeft:`3px solid ${hasDiff?'#ef4444':color}`, borderRadius:10, padding:'10px 12px', cursor:'pointer', transition:'all 0.15s' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ background:color+'22', color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{filial?.label}</span>
        <span style={{ color:t.text2, fontSize:10 }}>{date}</span>
      </div>
      <div style={{ color:t.text, fontSize:12, fontWeight:600, marginBottom:4 }}>
        {card.type === 'morning' ? `${card.who_gives} → ${card.who_accepts}` : card.who_shifts}
      </div>
      <div style={{ color:t.text2, fontSize:11, marginBottom:4 }}>{card.manager}</div>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {card.kassa_even ? <span style={{ color:'#10b981', fontSize:10 }}>✅ Ровная</span> : <span style={{ color:'#ef4444', fontSize:10 }}>❌ Не ровная</span>}
        {hasDiff && <span style={{ color:'#ef4444', fontSize:10, fontWeight:600 }}>⚠️ Расхождение</span>}
      </div>
      {canMove && (
        <div style={{ display:'flex', gap:6, marginTop:8 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onMove('done')} style={{ flex:1, background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:6, color:'#10b981', fontSize:11, padding:'4px', cursor:'pointer' }}>✅ Завершить</button>
        </div>
      )}
    </div>
  );
}

// ─── Форма создания ───────────────────────────────────────────
function KassaForm({ type, user, t, onClose, onCreate }) {
  const isMorning = type === 'morning';
  const [form, setForm] = useState({
    filial: '', manager: '', report_date: '',
    who_gives: '', who_accepts: '', who_shifts: '',
    cash_kassa: '', cash_1c: '', cash_report: '',
    cash_diff: false, cash_diff_comment: '',
    noncash_terminal: '', noncash_1c: '', noncash_report: '',
    noncash_diff: false, noncash_diff_comment: '',
    kassa_even: false,
    has_z_report: false, has_x_report: false, has_vedomost: false,
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const submit = async () => {
    if (!form.filial || !form.manager || !form.report_date) return;
    const filial = FILIALS.find(f => f.id === form.filial);
    await supabase.from('kassa_reports').insert({
      type, status: type,
      filial: form.filial, manager: form.manager,
      report_date: form.report_date, city: filial?.city,
      created_by: user.username,
      who_gives: form.who_gives, who_accepts: form.who_accepts,
      who_shifts: form.who_shifts,
      cash_kassa: parseFloat(form.cash_kassa)||null,
      cash_1c: parseFloat(form.cash_1c)||null,
      cash_report: parseFloat(form.cash_report)||null,
      cash_diff: form.cash_diff, cash_diff_comment: form.cash_diff_comment||null,
      noncash_terminal: parseFloat(form.noncash_terminal)||null,
      noncash_1c: parseFloat(form.noncash_1c)||null,
      noncash_report: parseFloat(form.noncash_report)||null,
      noncash_diff: form.noncash_diff, noncash_diff_comment: form.noncash_diff_comment||null,
      kassa_even: form.kassa_even,
      has_z_report: form.has_z_report,
      has_x_report: form.has_x_report,
      has_vedomost: form.has_vedomost,
    });
    onCreate();
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:560, maxHeight:'90vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>{isMorning ? '🌅 Утренний отчёт' : '🌆 Вечерний отчёт'}</span>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Филиал */}
          <FormRow label="Филиал *" t={t}>
            <div style={{ display:'flex', gap:8 }}>
              {FILIALS.map(f => (
                <button key={f.id} onClick={() => set('filial', f.id)} style={{ flex:1, background:form.filial===f.id?'rgba(240,180,41,0.15)':'transparent', border:`1px solid ${form.filial===f.id?'rgba(240,180,41,0.5)':t.border}`, borderRadius:8, color:form.filial===f.id?'#f0b429':t.text2, fontSize:12, fontWeight:600, padding:'8px', cursor:'pointer' }}>{f.label}</button>
              ))}
            </div>
          </FormRow>

          {/* Руководитель */}
          <FormRow label="Руководитель *" t={t}>
            <select value={form.manager} onChange={e => set('manager', e.target.value)} style={sel(t)}>
              <option value="">— Выбрать —</option>
              {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </FormRow>

          {/* Дата и время */}
          <FormRow label="Дата и время *" t={t}>
            <input type="datetime-local" value={form.report_date} onChange={e => set('report_date', e.target.value)} style={inp(t)} />
          </FormRow>

          {/* Кто сдаёт/принимает (утро) или кто делает пересменку (вечер) */}
          {isMorning ? (
            <>
              <FormRow label="Кто сдаёт кассу" t={t}>
                <input value={form.who_gives} onChange={e => set('who_gives', e.target.value)} placeholder="Имя" style={inp(t)} />
              </FormRow>
              <FormRow label="Кто принимает кассу" t={t}>
                <input value={form.who_accepts} onChange={e => set('who_accepts', e.target.value)} placeholder="Имя" style={inp(t)} />
              </FormRow>
            </>
          ) : (
            <FormRow label="Кто делает пересменку" t={t}>
              <input value={form.who_shifts} onChange={e => set('who_shifts', e.target.value)} placeholder="Имя" style={inp(t)} />
            </FormRow>
          )}

          <Divider t={t} label="💵 Наличные" />

          <FormRow label="Наличных в кассе" t={t}>
            <input type="number" value={form.cash_kassa} onChange={e => set('cash_kassa', e.target.value)} placeholder="0" style={inp(t)} />
          </FormRow>
          <FormRow label="Наличных в 1С8" t={t}>
            <input type="number" value={form.cash_1c} onChange={e => set('cash_1c', e.target.value)} placeholder="0" style={inp(t)} />
          </FormRow>
          <FormRow label="Наличных в отчёте" t={t}>
            <input type="number" value={form.cash_report} onChange={e => set('cash_report', e.target.value)} placeholder="0" style={inp(t)} />
          </FormRow>
          <FormRow label="Есть расхождения?" t={t}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => set('cash_diff', false)} style={{ flex:1, background:!form.cash_diff?'rgba(16,185,129,0.15)':'transparent', border:`1px solid ${!form.cash_diff?'rgba(16,185,129,0.4)':t.border}`, borderRadius:8, color:!form.cash_diff?'#10b981':t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>Нет</button>
              <button onClick={() => set('cash_diff', true)} style={{ flex:1, background:form.cash_diff?'rgba(239,68,68,0.15)':'transparent', border:`1px solid ${form.cash_diff?'rgba(239,68,68,0.4)':t.border}`, borderRadius:8, color:form.cash_diff?'#ef4444':t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>Да</button>
            </div>
          </FormRow>
          {form.cash_diff && (
            <FormRow label="Комментарий" t={t}>
              <input value={form.cash_diff_comment} onChange={e => set('cash_diff_comment', e.target.value)} placeholder="Причина расхождения..." style={inp(t)} />
            </FormRow>
          )}

          <Divider t={t} label="💳 Безналичные" />

          <FormRow label="Без наличных по терминалу" t={t}>
            <input type="number" value={form.noncash_terminal} onChange={e => set('noncash_terminal', e.target.value)} placeholder="0" style={inp(t)} />
          </FormRow>
          <FormRow label="Без наличных по 1С8" t={t}>
            <input type="number" value={form.noncash_1c} onChange={e => set('noncash_1c', e.target.value)} placeholder="0" style={inp(t)} />
          </FormRow>
          <FormRow label="Без наличных в отчёте" t={t}>
            <input type="number" value={form.noncash_report} onChange={e => set('noncash_report', e.target.value)} placeholder="0" style={inp(t)} />
          </FormRow>
          <FormRow label="Есть расхождения?" t={t}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => set('noncash_diff', false)} style={{ flex:1, background:!form.noncash_diff?'rgba(16,185,129,0.15)':'transparent', border:`1px solid ${!form.noncash_diff?'rgba(16,185,129,0.4)':t.border}`, borderRadius:8, color:!form.noncash_diff?'#10b981':t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>Нет</button>
              <button onClick={() => set('noncash_diff', true)} style={{ flex:1, background:form.noncash_diff?'rgba(239,68,68,0.15)':'transparent', border:`1px solid ${form.noncash_diff?'rgba(239,68,68,0.4)':t.border}`, borderRadius:8, color:form.noncash_diff?'#ef4444':t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>Да</button>
            </div>
          </FormRow>
          {form.noncash_diff && (
            <FormRow label="Комментарий" t={t}>
              <input value={form.noncash_diff_comment} onChange={e => set('noncash_diff_comment', e.target.value)} placeholder="Причина расхождения..." style={inp(t)} />
            </FormRow>
          )}

          <Divider t={t} label="📊 Итог" />

          <FormRow label="Ровная ли общая касса?" t={t}>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => set('kassa_even', false)} style={{ flex:1, background:!form.kassa_even?'rgba(239,68,68,0.15)':'transparent', border:`1px solid ${!form.kassa_even?'rgba(239,68,68,0.4)':t.border}`, borderRadius:8, color:!form.kassa_even?'#ef4444':t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>Нет</button>
              <button onClick={() => set('kassa_even', true)} style={{ flex:1, background:form.kassa_even?'rgba(16,185,129,0.15)':'transparent', border:`1px solid ${form.kassa_even?'rgba(16,185,129,0.4)':t.border}`, borderRadius:8, color:form.kassa_even?'#10b981':t.text2, fontSize:12, padding:'8px', cursor:'pointer' }}>Да</button>
            </div>
          </FormRow>

          <Divider t={t} label="☑️ Документы" />

          {isMorning && (
            <CheckRow label="Выложили Z-отчёт" checked={form.has_z_report} onChange={() => set('has_z_report', !form.has_z_report)} t={t} />
          )}
          <CheckRow label="Выложили Х-отчёт" checked={form.has_x_report} onChange={() => set('has_x_report', !form.has_x_report)} t={t} />
          <CheckRow label="Выложили покупюрную ведомость" checked={form.has_vedomost} onChange={() => set('has_vedomost', !form.has_vedomost)} t={t} />
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:`1px solid ${t.border}`, display:'flex', gap:10, flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:13, padding:'12px', cursor:'pointer' }}>Отмена</button>
          <button onClick={submit} disabled={!form.filial||!form.manager||!form.report_date} style={{ flex:2, background:form.filial&&form.manager&&form.report_date?'#f0b429':t.surface2, border:'none', borderRadius:8, color:form.filial&&form.manager&&form.report_date?'#0f0f13':t.text2, fontSize:13, fontWeight:700, padding:'12px', cursor:form.filial&&form.manager&&form.report_date?'pointer':'default' }}>
            Создать отчёт
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Modal просмотра ──────────────────────────────────────────
function KassaModal({ report, user, t, onClose, onMove }) {
  const filial = FILIALS.find(f => f.id === report.filial);
  const isMorning = report.type === 'morning';
  const canMove = canMoveCard(user, report) && report.status !== 'done';

  const Row = ({ label, value, highlight }) => (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${t.border}22` }}>
      <span style={{ color:t.text2, fontSize:13 }}>{label}</span>
      <span style={{ color:highlight?'#ef4444':t.text, fontSize:13, fontWeight:highlight?700:400 }}>{value}</span>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:500 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:520, maxHeight:'85vh', background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, zIndex:501, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 24px', borderBottom:`1px solid ${t.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>{isMorning?'🌅 Утренний':'🌆 Вечерний'} отчёт — {filial?.label}</div>
            <div style={{ color:t.text2, fontSize:11, marginTop:2 }}>{new Date(report.report_date).toLocaleString('ru-RU')}</div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
          <Row label="Руководитель" value={report.manager} />
          {isMorning ? (
            <>
              <Row label="Кто сдаёт" value={report.who_gives} />
              <Row label="Кто принимает" value={report.who_accepts} />
            </>
          ) : <Row label="Кто делает пересменку" value={report.who_shifts} />}

          <div style={{ margin:'12px 0 8px', fontFamily:'Unbounded,sans-serif', fontSize:11, color:t.text2 }}>💵 НАЛИЧНЫЕ</div>
          <Row label="В кассе" value={`${report.cash_kassa||0} ₸`} />
          <Row label="В 1С8" value={`${report.cash_1c||0} ₸`} />
          <Row label="В отчёте" value={`${report.cash_report||0} ₸`} />
          <Row label="Расхождения" value={report.cash_diff?'Да ⚠️':'Нет ✅'} highlight={report.cash_diff} />
          {report.cash_diff && <Row label="Комментарий" value={report.cash_diff_comment} highlight />}

          <div style={{ margin:'12px 0 8px', fontFamily:'Unbounded,sans-serif', fontSize:11, color:t.text2 }}>💳 БЕЗНАЛИЧНЫЕ</div>
          <Row label="По терминалу" value={`${report.noncash_terminal||0} ₸`} />
          <Row label="По 1С8" value={`${report.noncash_1c||0} ₸`} />
          <Row label="В отчёте" value={`${report.noncash_report||0} ₸`} />
          <Row label="Расхождения" value={report.noncash_diff?'Да ⚠️':'Нет ✅'} highlight={report.noncash_diff} />
          {report.noncash_diff && <Row label="Комментарий" value={report.noncash_diff_comment} highlight />}

          <div style={{ margin:'12px 0 8px', fontFamily:'Unbounded,sans-serif', fontSize:11, color:t.text2 }}>📊 ИТОГ</div>
          <Row label="Общая касса ровная" value={report.kassa_even?'Да ✅':'Нет ❌'} highlight={!report.kassa_even} />

          <div style={{ margin:'12px 0 8px', fontFamily:'Unbounded,sans-serif', fontSize:11, color:t.text2 }}>☑️ ДОКУМЕНТЫ</div>
          {isMorning && <Row label="Z-отчёт выложен" value={report.has_z_report?'✅':'❌'} highlight={!report.has_z_report} />}
          <Row label="Х-отчёт выложен" value={report.has_x_report?'✅':'❌'} highlight={!report.has_x_report} />
          <Row label="Покупюрная ведомость" value={report.has_vedomost?'✅':'❌'} highlight={!report.has_vedomost} />
        </div>

        {canMove && (
          <div style={{ padding:'16px 24px', borderTop:`1px solid ${t.border}`, flexShrink:0 }}>
            <button onClick={() => onMove('done')} style={{ width:'100%', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.4)', borderRadius:8, color:'#10b981', fontSize:13, fontWeight:700, padding:'12px', cursor:'pointer' }}>
              ✅ Завершить отчёт
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function FormRow({ label, children, t }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ color:t.text2, fontSize:12, fontWeight:500 }}>{label}</label>
      {children}
    </div>
  );
}

function Divider({ label, t }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, margin:'4px 0' }}>
      <div style={{ flex:1, height:1, background:t.border }} />
      <span style={{ color:t.text2, fontSize:11, fontWeight:600, fontFamily:'Unbounded,sans-serif', whiteSpace:'nowrap' }}>{label}</span>
      <div style={{ flex:1, height:1, background:t.border }} />
    </div>
  );
}

function CheckRow({ label, checked, onChange, t }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'6px 0' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor:'#f0b429', width:16, height:16, cursor:'pointer' }} />
      <span style={{ color:t.text, fontSize:13 }}>{label}</span>
      {checked && <span style={{ color:'#10b981', fontSize:12 }}>✅</span>}
    </label>
  );
}

const inp = (t) => ({ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'9px 12px', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box' });
const sel = (t) => ({ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'9px 12px', outline:'none' });
