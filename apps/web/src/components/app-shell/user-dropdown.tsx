import { FileText, BarChart2, Lock, LogOut, UserSquare } from "lucide-react";

import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { useLocation } from "@tsu-stack/i18n/tanstack-start/hooks/use-location";
import { stripLocalePrefix } from "@tsu-stack/i18n/tanstack-start/lib/strip-locale-prefix";
import { Button } from "@tsu-stack/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@tsu-stack/ui/components/dropdown-menu";

import { useSignOutAndResetSession } from "@/hooks/use-sign-out";

import { NavbarAvatar } from "@/components/app-shell/navbar-avatar";

export function UserDropdown() {
  const { user } = useAuthSuspense();
  const signOut = useSignOutAndResetSession();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return <GuestNavbarActions />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button aria-label="Open account menu" size="icon" variant="ghost" />}
      >
        <UserSquare aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-sm min-w-fit">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-start gap-3">
            <NavbarAvatar avatarImgSrc={user.image} name={user.name} email={user.email} />
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            nativeButton={false}
            render={<Link to="/" />}
          >
            <BarChart2 aria-hidden="true" className="opacity-60" size={16} />
            <span>{m.user_dropdown__dashboard()}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="cursor-pointer"
            nativeButton={false}
            render={<Link to="/privacy-policy" />}
          >
            <Lock aria-hidden="true" className="opacity-60" size={16} />
            <span>{m.user_dropdown__privacy_policy()}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            nativeButton={false}
            render={<Link to="/terms-of-service" />}
          >
            <FileText aria-hidden="true" className="opacity-60" size={16} />
            <span>{m.user_dropdown__terms_of_service()}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" variant="destructive" onClick={handleSignOut}>
          <LogOut aria-hidden="true" className="opacity-60" />
          <span>{m.user_dropdown__logout()}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GuestNavbarActions() {
  const location = useLocation();
  const redirect = stripLocalePrefix(location.href);

  return (
    <>
      <Button
        nativeButton={false}
        render={<Link to="/login" search={{ redirect }} />}
        size="sm"
        variant="outline"
      >
        {m.navbar__sign_in()}
      </Button>
      <Button nativeButton={false} render={<Link to="/signup" search={{ redirect }} />} size="sm">
        {m.navbar__get_started()}
      </Button>
    </>
  );
}
