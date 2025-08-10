import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-2 transition ${isActive ? 'bg-white/15 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`;

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/80">{children}</div>
);

function usePageTitle(): string {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '') return 'Dashboard';
  if (pathname.startsWith('/admin/users')) return 'User Management';
  if (pathname.startsWith('/patients/register')) return 'Patient Registration';
  if (pathname.startsWith('/patients')) return 'Patients';
  if (pathname.startsWith('/admin/doctors')) return 'Doctor Registration';
  if (pathname.startsWith('/admin/services')) return 'Manage Service';
  if (pathname.startsWith('/billing/history')) return 'Billing History';
  if (pathname.startsWith('/billing')) return 'Billing';
  if (pathname.startsWith('/prescriptions/list')) return 'Prescription History';
  if (pathname.startsWith('/prescriptions')) return 'Generate Prescription';
  if (pathname.startsWith('/appointments/book')) return 'Book Appointment';
  if (pathname.startsWith('/appointments/calendar')) return 'Calendar';
  if (pathname.startsWith('/appointments')) return 'Appointment History';
  return 'OrthoNova';
}

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const title = usePageTitle();

  return (
    <div className="min-h-screen grid grid-cols-12">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-brand-500 sticky top-0 h-screen overflow-y-auto p-4 text-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">O</div>
          <Link to="/" className="text-lg font-bold tracking-wide">OrthoNova</Link>
        </div>
        <nav className="space-y-1">
          <NavLink to="/" className={navItemClass} end>Dashboard</NavLink>

          {user?.role === 'admin' && (
            <>
              <SectionTitle>Admin</SectionTitle>
              <NavLink to="/admin/users" className={navItemClass}>User Management</NavLink>
              <NavLink to="/billing/history" className={navItemClass}>Billing History</NavLink>
              <NavLink to="/appointments" className={navItemClass}>Appointment History</NavLink>
              <NavLink to="/admin/services" className={navItemClass}>Manage Service</NavLink>
              <NavLink to="/prescriptions/list" className={navItemClass}>Prescription History</NavLink>
            </>
          )}

          {user?.role === 'receptionist' && (
            <>
              <SectionTitle>Patient Registration</SectionTitle>
              <NavLink to="/patients/register" className={navItemClass}>Register Patient</NavLink>

              <SectionTitle>Prescription</SectionTitle>
              <NavLink to="/prescriptions" className={navItemClass}>Generate Prescription</NavLink>
              <NavLink to="/prescriptions/list" className={navItemClass}>Prescription History</NavLink>

              <SectionTitle>Generate Bill</SectionTitle>
              <NavLink to="/billing" className={navItemClass}>Billing</NavLink>

              <SectionTitle>Appointments</SectionTitle>
              <NavLink to="/appointments/book" className={navItemClass}>Book Appointment</NavLink>
              <NavLink to="/appointments" className={navItemClass}>Appointment History</NavLink>
              <NavLink to="/appointments/calendar" className={navItemClass}>Calendar</NavLink>
            </>
          )}

          {user?.role === 'doctor' && (
            <>
              <SectionTitle>Patient Registration</SectionTitle>
              <NavLink to="/patients" className={navItemClass}>Patients</NavLink>

              <SectionTitle>Prescription</SectionTitle>
              <NavLink to="/prescriptions" className={navItemClass}>Generate Prescription</NavLink>
              <NavLink to="/prescriptions/list" className={navItemClass}>Prescription History</NavLink>

              <SectionTitle>Appointments</SectionTitle>
              <NavLink to="/appointments" className={navItemClass}>Appointment History</NavLink>
              <NavLink to="/appointments/calendar" className={navItemClass}>Calendar</NavLink>
            </>
          )}
        </nav>
      </aside>

      <div className="col-span-12 md:col-span-9 lg:col-span-10">
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-brand-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
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