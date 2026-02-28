import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import ErrorState from "./ErrorState";

const roleRedirects: Record<string, string> = {
  super_admin: "/superadmin/dashboard",
  client_admin: "/admin/dashboard",
  content_authorizer: "/content-authorizer/dashboard",
  school_owner: "/school-owner/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

export default function Unauthorized() {
  const { user } = useAuth();

  const primaryAction = user
    ? {
        label: "Go to Dashboard",
        to: roleRedirects[user.role] || "/login",
      }
    : { label: "Go to Login", to: "/login" };

  const secondaryAction = user
    ? { label: "Switch Account", to: "/login" }
    : undefined;

  return (
    <ErrorState
      statusCode="403"
      title="Access denied"
      message="You are signed in but do not have permission to view this page. If you think this is a mistake, contact your administrator."
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
    />
  );
}
