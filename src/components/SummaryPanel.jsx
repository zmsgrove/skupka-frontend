import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const FMT = n => new Intl.NumberFormat('ru-KZ').format(Math.round(n||0));

const USER_CITIES = {
  zmsgrove:'Астана', kylyshbaenam:'Астана',
  k162:'Уральск', sv47:'Уральск', aleksandrovd:'Уральск',
  koshab:'Актобе', maksatovs:'Актобе', a21:'Актобе',
  aminovn:'Атырау', s32:'Атырау',
  revizor:'Астана',
};

const WEATHER_COORDS = {
  'Астана':  { lat:51.1801, lon:71.4460 },
  'Уральск': { lat:51.2333, lon:51.3667 },
  'Актобе':  { lat:50.2839, lon:57.1670 },
  'Атырау':  { lat:47.1167, lon:51.8833 },
};

const DEFAULT_CONFIG = { tasks:true, leads:true, cities:true, kassa:true, zrs:true, shifts:true };

const SECTION_DEFS = [
  { key:'tasks',  icon:'✅', label:'Задачи',         adminOnly:false },
  { key:'leads',  icon:'💬', label:'Заявки WAZZUP',  adminOnly:false },
  { key:'cities', icon:'🏙️', label:'По городам',     adminOnly:true  },
  { key:'kassa',  icon:'💰', label:'Касса',           adminOnly:true  },
  { key:'zrs',    icon:'📝', label:'ЗРС',             adminOnly:true  },
  { key:'shifts', icon:'🕐', label:'Смены',           adminOnly:true  },
];

function kzHour() { return new Date(Date.now()+5*3600*1000).getUTCHours(); }
function getGreeting() {
  const h=kzHour();
  if(h>=6&&h<10) return 'Доброе утро';
  if(h>=10&&h<17) return 'Добрый день';
  if(h>=17&&h<22) return 'Добрый вечер';
  return 'Доброй ночи';
}
function getGreetEmoji() {
  const h=kzHour();
  if(h>=6&&h<10) return '🌅';
  if(h>=10&&h<17) return '☀️';
  if(h>=17&&h<22) return '🌆';
  return '🌙';
}
function kzNow() { return new Date(Date.now()+5*3600*1000); }
function todayKzStart() { const d=kzNow(); d.setUTCHours(0,0,0,0); return new Date(d.getTime()-5*3600*1000); }
function daysAgoStart(n) { const d=todayKzStart(); d.setDate(d.getDate()-n); return d; }
function trendCalc(curr,prev) { if(!prev) return null; const pct=Math.round(((curr-prev)/prev)*100); return {pct,up:pct>=0}; }

export default function SummaryPanel({ user, theme, onClose }) {
  const t = theme;
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [weather, setWeather]     = useState(null);
  const [config, setConfig]       = useState(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  const [editConfig, setEditConfig]     = useState(DEFAULT_CONFIG);
  const [saving, setSaving]       = useState(false);
  const [kassaFilter, setKassaFilter] = useState('all');
  const isAdmin = ['admin','dir','zamdir','sysadmin'].includes(user.role);
  const isRgm   = ['rgmu','rgma','rev'].includes(user.role);

  useEffect(() => { load(); loadWeather(); loadConfig(); }, []);

  async function loadConfig() {
    const { data: row } = await supabase
      .from('user_settings')
      .select('summary_config')
      .eq('user_id', user.username)
      .single();
    if (row?.summary_config) {
      setConfig({ ...DEFAULT_CONFIG, ...row.summary_config });
    }
  }

  async function saveConfig() {
    setSaving(true);
    await supabase.from('user_settings').upsert(
      { user_id: user.username, summary_config: editConfig, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    setConfig(editConfig);
    setSaving(false);
    setShowSettings(false);
  }

  function openSettings() {
    setEditConfig({ ...config });
    setShowSettings(true);
  }

  async function loadWeather() {
    const city = USER_CITIES[user.username] || user.cities?.[0] || 'Астана';
    const coords = WEATHER_COORDS[city];
    if (!coords) return;
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weathercode,windspeed_10m&timezone=Asia%2FAlmaty`);
      const d = await res.json();
      const code = d.current?.weathercode;
      const temp = Math.round(d.current?.temperature_2m);
      const wind = Math.round(d.current?.windspeed_10m);
      const emoji = weatherEmoji(code);
      setWeather({ city, temp, wind, emoji, desc: weatherDesc(code) });
    } catch {}
  }

  function weatherEmoji(code) {
    if (code===0) return '☀️';
    if (code<=2) return '⛅';
    if (code<=3) return '☁️';
    if (code<=49) return '🌫️';
    if (code<=59) return '🌦️';
    if (code<=69) return '🌧️';
    if (code<=79) return '❄️';
    if (code<=82) return '🌧️';
    if (code<=99) return '⛈️';
    return '🌤️';
  }
  function weatherDesc(code) {
    if (code===0) return 'Ясно';
    if (code<=2) return 'Переменная облачность';
    if (code<=3) return 'Пасмурно';
    if (code<=49) return 'Туман';
    if (code<=59) return 'Морось';
    if (code<=69) return 'Дождь';
    if (code<=79) return 'Снег';
    if (code<=82) return 'Ливень';
    if (code<=99) return 'Гроза';
    return 'Переменно';
  }

  async function load() {
    setLoading(true);
    const today   = todayKzStart().toISOString();
    const yd      = daysAgoStart(1).toISOString();
    const w1start = daysAgoStart(7).toISOString();
    const w2start = daysAgoStart(14).toISOString();

    const [leads, tasks, kassa, zrs, shifts] = await Promise.all([
      supabase.from('leads').select('*').eq('is_deleted',false).eq('is_archived',false),
      supabase.from('tasks').select('*, task_observers(*)').eq('is_archived',false),
      supabase.from('kassa_reports').select('*').gte('created_at', today),
      supabase.from('zrs_requests').select('*').in('status',['new','review']),
      supabase.from('shifts_spo').select('*').eq('status','active').gte('shift_date', today),
    ]);
    setData({ leads:leads.data||[], tasks:tasks.data||[], kassa:kassa.data||[], zrs:zrs.data||[], shifts:shifts.data||[], today, yd, w1start, w2start });
    setLoading(false);
  }

  if (loading) return (
    <Popup t={t} onClose={onClose} user={user} weather={weather}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:200,color:t.text2,gap:10 }}>
        <div style={{ width:20,height:20,border:`2px solid ${t.border}`,borderTop:'2px solid #E8263A',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>
        Загрузка сводки...
      </div>
    </Popup>
  );

  const { leads, tasks, kassa, zrs, shifts, today, yd, w1start, w2start } = data;

  const myTasks = tasks.filter(task =>
    task.assigned_to===user.username||task.created_by===user.username||
    task.task_observers?.some(o=>o.user_id===user.username)
  );
  const todayTasks   = myTasks.filter(t=>t.status==='today');
  const overdueTasks = myTasks.filter(t=>t.deadline&&new Date(t.deadline)<new Date()&&t.status!=='done');
  const reviewTasks  = myTasks.filter(t=>t.status==='review'&&t.created_by===user.username);
  const doneTasks    = myTasks.filter(t=>t.status==='done');
  const inTimeTasks  = myTasks.filter(t=>t.status==='done'&&(!t.deadline||new Date(t.closed_at||t.updated_at)<=new Date(t.deadline)));
  const inTimePct    = doneTasks.length>0?Math.round(inTimeTasks.length/doneTasks.length*100):null;

  const myLeads  = isAdmin ? leads : leads.filter(l=>user.cities.includes(l.city));
  const todayS   = new Date(today);
  const ydS      = new Date(yd);
  const w1S      = new Date(w1start);
  const w2S      = new Date(w2start);

  const leadsThisWeek   = myLeads.filter(l=>new Date(l.created_at)>=w1S);
  const leadsLastWeek   = myLeads.filter(l=>{const d=new Date(l.created_at);return d>=w2S&&d<w1S;});
  const successThisWeek = leadsThisWeek.filter(l=>l.status==='success');
  const successLastWeek = leadsLastWeek.filter(l=>l.status==='success');
  const amountThisWeek  = successThisWeek.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0);
  const amountLastWeek  = successLastWeek.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0);
  const convThis = leadsThisWeek.length>0?Math.round(successThisWeek.length/leadsThisWeek.length*100):0;
  const convLast = leadsLastWeek.length>0?Math.round(successLastWeek.length/leadsLastWeek.length*100):0;
  const avgThis  = successThisWeek.length>0?Math.round(amountThisWeek/successThisWeek.length):0;
  const avgLast  = successLastWeek.length>0?Math.round(amountLastWeek/successLastWeek.length):0;

  const ydSuccess = myLeads.filter(l=>l.status==='success'&&new Date(l.updated_at||l.created_at)>=ydS&&new Date(l.updated_at||l.created_at)<todayS);
  const inWork    = myLeads.filter(l=>l.status==='in_progress');
  const waiting   = myLeads.filter(l=>l.status==='waiting');
  const todaySucc = myLeads.filter(l=>l.status==='success'&&new Date(l.updated_at||l.created_at)>=todayS);

  const cities = isAdmin?['Атырау','Актобе','Уральск']:user.cities;
  const cityStats = cities.map(city=>{
    const cw=leadsThisWeek.filter(l=>l.city===city);
    const cl=leadsLastWeek.filter(l=>l.city===city);
    const cs=cw.filter(l=>l.status==='success');
    const conv=cw.length>0?Math.round(cs.length/cw.length*100):0;
    const convPrev=cl.length>0?Math.round(cl.filter(l=>l.status==='success').length/cl.length*100):0;
    return {city,total:cw.length,success:cs.length,conv,convTrend:trendCalc(conv,convPrev)};
  }).sort((a,b)=>b.conv-a.conv);

  const dayNames=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
  const byday=[0,0,0,0,0,0,0];
  successThisWeek.forEach(l=>byday[new Date(l.updated_at||l.created_at).getDay()]++);
  const bestDayIdx=byday.indexOf(Math.max(...byday));
  const bestDay=byday[bestDayIdx]>0?dayNames[bestDayIdx]:null;

  const FILIALS=['sv47','k162','s32','a21'];
  const filialLabels={sv47:'СВ47',k162:'К162',s32:'С32',a21:'А21'};
  const kassaFiltered=kassaFilter==='all'?kassa:kassa.filter(k=>k.type===kassaFilter);
  const launchedFilials=[...new Set(kassaFiltered.map(k=>k.filial))];
  const unlaunchedFilials=FILIALS.filter(f=>!launchedFilials.includes(f));
  const kassaDiffs=kassaFiltered.filter(k=>k.cash_diff||k.noncash_diff);

  const visibleSections = SECTION_DEFS.filter(s => !s.adminOnly || isAdmin || isRgm);

  return (
    <Popup t={t} onClose={onClose} user={user} weather={weather} onRefresh={load} onSettings={openSettings} showSettings={showSettings}>

      {showSettings ? (
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, color:t.text2, marginBottom:16, letterSpacing:1 }}>
            НАСТРОЙКА БЛОКОВ СВОДКИ
          </div>
          {visibleSections.map(s => (
            <label key={s.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 0', borderBottom:`1px solid ${t.border}`, cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:18 }}>{s.icon}</span>
                <span style={{ color:t.text, fontSize:13, fontFamily:'Inter,sans-serif' }}>{s.label}</span>
              </div>
              <div
                onClick={() => setEditConfig(prev => ({ ...prev, [s.key]: !prev[s.key] }))}
                style={{
                  width:42, height:24, borderRadius:12, cursor:'pointer', transition:'background 0.2s',
                  background: editConfig[s.key] ? '#E8263A' : t.border,
                  position:'relative', flexShrink:0,
                }}
              >
                <div style={{
                  position:'absolute', top:3, left: editConfig[s.key] ? 21 : 3,
                  width:18, height:18, borderRadius:'50%', background:'#fff',
                  transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
                }}/>
              </div>
            </label>
          ))}
          <div style={{ display:'flex', gap:8, marginTop:20 }}>
            <button
              onClick={saveConfig} disabled={saving}
              style={{ flex:1, background:'#E8263A', border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:700, padding:'11px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
            >
              {saving ? 'Сохраняю...' : 'Сохранить'}
            </button>
            <button
              onClick={() => setShowSettings(false)}
              style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:10, color:t.text2, fontSize:13, padding:'11px 18px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

          {/* Задачи */}
          {config.tasks && <Group icon="✅" title="Задачи" color="#8b5cf6" t={t}>
            <MetricRow label="На сегодня"    value={todayTasks.length}   color={todayTasks.length>0?'#8b5cf6':t.text2} t={t} />
            <MetricRow label="Просрочено"    value={overdueTasks.length} color={overdueTasks.length>0?'#ef4444':t.text2} t={t} alert={overdueTasks.length>0} />
            <MetricRow label="На проверке"   value={reviewTasks.length}  color={reviewTasks.length>0?'#f97316':t.text2} t={t} />
            {inTimePct!==null&&<MetricRow label="В срок" value={`${inTimePct}%`} color={inTimePct>=70?'#10b981':'#f59e0b'} t={t} trend={trendCalc(inTimePct,70)}/>}
            {overdueTasks.length>0&&(
              <div style={{marginTop:6,padding:'8px',background:'rgba(239,68,68,0.06)',borderRadius:8,border:'1px solid rgba(239,68,68,0.15)'}}>
                {overdueTasks.slice(0,3).map(task=><div key={task.id} style={{fontSize:11,color:'#ef4444',padding:'1px 0'}}>⚠️ {task.title}</div>)}
                {overdueTasks.length>3&&<div style={{fontSize:11,color:t.text2}}>+{overdueTasks.length-3} ещё</div>}
              </div>
            )}
          </Group>}

          {/* Заявки */}
          {config.leads && <Group icon="💬" title="Заявки WAZZUP" color="#06b6d4" t={t}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
              <MiniCard label="Сегодня" value={todaySucc.length} sub={`${FMT(todaySucc.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0))} ₸`} color="#10b981" t={t}/>
              <MiniCard label="Вчера"   value={ydSuccess.length} sub={`${FMT(ydSuccess.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0))} ₸`} color="#10b981" t={t}/>
              <MiniCard label="В работе" value={inWork.length} color="#8b5cf6" t={t}/>
              <MiniCard label="Ждём" value={waiting.length} color="#f59e0b" t={t}/>
            </div>
            <MetricRow label="Неделя" value={leadsThisWeek.length} color={t.text} t={t} trend={trendCalc(leadsThisWeek.length,leadsLastWeek.length)}/>
            <MetricRow label="Конверсия 7д" value={`${convThis}%`} color={convThis>=30?'#10b981':'#f59e0b'} t={t} trend={trendCalc(convThis,convLast)}/>
            <MetricRow label="Средний чек" value={`${FMT(avgThis)} ₸`} color="#f0b429" t={t} trend={trendCalc(avgThis,avgLast)}/>
            {bestDay&&<MetricRow label="Лучший день" value={bestDay} color="#8b5cf6" t={t}/>}
          </Group>}

          {/* По городам */}
          {config.cities && (isAdmin||isRgm) && cityStats.length>0 && <Group icon="🏙️" title="По городам" color="#f59e0b" t={t}>
            {cityStats.map(cs=>(
              <div key={cs.city} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${t.border}22`}}>
                <span style={{color:t.text,fontSize:13}}>{cs.city}</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:t.text2,fontSize:12}}>{cs.total} зав.</span>
                  <span style={{color:cs.conv>=30?'#10b981':'#f59e0b',fontSize:13,fontWeight:600}}>{cs.conv}%</span>
                  {cs.convTrend&&<TrendBadge trend={cs.convTrend}/>}
                </div>
              </div>
            ))}
          </Group>}

          {/* Касса */}
          {config.kassa && (isAdmin||isRgm) && <Group icon="💰" title="Касса сегодня" color="#E8263A" t={t}>
            <div style={{display:'flex',gap:4,marginBottom:8}}>
              {[['all','Все'],['morning','🌅 Утро'],['evening','🌆 Вечер']].map(([val,lbl])=>(
                <button key={val} onClick={()=>setKassaFilter(val)}
                  style={{flex:1,background:kassaFilter===val?'rgba(232,38,58,0.2)':'transparent',
                  border:`1px solid ${kassaFilter===val?'rgba(232,38,58,0.5)':t.border}`,
                  borderRadius:6,color:kassaFilter===val?'#E8263A':t.text2,
                  fontSize:10,padding:'4px 2px',cursor:'pointer',fontWeight:kassaFilter===val?700:400,transition:'all 0.15s'}}>
                  {lbl}
                </button>
              ))}
            </div>
            {launchedFilials.length>0&&<MetricRow label="Запустили" value={launchedFilials.map(f=>filialLabels[f]).join(', ')} color="#10b981" t={t}/>}
            {unlaunchedFilials.length>0&&(
              <div style={{padding:'8px',background:'rgba(239,68,68,0.06)',borderRadius:8,border:'1px solid rgba(239,68,68,0.15)',marginTop:4}}>
                <div style={{color:'#ef4444',fontSize:12,fontWeight:600}}>⚠️ Не запустили:</div>
                <div style={{color:'#ef4444',fontSize:12}}>{unlaunchedFilials.map(f=>filialLabels[f]).join(', ')}</div>
              </div>
            )}
            <MetricRow label="Расхождения" value={kassaDiffs.length>0?`${kassaDiffs.length} ⚠️`:'Нет ✅'} color={kassaDiffs.length>0?'#ef4444':'#10b981'} t={t}/>
          </Group>}

          {/* ЗРС */}
          {config.zrs && (isAdmin||isRgm) && zrs.length>0 && <Group icon="📝" title={`ЗРС (${zrs.length})`} color="#06b6d4" t={t}>
            {zrs.slice(0,4).map(z=>(
              <div key={z.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${t.border}22`}}>
                <span style={{color:t.text,fontSize:12}}>{z.requester}</span>
                <span style={{color:'#f0b429',fontSize:12,fontWeight:700}}>{FMT(z.amount)} ₸</span>
              </div>
            ))}
            {zrs.length>4&&<div style={{fontSize:11,color:t.text2,marginTop:4}}>+{zrs.length-4} ещё</div>}
          </Group>}

          {/* Смены */}
          {config.shifts && (isAdmin||isRgm) && <Group icon="🕐" title="Смены" color="#10b981" t={t}>
            {shifts.length===0
              ?<div style={{color:t.text2,fontSize:12,textAlign:'center',padding:'8px 0'}}>Никого нет</div>
              :shifts.slice(0,5).map(s=>(
                <div key={s.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:`1px solid ${t.border}22`}}>
                  <span style={{color:t.text,fontSize:12}}>{s.worker_name}</span>
                  <span style={{color:'#10b981',fontSize:11,fontWeight:600}}>{s.filial?.toUpperCase()}</span>
                </div>
              ))
            }
          </Group>}

        </div>
      )}
    </Popup>
  );
}

function Popup({ t, onClose, user, weather, onRefresh, onSettings, showSettings, children }) {
  const w = Math.min(window.innerWidth * 0.9, 900);
  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:800,backdropFilter:'blur(2px)'}}/>
      <div style={{
        position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
        width:w, maxHeight:'88vh',
        background:t.surface,border:`1px solid ${t.border}`,
        borderRadius:20,zIndex:900,display:'flex',flexDirection:'column',overflow:'hidden',
        boxShadow:'0 24px 80px rgba(0,0,0,0.5)',
        animation:'summaryIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <style>{`@keyframes summaryIn{from{opacity:0;transform:translate(-50%,-48%) scale(0.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`}</style>

        {/* Top bar */}
        <div style={{padding:'0 20px',height:44,display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${t.border}`,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontFamily:'Unbounded,sans-serif',fontSize:11,fontWeight:700,color:'#E8263A'}}>SKUPKA CRM</span>
            <span style={{color:t.text2,fontSize:11}}>· Сводка</span>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {onRefresh && !showSettings && (
              <button onClick={onRefresh} style={{background:'transparent',border:`1px solid ${t.border}`,borderRadius:6,color:t.text2,fontSize:12,padding:'3px 8px',cursor:'pointer'}}>🔄</button>
            )}
            {onSettings && (
              <button
                onClick={onSettings}
                title="Настроить сводку"
                style={{
                  background: showSettings ? 'rgba(232,38,58,0.15)' : 'transparent',
                  border: `1px solid ${showSettings ? 'rgba(232,38,58,0.4)' : t.border}`,
                  borderRadius:6, color: showSettings ? '#E8263A' : t.text2,
                  fontSize:14, padding:'3px 8px', cursor:'pointer',
                }}
              >⚙️</button>
            )}
            <button onClick={onClose} style={{background:'transparent',border:'none',color:t.text2,fontSize:18,cursor:'pointer',lineHeight:1}}>✕</button>
          </div>
        </div>

        {/* Greeting + weather */}
        <div style={{padding:'16px 24px',background:`linear-gradient(135deg,rgba(232,38,58,0.1) 0%,transparent 60%)`,borderBottom:`1px solid ${t.border}`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:32}}>{getGreetEmoji()}</span>
            <div>
              <div style={{fontFamily:'Unbounded,sans-serif',fontSize:16,fontWeight:700,color:t.text}}>{getGreeting()}, {user.name.split(' ').slice(-1)[0]}!</div>
              <div style={{color:t.text2,fontSize:12,marginTop:2}}>{kzNow().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})} · UTC+5</div>
            </div>
          </div>
          {weather && (
            <div style={{display:'flex',alignItems:'center',gap:10,background:t.surface2,border:`1px solid ${t.border}`,borderRadius:12,padding:'10px 16px'}}>
              <span style={{fontSize:28}}>{weather.emoji}</span>
              <div>
                <div style={{fontFamily:'Unbounded,sans-serif',fontSize:20,fontWeight:700,color:t.text}}>{weather.temp}°C</div>
                <div style={{color:t.text2,fontSize:11}}>{weather.city} · {weather.desc}</div>
                <div style={{color:t.text2,fontSize:10}}>💨 {weather.wind} км/ч</div>
              </div>
            </div>
          )}
        </div>

        {children}
      </div>
    </>
  );
}

function Group({ icon, title, color, children, t }) {
  return (
    <div style={{background:t.surface2,borderRadius:13,border:`1px solid ${t.border}`,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',backdropFilter:'blur(8px)'}}>
      <div style={{padding:'8px 13px',background:color+'0e',borderBottom:`1px solid ${color}1a`,display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:13}}>{icon}</span>
        <span style={{fontFamily:'Unbounded,sans-serif',fontSize:10,fontWeight:700,color,letterSpacing:0.5}}>{title}</span>
      </div>
      <div style={{padding:'8px 13px'}}>{children}</div>
    </div>
  );
}

function MetricRow({ label, value, color, t, alert, trend }) {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',background:alert?'rgba(239,68,68,0.04)':'transparent',borderRadius:4}}>
      <span style={{color:t.text2,fontSize:12}}>{label}</span>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <span style={{color,fontSize:13,fontWeight:600}}>{value}</span>
        {trend&&<TrendBadge trend={trend}/>}
      </div>
    </div>
  );
}

function MiniCard({ label, value, sub, color, t }) {
  return (
    <div style={{background:t.surface,borderRadius:8,padding:'8px 10px',border:`1px solid ${t.border}`}}>
      <div style={{color:t.text2,fontSize:10,marginBottom:3}}>{label}</div>
      <div style={{color,fontSize:16,fontWeight:700}}>{value}</div>
      {sub&&<div style={{color:t.text2,fontSize:10,marginTop:1}}>{sub}</div>}
    </div>
  );
}

function TrendBadge({ trend }) {
  if(!trend) return null;
  const{pct,up}=trend;
  return (
    <span style={{background:up?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)',color:up?'#10b981':'#ef4444',fontSize:10,fontWeight:700,padding:'2px 5px',borderRadius:20,display:'flex',alignItems:'center',gap:2}}>
      {up?'↑':'↓'}{Math.abs(pct)}%
    </span>
  );
}
