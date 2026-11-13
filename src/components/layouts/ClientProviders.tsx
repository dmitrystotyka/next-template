'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { WebVitals } from '@/components/layouts/WebVitals';
import { Toaster } from '@/components/UI/Sonner';
import { getQueryClient } from '@/lib/queryClient';

import type { ReactNode } from 'react';

type ClientProvidersProps = {
  children: ReactNode;
};

// Dynamic + ssr:false keeps the devtools bundle out of SSR; the dev-only
// guard below keeps it out of production builds entirely (DCE).
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((m) => m.ReactQueryDevtools),
  { ssr: false, loading: () => null },
);

const isDev = process.env.NODE_ENV === 'development';

/**
 * Client-side providers for the whole locale tree. Server state lives in
 * TanStack Query; global CLIENT state needs no library until it outgrows
 * React context — add one here (Zustand, Redux Toolkit) when it does.
 */
export function ClientProviders({ children }: ClientProvidersProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      {/* Always mounted: web vitals matter MOST in production (the hook
          itself decides where metrics go — dev log vs. beacon). */}
      <WebVitals />
      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
