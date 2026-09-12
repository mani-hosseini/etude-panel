import type { NextConfig } from "next";

const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "lightningcss",
    "lightningcss-linux-x64-gnu",
    "@tailwindcss/oxide",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
    proxyClientMaxBodySize: "12mb",
  },
  async rewrites() {
    const training = [
      { source: "/PDF/trainingen.pdf", destination: "/training/en" },
      { source: "/PDF/trainingfa.pdf", destination: "/training/fa" },
    ];
    if (!apiProxyTarget) return training;
    return [
      ...training,
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiProxyTarget}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
