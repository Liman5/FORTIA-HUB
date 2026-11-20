import { z } from "zod";
import { emailSchema, moneyAmountSchema, phoneSchema, shortText, uuidSchema } from "./common";

const writeObject = z.object({ action: z.string().trim().min(1).max(80), data: z.record(z.unknown()) });
export const writeEnvelopeSchema = writeObject;
export const writeDataSchema = z.record(z.unknown());

export const writeActionSchemas: Record<string, z.ZodTypeAny> = {
  "issue-certificate": z
    .object({
      courseId: uuidSchema,
      userId: uuidSchema.optional(),
      force: z.boolean().optional(),
    })
    .passthrough(),

  "sync-user-learning": z
    .object({
      userId: uuidSchema.optional(),
      courseProgress: z.record(z.number()).optional(),
      earnedCertificates: z.array(z.record(z.unknown())).max(200).optional(),
    })
    .passthrough(),

  "update-profile": z
    .object({
      id: uuidSchema.optional(),
      name: shortText(2, 120).optional(),
      phone: z.string().trim().max(30).optional(),
      avatar: z.string().trim().max(500).optional(),
    })
    .passthrough(),

  "submit-quote": z
    .object({
      clientName: shortText(2, 120),
      clientEmail: emailSchema,
      phone: phoneSchema,
      serviceTitle: z.string().trim().max(200).optional(),
      details: z.string().trim().max(2000).optional(),
    })
    .passthrough(),

  "order-service": z
    .object({
      serviceId: uuidSchema.optional(),
      clientName: shortText(2, 120),
      clientEmail: emailSchema,
      clientPhone: phoneSchema,
      notes: z.string().trim().max(2000).optional(),
    })
    .passthrough(),

  "submit-support": z
    .object({
      orderNumber: z.string().trim().max(60).optional(),
      productTitle: z.string().trim().max(200).optional(),
      lastName: shortText(1, 80),
      firstName: shortText(1, 80),
      phoneContact: z.string().trim().min(3).max(30),
      email: emailSchema,
      notes: z.string().trim().max(2000).optional(),
    })
    .passthrough(),

  "submit-vendor-app": z
    .object({
      storeName: shortText(2, 120),
      applicantName: shortText(2, 120),
      email: emailSchema,
      phone: z.string().trim().min(3).max(30),
    })
    .passthrough(),

  "submit-payout": z
    .object({
      amountUsd: moneyAmountSchema.refine((value) => value > 0, "Montant requis."),
      payoutMethod: z.string().trim().max(60).optional(),
      accountDetails: z.string().trim().max(200).optional(),
    })
    .passthrough(),

  "create-course": z
    .object({
      title: shortText(3, 160),
      price: moneyAmountSchema.optional(),
      isPublished: z.boolean().optional(),
      categoryLabel: z.string().trim().max(80).optional(),
    })
    .passthrough(),

  "update-course": z
    .object({
      id: uuidSchema,
      title: shortText(3, 160).optional(),
      price: moneyAmountSchema.optional(),
      isPublished: z.boolean().optional(),
    })
    .passthrough(),

  "create-product": z
    .object({
      title: shortText(2, 160),
      price: moneyAmountSchema.optional(),
      typeLabel: z.string().trim().max(80).optional(),
    })
    .passthrough(),

  "update-product": z
    .object({
      id: uuidSchema,
      title: shortText(2, 160).optional(),
      price: moneyAmountSchema.optional(),
    })
    .passthrough(),

  "approve-kyc": z.object({ id: uuidSchema }).passthrough(),
  "approve-kyc-full": z
    .object({
      id: uuidSchema.optional(),
      email: emailSchema.optional(),
    })
    .passthrough()
    .refine((value) => !!value.id || !!value.email, {
      message: "id ou email requis.",
    }),
  "kyc-set-lock": z.object({ kycId: uuidSchema }).passthrough(),
  "kyc-unlock": z.object({ kycId: uuidSchema }).passthrough(),
  "kyc-remove-doc": z.object({ kycId: uuidSchema }).passthrough(),
};

export type WriteEnvelope = z.infer<typeof writeEnvelopeSchema>;
