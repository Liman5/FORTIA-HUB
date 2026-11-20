// ============================================================
// FORTIA HUB — HANDLER D'ÉCRITURE : ACADÉMIE
// ------------------------------------------------------------
// Adaptateur HTTP : autorisation, identité de session, appel du
// service métier `lib/modules/academy`, réponse compatible.
// ============================================================

import { NextResponse } from "next/server";
import {
  WriteError,
  assertCenterAccess,
  assertCourseAccess,
  requireActorUser,
} from "@/lib/server/writeAuthorization";
import { uuidOrNull } from "@/lib/validation/common";
import {
  archiveAndDeleteCourse,
  createCourseRecord,
  createInstructorCourseRecord,
  setCourseFeaturedRecord,
  suspendCourseRecord,
  updateCourseRecord,
} from "@/lib/modules/academy/courses";
import {
  createCourseCategory,
  deleteCourseCategory,
  updateCourseCategory,
} from "@/lib/modules/academy/categories";
import type { WriteHandlerContext } from "../types";

export async function handleAcademyAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;

  switch (action) {
    case "create-course": {
      const id = await createCourseRecord(data);
      return NextResponse.json({ success: true, id });
    }

    case "update-course": {
      // Propriétaire de la formation ou administrateur uniquement.
      await assertCourseAccess(auth, data.id);
      const id = await updateCourseRecord(String(data.id), data);
      return NextResponse.json({ success: true, id });
    }

    case "create-course-category": {
      const result = await createCourseCategory(data);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({ success: true, id: result.id, code: result.code });
    }

    case "update-course-category": {
      const result = await updateCourseCategory(data);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({ success: true, id: result.id });
    }

    case "delete-course-category": {
      const result = await deleteCourseCategory(data.id);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      return NextResponse.json({ success: true });
    }

    case "set-course-featured": {
      if (!data.courseId) {
        return NextResponse.json({ error: "courseId requis" }, { status: 400 });
      }
      const updated = await setCourseFeaturedRecord(
        String(data.courseId),
        !!data.isFeatured
      );
      return NextResponse.json({
        success: true,
        id: updated.id,
        isFeatured: updated.isFeatured,
      });
    }

    case "submit-course-by-instructor": {
      // Identité du formateur issue de la SESSION (un admin peut cibler).
      const instructorId = auth.isAdmin
        ? uuidOrNull(data.instructorId)
        : requireActorUser(auth).id;
      if (!instructorId) {
        throw new WriteError(
          401,
          "Session formateur introuvable ou expirée : reconnectez-vous puis republiez la formation."
        );
      }

      const centerId = uuidOrNull(data.centerId);
      if (centerId) await assertCenterAccess(auth, centerId);

      const id = await createInstructorCourseRecord({
        instructorId,
        centerId,
        data,
      });
      return NextResponse.json({ success: true, id });
    }

    case "suspend-course": {
      await assertCourseAccess(auth, data.id);
      const id = await suspendCourseRecord(String(data.id));
      return NextResponse.json({ success: true, id });
    }

    case "delete-course": {
      await assertCourseAccess(auth, data.id);
      const deleted = await archiveAndDeleteCourse(String(data.id));
      if (!deleted) {
        return NextResponse.json({ error: "Formation introuvable." }, { status: 404 });
      }
      return NextResponse.json({ success: true, archived: true });
    }
  }

  return null;
}
