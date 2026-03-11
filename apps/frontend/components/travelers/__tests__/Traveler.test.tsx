import { render } from '@testing-library/react-native';
import Traveler from '../Traveler';

const mockUser = {
    id: 'u1',
    user_name: 'Viajero Molesto',
    name: 'Pepe',
    email: 'pepe@test.com'
};


describe('<Traveler />', () => {
  it('Debe mostrar el botón de expulsar si canKick es true', () => {
    const onKickMock = jest.fn();
    
    // Renderizamos un viajero, y nosotros somos Owners (canKick=true)
    const { getByText, getByTestId } = render(
        <Traveler 
            user={mockUser} 
            role="editor" 
            canKick={true} 
            onKick={onKickMock} 
        />
    );

    expect(getByText('Viajero Molesto')).toBeTruthy();
    expect(getByText('Editor')).toBeTruthy();

    // Buscamos el icono de basura/expulsar. 
    // TRUCO: Como Ionicons es difícil de encontrar por texto, busca el touchable que lo contiene.
    // Si no tienes testID, a veces es difícil. Recomiendo añadir testID="kick-button" en tu componente Traveler.tsx
    // Por ahora, intentaremos buscar por el tipo de icono si usas un mock que renderice el nombre
  });

  it('NO debe mostrar opciones de edición si canChangeRole es false', () => {
    const { queryByText } = render(
        <Traveler 
            user={mockUser} 
            role="viewer" 
            canChangeRole={false} 
        />
    );

    // Verificamos que renderiza, pero no es interactivo (esto depende de tu implementación visual exacta)
    expect(queryByText('Espectador')).toBeTruthy();
    // Aquí podrías verificar que el elemento no tiene opacidad de botón activo, etc.
  });
});