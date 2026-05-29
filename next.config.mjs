/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Type and lint errors must fail the production build (Requirement 1.5).
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
