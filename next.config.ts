import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // User data is loaded per-request behind auth (and via RLS on the client), so
  // there is nothing to gain from Cache Components' static shells here.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
