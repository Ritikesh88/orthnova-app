import React, { useState, useEffect } from 'react';
import { UserRole, DoctorRow } from '../../types';
import { updateUser, updateDoctor } from '../../api';

interface UserEditProps {
  userId: string;
  role: UserRole;
  doctor?: DoctorRow;
  onUserUpdated?: () => void;
  onCancel?: () => void;
}

const roles: UserRole[] = ['admin', 'doctor', 'receptionist', 'store_manager'];

const UserEdit: React.FC<UserEditProps> = ({ userId, role, doctor, onUserUpdated, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDoctor, setIsDoctor] = useState(false);
  
  const [form, setForm] = useState({
    user_id: '',
    role: 'receptionist' as UserRole,
    name: '',
    contact: '',
    registration_number: '',
    opd_fees: 0
  });

  useEffect(() => {
    if (role === 'doctor' && doctor) {
      setIsDoctor(true);
      setForm({
        user_id: userId,
        role: role,
        name: doctor.name || '',
        contact: doctor.contact || '',
        registration_number: doctor.registration_number || '',
        opd_fees: doctor.opd_fees || 0
      });
    } else {
      // For non-doctor users, we'd need to fetch user details here
      setForm({
        user_id: userId,
        role: role,
        name: '',
        contact: '',
        registration_number: '',
        opd_fees: 0
      });
    }
    setLoading(false);
  }, [userId, role, doctor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (isDoctor && doctor) {
        // Update doctor details
        await updateDoctor(doctor.id, {
          name: form.name,
          contact: form.contact,
          registration_number: form.registration_number,
          opd_fees: Number(form.opd_fees)
        });
        
        // If the doctor also has a user account, update the role
        if (userId !== doctor.id) {
          await updateUser(userId, { role: form.role });
        }
      } else {
        // Update user details
        await updateUser(userId, { role: form.role });
      }
      
      setSuccess('User updated successfully');
      if (onUserUpdated) {
        onUserUpdated();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-4">Loading user details...</div>;

  return (
    <div className="card p-6">
      <h2 className="text-xl font-semibold mb-4">Edit User Details</h2>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-3">
          <label className="block text-sm font-medium">User ID</label>
          <input 
            className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500 bg-gray-100" 
            value={form.user_id} 
            onChange={e => setForm(f => ({...f, user_id: e.target.value}))} 
            readOnly
          />
        </div>
        
        <div className="md:col-span-3">
          <label className="block text-sm font-medium">Role</label>
          <select 
            className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
            value={form.role} 
            onChange={e => setForm(f => ({...f, role: e.target.value as UserRole}))}
          >
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
        
        {isDoctor && (
          <>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium">Name</label>
              <input 
                className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
                value={form.name} 
                onChange={e => setForm(f => ({...f, name: e.target.value}))} 
                required 
              />
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-sm font-medium">Contact</label>
              <input 
                className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
                value={form.contact} 
                onChange={e => setForm(f => ({...f, contact: e.target.value}))} 
                required 
              />
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-sm font-medium">Registration Number</label>
              <input 
                className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
                value={form.registration_number} 
                onChange={e => setForm(f => ({...f, registration_number: e.target.value}))} 
              />
            </div>
            
            <div className="md:col-span-3">
              <label className="block text-sm font-medium">Consultation Fee</label>
              <input 
                type="number"
                min="0"
                className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
                value={form.opd_fees} 
                onChange={e => setForm(f => ({...f, opd_fees: Number(e.target.value)}))}
              />
            </div>
          </>
        )}
        
        <div className="md:col-span-6 flex items-end justify-end gap-2 mt-4">
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="btn btn-primary"
          >
            Update User
          </button>
        </div>
      </form>
      
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
    </div>
  );
};

export default UserEdit;