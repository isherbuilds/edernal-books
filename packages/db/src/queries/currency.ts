import { sql } from "drizzle-orm";

import { SUPPORTED_CURRENCIES } from "@tsu-stack/core/organizations";

import { type DatabaseOrTransaction } from "#@/client";
import { currency } from "#@/schema/organization";

export async function seedSupportedCurrencies(dbOrTx: DatabaseOrTransaction): Promise<void> {
  await dbOrTx
    .insert(currency)
    .values([...SUPPORTED_CURRENCIES])
    .onConflictDoUpdate({
      set: {
        active: sql`excluded.active`,
        decimalPlaces: sql`excluded.decimal_places`,
        name: sql`excluded.name`,
        symbol: sql`excluded.symbol`
      },
      target: currency.code
    });
}
