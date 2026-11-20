// ============================================================
// FORTIA HUB — TESTS PHASE 3 : ATTESTATIONS VÉRIFIÉES
// ------------------------------------------------------------
// Vérifie que :
//   • la progression vient des leçons terminées côté serveur ;
//   • une progression envoyée par le navigateur est ignorée ;
//   • le score du quiz est calculé par le serveur ;
//   • l'attestation n'est délivrée qu'après toutes les preuves ;
//   • la délivrance est idempotente.
//
// Prérequis : serveur `next start -p 3100` + .env.local.
// ============================================================

import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SignJWT } from "jose";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
config({ path: path.join(ROOT, ".env.local") });
config({ path: path.join(ROOT, ".env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:3100";
const connectionString = process.env.DATABASE_POOL_URL || process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "";
if (!connectionString) throw new Error("DATABASE_URL manquant");
if (!JWT_SECRET) throw new Error("JWT_SECRET manquant");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const tag = `p3-${Date.now().toString(36)}`;
const state = { userId: "", token: "", courseId: "", chapterId: "", lessonIds: [], quizId: "", optionIds: [] };

let passed = 0;
let failed = 0;
const failures = [];

function check(condition, label, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  OK  ${label}`);
  } else {
    failed += 1;
    failures.push(`${label} — ${detail}`);
    console.log(`  KO  ${label} — ${detail}`);
  }
}

async function api(pathname, { method = "GET", token, body } = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Cookie: `fh_session=${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: response.status, json, text };
}

async function setup() {
  console.log("\n=== SETUP ===");
  const user = await prisma.user.create({
    data: {
      email: `${tag}@example.invalid`,
      passwordHash: "test-not-used",
      name: "Apprenant Test Phase 3",
      accountType: "buyer",
    },
  });
  state.userId = user.id;
  state.token = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
    .sign(new TextEncoder().encode(JWT_SECRET));
  await prisma.session.create({
    data: { userId: user.id, token: state.token, expiresAt: new Date(Date.now() + 3600_000) },
  });

  const course = await prisma.course.create({
    data: {
      title: `${tag} Formation certifiante`,
      slug: `${tag}-course`,
      categoryLabel: "TestCert",
      price: 0,
      isPublished: true,
      instructorId: user.id,
    },
  });
  state.courseId = course.id;

  const chapter = await prisma.courseChapter.create({
    data: { courseId: course.id, title: "Chapitre 1", displayOrder: 1 },
  });
  state.chapterId = chapter.id;

  const lesson1 = await prisma.courseLesson.create({
    data: { chapterId: chapter.id, title: "Leçon 1", type: "article", content: "A", displayOrder: 1 },
  });
  const lesson2 = await prisma.courseLesson.create({
    data: { chapterId: chapter.id, title: "Leçon 2", type: "article", content: "B", displayOrder: 2 },
  });
  state.lessonIds = [lesson1.id, lesson2.id];

  const quiz = await prisma.courseQuiz.create({
    data: { courseId: course.id, question: "2 + 2 = ?", explanation: "4", displayOrder: 1 },
  });
  state.quizId = quiz.id;
  const wrong = await prisma.quizOption.create({
    data: { quizId: quiz.id, optionText: "5", isCorrect: false, displayOrder: 1 },
  });
  const right = await prisma.quizOption.create({
    data: { quizId: quiz.id, optionText: "4", isCorrect: true, displayOrder: 2 },
  });
  state.optionIds = [wrong.id, right.id];

  console.log(`  user=${user.id} course=${course.id}`);
}

async function cleanup() {
  console.log("\n=== CLEANUP ===");
  if (cleanup.done) return;
  cleanup.done = true;
  try {
    await prisma.certificate.deleteMany({
      where: { OR: [{ userId: state.userId }, { courseId: state.courseId || undefined }] },
    });
    if (state.courseId) {
      await prisma.courseQuizAttempt.deleteMany({ where: { courseId: state.courseId } });
      await prisma.courseLessonProgress.deleteMany({ where: { courseId: state.courseId } });
      await prisma.courseEnrollment.deleteMany({ where: { courseId: state.courseId } });
      await prisma.quizOption.deleteMany({ where: { quiz: { courseId: state.courseId } } });
      await prisma.courseQuiz.deleteMany({ where: { courseId: state.courseId } });
      await prisma.courseLesson.deleteMany({ where: { chapter: { courseId: state.courseId } } });
      await prisma.courseChapter.deleteMany({ where: { courseId: state.courseId } });
      await prisma.course.deleteMany({ where: { id: state.courseId } });
    }
    if (state.userId) {
      await prisma.certificate.deleteMany({ where: { userId: state.userId } });
      await prisma.dataArchive.deleteMany({
        where: { tableName: "courses", recordId: state.courseId || undefined },
      });
      await prisma.session.deleteMany({ where: { userId: state.userId } });
      await prisma.rateLimitCounter.deleteMany({
        where: { key: { contains: state.userId } },
      });
      await prisma.user.deleteMany({ where: { id: state.userId } });
    }
    console.log("  Données de test supprimées.");
  } catch (error) {
    console.log("  ATTENTION cleanup partiel:", error?.message);
  }
}

async function run() {
  await setup();
  try {
    console.log("\n=== 1. Éligibilité initiale ===");
    const initial = await api(
      `/api/academy/certificates/eligibility?courseId=${state.courseId}`,
      { token: state.token }
    );
    check(initial.status === 200, "Éligibilité accessible", `status=${initial.status}`);
    check(initial.json?.data?.eligible === false, "Non éligible sans progression");
    check(initial.json?.data?.progress === 0, "Progression initiale 0");

    console.log("\n=== 2. Progression serveur (leçons) ===");
    const lesson1 = await api("/api/academy/lessons/progress", {
      method: "POST",
      token: state.token,
      body: { courseId: state.courseId, lessonId: state.lessonIds[0], completed: true },
    });
    check(lesson1.status === 200, "Leçon 1 enregistrée", `body=${lesson1.text.slice(0, 120)}`);
    check(lesson1.json?.data?.progress === 50, "Progression 50 %", `progress=${lesson1.json?.data?.progress}`);

    const cheat = await api("/api/platform/write", {
      method: "POST",
      token: state.token,
      body: {
        action: "sync-user-learning",
        data: { courseProgress: { [state.courseId]: 100 } },
      },
    });
    check(cheat.status === 200, "sync-user-learning accepté", `status=${cheat.status}`);

    const afterCheat = await api(
      `/api/academy/certificates/eligibility?courseId=${state.courseId}`,
      { token: state.token }
    );
    check(
      afterCheat.json?.data?.progress === 50,
      "Progression 100 % envoyée par le navigateur IGNORÉE",
      `progress=${afterCheat.json?.data?.progress}`
    );

    const lesson2 = await api("/api/academy/lessons/progress", {
      method: "POST",
      token: state.token,
      body: { courseId: state.courseId, lessonId: state.lessonIds[1], completed: true },
    });
    check(lesson2.json?.data?.progress === 100, "Progression 100 % après 2 leçons");

    console.log("\n=== 3. Quiz et attestation ===");
    const noQuiz = await api(
      `/api/academy/certificates/eligibility?courseId=${state.courseId}`,
      { token: state.token }
    );
    check(noQuiz.json?.data?.eligible === false, "Quiz non validé : non éligible");
    check(
      Array.isArray(noQuiz.json?.data?.reasons) &&
        noQuiz.json.data.reasons.some((reason) => String(reason).includes("Quiz")),
      "Motif quiz explicite",
      JSON.stringify(noQuiz.json?.data?.reasons)
    );

    const blocked = await api("/api/platform/write", {
      method: "POST",
      token: state.token,
      body: { action: "issue-certificate", data: { courseId: state.courseId } },
    });
    check(
      blocked.status === 409,
      "Délivrance directe bloquée avant quiz (409)",
      `status=${blocked.status} body=${blocked.text.slice(0, 160)}`
    );

    const wrongAttempt = await api("/api/academy/quizzes/attempt", {
      method: "POST",
      token: state.token,
      body: {
        courseId: state.courseId,
        answers: [{ quizId: state.quizId, optionId: state.optionIds[0] }],
      },
    });
    check(wrongAttempt.json?.data?.passed === false, "Mauvaise réponse : quiz échoué");
    check(wrongAttempt.json?.data?.score === 0, "Score calculé par le serveur (0)");

    const goodAttempt = await api("/api/academy/quizzes/attempt", {
      method: "POST",
      token: state.token,
      body: {
        courseId: state.courseId,
        answers: [{ quizId: state.quizId, optionId: state.optionIds[1] }],
      },
    });
    check(goodAttempt.json?.data?.passed === true, "Bonne réponse : quiz réussi");
    check(goodAttempt.json?.data?.percent === 100, "Score 100 % calculé côté serveur");
    check(
      goodAttempt.json?.data?.corrections?.[0]?.correctOptionIndex === 1,
      "Correction renvoyée par le serveur",
      JSON.stringify(goodAttempt.json?.data?.corrections)
    );

    const ready = await api(
      `/api/academy/certificates/eligibility?courseId=${state.courseId}`,
      { token: state.token }
    );
    check(ready.json?.data?.eligible === true, "Éligible après leçons + quiz");

    const issue = await api("/api/academy/certificates/issue", {
      method: "POST",
      token: state.token,
      body: { courseId: state.courseId },
    });
    check(issue.status === 200 && issue.json?.certificate?.id, "Attestation délivrée", `body=${issue.text.slice(0, 160)}`);
    const certificateId = issue.json?.certificate?.id;

    const again = await api("/api/academy/certificates/issue", {
      method: "POST",
      token: state.token,
      body: { courseId: state.courseId },
    });
    check(again.json?.certificate?.id === certificateId, "Délivrance idempotente (même numéro)");

    const dbCertificate = await prisma.certificate.findFirst({
      where: { userId: state.userId, courseId: state.courseId },
    });
    check(!!dbCertificate?.verified, "Attestation tracée et vérifiée en base");

    console.log("\n=== 4. Suppression de formation : archivage et conservation ===");
    await prisma.entitlement.create({
      data: {
        userId: state.userId,
        resourceType: "course",
        resourceId: state.courseId,
        status: "active",
        source: "test",
      },
    });

    const deletion = await api("/api/platform/write", {
      method: "POST",
      token: state.token,
      body: { action: "delete-course", data: { id: state.courseId } },
    });
    check(deletion.status === 200 && deletion.json?.archived === true, "Formation supprimée et archivée", `body=${deletion.text.slice(0, 140)}`);

    const archived = await prisma.dataArchive.findFirst({
      where: { tableName: "courses", recordId: state.courseId, reason: "course_deleted" },
    });
    check(!!archived, "Snapshot de la formation conservé dans data_archive");

    const certificateAfter = await prisma.certificate.findFirst({
      where: { userId: state.userId },
    });
    check(certificateAfter?.courseId === null, "Attestation conservée après suppression du cours");

    const entitlementAfter = await prisma.entitlement.findFirst({
      where: { userId: state.userId, resourceType: "course", resourceId: state.courseId },
    });
    check(entitlementAfter?.status === "revoked", "Droit d'accès révoqué après suppression");

    const lessonsAfter = await prisma.courseLesson.count({ where: { chapter: { courseId: state.courseId } } });
    check(lessonsAfter === 0, "Aucune leçon orpheline après suppression");


    console.log(`\n=== RÉSULTAT : ${passed} réussis / ${failed} échoués ===`);
    if (failures.length > 0) console.log(failures.map((failure) => ` - ${failure}`).join("\n"));
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
  process.exitCode = failed === 0 ? 0 : 1;
}

run().catch(async (error) => {
  console.error("ERREUR FATALE:", error);
  await cleanup();
  await prisma.$disconnect();
  process.exitCode = 1;
});

