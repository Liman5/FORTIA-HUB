// ============================================================
// FORTIA HUB — CATALOGUE DE PRESTATIONS (service métier)
// ============================================================

import { prisma } from "@/lib/prisma";

export type ServiceWriteData = Record<string, any>;

async function createOptions(serviceId: string, options: unknown): Promise<void> {
  if (!Array.isArray(options)) return;
  for (const [index, option] of options.entries()) {
    await prisma.serviceOption.create({
      data: {
        serviceId,
        name: option.name || "Option " + (index + 1),
        price: option.price || 0,
        displayOrder: index,
      } as never,
    });
  }
}

export async function createServiceRecord(data: ServiceWriteData): Promise<string> {
  const created = await prisma.servicePackage.create({
    data: {
      title: data.title || "Service sans titre",
      category: data.category || "",
      description: data.description || "",
      startingPrice: data.startingPrice || 0,
      estimatedDays: data.estimatedDays || "3 a 5 jours",
      iconName: data.iconName || "Briefcase",
      deliverables: data.deliverables || [],
      image: data.image || "",
      imagePosition: data.imagePosition || "50% 50%",
      images: Array.isArray(data.images) ? data.images : [],
      borderStyle: data.borderStyle || "gold",
      cardAnimation: data.cardAnimation || "fade-up",
      accentColor: data.accentColor || "#D69E25",
      badgeText: data.badgeText || "",
      featured: data.featured ?? false,
      isActive: data.isActive ?? true,
      displayOrder: data.displayOrder ?? 0,
    } as never,
  });
  await createOptions(created.id, data.options);
  return created.id;
}

export async function updateServiceRecord(data: ServiceWriteData): Promise<string> {
  const updated = await prisma.servicePackage.update({
    where: { id: data.id },
    data: {
      title: data.title ?? undefined,
      category: data.category ?? undefined,
      description: data.description ?? undefined,
      startingPrice: data.startingPrice ?? undefined,
      estimatedDays: data.estimatedDays ?? undefined,
      iconName: data.iconName ?? undefined,
      deliverables: data.deliverables ?? undefined,
      image: data.image ?? undefined,
      imagePosition: data.imagePosition ?? undefined,
      images: Array.isArray(data.images) ? data.images : undefined,
      borderStyle: data.borderStyle ?? undefined,
      cardAnimation: data.cardAnimation ?? undefined,
      accentColor: data.accentColor ?? undefined,
      badgeText: data.badgeText ?? undefined,
      featured: data.featured ?? undefined,
      isActive: data.isActive ?? undefined,
      displayOrder: data.displayOrder ?? undefined,
    } as never,
  });

  if (Array.isArray(data.options)) {
    await prisma.serviceOption.deleteMany({ where: { serviceId: data.id } });
    await createOptions(data.id, data.options);
  }
  return updated.id;
}

export async function deleteServiceRecord(serviceId: string): Promise<void> {
  await prisma.servicePackage.delete({ where: { id: serviceId } });
}
