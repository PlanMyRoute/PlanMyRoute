-- Migración: añadir price_per_night a la tabla accommodation
-- Permite almacenar el precio por noche que genera la IA para calcular
-- el coste total de alojamiento en la sección de gastos del viaje.

ALTER TABLE accommodation
ADD COLUMN IF NOT EXISTS price_per_night NUMERIC(10, 2) DEFAULT NULL;
