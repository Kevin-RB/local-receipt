import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["kevin"],
  images: {
    remotePatterns: [
      { hostname: "cdn.mos.cms.futurecdn.net", pathname: "/**" },
      { hostname: "encrypted-tbn0.gstatic.com", pathname: "/**" },
    ],
  },
  output: "standalone",
};

export default nextConfig;
