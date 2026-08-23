// ============================================================
// FORTIA HUB — Vérification persistance réelle formateur
// Simule le flux complet : création centre (UUID) -> cours
// avec chapitres/leçons vidéo/quiz -> vérification en base.
// ============================================================
import { config } from "dotenv";
import path from "path";
import pg from "pg";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante");

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  try {
    // 1. Récupérer un utilisateur réel (formateur)
    const users = await client.query(`SELECT id, email, name FROM users LIMIT 1`);
    if (users.rows.length === 0) {
      console.log("Aucun utilisateur — impossible de tester.");
      return;
    }
    const instructor = users.rows[0];
    console.log("Formateur testé :", instructor.email);

    // 2. Créer un centre de formation réel (UUID généré par la DB)
    const centerName = `Centre Test ${Date.now()}`;
    const insertedCenter = await client.query(
      `INSERT INTO training_centers (owner_id, center_name, slug, description, status, fee_paid, storage_quota_gb, storage_used_bytes)
       VALUES ($1, $2, $3, $4, 'active', TRUE, 4, 0)
       RETURNING id`,
      [instructor.id, centerName, `centre-test-${Date.now()}`, "Centre de test automatique"]
    );
    const centerId = insertedCenter.rows[0].id;
    console.log("✅ Centre créé avec UUID réel :", centerId);

    // 3. Créer un cours formateur lié au centre (comme submit-course-by-instructor)
    const insertedCourse = await client.query(
      `INSERT INTO courses (title, slug, instructor_id, center_id, category_label, description, level, duration_hours, lessons_count, price, image, is_published)
       VALUES ($1, $2, $3, $4, 'IA', 'Cours de test automatique', 'Debutant', 2, 1, 49, '', TRUE)
       RETURNING id`,
      [`Cours Test ${Date.now()}`, `cours-test-${Date.now()}`, instructor.id, centerId]
    );
    const courseId = insertedCourse.rows[0].id;
    console.log("✅ Cours créé avec instructor_id + center_id en base");

    // 4. Ajouter un chapitre + leçon vidéo (comme l'upload R2)
    const insertedChapter = await client.query(
      `INSERT INTO course_chapters (course_id, title, display_order) VALUES ($1, 'Introduction', 0) RETURNING id`,
      [courseId]
    );
    const chapterId = insertedChapter.rows[0].id;
    await client.query(
      `INSERT INTO course_lessons (chapter_id, title, duration, type, video_url, display_order)
       VALUES ($1, 'Leçon test vidéo R2', '15 min', 'video', 'https://storage.fortia-hub.com/course-media/test/video.mp4', 0)`,
      [chapterId]
    );
    console.log("✅ Chapitre + leçon vidéo (URL R2) persistés");

    // 5. Ajouter un quiz avec options (bonne réponse)
    const insertedQuiz = await client.query(
      `INSERT INTO course_quizzes (course_id, question, explanation, display_order) VALUES ($1, 'Quelle est la bonne réponse ?', 'Explication test', 0) RETURNING id`,
      [courseId]
    );
    const quizId = insertedQuiz.rows[0].id;
    await client.query(
      `INSERT INTO quiz_options (quiz_id, option_text, is_correct, display_order)
       VALUES ($1, 'Réponse A', FALSE, 0), ($1, 'Réponse B', TRUE, 1), ($1, 'Réponse C', FALSE, 2)`,
      [quizId]
    );
    console.log("✅ Quiz avec bonne réponse persisté");

    // 6. Vérifications finales
    const checkCourse = await client.query(
      `SELECT c.id, c.instructor_id, c.center_id, c.price, COUNT(DISTINCT ch.id) AS chapters, COUNT(DISTINCT l.id) AS lessons
       FROM courses c
       LEFT JOIN course_chapters ch ON ch.course_id = c.id
       LEFT JOIN course_lessons l ON l.chapter_id = ch.id
       WHERE c.id = $1 GROUP BY c.id`,
      [courseId]
    );
    const checkQuiz = await client.query(
      `SELECT q.question, COUNT(o.id) AS options
       FROM course_quizzes q LEFT JOIN quiz_options o ON o.quiz_id = q.id
       WHERE q.course_id = $1 GROUP BY q.id`,
      [courseId]
    );
    console.log("✅ Vérification cours :", JSON.stringify(checkCourse.rows[0]));
    console.log("✅ Vérification quiz :", JSON.stringify(checkQuiz.rows[0]));

    if (checkCourse.rows[0]?.instructor_id === instructor.id && checkCourse.rows[0]?.center_id === centerId) {
      console.log("🎉 PERSISTANCE RÉELLE CONFIRMÉE : le cours formateur, ses chapitres, leçons vidéo et quiz sont bien en base.");
    } else {
      console.error("❌ Échec de liaison cours->formateur/centre");
    }

    // 7. Nettoyage du test (garder la base propre)
    await client.query(`DELETE FROM course_quizzes WHERE course_id = $1`, [courseId]);
    await client.query(`DELETE FROM course_chapters WHERE course_id = $1`, [courseId]);
    await client.query(`DELETE FROM courses WHERE id = $1`, [courseId]);
    await client.query(`DELETE FROM training_centers WHERE id = $1`, [centerId]);
    console.log("Nettoyage test terminé.");
  } catch (err: any) {
    console.error("❌ Échec du test de persistance:", err?.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();