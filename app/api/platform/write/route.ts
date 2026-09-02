import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { notifyUser } from "@/lib/services/notifyUser";

export const dynamic = "force-dynamic";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_EMAIL = process.env.SENDER_EMAIL || "Fortia Hub <onboarding@resend.dev>";

/**
 * POST /api/platform/write
 * Persiste une action d'écriture dans Supabase (via Prisma).
 * Body : { action: string, data: object }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body || {};

    if (!action || !data) {
      return NextResponse.json({ error: "action et data requis" }, { status: 400 });
    }

    switch (action) {
      // ============ DEVIS SERVICE ============
      case "submit-quote": {
        const created = await prisma.serviceQuote.create({
          data: {
            clientName: data.clientName || "",
            clientEmail: data.clientEmail || "",
            clientPhone: data.phone || "",
            serviceTitle: data.serviceTitle || "",
            serviceId: data.serviceCategory || undefined,
            details: data.details || "",
            estimatedPrice: data.estimatedPrice || 0,
            status: "Recu",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ SOUMISSION KYC ============
      case "submit-kyc": {
        // La colonne applicant_id est de type UUID en base.
        // Le frontend génère parfois un ID mocké "user-..." qui n'est PAS un UUID.
        // → On vérifie la validité et on neutralise si invalide (la relation
        //   avec users est optionnelle : on peut lier plus tard par email).
        const rawApplicantId = data.applicantId ? String(data.applicantId) : "";
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawApplicantId);

        // Les fichiers (base64 DataURL) peuvent être très volumineux.
        // On ne les stocke PAS dans la table (URLs externes/R2 attendues).
        // Si un DataURL est fourni, on le remplace par un marqueur vide.
        const sanitizeFileUrl = (val: unknown): string => {
          if (!val) return "";
          const s = String(val);
          // Tronque les DataURL base64 pour ne pas saturer la colonne TEXT
          return s.startsWith("data:") ? "" : s.slice(0, 2000);
        };

        const created = await prisma.kycSubmission.create({
          data: {
            applicantType: data.applicantType || "freelance",
            applicantId: isValidUuid ? rawApplicantId : undefined,
            applicantName: data.applicantName || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            repRole: data.repRole || "",
            email: data.email || "",
            phone: data.phone || "",
            country: data.country || "",
            address: data.address || "",
            documentType: data.documentType || "CNI",
            documentNumber: data.documentNumber || "",
            idExpirationDate: data.idExpirationDate || "",
            idRectoUrl: sanitizeFileUrl(data.idRectoUrl),
            idVersoUrl: sanitizeFileUrl(data.idVersoUrl),
            selfieUrl: sanitizeFileUrl(data.selfieUrl),
            companyName: data.companyName || "",
            legalForm: data.legalForm || "",
            rccmNumber: data.rccmNumber || "",
            companyDocUrl: sanitizeFileUrl(data.companyDocUrl),
            documentFileUrl: sanitizeFileUrl(data.documentFileUrl),
            status: "En_attente",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ APPROBATION KYC (admin) ============
      case "approve-kyc": {
        const updated = await prisma.kycSubmission.update({
          where: { id: data.id },
          data: { status: "Approuve" } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ APPROBATION KYC COMPLÈTE (admin) → création du profil public ============
      // Marque le KYC comme approuvé, crée/active le profil Freelance ou Entreprise,
      // attribue le badge (Vert pour freelance, Doré pour entreprise) et notifie l'utilisateur.
      case "approve-kyc-full": {
        if (!data.id && !data.email) return NextResponse.json({ error: "id ou email requis" }, { status: 400 });
        // Chercher d'abord par UUID direct (si l'ID est valide)
        let sub = null;
        const rawId = data.id ? String(data.id) : "";
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
        if (isUuid) {
          try {
            sub = await prisma.kycSubmission.findUnique({ where: { id: rawId } });
          } catch { sub = null; }
        }
        // Si introuvable, chercher par email (fallback pour les IDs locaux mockes)
        if (!sub && data.email) {
          sub = await prisma.kycSubmission.findFirst({
            where: { email: String(data.email).toLowerCase() },
            orderBy: { submittedAt: "desc" },
          });
        }
        if (!sub) return NextResponse.json({ error: "Demande KYC introuvable" }, { status: 404 });

        // 1. Marquer la demande comme approuvée
        await prisma.kycSubmission.update({
          where: { id: sub.id },
          data: { status: "Approuve", adminNotes: data.adminNotes || sub.adminNotes || "" } as any,
        });

        // 2. Résoudre l'utilisateur (via applicantId réel sinon par email du candidat)
        let user = null;
        if (sub.applicantId) {
          try {
            user = await prisma.user.findUnique({ where: { id: sub.applicantId } });
          } catch {
            user = null;
          }
        }
        if (!user && sub.email) {
          user = await prisma.user.findFirst({ where: { email: sub.email.toLowerCase() } });
        }

        const userId = user?.id || data.userId || undefined;
        const fullName = (sub.firstName || "") + " " + (sub.lastName || "");
        const displayName = fullName.trim() || sub.applicantName || sub.email.split("@")[0];

        let profileId: string | null = null;
        let badgeLabel = "";

        if (sub.applicantType === "enterprise") {
          // Créer le profil ENTREPRISE
        const existingEnterprise = userId
          ? await prisma.enterpriseProfile.findFirst({ where: { userId } })
          : null;
        const enterprise = existingEnterprise
          ? await prisma.enterpriseProfile.update({
              where: { id: existingEnterprise.id },
              data: {
                companyName: sub.companyName || undefined,
                country: sub.country || undefined,
                verifiedDocuments: true,
                registrationFeePaid: true,
                badge: "gold",
                contactEmail: sub.email,
                contactPhone: sub.phone || undefined,
                isVisible: true,
              },
            })
          : await prisma.enterpriseProfile.create({
              data: {
                userId,
                companyName: sub.companyName || displayName,
                tagline: "",
                description: "",
                logo: "",
                badge: "gold",
                badgeLabel: "Badge Doré (Société Certifiée)",
                sector: "",
                country: sub.country || "",
                verifiedDocuments: true,
                registrationFeePaid: true,
                canReceivePayments: data.canReceivePayments ?? false,
                canSellServices: true,
                contactEmail: sub.email,
                contactPhone: sub.phone || "",
                website: data.website || "",
                isVisible: true,
              },
            });
          profileId = enterprise.id;
          badgeLabel = enterprise.badgeLabel;
        } else {
          // Créer le profil FREELANCE
          const existingFreelance = userId
            ? await prisma.freelanceProfile.findFirst({ where: { userId } })
            : null;
          const freelance = existingFreelance
            ? await prisma.freelanceProfile.update({
                where: { id: existingFreelance.id },
                data: {
                  kycVerified: true,
                  registrationFeePaid: true,
                  badge: "green",
                  location: sub.country || undefined,
                  isVisible: true,
                },
              })
            : await prisma.freelanceProfile.create({
                data: {
                  userId,
                  name: displayName,
                  title: data.title || "",
                  bio: "",
                  avatar: user?.avatar || "",
                  badge: "green",
                  badgeLabel: "Badge Vert Vérifié",
                  category: data.category || "",
                  rating: 5,
                  completedJobs: 0,
                  hourlyRate: data.hourlyRate || 0,
                  skills: data.skills || [],
                  kycVerified: true,
                  registrationFeePaid: true,
                  canReceivePayments: data.canReceivePayments ?? false,
                  canSellServices: true,
                  location: sub.country || "",
                  isVisible: true,
                },
              });
          profileId = freelance.id;
          badgeLabel = freelance.badgeLabel;
        }

        // 3. Notifier l'utilisateur
        if (userId) {
          await notifyUser(userId, {
            title: sub.applicantType === "enterprise" ? "Entreprise certifiée Badge Doré" : "Profil Freelance approuvé",
            message:
              "Félicitations " + displayName + " ! Votre dossier KYC a été approuvé. " +
              "Vous êtes désormais visible dans l'annuaire " +
              (sub.applicantType === "enterprise" ? "Entreprises avec le Badge Doré." : "Freelances avec le Badge Vert.") +
              " Accédez à votre espace membre pour compléter votre profil et vos services.",
            type: "success",
            linkTab: "member",
          });
        }

        return NextResponse.json({
          success: true,
          id: sub.id,
          profileId,
          badgeLabel,
          message: "KYC approuvé et profil " + (sub.applicantType === "enterprise" ? "entreprise" : "freelance") + " activé.",
        });
      }

      // ============ MISE À JOUR PROFIL FREELANCE (par le freelance) ============
      case "update-freelance-profile": {
        if (!data.userId) return NextResponse.json({ error: "userId requis" }, { status: 400 });
        // La table freelance_profiles n'a PAS de contrainte unique sur user_id :
        // on utilise findFirst + update/create (l'upsert Prisma échouerait en base).
        const existingFreelanceProfile = await prisma.freelanceProfile.findFirst({
          where: { userId: data.userId },
        });
        const profile = existingFreelanceProfile
          ? await prisma.freelanceProfile.update({
              where: { id: existingFreelanceProfile.id },
              data: {
                name: data.name ?? undefined,
                title: data.title ?? undefined,
                bio: data.bio ?? undefined,
                avatar: data.avatar ?? undefined,
                category: data.category ?? undefined,
                hourlyRate: data.hourlyRate ?? undefined,
                skills: data.skills ?? undefined,
                location: data.location ?? undefined,
                isVisible: data.isVisible ?? undefined,
              } as any,
            })
          : await prisma.freelanceProfile.create({
              data: {
                userId: data.userId,
                name: data.name || "Freelance",
                title: data.title || "",
                bio: data.bio || "",
                avatar: data.avatar || "",
                category: data.category || "",
                hourlyRate: data.hourlyRate || 0,
                skills: data.skills || [],
                location: data.location || "",
                kycVerified: true,
                canSellServices: true,
                isVisible: true,
              },
            });

        // Services du freelance (remplacement complet si fournis)
        if (Array.isArray(data.services)) {
          await prisma.freelanceService.deleteMany({ where: { freelanceId: profile.id } });
          for (const [si, serv] of data.services.entries()) {
            await prisma.freelanceService.create({
              data: {
                freelanceId: profile.id,
                title: serv.title || "Service " + (si + 1),
                category: serv.category || "",
                description: serv.description || "",
                startingPrice: serv.startingPrice || 0,
                deliveryDays: serv.deliveryDays || 3,
                image: serv.image || "",
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: profile.id });
      }

      // ============ MISE À JOUR PROFIL ENTREPRISE (par l'entreprise) ============
      case "update-enterprise-profile": {
        if (!data.userId) return NextResponse.json({ error: "userId requis" }, { status: 400 });
        // La table enterprise_profiles n'a PAS de contrainte unique sur user_id :
        // on utilise findFirst + update/create (l'upsert Prisma échouerait en base).
        const existingEnterpriseProfile = await prisma.enterpriseProfile.findFirst({
          where: { userId: data.userId },
        });
        const profile = existingEnterpriseProfile
          ? await prisma.enterpriseProfile.update({
              where: { id: existingEnterpriseProfile.id },
              data: {
                companyName: data.companyName ?? undefined,
                tagline: data.tagline ?? undefined,
                description: data.description ?? undefined,
                logo: data.logo ?? undefined,
                sector: data.sector ?? undefined,
                country: data.country ?? undefined,
                contactEmail: data.contactEmail ?? undefined,
                contactPhone: data.contactPhone ?? undefined,
                website: data.website ?? undefined,
                isVisible: data.isVisible ?? undefined,
              } as any,
            })
          : await prisma.enterpriseProfile.create({
              data: {
                userId: data.userId,
                companyName: data.companyName || "Entreprise",
                tagline: data.tagline || "",
                description: data.description || "",
                logo: data.logo || "",
                sector: data.sector || "",
                country: data.country || "",
                verifiedDocuments: true,
                canSellServices: true,
                contactEmail: data.contactEmail || "",
                contactPhone: data.contactPhone || "",
                website: data.website || "",
                isVisible: true,
              },
            });

        // Services de l'entreprise (remplacement complet si fournis)
        if (Array.isArray(data.services)) {
          await prisma.enterpriseService.deleteMany({ where: { enterpriseId: profile.id } });
          for (const [si, serv] of data.services.entries()) {
            await prisma.enterpriseService.create({
              data: {
                enterpriseId: profile.id,
                title: serv.title || "Service " + (si + 1),
                description: serv.description || "",
                startingPrice: serv.startingPrice || 0,
                displayOrder: si,
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: profile.id });
      }

      // ============ MISE À JOUR PROFIL UTILISATEUR (avatar, infos) ============
      case "update-profile": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        const user = await prisma.user.update({
          where: { id: data.id },
          data: {
            avatar: data.avatar ?? undefined,
            name: data.name ?? undefined,
            phone: data.phone ?? undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: user.id });
      }

      // ============ CANDIDATURE VENDEUR ============
      case "submit-vendor-app": {
        const created = await prisma.vendorApplication.create({
          data: {
            userId: data.userId || undefined,
            applicantName: data.applicantName || "",
            email: data.email || "",
            phone: data.phone || "",
            storeName: data.storeName || "",
            storeCategory: data.storeCategory || "",
            storeDescription: data.storeDescription || "",
            experienceBio: data.experienceBio || "",
            status: "En_attente",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ APPROBATION CANDIDATURE ============
      case "approve-vendor-app": {
        const app = await prisma.vendorApplication.findUnique({
          where: { id: data.id },
        });
        if (!app) {
          return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
        }

        await prisma.vendorApplication.update({
          where: { id: data.id },
          data: { status: "Approuve" } as any,
        });

        const baseSlug = app.storeName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const slug = `${baseSlug}-${Date.now().toString(36)}`;

        const store = await prisma.store.create({
          data: {
            vendorId: app.userId || undefined,
            ownerName: app.applicantName,
            ownerEmail: app.email,
            ownerPhone: app.phone,
            name: app.storeName,
            slug,
            description: app.storeDescription,
            categories: [app.storeCategory],
            status: "active",
            isVerified: false,
            salesCount: 0,
            totalRevenueUsd: 0,
            rating: 5,
          } as any,
        });

        const sellerUser = app.userId
          ? await prisma.user.findUnique({ where: { id: app.userId } })
          : await prisma.user.findFirst({ where: { email: app.email } });

        if (sellerUser) {
          await notifyUser(sellerUser.id, {
            title: "Boutique approuvee !",
            message: "Felicitations " + app.applicantName + " ! Votre boutique " + app.storeName + " a ete approuvee.",
            type: "success",
            linkTab: "vendor",
          });
        }

        return NextResponse.json({ success: true, storeId: store.id, notified: !!sellerUser });
      }

      // ============ REJET CANDIDATURE ============
      case "reject-vendor-app": {
        const app = await prisma.vendorApplication.findUnique({
          where: { id: data.id },
        });
        if (!app) {
          return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
        }

        await prisma.vendorApplication.update({
          where: { id: data.id },
          data: { status: "Rejete" } as any,
        });

        const sellerUser = app.userId
          ? await prisma.user.findUnique({ where: { id: app.userId } })
          : await prisma.user.findFirst({ where: { email: app.email } });

        if (sellerUser) {
          await notifyUser(sellerUser.id, {
            title: "Boutique non approuvee",
            message: "Bonjour " + app.applicantName + ", votre demande de boutique " + app.storeName + " n'a pas ete approuvee.",
            type: "warning",
            linkTab: "vendor",
          });
        }

        return NextResponse.json({ success: true, notified: !!sellerUser });
      }

      // ============ SYNCHRONISATION APPRENTISSAGE MEMBRE ============
      // Persiste la progression, les inscriptions aux formations et les
      // attestations obtenues (earnedCertificates) sur le compte utilisateur.
      case "sync-user-learning": {
        const { userId } = data;
        if (!userId) {
          return NextResponse.json({ error: "userId requis" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
        }

        let enrolled = Array.isArray(user.enrolledCourseIds) ? [...user.enrolledCourseIds] : [];
        if (Array.isArray(data.enrolledCourseIds)) {
          data.enrolledCourseIds.forEach((cid: string) => {
            if (cid && !enrolled.includes(cid)) enrolled.push(cid);
          });
        }

        let progress: Record<string, number> = {};
        try {
          const parsed = JSON.parse(String(user.courseProgress || "{}"));
          if (parsed && typeof parsed === "object") progress = { ...parsed };
        } catch {}
        if (data.courseProgress && typeof data.courseProgress === "object") {
          Object.entries(data.courseProgress).forEach(([cid, pct]) => {
            if (cid) progress[cid] = Math.max(0, Math.min(100, Number(pct) || 0));
          });
        }

        let certificates: any[] = [];
        try {
          const parsed = JSON.parse(String(user.earnedCertificates || "[]"));
          if (Array.isArray(parsed)) certificates = [...parsed];
        } catch {}
        if (Array.isArray(data.earnedCertificates)) {
          data.earnedCertificates.forEach((cert: any) => {
            if (cert && cert.id && !certificates.some((c: any) => c.id === cert.id)) {
              certificates.push(cert);
              // Enregistre aussi la ligne officielle en base (pour la vérification publique)
              prisma.certificate
                .create({
                  data: {
                    certificateNumber: cert.id,
                    userId,
                    courseId: cert.courseId || undefined,
                    studentName: cert.studentName || user.name,
                    courseTitle: cert.courseTitle || "",
                    category: cert.category || "",
                    issueDate: cert.issueDate || "",
                    grade: cert.grade || "",
                    qrCodeUrl: cert.qrCodeUrl || "",
                    verified: true,
                  } as any,
                })
                .catch(() => {});
            }
          });
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            enrolledCourseIds: enrolled,
            courseProgress: progress as any,
            earnedCertificates: certificates as any,
          } as any,
        });

        return NextResponse.json({ success: true, enrolledCount: enrolled.length, certificateCount: certificates.length });
      }

      // ============ COMMANDE PAYEE ============
      case "submit-order": {
        const created = await prisma.marketplaceOrder.create({
          data: {
            orderNumber: data.orderNumber || "ORD-" + Date.now(),
            buyerName: data.buyerName || "",
            buyerEmail: data.buyerEmail || "",
            buyerPhone: data.buyerPhone || "",
            buyerUserId: data.buyerUserId || undefined,
            storeId: data.storeId || undefined,
            storeName: data.storeName || "",
            productId: data.productId || undefined,
            productTitle: data.productTitle || "",
            amountUsd: data.amountUsd || 0,
            platformCommissionUsd: data.platformCommissionUsd || 0,
            vendorEarningsUsd: data.vendorEarningsUsd || 0,
            paymentGateway: data.paymentGateway || "Wave API",
            transactionRef: data.transactionRef || "",
            status: "Paye",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ SUPPORT POST-ACHAT ============
      case "submit-support": {
        const created = await prisma.postPurchaseSupport.create({
          data: {
            orderNumber: data.orderNumber || "",
            productTitle: data.productTitle || "",
            lastName: data.lastName || "",
            firstName: data.firstName || "",
            phoneContact: data.phoneContact || "",
            email: data.email || "",
            notes: data.notes || "",
            forwardedEmail: data.forwardedEmail || "",
            status: "Transmis_Enregistre",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ NOTIFICATION LUE ============
      case "mark-notification-read": {
        const updated = await prisma.notification.update({
          where: { id: data.id },
          data: { isRead: true } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ CRÉATION COURS ============
      case "create-course": {
        const category = data.category
          ? await prisma.courseCategory.findUnique({ where: { code: data.category } })
          : null;

        const createdCourse = await prisma.course.create({
          data: {
            title: data.title || "Cours sans titre",
            slug: data.slug || "cours-" + Date.now(),
            categoryId: category?.id,
            categoryLabel: data.categoryLabel || data.category || "",
            description: data.description || "",
            fullDescription: data.fullDescription || "",
            level: data.level || "Tous_niveaux",
            durationHours: data.durationHours || 0,
            lessonsCount: data.lessonsCount || 0,
            price: data.price || 0,
            rating: 5.0,
            reviewsCount: 0,
            studentsCount: 0,
            image: data.image || "",
            badge: data.badge || "",
            instructorName: data.instructorName || "",
            instructorRole: data.instructorRole || "",
            instructorAvatar: data.instructorAvatar || "",
            learningOutcomes: data.learningOutcomes || [],
            isPublished: data.isPublished ?? true,
          } as any,
        });

        if (Array.isArray(data.chapters)) {
          for (const [ci, chapter] of data.chapters.entries()) {
            const createdChapter = await prisma.courseChapter.create({
              data: {
                courseId: createdCourse.id,
                title: chapter.title || "Chapitre " + (ci + 1),
                displayOrder: ci,
              },
            });
            if (Array.isArray(chapter.lessons)) {
              for (const [li, lesson] of chapter.lessons.entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title || "Lecon " + (li + 1),
                    duration: lesson.duration || "15 min",
                    type: lesson.type || "video",
                    displayOrder: li,
                  } as any,
                });
              }
            }
          }
        }

        return NextResponse.json({ success: true, id: createdCourse.id });
      }

      // ============ MISE À JOUR COURS ============
      case "update-course": {
        let resolvedCategoryId = data.categoryId ?? undefined;
        if (!resolvedCategoryId && data.category) {
          const category = await prisma.courseCategory.findUnique({
            where: { code: String(data.category) },
          });
          resolvedCategoryId = category?.id ?? undefined;
        }

        const updated = await prisma.course.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            slug: data.slug ?? undefined,
            categoryId: resolvedCategoryId,
            categoryLabel: data.categoryLabel ?? undefined,
            description: data.description ?? undefined,
            fullDescription: data.fullDescription ?? undefined,
            level: data.level ?? undefined,
            durationHours: data.durationHours ?? undefined,
            lessonsCount: data.lessonsCount ?? undefined,
            price: data.price ?? undefined,
            image: data.image ?? undefined,
            badge: data.badge ?? undefined,
            instructorName: data.instructorName ?? undefined,
            instructorRole: data.instructorRole ?? undefined,
            instructorAvatar: data.instructorAvatar ?? undefined,
            learningOutcomes: data.learningOutcomes ?? undefined,
            rating: data.rating ?? undefined,
            reviewsCount: data.reviewsCount ?? undefined,
            isPublished: data.isPublished ?? undefined,
          } as any,
        });

        if (Array.isArray(data.chapters)) {
          await prisma.courseChapter.deleteMany({ where: { courseId: data.id } });
          for (const [ci, chapter] of data.chapters.entries()) {
            const createdChapter = await prisma.courseChapter.create({
              data: {
                courseId: data.id,
                title: chapter.title || "Chapitre " + (ci + 1),
                displayOrder: ci,
              },
            });
            if (Array.isArray(chapter.lessons)) {
              for (const [li, lesson] of chapter.lessons.entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title || "Lecon " + (li + 1),
                    duration: lesson.duration || "15 min",
                    type: lesson.type || "video",
                    videoUrl: lesson.videoUrl || "",
                    content: lesson.content || "",
                    displayOrder: li,
                  } as any,
                });
              }
            }
          }
        }

        if (Array.isArray(data.quiz)) {
          await prisma.courseQuiz.deleteMany({ where: { courseId: data.id } });
          for (const [qi, quiz] of data.quiz.entries()) {
            const createdQuiz = await prisma.courseQuiz.create({
              data: {
                courseId: data.id,
                question: quiz.question || "",
                explanation: quiz.explanation || "",
                displayOrder: qi,
              },
            });
            if (Array.isArray(quiz.options)) {
              for (const [oi, option] of quiz.options.entries()) {
                await prisma.quizOption.create({
                  data: {
                    quizId: createdQuiz.id,
                    optionText: option,
                    isCorrect: oi === (quiz.correctAnswer ?? 0),
                    displayOrder: oi,
                  },
                });
              }
            }
          }
        }

        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ CRÉATION PRODUIT ============
      case "create-product": {
        const store = data.storeId
          ? await prisma.store.findUnique({ where: { id: data.storeId } })
          : data.storeName
          ? await prisma.store.findFirst({ where: { name: data.storeName } })
          : null;

        const createdProduct = await prisma.product.create({
          data: {
            storeId: store?.id || data.storeId || undefined,
            vendorId: data.vendorId || store?.vendorId || undefined,
            storeName: data.storeName || store?.name || "FORTIA Digital Official Store",
            storeLogo: data.storeLogo || store?.logo || "",
            title: data.title || "Produit sans titre",
            slug: data.slug || "produit-" + Date.now(),
            type: data.type || "ebook",
            typeLabel: data.typeLabel || data.type || "Produit Numérique",
            description: data.description || "",
            fullDescription: data.fullDescription || "",
            price: data.price || 0,
            originalPrice: data.originalPrice,
            fileFormat: data.fileFormat || "PDF",
            fileSize: data.fileSize || "10 MB",
            image: data.image || "",
            bannerImage: data.bannerImage || "",
            features: data.features || [],
            downloadUrl: data.downloadUrl || "#",
            isPublished: data.isPublished ?? true,
            isApproved: data.isApproved ?? true,
            isPopular: data.isPopular ?? false,
            rating: 5.0,
            reviewsCount: 0,
            salesCount: 0,
          } as any,
        });
        return NextResponse.json({ success: true, id: createdProduct.id });
      }

      // ============ ACHAT LIBRE ============
      case "register-free-purchase": {
        const { userId, orderId } = data;
        if (!userId || !orderId) {
          return NextResponse.json({ error: "userId et orderId requis" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const order = await prisma.marketplaceOrder.findUnique({ where: { id: orderId } });
        if (!user || !order) {
          return NextResponse.json({ error: "Utilisateur ou commande introuvable" }, { status: 404 });
        }

        const purchased = Array.isArray(user.purchasedProductIds) ? user.purchasedProductIds : [];
        let paymentHistory = [] as any[];
        try {
          const parsed = JSON.parse(String(user.paymentHistory));
          if (Array.isArray(parsed)) paymentHistory = parsed;
        } catch {}

        const productId = order.productId || "";
        if (productId && !purchased.includes(productId)) {
          purchased.push(productId);
        }

        const now = new Date();
        const paymentEntry = {
          id: "pay-" + now.getTime(),
          date: now.toISOString().split("T")[0],
          amount: Number(order.amountUsd),
          method: order.paymentGateway,
          items: [order.productTitle],
          status: "Validé",
          orderNumber: order.orderNumber,
          transactionRef: order.transactionRef,
        };
        paymentHistory = [paymentEntry, ...paymentHistory];

        await prisma.user.update({
          where: { id: userId },
          data: {
            purchasedProductIds: purchased,
            paymentHistory: paymentHistory as any,
          } as any,
        });

        if (order.storeId) {
          const storeDoc = await prisma.store.findUnique({ where: { id: order.storeId } });
          if (storeDoc) {
            await prisma.store.update({
              where: { id: order.storeId },
              data: {
                salesCount: (storeDoc.salesCount || 0) + 1,
                totalRevenueUsd: Number(storeDoc.totalRevenueUsd || 0) + Number(order.amountUsd || 0),
              } as any,
            });
          }
        }

        if (order.productId) {
          const productDoc = await prisma.product.findUnique({ where: { id: order.productId } });
          if (productDoc) {
            await prisma.product.update({
              where: { id: order.productId },
              data: { salesCount: (productDoc.salesCount || 0) + 1 } as any,
            });
          }
        }

        return NextResponse.json({
          success: true,
          purchasedProductIds: purchased,
          message: "Achat enregistre dans l'espace membre.",
        });
      }

      // ============ MISE À JOUR PRODUIT ============
      case "update-product": {
        const updated = await prisma.product.update({
          where: { id: data.id },
          data: {
            title: data.title ?? undefined,
            description: data.description ?? undefined,
            fullDescription: data.fullDescription ?? undefined,
            price: data.price ?? undefined,
            originalPrice: data.originalPrice ?? undefined,
            fileFormat: data.fileFormat ?? undefined,
            fileSize: data.fileSize ?? undefined,
            image: data.image ?? undefined,
            bannerImage: data.bannerImage ?? undefined,
            features: data.features ?? undefined,
            downloadUrl: data.downloadUrl ?? undefined,
            isPublished: data.isPublished ?? undefined,
            isApproved: data.isApproved ?? undefined,
            isPopular: data.isPopular ?? undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ CRÉATION SERVICE AGENCE (admin) ============
      case "create-service": {
        const created = await prisma.servicePackage.create({
          data: {
            title: data.title || "Service sans titre",
            category: data.category || "",
            description: data.description || "",
            startingPrice: data.startingPrice || 0,
            estimatedDays: data.estimatedDays || "3 a 5 jours",
            iconName: data.iconName || "Briefcase",
            deliverables: data.deliverables || [],
            borderStyle: data.borderStyle || "gold",
            cardAnimation: data.cardAnimation || "fade-up",
            accentColor: data.accentColor || "#D69E25",
            badgeText: data.badgeText || "",
            featured: data.featured ?? false,
            isActive: data.isActive ?? true,
            displayOrder: data.displayOrder ?? 0,
          } as any,
        });

        if (Array.isArray(data.options)) {
          for (const [oi, option] of data.options.entries()) {
            await prisma.serviceOption.create({
              data: {
                serviceId: created.id,
                name: option.name || "Option " + (oi + 1),
                price: option.price || 0,
                displayOrder: oi,
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ MISE À JOUR SERVICE AGENCE ============
      case "update-service": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
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
            borderStyle: data.borderStyle ?? undefined,
            cardAnimation: data.cardAnimation ?? undefined,
            accentColor: data.accentColor ?? undefined,
            badgeText: data.badgeText ?? undefined,
            featured: data.featured ?? undefined,
            isActive: data.isActive ?? undefined,
            displayOrder: data.displayOrder ?? undefined,
          } as any,
        });

        if (Array.isArray(data.options)) {
          await prisma.serviceOption.deleteMany({ where: { serviceId: data.id } });
          for (const [oi, option] of data.options.entries()) {
            await prisma.serviceOption.create({
              data: {
                serviceId: data.id,
                name: option.name || "Option " + (oi + 1),
                price: option.price || 0,
                displayOrder: oi,
              } as any,
            });
          }
        }

        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ SUPPRESSION SERVICE AGENCE ============
      case "delete-service": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        await prisma.servicePackage.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

      // ============ COMMANDE SERVICE AGENCE (client) ============
      case "order-service": {
        const orderNumber = "SVC-" + Date.now().toString(36).toUpperCase();
        const serviceTitle = data.serviceTitle || data.title || "Service";
        const clientEmail = data.clientEmail || "";
        const clientPhone = data.clientPhone || "";

        const rawServiceId = data.serviceId ? String(data.serviceId) : "";
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawServiceId);

        // 1. Créer le devis (demande de service) visible côté admin
        const created = await prisma.serviceQuote.create({
          data: {
            clientName: data.clientName || "",
            clientEmail,
            clientPhone,
            serviceTitle,
            serviceId: isValidUuid ? rawServiceId : undefined,
            details: data.details || "",
            estimatedPrice: data.estimatedPrice || 0,
            deadline: data.deadline || "",
            status: "Recu",
          } as any,
        });

        // 2. Notifier l'administration + le client (si compte existant)
        const notifDetails = data.details ? " Details: " + data.details : "";
        const notifMsg =
          "Nouvelle commande service: " + data.clientName + " a commande " +
          serviceTitle + " (" + orderNumber + ") - montant estime " +
          data.estimatedPrice + "$." + notifDetails;

        await prisma.notification.create({
          data: {
            title: "Nouvelle commande service",
            message: notifMsg,
            type: "info",
            linkTab: "admin",
            isGlobal: true,
            isRead: false,
          } as any,
        });

        // Notifier le client connecté (si son compte existe via email)
        let clientNotified = false;
        if (clientEmail) {
          const clientUser = await prisma.user.findFirst({
            where: { email: clientEmail.toLowerCase() },
          });
          if (clientUser) {
            await notifyUser(clientUser.id, {
              title: "Commande envoyée : " + serviceTitle,
              message: "Votre commande " + orderNumber + " a bien été reçue. Notre équipe vous contactera sous 24h pour valider le cahier des charges. Montant estimé : " + data.estimatedPrice + "$.",
              type: "success",
              linkTab: "member",
            });
            clientNotified = true;
          }
        }

        // 3. Email de confirmation (si Resend configuré)
        let emailSent = false;
        if (resend && clientEmail) {
          try {
            const priceUsd = Number(data.estimatedPrice || 0);
            const priceFcfa = (priceUsd * 600).toLocaleString("fr-FR");
            const emailHtml =
              "<div style='font-family:sans-serif;background:#010c22;color:#fff;padding:40px 16px;'>" +
              "<div style='max-width:560px;margin:0 auto;background:#021231;border:1px solid #1e293b;border-radius:16px;'>" +
              "<div style='background:#011d46;padding:32px 24px;text-align:center;border-bottom:2px solid #D69E25;'>" +
              "<h1 style='margin:0;color:#fff;font-size:26px;'>FORTIA <span style='color:#D69E25;'>HUB</span></h1>" +
              "</div>" +
              "<div style='padding:36px 32px;'>" +
              "<h2 style='margin:0 0 16px;color:#fff;font-size:22px;'>Votre commande a bien été reçue</h2>" +
              "<p style='color:#94a3b8;font-size:14px;'>Bonjour <strong style='color:#fff;'>" + (data.clientName || "") + "</strong>,</p>" +
              "<p style='color:#94a3b8;font-size:14px;'>Nous avons reçu votre commande du service <strong style='color:#D69E25;'>" + serviceTitle + "</strong>.</p>" +
              "<div style='background:#011D46;border:1px solid #334155;border-radius:12px;padding:20px;margin:24px 0;'>" +
              "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>REFERENCE COMMANDE</p>" +
              "<p style='margin:0;color:#D69E25;font-size:18px;font-weight:800;'>" + orderNumber + "</p>" +
              "<div style='height:1px;background:#334155;margin:16px 0;'></div>" +
              "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>Montant estime</p>" +
              "<p style='margin:0;color:#fff;font-size:20px;font-weight:800;'>" + priceUsd + "$ <span style='font-size:12px;color:#94a3b8;'>approx " + priceFcfa + " FCFA</span></p>" +
              "<div style='height:1px;background:#334155;margin:16px 0;'></div>" +
              "<p style='margin:0 0 8px;color:#94a3b8;font-size:12px;'>Delai estime</p>" +
              "<p style='margin:0;color:#fff;font-size:14px;'>" + (data.deadline || "3 a 5 jours") + "</p>" +
              "</div>" +
              "<p style='color:#94a3b8;font-size:13px;'>Notre equipe va vous contacter rapidement par email ou WhatsApp.</p>" +
              "</div>" +
              "<div style='background:#011d46;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;'>" +
              "<p style='margin:0;color:#64748b;font-size:11px;'>FORTIA HUB © 2026 — Tous droits réservés</p>" +
              "</div>" +
              "</div>" +
              "</div>";

            const { data: emailData, error } = await resend.emails.send({
              from: FROM_EMAIL,
              to: [clientEmail],
              subject: "Commande reçue : " + serviceTitle,
              html: emailHtml,
            });
            if (error) {
              console.warn("[RESEND ORDER ERROR]", error);
            } else {
              emailSent = !!emailData?.id;
            }
          } catch (resendError: any) {
            console.warn("[RESEND ORDER EXCEPTION]", resendError);
          }
        }

        return NextResponse.json({
          success: true,
          id: created.id,
          orderNumber,
          emailSent,
          message: "Commande service créée avec succès",
        });
      }

      // ============ DEMANDE DE RETRAIT VENDEUR ============
      case "submit-payout": {
        const created = await prisma.payoutRequest.create({
          data: {
            storeId: data.storeId || undefined,
            storeName: data.storeName || "",
            vendorName: data.vendorName || "",
            amountUsd: data.amountUsd || 0,
            amountFcfa: data.amountFcfa || 0,
            payoutMethod: data.payoutMethod || "",
            accountDetails: data.accountDetails || "",
            status: "En_attente",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ APPROBATION RETRAIT ============
      case "approve-payout": {
        const payout = await prisma.payoutRequest.findUnique({ where: { id: data.id } });
        if (!payout) {
          return NextResponse.json({ error: "Demande de retrait introuvable" }, { status: 404 });
        }

        await prisma.payoutRequest.update({
          where: { id: data.id },
          data: { status: "Paye" } as any,
        });

        if (payout.storeId) {
          const storeDoc = await prisma.store.findUnique({ where: { id: payout.storeId } });
          if (storeDoc) {
            const newBalance = Math.max(
              Number(storeDoc.totalRevenueUsd || 0) - Number(payout.amountUsd || 0),
              0
            );
            await prisma.store.update({
              where: { id: payout.storeId },
              data: { totalRevenueUsd: newBalance } as any,
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: "Retrait approuvé.",
        });
      }

      // ============ CRÉATION CENTRE DE FORMATION ============
      case "create-training-center": {
        const centerName = data.centerName || "Centre de Formation";
        const slug = centerName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
        const created = await prisma.trainingCenter.create({
          data: {
            ownerId: data.ownerId || undefined,
            centerName,
            slug,
            description: data.description || "",
            status: "pending",
            feePaid: false,
            feeAmountUsd: 2,
            storageQuotaGb: 4,
            storageUsedBytes: 0,
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

      // ============ ADMIN : AJOUTER FORMATEUR ============
      case "admin-add-instructor": {
        const email = (data.email || "").trim().toLowerCase();
        if (!email) return NextResponse.json({ error: "Email requis" }, { status: 400 });
        const user = await prisma.user.findUnique({ where: { email } });
        const centerName = data.centerName || (user ? user.name : email.split("@")[0]) + " Academy";
        const slug = centerName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
        const created = await prisma.trainingCenter.create({
          data: {
            ownerId: user?.id || undefined,
            centerName,
            slug,
            description: data.description || "",
            status: "active",
            feePaid: true,
            feeAmountUsd: 2,
            storageQuotaGb: data.storageQuotaGb || 4,
            storageUsedBytes: 0,
          } as any,
        });
        if (user) {
          await notifyUser(user.id, {
            title: "Vous êtes formateur FORTIA HUB !",
            message: "Felicitations " + user.name + " ! L'administration a activé votre centre de formation " + centerName + ".",
            type: "success",
            linkTab: "instructor",
          });
        }
        return NextResponse.json({ success: true, id: created.id, notified: !!user });
      }

      // ============ CONFIG TARIFS ============
      case "update-training-center-config": {
        if (!data.centerId) return NextResponse.json({ error: "centerId requis" }, { status: 400 });
        const updated = await prisma.trainingCenter.update({
          where: { id: data.centerId },
          data: {
            storageQuotaGb: data.storageQuotaGb ?? undefined,
            feeAmountUsd: data.feeAmountUsd ?? undefined,
            status: data.status ?? undefined,
          } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ PAIEMENT FRAIS CENTRE ============
      case "pay-training-center-fee": {
        if (!data.centerId) return NextResponse.json({ error: "centerId requis" }, { status: 400 });
        const updated = await prisma.trainingCenter.update({
          where: { id: data.centerId },
          data: { feePaid: true, status: "active" } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ SUIVI COURS PAR FORMATEUR ============
      case "submit-course-by-instructor": {
        const category = data.category
          ? await prisma.courseCategory.findUnique({ where: { code: data.category } })
          : null;

        const rawLevel = String(data.level || "Tous_niveaux");
        const normalizedLevel = rawLevel
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "");

        const course = await prisma.course.create({
          data: {
            title: data.title || "Cours sans titre",
            slug: data.slug || "cours-" + Date.now(),
            instructorId: data.instructorId || undefined,
            centerId: data.centerId || undefined,
            categoryId: category?.id || undefined,
            categoryLabel: data.categoryLabel || data.category || "",
            description: data.description || "",
            fullDescription: data.fullDescription || "",
            level: normalizedLevel || "Tous_niveaux",
            durationHours: data.durationHours || 0,
            lessonsCount: data.lessonsCount || 0,
            price: data.price || 0,
            image: data.image || "",
            badge: data.badge || "",
            instructorName: data.instructorName || "",
            instructorRole: data.instructorRole || "",
            instructorAvatar: data.instructorAvatar || "",
            learningOutcomes: data.learningOutcomes || [],
            isPublished: data.isPublished ?? false,
          } as any,
        });

        if (Array.isArray(data.chapters)) {
          for (const [ci, chapter] of data.chapters.entries()) {
            const createdChapter = await prisma.courseChapter.create({
              data: {
                courseId: course.id,
                title: chapter.title || "Chapitre " + (ci + 1),
                displayOrder: ci,
              },
            });
            if (Array.isArray(chapter.lessons)) {
              for (const [li, lesson] of chapter.lessons.entries()) {
                await prisma.courseLesson.create({
                  data: {
                    chapterId: createdChapter.id,
                    title: lesson.title || "Lecon " + (li + 1),
                    duration: lesson.duration || "15 min",
                    type: lesson.type || "video",
                    videoUrl: lesson.videoUrl || "",
                    content: lesson.content || "",
                    displayOrder: li,
                  } as any,
                });
              }
            }
          }
        }

        if (Array.isArray(data.quiz)) {
          for (const [qi, quiz] of data.quiz.entries()) {
            const createdQuiz = await prisma.courseQuiz.create({
              data: {
                courseId: course.id,
                question: quiz.question || "",
                explanation: quiz.explanation || "",
                displayOrder: qi,
              },
            });
            if (Array.isArray(quiz.options)) {
              for (const [oi, option] of quiz.options.entries()) {
                await prisma.quizOption.create({
                  data: {
                    quizId: createdQuiz.id,
                    optionText: option,
                    isCorrect: oi === (quiz.correctAnswer ?? 0),
                    displayOrder: oi,
                  },
                });
              }
            }
          }
        }

        return NextResponse.json({ success: true, id: course.id });
      }

      // ============ NOTATION COURS ============
      case "rate-course": {
        const { courseId, userId, rating } = data;
        if (!courseId || !userId || !rating) {
          return NextResponse.json({ error: "courseId, userId et rating requis" }, { status: 400 });
        }

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (!course) {
          return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
        }

        const clampedRating = Math.max(1, Math.min(5, Math.round(Number(rating))));

        const existingReview = await prisma.courseReview.findUnique({
          where: {
            courseId_userId: { courseId, userId },
          },
        });

        if (existingReview) {
          return NextResponse.json(
            {
              success: true,
              alreadyRated: true,
              message: "Vous avez déjà noté cette formation.",
            },
            { status: 200 }
          );
        }

        await prisma.courseReview.create({
          data: {
            courseId,
            userId,
            rating: clampedRating,
          },
        });

        const agg = await prisma.courseReview.aggregate({
          _avg: { rating: true },
          _count: { id: true },
          where: { courseId },
        });

        const newRating = Number((agg._avg.rating || 0).toFixed(1));
        const newCount = agg._count.id;

        await prisma.course.update({
          where: { id: courseId },
          data: {
            rating: newRating,
            reviewsCount: newCount,
          },
        });

        return NextResponse.json({
          success: true,
          alreadyRated: false,
          rating: newRating,
          reviewsCount: newCount,
        });
      }

      // ============ SUSPENSION COURS ============
      case "suspend-course": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        const updated = await prisma.course.update({
          where: { id: data.id },
          data: { isPublished: false } as any,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      // ============ SUPPRESSION COURS ============
      case "delete-course": {
        if (!data.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
        await prisma.course.delete({ where: { id: data.id } });
        return NextResponse.json({ success: true });
      }

      // ============ ACHAT STOCKAGE FORMATEUR ============
      case "register-instructor-purchase": {
        const purchase = await prisma.instructorStoragePurchase.create({
          data: {
            instructorId: data.instructorId || "",
            centerId: data.centerId || undefined,
            amountGb: data.amountGb || 0,
            amountUsd: data.amountUsd || 0,
            status: "Paye",
          } as any,
        });
        if (data.centerId) {
          const center = await prisma.trainingCenter.findUnique({ where: { id: data.centerId } });
          if (center) {
            await prisma.trainingCenter.update({
              where: { id: data.centerId },
              data: { storageQuotaGb: (center.storageQuotaGb || 0) + (data.amountGb || 0) } as any,
            });
          }
        }
        return NextResponse.json({ success: true, id: purchase.id });
      }

      // ============ MISE À JOUR BOUTIQUE VENDEUR (logo, bannière, infos) ============
      case "update-store": {
        if (!data.storeId) return NextResponse.json({ error: "storeId requis" }, { status: 400 });

        const storeData: any = {};
        if (typeof data.name === "string" && data.name) storeData.name = data.name;
        if (typeof data.description === "string") storeData.description = data.description;
        if (typeof data.logo === "string") storeData.logo = data.logo;
        if (typeof data.banner === "string") storeData.banner = data.banner;
        if (Array.isArray(data.categories)) storeData.categories = data.categories;

        const updated = await prisma.store.update({
          where: { id: data.storeId },
          data: storeData,
        });
        return NextResponse.json({ success: true, id: updated.id });
      }

      default:
        return NextResponse.json({ error: "Action inconnue: " + action }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Platform Write] Erreur:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}