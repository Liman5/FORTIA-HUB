// Régénère toutes les icônes PWA depuis public/favicon.svg (source valide)
const sharp = require("sharp");
const src = "public/favicon.svg";

async function gen(name, size) {
  await sharp(src).resize(size, size).png().toFile("public/" + name);
  console.log(name + " -> " + size + "x" + size);
}

async function genMaskable() {
  // SVG "full-bleed" : fond plein (pas de coins arrondis), contenu dans la
  // safe zone (80%) exigée par les navigateurs pour les icônes maskable.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#021231"/>
  <circle cx="256" cy="256" r="176" fill="none" stroke="#D69E25" stroke-width="16"/>
  <path d="M 196 156 L 316 156 L 316 202 L 250 202 L 250 240 L 300 240 L 300 278 L 250 278 L 250 358 L 196 358 Z" fill="url(#goldGrad)"/>
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FADF72"/>
      <stop offset="50%" stop-color="#D69E25"/>
      <stop offset="100%" stop-color="#B37E14"/>
    </linearGradient>
  </defs>
</svg>`;
  await sharp(Buffer.from(svg)).resize(512, 512).png().toFile("public/maskable-icon-512x512.png");
  console.log("maskable-icon-512x512.png -> 512x512");
}

(async () => {
  await gen("pwa-72x72.png", 72);
  await gen("pwa-96x96.png", 96);
  await gen("pwa-128x128.png", 128);
  await gen("pwa-144x144.png", 144);
  await gen("pwa-152x152.png", 152);
  await gen("pwa-192x192.png", 192);
  await gen("pwa-384x384.png", 384);
  await gen("pwa-512x512.png", 512);
  await gen("apple-touch-icon.png", 180);
  await gen("icon.png", 512);
  await gen("favicon.png", 32);
  await genMaskable();
  console.log("=== GENERATION TERMINEE ===");
})().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});
