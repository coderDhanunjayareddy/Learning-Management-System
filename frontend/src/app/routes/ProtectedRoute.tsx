import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import type { Role } from '@/features/auth/types';



function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: Role[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner />;
  }


  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}





