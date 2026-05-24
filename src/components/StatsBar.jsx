import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { radius } from '../theme';

export default function StatsBar({ city, user, theme, onFilter }) {
  const t = theme;
  const [stats, setStats] = useState(null);
  const [yesterday, setYesterday] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  const fetchStats = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999);
    const ydStart = new Date(now); ydStart.setDate(ydStart.getDate()-1); ydStart.setHours(0,0,0,0);
    const ydEnd = new Date(now); ydEnd.setDate(ydEnd.getDate()-1); ydEnd.setHours(23,59,59,999);

    let q = supabase.from('leads').select('*').eq('is_deleted',false).eq('is_archived',false);
    if (city !== 'all') q = q.eq('city', city);
    const { data: all } = await q;
    if (!all) return;

    const today = all.filter(l => { const d=new Date(l.updated_at||l.created_at); return d>=todayStart&&d<=todayEnd; });
    const yd = all.filter(l => { const d=new Date(l.updated_at||l.created_at); return d>=ydStart&&d<=ydEnd; });

    const successToday = today.filter(l=>l.status==='success');
    const successYd = yd.filter(l=>l.status==='success');
    const inProgressAll = all.filter(l=>l.status==='in_progress');
    const waitingAll = all.filter(l=>l.status==='waiting');
    const overdueAll = all.filter(l=>l.status==='in_progress'&&(Date.now()-new Date(l.updated_at||l.created_at).getTime())>10*3600*1000);

    setStats({
      newToday: today.filter(l=>l.status==='new').length,
      newYd: yd.filter(l=>l.status==='new').length,
      inProgress: inProgressAll.length,
      inProgressYd: yd.filter(l=>l.status==='in_progress').length,
      inProgressAmount: inProgressAll.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0),
      waiting: waitingAll.length,
      waitingYd: yd.filter(l=>l.status==='waiting').length,
      waitingAmount: waitingAll.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0),
      successAmount: successToday.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0),
      successCount: successToday.length,
      successYd: successYd.length,
      successAmountYd: successYd.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0),
      conversion: today.length>0?Math.round(successToday.length/today.length*100):0,
      conversionYd: yd.length>0?Math.round(successYd.length/yd.length*100):0,
      overdue: overdueAll.length,
    });
    setLastUpdated(new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));
  }, [city]);

  useEffect(() => {
    fetchStats();
    const channel = supabase.channel('statsbar')
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},fetchStats)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchStats]);

  if (!stats) return null;

  const fmt = n => new Intl.NumberFormat('ru-KZ').format(Math.round(n||0));

  const trend = (cur, prev) => {
    if (prev === 0 && cur === 0) return null;
    if (cur > prev) return { arrow:'↑', color:'#10b981' };
    if (cur < prev) return { arrow:'↓', color:'#ef4444' };
    return { arrow:'→', color:'#9090a8' };
  };

  const handleClick = (filter) => {
    const next = activeFilter === filter ? null : filter;
    setActiveFilter(next);
    if (onFilter) onFilter(next);
  };

  const cards = [
    {
      id: 'new',
      emoji: '🆕',
      value: stats.newToday,
      label: 'Новых сегодня',
      color: '#3b82f6',
      trend: trend(stats.newToday, stats.newYd),
      alert: stats.newToday > 5,
      alertColor: '#f59e0b',
    },
    {
      id: 'in_progress',
      emoji: '⚡',
      value: stats.inProgress,
      label: 'В работе',
      sub: stats.inProgressAmount > 0 ? `${fmt(stats.inProgressAmount)} ₸` : null,
      color: '#8b5cf6',
      trend: trend(stats.inProgress, stats.inProgressYd),
    },
    {
      id: 'waiting',
      emoji: '🏪',
      value: stats.waiting,
      label: 'Ждём на филиал',
      sub: stats.waitingAmount > 0 ? `${fmt(stats.waitingAmount)} ₸` : null,
      color: '#f59e0b',
      trend: trend(stats.waiting, stats.waitingYd),
    },
    {
      id: 'success',
      emoji: '✅',
      value: `${fmt(stats.successAmount)} ₸`,
      label: `Успешно сегодня (${stats.successCount})`,
      color: '#10b981',
      trend: trend(stats.successCount, stats.successYd),
      big: true,
    },
    {
      id: 'conversion',
      emoji: '📊',
      value: `${stats.conversion}%`,
      label: 'Конверсия',
      color: stats.conversion >= 50 ? '#10b981' : stats.conversion < 30 ? '#ef4444' : '#f59e0b',
      trend: trend(stats.conversion, stats.conversionYd),
    },
  ];

  if (stats.overdue > 0) {
    cards.push({
      id: 'overdue',
      emoji: '🔴',
      value: stats.overdue,
      label: 'Просрочено 10ч+',
      color: '#ef4444',
      alert: true,
      alertColor: '#ef4444',
    });
  }

  return (
    <div style={{ padding:'21px 24px 10px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {/* Cards — 80% */}
        <div className="stats-bar-cards" style={{ display:'flex', alignItems:'stretch', gap:8, flex:'0 0 80%', flexWrap:'nowrap', overflowX:'auto' }}>
          {cards.map(card => {
            const isActive = activeFilter === card.id;
            const bgColor = card.alert ? card.alertColor+'15' : t.surface;
            const borderColor = isActive ? card.color : card.alert ? card.alertColor+'44' : t.border;
            return (
              <div key={card.id} onClick={() => handleClick(card.id)}
                style={{
                  background: isActive ? card.color+'20' : bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: radius.md,
                  padding: '8px 13px',
                  display:'flex', flexDirection:'column', justifyContent:'space-between',
                  flex:'1 1 0', minWidth:110, minHeight:82,
                  cursor: 'pointer', transition: 'all 0.18s',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                  backdropFilter: 'blur(8px)',
                  boxShadow: isActive ? `0 4px 16px ${card.color}40` : '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:15 }}>{card.emoji}</span>
                  {card.trend && <span style={{ fontSize:10, fontWeight:700, color:card.trend.color }}>{card.trend.arrow}</span>}
                </div>
                <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:15, fontWeight:700, color:card.color, lineHeight:1.2, marginTop:4 }}>
                  {card.value}
                </div>
                {card.sub && <div style={{ fontSize:10, color:card.color, fontWeight:600 }}>{card.sub}</div>}
                <div style={{ color:t.text2, fontSize:10, marginTop:2 }}>{card.label}</div>
              </div>
            );
          })}
        </div>
        {/* Time — 20% */}
        {lastUpdated && (
          <div className="stats-bar-time" style={{ flex:'0 0 20%', display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'center', gap:4 }}>
            <span style={{ color:t.text2, fontSize:12 }}>🕐 {lastUpdated}</span>
            <button onClick={fetchStats} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:6, color:t.text2, cursor:'pointer', fontSize:11, padding:'3px 8px' }}>↻ Обновить</button>
          </div>
        )}
      </div>

      {activeFilter && (
        <div style={{ marginTop:8, fontSize:12, color:t.text2 }}>
          Фильтр активен — показаны карточки: <span style={{ color:'#E8263A' }}>{activeFilter}</span>
          <button onClick={() => { setActiveFilter(null); if(onFilter) onFilter(null); }}
            style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', fontSize:12, marginLeft:8 }}>
            ✕ сбросить
          </button>
        </div>
      )}
    </div>
  );
}
