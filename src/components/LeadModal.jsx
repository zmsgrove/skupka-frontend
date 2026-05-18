import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../supabase';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_OPTIONS = [
  { id: 'new', label: '🆕 Новый', color: '#3b82f6' },
  { id: 'in_progress', label: '⚡ В работе', color: '#8b5cf6' },
  { id: 'success', label: '✅ Успешно', color: '#10b981' },
  { id: 'fail', label: '❌ Провал', color: '#ef4444' },
];

export default function LeadModal({ lead, user, onClose, onUpdate }) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [msgText, setMsgText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [estimateAmount, setEstimateAmount] = useState(lead.estimate_amount || '');
  const [sendEstimate, setSendEstimate] = useState(false);
  const [contractNumber, setContractNumber] = useState(lead.contract_number || '');
  const [successComment, setSuccessComment] = useState(lead.success_comment || '');
  const [failComment, setFailComment] = useState(lead.fail_comment || '');
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchDetail();

    const channel = supabase
      .channel(`lead-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` },
        () => fetchDetail()
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `lead_id=eq.${lead.id}` },
        () => fetchDetail()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [lead.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  async function fetchDetail() {
    const { data: lead_data } = await supabase
      .from('leads').select('*').eq('id', lead.id).single();
    const { data: messages } = await supabase
      .from('messages').select('*').eq('lead_id', lead.id).order('created_at');
    const { data: comments } = await supabase
      .from('comments').select('*').eq('lead_id', lead.id).order('created_at');
    setData({ ...lead_data, messages: messages || [], comments: comments || [] });
  }

  async function handleSendMessage() {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/api/leads/${lead.id}/send`, {
        text: msgText.trim(),
        author: user.name,
      });
      setMsgText('');
    } catch (e) {
      alert('Ошибка отправки сообщения');
    }
    setSending(false);
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    await axios.post(`${API}/api/leads/${lead.id}/comments`, {
      author: user.name,
      text: commentText.trim(),
    });
    setCommentText('');
  }

  async function handleSaveChanges() {
    setSaving(true);
    const updates = {
      status,
      estimate_amount: estimateAmount || null,
      send_estimate: sendEstimate,
    };
    if (status === 'success') {
      updates.contract_number = contractNumber;
      updates.success_comment = successComment;
    }
    if (status === 'fail') {
      updates.fail_comment = failComment;
    }
    try {
      const { data: updated } = await axios.patch(`${API}/api/leads/${lead.id}`, updates);
      onUpdate(updated);
      setSendEstimate(false);
      alert('Изменения сохранены' + (sendEstimate ? ' и оценка отправлена клиенту!' : '!'));
    } catch (e) {
      alert('Ошибка сохранения');
    }
    setSaving(false);
  }

  const cur = data || lead;
  const currentStatus = STATUS_OPTIONS.find(s => s.id === status);

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.clientName}>{cur.client_name}</div>
            <div style={styles.clientPhone}>{cur.phone}</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Left: info + settings */}
          <div style={styles.left}>
            {/* Info */}
            <div style={styles.infoBlock}>
              <Row label="Город" value={cur.city} />
              <Row label="Техника" value={cur.device} />
              <Row label="Дата заявки" value={new Date(cur.created_at).toLocaleString('ru-RU')} />
              <Row label="Оценка" value={cur.estimate_amount ? `${new Intl.NumberFormat('ru-KZ').format(cur.estimate_amount)} ₸` : '—'} highlight={!!cur.estimate_amount} />
              {cur.contract_number && <Row label="№ договора" value={cur.contract_number} />}
            </div>

            {/* Status */}
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Статус</div>
              <div style={styles.statusList}>
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    style={{
                      ...styles.statusBtn,
                      borderColor: status === s.id ? s.color : '#2e2e3e',
                      background: status === s.id ? s.color + '22' : 'transparent',
                      color: status === s.id ? s.color : '#9090a8',
                    }}
                    onClick={() => setStatus(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimate */}
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Сумма оценки (₸)</div>
              <input
                style={styles.input}
                type="number"
                placeholder="Например: 150000"
                value={estimateAmount}
                onChange={e => setEstimateAmount(e.target.value)}
              />
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={sendEstimate} onChange={e => setSendEstimate(e.target.checked)} />
                <span>Отправить оценку клиенту в WhatsApp</span>
              </label>
            </div>

            {/* Success fields */}
            {status === 'success' && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>№ договора купли-продажи</div>
                <input
                  style={styles.input}
                  placeholder="Номер договора"
                  value={contractNumber}
                  onChange={e => setContractNumber(e.target.value)}
                />
                <div style={{ ...styles.sectionLabel, marginTop: 10 }}>Комментарий</div>
                <textarea
                  style={styles.textarea}
                  placeholder="Комментарий по сделке..."
                  value={successComment}
                  onChange={e => setSuccessComment(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {/* Fail fields */}
            {status === 'fail' && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Причина провала</div>
                <textarea
                  style={styles.textarea}
                  placeholder="Почему не получилось?"
                  value={failComment}
                  onChange={e => setFailComment(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <button
              style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
              onClick={handleSaveChanges}
              disabled={saving}
            >
              {saving ? 'Сохраняем...' : '💾 Сохранить изменения'}
            </button>
          </div>

          {/* Right: chat + comments */}
          <div style={styles.right}>
            <div style={styles.tabs}>
              <button
                style={{ ...styles.tab, ...(activeTab === 'chat' ? styles.tabActive : {}) }}
                onClick={() => setActiveTab('chat')}
              >
                💬 Переписка
              </button>
              <button
                style={{ ...styles.tab, ...(activeTab === 'comments' ? styles.tabActive : {}) }}
                onClick={() => setActiveTab('comments')}
              >
                📝 Комментарии
              </button>
            </div>

            {/* Chat */}
            {activeTab === 'chat' && (
              <>
                <div style={styles.messageList}>
                  {(data?.messages || []).map(msg => (
                    <div key={msg.id} style={{
                      ...styles.message,
                      alignSelf: msg.direction === 'out' ? 'flex-end' : 'flex-start',
                      background: msg.direction === 'out' ? '#f0b42922' : '#22222e',
                      borderColor: msg.direction === 'out' ? '#f0b42944' : '#2e2e3e',
                    }}>
                      {msg.sender_name && (
                        <div style={styles.msgAuthor}>{msg.sender_name}</div>
                      )}
                      <div style={styles.msgText}>{msg.text}</div>
                      <div style={styles.msgTime}>
                        {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                  {(!data?.messages || data.messages.length === 0) && (
                    <div style={styles.emptyChat}>Переписка пока пуста</div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div style={styles.inputRow}>
                  <textarea
                    style={styles.msgInput}
                    placeholder="Написать клиенту..."
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    rows={2}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button
                    style={{ ...styles.sendBtn, opacity: sending ? 0.7 : 1 }}
                    onClick={handleSendMessage}
                    disabled={sending}
                  >
                    {sending ? '...' : '➤'}
                  </button>
                </div>
              </>
            )}

            {/* Comments */}
            {activeTab === 'comments' && (
              <>
                <div style={styles.messageList}>
                  {(data?.comments || []).map(c => (
                    <div key={c.id} style={styles.comment}>
                      <div style={styles.commentHeader}>
                        <span style={styles.commentAuthor}>{c.author}</span>
                        <span style={styles.commentTime}>
                          {new Date(c.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={styles.commentText}>{c.text}</div>
                    </div>
                  ))}
                  {(!data?.comments || data.comments.length === 0) && (
                    <div style={styles.emptyChat}>Комментариев пока нет</div>
                  )}
                </div>
                <div style={styles.inputRow}>
                  <textarea
                    style={styles.msgInput}
                    placeholder="Написать комментарий..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    rows={2}
                  />
                  <button style={styles.sendBtn} onClick={handleAddComment}>➤</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #2e2e3e' }}>
      <span style={{ color: '#9090a8', fontSize: 12 }}>{label}</span>
      <span style={{ color: highlight ? '#f0b429' : '#f0f0f5', fontSize: 13, fontWeight: highlight ? 600 : 400 }}>{value}</span>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
    padding: 16,
  },
  modal: {
    background: '#1a1a22',
    border: '1px solid #2e2e3e',
    borderRadius: 20,
    width: '100%',
    maxWidth: 900,
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #2e2e3e',
    flexShrink: 0,
  },
  clientName: { fontFamily: 'Unbounded, sans-serif', fontSize: 18, fontWeight: 700, color: '#f0f0f5' },
  clientPhone: { color: '#9090a8', fontSize: 13, marginTop: 4 },
  closeBtn: {
    background: '#22222e', border: '1px solid #2e2e3e',
    borderRadius: 8, color: '#9090a8', fontSize: 16,
    padding: '6px 12px', cursor: 'pointer',
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    overflow: 'hidden',
    flex: 1,
  },
  left: {
    borderRight: '1px solid #2e2e3e',
    padding: 20,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  right: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  infoBlock: { display: 'flex', flexDirection: 'column' },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  sectionLabel: { color: '#9090a8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' },
  statusList: { display: 'flex', flexDirection: 'column', gap: 6 },
  statusBtn: {
    border: '1px solid', borderRadius: 8,
    padding: '8px 12px', fontSize: 13,
    fontFamily: 'Inter, sans-serif', textAlign: 'left',
    transition: 'all 0.15s',
  },
  input: {
    background: '#22222e', border: '1px solid #2e2e3e',
    borderRadius: 8, color: '#f0f0f5', fontSize: 14,
    padding: '10px 12px', outline: 'none',
  },
  textarea: {
    background: '#22222e', border: '1px solid #2e2e3e',
    borderRadius: 8, color: '#f0f0f5', fontSize: 14,
    padding: '10px 12px', outline: 'none', resize: 'vertical',
    fontFamily: 'Inter, sans-serif',
  },
  checkLabel: {
    display: 'flex', alignItems: 'center', gap: 8,
    color: '#c0c0d8', fontSize: 13, cursor: 'pointer',
  },
  saveBtn: {
    background: '#f0b429', border: 'none', borderRadius: 10,
    color: '#0f0f13', fontFamily: 'Unbounded, sans-serif',
    fontSize: 12, fontWeight: 700, padding: '12px',
    cursor: 'pointer', letterSpacing: 0.5, marginTop: 'auto',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #2e2e3e',
    flexShrink: 0,
  },
  tab: {
    flex: 1, padding: '14px', background: 'transparent',
    border: 'none', color: '#9090a8', fontSize: 13,
    cursor: 'pointer', borderBottom: '2px solid transparent',
    transition: 'all 0.15s',
  },
  tabActive: { color: '#f0b429', borderBottomColor: '#f0b429' },
  messageList: {
    flex: 1, overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  message: {
    maxWidth: '75%',
    border: '1px solid',
    borderRadius: 12,
    padding: '8px 12px',
  },
  msgAuthor: { color: '#f0b429', fontSize: 11, fontWeight: 600, marginBottom: 4 },
  msgText: { color: '#f0f0f5', fontSize: 13, lineHeight: 1.5 },
  msgTime: { color: '#9090a8', fontSize: 10, marginTop: 4, textAlign: 'right' },
  emptyChat: { color: '#9090a8', fontSize: 13, textAlign: 'center', padding: '40px 0' },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid #2e2e3e',
    flexShrink: 0,
  },
  msgInput: {
    flex: 1, background: '#22222e',
    border: '1px solid #2e2e3e', borderRadius: 10,
    color: '#f0f0f5', fontSize: 13,
    padding: '10px 12px', outline: 'none', resize: 'none',
    fontFamily: 'Inter, sans-serif',
  },
  sendBtn: {
    background: '#f0b429', border: 'none',
    borderRadius: 10, color: '#0f0f13',
    fontSize: 18, padding: '0 16px',
    cursor: 'pointer', fontWeight: 700,
  },
  comment: {
    background: '#22222e', border: '1px solid #2e2e3e',
    borderRadius: 12, padding: '10px 14px',
  },
  commentHeader: {
    display: 'flex', justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: { color: '#f0b429', fontSize: 12, fontWeight: 600 },
  commentTime: { color: '#9090a8', fontSize: 11 },
  commentText: { color: '#f0f0f5', fontSize: 13, lineHeight: 1.5 },
};
