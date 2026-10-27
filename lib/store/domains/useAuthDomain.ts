"use client";

// ============================================================
// FORTIA HUB — DOMAINE « SESSION, COMPTE, KYC, ADMINISTRATION »
// ------------------------------------------------------------
// Extrait de `lib/store/AppStore.tsx` (Phase 2). Ce module possède :
//   • la session utilisateur (miroir local + vérification serveur)
//   • le profil et les données personnelles renvoyées par /api/me
//   • les dossiers KYC (dépôt et approbation)
//   • les frais d'inscription et l'indicateur administrateur
//   • l'enregistrement de la progression pédagogique du profil
//
// Dépendance injectée (explicite) : le setter de notifications utilisé
// par la connexion.
// ============================================================

import { useCallback, useEffect, useState, useMemo } from "react";
import type {
  AppNotification,
  KycSubmission,
  MarketplaceOrder,
  RegistrationFeeConfig,
  UserProfile,
} from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";

export interface AuthDomainDeps {
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}

export function useAuthDomain({ setNotifications }: AuthDomainDeps) {
  // --- Frais d'inscription & dossiers KYC (données de compte) ---
  const [feeConfig, setFeeConfigState] = useState<RegistrationFeeConfig>({
    freelanceFeeUsd: 0,
    freelanceFeeFcfa: 0,
    enterpriseFeeUsd: 0,
    enterpriseFeeFcfa: 0,
    buyerFeeUsd: 0,
    feeEnabled: false,
  });
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);

  // --- Session utilisateur ---
  // ⚠️ On démarre TOUJOURS avec la valeur « serveur » (déconnecté) puis on
  // restaure la session locale APRÈS le montage. Lire localStorage pendant le
  // rendu provoquait une divergence serveur/client (erreur d'hydratation React).
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({} as UserProfile);

  useEffect(() => {
    try {
      const loggedIn = localStorage.getItem("fortia_user_logged_in") === "true";
      setIsUserLoggedIn(loggedIn);
      if (!loggedIn) return;
      const saved = localStorage.getItem("fortia_user_profile");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.email) {
        setUserProfile(parsed);
      }
    } catch {
      // localStorage indisponible : on reste déconnecté (aucune donnée fictive)
    }
  }, []);

  // Anti-flash : reste true tant que la session serveur n'est pas vérifiée
  const [sessionChecking, setSessionChecking] = useState(true);
  // Données personnelles filtrées par le serveur (/api/me)
  const [myOrders, setMyOrders] = useState<MarketplaceOrder[]>([]);
  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);
  const [myKycSubmissions, setMyKycSubmissions] = useState<KycSubmission[]>([]);

  // --- Synchronisation de session au chargement (JWT HttpOnly) ---
  // Vérifie la session auprès du serveur : si le cookie est expiré, révoqué ou
  // invalide, l'état utilisateur local est nettoyé (utilisateur déconnecté).
  // La redirection vers la connexion pour une page privée est gérée par le proxy.
  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (mounted && data?.user) {
            setIsUserLoggedIn(true);
            setUserProfile((prev) => {
              const merged = { ...prev, ...data.user };
              try {
                localStorage.setItem("fortia_user_logged_in", "true");
                localStorage.setItem("fortia_user_profile", JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
          // Charge les données personnelles FILTRÉES par le serveur (jamais celles d'un autre)
          if (mounted) {
            fetch("/api/me", { cache: "no-store" })
              .then((r) => r.json())
              .then((me) => {
                if (!mounted || !me?.success) return;
                setMyOrders((me.orders || []) as MarketplaceOrder[]);
                // Normalisation : la base renvoie `isRead`, l'interface attend `read`.
                // Sans cela, une notification lue réapparaissait comme non lue.
                setMyNotifications(
                  (me.notifications || []).map((n: Record<string, unknown>) => ({
                    ...n,
                    read: n.read === true || n.isRead === true,
                    date: String(n.date || n.createdAt || ""),
                  })) as AppNotification[]
                );
                setMyKycSubmissions((me.kycSubmissions || []) as KycSubmission[]);
              })
              .catch(() => {});
          }
        } else if (res.status === 401 && mounted) {
          // Session révoquée : nettoyage local (aucune donnée personnelle conservée)
          setIsUserLoggedIn(false);
          setUserProfile({} as UserProfile);
          try {
            localStorage.removeItem("fortia_user_logged_in");
            localStorage.removeItem("fortia_user_profile");
          } catch {}
        }
      } catch {
        // Erreur réseau : on conserve l'état actuel (aucune décision bloquante).
      }
      if (mounted) setSessionChecking(false);
    }

    syncSession();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Administration ---
  // ⚠️ Le drapeau part de `false` : l'interface d'administration ne doit
  // jamais s'ouvrir sans session serveur valide (sinon les écritures — uploads
  // R2, publications — sont refusées par le serveur en 401/403).
  const [isAdmin, setIsAdmin] = useState(false);

  // Vérification de la session ADMINISTRATEUR auprès du serveur.
  // Deux voies acceptées : jeton admin (Bearer) ou compte utilisateur `admin`.
  useEffect(() => {
    let mounted = true;

    async function verifyAdmin() {
      let token = "";
      try {
        token = localStorage.getItem("fortia_admin_token") || "";
      } catch {
        token = "";
      }

      try {
        const res = await fetch("/api/admin/session", {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (mounted) setIsAdmin(!!json?.isAdmin);
          if (json && json.isAdmin === true) return;
        }
      } catch {
        // Erreur réseau : on reste fermé (aucune ouverture optimiste).
      }

      // Jeton présent mais session invalide/expirée → on le retire pour
      // forcer une nouvelle authentification propre.
      if (token) {
        try {
          localStorage.removeItem("fortia_admin_token");
        } catch {}
      }
      if (mounted) setIsAdmin(false);
    }

    verifyAdmin();

    // Ré-évaluation : après une connexion administrateur (autre onglet/formulaire)
    // ou un retour sur l'application, le drapeau est réactualisé sans rechargement.
    const refreshAdmin = () => {
      void verifyAdmin();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void verifyAdmin();
    };
    window.addEventListener("focus", refreshAdmin);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      window.removeEventListener("focus", refreshAdmin);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // --- KYC : dépôt d'un dossier ---
  const submitKyc = useCallback((submission: KycSubmission) => {
    setKycSubmissions((prev) => [submission, ...prev]);
    apiWritePlatform("submit-kyc", {
      applicantType: submission.applicantType || "freelance",
      applicantId: submission.applicantId || undefined,
      applicantName: submission.applicantName || "",
      firstName: submission.firstName || "",
      lastName: submission.lastName || "",
      repRole: submission.repRole || "",
      email: submission.email || "",
      phone: submission.phone || "",
      country: submission.country || "",
      address: submission.address || "",
      documentType: submission.documentType || "CNI",
      documentNumber: submission.documentNumber || "",
      idExpirationDate: submission.idExpirationDate || "",
      idRectoUrl: submission.idRectoUrl || "",
      idVersoUrl: submission.idVersoUrl || "",
      selfieUrl: submission.selfieUrl || "",
      companyName: submission.companyName || "",
      legalForm: submission.legalForm || "",
      rccmNumber: submission.rccmNumber || "",
      companyDocUrl: submission.companyDocUrl || "",
      documentFileUrl: submission.documentFileUrl || "",
    }).then((res) => {
      if (res.success && res.id) {
        // Remplace l'ID temporaire par l'ID réel généré en base
        setKycSubmissions((prev) =>
          prev.map((k) => (k.id === submission.id ? { ...k, id: res.id as string } : k))
        );
      } else {
        console.warn("[AppStore] KYC non persisté en base:", res.error);
      }
    });
  }, []);

  // --- KYC : approbation (profil + badge + notification côté serveur) ---
  const approveKyc = useCallback(
    (id: string) => {
      const sub = kycSubmissions.find((k) => k.id === id);
      setKycSubmissions((prev) =>
        prev.map((k) => (k.id === id ? { ...k, status: "Approuvé" } : k))
      );
      apiWritePlatform("approve-kyc-full", {
        id,
        email: sub?.email || "",
        userId: sub?.applicantId || userProfile?.id || undefined,
        canReceivePayments: false,
      });
    },
    [kycSubmissions, userProfile?.id]
  );

  // --- Apprentissage : progression & attestations du membre ---
  const persistUserLearning = useCallback((updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    try {
      localStorage.setItem("fortia_user_profile", JSON.stringify(updatedProfile));
    } catch (e) {}
    if (updatedProfile.id) {
      apiWritePlatform("sync-user-learning", {
        userId: updatedProfile.id,
        courseProgress: updatedProfile.courseProgress || {},
        enrolledCourseIds: updatedProfile.enrolledCourseIds || [],
        earnedCertificates: updatedProfile.earnedCertificates || [],
      });
    }
  }, []);

  // --- Connexion : jamais de fusion entre deux comptes différents ---
  const loginUser = useCallback(
    (userData: Partial<UserProfile>) => {
      const sameEmail =
        !!userProfile?.email &&
        !!userData?.email &&
        userProfile.email.toLowerCase() === (userData.email || "").toLowerCase();
      const base = sameEmail ? userProfile : ({} as UserProfile);

      const updatedProfile: UserProfile = {
        ...base,
        ...userData,
        enrolledCourseIds: sameEmail
          ? userProfile.enrolledCourseIds || []
          : userData.enrolledCourseIds || [],
        courseProgress: sameEmail
          ? userProfile.courseProgress || {}
          : userData.courseProgress || {},
        purchasedProductIds: sameEmail
          ? userProfile.purchasedProductIds || []
          : userData.purchasedProductIds || [],
        earnedCertificates: sameEmail
          ? userProfile.earnedCertificates || []
          : userData.earnedCertificates || [],
        paymentHistory: sameEmail
          ? userProfile.paymentHistory || []
          : userData.paymentHistory || [],
      };
      setUserProfile(updatedProfile);
      setIsUserLoggedIn(true);
      try {
        localStorage.setItem("fortia_user_logged_in", "true");
        localStorage.setItem("fortia_user_profile", JSON.stringify(updatedProfile));
      } catch (e) {}
      setNotifications((prev) => [
        {
          id: `notif-login-${Date.now()}`,
          title: "Connexion Réussie",
          message: `Bienvenue, ${userData.name || "Utilisateur"} ! Votre session est sécurisée.`,
          date: "À l'instant",
          read: false,
          type: "success",
          linkTab: "member",
        },
        ...prev,
      ]);
    },
    [userProfile, setNotifications]
  );

  // --- Déconnexion : purge complète du compte précédent ---
  const logoutUser = useCallback(() => {
    setIsUserLoggedIn(false);
    setUserProfile({} as UserProfile);
    try {
      // Révoque la session JWT côté serveur (cookie HttpOnly) — best-effort :
      // même si la requête échoue, la session locale est nettoyée.
      fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
      localStorage.removeItem("fortia_user_logged_in");
      localStorage.removeItem("fortia_user_profile");
    } catch (e) {}
  }, []);

  // Objet mémoïsé : son identité ne change que lorsqu'un état du domaine change
  // (les actions sont stables) — d'où des re-rendus strictement ciblés.
  return useMemo(
    () => ({

    isUserLoggedIn,
    setIsUserLoggedIn,
    userProfile,
    setUserProfile,
    sessionChecking,
    setSessionChecking,
    myOrders,
    setMyOrders,
    myNotifications,
    setMyNotifications,
    myKycSubmissions,
    setMyKycSubmissions,
    submitKyc,
    approveKyc,
    loginUser,
    logoutUser,
    kycSubmissions,
    setKycSubmissions,
    feeConfig,
    // Noms historiques conservés : la façade garde `setFeeConfig` (API publique)
    setFeeConfigState,
    setFeeConfig: setFeeConfigState,
    isAdmin,
    setIsAdmin,
    persistUserLearning,    }),
    [
      setNotifications,
      feeConfig,
      kycSubmissions,
      isUserLoggedIn,
      userProfile,
      sessionChecking,
      myOrders,
      myNotifications,
      myKycSubmissions,
      isAdmin,
    ]
  );
}


