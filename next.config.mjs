import os from "os";

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: devOrigins,
  reactCompiler: true,
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
      allowedOrigins: devOrigins,
    },
  },
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;

