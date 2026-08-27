import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { prisma } from "@/lib/prisma";
import { getVapidPublicKey } from "@/lib/services/webPush";

export const dynamic = "force-dynamic";

/**
 * GET /api/push
 * Expose la clé publique VAPID au navigateur (nécessaire pour créer
 * un PushSubscription). La clé PRIVÉE ne quitte jamais le serveur.
 */
export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "VAPID non configuré côté serveur." },
      { status: 500 }
    );
  }
  return NextResponse.json({ publicKey });
}

/**
 * POST /api/push
 * Enregistre le PushSubscription de l'utilisateur connecté.
 * L'identité provient UNIQUEMENT du cookie JWT (getCurrentUser) —
 * jamais d'un userId envoyé par le frontend.
 * Un même endpoint (appareil) ne peut exister qu'une seule fois.
 */
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Non authentifié. Veuillez vous connecter." }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const endpoint = body?.subscription?.endpoint;
  const p256dh = body?.subscription?.keys?.p256dh;
  const auth = body?.subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Abonnement push invalide (endpoint, p256dh, auth requis)." },
      { status: 400 }
    );
  }

  try {
    // Un même appareil ne peut être enregistré qu'une fois → upsert par endpoint.
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: currentUser.id, endpoint, p256dh, auth },
      update: { userId: currentUser.id, p256dh, auth },
    });

    return NextResponse.json(
      { success: true, subscription: { id: subscription.id } },
      { status: 201 }
    );
  } catch (e: any) {
    console.warn("[PUSH] Enregistrement de l'abonnement impossible:", e?.message);
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'abonnement push." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push?endpoint=...
 * Désinscrit l'abonnement de l'utilisateur connecté (lorsqu'il
 * désactive les notifications). L'identité vient du cookie JWT.
 */
export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Non authentifié. Veuillez vous connecter." }, { status: 401 });
  }

  const endpoint = new URL(request.url).searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "Paramètre endpoint manquant." }, { status: 400 });
  }

  try {
    const result = await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: currentUser.id },
    });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch (e: any) {
    console.warn("[PUSH] Suppression de l'abonnement impossible:", e?.message);
    return NextResponse.json(
      { error: "Impossible de supprimer l'abonnement push." },
      { status: 500 }
    );
  }
}
