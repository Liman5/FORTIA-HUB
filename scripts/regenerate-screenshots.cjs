// Régénère les captures d'écran du manifest (screenshots) depuis le logo officiel
const sharp = require("sharp");
const src = "public/official-logo.png";

async function makeScreenshot(name, width, height, logoSize) {
  const logo = await sharp(src).resize(logoSize, logoSize).png().toBuffer();
  await sharp({
    create: { width, height, channels: 3, background: "#021231" },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile("public/" + name);
  console.log(name + " -> " + width + "x" + height);
}

(async () => {
  await makeScreenshot("screenshot-wide.png", 1280, 720, 420);
  await makeScreenshot("screenshot-narrow.png", 750, 1334, 520);
  console.log("=== SCREENSHOTS TERMINES ===");
})().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});
