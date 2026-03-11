import request from 'supertest';
import app from '../src/index';
import { supabase } from '../src/supabase';

describe('INTEGRACIÓN REAL - Viajes', () => {
  const FIXED_USER_ID = 'a3e966d8-e1c0-41e2-9fd6-0519575c76e7';
  let createdTripId: number;

  afterAll(async () => {
    if (createdTripId) {
       await request(app).delete(`/api/trips/${createdTripId}`); 
       // Backup: Borrado directo
       await supabase.from('trip').delete().eq('id', createdTripId);
    }
  });

  it('Debe crear un viaje real asociado al usuario fijo', async () => {
    const tripData = {
      name: 'Viaje Test ID Fijo',
      description: 'Probando con usuario existente',
      start_date: '2025-09-01',
      end_date: '2025-09-10',
      origin: 'Valencia, España',
      destination: 'Alicante, España',
      n_adults: 1,
      type: ['cultural', 'gastronomic'], 
    };

    const res = await request(app)
      .post(`/api/travelers/${FIXED_USER_ID}/trip`)
      .send(tripData);

    if (res.status !== 201) {
      console.error('❌ Error creando viaje:', JSON.stringify(res.body, null, 2));
    }

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('trip');
    
    createdTripId = res.body.trip.id;
  });

  it('Debe verificar que el usuario fijo aparece como owner del viaje', async () => {
    await new Promise(r => setTimeout(r, 1000));

    if (!createdTripId) return; 

    const res = await request(app).get(`/api/travelers/trip/${createdTripId}`);
    
    expect(res.status).toBe(200);
    const traveler = res.body.find((t: any) => t.user.id === FIXED_USER_ID);
    
    expect(traveler).toBeDefined();
    expect(traveler.role).toBe('owner');
  });
});