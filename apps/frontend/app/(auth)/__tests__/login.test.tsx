import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '../login';

// 1. Mockear el hook useAuth
// Esto intercepta la llamada a useAuth dentro de LoginScreen
const mockLogin = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    isLoading: false,
  }),
}));

// 2. Mockear el router
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

describe('<LoginScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Debe renderizar el formulario correctamente', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Contraseña')).toBeTruthy();
    expect(getByText('Iniciar Sesión')).toBeTruthy();
  });

  it('Debe llamar a la función login cuando se pulsa el botón con datos válidos', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    // 1. Escribir en los inputs
    fireEvent.changeText(getByPlaceholderText('Email'), 'patricio@test.com');
    fireEvent.changeText(getByPlaceholderText('Contraseña'), '123456');

    // 2. Pulsar el botón
    fireEvent.press(getByText('Iniciar Sesión'));

    // 3. Verificar que se llamó a la función login del contexto
    await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('patricio@test.com', '123456');
    });
  });

  it('Debe mostrar alerta si faltan campos', async () => {
    // Mockear Alert.alert
    jest.spyOn(require('react-native').Alert, 'alert');

    const { getByText } = render(<LoginScreen />);

    // Pulsar sin escribir nada
    fireEvent.press(getByText('Iniciar Sesión'));

    expect(require('react-native').Alert.alert).toHaveBeenCalledWith(
      'Error', 
      'Por favor, introduce email y contraseña.'
    );
  });
});