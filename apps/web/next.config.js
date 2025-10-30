/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@chronic-covid19/shared-types', '@chronic-covid19/api-client'],
}

module.exports = nextConfig