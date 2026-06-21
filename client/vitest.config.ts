import { defineConfig } from 'vitest/config'

// Standalone so the project's Vite 8 plugin types don't clash with the Vite that
// Vitest bundles. No React plugin needed — Vitest's bundled transformer (oxc)
// applies the automatic JSX runtime for TSX (React 19), and Fast Refresh is
// irrelevant under test.
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    globals: false,
    css: false,
    restoreMocks: true,
  },
})
