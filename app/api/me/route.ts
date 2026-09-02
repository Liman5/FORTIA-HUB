import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";

export const dynamic = "force-dynamic";

/**
 * GET /api/me
 * Endpoint AUTHENTIFIÉ : renvoie UNIQUEMENT les données de l'utilisateur
 * connecté (commandes, notifications, KYC). Aucune donnée d'un autre
 * utilisateur n'est jamais renvoyée.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const normalizedEmail = user.email.toLowerCase();

    const [orders, notifications, kycSubmissions] = await Promise.all([
      prisma.marketplaceOrder.findMany({
        where: {
          OR: [{ buyerUserId: user.id }, { buyerEmail: { equals: user.email, mode: "insensitive" } }],
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.findMany({
        where: { OR: [{ userId: user.id }, { isGlobal: true }] },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.kycSubmission.findMany({
        where: { OR: [{ applicantId: user.id }, { email: { equals: user.email, mode: "insensitive" } }] },
        orderBy: { submittedAt: "desc" },
      }),
    ]);

    const body = JSON.stringify(
      {
        success: true,
        user: {
          id: user.id,
          email: normalizedEmail,
          enrolledCourseIds: user.enrolledCourseIds,
          purchasedProductIds: user.purchasedProductIds,
          courseProgress: user.courseProgress,
          earnedCertificates: user.earnedCertificates,
          paymentHistory: user.paymentHistory,
        },
        orders,
        notifications,
        kycSubmissions,
      },
      (_key, value) => (typeof value === "bigint" ? Number(value.toString()) : value)
    );

    return new NextResponse(body, { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[ME] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
