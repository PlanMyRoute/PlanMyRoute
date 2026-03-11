const scanner = require("sonarqube-scanner").default;

scanner(
  {
    serverUrl: "http://localhost:9000",
    options: {
      // BORRA login y password
      // AÑADE ESTO:
      "sonar.token": "squ_73650fac0cbe5b4500e223d0b7ff75ca8994abad", // Ej: sqp_a1b2c3...

      "sonar.projectKey": "PlanMyRoute_Frontend",
      "sonar.projectName": "PlanMyRoute App Móvil",
      "sonar.projectVersion": "1.0.0",
      "sonar.sources": "app,components,hooks,services,utils,constants",
      "sonar.tests": "app,components,hooks,services",
      "sonar.test.inclusions": "**/*.test.tsx,**/*.test.ts",
      "sonar.typescript.lcov.reportPaths": "coverage/lcov.info",
      "sonar.exclusions":
        "node_modules/**,.expo/**,assets/**,**/*.test.tsx,**/*.test.ts",
    },
  },
  () => process.exit()
);
