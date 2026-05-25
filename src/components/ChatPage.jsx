import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { playSound } from '../utils/sound';

const EMOJIS = ['👍','❤️','😂','😮','😢','🔥'];

const CAN_MANAGE = ['admin','dir','zamdir','sysadmin','rgmu','rgma'];

export default function ChatPage({ user, theme, onUnreadChange }) {
  const t = theme;
  const canManage = CAN_MANAGE.includes(user.role);

  const [chats, setChats]         = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState('');
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [allUsers, setAllUsers]   = useState([]);
  const bottomRef = useRef(null);

  // Load chats where user is member
  const fetchChats = useCallback(async () => {
    const { data: memberships } = await supabase.from('chat_members').select('chat_id').eq('user_id', user.username);
    if (!memberships) return;
    const ids = memberships.map(m => m.chat_id);
    if (!ids.length) { setChats([]); setLoading(false); return; }
    const { data } = await supabase.from('chats').select('*').in('id', ids).order('created_at', { ascending: true });
    setChats(data || []);
    setLoading(false);
    // Set general as default
    if (!activeChat && data?.length) {
      const general = data.find(c => c.is_general) || data[0];
      setActiveChat(general);
    }
  }, [user.username]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  // Load messages for active chat
  useEffect(() => {
    if (!activeChat) return;
    let cancelled = false;
    async function fetchMessages() {
      const { data } = await supabase.from('chat_messages')
        .select('*, chat_reactions(*)')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });
      if (!cancelled) setMessages(data || []);
      // Mark as read
      await supabase.from('chat_reads').upsert({
        chat_id: activeChat.id, user_id: user.username, last_read_at: new Date().toISOString()
      }, { onConflict: 'chat_id,user_id' });
      if (onUnreadChange) onUnreadChange(0); // will be recalculated
    }
    fetchMessages();
    const ch = supabase.channel(`chat-${activeChat.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${activeChat.id}` }, (payload) => {
        fetchMessages();
        if (payload.eventType === 'INSERT' && payload.new?.user_id !== user.username) {
          playSound('chat_msg');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reactions' }, fetchMessages)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [activeChat?.id, user.username]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Load all users for member picker
  useEffect(() => {
    if (!canManage) return;
    supabase.from('profiles').select('id, name, username, role').then(({ data }) => setAllUsers(data || []));
  }, [canManage]);

  const sendMessage = async () => {
    if (!text.trim() || !activeChat) return;
    const msg = text.trim();
    setText('');
    await supabase.from('chat_messages').insert({
      chat_id: activeChat.id,
      user_id: user.username,
      sender_name: user.name,
      text: msg,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const toggleReaction = async (messageId, emoji) => {
    const existing = messages.find(m => m.id === messageId)
      ?.chat_reactions?.find(r => r.user_id === user.username && r.emoji === emoji);
    if (existing) {
      await supabase.from('chat_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('chat_reactions').insert({ message_id: messageId, user_id: user.username, emoji });
    }
  };

  const deleteMessage = async (msgId) => {
    await supabase.from('chat_messages').delete().eq('id', msgId);
  };

  const deleteChat = async (chatId) => {
    if (!window.confirm('Удалить чат?')) return;
    await supabase.from('chat_messages').delete().eq('chat_id', chatId);
    await supabase.from('chat_members').delete().eq('chat_id', chatId);
    await supabase.from('chat_reads').delete().eq('chat_id', chatId);
    await supabase.from('chats').delete().eq('id', chatId);
    setActiveChat(null);
    fetchChats();
  };

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:t.text2 }}>
      Загрузка чатов...
    </div>
  );

  return (
    <div style={{ display:'flex', height:'calc(100vh - 70px)', overflow:'hidden', margin:'0 0 0 0' }}>

      {/* ── Sidebar чатов ── */}
      <div style={{ width:260, borderRight:`1px solid ${t.border}`, display:'flex', flexDirection:'column', background:t.surface, flexShrink:0 }}>
        <div style={{ padding:'16px 14px 10px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${t.border}` }}>
          <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:13, fontWeight:700, color:t.text }}>🗨️ Чаты</span>
          {canManage && (
            <button onClick={() => setShowCreate(true)} style={{ background:'rgba(232,38,58,0.15)', border:'1px solid rgba(232,38,58,0.4)', borderRadius:8, color:'#E8263A', fontSize:12, padding:'4px 10px', cursor:'pointer' }}>
              + Создать
            </button>
          )}
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {chats.map(chat => {
            const isActive = activeChat?.id === chat.id;
            return (
              <div key={chat.id} onClick={() => setActiveChat(chat)} style={{
                padding:'12px 14px', cursor:'pointer',
                background: isActive ? 'rgba(232,38,58,0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid #E8263A' : '3px solid transparent',
                borderBottom: `1px solid ${t.border}`,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                transition:'all 0.15s',
              }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ color: isActive ? '#E8263A' : t.text, fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {chat.is_general ? '📌 ' : ''}{chat.name}
                  </div>
                </div>
                {canManage && !chat.is_general && (
                  <button onClick={e => { e.stopPropagation(); deleteChat(chat.id); }} style={{ background:'transparent', border:'none', color:t.text2, fontSize:14, cursor:'pointer', padding:'2px 4px', flexShrink:0 }}>
                    🗑️
                  </button>
                )}
              </div>
            );
          })}
          {chats.length === 0 && (
            <div style={{ color:t.text2, fontSize:13, textAlign:'center', padding:40 }}>Нет чатов</div>
          )}
        </div>
      </div>

      {/* ── Область сообщений ── */}
      {activeChat ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:t.bg }}>
          {/* Chat header */}
          <div style={{ padding:'12px 20px', borderBottom:`1px solid ${t.border}`, background:t.surface, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>
              {activeChat.is_general ? '📌 ' : '🗨️ '}{activeChat.name}
            </span>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
            {messages.map(msg => {
              const isMe = msg.user_id === user.username;
              const reactionMap = {};
              (msg.chat_reactions || []).forEach(r => {
                if (!reactionMap[r.emoji]) reactionMap[r.emoji] = [];
                reactionMap[r.emoji].push(r.user_id);
              });

              return (
                <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {/* Name + time */}
                  <div style={{ fontSize:11, color:t.text2, marginBottom:3, paddingLeft: isMe ? 0 : 2 }}>
                    {!isMe && <span style={{ fontWeight:600, color:t.text3, marginRight:6 }}>{msg.sender_name}</span>}
                    {new Date(msg.created_at).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
                  </div>

                  {/* Bubble */}
                  <div style={{ position:'relative', maxWidth:'65%' }}>
                    <div style={{
                      background: isMe ? 'rgba(232,38,58,0.18)' : t.surface,
                      border: `1px solid ${isMe ? 'rgba(232,38,58,0.4)' : t.border}`,
                      borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      padding:'10px 14px',
                      color: t.text, fontSize:13, lineHeight:1.5,
                      wordBreak:'break-word',
                    }}>
                      {msg.text}
                    </div>

                    {/* Reactions display */}
                    {Object.keys(reactionMap).length > 0 && (
                      <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                        {Object.entries(reactionMap).map(([emoji, users]) => (
                          <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} style={{
                            background: users.includes(user.username) ? 'rgba(232,38,58,0.2)' : t.surface2,
                            border: `1px solid ${users.includes(user.username) ? 'rgba(232,38,58,0.4)' : t.border}`,
                            borderRadius:20, padding:'2px 7px', cursor:'pointer',
                            fontSize:12, display:'flex', alignItems:'center', gap:3,
                          }}>
                            {emoji} <span style={{ color:t.text2, fontSize:11 }}>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reaction picker + delete on hover */}
                    <MessageActions msg={msg} isMe={isMe} user={user} onReact={toggleReaction} onDelete={deleteMessage} t={t} />
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:'12px 20px', borderTop:`1px solid ${t.border}`, background:t.surface, display:'flex', gap:10, alignItems:'flex-end' }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Написать сообщение... (Enter — отправить, Shift+Enter — перенос)"
              rows={1}
              style={{
                flex:1, background:t.inputBg, border:`1px solid ${t.border}`,
                borderRadius:10, color:t.text, fontSize:13, padding:'10px 14px',
                outline:'none', fontFamily:'Inter,sans-serif', resize:'none',
                maxHeight:120, lineHeight:1.5,
              }}
              onInput={e => { e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,120)+'px'; }}
            />
            <button onClick={sendMessage} disabled={!text.trim()} style={{
              background: text.trim() ? '#E8263A' : t.surface2,
              border:'none', borderRadius:10, color: text.trim() ? '#fff' : t.text2,
              fontSize:18, width:44, height:44, cursor: text.trim() ? 'pointer' : 'default',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
              transition:'all 0.15s',
            }}>➤</button>
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:t.text2, fontSize:14 }}>
          Выберите чат
        </div>
      )}

      {/* Create chat modal */}
      {showCreate && (
        <CreateChatModal user={user} allUsers={allUsers} theme={t}
          onClose={() => setShowCreate(false)}
          onCreate={async (name, memberIds) => {
            const { data: chat } = await supabase.from('chats').insert({ name, created_by: user.username, is_general: false }).select().single();
            if (!chat) return;
            const members = [...new Set([user.username, ...memberIds])].map(uid => ({ chat_id: chat.id, user_id: uid }));
            await supabase.from('chat_members').insert(members);
            setShowCreate(false);
            fetchChats();
            setActiveChat(chat);
          }}
        />
      )}
    </div>
  );
}

function MessageActions({ msg, isMe, user, onReact, onDelete, t }) {
  const [show, setShow] = useState(false);
  const canDelete = isMe || ['admin','dir','zamdir','sysadmin'].includes(user.role);
  return (
    <div
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position:'absolute', top:-28, right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0, display:'flex', gap:2, opacity: show ? 1 : 0, transition:'opacity 0.15s', pointerEvents: show ? 'auto' : 'none' }}
    >
      <div style={{ display:'flex', gap:2, background:t.surface, border:`1px solid ${t.border}`, borderRadius:20, padding:'3px 6px' }}>
        {EMOJIS.map(e => (
          <button key={e} onClick={() => onReact(msg.id, e)} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:14, padding:'1px 2px', borderRadius:4 }}>{e}</button>
        ))}
        {canDelete && (
          <button onClick={() => onDelete(msg.id)} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:12, padding:'1px 4px', color:'#ef4444', borderRadius:4 }}>🗑</button>
        )}
      </div>
    </div>
  );
}

function CreateChatModal({ user, allUsers, theme, onClose, onCreate }) {
  const t = theme;
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:500 }} />
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        width:400, background:t.surface, border:`1px solid ${t.border}`,
        borderRadius:16, padding:24, zIndex:501,
        display:'flex', flexDirection:'column', gap:16,
      }}>
        <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:14, fontWeight:700, color:t.text }}>Создать чат</div>

        <div>
          <label style={{ color:t.text2, fontSize:12, marginBottom:6, display:'block' }}>Название чата</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название..."
            style={{ width:'100%', background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:8, color:t.text, fontSize:13, padding:'9px 12px', outline:'none', fontFamily:'Inter,sans-serif' }} />
        </div>

        <div>
          <label style={{ color:t.text2, fontSize:12, marginBottom:8, display:'block' }}>Участники</label>
          <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:220, overflowY:'auto' }}>
            {allUsers.filter(u => u.id !== user.username).map(u => (
              <label key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, cursor:'pointer', background: selected.includes(u.id) ? 'rgba(232,38,58,0.1)' : 'transparent', border:`1px solid ${selected.includes(u.id) ? 'rgba(232,38,58,0.3)' : t.border}`, transition:'all 0.1s' }}>
                <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} style={{ accentColor:'#E8263A' }} />
                <span style={{ color:t.text, fontSize:13 }}>{u.name}</span>
                <span style={{ color:t.text2, fontSize:11, marginLeft:'auto' }}>{u.role}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:13, padding:'10px', cursor:'pointer' }}>Отмена</button>
          <button onClick={() => { if(name.trim()) onCreate(name.trim(), selected); }} disabled={!name.trim()} style={{ flex:1, background: name.trim() ? '#E8263A' : t.surface2, border:'none', borderRadius:8, color: name.trim() ? '#fff' : t.text2, fontSize:13, fontWeight:700, padding:'10px', cursor: name.trim() ? 'pointer' : 'default' }}>
            Создать
          </button>
        </div>
      </div>
    </>
  );
}
