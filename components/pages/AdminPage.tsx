"use client";

import React from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { AdminDashboard } from "@/components/AdminDashboard";

export function AdminPage() {
  const {
    isAdmin,
    courses,
    marketplaceProducts,
    services,
    serviceQuotes,
    addService,
    updateService,
    deleteService,
    toggleServiceActive,
    feeConfig,
    setFeeConfig,
    kycSubmissions,
    approveKyc,
    addCourse,
    updateCourse,
    deleteCourse,
    addProduct,
    updateProduct,
    deleteProduct,
    siteContent,
    updateSiteContent,
    stores,
    deleteStore,
    vendorApplications,
    marketplaceOrders,
    payoutRequests,
    marketplaceConfig,
    postPurchaseSubmissions,
    deleteSupportSubmission,
    approveStore,
    suspendStore,
    approveVendorApplication,
    rejectVendorApplication,
    approvePayout,
    updateMarketplaceConfig,
    trainingCenters,
    instructorCommissions,
    instructorStoragePurchases,
    adminAddInstructor,
    suspendInstructorCourse,
    deleteInstructorCourse,
  } = useAppStore();

  if (!isAdmin) {
    return (
      <div className="py-20 px-4 bg-[#021231] text-white text-center space-y-4 min-h-[500px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-[#D69E25] text-[#D69E25] flex items-center justify-center mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-black">Espace Administration Sécurisé</h2>
        <p className="text-xs text-slate-400 max-w-md">
          L'accès à cette section est strictement réservé aux administrateurs autorisés
          de FORTIA HUB. Veuillez vous authentifier pour continuer.
        </p>
      </div>
    );
  }

  return (
    <AdminDashboard
      courses={courses}
      digitalProducts={marketplaceProducts as any}
      serviceQuotes={serviceQuotes}
      services={services}
      onAddService={addService}
      onUpdateService={updateService}
      onDeleteService={deleteService}
      onToggleServiceActive={toggleServiceActive}
      feeConfig={feeConfig}
      onUpdateFeeConfig={setFeeConfig}
      kycSubmissions={kycSubmissions}
      onApproveKyc={approveKyc}
      onAddCourse={addCourse}
      onUpdateCourse={updateCourse}
      onAddProduct={addProduct}
      onUpdateProduct={updateProduct}
      onDeleteProduct={deleteProduct}
      siteContent={siteContent}
      onUpdateSiteContent={updateSiteContent}
      stores={stores}
      onDeleteStore={deleteStore}
      vendorApplications={vendorApplications}
      marketplaceOrders={marketplaceOrders}
      payoutRequests={payoutRequests}
      marketplaceConfig={marketplaceConfig}
      postPurchaseSubmissions={postPurchaseSubmissions}
      onDeleteSupportSubmission={deleteSupportSubmission}
      onApproveStore={approveStore}
      onSuspendStore={suspendStore}
      onApproveVendorApplication={approveVendorApplication}
      onRejectVendorApplication={rejectVendorApplication}
      onApprovePayout={approvePayout}
      onUpdateMarketplaceConfig={updateMarketplaceConfig}
      trainingCenters={trainingCenters}
      instructorCommissions={instructorCommissions}
      instructorStoragePurchases={instructorStoragePurchases}
      onAddInstructor={adminAddInstructor}
      onSuspendCourse={suspendInstructorCourse}
      onDeleteCourse={deleteInstructorCourse}
    />
  );
}