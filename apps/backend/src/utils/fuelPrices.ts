/**
 * Precios por defecto por tipo de combustible (€/L, o €/kWh para eléctrico).
 * Usados tanto por el asesor de repostaje (coste de cada parada) como por el
 * cálculo del gasto estimado de carburante de la ruta completa.
 */
export const DEFAULT_FUEL_PRICE: Record<string, number> = {
  gasoline: 1.75,
  diesel: 1.65,
  LPG: 0.92,
  electric: 0.28,
};
