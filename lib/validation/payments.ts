import { z } from "zod";
import { emailSchema, phoneSchema, shortText, uuidSchema } from "./common";

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const paymentItemTypeSchema = z.enum([
  "course",
  "product",
  "subscription",
  "storage",
  "service",
  "feature",
]);

export const checkoutItemSchema = z
  .object({
    type: paymentItemTypeSchema,
    id: uuidSchema.optional(),
    planCode: z.string().trim().min(1).max(60).optional(),
    centerId: uuidSchema.optional(),
    quantity: z.number().int().min(1).max(20).optional(),
  })
  .superRefine((item, ctx) => {
    if (["course", "product", "service"].includes(item.type) && !item.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["id"],
        message: "Identifiant de ressource requis.",
      });
    }
    if (["subscription", "storage", "feature"].includes(item.type) && !item.planCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["planCode"],
        message: "Code de tarif requis.",
      });
    }
    if (item.type === "storage" && !item.centerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["centerId"],
        message: "Centre de formation requis.",
      });
    }
  });

export const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "Le panier est vide.").max(20),
  provider: z.string().trim().max(30).optional(),
  buyer: z
    .object({
      name: shortText(2, 120).optional(),
      email: emailSchema.optional(),
      phone: phoneSchema,
    })
    .optional(),
});

export const cancelOrderSchema = z.object({ orderId: uuidSchema });

export const refundSchema = z.object({
  orderId: uuidSchema,
  paymentId: uuidSchema.optional(),
  amountMinor: z.number().int().min(1).max(100_000_000).optional(),
  reason: shortText(3, 500),
});

export const subscriptionCancelSchema = z.object({ subscriptionId: uuidSchema });

export const subscriptionPlanSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{2,60}$/, "Code invalide (lettres, chiffres, - et _)."),
  name: shortText(2, 120),
  description: optionalText(500),
  amountMinor: z.number().int().min(1).max(100_000_000),
  currency: z.string().trim().length(3).optional(),
  interval: z.enum(["month", "year"]).optional(),
  isActive: z.boolean().optional(),
});

export const entitlementQuerySchema = z.object({
  resourceType: z
    .enum(["course", "product", "subscription", "storage", "service", "feature"])
    .optional(),
  resourceId: z.string().trim().max(120).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
