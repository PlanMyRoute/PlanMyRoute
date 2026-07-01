import { render } from "@testing-library/react-native";
import { Trip } from "@planmyroute/types";
import { TripCard } from "../TripCard";

// 1. Mock de AuthContext (para saber quién es el usuario)
jest.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

// 2. Mock de Hooks de Trips
jest.mock("../../../hooks/useTrips", () => ({
  useDeleteTrip: () => ({ mutate: jest.fn() }),
  useLeaveTrip: () => ({ mutate: jest.fn() }),
  useTripStopsCount: () => ({ count: 5, isLoading: false }),
}));

// 2b. Mock de Itinerary hooks
jest.mock("../../../hooks/useItinerary", () => ({
  useStops: () => ({ stops: [], isLoading: false }),
}));

// 2c. Mock de TripAccess (uses React Query)
jest.mock("../../../hooks/useTripAccess", () => ({
  useTripAccess: () => ({
    accessLevel: null,
    isLoading: false,
    error: null,
    canView: true,
    canEdit: true,
    canDelete: true,
    isOwner: true,
    role: "owner",
    refetch: jest.fn(),
  }),
}));

// 3. Mock de Permisos
jest.mock("../../../hooks/useTripPermissions", () => ({
  useTripPermissions: () => ({
    canEdit: true,
    canDelete: true,
    role: "owner",
    isOwner: true,
  }),
}));

// 4. Mock de Contexto de Viaje
jest.mock("../../../context/TripContext", () => ({
  useTripContext: () => ({ setCurrentTrip: jest.fn(), setTripId: jest.fn() }),
}));

/** Mock mínimo de viaje con todos los campos requeridos por el tipo Trip */
const mockTrip: Trip = {
  id: 1,
  name: "Viaje a los Alpes",
  description: "Ski y montaña",
  start_date: new Date("2025-01-01").toISOString(),
  end_date: new Date("2025-01-10").toISOString(),
  status: "planning",
  n_adults: 2,
  additional_comments: null,
  circular: null,
  cover_image_url: null,
  created_at: new Date().toISOString(),
  end_time: null,
  estimated_price_max: null,
  estimated_price_min: null,
  generation_status: "completed",
  n_babies: null,
  n_children: null,
  n_elders: null,
  n_pets: null,
  start_time: null,
  total_distance_meters: null,
  total_price: null,
  type: ["cultural"],
  updated_at: null,
};

describe("<TripCard />", () => {
  it("Debe mostrar la información del viaje", () => {
    const { getByText } = render(<TripCard trip={mockTrip} />);

    expect(getByText("Viaje a los Alpes")).toBeTruthy();
    expect(getByText("Ski y montaña")).toBeTruthy();
  });
});
