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
  /**
   * Anti-cache agressif : le script du service worker (`/sw.js`) doit toujours
   * être récupéré frais. Sinon le navigateur peut garder plusieurs heures/jours
   * un ancien worker — qui continue ensuite à servir d'anciens chunks JS et
   * d'anciennes pages, même après un rechargement.
   */
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ];
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