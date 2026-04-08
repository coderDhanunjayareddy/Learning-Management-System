import type { Role } from "@/features/auth/types";

export interface CoursePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canManageContent: boolean;
  canEnroll: boolean;
}

type PermissionUser = { role?: Role | string | null; permissions?: string[] | null };

const defaultPermissions: CoursePermissions = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canPublish: false,
  canManageContent: false,
  canEnroll: false,
};

export const getCoursePermissions = (user?: PermissionUser | null): CoursePermissions => {
  const role = user?.role ?? null;
  if (!role) return defaultPermissions;

  if (role === "super_admin") {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canPublish: true,
      canManageContent: true,
      canEnroll: true,
    };
  }

  if (Array.isArray(user?.permissions)) {
    const permissionSet = new Set((user.permissions ?? []).filter(Boolean));
    const has = (permission: string) => permissionSet.has(permission);
    const canView = has("courses.read");
    const canCreate = has("courses.create");
    const canEdit = has("courses.update");
    const canDelete = has("courses.delete");
    const canPublish = has("courses.publish");

    return {
      canView,
      canCreate,
      canEdit,
      canDelete,
      canPublish,
      canManageContent: canEdit,
      canEnroll: canEdit,
    };
  }

  return defaultPermissions;
};
