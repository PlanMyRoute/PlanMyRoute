import { fireEvent, render } from '@testing-library/react-native';
import NotificationsScreen from '../notifications';

// Mocks
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

// Mock del hook useNotifications
const mockRefetch = jest.fn();
const mockAccept = jest.fn();
const mockDecline = jest.fn();

jest.mock('../../../hooks/useNotifications', () => ({
  __esModule: true, // Importante para mocks por defecto
  default: () => ({
    data: [
      {
        id: 1,
        content: 'Te han invitado al viaje: Eurotrip',
        action_status: 'pending',
        created_at: new Date().toISOString(),
        related_trip_id: 99
      }
    ],
    isLoading: false,
    refetch: mockRefetch
  }),
  useDeleteNotification: () => ({ mutate: jest.fn() }),
  useAcceptInvitation: () => ({ mutate: mockAccept, isPending: false }),
  useDeclineInvitation: () => ({ mutate: mockDecline, isPending: false }),
}));

// Mock de Toast para que no falle
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn()
}));

describe('<NotificationsScreen />', () => {
  it('Debe mostrar invitaciones pendientes y permitir aceptarlas', () => {
    const { getByText } = render(<NotificationsScreen />);

    // 1. Verificar que aparece la notificación
    expect(getByText('Te han invitado al viaje: Eurotrip')).toBeTruthy();
    expect(getByText('Pendientes')).toBeTruthy(); // El título de la sección

    // 2. Buscar el botón de "Aceptar" y pulsarlo
    const acceptButton = getByText('Aceptar');
    fireEvent.press(acceptButton);

    // 3. Verificar que se llamó a la mutación de aceptar
    // Nota: El Invitation component llama a mutate con { notificationId, role }
    expect(mockAccept).toHaveBeenCalledWith(
      expect.objectContaining({ notificationId: 1 }),
      expect.anything()
    );
  });
});