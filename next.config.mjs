/** @type {import('next').NextConfig} */
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  String(Date.now());

/** Origine (scheme://hôte[:port]) d'une URL de configuration, ou "". */
function originOf(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

const R2_PUBLIC_ORIGIN = originOf(process.env.CLOUDFLARE_BUCKET_PUBLIC_URL);
const SUPABASE_ORIGIN = originOf(process.env.SUPABASE_URL);

// Domaines des fournisseurs de paiement réellement utilisés (API + guichets).
const PAYMENT_ORIGINS = [
  "https://api.stripe.com",
  "https://js.stripe.com",
  "https://checkout.stripe.com",
  "https://api.paystack.co",
  "https://checkout.paystack.com",
  "https://api.flutterwave.com",
  "https://checkout.flutterwave.com",
];

/**
 * Content-Security-Policy — volontairement envoyée en `Report-Only` pour ne
 * rien casser : le navigateur signale les violations sans les bloquer.
 * Pour la rendre bloquante : renommer l'en-tête en `Content-Security-Policy`
 * après avoir validé l'absence de violation dans la console / les rapports.
 */
function buildCspDirectives() {
  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://images.unsplash.com",
    R2_PUBLIC_ORIGIN,
    SUPABASE_ORIGIN,
  ].filter(Boolean);
  const connectSrc = [
    "'self'",
    R2_PUBLIC_ORIGIN,
    SUPABASE_ORIGIN,
    ...PAYMENT_ORIGINS,
  ].filter(Boolean);
  const mediaSrc = ["'self'", "blob:", R2_PUBLIC_ORIGIN].filter(Boolean);
  const scriptSrc = [
    "'self'",
    // Next.js injecte des scripts inline (hydratation) ; Turbopack en dev
    // utilise eval. À durcir avec un nonce si nécessaire.
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://js.stripe.com",
    "https://checkout.paystack.com",
    "https://checkout.flutterwave.com",
  ];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    `media-src ${mediaSrc.join(" ")}`,
    "frame-src 'self' https://js.stripe.com https://checkout.paystack.com https://checkout.flutterwave.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: buildCspDirectives() },
];


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
      {
        // En-têtes de sécurité appliqués à TOUTES les routes.
        source: '/(.*)',
        headers: SECURITY_HEADERS,
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