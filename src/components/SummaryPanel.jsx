import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const CAN_SEE_ALL = ['admin','dir','zamdir'];
const FMT = n => new Intl.NumberFormat('ru-KZ').format(Math.round(n||0));

function kzNow() {
  return new Date(Date.now() + 5*3600*1000);
}
function todayKzStart() {
  const d = kzNow(); d.setUTCHours(0,0,0,0); return new Date(d.getTime() - 5*3600*1000);
}
function yesterdayKzStart() {
  const d = todayKzStart(); d.setDate(d.getDate()-1); return d;
}

export default function SummaryPanel({ user, theme, onClose }) {
  const t = theme;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = CAN_SEE_ALL.includes(user.role);
  const isRgm   = ['rgmu','rgma'].includes(user.role);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const todayStart     = todayKzStart().toISOString();
    const yesterdayStart = yesterdayKzStart().toISOString();
    const now            = new Date().toISOString();

    const [leads, tasks, kassa, zrs, shifts] = await Promise.all([
      supabase.from('leads').select('*').eq('is_deleted',false).eq('is_archived',false),
      supabase.from('tasks').select('*, task_observers(*)').eq('is_archived',false),
      supabase.from('kassa_reports').select('*').gte('created_at', todayStart),
      supabase.from('zrs_requests').select('*').in('status',['new','review']),
      supabase.from('shifts_spo').select('*').eq('status','active'),
    ]);

    setData({
      leads:  leads.data  || [],
      tasks:  tasks.data  || [],
      kassa:  kassa.data  || [],
      zrs:    zrs.data    || [],
      shifts: shifts.data || [],
      todayStart, yesterdayStart, now,
    });
    setLoading(false);
  }

  if (loading) return (
    <PanelShell t={t} onClose={onClose}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:t.text2 }}>Загрузка...</div>
    </PanelShell>
  );

  const { leads, tasks, kassa, zrs, shifts, todayStart, yesterdayStart } = data;

  // Tasks for this user
  const myTasks = tasks.filter(task =>
    task.assigned_to === user.username ||
    task.created_by  === user.username ||
    task.task_observers?.some(o => o.user_id === user.username)
  );
  const todayTasks    = myTasks.filter(t => t.status === 'today');
  const overdueTasks  = myTasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done');
  const reviewTasks   = myTasks.filter(t => t.status === 'review' && t.created_by === user.username);

  // Leads stats
  const myLeads = isAdmin ? leads : leads.filter(l => user.cities.includes(l.city));
  const todaySuccess = myLeads.filter(l => l.status==='success' && new Date(l.updated_at||l.created_at) >= new Date(todayStart));
  const ydSuccess    = myLeads.filter(l => l.status==='success' && new Date(l.updated_at||l.created_at) >= new Date(yesterdayStart) && new Date(l.updated_at||l.created_at) < new Date(todayStart));
  const ydFail       = myLeads.filter(l => l.status==='fail'    && new Date(l.updated_at||l.created_at) >= new Date(yesterdayStart) && new Date(l.updated_at||l.created_at) < new Date(todayStart));
  const inWork       = myLeads.filter(l => l.status==='in_progress');
  const waiting      = myLeads.filter(l => l.status==='waiting');

  // Kassa
  const FILIALS = ['sv47','k162','s32','a21'];
  const filialLabels = { sv47:'СВ47', k162:'К162', s32:'С32', a21:'А21' };
  const kassaToday = kassa;
  const launchedFilials   = [...new Set(kassaToday.map(k=>k.filial))];
  const unlaunchedFilials = FILIALS.filter(f => !launchedFilials.includes(f));
  const kassaDiffs = kassaToday.filter(k => k.cash_diff || k.noncash_diff);

  // ZRS
  const pendingZrs = zrs;

  // Shifts
  const activeShifts = shifts;

  const greetHour = kzNow().getUTCHours();
  const greet = greetHour < 12 ? 'Доброе утро' : greetHour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <PanelShell t={t} onClose={onClose} onRefresh={load}>
      {/* Приветствие */}
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${t.border}` }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>{greet}, {user.name.split(' ')[0]}! 👋</div>
        <div style={{ color:t.text2, fontSize:12, marginTop:4 }}>
          {kzNow().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 0' }}>

        {/* Задачи */}
        <Section title="✅ Задачи" t={t}>
          <StatRow label="На сегодня" value={todayTasks.length} color={todayTasks.length>0?'#8b5cf6':t.text2} t={t} />
          <StatRow label="Просрочено" value={overdueTasks.length} color={overdueTasks.length>0?'#ef4444':t.text2} t={t} alert={overdueTasks.length>0} />
          <StatRow label="Ждут проверки" value={reviewTasks.length} color={reviewTasks.length>0?'#f97316':t.text2} t={t} />
          {overdueTasks.length > 0 && (
            <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:3 }}>
              {overdueTasks.slice(0,3).map(task => (
                <div key={task.id} style={{ fontSize:11, color:'#ef4444', padding:'3px 12px' }}>⚠️ {task.title}</div>
              ))}
              {overdueTasks.length>3 && <div style={{ fontSize:11, color:t.text2, padding:'3px 12px' }}>+{overdueTasks.length-3} ещё</div>}
            </div>
          )}
        </Section>

        {/* Заявки */}
        <Section title="💬 Заявки WAZZUP" t={t}>
          <StatRow label="Вчера успешно" value={`${ydSuccess.length} · ${FMT(ydSuccess.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0))} ₸`} color="#10b981" t={t} />
          <StatRow label="Вчера провал"  value={ydFail.length}    color={ydFail.length>0?'#ef4444':t.text2}  t={t} />
          <StatRow label="В работе"       value={inWork.length}    color={inWork.length>0?'#8b5cf6':t.text2}   t={t} />
          <StatRow label="Ждём на филиал" value={waiting.length}   color={waiting.length>0?'#f59e0b':t.text2}  t={t} />
          <StatRow label="Успешно сегодня" value={`${todaySuccess.length} · ${FMT(todaySuccess.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0))} ₸`} color="#10b981" t={t} />
        </Section>

        {/* Касса (только admin/dir/zamdir/rgm) */}
        {(isAdmin || isRgm) && (
          <Section title="💰 Касса сегодня" t={t}>
            <StatRow label="Запустили отчёт" value={`${launchedFilials.map(f=>filialLabels[f]).join(', ')||'—'}`} color="#10b981" t={t} />
            {unlaunchedFilials.length > 0 && (
              <StatRow label="Не запустили" value={unlaunchedFilials.map(f=>filialLabels[f]).join(', ')} color="#ef4444" t={t} alert />
            )}
            {kassaDiffs.length > 0 && (
              <StatRow label="Расхождения" value={`${kassaDiffs.length} отчёт(а)`} color="#ef4444" t={t} alert />
            )}
            {kassaDiffs.length === 0 && launchedFilials.length > 0 && (
              <StatRow label="Расхождения" value="Нет ✅" color="#10b981" t={t} />
            )}
          </Section>
        )}

        {/* ЗРС */}
        {(isAdmin || isRgm) && pendingZrs.length > 0 && (
          <Section title="📝 ЗРС — ожидают" t={t}>
            {pendingZrs.slice(0,5).map(z => (
              <div key={z.id} style={{ padding:'6px 20px', display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:t.text, fontSize:12 }}>{z.requester}</span>
                <span style={{ color:'#f0b429', fontSize:12, fontWeight:700 }}>{FMT(z.amount)} ₸</span>
              </div>
            ))}
            {pendingZrs.length > 5 && <div style={{ fontSize:11, color:t.text2, padding:'4px 20px' }}>+{pendingZrs.length-5} ещё</div>}
          </Section>
        )}

        {/* Смены */}
        {(isAdmin || isRgm) && (
          <Section title="🕐 Смены сейчас" t={t}>
            {activeShifts.length === 0 ? (
              <div style={{ padding:'8px 20px', color:t.text2, fontSize:12 }}>Никого нет на смене</div>
            ) : activeShifts.slice(0,5).map(s => (
              <div key={s.id} style={{ padding:'5px 20px', display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:t.text, fontSize:12 }}>{s.worker_name}</span>
                <span style={{ color:'#10b981', fontSize:11 }}>{s.filial?.toUpperCase()}</span>
              </div>
            ))}
          </Section>
        )}

      </div>
    </PanelShell>
  );
}

function PanelShell({ t, onClose, onRefresh, children }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:800 }} />
      <div style={{
        position:'fixed', top:54, right:0, bottom:0, width:340,
        background:t.surface, borderLeft:`1px solid ${t.border}`,
        zIndex:900, display:'flex', flexDirection:'column',
        boxShadow:'-4px 0 24px rgba(0,0,0,0.3)',
      }}>
        <div style={{ padding:'14px 20px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text }}>📊 Сводка</span>
          <div style={{ display:'flex', gap:8 }}>
            {onRefresh && <button onClick={onRefresh} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:6, color:t.text2, fontSize:12, padding:'4px 8px', cursor:'pointer' }}>🔄</button>}
            <button onClick={onClose} style={{ background:'transparent', border:'none', color:t.text2, fontSize:18, cursor:'pointer' }}>✕</button>
          </div>
        </div>
        {children}
      </div>
    </>
  );
}

function Section({ title, children, t }) {
  return (
    <div style={{ marginBottom:4 }}>
      <div style={{ padding:'10px 20px 6px', fontFamily:'Unbounded,sans-serif', fontSize:10, fontWeight:600, color:t.text2, textTransform:'uppercase', letterSpacing:1 }}>{title}</div>
      <div style={{ borderTop:`1px solid ${t.border}22` }}>{children}</div>
    </div>
  );
}

function StatRow({ label, value, color, t, alert }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 20px', background:alert?'rgba(239,68,68,0.04)':'transparent' }}>
      <span style={{ color:t.text2, fontSize:13 }}>{label}</span>
      <span style={{ color, fontSize:13, fontWeight:600 }}>{value}</span>
    </div>
  );
}
