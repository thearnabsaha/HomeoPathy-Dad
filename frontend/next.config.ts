import type { NextConfig } from "next";

const STATIC_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";
const SEARCH_CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

const cacheHeaders = (value: string) => [
  { key: "Cache-Control", value },
  { key: "CDN-Cache-Control", value },
  { key: "Vercel-CDN-Cache-Control", value },
];

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  // Keep the 33 MB source repertory and build scripts out of serverless traces.
  // Top-level key is supported in Next.js 15; fall back is unnecessary if the build accepts it.
  outputFileTracingExcludes: {
    "*": [
      "./src/data/oldRepertory.json",
      "./src/data/medicineDetails.json",
      "./scripts/**/*",
      "./generate_*.py",
      "./parsed_meds.json",
    ],
  },
  headers: async () => [
    { source: "/api/symptoms", headers: cacheHeaders(STATIC_CACHE) },
    { source: "/api/remedies", headers: cacheHeaders(STATIC_CACHE) },
    { source: "/api/symptoms/children/:path*", headers: cacheHeaders(STATIC_CACHE) },
    { source: "/api/symptoms/:path*", headers: cacheHeaders(STATIC_CACHE) },
    { source: "/api/remedies/:path*", headers: cacheHeaders(STATIC_CACHE) },
    // Last matching rule wins on `next start`, so keep search after the :path* rules.
    { source: "/api/symptoms/search", headers: cacheHeaders(SEARCH_CACHE) },
    { source: "/api/remedies/search", headers: cacheHeaders(SEARCH_CACHE) },
  ],
};

export default nextConfig;
