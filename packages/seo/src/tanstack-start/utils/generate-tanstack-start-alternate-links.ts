import {
  type TanStackStartSeoAlternates,
  type TanStackStartSeoLinkTag
} from "#@/tanstack-start/types";
import { getLocalizedCanonicalPath } from "#@/tanstack-start/utils/get-localized-canonical-path";
import { resolveRelativePathToAbsoluteUrl } from "#@/tanstack-start/utils/resolve-relative-path-to-absolute-url";

const LEADING_SLASHES_REGEX = /^\/+/;
const TRAILING_SLASHES_REGEX = /\/+$/;

export function generateTanStackStartAlternateLinks({
  baseLocale,
  basePath,
  baseUrl,
  canonicalPath,
  locale,
  locales
}: TanStackStartSeoAlternates & {
  basePath?: string;
  baseUrl: string;
}): TanStackStartSeoLinkTag[] {
  const links: TanStackStartSeoLinkTag[] = [
    {
      href: resolveRelativePathToAbsoluteUrl(
        withBasePath(getLocalizedCanonicalPath({ baseLocale, canonicalPath, locale }), basePath),
        { baseUrl }
      ),
      rel: "canonical"
    }
  ];

  if (!locales?.length) {
    return links;
  }

  for (const currentLocale of locales) {
    links.push({
      href: resolveRelativePathToAbsoluteUrl(
        withBasePath(
          getLocalizedCanonicalPath({
            baseLocale,
            canonicalPath,
            locale: currentLocale
          }),
          basePath
        ),
        { baseUrl }
      ),
      hrefLang: currentLocale,
      rel: "alternate"
    });
  }

  if (baseLocale) {
    links.push({
      href: resolveRelativePathToAbsoluteUrl(
        withBasePath(
          getLocalizedCanonicalPath({
            baseLocale,
            canonicalPath,
            locale: baseLocale
          }),
          basePath
        ),
        { baseUrl }
      ),
      hrefLang: "x-default",
      rel: "alternate"
    });
  }

  return links;
}

function withBasePath(path: `/${string}`, basePath: string | undefined): `/${string}` {
  const normalizedBasePath = basePath
    ?.trim()
    .replace(LEADING_SLASHES_REGEX, "")
    .replace(TRAILING_SLASHES_REGEX, "");

  if (!normalizedBasePath) {
    return path;
  }

  if (path === "/") {
    return `/${normalizedBasePath}/`;
  }

  return `/${normalizedBasePath}/${path.replace(LEADING_SLASHES_REGEX, "")}`;
}
