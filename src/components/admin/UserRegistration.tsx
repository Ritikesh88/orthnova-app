import React, { useEffect, useState } from 'react';
import { addUser, createDoctor, listUsers, listDoctors, updateDoctor } from '../../api';
import { UserRow, UserRole, DoctorRow } from '../../types';
import { generateDoctorId } from '../../utils/idGenerators';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  userId: string;
  password: string;
  forceChangeOnFirstLogin: boolean;
  active: boolean;
  notes: string;
  specialty?: string;
  licenseNumber?: string;
  consultationFee?: number;
  pharmacyBranch?: string;
  inventoryAccessLevel?: string;
  superAdmin?: boolean;
  allowedToRegisterUsers?: boolean;
}

const UserRegistration: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCreatedUserModal, setShowCreatedUserModal] = useState(false);
  const [createdUserData, setCreatedUserData] = useState<{ userId: string; password: string } | null>(null);

  const [form, setForm] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'receptionist',
    userId: '',
    password: '',
    forceChangeOnFirstLogin: true,
    active: true,
    notes: '',
  });

  // Auto-generate userId and password when firstName or phone changes
  useEffect(() => {
    if (form.firstName) {
      // Generate userId from firstName (lowercase, alphanumeric only)
      const baseUserId = form.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
      setForm(prev => ({ ...prev, userId: baseUserId }));
    }
    
    if (form.firstName && form.phone) {
      // Generate password: firstname@last4digitsofphone
      const last4Digits = form.phone.slice(-4);
      const newPassword = `${form.firstName.toLowerCase()}@${last4Digits}`;
      setForm(prev => ({ ...prev, password: newPassword }));
    }
  }, [form.firstName, form.phone]);

  async function refresh() {
    setLoading(true); 
    setError(null);
    try {
      const [userData, doctorData] = await Promise.all([listUsers(), listDoctors()]);
      setUsers(userData);
      setDoctors(doctorData);
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

  // Check if userId is available
  const checkUserIdAvailability = async (userId: string) => {
    try {
      // Simulate API call - in a real app, this would be an actual API call
      const existingUser = users.find(user => user.user_id === userId);
      return !existingUser;
    } catch (e) {
      return false;
    }
  };

  // Handle userId change with availability checking
  const handleUserIdChange = async (value: string) => {
    // Sanitize userId (3-30 chars, only letters, numbers, underscore)
    const sanitizedValue = value.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30);
    
    setForm(prev => ({ ...prev, userId: sanitizedValue }));
    
    // Check availability if value is valid
    if (sanitizedValue.length >= 3) {
      const isAvailable = await checkUserIdAvailability(sanitizedValue);
      if (!isAvailable) {
        // Suggest alternatives
        let suggestion = `${sanitizedValue}1`;
        let counter = 1;
        while (!(await checkUserIdAvailability(suggestion))) {
          counter++;
          suggestion = `${sanitizedValue}${counter}`;
        }
        setError(`User ID "${sanitizedValue}" is taken. Suggested: ${suggestion}`);
      } else {
        setError(null);
      }
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError(null); 
    setSuccess(null);
    
    // Validation
    if (!form.firstName) {
      setError('First Name is required');
      return;
    }
    
    if (!form.phone) {
      setError('Phone Number is required');
      return;
    }
    
    if (form.role === 'doctor' && !form.licenseNumber) {
      setError('License Number is required for Doctors');
      return;
    }
    
    if (form.userId.length < 3 || form.userId.length > 30) {
      setError('User ID must be between 3 and 30 characters');
      return;
    }
    
    try {
      // Create the user record with the existing API structure
      const userData = await addUser({ 
        user_id: form.userId,
        password: form.password,
        role: form.role
      });
      
      // If the user is a doctor, also create an entry in the doctors table
      if (form.role === 'doctor' && form.licenseNumber) {
        const fullName = `${form.firstName} ${form.lastName}`.trim();
        const doctorId = generateDoctorId(form.licenseNumber, fullName);
        
        await createDoctor({
          id: crypto.randomUUID(),
          doctor_id: doctorId,
          name: fullName,
          contact: form.phone,
          registration_number: form.licenseNumber,
          opd_fees: form.consultationFee || 0
        });
      }
      
      setSuccess('User created successfully');
      setCreatedUserData({ userId: form.userId, password: form.password });
      setShowCreatedUserModal(true);
      
      // Reset form
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'receptionist',
        userId: '',
        password: '',
        forceChangeOnFirstLogin: true,
        active: true,
        notes: '',
      });
      
      await refresh();
    } catch (e: any) { 
      setError(e.message); 
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'receptionist',
      userId: '',
      password: '',
      forceChangeOnFirstLogin: true,
      active: true,
      notes: '',
    });
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Create New User</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Role Selection */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">Role *</label>
            <select
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500"
              value={form.role}
              onChange={e => setForm(f => ({...f, role: e.target.value as UserRole}))}
              required
            >
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="store_manager">Pharmacy Receptionist</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          {/* First Name */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">First Name *</label>
            <input 
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
              value={form.firstName} 
              onChange={e => setForm(f => ({...f, firstName: e.target.value}))} 
              required 
            />
          </div>
          
          {/* Last Name */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">Last Name</label>
            <input 
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
              value={form.lastName} 
              onChange={e => setForm(f => ({...f, lastName: e.target.value}))} 
            />
          </div>
          
          {/* Email */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">Email</label>
            <input 
              type="email"
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
              value={form.email} 
              onChange={e => setForm(f => ({...f, email: e.target.value}))} 
            />
          </div>
          
          {/* Phone Number */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">Phone Number *</label>
            <input 
              type="tel"
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
              value={form.phone} 
              onChange={e => setForm(f => ({...f, phone: e.target.value}))} 
              required 
            />
          </div>
          
          {/* User ID */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">User ID</label>
            <input 
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
              value={form.userId} 
              onChange={e => handleUserIdChange(e.target.value)} 
            />
            <p className="text-xs text-gray-500 mt-1">Auto-generated from first name. 3-30 characters, letters/numbers/underscore only.</p>
          </div>
          
          {/* Password */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">Password</label>
            <div className="flex mt-1">
              <input 
                type={showPassword ? "text" : "password"}
                className="rounded-l-xl border-gray-300 focus:ring-brand-500 flex-grow" 
                value={form.password} 
                readOnly
              />
              <button 
                type="button"
                className="bg-gray-200 hover:bg-gray-300 px-3 rounded-r-xl"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="flex gap-2 mt-1">
              <button 
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800"
                onClick={() => copyToClipboard(form.password)}
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Auto-generated: firstname@last4digitsofphone</p>
          </div>
          
          {/* Force Password Change */}
          <div className="md:col-span-3">
            <div className="flex items-center">
              <input 
                type="checkbox"
                className="rounded border-gray-300 focus:ring-brand-500" 
                checked={form.forceChangeOnFirstLogin} 
                onChange={e => setForm(f => ({...f, forceChangeOnFirstLogin: e.target.checked}))} 
                id="forceChange"
              />
              <label htmlFor="forceChange" className="ml-2 block text-sm">Force password change on first login</label>
            </div>
          </div>
          
          {/* Active Status */}
          <div className="md:col-span-3">
            <div className="flex items-center">
              <input 
                type="checkbox"
                className="rounded border-gray-300 focus:ring-brand-500" 
                checked={form.active} 
                onChange={e => setForm(f => ({...f, active: e.target.checked}))} 
                id="activeStatus"
              />
              <label htmlFor="activeStatus" className="ml-2 block text-sm">Active</label>
            </div>
          </div>
          
          {/* Notes */}
          <div className="md:col-span-6">
            <label className="block text-sm font-medium">Notes</label>
            <textarea 
              className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
              rows={3}
              value={form.notes} 
              onChange={e => setForm(f => ({...f, notes: e.target.value}))} 
            />
          </div>
          
          {/* Role-specific conditional fields */}
          {form.role === 'doctor' && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium">Specialty</label>
                <input 
                  className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
                  value={form.specialty || ''} 
                  onChange={e => setForm(f => ({...f, specialty: e.target.value}))} 
                />
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-sm font-medium">License Number *</label>
                <input 
                  className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
                  value={form.licenseNumber || ''} 
                  onChange={e => setForm(f => ({...f, licenseNumber: e.target.value}))} 
                  required 
                />
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-sm font-medium">Consultation Fee</label>
                <input 
                  type="number"
                  className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
                  value={form.consultationFee || ''} 
                  onChange={e => setForm(f => ({...f, consultationFee: Number(e.target.value)}))} 
                />
              </div>
              
              <div className="md:col-span-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">Access: Clinic App (Appointments, Patients, Billing)</p>
                </div>
              </div>
            </>
          )}
          
          {form.role === 'store_manager' && (
            <>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium">Pharmacy Branch</label>
                <input 
                  className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500" 
                  value={form.pharmacyBranch || ''} 
                  onChange={e => setForm(f => ({...f, pharmacyBranch: e.target.value}))} 
                />
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-sm font-medium">Inventory Access Level</label>
                <select
                  className="mt-1 w-full rounded-xl border-gray-300 focus:ring-brand-500"
                  value={form.inventoryAccessLevel || ''}
                  onChange={e => setForm(f => ({...f, inventoryAccessLevel: e.target.value}))}
                >
                  <option value="">Select Access Level</option>
                  <option value="view_only">View Only</option>
                  <option value="create_orders">Create Orders</option>
                  <option value="manage_stock">Manage Stock</option>
                </select>
              </div>
              
              <div className="md:col-span-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">Access: Pharmacy Module Only</p>
                </div>
              </div>
            </>
          )}
          
          {form.role === 'admin' && (
            <>
              <div className="md:col-span-3">
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    className="rounded border-gray-300 focus:ring-brand-500" 
                    checked={form.superAdmin || false} 
                    onChange={e => setForm(f => ({...f, superAdmin: e.target.checked}))} 
                    id="superAdmin"
                  />
                  <label htmlFor="superAdmin" className="ml-2 block text-sm">Super Admin</label>
                </div>
              </div>
              
              <div className="md:col-span-3">
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    className="rounded border-gray-300 focus:ring-brand-500" 
                    checked={form.allowedToRegisterUsers ?? true} 
                    onChange={e => setForm(f => ({...f, allowedToRegisterUsers: e.target.checked}))} 
                    id="allowedToRegisterUsers"
                  />
                  <label htmlFor="allowedToRegisterUsers" className="ml-2 block text-sm">Allowed to register users</label>
                </div>
              </div>
            </>
          )}
          
          {/* Action Buttons */}
          <div className="md:col-span-6 flex items-end justify-end gap-2 mt-4">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
            >
              Reset Form
            </button>
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              disabled={loading}
            >
              Create User
            </button>
          </div>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}
      </div>

      {/* Registered Users List */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Registered Users</h2>
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>Refresh</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">User ID</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Details</th>
                <th className="py-2 pr-4">Consultation Fee</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                // Find the doctor record if this user is a doctor
                const doctor = user.role === 'doctor' ? doctors.find(d => {
                  const userName = user.user_id.toLowerCase();
                  const doctorName = d.name.toLowerCase();
                  return doctorName.includes(userName) || userName.includes(doctorName.split(' ')[0]);
                }) : null;
                
                return (
                  <tr key={user.user_id} className="border-t border-gray-100">
                    <td className="py-2 pr-4">{user.user_id}</td>
                    <td className="py-2 pr-4 capitalize">{user.role}</td>
                    <td className="py-2 pr-4">
                      {doctor ? (
                        <div className="text-xs">
                          <div>Name: {doctor.name}</div>
                          <div>Contact: {doctor.contact}</div>
                          <div>Registration: {doctor.registration_number}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">No additional details</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {user.role === 'doctor' && doctor ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="number" 
                            className="w-20 text-xs rounded border border-gray-300 px-1 py-0.5" 
                            defaultValue={doctor.opd_fees}
                            min="0"
                          />
                          <button 
                            className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded hover:bg-brand-600"
                            onClick={async (e) => {
                              e.preventDefault();
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              const newFee = Number(input.value);
                              if (!isNaN(newFee) && newFee >= 0 && doctor) {
                                try {
                                  setError(null);
                                  await updateDoctor(doctor.id, { opd_fees: newFee });
                                  setSuccess('Consultation fee updated successfully');
                                  await refresh(); // Refresh to update the UI
                                } catch (err: any) {
                                  setError(err.message);
                                }
                              }
                            }}
                          >
                            Update
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <button 
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete user ${user.user_id}?`)) {
                            try {
                              setError(null);
                              // In a real implementation, you would call a delete API
                              // For now, just show a message
                              alert('Delete functionality would be implemented here');
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td className="py-4 text-gray-500" colSpan={5}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Created User Modal */}
      {showCreatedUserModal && createdUserData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">User Created Successfully</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">User ID</label>
                <div className="flex mt-1">
                  <input 
                    type="text"
                    className="rounded-l-xl border-gray-300 focus:ring-brand-500 flex-grow" 
                    value={createdUserData?.userId || ''} 
                    readOnly
                  />
                  <button 
                    className="bg-gray-200 hover:bg-gray-300 px-3 rounded-r-xl"
                    onClick={() => createdUserData && copyToClipboard(createdUserData.userId)}
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium">Password</label>
                <div className="flex mt-1">
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="rounded-l-xl border-gray-300 focus:ring-brand-500 flex-grow" 
                    value={createdUserData?.password || ''} 
                    readOnly
                  />
                  <button 
                    className="bg-gray-200 hover:bg-gray-300 px-3 rounded-r-xl"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="flex gap-2 mt-1">
                  <button 
                    className="text-xs text-blue-600 hover:text-blue-800"
                    onClick={() => createdUserData && copyToClipboard(createdUserData.password)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowCreatedUserModal(false);
                  setCreatedUserData(null);
                }}
              >
                Close
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowCreatedUserModal(false);
                  setCreatedUserData(null);
                  // Navigate to user management page
                  window.location.hash = '/clinic/admin/users';
                }}
              >
                Go to Manage Users
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRegistration;