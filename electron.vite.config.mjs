import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve("main/index.js"),
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve("preload/index.js"),
      },
    },
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: 'renderer',
    build: {
      rollupOptions: {
        input: resolve("renderer/index.html"),
      },
    },
    resolve: {
      alias: {
        "@renderer": resolve("renderer"),
      },
    },
    plugins: [react({
      fastRefresh: false, // ✅ disables React Refresh in dev
    })],
  },
});
