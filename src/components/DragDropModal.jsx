import React, { useState } from 'react';

const FAIL_REASONS = [
  'Цена не устроила',
  'Требует больше рыночной цены',
  'Передумал продавать',
  'Не отвечает',
  'Ушёл к конкурентам',
  'Техника не подходит',
  'Сломан / не включается',
  'Нет документов',
  'Другое',
];

export default function DragDropModal({ fromStatus, toStatus, lead, onConfirm, onCancel, theme }) {
  const t = theme;
  const [estimate, setEstimate] = useState(lead.estimate_amount || '');
  const [visitDate, setVisitDate] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [successComment, setSuccessComment] = useState('');
  const [failReason, setFailReason] = useState('');
  const [failComment, setFailComment] = useState('');
  const [sendEstimate, setSendEstimate] = useState(false);

  const handleConfirm = () => {
    const data = { status: toStatus };
    if (estimate) { data.estimate_amount = estimate; data.send_estimate = sendEstimate; }
    if (toStatus === 'waiting' && visitDate) data.visit_date = visitDate;
    if (toStatus === 'success') { data.contract_number = contractNumber; data.success_comment = successComment; }
    if (toStatus === 'fail') data.fail_comment = failReason === 'Другое' ? failComment : failReason;
    onConfirm(data);
  };

  const titles = {
    'in_progress': { emoji: '⚡', title: 'Переводим в работу', sub: 'Укажите предварительную оценку' },
    'waiting': { emoji: '🏪', title: 'Ждём на филиал', sub: 'Когда клиент придёт?' },
    'success': { emoji: '✅', title: 'Успешная сделка!', sub: 'Заполните данные договора' },
    'fail': { emoji: '❌', title: 'Отмечаем провал', sub: 'Укажите причину' },
  };

  const info = titles[toStatus] || { emoji: '📋', title: 'Смена статуса', sub: '' };

  return (
    <div style={{ position:'fixed',inset:0,background:t.overlayBg,display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,backdropFilter:'blur(6px)' }}>
      <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:20,padding:28,width:'100%',maxWidth:420,boxShadow:t.shadow }}>
        <div style={{ fontSize:32,textAlign:'center',marginBottom:8 }}>{info.emoji}</div>
        <div style={{ fontFamily:'Unbounded,sans-serif',fontSize:16,fontWeight:700,color:t.text,textAlign:'center',marginBottom:4 }}>{info.title}</div>
        <div style={{ color:t.text2,fontSize:13,textAlign:'center',marginBottom:24 }}>{info.sub}</div>
        <div style={{ color:t.text2,fontSize:12,marginBottom:16 }}>
          Клиент: <span style={{ color:t.text,fontWeight:600 }}>{lead.client_name}</span> — {lead.device}
        </div>

        {/* В работе — оценка */}
        {toStatus === 'in_progress' && (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            <input style={inputStyle(t)} type="number" placeholder="Сумма оценки (₸) — необязательно"
              value={estimate} onChange={e => setEstimate(e.target.value)} />
            {estimate && (
              <label style={{ display:'flex',alignItems:'center',gap:8,color:t.text3,fontSize:13,cursor:'pointer' }}>
                <input type="checkbox" checked={sendEstimate} onChange={e => setSendEstimate(e.target.checked)} />
                Отправить оценку клиенту в WhatsApp
              </label>
            )}
          </div>
        )}

        {/* Ждём на филиал — дата */}
        {toStatus === 'waiting' && (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            <div style={{ color:t.text2,fontSize:12 }}>Дата визита клиента</div>
            <input style={inputStyle(t)} type="date"
              value={visitDate} onChange={e => setVisitDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]} />
          </div>
        )}

        {/* Успешно — договор */}
        {toStatus === 'success' && (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            <input style={inputStyle(t)} placeholder="№ договора купли-продажи"
              value={contractNumber} onChange={e => setContractNumber(e.target.value)} />
            <textarea style={{ ...inputStyle(t),resize:'vertical',fontFamily:'Inter,sans-serif' }}
              placeholder="Комментарий по сделке (необязательно)"
              value={successComment} onChange={e => setSuccessComment(e.target.value)} rows={2} />
            {!lead.estimate_amount && (
              <input style={inputStyle(t)} type="number" placeholder="Итоговая сумма (₸)"
                value={estimate} onChange={e => setEstimate(e.target.value)} />
            )}
          </div>
        )}

        {/* Провал — причины */}
        {toStatus === 'fail' && (
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {FAIL_REASONS.map(r => (
              <button key={r} onClick={() => setFailReason(r)} style={{
                border:`1px solid ${failReason===r ? '#ef4444' : t.border}`,
                background: failReason===r ? 'rgba(239,68,68,0.12)' : 'transparent',
                color: failReason===r ? '#ef4444' : t.text2,
                borderRadius:8, padding:'8px 12px', fontSize:13,
                textAlign:'left', cursor:'pointer', transition:'all 0.15s',
                fontFamily:'Inter,sans-serif',
              }}>{r}</button>
            ))}
            {failReason === 'Другое' && (
              <textarea style={{ ...inputStyle(t),resize:'vertical',fontFamily:'Inter,sans-serif',marginTop:4 }}
                placeholder="Опишите причину..." value={failComment}
                onChange={e => setFailComment(e.target.value)} rows={2} />
            )}
          </div>
        )}

        <div style={{ display:'flex',gap:10,marginTop:24 }}>
          <button onClick={onCancel} style={{ flex:1,background:'transparent',border:`1px solid ${t.border}`,borderRadius:10,color:t.text2,fontSize:13,padding:'11px',cursor:'pointer' }}>
            Отмена
          </button>
          <button onClick={handleConfirm} style={{ flex:2,background:'#E8263A',border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:700,padding:'11px',cursor:'pointer',fontFamily:'Unbounded,sans-serif' }}>
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}

function inputStyle(t) {
  return { background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:14,padding:'10px 12px',outline:'none',width:'100%' };
}
