// src/api/vehicles/vehicles.controller.ts
import { Request, Response } from 'express';
import * as VehicleService from './vehicles.service.js';

/**
 * Obtiene todos los vehículos de un usuario
 */
export const getUserVehicles = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        const vehicles = await VehicleService.getUserVehicles(userId);
        res.json(vehicles);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

/**
 * Obtiene un vehículo por su ID
 */
export const getVehicleFromId = async (req: Request, res: Response) => {
    const { vehicleId } = req.params;
    try {
        const vehicle = await VehicleService.getVehicleFromId(vehicleId);
        if (vehicle) {
            res.json(vehicle);
        } else {
            res.status(404).json({ error: 'Vehicle not found' });
        }
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

/**
 * Crea un nuevo vehículo para un usuario
 */
export const createVehicle = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const payload = req.body;

    try {
        const vehicle = await VehicleService.createVehicle(userId, payload);
        res.status(201).json(vehicle);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

/**
 * Actualiza un vehículo existente
 */
export const updateVehicle = async (req: Request, res: Response) => {
    const { userId, vehicleId } = req.params;
    const payload = req.body;

    try {
        const vehicle = await VehicleService.updateVehicle(vehicleId, userId, payload);
        res.json(vehicle);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('no encontrado') || err.message.includes('no pertenece')) {
            res.status(404).json({ error: err.message });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
};

/**
 * Elimina un vehículo
 */
export const deleteVehicle = async (req: Request, res: Response) => {
    const { userId, vehicleId } = req.params;

    try {
        await VehicleService.deleteVehicle(vehicleId, userId);
        res.status(204).send();
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};
