/**
 * Logger de depuración gateado por la variable de entorno DEBUG_VERBOSE.
 *
 * Las rutas calientes (getById de trips, createStop/updateStop) emitían muchos
 * console.log por petición, lo que añade latencia y ruido en producción.
 * Usa dlog() para esos logs informativos; deja console.error/console.warn para
 * errores reales (esos sí deben verse siempre).
 *
 * Para activarlos en desarrollo: DEBUG_VERBOSE=true
 */
const VERBOSE = process.env.DEBUG_VERBOSE === "true";

export const dlog = (...args: unknown[]): void => {
  if (VERBOSE) console.log(...args);
};
