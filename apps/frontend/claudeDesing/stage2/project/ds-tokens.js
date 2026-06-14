// PlanMyRoute — Design System Tokens
// Direction 03: Horizon + Wayfinding semantic stop-type layer

window.DS = {
  color: {
    bg:         '#F4F2F7',   // app background (haze white)
    surface:    '#FFFFFF',   // cards, sheets
    ink:        '#16131F',   // primary text (midnight ink ~16:1)
    ink2:       '#564F66',   // secondary text
    ink3:       '#9490A0',   // tertiary / icons
    line:       '#E5E1EC',   // borders, dividers
    // ── Primaries
    primary:    '#6A4DF4',   // Electric Indigo — CTA, accommodation
    primaryBg:  '#EEEAFE',
    route:      '#1F62D6',   // Route Blue — nav actions, map route
    routeBg:    '#E0E8FB',
    // ── Stop-type semantic (Wayfinding layer)
    activity:   '#FF7A2F',   // Tangerine — activity stops
    activityBg: '#FFEEDF',
    fuel:       '#FF4D8D',   // Hot Pink — fuel stops
    fuelBg:     '#FFE3EE',
    paid:       '#0E7C57',   // Pine Green — confirmed/paid states
    paidBg:     '#E3F5EC',
    food:       '#0E7C57',
    foodBg:     '#E3F5EC',
  },
  stop: {
    accommodation: { color: '#6A4DF4', bg: '#EEEAFE', label: 'Accommodation' },
    activity:      { color: '#FF7A2F', bg: '#FFEEDF', label: 'Activity'       },
    fuel:          { color: '#FF4D8D', bg: '#FFE3EE', label: 'Fuel stop'      },
    food:          { color: '#0E7C57', bg: '#E3F5EC', label: 'Food & drink'   },
  },
  font: {
    display: "'Unbounded', sans-serif",
    body:    "'Schibsted Grotesk', sans-serif",
    mono:    "'Space Mono', monospace",
  },
  radius: { sm: '8px', md: '14px', lg: '20px', xl: '28px', pill: '999px' },
  shadow: {
    card:  '0 4px 20px rgba(106,77,244,0.09)',
    float: '0 12px 40px rgba(106,77,244,0.22)',
  },
};
