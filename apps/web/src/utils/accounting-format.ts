/** Splits integer minor units into sign, whole rupees, and paise — the basis for every money render. */
function splitMinorUnits(value: string): { paise: bigint; rupees: bigint; sign: string } {
  const minor = BigInt(value);
  const absolute = minor < 0n ? -minor : minor;

  return { paise: absolute % 100n, rupees: absolute / 100n, sign: minor < 0n ? "-" : "" };
}

export function formatMinorUnits(value: string): string {
  const { paise, rupees, sign } = splitMinorUnits(value);

  return `${sign}${rupees.toLocaleString("en-IN")}.${paise.toString().padStart(2, "0")}`;
}

export function minorUnitsToDecimalString(value: string): string {
  const { paise, rupees, sign } = splitMinorUnits(value);

  if (paise === 0n) {
    return `${sign}${rupees.toString()}`;
  }

  return `${sign}${rupees.toString()}.${paise.toString().padStart(2, "0")}`;
}

export type MinorUnitParseResult =
  | {
      ok: true;
      value: string | null;
    }
  | {
      message: string;
      ok: false;
    };

export function parseDecimalAmountToMinorUnits(value: string): MinorUnitParseResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return {
      message: "Enter amounts with up to two decimal places.",
      ok: false
    };
  }

  const [major, minor = ""] = trimmed.split(".");
  const minorUnits = `${major}${minor.padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");

  if (minorUnits === "0") {
    return { ok: true, value: null };
  }

  return {
    ok: true,
    value: minorUnits
  };
}

export function parseDecimalRateToMinorUnits(value: string): MinorUnitParseResult {
  if (!value.trim()) {
    return { ok: true, value: null };
  }

  const parsed = parseDecimalAmountToMinorUnits(value);

  if (!parsed.ok) {
    return parsed;
  }

  return { ok: true, value: parsed.value ?? "0" };
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
