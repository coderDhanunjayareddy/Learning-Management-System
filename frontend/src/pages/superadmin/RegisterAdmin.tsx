// src/pages/superadmin/RegisterAdmin.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function RegisterAdmin() {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'client_admin',
    client_id: '',
    user_id: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth(); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/superadmin/register-admin', formData);
      setSuccess('User registered successfully!');
      setFormData({
        email: '',
        full_name: '',
        password: '',
        role: 'client_admin',
        client_id: '',
        user_id: ''
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to register user');
    }
  };

   const handleBackToLogin = async () => {
    await logout(); // Clear auth state
    navigate('/login', { replace: true }); // Go to login, don't allow back navigation
  };

  return (
    <div className="p-6 max-w-md mx-auto">
       <button
        onClick={handleBackToLogin}
        className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center"
      >
        ← Back to Login
      </button>
      
      <h1 className="text-2xl font-bold mb-6">Register New User</h1>
      
      {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            value={formData.full_name}
            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="client_admin">Client Admin</option>
            <option value="content_authorizer">Content Authorizer</option>
            <option value="school_owner">School Owner</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Client ID (optional)</label>
          <input
            type="number"
            value={formData.client_id}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">User ID (optional)</label>
          <input
            type="text"
            value={formData.user_id}
            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full p-2 border rounded"
            required
            minLength={6}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Register User
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
