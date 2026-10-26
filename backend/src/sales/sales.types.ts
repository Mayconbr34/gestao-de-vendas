export const PAYMENT_METHODS = ['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SALE_STATUSES = ['COMPLETED', 'CANCELED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];
