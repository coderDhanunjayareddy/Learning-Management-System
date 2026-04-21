import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

// Define the user roles as a union type
type UserRole =
  | 'student'
  | 'teacher'
  | 'client_admin'
  | 'content_authorizer'
  | 'school_owner'
  | 'super_admin';

// Define the User interface matching your DB schema
interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean | null;
  created_at: string | null; // ISO string from PostgreSQL
  last_login_at: string | null;
}

// Define tab options (matches UI)
type UserTab =
  | 'Client Admins'
  | 'School Owners'
  | 'Teachers'
  | 'Students'
  | 'Inactive';

const USER_TABS: UserTab[] = [
  'Client Admins',
  'School Owners',
  'Teachers',
  'Students',
  'Inactive',
];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<UserTab>('Client Admins');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await api.get('/users');
        setUsers(res.data);
      } catch (err) {
        setError((err as Error).message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter users by tab and search query
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTab = true;
    switch (activeTab) {
      case 'Client Admins':
        matchesTab = user.role === 'client_admin';
        break;
      case 'School Owners':
        matchesTab = user.role === 'school_owner';
        break;
      case 'Teachers':
        matchesTab = user.role === 'teacher';
        break;
      case 'Students':
        matchesTab = user.role === 'student';
        break;
      case 'Inactive':
        matchesTab = user.is_active === false;
        break;
      default:
        matchesTab = true;
    }

    return matchesSearch && matchesTab;
  });

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold mb-2">User Management</h2>
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold mb-2">User Management</h2>
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-1">
      {/*<h2 className="text-xl font-semibold mb-4">User Management</h2>*/}
      <p className="text-gray-600 mb-6">
        Showing {filteredUsers.length} of {users.length} users
      </p>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex space-x-6">
          {USER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-4 font-medium ${activeTab === tab
                  ? 'border-b-2 border-black text-black'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Search & filter*/}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex grow">
          <input
            type="text"
            placeholder="Search users by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-.293-.707L5.293 7.293A1 1 0 015 6.586V4z"
              />
            </svg>
            Filter
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                NAME
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                EMAIL
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                LAST LOGIN
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                JOINED ON
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.last_login_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.created_at)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;


