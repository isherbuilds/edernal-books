import {
  type GstRegistrationType,
  GST_REGISTRATION_TYPES,
  type PartyKind,
  PARTY_KINDS
} from "@tsu-stack/core/parties";
import { m } from "@tsu-stack/i18n/messages";

export function partyKindLabel(kind: PartyKind): string {
  switch (kind) {
    case "customer":
      return m.owner_records__party_kind_customer();
    case "vendor":
      return m.owner_records__party_kind_vendor();
    case "both":
      return m.owner_records__party_kind_both();
  }
}

export const PARTY_KIND_OPTIONS = PARTY_KINDS.map((value) => {
  return {
    label: partyKindLabel(value),
    value
  };
});

export function gstRegistrationTypeLabel(type: GstRegistrationType): string {
  switch (type) {
    case "registered_regular":
      return m.owner_records__gst_type_registered_regular();
    case "registered_composition":
      return m.owner_records__gst_type_registered_composition();
    case "unregistered":
      return m.owner_records__gst_type_unregistered();
    case "consumer":
      return m.owner_records__gst_type_consumer();
  }
}

export const GST_REGISTRATION_TYPE_OPTIONS = GST_REGISTRATION_TYPES.map((value) => {
  return {
    label: gstRegistrationTypeLabel(value),
    value
  };
});
