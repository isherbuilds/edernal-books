import { SunMoon } from "lucide-react";
import { useTheme } from "next-themes";

import { type ButtonProps } from "@tsu-stack/ui/components/button";
import { Button } from "@tsu-stack/ui/components/button";
export { ThemeProvider } from "next-themes";

type ThemeSwitcherProps = {
  className?: string;
} & ButtonProps;

type ThemeName = "system" | "light" | "dark";

export function ThemeSwitcher({
  variant = "ghost",
  size = "icon",
  className,
  ...props
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const currentTheme = isThemeName(theme) ? theme : "system";
  const nextTheme = getNextTheme(currentTheme);

  return (
    <Button
      {...props}
      aria-label="Switch color theme."
      className={className}
      onClick={() => {
        setTheme(nextTheme);
      }}
      size={size}
      variant={variant}
    >
      <SunMoon aria-hidden="true" />
    </Button>
  );
}

function getNextTheme(theme: ThemeName): ThemeName {
  if (theme === "light") {
    return "dark";
  }

  if (theme === "dark") {
    return "system";
  }

  return "light";
}

function isThemeName(value: unknown): value is ThemeName {
  return value === "system" || value === "light" || value === "dark";
}
