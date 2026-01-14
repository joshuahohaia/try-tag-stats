import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import '@mantine/core/styles.css';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const router = createRouter({ routeTree });
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const theme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand: [
      '#eef1f6',
      '#dce3ec',
      '#b8c6da',
      '#92a8c9',
      '#728eb9',
      '#5677ab',
      '#23304a', // Primary shade (6)
      '#1c263b',
      '#131a29',
      '#0a0e18',
    ],
    success: [
      '#eafaf1',
      '#d5f5e3',
      '#abebc6',
      '#82e0aa',
      '#58d68d',
      '#2ecc71',
      '#28b463',
      '#239b56',
      '#1d8348',
      '#186a3e',
    ],
    warning: [
      '#fef9e7',
      '#fcf3cf',
      '#f9e79f',
      '#f7dc6f',
      '#f4d03f',
      '#f1c40f',
      '#d4ac0d',
      '#b7950b',
      '#9a7d0a',
      '#7d6608',
    ],
    danger: [
      '#fdedec',
      '#fadbd8',
      '#f5b7b1',
      '#f1948a',
      '#ec7063',
      '#e74c3c',
      '#cb4335',
      '#b03a2e',
      '#943126',
      '#78281f',
    ],
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  headings: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        loaderProps: { type: 'bars' },
      },
    },
    TextInput: {
      defaultProps: {
        variant: 'filled',
      },
    },
    Card: {
      defaultProps: {
        withBorder: true,
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
        overlayProps: {
          backgroundOpacity: 0.55,
          blur: 3,
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <RouterProvider router={router} />
      </MantineProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
