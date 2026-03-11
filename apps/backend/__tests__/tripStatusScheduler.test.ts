// __tests__/tripStatusScheduler.test.ts
import * as TripStatusScheduler from '../src/jobs/tripStatusScheduler';
import * as TripStatusChecker from '../src/jobs/tripStatusChecker';

describe('Trip Status Scheduler - Phase 3', () => {
    describe('TripStatusScheduler Module', () => {
        it('should have initScheduler function', () => {
            expect(TripStatusScheduler.initScheduler).toBeDefined();
            expect(typeof TripStatusScheduler.initScheduler).toBe('function');
        });

        it('should have stopScheduler function', () => {
            expect(TripStatusScheduler.stopScheduler).toBeDefined();
            expect(typeof TripStatusScheduler.stopScheduler).toBe('function');
        });

        it('should have restartScheduler function', () => {
            expect(TripStatusScheduler.restartScheduler).toBeDefined();
            expect(typeof TripStatusScheduler.restartScheduler).toBe('function');
        });

        it('should have getSchedulerStatus function', () => {
            expect(TripStatusScheduler.getSchedulerStatus).toBeDefined();
            expect(typeof TripStatusScheduler.getSchedulerStatus).toBe('function');
        });

        it('should have triggerManualCheck function', () => {
            expect(TripStatusScheduler.triggerManualCheck).toBeDefined();
            expect(typeof TripStatusScheduler.triggerManualCheck).toBe('function');
        });
    });

    describe('TripStatusChecker Module', () => {
        it('should have checkTripsToStart function', () => {
            expect(TripStatusChecker.checkTripsToStart).toBeDefined();
            expect(typeof TripStatusChecker.checkTripsToStart).toBe('function');
        });

        it('should have checkTripsToComplete function', () => {
            expect(TripStatusChecker.checkTripsToComplete).toBeDefined();
            expect(typeof TripStatusChecker.checkTripsToComplete).toBe('function');
        });

        it('should have runAllChecks function', () => {
            expect(TripStatusChecker.runAllChecks).toBeDefined();
            expect(typeof TripStatusChecker.runAllChecks).toBe('function');
        });
    });

    describe('Scheduler Status', () => {
        it('should return scheduler status', () => {
            const status = TripStatusScheduler.getSchedulerStatus();

            expect(status).toBeDefined();
            expect(status).toHaveProperty('isRunning');
            expect(status).toHaveProperty('tasksCount');
            expect(status).toHaveProperty('nextExecution');
            expect(status).toHaveProperty('timezone');
            expect(status.timezone).toBe('UTC');
        });
    });
});

// Tests de integración (comentados por defecto)
/*
describe('Trip Status Scheduler Integration Tests', () => {
    beforeAll(() => {
        // Inicializar el scheduler para tests
        TripStatusScheduler.initScheduler();
    });

    afterAll(() => {
        // Detener el scheduler después de los tests
        TripStatusScheduler.stopScheduler();
    });

    it('should start scheduler successfully', () => {
        const status = TripStatusScheduler.getSchedulerStatus();
        expect(status.isRunning).toBe(true);
        expect(status.tasksCount).toBeGreaterThan(0);
    });

    it('should stop scheduler successfully', () => {
        TripStatusScheduler.stopScheduler();
        const status = TripStatusScheduler.getSchedulerStatus();
        expect(status.isRunning).toBe(false);
        expect(status.tasksCount).toBe(0);
    });

    it('should restart scheduler successfully', () => {
        TripStatusScheduler.restartScheduler();
        const status = TripStatusScheduler.getSchedulerStatus();
        expect(status.isRunning).toBe(true);
    });

    it('should trigger manual check without errors', async () => {
        await expect(TripStatusScheduler.triggerManualCheck()).resolves.not.toThrow();
    });

    it('should check trips to start without errors', async () => {
        await expect(TripStatusChecker.checkTripsToStart()).resolves.not.toThrow();
    });

    it('should check trips to complete without errors', async () => {
        await expect(TripStatusChecker.checkTripsToComplete()).resolves.not.toThrow();
    });

    it('should run all checks without errors', async () => {
        await expect(TripStatusChecker.runAllChecks()).resolves.not.toThrow();
    });
});
*/
