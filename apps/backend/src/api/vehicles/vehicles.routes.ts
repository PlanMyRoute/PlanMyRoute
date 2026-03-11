// src/api/vehicles/vehicles.routes.ts
import { Router } from 'express';
import * as VehicleController from './vehicles.controller.js';
import { verifyToken, requireSameUser } from '../../middleware/auth.js';

const router = Router();
const BASE_PATH = '/users/:userId/vehicles';

// Obtener todos los vehículos de un usuario (versión pública para colaboradores)
// Esta ruta permite que cualquier usuario autenticado vea los vehículos de otros usuarios
// Útil para cuando se invita a alguien a un viaje y se quiere ver sus vehículos disponibles
router.get(BASE_PATH, verifyToken, VehicleController.getUserVehicles);

// Obtener un vehículo por su ID
router.get(`${BASE_PATH}/:vehicleId`, verifyToken, requireSameUser, VehicleController.getVehicleFromId);

// Crear un nuevo vehículo
router.post(BASE_PATH, verifyToken, requireSameUser, VehicleController.createVehicle);

// Actualizar un vehículo
router.patch(`${BASE_PATH}/:vehicleId`, verifyToken, requireSameUser, VehicleController.updateVehicle);

// Eliminar un vehículo
router.delete(`${BASE_PATH}/:vehicleId`, verifyToken, requireSameUser, VehicleController.deleteVehicle);

export default router;
