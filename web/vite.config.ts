import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
    // @instantdb/react ships its own React import; without deduping, Vite can
    // pre-bundle it against a second React copy → "Invalid hook call" on useAuth.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["@instantdb/react", "@instantdb/core", "react", "react-dom"],
  },
  server: {
    // Vite 5.4+ blocks unknown hosts behind a reverse proxy (argo).
    allowedHosts: ["crossline.argo.gibsonops.com"],
  },
});
