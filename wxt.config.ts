import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "EtsyHunter - Etsy Product Hunter, Competitor Research & Sales Estimation",
    description: "EtsyHunter - Etsy Product Hunter, Competitor Research & Sales Estimation",
    permissions: ["storage", "tabs", "alarms", "sidePanel"],
    host_permissions: ["*://*.etsy.com/*"],
  },
});
