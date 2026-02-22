export const USER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'] as const;
export type UserRole = (typeof USER_ROLES)[number];
