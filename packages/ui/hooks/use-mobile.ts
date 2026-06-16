import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const mediaQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(mediaQuery).matches;
  });

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mql = window.matchMedia(mediaQuery);
    const onChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mediaQuery]);

  return isMobile;
}
