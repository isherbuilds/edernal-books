const PERIOD_MONTH_FORMATTER = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC"
});

export function buildAccountingPeriods(input: {
  endDate: string;
  fiscalYearId: string;
  organizationId: string;
  startDate: string;
}) {
  const start = parseIsoDate(input.startDate);
  const fiscalEnd = parseIsoDate(input.endDate);

  const periods = [];
  let periodStart = start;

  while (periodStart.getTime() <= fiscalEnd.getTime()) {
    const monthEnd = utcDate(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0);
    const periodEnd = monthEnd.getTime() > fiscalEnd.getTime() ? fiscalEnd : monthEnd;

    periods.push({
      endDate: formatIsoDate(periodEnd),
      fiscalYearId: input.fiscalYearId,
      name: `${PERIOD_MONTH_FORMATTER.format(periodStart)} ${periodStart.getUTCFullYear()}`,
      organizationId: input.organizationId,
      startDate: formatIsoDate(periodStart)
    });

    periodStart = utcDate(
      periodEnd.getUTCFullYear(),
      periodEnd.getUTCMonth(),
      periodEnd.getUTCDate() + 1
    );
  }

  return periods;
}

export function formatFiscalYearLabel(startDate: string, endDate: string): string {
  return `${startDate.slice(2, 4)}-${endDate.slice(2, 4)}`;
}

export function formatSequenceNumber(input: {
  padding: number;
  prefix: string;
  sequenceValue: string;
  suffix: string;
}): string {
  return `${input.prefix}${input.sequenceValue.padStart(input.padding, "0")}${input.suffix}`;
}

export function getFiscalYearStartMonthFromEndDate(endDate: string): number {
  const end = parseIsoDate(endDate);
  const nextDay = utcDate(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1);

  return nextDay.getUTCMonth() + 1;
}

export function getFiscalYearEndDate(input: {
  booksStartDate: string;
  fiscalYearStartMonth: number;
}): string {
  const start = parseIsoDate(input.booksStartDate);
  const fiscalStartYear =
    start.getUTCMonth() + 1 < input.fiscalYearStartMonth
      ? start.getUTCFullYear() - 1
      : start.getUTCFullYear();

  return formatIsoDate(utcDate(fiscalStartYear + 1, input.fiscalYearStartMonth - 1, 0));
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return utcDate(year, month - 1, day);
}

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
