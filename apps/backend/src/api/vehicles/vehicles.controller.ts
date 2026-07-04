// src/api/vehicles/vehicles.controller.ts
import { Request, Response } from "express";
import * as VehicleService from "./vehicles.service.js";
import * as CarQuery from "./carquery.service.js";
import { asyncHandler } from "../../utils/errors.js";

/**
 * Obtiene todos los vehículos de un usuario
 */
export const getUserVehicles = asyncHandler(async (req, res) => {
  const { userId } = req.params as Record<string, string>;
  const vehicles = await VehicleService.getUserVehicles(userId);
  res.json(vehicles);
});

/**
 * Obtiene un vehículo por su ID
 */
export const getVehicleFromId = asyncHandler(async (req, res) => {
  const { vehicleId } = req.params as Record<string, string>;
  const vehicle = await VehicleService.getVehicleFromId(vehicleId);
  res.json(vehicle);
});

/**
 * Crea un nuevo vehículo para un usuario
 */
export const createVehicle = asyncHandler(async (req, res) => {
  const { userId } = req.params as Record<string, string>;
  const payload = req.body;
  const vehicle = await VehicleService.createVehicle(userId, payload);
  res.status(201).json(vehicle);
});

/**
 * Actualiza un vehículo existente
 */
export const updateVehicle = asyncHandler(async (req, res) => {
  const { userId, vehicleId } = req.params as Record<string, string>;
  const payload = req.body;
  const vehicle = await VehicleService.updateVehicle(
    vehicleId,
    userId,
    payload,
  );
  res.json(vehicle);
});

/**
 * Elimina un vehículo
 */
export const deleteVehicle = asyncHandler(async (req, res) => {
  const { userId, vehicleId } = req.params as Record<string, string>;
  await VehicleService.deleteVehicle(vehicleId, userId);
  res.status(204).send();
});

// CarQuery: fallback intencionado a resultados vacíos si el servicio externo falla,
// por eso no usan asyncHandler ni propagan el error.
export const getCarQueryMakes = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const makes = await CarQuery.getMakes();
    res.json(makes);
  } catch {
    res.json([]);
  }
};

export const getCarQueryModels = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const make = req.query.make as string;
  if (!make) {
    res.status(400).json({ error: "make is required" });
    return;
  }
  try {
    const models = await CarQuery.getModels(make, req.query.year as string);
    res.json(models);
  } catch {
    res.json([]);
  }
};

export const getCarQuerySpecs = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const make = req.query.make as string;
  const model = req.query.model as string;
  if (!make || !model) {
    res.status(400).json({ error: "make and model are required" });
    return;
  }
  try {
    const trims = await CarQuery.getTrims(
      make,
      model,
      req.query.year as string,
    );
    const specs = CarQuery.pickBestSpecs(trims);
    res.json({ specs, trims: trims.length });
  } catch {
    res.json({ specs: null, trims: 0 });
  }
};
