/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pino-pretty'],
  },
  typescript: {
    ignoreBuildErrors: true,
  }
}

export default nextConfig
