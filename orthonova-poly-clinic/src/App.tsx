import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './components/admin/UserManagement';
import DoctorRegistration from './components/admin/DoctorRegistration';
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

const DashboardHome: React.FC = () => (
  <div className="card p-6">Welcome to OrthoNova Poly Clinic Management.</div>
);

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
        <Route index element={<DashboardHome />} />
        {/* Admin */}
        <Route path="admin/users" element={<ProtectedRoute allowedRoles={["admin"] as any}><UserManagement /></ProtectedRoute>} />
        <Route path="admin/doctors" element={<ProtectedRoute allowedRoles={["admin"] as any}><DoctorRegistration /></ProtectedRoute>} />
        <Route path="admin/services" element={<ProtectedRoute allowedRoles={["admin"] as any}><ServicesCatalog /></ProtectedRoute>} />
        {/* Receptionist/Admin */}
        <Route path="patients/register" element={<ProtectedRoute allowedRoles={["receptionist", "admin"] as any}><PatientRegistration /></ProtectedRoute>} />
        <Route path="billing" element={<ProtectedRoute allowedRoles={["receptionist", "admin"] as any}><BillingSystem /></ProtectedRoute>} />
        <Route path="appointments/book" element={<ProtectedRoute allowedRoles={["receptionist", "admin"] as any}><AppointmentBooking /></ProtectedRoute>} />
        {/* Doctor */}
        <Route path="patients" element={<ProtectedRoute allowedRoles={["doctor"] as any}><PatientsList /></ProtectedRoute>} />
        {/* All roles can view appointments */}
        <Route path="appointments" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"] as any}><AppointmentsList /></ProtectedRoute>} />
        <Route path="appointments/calendar" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"] as any}><AppointmentsCalendar /></ProtectedRoute>} />
        <Route path="billing/history" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"] as any}><BillHistory /></ProtectedRoute>} />
        {/* Doctor + Receptionist */}
        <Route path="prescriptions" element={<ProtectedRoute allowedRoles={["doctor", "receptionist", "admin"] as any}><PrescriptionForm /></ProtectedRoute>} />
        <Route path="prescriptions/list" element={<ProtectedRoute allowedRoles={["doctor", "receptionist", "admin"] as any}><PrescriptionsList /></ProtectedRoute>} />
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
