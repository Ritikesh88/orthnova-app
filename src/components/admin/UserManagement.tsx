import React, { useEffect, useMemo, useState } from 'react';
import { deleteUser, deleteDoctorRecord, listUsers, updateUser, listDoctors } from '../../api';
import { UserRow, UserRole, DoctorRow } from '../../types';
import UserEdit from './UserEdit';
import Modal from '../common/Modal';



// Helper: find the doctor record for a given user
function findDoctorForUser(user: UserRow, doctors: DoctorRow[]): DoctorRow | undefined {
  if (user.role !== 'doctor') return undefined;
  // 1. Check if user_id is directly a doctor UUID
  const byId = doctors.find(d => d.id === user.user_id);
  if (byId) return byId;
  // 2. Check if user_id matches doctor_id field
  const byDoctorId = doctors.find(d => d.doctor_id === user.user_id);
  if (byDoctorId) return byDoctorId;
  // 3. Fuzzy: check if the user_id (cleaned) appears inside the doctor name or vice versa
  //    but skip very short tokens (<=2 chars) to avoid false positives like "dr"
  const uid = user.user_id.toLowerCase().replace(/[^a-z]/g, '');
  for (const d of doctors) {
    const dname = d.name.toLowerCase().replace(/[^a-z]/g, '');
    // Only match if the overlap is meaningful (>4 chars)
    if (uid.length > 4 && dname.includes(uid)) return d;
    if (dname.length > 4 && uid.includes(dname)) return d;
    // Check each significant word of the doctor name (skip dr, mr, ms, etc.)
    const nameWords = d.name.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !['dr.', 'dr', 'mr.', 'mr', 'ms.', 'ms', 'mrs', 'mrs.', 'mbbs', 'md'].includes(w));
    if (nameWords.length > 0 && nameWords.every(w => uid.includes(w))) return d;
  }
  return undefined;
}

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
    
    // Track which doctors are already linked to a user account
    const linkedDoctorIds = new Set<string>();
    users.forEach(user => {
      const doc = findDoctorForUser(user, doctors);
      if (doc) linkedDoctorIds.add(doc.id);
    });
    
    // Add doctors that don't have user accounts as standalone entries
    doctors.forEach(doctor => {
      if (!linkedDoctorIds.has(doctor.id)) {
        combinedList.push({
          user_id: doctor.id, // Use doctor UUID as user_id
          role: 'doctor' as UserRole,
          password: '',
          created_at: doctor.created_at,
          id: doctor.id,
          _isStandaloneDoctor: true, // marker flag
        } as any);
      }
    });
    
    return combinedList;
  }, [users, doctors]);

  useEffect(() => { refresh(); }, []);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return allUsersAndDoctors;

    const query = searchQuery.toLowerCase().trim();
    return allUsersAndDoctors.filter(user => {
      const doctor = findDoctorForUser(user, doctors);

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
    // Check if this is a standalone doctor (user_id is a UUID from the doctors table)
    const isStandaloneDoctor = doctors.some(d => d.id === user_id) && !users.some(u => u.user_id === user_id);
    
    const confirmMsg = isStandaloneDoctor
      ? 'Delete this doctor record? This will also remove their appointments, prescriptions, and availability.'
      : 'Delete this user?';
    if (!window.confirm(confirmMsg)) return;
    
    setError(null); setSuccess(null);
    try {
      if (isStandaloneDoctor) {
        await deleteDoctorRecord(user_id);
        setSuccess('Doctor record deleted');
      } else {
        await deleteUser(user_id);
        setSuccess('User deleted');
      }
      await refresh();
    } catch (e: any) { setError(e.message); }
  };

  // Handler for opening the edit modal
  const handleEditClick = (u: UserRow) => {
    const doctor = findDoctorForUser(u, doctors);
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
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}
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
                const doctor = findDoctorForUser(u, doctors);
                const isStandalone = (u as any)._isStandaloneDoctor === true;

                return (
                  <tr key={u.user_id} className="border-t border-gray-100">
                    {/* ID Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">{isStandalone ? doctor?.doctor_id || u.user_id.slice(0, 8) + '...' : u.user_id}</span>
                      {isStandalone && <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">No Login</span>}
                    </td>

                    {/* Name Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">{doctor?.name || '-'}</span>
                    </td>

                    {/* Contact Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">{doctor?.contact || '-'}</span>
                    </td>

                    {/* Registration Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">{doctor?.registration_number || '-'}</span>
                    </td>

                    {/* Consultation Fee Column */}
                    <td className="py-2 pr-4">
                      <span className="font-medium">{doctor?.opd_fees != null ? `₹${doctor.opd_fees}` : '₹-'}</span>
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
                      {!isStandalone && (
                        <button className="btn btn-secondary px-3 py-1 text-xs" onClick={() => onChangePassword(u.user_id)}>Change Password</button>
                      )}
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