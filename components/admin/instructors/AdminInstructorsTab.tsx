"use client";

import React from "react";
import type { Course, TrainingCenter, InstructorCommission, InstructorStoragePurchase } from "@/lib/types";
import { AdminInstructorsPanel } from "@/components/AdminInstructorsPanel";
import { apiWritePlatform } from "@/lib/services/platformWrite";

export function AdminInstructorsTab({
  trainingCenters,
  courses,
  instructorCommissions,
  instructorStoragePurchases,
  setTrainingCenters,
  refreshPlatformData,
  loadAdminData,
  onAddInstructor,
  onSuspendCourse,
  onDeleteCourse,
}: {
  trainingCenters: TrainingCenter[];
  courses: Course[];
  instructorCommissions: InstructorCommission[];
  instructorStoragePurchases: InstructorStoragePurchase[];
  setTrainingCenters: React.Dispatch<React.SetStateAction<TrainingCenter[]>>;
  refreshPlatformData?: () => Promise<void> | void;
  loadAdminData?: () => Promise<void> | void;
  onAddInstructor?: (data: { email: string; centerName: string; description?: string; storageQuotaGb?: number }) => void;
  onSuspendCourse?: (courseId: string) => void;
  onDeleteCourse?: (courseId: string) => void;
}) {
  return (
    <div className="p-6 space-y-6">
      <AdminInstructorsPanel
        trainingCenters={trainingCenters}
        courses={courses}
        commissions={instructorCommissions}
        storagePurchases={instructorStoragePurchases}
        onAddInstructor={onAddInstructor || (() => {})}
        onSuspendCourse={onSuspendCourse || (() => {})}
        onDeleteCourse={onDeleteCourse || (() => {})}
        onToggleBan={async (center, nextStatus) => {
          const res = await apiWritePlatform("ban-training-center", { centerId: center.id });
          if (res.success) {
            setTrainingCenters((prev) => prev.map((c) => (c.id === center.id ? { ...c, status: nextStatus } : c)));
            alert(nextStatus === "banned" ? "Accès du formateur banni : il ne peut plus accéder à son centre." : "Accès du formateur rétabli.");
          } else {
            alert(res.error || "Action impossible.");
          }
        }}
        onUpdateCenter={async (center, updates) => {
          const res = await apiWritePlatform("update-training-center-config", {
            centerId: center.id,
            centerName: updates.centerName,
            description: updates.description,
            storageQuotaGb: updates.storageQuotaGb,
          });
          if (res.success) {
            setTrainingCenters((prev) => prev.map((c) => (c.id === center.id ? { ...c, ...updates } : c)));
            alert("Centre mis à jour.");
          } else {
            alert(res.error || "Enregistrement impossible.");
          }
        }}
        onDeleteCenter={async (center) => {
          const res = await apiWritePlatform("delete-training-center", { centerId: center.id });
          if (res.success) {
            setTrainingCenters((prev) => prev.filter((c) => c.id !== center.id));
            alert(`Le centre « ${center.centerName} » a été supprimé.`);
          } else {
            alert(res.error || "Suppression impossible.");
          }
        }}
        onModerateCourse={async (course, reason) => {
          const res = await apiWritePlatform("moderate-content", { targetType: "course", targetId: course.id, reason });
          if (res.success) {
            alert(`Formation « ${course.title} » suspendue : elle est dépubliée et ses fonds sont gelés.`);
            await refreshPlatformData?.();
            await loadAdminData?.();
          } else {
            alert(res.error || "Suspension impossible.");
          }
        }}
        onRestoreCourse={async (course) => {
          const res = await apiWritePlatform("restore-content", { targetType: "course", targetId: course.id });
          if (res.success) {
            alert(`Formation « ${course.title} » rétablie, fonds dégelés.`);
            await refreshPlatformData?.();
            await loadAdminData?.();
          } else {
            alert(res.error || "Rétablissement impossible.");
          }
        }}
      />
    </div>
  );
}
