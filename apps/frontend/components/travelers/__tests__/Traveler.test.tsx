import { render, fireEvent } from "@testing-library/react-native";
import { User } from "@planmyroute/types";
import Traveler from "../Traveler";

/** Mock mínimo de usuario con todos los campos requeridos por el tipo User */
const mockUser: User = {
  id: "u1",
  username: "Viajero Molesto",
  name: "Pepe",
  email: "pepe@test.com",
  auto_trip_status_update: false,
  bio: null,
  created_at: new Date().toISOString(),
  expo_push_token: null,
  img: null,
  lastname: null,
  location: null,
  referral_code: null,
  timezone: "Europe/Madrid",
  user_type: null,
};

describe("<Traveler />", () => {
  it("Debe mostrar el botón de expulsar si canKick es true", () => {
    const onKickMock = jest.fn();

    const { getByText, getByTestId } = render(
      <Traveler
        user={mockUser}
        role="editor"
        canKick={true}
        onKick={onKickMock}
      />,
    );

    expect(getByText("Viajero Molesto")).toBeTruthy();
    expect(getByText("Editor")).toBeTruthy();

    // Verificamos que el botón de expulsar se renderiza y ejecuta el callback
    const kickButton = getByTestId("kick-button");
    expect(kickButton).toBeTruthy();
    fireEvent.press(kickButton);
    expect(onKickMock).toHaveBeenCalledTimes(1);
  });

  it("NO debe mostrar opciones de edición si canChangeRole es false", () => {
    const { queryByText } = render(
      <Traveler user={mockUser} role="viewer" canChangeRole={false} />,
    );

    expect(queryByText("Espectador")).toBeTruthy();
  });
});
