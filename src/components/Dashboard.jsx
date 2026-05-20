import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const CITY_COLORS = { 'Атырау': '#f59e0b', 'Актобе': '#06b6d4', 'Уральск': '#a78bfa' };
const STATUS_COLORS = { success: '#10b981', fail: '#ef4444', in_progress: '#8b5cf6', waiting: '#f59e0b', new: '#3b82f6' };

function fmt(n) { return new Intl.NumberFormat('ru-KZ').format(Math.round(n||0)); }

export default function Dashboard({ user, theme }) {
  const t = theme;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const city = user.cities.length === 1 ? user.cities[0] : null;

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/stats`, { params: { city, period: 'today' } });
      setStats(data);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:400,color:t.text2 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32,marginBottom:12 }}>📊</div>
        <div>Загрузка дашборда...</div>
      </div>
    </div>
  );

  if (!stats) return null;

  const cities = city ? [city] : ['Атырау','Актобе','Уральск'];
  const maxCityAmount = Math.max(...cities.map(c => stats.byCity?.[c]?.amount || 0), 1);
  const maxDayTotal = Math.max(...Object.values(stats.byDay||{}).map(d=>d.total), 1);
  const days = Object.entries(stats.byDay||{}).slice(-14);
  const totalFails = Object.values(stats.failReasons||{}).reduce((s,v)=>s+v,0);

  return (
    <div style={{ padding:'0 24px 32px', overflowY:'auto', maxHeight:'calc(100vh - 60px)' }}>

      {/* Заголовок */}
      <div style={{ padding:'20px 0 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:20, fontWeight:700, color:t.text }}>
            📊 Дашборд
          </div>
          <div style={{ color:t.text2, fontSize:13, marginTop:4 }}>
            Данные за сегодня · {new Date().toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>
        <button onClick={fetchStats} style={{ background:t.surface2, border:`1px solid ${t.border}`, borderRadius:10, color:t.text2, fontSize:13, padding:'8px 16px', cursor:'pointer' }}>
          🔄 Обновить
        </button>
      </div>

      {/* Главные KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        <KpiCard emoji="📥" label="Всего заявок" value={stats.total} color="#3b82f6" t={t} />
        <KpiCard emoji="⚡" label="В работе" value={stats.inProgress} color="#8b5cf6" t={t} />
        <KpiCard emoji="🏪" label="Ждём на филиал" value={stats.waiting} color="#f59e0b" t={t} />
        <KpiCard emoji="✅" label="Успешно" value={stats.success} color="#10b981" t={t} />
        <KpiCard emoji="❌" label="Провал" value={stats.fail} color="#ef4444" t={t} />
        <KpiCard emoji="💰" label="Сумма сделок" value={`${fmt(stats.totalAmount)} ₸`} color="#f0b429" t={t} big />
        <KpiCard emoji="📊" label="Конверсия" value={`${stats.conversion}%`} color={stats.conversion>=40?'#10b981':'#f59e0b'} t={t} />
        <KpiCard emoji="💎" label="Средний чек" value={`${fmt(stats.avgCheck)} ₸`} color="#06b6d4" t={t} />
        {stats.overdue > 0 && <KpiCard emoji="🔴" label="Просрочено 10ч+" value={stats.overdue} color="#ef4444" t={t} alert />}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* График по дням */}
        <div style={cardStyle(t)}>
          <div style={cardTitle(t)}>📈 Заявки за 14 дней</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:120, padding:'8px 0' }}>
            {days.map(([date, d]) => (
              <div key={date} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <div style={{ fontSize:9, color:t.text2, marginBottom:2 }}>{d.total>0?d.total:''}</div>
                <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:1 }}>
                  <div style={{ width:'100%', height:`${Math.round((d.success/maxDayTotal)*80)}px`, background:'#10b981', borderRadius:'3px 3px 0 0', minHeight: d.success>0?4:0, transition:'height 0.3s' }} title={`Успешно: ${d.success}`} />
                  <div style={{ width:'100%', height:`${Math.round(((d.total-d.success)/maxDayTotal)*80)}px`, background:'#3b82f666', borderRadius:'3px 3px 0 0', minHeight: (d.total-d.success)>0?2:0 }} title={`Всего: ${d.total}`} />
                </div>
                <div style={{ fontSize:9, color:t.text2, transform:'rotate(-35deg)', marginTop:2, whiteSpace:'nowrap' }}>
                  {new Date(date).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10,height:10,background:'#10b981',borderRadius:2 }}/><span style={{ color:t.text2, fontSize:11 }}>Успешно</span></div>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:10,height:10,background:'#3b82f666',borderRadius:2 }}/><span style={{ color:t.text2, fontSize:11 }}>Всего</span></div>
          </div>
        </div>

        {/* По городам */}
        {!city && (
          <div style={cardStyle(t)}>
            <div style={cardTitle(t)}>🏙️ По городам сегодня</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:8 }}>
              {cities.map(c => {
                const cs = stats.byCity?.[c] || {};
                const barWidth = cs.amount > 0 ? Math.round((cs.amount/maxCityAmount)*100) : 0;
                return (
                  <div key={c}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ color:CITY_COLORS[c], fontSize:13, fontWeight:600 }}>{c}</span>
                      <span style={{ color:t.text2, fontSize:12 }}>{cs.success||0} сд. · {fmt(cs.amount)} ₸</span>
                    </div>
                    <div style={{ height:8, background:t.surface2, borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${barWidth}%`, background:CITY_COLORS[c], borderRadius:4, transition:'width 0.5s' }} />
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:4 }}>
                      <span style={{ color:t.text2, fontSize:11 }}>Конверсия: <b style={{color:t.text}}>{cs.conversion||0}%</b></span>
                      <span style={{ color:t.text2, fontSize:11 }}>Средний чек: <b style={{color:t.text}}>{fmt(cs.avgCheck)} ₸</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Для одного города — воронка */}
        {city && (
          <div style={cardStyle(t)}>
            <div style={cardTitle(t)}>🎯 Воронка — {city}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
              {[
                { label:'Новые', value:stats.byCity?.[city]?.total||0, color:'#3b82f6' },
                { label:'В работе', value:stats.inProgress, color:'#8b5cf6' },
                { label:'Ждём', value:stats.waiting, color:'#f59e0b' },
                { label:'Успешно', value:stats.success, color:'#10b981' },
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

        {/* Круговая по статусам */}
        <div style={cardStyle(t)}>
          <div style={cardTitle(t)}>🥧 Распределение по статусам</div>
          <div style={{ display:'flex', alignItems:'center', gap:20, marginTop:12 }}>
            <PieChart data={[
              { label:'Новые', value:stats.new||0, color:'#3b82f6' },
              { label:'В работе', value:stats.inProgress||0, color:'#8b5cf6' },
              { label:'Ждём', value:stats.waiting||0, color:'#f59e0b' },
              { label:'Успешно', value:stats.success||0, color:'#10b981' },
              { label:'Провал', value:stats.fail||0, color:'#ef4444' },
            ]} total={stats.total||1} />
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {[
                { label:'Новые', value:stats.new||0, color:'#3b82f6' },
                { label:'В работе', value:stats.inProgress||0, color:'#8b5cf6' },
                { label:'Ждём', value:stats.waiting||0, color:'#f59e0b' },
                { label:'Успешно', value:stats.success||0, color:'#10b981' },
                { label:'Провал', value:stats.fail||0, color:'#ef4444' },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:s.color, flexShrink:0 }} />
                  <span style={{ color:t.text2, fontSize:12 }}>{s.label}</span>
                  <span style={{ color:t.text, fontSize:12, fontWeight:600, marginLeft:'auto' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Причины провала */}
        <div style={cardStyle(t)}>
          <div style={cardTitle(t)}>📉 Причины провалов</div>
          {Object.keys(stats.failReasons||{}).length === 0 ? (
            <div style={{ color:t.text2, fontSize:13, textAlign:'center', marginTop:24 }}>Нет провалов сегодня 🎉</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
              {Object.entries(stats.failReasons||{}).sort((a,b)=>b[1]-a[1]).map(([reason, count]) => (
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
          )}
        </div>
      </div>

      {/* Детали по городам для директора */}
      {!city && (
        <div style={cardStyle(t)}>
          <div style={cardTitle(t)}>🏆 Сравнение городов</div>
          <div style={{ overflowX:'auto', marginTop:12 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`2px solid ${t.border}` }}>
                  {['Город','Заявок','Успешно','Провал','В работе','Конверсия','Сумма','Средний чек'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', color:t.text2, fontWeight:600, textAlign:'left', fontFamily:'Inter,sans-serif' }}>{h}</th>
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
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ color: (cs.conversion||0)>=40?'#10b981':'#f59e0b', fontWeight:700 }}>{cs.conversion||0}%</span>
                      </td>
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
    </div>
  );
}

function KpiCard({ emoji, label, value, color, t, big, alert }) {
  return (
    <div style={{ background: alert ? 'rgba(239,68,68,0.08)' : t.surface, border:`1px solid ${alert ? '#ef444444' : t.border}`, borderRadius:14, padding:'16px', display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontSize:22 }}>{emoji}</div>
      <div style={{ fontFamily:'Unbounded,sans-serif', fontSize: big?18:22, fontWeight:700, color }}>{value}</div>
      <div style={{ color:t.text2, fontSize:11 }}>{label}</div>
    </div>
  );
}

function PieChart({ data, total }) {
  const size = 100;
  const r = 38;
  const cx = 50, cy = 50;
  let cumAngle = -90;
  const slices = data.filter(d=>d.value>0).map(d => {
    const angle = (d.value/total)*360;
    const start = cumAngle;
    cumAngle += angle;
    return { ...d, startAngle: start, angle };
  });

  function polarToCartesian(cx, cy, r, angle) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
  }

  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      {slices.map((s, i) => (
        <path key={i} d={describeArc(cx, cy, r, s.startAngle, s.startAngle + s.angle)} fill={s.color} opacity={0.9} />
      ))}
      <circle cx={cx} cy={cy} r={22} fill="none" stroke="currentColor" strokeWidth={0} />
    </svg>
  );
}

function cardStyle(t) {
  return { background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:'18px 20px' };
}
function cardTitle(t) {
  return { fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:600, color:t.text, marginBottom:4 };
}
