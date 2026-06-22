const RESERVED_ORGANIZATION_SLUGS = new Set([
  "api",
  "auth",
  "de",
  "en",
  "error",
  "home",
  "llms.txt",
  "login",
  "organizations",
  "playground",
  "privacy-policy",
  "robots.txt",
  "server",
  "signup",
  "sitemap.xml",
  "terms-of-service"
]);

export function normalizeOrganizationSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isReservedOrganizationSlug(slug: string) {
  return RESERVED_ORGANIZATION_SLUGS.has(slug.toLowerCase());
}
