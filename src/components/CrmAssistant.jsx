import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

const API = process.env.REACT_APP_BACKEND_URL || '';
const CITIES = ['Общий', 'Уральск', 'Актобе', 'Атырау'];
if (!process.env.REACT_APP_BACKEND_URL) console.warn('[CrmAssistant] REACT_APP_BACKEND_URL не задан');

const WELCOME = 'Привет! Я CRM ассистент SKUPKA\n\nМогу помочь:\n• **Найти цены** — "iPhone 13 цены"\n• **Оценить технику** — "Оцени Samsung S22 хорошее состояние"\n• **Данные CRM** — "Сколько заявок сегодня"\n• **Задачи** — "Покажи просроченные задачи"\n• **Навигация** — "Открой дашборд"\n• Ё (зажать) — голосовой ввод';

const ANIM = `
@keyframes fly-1{0%{transform:translate(-50%,-50%) rotateX(70deg) rotateZ(0deg)}100%{transform:translate(-50%,-50%) rotateX(70deg) rotateZ(360deg)}}
@keyframes fly-2{0%{transform:translate(-50%,-50%) rotateY(80deg) rotateX(20deg) rotateZ(36deg)}100%{transform:translate(-50%,-50%) rotateY(80deg) rotateX(20deg) rotateZ(396deg)}}
@keyframes fly-3{0%{transform:translate(-50%,-50%) rotateX(-60deg) rotateY(30deg) rotateZ(72deg)}100%{transform:translate(-50%,-50%) rotateX(-60deg) rotateY(30deg) rotateZ(432deg)}}
@keyframes fly-4{0%{transform:translate(-50%,-50%) rotateY(-75deg) rotateX(45deg) rotateZ(108deg)}100%{transform:translate(-50%,-50%) rotateY(-75deg) rotateX(45deg) rotateZ(468deg)}}
@keyframes fly-5{0%{transform:translate(-50%,-50%) rotateX(50deg) rotateY(-50deg) rotateZ(144deg)}100%{transform:translate(-50%,-50%) rotateX(50deg) rotateY(-50deg) rotateZ(504deg)}}
@keyframes core-pulse{0%,100%{box-shadow:0 0 10px #00E5FF,0 0 25px #00E5FF,0 0 40px rgba(0,229,255,0.5)}50%{box-shadow:0 0 14px #00E5FF,0 0 30px #00E5FF,0 0 50px rgba(0,229,255,0.6)}}
@keyframes core-active{0%,100%{box-shadow:0 0 20px #00E5FF,0 0 45px #00E5FF,0 0 70px rgba(0,229,255,0.8)}50%{box-shadow:0 0 30px #00E5FF,0 0 60px #00E5FF,0 0 90px rgba(0,229,255,1)}}
@keyframes pulse{0%,100%{transform:scale(0.7);opacity:0.5}50%{transform:scale(1.1);opacity:1}}
@keyframes orb-badge{0%,100%{transform:scale(1)}50%{transform:scale(1.2)}}
.crm-btn{position:relative;width:64px;height:64px;border-radius:50%;background:#0a0a0f;cursor:pointer;transform-style:preserve-3d;perspective:300px;border:none;outline:none;padding:0}
.orbital-container{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}
.crm-core{width:20px;height:20px;border-radius:50%;background:#00E5FF;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10;box-shadow:0 0 10px #00E5FF,0 0 25px #00E5FF,0 0 40px rgba(0,229,255,0.5);animation:core-pulse 2.5s ease-in-out infinite}
.crm-ring{position:absolute;width:60px;height:18px;border:1.5px solid rgba(0,229,255,0.6);border-radius:50%;top:50%;left:50%;pointer-events:none}
.crm-ring-1{animation:fly-1 7s linear infinite}
.crm-ring-2{animation:fly-2 5s linear infinite}
.crm-ring-3{animation:fly-3 9s linear infinite}
.crm-ring-4{animation:fly-4 6s linear infinite;border-color:rgba(0,229,255,0.45)}
.crm-ring-5{animation:fly-5 4s linear infinite;border-color:rgba(0,229,255,0.35)}
.crm-btn.thinking .crm-ring{animation-duration:1.5s !important;width:70px !important;height:26px !important;border-color:rgba(0,229,255,0.95) !important}
.crm-btn.thinking .crm-core{width:26px !important;height:26px !important;box-shadow:0 0 25px #00E5FF,0 0 50px #00E5FF !important;animation:core-active 1.5s ease-in-out infinite}
`;

const PRICE_ENTRY_RE = /^(внеси|добавь|добавить|запиши|внести)\s+(.+?)\s+цена\s+(\d[\d\s]*)\s*$/i;

function parsePriceCommand(txt) {
  const m = txt.match(PRICE_ENTRY_RE);
  if (!m) return null;
  const model = m[2].trim();
  const price = parseInt(m[3].replace(/\s/g, ''), 10);
  return { model, price };
}

function parseReminder(text) {
  const m = text.match(/напомни.+?в\s+(\d{1,2})[:.]+(\d{2})\s+(.+)/i);
  if (!m) return null;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10), what = m[3].trim();
  const now = new Date();
  // time in UTC for KZ (UTC+5) target
  const target = new Date(now);
  target.setUTCHours(h - 5, min, 0, 0);
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1);
  return { time: target.getTime(), text: what, fired: false };
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.15);
  } catch {}
}

export default function CrmAssistant({ user, theme, isTovarovyed, onNavigate }) {
  const t = theme;
  // mode: 'hidden' | 'mini' | 'full'
  const [mode, setMode]         = useState('hidden');
  const [watchMode, setWatchMode] = useState(false);
  const [watchLog, setWatchLog]   = useState([]);
  const [city, setCity]         = useState('Общий');
  const [msgs, setMsgs]         = useState([{ role:'assistant', content:WELCOME }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [active, setActive]     = useState(false);
  const [listening, setListening] = useState(false);
  const [hiddenBadge, setHiddenBadge] = useState(false);
  const endRef   = useRef(null);
  const recRef   = useRef(null);
  const inputRef = useRef(null);
  const prevModeRef = useRef('hidden');
  const hotkeyRecording = useRef(false);

  // External open (from LeadModal)
  useEffect(() => {
    const handler = (e) => {
      setMode('mini');
      if (e.detail?.query) setInput(e.detail.query);
      setTimeout(() => inputRef.current?.focus(), 100);
    };
    window.addEventListener('skupka-assistant', handler);
    return () => window.removeEventListener('skupka-assistant', handler);
  }, []);

  // Load history + smart hints when opening from hidden
  useEffect(() => {
    const prev = prevModeRef.current;
    prevModeRef.current = mode;
    if (mode === 'hidden') return;
    if (prev === 'hidden') {
      // Load 24h history
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
      checkSmartHints();
      setHiddenBadge(false);
    }
  }, [mode]);

  // Scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  // Hotkey: Backquote (Ё) works on any keyboard layout
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code !== 'Backquote' || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      if (hotkeyRecording.current) return;
      hotkeyRecording.current = true;
      playBeep();
      startVoiceHotkey();
    };
    const onKeyUp = (e) => {
      if (e.code !== 'Backquote' || !hotkeyRecording.current) return;
      hotkeyRecording.current = false;
      recRef.current?.stop();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Reminder checker
  useEffect(() => {
    const check = () => {
      try {
        const reminders = JSON.parse(localStorage.getItem('skupka_reminders') || '[]');
        const now = Date.now();
        const updated = reminders.map(r => {
          if (r.time <= now && !r.fired) {
            setMode(prev => prev === 'hidden' ? 'mini' : prev);
            setMsgs(prev => [...prev, { role:'assistant', content:`⏰ Напоминание: ${r.text}` }]);
            playBeep();
            return { ...r, fired: true };
          }
          return r;
        }).filter(r => !r.fired);
        localStorage.setItem('skupka_reminders', JSON.stringify(updated));
      } catch {}
    };
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  async function checkSmartHints() {
    if (!user?.username) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: overdue } = await supabase.from('tasks')
      .select('id')
      .eq('assigned_to', user.username)
      .lt('due_date', today)
      .neq('status', 'done');
    if (overdue?.length > 0) {
      setTimeout(() => {
        setMsgs(prev => {
          if (prev.some(m => m.content?.includes('просроченных задач'))) return prev;
          return [...prev, { role:'assistant', content:`⚠️ У вас ${overdue.length} просроченных задач` }];
        });
      }, 800);
    }
    const kzHour = (new Date().getUTCHours() + 5) % 24;
    if (kzHour >= 9 && kzHour < 10) {
      const { data: todayTasks } = await supabase.from('tasks')
        .select('id')
        .eq('assigned_to', user.username)
        .eq('due_date', today)
        .neq('status', 'done');
      if (todayTasks?.length > 0) {
        setTimeout(() => {
          setMsgs(prev => {
            if (prev.some(m => m.content?.includes('Доброе утро'))) return prev;
            return [...prev, { role:'assistant', content:`☀️ Доброе утро! Сегодня ${todayTasks.length} задач с дедлайном` }];
          });
        }, 1400);
      }
    }
  }

  const detectIntent = (text) => {
    if (/(оцен|выкуп|сколько дадите|сколько дашь)/i.test(text)) return 'assess';
    if (/(цен[ыа]|стоимость|прайс|почём|за сколько|сколько стоит)/i.test(text)) return 'price';
    if (/(характеристики|информация|обзор|что такое|опиши|\b(iphone|samsung|xiaomi|huawei|galaxy|redmi|poco|oppo|realme|honor|pixel|macbook|ipad|note \d|pro max|ultra|s\d+)\b)/i.test(text)) return 'device';
    return 'general';
  };

  function startVoiceHotkey() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'ru-RU'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      hotkeyRecording.current = false;
      sendText(transcript);
    };
    rec.onerror = () => { setListening(false); hotkeyRecording.current = false; };
    rec.onend = () => { setListening(false); hotkeyRecording.current = false; };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Голосовой ввод не поддерживается в этом браузере'); return; }
    const rec = new SR();
    rec.lang = 'ru-RU'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stopVoice = () => { recRef.current?.stop(); setListening(false); };

  const send = () => sendText(input);

  const sendText = async (txt) => {
    txt = (txt || '').trim();
    if (!txt || loading) return;

    // Напоминание
    const reminder = parseReminder(txt);
    if (reminder) {
      const reminders = JSON.parse(localStorage.getItem('skupka_reminders') || '[]');
      reminders.push(reminder);
      localStorage.setItem('skupka_reminders', JSON.stringify(reminders));
      const timeStr = txt.match(/(\d{1,2})[:.]+(\d{2})/)?.[0] || '';
      setMsgs(prev => [...prev, { role:'user', content:txt }, { role:'assistant', content:`⏰ Напоминание установлено на ${timeStr}: "${reminder.text}"` }]);
      setInput('');
      return;
    }

    // Навигация по CRM
    if (onNavigate) {
      if (/(открой|перейди).*(wazzup|канбан)/i.test(txt)) { onNavigate('board'); setMsgs(prev => [...prev, { role:'user', content:txt }, { role:'assistant', content:'✅ Открываю WAZZUP' }]); setInput(''); return; }
      if (/(открой|перейди).*(дашборд|dashboard)/i.test(txt)) { onNavigate('dashboard'); setMsgs(prev => [...prev, { role:'user', content:txt }, { role:'assistant', content:'✅ Открываю дашборд' }]); setInput(''); return; }
      if (/(открой|перейди).*(задач)/i.test(txt)) { onNavigate('tasks'); setMsgs(prev => [...prev, { role:'user', content:txt }, { role:'assistant', content:'✅ Открываю задачи' }]); setInput(''); return; }
      if (/(открой|перейди).*(касс)/i.test(txt)) { onNavigate('kassa'); setMsgs(prev => [...prev, { role:'user', content:txt }, { role:'assistant', content:'✅ Открываю кассу' }]); setInput(''); return; }
    }

    // Показать скрытый результат
    if (/покажи результат|открой результат/i.test(txt) && mode === 'hidden') {
      setMode('mini');
      setInput('');
      return;
    }

    // Внесение цены (Товаровед)
    const priceCmd = parsePriceCommand(txt);
    if (priceCmd) {
      const userMsg = { role:'user', content:txt };
      setMsgs(prev => [...prev, userMsg]);
      setInput('');
      if (!isTovarovyed) {
        setMsgs(prev => [...prev, { role:'assistant', content:'🚫 У вас нет прав для внесения цен. Обратитесь к руководителю.' }]);
        return;
      }
      setLoading(true);
      const { error } = await supabase.from('price_list').insert({ model: priceCmd.model, our_price: priceCmd.price, condition: 'хорошее', created_by: user?.username });
      if (!error) {
        const fmt = new Intl.NumberFormat('ru-KZ').format(priceCmd.price);
        setMsgs(prev => [...prev, { role:'assistant', content:`✅ Записал! **${priceCmd.model}** — ${fmt} ₸` }]);
      } else {
        setMsgs(prev => [...prev, { role:'assistant', content:'⚠️ Ошибка записи в базу цен' }]);
      }
      setLoading(false);
      return;
    }

    // Создание задачи через Supabase
    if (/(создай задач|новая задача|добавь задач)/i.test(txt)) {
      const titleMatch = txt.match(/задач[аую]\s+[«"]?([^»"]+?)[»"]?\s*(?:на|ответ|дедлайн|до|$)/i);
      const title = titleMatch?.[1]?.trim() || txt.replace(/(создай|новая|добавь)\s*задач[аую]?\s*/i, '').trim();
      if (title && user?.username) {
        const userMsg = { role:'user', content:txt };
        setMsgs(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        const { error } = await supabase.from('tasks').insert({
          title, created_by: user.username, assigned_to: user.username,
          status: 'todo', priority: 'medium',
        });
        if (!error) {
          setMsgs(prev => [...prev, { role:'assistant', content:`✅ Задача создана: **${title}**` }]);
        } else {
          setMsgs(prev => [...prev, { role:'assistant', content:`⚠️ Ошибка создания задачи: ${error.message}` }]);
        }
        setLoading(false);
        return;
      }
    }

    const userMsg = { role:'user', content:txt };
    const nextMsgs = [...msgs, userMsg];
    setMsgs(nextMsgs);
    setInput('');
    setLoading(true);
    setActive(true);

    // Persist to Supabase
    const { error: insErr } = await supabase.from('assistant_history').insert({ user_id: user?.id, role: 'user', message: txt });
    if (insErr) console.error('assistant_history insert user:', insErr);
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { error: delErr } = await supabase.from('assistant_history').delete().eq('user_id', user?.id).lt('created_at', cutoff);
    if (delErr) console.error('assistant_history delete:', delErr);

    try {
      const intent = detectIntent(txt);
      let extra = '';

      // CRM данные по запросу
      if (/(сколько заявок|заявк сегодня|заявок за)/i.test(txt)) {
        const today = new Date().toISOString().split('T')[0];
        const { data: todayLeads } = await supabase.from('leads').select('id,city,status').gte('created_at', today + 'T00:00:00');
        if (todayLeads) {
          extra += `\n\n📊 Заявки сегодня: ${todayLeads.length} всего`;
          const byCity = {};
          todayLeads.forEach(l => { byCity[l.city] = (byCity[l.city] || 0) + 1; });
          Object.entries(byCity).forEach(([c, n]) => { extra += `, ${c}: ${n}`; });
          const succ = todayLeads.filter(l => l.status === 'success').length;
          extra += `. Успешных: ${succ}. Конверсия: ${todayLeads.length > 0 ? Math.round(succ / todayLeads.length * 100) : 0}%`;
        }
        if (watchMode) setWatchLog(prev => [...prev, '📊 Читаю заявки из CRM...']);
      }

      if (/(задач|просроч)/i.test(txt)) {
        const { data: tasks } = await supabase.from('tasks')
          .select('id,title,due_date,status,assigned_to')
          .lt('due_date', new Date().toISOString().split('T')[0])
          .neq('status', 'done').limit(10);
        if (tasks?.length) {
          extra += `\n\n⚠️ Просроченные задачи (${tasks.length}):\n`;
          tasks.forEach(t => { extra += `• ${t.title} — ${t.assigned_to} (до ${t.due_date})\n`; });
        }
        if (watchMode) setWatchLog(prev => [...prev, '📋 Читаю задачи...']);
      }

      if (/(последн|новых|заявок).*(5|пять|несколько)/i.test(txt) || /(5|пять)\s*последн/i.test(txt)) {
        const { data: lastLeads } = await supabase.from('leads').select('client_name,device,city,status,created_at').eq('is_deleted', false).order('created_at', { ascending: false }).limit(5);
        if (lastLeads?.length) {
          extra += `\n\n📋 Последние 5 заявок:\n`;
          lastLeads.forEach(l => { extra += `• ${l.client_name} — ${l.device} (${l.city})\n`; });
        }
      }

      if (/(смен|отметк|вышел на смену)/i.test(txt)) {
        const today = new Date().toISOString().split('T')[0];
        const { data: shifts } = await supabase.from('shifts_spo').select('user_id,checked_at').gte('checked_at', today + 'T00:00:00');
        if (shifts) extra += `\n\n🕐 Отметились сегодня: ${shifts.length} сотрудников`;
        if (watchMode) setWatchLog(prev => [...prev, '🕐 Читаю данные смен...']);
      }

      if (intent === 'assess' || intent === 'price' || intent === 'device') {
        const kw = txt.replace(/(оцени|цены|цена|на|в|хорошем|плохом|состоянии|состояние|отличном|новый|новая|б\/у|бу|оценка)/gi, '').trim().split(/\s+/).slice(0, 2).join(' ');
        const [{ data: prevDeals }, { data: ourPrices }] = await Promise.all([
          supabase.from('leads').select('device, estimate_amount, created_at').ilike('device', `%${kw}%`).not('estimate_amount', 'is', null).order('created_at', { ascending:false }).limit(5),
          supabase.from('price_list').select('*').ilike('model', `%${kw}%`).limit(5),
        ]);
        if (prevDeals?.length) {
          extra += '\n\n📊 История оценок SKUPKA:\n';
          prevDeals.forEach(d => { extra += `• ${d.device}: ${new Intl.NumberFormat('ru-KZ').format(d.estimate_amount)} ₸ (${new Date(d.created_at).toLocaleDateString('ru-RU')})\n`; });
        }
        if (ourPrices?.length) {
          extra += '\n📋 Наша база цен:\n';
          ourPrices.forEach(p => { extra += `• ${p.model} (${p.condition}): ${new Intl.NumberFormat('ru-KZ').format(p.our_price)} ₸\n`; });
        }
        if (watchMode) setWatchLog(prev => [...prev, '🔍 Ищу цены на OLX.kz...']);
      }

      const cityExtra = city !== 'Общий'
        ? `\nПользователь ищет цены в городе ${city}, Казахстан.`
        : '';

      if (watchMode) setWatchLog(prev => [...prev, '⚡ Отправляю запрос к AI...']);

      const response = await fetch(`${API}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMsgs.map(m => ({ role: m.role, content: m.content })),
          extra: extra + cityExtra,
          intent,
          currentUser: user ? { id: user.id, name: user.name, role: user.role, cities: user.cities } : null,
        }),
      });

      if (!response.ok) {
        let errMsg = `Ошибка сервера: ${response.status}`;
        try { const errData = await response.json(); errMsg = errData.error || errMsg; } catch {}
        throw new Error(errMsg);
      }

      const contentType = response.headers.get('content-type') || '';
      let botReply = '';

      if (contentType.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // If window is open, stream text in real-time
        const isOpen = mode !== 'hidden';
        if (isOpen) {
          setMsgs(prev => [...prev, { role:'assistant', content:'' }]);
        }

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                botReply += parsed.text;
                if (isOpen) {
                  setMsgs(prev => {
                    const m = [...prev];
                    m[m.length - 1] = { role:'assistant', content: botReply };
                    return m;
                  });
                }
              }
            } catch {}
          }
        }

        if (!isOpen) {
          // Hidden mode — badge notification, add to msgs (will show when opened)
          setMsgs(prev => [...prev, { role:'assistant', content: botReply }]);
          setHiddenBadge(true);
        }
      } else {
        // JSON fallback
        const data = await response.json();
        botReply = data.response || data.error || 'Нет ответа';
        if (mode === 'hidden') {
          setMsgs(prev => [...prev, { role:'assistant', content: botReply }]);
          setHiddenBadge(true);
        } else {
          setMsgs(prev => [...prev, { role:'assistant', content: botReply }]);
        }
      }

      // Persist bot response
      if (botReply) {
        const { error: botInsErr } = await supabase.from('assistant_history').insert({ user_id: user?.id, role: 'assistant', message: botReply });
        if (botInsErr) console.error('assistant_history insert bot:', botInsErr);
      }

      if (watchMode) setWatchLog(prev => [...prev, '✅ Ответ получен']);

    } catch (err) {
      const errText = err?.message || 'Неизвестная ошибка';
      console.error('[CrmAssistant] Ошибка:', errText);
      const errMsg = { role:'assistant', content:`⚠️ Ошибка: ${errText}` };
      setMsgs(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content === '') {
          const m = [...prev]; m[m.length - 1] = errMsg; return m;
        }
        return [...prev, errMsg];
      });
    }

    setLoading(false);
    setActive(false);
  };

  const isOpen = mode !== 'hidden';
  const isFull = mode === 'full';
  const W = isFull ? '100vw' : 420;
  const H = isFull ? '100vh' : 580;
  const B = isFull ? 0 : 90;
  const R = isFull ? 0 : 24;
  const BR = isFull ? 0 : 21;

  return (
    <>
      <style>{ANIM}</style>

      {/* Floating toggle button */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:1002 }}>
        <button
          className={`crm-btn${active ? ' thinking' : ''}`}
          onClick={() => {
            if (mode === 'hidden') setMode('mini');
            else if (mode === 'mini') setMode('hidden');
            else setMode('mini');
          }}
          title={isOpen ? 'Свернуть ассистент' : 'Открыть ассистент SKUPKA AI (Ё — голос)'}
        >
          <div className="crm-core" />
          <div className="crm-ring crm-ring-1" />
          <div className="crm-ring crm-ring-2" />
          <div className="crm-ring crm-ring-3" />
          <div className="crm-ring crm-ring-4" />
          <div className="crm-ring crm-ring-5" />
          {isOpen && (
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', color:'rgba(255,255,255,0.92)', fontSize:18, fontWeight:400, pointerEvents:'none', userSelect:'none', zIndex:20 }}>✕</div>
          )}
          {/* Badge: unread result in hidden mode */}
          {!isOpen && hiddenBadge && (
            <div style={{ position:'absolute', top:2, right:2, width:14, height:14, background:'#E8263A', borderRadius:'50%', border:'2px solid #0a0a0f', zIndex:20, animation:'orb-badge 1s ease-in-out infinite' }} />
          )}
          {listening && (
            <div style={{ position:'absolute', bottom:-8, left:'50%', transform:'translateX(-50%)', background:'#ef4444', borderRadius:10, fontSize:8, color:'#fff', padding:'2px 5px', zIndex:20, whiteSpace:'nowrap' }}>🎤 REC</div>
          )}
        </button>
      </div>

      {/* Chat window */}
      {isOpen && (
        <div style={{ position:'fixed', bottom:B, right:R, width:W, height:H, zIndex:1001, background:t.surface+'ee', border:'1px solid rgba(255,255,255,0.10)', borderRadius:BR, backdropFilter:'blur(20px)', boxShadow:'0 24px 80px rgba(0,0,0,0.55)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${t.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:`linear-gradient(135deg,rgba(232,38,58,0.06),transparent)`, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {/* Mini orbital in header */}
              <div style={{ position:'relative', width:34, height:34, perspective:'200px', flexShrink:0 }}>
                <div style={{ position:'absolute', top:'50%', left:'50%', width:28, height:10, borderRadius:'50%', border:`1.5px solid rgba(0,229,255,${active?0.8:0.55})`, animation:`fly-1 ${active?'1.5':'5'}s linear infinite`, pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:'50%', left:'50%', width:28, height:10, borderRadius:'50%', border:`1.5px solid rgba(0,229,255,${active?0.55:0.35})`, animation:`fly-3 ${active?'1.8':'7'}s linear infinite`, pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:11, height:11, borderRadius:'50%', background:'radial-gradient(circle,#00E5FF,#007a9a)', animation:active?'core-active 0.5s ease-in-out infinite':'core-pulse 3s ease-in-out infinite' }} />
              </div>
              <div>
                <div style={{ fontFamily:'Unbounded,sans-serif', fontSize:11, fontWeight:700, color:'#E8263A' }}>SKUPKA AI</div>
                <div style={{ fontSize:10, color: loading ? '#f59e0b' : listening ? '#ef4444' : '#10b981', marginTop:1 }}>
                  {loading ? '⚡ Думаю...' : listening ? '🎤 Слушаю...' : '🟢 Онлайн'}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {isFull && (
                <button onClick={() => setWatchMode(v => !v)} title="Режим наблюдения" style={{ background:watchMode?'rgba(0,229,255,0.12)':'transparent', border:`1px solid ${watchMode?'rgba(0,229,255,0.5)':t.border}`, borderRadius:8, color:watchMode?'#00E5FF':t.text2, fontSize:14, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  👁️
                </button>
              )}
              <button onClick={() => setMode(isFull ? 'mini' : 'full')} title={isFull ? 'Свернуть' : 'На весь экран'} style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:13, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {isFull ? '⊡' : '⊞'}
              </button>
              <button onClick={() => setMsgs([{ role:'assistant', content:WELCOME }])} title="Очистить чат" style={{ background:'transparent', border:`1px solid ${t.border}`, borderRadius:8, color:t.text2, fontSize:11, width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                🗑
              </button>
            </div>
          </div>

          {/* Observation log (fullscreen only) */}
          {watchMode && isFull && watchLog.length > 0 && (
            <div style={{ padding:'6px 14px', borderBottom:`1px solid ${t.border}`, background:'rgba(0,229,255,0.04)', maxHeight:72, overflowY:'auto', flexShrink:0 }}>
              {watchLog.slice(-5).map((log, i) => (
                <div key={i} style={{ fontSize:11, color:'#00E5FF', lineHeight:1.7 }}>{log}</div>
              ))}
            </div>
          )}

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
                <div style={{ width:20, height:20, borderRadius:'50%', background:'#00E5FF', boxShadow:'0 0 8px #00E5FF,0 0 16px rgba(0,229,255,0.5)', flexShrink:0, animation:'core-pulse 1.5s ease-in-out infinite' }} />
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
              placeholder={listening ? '🎤 Говорите...' : 'Спросите что-нибудь... (Ё — голос)'}
              style={{ flex:1, background:t.inputBg, border:`1px solid ${t.border}`, borderRadius:10, color:t.text, fontSize:13, padding:'9px 12px', outline:'none', fontFamily:'Inter,sans-serif' }}
            />
            <button
              onClick={listening ? stopVoice : startVoice}
              title={listening ? 'Остановить' : 'Голосовой ввод'}
              style={{ background:listening?'rgba(239,68,68,0.15)':'transparent', border:`1px solid ${listening?'#ef4444':t.border}`, borderRadius:10, color:listening?'#ef4444':t.text2, fontSize:16, width:40, height:40, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}
            >
              🎤
            </button>
            <button
              onClick={send}
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
