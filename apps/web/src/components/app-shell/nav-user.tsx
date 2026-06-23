import {
  EllipsisVerticalIcon,
  CircleUserRoundIcon,
  CreditCardIcon,
  BellIcon,
  LogOutIcon
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuthSuspense } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { m } from "@tsu-stack/i18n/messages";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@tsu-stack/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@tsu-stack/ui/components/sidebar";

import { useSignOutAndResetSession } from "@/hooks/use-sign-out";

export function NavUser() {
  const { user } = useAuthSuspense();
  const { isMobile } = useSidebar();
  const signOutAndReset = useSignOutAndResetSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) {
    return null;
  }

  const sidebarUser = {
    name: user.name ?? user.email,
    email: user.email,
    avatar: user.image ?? undefined
  };
  const fallback = sidebarUser.name.charAt(0).toUpperCase();

  async function signOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOutAndReset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.app_shell__sign_out_failed());
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />}
          >
            <Avatar className="size-8 rounded-lg grayscale">
              {sidebarUser.avatar ? (
                <AvatarImage src={sidebarUser.avatar} alt={sidebarUser.name} />
              ) : null}
              <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{sidebarUser.name}</span>
              <span className="truncate text-xs text-foreground/70">{sidebarUser.email}</span>
            </div>
            <EllipsisVerticalIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8">
                    {sidebarUser.avatar ? (
                      <AvatarImage src={sidebarUser.avatar} alt={sidebarUser.name} />
                    ) : null}
                    <AvatarFallback className="rounded-lg">{fallback}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{sidebarUser.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {sidebarUser.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CircleUserRoundIcon />
                {m.app_shell__account()}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon />
                {m.app_shell__billing()}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellIcon />
                {m.app_shell__notifications()}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={isSigningOut} onClick={() => void signOut()}>
              <LogOutIcon />
              {m.app_shell__log_out()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
