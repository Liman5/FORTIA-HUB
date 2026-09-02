// Régénère toutes les icônes PWA depuis public/official-logo.png (logo officiel FORTIA HUB)
const sharp = require("sharp");
const src = "public/official-logo.png";

async function gen(name, size) {
  await sharp(src).resize(size, size).png().toFile("public/" + name);
  console.log(name + " -> " + size + "x" + size);
}

async function genMaskable() {
  // Icône maskable : logo officiel centré sur fond blanc, contenu dans la
  // safe zone (~80%) exigée par les navigateurs pour les icônes maskable.
  const logo = await sharp(src).resize(440, 440).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 3, background: "#ffffff" },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile("public/maskable-icon-512x512.png");
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
