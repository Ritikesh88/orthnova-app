import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-2 transition ${isActive ? 'bg-white/15 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`;

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-white/80">{children}</div>
);

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen grid grid-cols-12">
      <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-brand-500 sticky top-0 h-screen overflow-y-auto p-4 text-white">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">O</div>
          <Link to="/" className="text-lg font-bold tracking-wide">OrthoNova</Link>
        </div>
        <nav className="space-y-1">
          <NavLink to="/" className={navItemClass} end>Dashboard</NavLink>

          <SectionTitle>Admin</SectionTitle>
          <NavLink to="/admin/users" className={navItemClass}>User Management</NavLink>
          <NavLink to="/patients/register" className={navItemClass}>Patient Registration</NavLink>
          <NavLink to="/admin/doctors" className={navItemClass}>Doctor Registration</NavLink>
          <NavLink to="/admin/services" className={navItemClass}>Services Catalog</NavLink>
          <NavLink to="/billing" className={navItemClass}>Billing System</NavLink>
          <NavLink to="/prescriptions" className={navItemClass}>Prescription Form</NavLink>
          <NavLink to="/billing/history" className={navItemClass}>Bill History</NavLink>
        </nav>
      </aside>

      <div className="col-span-12 md:col-span-9 lg:col-span-10">
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-brand-100">
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