// src/api/vehicles/vehicles.controller.ts
import { Request, Response } from "express";
import * as VehicleService from "./vehicles.service.js";
import * as CarQuery from "./carquery.service.js";

/**
 * Obtiene todos los vehículos de un usuario
 */
export const getUserVehicles = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId } = req.params as Record<string, string>;
  try {
    const vehicles = await VehicleService.getUserVehicles(userId);
    res.json(vehicles);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
    } else if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
    } else if (
      err.message.includes("Ya sigues") ||
      err.message.includes("EXISTS") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

/**
 * Obtiene un vehículo por su ID
 */
export const getVehicleFromId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { vehicleId } = req.params as Record<string, string>;
  try {
    const vehicle = await VehicleService.getVehicleFromId(vehicleId);
    res.json(vehicle);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
    } else if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
    } else if (
      err.message.includes("Ya sigues") ||
      err.message.includes("EXISTS") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

/**
 * Crea un nuevo vehículo para un usuario
 */
export const createVehicle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId } = req.params as Record<string, string>;
  const payload = req.body;

  try {
    const vehicle = await VehicleService.createVehicle(userId, payload);
    res.status(201).json(vehicle);
  } catch (error) {
    const err = error as Error;
    if (err.message === "VEHICLE_LIMIT_REACHED") {
      res
        .status(403)
        .json({ error: "Has alcanzado el límite máximo de 3 vehículos" });
    } else if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
    } else if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
    } else if (
      err.message.includes("Ya sigues") ||
      err.message.includes("EXISTS") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

/**
 * Actualiza un vehículo existente
 */
export const updateVehicle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId, vehicleId } = req.params as Record<string, string>;
  const payload = req.body;

  try {
    const vehicle = await VehicleService.updateVehicle(
      vehicleId,
      userId,
      payload,
    );
    res.json(vehicle);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
    } else if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario") ||
      err.message.includes("no pertenece")
    ) {
      res.status(403).json({ error: err.message });
    } else if (
      err.message.includes("Ya sigues") ||
      err.message.includes("EXISTS") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

/**
 * Elimina un vehículo
 */
export const deleteVehicle = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { userId, vehicleId } = req.params as Record<string, string>;

  try {
    await VehicleService.deleteVehicle(vehicleId, userId);
    res.status(204).send();
  } catch (error) {
    const err = error as Error;
    if (err.message.includes("No se encontró")) {
      res.status(404).json({ error: err.message });
    } else if (
      err.message.includes("no tiene permiso") ||
      err.message.includes("Solo el propietario")
    ) {
      res.status(403).json({ error: err.message });
    } else if (
      err.message.includes("Ya sigues") ||
      err.message.includes("EXISTS") ||
      err.message.includes("ya existe")
    ) {
      res.status(409).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

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
