import { useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import React, { Suspense } from "react";

import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { Button } from "@tsu-stack/ui/components/button";
import { Portal, PortalBackdrop } from "@tsu-stack/ui/components/portal";
import { cn } from "@tsu-stack/ui/lib/utils";

import { navLinks } from "@/components/app-shell/nav-links";
import { NavbarAvatar } from "@/components/app-shell/navbar-avatar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useSignOutAndResetSession } from "@/hooks/use-sign-out";

export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  const onNavigate = () => setOpen(false);

  return (
    <div className="flex items-center gap-2 md:hidden">
      <LocaleSwitcher variant="outline" size="icon" />
      <ThemeSwitcher className="md:hidden" variant="outline" />
      <Button
        aria-controls="mobile-menu"
        aria-expanded={open}
        aria-label="Toggle menu"
        className="md:hidden"
        onClick={() => setOpen(!open)}
        size="icon"
        variant="outline"
      >
        {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
      </Button>
      {open && (
        <Portal className="top-(--navbar-height)" id="mobile-menu">
          <PortalBackdrop className="bg-background!" />
          <div
            className={cn(
              "ease-out data-[slot=open]:animate-in data-[slot=open]:zoom-in-97",
              "size-full p-4"
            )}
            data-slot={open ? "open" : "closed"}
          >
            <div className="grid gap-y-2">
              {navLinks.map((link) => {
                const label = link.label();

                return (
                  <Button
                    onClick={onNavigate}
                    className="w-full justify-start"
                    key={link.href ?? link.to}
                    nativeButton={false}
                    render={<Link {...(link.href ? { href: link.href } : { to: link.to })} />}
                    variant="ghost"
                  >
                    <span className="max-sm:-ms-2">{label}</span>
                  </Button>
                );
              })}
            </div>
            <Suspense fallback={null}>
              <MobileNavAuth onNavigate={onNavigate} />
            </Suspense>
          </div>
        </Portal>
      )}
    </div>
  );
}

function MobileNavAuth({ onNavigate }: { onNavigate: () => void }) {
  const routerState = useRouterState();
  const { user } = useAuthSuspense();
  const signOut = useSignOutAndResetSession();

  const redirect = routerState.location.search?.redirect;

  const handleSignOut = async () => {
    await signOut({ onSuccess: onNavigate });
  };

  if (!user) {
    return (
      <div className="mt-12 flex flex-col gap-2">
        <Button
          onClick={onNavigate}
          className="w-full"
          nativeButton={false}
          render={<Link to="/login" search={redirect ? { redirect } : undefined} />}
          variant="outline"
        >
          Sign In
        </Button>
        <Button
          onClick={onNavigate}
          className="w-full"
          nativeButton={false}
          render={<Link to="/signup" search={redirect ? { redirect } : undefined} />}
        >
          Get Started
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-6">
      <div className="border-t" />
      <div className="flex items-center gap-3 px-2">
        <NavbarAvatar avatarImgSrc={user.image} name={user.name} email={user.email} />
      </div>
      <Button className="w-full" variant="destructive" onClick={handleSignOut}>
        <LogOut aria-hidden="true" size={16} />
        Logout
      </Button>
    </div>
  );
}
