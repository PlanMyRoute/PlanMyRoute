// PlanMyRoute — Shared UI Components
const DS = window.DS;
const C = DS.color, F = DS.font, R = DS.radius;
const { useState } = React;

// ─── Icon ──────────────────────────────────────────────────────────────────
const PATHS = {
  home:     ['M3 10v10h6v-6h6v6h6V10L12 3z'],
  back:     ['M19 12H5', 'M12 19l-7-7 7-7'],
  bell:     ['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9','M13.73 21a2 2 0 0 1-3.46 0'],
  plus:     ['M12 5v14','M5 12h14'],
  close:    ['M18 6L6 18','M6 6l12 12'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  profile:  ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2','M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  events:   ['M12 22c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9 4.03 9 9 9z','M12 7v5l3 2'],
  feed:     ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  map:      ['M3 7l6-4 6 4 6-4v14l-6 4-6-4-6 4V7z','M9 3v14','M15 7v14'],
  camera:   ['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z','M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  dollar:   ['M12 1v22','M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
  car:      ['M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9h-2','M7 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z','M17 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0z'],
  star:     ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  check:    ['M22 11.08V12a10 10 0 1 1-5.93-9.14','M22 4L12 14.01l-3-3'],
  spark:    ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  users:    ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2','M23 21v-2a4 4 0 0 0-3-3.87','M16 3.13a4 4 0 0 1 0 7.75'],
  chevron:  ['M9 18l6-6-6-6'],
  share:    ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8','M16 6l-4-4-4 4','M12 2v13'],
};

const Icon = ({ name, size = 20, color = C.ink2, sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(PATHS[name] || []).map((d, i) => <path key={i} d={d} />)}
  </svg>
);

// ─── Status bar ───────────────────────────────────────────────────────────
const StatusBar = ({ light = false }) => {
  const tc = light ? 'rgba(255,255,255,0.92)' : C.ink;
  return (
    <div style={{ height: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 24px 8px', flexShrink: 0, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 118, height: 32, background: '#000', borderRadius: 18, zIndex: 1 }} />
      <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 15, color: tc, position: 'relative', zIndex: 2 }}>9:41</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <rect x="0" y="4" width="3" height="8" rx="1" fill={tc} opacity=".4" />
          <rect x="4.5" y="2.5" width="3" height="9.5" rx="1" fill={tc} opacity=".65" />
          <rect x="9" y="1" width="3" height="11" rx="1" fill={tc} opacity=".85" />
          <rect x="13.5" y="0" width="3" height="12" rx="1" fill={tc} />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12">
          <path d="M8 1C11.5 1 14.7 2.5 17 5L14.9 7.1C13.2 5.2 10.7 4 8 4S2.8 5.2 1.1 7.1L-1 5C1.3 2.5 4.5 1 8 1z" fill={tc} opacity=".35" />
          <path d="M8 5C10.4 5 12.5 6 14 7.7L11.9 9.8C10.9 8.7 9.5 8 8 8S5.1 8.7 4.1 9.8L2 7.7C3.5 6 5.6 5 8 5z" fill={tc} opacity=".7" />
          <circle cx="8" cy="12" r="2" fill={tc} />
        </svg>
        <div style={{ width: 24, height: 12, border: `1.5px solid ${tc}`, borderRadius: 3, padding: '1.5px 1.5px', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '82%', height: '100%', background: tc, borderRadius: 1 }} />
        </div>
      </div>
    </div>
  );
};

// ─── Top bar ─────────────────────────────────────────────────────────────
const TopBar = ({ title, onBack, action, actionIcon = 'settings', light = false }) => {
  const tc = light ? '#fff' : C.ink;
  return (
    <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
      {onBack
        ? <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, margin: -8 }}><Icon name="back" size={22} color={tc} sw={2.2} /></button>
        : <div style={{ width: 38 }} />}
      <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 15, color: tc, letterSpacing: '-.01em' }}>{title}</span>
      {action
        ? <button onClick={action} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, margin: -8 }}><Icon name={actionIcon} size={22} color={tc} /></button>
        : <div style={{ width: 38 }} />}
    </div>
  );
};

// ─── Button ──────────────────────────────────────────────────────────────
const Button = ({ children, variant = 'primary', size = 'md', onClick, fullWidth, disabled, style: sx }) => {
  const [pressed, setPressed] = useState(false);
  const sizes = {
    sm: { fontSize: 13, padding: '9px 16px',  borderRadius: R.sm },
    md: { fontSize: 15, padding: '13px 22px', borderRadius: R.md },
    lg: { fontSize: 16, padding: '16px 28px', borderRadius: R.lg },
  };
  const variants = {
    primary: { background: C.primary, color: '#fff',    border: 'none' },
    outline:  { background: 'transparent', color: C.ink, border: `1.5px solid ${C.line}` },
    ghost:    { background: 'transparent', color: C.primary, border: 'none' },
    danger:   { background: C.fuelBg, color: C.fuel,    border: 'none' },
    route:    { background: C.route,  color: '#fff',    border: 'none' },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{ fontFamily: F.body, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: fullWidth ? '100%' : undefined, opacity: disabled ? .45 : 1, transform: pressed ? 'scale(.97)' : 'scale(1)', transition: 'transform .1s, opacity .15s', ...sizes[size], ...variants[variant], ...sx }}
    >{children}</button>
  );
};

// ─── Tag chip ─────────────────────────────────────────────────────────────
const Tag = ({ label, type = 'neutral' }) => {
  const types = {
    owner:   { bg: C.ink,       color: '#fff'   },
    editor:  { bg: C.primary,   color: '#fff'   },
    viewer:  { bg: C.line,      color: C.ink2   },
    live:    { bg: C.fuel,      color: '#fff'   },
    paid:    { bg: C.paidBg,    color: C.paid   },
    pending: { bg: '#FFF4E5',   color: '#B85C00'},
    neutral: { bg: C.line,      color: C.ink2   },
    primary: { bg: C.primaryBg, color: C.primary},
    route:   { bg: C.routeBg,   color: C.route  },
  };
  const t = types[type] || types.neutral;
  return (
    <span style={{ background: t.bg, color: t.color, fontFamily: F.body, fontWeight: 700, fontSize: 11, padding: '4px 9px', borderRadius: R.pill, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
  );
};

// ─── Avatar stack ─────────────────────────────────────────────────────────
const AvatarStack = ({ names = [], size = 28 }) => {
  const palette = [C.primary, C.activity, C.fuel, C.ink, C.route, C.paid];
  return (
    <div style={{ display: 'flex' }}>
      {names.slice(0, 5).map((n, i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: '50%', background: palette[i % palette.length], color: '#fff', border: '2px solid #fff', marginLeft: i ? -8 : 0, fontSize: size * 0.38, fontWeight: 700, fontFamily: F.body, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: names.length - i }}>
          {n.startsWith('+') ? n : n[0]?.toUpperCase()}
        </div>
      ))}
    </div>
  );
};

// ─── Stop row ─────────────────────────────────────────────────────────────
const stopIconMap = { accommodation: 'home', activity: 'star', fuel: 'car', food: 'check' };

const StopRow = ({ stop, divider = true }) => {
  const def = DS.stop[stop.type] || { color: C.ink2, bg: C.line, label: stop.type };
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 16px', background: C.surface, borderBottom: divider ? `1px solid ${C.line}` : 'none' }}>
      <div style={{ width: 38, height: 38, borderRadius: R.sm, background: def.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={stopIconMap[stop.type] || 'star'} size={18} color={def.color} sw={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, fontFamily: F.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stop.name}</div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.ink2, marginTop: 2 }}>{def.label} · {stop.meta}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {(stop.time || stop.cost) && <span style={{ fontFamily: F.mono, fontSize: 12, color: C.ink }}>{stop.time || stop.cost}</span>}
        {stop.confirmed && <Tag label="paid" type="paid" />}
      </div>
    </div>
  );
};

// ─── Trip card ────────────────────────────────────────────────────────────
const TripCard = ({ trip, onClick }) => {
  const [hov, setHov] = useState(false);
  const pc = trip.progress >= 70 ? C.paid : trip.progress >= 30 ? C.primary : C.activity;
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.surface, borderRadius: R.lg, overflow: 'hidden', boxShadow: hov ? DS.shadow.float : DS.shadow.card, cursor: 'pointer', border: `1px solid ${C.line}`, transform: hov ? 'translateY(-2px)' : 'none', transition: 'transform .18s, box-shadow .18s' }}>
      <div style={{ height: 148, background: 'linear-gradient(135deg,#6A4DF4 0%,#9B3BE0 45%,#FF7A2F 100%)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.12em' }}>trip cover photo</span>
        <div style={{ position: 'absolute', top: 12, left: 12 }}><Tag label={trip.role} type={trip.role} /></div>
        {trip.live && <div style={{ position: 'absolute', top: 12, right: 12 }}><Tag label="● Live" type="live" /></div>}
      </div>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 17, color: C.ink, letterSpacing: '-.015em', lineHeight: 1.2 }}>{trip.name}</div>
        <div style={{ fontFamily: F.mono, fontSize: 11.5, color: C.ink2, marginTop: 6 }}>{trip.dates} · {trip.km} · {trip.stops} stops</div>
        <div style={{ height: 4, background: C.line, borderRadius: 4, marginTop: 12, overflow: 'hidden' }}>
          <div style={{ width: `${trip.progress}%`, height: '100%', background: pc, borderRadius: 4 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <AvatarStack names={trip.travelers} size={26} />
          <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 12, color: pc }}>{trip.progress}% planned</span>
        </div>
      </div>
    </div>
  );
};

// ─── Tab bar ──────────────────────────────────────────────────────────────
const TabBar = ({ active = 'trips', onTab }) => {
  const tabs = [
    { id: 'trips',   icon: 'home',    label: 'Trips'   },
    { id: 'events',  icon: 'events',  label: 'Events'  },
    { id: 'feed',    icon: 'feed',    label: 'Feed'    },
    { id: 'profile', icon: 'profile', label: 'Profile' },
  ];
  return (
    <div style={{ height: 66, background: C.surface, borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTab && onTab(t.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 0', transition: '.15s' }}>
          <Icon name={t.icon} size={22} color={active === t.id ? C.primary : C.ink3} sw={active === t.id ? 2.3 : 2} />
          <span style={{ fontFamily: F.body, fontWeight: active === t.id ? 700 : 500, fontSize: 10.5, color: active === t.id ? C.primary : C.ink3 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
};

// ─── Day section label ────────────────────────────────────────────────────
const DayLabel = ({ label }) => (
  <div style={{ padding: '10px 16px 6px', background: C.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 11, color: C.ink, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: C.line }} />
  </div>
);

Object.assign(window, { Icon, StatusBar, TopBar, Button, Tag, AvatarStack, StopRow, TripCard, TabBar, DayLabel });
