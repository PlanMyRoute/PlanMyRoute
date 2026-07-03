/**
 * Tests de seguridad: una parada solo puede modificarse/borrarse a través del
 * viaje al que realmente pertenece. Con :tripId en la ruta se validan los
 * permisos, pero hay que impedir que un editor de SU viaje toque una parada
 * de OTRO viaje pasando su propio tripId + un stopId ajeno (IDOR).
 */
import request from "supertest";

jest.mock("../src/api/itinerary/itinerary.service.js");

import { app } from "../src/index.js";
import * as ItineraryService from "../src/api/itinerary/itinerary.service.js";

const mocked = ItineraryService as jest.Mocked<typeof ItineraryService>;

const MY_TRIP_ID = 10;
const OTHER_TRIP_ID = 99;
const STOP_ID = "500";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Seguridad: pertenencia parada → viaje", () => {
  it("PATCH de una parada de otro viaje devuelve 404 y no muta", async () => {
    // La parada 500 pertenece al viaje 99, pero se accede vía el viaje 10.
    mocked.getStopById.mockResolvedValue({
      id: 500,
      trip_id: OTHER_TRIP_ID,
    } as never);

    const res = await request(app)
      .patch(`/api/trip/${MY_TRIP_ID}/stop/${STOP_ID}`)
      .send({ name: "hackeada" });

    expect(res.status).toBe(404);
    expect(mocked.updateStop).not.toHaveBeenCalled();
  });

  it("DELETE de una parada de otro viaje devuelve 404 y no borra", async () => {
    mocked.getStopById.mockResolvedValue({
      id: 500,
      trip_id: OTHER_TRIP_ID,
    } as never);

    const res = await request(app).delete(
      `/api/trip/${MY_TRIP_ID}/stop/${STOP_ID}`,
    );

    expect(res.status).toBe(404);
    expect(mocked.deleteStop).not.toHaveBeenCalled();
  });

  it("PATCH de una parada del propio viaje sí muta", async () => {
    mocked.getStopById.mockResolvedValue({
      id: 500,
      trip_id: MY_TRIP_ID,
    } as never);
    mocked.updateStop.mockResolvedValue({ id: 500 } as never);

    const res = await request(app)
      .patch(`/api/trip/${MY_TRIP_ID}/stop/${STOP_ID}`)
      .send({ name: "válida" });

    expect(res.status).toBe(200);
    expect(mocked.updateStop).toHaveBeenCalledTimes(1);
  });
});
