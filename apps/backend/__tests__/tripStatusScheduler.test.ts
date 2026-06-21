// __tests__/tripStatusScheduler.test.ts
import * as TripStatusScheduler from "../src/jobs/tripStatusScheduler.js";
import * as TripStatusChecker from "../src/jobs/tripStatusChecker.js";

describe("Trip Status Scheduler - Phase 3", () => {
  describe("TripStatusScheduler Module", () => {
    it("debería exportar las funciones del scheduler", () => {
      expect(TripStatusScheduler.initScheduler).toBeDefined();
      expect(TripStatusScheduler.stopScheduler).toBeDefined();
      expect(TripStatusScheduler.restartScheduler).toBeDefined();
      expect(TripStatusScheduler.triggerManualCheck).toBeDefined();
      expect(TripStatusScheduler.getSchedulerStatus).toBeDefined();
    });
  });

  describe("TripStatusChecker Module", () => {
    it("debería exportar las funciones del checker", () => {
      expect(TripStatusChecker.checkTripsToStart).toBeDefined();
      expect(TripStatusChecker.checkTripsToComplete).toBeDefined();
      expect(TripStatusChecker.runAllChecks).toBeDefined();
    });
  });

  describe("Estado del Scheduler", () => {
    it("debería devolver el estado del scheduler con las propiedades esperadas", () => {
      const status = TripStatusScheduler.getSchedulerStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty("isRunning");
      expect(status).toHaveProperty("tasksCount");
      expect(status).toHaveProperty("nextExecution");
      expect(status).toHaveProperty("timezone");
      expect(status.timezone).toBe("UTC");
    });
  });
});

// Tests de integración deshabilitados — requieren inicializar el scheduler real
describe.skip("Trip Status Scheduler Integration Tests — pendiente entorno aislado", () => {
  it("debería iniciar el scheduler correctamente", () => {
    // Pendiente: requiere inicialización real del scheduler
  });

  it("debería detener el scheduler correctamente", () => {
    // Pendiente: requiere scheduler iniciado
  });

  it("debería reiniciar el scheduler correctamente", () => {
    // Pendiente: requiere scheduler iniciado
  });

  it("debería ejecutar una verificación manual sin errores", () => {
    // Pendiente: requiere BD real
  });

  it("debería verificar viajes para iniciar sin errores", () => {
    // Pendiente: requiere BD real
  });

  it("debería verificar viajes para completar sin errores", () => {
    // Pendiente: requiere BD real
  });

  it("debería ejecutar todas las verificaciones sin errores", () => {
    // Pendiente: requiere BD real
  });
});
