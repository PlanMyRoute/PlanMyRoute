// __tests__/tripStatusManagement.test.ts
import * as TripService from "../src/api/trips/trips.service.js";
import * as TripStatusHistoryService from "../src/api/trips/tripStatusHistory.service.js";
import * as UserService from "../src/api/users/users.service.js";

describe("Trip Status Management - Phase 2", () => {
  describe("TripStatusHistory Service", () => {
    it("debería poder importar el servicio tripStatusHistory", () => {
      expect(TripStatusHistoryService).toBeDefined();
      expect(TripStatusHistoryService.getByTripId).toBeDefined();
      expect(TripStatusHistoryService.create).toBeDefined();
    });
  });

  describe("Trip Service - Status Management", () => {
    it("debería tener el método updateTripStatus", () => {
      expect(TripService.updateTripStatus).toBeDefined();
    });

    it("debería tener el método getTripsReadyToStart", () => {
      expect(TripService.getTripsReadyToStart).toBeDefined();
    });

    it("debería tener el método getTripsReadyToComplete", () => {
      expect(TripService.getTripsReadyToComplete).toBeDefined();
    });

    it("debería tener el método getTripOwner", () => {
      expect(TripService.getTripOwner).toBeDefined();
    });
  });

  describe("User Service - Preferences", () => {
    it("debería tener el método getUserPreferences", () => {
      expect(UserService.getUserPreferences).toBeDefined();
    });

    it("debería tener el método updateUserPreferences", () => {
      expect(UserService.updateUserPreferences).toBeDefined();
    });
  });
});

// Tests de integración deshabilitados — requieren BD real y fixtures de datos
describe.skip("Trip Status Integration Tests — pendiente configurar fixtures", () => {
  it("debería actualizar el estado del viaje y crear entrada en historial", () => {
    // Pendiente: requiere viaje y usuario de prueba creados en fixtures
  });

  it("debería obtener viajes listos para iniciar", () => {
    // Pendiente: requiere fixtures de viajes con fechas apropiadas
  });

  it("debería obtener viajes listos para completar", () => {
    // Pendiente: requiere fixtures de viajes con fechas apropiadas
  });

  it("debería obtener y actualizar preferencias de usuario", () => {
    // Pendiente: requiere BD real y fixtures de datos
  });
});
