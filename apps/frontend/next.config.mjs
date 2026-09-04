/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
