const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

// 1. Definimos las rutas del proyecto actual y de la raíz del monorepo
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

// 2. Cargamos la configuración por defecto
const config = getDefaultConfig(projectRoot);

// 3. Le decimos a Metro que vigile los cambios en todo el monorepo
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));

// 4. Le enseñamos a Metro dónde buscar las dependencias
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
];

// Obligar a Metro a buscar dependencias problemáticas de Babel en la raíz del frontend
config.resolver.extraNodeModules = {
    "@babel/runtime": path.resolve(projectRoot, "node_modules/@babel/runtime"),
};

// Mantener el comportamiento por defecto de Expo
config.resolver.disableHierarchicalLookup = false;

// 5. Aplicamos NativeWind y lo exportamos (¡UNA SOLA VEZ!)
module.exports = withNativeWind(config, { input: "./index.css" });