import { defineConfig } from "vite";

export default defineConfig({
  // Allow browser code to read GOLFCOURSEAPI_* in addition to standard VITE_* keys.
  envPrefix: ["VITE_", "GOLFCOURSEAPI_", "SUPABASE_"]
});
