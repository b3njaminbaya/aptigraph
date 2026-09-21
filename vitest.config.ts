import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    clearMocks: true,
    setupFiles: ["./src/setupTests.ts"],
    // The real Supabase client throws at import time without these, and CI has
    // no .env file. Tests mock the client itself, so the values are never used.
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "lcov"],
      thresholds: { statements: 95, branches: 88, functions: 95, lines: 95 },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/components/ui/**", // vendored shadcn/ui
        "src/hooks/use-toast.ts", // vendored shadcn/ui
        "src/integrations/supabase/types.ts",
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
        "src/main.tsx",
        "src/setupTests.ts",
        "src/vite-env.d.ts",
      ],
    },
  },
});
