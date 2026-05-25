import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { USERS } from '../auth';
import { playSound } from '../utils/sound';

const PINNED_ROLES = ['admin', 'dir', 'zamdir', 'sysadmin'];
const DELETE_ROLES = ['admin', 'dir', 'zamdir', 'sysadmin'];

const getUserName = (id) => {
  if (id === 'SKUPKA_CRM') return 'SKUPKA CRM';
  return USERS[id]?.name || id;
};
const getUserInitial = (id) => {
  if (id === 'SKUPKA_CRM') return '🤖';
  const name = USERS[id]?.name || id;
  return name.charAt(0).toUpperCase();
};

export default function FeedPage({ user, theme }) {
  const t = theme;
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [polls, setPolls] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [expanded, setExpanded] = useState({});
  const [commentText, setCommentText] = useState({});
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [postType, setPostType] = useState('post');
  const [postContent, setPostContent] = useState('');
  const [postPhotoFile, setPostPhotoFile] = useState(null);
  const [pinned, setPinned] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOpts, setPollOpts] = useState(['', '']);
  const [submitting, setSubmitting] = useState(false);
  const postsRef = useRef([]);

  const canPin = PINNED_ROLES.includes(user.role);
  const canDelete = DELETE_ROLES.includes(user.role);

  const isVisible = (post) => {
    if (post.visibility === 'okk') return user.role === 'okk' || post.author_id === user.username;
    return true;
  };

  useEffect(() => {
    loadAll();
    initSystemPosts();
    const ch = supabase.channel('feed-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, (payload) => {
        loadAll();
        if (payload.eventType === 'INSERT' && payload.new?.author_id !== user.username) {
          if (payload.new.is_pinned) playSound('feed_announce');
          else if (payload.new.is_system && /день рождения/i.test(payload.new.content || '')) playSound('birthday');
          else if (payload.new.is_system) playSound('crm_update');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_likes' }, (payload) => {
        loadLikes();
        if (payload.eventType === 'INSERT' && payload.new?.user_id !== user.username) {
          const post = postsRef.current.find(p => p.id === payload.new.post_id);
          if (post?.author_id === user.username) playSound('feed_like');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_comments' }, (payload) => {
        loadComments();
        if (payload.eventType === 'INSERT' && payload.new?.author_id !== user.username) {
          const post = postsRef.current.find(p => p.id === payload.new.post_id);
          if (post?.author_id === user.username) playSound('feed_comment');
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function loadAll() {
    setLoading(true);
    const [pr, lr, cr, pollR, voteR] = await Promise.all([
      supabase.from('feed_posts').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('feed_likes').select('post_id,user_id'),
      supabase.from('feed_comments').select('*').order('created_at', { ascending: true }),
      supabase.from('feed_polls').select('*'),
      supabase.from('feed_poll_votes').select('*'),
    ]);
    postsRef.current = pr.data || [];
    setPosts(pr.data || []);
    buildLikes(lr.data || []);
    buildComments(cr.data || []);
    buildPolls(pollR.data || [], voteR.data || []);
    setLoading(false);
  }

  async function loadLikes() {
    const { data } = await supabase.from('feed_likes').select('post_id,user_id');
    buildLikes(data || []);
  }
  async function loadComments() {
    const { data } = await supabase.from('feed_comments').select('*').order('created_at', { ascending: true });
    buildComments(data || []);
  }

  function buildLikes(data) {
    const map = {};
    data.forEach(l => { if (!map[l.post_id]) map[l.post_id] = []; map[l.post_id].push(l.user_id); });
    setLikes(map);
  }
  function buildComments(data) {
    const map = {};
    data.forEach(c => { if (!map[c.post_id]) map[c.post_id] = []; map[c.post_id].push(c); });
    setComments(map);
  }
  function buildPolls(pollsData, votesData) {
    const pollMap = {};
    const voteMap = {};
    pollsData.forEach(p => {
      const pvotes = votesData.filter(v => v.poll_id === p.id);
      const counts = {};
      pvotes.forEach(v => { counts[v.option_index] = (counts[v.option_index] || 0) + 1; });
      const myVote = pvotes.find(v => v.user_id === user.username);
      if (myVote) voteMap[p.id] = myVote.option_index;
      pollMap[p.post_id] = { ...p, counts, total: pvotes.length };
    });
    setPolls(pollMap);
    setUserVotes(voteMap);
  }

  async function initSystemPosts() {
    // CRM update post for v2.4.0
    const { data: existing } = await supabase.from('feed_posts').select('id').eq('is_system', true).ilike('content', '%2.4.0%').limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from('feed_posts').insert({
        author_id: 'SKUPKA_CRM',
        content: '🔄 Обновление SKUPKA CRM v2.4.0\n\n📰 Лента: посты, лайки, комментарии, опросы, закреплённые объявления\n👥 Сотрудники: справочник с карточками и отделами\n📡 Каналы: Instagram Уральск/Атырау/Актобе + WhatsApp\n📹 ОВН: заглушка\n🔑 Новые роли: okk, ovn, smm, dev',
        is_pinned: false, is_system: true, visibility: 'all',
      });
    }

    // Birthday check
    const today = new Date();
    const mmdd = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const { data: specials } = await supabase.from('user_special').select('user_id,birthday');
    if (!specials) return;
    for (const s of specials) {
      if (!s.birthday || s.user_id === 'zmsgrove') continue;
      const bdayMMDD = s.birthday.slice(5, 10);
      if (bdayMMDD !== mmdd) continue;
      const todayStart = today.toISOString().slice(0, 10) + 'T00:00:00';
      const { data: bdayPost } = await supabase.from('feed_posts').select('id').eq('is_system', true).gte('created_at', todayStart).ilike('content', `%${s.user_id}%`).limit(1);
      if (!bdayPost || bdayPost.length === 0) {
        const name = USERS[s.user_id]?.name || s.user_id;
        await supabase.from('feed_posts').insert({
          author_id: 'SKUPKA_CRM',
          content: `🎂 С днём рождения, ${name}! Поздравляем от всей команды SKUPKA! 🎉`,
          is_pinned: false, is_system: true, visibility: 'all',
        });
      }
    }
  }

  const toggleLike = async (postId) => {
    const myLikes = likes[postId] || [];
    if (myLikes.includes(user.username)) {
      await supabase.from('feed_likes').delete().eq('post_id', postId).eq('user_id', user.username);
      setLikes(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(u => u !== user.username) }));
    } else {
      await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.username });
      setLikes(prev => ({ ...prev, [postId]: [...(prev[postId] || []), user.username] }));
    }
  };

  const addComment = async (postId) => {
    const text = (commentText[postId] || '').trim();
    if (!text) return;
    await supabase.from('feed_comments').insert({ post_id: postId, author_id: user.username, content: text });
    setCommentText(prev => ({ ...prev, [postId]: '' }));
    loadComments();
  };

  const votePoll = async (poll, optIdx) => {
    if (userVotes[poll.id] !== undefined) return;
    await supabase.from('feed_poll_votes').insert({ poll_id: poll.id, user_id: user.username, option_index: optIdx });
    setUserVotes(prev => ({ ...prev, [poll.id]: optIdx }));
    setPolls(prev => {
      const entry = prev[poll.post_id];
      if (!entry) return prev;
      return { ...prev, [poll.post_id]: { ...entry, counts: { ...entry.counts, [optIdx]: (entry.counts[optIdx] || 0) + 1 }, total: entry.total + 1 } };
    });
  };

  const deletePost = async (postId) => {
    if (!window.confirm('Удалить пост?')) return;
    await supabase.from('feed_posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const createPost = async () => {
    if (!postContent.trim() && !postPhotoFile) return;
    setSubmitting(true);
    let photo_url = null;
    if (postPhotoFile) {
      try {
        const ext = postPhotoFile.name.split('.').pop();
        const path = `feed/${Date.now()}_${user.username}.${ext}`;
        const { error: upErr } = await supabase.storage.from('feed-photos').upload(path, postPhotoFile);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('feed-photos').getPublicUrl(path);
          photo_url = urlData.publicUrl;
        }
      } catch {}
    }
    await supabase.from('feed_posts').insert({ author_id: user.username, content: postContent.trim(), photo_url, is_pinned: pinned && canPin, is_system: false, visibility: 'all' });
    setPostContent(''); setPostPhotoFile(null); setPinned(false); setShowCreate(false); setSubmitting(false);
    loadAll();
  };

  const createPoll = async () => {
    const opts = pollOpts.map(o => o.trim()).filter(Boolean);
    if (!pollQuestion.trim() || opts.length < 2) return;
    setSubmitting(true);
    const { data: post } = await supabase.from('feed_posts').insert({ author_id: user.username, content: pollQuestion.trim(), is_pinned: false, is_system: false, visibility: 'all' }).select().single();
    if (post) await supabase.from('feed_polls').insert({ post_id: post.id, question: pollQuestion.trim(), options: opts });
    setPollQuestion(''); setPollOpts(['', '']); setShowCreate(false); setSubmitting(false);
    loadAll();
  };

  const visiblePosts = posts.filter(isVisible);

  return (
    <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <div style={{ padding: '18px 24px 14px', position: 'sticky', top: 0, background: t.bg + 'ee', backdropFilter: 'blur(12px)', zIndex: 10, borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showCreate ? 14 : 0 }}>
          <div>
            <div style={{ fontFamily: 'Unbounded,sans-serif', fontSize: 17, fontWeight: 700, color: t.text }}>📰 Лента</div>
            <div style={{ color: t.text2, fontSize: 12, marginTop: 2 }}>Новости и объявления команды</div>
          </div>
          <button onClick={() => setShowCreate(v => !v)} style={{ background: showCreate ? 'transparent' : '#E8263A', border: `1px solid ${showCreate ? t.border : '#E8263A'}`, borderRadius: 10, color: showCreate ? t.text2 : '#fff', fontSize: 12, fontWeight: 700, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Unbounded,sans-serif', transition: 'all 0.15s' }}>
            {showCreate ? '✕ Закрыть' : '+ Создать'}
          </button>
        </div>

        {showCreate && (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[['post', '📝 Пост'], ['poll', '📊 Опрос']].map(([type, label]) => (
                <button key={type} onClick={() => setPostType(type)} style={{ flex: 1, background: postType === type ? 'rgba(232,38,58,0.12)' : 'transparent', border: `1px solid ${postType === type ? 'rgba(232,38,58,0.5)' : t.border}`, borderRadius: 8, color: postType === type ? '#E8263A' : t.text2, fontSize: 12, fontWeight: 600, padding: '7px', cursor: 'pointer', transition: 'all 0.15s' }}>{label}</button>
              ))}
            </div>

            {postType === 'post' ? (
              <>
                <textarea value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="Что хочешь сообщить команде?" rows={3}
                  style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 10, color: t.text, fontSize: 13, padding: '10px 12px', resize: 'vertical', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: t.text2, fontSize: 12 }}>
                    📎 <span>{postPhotoFile ? postPhotoFile.name : 'Фото'}</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPostPhotoFile(e.target.files?.[0] || null)} />
                  </label>
                  {canPin && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: pinned ? '#E8263A' : t.text2, fontSize: 12 }}>
                      <input type="checkbox" checked={pinned} onChange={() => setPinned(v => !v)} style={{ accentColor: '#E8263A' }} />
                      📌 Закрепить
                    </label>
                  )}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => { setShowCreate(false); setPostContent(''); setPostPhotoFile(null); setPinned(false); }} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.text2, fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>Отмена</button>
                  <button onClick={createPost} disabled={submitting} style={{ background: '#E8263A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 16px', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}>{submitting ? '...' : 'Опубликовать'}</button>
                </div>
              </>
            ) : (
              <>
                <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Вопрос для опроса..." style={{ width: '100%', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 10, color: t.text, fontSize: 13, padding: '10px 12px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {pollOpts.map((opt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6 }}>
                      <input value={opt} onChange={e => { const a = [...pollOpts]; a[i] = e.target.value; setPollOpts(a); }} placeholder={`Вариант ${i + 1}`} style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 13, padding: '8px 12px', fontFamily: 'Inter,sans-serif', outline: 'none' }} />
                      {pollOpts.length > 2 && <button onClick={() => setPollOpts(prev => prev.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', color: t.text2, fontSize: 16, cursor: 'pointer', padding: '0 6px' }}>✕</button>}
                    </div>
                  ))}
                  {pollOpts.length < 4 && <button onClick={() => setPollOpts(prev => [...prev, ''])} style={{ background: 'transparent', border: `1px dashed ${t.border}`, borderRadius: 8, color: t.text2, fontSize: 12, padding: '7px', cursor: 'pointer' }}>+ Добавить вариант</button>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => { setShowCreate(false); setPollQuestion(''); setPollOpts(['', '']); }} style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 8, color: t.text2, fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}>Отмена</button>
                  <button onClick={createPoll} disabled={submitting} style={{ background: '#E8263A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 16px', cursor: submitting ? 'default' : 'pointer' }}>{submitting ? '...' : 'Создать опрос'}</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Posts list */}
      <div style={{ padding: '16px 24px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ color: t.text2, textAlign: 'center', padding: 60 }}>Загрузка...</div>
        ) : visiblePosts.length === 0 ? (
          <div style={{ color: t.text2, textAlign: 'center', padding: 60, fontSize: 14 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
            <div>Лента пуста. Создайте первый пост!</div>
          </div>
        ) : (
          visiblePosts.map(post => {
            const postLikes = likes[post.id] || [];
            const liked = postLikes.includes(user.username);
            const postComments = comments[post.id] || [];
            const poll = polls[post.id];
            const myVote = poll ? userVotes[poll.id] : undefined;
            const isExp = !!expanded[post.id];
            const canDelPost = canDelete || (!post.is_system && post.author_id === user.username);

            return (
              <div key={post.id} style={{ background: t.surface, border: `1px solid ${post.is_pinned ? '#E8263A' : t.border}`, borderRadius: 16, overflow: 'hidden', backdropFilter: 'blur(10px)', boxShadow: post.is_pinned ? '0 0 0 1px rgba(232,38,58,0.12), 0 4px 16px rgba(232,38,58,0.07)' : undefined }}>
                {post.is_pinned && (
                  <div style={{ background: 'rgba(232,38,58,0.08)', borderBottom: '1px solid rgba(232,38,58,0.15)', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11 }}>📌</span>
                    <span style={{ color: '#E8263A', fontSize: 10, fontWeight: 700, fontFamily: 'Unbounded,sans-serif', letterSpacing: 0.5 }}>ЗАКРЕПЛЕНО</span>
                  </div>
                )}
                {post.is_system && (
                  <div style={{ background: 'rgba(139,92,246,0.08)', borderBottom: '1px solid rgba(139,92,246,0.15)', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11 }}>🤖</span>
                    <span style={{ color: '#8b5cf6', fontSize: 10, fontWeight: 700, fontFamily: 'Unbounded,sans-serif', letterSpacing: 0.5 }}>SKUPKA CRM</span>
                  </div>
                )}

                <div style={{ padding: '13px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: post.is_system ? 'rgba(139,92,246,0.15)' : 'rgba(232,38,58,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: post.is_system ? 18 : 15, fontWeight: 700, color: post.is_system ? '#8b5cf6' : '#E8263A', flexShrink: 0 }}>
                    {getUserInitial(post.author_id)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>{getUserName(post.author_id)}</div>
                    <div style={{ color: t.text2, fontSize: 11, marginTop: 1 }}>{new Date(post.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {canDelPost && !post.is_system && (
                    <button onClick={() => deletePost(post.id)} title="Удалить" style={{ background: 'transparent', border: 'none', color: t.text2, fontSize: 13, cursor: 'pointer', padding: '3px 6px', opacity: 0.5, borderRadius: 6, transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>🗑️</button>
                  )}
                </div>

                <div style={{ padding: '0 16px 12px' }}>
                  <div style={{ color: t.text, fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{post.content}</div>
                  {post.photo_url && (
                    <img src={post.photo_url} alt="" style={{ width: '100%', maxHeight: 380, objectFit: 'cover', borderRadius: 10, marginTop: 10, display: 'block' }} />
                  )}
                </div>

                {poll && (
                  <div style={{ padding: '0 16px 14px' }}>
                    <div style={{ color: t.text2, fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>📊 Опрос</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(poll.options || []).map((opt, idx) => {
                        const votes = poll.counts?.[idx] || 0;
                        const pct = poll.total > 0 ? Math.round((votes / poll.total) * 100) : 0;
                        const isMyVote = myVote === idx;
                        const voted = myVote !== undefined;
                        return (
                          <div key={idx} onClick={() => !voted && votePoll(poll, idx)} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${isMyVote ? '#E8263A' : t.border}`, cursor: voted ? 'default' : 'pointer', transition: 'border-color 0.15s' }}>
                            {voted && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: isMyVote ? 'rgba(232,38,58,0.12)' : t.surface2 + '99', transition: 'width 0.4s ease' }} />}
                            <div style={{ position: 'relative', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: isMyVote ? '#E8263A' : t.text, fontSize: 13, fontWeight: isMyVote ? 600 : 400 }}>{isMyVote ? '✓ ' : ''}{opt}</span>
                              {voted && <span style={{ color: t.text2, fontSize: 11, fontWeight: 600 }}>{pct}%</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ color: t.text2, fontSize: 11, marginTop: 6 }}>
                      {poll.total > 0 ? `Проголосовало: ${poll.total}` : ''}
                      {myVote === undefined && ' · Нажмите для голосования'}
                    </div>
                  </div>
                )}

                {/* Actions bar */}
                <div style={{ borderTop: `1px solid ${t.border}22`, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button onClick={() => toggleLike(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: liked ? '#E8263A' : t.text2, fontSize: 13, fontWeight: liked ? 700 : 400, padding: '4px 0', transition: 'color 0.15s' }}>
                    {liked ? '❤️' : '🤍'}{postLikes.length > 0 ? ` ${postLikes.length}` : ''}
                  </button>
                  <button onClick={() => setExpanded(prev => ({ ...prev, [post.id]: !prev[post.id] }))} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: isExp ? t.text : t.text2, fontSize: 13, padding: '4px 0', transition: 'color 0.15s' }}>
                    💬{postComments.length > 0 ? ` ${postComments.length}` : ''}
                  </button>
                </div>

                {isExp && (
                  <div style={{ borderTop: `1px solid ${t.border}22`, padding: '12px 16px', background: t.surface2 + '55' }}>
                    {postComments.length === 0 && <div style={{ color: t.text2, fontSize: 12, marginBottom: 10 }}>Нет комментариев. Будьте первым!</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {postComments.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(232,38,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#E8263A', flexShrink: 0 }}>
                            {getUserInitial(c.author_id)}
                          </div>
                          <div style={{ flex: 1, background: t.surface, borderRadius: 10, padding: '7px 12px', border: `1px solid ${t.border}22` }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                              <span style={{ color: t.text, fontSize: 12, fontWeight: 600 }}>{getUserName(c.author_id)}</span>
                              <span style={{ color: t.text2, fontSize: 10 }}>{new Date(c.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{ color: t.text, fontSize: 13 }}>{c.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={commentText[post.id] || ''} onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addComment(post.id)} placeholder="Написать комментарий..." style={{ flex: 1, background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, fontSize: 13, padding: '8px 12px', fontFamily: 'Inter,sans-serif', outline: 'none' }} />
                      <button onClick={() => addComment(post.id)} style={{ background: '#E8263A', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 14px', cursor: 'pointer' }}>→</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
