import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-xl px-3 py-2 transition ${isActive ? 'bg-brand-500 text-white' : 'text-gray-700 hover:bg-gray-50'}`;

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{children}</div>
);

const Icon = {
  home: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>
  ),
  users: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="8" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
  ),
  patient: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>
  ),
  doctor: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/><path d="M8 13h8"/><path d="M12 9v8"/></svg>
  ),
  services: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22"/><path d="M17 5H9a4 4 0 0 0 0 8h8a4 4 0 0 0 0-8z"/></svg>
  ),
  billing: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>
  ),
  prescription: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h8"/><path d="M8 14h5"/></svg>
  ),
  history: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 7 4.6"/><path d="M12 7v5l3 3"/></svg>
  ),
  appointment: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
  ),
  calendar: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
  ),
  inventory: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
  ),
  pill: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 14l7-7a4.95 4.95 0 1 1 7 7l-7 7a4.95 4.95 0 1 1-7-7z"/></svg>
  ),
};

function usePageTitle(): string {
  const { pathname } = useLocation();
  if (pathname === '/' || pathname === '') return 'Dashboard';
  if (pathname.startsWith('/admin/users')) return 'User Management';
  if (pathname.startsWith('/patients/register')) return 'Patient Registration';
  if (pathname.startsWith('/patients')) return 'Patients';
  if (pathname.startsWith('/admin/services')) return 'Manage Service';
  if (pathname.startsWith('/billing/history')) return 'Billing History';
  if (pathname.startsWith('/billing')) return 'Billing';
  if (pathname.startsWith('/admin/inventory')) return 'Inventory';
  if (pathname.startsWith('/physician/dispense')) return 'Physician Dispense';
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
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-white border-r border-gray-100 sticky top-0 h-screen overflow-y-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold">O</div>
          <Link to="/" className="text-lg font-bold tracking-wide text-gray-900">OrthoNova</Link>
        </div>
        <nav className="space-y-1">
          <NavLink to="/" className={navItemClass} end><span>{Icon.home}</span><span>Dashboard</span></NavLink>

          {user?.role === 'admin' && (
            <>
              <SectionTitle>Admin</SectionTitle>
              <NavLink to="/admin/users" className={navItemClass}><span>{Icon.users}</span><span>User Management</span></NavLink>
              <NavLink to="/billing/history" className={navItemClass}><span>{Icon.history}</span><span>Billing History</span></NavLink>
              <NavLink to="/appointments" className={navItemClass} end><span>{Icon.appointment}</span><span>Appointment History</span></NavLink>
              <NavLink to="/admin/services" className={navItemClass}><span>{Icon.services}</span><span>Manage Service</span></NavLink>
              <NavLink to="/prescriptions/list" className={navItemClass}><span>{Icon.history}</span><span>Prescription History</span></NavLink>
              <NavLink to="/admin/inventory" className={navItemClass}><span>{Icon.inventory}</span><span>Inventory</span></NavLink>
            </>
          )}

          {user?.role === 'receptionist' && (
            <>
              <SectionTitle>Patient Registration</SectionTitle>
              <NavLink to="/patients/register" className={navItemClass}><span>{Icon.patient}</span><span>Register Patient</span></NavLink>

              <SectionTitle>Prescription</SectionTitle>
              <NavLink to="/prescriptions" className={navItemClass} end><span>{Icon.prescription}</span><span>Generate Prescription</span></NavLink>
              <NavLink to="/prescriptions/list" className={navItemClass}><span>{Icon.history}</span><span>Prescription History</span></NavLink>

              <SectionTitle>Billing</SectionTitle>
              <NavLink to="/billing" className={navItemClass} end><span>{Icon.billing}</span><span>Billing</span></NavLink>

              <SectionTitle>Appointments</SectionTitle>
              <NavLink to="/appointments/book" className={navItemClass}><span>{Icon.appointment}</span><span>Book Appointment</span></NavLink>
              <NavLink to="/appointments" className={navItemClass} end><span>{Icon.history}</span><span>Appointment History</span></NavLink>
              <NavLink to="/appointments/calendar" className={navItemClass}><span>{Icon.calendar}</span><span>Calendar</span></NavLink>
            </>
          )}

          {user?.role === 'doctor' && (
            <>
              <SectionTitle>Patient Registration</SectionTitle>
              <NavLink to="/patients" className={navItemClass} end><span>{Icon.patient}</span><span>Patients</span></NavLink>

              <SectionTitle>Prescription</SectionTitle>
              <NavLink to="/prescriptions" className={navItemClass} end><span>{Icon.prescription}</span><span>Generate Prescription</span></NavLink>
              <NavLink to="/prescriptions/list" className={navItemClass}><span>{Icon.history}</span><span>Prescription History</span></NavLink>

              <SectionTitle>Appointments</SectionTitle>
              <NavLink to="/appointments" className={navItemClass} end><span>{Icon.history}</span><span>Appointment History</span></NavLink>
              <NavLink to="/appointments/calendar" className={navItemClass}><span>{Icon.calendar}</span><span>Calendar</span></NavLink>
            </>
          )}

          {user?.role === 'physician' && (
            <>
              <SectionTitle>Dispense</SectionTitle>
              <NavLink to="/physician/dispense" className={navItemClass} end><span>{Icon.pill}</span><span>Dispense</span></NavLink>
              <NavLink to="/billing/history" className={navItemClass}><span>{Icon.history}</span><span>Billing History</span></NavLink>
            </>
          )}
        </nav>
      </aside>

      <div className="col-span-12 md:col-span-9 lg:col-span-10">
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
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