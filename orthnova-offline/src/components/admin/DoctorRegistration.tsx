import React, { useEffect, useState } from 'react';
import { addUser, listUsers } from '../../api';
import { UserRow, UserRole } from '../../types';
import { Link } from 'react-router-dom';

const UserRegistration: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<{ 
    user_id: string; 
    password: string; 
    role: UserRole;
  }>({ 
    user_id: '', 
    password: 'password123', // Default password
    role: 'receptionist'
  });

  async function refresh() {
    setLoading(true); 
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (e: any) { 
      setError(e.message); 
    }
    finally { 
      setLoading(false); 
    }
  }
  
  useEffect(() => { 
    refresh(); 
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError(null); 
    setSuccess(null);
    
    if (!form.user_id || !form.password) { 
      setError('User ID and password are required'); 
      return; 
    }
    
    try {
      // Create the user record
      const userData = await addUser({ 
        user_id: form.user_id,
        password: form.password,
        role: form.role
      });
      
      setSuccess(`User registered with ID: ${userData.user_id} and role: ${userData.role}`);
      setForm({ user_id: '', password: 'password123', role: 'receptionist' });
      await refresh();
    } catch (e: any) { 
      setError(e.message); 
    }
  };

  // Get unique roles from users
  const getUniqueRoles = () => {
    const roles = users.map(user => user.role);
    // Convert Set to Array properly
    return Array.from(new Set(roles));
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Register New User</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">User ID</label>
            <input 
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
              value={form.user_id} 
              onChange={e => setForm(f => ({...f, user_id: e.target.value}))} 
              required 
              placeholder="Enter user ID (e.g., john_doe)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Password</label>
            <input 
              type="password"
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
              value={form.password} 
              onChange={e => setForm(f => ({...f, password: e.target.value}))} 
              required 
              placeholder="Enter password"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Role</label>
            <select
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500"
              value={form.role}
              onChange={e => setForm(f => ({...f, role: e.target.value as UserRole}))}
            >
              <option value="receptionist">Receptionist</option>
              <option value="doctor">Doctor</option>
              <option value="store_manager">Pharmacy Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="md:col-span-6 flex items-end justify-end gap-2">
            <button className="btn btn-primary" disabled={loading}>Register User</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800">Role Access Information:</h3>
          <ul className="mt-2 text-sm text-blue-700 list-disc pl-5 space-y-1">
            <li><strong>Receptionist</strong>: Access to clinic application only</li>
            <li><strong>Doctor</strong>: Access to clinic application only</li>
            <li><strong>Pharmacy Manager</strong>: Access to pharmacy application only</li>
            <li><strong>Admin</strong>: Full access to both clinic and pharmacy applications</li>
          </ul>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Registered Users</h2>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={refresh} disabled={loading}>Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">User ID</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Registered At</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4 font-mono">{user.user_id}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'doctor' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'receptionist' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={3}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserRegistration;