import { closeDb, db } from "#@/client";
import { seedSupportedCurrencies } from "#@/queries/currency";

try {
  await seedSupportedCurrencies(db);
} finally {
  await closeDb();
}
