/**
 * Converte colunas DECIMAL/NUMERIC (retornadas como string pelo driver pg)
 * para number na leitura, mantendo o valor original na escrita.
 */
export const decimalTransformer = {
  to(value?: number | null) {
    return value;
  },
  from(value?: string | null) {
    if (value === null || value === undefined) return null;
    return Number(value);
  }
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
