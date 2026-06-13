// PlanMyRoute — Trips Dashboard Screen
const DS = window.DS;
const C = DS.color, F = DS.font, R = DS.radius;
const { useState } = React;

const TRIPS = [
  {
    id: 1, name: 'Pacific Coast Highway',
    dates: 'Jun 14–21', km: '1,243 km', stops: 9, progress: 72,
    travelers: ['Maya', 'Jake', 'Rosa', 'Sam', '+1'],
    role: 'owner', live: true,
  },
  {
    id: 2, name: 'Joshua Tree Weekend',
    dates: 'Jul 4–7', km: '312 km', stops: 5, progress: 28,
    travelers: ['Maya', 'Jake', 'Rosa'],
    role: 'editor', live: false,
  },
  {
    id: 3, name: 'Big Bend Road Trip',
    dates: 'Aug 18–26', km: '980 km', stops: 7, progress: 8,
    travelers: ['Maya', 'Sam'],
    role: 'owner', live: false,
  },
];

const TripsScreen = ({ onTrip, onWizard, onToast }) => {
  const { Icon, StatusBar, TripCard, TabBar, Tag } = window;
  const [activeTab, setActiveTab] = useState('trips');

  const handleTab = (t) => {
    if (t !== 'trips') {
      onToast(`${t.charAt(0).toUpperCase() + t.slice(1)} — not in scope for Stage 2`);
    } else {
      setActiveTab(t);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, position: 'relative' }}>
      <StatusBar />

      {/* Greeting header */}
      <div style={{ padding: '2px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.ink2 }}>Good afternoon,</div>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 24, color: C.ink, letterSpacing: '-.025em', marginTop: 2 }}>Maya</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}>
            <Icon name="bell" size={22} color={C.ink2} />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${C.primary},${C.activity})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: F.body, fontWeight: 700, fontSize: 15, color: '#fff' }}>M</span>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>

        {/* On the road */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, color: C.ink, letterSpacing: '.06em', textTransform: 'uppercase' }}>On the road</span>
            <Tag label="1 active" type="live" />
          </div>
          <TripCard trip={TRIPS[0]} onClick={() => onTrip(TRIPS[0])} />
        </div>

        {/* Upcoming */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: F.display, fontWeight: 700, fontSize: 12, color: C.ink, letterSpacing: '.06em', textTransform: 'uppercase' }}>Upcoming</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TRIPS.slice(1).map(t => <TripCard key={t.id} trip={t} onClick={() => onTrip(t)} />)}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button onClick={onWizard} style={{ position: 'absolute', bottom: 78, right: 20, width: 56, height: 56, borderRadius: '50%', background: C.primary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: DS.shadow.float, zIndex: 10 }}>
        <Icon name="plus" size={24} color="#fff" sw={2.5} />
      </button>

      <TabBar active={activeTab} onTab={handleTab} />
    </div>
  );
};

Object.assign(window, { TripsScreen });
