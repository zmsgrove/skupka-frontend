import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const CITIES = ['Общий', 'Уральск', 'Актобе', 'Атырау'];

const WELCOME = 'Привет! Я CRM ассистент SKUPKA 🤖\n\nМогу помочь:\n• **Найти цены** — "iPhone 13 цены"\n• **Оценить технику** — "Оцени Samsung S22 хорошее состояние"\n• **Характеристики** — "Что такое Xiaomi 12 Pro"\n• Ответить на любой вопрос';

const ANIM = `
@keyframes jarvis-pulse { 0%,100%{opacity:0.85;transform:scale(1)} 50%{opacity:1;transform:scale(1.07)} }
@keyframes jarvis-ring  { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.55} 100%{transform:translate(-50%,-50%) scale(2.6);opacity:0} }
@keyframes jarvis-ring-active { 0%{transform:translate(-50%,-50%) scale(1);opacity:0.8} 100%{transform:translate(-50%,-50%) scale(2.2);opacity:0} }
`;

export default function CrmAssistant({ user, theme }) {
  const t = theme;
  const [open, setOpen]         = useState(false);
  const [full, setFull]         = useState(false);
  const [city, setCity]         = useState('Общий');
  const [msgs, setMsgs]         = useState([{ role:'assistant', content:WELCOME }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [active, setActive]     = useState(false);
  const [listening, setListening] = useState(false);
  const endRef   = useRef(null);
  const recRef   = useRef(null);
  const inputRef = useRef(null);

  // Listen for external open events (from LeadModal)
  useEffect(() => {
    const handler = (e) => {
      setOpen(true);
      if (e.detail?.query) setInput(e.detail.query);
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    window.addEventListener('skupka-assistant', handler);
    return () => window.removeEventListener('skupka-assistant', handler);
  }, []);

  // Load 24h history
  useEffect(() => {
    if (!open) return;
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    supabase.from('assistant_history')
      .select('role, message')
      .eq('user_id', user.username)
      .gte('created_at', cutoff)
      .order('created_at')
      .then(({ data }) => {
        if (data && data.length > 0) setMsgs(data.map(r => ({ role: r.role, content: r.message })));
      })
      .catch(() => {});
  }, [open, user.username]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  const detectIntent = (text) => {
    if (/(оцен|цен[ыа]|сколько стоит|прайс|стоимость)/i.test(text)) return 'assess';
    if (/(характеристики|информация|обзор|что такое|опиши)/i.test(text)) return 'info';
    if (/\b(iphone|samsung|xiaomi|huawei|galaxy|redmi|poco|oppo|realme|honor|pixel|macbook|ipad|note \d|pro max|ultra|s\d+)\b/i.test(text)) return 'device';
    return 'general';
  };

  const send = async (override) => {
    const txt = (override ?? input).trim();
    if (!txt || loading) return;

    const userMsg = { role:'user', content:txt };
    const nextMsgs = [...msgs, userMsg];
    setMsgs(nextMsgs);
    setInput('');
    setLoading(true);
    setActive(true);

    // Persist to Supabase
    await supabase.from('assistant_history').insert({ user_id:user.username, role:'user', message:txt }).catch(() => {});
    // Cleanup old history
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    await supabase.from('assistant_history').delete().eq('user_id', user.username).lt('created_at', cutoff).catch(() => {});

    try {
      const intent = detectIntent(txt);
      let extra = '';

      if (intent === 'assess' || intent === 'device') {
        // Extract keyword for lookup (first 2 meaningful words)
        const kw = txt.replace(/(оцени|цены|цена|на|в|хорошем|плохом|состоянии|состояние|отличном|новый|новая|б\/у|бу|оценка)/gi, '').trim().split(/\s+/).slice(0, 2).join(' ');

        const [{ data: prevDeals }, { data: ourPrices }] = await Promise.all([
          supabase.from('leads').select('device, estimate_amount, created_at').ilike('device', `%${kw}%`).not('estimate_amount', 'is', null).order('created_at', { ascending:false }).limit(5),
          supabase.from('price_list').select('*').ilike('model', `%${kw}%`).limit(5),
        ]);

        if (prevDeals && prevDeals.length > 0) {
          extra += '\n\n📊 История оценок SKUPKA:\n';
          prevDeals.forEach(d => {
            extra += `• ${d.device}: ${new Intl.NumberFormat('ru-KZ').format(d.estimate_amount)} ₸ (${new Date(d.created_at).toLocaleDateString('ru-RU')})\n`;
          });
        }
        if (ourPrices && ourPrices.length > 0) {
          extra += '\n📋 Наша база цен:\n';
          ourPrices.forEach(p => {
            extra += `• ${p.model} (${p.condition}): ${new Intl.NumberFormat('ru-KZ').format(p.our_price)} ₸\n`;
          });
        }
      }

      const cityCtx = city !== 'Общий' ? ` Город: ${city}.` : '';

      const { data: resp } = await axios.post(`${API}/api/assistant`, {
        messages: nextMsgs.map(m => ({ role: m.role, content: m.content })),
        extra: extra + cityCtx,
        intent,
      });

      const botMsg = { role:'assistant', content: resp.response };
      setMsgs(prev => [...prev, botMsg]);
      await supabase.from('assistant_history').insert({ user_id:user.username, role:'assistant', message:resp.response }).catch(() => {});
    } catch {
      setMsgs(prev => [...prev, { role:'assistant', content:'⚠️ Не удалось получить ответ. Убедитесь, что сервер запущен.' }]);
    }

    setLoading(false);
    setActive(false);
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Голосовой ввод не поддерживается в этом браузере'); return; }
    const rec = new SR();
    rec.lang = 'ru-RU';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopVoice = () => { recRef.current?.stop(); setListening(false); };

  // Window geometry
  const W = full ? '100vw' : 420;
  const H = full ? '100vh' : 580;
  const B = full ? 0 : 90;
  const R = full ? 0 : 24;
  const BR = full ? 0 : 21;

  return (
    <>
      <style>{ANIM}</style>

      {/* Floating toggle button — always visible */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:1002, pointerEvents:'auto' }}>
        {/* Idle rings */}
        {!active && !open && [0, 1].map(i => (
          <div key={i} style={{ position:'absolute', top:'50%', left:'50%', width:56, height:56, borderRadius:'50%', border:'2px solid rgba(240,180,41,0.35)', animation:`jarvis-ring ${2 + i * 0.8}s ${i * 0.7}s ease-out infinite`, pointerEvents:'none' }} />
        ))}
        {/* Active rings when processing */}
        {active && [0, 1, 2].map(i => (
          <div key={i} style={{ position:'absolute', top:'50%', left:'50%', width:56, height:56, borderRadius:'50%', border:'2px solid rgba(240,180,41,0.7)', animation:`jarvis-ring-active ${1 + i * 0.35}s ${i * 0.25}s ease-out infinite`, pointerEvents:'none' }} />
        ))}
        <button
          onClick={() => setOpen(v => !v)}
          style={{ position:'relative', zIndex:1, width:56, height:56, borderRadius:'50%', background: open ? 'linear-gradient(135deg,#e09010,#c07800)' : 'linear-gradient(135deg,#f0b429,#e09010)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, boxShadow:`0 4px 20px rgba(240,180,41,${open?0.3:0.5})`, animation: !open ? 'jarvis-pulse 2.5s ease-in-out infinite' : 'none', transition:'all 0.2s' }}
          title={open ? 'Свернуть ассистент' : 'Открыть ассистент SKUPKA AI'}
        >
          {open ? '✕' : '🤖'}
        </button>
      </div>

      {/* Chat window */}
      {open && (
        <div style={{ position:'fixed', bottom:B, right:R, width:W, height:H, zIndex:1001, background:t.surface+'ee', border:'1px solid rgba(255,255,255,0.10)', borderRadius:BR, backdropFilter:'blur(20px)', boxShadow:'0 24px 80px rgba(0,0,0,0.55)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:`linear-gradient(135deg,rgba(240,180,41,0.08),transparent)`, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ position:'relative', width:34, height:34, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {active && <div style={{ position:'absolute', inset:-5, borderRadius:'50%', border:'2px solid #f0b429', animation:'jarvis-ring-active 1s ease-out infinite' }} />}
                <span style={{ fontSize:22 }}>🤖</span>
              </div>
              <div>
                <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:700, color:'#f0b429' }}>SKUPKA AI</div>
                <div style={{ fontSize:10, color: loading ? '#f59e0b' : '#10b981', marginTop:1 }}>
                  {loading ? '⚡ Думаю...' : '🟢 Онлайн'}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => setFull(v=>!v)} title={full ? 'Свернуть' : 'На весь экран'} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:13, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {full ? '⊡' : '⊞'}
              </button>
              <button onClick={() => { setMsgs([{ role:'assistant', content:WELCOME }]); }} title="Очистить чат" style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:11, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                🗑
              </button>
            </div>
          </div>

          {/* City filter */}
          <div style={{ padding:'8px 12px', borderBottom:`1px solid ${t.border}`, display:'flex', gap:6, flexShrink:0 }}>
            {CITIES.map(c => (
              <button key={c} onClick={() => setCity(c)} style={{ background:city===c?'rgba(240,180,41,0.14)':'transparent', border:`1px solid ${city===c?'rgba(240,180,41,0.4)':t.border}`, borderRadius:20, color:city===c?'#f0b429':t.text2, fontSize:10, fontWeight:600, padding:'4px 10px', cursor:'pointer', transition:'all 0.15s', fontFamily:'Inter,sans-serif' }}>
                {c}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:10 }}>
            {msgs.map((msg, i) => <Bubble key={i} msg={msg} t={t} />)}
            {loading && (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:20 }}>🤖</span>
                <div style={{ padding:'10px 14px', background:t.surface2, border:`1px solid ${t.border}`, borderRadius:'4px 16px 16px 16px', display:'flex', gap:5 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#f0b429', animation:`pulse 1s ${i*0.2}s ease-in-out infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding:'10px 12px', borderTop:`1px solid ${t.border}`, display:'flex', gap:8, flexShrink:0, background:t.surface }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={listening ? '🎤 Говорите...' : 'Спросите что-нибудь...'}
              style={{ flex:1, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, color:t.text, fontSize:13, padding:'9px 12px', outline:'none', fontFamily:'Inter,sans-serif' }}
            />
            <button
              onClick={listening ? stopVoice : startVoice}
              title={listening ? 'Остановить' : 'Голосовой ввод (ru-RU)'}
              style={{ background:listening?'rgba(239,68,68,0.15)':'transparent', border:`1px solid ${listening?'#ef4444':t.border}`, borderRadius:10, color:listening?'#ef4444':t.text2, fontSize:16, width:40, height:40, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}
            >
              🎤
            </button>
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{ background:input.trim()&&!loading?'#f0b429':t.surface2, border:'none', borderRadius:10, color:input.trim()&&!loading?'#0f0f13':t.text2, width:40, height:40, cursor:input.trim()&&!loading?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18, transition:'all 0.15s' }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Message bubble ───────────────────────────────────────────────
function Bubble({ msg, t }) {
  const isUser = msg.role === 'user';

  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      // Markdown table row: | cell | cell |
      if (line.trim().startsWith('|') && line.includes('|', 1)) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        const isDivider = cells.every(c => /^[-:]+$/.test(c));
        if (isDivider) return null;
        if (cells.length >= 2) return (
          <div key={i} style={{ display:'flex', gap:4, padding:'3px 0', borderBottom:`1px solid ${t.border}22` }}>
            {cells.map((c, j) => <span key={j} style={{ flex:1, fontSize:11, color:t.text, minWidth:50 }}>{c}</span>)}
          </div>
        );
      }
      // Bold **text** and bullet •
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const content = parts.map((p, j) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={j} style={{ color:'#f0b429' }}>{p.slice(2, -2)}</strong>
          : p
      );
      return <div key={i} style={{ lineHeight:1.7, minHeight: line.trim() ? undefined : 6 }}>{content}</div>;
    }).filter(Boolean);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:7, flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <span style={{ fontSize:17, flexShrink:0 }}>{isUser ? '👤' : '🤖'}</span>
        <div style={{ maxWidth:'84%', background: isUser ? 'rgba(240,180,41,0.13)' : t.surface2, border:`1px solid ${isUser?'rgba(240,180,41,0.28)':t.border}`, borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px', padding:'10px 13px', color:t.text, fontSize:13, wordBreak:'break-word' }}>
          {renderContent(msg.content)}
        </div>
      </div>
    </div>
  );
}
