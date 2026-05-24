import React from 'react';
import { radius } from '../theme';

export function computeDateRange(preset, from, to) {
  const now = new Date();
  if (preset === 'today') {
    const s = new Date(now); s.setHours(0,0,0,0);
    const e = new Date(now); e.setHours(23,59,59,999);
    return { from: s, to: e };
  }
  if (preset === 'week') {
    const s = new Date(now); s.setDate(s.getDate()-6); s.setHours(0,0,0,0);
    const e = new Date(now); e.setHours(23,59,59,999);
    return { from: s, to: e };
  }
  if (preset === 'month') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1); s.setHours(0,0,0,0);
    const e = new Date(now); e.setHours(23,59,59,999);
    return { from: s, to: e };
  }
  if (preset === 'period' && from && to) {
    const s = new Date(from); s.setHours(0,0,0,0);
    const e = new Date(to); e.setHours(23,59,59,999);
    return { from: s, to: e };
  }
  return null;
}

// value: { preset: null|'today'|'week'|'month'|'period', from?: string, to?: string, range?: {from,to} }
// onChange: fn(value)
// showAll: добавить кнопку «Все» (без фильтра)
export default function DateFilter({ value, onChange, theme, showAll = false }) {
  const t = theme;
  const todayStr = new Date().toISOString().split('T')[0];
  const preset = value?.preset ?? (showAll ? null : 'today');
  const from = value?.from || '';
  const to   = value?.to   || '';

  const emit = (p, f, tv) => {
    const range = p === null      ? null
      : p === 'period' ? (f && tv ? computeDateRange('period', f, tv) : null)
      : computeDateRange(p, null, null);
    onChange({ preset: p, from: f, to: tv, range });
  };

  const btns = [
    ...(showAll ? [{ id: null, label: 'Все' }] : []),
    { id: 'today',  label: 'Сегодня' },
    { id: 'week',   label: 'Неделя'  },
    { id: 'month',  label: 'Месяц'   },
    { id: 'period', label: 'Период'  },
  ];

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
      {btns.map(b => (
        <button key={String(b.id)} onClick={() => emit(b.id, from, to)} style={{
          background: preset===b.id ? 'rgba(232,38,58,0.15)' : 'transparent',
          border: `1px solid ${preset===b.id ? 'rgba(232,38,58,0.5)' : t.border}`,
          borderRadius: radius.sm, color: preset===b.id ? '#E8263A' : t.text2,
          fontSize: 12, padding: '5px 12px', cursor: 'pointer',
          fontFamily: 'Inter,sans-serif', transition: 'all 0.15s',
        }}>{b.label}</button>
      ))}
      {preset === 'period' && (
        <>
          <input type="date" value={from} max={to || todayStr}
            onChange={e => emit('period', e.target.value, to)}
            style={{ background: t.inputBg || t.surface, border:`1px solid ${t.border}`, borderRadius:radius.sm, color:t.text, fontSize:12, padding:'5px 8px', outline:'none' }} />
          <span style={{ color:t.text2, fontSize:12 }}>—</span>
          <input type="date" value={to} min={from} max={todayStr}
            onChange={e => emit('period', from, e.target.value)}
            style={{ background: t.inputBg || t.surface, border:`1px solid ${t.border}`, borderRadius:radius.sm, color:t.text, fontSize:12, padding:'5px 8px', outline:'none' }} />
        </>
      )}
    </div>
  );
}
