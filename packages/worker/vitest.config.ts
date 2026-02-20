import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        // WebSocket Hibernation API fires handlers outside the request context,
        // which is incompatible with isolated storage. Disable it here.
        isolatedStorage: false,
      },
    },
  },
});
