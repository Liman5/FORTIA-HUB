"use client";

// ============================================================
// FORTIA HUB — DOMAINE « BOUTIQUE, SERVICES & SOCIAL »
// ------------------------------------------------------------
// Extrait de `lib/store/AppStore.tsx` (Phase 2) : produits, boutiques,
// commandes, retraits, candidatures vendeurs, support post-achat,
// services de l'agence, freelances, entreprises, blog et contenu du site.
//
// Dépendance injectée : le profil connecté (`userProfile`), seul élément
// partagé avec le domaine Session.
// ============================================================

import { useCallback, useState, useMemo } from "react";
import type {
  BlogPost,
  DigitalProduct,
  EnterpriseProfile,
  FreelanceProfile,
  MarketplaceConfig,
  MarketplaceOrder,
  MarketplaceProduct,
  PayoutRequest,
  PostPurchaseSupportSubmission,
  ServicePackage,
  ServiceQuoteRequest,
  SiteContent,
  UserProfile,
  VendorApplication,
  VendorStore,
} from "@/lib/types";
import { apiWritePlatform } from "@/lib/services/platformWrite";
import { clearCache } from "@/lib/services/api/http";

export interface MarketplaceDomainDeps {
  userProfile: UserProfile;
  /** Recharge les données publiques après une écriture (cache invalidé). */
  onSaved?: () => void;
}

export function useMarketplaceDomain({ userProfile, onSaved }: MarketplaceDomainDeps) {

  const [siteContent, setSiteContent] = useState<SiteContent>({} as SiteContent);

  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);

  const [services, setServices] = useState<ServicePackage[]>([]);
  const [serviceQuotes, setServiceQuotes] = useState<ServiceQuoteRequest[]>([]);

  const [stores, setStores] = useState<VendorStore[]>([]);
  const [activeVendorStore, setActiveVendorStore] = useState<VendorStore>({} as VendorStore);
  const [selectedStore, setSelectedStore] = useState<VendorStore | null>(null);
  const [vendorApplications, setVendorApplications] = useState<VendorApplication[]>([]);
  const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrder[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [marketplaceConfig, setMarketplaceConfig] = useState<MarketplaceConfig>({} as MarketplaceConfig);
  const [postPurchaseSubmissions, setPostPurchaseSubmissions] = useState<PostPurchaseSupportSubmission[]>([]);

  const [freelances, setFreelances] = useState<FreelanceProfile[]>([]);
  const [enterprises, setEnterprises] = useState<EnterpriseProfile[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);

  /**
   * Après une écriture : le cache client des domaines « services » et
   * « marketplace » est invalidé puis rechargé — sinon la page publique
   * (Services, Boutique) continuait d'afficher l'ancienne version pendant
   * 5 minutes (image de carte absente, prix obsolète…).
   */
  const refreshPublicData = useCallback(() => {
    clearCache(["services", "marketplace"]);
    onSaved?.();
  }, [onSaved]);

  const updateSiteContent = useCallback(
    (content: SiteContent) => setSiteContent(content),
    [setSiteContent]
  );

  const addProduct = useCallback(
    (newProduct: DigitalProduct | MarketplaceProduct) => {
      const realStore =
        userProfile?.email
          ? stores.find((s) => s.ownerEmail === userProfile.email) ||
            stores.find((s) => s.ownerEmail?.toLowerCase() === userProfile.email?.toLowerCase())
          : undefined;
      const vendorStore = realStore || activeVendorStore;

      const mProduct: MarketplaceProduct = {
        id: newProduct.id || `prod-${Date.now()}`,
        storeId: vendorStore.id,
        storeName: vendorStore.name,
        storeLogo: vendorStore.logo,
        vendorId: vendorStore.vendorId,
        title: newProduct.title,
        slug: newProduct.title.toLowerCase().replace(/\s+/g, "-"),
        type: newProduct.type as any,
        typeLabel: newProduct.typeLabel || "Produit Numérique",
        description: newProduct.description,
        price: newProduct.price,
        originalPrice: newProduct.originalPrice || newProduct.price * 1.5,
        fileFormat: newProduct.fileFormat || "PDF",
        fileSize: newProduct.fileSize || "10 MB",
        image: newProduct.image,
        features: newProduct.features || [],
        downloadUrl: newProduct.downloadUrl || "#",
        isPublished: true,
        isApproved: true,
        isPopular: !!newProduct.isPopular,
        rating: 5.0,
        reviewsCount: 1,
        salesCount: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setMarketplaceProducts((prev) => [mProduct, ...prev]);
      apiWritePlatform("create-product", {
        storeId: mProduct.storeId,
        storeName: mProduct.storeName,
        storeLogo: mProduct.storeLogo,
        vendorId: mProduct.vendorId,
        title: mProduct.title,
        slug: mProduct.slug,
        type: mProduct.type as string,
        typeLabel: mProduct.typeLabel || "Produit Numérique",
        description: mProduct.description || "",
        price: mProduct.price,
        fileFormat: mProduct.fileFormat || "PDF",
        fileSize: mProduct.fileSize || "10 MB",
        image: mProduct.image || "",
        bannerImage: mProduct.bannerImage || "",
        features: mProduct.features || [],
        downloadUrl: mProduct.downloadUrl || "#",
        isPublished: mProduct.isPublished ?? true,
        isApproved: mProduct.isApproved ?? true,
        isPopular: mProduct.isPopular ?? false,
      });
    },
    [activeVendorStore, userProfile, stores]
  );

  const updateProduct = useCallback(
    (product: DigitalProduct | MarketplaceProduct) => {
      setMarketplaceProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...product } : p))
      );
      apiWritePlatform("update-product", {
        id: product.id,
        title: product.title,
        description: product.description || "",
        price: product.price,
        fileFormat: product.fileFormat || "PDF",
        image: (product as any).image || "",
        isPublished: (product as any).isPublished ?? true,
        isApproved: (product as any).isApproved ?? true,
        isPopular: (product as any).isPopular ?? false,
      });
    },
    []
  );
  const deleteProduct = useCallback(
    (id: string) => setMarketplaceProducts((prev) => prev.filter((p) => p.id !== id)),
    []
  );

  const submitQuote = useCallback((quote: ServiceQuoteRequest) => {
    setServiceQuotes((prev) => [quote, ...prev]);
    apiWritePlatform("submit-quote", {
      clientName: quote.clientName || "",
      clientEmail: quote.clientEmail || "",
      phone: quote.clientPhone || "",
      serviceTitle: quote.serviceTitle || "",
      serviceCategory: quote.serviceId || "",
      details: quote.details || "",
      estimatedPrice: quote.estimatedPrice || 0,
    });
  }, []);

  const addService = useCallback((service: ServicePackage) => {
    const tempId = service.id || `serv-${Date.now()}`;
    setServices((prev) => [{ ...service, id: tempId }, ...prev]);
    apiWritePlatform("create-service", {
      title: service.title || "",
      category: service.category || "",
      description: service.description || "",
      startingPrice: service.startingPrice || 0,
      estimatedDays: service.estimatedDays || "",
      iconName: service.iconName || "Briefcase",
      deliverables: service.deliverables || [],
      image: service.image || "",
      imagePosition: service.imagePosition || "50% 50%",
      options: service.options || [],
      borderStyle: service.borderStyle || "gold",
      cardAnimation: service.cardAnimation || "fade-up",
      accentColor: service.accentColor || "#D69E25",
      badgeText: service.badgeText || "",
      featured: service.featured ?? false,
      isActive: service.isActive ?? true,
      displayOrder: service.displayOrder ?? 0,
    }).then((res) => {
      if (res.success && res.id) {
        // Remplace l'ID temporaire par l'ID réel généré en base
        setServices((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, id: res.id as string } : s))
        );
      } else {
        console.warn("[AppStore] Service créé localement mais non persisté:", res.error);
      }
      if (res.success) refreshPublicData();
    });
    alert("Service cree et publie avec succes !");
  }, [refreshPublicData]);

  const updateService = useCallback((service: ServicePackage) => {
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, ...service } : s))
    );
    apiWritePlatform("update-service", {
      id: service.id,
      title: service.title || "",
      category: service.category || "",
      description: service.description || "",
      startingPrice: service.startingPrice || 0,
      estimatedDays: service.estimatedDays || "",
      iconName: service.iconName || "Briefcase",
      deliverables: service.deliverables || [],
      image: service.image || "",
      imagePosition: service.imagePosition || "50% 50%",
      options: service.options || [],
      borderStyle: service.borderStyle || "gold",
      cardAnimation: service.cardAnimation || "fade-up",
      accentColor: service.accentColor || "#D69E25",
      badgeText: service.badgeText || "",
      featured: service.featured ?? false,
      isActive: service.isActive ?? true,
      displayOrder: service.displayOrder ?? 0,
    }).then((res) => {
      if (res.success) refreshPublicData();
    });
    alert("Service modifie et synchronise avec succes !");
  }, [refreshPublicData]);

  const deleteService = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    apiWritePlatform("delete-service", { id }).then((res) => {
      if (res.success) refreshPublicData();
    });
    alert("Service supprime avec succes !");
  }, [refreshPublicData]);

  const toggleServiceActive = useCallback((id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !(s.isActive ?? true) } : s))
    );
  }, []);

  const openStore = useCallback((store: VendorStore) => setSelectedStore(store), []);
  const closeStore = useCallback(() => setSelectedStore(null), []);

  const updateStore = useCallback(
    (store: VendorStore) => {
      setStores((prev) => prev.map((s) => (s.id === store.id ? store : s)));
      setActiveVendorStore(store);
      // Persiste en base Supabase (logo, bannière, nom, description)
      apiWritePlatform("update-store", {
        storeId: store.id,
        name: store.name,
        description: store.description,
        logo: store.logo,
        banner: store.banner,
        categories: store.categories,
      });
    },
    []
  );
  const deleteStore = useCallback(
    (id: string) => setStores((prev) => prev.filter((s) => s.id !== id)),
    []
  );
  const approveStore = useCallback(
    (id: string) => setStores((prev) => prev.map((s) => (s.id === id ? { ...s, status: "active" } : s))),
    []
  );
  const suspendStore = useCallback(
    (id: string) => setStores((prev) => prev.map((s) => (s.id === id ? { ...s, status: "suspended" } : s))),
    []
  );

  const submitVendorApplication = useCallback((app: VendorApplication) => {
    setVendorApplications((prev) => [app, ...prev]);
    apiWritePlatform("submit-vendor-app", {
      userId: app.userId,
      applicantName: app.applicantName || "",
      email: app.email || "",
      phone: app.phone || "",
      storeName: app.storeName || "",
      storeCategory: app.storeCategory || "",
      storeDescription: app.storeDescription || "",
      experienceBio: app.experienceBio || "",
    });
  }, []);

  const approveVendorApplication = useCallback((id: string) => {
    setVendorApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Approuvé" } : a))
    );
    const app = vendorApplications.find((a) => a.id === id);
    if (!app) return;
    const newStore: VendorStore = {
      id: `store-${Date.now()}`,
      vendorId: app.userId || `user-${Date.now()}`,
      name: app.storeName,
      slug: app.storeName.toLowerCase().replace(/\s+/g, "-"),
      ownerName: app.applicantName,
      ownerEmail: app.email,
      ownerPhone: app.phone,
      description: app.storeDescription,
      logo: "",
      banner: "",
      categories: [app.storeCategory],
      rating: 5.0,
      salesCount: 0,
      totalRevenueUsd: 0,
      status: "active",
      isVerified: true,
      createdAt: new Date().toISOString().split("T")[0],
      payoutInfo: {
        method: "mobile_money",
        accountName: app.applicantName,
        accountNumber: app.phone,
        providerName: "Wave Senegal",
      },
    };
    setStores((prev) => [...prev, newStore]);
    apiWritePlatform("approve-vendor-app", { id });
  }, [vendorApplications]);

  const rejectVendorApplication = useCallback((id: string) => {
    setVendorApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Rejeté" } : a))
    );
    apiWritePlatform("reject-vendor-app", { id });
  }, []);

  const requestPayout = useCallback((payout: PayoutRequest) => {
    setPayoutRequests((prev) => [payout, ...prev]);
    apiWritePlatform("submit-payout", {
      storeId: payout.storeId,
      storeName: payout.storeName,
      vendorName: payout.vendorName,
      amountUsd: payout.amountUsd,
      amountFcfa: payout.amountFcfa,
      payoutMethod: payout.payoutMethod,
      accountDetails: payout.accountDetails,
    });
  }, []);

  const approvePayout = useCallback((id: string) => {
    const payout = payoutRequests.find((p) => p.id === id);
    setPayoutRequests((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "Payé" } : p))
    );
    if (payout?.storeId) {
      const amount = payout.amountUsd || 0;
      setStores((prev) =>
        prev.map((s) =>
          s.id === payout.storeId
            ? { ...s, totalRevenueUsd: Math.max((s.totalRevenueUsd || 0) - amount, 0) }
            : s
        )
      );
      setActiveVendorStore((prev) =>
        prev.id === payout.storeId
          ? { ...prev, totalRevenueUsd: Math.max((prev.totalRevenueUsd || 0) - amount, 0) }
          : prev
      );
    }
    apiWritePlatform("approve-payout", { id });
  }, [payoutRequests]);

  const addSupportSubmission = useCallback((submission: PostPurchaseSupportSubmission) => {
    setPostPurchaseSubmissions((prev) => [submission, ...prev]);
    apiWritePlatform("submit-support", {
      orderNumber: submission.orderNumber || "",
      productTitle: submission.productTitle || "",
      lastName: submission.lastName || "",
      firstName: submission.firstName || "",
      phoneContact: submission.phoneContact || "",
      email: submission.email || "",
      notes: submission.notes || "",
      forwardedEmail: submission.forwardedEmail || "",
    });
  }, []);

  const deleteSupportSubmission = useCallback((id: string) => {
    setPostPurchaseSubmissions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Objet mémoïsé : son identité ne change que lorsqu'un état du domaine change
  // (les actions sont stables) — d'où des re-rendus strictement ciblés.
  return useMemo(
    () => ({
    marketplaceProducts,
    setMarketplaceProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    services,
    setServices,
    addService,
    updateService,
    deleteService,
    toggleServiceActive,
    serviceQuotes,
    setServiceQuotes,
    submitQuote,
    stores,
    setStores,
    activeVendorStore,
    setActiveVendorStore,
    updateStore,
    deleteStore,
    approveStore,
    suspendStore,
    selectedStore,
    setSelectedStore,
    openStore,
    closeStore,
    vendorApplications,
    setVendorApplications,
    submitVendorApplication,
    approveVendorApplication,
    rejectVendorApplication,
    marketplaceOrders,
    setMarketplaceOrders,
    payoutRequests,
    setPayoutRequests,
    requestPayout,
    approvePayout,
    marketplaceConfig,
    setMarketplaceConfig,
    postPurchaseSubmissions,
    setPostPurchaseSubmissions,
    addSupportSubmission,
    deleteSupportSubmission,
    freelances,
    setFreelances,
    enterprises,
    setEnterprises,
    blogPosts,
    setBlogPosts,
    siteContent,
    setSiteContent,
    updateSiteContent,    }),
    [
      userProfile,
      siteContent,
      marketplaceProducts,
      services,
      serviceQuotes,
      stores,
      activeVendorStore,
      selectedStore,
      vendorApplications,
      marketplaceOrders,
      payoutRequests,
      marketplaceConfig,
      postPurchaseSubmissions,
      freelances,
      enterprises,
      blogPosts,
    ]
  );
}
