import { render } from '@testing-library/react-native';
import HomeScreen from '../../app/(app)/(tabs)/index';

// Mocks de datos
jest.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'user-123' } }),
}));

// Simulamos que useUser devuelve el nombre "Patricio"
jest.mock('../../hooks/useUsers', () => ({
    useUser: () => ({
        data: { name: 'Patricio' },
        isLoading: false,
    }),
}));

// Simulamos una lista de viajes
const mockTrips = [
    { id: 't1', name: 'Ruta por los Alpes', status: 'planning', start_date: '2030-10-10' },
    { id: 't2', name: 'Escapada a la Playa', status: 'going', end_date: '2030-12-12' },
];

jest.mock('../../hooks/useTrips', () => ({
    useTrips: () => ({
        data: mockTrips,
        loading: false,
        refetch: jest.fn(),
    }),
    useTripStopsCount: () => ({ count: 3, isLoading: false }),
}));

// Mock de TripCard para simplificar (opcional, pero ayuda a aislar)
jest.mock('../../components/indexCards/TripCard', () => ({
    TripCard: ({ trip }: any) => {
        const { Text } = require('react-native');
        return <Text>{trip.name}</Text>;
    },
}));

describe('<HomeScreen />', () => {
    it('Debe dar la bienvenida al usuario y listar sus viajes', () => {
        const { getByText } = render(<HomeScreen />);

        // 1. Verificar saludo personalizado
        expect(getByText('Bienvenido, Patricio')).toBeTruthy();

        // 2. Verificar secciones
        expect(getByText('Planificando')).toBeTruthy();
        expect(getByText('En marcha')).toBeTruthy();

        // 3. Verificar que los viajes se renderizan
        expect(getByText('Ruta por los Alpes')).toBeTruthy();
        expect(getByText('Escapada a la Playa')).toBeTruthy();
    });
});
