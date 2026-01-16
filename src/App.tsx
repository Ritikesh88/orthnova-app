import React from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import PharmacyLoginForm from './components/pharmacy/PharmacyLoginForm';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './components/admin/UserManagement';
import UserRegistration from './components/admin/UserRegistration';
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
import PrintPathologyReport from './print/PrintPathologyReport';
import PrintPharmacyBill from './print/PrintPharmacyBill';
import AppointmentBooking from './components/appointments/AppointmentBooking';
import AppointmentsList from './components/appointments/AppointmentsList';
import AppointmentsCalendar from './components/appointments/AppointmentsCalendar';
import PatientVisitHistory from './components/appointments/PatientVisitHistory';
import InventoryManager from './components/admin/InventoryManager';
import StockPurchase from './components/admin/StockPurchase';
import PharmacyBilling from './components/billing/PharmacyBilling';
import Reports from './components/admin/Reports';
import AdminDashboard from './components/admin/AdminDashboard';
import ReceptionistDashboard from './components/receptionist/ReceptionistDashboard';
import StockManagement from './components/admin/StockManagement';
import InventoryUpdate from './components/admin/InventoryUpdate';
import StockDetails from './components/admin/StockDetails';

// Pharmacy Components
import PharmacyDashboard from './components/pharmacy/PharmacyDashboard';
import PharmacyBillingPage from './components/pharmacy/PharmacyBilling';
import PharmacyInventory from './components/pharmacy/PharmacyInventory';
import PharmacyStockPurchase from './components/pharmacy/PharmacyStockPurchase';
import PharmacyReports from './components/pharmacy/PharmacyReports';

// Pathology Components
import PathologyDashboard from './components/pathology/PathologyDashboard';
import PathologyTests from './components/pathology/PathologyTests';
import PathologyOrders from './components/pathology/PathologyOrders';
import PathologyResults from './components/pathology/PathologyResults';
import PathologyReports from './components/pathology/PathologyReports';

// Home Page
import LandingPage from './components/LandingPage';

const AppRoutes: React.FC = () => {
  useAuth();
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginForm />} />
      <Route path="/pharmacy/login" element={<PharmacyLoginForm />} />
      <Route path="/print/bill/:id" element={<PrintBill />} />
      <Route path="/print/prescription/:id" element={<PrintPrescription />} />
      <Route path="/print/pathology-report/:id" element={<PrintPathologyReport />} />
      <Route path="/print/pharmacy-bill/:id" element={<PrintPharmacyBill />} />
      
      {/* Clinic Routes - Protected */}
      <Route
        path="/clinic/*"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Admin Routes */}
        <Route path="admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/users" element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
        <Route path="admin/user-registration" element={<ProtectedRoute allowedRoles={["admin"]}><UserRegistration /></ProtectedRoute>} />
        <Route path="admin/doctor-availability" element={<ProtectedRoute allowedRoles={["admin", "doctor"]}><DoctorAvailability /></ProtectedRoute>} />
        <Route path="admin/services" element={<ProtectedRoute allowedRoles={["admin"]}><ServicesCatalog /></ProtectedRoute>} />
        <Route path="admin/reports" element={<ProtectedRoute allowedRoles={["admin", "doctor"]}><Reports /></ProtectedRoute>} />
        <Route path="admin/inventory" element={<Navigate to="admin/inventory/update" replace />} />
        <Route path="admin/inventory/update" element={<ProtectedRoute allowedRoles={["admin", "store_manager"]}><InventoryUpdate /></ProtectedRoute>} />
        <Route path="admin/inventory/details" element={<ProtectedRoute allowedRoles={["admin", "store_manager"]}><StockDetails /></ProtectedRoute>} />
        <Route path="admin/stock-purchase" element={<ProtectedRoute allowedRoles={["admin", "store_manager"]}><StockPurchase /></ProtectedRoute>} />
                <Route path="admin/stock-management" element={<ProtectedRoute allowedRoles={["admin"]}><StockManagement /></ProtectedRoute>} />
        
        {/* Receptionist Routes */}
        <Route path="receptionist/dashboard" element={<ProtectedRoute allowedRoles={["receptionist"]}><ReceptionistDashboard /></ProtectedRoute>} />
        
        {/* Shared Routes */}
        <Route path="patients/register" element={<ProtectedRoute allowedRoles={["receptionist", "admin"]}><PatientRegistration /></ProtectedRoute>} />
        <Route path="patients" element={<ProtectedRoute allowedRoles={["doctor", "receptionist", "admin"]}><PatientsList /></ProtectedRoute>} />
        <Route path="billing" element={<ProtectedRoute allowedRoles={["receptionist", "admin"]}><BillingSystem /></ProtectedRoute>} />
        <Route path="billing/pharmacy" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "store_manager"]}><PharmacyBillingPage /></ProtectedRoute>} />
        <Route path="billing/history" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"]}><BillHistory /></ProtectedRoute>} />
        <Route path="appointments/book" element={<ProtectedRoute allowedRoles={["receptionist", "admin"]}><AppointmentBooking /></ProtectedRoute>} />
        <Route path="appointments" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"]}><PatientVisitHistory /></ProtectedRoute>} />
        <Route path="appointments/appointment-list" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"]}><AppointmentsList /></ProtectedRoute>} />
        <Route path="appointments/calendar" element={<ProtectedRoute allowedRoles={["receptionist", "admin", "doctor"]}><AppointmentsCalendar /></ProtectedRoute>} />
        <Route path="prescriptions" element={<ProtectedRoute allowedRoles={["doctor", "receptionist", "admin"]}><PrescriptionForm /></ProtectedRoute>} />
        <Route path="prescriptions/list" element={<ProtectedRoute allowedRoles={["doctor", "admin"]}><PrescriptionsList /></ProtectedRoute>} />
        
        {/* Default redirect for clinic section */}
        <Route index element={<Navigate to="/clinic/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/clinic/admin/dashboard" replace />} />
      </Route>
      
      {/* Pharmacy Routes - Protected */}
      <Route
        path="/pharmacy/*"
        element={
          <ProtectedRoute allowedRoles={["store_manager"]}>
            <PharmacyDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<PharmacyBillingPage />} />
        <Route path="billing" element={<PharmacyBillingPage />} />
        <Route path="inventory" element={<PharmacyInventory />} />
        <Route path="stock-purchase" element={<PharmacyStockPurchase />} />
        <Route path="reports" element={<PharmacyReports />} />
        <Route path="*" element={<PharmacyBillingPage />} />
      </Route>
      
      {/* Pathology Routes - Protected */}
      <Route
        path="/pathology/*"
        element={
          <ProtectedRoute allowedRoles={["admin", "doctor"]}>
            <PathologyDashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<PathologyTests />} />
        <Route path="tests" element={<PathologyTests />} />
        <Route path="orders" element={<PathologyOrders />} />
        <Route path="results" element={<PathologyResults />} />
        <Route path="reports" element={<PathologyReports />} />
        <Route path="*" element={<PathologyTests />} />
      </Route>
      
      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
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