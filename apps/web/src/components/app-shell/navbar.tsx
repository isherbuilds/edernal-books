import { Suspense } from "react";

import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Button } from "@tsu-stack/ui/components/button";
import { useScroll } from "@tsu-stack/ui/hooks/use-scroll.hook";
import { cn } from "@tsu-stack/ui/lib/utils";

import { MobileNav } from "@/components/app-shell/mobile-nav";
import { navLinks } from "@/components/app-shell/nav-links";
import { UserDropdown } from "@/components/app-shell/user-dropdown";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoWordmark } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function Navbar() {
  const scrolled = useScroll(10);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-transparent bg-background transition-colors not-dark:shadow not-dark:shadow-transparent",
        {
          "not-dark:shadow-black/10 dark:border-border": scrolled
        }
      )}
    >
      <nav className="container mx-auto flex h-(--navbar-height) w-full items-center justify-between px-4">
        <Link className="relative -m-2 rounded-md p-2 hover:bg-muted dark:hover:bg-muted/50" to="/">
          <LogoWordmark className="h-6 w-fit" />
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => {
            const label = link.label();

            return (
              <Button
                key={link.href ?? link.to}
                nativeButton={false}
                render={
                  link.href ? (
                    <a
                      aria-label={label}
                      className="hover:text-foreground"
                      href={link.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    />
                  ) : (
                    <Link className="hover:text-foreground" to={link.to} />
                  )
                }
                size="sm"
                variant="ghost"
              >
                {label}
              </Button>
            );
          })}
          <LocaleSwitcher />
          <ThemeSwitcher size="icon-sm" />
          <Suspense fallback={null}>
            <UserDropdown />
          </Suspense>
        </div>
        <MobileNav />
      </nav>
    </header>
  );
}
