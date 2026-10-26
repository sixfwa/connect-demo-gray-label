import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // "/" → "/connectors" at the routing layer. A page that calls redirect()
  // during prerender trips Cache Components' instant-navigation validation.
  async redirects() {
    return [{ source: "/", destination: "/connectors", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// withEve mounts the eve agent in ./agent at /eve/v1/* on the same origin,
// locally (next dev) and on Vercel (as a service in the same project).
export default withEve(nextConfig);
