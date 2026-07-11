"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ObserverModeProvider } from "@/contexts/ObserverModeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
// Side-effect import: in demo mode this installs the global fetch/EventSource
// interception before any page component runs its effects. Inert otherwise.
import "@/demo";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ObserverModeProvider>{children}</ObserverModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
