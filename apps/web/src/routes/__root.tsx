import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
import { type QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";

import { resolvePublicAssetUrl } from "@tsu-stack/core/assets";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import {
  LocaleProvider,
  useLocale
} from "@tsu-stack/i18n/tanstack-start/components/locale-provider";
import { Toaster } from "@tsu-stack/ui/components/sonner";

import { ProgressProvider } from "@/providers/progress-provider";

import { generateAppSeo } from "@/lib/seo";

import { DefaultErrorPage } from "@/components/errors/default-error-page";
import { ThemeProvider } from "@/components/theme-switcher";

import appCss from "@/styles/app.css?url";

// Root route with shared context for the entire app, inject them in router.tsx
type RouterAppContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterAppContext>()({
  errorComponent: DefaultErrorPage,
  shellComponent: RootDocument,
  head: () => {
    const rootSeo = generateAppSeo({
      includeDocumentMeta: true
    });
    const faviconHref = resolvePublicAssetUrl(ENV_WEB_ISOMORPHIC.VITE_WEB_URL, "/favicon.ico");
    const sitemapHref = resolvePublicAssetUrl(ENV_WEB_ISOMORPHIC.VITE_WEB_URL, "/sitemap.xml");

    return {
      links: [
        ...(rootSeo.links ?? []),
        {
          href: faviconHref,
          rel: "icon"
        },
        {
          href: sitemapHref,
          rel: "sitemap",
          type: "application/xml"
        },
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: interLatin,
          crossOrigin: "anonymous"
        },
        { href: appCss, rel: "stylesheet" }
      ],
      meta: [...(rootSeo.meta ?? [])]
    };
  }
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <RootDocumentInner>{children}</RootDocumentInner>
    </LocaleProvider>
  );
}

function RootDocumentInner({ children }: { children: ReactNode }) {
  const { locale } = useLocale();

  return (
    <html suppressHydrationWarning lang={locale}>
      <head>
        <script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js"></script>
        <HeadContent />
      </head>
      <body>
        {/* We place the progress provider here otherwise we will get "Cannot render a <style> outside the main document" error */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ProgressProvider>
            <Fragment key={locale}>{children}</Fragment>
            <Toaster richColors />
            <Scripts />
          </ProgressProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
