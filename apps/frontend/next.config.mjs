/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Rewrites proxy Gemini extra-session calls (~40–120s). Default is 30s → ECONNRESET.
  experimental: {
    proxyTimeout: 180_000,
  },
  async rewrites() {
    const bffInternalUrl = (process.env.BFF_INTERNAL_URL || 'http://bff:3001').replace(/\/+$/, '')
    return [
      {
        source: '/api/:path*',
        destination: `${bffInternalUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
