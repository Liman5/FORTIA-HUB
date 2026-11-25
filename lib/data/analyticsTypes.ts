// ============================================================
// FORTIA HUB — TYPES PARTAGÉS DES TABLEAUX DE BORD
// ------------------------------------------------------------
// Ces structures sont produites par le module serveur d'analytics
// (`lib/modules/analytics/overview.ts`) et consommées par les
// composants d'interface. Elles vivent ici pour respecter la
// frontière « composants ≠ modules serveur ».
// ============================================================

export interface TrendPoint {
  /** Date au format YYYY-MM-DD */
  date: string;
  orders: number;
  revenue: number;
  views: number;
}

export interface TopItem {
  id: string;
  title: string;
  image: string;
  price: number;
  sales: number;
  revenue: number;
  views: number;
  clicks: number;
  carts: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  buyerName: string;
  productTitle: string;
  amount: number;
  earnings: number;
  status: string;
  createdAt: string;
}

export interface SellerOverview {
  role: "vendor" | "instructor";
  currency: "USD";
  kpis: {
    revenue: number;
    earnings: number;
    orders: number;
    items: number;
    views: number;
    clicks: number;
    carts: number;
    students: number;
  };
  /** Entonnoir réel : vues → clics → paniers → ventes. */
  funnel: { views: number; clicks: number; carts: number; orders: number };
  series: TrendPoint[];
  topItems: TopItem[];
  recentOrders: RecentOrder[];
  categories: { label: string; count: number }[];
}

export interface ProductAnalytics {
  product: {
    id: string;
    title: string;
    image: string;
    price: number;
    categoryLabel: string;
    isPublished: boolean;
  };
  totals: { views: number; clicks: number; carts: number; sales: number; revenue: number };
  series: { date: string; views: number; clicks: number; carts: number; sales: number }[];
  recentOrders: RecentOrder[];
}
