import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './components/admin/UserManagement';
import DoctorRegistration from './components/admin/DoctorRegistration';
import DoctorAvailability from './components/admin/DoctorAvailability';
import ServicesCatalog from './components/admin/ServicesCatalog';
import PatientRegistration from './components/patients/PatientRegistration';
import BillingSystem from './components/billing/BillingSystem';
import BillHistory from './components/billing/BillHistory';
import PrescriptionForm from './components/prescriptions/PrescriptionForm';
import PrescriptionsList from './components/prescriptions/PrescriptionsList';
import PatientsList from './components/patients/PatientsList';
import PrintBill from './print/PrintBill';
import PrintPrescription from './print/PrintPrescription';
import AppointmentBooking from './components/appointments/AppointmentBooking';
import AppointmentsList from './components/appointments/AppointmentsList';
import AppointmentsCalendar from './components/appointments/AppointmentsCalendar';
import InventoryManager from './components/admin/InventoryManager';
import StockPurchase from './components/admin/StockPurchase';
import PharmacyBilling from './components/billing/PharmacyBilling';
import Reports from './components/admin/Reports';
import AdminDashboard from './components/admin/AdminDashboard';
import ReceptionistDashboard from './components/receptionist/ReceptionistDashboard';

import DashboardHome from './components/dashboard/AdminDashboard';
const DashboardHomeComponent: React.FC = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  } else if (user?.role === 'receptionist') {
    return <ReceptionistDashboard />;
  } else if (user?.role === 'doctor') {
    return <DashboardHome />;
  }
  
  return <DashboardHome />;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginForm />} />
      <Route path="/print/bill/:id" element={<PrintBill />} />
      <Route path="/print/prescription/:id" element={<PrintPrescription />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHomeComponent />} />
        {/* Admin */}
        <Route path="admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"] as any}><AdminDashboard /></ProtectedRoute>} />
        <Route path="receptionist/dashboard" element={<ProtectedRoute allowedRoles={["receptionist"] as any}><ReceptionistDashboard /></ProtectedRoute>} />
        <Route path="admin/users" element={<ProtectedRoute allowedRoles={["admin"] as any}><UserManagement /></ProtectedRoute>} />
        <Route path="admin/doctors" element={<ProtectedRoute allowedRoles={["admin"] as any}><DoctorRegistration /></ProtectedRoute>} />
        <Route path="admin/doctor-availability" element={<ProtectedRoute allowedRoles={["admin", "doctor"] as any}><DoctorAvailability /></ProtectedRoute>} />
        <Route path="admin/services" element={<ProtectedRoute allowedRoles={["admin"] as any}><ServicesCatalog /></ProtectedRoute>} />
        <Route path="admin/reports" element={<ProtectedRoute allowedRoles={["admin"] as any}><Reports /></ProtectedRoute>} />
        <Route path="admin/inventory" element={<ProtectedRoute allowedRoles={["admin", "store_manager"] as any}><InventoryManager /></ProtectedRoute>} />
        <Route path="admin/stock-purchase" element={<ProtectedRoute allowedRoles={["admin", "store_manager"] as any}><StockPurchase /></ProtectedRoute>} />
        {/* Receptionist/Admin/Store Manager */}
        <Route path="patients/register" element={<ProtectedRoute allowedRoles={["receptionist", "admin"] as any}><PatientRegistration /></ProtectedRoute>} />
        <Route path="billing" element={<ProtectedRoute allowedRoles={["receptionist", "admin"] as any}><BillingSystem /></ProtectedRoute>} />
        <Route path="billing/pharmacy" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "store_manager"] as any}><PharmacyBilling /></ProtectedRoute>} />
        <Route path="appointments/book" element={<ProtectedRoute allowedRoles={["receptionist", "admin"] as any}><AppointmentBooking /></ProtectedRoute>} />
        {/* Doctor */}
        <Route path="patients" element={<ProtectedRoute allowedRoles={["doctor"] as any}><PatientsList /></ProtectedRoute>} />
        {/* All roles can view appointments */}
        <Route path="appointments" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"] as any}><AppointmentsList /></ProtectedRoute>} />
        <Route path="appointments/calendar" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"] as any}><AppointmentsCalendar /></ProtectedRoute>} />
        <Route path="billing/history" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"] as any}><BillHistory /></ProtectedRoute>} />
        {/* Doctor + Receptionist */}
        <Route path="prescriptions" element={<ProtectedRoute allowedRoles={["doctor", "receptionist", "admin"] as any}><PrescriptionForm /></ProtectedRoute>} />
        <Route path="prescriptions/list" element={<ProtectedRoute allowedRoles={["doctor", "admin"] as any}><PrescriptionsList /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
