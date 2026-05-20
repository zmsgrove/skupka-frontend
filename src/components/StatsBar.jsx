import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function StatsBar({ city, user, theme }) {
  const t = theme;
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
    const channel = supabase.channel('statsbar')
      .on('postgres_changes', { event:'*', schema:'public', table:'leads' }, fetchStats)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [city]);

  async function fetchStats() {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    let q = supabase.from('leads').select('*').eq('is_deleted',false).eq('is_archived',false);
    if (city !== 'all') q = q.eq('city', city);
    const { data: all } = await q;
    if (!all) return;
    const today = all.filter(l => { const d=new Date(l.updated_at||l.created_at); return d>=todayStart&&d<=todayEnd; });
    const successToday = today.filter(l=>l.status==='success');
    setStats({
      newToday: today.filter(l=>l.status==='new').length,
      inProgress: all.filter(l=>l.status==='in_progress').length,
      waiting: all.filter(l=>l.status==='waiting').length,
      successAmount: successToday.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0),
      successCount: successToday.length,
      conversion: today.length>0?Math.round(successToday.length/today.length*100):0,
    });
  }

  if (!stats) return null;
  const fmt = n => new Intl.NumberFormat('ru-KZ').format(Math.round(n||0));

  return (
    <div style={{ display:'flex',alignItems:'center',gap:10,padding:'0 24px 14px',flexWrap:'wrap' }}>
      {[
        { emoji:'🆕', val:stats.newToday, label:'Новых сегодня', color:'#3b82f6' },
        { emoji:'⚡', val:stats.inProgress, label:'В работе', color:'#8b5cf6' },
        { emoji:'🏪', val:stats.waiting, label:'Ждём на филиал', color:'#f59e0b' },
        { emoji:'✅', val:`${fmt(stats.successAmount)} ₸`, label:`Успешно сегодня (${stats.successCount})`, color:'#10b981' },
        { emoji:'📊', val:`${stats.conversion}%`, label:'Конверсия', color:stats.conversion>=40?'#10b981':'#f59e0b' },
      ].map(s => (
        <div key={s.label} style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:'10px 14px',display:'flex',flexDirection:'column',gap:2,minWidth:110 }}>
          <div style={{ fontSize:16 }}>{s.emoji}</div>
          <div style={{ fontFamily:'Unbounded,sans-serif',fontSize:16,fontWeight:700,color:s.color }}>{s.val}</div>
          <div style={{ color:t.text2,fontSize:11 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
