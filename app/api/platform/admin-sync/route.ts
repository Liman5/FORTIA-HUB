import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorizedResponse } from "@/lib/server/requireAdmin";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/admin-sync
 * ⚠️ ENDPOINT RÉSERVÉ À L'ADMINISTRATION.
 *
 * Renvoie les collections sensibles qui ne sont PLUS exposées par
 * `/api/platform/sync` :
 *   • marketplaceOrders       → nom / email / téléphone des acheteurs
 *   • payoutRequests          → coordonnées de retrait (Wave, OM, IBAN, USDT)
 *   • kycSubmissions          → dossiers d'identité
 *   • postPurchaseSupport     → messages clients
 *   • vendorApplications      → candidatures vendeurs
 *   • serviceQuotes           → demandes de devis
 *   • instructorCommissions   → données financières formateurs
 *   • instructorStoragePurchases
 *   • platformConfig          → configuration interne
 *   • stores                  → AVEC les coordonnées de paiement
 *
 * Authentification : token admin (`Authorization: Bearer …`) OU utilisateur
 * connecté dont le rôle est `admin` — vérifié côté serveur.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return unauthorizedResponse("Accès réservé à l'administration.");
  }

  try {
    const [
      marketplaceOrders,
      payoutRequests,
      kycSubmissions,
      postPurchaseSupport,
      vendorApplications,
      serviceQuotes,
      instructorCommissions,
      instructorStoragePurchases,
      platformConfig,
      stores,
    ] = await Promise.all([
      prisma.marketplaceOrder.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.payoutRequest.findMany({ orderBy: { requestedAt: "desc" } }),
      prisma.kycSubmission.findMany({ orderBy: { submittedAt: "desc" } }),
      prisma.postPurchaseSupport.findMany({ orderBy: { submittedAt: "desc" } }),
      prisma.vendorApplication.findMany({ orderBy: { submittedAt: "desc" } }),
      prisma.serviceQuote.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.instructorCommission.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.instructorStoragePurchase.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.platformConfig.findMany(),
      prisma.store.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const body = JSON.stringify(
      {
        success: true,
        admin: { id: admin.id, email: admin.email, role: admin.role },
        data: {
          marketplaceOrders,
          payoutRequests,
          kycSubmissions,
          postPurchaseSupport,
          vendorApplications,
          serviceQuotes,
          instructorCommissions,
          instructorStoragePurchases,
          platformConfig,
          // Les coordonnées de paiement sont légitimes ici (administration)
          stores,
        },
      },
      (_key, value) => (typeof value === "bigint" ? Number(value.toString()) : value)
    );

    return new NextResponse(body, {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[ADMIN SYNC] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
