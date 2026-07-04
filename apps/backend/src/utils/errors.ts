import { NextFunction, Request, Response } from "express";

/**
 * Error de aplicación con código HTTP asociado.
 *
 * Los servicios lanzan estas clases en lugar de `new Error(...)` genéricos, de
 * modo que el manejador de errores global (index.ts) pueda mapear el status
 * correcto sin depender de comprobaciones frágiles por el texto del mensaje.
 *
 * `expose` indica si el mensaje es seguro para mostrarlo al cliente (true en
 * los 4xx). Para los 5xx el mensaje se genera genérico y no se filtra el
 * detalle interno (nombres de tablas, constraints de Supabase, etc.).
 */
export interface AppErrorOptions {
  code?: string;
  details?: unknown;
  expose?: boolean;
  cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(
    message: string,
    statusCode: number,
    options: AppErrorOptions = {},
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = options.code;
    this.details = options.details;
    // Por defecto, exponemos el mensaje solo en errores de cliente (4xx).
    this.expose = options.expose ?? statusCode < 500;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 400, options);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 401, options);
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 402, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 403, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 404, options);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super(message, 409, options);
  }
}

/**
 * Envuelve un controlador async para que cualquier error lanzado (o promesa
 * rechazada) se delegue automáticamente a `next(err)`, evitando el try/catch
 * repetido en cada controlador.
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler(handler: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
