import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../supabase';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_OPTIONS = [
  { id: 'new', label: '🆕 Новый', color: '#3b82f6' },
  { id: 'in_progress', label: '⚡ В работе', color: '#8b5cf6' },
  { id: 'waiting', label: '🏪 Ждём на филиал', color: '#f59e0b' },
  { id: 'success', label: '✅ Успешно', color: '#10b981' },
  { id: 'fail', label: '❌ Провал', color: '#ef4444' },
];

const FAIL_REASONS = [
  'Цена не устроила',
  'Передумал продавать',
  'Не отвечает',
  'Ушёл к конкурентам',
  'Техника не подходит',
  'Другое',
];

const MSG_TEMPLATES = [
  '👋 Здравствуйте! Уточните пожалуйста модель устройства',
  '📋 В каком состоянии устройство? Есть ли повреждения?',
  '📅 Когда вам удобно подъехать в наш пункт приёма?',
  '✅ Ждём вас! Наш специалист будет готов принять технику',
  '🙏 Спасибо за обращение в SKUPKA!',
];

// Простой Markdown рендерер
function renderMarkdown(text) {
  if (!text) return text;
  const parts = text.split(/(\*[^*]+\*|_[^_]+_)/g);
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i} style={{ fontWeight:700 }}>{part.slice(1,-1)}</strong>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={i} style={{ fontStyle:'italic', opacity:0.85 }}>{part.slice(1,-1)}</em>;
    }
    return part;
  });
}

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
  const [failReason, setFailReason] = useState('');
  const [visitDate, setVisitDate] = useState(lead.visit_date ? lead.visit_date.split('T')[0] : '');
  const [status, setStatus] = useState(lead.status);
  const [saving, setSaving] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(lead.client_name || '');
  const [botHandedOver, setBotHandedOver] = useState(false);
  const [botToggling, setBotToggling] = useState(false);
  const chatEndRef = useRef(null);

  const [prevLeads, setPrevLeads] = useState([]);
  const [recording, setRecording] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const fileInputRef     = useRef(null);

  useEffect(() => {
    supabase.from('bot_sessions').select('handed_over').eq('phone', lead.phone).maybeSingle()
      .then(({ data }) => { if (data) setBotHandedOver(!!data.handed_over); });
  }, [lead.phone]);

  useEffect(() => {
    fetchDetail();
    fetchPrevLeads();
    const channel = supabase
      .channel(`lead-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` }, () => fetchDetail())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `lead_id=eq.${lead.id}` }, () => fetchDetail())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [lead.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  async function fetchDetail() {
    const { data: lead_data } = await supabase.from('leads').select('*').eq('id', lead.id).single();
    const { data: messages } = await supabase.from('messages').select('*').eq('lead_id', lead.id).order('created_at');
    const { data: comments } = await supabase.from('comments').select('*').eq('lead_id', lead.id).order('created_at');
    setData({ ...lead_data, messages: messages || [], comments: comments || [] });
  }

  async function fetchPrevLeads() {
    const { data } = await supabase.from('leads').select('*')
      .eq('phone', lead.phone).neq('id', lead.id).order('created_at', { ascending: false });
    setPrevLeads(data || []);
  }

  async function handleSendMessage() {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/api/leads/${lead.id}/send`, { text: msgText.trim(), author: user.name });
      setMsgText('');
    } catch (e) { alert('Ошибка отправки'); }
    setSending(false);
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    await axios.post(`${API}/api/leads/${lead.id}/comments`, { author: user.name, text: commentText.trim() });
    setCommentText('');
  }

  async function handleSaveChanges() {
    setSaving(true);
    const updates = {
      status,
      estimate_amount: estimateAmount || null,
      send_estimate: sendEstimate,
    };
    if (status === 'waiting' && visitDate) updates.visit_date = visitDate;
    if (status === 'success') {
      updates.contract_number = contractNumber;
      updates.success_comment = successComment;
    }
    if (status === 'fail') {
      updates.fail_comment = failReason === 'Другое' ? failComment : failReason;
    }
    try {
      const { data: updated } = await axios.patch(`${API}/api/leads/${lead.id}`, updates);
      onUpdate(updated);
      setSendEstimate(false);
      alert('Сохранено!' + (sendEstimate ? ' Оценка отправлена клиенту.' : ''));
    } catch (e) { alert('Ошибка сохранения'); }
    setSaving(false);
  }

  async function handleSendPhoto(file) {
    if (!file) return;
    setSendingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('author', user.name);
      await axios.post(`${API}/api/leads/${lead.id}/send-media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch(e) { alert('Ошибка отправки фото'); }
    setSendingMedia(false);
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        setSendingMedia(true);
        try {
          const formData = new FormData();
          formData.append('file', blob, 'voice.ogg');
          formData.append('author', user.name);
          formData.append('type', 'voice');
          await axios.post(`${API}/api/leads/${lead.id}/send-media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch(e) { alert('Ошибка отправки голосового'); }
        setSendingMedia(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch(e) { alert('Нет доступа к микрофону'); }
  }, [lead.id, user.name]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  async function handleToggleBot() {
    setBotToggling(true);
    const next = !botHandedOver;
    await supabase.from('bot_sessions').update({ handed_over: next }).eq('phone', lead.phone);
    setBotHandedOver(next);
    setBotToggling(false);
  }

  const handleDownloadPhoto = (url) => {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.download = 'photo.jpg'; a.click();
  };

  const renderMessage = (msg) => {
    const isPhoto = msg.text?.startsWith('📷 [Фото]');
    const isVoice = msg.text?.startsWith('🎤 [Голосовое]');
    const photoUrl = isPhoto ? msg.text.replace('📷 [Фото] ', '') : null;
    const voiceUrl = isVoice ? msg.text.replace('🎤 [Голосовое] ', '') : null;
    return (
      <div key={msg.id} style={{
        ...styles.message,
        alignSelf: msg.direction === 'out' ? 'flex-end' : 'flex-start',
        background: msg.direction === 'out' ? '#E8263A22' : '#22222e',
        borderColor: msg.direction === 'out' ? '#E8263A44' : '#2e2e3e',
      }}>
        {msg.sender_name && <div style={styles.msgAuthor}>{msg.sender_name}</div>}
        {isPhoto ? (
          <div>
            <div style={{ color: '#9090a8', fontSize: 12, marginBottom: 8 }}>📷 Фото от клиента</div>
            <img src={photoUrl} alt="фото" style={{ maxWidth: '100%', borderRadius: 8, display: 'block', marginBottom: 8 }} onError={e => e.target.style.display = 'none'} />
            <button style={styles.downloadBtn} onClick={() => handleDownloadPhoto(photoUrl)}>⬇️ Скачать фото</button>
          </div>
        ) : isVoice && voiceUrl ? (
          <div>
            <div style={{ color: '#9090a8', fontSize: 12, marginBottom: 6 }}>🎤 Голосовое сообщение</div>
            <audio controls src={voiceUrl} style={{ width: '100%', height: 32 }} />
          </div>
        ) : <div style={styles.msgText}>{renderMarkdown(msg.text)}</div>}
        <div style={styles.msgTime}>
          {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  };

  const cur = data || lead;

  return (
    <div className="skupka-modal-overlay" style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="skupka-modal" style={styles.modal}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              {/* Имя клиента с редактированием */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {editingName ? (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input
                      style={{ background:'#22222e', border:'1px solid #E8263A', borderRadius:8, color:'#f0f0f5', fontSize:16, fontWeight:700, padding:'4px 10px', outline:'none', fontFamily:'Unbounded,sans-serif' }}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                      onKeyDown={async e => {
                        if (e.key === 'Enter') {
                          await axios.patch(`${API}/api/leads/${lead.id}`, { client_name: editName });
                          onUpdate({ ...cur, client_name: editName });
                          setEditingName(false);
                        }
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                    />
                    <button onClick={async () => {
                      await axios.patch(`${API}/api/leads/${lead.id}`, { client_name: editName });
                      onUpdate({ ...cur, client_name: editName });
                      setEditingName(false);
                    }} style={{ background:'#10b981', border:'none', borderRadius:6, color:'#fff', fontSize:12, padding:'4px 10px', cursor:'pointer' }}>✓</button>
                    <button onClick={() => setEditingName(false)} style={{ background:'transparent', border:'1px solid #2e2e3e', borderRadius:6, color:'#9090a8', fontSize:12, padding:'4px 8px', cursor:'pointer' }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={styles.clientName}>{cur.client_name}</div>
                    <button onClick={() => { setEditName(cur.client_name); setEditingName(true); }} title="Изменить имя" style={{ background:'transparent', border:'none', color:'#9090a8', fontSize:14, cursor:'pointer', padding:'2px 4px' }}>✏️</button>
                  </>
                )}
              </div>
              <div style={styles.clientPhone}>
                {cur.phone}
                {cur.wa_name && cur.wa_name !== cur.client_name && (
                  <span style={{ color:'#06b6d4', fontSize:11, background:'rgba(6,182,212,0.1)', padding:'1px 8px', borderRadius:20 }}>
                    WA: {cur.wa_name}
                  </span>
                )}
                {prevLeads.length > 0 && (
                  <span style={styles.repeatBadge}>🔄 Повторный — {prevLeads.length} заявок</span>
                )}
              </div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Левая колонка */}
          <div style={styles.left}>
            <div style={styles.infoBlock}>
              <Row label="Город" value={cur.city} />
              <Row label="Техника" value={cur.device} />
              <Row label="Дата" value={new Date(cur.created_at).toLocaleString('ru-RU')} />
              <Row label="Оценка" value={cur.estimate_amount ? `${new Intl.NumberFormat('ru-KZ').format(cur.estimate_amount)} ₸` : '—'} highlight={!!cur.estimate_amount} />
              {cur.contract_number && <Row label="№ договора" value={cur.contract_number} />}
              {cur.visit_date && <Row label="Визит" value={new Date(cur.visit_date).toLocaleDateString('ru-RU')} />}
            </div>

            {/* История прошлых заявок */}
            {prevLeads.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>История клиента</div>
                {prevLeads.slice(0, 3).map(pl => (
                  <div key={pl.id} style={styles.historyItem}>
                    <span style={styles.historyDevice}>{pl.device}</span>
                    <span style={{
                      ...styles.historyStatus,
                      color: pl.status === 'success' ? '#10b981' : pl.status === 'fail' ? '#ef4444' : '#9090a8'
                    }}>
                      {pl.status === 'success' ? '✅' : pl.status === 'fail' ? '❌' : '⏳'}
                      {pl.estimate_amount ? ` ${new Intl.NumberFormat('ru-KZ').format(pl.estimate_amount)} ₸` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Статус */}
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Статус</div>
              <div style={styles.statusList}>
                {STATUS_OPTIONS.map(s => (
                  <button key={s.id} style={{
                    ...styles.statusBtn,
                    borderColor: status === s.id ? s.color : '#2e2e3e',
                    background: status === s.id ? s.color + '22' : 'transparent',
                    color: status === s.id ? s.color : '#9090a8',
                  }} onClick={() => setStatus(s.id)}>{s.label}</button>
                ))}
              </div>
            </div>

            {/* Дата визита для "Ждём на филиал" */}
            {status === 'waiting' && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Дата визита клиента</div>
                <input type="date" style={styles.input}
                  value={visitDate} onChange={e => setVisitDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
            )}

            {/* Оценка */}
            <div style={styles.section}>
              <div style={styles.sectionLabel}>Сумма оценки (₸)</div>
              <input style={styles.input} type="number" placeholder="Например: 150000"
                value={estimateAmount} onChange={e => setEstimateAmount(e.target.value)} />
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={sendEstimate} onChange={e => setSendEstimate(e.target.checked)} />
                <span>Отправить оценку клиенту в WhatsApp</span>
              </label>
            </div>

            {/* Успешно */}
            {status === 'success' && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>№ договора</div>
                <input style={styles.input} placeholder="Номер договора"
                  value={contractNumber} onChange={e => setContractNumber(e.target.value)} />
                <div style={{ ...styles.sectionLabel, marginTop: 8 }}>Комментарий</div>
                <textarea style={styles.textarea} placeholder="Комментарий..."
                  value={successComment} onChange={e => setSuccessComment(e.target.value)} rows={2} />
              </div>
            )}

            {/* Провал */}
            {status === 'fail' && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>Причина провала</div>
                <div style={styles.reasonList}>
                  {FAIL_REASONS.map(r => (
                    <button key={r} style={{
                      ...styles.reasonBtn,
                      borderColor: failReason === r ? '#ef4444' : '#2e2e3e',
                      background: failReason === r ? '#ef444422' : 'transparent',
                      color: failReason === r ? '#ef4444' : '#9090a8',
                    }} onClick={() => setFailReason(r)}>{r}</button>
                  ))}
                </div>
                {failReason === 'Другое' && (
                  <textarea style={{ ...styles.textarea, marginTop: 8 }} placeholder="Опишите причину..."
                    value={failComment} onChange={e => setFailComment(e.target.value)} rows={2} />
                )}
              </div>
            )}

            {/* Bot control */}
            <button onClick={handleToggleBot} disabled={botToggling}
              style={{ ...styles.saveBtn, marginBottom:4,
                background: botHandedOver ? 'rgba(144,144,168,0.12)' : 'rgba(16,185,129,0.13)',
                color: botHandedOver ? '#9090a8' : '#10b981',
                border: `1px solid ${botHandedOver ? 'rgba(144,144,168,0.3)' : 'rgba(16,185,129,0.35)'}`,
              }}>
              {botHandedOver ? '⏸️ Бот остановлен — включить' : '🤖 Бот активен — остановить'}
            </button>

            {cur.device && (
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('skupka-assistant', { detail: { query: `Оцени технику: ${cur.device}` } }));
                  onClose();
                }}
                style={{ ...styles.saveBtn, background:'rgba(232,38,58,0.13)', color:'#E8263A', border:'1px solid rgba(232,38,58,0.35)', marginBottom:4 }}
              >
                🤖 Оценить технику
              </button>
            )}
            <button style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
              onClick={handleSaveChanges} disabled={saving}>
              {saving ? 'Сохраняем...' : '💾 Сохранить изменения'}
            </button>
          </div>

          {/* Правая колонка */}
          <div style={styles.right}>
            <div style={styles.tabs}>
              <button style={{ ...styles.tab, ...(activeTab === 'chat' ? styles.tabActive : {}) }}
                onClick={() => setActiveTab('chat')}>💬 Переписка</button>
              <button style={{ ...styles.tab, ...(activeTab === 'comments' ? styles.tabActive : {}) }}
                onClick={() => setActiveTab('comments')}>📝 Комментарии</button>
            </div>

            {activeTab === 'chat' && (
              <>
                <div style={styles.messageList}>
                  {(data?.messages || []).map(renderMessage)}
                  {(!data?.messages || data.messages.length === 0) && (
                    <div style={styles.emptyChat}>Переписка пока пуста</div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Шаблоны */}
                {showTemplates && (
                  <div style={styles.templates}>
                    {MSG_TEMPLATES.map((t, i) => (
                      <button key={i} style={styles.templateBtn}
                        onClick={() => { setMsgText(t); setShowTemplates(false); }}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                <div style={styles.inputRow}>
                  <button style={styles.templateToggle}
                    onClick={() => setShowTemplates(!showTemplates)}
                    title="Шаблоны сообщений">
                    ⚡
                  </button>
                  <input type="file" accept="image/*" ref={fileInputRef} style={{ display:'none' }} onChange={e => { if (e.target.files[0]) handleSendPhoto(e.target.files[0]); e.target.value=''; }} />
                  <button style={{ ...styles.templateToggle, opacity: sendingMedia ? 0.5 : 1 }} onClick={() => fileInputRef.current?.click()} title="Отправить фото" disabled={sendingMedia}>
                    📎
                  </button>
                  <button
                    style={{ ...styles.templateToggle, background: recording ? '#E8263A22' : '#22222e', borderColor: recording ? '#E8263A' : '#2e2e3e', color: recording ? '#E8263A' : '#9090a8', animation: recording ? 'pulse 1s infinite' : 'none' }}
                    onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
                    title={recording ? 'Отпустите — отправить' : 'Удержите — записать голосовое'} disabled={sendingMedia}>
                    🎤
                  </button>
                  <textarea style={styles.msgInput} placeholder="Написать клиенту..."
                    value={msgText} onChange={e => setMsgText(e.target.value)} rows={2}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                  <button style={{ ...styles.sendBtn, opacity: (sending || sendingMedia) ? 0.7 : 1 }}
                    onClick={handleSendMessage} disabled={sending || sendingMedia}>{sending ? '...' : '➤'}</button>
                </div>
              </>
            )}

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
                  <textarea style={styles.msgInput} placeholder="Написать комментарий..."
                    value={commentText} onChange={e => setCommentText(e.target.value)} rows={2} />
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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2e2e3e' }}>
      <span style={{ color: '#9090a8', fontSize: 12 }}>{label}</span>
      <span style={{ color: highlight ? '#E8263A' : '#f0f0f5', fontSize: 13, fontWeight: highlight ? 600 : 400 }}>{value}</span>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', padding: 16 },
  modal: { background: '#1a1a22ee', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 21, width: '100%', maxWidth: 960, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(16px)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 },
  clientName: { fontFamily: 'Unbounded, sans-serif', fontSize: 17, fontWeight: 700, color: '#f0f0f5' },
  clientPhone: { color: '#9090a8', fontSize: 13, marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 },
  repeatBadge: { background: '#06b6d418', border: '1px solid #06b6d433', color: '#06b6d4', fontSize: 11, padding: '2px 8px', borderRadius: 20 },
  closeBtn: { background: '#22222e', border: '1px solid #2e2e3e', borderRadius: 8, color: '#9090a8', fontSize: 16, padding: '6px 12px', cursor: 'pointer' },
  body: { display: 'grid', gridTemplateColumns: '310px 1fr', overflow: 'hidden', flex: 1 },
  left: { borderRight: '1px solid #2e2e3e', padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 },
  right: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  infoBlock: { display: 'flex', flexDirection: 'column' },
  section: { display: 'flex', flexDirection: 'column', gap: 7 },
  sectionLabel: { color: '#9090a8', fontSize: 10, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' },
  statusList: { display: 'flex', flexDirection: 'column', gap: 5 },
  statusBtn: { border: '1px solid', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'Inter, sans-serif', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' },
  reasonList: { display: 'flex', flexDirection: 'column', gap: 5 },
  reasonBtn: { border: '1px solid', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: 'Inter, sans-serif', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' },
  input: { background: '#22222e', border: '1px solid #2e2e3e', borderRadius: 8, color: '#f0f0f5', fontSize: 14, padding: '9px 12px', outline: 'none' },
  textarea: { background: '#22222e', border: '1px solid #2e2e3e', borderRadius: 8, color: '#f0f0f5', fontSize: 14, padding: '9px 12px', outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, color: '#c0c0d8', fontSize: 13, cursor: 'pointer' },
  saveBtn: { background: '#E8263A', border: 'none', borderRadius: 10, color: '#fff', fontFamily: 'Unbounded, sans-serif', fontSize: 12, fontWeight: 700, padding: '11px', cursor: 'pointer', marginTop: 'auto' },
  historyItem: { display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #2e2e3e' },
  historyDevice: { color: '#c0c0d8', fontSize: 12 },
  historyStatus: { fontSize: 12, fontWeight: 600 },
  tabs: { display: 'flex', borderBottom: '1px solid #2e2e3e', flexShrink: 0 },
  tab: { flex: 1, padding: '13px', background: 'transparent', border: 'none', color: '#9090a8', fontSize: 13, cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.15s' },
  tabActive: { color: '#E8263A', borderBottomColor: '#E8263A' },
  messageList: { flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 },
  message: { maxWidth: '78%', border: '1px solid', borderRadius: 12, padding: '8px 12px' },
  msgAuthor: { color: '#E8263A', fontSize: 11, fontWeight: 600, marginBottom: 4 },
  msgText: { color: '#f0f0f5', fontSize: 13, lineHeight: 1.5 },
  msgTime: { color: '#9090a8', fontSize: 10, marginTop: 4, textAlign: 'right' },
  downloadBtn: { background: '#22222e', border: '1px solid #2e2e3e', borderRadius: 8, color: '#E8263A', fontSize: 12, padding: '6px 12px', cursor: 'pointer', width: '100%' },
  emptyChat: { color: '#9090a8', fontSize: 13, textAlign: 'center', padding: '40px 0' },
  templates: { padding: '8px 14px', borderTop: '1px solid #2e2e3e', display: 'flex', flexDirection: 'column', gap: 5, background: '#15151e', maxHeight: 180, overflowY: 'auto' },
  templateBtn: { background: '#22222e', border: '1px solid #2e2e3e', borderRadius: 8, color: '#c0c0d8', fontSize: 12, padding: '7px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif' },
  templateToggle: { background: '#22222e', border: '1px solid #2e2e3e', borderRadius: 10, color: '#E8263A', fontSize: 16, padding: '0 12px', cursor: 'pointer' },
  inputRow: { display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid #2e2e3e', flexShrink: 0 },
  msgInput: { flex: 1, background: '#22222e', border: '1px solid #2e2e3e', borderRadius: 10, color: '#f0f0f5', fontSize: 13, padding: '9px 12px', outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif' },
  sendBtn: { background: '#E8263A', border: 'none', borderRadius: 10, color: '#fff', fontSize: 18, padding: '0 14px', cursor: 'pointer', fontWeight: 700 },
  comment: { background: '#22222e', border: '1px solid #2e2e3e', borderRadius: 12, padding: '10px 14px' },
  commentHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  commentAuthor: { color: '#E8263A', fontSize: 12, fontWeight: 600 },
  commentTime: { color: '#9090a8', fontSize: 11 },
  commentText: { color: '#f0f0f5', fontSize: 13, lineHeight: 1.5 },
};
