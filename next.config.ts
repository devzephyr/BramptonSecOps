import type { NextConfig } from "next";

const scriptSrc =
  process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const csp = `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.mapbox.com; connect-src 'self' https://api.mapbox.com https://events.mapbox.com; worker-src 'self' blob:; child-src blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`;

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
