/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Route Handler em app/api/[...path] encaminha ao BFF (rewrites usam httpxy com 30s).
  experimental: {
    proxyTimeout: 180_000,
  },
}

export default nextConfig
