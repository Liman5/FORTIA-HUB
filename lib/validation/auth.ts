import { z } from "zod";
import { emailSchema, phoneSchema, shortText } from "./common";

const strongPassword = z
  .string()
  .min(10, "Au moins 10 caractères.")
  .max(72, "72 caractères maximum.")
  .regex(/[A-Z]/, "Une majuscule est requise.")
  .regex(/[0-9]/, "Un chiffre est requis.")
  .regex(/[^a-zA-Z0-9]/, "Un symbole est requis.");

const otpSchema = z.string().trim().regex(/^\d{6}$/, "Le code doit comporter 6 chiffres.");

export const authActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check-email"), email: emailSchema }),
  z.object({ action: z.literal("send-otp"), email: emailSchema, name: shortText(1, 120).optional() }),
  z.object({
    action: z.literal("verify-otp"),
    email: emailSchema,
    otp: otpSchema,
    sender: z.string().trim().max(40).optional(),
  }),
  z.object({
    action: z.literal("register"),
    email: emailSchema,
    password: strongPassword,
    name: shortText(2, 120),
    phone: phoneSchema,
    accountType: z.enum(["buyer", "freelance", "enterprise"]).optional(),
    /**
     * Jeton signé renvoyé par verify-otp (preuve de vérification de l'e-mail).
     * Facultatif : exigé par la route uniquement lorsque la vérification
     * d'adresse e-mail est active (voir isEmailVerificationRequired()).
     */
    verificationToken: z.string().trim().min(20, "Jeton de vérification requis.").max(4096).optional(),
  }),
  z.object({
    action: z.literal("login"),
    email: emailSchema,
    password: z.string().min(1, "Mot de passe requis.").max(200),
  }),
  z.object({ action: z.literal("delete-account") }).passthrough(),
  z.object({
    action: z.literal("verify-2fa"),
    email: emailSchema.optional(),
    otp: otpSchema,
  }),
  z.object({ action: z.literal("get-2fa-status") }),
  z.object({ action: z.literal("2fa-setup") }),
  z.object({
    action: z.literal("toggle-2fa"),
    enabled: z.boolean(),
    otp: otpSchema,
  }),
]);

export type AuthActionInput = z.infer<typeof authActionSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  accessToken: z.string().min(10, "Jeton de réinitialisation invalide.").max(4096),
  password: strongPassword,
});

