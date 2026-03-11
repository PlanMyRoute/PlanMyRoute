import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/index';
import { supabase } from '../src/supabase';

describe('INTEGRACIÓN REAL - Itinerario y Paradas', () => {
  jest.setTimeout(30000);
  // Usamos un ID específico para estas pruebas para no chocar con los otros archivos
  const ITINERARY_USER_ID = 'a3e966d8-e1c0-41e2-9fd6-0519575c76e7';
  let tripId: number;
  let stopId: string;

  beforeAll(async () => {
    // 1. Asegurar Usuario
    await supabase.from('user').upsert({
      id: ITINERARY_USER_ID,
      user_name: 'ItineraryTester',
      user_type: ['gastronomic', 'cultural'] // Enum válido en inglés
    });

    // 2. Crear un Viaje Base para probar las paradas
    // Lo creamos vía API para que se generen las relaciones automáticamente
    const tripRes = await request(app)
      .post(`/api/travelers/${ITINERARY_USER_ID}/trip`)
      .send({
        name: 'Viaje para Paradas',
        description: 'Test Itinerario',
        start_date: '2025-12-01',
        end_date: '2025-12-05',
        origin: 'Madrid, España',
        destination: 'Barcelona, España',
        n_adults: 1,
        type: ['cultural']
      });
    
    tripId = tripRes.body.trip.id;
  });

  afterAll(async () => {
    // Limpieza en orden
    if (tripId) {
      await request(app).delete(`/api/trips/${tripId}`); // Borra viaje, rutas y paradas
    }
    // No borramos el usuario por si acaso, o puedes descomentar:
    // await supabase.from('user').delete().eq('id', ITINERARY_USER_ID);
  });

  it('Debe añadir una parada intermedia al viaje', async () => {
    const stopData = {
      name: 'Zaragoza',
      address: 'Zaragoza, España', // Esto activará el geocoder real
      description: 'Parada técnica para comer',
      type: 'intermedia'
    };

    const res = await request(app)
      .post(`/api/trip/${tripId}/stop`)
      .send(stopData);

    if (res.status !== 201) {
        console.error('❌ Error creando parada:', res.body);
    }

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Zaragoza');
    expect(res.body.coordinates).toBeDefined(); // Verifica que el geocoder funcionó
    
    stopId = res.body.id;
  });

  it('Debe obtener el itinerario completo con la nueva parada', async () => {
    const res = await request(app).get(`/api/itinerary/trip/${tripId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('routesWithStops');
    
    // Verificamos que Zaragoza aparece en algún lugar del itinerario
    // (Nota: la estructura puede variar según cómo devuelvas routesWithStops, 
    //  pero buscamos en el texto plano del JSON por simplicidad)
    const jsonString = JSON.stringify(res.body);
    expect(jsonString).toContain('Zaragoza');
  });

  it('Debe permitir editar la parada', async () => {
    const res = await request(app)
      .patch(`/api/trip/${tripId}/stop/${stopId}`)
      .send({ description: 'Parada editada correctamente' });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Parada editada correctamente');
  });
});