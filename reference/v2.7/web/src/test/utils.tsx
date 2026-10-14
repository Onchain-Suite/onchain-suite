import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '../theme';

/* `path` mounts the screen under a real route definition, which is what populates
   useParams — a screen that reads its identity from the URL renders as the wrong thing
   without it. Omit it and the screen is rendered bare, as before. */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path }: { route?: string; path?: string } = {},
) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        {path ? <Routes><Route path={path} element={ui} /></Routes> : ui}
      </MemoryRouter>
    </ThemeProvider>,
  );
}

export * from '@testing-library/react';
