import React, { useEffect, useMemo, useState } from 'react';
import { addUser, deleteUser, listUsers, updateUser, listDoctors, updateDoctor } from '../../api';
import { UserRow, UserRole, DoctorRow } from '../../types';

const roles: UserRole[] = ['admin', 'doctor', 'receptionist', 'store_manager'];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<{ 
    user_id: string; 
    password: string; 
    role: UserRole;
  }>({ 
    user_id: '', 
    password: '', 
    role: 'receptionist'
  });

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [usersData, doctorsData] = await Promise.all([listUsers(), listDoctors()]);
      setUsers(usersData);
      setDoctors(doctorsData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const receptionistCount = useMemo(() => users.filter(u => u.role === 'receptionist').length, [users]);
  
  const updateConsultationFee = async (doctorId: string, newFee: number) => {
    setError(null);
    setSuccess(null);
    try {
      await updateDoctor(doctorId, { opd_fees: newFee });
      setSuccess('Consultation fee updated successfully');
      await refresh(); // Refresh to update the UI
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    try {
      await addUser(form);
      setSuccess('User added successfully');
      setForm({ 
        user_id: '', 
        password: '', 
        role: 'receptionist'
      });
      await refresh();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onChangePassword = async (user_id: string) => {
    const newPassword = prompt('Enter new password');
    if (!newPassword) return;
    setError(null); setSuccess(null);
    try {
      await updateUser(user_id, { password: newPassword });
      setSuccess('Password updated');
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  const onDelete = async (user_id: string) => {
    if (!window.confirm('Delete this user?')) return;
    setError(null); setSuccess(null);
    try {
      await deleteUser(user_id);
      setSuccess('User deleted');
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Add User</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium">User ID</label>
            <input className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.user_id} onChange={e => setForm(f => ({...f, user_id: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input type="password" className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Role</label>
            <select className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value as UserRole}))}>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">Receptionists: {receptionistCount}</p>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" disabled={loading}>Add User</button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Users</h2>
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">User ID</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                // Find the doctor record if this user is a doctor
                const doctor = u.role === 'doctor' ? doctors.find(d => {
                  const userName = u.user_id.toLowerCase();
                  const doctorName = d.name.toLowerCase();
                  return doctorName.includes(userName) || userName.includes(doctorName.split(' ')[0]);
                }) : null;
                
                return (
                  <tr key={u.user_id} className="border-t border-gray-100">
                    <td className="py-2 pr-4">{u.user_id}</td>
                    <td className="py-2 pr-4 capitalize">
                      {u.role}
                      {u.role === 'doctor' && doctor && (
                        <div className="mt-1 text-xs">
                          <span className="text-gray-600">Consultation Fee: </span>
                          <span className="font-medium">₹{doctor.opd_fees}</span>
                          <div className="mt-1 flex items-center gap-1">
                            <input 
                              type="number" 
                              className="w-20 text-xs rounded border border-gray-300 px-1 py-0.5" 
                              defaultValue={doctor.opd_fees}
                              min="0"
                            />
                            <button 
                              className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded hover:bg-brand-600"
                              onClick={(e) => {
                                e.preventDefault();
                                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                const newFee = Number(input.value);
                                if (!isNaN(newFee) && newFee >= 0 && doctor) {
                                  updateConsultationFee(doctor.id, newFee);
                                }
                              }}
                            >
                              Update
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4 space-x-2">
                      <button className="btn btn-secondary px-3 py-1" onClick={() => onChangePassword(u.user_id)}>Change Password</button>
                      <button className="btn bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-3 py-1" onClick={() => onDelete(u.user_id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
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

export default UserManagement;