import {
  type QueryClient,
  QueryClientProvider as QueryClientProviderRaw
} from "@tanstack/react-query";
import { type ReactNode } from "react";

function QueryClientProvider({ children, client }: { children: ReactNode; client: QueryClient }) {
  return <QueryClientProviderRaw client={client}>{children}</QueryClientProviderRaw>;
}

export { QueryClientProvider };
