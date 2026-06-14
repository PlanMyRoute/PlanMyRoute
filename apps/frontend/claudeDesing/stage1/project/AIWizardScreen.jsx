// PlanMyRoute — AI Trip-Creation Wizard (6-step flow)
const DS = window.DS;
const C = DS.color, F = DS.font, R = DS.radius;
const { useState, useEffect } = React;

// ─── Helpers ───────────────────────────────────────────────────────────────
const StepPane = ({ active, children }) => (
  <div style={{ position:'absolute', inset:0, overflowY:'auto', opacity:active?1:0, transform:active?'translateX(0)':'translateX(16px)', pointerEvents:active?'auto':'none', transition:'opacity .22s ease,transform .22s ease' }}>
    <div style={{ padding:'22px 20px 120px' }}>{children}</div>
  </div>
);

const WizHeading = ({ title, sub }) => (
  <div style={{ marginBottom:26 }}>
    <div style={{ fontFamily:F.display, fontWeight:800, fontSize:25, color:C.ink, letterSpacing:'-.025em', lineHeight:1.2 }}>{title}</div>
    {sub && <div style={{ fontFamily:F.body, fontSize:15, color:C.ink2, marginTop:8, lineHeight:1.5 }}>{sub}</div>}
  </div>
);

const Pill = ({ label, selected, onClick }) => (
  <button onClick={onClick} style={{ fontFamily:F.body, fontWeight:600, fontSize:13.5, padding:'9px 15px', borderRadius:R.pill, border:`1.5px solid ${selected?C.primary:C.line}`, background:selected?C.primaryBg:'transparent', color:selected?C.primary:C.ink2, cursor:'pointer', transition:'.15s', flexShrink:0 }}>{label}</button>
);

const VibeCard = ({ iconName, label, sub, selected, onClick }) => {
  const { Icon } = window;
  return (
    <button onClick={onClick} style={{ width:'calc(50% - 5px)', padding:'15px 12px', border:`1.5px solid ${selected?C.primary:C.line}`, borderRadius:R.md, background:selected?C.primaryBg:C.surface, cursor:'pointer', textAlign:'left', transition:'.15s', boxSizing:'border-box' }}>
      <Icon name={iconName} size={22} color={selected?C.primary:C.ink2} sw={2} />
      <div style={{ fontFamily:F.body, fontWeight:700, fontSize:13.5, color:selected?C.primary:C.ink, marginTop:8, lineHeight:1.3 }}>{label}</div>
      <div style={{ fontFamily:F.body, fontSize:12, color:C.ink2, marginTop:3, lineHeight:1.4 }}>{sub}</div>
    </button>
  );
};

// ─── Main wizard component ─────────────────────────────────────────────────
const AIWizardScreen = ({ onClose }) => {
  const { Icon, StatusBar, StopRow, DayLabel } = window;

  const [step, setStep]         = useState(0);
  const [dest, setDest]         = useState('');
  const [duration, setDuration] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [travelers, setTravelers] = useState(['Maya']);
  const [addName, setAddName]   = useState('');
  const [vibe, setVibe]         = useState(null);
  const [budget, setBudget]     = useState('mid');
  const [genPct, setGenPct]     = useState(0);
  const [genMsg, setGenMsg]     = useState(0);

  const GEN_MSGS = ['Mapping the route…', 'Finding hidden gems…', 'Scheduling stops…', 'Building your itinerary…'];

  useEffect(() => {
    if (step !== 4) return;
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(p + Math.random() * 9 + 3, 100);
      setGenPct(Math.round(p));
      setGenMsg(Math.min(Math.floor(p / 25), 3));
      if (p >= 100) { clearInterval(iv); setTimeout(() => setStep(5), 700); }
    }, 220);
    return () => clearInterval(iv);
  }, [step]);

  const canNext = [dest.trim().length > 0, !!duration, travelers.length > 0, !!vibe, false, true][step];

  const next = () => { if (step < 4) setStep(s => s + 1); };
  const back = () => { if (step > 0 && step < 4) setStep(s => s - 1); else if (step === 0) onClose(); };

  const RESULT_DAYS = [
    { label:'Day 1 — Arrival', stops:[
      { type:'accommodation', name:'Ace Hotel Portland',  meta:'2 nights · est. $190/night', confirmed:true },
      { type:'food',          name:'Pine Street Market',  meta:'Dinner · est. $40/person', time:'7:30 PM' },
    ]},
    { label:'Day 2 — Explore', stops:[
      { type:'activity', name:'Multnomah Falls hike',   meta:'3 hrs · free entry', time:'9:00 AM' },
      { type:'food',     name:'Lardo Sandwich Shop',    meta:'Lunch · est. $18/person', time:'12:30 PM' },
      { type:'activity', name:"Powell's City of Books", meta:'1.5 hrs · free', time:'3:00 PM' },
    ]},
    { label:'Day 3 — Road out', stops:[
      { type:'fuel',         name:'Refuel — I-84 east',    meta:'Split between travelers', cost:'$55.00', confirmed:true },
      { type:'activity',     name:'Columbia River Gorge',  meta:'Scenic drive · 2 hrs', time:'11:00 AM' },
      { type:'accommodation',name:'Hood River Inn',        meta:'1 night · est. $220/night', confirmed:true },
    ]},
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.surface }}>
      <style>{`@keyframes gradSpin{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
      <StatusBar />

      {/* Progress header */}
      <div style={{ padding:'2px 16px 16px', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <button onClick={back} style={{ background:'none', border:'none', cursor:'pointer', padding:8, margin:-8, flexShrink:0 }}>
          <Icon name={step===0?'close':'back'} size={22} color={C.ink} sw={2} />
        </button>
        {step < 4 && (
          <>
            <div style={{ flex:1, display:'flex', gap:5 }}>
              {[0,1,2,3].map(i => <div key={i} style={{ height:3, flex:1, borderRadius:3, background:i<=step?C.primary:C.line, transition:'background .3s' }} />)}
            </div>
            <span style={{ fontFamily:F.mono, fontSize:11, color:C.ink3, flexShrink:0 }}>{step+1}/4</span>
          </>
        )}
      </div>

      {/* Steps */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>

        {/* 0 — Destination */}
        <StepPane active={step===0}>
          <WizHeading title="Where's this trip going?" sub="Type a destination, region, or describe your dream drive." />
          <input value={dest} onChange={e=>setDest(e.target.value)} placeholder="e.g. Pacific Northwest, Route 66…" style={{ width:'100%', fontFamily:F.body, fontSize:16, padding:'14px 15px', borderRadius:R.md, border:`1.5px solid ${dest?C.primary:C.line}`, background:C.surface, color:C.ink, outline:'none', boxShadow:dest?`0 0 0 3px ${C.primaryBg}`:'none', boxSizing:'border-box', transition:'.18s' }} />
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:16 }}>
            {['California Coast','Pacific Northwest','Southwest Desert','Great Lakes Loop','Deep South','New England'].map(d => (
              <Pill key={d} label={d} selected={dest===d} onClick={()=>setDest(d)} />
            ))}
          </div>
        </StepPane>

        {/* 1 — Dates */}
        <StepPane active={step===1}>
          <WizHeading title="When are you heading out?" />
          <div style={{ fontFamily:F.body, fontWeight:700, fontSize:12, color:C.ink3, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Start date</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
            {['Jun 28','Jul 4','Jul 11','Jul 18','Aug 1','Aug 15'].map(d => (
              <Pill key={d} label={d} selected={startDate===d} onClick={()=>setStartDate(d)} />
            ))}
          </div>
          <div style={{ fontFamily:F.body, fontWeight:700, fontSize:12, color:C.ink3, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Duration</div>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {[{id:'weekend',l:'Weekend',s:'2–3 days'},{id:'short',l:'Short trip',s:'4–5 days'},{id:'week',l:'One week',s:'6–8 days'},{id:'long',l:'Long haul',s:'9+ days'}].map(o => (
              <button key={o.id} onClick={()=>setDuration(o.id)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', border:`1.5px solid ${duration===o.id?C.primary:C.line}`, borderRadius:R.md, background:duration===o.id?C.primaryBg:C.surface, cursor:'pointer', transition:'.15s' }}>
                <span style={{ fontFamily:F.body, fontWeight:700, fontSize:15, color:duration===o.id?C.primary:C.ink }}>{o.l}</span>
                <span style={{ fontFamily:F.mono, fontSize:12, color:C.ink2 }}>{o.s}</span>
              </button>
            ))}
          </div>
        </StepPane>

        {/* 2 — Travelers */}
        <StepPane active={step===2}>
          <WizHeading title="Who's joining?" sub="Add names now — you can send invites later." />
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
            {travelers.map(n => (
              <div key={n} style={{ display:'flex', alignItems:'center', gap:6, background:C.primaryBg, borderRadius:R.pill, padding:'7px 12px' }}>
                <span style={{ fontFamily:F.body, fontWeight:600, fontSize:14, color:C.primary }}>{n}</span>
                {n !== 'Maya' && <button onClick={()=>setTravelers(ts=>ts.filter(t=>t!==n))} style={{ background:'none', border:'none', cursor:'pointer', color:C.primary, padding:0, fontSize:18, lineHeight:1, marginTop:-1 }}>×</button>}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={addName} onChange={e=>setAddName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&addName.trim()){setTravelers(ts=>[...ts,addName.trim()]);setAddName('');}}} placeholder="Add a traveler…" style={{ flex:1, fontFamily:F.body, fontSize:15, padding:'12px 14px', borderRadius:R.md, border:`1.5px solid ${C.line}`, background:C.surface, color:C.ink, outline:'none', boxSizing:'border-box' }} />
            <button onClick={()=>{if(addName.trim()){setTravelers(ts=>[...ts,addName.trim()]);setAddName('');}}} style={{ padding:'12px 18px', background:C.primary, border:'none', borderRadius:R.md, color:'#fff', fontFamily:F.body, fontWeight:700, fontSize:15, cursor:'pointer' }}>Add</button>
          </div>
          <button style={{ marginTop:12, background:'none', border:'none', cursor:'pointer', fontFamily:F.body, fontSize:14, color:C.route, fontWeight:600, padding:0 }}>+ Invite by email instead</button>
        </StepPane>

        {/* 3 — Vibe */}
        <StepPane active={step===3}>
          <WizHeading title="What's the vibe?" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:22 }}>
            <VibeCard iconName="spark"   label="Wild & Adventurous" sub="Hikes, off-road, big drives"   selected={vibe==='wild'}    onClick={()=>setVibe('wild')} />
            <VibeCard iconName="star"    label="Laid-back & Scenic" sub="Easy pace, views, good vibes" selected={vibe==='chill'}   onClick={()=>setVibe('chill')} />
            <VibeCard iconName="map"     label="Culture & Food"     sub="Cities, art, local spots"      selected={vibe==='culture'} onClick={()=>setVibe('culture')} />
            <VibeCard iconName="users"   label="Mix of everything"  sub="A bit of each"                 selected={vibe==='mix'}    onClick={()=>setVibe('mix')} />
          </div>
          <div style={{ fontFamily:F.body, fontWeight:700, fontSize:12, color:C.ink3, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Budget</div>
          <div style={{ display:'flex', gap:8 }}>
            {[{id:'budget',l:'Budget'},{id:'mid',l:'Mid-range'},{id:'splash',l:'Splash out'}].map(b => (
              <button key={b.id} onClick={()=>setBudget(b.id)} style={{ flex:1, padding:'11px 6px', border:`1.5px solid ${budget===b.id?C.primary:C.line}`, borderRadius:R.md, background:budget===b.id?C.primaryBg:'transparent', color:budget===b.id?C.primary:C.ink2, fontFamily:F.body, fontWeight:700, fontSize:12.5, cursor:'pointer', transition:'.15s' }}>{b.l}</button>
            ))}
          </div>
        </StepPane>

        {/* 4 — Generating */}
        <StepPane active={step===4}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', paddingTop:40, gap:0 }}>
            <div style={{ width:164, height:164, borderRadius:'50%', backgroundImage:`linear-gradient(135deg,#6A4DF4,#9B3BE0,#FF7A2F,#FF4D8D,#6A4DF4)`, backgroundSize:'300% 300%', animation:'gradSpin 2.6s ease infinite', boxShadow:`0 0 72px rgba(106,77,244,.38)`, marginBottom:32, flexShrink:0 }} />
            <div style={{ fontFamily:F.display, fontWeight:700, fontSize:20, color:C.ink, textAlign:'center', letterSpacing:'-.015em' }}>Crafting your trip…</div>
            <div style={{ fontFamily:F.mono, fontSize:12, color:C.primary, marginTop:12, textAlign:'center', minHeight:18, letterSpacing:'.04em' }}>{GEN_MSGS[genMsg]}</div>
            <div style={{ width:260, height:4, background:C.line, borderRadius:4, marginTop:22, overflow:'hidden' }}>
              <div style={{ width:`${genPct}%`, height:'100%', background:`linear-gradient(90deg,${C.primary},${C.activity})`, borderRadius:4, transition:'width .22s ease' }} />
            </div>
            <div style={{ fontFamily:F.mono, fontSize:11, color:C.ink3, marginTop:8 }}>{genPct}%</div>
          </div>
        </StepPane>

        {/* 5 — Result */}
        <StepPane active={step===5}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontFamily:F.mono, fontSize:11, color:C.primary, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:8 }}>AI-generated itinerary</div>
            <div style={{ fontFamily:F.display, fontWeight:800, fontSize:22, color:C.ink, letterSpacing:'-.02em', lineHeight:1.15 }}>{dest || 'Pacific Northwest Loop'}</div>
            <div style={{ fontFamily:F.mono, fontSize:12, color:C.ink2, marginTop:6 }}>
              3 days · {travelers.length} {travelers.length===1?'traveler':'travelers'} · {startDate||'Jul 4'} · {budget === 'mid' ? 'mid-range' : budget}
            </div>
          </div>
          <div style={{ background:C.surface, borderRadius:R.lg, overflow:'hidden', border:`1px solid ${C.line}`, boxShadow:DS.shadow.card, marginBottom:20 }}>
            {RESULT_DAYS.map((day, di) => (
              <div key={di}>
                <DayLabel label={day.label} />
                {day.stops.map((s, si) => <StopRow key={si} stop={s} divider={si < day.stops.length - 1 || di < RESULT_DAYS.length - 1} />)}
              </div>
            ))}
          </div>
          <button onClick={onClose} style={{ width:'100%', padding:'16px', background:C.primary, border:'none', borderRadius:R.md, fontFamily:F.body, fontWeight:700, fontSize:16, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <Icon name="check" size={18} color="#fff" sw={2.5} />
            Accept &amp; start planning
          </button>
          <button onClick={()=>{setStep(0);setDest('');setDuration(null);setVibe(null);setGenPct(0);}} style={{ width:'100%', marginTop:10, padding:'13px', background:'transparent', border:`1.5px solid ${C.line}`, borderRadius:R.md, fontFamily:F.body, fontWeight:600, fontSize:14, color:C.ink2, cursor:'pointer' }}>
            Try different options
          </button>
        </StepPane>
      </div>

      {/* Sticky next button */}
      {step < 4 && (
        <div style={{ padding:'12px 16px 24px', flexShrink:0, background:C.surface, borderTop:`1px solid ${C.line}` }}>
          <button onClick={next} disabled={!canNext} style={{ width:'100%', padding:'16px', background:canNext?C.primary:C.line, border:'none', borderRadius:R.md, fontFamily:F.body, fontWeight:700, fontSize:16, color:canNext?'#fff':C.ink3, cursor:canNext?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', gap:10, transition:'background .2s' }}>
            {step === 3
              ? <><Icon name="spark" size={18} color={canNext?'#fff':C.ink3} sw={2.3} /> Generate my trip</>
              : 'Continue'
            }
          </button>
        </div>
      )}
    </div>
  );
};

Object.assign(window, { AIWizardScreen });
