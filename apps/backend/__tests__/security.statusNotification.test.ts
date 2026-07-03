/**
 * Tests del helper que valida la notificación en respondToStatusCheck.
 * Impide que el owner de un viaje marque como leída/aceptada una notificación
 * arbitraria (de otro viaje o de otro tipo) pasando su id.
 */
const mockMaybeSingle = jest.fn();
const builder: any = {
  select: jest.fn(() => builder),
  eq: jest.fn(() => builder),
  maybeSingle: jest.fn(() => mockMaybeSingle()),
};
jest.mock("../src/supabase.js", () => ({
  supabase: { from: jest.fn(() => builder) },
}));

import { assertStatusCheckNotification } from "../src/api/trips/trips.service.js";

const TRIP_ID = 10;
const NOTIF_ID = "abc";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("assertStatusCheckNotification", () => {
  it("acepta una notificación trip_status_check del mismo viaje", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: NOTIF_ID, type: "trip_status_check", related_trip_id: TRIP_ID },
      error: null,
    });

    await expect(
      assertStatusCheckNotification(TRIP_ID, NOTIF_ID),
    ).resolves.toBeUndefined();
  });

  it("rechaza una notificación de otro viaje", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: NOTIF_ID, type: "trip_status_check", related_trip_id: 999 },
      error: null,
    });

    await expect(
      assertStatusCheckNotification(TRIP_ID, NOTIF_ID),
    ).rejects.toThrow(/no corresponde/i);
  });

  it("rechaza una notificación de otro tipo (p. ej. invitación)", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: NOTIF_ID, type: "invitation", related_trip_id: TRIP_ID },
      error: null,
    });

    await expect(
      assertStatusCheckNotification(TRIP_ID, NOTIF_ID),
    ).rejects.toThrow(/no corresponde/i);
  });

  it("rechaza si la notificación no existe", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      assertStatusCheckNotification(TRIP_ID, NOTIF_ID),
    ).rejects.toThrow(/No se encontró/i);
  });
});
