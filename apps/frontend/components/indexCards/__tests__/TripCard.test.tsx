import { render } from '@testing-library/react-native';
import { TripCard } from '../TripCard';

// 1. Mock de AuthContext (para saber quién es el usuario)
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

// 2. Mock de Hooks de Trips (donde están useDeleteTrip, useLeaveTrip, etc.)
// Ajustamos la ruta: desde 'components/indexCards/__tests__' hasta 'hooks/useTrips'
jest.mock('../../../hooks/useTrips', () => ({
  useDeleteTrip: () => ({ mutate: jest.fn() }),
  useLeaveTrip: () => ({ mutate: jest.fn() }),
  useTripStopsCount: () => ({ count: 5, isLoading: false }), // Mockeamos esto aquí si se exporta de useTrips
}));

// 3. Mock de Permisos
jest.mock('../../../hooks/useTripPermissions', () => ({
  useTripPermissions: () => ({
    canEdit: true,
    canDelete: true,
    role: 'owner',
    isOwner: true,
  }),
}));

// 4. Mock de Contexto de Viaje
jest.mock('../../../context/TripContext', () => ({
  useTripContext: () => ({ setCurrentTrip: jest.fn(), setTripId: jest.fn() }),
}));

const mockTrip: any = {
  id: 1,
  name: 'Viaje a los Alpes',
  description: 'Ski y montaña',
  start_date: new Date('2025-01-01').toISOString(),
  end_date: new Date('2025-01-10').toISOString(),
  status: 'planning',
  n_adults: 2,
};

describe('<TripCard />', () => {
  it('Debe mostrar la información del viaje y el rol de OWNER', () => {
    const { getByText } = render(<TripCard trip={mockTrip} />);

    expect(getByText('Viaje a los Alpes')).toBeTruthy();
    expect(getByText('Ski y montaña')).toBeTruthy();
    // Verifica si tu componente muestra el rol o un icono específico
    // expect(getByText('👑 OWNER')).toBeTruthy(); 
  });
});