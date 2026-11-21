// ============================================================
// FORTIA HUB — Job de maintenance (stockage R2 + compteurs de débit)
// ------------------------------------------------------------
// Déclenchement : Vercel Cron (voir `vercel.json`) ou appel manuel.
//
// Sécurité : en-tête `Authorization: Bearer <CRON_SECRET>` (envoyé
// automatiquement par Vercel Cron) ou `x-cron-secret: <CRON_SECRET>`.
// Sans `CRON_SECRET` configuré, la route refuse tout (503).
//
// MODE SIMULATION PAR DÉFAUT : rien n'est supprimé tant que `apply=1`
// (ou `dryRun=0`) n'est pas demandé explicitement.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  MIN_AGE_HOURS,
  cleanupStorage,
  purgeRateLimitCounters,
} from "@/lib/server/maintenance";
import { runPaymentMaintenance } from "@/lib/modules/payments/maintenance";
import {
  processDueDeletions,
} from "@/lib/modules/admin/platformDeletion";
import { processExpiredSuspensions } from "@/lib/modules/admin/platformUserStatus";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function verifySecret(req: NextRequest): { ok: boolean; status: number; reason?: string } {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) {
    return { ok: false, status: 503, reason: "CRON_SECRET n'est pas configuré sur le serveur." };
  }

  const authorization = req.headers.get("authorization") || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const provided = bearer || (req.headers.get("x-cron-secret") || "").trim();

  if (provided !== secret) {
    return { ok: false, status: 401, reason: "Secret de maintenance invalide." };
  }
  return { ok: true, status: 200 };
}

async function runMaintenance(req: NextRequest) {
  const auth = verifySecret(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status });
  }

  const params = req.nextUrl.searchParams;
  // Simulation active par défaut : seule une demande explicite supprime.
  const apply = params.get("apply") === "1" || params.get("dryRun") === "0";
  const minAgeHours = Number(params.get("minAgeHours") || MIN_AGE_HOURS);

  const storage = await cleanupStorage({ dryRun: !apply, minAgeHours });
  const rateLimitDeleted = await purgeRateLimitCounters();
  // Abonnements et droits temporaires arrivés à échéance (toujours appliqué :
  // un droit expiré ne doit jamais rester actif).
  const payments = await runPaymentMaintenance();
  const deletions = await processDueDeletions();
  const suspensions = await processExpiredSuspensions();

  return NextResponse.json({
    success: true,
    mode: apply ? "suppression" : "simulation",
    storage,
    rateLimitDeleted,
    payments,
    deletions,
    suspensions,
    executedAt: new Date().toISOString(),
  });
}

/** Appel programmé (Vercel Cron utilise GET). */
export async function GET(req: NextRequest) {
  return runMaintenance(req);
}

/** Appel manuel (curl -X POST). */
export async function POST(req: NextRequest) {
  return runMaintenance(req);
}
