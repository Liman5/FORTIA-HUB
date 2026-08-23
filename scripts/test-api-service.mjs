// Test la route API /api/platform/write avec create-service
const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  // 1. Créer un service via l'API
  console.log("=== TEST create-service via /api/platform/write ===");
  const createRes = await fetch(`${baseUrl}/api/platform/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create-service",
      data: {
        title: "API_TEST_SERVICE_" + Date.now(),
        category: "Design & Graphisme",
        description: "Service créé via test API",
        startingPrice: 25,
        estimatedDays: "3 jours",
        iconName: "Briefcase",
        deliverables: ["Livrable 1", "Livrable 2"],
        options: [
          { name: "Livraison express", price: 10 },
        ],
        borderStyle: "gold",
        cardAnimation: "fade-up",
        accentColor: "#D69E25",
        badgeText: "Nouveau",
        featured: false,
        isActive: true,
        displayOrder: 5,
      },
    }),
  });
  const createJson = await createRes.json();
  console.log("RÉPONSE CREATE:", JSON.stringify(createJson, null, 2));
  if (!createJson.success || !createJson.id) {
    console.log("❌ ÉCHEC CRÉATION API");
    return;
  }

  const serviceId = createJson.id;

  // 2. Lire via l'API sync pour vérifier
  console.log("\n=== VÉRIFICATION via /api/platform/sync ===");
  const syncRes = await fetch(`${baseUrl}/api/platform/sync`);
  const syncJson = await syncRes.json();
  const services = syncJson?.data?.servicePackages || [];
  const found = services.find((s) => s.id === serviceId);
  console.log("Service trouvé dans sync:", found ? "✅ OUI" : "❌ NON");
  if (found) {
    console.log("  title:", found.title);
    console.log("  borderStyle:", found.borderStyle);
    console.log("  isActive:", found.isActive);
    console.log("  options:", JSON.stringify(found.options));
  }

  // 3. Nettoyage : supprimer le service test
  console.log("\n=== NETTOYAGE ===");
  const delRes = await fetch(`${baseUrl}/api/platform/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete-service", data: { id: serviceId } }),
  });
  const delJson = await delRes.json();
  console.log("Suppression:", delJson.success ? "✅ OK" : "❌ ÉCHEC - " + delJson.error);
}

main().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});