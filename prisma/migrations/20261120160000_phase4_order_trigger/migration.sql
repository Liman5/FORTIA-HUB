-- Phase 4 — correctif : le trigger historique doublait les compteurs de vente
-- avec markOrderPaid (qui gère les commandes multi-articles).
DROP TRIGGER IF EXISTS trg_order_paid_after_update ON public.marketplace_orders;
