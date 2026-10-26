import { BadRequestException } from '@nestjs/common';

/** Fuso usado para agrupar vendas e auditorias por dia (configurável por ambiente). */
export const ANALYTICS_TZ = process.env.ANALYTICS_TZ || 'America/Sao_Paulo';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DateRange = {
  /** Primeiro dia (inclusive), formato YYYY-MM-DD */
  from: string;
  /** Último dia (inclusive), formato YYYY-MM-DD */
  to: string;
  /** Quantidade de dias do intervalo */
  days: number;
  /** Período imediatamente anterior, de mesmo tamanho (para comparação) */
  previousFrom: string;
  previousTo: string;
};

function toIso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIso(value: string, field: string) {
  if (!ISO_DATE.test(value)) {
    throw new BadRequestException(`Parâmetro "${field}" deve estar no formato AAAA-MM-DD`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || toIso(date) !== value) {
    throw new BadRequestException(`Parâmetro "${field}" contém uma data inválida`);
  }
  return date;
}

/**
 * Interpreta os filtros de período (from/to). Sem filtros, usa os últimos `defaultDays` dias.
 * Datas são dias de calendário; a conversão para o fuso é feita no SQL.
 */
export function parseDateRange(from?: string, to?: string, defaultDays = 30, maxDays = 731): DateRange {
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  const toDate = to ? parseIso(to, 'to') : todayUtc;
  const fromDate = from ? parseIso(from, 'from') : new Date(toDate.getTime() - (defaultDays - 1) * DAY_MS);

  if (fromDate.getTime() > toDate.getTime()) {
    throw new BadRequestException('A data inicial deve ser anterior ou igual à data final');
  }

  const days = Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS) + 1;
  if (days > maxDays) {
    throw new BadRequestException(`O período máximo é de ${maxDays} dias`);
  }

  const previousTo = new Date(fromDate.getTime() - DAY_MS);
  const previousFrom = new Date(previousTo.getTime() - (days - 1) * DAY_MS);

  return {
    from: toIso(fromDate),
    to: toIso(toDate),
    days,
    previousFrom: toIso(previousFrom),
    previousTo: toIso(previousTo)
  };
}

/** Expressão SQL que converte um dia (YYYY-MM-DD) no instante de início desse dia no fuso. */
export function dayStartSql(param: string, tzParam: string) {
  return `((${param})::date::timestamp AT TIME ZONE ${tzParam})`;
}

/** Expressão SQL do instante inicial do dia seguinte (limite exclusivo do período). */
export function dayEndExclusiveSql(param: string, tzParam: string) {
  return `(((${param})::date + 1)::timestamp AT TIME ZONE ${tzParam})`;
}
