import React, { useEffect, useRef } from 'react';

const STATUS_OPTIONS = [
  { id: 'new', label: '🆕 Новый', color: '#3b82f6' },
  { id: 'in_progress', label: '⚡ В работе', color: '#8b5cf6' },
  { id: 'waiting', label: '🏪 Ждём на филиал', color: '#f59e0b' },
  { id: 'success', label: '✅ Успешно', color: '#10b981' },
  { id: 'fail', label: '❌ Провал', color: '#ef4444' },
];

export default function ContextMenu({ x, y, lead, user, onClose, onStatusChange, onOpenCard, onRead, onDelete, theme }) {
  const ref = useRef(null);
  const t = theme;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Корректировка позиции чтобы не выходил за экран
  const menuX = Math.min(x, window.innerWidth - 220);
  const menuY = Math.min(y, window.innerHeight - 400);

  const canDelete = ['admin','dir','zamdir','sysadmin','rgmu','rgma'].includes(user.role) ||
    ['zmsgrove','maksatovs','koshab','kylyshbaenam','aleksandrovd','aminovn'].includes(user.username);

  const menuStyle = {
    position: 'fixed', left: menuX, top: menuY,
    background: t.surface, border: `1px solid ${t.border}`,
    borderRadius: 14, boxShadow: t.shadow,
    minWidth: 210, zIndex: 3000, overflow: 'hidden',
  };

  const headerStyle = {
    padding: '10px 14px', borderBottom: `1px solid ${t.border}`,
    background: t.surface2,
  };

  const sectionStyle = { padding: '6px 0', borderBottom: `1px solid ${t.border}` };

  const itemStyle = (color) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 14px', cursor: 'pointer', fontSize: 13,
    color: color || t.text, transition: 'background 0.1s',
    fontFamily: 'Inter, sans-serif',
  });

  return (
    <div ref={ref} style={menuStyle}>
      {/* Заголовок */}
      <div style={headerStyle}>
        <div style={{ color: t.text, fontWeight: 600, fontSize: 13 }}>{lead.client_name}</div>
        <div style={{ color: t.text2, fontSize: 11, marginTop: 2 }}>{lead.phone} · {lead.device}</div>
      </div>

      {/* Смена статуса */}
      <div style={sectionStyle}>
        <div style={{ padding: '4px 14px', color: t.text2, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Сменить статус
        </div>
        {STATUS_OPTIONS.filter(s => s.id !== lead.status).map(s => (
          <div key={s.id} style={itemStyle(s.color)}
            onMouseEnter={e => e.currentTarget.style.background = t.surface2}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => { onStatusChange(s.id); onClose(); }}>
            {s.label}
          </div>
        ))}
      </div>

      {/* Быстрые действия */}
      <div style={sectionStyle}>
        <div style={{ padding: '4px 14px', color: t.text2, fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Действия
        </div>
        <div style={itemStyle()} onClick={() => { onOpenCard(); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = t.surface2}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          📋 Открыть карточку
        </div>
        <div style={itemStyle()} onClick={() => { window.open(`tel:${lead.phone}`); onClose(); }}
          onMouseEnter={e => e.currentTarget.style.background = t.surface2}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          📞 Позвонить
        </div>
        {lead.unread_count > 0 && (
          <div style={itemStyle()} onClick={() => { onRead(); onClose(); }}
            onMouseEnter={e => e.currentTarget.style.background = t.surface2}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            🔕 Отметить прочитанным
          </div>
        )}
      </div>

      {/* Удаление */}
      {canDelete && (
        <div style={{ padding: '6px 0' }}>
          <div style={itemStyle('#ef4444')} onClick={() => { onDelete(); onClose(); }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            🗑️ Удалить карточку
          </div>
        </div>
      )}
    </div>
  );
}
