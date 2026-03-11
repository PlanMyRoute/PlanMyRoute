import { renderHook } from '@testing-library/react-native';
import { useTripPermissions } from '../useTripPermissions';

// Mock de los hooks que usa internamente
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'mi-id-usuario' } }),
}));

// Simulamos la respuesta de useTravelers (la lista de gente en el viaje)
const mockUseTravelers = jest.fn();
jest.mock('../useTrips', () => ({
  useTravelers: (tripId: string) => mockUseTravelers(tripId),
}));

describe('useTripPermissions Hook', () => {
  it('Debe dar permisos totales si el usuario es OWNER', () => {
    // Simulamos que la API devuelve que somos 'owner'
    mockUseTravelers.mockReturnValue({
      data: [{ user: { id: 'mi-id-usuario' }, role: 'owner' }],
      isLoading: false
    });

    const { result } = renderHook(() => useTripPermissions('trip-123'));

    expect(result.current.isOwner).toBe(true);
    expect(result.current.canDelete).toBe(true); // Owner puede borrar
    expect(result.current.canEdit).toBe(true);
    expect(result.current.canKick).toBeUndefined(); // Ojo: en tu matriz se llama 'canRemoveTravelers'
    expect(result.current.canRemoveTravelers).toBe(true);
  });

  it('Debe dar permisos restringidos si el usuario es VIEWER', () => {
    // Simulamos que somos 'viewer'
    mockUseTravelers.mockReturnValue({
      data: [{ user: { id: 'mi-id-usuario' }, role: 'viewer' }],
      isLoading: false
    });

    const { result } = renderHook(() => useTripPermissions('trip-123'));

    expect(result.current.isViewer).toBe(true);
    expect(result.current.canEdit).toBe(false); // Viewer no edita
    expect(result.current.canDelete).toBe(false); // Viewer no borra
    expect(result.current.canLeave).toBe(true); // Pero sí puede salirse
  });

  it('Debe dar todos los permisos si estamos creando un viaje nuevo (isCreating=true)', () => {
    // Cuando creas un viaje, aún no hay ID ni travelers, pero debes poder editar todo
    mockUseTravelers.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useTripPermissions(null, true));

    expect(result.current.canEditTrip).toBe(true);
    expect(result.current.isOwner).toBe(true);
  });
});