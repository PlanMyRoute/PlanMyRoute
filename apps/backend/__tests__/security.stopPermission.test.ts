/**
 * Tests unitarios del middleware requireStopPermission.
 *
 * Rutas como POST /stop/:stopId/attachments no tienen :tripId en la URL, por lo
 * que requirePermission (que lee req.params.tripId || req.params.id) siempre
 * devolvía 400. Este middleware resuelve el trip_id a partir del stop y luego
 * aplica la lógica de permisos normal.
 */

// Usamos la implementación REAL de permissions (jest.setup la mockea globalmente).
jest.unmock("../src/middleware/permissions.js");

// Mock del cliente de Supabase con un query builder encadenable configurable.
const mockMaybeSingle = jest.fn();
const builder: any = {
  select: jest.fn(() => builder),
  eq: jest.fn(() => builder),
  single: jest.fn(() => mockMaybeSingle()),
  maybeSingle: jest.fn(() => mockMaybeSingle()),
};
jest.mock("../src/supabase.js", () => ({
  supabase: { from: jest.fn(() => builder) },
}));

const { requireStopPermission } = jest.requireActual(
  "../src/middleware/permissions.js",
);

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res;
}

const USER_ID = "user-1";
const STOP_ID = "500";
const TRIP_ID = 10;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requireStopPermission", () => {
  it("resuelve el trip del stop y permite al editor (llama next, no 400)", async () => {
    // 1ª llamada: stop → trip_id ; 2ª: rol del usuario ; 3ª: estado del viaje
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { trip_id: TRIP_ID }, error: null }) // stop
      .mockResolvedValueOnce({ data: { user_role: "editor" }, error: null }) // rol
      .mockResolvedValueOnce({ data: { status: "planning" }, error: null }); // estado

    const req: any = { params: { stopId: STOP_ID }, userId: USER_ID };
    const res = mockRes();
    const next = jest.fn();

    await requireStopPermission("edit_stop")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    // El trip resuelto queda disponible para el controlador.
    expect(req.params.tripId).toBe(String(TRIP_ID));
  });

  it("devuelve 404 si el stop no existe", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const req: any = { params: { stopId: "999" }, userId: USER_ID };
    const res = mockRes();
    const next = jest.fn();

    await requireStopPermission("view_trip")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it("deniega (403) a un guest que intenta editar", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { trip_id: TRIP_ID }, error: null }) // stop
      .mockResolvedValueOnce({ data: null, error: null }) // rol → guest
      .mockResolvedValueOnce({ data: { status: "planning" }, error: null }); // estado

    const req: any = { params: { stopId: STOP_ID }, userId: USER_ID };
    const res = mockRes();
    const next = jest.fn();

    await requireStopPermission("edit_stop")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});
