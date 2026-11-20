import { z } from "zod";
import { shortText, uuidSchema } from "./common";

export const lessonProgressSchema = z.object({
  courseId: uuidSchema,
  lessonId: uuidSchema,
  completed: z.boolean().default(true),
});

export const quizAnswerSchema = z.object({
  quizId: uuidSchema,
  optionId: uuidSchema,
});

export const quizAttemptSchema = z.object({
  courseId: uuidSchema,
  answers: z.array(quizAnswerSchema).min(1, "Aucune réponse fournie.").max(200),
});

export const certificateIssueSchema = z.object({
  courseId: uuidSchema,
  force: z.boolean().optional(),
});

export const courseIdQuerySchema = z.object({ courseId: uuidSchema });

export const certificateAdminIssueSchema = certificateIssueSchema.extend({
  userId: uuidSchema.optional(),
  force: z.boolean().optional(),
});

export const courseCategorySchema = z.object({
  code: z.string().trim().min(2).max(40),
  label: shortText(2, 80),
  description: z.string().trim().max(500).optional(),
});

export type LessonProgressInput = z.infer<typeof lessonProgressSchema>;
export type QuizAttemptInput = z.infer<typeof quizAttemptSchema>;
