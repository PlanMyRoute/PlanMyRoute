import request from 'supertest';
import app from '../src/index';
import { supabase } from '../src/supabase';

describe('INTEGRACIÓN REAL - Notificaciones', () => {
  const NOTIF_USER_ID = 'a3e966d8-e1c0-41e2-9fd6-0519575c76e7';
  let notificationId: string;

  beforeAll(async () => {
    // Asegurar Usuario Receptor
    await supabase.from('user').upsert({
      id: NOTIF_USER_ID,
      user_name: 'NotifReceiver',
      user_type: ['cultural']
    });
  });

  afterAll(async () => {
    if (notificationId) {
      await supabase.from('notifications').delete().eq('id', notificationId);
    }
    // Opcional: Borrar usuario
  });

  it('Debe crear una notificación para el usuario', async () => {
    const notifData = {
      user_receiver_id: NOTIF_USER_ID,
      type: 'invitation', // Asegúrate de que coincida con tu ENUM de notificaciones si tienes uno
      content: 'Te han invitado a un viaje',
      status: 'unread'
    };

    const res = await request(app)
      .post('/api/notification')
      .send(notifData);

    if (res.status !== 201) {
        console.error('❌ Error creando notificación:', res.body);
    }

    expect(res.status).toBe(201);
    expect(res.body.user_receiver_id).toBe(NOTIF_USER_ID);
    
    notificationId = res.body.id;
  });

  it('Debe listar las notificaciones del usuario', async () => {
    const res = await request(app).get(`/api/notification/receiver/${NOTIF_USER_ID}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(notificationId);
  });

  it('Debe marcar la notificación como leída', async () => {
    const res = await request(app)
      .patch(`/api/notification/${notificationId}/read`)
      .send(); // Body vacío, la acción está en la URL o controller

    expect(res.status).toBe(200);
    
    // Verificamos en BD que cambió el estado
    const { data } = await supabase
      .from('notifications')
      .select('status')
      .eq('id', notificationId)
      .single();
      
    expect(data?.status).toBe('read');
  });
});