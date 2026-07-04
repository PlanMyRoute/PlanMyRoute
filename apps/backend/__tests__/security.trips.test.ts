/**
 * Tests de seguridad/autorización para el dominio de viajes.
 * El service está mockeado: comprobamos la lógica de autorización del controlador,
 * no la base de datos real.
 */
import request from "supertest";

// Mock del service ANTES de importar la app.
jest.mock("../src/api/trips/trips.service.js");

import { app } from "../src/index.js";
import * as TripService from "../src/api/trips/trips.service.js";

// TEST_USER_ID es el id que jest.setup.ts inyecta como usuario autenticado.
const AUTH_USER_ID = "a3e966d8-e1c0-41e2-9fd6-0519575c76e7";
const OTHER_USER_ID = "11111111-2222-3333-4444-555555555555";

const mockedTripService = TripService as jest.Mocked<typeof TripService>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Seguridad: creación de viajes (IDOR)", () => {
  it("rechaza crear un viaje en nombre de otro usuario (403)", async () => {
    mockedTripService.createTripWithRelations.mockResolvedValue({} as never);

    const res = await request(app)
      .post(`/api/travelers/${OTHER_USER_ID}/trip`)
      .send({ name: "Viaje malicioso", origin: "A", destination: "B" });

    expect(res.status).toBe(403);
    expect(mockedTripService.createTripWithRelations).not.toHaveBeenCalled();
  });

  it("permite crear un viaje para uno mismo y usa el id del token", async () => {
    mockedTripService.createTripWithRelations.mockResolvedValue({
      trip: { id: 1 },
    } as never);

    const res = await request(app)
      .post(`/api/travelers/${AUTH_USER_ID}/trip`)
      .send({ name: "Mi viaje", origin: "A", destination: "B" });

    expect(res.status).toBe(201);
    // El primer argumento (userId) debe ser el del token, nunca el del param.
    expect(mockedTripService.createTripWithRelations).toHaveBeenCalledWith(
      AUTH_USER_ID,
      undefined,
      expect.objectContaining({ name: "Mi viaje" }),
      "A",
      "B",
    );
  });
});

describe("Seguridad: mass assignment al actualizar viaje", () => {
  it("ignora campos no editables (status, generation_status, id)", async () => {
    mockedTripService.update.mockResolvedValue({ id: 7 } as never);

    await request(app)
      .patch(`/api/travelers/${AUTH_USER_ID}/trip/7`)
      .send({
        name: "Nombre nuevo",
        status: "completed",
        generation_status: "done",
        id: 999,
        total_price: 0,
      });

    expect(mockedTripService.update).toHaveBeenCalledTimes(1);
    const [, payload] = mockedTripService.update.mock.calls[0];
    expect(payload).toEqual({ name: "Nombre nuevo" });
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("generation_status");
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("total_price");
  });
});

describe("Seguridad: salir del viaje (/leave)", () => {
  it("al salir solo puede eliminarse a uno mismo, no a otro viajero", async () => {
    mockedTripService.removeUserFromTrip.mockResolvedValue({
      success: true,
    } as never);

    // El atacante intenta expulsar a OTHER_USER_ID usando la ruta de 'leave'.
    await request(app).delete(
      `/api/travelers/${OTHER_USER_ID}/trip/10/leave`,
    );

    // El service debe recibir el id del token, no el de la URL.
    expect(mockedTripService.removeUserFromTrip).toHaveBeenCalledWith(
      AUTH_USER_ID,
      10,
    );
  });
});
