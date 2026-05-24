import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';
const CITIES = ['Общий', 'Уральск', 'Актобе', 'Атырау'];
if (!process.env.REACT_APP_BACKEND_URL) console.warn('[CrmAssistant] REACT_APP_BACKEND_URL не задан — запросы пойдут на localhost');

const WELCOME = 'Привет! Я CRM ассистент SKUPKA 🤖\n\nМогу помочь:\n• **Найти цены** — "iPhone 13 цены"\n• **Оценить технику** — "Оцени Samsung S22 хорошее состояние"\n• **Характеристики** — "Что такое Xiaomi 12 Pro"\n• Ответить на любой вопрос';

const ANIM = `
@keyframes orbit-1{from{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(0deg)}to{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(360deg)}}
@keyframes orbit-2{from{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(36deg)}to{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(396deg)}}
@keyframes orbit-3{from{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(72deg)}to{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(432deg)}}
@keyframes orbit-4{from{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(108deg)}to{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(468deg)}}
@keyframes orbit-5{from{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(144deg)}to{transform:translate(-50%,-50%) rotateY(70deg) rotateZ(504deg)}}
@keyframes core-pulse{0%,100%{box-shadow:0 0 15px #00E5FF,0 0 30px #00E5FF,0 0 50px rgba(0,229,255,0.5)}50%{box-shadow:0 0 20px #00E5FF,0 0 40px #00E5FF,0 0 60px rgba(0,229,255,0.6)}}
@keyframes core-active{0%,100%{box-shadow:0 0 25px #00E5FF,0 0 50px #00E5FF,0 0 80px rgba(0,229,255,0.7)}50%{box-shadow:0 0 35px #00E5FF,0 0 65px #00E5FF,0 0 100px rgba(0,229,255,0.9)}}
@keyframes pulse{0%,100%{transform:scale(0.7);opacity:0.5}50%{transform:scale(1.1);opacity:1}}
.crm-orbital{position:relative;width:64px;height:64px;cursor:pointer;transform-style:preserve-3d;perspective:200px}
.crm-core{width:24px;height:24px;border-radius:50%;background:#00E5FF;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10;animation:core-pulse 2.5s ease-in-out infinite}
.crm-ring{position:absolute;width:58px;height:22px;border:1.5px solid rgba(0,229,255,0.7);border-radius:50%;top:50%;left:50%;pointer-events:none}
.crm-ring-1{animation:orbit-1 6s linear infinite}
.crm-ring-2{animation:orbit-2 4.5s linear infinite}
.crm-ring-3{animation:orbit-3 7s linear infinite}
.crm-ring-4{animation:orbit-4 5s linear infinite}
.crm-ring-5{animation:orbit-5 8s linear infinite}
.crm-orbital.thinking .crm-ring{animation-duration:0.8s !important;border-color:rgba(0,229,255,0.95)}
.crm-orbital.thinking .crm-core{animation:core-active 0.5s ease-in-out infinite}
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
      .eq('user_id', user?.id)
      .gte('created_at', cutoff)
      .order('created_at')
      .then(({ data, error }) => {
        if (error) console.error('assistant_history select:', error);
        if (data && data.length > 0) setMsgs(data.map(r => ({ role: r.role, content: r.message })));
      });
  }, [open, user?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  const detectIntent = (text) => {
    if (/(оцен|выкуп|сколько дадите|сколько дашь)/i.test(text)) return 'assess';
    if (/(цен[ыа]|стоимость|прайс|почём|за сколько|сколько стоит)/i.test(text)) return 'price';
    if (/(характеристики|информация|обзор|что такое|опиши|\b(iphone|samsung|xiaomi|huawei|galaxy|redmi|poco|oppo|realme|honor|pixel|macbook|ipad|note \d|pro max|ultra|s\d+)\b)/i.test(text)) return 'device';
    return 'general';
  };

  const send = async (override) => {
    console.log('API URL:', process.env.REACT_APP_BACKEND_URL);
    const txt = (override ?? input).trim();
    if (!txt || loading) return;

    const userMsg = { role:'user', content:txt };
    const nextMsgs = [...msgs, userMsg];
    setMsgs(nextMsgs);
    setInput('');
    setLoading(true);
    setActive(true);

    // Persist to Supabase
    const { error: insErr } = await supabase.from('assistant_history').insert({ user_id: user?.id, role: 'user', message: txt });
    if (insErr) console.error('assistant_history insert user:', insErr);
    // Cleanup old history
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { error: delErr } = await supabase.from('assistant_history').delete().eq('user_id', user?.id).lt('created_at', cutoff);
    if (delErr) console.error('assistant_history delete:', delErr);

    try {
      const intent = detectIntent(txt);
      let extra = '';

      if (intent === 'assess' || intent === 'price' || intent === 'device') {
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

      const cityExtra = city !== 'Общий'
        ? `\nПользователь ищет цены в городе ${city}, Казахстан. Ищи объявления именно в этом городе на OLX.kz и Каспи.`
        : '';

      const url = `${API}/api/assistant`;
      console.log('[CrmAssistant] POST', url);
      const { data: resp } = await axios.post(url, {
        messages: nextMsgs.map(m => ({ role: m.role, content: m.content })),
        extra: extra + cityExtra,
        intent,
      });

      const botMsg = { role:'assistant', content: resp.response };
      setMsgs(prev => [...prev, botMsg]);
      const { error: botInsErr } = await supabase.from('assistant_history').insert({ user_id: user?.id, role: 'assistant', message: resp.response });
      if (botInsErr) console.error('assistant_history insert bot:', botInsErr);
    } catch (err) {
      const errText = err?.response?.data?.error || err?.message || 'Неизвестная ошибка';
      console.error('[CrmAssistant] Ошибка:', errText, '\nURL:', `${API}/api/assistant`);
      setMsgs(prev => [...prev, { role:'assistant', content:`⚠️ Ошибка: ${errText}\n\nПроверьте Console (F12) для деталей.` }]);
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

      {/* Floating toggle button — orbital animation */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:1002 }}>
        <div
          className={`crm-orbital${active ? ' thinking' : ''}`}
          onClick={() => setOpen(v => !v)}
          title={open ? 'Свернуть ассистент' : 'Открыть ассистент SKUPKA AI'}
        >
          <div className="crm-core" />
          <div className="crm-ring crm-ring-1" />
          <div className="crm-ring crm-ring-2" />
          <div className="crm-ring crm-ring-3" />
          <div className="crm-ring crm-ring-4" />
          <div className="crm-ring crm-ring-5" />
          {open && (
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', color:'rgba(255,255,255,0.92)', fontSize:18, fontWeight:400, pointerEvents:'none', userSelect:'none', zIndex:20 }}>✕</div>
          )}
        </div>
      </div>

      {/* Chat window */}
      {open && (
        <div style={{ position:'fixed', bottom:B, right:R, width:W, height:H, zIndex:1001, background:t.surface+'ee', border:'1px solid rgba(255,255,255,0.10)', borderRadius:BR, backdropFilter:'blur(20px)', boxShadow:'0 24px 80px rgba(0,0,0,0.55)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:`linear-gradient(135deg,rgba(232,38,58,0.06),transparent)`, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ position:'relative', width:34, height:34, perspective:'200px' }}>
                <div style={{ position:'absolute', top:'50%', left:'50%', width:28, height:28, borderRadius:'50%', border:`1.5px solid rgba(0,229,255,${active?0.8:0.55})`, animation:`orbit-1 ${active?'0.8':'5'}s linear infinite`, pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:'50%', left:'50%', width:28, height:28, borderRadius:'50%', border:`1.5px solid rgba(0,229,255,${active?0.55:0.35})`, animation:`orbit-3 ${active?'1.0':'7'}s linear infinite`, pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:11, height:11, borderRadius:'50%', background:'radial-gradient(circle,#00E5FF,#007a9a)', animation:active?'core-active 0.5s ease-in-out infinite':'core-pulse 3s ease-in-out infinite' }} />
              </div>
              <div>
                <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:700, color:'#E8263A' }}>SKUPKA AI</div>
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
              <button key={c} onClick={() => setCity(c)} style={{ background:city===c?'rgba(232,38,58,0.12)':'transparent', border:`1px solid ${city===c?'rgba(232,38,58,0.4)':t.border}`, borderRadius:20, color:city===c?'#E8263A':t.text2, fontSize:10, fontWeight:600, padding:'4px 10px', cursor:'pointer', transition:'all 0.15s', fontFamily:'Inter,sans-serif' }}>
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
                  {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#E8263A', animation:`pulse 1s ${i*0.2}s ease-in-out infinite` }} />)}
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
              style={{ background:input.trim()&&!loading?'#E8263A':t.surface2, border:'none', borderRadius:10, color:input.trim()&&!loading?'#ffffff':t.text2, width:40, height:40, cursor:input.trim()&&!loading?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18, transition:'all 0.15s' }}
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
          ? <strong key={j} style={{ color:'#E8263A' }}>{p.slice(2, -2)}</strong>
          : p
      );
      return <div key={i} style={{ lineHeight:1.7, minHeight: line.trim() ? undefined : 6 }}>{content}</div>;
    }).filter(Boolean);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:7, flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <span style={{ fontSize:17, flexShrink:0 }}>{isUser ? '👤' : '🤖'}</span>
        <div style={{ maxWidth:'84%', background: isUser ? 'rgba(232,38,58,0.13)' : t.surface2, border:`1px solid ${isUser?'rgba(232,38,58,0.28)':t.border}`, borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px', padding:'10px 13px', color:t.text, fontSize:13, wordBreak:'break-word' }}>
          {renderContent(msg.content)}
        </div>
      </div>
    </div>
  );
}
