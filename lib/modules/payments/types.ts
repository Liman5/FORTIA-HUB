// ============================================================
// FORTIA HUB — TYPES DU DOMAINE PAIEMENTS (Phase 2)
// ============================================================

export type PaymentItemType =
  | "course"
  | "product"
  | "subscription"
  | "storage"
  | "service"
  | "feature";

export interface CreateOrderItemInput {
  type: PaymentItemType;
  /** Identifiant de la ressource (formation, produit, service…). */
  id?: string;
  /** Code de tarif serveur (abonnement, stockage, fonctionnalité). */
  planCode?: string;
  /** Centre de formation concerné (achat de stockage uniquement). */
  centerId?: string;
  quantity?: number;
}

export interface ResolvedOrderItem {
  type: PaymentItemType;
  resourceId: string;
  title: string;
  unitPriceMinor: number;
  quantity: number;
  totalMinor: number;
  currency: string;
  metadata: Record<string, unknown>;
}

export interface BuyerInfo {
  userId: string;
  name: string;
  email: string;
  phone?: string;
}

export type PaymentEventType =
  | "payment_succeeded"
  | "payment_failed"
  | "refund_succeeded"
  | "subscription_renewed"
  | "ignored";

export interface ParsedProviderEvent {
  eventId: string;
  type: PaymentEventType;
  /** Référence de la tentative de paiement chez le fournisseur. */
  providerRef: string;
  amountMinor?: number;
  currency?: string;
  /** Identifiant interne de la tentative (metadata.paymentId). */
  paymentId?: string;
  /** Identifiant interne de l'abonnement (renouvellement). */
  subscriptionId?: string;
  providerRefundId?: string;
  metadata?: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export interface CreateCheckoutInput {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  description: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutResult {
  providerRef: string;
  checkoutUrl: string;
  /** Charge utile non sensible à conserver pour diagnostic. */
  raw: Record<string, unknown>;
}

export interface ProviderRefundInput {
  providerRef: string;
  amountMinor: number;
  currency: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderRefundResult {
  providerRef: string;
  succeeded: boolean;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  code: string;
  label: string;
  isConfigured(): boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  verifyWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<ParsedProviderEvent>;
  refund?(input: ProviderRefundInput): Promise<ProviderRefundResult>;
}

/** Erreur métier typée (statut HTTP + code stable). */
export class PaymentError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "PaymentError";
    this.status = status;
    this.code = code;
  }
}
