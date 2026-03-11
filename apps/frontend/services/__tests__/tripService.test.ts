import { API_URL } from '@/constants/api';
import fetchMock from 'jest-fetch-mock';
import { TripService } from '../tripService';

describe('TripService', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('createTrip debe llamar al endpoint correcto con los datos del viaje', async () => {
    // 1. Datos de prueba
    const mockTrip = { name: 'Viaje a París', description: 'Luna de miel' };
    const userId = 'user-123';
    const token = 'fake-jwt-token';
    
    // 2. Simular respuesta exitosa del backend
    fetchMock.mockResponseOnce(JSON.stringify({ 
        trip: { id: 'trip-999', ...mockTrip } 
    }));

    // 3. Ejecutar la función
    const result = await TripService.createTrip(mockTrip, userId, false, token);

    // 4. Verificaciones
    expect(fetchMock).toHaveBeenCalledTimes(1);
    
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_URL}/api/travelers/${userId}/trip`);
    expect(options?.method).toBe('POST');
    expect(options?.headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    expect(result.trip.name).toBe('Viaje a París');
  });

  it('getUserTrips debe manejar errores del servidor', async () => {
    fetchMock.mockReject(new Error('Error de red'));

    await expect(TripService.getUserTrips('user-123'))
      .rejects
      .toThrow('Error de red');
  });
});