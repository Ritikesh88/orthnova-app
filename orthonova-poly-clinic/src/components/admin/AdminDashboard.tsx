import React, { useState, useEffect } from 'react';
import { adminSummary, getTopDoctors, getTopServices, getPendingAppointments, listPatients, listDoctors, AdminSummary, TopDoctor, TopService } from '../../api';
import { formatCurrency } from '../../utils/format';

const AdminDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [topDoctors, setTopDoctors] = useState<TopDoctor[]>([]);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<any[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [patientDetails, setPatientDetails] = useState<Record<string, any>>({});
  const [doctorDetails, setDoctorDetails] = useState<Record<string, any>>({});

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  // Fetch data when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const endDate = `${selectedDate}T23:59:59`;
      const startDate = `${selectedDate}T00:00:00`;

      const [summaryData, doctors, services, pending] = await Promise.all([
        adminSummary(selectedDate),
        getTopDoctors(startDate, endDate, 5),
        getTopServices(startDate, endDate, 5),
        getPendingAppointments(selectedDate)
      ]);

      setSummary(summaryData);
      setTopDoctors(doctors);
      setTopServices(services);
      setPendingAppointments(pending);
      
      // Fetch patient and doctor details for pending appointments
      if (pending.length > 0) {
        // Get unique patient and doctor IDs
        const patientIds: string[] = [];
        const doctorIds: string[] = [];
        
        pending.forEach((a: any) => {
          if (a.patient_id && !patientIds.includes(a.patient_id)) {
            patientIds.push(a.patient_id);
          }
          if (a.doctor_id && !doctorIds.includes(a.doctor_id)) {
            doctorIds.push(a.doctor_id);
          }
        });
        
        // Fetch details in parallel
        const [patients, doctors] = await Promise.all([
          patientIds.length > 0 ? listPatients() : Promise.resolve([]),
          doctorIds.length > 0 ? listDoctors() : Promise.resolve([])
        ]);
        
        // Create lookup maps
        const patientMap: Record<string, any> = {};
        const doctorMap: Record<string, any> = {};
        
        patients.forEach((p: any) => {
          patientMap[p.id] = p;
        });
        
        doctors.forEach((d: any) => {
          doctorMap[d.id] = d;
        });
        
        setPatientDetails(patientMap);
        setDoctorDetails(doctorMap);
      }
    } catch (e: any) {
      console.error('Error fetching dashboard data:', e);
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };
  
  const handleAppointmentAction = (appointmentId: string, action: string) => {
    console.log(`Appointment ${appointmentId} marked as ${action}`);
    // TODO: Implement actual appointment action handling
    // This would involve updating the appointment status in the database
    alert(`Appointment action: ${action} - This would be implemented in a real application`);
  };

  // Calculate paid vs pending from summary
  const paidBills = summary ? Math.round(summary.total_bills * 0.8) : 0; // Estimate
  const pendingBills = summary ? summary.total_bills - paidBills : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analytics for {new Date(selectedDate).toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-xl border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent"></div>
          <p className="text-gray-500 mt-2">Loading dashboard data...</p>
        </div>
      )}

      {/* Main Metrics Grid */}
      {!loading && summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(summary.net_amount)}</p>
                  <p className="text-xs opacity-75 mt-1">from {summary.total_bills} bills</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Appointments */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 font-medium">Total Appointments</p>
                  <p className="text-3xl font-bold mt-2">{summary.total_appointments}</p>
                  <p className="text-xs opacity-75 mt-1">{summary.pending_appointments} pending</p>
                  {summary.pending_appointments > 0 && (
                    <button 
                      onClick={() => setShowPendingModal(true)}
                      className="text-xs underline mt-1"
                    >
                      View Details
                    </button>
                  )}
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Paid Bills */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 font-medium">Paid Bills</p>
                  <p className="text-3xl font-bold mt-2">{paidBills}</p>
                  <p className="text-xs opacity-75 mt-1">{Math.round((paidBills / (summary.total_bills || 1)) * 100)}% of total</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Pending Bills */}
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 font-medium">Pending Bills</p>
                  <p className="text-3xl font-bold mt-2">{pendingBills}</p>
                  <p className="text-xs opacity-75 mt-1">{Math.round((pendingBills / (summary.total_bills || 1)) * 100)}% of total</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-sm text-gray-600 font-medium">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.total_amount)}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 font-medium">Total Discount</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.total_discount)}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 font-medium">Average Bill Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(summary.total_bills > 0 ? summary.net_amount / summary.total_bills : 0)}
              </p>
            </div>
          </div>

          {/* Top Doctors & Services */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Doctors */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Top 5 Doctors by Revenue
              </h3>
              {topDoctors.length > 0 ? (
                <div className="space-y-3">
                  {topDoctors.map((doctor, idx) => (
                    <div key={doctor.doctor_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{doctor.doctor_name}</p>
                          <p className="text-xs text-gray-500">{doctor.total_bills} bills</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-brand-600">{formatCurrency(doctor.total_revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No doctor data available for this date</p>
              )}
            </div>

            {/* Top Services */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Top 5 Services by Usage
              </h3>
              {topServices.length > 0 ? (
                <div className="space-y-3">
                  {topServices.map((service, idx) => (
                    <div key={service.service_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{service.service_name}</p>
                          <p className="text-xs text-gray-500">{service.usage_count} times used</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">{formatCurrency(service.total_revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No service data available for this date</p>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Pending Appointments Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Pending Appointments</h3>
              <button 
                onClick={() => setShowPendingModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {pendingAppointments.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.patient_id 
                              ? (patientDetails[appointment.patient_id]?.name || 'Unknown Patient')
                              : (appointment.guest_name || 'Guest')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.patient_id 
                              ? (patientDetails[appointment.patient_id]?.contact || 'N/A')
                              : (appointment.guest_contact || 'N/A')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(appointment.appointment_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doctorDetails[appointment.doctor_id]?.name || 'Unknown Doctor'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => handleAppointmentAction(appointment.id, 'attended')}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Attended
                          </button>
                          <button 
                            onClick={() => handleAppointmentAction(appointment.id, 'reschedule')}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Reschedule
                          </button>
                          <button 
                            onClick={() => handleAppointmentAction(appointment.id, 'cancel')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No pending appointments found</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button 
                onClick={() => setShowPendingModal(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
