import { NextResponse } from "next/server";

/**
 * Réponse JSON tolérante aux types Prisma.
 *
 * `NextResponse.json()` lève « Do not know how to serialize a BigInt » dès
 * qu'une ligne contient un `BigInt` (ex. `training_centers.storage_used_bytes`).
 * Ce helper convertit systématiquement les `BigInt` en nombres.
 */
export function jsonSafe(payload: unknown, init?: ResponseInit): NextResponse {
  const body = JSON.stringify(payload, (_key, value) =>
    typeof value === "bigint" ? Number(value.toString()) : value
  );

  return new NextResponse(body, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}
