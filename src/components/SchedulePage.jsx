import React, { useState, useEffect, useCallback } from 'react';
import { USERS } from '../auth';
import { supabase } from '../supabase';
import { playSound } from '../utils/sound';
import { fib, radius } from '../theme';

const SPO_ROLES = ['uralsk', 'atyray', 'aktobe'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WEEKDAYS = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];

const ROLE_LABELS = {
  admin:'Администратор',dir:'Директор',zamdir:'Зам. Директора',sysadmin:'Сис. Администратор',
  rev:'Ревизор',rgmu:'РГМ Уральск',rgma:'РГМ Атырау',uralsk:'СПО Уральск',
  atyray:'СПО Атырау',aktobe:'СПО Актобе',okk:'ОКК',ovn:'ОВН',smm:'Маркетинг',dev:'Разработчик',
};

function getVisibleEmployees(user) {
  const all = Object.entries(USERS).map(([id, u]) => ({ id, ...u }));
  if (['admin','dir','dev','zamdir','sysadmin','rev'].includes(user.role)) return all;
  if (user.role === 'rgmu') return all.filter(e => e.cities?.includes('Уральск'));
  if (user.role === 'rgma') return all.filter(e => e.cities?.includes('Атырау'));
  return all.filter(e => e.id === user.username);
}

function canScheduleEmp(userRole, empRole) {
  if (['admin','dir','dev'].includes(userRole)) return true;
  if (userRole === 'rgmu' && empRole === 'uralsk') return true;
  if (userRole === 'rgma' && empRole === 'atyray') return true;
  return false;
}

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getDateStr(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtTimeStr(s) { return s ? s.slice(0,5) : ''; }

export default function SchedulePage({ user, theme }) {
  const t = theme;
  const now = new Date();
  const [tab, setTab]     = useState('schedule');
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [scheduleData, setScheduleData]     = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading]               = useState(false);
  const [schedModal, setSchedModal]         = useState(null);
  const [schedStart, setSchedStart]         = useState('09:00');
  const [schedEnd, setSchedEnd]             = useState('18:00');
  const [savingSched, setSavingSched]       = useState(false);
  const [replModal, setReplModal]           = useState(false);
  const [replFor, setReplFor]               = useState('');
  const [savingRepl, setSavingRepl]         = useState(false);
  const [startingDay, setStartingDay]       = useState(false);
  const [endingDay, setEndingDay]           = useState(false);

  const employees   = getVisibleEmployees(user);
  const daysCount   = getDaysInMonth(year, month);
  const days        = Array.from({ length: daysCount }, (_, i) => i + 1);
  const todayStr    = getDateStr(now.getFullYear(), now.getMonth(), now.getDate());
  const myToday     = attendanceData[`${user.username}_${todayStr}`];
  const myTodaySch  = scheduleData[`${user.username}_${todayStr}`];
  const isSpo       = SPO_ROLES.includes(user.role);
  const spoEmployees = employees.filter(e => e.id !== user.username && SPO_ROLES.includes(e.role));

  const loadData = useCallback(async () => {
    setLoading(true);
    const monthStart = getDateStr(year, month, 1);
    const monthEnd   = getDateStr(year, month, daysCount);
    const empIds     = employees.map(e => e.id);

    const [{ data: sr }, { data: ar }] = await Promise.all([
      supabase.from('work_schedule').select('*').in('user_id', empIds).gte('date', monthStart).lte('date', monthEnd),
      supabase.from('work_attendance').select('*').in('user_id', empIds).gte('date', monthStart).lte('date', monthEnd),
    ]);

    const sMap = {};
    for (const r of (sr || [])) sMap[`${r.user_id}_${r.date}`] = r;
    setScheduleData(sMap);

    const aMap = {};
    for (const r of (ar || [])) aMap[`${r.user_id}_${r.date}`] = r;
    setAttendanceData(aMap);
    setLoading(false);
  }, [year, month, daysCount, employees]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleStartDay() {
    setStartingDay(true);
    const ts  = new Date();
    const sch = scheduleData[`${user.username}_${todayStr}`];
    let isLate = false, lateMinutes = 0;
    if (sch?.start_time) {
      const [sh, sm] = sch.start_time.split(':').map(Number);
      const diff = ts.getHours() * 60 + ts.getMinutes() - (sh * 60 + sm);
      if (diff > 0) { isLate = true; lateMinutes = diff; }
    }
    const existing = attendanceData[`${user.username}_${todayStr}`];
    if (existing) {
      await supabase.from('work_attendance').update({ started_at: ts.toISOString(), is_late: isLate, late_minutes: lateMinutes }).eq('id', existing.id);
    } else {
      await supabase.from('work_attendance').insert({ user_id: user.username, date: todayStr, started_at: ts.toISOString(), is_late: isLate, late_minutes: lateMinutes });
    }
    if (isLate) playSound('late');
    await loadData();
    setStartingDay(false);
  }

  async function handleEndDay() {
    setEndingDay(true);
    const ts  = new Date();
    const att = attendanceData[`${user.username}_${todayStr}`];
    if (!att) { setEndingDay(false); return; }
    let hoursWorked = null;
    if (isSpo && att.started_at) {
      hoursWorked = Math.round((ts - new Date(att.started_at)) / 36000) / 100;
    }
    await supabase.from('work_attendance').update({ finished_at: ts.toISOString(), hours_worked: hoursWorked }).eq('id', att.id);
    await loadData();
    setEndingDay(false);
  }

  async function handleSaveSchedule() {
    if (!schedModal) return;
    setSavingSched(true);
    const existing = scheduleData[`${schedModal.userId}_${schedModal.dateStr}`];
    if (existing) {
      await supabase.from('work_schedule').update({ start_time: schedStart, end_time: schedEnd, created_by: user.username }).eq('id', existing.id);
    } else {
      await supabase.from('work_schedule').insert({ user_id: schedModal.userId, date: schedModal.dateStr, start_time: schedStart, end_time: schedEnd, created_by: user.username });
    }
    await loadData();
    setSchedModal(null);
    setSavingSched(false);
  }

  async function handleStartReplacement() {
    if (!replFor) return;
    setSavingRepl(true);
    const ts = new Date();
    const existing = attendanceData[`${user.username}_${todayStr}`];
    if (existing) {
      await supabase.from('work_attendance').update({ started_at: ts.toISOString(), is_replacement: true, replaced_user_id: replFor }).eq('id', existing.id);
    } else {
      await supabase.from('work_attendance').insert({ user_id: user.username, date: todayStr, started_at: ts.toISOString(), is_replacement: true, replaced_user_id: replFor });
    }
    await loadData();
    setReplModal(false);
    setSavingRepl(false);
  }

  async function confirmReplacement(attId) {
    await supabase.from('work_attendance').update({ confirmed_by: user.username, confirmed_at: new Date().toISOString() }).eq('id', attId);
    await loadData();
  }

  const openSchedModal = (empId, empRole, dateStr) => {
    if (!canScheduleEmp(user.role, empRole)) return;
    const existing = scheduleData[`${empId}_${dateStr}`];
    setSchedStart(existing?.start_time ? fmtTimeStr(existing.start_time) : '09:00');
    setSchedEnd(existing?.end_time ? fmtTimeStr(existing.end_time) : '18:00');
    setSchedModal({ userId: empId, dateStr });
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'20px 24px 12px', flexShrink:0 }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:20, fontWeight:700, color:t.text }}>📅 График работы</div>
        <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>Расписание и учёт рабочего времени</div>
      </div>

      {/* Today panel */}
      <div style={{ padding:'0 24px 16px', flexShrink:0 }}>
        <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:radius.md, padding:'14px 20px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', backdropFilter:'blur(8px)' }}>
          <div style={{ flex:1 }}>
            <div style={{ color:t.text2, fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>
              Сегодня — {now.toLocaleDateString('ru-RU', { weekday:'long', day:'numeric', month:'long' })}
            </div>
            {myTodaySch ? (
              <div style={{ color:t.text, fontSize:13, marginTop:3 }}>
                По графику: <span style={{ color:'#10b981', fontWeight:600 }}>{fmtTimeStr(myTodaySch.start_time)}</span> — <span style={{ color:'#10b981', fontWeight:600 }}>{fmtTimeStr(myTodaySch.end_time)}</span>
                {!isSpo && <span style={{ color:t.text2, fontSize:11, marginLeft:8 }}>· обед 13:00–14:00</span>}
              </div>
            ) : (
              <div style={{ color:t.text2, fontSize:13, marginTop:3 }}>График на сегодня не назначен</div>
            )}
            {myToday?.is_late && (
              <div style={{ color:'#ef4444', fontSize:12, marginTop:2 }}>⚠️ Опоздание: {myToday.late_minutes} мин</div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {!myToday?.started_at ? (
              <>
                <button onClick={handleStartDay} disabled={startingDay} style={btnStyle('#10b981', startingDay)}>
                  {startingDay ? '...' : '▶️ Начать рабочий день'}
                </button>
                {isSpo && (
                  <button onClick={() => setReplModal(true)} style={btnStyle('#E8263A', false)}>🔄 Замена</button>
                )}
              </>
            ) : !myToday?.finished_at ? (
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ color:t.text2, fontSize:12 }}>Начало: <b style={{ color:'#10b981' }}>{fmtTime(myToday.started_at)}</b></span>
                <button onClick={handleEndDay} disabled={endingDay} style={btnStyle('#ef4444', endingDay)}>
                  {endingDay ? '...' : '⏹️ Завершить рабочий день'}
                </button>
              </div>
            ) : (
              <div style={{ color:t.text2, fontSize:13 }}>
                ✅ Завершён · <b style={{ color:t.text }}>{fmtTime(myToday.started_at)}</b> — <b style={{ color:t.text }}>{fmtTime(myToday.finished_at)}</b>
                {isSpo && myToday.hours_worked && <span style={{ color:'#10b981', marginLeft:8 }}>· {myToday.hours_worked}ч</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + month nav */}
      <div style={{ padding:'0 24px 14px', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        {[['schedule','📅 График'],['tabel','📊 Табель']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: tab===key ? 'rgba(232,38,58,0.15)':'transparent',
            border:`1px solid ${tab===key ? 'rgba(232,38,58,0.5)':t.border}`,
            borderRadius:radius.md, color: tab===key ? '#E8263A':t.text2,
            fontSize:13, fontWeight: tab===key ? 700:500, padding:'7px 18px', cursor:'pointer', transition:'all 0.15s',
          }}>{label}</button>
        ))}
        <div style={{ flex:1 }} />
        <button onClick={prevMonth} style={navBtn(t)}>◀</button>
        <span style={{ color:t.text, fontSize:14, fontWeight:600, padding:'6px 16px', minWidth:150, textAlign:'center', fontFamily:'Unbounded,sans-serif' }}>
          {MONTHS_RU[month]} {year}
        </span>
        <button onClick={nextMonth} style={navBtn(t)}>▶</button>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto', padding:'0 24px 32px' }}>
        {loading ? (
          <div style={{ color:t.text2, textAlign:'center', padding:60, fontSize:14 }}>Загрузка...</div>
        ) : tab === 'schedule' ? (
          <ScheduleGrid
            employees={employees} days={days} year={year} month={month}
            scheduleData={scheduleData} attendanceData={attendanceData}
            user={user} t={t} todayStr={todayStr}
            onCellClick={openSchedModal}
          />
        ) : (
          <TablelView
            employees={employees} days={days} year={year} month={month}
            scheduleData={scheduleData} attendanceData={attendanceData}
            user={user} t={t} onConfirm={confirmReplacement}
          />
        )}
      </div>

      {/* Schedule modal */}
      {schedModal && (
        <div style={overlayStyle} onClick={e => e.target === e.currentTarget && setSchedModal(null)}>
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:radius.lg, padding:24, width:320, backdropFilter:'blur(16px)', boxShadow:'0 16px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text, marginBottom:20 }}>
              📅 Назначить график
              <div style={{ color:t.text2, fontSize:11, fontWeight:400, marginTop:4 }}>
                {schedModal.userId} · {schedModal.dateStr}
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <label style={{ color:t.text2, fontSize:12 }}>Начало рабочего дня
                <input type="time" value={schedStart} onChange={e => setSchedStart(e.target.value)}
                  style={{ display:'block', marginTop:4, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:radius.sm, color:t.text, fontSize:14, padding:'8px 12px', outline:'none', width:'100%' }} />
              </label>
              <label style={{ color:t.text2, fontSize:12 }}>Конец рабочего дня
                <input type="time" value={schedEnd} onChange={e => setSchedEnd(e.target.value)}
                  style={{ display:'block', marginTop:4, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:radius.sm, color:t.text, fontSize:14, padding:'8px 12px', outline:'none', width:'100%' }} />
              </label>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <button onClick={() => setSchedModal(null)} style={{ flex:1, background:'transparent', border:`1px solid ${t.border}`, borderRadius:radius.sm, color:t.text2, fontSize:13, padding:'10px', cursor:'pointer' }}>Отмена</button>
              <button onClick={handleSaveSchedule} disabled={savingSched} style={{ flex:1, background:'#E8263A', border:'none', borderRadius:radius.sm, color:'#fff', fontSize:13, fontWeight:700, padding:'10px', cursor:'pointer', opacity:savingSched?0.7:1 }}>
                {savingSched ? 'Сохраняю...' : '💾 Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replacement modal */}
      {replModal && (
        <div style={overlayStyle} onClick={e => e.target === e.currentTarget && setReplModal(false)}>
          <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:radius.lg, padding:24, width:320, backdropFilter:'blur(16px)', boxShadow:'0 16px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text, marginBottom:20 }}>🔄 Замена</div>
            <div style={{ color:t.text2, fontSize:13, marginBottom:12 }}>Кого вы заменяете сегодня?</div>
            <select value={replFor} onChange={e => setReplFor(e.target.value)}
              style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:radius.sm, color:t.text, fontSize:13, padding:'9px 12px', outline:'none' }}>
              <option value="">— Выбрать —</option>
              {spoEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button onClick={() => setReplModal(false)} style={{ flex:1, background:'transparent', border:`1px solid ${t.border}`, borderRadius:radius.sm, color:t.text2, fontSize:13, padding:'10px', cursor:'pointer' }}>Отмена</button>
              <button onClick={handleStartReplacement} disabled={!replFor || savingRepl} style={{ flex:1, background:'#E8263A', border:'none', borderRadius:radius.sm, color:'#fff', fontSize:13, fontWeight:700, padding:'10px', cursor:'pointer', opacity:(!replFor||savingRepl)?0.5:1 }}>
                {savingRepl ? '...' : '▶️ Начать смену'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleGrid({ employees, days, year, month, scheduleData, attendanceData, user, t, todayStr, onCellClick }) {
  const today = new Date();
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', minWidth: 200 + days.length * 58 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle(t), width:180, position:'sticky', left:0, zIndex:2, background:t.surface }}>Сотрудник</th>
            {days.map(d => {
              const dateStr = getDateStr(year, month, d);
              const dow = new Date(year, month, d).getDay();
              const isWknd = dow === 0 || dow === 6;
              const isToday = dateStr === todayStr;
              return (
                <th key={d} style={{ ...thStyle(t), width:58, background: isToday ? 'rgba(232,38,58,0.12)' : isWknd ? t.surface2+'88' : t.surface, color: isToday ? '#E8263A' : isWknd ? t.text2 : t.text2 }}>
                  <div style={{ fontSize:11 }}>{WEEKDAYS[dow]}</div>
                  <div style={{ fontSize:13, fontWeight: isToday ? 700 : 400, color: isToday ? '#E8263A' : t.text }}>{d}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id}>
              <td style={{ ...tdStyle(t), position:'sticky', left:0, zIndex:1, background:t.surface }}>
                <div style={{ fontWeight:600, color:t.text, fontSize:13 }}>{emp.name}</div>
                <div style={{ color:t.text2, fontSize:11 }}>{ROLE_LABELS[emp.role] || emp.role}</div>
              </td>
              {days.map(d => {
                const dateStr = getDateStr(year, month, d);
                const key = `${emp.id}_${dateStr}`;
                const sch = scheduleData[key];
                const att = attendanceData[key];
                const dow = new Date(year, month, d).getDay();
                const isWknd = dow === 0 || dow === 6;
                const isToday = dateStr === todayStr;
                const canEdit = canScheduleEmp(user.role, emp.role);
                return (
                  <td key={d} onClick={() => canEdit && onCellClick(emp.id, emp.role, dateStr)}
                    style={{ ...tdStyle(t), background: isToday ? 'rgba(232,38,58,0.06)' : isWknd ? t.surface2+'44' : 'transparent', cursor: canEdit ? 'pointer' : 'default', verticalAlign:'top', padding:'4px 3px', minWidth:58 }}
                    title={canEdit ? 'Назначить / изменить график' : undefined}>
                    {sch && (
                      <div style={{ fontSize:10, color:'#10b981', textAlign:'center', lineHeight:1.3, fontWeight:500 }}>
                        {fmtTimeStr(sch.start_time)}<br />{fmtTimeStr(sch.end_time)}
                      </div>
                    )}
                    {att?.started_at && (
                      <div style={{ fontSize:10, color: att.is_late ? '#ef4444' : '#06b6d4', textAlign:'center', lineHeight:1.3, marginTop:2 }}>
                        {fmtTime(att.started_at)}
                        {att.finished_at && <><br />{fmtTime(att.finished_at)}</>}
                        {att.is_late && <div style={{ color:'#ef4444', fontSize:9 }}>⚠️+{att.late_minutes}м</div>}
                        {att.is_replacement && <div style={{ color:'#f59e0b', fontSize:9 }}>🔄</div>}
                      </div>
                    )}
                    {!sch && !att && canEdit && (
                      <div style={{ color:t.border, fontSize:16, textAlign:'center', lineHeight:'40px' }}>+</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablelView({ employees, days, year, month, scheduleData, attendanceData, user, t, onConfirm }) {
  const canConfirm = ['rgmu','rgma','admin','dir','dev'].includes(user.role);
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', width:'100%', minWidth:600 }}>
        <thead>
          <tr>
            {['Сотрудник','Явок','Часов (СПО)','Опозданий','Замен','Ожид. подтверждения'].map(h => (
              <th key={h} style={{ ...thStyle(t), textAlign:'left', padding:'10px 14px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => {
            const isSpoEmp = SPO_ROLES.includes(emp.role);
            let presence = 0, totalHours = 0, lates = 0, replacements = 0;
            const pendingRepls = [];
            for (let d = 1; d <= days.length; d++) {
              const att = attendanceData[`${emp.id}_${getDateStr(year, month, d)}`];
              if (!att) continue;
              if (att.started_at) presence++;
              if (isSpoEmp && att.hours_worked) totalHours += Number(att.hours_worked);
              if (att.is_late) lates++;
              if (att.is_replacement) {
                replacements++;
                if (!att.confirmed_by) pendingRepls.push(att);
              }
            }
            return (
              <tr key={emp.id}>
                <td style={{ ...tdStyle(t), fontWeight:600, color:t.text }}>
                  {emp.name}
                  <div style={{ color:t.text2, fontSize:11, fontWeight:400 }}>{ROLE_LABELS[emp.role]}</div>
                </td>
                <td style={{ ...tdStyle(t), color:t.text, fontSize:14 }}>{presence}</td>
                <td style={{ ...tdStyle(t), color: isSpoEmp ? '#10b981' : t.text2, fontSize:14 }}>
                  {isSpoEmp ? `${Math.round(totalHours * 10) / 10}ч` : '—'}
                </td>
                <td style={{ ...tdStyle(t), color: lates > 0 ? '#ef4444' : t.text2, fontSize:14 }}>
                  {lates > 0 ? `⚠️ ${lates}` : '0'}
                </td>
                <td style={{ ...tdStyle(t), color: replacements > 0 ? '#f59e0b' : t.text2, fontSize:14 }}>
                  {replacements > 0 ? `🔄 ${replacements}` : '0'}
                </td>
                <td style={{ ...tdStyle(t) }}>
                  {pendingRepls.length > 0 && canConfirm ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {pendingRepls.map(r => (
                        <button key={r.id} onClick={() => onConfirm(r.id)}
                          style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:6, color:'#10b981', fontSize:11, padding:'4px 10px', cursor:'pointer' }}>
                          ✅ Подтвердить {fmtTime(r.started_at)}
                        </button>
                      ))}
                    </div>
                  ) : pendingRepls.length > 0 ? (
                    <span style={{ color:'#f59e0b', fontSize:12 }}>⏳ {pendingRepls.length} ждут</span>
                  ) : (
                    <span style={{ color:t.text2, fontSize:12 }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = (t) => ({ background:t.surface, border:`1px solid ${t.border}`, padding:'8px 6px', color:t.text2, fontSize:11, fontWeight:600, textAlign:'center', whiteSpace:'nowrap', fontFamily:'Inter,sans-serif' });
const tdStyle = (t) => ({ border:`1px solid ${t.border}+'44'}`, padding:'8px 10px', color:t.text, fontSize:13, fontFamily:'Inter,sans-serif', whiteSpace:'nowrap' });
const overlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(8px)' };
function btnStyle(color, disabled) {
  return { background:`rgba(${color==='#10b981'?'16,185,129':color==='#ef4444'?'239,68,68':'232,38,58'},0.13)`, border:`1px solid rgba(${color==='#10b981'?'16,185,129':color==='#ef4444'?'239,68,68':'232,38,58'},0.4)`, borderRadius:8, color:color, fontSize:13, fontWeight:600, padding:'9px 18px', cursor:'pointer', opacity:disabled?0.6:1 };
}
function navBtn(t) {
  return { background:'transparent', border:`1px solid ${t.border}`, borderRadius:6, color:t.text2, fontSize:13, padding:'6px 12px', cursor:'pointer' };
}
