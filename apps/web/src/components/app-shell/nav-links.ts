import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { m } from "@tsu-stack/i18n/messages";
import { type LinkProps } from "@tsu-stack/i18n/tanstack-start/components/link";

type NavbarLink =
  | { label: () => string; href: LinkProps["href"]; to?: never }
  | { label: () => string; href?: never; to: LinkProps["to"] };

export const navLinks: NavbarLink[] = [
  {
    label: () => m.navbar__playground(),
    to: "/playground"
  },
  {
    label: () => m.navbar__dashboard(),
    to: "/"
  },
  {
    href: `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/docs`,
    label: () => m.navbar__api_docs()
  }
];

export type OrgAppLinkTo =
  | "/$orgSlug"
  | "/$orgSlug/accounting/journal-entries"
  | "/$orgSlug/reports/general-ledger"
  | "/$orgSlug/reports/trial-balance"
  | "/$orgSlug/settings/accounting-periods"
  | "/$orgSlug/settings/business"
  | "/$orgSlug/settings/chart-of-accounts";

export function getOrgAppLink(orgSlug: string, to: OrgAppLinkTo): LinkProps {
  return {
    params: {
      orgSlug
    },
    to
  };
}
