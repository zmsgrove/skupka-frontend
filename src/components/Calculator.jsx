import React, { useState, useEffect } from 'react';

export default function Calculator({ theme, onClose }) {
  const t = theme;
  const [display, setDisplay] = useState('0');
  const [prev, setPrev]       = useState(null);
  const [op, setOp]           = useState(null);
  const [reset, setReset]     = useState(false);
  const [history, setHistory] = useState([]);
  const [expression, setExpression] = useState('');

  useEffect(() => {
    const handle = (e) => {
      const k = e.key;
      if (k>='0'&&k<='9') handleNum(k);
      else if (k==='.') handleDot();
      else if (k==='+'||k==='-'||k==='*'||k==='/') handleOp(k==='*'?'×':k==='/'?'÷':k);
      else if (k==='Enter'||k==='=') handleEquals();
      else if (k==='Backspace') handleBack();
      else if (k==='Escape') { handleClear(); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [display, prev, op, reset]);

  const handleNum = (n) => {
    if (reset) { setDisplay(n); setReset(false); }
    else setDisplay(display==='0' ? n : display.length<15 ? display+n : display);
  };
  const handleDot = () => {
    if (reset) { setDisplay('0.'); setReset(false); return; }
    if (!display.includes('.')) setDisplay(display+'.');
  };
  const handleOp = (o) => {
    const val = parseFloat(display);
    if (prev!==null && op && !reset) {
      const result = calc(prev, val, op);
      setDisplay(String(result));
      setPrev(result);
      setExpression(`${result} ${o}`);
    } else {
      setPrev(val);
      setExpression(`${display} ${o}`);
    }
    setOp(o); setReset(true);
  };
  const handleEquals = () => {
    if (prev===null||op===null) return;
    const val = parseFloat(display);
    const result = calc(prev, val, op);
    const expr = `${expression} ${display} = ${result}`;
    setHistory(h => [expr, ...h.slice(0,9)]);
    setDisplay(String(result));
    setPrev(null); setOp(null); setReset(true); setExpression('');
  };
  const handleClear = () => { setDisplay('0'); setPrev(null); setOp(null); setReset(false); setExpression(''); };
  const handleBack  = () => { if (reset||display.length===1) { setDisplay('0'); setReset(false); } else setDisplay(display.slice(0,-1)||'0'); };
  const handleSign  = () => setDisplay(String(-parseFloat(display)));
  const handlePct   = () => setDisplay(String(parseFloat(display)/100));

  function calc(a, b, o) {
    let r;
    if (o==='+') r=a+b;
    else if (o==='-') r=a-b;
    else if (o==='×') r=a*b;
    else if (o==='÷') r=b!==0?a/b:0;
    else r=b;
    return Math.round(r*1e10)/1e10;
  }

  const BTN_ROWS = [
    [{l:'C',type:'clear'},{l:'+/-',type:'fn'},{l:'%',type:'fn'},{l:'÷',type:'op'}],
    [{l:'7'},{l:'8'},{l:'9'},{l:'×',type:'op'}],
    [{l:'4'},{l:'5'},{l:'6'},{l:'-',type:'op'}],
    [{l:'1'},{l:'2'},{l:'3'},{l:'+',type:'op'}],
    [{l:'0',wide:true},{l:'.'},{l:'=',type:'eq'}],
  ];

  const btnBg = (b) => {
    if (b.type==='clear'||b.type==='fn') return t.surface2;
    if (b.type==='op') return op===b.l&&reset ? '#fff' : '#f0b429';
    if (b.type==='eq') return '#f0b429';
    return t.surface;
  };
  const btnColor = (b) => {
    if (b.type==='clear'||b.type==='fn') return t.text;
    if (b.type==='op') return op===b.l&&reset ? '#f0b429' : '#0f0f13';
    if (b.type==='eq') return '#0f0f13';
    return t.text;
  };

  const handleBtn = (b) => {
    if (b.l==='C') handleClear();
    else if (b.l==='+/-') handleSign();
    else if (b.l==='%') handlePct();
    else if (b.l==='=') handleEquals();
    else if (['+','-','×','÷'].includes(b.l)) handleOp(b.l);
    else if (b.l==='.') handleDot();
    else handleNum(b.l);
  };

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:1000}}/>
      <div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:1001,display:'flex',gap:0,borderRadius:20,overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,0.5)',border:`1px solid ${t.border}`}}>

        {/* Калькулятор */}
        <div style={{width:280,background:'#1a1a22',display:'flex',flexDirection:'column'}}>
          {/* Display */}
          <div style={{padding:'20px 20px 12px',display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
            <div style={{color:'#9090a8',fontSize:13,minHeight:20}}>{expression}</div>
            <div style={{color:'#f0f0f5',fontFamily:'Unbounded,sans-serif',fontSize:display.length>10?24:32,fontWeight:300,wordBreak:'break-all',textAlign:'right'}}>{display}</div>
          </div>
          {/* Buttons */}
          <div style={{padding:'0 12px 16px',display:'flex',flexDirection:'column',gap:8}}>
            {BTN_ROWS.map((row,ri)=>(
              <div key={ri} style={{display:'flex',gap:8}}>
                {row.map(b=>(
                  <button key={b.l} onClick={()=>handleBtn(b)} style={{
                    flex:b.wide?2:1,height:60,borderRadius:14,border:'none',
                    background:btnBg(b),color:btnColor(b),
                    fontSize:b.type?20:22,fontWeight:400,cursor:'pointer',
                    fontFamily:'Inter,sans-serif',transition:'opacity 0.1s',
                  }}
                  onMouseDown={e=>e.currentTarget.style.opacity='0.7'}
                  onMouseUp={e=>e.currentTarget.style.opacity='1'}
                  >{b.l}</button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* История */}
        <div style={{width:200,background:t.surface,borderLeft:`1px solid ${t.border}`,display:'flex',flexDirection:'column'}}>
          <div style={{padding:'14px 16px',borderBottom:`1px solid ${t.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontFamily:'Unbounded,sans-serif',fontSize:10,color:t.text2}}>ИСТОРИЯ</span>
            <button onClick={onClose} style={{background:'transparent',border:'none',color:t.text2,fontSize:16,cursor:'pointer'}}>✕</button>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
            {history.length===0&&<div style={{color:t.text2,fontSize:12,textAlign:'center',padding:'20px 16px'}}>Пусто</div>}
            {history.map((h,i)=>(
              <div key={i} style={{padding:'8px 16px',borderBottom:`1px solid ${t.border}22`,color:t.text2,fontSize:11,lineHeight:1.4}}>{h}</div>
            ))}
          </div>
          {history.length>0&&(
            <button onClick={()=>setHistory([])} style={{margin:'8px 16px',background:'transparent',border:`1px solid ${t.border}`,borderRadius:8,color:t.text2,fontSize:11,padding:'6px',cursor:'pointer'}}>
              Очистить историю
            </button>
          )}
        </div>
      </div>
    </>
  );
}
