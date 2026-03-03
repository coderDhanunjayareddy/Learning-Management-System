import type { Role } from "@/features/auth/types";
import { isAdminRole } from "@/features/auth/types";

export interface QuestionPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canDelete: boolean;
  canViewAnswer: boolean;
}

export const getQuestionPermissions = (role?: Role | null): QuestionPermissions => {
  const isAdmin = isAdminRole(role);
  const isTeacher = role === "teacher";
  const isContentAuthorizer = role === "content_authorizer";
  const isSchoolOwner = role === "school_owner";

  return {
    canView: Boolean(role),
    canCreate: isAdmin || isTeacher || isSchoolOwner || isContentAuthorizer,
    canEdit: isAdmin || isTeacher || isSchoolOwner || isContentAuthorizer,
    canApprove: isAdmin || isSchoolOwner || isContentAuthorizer,
    canReject: isAdmin || isSchoolOwner || isContentAuthorizer,
    canDelete: role === "super_admin" || role === "client_admin",
    canViewAnswer: role !== "student",
  };
};
