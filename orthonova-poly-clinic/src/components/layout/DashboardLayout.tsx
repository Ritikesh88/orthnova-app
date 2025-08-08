import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-2 transition ${isActive ? 'bg-brand-600/90 text-white' : 'text-brand-50/90 hover:bg-brand-700/80 hover:text-white'}`;

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen grid grid-cols-12">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-gradient-to-b from-brand-800 to-brand-700 sticky top-0 h-screen overflow-y-auto p-4 text-white">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-lg font-bold tracking-wide">ORTHONOVA</Link>
          <span className="badge">{user?.role}</span>
        </div>
        <nav className="space-y-1">
          <NavLink to="/" className={navItemClass} end>Dashboard</NavLink>
          {(user?.role === 'admin') && (
            <>
              <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/60">Admin</div>
              <NavLink to="/admin/users" className={navItemClass}>Users</NavLink>
              <NavLink to="/admin/doctors" className={navItemClass}>Doctors</NavLink>
              <NavLink to="/admin/services" className={navItemClass}>Services</NavLink>
              <NavLink to="/billing/history" className={navItemClass}>Bill History</NavLink>
            </>
          )}
          {(user?.role === 'receptionist' || user?.role === 'admin') && (
            <>
              <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/60">Reception</div>
              <NavLink to="/patients/register" className={navItemClass}>Register Patient</NavLink>
              <NavLink to="/billing" className={navItemClass}>Generate Bill</NavLink>
              <NavLink to="/prescriptions" className={navItemClass}>Generate Prescription</NavLink>
              <NavLink to="/prescriptions/list" className={navItemClass}>Manage Prescriptions</NavLink>
              <NavLink to="/appointments/book" className={navItemClass}>Book Appointment</NavLink>
              <NavLink to="/appointments" className={navItemClass}>Appointments</NavLink>
              <NavLink to="/billing/history" className={navItemClass}>Bill History</NavLink>
            </>
          )}
          {user?.role === 'doctor' && (
            <>
              <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/60">Doctor</div>
              <NavLink to="/patients" className={navItemClass}>Patients</NavLink>
              <NavLink to="/prescriptions" className={navItemClass}>Generate Prescription</NavLink>
              <NavLink to="/prescriptions/list" className={navItemClass}>Manage Prescriptions</NavLink>
              <NavLink to="/appointments" className={navItemClass}>Appointments</NavLink>
              <NavLink to="/billing/history" className={navItemClass}>Billing History</NavLink>
            </>
          )}
        </nav>
      </aside>

      <div className="col-span-12 md:col-span-9 lg:col-span-10">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b-2 border-brand-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold">Dashboard</h1>
              {user && (
                <p className="text-sm text-gray-500">Signed in as {user.userId} ({user.role})</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </div>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;