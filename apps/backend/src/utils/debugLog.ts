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

/**
 * Logger dedicado para volcar la respuesta JSON completa de la IA, gateado por
 * la variable SHOW_AI_JSON. Se separa de DEBUG_VERBOSE a propósito: permite
 * mostrar el JSON del itinerario (útil en la demo/defensa del TFG) sin activar
 * el ruido de logs de rutas calientes que sí controla DEBUG_VERBOSE.
 *
 * Para mostrarlo: SHOW_AI_JSON=true
 */
const SHOW_AI_JSON = process.env.SHOW_AI_JSON === "true";

export const ailog = (...args: unknown[]): void => {
  if (SHOW_AI_JSON) console.log(...args);
};
