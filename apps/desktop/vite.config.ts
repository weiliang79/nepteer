import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
export default defineConfig(({ command, mode }) => ({
  // Normalize missing/non-true values before Rollup creates dynamic-import chunks.
  // Serve/test keeps Vite's normal env object so vi.stubEnv can exercise both branches.
  define:
    command === "build"
      ? {
          "import.meta.env.VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS": JSON.stringify(
            loadEnv(
              mode,
              fileURLToPath(new URL(".", import.meta.url)),
              "VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS",
            ).VITE_ENABLE_QAM_FOCUS_DIAGNOSTICS === "true"
              ? "true"
              : "false",
          ),
        }
      : undefined,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 1420, strictPort: true },
  clearScreen: false,
  test: { environment: "jsdom", setupFiles: "./src/test-setup.ts" },
}));
