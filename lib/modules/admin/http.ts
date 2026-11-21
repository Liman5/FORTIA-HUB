import { NextResponse } from "next/server";
import { PlatformUserError } from "./platformUsers";

export function platformAdminError(error: unknown): NextResponse {
  if (error instanceof PlatformUserError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }
  console.error("[ADMIN USERS] Erreur:", error);
  return NextResponse.json(
    { success: false, error: "Erreur interne. Veuillez réessayer." },
    { status: 500 }
  );
}
