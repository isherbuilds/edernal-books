import { m } from "@tsu-stack/i18n/messages";
import { type LinkProps } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Button } from "@tsu-stack/ui/components/button";
import { Image } from "@tsu-stack/ui/components/image";
import { cn } from "@tsu-stack/ui/lib/utils";

import { LogoWordmark } from "@/components/logo";
import { appConfig } from "@/config/app.config";

type FooterLink =
  | { label: () => string; href: LinkProps["href"]; to?: never }
  | { label: () => string; href?: never; to: LinkProps["to"] };

const navLinks: FooterLink[] = [
  { label: () => m.footer__playground(), to: "/playground" },
  { label: () => m.footer__dashboard(), to: "/" },
  { label: () => m.footer__privacy_policy(), to: "/privacy-policy" },
  { label: () => m.footer__terms_of_service(), to: "/terms-of-service" }
];

const socialLinks: (FooterLink & { icon: React.ReactNode })[] = [
  {
    href: "https://x.com/tsu_moe",
    icon: <XIcon className="size-3" />,
    label: () => m.footer__x()
  },
  {
    href: "https://github.com/tsu-moe/tsu-stack",
    icon: <GitHubIcon className="size-4" />,
    label: () => m.footer__github()
  }
];

export function Footer({
  props,
  className
}: {
  props?: React.ComponentProps<"footer">;
  className?: string;
}) {
  return (
    <footer className={cn("border-t", className)} {...props}>
      <div className="container mx-auto flex flex-col gap-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoWordmark className="h-4.5 w-fit" />
          </div>
          <div className="flex items-center gap-1">
            {socialLinks.map(({ href, label, icon }) => {
              const labelText = label();

              return (
                <Button
                  key={href}
                  nativeButton={false}
                  render={<Link aria-label={labelText} href={href} />}
                  size="icon-sm"
                  variant="ghost"
                >
                  {icon}
                </Button>
              );
            })}
          </div>
        </div>

        <nav>
          <ul className="flex flex-wrap gap-4 text-sm font-medium text-muted-foreground md:gap-6">
            {navLinks.map((link) => {
              const label = link.label();

              return (
                <li key={link.href ?? link.to}>
                  {link.href ? (
                    <a
                      className="hover:text-foreground"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={link.href}
                    >
                      {label}
                    </a>
                  ) : (
                    <Link className="hover:text-foreground" to={link.to}>
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="container mx-auto flex items-center justify-between gap-4 border-t px-4 py-6 text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} {appConfig.site.author}
        </p>

        <p className="inline-flex items-center gap-1">
          <span>{m.footer__built_by()}</span>
          <Link
            className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground hover:underline"
            href="https://github.com/tsu-moe"
            rel="noreferrer"
            target="_blank"
          >
            <Image
              width={32}
              height={32}
              aria-hidden="true"
              alt=""
              className="size-4 rounded-full"
              src="https://github.com/tsu-moe.png"
            />
            {appConfig.site.author}
          </Link>
        </p>
      </div>
    </footer>
  );
}

function XIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="m18.9,1.153h3.682l-8.042,9.189,9.46,12.506h-7.405l-5.804-7.583-6.634,7.583H.469l8.6-9.831L0,1.153h7.593l5.241,6.931,6.065-6.931Zm-1.293,19.494h2.039L6.482,3.239h-2.19l13.314,17.408Z" />
    </svg>
  );
}

function GitHubIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56v-2.14c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.19-3.09-.12-.3-.52-1.47.11-3.06 0 0 .97-.31 3.17 1.18A11 11 0 0 1 12 6.07c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.38-5.25 5.67.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
