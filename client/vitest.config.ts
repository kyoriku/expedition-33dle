import { defineConfig } from 'vitest/config'

// Standalone so the project's Vite 8 plugin types don't clash with the Vite that
// Vitest bundles. No React plugin needed — esbuild's automatic JSX runtime
// transforms TSX (React 19), and Fast Refresh is irrelevant under test.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: false,
    css: false,
    restoreMocks: true,
  },
})
