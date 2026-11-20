// ============================================================
// FORTIA HUB — ERREURS API CENTRALISÉES (Phase 3)
// ------------------------------------------------------------
// • Une seule forme de réponse d'erreur pour toutes les routes.
// • Aucune stack, requête SQL, détail Prisma ni secret renvoyé.
// • Chaque réponse porte un `requestId` corrélé aux logs serveur.
// ============================================================

import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "./logger";

export interface AppErrorDetail {
  path: string;
  message: string;
}

export interface AppErrorOptions {
  details?: AppErrorDetail[];
  cause?: unknown;
  /** false = message générique côté client (erreur technique). */
  expose?: boolean;
}

/** Erreur métier typée, traduite en réponse HTTP par `toErrorResponse`. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: AppErrorDetail[];
  readonly expose: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    options: AppErrorOptions = {}
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = options.details;
    this.expose = options.expose !== false;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function validationError(details: AppErrorDetail[]): AppError {
  return new AppError(400, "VALIDATION_ERROR", "Données invalides.", { details });
}

export function unauthorizedError(message = "Authentification requise."): AppError {
  return new AppError(401, "AUTH_REQUIRED", message);
}

export function forbiddenError(message = "Accès refusé."): AppError {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFoundError(message = "Ressource introuvable."): AppError {
  return new AppError(404, "NOT_FOUND", message);
}

export function conflictError(message: string): AppError {
  return new AppError(409, "CONFLICT", message);
}

export function upstreamError(message = "Service externe indisponible."): AppError {
  return new AppError(502, "UPSTREAM_ERROR", message);
}

export function internalError(message = "Erreur interne. Veuillez réessayer."): AppError {
  return new AppError(500, "INTERNAL_ERROR", message, { expose: false });
}

/** Identifiant de requête : fourni par le proxy ou généré ici. */
export function requestIdOf(request: Request): string {
  const provided = request.headers.get("x-request-id")?.trim();
  return provided && provided.length <= 80 ? provided : randomUUID();
}

function prismaStatus(error: unknown): { status: number; code: string } | null {
  const code = String((error as { code?: unknown })?.code || "");
  if (code === "P2002") return { status: 409, code: "DUPLICATE" };
  if (code === "P2025") return { status: 404, code: "NOT_FOUND" };
  if (code === "P2003") return { status: 409, code: "RELATION_CONFLICT" };
  if (code === "P2034") return { status: 409, code: "CONFLICT_RETRY" };
  if (code === "P1001" || code === "P1002" || code === "P2024") {
    return { status: 503, code: "DATABASE_UNAVAILABLE" };
  }
  if (code.startsWith("P")) return { status: 500, code: "DATABASE_ERROR" };
  return null;
}

export interface ErrorContext {
  requestId: string;
  route: string;
  method?: string;
  actorId?: string;
}

/**
 * Convertit n'importe quelle erreur en réponse HTTP uniforme.
 * Seuls les `AppError` exposent leur message ; tout le reste est générique.
 */
export function toErrorResponse(error: unknown, context: ErrorContext): NextResponse {
  const maybe = error as { name?: string; status?: number; code?: string; message?: string };
  // Erreurs métier des modules (ex. PaymentError) : contrôlées, exposables.
  if (maybe?.name === "PaymentError" && typeof maybe.status === "number" && maybe.code) {
    logger[maybe.status >= 500 ? "error" : "warn"]("api_module_error", {
      ...context,
      status: maybe.status,
      code: maybe.code,
      message: maybe.message,
    });
    return NextResponse.json(
      { success: false, error: maybe.message, code: maybe.code, requestId: context.requestId },
      { status: maybe.status, headers: { "x-request-id": context.requestId } }
    );
  }

  if (isAppError(error)) {
    const body = {
      success: false,
      error: error.expose ? error.message : "Erreur interne. Veuillez réessayer.",
      code: error.code,
      ...(error.details && error.details.length > 0 ? { details: error.details } : {}),
      requestId: context.requestId,
    };
    logger[error.status >= 500 ? "error" : "warn"]("api_error", {
      ...context,
      status: error.status,
      code: error.code,
      message: error.message,
    });
    return NextResponse.json(body, {
      status: error.status,
      headers: { "x-request-id": context.requestId },
    });
  }

  const mapped = prismaStatus(error);
  const status = mapped?.status ?? 500;
  const code = mapped?.code ?? "INTERNAL_ERROR";
  const message = (error as Error)?.message || String(error);

  logger.error("api_unhandled_error", {
    ...context,
    status,
    code,
    errorName: (error as Error)?.name,
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : (error as Error)?.stack,
  });

  return NextResponse.json(
    {
      success: false,
      error:
        status === 503
          ? "Service temporairement indisponible. Réessayez dans un instant."
          : "Erreur interne. Veuillez réessayer.",
      code,
      requestId: context.requestId,
    },
    { status, headers: { "x-request-id": context.requestId } }
  );
}

type RouteHandler<C> = (request: NextRequest, context: C) => Promise<Response>;

/**
 * Enveloppe une route API : corrélation des requêtes, journalisation et
 * réponse d'erreur uniforme. Les routes existantes peuvent l'adopter
 * progressivement sans changer leur logique métier.
 */
export function withApiRoute<C = unknown>(handler: RouteHandler<C>): RouteHandler<C> {
  return async (request: NextRequest, context: C): Promise<Response> => {
    const requestId = requestIdOf(request);
    const startedAt = Date.now();
    try {
      const response = await handler(request, context);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error) {
      return toErrorResponse(error, {
        requestId,
        route: request.nextUrl.pathname,
        method: request.method,
      });
    } finally {
      const durationMs = Date.now() - startedAt;
      if (durationMs > 2000) {
        logger.warn("api_slow_request", {
          requestId,
          route: request.nextUrl.pathname,
          method: request.method,
          durationMs,
        });
      }
    }
  };
}

