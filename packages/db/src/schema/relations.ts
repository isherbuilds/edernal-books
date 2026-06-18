import { defineRelations } from "drizzle-orm";

import { auditEvent } from "#@/schema/audit";
import {
  account,
  invitation,
  member,
  organization,
  session,
  user,
  verification
} from "#@/schema/auth.schema";
import { idempotencyLedger } from "#@/schema/idempotency";
import { currency, organizationSetting } from "#@/schema/organization";
import { outboxEvent } from "#@/schema/outbox";

const schema = {
  account,
  auditEvent,
  currency,
  idempotencyLedger,
  invitation,
  member,
  organization,
  organizationSetting,
  outboxEvent,
  session,
  user,
  verification
};

export const relations = defineRelations(schema, (r) => {
  return {
    auditEvent: {
      organization: r.one.organization({
        from: r.auditEvent.organizationId,
        to: r.organization.id
      }),
      user: r.one.user({
        from: r.auditEvent.userId,
        to: r.user.id
      })
    },
    currency: {
      organizationSettings: r.many.organizationSetting()
    },
    idempotencyLedger: {
      organization: r.one.organization({
        from: r.idempotencyLedger.organizationId,
        to: r.organization.id
      }),
      user: r.one.user({
        from: r.idempotencyLedger.userId,
        to: r.user.id
      })
    },
    organizationSetting: {
      baseCurrency: r.one.currency({
        from: r.organizationSetting.baseCurrencyCode,
        to: r.currency.code
      }),
      organization: r.one.organization({
        from: r.organizationSetting.organizationId,
        to: r.organization.id
      })
    },
    outboxEvent: {
      organization: r.one.organization({
        from: r.outboxEvent.organizationId,
        to: r.organization.id
      })
    }
  };
});
