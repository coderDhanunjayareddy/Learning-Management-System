import type { Role } from "@/features/auth/types";

export interface QuestionPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canDelete: boolean;
  canViewAnswer: boolean;
}

type PermissionUser = { role?: Role | null; permissions?: string[] | null };

export const getQuestionPermissions = (user?: PermissionUser | null): QuestionPermissions => {
  const role = user?.role ?? null;
  if (!role) {
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canApprove: false,
      canReject: false,
      canDelete: false,
      canViewAnswer: false,
    };
  }

  if (role === "super_admin") {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canApprove: true,
      canReject: true,
      canDelete: true,
      canViewAnswer: true,
    };
  }

  const permissionSet = new Set((user?.permissions ?? []).filter(Boolean));
  const has = (permission: string) => permissionSet.has(permission);

  return {
    canView: has("questions.read"),
    canCreate: has("questions.create"),
    canEdit: has("questions.create"),
    canApprove: has("questions.approve"),
    canReject: has("questions.reject"),
    canDelete: has("questions.delete"),
    canViewAnswer: role !== "student",
  };
};
