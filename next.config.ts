import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.aozoomusa.com",
      },
      {
        protocol: "https",
        hostname: "medusa.aozoomusa.com",
      },
      {
        protocol: "https",
        hostname: "api-test.coolify.aozoomusa.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
}

export default nextConfig
