import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const CITY_COLORS = { 'Атырау':'#f59e0b', 'Актобе':'#06b6d4', 'Уральск':'#a78bfa' };
function fmt(n) { return new Intl.NumberFormat('ru-KZ').format(Math.round(n||0)); }

export default function Dashboard({ user, theme }) {
  const t = theme;
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]   = useState('');
  const hasAllCities = user.cities.length > 1;
  const [selectedCity, setSelectedCity] = useState(null); // null = все города
  const city = hasAllCities ? selectedCity : user.cities[0];
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => { fetchStats(); }, [period, fromDate, toDate, selectedCity]);

  async function fetchStats() {
    if (period === 'custom' && (!fromDate || !toDate)) return;
    setLoading(true);
    try {
      const params = { city, period };
      if (period === 'custom') { params.from = fromDate; params.to = toDate; }
      const { data } = await axios.get(`${API}/api/stats`, { params });
      setStats(data);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  const cities = city ? [city] : ['Атырау','Актобе','Уральск'];
  const periodLabel = {
    today: `Сегодня — ${new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}`,
    week:  'За последние 7 дней',
    month: 'За текущий месяц',
    custom: fromDate && toDate ? `${fromDate} — ${toDate}` : 'Выберите период',
  }[period];

  return (
    <div style={{ padding:'0 24px 32px', overflowY:'auto', maxHeight:'calc(100vh - 60px)' }}>
      <div style={{ padding:'20px 0 16px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:20, fontWeight:700, color:t.text }}>📊 Дашборд</div>
          <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>{periodLabel}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {hasAllCities && (
            <div style={{ display:'flex', gap:4, marginRight:4 }}>
              {[null,'Атырау','Актобе','Уральск'].map(c => (
                <button key={c||'all'} onClick={() => setSelectedCity(c)} style={{
                  border:`1px solid ${selectedCity===c ? (CITY_COLORS[c]||'#E8263A') : t.border}`,
                  background: selectedCity===c ? (CITY_COLORS[c]||'#E8263A')+'22' : 'transparent',
                  color: selectedCity===c ? (CITY_COLORS[c]||'#E8263A') : t.text2,
                  borderRadius:8, padding:'6px 12px', fontSize:11, cursor:'pointer',
                  fontFamily:'Unbounded,sans-serif', transition:'all 0.15s',
                }}>{c || 'Все'}</button>
              ))}
            </div>
          )}
          {[['today','Сегодня'],['week','Неделя'],['month','Месяц'],['custom','Период']].map(([val,label]) => (
            <button key={val} onClick={() => setPeriod(val)} style={{
              border:`1px solid ${period===val?'#E8263A':t.border}`,
              background: period===val?'rgba(232,38,58,0.15)':'transparent',
              color: period===val?'#E8263A':t.text2,
              borderRadius:8, padding:'6px 14px', fontSize:12, cursor:'pointer',
              fontFamily:'Unbounded,sans-serif', transition:'all 0.15s',
            }}>{label}</button>
          ))}
          {period === 'custom' && (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <input type="date" value={fromDate} max={todayStr} onChange={e=>setFromDate(e.target.value)}
                style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'6px 10px', outline:'none' }} />
              <span style={{ color:t.text2 }}>—</span>
              <input type="date" value={toDate} max={todayStr} min={fromDate} onChange={e=>setToDate(e.target.value)}
                style={{ background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'6px 10px', outline:'none' }} />
            </div>
          )}
          <button onClick={fetchStats} style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:12, padding:'6px 12px', cursor:'pointer' }}>🔄</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:t.text2 }}>
          <div style={{ textAlign:'center' }}><div style={{ fontSize:32, marginBottom:12 }}>📊</div><div>Загрузка...</div></div>
        </div>
      ) : !stats ? null : <DashboardContent stats={stats} cities={cities} city={city} t={t} />}
    </div>
  );
}

function DashboardContent({ stats, cities, city, t }) {
  const maxCityAmount = Math.max(...cities.map(c => stats.byCity?.[c]?.amount || 0), 1);
  const maxDayTotal   = Math.max(...Object.values(stats.byDay||{}).map(d=>d.total), 1);
  const days          = Object.entries(stats.byDay||{}).slice(-14);
  const totalFails    = Object.values(stats.failReasons||{}).reduce((s,v)=>s+v,0);

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        <KpiCard emoji="📥" label="Всего заявок"    value={stats.total}              color="#3b82f6" t={t} />
        <KpiCard emoji="⚡" label="В работе"        value={stats.inProgress}         color="#8b5cf6" t={t} />
        <KpiCard emoji="🏪" label="Ждём на филиал"  value={stats.waiting}            color="#f59e0b" t={t} />
        <KpiCard emoji="✅" label="Успешно"         value={stats.success}            color="#10b981" t={t} />
        <KpiCard emoji="❌" label="Провал"          value={stats.fail}               color="#ef4444" t={t} />
        <KpiCard emoji="💰" label="Сумма сделок"    value={`${fmt(stats.totalAmount)} ₸`} color="#f0b429" t={t} big />
        <KpiCard emoji="📊" label="Конверсия"       value={`${stats.conversion}%`}   color={stats.conversion>=40?'#10b981':'#f59e0b'} t={t} />
        <KpiCard emoji="💎" label="Средний чек"     value={`${fmt(stats.avgCheck)} ₸`} color="#06b6d4" t={t} />
        {stats.overdue > 0 && <KpiCard emoji="🔴" label="Просрочено 10ч+" value={stats.overdue} color="#ef4444" t={t} alert />}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* График */}
        <div style={cardStyle(t)}>
          <div style={cardTitle(t)}>📈 Заявки за 14 дней</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:120, padding:'8px 0' }}>
            {days.map(([date, d]) => (
              <div key={date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                <div style={{ fontSize:9, color:t.text2, marginBottom:2 }}>{d.total>0?d.total:''}</div>
                <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:1 }}>
                  <div style={{ width:'100%', height:`${Math.round((d.success/Math.max(maxDayTotal,1))*80)}px`, background:'#10b981', borderRadius:'3px 3px 0 0', minHeight:d.success>0?4:0 }} />
                  <div style={{ width:'100%', height:`${Math.round(((d.total-d.success)/Math.max(maxDayTotal,1))*80)}px`, background:'#3b82f666', borderRadius:'3px 3px 0 0', minHeight:(d.total-d.success)>0?2:0 }} />
                </div>
                <div style={{ fontSize:9, color:t.text2, transform:'rotate(-35deg)', marginTop:4, whiteSpace:'nowrap' }}>
                  {new Date(date).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <LegendItem color="#10b981" label="Успешно" />
            <LegendItem color="#3b82f666" label="Всего" />
          </div>
        </div>

        {/* По городам / воронка */}
        {!city ? (
          <div style={cardStyle(t)}>
            <div style={cardTitle(t)}>🏙️ По городам</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14, marginTop:8 }}>
              {cities.map(c => {
                const cs = stats.byCity?.[c] || {};
                const barWidth = cs.amount>0 ? Math.round((cs.amount/maxCityAmount)*100) : 0;
                return (
                  <div key={c}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ color:CITY_COLORS[c], fontSize:13, fontWeight:600 }}>{c}</span>
                      <span style={{ color:t.text2, fontSize:12 }}>{cs.success||0} сд. · {fmt(cs.amount)} ₸</span>
                    </div>
                    <div style={{ height:8, background:t.surface2, borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${barWidth}%`, background:CITY_COLORS[c], borderRadius:4, transition:'width 0.5s' }} />
                    </div>
                    <div style={{ display:'flex', gap:12, marginTop:3 }}>
                      <span style={{ color:t.text2, fontSize:11 }}>Конверсия: <b style={{color:t.text}}>{cs.conversion||0}%</b></span>
                      <span style={{ color:t.text2, fontSize:11 }}>Ср. чек: <b style={{color:t.text}}>{fmt(cs.avgCheck)} ₸</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={cardStyle(t)}>
            <div style={cardTitle(t)}>🎯 Воронка — {city}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
              {[
                { label:'Новые',    value:stats.new||0,        color:'#3b82f6' },
                { label:'В работе', value:stats.inProgress||0, color:'#8b5cf6' },
                { label:'Ждём',     value:stats.waiting||0,    color:'#f59e0b' },
                { label:'Успешно',  value:stats.success||0,    color:'#10b981' },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ color:t.text2, fontSize:12, width:70 }}>{item.label}</span>
                  <div style={{ flex:1, height:10, background:t.surface2, borderRadius:5, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.round((item.value/Math.max(stats.total,1))*100)}%`, background:item.color, borderRadius:5 }} />
                  </div>
                  <span style={{ color:item.color, fontSize:13, fontWeight:700, width:30, textAlign:'right' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Круговая */}
        <div style={cardStyle(t)}>
          <div style={cardTitle(t)}>🥧 По статусам</div>
          <div style={{ display:'flex', alignItems:'center', gap:20, marginTop:12 }}>
            <PieChart data={[
              { label:'Новые',    value:stats.new||0,        color:'#3b82f6' },
              { label:'В работе', value:stats.inProgress||0, color:'#8b5cf6' },
              { label:'Ждём',     value:stats.waiting||0,    color:'#f59e0b' },
              { label:'Успешно',  value:stats.success||0,    color:'#10b981' },
              { label:'Провал',   value:stats.fail||0,       color:'#ef4444' },
            ]} total={Math.max(stats.total,1)} />
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { label:'Новые',    value:stats.new||0,        color:'#3b82f6' },
                { label:'В работе', value:stats.inProgress||0, color:'#8b5cf6' },
                { label:'Ждём',     value:stats.waiting||0,    color:'#f59e0b' },
                { label:'Успешно',  value:stats.success||0,    color:'#10b981' },
                { label:'Провал',   value:stats.fail||0,       color:'#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:s.color, flexShrink:0 }} />
                  <span style={{ color:t.text2, fontSize:12 }}>{s.label}</span>
                  <span style={{ color:t.text, fontSize:12, fontWeight:600, marginLeft:'auto', paddingLeft:8 }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Причины провалов — топ-5 */}
        <FailReasonsCard stats={stats} totalFails={totalFails} t={t} />
      </div>

      {!city && (
        <div style={cardStyle(t)}>
          <div style={cardTitle(t)}>🏆 Сравнение городов</div>
          <div style={{ overflowX:'auto', marginTop:12 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`2px solid ${t.border}` }}>
                  {['Город','Заявок','Успешно','Провал','В работе','Конверсия','Сумма','Ср. чек'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', color:t.text2, fontWeight:600, textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cities.map((c,i) => {
                  const cs = stats.byCity?.[c]||{};
                  return (
                    <tr key={c} style={{ borderBottom:`1px solid ${t.border}`, background:i%2===0?'transparent':t.surface2+'44' }}>
                      <td style={{ padding:'10px 12px', color:CITY_COLORS[c], fontWeight:600 }}>{c}</td>
                      <td style={{ padding:'10px 12px', color:t.text }}>{cs.total||0}</td>
                      <td style={{ padding:'10px 12px', color:'#10b981', fontWeight:600 }}>{cs.success||0}</td>
                      <td style={{ padding:'10px 12px', color:'#ef4444' }}>{cs.fail||0}</td>
                      <td style={{ padding:'10px 12px', color:'#8b5cf6' }}>{cs.inProgress||0}</td>
                      <td style={{ padding:'10px 12px' }}><span style={{ color:(cs.conversion||0)>=40?'#10b981':'#f59e0b', fontWeight:700 }}>{cs.conversion||0}%</span></td>
                      <td style={{ padding:'10px 12px', color:'#f0b429', fontWeight:700 }}>{fmt(cs.amount)} ₸</td>
                      <td style={{ padding:'10px 12px', color:t.text }}>{fmt(cs.avgCheck)} ₸</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop:`2px solid ${t.border}`, background:t.surface2 }}>
                  <td style={{ padding:'10px 12px', color:t.text, fontWeight:700 }}>Итого</td>
                  <td style={{ padding:'10px 12px', color:t.text, fontWeight:700 }}>{stats.total}</td>
                  <td style={{ padding:'10px 12px', color:'#10b981', fontWeight:700 }}>{stats.success}</td>
                  <td style={{ padding:'10px 12px', color:'#ef4444', fontWeight:700 }}>{stats.fail}</td>
                  <td style={{ padding:'10px 12px', color:'#8b5cf6', fontWeight:700 }}>{stats.inProgress}</td>
                  <td style={{ padding:'10px 12px', color:stats.conversion>=40?'#10b981':'#f59e0b', fontWeight:700 }}>{stats.conversion}%</td>
                  <td style={{ padding:'10px 12px', color:'#f0b429', fontWeight:700 }}>{fmt(stats.totalAmount)} ₸</td>
                  <td style={{ padding:'10px 12px', color:t.text, fontWeight:700 }}>{fmt(stats.avgCheck)} ₸</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function FailReasonsCard({ stats, totalFails, t }) {
  const [showAll, setShowAll] = useState(false);
  const all = Object.entries(stats.failReasons||{}).sort((a,b)=>b[1]-a[1]);
  const visible = showAll ? all : all.slice(0, 5);
  const hasMore = all.length > 5;

  return (
    <div style={cardStyle(t)}>
      <div style={cardTitle(t)}>📉 Причины провалов</div>
      {all.length === 0 ? (
        <div style={{ color:t.text2, fontSize:13, textAlign:'center', marginTop:24 }}>Нет провалов за период 🎉</div>
      ) : (
        <>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
            {visible.map(([reason, count]) => (
              <div key={reason}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ color:t.text3, fontSize:12 }}>{reason}</span>
                  <span style={{ color:'#ef4444', fontSize:12, fontWeight:600 }}>{count} ({Math.round(count/totalFails*100)}%)</span>
                </div>
                <div style={{ height:6, background:t.surface2, borderRadius:3 }}>
                  <div style={{ height:'100%', width:`${Math.round(count/totalFails*100)}%`, background:'#ef4444', borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <button onClick={() => setShowAll(v => !v)} style={{
              marginTop:12, width:'100%', background:'transparent',
              border:`1px solid ${t.border}`, borderRadius:8,
              color:t.text2, fontSize:12, padding:'7px', cursor:'pointer',
              transition:'all 0.15s',
            }}>
              {showAll ? '▲ Свернуть' : `▼ Показать все (${all.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ emoji, label, value, color, t, big, alert }) {
  return (
    <div style={{ background:alert?'rgba(239,68,68,0.08)':t.surface, border:`1px solid ${alert?'#ef444444':t.border}`, borderRadius:14, padding:'16px', display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontSize:20 }}>{emoji}</div>
      <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:big?16:20, fontWeight:700, color }}>{value}</div>
      <div style={{ color:t.text2, fontSize:11 }}>{label}</div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
      <div style={{ width:10, height:10, background:color, borderRadius:2 }} />
      <span style={{ fontSize:11, color:'#9090a8' }}>{label}</span>
    </div>
  );
}

function PieChart({ data, total }) {
  const size=100, r=38, cx=50, cy=50;
  let cumAngle=-90;
  const slices = data.filter(d=>d.value>0).map(d => {
    const angle=(d.value/total)*360;
    const start=cumAngle; cumAngle+=angle;
    return {...d,startAngle:start,angle};
  });
  function polar(cx,cy,r,angle) { const rad=angle*Math.PI/180; return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}; }
  function arc(cx,cy,r,sa,ea) { const s=polar(cx,cy,r,ea),e=polar(cx,cy,r,sa); return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${ea-sa<=180?'0':'1'} 0 ${e.x} ${e.y} Z`; }
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      {slices.map((s,i) => <path key={i} d={arc(cx,cy,r,s.startAngle,s.startAngle+s.angle)} fill={s.color} opacity={0.9} />)}
    </svg>
  );
}

function cardStyle(t) { return { background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:'18px 20px' }; }
function cardTitle(t) { return { fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:600, color:t.text, marginBottom:4 }; }
