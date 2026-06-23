import { useCallback, useMemo, useSyncExternalStore } from "react";

const SHALLOW_SEARCH_PARAMS_CHANGE_EVENT = "edernal-shallow-search-params-change";

function subscribeToSearchParams(callback: () => void) {
  window.addEventListener(SHALLOW_SEARCH_PARAMS_CHANGE_EVENT, callback);
  window.addEventListener("popstate", callback);

  return () => {
    window.removeEventListener(SHALLOW_SEARCH_PARAMS_CHANGE_EVENT, callback);
    window.removeEventListener("popstate", callback);
  };
}

function getBrowserSearchSnapshot() {
  return window.location.search;
}

export function useShallowSearchParams(initialSearch = "") {
  const search = useSyncExternalStore(
    subscribeToSearchParams,
    getBrowserSearchSnapshot,
    () => initialSearch
  );

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  const setSearchParams = useCallback((updates: Record<string, number | string | null>) => {
    const url = new URL(window.location.href);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new CustomEvent(SHALLOW_SEARCH_PARAMS_CHANGE_EVENT));
  }, []);

  return {
    search,
    searchParams,
    setSearchParams
  };
}
