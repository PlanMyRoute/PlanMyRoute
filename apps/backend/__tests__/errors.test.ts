/**
 * Tests de las clases de error tipadas y del wrapper asyncHandler.
 */
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  PaymentRequiredError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  asyncHandler,
} from "../src/utils/errors.js";

describe("Clases de error tipadas", () => {
  it("cada subclase lleva su statusCode y es instancia de AppError", () => {
    expect(new BadRequestError("x").statusCode).toBe(400);
    expect(new UnauthorizedError("x").statusCode).toBe(401);
    expect(new PaymentRequiredError("x").statusCode).toBe(402);
    expect(new ForbiddenError("x").statusCode).toBe(403);
    expect(new NotFoundError("x").statusCode).toBe(404);
    expect(new ConflictError("x").statusCode).toBe(409);

    expect(new NotFoundError("x")).toBeInstanceOf(AppError);
    expect(new NotFoundError("x")).toBeInstanceOf(Error);
  });

  it("preserva el mensaje (para compatibilidad con checks por texto)", () => {
    const err = new NotFoundError("No se encontró el viaje");
    expect(err.message).toBe("No se encontró el viaje");
  });

  it("los errores 4xx son exponibles al cliente; expose por defecto true", () => {
    expect(new NotFoundError("x").expose).toBe(true);
    expect(new ForbiddenError("x").expose).toBe(true);
  });

  it("admite code y details (p. ej. tokens insuficientes)", () => {
    const err = new PaymentRequiredError("Sin tokens", {
      code: "INSUFFICIENT_TOKENS",
      details: { required: 5, balance: 2 },
    });
    expect(err.code).toBe("INSUFFICIENT_TOKENS");
    expect(err.details).toEqual({ required: 5, balance: 2 });
  });
});

describe("asyncHandler", () => {
  it("pasa los errores lanzados a next()", async () => {
    const boom = new NotFoundError("nope");
    const handler = asyncHandler(async () => {
      throw boom;
    });
    const next = jest.fn();

    await handler({} as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  it("no llama a next si el handler resuelve sin error", async () => {
    const handler = asyncHandler(async (_req: any, res: any) => {
      res.json({ ok: true });
    });
    const next = jest.fn();
    const res: any = { json: jest.fn() };

    await handler({} as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
