export const TAX_TYPES = ['TRIBUTADO', 'ICMS_ST', 'ISENTO'] as const;
export type TaxType = (typeof TAX_TYPES)[number];

export const FISCAL_REGIMES = ['SIMPLES', 'NORMAL'] as const;
export type FiscalRegime = (typeof FISCAL_REGIMES)[number];

export const FISCAL_MODES = ['TRIBUTADO', 'ICMS_ST', 'ISENTO'] as const;
export type FiscalMode = (typeof FISCAL_MODES)[number];
