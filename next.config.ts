import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://cdn.mos.cms.futurecdn.net/**"),
      new URL("https://encrypted-tbn0.gstatic.com/**"),
    ],
  },
};

export default nextConfig;
