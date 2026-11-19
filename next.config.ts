import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const unindexedHeaders = [
  ...securityHeaders,
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "Cache-Control", value: "private, no-store" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["postgres"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      { source: "/guest/:path*", headers: unindexedHeaders },
      { source: "/s/:path*", headers: unindexedHeaders },
    ];
  },
};

export default nextConfig;
