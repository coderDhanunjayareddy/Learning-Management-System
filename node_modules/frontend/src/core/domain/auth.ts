export type Role =
  | 'super_admin'
  | 'content_authorizer'
  | 'client_admin'
  | 'school_owner'
  | 'teacher'
  | 'student';

export const isAdminRole = (role?: Role | null) =>
  role === 'super_admin' ||
  role === 'client_admin' ||
  role === 'content_authorizer' ||
  role === 'school_owner';
