import os from "os";
import { withSentryConfig } from "@sentry/nextjs/config";


const getDevOrigins = () => {
  const origins = new Set(["localhost", "localhost:3000", "127.0.0.1", "127.0.0.1:3000"]);
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if ((net.family === "IPv4" || net.family === 4) && !net.internal) {
          origins.add(net.address);
          origins.add(`${net.address}:3000`);
        }
      }
    }
  } catch (e) {
    origins.add("192.168.100.41");
    origins.add("192.168.100.41:3000");
  }
  return Array.from(origins);
};

const devOrigins = getDevOrigins();
const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: devOrigins,
  // Both reactCompiler and the Sentry build wrapper slow dev compiles a lot;
  // they only matter for production builds.
  reactCompiler: isProd,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yce-us.s3-accelerate.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      // LAN dev hosts only; in production Next already requires Origin to match Host.
      ...(isProd ? {} : { allowedOrigins: devOrigins }),
    },
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
      ...(isProd
        ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
        : []),
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default isProd
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      hideSourceMaps: true,
    })
  : nextConfig;


