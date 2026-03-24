import type { Role } from "@/features/auth/types";

export interface ExamPermissions {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canPublish: boolean;
  canAssign: boolean;
  canDelete: boolean;
}

type PermissionUser = { role?: Role | null; permissions?: string[] | null };

export const getExamPermissions = (user?: PermissionUser | null): ExamPermissions => {
  const role = user?.role ?? null;
  if (!role) {
    return {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canPublish: false,
      canAssign: false,
      canDelete: false,
    };
  }

  if (role === "super_admin") {
    return {
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canPublish: true,
      canAssign: true,
      canDelete: true,
    };
  }

  const permissionSet = new Set((user?.permissions ?? []).filter(Boolean));
  const has = (permission: string) => permissionSet.has(permission);
  const canCreate = has("exams.create");
  const canUpdate = has("exams.update") || canCreate;
  const canPublish = has("exams.publish") || canCreate;
  const canAssign = canUpdate || canCreate;
  const canDelete = has("exams.delete");

  return {
    canRead: has("exams.read"),
    canCreate,
    canUpdate,
    canPublish,
    canAssign,
    canDelete,
  };
};
