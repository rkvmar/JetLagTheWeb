import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      allow: [".."],
    },
  },
  optimizeDeps: {
    include: ["@supabase/supabase-js", "leaflet"],
  },
});
