const QUANTITY_SCALE = 1_000_000n;

function quantityToMicroUnits(quantity: string): bigint {
  const [whole, fraction = ""] = quantity.split(".");
  return BigInt(whole) * QUANTITY_SCALE + BigInt(fraction.padEnd(6, "0"));
}

export function computeLineTotalMinor(quantity: string, rateMinor: string): bigint {
  const product = quantityToMicroUnits(quantity) * BigInt(rateMinor);
  return (product + QUANTITY_SCALE / 2n) / QUANTITY_SCALE;
}

export function computeDocumentTotalMinor(
  lines: ReadonlyArray<{ quantity: string; rateMinor: string }>
): bigint {
  return lines.reduce(
    (sum, line) => sum + computeLineTotalMinor(line.quantity, line.rateMinor),
    0n
  );
}
