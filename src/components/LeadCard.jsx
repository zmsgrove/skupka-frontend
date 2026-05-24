import React from 'react';
import { radius } from '../theme';

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

// Простой Markdown → текст (убираем символы)
function stripMarkdown(text) {
  if (!text) return '';
  return text.replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1');
}

export default function LeadCard({ lead, colColor, onClick, onDragStart, onDragEnd, onContextMenu, isDragging, isOverdue, isRepeat, showTimer, theme }) {
  const t = theme;
  const date = new Date(lead.created_at).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit' });
  const cityColor = CITY_COLORS[lead.city] || '#9090a8';
  const hasUnread = lead.unread_count > 0;
  const borderColor = isOverdue ? '#ef4444' : hasUnread ? '#E8263A' : t.border;

  return (
    <div draggable="true" onDragStart={onDragStart} onDragEnd={onDragEnd}
      onClick={onClick} onContextMenu={onContextMenu}
      style={{
        background: t.cardBg,
        border: `1px solid ${borderColor}`,
        borderRadius: radius.lg,
        overflow: 'hidden', cursor: 'grab', userSelect: 'none',
        transition: 'transform 0.18s, opacity 0.15s, border-color 0.2s, box-shadow 0.2s',
        opacity: isDragging ? 0.4 : 1,
        backdropFilter: 'blur(8px)',
        boxShadow: isOverdue
          ? '0 0 0 1px rgba(239,68,68,0.3), 0 4px 16px rgba(239,68,68,0.14)'
          : hasUnread
          ? '0 0 0 1px rgba(232,38,58,0.3), 0 4px 16px rgba(232,38,58,0.14)'
          : '0 2px 8px rgba(0,0,0,0.10)',
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
        <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',background:'rgba(232,38,58,0.1)',borderBottom:'1px solid rgba(232,38,58,0.2)' }}>
          <span style={{ color:'#E8263A',fontSize:10 }}>●</span>
          <span style={{ color:'#E8263A',fontSize:11,fontWeight:600,flex:1 }}>{lead.unread_count} {lead.unread_count===1?'новое':lead.unread_count>=2&&lead.unread_count<=4?'новых':'новых'}</span>
          <span style={{ background:'#E8263A',color:'#fff',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:20 }}>{lead.unread_count}</span>
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

      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 13px',background:colColor+'1a',borderBottom:`1px solid ${colColor}33` }}>
        <span style={{ fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:radius.xl,color:cityColor,background:cityColor+'18',fontFamily:'Unbounded,sans-serif',letterSpacing:0.5 }}>{lead.city}</span>
        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
          {showTimer && (
            <span style={{ fontSize:10,color:isOverdue?'#ef4444':'#9090a8',fontWeight:isOverdue?700:400 }}>
              ⏱ {getTimerLabel(lead)}
            </span>
          )}
          <span style={{ color:t.text2,fontSize:10 }}>{date}</span>
        </div>
      </div>

      <div style={{ padding:'13px',display:'flex',flexDirection:'column',gap:5 }}>
        <div style={{ color:t.text,fontWeight:600,fontSize:13,lineHeight:1.3 }}>{lead.client_name}</div>
        <div style={{ color:t.text2,fontSize:11 }}>{lead.phone}</div>
        <div style={{ color:t.text3,fontSize:12,marginTop:3 }}>📱 {stripMarkdown(lead.device)}</div>
        {lead.estimate_amount && (
          <div style={{ color:'#f0b429',fontSize:13,fontWeight:700,marginTop:3 }}>
            💰 {new Intl.NumberFormat('ru-KZ').format(lead.estimate_amount)} ₸
          </div>
        )}
        {lead.visit_date && (
          <div style={{ color:'#06b6d4',fontSize:11,marginTop:3 }}>
            📅 Придёт: {new Date(lead.visit_date).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>
    </div>
  );
}
