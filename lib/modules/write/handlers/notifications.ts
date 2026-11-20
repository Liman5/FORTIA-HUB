// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { assertNotificationAccess } from "@/lib/server/writeAuthorization";

import type { WriteHandlerContext } from "../types";

export async function handleNotificationsAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "mark-notification-read": {
        const notification = await assertNotificationAccess(auth, data.id);
        const updated = await prisma.notification.update({
          where: { id: notification.id },
          data: { isRead: true } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

    case "delete-notification": {
        // Une notification n'est supprimable que par son destinataire ;
        // une annonce globale est seulement marquée lue.
        const notification = await assertNotificationAccess(auth, data.id);
        const isOwner = !!auth.user?.id && notification.userId === auth.user.id;

        if (notification.isGlobal || !isOwner) {
          await prisma.notification
            .update({ where: { id: notification.id }, data: { isRead: true } as any })
            .catch(() => null);
          return NextResponse.json({ success: true, deleted: false, markedRead: true });
        }

        await prisma.notification.delete({ where: { id: notification.id } });
        return NextResponse.json({ success: true, deleted: true });
      }
  }
  return null;
}
