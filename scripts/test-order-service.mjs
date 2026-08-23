// Test le flux complet order-service : devis + notification admin + email
const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  // 1. Créer une commande service
  console.log("=== TEST order-service via /api/platform/write ===");
  const res = await fetch(`${baseUrl}/api/platform/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "order-service",
      data: {
        clientName: "Test Client",
        clientEmail: "testclient@example.com",
        clientPhone: "+221771234567",
        serviceId: "test-service-id",
        serviceTitle: "Conception de Logo & Identite Visuelle",
        estimatedPrice: 120,
        details: "Je veux un logo pour ma startup",
        deadline: "3 a 5 jours",
      },
    }),
  });
  const json = await res.json();
  console.log("RÉPONSE:", JSON.stringify(json, null, 2));

  if (!json.success) {
    console.log("❌ ÉCHEC ORDER-SERVICE");
    return;
  }

  // 2. Vérifier via sync que le devis existe
  console.log("\n=== VÉRIFICATION devis via /api/platform/sync ===");
  const syncRes = await fetch(`${baseUrl}/api/platform/sync`);
  const syncJson = await syncRes.json();
  const quotes = syncJson?.data?.serviceQuotes || [];
  const found = quotes.find((q) => q.id === json.id);
  console.log("Devis trouvé:", found ? "✅ OUI (status: " + found.status + ")" : "❌ NON");

  // 3. Vérifier la notification admin
  const notifications = syncJson?.data?.notifications || [];
  const notif = notifications.find((n) => n.linkTab === "admin" && (n.title || "").includes("Nouvelle commande"));
  console.log("Notification admin:", notif ? "✅ OUI - " + notif.title : "❌ NON");
}

main().catch((e) => {
  console.error("ERREUR:", e.message);
  process.exit(1);
});