// PlanMyRoute — Trip Detail Screen (Itinerary / Map / Photos / Expenses)
const DS = window.DS;
const C = DS.color, F = DS.font, R = DS.radius;
const { useState } = React;

const TRIP_STOPS = {
  days: [
    { label: 'Day 1 — Jun 14', stops: [
      { type:'accommodation', name:'The Drake Motel',         meta:'2 nights · $142/night', time:'3:00 PM', confirmed:true  },
      { type:'activity',      name:'Montana de Oro State Park',meta:'3 hrs · free entry',   time:'5:30 PM'                  },
      { type:'fuel',          name:'Refuel — San Luis Obispo', meta:'Split 5 ways',          cost:'$52.80', confirmed:true   },
    ]},
    { label: 'Day 2 — Jun 15', stops: [
      { type:'activity',      name:'McWay Falls Overlook',    meta:'1.5 hrs · Julia Pfeiffer', time:'9:30 AM'               },
      { type:'food',          name:'Nepenthe Restaurant',     meta:'Lunch · $28/person est.',  time:'1:00 PM'               },
      { type:'accommodation', name:'Big Sur Cabin',           meta:'1 night · $220/night',     time:'4:00 PM', confirmed:true },
    ]},
    { label: 'Day 3 — Jun 16', stops: [
      { type:'fuel',     name:'Refuel — Monterey',         meta:'Split 5 ways',          cost:'$67.20', confirmed:true   },
      { type:'activity', name:'17 Mile Drive',              meta:'Scenic drive · 2 hrs', time:'11:00 AM'                 },
      { type:'food',     name:"Old Fisherman's Grotto",    meta:'Dinner · $35/person est.', time:'6:30 PM'              },
    ]},
  ],
};

const EXPENSES = {
  total: 1248.50, perPerson: 249.70,
  categories: [
    { label:'Accommodation', amt:724,   pct:58, color:C.primary  },
    { label:'Food & drink',  amt:286.50,pct:23, color:C.food     },
    { label:'Activities',    amt:118,   pct:9,  color:C.activity  },
    { label:'Fuel',          amt:120,   pct:10, color:C.fuel      },
  ],
  people: [
    { name:'Maya',  init:'M', paid:445.00,  balance: 195.30, owes:false },
    { name:'Jake',  init:'J', paid:320.00,  balance:  70.30, owes:false },
    { name:'Rosa',  init:'R', paid:240.00,  balance:   9.70, owes:true  },
    { name:'Sam',   init:'S', paid:140.00,  balance: 109.70, owes:true  },
    { name:'Tyler', init:'T', paid:103.50,  balance: 146.20, owes:true  },
  ],
};

// ─── Map tab ───────────────────────────────────────────────────────────────
const TripMapView = () => {
  const pinData = [
    { x:220,y:356, type:'accommodation' },
    { x:216,y:316, type:'activity' },
    { x:196,y:272, type:'fuel' },
    { x:174,y:226, type:'activity' },
    { x:162,y:188, type:'food' },
    { x:168,y:154, type:'accommodation' },
    { x:188,y:112, type:'fuel' },
    { x:204,y:92,  type:'activity' },
    { x:222,y:70,  type:'food' },
  ];
  return (
    <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
      <svg width="100%" height="100%" viewBox="0 0 390 520" preserveAspectRatio="xMidYMid slice" style={{ position:'absolute', inset:0 }}>
        <defs>
          <linearGradient id="routeGrad" x1="50%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="#6A4DF4" />
            <stop offset="100%" stopColor="#FF7A2F" />
          </linearGradient>
        </defs>
        <rect width="390" height="520" fill="#ECF0F4" />
        {/* Ocean */}
        <path d="M0 0 L158 0 L140 70 L120 155 L102 235 L88 318 L78 520 L0 520 Z" fill="#C8DDF0" opacity=".55" />
        {/* Grid roads */}
        {[60,100,140,180,220,260,300,340,380,420,460,500].map(y => <line key={`h${y}`} x1="0" y1={y} x2="390" y2={y} stroke="#D4D8E4" strokeWidth="1" />)}
        {[160,200,240,280,320,360].map(x => <line key={`v${x}`} x1={x} y1="0" x2={x} y2="520" stroke="#D4D8E4" strokeWidth="1" />)}
        {/* Coastline secondary road */}
        <path d="M158 0 C162 80 165 165 163 245 C161 325 154 400 148 520" fill="none" stroke="#BFC4D0" strokeWidth="2.5" />
        {/* Route */}
        <path d="M220 356 C218 336 215 320 216 316 C213 295 204 282 196 272 C188 260 180 246 174 226 C168 206 164 196 162 188 C160 178 163 165 168 154 C173 143 182 129 188 112 C194 97 207 84 222 70" fill="none" stroke="url(#routeGrad)" strokeWidth="4.5" strokeLinecap="round" />
        {/* Pins */}
        {pinData.map((p, i) => {
          const def = DS.stop[p.type] || { color: C.ink2 };
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="12" fill="white" opacity=".9" />
              <circle cx={p.x} cy={p.y} r="8.5" fill={def.color} />
              <circle cx={p.x} cy={p.y} r="3.5" fill="white" />
            </g>
          );
        })}
        {/* Place labels */}
        {[{x:226,y:364,label:'Morro Bay'},{x:180,y:220,label:'Big Sur'},{x:196,y:108,label:'Monterey'},{x:226,y:62,label:'Santa Cruz'}].map(l => (
          <text key={l.label} x={l.x} y={l.y} fontFamily="Space Mono" fontSize="9" fill="#564F66">{l.label}</text>
        ))}
        {/* Scale bar */}
        <line x1="294" y1="500" x2="364" y2="500" stroke="#9490A0" strokeWidth="1.5" />
        <text x="294" y="513" fontFamily="Space Mono" fontSize="8" fill="#9490A0">50 km</text>
      </svg>
      {/* Legend */}
      <div style={{ position:'absolute', top:12, right:12, background:'rgba(255,255,255,.93)', borderRadius:R.md, padding:'10px 12px', boxShadow:DS.shadow.card }}>
        {Object.entries(DS.stop).map(([k, v]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:v.color, flexShrink:0 }} />
            <span style={{ fontFamily:F.mono, fontSize:9.5, color:C.ink2, textTransform:'uppercase', letterSpacing:'.06em' }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Expenses tab ──────────────────────────────────────────────────────────
const ExpensesView = () => {
  const { Tag } = window;
  const palette = [C.primary, C.activity, C.fuel, C.ink, C.route];
  return (
    <div style={{ overflowY:'auto', flex:1 }}>
      {/* Totals */}
      <div style={{ padding:'18px 16px 16px', background:C.surface, borderBottom:`1px solid ${C.line}` }}>
        <div style={{ fontFamily:F.mono, fontSize:10.5, color:C.ink3, letterSpacing:'.1em', textTransform:'uppercase' }}>Total trip cost</div>
        <div style={{ fontFamily:F.display, fontWeight:800, fontSize:36, color:C.ink, letterSpacing:'-.025em', marginTop:4 }}>${EXPENSES.total.toFixed(2)}</div>
        <div style={{ fontFamily:F.mono, fontSize:12, color:C.ink2, marginTop:2 }}>${EXPENSES.perPerson.toFixed(2)} per person · 5 travelers</div>
        {/* Category stacked bar */}
        <div style={{ display:'flex', height:8, borderRadius:8, overflow:'hidden', marginTop:14, gap:1 }}>
          {EXPENSES.categories.map(cat => <div key={cat.label} style={{ width:`${cat.pct}%`, background:cat.color }} />)}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', marginTop:10 }}>
          {EXPENSES.categories.map(cat => (
            <div key={cat.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:cat.color, flexShrink:0 }} />
              <span style={{ fontFamily:F.mono, fontSize:10, color:C.ink2 }}>{cat.label} {cat.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      {/* Balances */}
      <div style={{ padding:'14px 0' }}>
        <div style={{ padding:'0 16px 10px' }}>
          <span style={{ fontFamily:F.display, fontWeight:700, fontSize:12, color:C.ink, letterSpacing:'.06em', textTransform:'uppercase' }}>Balances</span>
        </div>
        {EXPENSES.people.map((p, i) => (
          <div key={p.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:C.surface, borderBottom:`1px solid ${C.line}` }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:palette[i % palette.length], display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontFamily:F.body, fontWeight:700, fontSize:14, color:'#fff' }}>{p.init}</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:14.5, color:C.ink, fontFamily:F.body }}>{p.name}</div>
              <div style={{ fontFamily:F.mono, fontSize:11, color:C.ink2, marginTop:1 }}>Paid ${p.paid.toFixed(2)}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:F.mono, fontWeight:700, fontSize:13.5, color: p.owes ? C.fuel : C.paid }}>
                {p.owes ? `-$${p.balance.toFixed(2)}` : `+$${p.balance.toFixed(2)}`}
              </div>
              <div style={{ marginTop:4 }}>
                <Tag label={p.owes ? 'owes' : 'owed'} type={p.owes ? 'live' : 'paid'} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:'16px' }}>
        <button style={{ width:'100%', padding:'14px', background:C.primaryBg, border:`1.5px solid ${C.primary}`, borderRadius:R.md, fontFamily:F.body, fontWeight:700, fontSize:15, color:C.primary, cursor:'pointer' }}>
          Settle up
        </button>
      </div>
    </div>
  );
};

// ─── Photos tab ────────────────────────────────────────────────────────────
const PhotosView = () => {
  const photos = [
    {label:'Morro Bay sunset',  grad:'linear-gradient(135deg,#6A4DF4,#9B3BE0)'},
    {label:'Montana de Oro',    grad:'linear-gradient(135deg,#FF7A2F,#E05A0F)'},
    {label:'Highway 1 view',    grad:'linear-gradient(135deg,#FF4D8D,#C4006B)'},
    {label:'Big Sur camp fire', grad:'linear-gradient(135deg,#1F62D6,#1040A0)'},
    {label:'McWay Falls',       grad:'linear-gradient(135deg,#0E7C57,#085C3F)'},
    {label:'Evening fog',       grad:'linear-gradient(135deg,#6A4DF4,#FF7A2F)'},
    {label:'Morning light',     grad:'linear-gradient(135deg,#FF7A2F,#FF4D8D)'},
    {label:'17 Mile Drive',     grad:'linear-gradient(135deg,#1F62D6,#6A4DF4)'},
    {label:'Monterey pier',     grad:'linear-gradient(135deg,#0E7C57,#1F62D6)'},
  ];
  return (
    <div style={{ overflowY:'auto', flex:1, padding:12 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
        {photos.map((p, i) => (
          <div key={i} style={{ aspectRatio:'1', borderRadius:R.sm, overflow:'hidden', background:p.grad, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <span style={{ fontFamily:F.mono, fontSize:8, color:'rgba(255,255,255,.6)', textAlign:'center', lineHeight:1.4, padding:'0 4px' }}>{p.label}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:'12px 4px', textAlign:'center' }}>
        <span style={{ fontFamily:F.mono, fontSize:11, color:C.ink3, textTransform:'uppercase', letterSpacing:'.08em' }}>9 photos · shared by 3 travelers</span>
      </div>
    </div>
  );
};

// ─── Main screen ───────────────────────────────────────────────────────────
const TripDetailScreen = ({ trip, onBack }) => {
  const { Icon, StatusBar, StopRow, Tag, AvatarStack, DayLabel } = window;
  const [tab, setTab] = useState('itinerary');
  if (!trip) return null;

  const tripTabs = [
    { id:'itinerary', icon:'home',   label:'Itinerary' },
    { id:'map',       icon:'map',    label:'Map'       },
    { id:'photos',    icon:'camera', label:'Photos'    },
    { id:'expenses',  icon:'dollar', label:'Expenses'  },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.bg, position:'relative' }}>
      {/* Hero */}
      <div style={{ flexShrink:0, height:262, background:'linear-gradient(150deg,#6A4DF4 0%,#9B3BE0 48%,#FF7A2F 100%)', display:'flex', flexDirection:'column' }}>
        <StatusBar light />
        <div style={{ padding:'4px 16px 0', display:'flex', justifyContent:'space-between', flexShrink:0 }}>
          <button onClick={onBack} style={{ background:'rgba(0,0,0,.22)', border:'none', borderRadius:R.md, cursor:'pointer', padding:'8px 12px', display:'flex', alignItems:'center', gap:6, backdropFilter:'blur(6px)' }}>
            <Icon name="back" size={17} color="#fff" sw={2.3} />
            <span style={{ fontFamily:F.body, fontWeight:600, fontSize:13, color:'#fff' }}>Trips</span>
          </button>
          <button style={{ background:'rgba(0,0,0,.22)', border:'none', borderRadius:R.md, cursor:'pointer', padding:'8px 10px', backdropFilter:'blur(6px)' }}>
            <Icon name="share" size={18} color="#fff" />
          </button>
        </div>
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'0 16px 16px' }}>
          <div style={{ fontFamily:F.display, fontWeight:800, fontSize:21, color:'#fff', letterSpacing:'-.02em', lineHeight:1.15, textShadow:'0 2px 14px rgba(0,0,0,.2)' }}>{trip.name}</div>
          <div style={{ fontFamily:F.mono, fontSize:11.5, color:'rgba(255,255,255,.8)', marginTop:6 }}>{trip.dates} · {trip.km} · {trip.stops} stops</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12 }}>
            <AvatarStack names={trip.travelers} size={26} />
            <Tag label={trip.live ? '● Live' : trip.role} type={trip.live ? 'live' : trip.role} />
          </div>
        </div>
      </div>

      {/* Tab strip */}
      <div style={{ display:'flex', borderBottom:`1px solid ${C.line}`, background:C.surface, flexShrink:0 }}>
        {tripTabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'10px 0', borderBottom:tab===t.id?`2.5px solid ${C.primary}`:'2.5px solid transparent', transition:'.15s' }}>
            <Icon name={t.icon} size={18} color={tab===t.id?C.primary:C.ink3} sw={tab===t.id?2.3:2} />
            <span style={{ fontFamily:F.body, fontWeight:tab===t.id?700:500, fontSize:10.5, color:tab===t.id?C.primary:C.ink3 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'itinerary' && (
        <div style={{ flex:1, overflowY:'auto' }}>
          {TRIP_STOPS.days.map((day, di) => (
            <div key={di}>
              <DayLabel label={day.label} />
              {day.stops.map((s, si) => <StopRow key={si} stop={s} divider={si < day.stops.length - 1 || di < TRIP_STOPS.days.length - 1} />)}
            </div>
          ))}
          <div style={{ height:80 }} />
        </div>
      )}
      {tab === 'map'      && <TripMapView />}
      {tab === 'photos'   && <PhotosView />}
      {tab === 'expenses' && <ExpensesView />}

      {/* Add stop FAB (itinerary only) */}
      {tab === 'itinerary' && (
        <button style={{ position:'absolute', bottom:18, right:20, height:48, padding:'0 20px', borderRadius:R.pill, background:C.primary, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:DS.shadow.float, zIndex:10 }}>
          <Icon name="plus" size={18} color="#fff" sw={2.5} />
          <span style={{ fontFamily:F.body, fontWeight:700, fontSize:14, color:'#fff' }}>Add stop</span>
        </button>
      )}
    </div>
  );
};

Object.assign(window, { TripDetailScreen });
