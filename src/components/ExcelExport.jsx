import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_LABELS = { new:'Новый', in_progress:'В работе', waiting:'Ждём на филиал', success:'Успешно', fail:'Провал' };
const CITY_COLORS_HEX = { 'Атырау':'FFF3CD', 'Актобе':'D1ECF1', 'Уральск':'E2D9F3' };
const STATUS_COLORS_HEX = { new:'D1ECF1', in_progress:'E2D9F3', waiting:'FFF3CD', success:'D4EDDA', fail:'F8D7DA' };

function fmt(n) { return n ? new Intl.NumberFormat('ru-KZ').format(Math.round(n)) : '—'; }

export default function ExcelExport({ user, theme }) {
  const t = theme;
  const [period, setPeriod] = useState('today');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const canExport = ['admin','dir','zamdir','sysadmin','rev'].includes(user.role) ||
    ['zmsgrove','maksatovs','koshab','kylyshbaenam','revizor','aleksandrovd','aminovn'].includes(user.username);

  if (!canExport) return null;

  function getPeriodDates() {
    const now = new Date();
    if (period === 'today') {
      return { from: now.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    } else if (period === 'week') {
      const from = new Date(now); from.setDate(from.getDate()-7);
      return { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    } else if (period === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    } else {
      return { from: fromDate, to: toDate };
    }
  }

  async function handleExport() {
    setLoading(true);
    try {
      const { from, to } = getPeriodDates();
      const city = user.cities.length === 1 ? user.cities[0] : undefined;
      const { data: leads } = await axios.get(`${API}/api/export`, { params: { from, to, city } });

      const wb = XLSX.utils.book_new();

      // ── Лист 1: Детальная таблица ────────────────────────────────────────
      const headers = ['№','Дата','Имя клиента','Телефон','Город','Техника','Статус','Сумма оценки (₸)','№ договора','Причина провала','Дата визита'];
      const rows = leads.map((l, i) => [
        i+1,
        new Date(l.created_at).toLocaleString('ru-RU'),
        l.client_name, l.phone, l.city, l.device,
        STATUS_LABELS[l.status]||l.status,
        l.estimate_amount ? Number(l.estimate_amount) : '',
        l.contract_number||'',
        l.fail_comment||'',
        l.visit_date ? new Date(l.visit_date).toLocaleDateString('ru-RU') : '',
      ]);

      const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Ширина колонок
      ws1['!cols'] = [
        {wch:5},{wch:18},{wch:22},{wch:16},{wch:12},{wch:25},
        {wch:16},{wch:16},{wch:14},{wch:25},{wch:14}
      ];

      // Стили заголовка
      const headerRange = XLSX.utils.decode_range(ws1['!ref']);
      for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
        const cell = XLSX.utils.encode_cell({r:0, c});
        if (!ws1[cell]) continue;
        ws1[cell].s = { font:{bold:true,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1A1A2E'}}, alignment:{horizontal:'center',vertical:'center'} };
      }

      // Цвета строк по статусу
      rows.forEach((row, i) => {
        const status = leads[i].status;
        const color = STATUS_COLORS_HEX[status] || 'FFFFFF';
        for (let c = 0; c <= headers.length-1; c++) {
          const cell = XLSX.utils.encode_cell({r:i+1, c});
          if (!ws1[cell]) ws1[cell] = {v:'', t:'s'};
          ws1[cell].s = { fill:{fgColor:{rgb:color}}, border:{ bottom:{style:'thin',color:{rgb:'E2E8F0'}} } };
        }
      });

      // Итоговая строка
      const successLeads = leads.filter(l=>l.status==='success');
      const totalAmount = successLeads.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0);
      const totalRow = [leads.length,'','','','','','ИТОГО:', totalAmount, '', '', ''];
      XLSX.utils.sheet_add_aoa(ws1, [totalRow], { origin: leads.length+1 });
      const totalCell = XLSX.utils.encode_cell({r:leads.length+1, c:0});
      ws1[totalCell].s = { font:{bold:true}, fill:{fgColor:{rgb:'FFF3CD'}} };

      XLSX.utils.book_append_sheet(wb, ws1, '📋 Заявки');

      // ── Лист 2: Сводная статистика ───────────────────────────────────────
      const cities = city ? [city] : ['Атырау','Актобе','Уральск'];
      const statsHeaders = ['Город','Всего заявок','Успешно','Провал','В работе','Ждём на филиал','Конверсия (%)','Сумма сделок (₸)','Средний чек (₸)'];
      const statsRows = cities.map(c => {
        const cl = leads.filter(l=>l.city===c);
        const succ = cl.filter(l=>l.status==='success');
        const amount = succ.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0);
        return [
          c, cl.length, succ.length,
          cl.filter(l=>l.status==='fail').length,
          cl.filter(l=>l.status==='in_progress').length,
          cl.filter(l=>l.status==='waiting').length,
          cl.length>0 ? Math.round(succ.length/cl.length*100) : 0,
          amount, succ.length>0 ? Math.round(amount/succ.length) : 0,
        ];
      });
      // Итого
      const allSucc = leads.filter(l=>l.status==='success');
      const allAmount = allSucc.reduce((s,l)=>s+(Number(l.estimate_amount)||0),0);
      statsRows.push(['ИТОГО', leads.length, allSucc.length,
        leads.filter(l=>l.status==='fail').length,
        leads.filter(l=>l.status==='in_progress').length,
        leads.filter(l=>l.status==='waiting').length,
        leads.length>0?Math.round(allSucc.length/leads.length*100):0,
        allAmount, allSucc.length>0?Math.round(allAmount/allSucc.length):0
      ]);

      const ws2 = XLSX.utils.aoa_to_sheet([statsHeaders, ...statsRows]);
      ws2['!cols'] = [{wch:14},{wch:14},{wch:12},{wch:10},{wch:12},{wch:16},{wch:14},{wch:18},{wch:16}];

      // Стили для сводки
      statsRows.forEach((row, i) => {
        const cityColor = CITY_COLORS_HEX[row[0]] || (i===statsRows.length-1?'FFF3CD':'FFFFFF');
        for (let c=0; c<statsHeaders.length; c++) {
          const cell = XLSX.utils.encode_cell({r:i+1,c});
          if (!ws2[cell]) ws2[cell]={v:'',t:'s'};
          ws2[cell].s = { fill:{fgColor:{rgb:cityColor}}, font:{ bold: i===statsRows.length-1 } };
        }
      });

      XLSX.utils.book_append_sheet(wb, ws2, '📊 Сводка');

      // ── Лист 3: Данные для графика по дням ───────────────────────────────
      const dayMap = {};
      leads.forEach(l => {
        const day = new Date(l.created_at).toLocaleDateString('ru-RU');
        if (!dayMap[day]) dayMap[day] = { total:0, success:0, fail:0, amount:0 };
        dayMap[day].total++;
        if (l.status==='success') { dayMap[day].success++; dayMap[day].amount += Number(l.estimate_amount)||0; }
        if (l.status==='fail') dayMap[day].fail++;
      });

      const chartHeaders = ['Дата','Всего заявок','Успешно','Провал','Сумма (₸)'];
      const chartRows = Object.entries(dayMap).map(([date,d])=>[date,d.total,d.success,d.fail,d.amount]);
      const ws3 = XLSX.utils.aoa_to_sheet([chartHeaders,...chartRows]);
      ws3['!cols'] = [{wch:14},{wch:14},{wch:12},{wch:10},{wch:16}];

      // Встроенная диаграмма (как объект)
      if (chartRows.length > 0) {
        ws3['!charts'] = [{
          type: 'bar',
          series: [
            { name:'Успешно', col:2, color:'10b981' },
            { name:'Провал', col:3, color:'ef4444' },
            { name:'Всего', col:1, color:'3b82f6' },
          ],
          categoryCol: 0,
          title: 'Динамика заявок по дням',
          position: { r:1, c:6, rowspan:15, colspan:8 }
        }];
      }

      XLSX.utils.book_append_sheet(wb, ws3, '📈 По дням');

      // ── Лист 4: Круговая по статусам ─────────────────────────────────────
      const statusData = [
        ['Статус','Количество','Доля (%)'],
        ['Новые', leads.filter(l=>l.status==='new').length, ''],
        ['В работе', leads.filter(l=>l.status==='in_progress').length, ''],
        ['Ждём на филиал', leads.filter(l=>l.status==='waiting').length, ''],
        ['Успешно', leads.filter(l=>l.status==='success').length, ''],
        ['Провал', leads.filter(l=>l.status==='fail').length, ''],
      ];
      statusData.slice(1).forEach(row => {
        row[2] = leads.length > 0 ? `${Math.round(row[1]/leads.length*100)}%` : '0%';
      });

      const ws4 = XLSX.utils.aoa_to_sheet(statusData);
      ws4['!cols'] = [{wch:18},{wch:14},{wch:10}];
      const statusColors = ['D1ECF1','E2D9F3','FFF3CD','D4EDDA','F8D7DA'];
      statusData.slice(1).forEach((_,i) => {
        const cell = XLSX.utils.encode_cell({r:i+1,c:0});
        if (ws4[cell]) ws4[cell].s = { fill:{fgColor:{rgb:statusColors[i]}}, font:{bold:true} };
      });

      XLSX.utils.book_append_sheet(wb, ws4, '🥧 По статусам');

      // ── Мета-лист: Информация об отчёте ──────────────────────────────────
      const meta = [
        ['SKUPKA CRM — Отчёт по заявкам'],
        [''],
        ['Период:', period==='custom' ? `${fromDate} — ${toDate}` : period==='today'?'Сегодня':period==='week'?'Неделя':'Месяц'],
        ['Дата формирования:', new Date().toLocaleString('ru-RU')],
        ['Сформировал:', user.name],
        ['Город:', city || 'Все города'],
        ['Всего заявок:', leads.length],
        ['Успешных сделок:', allSucc.length],
        ['Общая сумма:', `${fmt(allAmount)} ₸`],
        ['Конверсия:', `${leads.length>0?Math.round(allSucc.length/leads.length*100):0}%`],
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(meta);
      ws5['!cols'] = [{wch:24},{wch:30}];
      ws5['A1'].s = { font:{bold:true,sz:14,color:{rgb:'1A1A2E'}}, fill:{fgColor:{rgb:'FFF3CD'}} };
      XLSX.utils.book_append_sheet(wb, ws5, 'ℹ️ О отчёте');

      // Сохранить
      const periodLabel = period==='today'?'сегодня':period==='week'?'неделя':period==='month'?'месяц':`${fromDate}_${toDate}`;
      XLSX.writeFile(wb, `SKUPKA_отчёт_${periodLabel}_${new Date().toISOString().split('T')[0]}.xlsx`);
      setShow(false);
    } catch(e) {
      console.error(e);
      alert('Ошибка формирования отчёта');
    }
    setLoading(false);
  }

  return (
    <>
      <button onClick={() => setShow(true)} style={{
        background: t.surface2, border:`1px solid ${t.border}`,
        borderRadius:10, color:t.text, fontSize:12, padding:'7px 14px',
        cursor:'pointer', display:'flex', alignItems:'center', gap:6,
        fontFamily:'Inter,sans-serif',
      }}>
        📥 Выгрузить Excel
      </button>

      {show && (
        <div style={{ position:'fixed',inset:0,background:t.overlayBg,display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,backdropFilter:'blur(4px)' }}>
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:20,padding:28,width:'100%',maxWidth:440,boxShadow:t.shadow }}>
            <div style={{ fontFamily:'Unbounded,sans-serif',fontSize:16,fontWeight:700,color:t.text,marginBottom:4 }}>📥 Выгрузка в Excel</div>
            <div style={{ color:t.text2,fontSize:13,marginBottom:20 }}>5 листов: заявки, сводка, динамика, статусы, инфо</div>

            <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom:20 }}>
              <div style={{ color:t.text2,fontSize:12,fontWeight:600,textTransform:'uppercase',letterSpacing:0.5 }}>Период</div>
              <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                {[['today','Сегодня'],['week','Неделя'],['month','Месяц'],['custom','Период']].map(([val,label]) => (
                  <button key={val} onClick={() => setPeriod(val)} style={{
                    border:`1px solid ${period===val?'#E8263A':t.border}`,
                    background: period===val?'rgba(232,38,58,0.15)':'transparent',
                    color: period===val?'#E8263A':t.text2,
                    borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer',
                  }}>{label}</button>
                ))}
              </div>
              {period === 'custom' && (
                <div style={{ display:'flex',gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ color:t.text2,fontSize:11,marginBottom:4 }}>С</div>
                    <input type="date" style={inputS(t)} value={fromDate} onChange={e=>setFromDate(e.target.value)} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:t.text2,fontSize:11,marginBottom:4 }}>По</div>
                    <input type="date" style={inputS(t)} value={toDate} onChange={e=>setToDate(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ background:t.surface2,border:`1px solid ${t.border}`,borderRadius:10,padding:12,marginBottom:20 }}>
              <div style={{ color:t.text,fontSize:12,fontWeight:600,marginBottom:6 }}>Что войдёт в отчёт:</div>
              {['📋 Лист 1: Все заявки с деталями и цветами','📊 Лист 2: Сводная статистика по городам','📈 Лист 3: Динамика заявок по дням','🥧 Лист 4: Распределение по статусам','ℹ️ Лист 5: Информация об отчёте'].map(item => (
                <div key={item} style={{ color:t.text2,fontSize:12,padding:'2px 0' }}>✓ {item}</div>
              ))}
            </div>

            <div style={{ display:'flex',gap:10 }}>
              <button onClick={() => setShow(false)} style={{ flex:1,background:'transparent',border:`1px solid ${t.border}`,borderRadius:10,color:t.text2,fontSize:13,padding:'11px',cursor:'pointer' }}>
                Отмена
              </button>
              <button onClick={handleExport} disabled={loading||(period==='custom'&&(!fromDate||!toDate))} style={{ flex:2,background:'#E8263A',border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:700,padding:'11px',cursor:'pointer',fontFamily:'Unbounded,sans-serif',opacity:loading?0.7:1 }}>
                {loading ? '⏳ Формируем...' : '📥 Скачать Excel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function inputS(t) {
  return { background:t.inputBg,border:`1px solid ${t.border}`,borderRadius:8,color:t.text,fontSize:13,padding:'8px 10px',outline:'none',width:'100%' };
}
