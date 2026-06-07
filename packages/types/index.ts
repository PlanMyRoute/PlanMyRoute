// types/index.ts

// Exportamos todos los tipos limpios definidos en app.ts
export * from './app';

// Tokenomics: costes, grants y paquetes de tokens (fuente única de verdad)
export * from './tokenomics';

// También exportamos la 'Database' completa por si se necesita para el cliente de Supabase
export * from './supabase';