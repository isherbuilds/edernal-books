import { locales } from "#@/paraglide/runtime";

const localePrefixes = ["/{-$locale}", ...locales.map((locale) => `/${locale}`)];

export function stripLocalePrefix(path: string): string {
  let cleanPath = path;

  while (true) {
    const prefix = localePrefixes.find(
      (localePrefix) => cleanPath === localePrefix || cleanPath.startsWith(`${localePrefix}/`)
    );

    if (!prefix) {
      return cleanPath;
    }

    cleanPath = cleanPath.slice(prefix.length) || "/";
  }
}
