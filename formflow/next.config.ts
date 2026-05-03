import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is the default bundler in Next.js 15+.
  // react-pdf's worker uses `new URL(…, import.meta.url)` which Turbopack
  // handles natively, so no extra webpack config is needed.

  // Allow loading the demo PDF from the DHCS domain
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.dhcs.ca.gov",
      },
    ],
  },
};

export default nextConfig;
