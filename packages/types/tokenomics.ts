// types/tokenomics.ts
// Fuente ÚNICA de verdad para costes, grants y paquetes de tokens de IA.
// Consumido por backend (cobro/concesión) y frontend (gating/UI).
// Mantener sincronizado con el enum `token_transaction_type` de la BD
// y con .claude/SPEC_TOKENOMICS.md.

// --- Tipos de transacción (deben coincidir con el enum SQL) ---
export const TOKEN_TRANSACTION_TYPES = [
    // Sources
    'WELCOME_BONUS',
    'PURCHASE_BASIC',
    'PURCHASE_STANDARD',
    'PURCHASE_TRAVELER',
    'REMOVE_ADS_BONUS',
    'PREMIUM_ANNUAL_GRANT',
    'ADMIN_GRANT',
    'REFUND',
    // Sinks
    'GENERATE_TRIP',
    'ADDON_ROUNDTRIP',
    'ADDON_REFUEL',
    'MODIFY_TRIP',
    'POI_RECOMMENDATION',
] as const;

export type TokenTransactionType = (typeof TOKEN_TRANSACTION_TYPES)[number];

// --- Acciones de IA que consumen tokens (sinks) ---
export type AiAction =
    | 'GENERATE_TRIP'
    | 'ADDON_ROUNDTRIP'
    | 'ADDON_REFUEL'
    | 'MODIFY_TRIP'
    | 'POI_RECOMMENDATION';

/**
 * Coste base por acción (en tokens).
 * Estado fase 1: solo GENERATE_TRIP y ADDON_ROUNDTRIP se cobran de verdad;
 * el resto es scaffolding hasta que exista la feature de IA correspondiente.
 */
export const ACTION_COSTS: Record<AiAction, number> = {
    GENERATE_TRIP: 10,
    ADDON_ROUNDTRIP: 5,
    ADDON_REFUEL: 3,
    MODIFY_TRIP: 3,
    POI_RECOMMENDATION: 1,
};

/**
 * Coste efectivo considerando ventajas premium (tier-aware).
 * Fase 1: premium paga lo mismo que free, salvo ADDON_REFUEL que es gratis
 * (el planificador de repostaje/carga es una ventaja premium).
 */
export function getActionCost(action: AiAction, isPremium: boolean): number {
    if (isPremium && action === 'ADDON_REFUEL') return 0;
    return ACTION_COSTS[action];
}

// --- Grants (sources que no son compra de paquete) ---
export const TOKEN_GRANTS = {
    WELCOME_BONUS: 20,
    PREMIUM_ANNUAL_GRANT: 1000,
    REMOVE_ADS_BONUS: 50,
} as const;

// --- Paquetes de compra única (Stripe mode: 'payment') ---
export type TokenPackageId = 'basic' | 'standard' | 'traveler';

export interface TokenPackage {
    id: TokenPackageId;
    type: Extract<
        TokenTransactionType,
        'PURCHASE_BASIC' | 'PURCHASE_STANDARD' | 'PURCHASE_TRAVELER'
    >;
    tokens: number;
    priceEur: number;
    /** Nombre de la env var que contiene el price id one-time de Stripe. */
    stripePriceEnvKey: string;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
    { id: 'basic', type: 'PURCHASE_BASIC', tokens: 30, priceEur: 4.99, stripePriceEnvKey: 'STRIPE_PRICE_TOKENS_BASIC' },
    { id: 'standard', type: 'PURCHASE_STANDARD', tokens: 80, priceEur: 9.99, stripePriceEnvKey: 'STRIPE_PRICE_TOKENS_STANDARD' },
    { id: 'traveler', type: 'PURCHASE_TRAVELER', tokens: 200, priceEur: 19.99, stripePriceEnvKey: 'STRIPE_PRICE_TOKENS_TRAVELER' },
];

export function getTokenPackage(id: string): TokenPackage | undefined {
    return TOKEN_PACKAGES.find((p) => p.id === id);
}
