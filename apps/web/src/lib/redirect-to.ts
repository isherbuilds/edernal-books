import { stripLocalePrefix } from "@tsu-stack/i18n/tanstack-start/lib/strip-locale-prefix";
import { type NavigateTo } from "@tsu-stack/i18n/tanstack-start/types";

type RedirectTo = Extract<NavigateTo, `/${string}`>;

const GUEST_PATHS = new Set(["/login", "/signup"]);

export function getRedirectTo(to: string | undefined): RedirectTo {
  if (!to?.startsWith("/") || to.startsWith("//")) {
    return "/";
  }

  let url: URL;
  try {
    url = new URL(to, "http://edernal.local");
  } catch {
    return "/";
  }

  const pathname = stripLocalePrefix(url.pathname);
  const normalizedPath = pathname !== "/" ? pathname.replace(/\/+$/, "") || "/" : "/";
  if (GUEST_PATHS.has(normalizedPath)) {
    return "/";
  }

  return `${normalizedPath}${url.search}${url.hash}` as RedirectTo;
}
