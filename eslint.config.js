const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".expo/**",
      "src/app-nextjs-backup/**",
      "src/lib/supabase-client.ts",
      "src/lib/supabase-server.ts",
    ],
  },
]);
