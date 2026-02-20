import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    // VITE_API_URL を空文字でセットしてテスト中の API_BASE を固定
    env: {
      VITE_API_URL: "http://localhost:8787",
    },
  },
});
