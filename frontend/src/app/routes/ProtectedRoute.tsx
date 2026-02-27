import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import type { Role } from '../../core/domain/auth';

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: Role[];
}) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
