// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { uuidOrNull } from "@/lib/validation/common";
import type { WriteHandlerContext } from "../types";

export async function handleContentAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "create-banner": {
        const created = await prisma.siteBanner.create({
          data: {
            title: data.title || "",
            subtitle: data.subtitle || "",
            imageUrl: data.imageUrl || "",
            imagePosition: data.imagePosition || "50% 50%",
            animation: data.animation || "fade",
            intervalMs: Number(data.intervalMs) || 5000,
            buttonLabel: data.buttonLabel || "",
            buttonLink: data.buttonLink || "",
            linkTarget: data.linkTarget === "external" ? "external" : "internal",
            isActive: data.isActive ?? true,
            displayOrder: Number(data.displayOrder) || 0,
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

    case "update-banner": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        const updated = await prisma.siteBanner.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            subtitle: data.subtitle ?? undefined,
            imageUrl: data.imageUrl ?? undefined,
            imagePosition: data.imagePosition ?? undefined,
            animation: data.animation ?? undefined,
            intervalMs: data.intervalMs !== undefined ? Number(data.intervalMs) || 5000 : undefined,
            buttonLabel: data.buttonLabel ?? undefined,
            buttonLink: data.buttonLink ?? undefined,
            linkTarget: data.linkTarget ?? undefined,
            isActive: data.isActive ?? undefined,
            displayOrder: data.displayOrder !== undefined ? Number(data.displayOrder) || 0 : undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

    case "delete-banner": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        await prisma.siteBanner.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

    case "create-blog-post": {
        const created = await prisma.blogPost.create({
          data: {
            title: data.title || "Article",
            slug: data.slug || `article-${Date.now()}`,
            excerpt: data.excerpt || "",
            content: data.content || "",
            authorName: data.authorName || "Équipe FORTIA",
            authorAvatar: data.authorAvatar || "",
            authorRole: data.authorRole || "",
            category: data.category || "",
            date: data.date || new Date().toISOString().split("T")[0],
            readTime: data.readTime || "5 min",
            image: data.image || "",
            accentColor: data.accentColor || "#D69E25",
            coverStyle: data.coverStyle || "image",
            tags: Array.isArray(data.tags) ? data.tags : [],
            isPublished: data.isPublished ?? true,
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

    case "update-blog-post": {
        if (!uuidOrNull(data.id)) return NextResponse.json({ error: "id (UUID) requis" }, { status: 400 });
        const updated = await prisma.blogPost.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            slug: data.slug ?? undefined,
            excerpt: data.excerpt ?? undefined,
            content: data.content ?? undefined,
            authorName: data.authorName ?? undefined,
            authorAvatar: data.authorAvatar ?? undefined,
            authorRole: data.authorRole ?? undefined,
            category: data.category ?? undefined,
            date: data.date ?? undefined,
            readTime: data.readTime ?? undefined,
            image: data.image ?? undefined,
            accentColor: data.accentColor ?? undefined,
            coverStyle: data.coverStyle ?? undefined,
            tags: Array.isArray(data.tags) ? data.tags : undefined,
            isPublished: data.isPublished ?? undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

    case "delete-blog-post": {
        if (!uuidOrNull(data.id)) return NextResponse.json({ error: "id (UUID) requis" }, { status: 400 });
        await prisma.blogPost.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }
  }
  return null;
}
