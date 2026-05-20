import React from 'react';

const CITY_COLORS = { 'Атырау':'#f59e0b', 'Актобе':'#06b6d4', 'Уральск':'#a78bfa' };

function getTimerLabel(lead) {
  const ref = new Date(lead.updated_at || lead.created_at);
  const diffMs = Date.now() - ref.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}м`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}ч ${remMins}м` : `${hours}ч`;
}

export default function LeadCard({ lead, colColor, onClick, onDragStart, onDragEnd, onContextMenu, isDragging, isOverdue, isRepeat, showTimer, theme }) {
  const t = theme;
  const date = new Date(lead.created_at).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit' });
  const cityColor = CITY_COLORS[lead.city] || '#9090a8';
  const hasUnread = lead.unread_count > 0;

  const borderColor = isOverdue ? '#ef4444' : hasUnread ? '#f0b429' : t.border;

  return (
    <div draggable="true" onDragStart={onDragStart} onDragEnd={onDragEnd}
      onClick={onClick} onContextMenu={onContextMenu}
      style={{ background:t.cardBg, border:`1px solid ${borderColor}`, borderRadius:12, overflow:'hidden',
        cursor:'grab', userSelect:'none', transition:'transform 0.15s,opacity 0.15s,border-color 0.2s',
        opacity:isDragging?0.4:1,
        boxShadow: isOverdue?'0 0 0 1px rgba(239,68,68,0.3)':hasUnread?'0 0 0 1px rgba(240,180,41,0.3)':'none',
      }}>

      {/* Просрочка */}
      {isOverdue && (
        <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',background:'rgba(239,68,68,0.1)',borderBottom:'1px solid rgba(239,68,68,0.2)' }}>
          <span style={{ fontSize:10 }}>🔴</span>
          <span style={{ color:'#ef4444',fontSize:11,fontWeight:600 }}>Просрочено 10+ часов</span>
        </div>
      )}

      {/* Непрочитанные */}
      {!isOverdue && hasUnread && (
        <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',background:'rgba(240,180,41,0.1)',borderBottom:'1px solid rgba(240,180,41,0.2)' }}>
          <span style={{ color:'#f0b429',fontSize:10 }}>●</span>
          <span style={{ color:'#f0b429',fontSize:11,fontWeight:600,flex:1 }}>{lead.unread_count} новое{lead.unread_count>1?'я':''}</span>
          <span style={{ background:'#f0b429',color:'#0f0f13',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:20 }}>{lead.unread_count}</span>
        </div>
      )}

      {/* Повторный */}
      {isRepeat && (
        <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 12px',background:'rgba(6,182,212,0.1)',borderBottom:'1px solid rgba(6,182,212,0.2)' }}>
          <span style={{ fontSize:10 }}>🔄</span>
          <span style={{ color:'#06b6d4',fontSize:11,fontWeight:600 }}>Повторный клиент</span>
        </div>
      )}

      {/* Возврат из провала */}
      {lead.revived_from_fail && (
        <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 12px',background:'rgba(168,85,247,0.1)',borderBottom:'1px solid rgba(168,85,247,0.2)' }}>
          <span style={{ fontSize:10 }}>♻️</span>
          <span style={{ color:'#a855f7',fontSize:11,fontWeight:600 }}>Ранее был провал</span>
        </div>
      )}

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:colColor+'22',borderBottom:`1px solid ${colColor}44` }}>
        <span style={{ fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,color:cityColor,background:cityColor+'18',fontFamily:'Unbounded,sans-serif' }}>{lead.city}</span>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          {showTimer && (
            <span style={{ fontSize:10,color:isOverdue?'#ef4444':'#9090a8',fontWeight:isOverdue?700:400 }}>⏱ {getTimerLabel(lead)}</span>
          )}
          <span style={{ color:t.text2,fontSize:11 }}>{date}</span>
        </div>
      </div>

      <div style={{ padding:'10px 12px 8px',display:'flex',flexDirection:'column',gap:4 }}>
        <div style={{ color:t.text,fontWeight:600,fontSize:14 }}>{lead.client_name}</div>
        <div style={{ color:t.text2,fontSize:12 }}>{lead.phone}</div>
        <div style={{ color:t.text3,fontSize:13,marginTop:4 }}>📱 {lead.device}</div>
        {lead.estimate_amount && (
          <div style={{ color:'#f0b429',fontSize:13,fontWeight:600,marginTop:4 }}>
            💰 {new Intl.NumberFormat('ru-KZ').format(lead.estimate_amount)} ₸
          </div>
        )}
        {lead.visit_date && (
          <div style={{ color:'#06b6d4',fontSize:12,marginTop:4 }}>
            📅 Придёт: {new Date(lead.visit_date).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>
      <div style={{ color:t.text2+'66',fontSize:10,textAlign:'center',padding:'3px 0 6px' }}>⠿ перетащи · ПКМ для меню</div>
    </div>
  );
}
