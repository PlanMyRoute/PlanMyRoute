// __tests__/tripStatusManagement.test.ts
import * as TripService from '../src/api/trips/trips.service';
import * as TripStatusHistoryService from '../src/api/trips/tripStatusHistory.service';
import * as UserService from '../src/api/users/users.service';

describe('Trip Status Management - Phase 2', () => {
    describe('TripStatusHistory Service', () => {
        it('should be able to import tripStatusHistory service', () => {
            expect(TripStatusHistoryService).toBeDefined();
            expect(TripStatusHistoryService.getByTripId).toBeDefined();
            expect(TripStatusHistoryService.create).toBeDefined();
            expect(TripStatusHistoryService.getTripStatistics).toBeDefined();
        });
    });

    describe('Trip Service - Status Management', () => {
        it('should have updateTripStatus method', () => {
            expect(TripService.updateTripStatus).toBeDefined();
        });

        it('should have getTripsReadyToStart method', () => {
            expect(TripService.getTripsReadyToStart).toBeDefined();
        });

        it('should have getTripsReadyToComplete method', () => {
            expect(TripService.getTripsReadyToComplete).toBeDefined();
        });

        it('should have getTripOwner method', () => {
            expect(TripService.getTripOwner).toBeDefined();
        });
    });

    describe('User Service - Preferences', () => {
        it('should have getUserPreferences method', () => {
            expect(UserService.getUserPreferences).toBeDefined();
        });

        it('should have updateUserPreferences method', () => {
            expect(UserService.updateUserPreferences).toBeDefined();
        });
    });
});

// Test de integración básico (comentado por defecto para no afectar la BD)
/*
describe('Trip Status Integration Tests', () => {
    let testTripId: number;
    let testUserId: string;

    beforeAll(async () => {
        // Aquí se podría crear un viaje de prueba
        // testTripId = ...
        // testUserId = ...
    });

    it('should update trip status and create history entry', async () => {
        const updatedTrip = await TripService.updateTripStatus(
            testTripId,
            'going',
            'user',
            'Test status change',
            testUserId
        );

        expect(updatedTrip.status).toBe('going');

        const history = await TripStatusHistoryService.getByTripId(testTripId);
        expect(history.length).toBeGreaterThan(0);
        expect(history[0].new_status).toBe('going');
    });

    it('should get trips ready to start', async () => {
        const trips = await TripService.getTripsReadyToStart();
        expect(Array.isArray(trips)).toBe(true);
    });

    it('should get trips ready to complete', async () => {
        const trips = await TripService.getTripsReadyToComplete();
        expect(Array.isArray(trips)).toBe(true);
    });

    it('should get and update user preferences', async () => {
        const preferences = await UserService.getUserPreferences(testUserId);
        expect(preferences).toHaveProperty('autoTripStatusUpdate');
        expect(preferences).toHaveProperty('timezone');

        const updated = await UserService.updateUserPreferences(testUserId, {
            autoTripStatusUpdate: true,
            timezone: 'Europe/Madrid'
        });

        expect(updated.auto_trip_status_update).toBe(true);
        expect(updated.timezone).toBe('Europe/Madrid');
    });

    afterAll(async () => {
        // Limpiar datos de prueba
    });
});
*/
