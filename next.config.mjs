/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/shop',
        destination: '/marketplace',
        permanent: true,
      },
      {
        source: '/freelance',
        destination: '/marketplace',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;