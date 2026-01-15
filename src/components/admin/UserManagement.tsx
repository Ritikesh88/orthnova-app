import React, { useEffect, useMemo, useState } from 'react';
import { addUser, deleteUser, listUsers, updateUser, listDoctors, updateDoctor } from '../../api';
import { UserRow, UserRole, DoctorRow } from '../../types';
import UserEdit from './UserEdit';
import Modal from '../common/Modal';

const roles: UserRole[] = ['admin', 'doctor', 'receptionist', 'store_manager'];

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  
  // State for modal
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserRole, setEditingUserRole] = useState<UserRole>('receptionist');
  const [editingUserDoctor, setEditingUserDoctor] = useState<DoctorRow | undefined>(undefined);
  const [showEditModal, setShowEditModal] = useState(false);

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
  
  // Combine users with standalone doctors (doctors without user accounts)
  const allUsersAndDoctors = useMemo(() => {
    // Start with all users
    let combinedList = [...users];
    
    // Add doctors that don't have user accounts
    doctors.forEach(doctor => {
      // Check if this doctor has a user account
      const hasUserAccount = users.some(user => {
        const userName = user.user_id.toLowerCase();
        const doctorName = doctor.name.toLowerCase();
        return doctorName.includes(userName) || userName.includes(doctorName.split(' ')[0]);
      });
      
      // If this doctor doesn't have a user account, add them as a "standalone doctor"
      if (!hasUserAccount) {
        combinedList.push({
          user_id: doctor.id, // Use doctor ID as user_id
          role: 'doctor', // Default role
          password: '', // Not applicable for standalone doctors
          created_at: doctor.created_at // Use doctor's created_at
        } as UserRow);
      }
    });
    
    return combinedList;
  }, [users, doctors]);

  useEffect(() => { refresh(); }, []);

  const receptionistCount = useMemo(() => allUsersAndDoctors.filter(u => u.role === 'receptionist').length, [allUsersAndDoctors]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsersAndDoctors;

    const query = searchQuery.toLowerCase().trim();
    return allUsersAndDoctors.filter(user => {
      // Find the associated doctor if this user is a doctor
      const doctor = user.role === 'doctor' ? doctors.find(d => {
        const userName = user.user_id.toLowerCase();
        const doctorName = d.name.toLowerCase();
        return doctorName.includes(userName) || userName.includes(doctorName.split(' ')[0]);
      }) : null;

      // Check if user ID, role matches the query
      if (user.user_id.toLowerCase().includes(query) || user.role.toLowerCase().includes(query)) {
        return true;
      }

      // Check if doctor details match the query
      if (doctor) {
        return (
          doctor.name.toLowerCase().includes(query) ||
          (doctor.contact && doctor.contact.toLowerCase().includes(query)) ||
          (doctor.registration_number && doctor.registration_number.toLowerCase().includes(query))
        );
      }

      return false;
    });
  }, [allUsersAndDoctors, doctors, searchQuery]);

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

  const updateDoctorDetails = async (doctorId: string, field: keyof Omit<DoctorRow, 'id' | 'created_at' | 'doctor_id'>, value: any) => {
    setError(null);
    setSuccess(null);
    try {
      await updateDoctor(doctorId, { [field]: value });
      setSuccess(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`);
      await refresh(); // Refresh to update the UI
    } catch (e: any) {
      setError(e.message);
    }
  };

  const updateUserDetails = async (userId: string, field: 'user_id' | 'role', value: any) => {
    setError(null);
    setSuccess(null);
    try {
      if (field === 'user_id' && value === userId) {
        // No change, skip update
        return;
      }
      await updateUser(userId, { [field]: value });
      setSuccess(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`);
      await refresh(); // Refresh to update the UI
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

  // Handler for opening the edit modal
  const handleEditClick = (u: UserRow) => {
    // Find the doctor record if this user is a doctor
    let doctor: DoctorRow | undefined = undefined;
    if (u.role === 'doctor') {
      // First, try to match by name
      doctor = doctors.find(d => {
        const userName = u.user_id.toLowerCase();
        const doctorName = d.name.toLowerCase();
        return doctorName.includes(userName) || userName.includes(doctorName.split(' ')[0]);
      });
      
      // If not found by name, check if this user_id is actually a doctor ID
      if (!doctor) {
        doctor = doctors.find(d => d.id === u.user_id);
      }
    }

    setEditingUserId(u.user_id);
    setEditingUserRole(u.role);
    setEditingUserDoctor(doctor);
    setShowEditModal(true);
  };

  // Handler for closing the edit modal
  const handleEditClose = () => {
    setShowEditModal(false);
    setEditingUserId(null);
    setEditingUserRole('receptionist');
    setEditingUserDoctor(undefined);
  };

  // Handler for when user is updated in the modal
  const handleUserUpdated = () => {
    setSuccess('User updated successfully');
    handleEditClose();
    refresh(); // Refresh the user list
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <h2 className="text-xl font-semibold">Users</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or contact..."
                className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute right-3 top-2.5 text-gray-400">
                🔍
              </span>
            </div>
            <button className="btn btn-secondary whitespace-nowrap" onClick={refresh} disabled={loading}>Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Contact</th>
                <th className="py-2 pr-4">Registration</th>
                <th className="py-2 pr-4">Consultation Fee</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                // Find the doctor record if this user is a doctor
                let doctor: DoctorRow | undefined = undefined;
                if (u.role === 'doctor') {
                  // First, try to match by name
                  doctor = doctors.find(d => {
                    const userName = u.user_id.toLowerCase();
                    const doctorName = d.name.toLowerCase();
                    return doctorName.includes(userName) || userName.includes(doctorName.split(' ')[0]);
                  });
                  
                  // If not found by name, check if this user_id is actually a doctor ID
                  if (!doctor) {
                    doctor = doctors.find(d => d.id === u.user_id);
                  }
                }

                return (
                  <tr key={u.user_id} className="border-t border-gray-100">
                    {/* ID Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">{u.user_id}</span>
                    </td>

                    {/* Name Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">{(doctor && doctor.name) || (u.role === 'doctor' && u.user_id ? (doctors.find(d => d.id === u.user_id)?.name || '-') : '-')}</span>
                    </td>

                    {/* Contact Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">{(doctor && doctor.contact) || (u.role === 'doctor' && u.user_id ? (doctors.find(d => d.id === u.user_id)?.contact || '-') : '-')}</span>
                    </td>

                    {/* Registration Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">{(doctor && doctor.registration_number) || (u.role === 'doctor' && u.user_id ? (doctors.find(d => d.id === u.user_id)?.registration_number || '-') : '-')}</span>
                    </td>

                    {/* Consultation Fee Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">₹{(doctor && doctor.opd_fees) || (u.role === 'doctor' && u.user_id ? (doctors.find(d => d.id === u.user_id)?.opd_fees || '-') : '-')}</span>
                    </td>

                    {/* Role Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium capitalize">{u.role}</span>
                    </td>

                    {/* Actions Column */}
                    <td className="py-2 pr-4 space-x-2">
                      <button 
                        className="btn btn-secondary px-3 py-1 text-xs"
                        onClick={() => handleEditClick(u)}
                      >
                        Edit
                      </button>
                      <button className="btn btn-secondary px-3 py-1 text-xs" onClick={() => onChangePassword(u.user_id)}>Change Password</button>
                      <button className="btn bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-3 py-1 text-xs" onClick={() => onDelete(u.user_id)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={7}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* User Edit Modal */}
      {showEditModal && editingUserId && (
        <Modal open={showEditModal} title="Edit User" onClose={handleEditClose}>
          <UserEdit
            userId={editingUserId}
            role={editingUserRole}
            doctor={editingUserDoctor}
            onUserUpdated={handleUserUpdated}
            onCancel={handleEditClose}
          />
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;