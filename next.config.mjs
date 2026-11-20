/** @type {import('next').NextConfig} */
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  String(Date.now());

const nextConfig = {
  /**
   * Identifiant de build exposé au navigateur : permet à l'application
   * installée (PWA) de comparer sa version à celle du serveur et de se
   * mettre à jour automatiquement dès qu'un déploiement est disponible.
   */
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
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